// HOWDI V8 preview seed — Connect hub + Vibe (idempotent, preview database only). Everything is fictional preview content.
// Vibe videos are short slideshows made from the owner's own product photos (HOWDI_V8_preview_media), clearly preview data.
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const VIBES = [
  { code: 'VIBE-PV-0001', by: 1, key: 'chevron-clutch', cats: ['handmade', 'fashion'], caption: 'Chevron clutch, row by row 🧶 Three evenings, one skein of cotton. Which colour next? #crochet #handmade', link: { kind: 'product', label: 'Chevron Crochet Clutch', sub: 'Shop · ₹1,299', route: '/shop/crochet' }, likes: 248, comments: 3, saves: 61, shares: 19 },
  { code: 'VIBE-PV-0002', by: 3, key: 'infinity-scarf', cats: ['handmade', 'skills-diy'], caption: 'Textured infinity scarf — the trick is a loose foundation chain. Save this for winter ✨', link: { kind: 'community', label: 'Telangana Crochet Circle', sub: 'Group', route: '/connect/communities/telangana-crochet-circle' }, likes: 412, comments: 2, saves: 130, shares: 44, learning: true },
  { code: 'VIBE-PV-0003', by: 1, key: 'daisy-cushion', cats: ['handmade', 'lifestyle'], caption: 'Petal by petal: the daisy cushion everyone asked about 🌼', link: { kind: 'product', label: 'Daisy Flower Cushion', sub: 'Shop · ₹899', route: '/shop/crochet' }, likes: 190, comments: 1, saves: 42, shares: 11 },
  { code: 'VIBE-PV-0004', by: 3, key: 'striped-cardigan', cats: ['fashion', 'handmade'], caption: 'Oversized striped cardigan fit check 💙 Blue + cream, two pockets, zero regrets.', link: { kind: 'profile', label: '@lakshmi_stitches', sub: 'Profile', route: '/@lakshmi_stitches' }, likes: 356, comments: 0, saves: 88, shares: 23 },
  { code: 'VIBE-PV-0005', by: 2, key: 'emerald-leaf-clutch', cats: ['handmade'], caption: 'Leaf-stitch envelope clutch from the loom-side table. Handloom meets hook. #handloom', link: null, likes: 97, comments: 0, saves: 20, shares: 6 },
  { code: 'VIBE-PV-0006', by: 1, key: 'floral-frame-purse', cats: ['handmade', 'fashion'], caption: 'Floral frame purse — a 60-second tour of the lining and clasp.', link: { kind: 'product', label: 'Floral Frame Purse', sub: 'Shop', route: '/shop/crochet' }, likes: 150, comments: 0, saves: 33, shares: 9 },
  { code: 'VIBE-PV-0007', by: 3, key: 'daisy-hooded-cardigan', cats: ['fashion', 'skills-diy'], caption: 'Granny squares → hooded cardigan. Joining tip in the comments 👇', link: { kind: 'community', label: 'Beginner Embroidery Club', sub: 'Group', route: '/connect/communities/beginner-embroidery-club' }, likes: 520, comments: 1, saves: 204, shares: 71, learning: true },
  { code: 'VIBE-PV-0008', by: 4, key: 'leaf-gloves', cats: ['handmade', 'lifestyle'], caption: 'Studio break: my sister’s leaf-motif gloves next to the new mugs ☕', link: null, likes: 64, comments: 0, saves: 8, shares: 2 },
];
const COMMENTS = [
  { vibe: 'VIBE-PV-0001', by: 5, text: 'This is beautiful! What yarn are you using?' },
  { vibe: 'VIBE-PV-0001', by: 1, text: 'Thank you! It’s a cotton blend from a local maker — link is on the Vibe 💙' },
  { vibe: 'VIBE-PV-0001', by: 4, text: 'The chevron lines are so clean.' },
  { vibe: 'VIBE-PV-0002', by: 5, text: 'Saved! Trying this weekend.' },
  { vibe: 'VIBE-PV-0002', by: 2, text: 'Loose foundation chain changed everything for me too.' },
  { vibe: 'VIBE-PV-0003', by: 6, text: 'My mother would love this cushion.' },
  { vibe: 'VIBE-PV-0007', by: 5, text: 'Joining tip please! 🙏' },
];
const hash = (s) => crypto.createHash('md5').update('howdi-v8-preview|' + s).digest('hex');

async function seedConnect(db, { mediaDir, vibeSrc, photoSrc }) {
  await db.query(`DELETE FROM howdi_v8_notifications WHERE route LIKE '/connect/communities/crochet-business-owners%'`).catch(() => {});
  // demo reset: Vibes uploaded by the recorded walkthrough are archived so every run starts from the same For You feed
  await db.query(`UPDATE vibes SET status='archived' WHERE caption LIKE 'Daisy cushion in 9 seconds%' AND status='published'`).catch(() => {});
  await db.query(`DELETE FROM howdi_connect_social_messages WHERE body LIKE 'Thanks for approving!%'`).catch(() => {});
  const q = (t, p) => db.query(t, p);
  const dbName = (await q('SELECT current_database() d')).rows[0].d;
  if (!/_preview$/.test(dbName)) throw new Error('seedConnect: preview database only');
  const v8dir = path.join(mediaDir, 'v8'); fs.mkdirSync(v8dir, { recursive: true });
  const users = (await q(`SELECT u.id, u.full_name, u.phone, cp.public_username FROM users u JOIN howdi_connect_profiles cp ON cp.user_id=u.id WHERE u.phone LIKE '91000000__'`)).rows;
  const uid = (n) => { const u = users.find((x) => x.phone === '910000000' + n); if (!u) throw new Error('seedConnect: demo member ' + n + ' missing'); return u; };
  // Vibe creator profiles mirror the Connect @handles
  for (const u of users) {
    await q(`INSERT INTO vibe_creator_profiles(user_id,display_name,public_username,verified_status) VALUES($1,$2,$3,'unverified')
      ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username, display_name=EXCLUDED.display_name`, [String(u.id), u.full_name, u.public_username]);
  }
  const catIds = new Map((await q(`SELECT slug,id FROM vibe_categories`)).rows.map((r) => [r.slug, r.id]));
  let made = 0;
  for (let i = 0; i < VIBES.length; i++) {
    const v = VIBES[i]; const owner = uid(v.by);
    const vid = hash(v.key + '.webm'), pid = hash(v.key + '.jpg');
    fs.copyFileSync(path.join(vibeSrc, v.key + '.webm'), path.join(v8dir, vid + '.webm'));
    fs.copyFileSync(path.join(vibeSrc, v.key + '.jpg'), path.join(v8dir, pid + '.jpg'));
    const url = `/api/v8/media/${vid}.webm`, poster = `/api/v8/media/${pid}.jpg`;
    let row = (await q(`SELECT id FROM vibes WHERE vibe_code=$1`, [v.code])).rows[0];
    const published = new Date(Date.now() - (i * 5 + 2) * 3600e3);
    if (!row) {
      row = (await q(`INSERT INTO vibes(vibe_code,creator_user_id,creator_name,vibe_type,caption,visibility,status,content_type,allow_comments,allow_remix,allow_share,cover_url,published_at,moderation_status,is_learning_vibe)
        VALUES($1,$2,$3,'video',$4,'public','published','general',TRUE,TRUE,TRUE,$5,$6,'approved',$7) RETURNING id`, [v.code, String(owner.id), owner.full_name, v.caption, poster, published, Boolean(v.learning)])).rows[0];
      made++;
    } else {
      await q(`UPDATE vibes SET caption=$2, cover_url=$3, published_at=$4, status='published', visibility='public', deleted_at=NULL WHERE id=$1`, [row.id, v.caption, poster, published]);
    }
    await q(`DELETE FROM vibe_media WHERE vibe_id=$1`, [row.id]);
    await q(`INSERT INTO vibe_media(vibe_id,media_type,media_url,thumbnail_url,mime_type,width,height,duration_ms,position,processing_status) VALUES($1,'video',$2,$3,'video/webm',540,960,9000,0,'ready')`, [row.id, url, poster]);
    await q(`INSERT INTO vibe_stats(vibe_id,likes,comments,saves,shares,plays) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(vibe_id) DO UPDATE SET likes=EXCLUDED.likes, comments=EXCLUDED.comments, saves=EXCLUDED.saves, shares=EXCLUDED.shares, plays=EXCLUDED.plays`,
      [row.id, v.likes, v.comments, v.saves, v.shares, v.likes * 9]);
    await q(`DELETE FROM vibe_category_map WHERE vibe_id=$1`, [row.id]);
    for (const [j, c] of v.cats.entries()) if (catIds.has(c)) await q(`INSERT INTO vibe_category_map(vibe_id,category_id,is_primary) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [row.id, catIds.get(c), j === 0]);
    await q(`DELETE FROM howdi_v8_vibe_links WHERE vibe_id=$1`, [row.id]);
    if (v.link) await q(`INSERT INTO howdi_v8_vibe_links(vibe_id,link_kind,link_label,link_sub,link_route,captions) VALUES($1,$2,$3,$4,$5,TRUE)`, [row.id, v.link.kind, v.link.label, v.link.sub, v.link.route]);
    v.dbId = row.id;
  }
  // comments (idempotent by text)
  for (const c of COMMENTS) {
    const v = VIBES.find((x) => x.code === c.vibe); const u = uid(c.by);
    const exists = (await q(`SELECT 1 FROM vibe_comments WHERE vibe_id=$1 AND user_id=$2 AND comment_text=$3`, [v.dbId, String(u.id), c.text])).rows[0];
    if (!exists) await q(`INSERT INTO vibe_comments(vibe_id,user_id,comment_text,status,created_at) VALUES($1,$2,$3,'visible',NOW()-interval '50 minutes')`, [v.dbId, String(u.id), c.text]);
  }
  // follows: Divya (5) follows Meera (1) and Lakshmi (3); Kiran (4) follows Meera
  for (const [a, b] of [[5, 1], [5, 3], [4, 1], [2, 1]]) {
    const A = uid(a), B = uid(b);
    await q(`INSERT INTO howdi_connect_follows(follower_user_id,following_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [A.id, B.id]);
    await q(`INSERT INTO vibe_follows(follower_user_id,creator_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [String(A.id), String(B.id)]);
  }
  // Stories with photos (expire in 20 h). Previous preview stories are replaced.
  await q(`DELETE FROM howdi_connect_stories WHERE music_track='howdi-v8-preview'`);
  const storyPics = [[1, 'chevron-clutch-2.jpg', 'New clutch colours drop Sunday 🧶'], [3, 'infinity-scarf-2.jpg', 'Scarf season is here'], [3, 'daisy-hooded-cardigan-3.jpg', ''], [2, 'emerald-leaf-clutch-2.jpg', 'From the loom today'], [4, 'leaf-gloves-2.jpg', 'Studio corner'], [1, 'daisy-cushion-3.jpg', 'Petal count: 24']];
  for (const [i, [n, file, text]] of storyPics.entries()) {
    const f = path.join(photoSrc, file);
    if (!fs.existsSync(f)) continue;
    const small = path.join(v8dir, hash('story-' + file) + '.jpg');
    if (!fs.existsSync(small)) require('child_process').execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', f, '-vf', 'scale=360:640:force_original_aspect_ratio=increase,crop=360:640', '-q:v', '8', small]);
    const data = 'data:image/jpeg;base64,' + fs.readFileSync(small).toString('base64');
    await q(`INSERT INTO howdi_connect_stories(user_id,content,media_data,media_type,audience,created_at,expires_at,music_track) VALUES($1,$2,$3,'image','Everyone',NOW()-($4||' minutes')::interval,NOW()+interval '20 hours','howdi-v8-preview')`, [uid(n).id, text, data, String(20 + i * 35)]);
  }
  // Live rooms + Spaces (howdi_connect_communities). Replaced each run.
  await q(`DELETE FROM howdi_connect_communities WHERE checkin_code LIKE 'PV-%'`);
  const thumb = (file) => { const f = path.join(photoSrc, file); const s = path.join(v8dir, hash('thumb-' + file) + '.jpg'); if (!fs.existsSync(s)) require('child_process').execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', f, '-vf', 'scale=480:270:force_original_aspect_ratio=increase,crop=480:270', '-q:v', '8', s]); return 'data:image/jpeg;base64,' + fs.readFileSync(s).toString('base64'); };
  const rooms = [
    ['LIVE', 1, 'Crochet along: chevron clutch', 'Stitch with Meera live — bring 4 mm hook', 'LIVE', 0, 'chevron-clutch-1.jpg', 'Handmade'],
    ['LIVE', 3, 'Granny squares Q&A', 'Your joining questions answered', 'LIVE', 0, 'daisy-hooded-cardigan-1.jpg', 'Handmade'],
    ['LIVE', 2, 'Handloom studio tour', 'Behind the scenes at the loom', 'SCHEDULED', 26, 'emerald-leaf-clutch-1.jpg', 'Craft'],
    ['LIVE', 4, 'Pottery + crochet: mug cosies', 'A two-maker session', 'SCHEDULED', 50, 'leaf-gloves-1.jpg', 'Craft'],
    ['SPACE', 3, 'Crochet business Q&A', 'Pricing, photos and shipping for handmade sellers', 'LIVE', 0, null, 'Business'],
    ['SPACE', 5, 'Reading circle: craft memoirs', 'An open audio chat about books on making', 'LIVE', 0, null, 'Books'],
    ['SPACE', 1, 'Pricing handmade work fairly', 'Makers talk pricing, materials and time', 'SCHEDULED', 5, null, 'Business'],
    ['SPACE', 3, 'Beginner questions hour', 'No question is too small', 'SCHEDULED', 30, null, 'Learning'],
  ];
  for (const [i, r] of rooms.entries()) {
    const [type, n, name, topic, state, inHours, pic, cat] = r;
    await q(`INSERT INTO howdi_connect_communities(owner_user_id,community_type,name,description,privacy,category,status,session_status,scheduled_for,started_at,topic,replay_enabled,live_thumbnail_data,checkin_code,created_at,updated_at)
      VALUES($1,$2,$3,$4::text,'PUBLIC',$5,'ACTIVE',$6,$7,$8,$4::varchar,TRUE,$9,$10,NOW(),NOW())`,
      [uid(n).id, type, name, topic, cat, state, state === 'SCHEDULED' ? new Date(Date.now() + inHours * 3600e3) : new Date(Date.now() - 20 * 60e3), state === 'LIVE' ? new Date(Date.now() - 20 * 60e3) : null, pic ? thumb(pic) : null, 'PV-' + i]);
  }
  // Group memberships + one private group with a pending join request
  const spaces = (await q(`SELECT id, slug FROM howdi_connect_social_spaces`)).rows;
  const sid = (slug) => (spaces.find((s) => s.slug === slug) || {}).id;
  if (!sid('crochet-business-owners')) {
    await q(`INSERT INTO howdi_connect_social_spaces(owner_user_id,space_type,name,slug,description,category,privacy,member_count,message_count,is_verified,is_archived,created_at,updated_at)
      VALUES($1,'GROUP','Crochet Business Owners','crochet-business-owners','Pricing, suppliers and selling tips for makers who sell on HOWDI.','Business','PRIVATE',3,0,FALSE,FALSE,NOW(),NOW())`, [uid(1).id]);
    spaces.push({ id: (await q(`SELECT id FROM howdi_connect_social_spaces WHERE slug='crochet-business-owners'`)).rows[0].id, slug: 'crochet-business-owners' });
  }
  const members = [['telangana-crochet-circle', 1, 'OWNER'], ['telangana-crochet-circle', 3, 'MODERATOR'], ['telangana-crochet-circle', 5, 'MEMBER'], ['handloom-stories', 2, 'OWNER'], ['beginner-embroidery-club', 3, 'OWNER'], ['crochet-business-owners', 1, 'OWNER'], ['crochet-business-owners', 3, 'MEMBER']];
  for (const [slug, n, role] of members) if (sid(slug)) await q(`INSERT INTO howdi_connect_social_space_members(space_id,user_id,role,status,joined_via,joined_at,updated_at) VALUES($1,$2,$3,'ACTIVE','preview',NOW(),NOW()) ON CONFLICT DO NOTHING`, [sid(slug), uid(n).id, role]);
  if (sid('crochet-business-owners')) await q(`INSERT INTO howdi_connect_social_space_members(space_id,user_id,role,status,joined_via,joined_at,updated_at) VALUES($1,$2,'MEMBER','PENDING','request',NOW(),NOW()) ON CONFLICT DO NOTHING`, [sid('crochet-business-owners'), uid(4).id]);

  // Ended live with a replay (Preview/Test replay = a preview Vibe clip), rules + an event for the main group
  const replayVid = `/api/v8/media/${hash('floral-frame-purse.webm')}.webm`;
  const ended = (await q(`INSERT INTO howdi_connect_communities(owner_user_id,community_type,name,description,privacy,category,status,session_status,scheduled_for,started_at,ended_at,topic,replay_enabled,live_thumbnail_data,checkin_code,created_at,updated_at)
    VALUES($1,'LIVE','Frame purse finishing (replay)','Lining, clasp and the final seams','PUBLIC','Handmade','ACTIVE','ENDED',NOW()-interval '2 days',NOW()-interval '2 days',NOW()-interval '2 days'+interval '45 minutes','Lining, clasp and the final seams',TRUE,$2,'PV-replay',NOW(),NOW()) RETURNING id`, [uid(1).id, thumb('floral-frame-purse-1.jpg')])).rows[0].id;
  await q(`DELETE FROM howdi_connect_live_replays WHERE community_id=$1`, [ended]);
  await q(`INSERT INTO howdi_connect_live_replays(community_id,replay_status,duration_seconds,source_type,replay_url,created_at,updated_at) VALUES($1,'READY',2700,'PREVIEW',$2,NOW(),NOW())`, [ended, replayVid]);
  await q(`UPDATE howdi_connect_communities SET space_rules='Be kind. No selling in chat unless the host asks. Keep questions on topic.' WHERE checkin_code LIKE 'PV-%'`);
  const tcc = sid('telangana-crochet-circle');
  if (tcc) {
    await q(`INSERT INTO howdi_v8_community_meta(space_id,rules) VALUES($1,$2::jsonb) ON CONFLICT(space_id) DO UPDATE SET rules=EXCLUDED.rules`, [tcc, JSON.stringify(['Be respectful and kind', 'No spam or self-promotion outside Friday threads', 'Credit pattern designers', 'Report harmful content'])]);
    await q(`DELETE FROM howdi_v8_community_events WHERE space_id=$1`, [tcc]);
    await q(`INSERT INTO howdi_v8_community_events(space_id,title,details,starts_at,place,created_by) VALUES($1,'Saturday stitch-along','Bring any project — we’ll help with tension and joins.',NOW()+interval '3 days','Online (Space)',$2),($1,'Warangal meetup','Craft café meetup, 4–6 pm.',NOW()+interval '10 days','Warangal',$2)`, [tcc, uid(1).id]);
    const msgs = (await q(`SELECT COUNT(*) n FROM howdi_connect_social_messages WHERE space_id=$1`, [tcc])).rows[0].n;
    if (Number(msgs) < 2) await q(`INSERT INTO howdi_connect_social_messages(space_id,sender_user_id,message_type,body,is_pinned,created_at) VALUES($1,$2,'POST','Welcome to Telangana Crochet Circle! Introduce yourself and share what you’re making this week 🧶',TRUE,NOW()-interval '3 days'),($1,$3,'POST','Finished my first granny square blanket row. The joining tip from Saturday worked!',FALSE,NOW()-interval '5 hours')`, [tcc, uid(1).id, uid(5).id]);
  }
  const cbo = sid('crochet-business-owners');
  if (cbo) await q(`INSERT INTO howdi_v8_community_meta(space_id,rules) VALUES($1,$2::jsonb) ON CONFLICT(space_id) DO UPDATE SET rules=EXCLUDED.rules`, [cbo, JSON.stringify(['Members must sell handmade work', 'Share pricing honestly', 'No poaching customers'])]);
  for (const [slug, pic] of [['telangana-crochet-circle', 'daisy-hooded-cardigan-2.jpg'], ['beginner-embroidery-club', 'leaf-gloves-3.jpg'], ['handloom-stories', 'emerald-leaf-clutch-3.jpg'], ['crochet-business-owners', 'chevron-clutch-3.jpg']]) {
    if (sid(slug)) await q(`UPDATE howdi_connect_social_spaces SET cover_data=$2 WHERE id=$1`, [sid(slug), thumb(pic)]);
  }
  return { vibes: VIBES.length, newVibes: made, stories: storyPics.length, rooms: rooms.length };
}
module.exports = { seedConnect };
