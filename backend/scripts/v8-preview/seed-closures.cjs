// HOWDI V8 preview seed — Slice 2 Connect closures (idempotent, *_preview database only). Fictional preview content.
// Run after seed-connect + seed-creator. Adds: story views / reactions / replies on Meera's stories, two highlights,
// a members-only live, community location + invite link, and one post waiting for a rights check.
async function seedClosures(db) {
  const q = (t, p) => db.query(t, p);
  const dbName = (await q('SELECT current_database() d')).rows[0].d;
  if (!/_preview$/.test(dbName)) throw new Error('seedClosures: preview database only');
  const users = (await q(`SELECT u.id, u.phone FROM users u WHERE u.phone LIKE '91000000__'`)).rows;
  const uid = (n) => { const u = users.find((x) => x.phone === '910000000' + n); if (!u) throw new Error('seedClosures: demo member ' + n + ' missing'); return Number(u.id); };
  const meera = uid(1), arjun = uid(2), lakshmi = uid(3), kiran = uid(4), divya = uid(5);

  // story insights: views, a reaction and a private reply on Meera's newest story
  const st = (await q(`SELECT id FROM howdi_connect_stories WHERE user_id=$1 AND expires_at>NOW() ORDER BY created_at DESC`, [meera])).rows.map((r) => r.id);
  for (const s of st) for (const v of [divya, arjun, lakshmi]) await q(`INSERT INTO howdi_connect_story_views(story_id,viewer_key,user_id,created_at) VALUES($1,$2,$3,NOW()-interval '9 minutes') ON CONFLICT DO NOTHING`, [s, 'u:' + v, v]);
  if (st[0]) {
    await q(`INSERT INTO howdi_connect_story_reactions(story_id,user_id,reaction) VALUES($1,$2,'🔥') ON CONFLICT (story_id,user_id) DO UPDATE SET reaction='🔥'`, [st[0], divya]);
    await q(`DELETE FROM howdi_connect_story_replies WHERE story_id=$1 AND sender_user_id=$2`, [st[0], arjun]);
    await q(`INSERT INTO howdi_connect_story_replies(story_id,sender_user_id,body) VALUES($1,$2,'Love these colours! Which yarn is this?')`, [st[0], arjun]);
  }
  // highlights (keep each source story's audience)
  await q(`DELETE FROM howdi_connect_highlights WHERE user_id=$1`, [meera]);
  const src = (await q(`SELECT id, content, media_data, media_type, audience, created_at FROM howdi_connect_stories WHERE user_id=$1 ORDER BY created_at DESC`, [meera])).rows;
  for (const [i, s] of src.entries()) {
    await q(`INSERT INTO howdi_connect_highlights(user_id,source_story_id,title,content,media_data,media_type,audience,is_cover,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
      [meera, s.id, i % 2 ? 'Behind the scenes' : 'New drops', s.content, s.media_data, s.media_type, s.audience || 'Everyone', i < 2, s.created_at]);
  }
  // members-only live (Meera has the Crochet Circle tier from seed-creator)
  await q(`UPDATE howdi_connect_communities SET subscribers_only=(checkin_code IN ('PV-0','PV-6')) WHERE checkin_code LIKE 'PV-%'`);
  // demo groups/channel (older preview databases already have them; a fresh database needs them created)
  const GROUPS = [
    ['telangana-crochet-circle', 'GROUP', 'Telangana Crochet Circle', 'Telangana Crochet Circle — makers across the state sharing patterns, stitch help and weekend meetups.', 'Crafts', meera, [[meera, 'OWNER'], [lakshmi, 'MODERATOR'], [divya, 'MEMBER']],
      ['Be respectful and kind', 'No spam or self-promotion outside Friday threads', 'Credit pattern designers', 'Report harmful content']],
    ['handloom-stories', 'CHANNEL', 'Handloom Stories', 'Handloom Stories — a weaver’s notes from the loom: dyes, patterns and the people behind them.', 'Textiles', arjun, [[arjun, 'OWNER']], ['Be kind in the comments', 'Ask before reusing photos']],
    ['beginner-embroidery-club', 'GROUP', 'Beginner Embroidery Club', 'Beginner Embroidery Club — first stitches, simple patterns and friendly feedback.', 'Learning', lakshmi, [[lakshmi, 'OWNER']], ['No question is too small', 'Share your progress, not just finished work']],
  ];
  for (const [slug, type, name, desc, cat, owner, mems, rules] of GROUPS) {
    if ((await q(`SELECT 1 FROM howdi_connect_social_spaces WHERE slug=$1`, [slug])).rowCount) continue;
    const sid = (await q(`INSERT INTO howdi_connect_social_spaces(owner_user_id,space_type,name,slug,description,category,privacy,member_count,message_count,is_verified,is_archived,created_at,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,'PUBLIC',$7,0,FALSE,FALSE,NOW()-interval '40 days',NOW()) RETURNING id`, [owner, type, name, slug, desc, cat, mems.length])).rows[0].id;
    for (const [u, role] of mems) await q(`INSERT INTO howdi_connect_social_space_members(space_id,user_id,role,status,joined_via,joined_at,updated_at) VALUES($1,$2,$3,'ACTIVE','preview',NOW(),NOW()) ON CONFLICT DO NOTHING`, [sid, u, role]);
    await q(`INSERT INTO howdi_v8_community_meta(space_id,rules) VALUES($1,$2::jsonb) ON CONFLICT(space_id) DO NOTHING`, [sid, JSON.stringify(rules)]);
  }
  // community: location + invite link for the main group
  const tcc = (await q(`SELECT id FROM howdi_connect_social_spaces WHERE slug='telangana-crochet-circle'`)).rows[0];
  if (tcc) await q(`INSERT INTO howdi_v8_community_meta(space_id,location,invite_code) VALUES($1,'Warangal, Telangana','PVCIRCLE22') ON CONFLICT(space_id) DO UPDATE SET location=EXCLUDED.location, invite_code=EXCLUDED.invite_code`, [tcc.id]);
  const cbo = (await q(`SELECT id FROM howdi_connect_social_spaces WHERE slug='crochet-business-owners'`)).rows[0];
  if (cbo) await q(`INSERT INTO howdi_v8_community_meta(space_id,location,invite_code) VALUES($1,'Hyderabad','PVBIZOWN22') ON CONFLICT(space_id) DO UPDATE SET location=EXCLUDED.location, invite_code=EXCLUDED.invite_code`, [cbo.id]);
  // rights review: one Hype by Kiran waiting for HOWDI Admin
  await q(`DELETE FROM howdi_v8_rights_checks WHERE note='howdi-v8-preview'`);
  await q(`DELETE FROM howdi_community_posts WHERE source_url='howdi-v8-preview-rights'`);
  const p = (await q(`INSERT INTO howdi_community_posts(user_id,content,category,visibility,post_type,post_status,audience_scope,allow_comments,source_url,created_at,updated_at)
    VALUES($1,'Glazing mugs to my favourite film song 🎶 #pottery','GENERAL','PUBLIC','HYPE','RIGHTS_REVIEW','EVERYONE',TRUE,'howdi-v8-preview-rights',NOW()-interval '20 minutes',NOW()) RETURNING id`, [kiran])).rows[0].id;
  await q(`INSERT INTO howdi_v8_post_meta(post_id,kind,hype_type) VALUES($1,'hype','creator') ON CONFLICT DO NOTHING`, [p]);
  await q(`INSERT INTO howdi_v8_rights_checks(user_id,kind,entity_key,reason,declared,note,target_status,created_at) VALUES($1,'post',$2,'declared','third_party','howdi-v8-preview','PUBLISHED',NOW()-interval '20 minutes')`, [kiran, String(p)]);
  return { stories: st.length, highlights: src.length, membersOnlyRooms: 2, rightsHeld: 1 };
}
module.exports = { seedClosures };
