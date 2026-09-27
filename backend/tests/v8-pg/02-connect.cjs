// V8 Connect feature hub API — real-PostgreSQL checks (connect-v8.cjs, connect-v8-rooms.cjs, connect-v8-community.cjs)
// plus the global admin guard. Runs twice via run.cjs (sandbox *_preview DB and ordinary DB).
const crypto = require('node:crypto');
const L = require('../worker-pg/lib.cjs');
const { pool, check, finish, api } = L;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 02 connect (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const FORBIDDEN = /"(id|user_id|[a-z_]*_user_id|userId|howdi_id|master_id|email|phone|uuid)"\s*:/;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function member(name, handle, extra = {}) {
  const u = await L.mkUser(name);
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username,discoverable,private_profile,creator_mode) VALUES($1,$2,TRUE,$3,FALSE) ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username, private_profile=EXCLUDED.private_profile`, [u.id, handle, Boolean(extra.private)]);
  return { ...u, handle };
}
const noLeak = (label, r, secrets) => {
  const t = r.text || '';
  const leaked = secrets.filter((x) => x && t.includes(`"${x}"`) || (x && new RegExp(`[^0-9]${x}[^0-9]`).test(t) && String(x).length > 6));
  check(`${label}: no internal id keys`, !FORBIDDEN.test(t), (t.match(FORBIDDEN) || [])[0]);
  check(`${label}: no internal id values`, leaked.length === 0, leaked);
};

(async () => {
  const started = await L.start(); check('server starts', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const A = await member('Asha Owner', 'asha_owner'); const B = await member('Bala Viewer', 'bala_viewer'); const C = await member('Chitra Blocked', 'chitra_blocked');
  const secrets = [A, B, C].flatMap((m) => [m.howdi, m.email, m.phone, m.master]);
  // content
  const post = (await pool.query(`INSERT INTO howdi_community_posts(user_id,content,category,visibility,post_type,post_status,audience_scope,allow_comments) VALUES($1,'Hello Connect','GENERAL','PUBLIC','POST','PUBLISHED','EVERYONE',TRUE) RETURNING id`, [A.id])).rows[0].id;
  await pool.query(`INSERT INTO howdi_community_posts(user_id,content,category,visibility,post_type,post_status,audience_scope,allow_comments) VALUES($1,'Blocked person post','GENERAL','PUBLIC','POST','PUBLISHED','EVERYONE',TRUE)`, [C.id]);
  await pool.query(`INSERT INTO howdi_community_posts(user_id,content,category,visibility,post_type,post_status,audience_scope,allow_comments) VALUES($1,'Only me secret','GENERAL','PUBLIC','POST','PUBLISHED','ONLY_ME',TRUE)`, [A.id]);
  await pool.query(`INSERT INTO howdi_connect_profile_blocks(blocker_user_id,blocked_user_id) VALUES($1,$2)`, [B.id, C.id]);
  const room = (await pool.query(`INSERT INTO howdi_connect_communities(owner_user_id,community_type,name,description,privacy,status,session_status,started_at,created_at,updated_at) VALUES($1,'LIVE','Test live','desc','PUBLIC','ACTIVE','LIVE',NOW(),NOW(),NOW()) RETURNING id`, [A.id])).rows[0].id;
  const sp = (await pool.query(`INSERT INTO howdi_connect_social_spaces(owner_user_id,space_type,name,slug,description,category,privacy,member_count,message_count,is_verified,is_archived,created_at,updated_at) VALUES($1,'GROUP','Private makers','private-makers','A private group','Crafts','PRIVATE',1,0,FALSE,FALSE,NOW(),NOW()) RETURNING id`, [A.id])).rows[0].id;
  await pool.query(`INSERT INTO howdi_connect_social_space_members(space_id,user_id,role,status,joined_via,joined_at,updated_at) VALUES($1,$2,'OWNER','ACTIVE','create',NOW(),NOW())`, [sp, A.id]);
  await pool.query(`INSERT INTO howdi_connect_social_messages(space_id,sender_user_id,message_type,body,created_at) VALUES($1,$2,'POST','members only text',NOW())`, [sp, A.id]);

  // ---- hub + feed (guest and signed-in)
  const hub = await api('GET', '/api/v8/connect/hub');
  check('hub guest 200', hub.status === 200 && hub.json?.status === 'success', hub.status);
  noLeak('hub', hub, secrets);
  const feedB = await api('GET', '/api/v8/connect/feed', { token: B.token });
  const texts = (feedB.json?.items || []).map((x) => x.text);
  check('feed shows public post', texts.includes('Hello Connect'), texts);
  check('feed hides blocked author', !texts.includes('Blocked person post'), texts);
  check('feed hides only-me post from others', !texts.includes('Only me secret'), texts);
  noLeak('feed', feedB, secrets);
  const pk = (feedB.json.items.find((x) => x.text === 'Hello Connect') || {}).public_key;
  check('post has PST public key', /^PST-[0-9A-F]{12}$/.test(pk || ''), pk);
  check('guest cannot like', (await api('POST', `/api/v8/posts/${pk}/like`)).status === 401);
  const like = await api('POST', `/api/v8/posts/${pk}/like`, { token: B.token });
  check('signed-in like counts', like.status === 200 && like.json.count === 1, like.text);
  check('report needs a valid reason', (await api('POST', `/api/v8/posts/${pk}/report`, { token: B.token, body: { reason: 'nope' } })).status === 400);
  { const rr = await api('POST', `/api/v8/posts/${pk}/report`, { token: B.token, body: { reason: 'spam' } }); check('report accepted', rr.status === 200, rr.text); }
  check('non-author cannot delete', (await api('DELETE', `/api/v8/posts/${pk}`, { token: B.token })).status === 404);
  const cp = await api('POST', '/api/v8/posts', { token: B.token, body: { text: 'my post', audience: 'everyone', userId: A.id } });
  check('create post uses session user (userId ignored)', cp.status === 201 && cp.json.post?.author?.public_username === 'bala_viewer', cp.text.slice(0, 200));
  noLeak('create post', cp, secrets);
  check('post media type mismatch rejected', (await api('POST', '/api/v8/posts', { token: B.token, body: { text: 'x', media: ['data:image/png;base64,' + Buffer.from('<svg onload=1>').toString('base64')] } })).status === 400);

  // ---- follow / block
  check('follow by handle', (await api('POST', '/api/v8/creators/asha_owner/follow', { token: B.token })).json?.following === true);
  check('cannot follow a blocked person (looks missing)', (await api('POST', '/api/v8/creators/chitra_blocked/follow', { token: B.token })).status === 404);

  // ---- stories: create + visibility
  check('story guest create 401', (await api('POST', '/api/v8/stories', { body: { text: 'x' } })).status === 401);
  { const sr = await api('POST', '/api/v8/stories', { token: A.token, body: { text: 'Only me story', audience: 'only_me' } }); check('story create', sr.status === 201, sr.text); }
  const stB = await api('GET', '/api/v8/connect/stories', { token: B.token });
  check('only-me story hidden from others', !JSON.stringify(stB.json).includes('Only me story'));
  const stA = await api('GET', '/api/v8/connect/stories', { token: A.token });
  check('only-me story visible to owner', JSON.stringify(stA.json).includes('Only me story'));

  // ---- vibes
  const vibeBad = await api('POST', '/api/v8/vibes', { token: A.token, body: { caption: 'x', mediaData: 'data:video/mp4;base64,' + Buffer.from('not a video at all').toString('base64') } });
  check('vibe media content sniffed (fake mp4 rejected)', vibeBad.status === 400 && vibeBad.json.code === 'MEDIA_MISMATCH', vibeBad.text);
  const vibe = await api('POST', '/api/v8/vibes', { token: A.token, body: { caption: 'Test vibe', mediaData: PNG, categories: ['handmade'] } });
  check('vibe create (photo)', vibe.status === 201 && /^VIB-/.test(vibe.json.vibe?.public_key || ''), vibe.text);
  noLeak('vibe create', vibe, secrets);
  const vk = vibe.json.vibe.public_key;
  const vget = await api('GET', `/api/v8/vibes/${vk}`);
  check('vibe media URL has no user id', vget.json?.vibe && !/\/media\/vibes\/\d+\//.test(vget.text) && /\/api\/v8\/media\/[0-9a-f]{32}\.png/.test(vget.text), vget.text.slice(0, 300));
  const media = (vget.json.vibe.media[0] || {}).url;
  const mr = await fetch(L.base() + media); check('vibe media served with nosniff', mr.status === 200 && mr.headers.get('x-content-type-options') === 'nosniff', mr.status);
  check('media path traversal refused', (await fetch(L.base() + '/api/v8/media/..%2f..%2fserver.js')).status === 404);
  const cm = await api('POST', `/api/v8/vibes/${vk}/comments`, { token: B.token, body: { text: 'Lovely' } });
  check('vibe comment', cm.status === 201 && /^VCM-/.test(cm.json.comment?.public_key || ''), cm.text);
  noLeak('vibe comments', await api('GET', `/api/v8/vibes/${vk}/comments`), secrets);
  check('vibe feed guest following needs sign-in (no 500)', (await api('GET', '/api/v8/vibes?tab=following')).json?.needs_sign_in === true);
  check('vibe feed unknown param 400', (await api('GET', '/api/v8/vibes?tab=for-you&userId=1')).status === 400);
  await api('POST', `/api/v8/vibes/${vk}/not-interested`, { token: B.token });
  const fyB = await api('GET', '/api/v8/vibes?tab=for-you', { token: B.token });
  check('not-interested hides the Vibe', !(fyB.json.items || []).some((x) => x.public_key === vk));

  // ---- rooms
  const lr = await api('GET', '/api/v8/live?tab=now');
  const lk = (lr.json.items || [])[0]?.public_key;
  check('live list', /^LIV-/.test(lk || ''), lr.text.slice(0, 200));
  noLeak('live list', lr, secrets);
  check('chat before join refused', (await api('POST', `/api/v8/rooms/${lk}/chat`, { token: B.token, body: { text: 'hi' } })).status === 403);
  check('join', (await api('POST', `/api/v8/rooms/${lk}/join`, { token: B.token })).json?.joined === true);
  check('chat after join', (await api('POST', `/api/v8/rooms/${lk}/chat`, { token: B.token, body: { text: 'hi there' } })).status === 201);
  check('viewer cannot end live', (await api('POST', `/api/v8/rooms/${lk}/host/end`, { token: B.token })).status === 403);
  const tip = await api('POST', `/api/v8/rooms/${lk}/tip`, { token: B.token, body: { amount: 50 } });
  if (SANDBOX) {
    check('sandbox tip debits and credits', tip.status === 201 && tip.json.receipt?.balance === 1950, tip.text);
    const bal = (await pool.query(`SELECT user_id, balance FROM howdi_v8_wallets WHERE user_id=ANY($1)`, [[A.id, B.id]])).rows;
    check('ledger balanced (host +50)', Number(bal.find((x) => Number(x.user_id) === A.id)?.balance) === 2050, bal);
    check('tip amount outside list refused', (await api('POST', `/api/v8/rooms/${lk}/tip`, { token: B.token, body: { amount: 49 } })).status === 400);
  } else check('tip without HPay provider refused', tip.status === 503 && tip.json.code === 'PAYMENT_PROVIDER_REQUIRED', tip.text);
  check('host removes viewer', (await api('POST', `/api/v8/rooms/${lk}/host/remove`, { token: A.token, body: { handle: 'bala_viewer' } })).json?.removed === true);
  check('removed viewer cannot rejoin', (await api('POST', `/api/v8/rooms/${lk}/join`, { token: B.token })).status === 403);
  const ev = await api('GET', `/api/v8/rooms/${lk}/events?after=0`, { token: A.token });
  check('removed viewer chat hidden', !JSON.stringify(ev.json).includes('hi there'));
  noLeak('room events', ev, secrets);

  // ---- communities (private group, request → decision → notification)
  const g = await api('GET', '/api/v8/communities/private-makers', { token: B.token });
  check('private group visible in listing', g.status === 200 && g.json.community.privacy === 'private');
  check('private feed locked for non-members', (await api('GET', '/api/v8/communities/private-makers/feed', { token: B.token })).json?.locked === true);
  check('join private -> pending', (await api('POST', '/api/v8/communities/private-makers/join', { token: B.token })).json?.membership === 'pending');
  const ownerN = await api('GET', '/api/v8/notifications', { token: A.token });
  check('owner notified of join request', (ownerN.json.items || []).some((n) => n.title.includes('asked to join')), ownerN.text.slice(0, 300));
  await api('DELETE', '/api/v8/communities/private-makers/join', { token: B.token }); await api('POST', '/api/v8/communities/private-makers/join', { token: B.token });
  const ownerN2 = await api('GET', '/api/v8/notifications', { token: A.token });
  check('repeat join request does not spam the owner', (ownerN2.json.items || []).filter((n) => n.title.includes('asked to join')).length === 1, ownerN2.text.slice(0, 300));
  check('non-mod cannot approve', (await api('POST', '/api/v8/communities/private-makers/requests/bala_viewer/approve', { token: B.token })).status === 403);
  check('non-mod cannot see moderation', (await api('GET', '/api/v8/communities/private-makers/moderation', { token: B.token })).status === 403);
  check('owner approves', (await api('POST', '/api/v8/communities/private-makers/requests/bala_viewer/approve', { token: A.token })).json?.decided === 'approve');
  const bN = await api('GET', '/api/v8/notifications', { token: B.token });
  check('applicant notified of approval', (bN.json.items || []).some((n) => n.title.includes('You’re in')), bN.text.slice(0, 300));
  const inN = (bN.json.items || []).find((n) => n.title.includes('You’re in'));
  check('notification has opaque key', /^NTF-[0-9A-F]{12}$/.test(inN?.key || ''), inN?.key);
  check('other user cannot mark my notification read', (await api('POST', '/api/v8/notifications/read', { token: A.token, body: { key: inN?.key } })).status === 200 && ((await api('GET', '/api/v8/notifications', { token: B.token })).json.items || []).find((n) => n.key === inN?.key)?.read === false);
  check('tap marks one notification read', (await api('POST', '/api/v8/notifications/read', { token: B.token, body: { key: inN?.key } })).status === 200 && ((await api('GET', '/api/v8/notifications', { token: B.token })).json.items || []).find((n) => n.key === inN?.key)?.read === true);
  check('bad notification key -> 404', (await api('POST', '/api/v8/notifications/read', { token: B.token, body: { key: 'NTF-000000000000' } })).status === 404);
  const feed2 = await api('GET', '/api/v8/communities/private-makers/feed', { token: B.token });
  check('member can read feed', (feed2.json.items || []).some((x) => x.text === 'members only text'));
  const cps = feed2.json.items[0].public_key;
  check('member reports post', (await api('POST', `/api/v8/communities/private-makers/feed/${cps}/report`, { token: B.token, body: { reason: 'spam' } })).status === 200);
  const mq = await api('GET', '/api/v8/communities/private-makers/moderation', { token: A.token });
  check('owner sees report queue', (mq.json.reports || []).length === 1, mq.text.slice(0, 200));
  noLeak('moderation', mq, secrets);
  check('owner resolves report', (await api('POST', `/api/v8/communities/private-makers/reports/${mq.json.reports[0].public_key}/resolve`, { token: A.token, body: { action: 'keep' } })).json?.resolved === 'keep');
  check('reporter notified of outcome', ((await api('GET', '/api/v8/notifications', { token: B.token })).json.items || []).some((n) => n.title.includes('Update on your report')));
  check('member cannot change roles', (await api('POST', '/api/v8/communities/private-makers/members/asha_owner/role', { token: B.token, body: { role: 'member' } })).status === 403);
  noLeak('members', await api('GET', '/api/v8/communities/private-makers/members', { token: A.token }), secrets);

  // ---- admin guard
  check('/api/admin/* without admin session → 401', (await api('GET', '/api/admin/works/applications')).status === 401);
  check('forged admin token → 401', (await api('GET', '/api/v1/vibes/admin/dashboard', { headers: { 'x-howdi-admin-token': 'forged' } })).status === 401);
  check('customer session is not admin', (await api('GET', '/api/admin/works/applications', { token: A.token })).status === 401);
  check('HPay v164a wallet needs a session', (await api('GET', '/api/hpay/v164a/wallet?userId=' + A.id)).status === 401);
  const w = await api('POST', '/api/wallet/add-money', { token: A.token, body: { amount: 500 } });
  check(SANDBOX ? 'add-money allowed in sandbox' : 'add-money refused without provider', SANDBOX ? w.status !== 503 : w.status === 503, w.status + ' ' + w.text.slice(0, 120));
  await finish(LABEL);
})().catch(async (e) => { console.log('FAIL crashed', e && e.stack); await finish(LABEL); });
