// HOWDI V8 preview seed — Creator workspace, memberships, Hype, Tips (idempotent, *_preview database only).
// Fictional preview content made from the owner's own product photos. Replaced on every run (rows tagged 'howdi-v8-preview').
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const hash = (s) => crypto.createHash('md5').update('howdi-v8-preview|' + s).digest('hex');
const TAG = 'howdi-v8-preview';

async function seedCreator(db, { mediaDir, photoSrc }) {
  const q = (t, p) => db.query(t, p);
  const dbName = (await q('SELECT current_database() d')).rows[0].d;
  if (!/_preview$/.test(dbName)) throw new Error('seedCreator: preview database only');
  const v8dir = path.join(mediaDir, 'v8'); fs.mkdirSync(v8dir, { recursive: true });
  const photo = (file) => { const src = path.join(photoSrc, file); const name = hash('photo-' + file) + '.jpg'; const dst = path.join(v8dir, name); if (!fs.existsSync(dst) && fs.existsSync(src)) fs.copyFileSync(src, dst); return `/api/v8/media/${name}`; };
  const users = (await q(`SELECT u.id, u.phone FROM users u WHERE u.phone LIKE '91000000__'`)).rows;
  const uid = (n) => { const u = users.find((x) => x.phone === '910000000' + n); if (!u) throw new Error('seedCreator: demo member ' + n + ' missing'); return Number(u.id); };
  const meera = uid(1), arjun = uid(2), lakshmi = uid(3), kiran = uid(4), divya = uid(5);

  // ---- reset previous preview rows
  const old = (await q(`SELECT post_id FROM howdi_v8_post_meta pm JOIN howdi_community_posts p ON p.id=pm.post_id WHERE p.source_url=$1`, [TAG])).rows.map((r) => r.post_id);
  await q(`DELETE FROM howdi_v8_comment_holds WHERE comment_key IN (SELECT id::text FROM howdi_community_comments WHERE post_id IN (SELECT id FROM howdi_community_posts WHERE source_url=$1))`, [TAG]);
  await q(`DELETE FROM howdi_community_comments WHERE post_id IN (SELECT id FROM howdi_community_posts WHERE source_url=$1)`, [TAG]);
  await q(`DELETE FROM howdi_community_reactions WHERE post_id IN (SELECT id FROM howdi_community_posts WHERE source_url=$1)`, [TAG]);
  await q(`DELETE FROM howdi_v8_post_meta WHERE post_id=ANY($1::bigint[])`, [old]);
  await q(`DELETE FROM howdi_community_posts WHERE source_url=$1`, [TAG]);
  // walkthrough artefacts (members-only posts / Hype made during recordings)
  await q(`DELETE FROM howdi_v8_post_meta WHERE post_id IN (SELECT id FROM howdi_community_posts WHERE content LIKE 'Members: the full chevron clutch pattern%' OR content LIKE 'Studio Hype:%' OR content LIKE 'Simple steps for neater, more even squares%')`);
  await q(`UPDATE howdi_community_posts SET post_status='DELETED' WHERE content LIKE 'Members: the full chevron clutch pattern%' OR content LIKE 'Studio Hype:%' OR content LIKE 'Simple steps for neater, more even squares%'`);
  await q(`DELETE FROM howdi_v8_drafts WHERE user_id=ANY($1::bigint[])`, [[meera, lakshmi, divya]]);
  await q(`DELETE FROM howdi_v8_creator_payouts WHERE creator_user_id=ANY($1::bigint[])`, [[meera, lakshmi]]);
  await q(`DELETE FROM howdi_connect_subscription_ledger WHERE creator_user_id=ANY($1::bigint[])`, [[meera, lakshmi]]);
  await q(`DELETE FROM howdi_connect_subscriptions WHERE creator_user_id=ANY($1::bigint[])`, [[meera, lakshmi]]);
  await q(`UPDATE howdi_connect_subscription_plans SET is_active=FALSE WHERE creator_user_id=ANY($1::bigint[])`, [[meera, lakshmi]]);
  // Divya joins on camera: clear any older (legacy) membership she holds with Meera
  await q(`UPDATE howdi_connect_creator_subscriptions SET status='CANCELLED', updated_at=NOW() WHERE creator_user_id=$1 AND subscriber_user_id=$2`, [meera, divya]).catch(() => {});
  await q(`DELETE FROM howdi_v8_idem WHERE user_id=ANY($1::bigint[])`, [[meera, divya, kiran]]).catch(() => {});
  await q(`INSERT INTO howdi_v8_wallets(user_id,balance,sandbox) VALUES($1,2000,TRUE) ON CONFLICT(user_id) DO UPDATE SET balance=2000`, [divya]).catch(() => {});

  // ---- Meera's membership tier + two existing members (paid through the sandbox ledger)
  const tier = (await q(`INSERT INTO howdi_connect_subscription_plans(creator_user_id,plan_name,plan_code,description,price_monthly,price_yearly,currency,benefits,is_active,v8_paused)
    VALUES($1,'Crochet Circle',$2,'Exclusive patterns, live workshops & more',149,1499,'INR',$3::jsonb,TRUE,FALSE) RETURNING id`,
    [meera, 'V8-PV-' + Date.now().toString(36).toUpperCase(), JSON.stringify(['Exclusive patterns & tutorials', 'Monthly live workshops', 'Subscriber-only content', 'Early access to shop links', 'Private member community'])])).rows[0].id;
  await q(`UPDATE howdi_connect_profiles SET creator_mode=TRUE, headline=COALESCE(NULLIF(headline,''),'Crochet · DIY · Mindful living'), about=COALESCE(NULLIF(about,''),'Turning yarn into a happier, kinder everyday.') WHERE user_id=$1`, [meera]);
  for (const [n, days] of [[lakshmi, 40], [arjun, 12]]) {
    const ref = 'HPY-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const s = (await q(`INSERT INTO howdi_connect_subscriptions(subscriber_user_id,creator_user_id,plan_id,billing_cycle,status,amount,currency,started_at,current_period_start,current_period_end,v8_payment_ref)
      VALUES($1,$2,$3,'MONTHLY','ACTIVE',149,'INR',NOW()-($4||' days')::interval,NOW()-interval '5 days',NOW()+interval '25 days',$5) RETURNING id`, [n, meera, tier, String(days), ref])).rows[0].id;
    await q(`INSERT INTO howdi_connect_subscription_ledger(subscription_id,creator_user_id,subscriber_user_id,event_type,gross_amount,platform_fee,creator_amount,currency,reference_code,created_at) VALUES($1,$2,$3,'SUBSCRIPTION_STARTED',149,14.9,134.1,'INR',$4,NOW()-($5||' days')::interval)`, [s, meera, n, ref, String(days)]);
  }

  // ---- posts (Hype, Tips, members-only, scheduled)
  const post = async (by, kind, content, meta, extra = {}) => {
    const gallery = (extra.photos || []).map((f) => ({ url: photo(f), type: 'image' }));
    const id = (await q(`INSERT INTO howdi_community_posts(user_id,content,category,visibility,post_type,post_status,audience_scope,allow_comments,media_gallery,media_type,subscribers_only,article_excerpt,scheduled_for,source_url,created_at,updated_at)
      VALUES($1,$2,'GENERAL','PUBLIC',$3,$4,'EVERYONE',TRUE,$5::jsonb,$6,$7,$8,$9,$10,NOW()-($11||' minutes')::interval,NOW()) RETURNING id`,
      [by, content, kind.toUpperCase(), extra.schedule ? 'SCHEDULED' : 'PUBLISHED', JSON.stringify(gallery), gallery[0] ? 'image' : null, Boolean(extra.members), extra.teaser || '', extra.schedule || null, TAG, String(extra.ago || 60)])).rows[0].id;
    await q(`INSERT INTO howdi_v8_post_meta(post_id,kind,title,hype_type,disclosure,category,steps,related,alts,tags,teaser) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11)`,
      [id, kind, meta.title || null, meta.hype || null, meta.disclosure || 'none', meta.category || null, JSON.stringify(meta.steps || []), JSON.stringify(meta.related || []), JSON.stringify(extra.alts || []), JSON.stringify(meta.tags || []), extra.teaser || null]);
    for (const [who, text] of extra.comments || []) await q(`INSERT INTO howdi_community_comments(post_id,user_id,content) VALUES($1,$2,$3)`, [id, who, text]);
    for (const who of extra.likes || []) await q(`INSERT INTO howdi_community_reactions(post_id,user_id,reaction) VALUES($1,$2,'LIKE') ON CONFLICT DO NOTHING`, [id, who]);
    return id;
  };
  const worker = (await q(`SELECT worker_code, full_name FROM works_workers WHERE LOWER(kyc_status)='verified' AND worker_code IS NOT NULL ORDER BY worker_code LIMIT 1`).catch(() => ({ rows: [] }))).rows[0];
  const rel = [
    { kind: 'course', title: 'Crochet basics: your first coaster', sub: 'Course · Beginner', image: null, route: '/learn/courses' },
    { kind: 'product', title: 'Chevron Crochet Clutch', sub: 'Shop · ₹1,299', image: photo('chevron-clutch-3.jpg'), route: '/shop/crochet' },
    ...(worker ? [{ kind: 'worker', title: worker.full_name, sub: 'Worker · Tailoring & alterations', image: null, route: `/works/workers/${worker.worker_code}` }] : []),
    { kind: 'community', title: 'Telangana Crochet Circle', sub: 'Group · members', image: photo('daisy-hooded-cardigan-2.jpg'), route: '/connect/communities/telangana-crochet-circle' },
  ];
  await post(meera, 'hype', 'Finished my first sunflower… I mean daisy cushion! 🌼 The community here keeps me going 💙 #crochet #handmade', { hype: 'creator', tags: ['crochet', 'handmade'] },
    { photos: ['daisy-cushion-2.jpg'], alts: ['A round white and yellow crochet daisy cushion on a sofa'], ago: 120, likes: [arjun, lakshmi, kiran, divya],
      comments: [[lakshmi, 'This is gorgeous! What yarn did you use?'], [kiran, 'So inspiring! I’m starting mine this weekend.'], [meera, 'Cotton blend from a local maker — pattern is in my Tips 💙']] });
  await post(lakshmi, 'hype', 'Live now: cosy cardigan Q&A — join our friendly live and bring your questions! #granny', { hype: 'live', tags: ['granny'] }, { photos: ['daisy-hooded-cardigan-1.jpg'], alts: ['Hooded cardigan made of granny squares'], ago: 240, likes: [meera, divya] });
  await post(arjun, 'hype', 'Handloom moment: slow stitches, brighter days. 🧵 #handloom', { hype: 'community', tags: ['handloom'], disclosure: 'gifted' }, { photos: ['emerald-leaf-clutch-2.jpg'], alts: ['Emerald leaf-stitch clutch on a wooden table'], ago: 600, likes: [meera] });
  await post(lakshmi, 'tip', 'A quick way to make your rounds look seamless — great for hats, bags and amigurumi.', { title: 'Tip: Invisible join for a cleaner finish', category: 'crochet', tags: ['crochettips', 'beginner'],
    steps: [{ text: 'Finish your last stitch but don’t pull tight.', image: photo('infinity-scarf-3.jpg') }, { text: 'Cut the yarn and pull the tail up through the loop.', image: null }, { text: 'Thread a needle, go under both loops of the first stitch of the round.', image: null }, { text: 'Go back into the last stitch and pull gently until it matches the others.', image: null }],
    related: rel }, { photos: ['infinity-scarf-2.jpg'], alts: ['Textured pink infinity scarf'], ago: 180, likes: [meera, divya, kiran], comments: [[divya, 'Saved! Trying this weekend.']] });
  await post(meera, 'tip', 'Try to keep the same grip and yarn flow. If your stitches feel uneven, take a short break and relax your hands.', { title: 'Tip: Keep your tension consistent', category: 'crochet', tags: ['tension', 'beginner'],
    steps: [{ text: 'Wrap the yarn twice around your little finger for steady feed.', image: null }, { text: 'Hold the hook like a pencil, not a knife.', image: null }, { text: 'Crochet a 20-stitch swatch and compare row widths.', image: photo('chevron-clutch-1.jpg') }],
    related: rel.slice(0, 2) }, { photos: ['chevron-clutch-2.jpg'], alts: ['Close-up of chevron crochet rows'], ago: 400, likes: [lakshmi, arjun] });
  await post(arjun, 'tip', 'Get better results with the right hook for your yarn weight.', { title: 'Tip: Choose the right hook size', category: 'tools', tags: ['tools'],
    steps: [{ text: 'Check the hook size printed on the yarn label.', image: null }, { text: 'Go 0.5 mm smaller for tight amigurumi.', image: null }, { text: 'Go 0.5 mm bigger for drapey shawls.', image: null }], related: rel.slice(2) }, { photos: ['leaf-gloves-3.jpg'], alts: ['Leaf motif gloves'], ago: 900 });
  await post(meera, 'post', 'Members: the Granny Square Basics workshop replay and the full chevron clutch chart are up — row counts, colour changes and my finishing checklist.', {}, { members: true, teaser: 'Live Stitch-Along: Crochet Tote Bag — replay + full pattern', photos: ['chevron-clutch-3.jpg'], alts: ['Chevron clutch pattern chart'], ago: 30 });
  await post(meera, 'hype', 'Sunday maker picks: my favourite tools this month. #tools', { hype: 'trending', tags: ['tools'] }, { photos: ['floral-frame-purse-2.jpg'], schedule: new Date(Date.now() + 26 * 3600e3), ago: 10 });
  // drafts (calendar)
  await q(`INSERT INTO howdi_v8_drafts(user_id,kind,title,payload,ready,planned_for) VALUES($1,'article','Beginner hook guide',$2::jsonb,FALSE,NOW()+interval '3 days'),($1,'tip','Tip: Blocking your granny squares',$3::jsonb,TRUE,NOW()+interval '4 days')`,
    [meera, JSON.stringify({ excerpt: 'Everything I wish I knew when I started.' }), JSON.stringify({ kind: 'tip', title: 'Tip: Blocking your granny squares', text: 'Simple steps for neater, more even squares.', category: 'crochet', steps: [{ text: 'Pin each square to a foam mat.' }], audience: 'everyone', related: [], tags: [], hype_type: 'creator', disclosure: 'none', members_only: false, teaser: '', allow_comments: true, schedule_at: '' })]);
  // creator safety: blocked phrase + one held comment on Meera's Hype
  await q(`INSERT INTO howdi_v8_creator_safety(user_id,muted_words,blocked_phrases,mentions,sensitive_default) VALUES($1,'["#spam"]'::jsonb,'["cheap copy","dm for price"]'::jsonb,'everyone',TRUE)
    ON CONFLICT(user_id) DO UPDATE SET muted_words=EXCLUDED.muted_words, blocked_phrases=EXCLUDED.blocked_phrases`, [meera]);
  const hype = (await q(`SELECT p.id FROM howdi_community_posts p JOIN howdi_v8_post_meta pm ON pm.post_id=p.id WHERE p.user_id=$1 AND pm.kind='hype' AND p.source_url=$2 AND p.post_status='PUBLISHED' ORDER BY p.id LIMIT 1`, [meera, TAG])).rows[0];
  if (hype) {
    const c = (await q(`INSERT INTO howdi_community_comments(post_id,user_id,content) VALUES($1,$2,'This looks like a cheap copy of a store pattern') RETURNING id`, [hype.id, kiran])).rows[0].id;
    await q(`INSERT INTO howdi_v8_comment_holds(creator_user_id,kind,comment_key,matched) VALUES($1,'post',$2,'cheap copy') ON CONFLICT DO NOTHING`, [meera, String(c)]);
  }
  await q(`INSERT INTO howdi_v8_moderation_audit(user_id,action,detail) VALUES($1,'SAFETY_UPDATED','Blocked phrases updated')`, [meera]).catch(() => {});
  return { tier: 'Crochet Circle', members: 2, hype: 4, tips: 3 };
}
module.exports = { seedCreator };
