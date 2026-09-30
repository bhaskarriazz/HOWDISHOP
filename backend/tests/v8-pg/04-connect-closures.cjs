// V8 Slice 2 — Connect closures. Real PostgreSQL, both sides of every interaction:
//   STO-005/006/007 story mute (private), owner-only viewer list + counts, highlights (audience kept, cover, rename, delete)
//   COM-005 create community with cover / rules / location / invite-only, invite link join + rotation, owner/admin settings
//   CRT-005 members-only Live / Space (host switch, locked room for non-members, member access, replay hidden)
//   VIB-013 / CRT-003 / CRT-010 rights review (declared third-party or reused media held; admin clear / block; notifications)
const L = require('../worker-pg/lib.cjs');
const { pool, check, finish, api } = L;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 04 connect closures (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const ADMIN = { 'x-howdi-admin-token': 'v8-test-admin-token-0123456789abcdef' };
const FORBIDDEN = /"(id|user_id|[a-z_]*_user_id|userId|howdi_id|master_id|email|phone|uuid|entity_key|source_story_id)"\s*:/;
const noKeys = (label, r) => check(`${label}: no internal id keys`, !FORBIDDEN.test(r.text || ''), (r.text.match(FORBIDDEN) || [])[0]);
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8DwnwEJMDKgAgA9WgT/Wv5LJQAAAABJRU5ErkJggg==';

async function member(name, handle) {
  const u = await L.mkUser(name);
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username,discoverable,private_profile,creator_mode) VALUES($1,$2,TRUE,FALSE,FALSE) ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username`, [u.id, handle]);
  return { ...u, handle };
}
const notes = async (m) => ((await api('GET', '/api/v8/notifications', { token: m.token })).json.items || []);
const myStory = async (m, text) => {
  const g = ((await api('GET', '/api/v8/connect/stories', { token: m.token })).json.stories || []).find((x) => x.mine);
  return g ? g.items.find((i) => i.text === text) : null;
};

(async () => {
  const started = await L.start(); check('server starts', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const A = await member('Asha Maker', 'asha_maker'); const B = await member('Bala Friend', 'bala_friend'); const C = await member('Chitra Viewer', 'chitra_viewer'); const D = await member('Dev Outsider', 'dev_outsider');
  const secrets = [A, B, C, D].flatMap((m) => [String(m.id), m.howdi, m.email, m.phone]);
  const noLeak = (label, r) => { noKeys(label, r); const t = r.text || ''; const hit = secrets.filter((x) => x && String(x).length > 3 && t.includes(`"${x}"`)); check(`${label}: no internal id values`, hit.length === 0, hit); };

  // ================= STORIES: mute, viewers, highlights
  check('story create (everyone)', (await api('POST', '/api/v8/stories', { token: A.token, body: { text: 'Public story', audience: 'everyone', mediaData: PNG } })).status === 201);
  check('story create (close friends)', (await api('POST', '/api/v8/stories', { token: A.token, body: { text: 'Close friends story', audience: 'close_friends', mediaData: PNG } })).status === 201);
  await pool.query(`INSERT INTO howdi_connect_close_friends(user_id,friend_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [A.id, B.id]);
  const pub = await myStory(A, 'Public story'); const cf = await myStory(A, 'Close friends story');
  check('owner sees STY codes and zero views', /^STY-/.test(pub?.public_key || '') && pub.view_count === 0, pub);
  check('guest cannot mute', (await api('POST', '/api/v8/creators/asha_maker/story-mute')).status === 401);
  check('view by B', (await api('POST', `/api/v8/stories/${pub.public_key}/view`, { token: B.token })).status === 200);
  check('view by C', (await api('POST', `/api/v8/stories/${pub.public_key}/view`, { token: C.token })).status === 200);
  check('C reacts', (await api('POST', `/api/v8/stories/${pub.public_key}/react`, { token: C.token, body: { reaction: '🔥' } })).status === 200);
  check('B replies privately', (await api('POST', `/api/v8/stories/${pub.public_key}/reply`, { token: B.token, body: { text: 'Lovely!' } })).status === 200);
  const pub2 = await myStory(A, 'Public story');
  check('owner counts: 2 views, 1 reaction, 1 reply', pub2.view_count === 2 && pub2.reaction_count === 1 && pub2.reply_count === 1, pub2);
  const other = ((await api('GET', '/api/v8/connect/stories', { token: B.token })).json.stories || []).find((g) => g.author.public_username === 'asha_maker');
  check('viewers do not get counts', other && other.items.every((i) => i.view_count === undefined && i.reaction_count === undefined), other && other.items[0]);
  const vw = await api('GET', `/api/v8/stories/${pub.public_key}/viewers`, { token: A.token });
  check('owner sees viewer list with reaction', vw.status === 200 && vw.json.count === 2 && vw.json.viewers.some((x) => x.person.public_username === 'chitra_viewer' && x.reaction === '🔥'), vw.text.slice(0, 300));
  noLeak('viewer list', vw);
  check('non-owner viewer list → 404', (await api('GET', `/api/v8/stories/${pub.public_key}/viewers`, { token: B.token })).status === 404);
  check('guest viewer list → 401', (await api('GET', `/api/v8/stories/${pub.public_key}/viewers`)).status === 401);
  // mute (private to the muter)
  check('C mutes A’s stories', (await api('POST', '/api/v8/creators/asha_maker/story-mute', { token: C.token })).json.muted === true);
  check('muted author hidden for C', !((await api('GET', '/api/v8/connect/stories', { token: C.token })).json.stories || []).some((g) => g.author.public_username === 'asha_maker'));
  check('others still see A', ((await api('GET', '/api/v8/connect/stories', { token: D.token })).json.stories || []).some((g) => g.author.public_username === 'asha_maker'));
  const muted = await api('GET', '/api/v8/stories/muted', { token: C.token });
  check('muted list shows A', (muted.json.muted || []).some((x) => x.person.public_username === 'asha_maker'), muted.text); noLeak('muted list', muted);
  check('A is not told (no notification)', !(await notes(A)).some((n) => /mute/i.test(`${n.title} ${n.body}`)));
  check('cannot mute yourself', (await api('POST', '/api/v8/creators/asha_maker/story-mute', { token: A.token })).status === 404);
  check('C unmutes', (await api('DELETE', '/api/v8/creators/asha_maker/story-mute', { token: C.token })).json.muted === false);
  check('A visible again for C', ((await api('GET', '/api/v8/connect/stories', { token: C.token })).json.stories || []).some((g) => g.author.public_username === 'asha_maker'));
  // highlights
  check('highlight needs a name', (await api('POST', `/api/v8/stories/${pub.public_key}/highlight`, { token: A.token, body: { title: 'x' } })).status === 400);
  check('non-owner cannot highlight', (await api('POST', `/api/v8/stories/${pub.public_key}/highlight`, { token: B.token, body: { title: 'Mine now' } })).status === 404);
  const hl = await api('POST', `/api/v8/stories/${pub.public_key}/highlight`, { token: A.token, body: { title: 'New drops' } });
  check('owner highlights public story', hl.status === 201 && hl.json.audience === 'Everyone', hl.text);
  check('highlighting twice is idempotent', (await api('POST', `/api/v8/stories/${pub.public_key}/highlight`, { token: A.token, body: { title: 'New drops' } })).status === 201);
  check('close-friends story highlighted', (await api('POST', `/api/v8/stories/${cf.public_key}/highlight`, { token: A.token, body: { title: 'Friends only' } })).status === 201);
  await pool.query(`UPDATE howdi_connect_stories SET expires_at=NOW()-interval '1 minute' WHERE user_id=$1`, [A.id]);
  const hG = await api('GET', '/api/v8/creators/asha_maker/highlights');
  check('guest sees public highlight after the story ended', (hG.json.highlights || []).map((h) => h.title).join() === 'New drops', hG.text.slice(0, 300));
  noLeak('highlights', hG);
  check('close friend B sees both highlights', ((await api('GET', '/api/v8/creators/asha_maker/highlights', { token: B.token })).json.highlights || []).length === 2);
  check('non-close-friend D sees only the public one', ((await api('GET', '/api/v8/creators/asha_maker/highlights', { token: D.token })).json.highlights || []).length === 1);
  await pool.query(`INSERT INTO howdi_connect_profile_blocks(blocker_user_id,blocked_user_id) VALUES($1,$2)`, [A.id, D.id]);
  check('blocked D sees no highlights', ((await api('GET', '/api/v8/creators/asha_maker/highlights', { token: D.token })).json.highlights || []).length === 0);
  await pool.query(`DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1 AND blocked_user_id=$2`, [A.id, D.id]);
  const mineH = (await api('GET', '/api/v8/creators/asha_maker/highlights', { token: A.token })).json;
  const item = mineH.highlights.find((h) => h.title === 'New drops').items[0];
  check('owner item has HLT code', /^HLT-[0-9A-F]{12}$/.test(item.public_key), item);
  check('non-owner cannot set cover', (await api('POST', `/api/v8/highlights/${item.public_key}/cover`, { token: B.token })).status === 404);
  check('owner sets cover', (await api('POST', `/api/v8/highlights/${item.public_key}/cover`, { token: A.token })).json.cover === true);
  check('rename to an existing name → 409', (await api('POST', '/api/v8/highlights/rename', { token: A.token, body: { title: 'New drops', to: 'Friends only' } })).status === 409);
  check('owner renames', (await api('POST', '/api/v8/highlights/rename', { token: A.token, body: { title: 'New drops', to: 'Launches' } })).json.title === 'Launches');
  check('B cannot rename A’s highlight', (await api('POST', '/api/v8/highlights/rename', { token: B.token, body: { title: 'Launches', to: 'Hacked' } })).status === 404);
  check('B cannot delete A’s item', (await api('DELETE', `/api/v8/highlights/${item.public_key}`, { token: B.token })).status === 404);
  check('owner deletes whole highlight', (await api('DELETE', '/api/v8/highlights?title=Friends%20only', { token: A.token })).json.deleted === true);
  check('owner removes an item', (await api('DELETE', `/api/v8/highlights/${item.public_key}`, { token: A.token })).json.removed === true);
  check('profile has no highlights left', ((await api('GET', '/api/v8/creators/asha_maker/highlights')).json.highlights || []).length === 0);

  // ================= COMMUNITIES: cover, rules, location, invite-only, settings
  check('community name validation', (await api('POST', '/api/v8/communities', { token: A.token, body: { name: 'ab', description: 'long enough text' } })).status === 400);
  check('cover must be an image', (await api('POST', '/api/v8/communities', { token: A.token, body: { name: 'Bad cover club', description: 'A community for testing covers', coverData: 'data:video/mp4;base64,AAAA' } })).status === 400);
  const cm = await api('POST', '/api/v8/communities', { token: A.token, body: { kind: 'group', name: 'Secret Yarn Swap', description: 'Swap spare yarn with nearby makers.', category: 'Local', location: 'Warangal', privacy: 'invite', rules: ['Swap fairly', '  ', 'Meet in public'], coverData: PNG } });
  check('invite-only community created with invite code', cm.status === 201 && cm.json.community.privacy === 'invite' && /^[A-Z0-9]{10}$/.test(cm.json.community.invite_code || ''), cm.text);
  const slug = cm.json.community.public_key; const code = cm.json.community.invite_code;
  const own = await api('GET', `/api/v8/communities/${slug}`, { token: A.token });
  check('owner sees cover, rules (blank dropped), location', /^\/api\/v8\/media\//.test(own.json.community.cover_url || '') && own.json.community.rules.length === 2 && own.json.community.location === 'Warangal', own.text.slice(0, 400));
  noLeak('community detail', own);
  check('non-member cannot open invite-only community', (await api('GET', `/api/v8/communities/${slug}`, { token: B.token })).status === 404);
  check('not in browse results', !((await api('GET', '/api/v8/communities?type=all&q=Secret', { token: B.token })).json.items || []).some((x) => x.public_key === slug));
  check('its topic is not leaked in the topic list', !((await api('GET', '/api/v8/communities?type=all', { token: B.token })).json.topics || []).includes('Local'));
  check('guest cannot join via invite', (await api('POST', `/api/v8/communities/invite/${code}`)).status === 401);
  const pv = await api('GET', `/api/v8/communities/invite/${code}`);
  check('invite preview shows name, not the code owner id', pv.status === 200 && pv.json.invite.name === 'Secret Yarn Swap' && pv.json.invite.invite_code === undefined, pv.text.slice(0, 300)); noLeak('invite preview', pv);
  check('wrong invite code → 404', (await api('GET', '/api/v8/communities/invite/ABCDEFGHJK')).status === 404);
  check('B joins with invite', (await api('POST', `/api/v8/communities/invite/${code}`, { token: B.token })).json.membership === 'member');
  const bView = await api('GET', `/api/v8/communities/${slug}`, { token: B.token });
  check('member B opens it but does not get the invite code', bView.status === 200 && bView.json.community.invite_code === undefined, bView.text.slice(0, 200));
  check('owner told someone joined', (await notes(A)).some((n) => /invite link/.test(n.title)));
  check('member cannot change settings', (await api('PATCH', `/api/v8/communities/${slug}/settings`, { token: B.token, body: { rules: ['x'] } })).status === 403);
  check('member cannot reset invite', (await api('POST', `/api/v8/communities/${slug}/invite/reset`, { token: B.token })).status === 403);
  const st = await api('PATCH', `/api/v8/communities/${slug}/settings`, { token: A.token, body: { rules: ['Swap fairly', 'No resale'], location: 'Hanamkonda', privacy: 'private', removeCover: true } });
  check('owner updates rules, location, privacy, removes cover', st.status === 200 && st.json.community.rules.join() === 'Swap fairly,No resale' && st.json.community.location === 'Hanamkonda' && st.json.community.privacy === 'private' && !st.json.community.cover_url, st.text.slice(0, 300));
  check('settings validation (short description)', (await api('PATCH', `/api/v8/communities/${slug}/settings`, { token: A.token, body: { description: 'short' } })).status === 400);
  await pool.query(`UPDATE howdi_connect_social_space_members SET role='ADMIN' WHERE user_id=$1 AND space_id=(SELECT id FROM howdi_connect_social_spaces WHERE slug=$2)`, [B.id, slug]);
  check('admin can edit rules', (await api('PATCH', `/api/v8/communities/${slug}/settings`, { token: B.token, body: { rules: ['Be kind'] } })).status === 200);
  check('admin cannot change privacy', (await api('PATCH', `/api/v8/communities/${slug}/settings`, { token: B.token, body: { privacy: 'public' } })).status === 403);
  const rs = await api('POST', `/api/v8/communities/${slug}/invite/reset`, { token: A.token });
  check('owner rotates invite link', /^[A-Z0-9]{10}$/.test(rs.json.invite_code || '') && rs.json.invite_code !== code);
  check('old link no longer works', (await api('POST', `/api/v8/communities/invite/${code}`, { token: C.token })).status === 404);
  check('new link joins a private community directly', (await api('POST', `/api/v8/communities/invite/${rs.json.invite_code}`, { token: C.token })).json.membership === 'member');

  // ================= MEMBERS-ONLY LIVE
  const room = (await pool.query(`INSERT INTO howdi_connect_communities(owner_user_id,community_type,name,description,privacy,status,session_status,started_at,created_at,updated_at) VALUES($1,'LIVE','Members stitch-along','desc','PUBLIC','ACTIVE','LIVE',NOW(),NOW(),NOW()) RETURNING id`, [A.id])).rows[0].id;
  const LK = ((await api('GET', '/api/v8/live?tab=now', { token: B.token })).json.items || []).find((x) => x.title === 'Members stitch-along')?.public_key;
  check('live listed with LIV code', /^LIV-/.test(LK || ''));
  check('D joins while open', (await api('POST', `/api/v8/rooms/${LK}/join`, { token: D.token })).status === 200);
  check('only the host can switch members-only', (await api('POST', `/api/v8/rooms/${LK}/host/members-only`, { token: B.token, body: { on: true } })).status === 403);
  check('host without a paid tier is refused', (await api('POST', `/api/v8/rooms/${LK}/host/members-only`, { token: A.token, body: { on: true } })).json.code === 'NO_TIER');
  const tier = await api('POST', '/api/v8/creator/tiers', { token: A.token, body: { name: 'Maker Circle', monthly: 149, benefits: ['Live workshops'] } });
  check('host creates a tier', tier.status === 201, tier.text.slice(0, 200));
  const plan = (await pool.query(`SELECT id FROM howdi_connect_subscription_plans WHERE creator_user_id=$1 ORDER BY id DESC LIMIT 1`, [A.id])).rows[0].id;
  await pool.query(`INSERT INTO howdi_connect_subscriptions(subscriber_user_id,creator_user_id,plan_id,status,amount,current_period_end) VALUES($1,$2,$3,'ACTIVE',149,NOW()+interval '30 days')`, [B.id, A.id, plan]);
  await pool.query(`INSERT INTO howdi_connect_subscriptions(subscriber_user_id,creator_user_id,plan_id,status,amount,current_period_end) VALUES($1,$2,$3,'PAST_DUE',149,NOW()+interval '30 days')`, [C.id, A.id, plan]);
  check('host switches members-only on', (await api('POST', `/api/v8/rooms/${LK}/host/members-only`, { token: A.token, body: { on: true } })).json.members_only === true);
  const dRoom = await api('GET', `/api/v8/rooms/${LK}`, { token: D.token });
  check('non-member sees a locked room without participants', dRoom.json.room.members_only === true && dRoom.json.room.locked === true && dRoom.json.participants.length === 0, dRoom.text.slice(0, 300));
  noLeak('locked room', dRoom);
  check('non-member events → 403', (await api('GET', `/api/v8/rooms/${LK}/events`, { token: D.token })).json.code === 'MEMBERS_ONLY');
  check('guest events → 403', (await api('GET', `/api/v8/rooms/${LK}/events`)).status === 403);
  check('non-member cannot join', (await api('POST', `/api/v8/rooms/${LK}/join`, { token: D.token })).json.code === 'MEMBERS_ONLY');
  check('non-member cannot chat', (await api('POST', `/api/v8/rooms/${LK}/chat`, { token: D.token, body: { text: 'hi' } })).json.code === 'MEMBERS_ONLY');
  check('past-due member is locked out', (await api('GET', `/api/v8/rooms/${LK}`, { token: C.token })).json.room.locked === true);
  const bRoom = await api('GET', `/api/v8/rooms/${LK}`, { token: B.token });
  check('active member is not locked', bRoom.json.room.locked === false && bRoom.json.room.viewer.member === true);
  check('member joins', (await api('POST', `/api/v8/rooms/${LK}/join`, { token: B.token })).status === 200);
  check('member chats', (await api('POST', `/api/v8/rooms/${LK}/chat`, { token: B.token, body: { text: 'Members hello' } })).status === 201);
  check('host still chats', (await api('POST', `/api/v8/rooms/${LK}/chat`, { token: A.token, body: { text: 'Welcome members' } })).status === 201);
  const ev = await api('GET', `/api/v8/rooms/${LK}/events`, { token: B.token });
  check('member sees the system notice', (ev.json.events || []).some((e) => e.kind === 'system' && /members-only/.test(e.text)));
  // replay stays locked
  await pool.query(`UPDATE howdi_connect_communities SET session_status='ENDED', ended_at=NOW() WHERE id=$1`, [room]);
  await pool.query(`INSERT INTO howdi_connect_live_replays(community_id,replay_status,duration_seconds,source_type,replay_url,created_at,updated_at) VALUES($1,'READY',60,'PREVIEW','/api/v8/media/0123456789abcdef0123456789abcdef.webm',NOW(),NOW())`, [room]);
  check('replay url hidden from non-members', (await api('GET', `/api/v8/rooms/${LK}`, { token: D.token })).json.room.replay.url === null);
  check('replay url shown to members', !!(await api('GET', `/api/v8/rooms/${LK}`, { token: B.token })).json.room.replay.url);

  // ================= RIGHTS REVIEW
  check('licensed needs a source', (await api('POST', '/api/v8/posts', { token: A.token, body: { text: 'Licensed song', rights: 'licensed' } })).status === 400);
  const lic = await api('POST', '/api/v8/posts', { token: A.token, body: { text: 'Licensed song ok', rights: 'licensed', rights_note: 'Licence #A1234 from ClipStock' } });
  check('licensed with a source publishes', lic.status === 201 && lic.json.rights_review === null && lic.json.post.review === null, lic.text.slice(0, 200));
  const held = await api('POST', '/api/v8/posts', { token: A.token, body: { text: 'HELD third-party post', rights: 'third_party', rights_note: 'Film song' } });
  check('declared third-party is held', held.status === 201 && held.json.post.review === 'pending' && held.json.rights_review.status === 'pending', held.text.slice(0, 300));
  noLeak('held post', held);
  const HP = held.json.post.public_key;
  check('held post hidden from others', (await api('GET', `/api/v8/posts/${HP}`, { token: B.token })).status === 404);
  check('held post hidden from guests', (await api('GET', `/api/v8/posts/${HP}`)).status === 404);
  check('held post not in feeds', !JSON.stringify((await api('GET', '/api/v8/connect/feed', { token: B.token })).json).includes('HELD third-party post'));
  check('author sees own held post', (await api('GET', `/api/v8/posts/${HP}`, { token: A.token })).json.post.review === 'pending');
  // reused media: A publishes an image, D re-uploads the same bytes
  check('original image post publishes', (await api('POST', '/api/v8/posts', { token: A.token, body: { text: 'My own photo', media: [PNG2] } })).json.post.review === null);
  check('A reusing own media is not held', (await api('POST', '/api/v8/posts', { token: A.token, body: { text: 'Same photo again', media: [PNG2] } })).json.post.review === null);
  const dup = await api('POST', '/api/v8/posts', { token: D.token, body: { text: 'Reposted photo', media: [PNG2] } });
  check('someone else re-uploading the same media is held', dup.json.post?.review === 'pending' && dup.json.rights_review.reason === 'duplicate_media', dup.text.slice(0, 300));
  // vibe held
  const vh = await api('POST', '/api/v8/vibes', { token: A.token, body: { caption: 'HELD vibe', mediaData: PNG, rights: 'third_party' } });
  check('declared third-party Vibe is held', vh.status === 201 && vh.json.vibe.review === 'pending', vh.text.slice(0, 300));
  check('held Vibe hidden', (await api('GET', `/api/v8/vibes/${vh.json.vibe.public_key}`, { token: B.token })).status === 404);
  // admin
  check('admin queue needs admin auth', (await api('GET', '/api/admin/v8/rights')).status === 401);
  check('member token is not admin', (await api('GET', '/api/admin/v8/rights', { token: A.token })).status === 401);
  const q = await api('GET', '/api/admin/v8/rights', { headers: ADMIN });
  check('admin sees 3 pending items', (q.json.items || []).length === 3, q.text.slice(0, 300)); noLeak('admin rights queue', q);
  const byText = (t) => q.json.items.find((x) => x.excerpt.includes(t)).key;
  check('block needs a reason', (await api('POST', `/api/admin/v8/rights/${byText('Reposted photo')}/decide`, { headers: ADMIN, body: { decision: 'block' } })).status === 400);
  check('unknown decision rejected', (await api('POST', `/api/admin/v8/rights/${byText('Reposted photo')}/decide`, { headers: ADMIN, body: { decision: 'maybe' } })).status === 400);
  check('admin blocks the repost', (await api('POST', `/api/admin/v8/rights/${byText('Reposted photo')}/decide`, { headers: ADMIN, body: { decision: 'block', note: 'This photo belongs to @asha_maker.' } })).json.decided === 'block');
  check('admin clears the declared post', (await api('POST', `/api/admin/v8/rights/${byText('HELD third-party post')}/decide`, { headers: ADMIN, body: { decision: 'clear' } })).json.decided === 'clear');
  check('decided twice → 409', (await api('POST', `/api/admin/v8/rights/${byText('HELD third-party post')}/decide`, { headers: ADMIN, body: { decision: 'block', note: 'changed my mind' } })).status === 409);
  check('admin clears the Vibe', (await api('POST', `/api/admin/v8/rights/${byText('HELD vibe')}/decide`, { headers: ADMIN, body: { decision: 'clear' } })).json.decided === 'clear');
  check('cleared post now public', (await api('GET', `/api/v8/posts/${HP}`, { token: B.token })).status === 200);
  check('cleared Vibe now public', (await api('GET', `/api/v8/vibes/${vh.json.vibe.public_key}`, { token: B.token })).status === 200);
  check('blocked repost stays hidden', (await api('GET', `/api/v8/posts/${dup.json.post.public_key}`, { token: B.token })).status === 404);
  check('D sees own blocked post as blocked', (await api('GET', `/api/v8/posts/${dup.json.post.public_key}`, { token: D.token })).json.post.review === 'blocked');
  check('A notified: passed', (await notes(A)).some((n) => /passed the rights check/.test(n.title)));
  check('D notified with the reason', (await notes(D)).some((n) => /wasn’t published/.test(n.title) && /belongs to @asha_maker/.test(n.body || '')));
  const mine = await api('GET', '/api/v8/rights/mine', { token: D.token });
  check('D’s rights list shows the block', (mine.json.items || [])[0]?.status === 'blocked', mine.text.slice(0, 300)); noLeak('rights mine', mine);
  check('rights list needs sign-in', (await api('GET', '/api/v8/rights/mine')).status === 401);
  const ws = await api('GET', '/api/v8/creator/moderation', { token: A.token });
  check('creator moderation manual_review is 0 once decided', ws.json.counts.manual_review === 0, ws.text.slice(0, 200));
  const audit = (await pool.query(`SELECT COUNT(*) n FROM howdi_admin_security_audit WHERE action LIKE 'V8_RIGHTS_%'`)).rows[0].n;
  check('each admin decision is audited', Number(audit) === 3, audit);
  await finish(LABEL);
})().catch(async (e) => { console.log('FAIL crashed', e && e.stack); await finish(LABEL); });
