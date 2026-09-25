// K5A Connect Home Phase 1 — real-PostgreSQL suite helpers.
// Reuses the Worker suite harness (real backend/server.js booted on a scratch database) and adds Home fixtures.
if (!process.env.WORKER_PG_URL && process.env.K5A_PG_URL) process.env.WORKER_PG_URL = process.env.K5A_PG_URL;
if (!process.env.HOWDI_HOME_CURSOR_KEY) process.env.HOWDI_HOME_CURSOR_KEY = 'k5a-suite-cursor-key-' + require('node:crypto').randomBytes(16).toString('hex');
const L = require('../worker-pg/lib.cjs');
const crypto = require('node:crypto');
const { pool } = L;

let seq = 0;
const bigId = () => 7700000 + (++seq) * 7919;   // distinctive internal ids the leak scan can look for

async function member(name, { username, discoverable = true, privateProfile = false, accountStatus = 'ACTIVE', isActive = true, creator = false, avatar = null } = {}) {
  const u = await L.mkUser(name, { id: bigId() });
  await pool.query(`UPDATE users SET account_status=$2,is_active=$3 WHERE id=$1`, [u.id, accountStatus, isActive]);
  if (username) {
    await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username,discoverable,private_profile,creator_mode,headline,avatar_data,profession_title,updated_at)
      VALUES($1,$2,$3,$4,$5,'',COALESCE($6,''),$7,NOW()) ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username,discoverable=EXCLUDED.discoverable,
      private_profile=EXCLUDED.private_profile,creator_mode=EXCLUDED.creator_mode,avatar_data=EXCLUDED.avatar_data,profession_title=EXCLUDED.profession_title`,
      [u.id, username, discoverable, privateProfile, creator, avatar, creator ? 'Potter' : 'Member']);
  }
  return { ...u, username };
}
async function post(author, content, { type = 'POST', status = 'PUBLISHED', audience = 'EVERYONE', subscribersOnly = false, subscriberOnly = false, title = '', excerpt = '', scheduledFor = null, createdAgo = 0 } = {}) {
  const id = bigId();
  await pool.query(`INSERT INTO howdi_community_posts(id,user_id,content,post_type,post_status,audience_scope,subscribers_only,subscriber_only,article_title,article_excerpt,scheduled_for,created_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()-($12||' minutes')::interval)`, [id, author.id, content, type, status, audience, subscribersOnly, subscriberOnly, title, excerpt, scheduledFor, String(createdAgo)]);
  return { id };
}
const react = (p, u) => pool.query(`INSERT INTO howdi_community_reactions(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [p.id, u.id]);
async function story(author, content, { audience = 'Everyone', expired = false } = {}) {
  const id = bigId();
  await pool.query(`INSERT INTO howdi_connect_stories(id,user_id,content,media_type,audience,created_at,expires_at) VALUES($1,$2,$3,'TEXT',$4,NOW(),NOW()+INTERVAL '${expired ? '-1 hour' : '20 hours'}')`, [id, author.id, content, audience]);
  return { id };
}
const viewStory = (s, u) => pool.query(`INSERT INTO howdi_connect_story_views(story_id,viewer_key,user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [s.id, 'u' + u.id, u.id]);
const follow = (a, b) => pool.query(`INSERT INTO howdi_connect_follows(follower_user_id,following_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [a.id, b.id]);
const block = (a, b) => pool.query(`INSERT INTO howdi_connect_profile_blocks(blocker_user_id,blocked_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [a.id, b.id]);
async function vendor(owner, { status = 'active', business = 'Asha Clay Studio' } = {}) {
  const id = bigId();
  await pool.query(`INSERT INTO vendor_profiles(id,user_id,business_name,owner_name,status,vendor_code,city,pincode,address) VALUES($1,$2,$3,$4,$5,$6,'Warangal','506002','14 Private Kiln Lane')`,
    [id, owner.id, business, owner.name, status, 'HOWDI-VND-' + crypto.randomBytes(3).toString('hex').toUpperCase()]);
  return { id };
}
async function product(v, name, { status = 'published', archived = false, future = false, stock = 5, moderation = null } = {}) {
  const id = bigId();
  await pool.query(`INSERT INTO vendor_products(id,vendor_profile_id,name,sku,category,price,mrp,stock,status,archived_at,published_at,image_urls)
    VALUES($1,$2,$3,$4,'Pottery',450,500,$5,$6,${archived ? 'NOW()' : 'NULL'},${future ? "NOW()+INTERVAL '5 days'" : 'NOW()'},'["https://cdn.example/p.jpg"]'::jsonb)`, [id, v.id, name, 'SKU-' + id, stock, status]);
  if (moderation) await pool.query(`INSERT INTO howdi_shop_product_moderation_v162c(product_id,seller_user_id,status) VALUES($1,gen_random_uuid(),$2)`, [id, moderation]);
  return { id };
}
let svc = 0;
async function worker(user, { code, kyc = 'verified', visibleService = true } = {}) {
  const sid = bigId();
  await pool.query(`INSERT INTO works_services(id,service_code,name,active,customer_visible) VALUES($1,$2,$3,TRUE,$4)`, [sid, 'SVC-K5A-' + (++svc), 'Kiln repair ' + svc, visibleService]);
  const w = await L.mkWorker(user, { id: bigId(), code, kyc });
  await pool.query(`UPDATE works_workers SET city='Warangal',pincode='506002',rating=4.7,completed_jobs=9 WHERE id=$1`, [w.id]);
  await pool.query(`INSERT INTO works_worker_services(worker_id,service_id,status,is_primary) VALUES($1,$2,'approved',TRUE)`, [w.id, sid]);
  return w;
}
async function course(title, { publish = 'PUBLISHED', active = true } = {}) {
  const r = await pool.query(`INSERT INTO learning_courses(title,category,level,price,publish_status,is_active) VALUES($1,'Pottery','Beginner',0,$2,$3) RETURNING id`, [title, publish, active]);
  return { id: r.rows[0].id };
}
const enroll = (u, c, progress = 40) => pool.query(`INSERT INTO user_course_enrollments(user_id,course_id,progress,status) VALUES($1,$2::uuid,$3,'IN_PROGRESS')`, [u.id, c.id, progress]);
async function community(owner, name, slug, { privacy = 'PUBLIC', type = 'GROUP' } = {}) {
  const id = bigId();
  await pool.query(`INSERT INTO howdi_connect_social_spaces(id,owner_user_id,space_type,name,slug,privacy,member_count) VALUES($1,$2,$3,$4,$5,$6,12)`, [id, owner.id, type, name, slug, privacy]);
  return { id };
}
const notify = (u, actor, message) => pool.query(`INSERT INTO howdi_connect_notifications(id,user_id,actor_user_id,notification_type,message) VALUES($1,$2,$3,'FOLLOW',$4)`, [bigId(), u.id, actor ? actor.id : null, message]);
async function vibe(creator, code, caption) {
  const r = await pool.query(`INSERT INTO vibes(vibe_code,creator_user_id,caption,status,visibility,published_at) VALUES($1,$2,$3,'published','public',NOW()) RETURNING id`, [code, String(creator.id), caption]);
  return { id: r.rows[0].id, code };
}
const special = (title, ctaUrl) => pool.query(`INSERT INTO howdi_connect_home_specials(title,subtitle,cta_label,cta_url,status) VALUES($1,'This week on HOWDI','Explore',$2,'ACTIVE')`, [title, ctaUrl]);
const hero = (title, ctaUrl) => pool.query(`INSERT INTO howdi_connect_home_hero(title,body_text,cta_label,cta_url,status,media_type) VALUES($1,'Fresh from the kiln','Open',$2,'ACTIVE','NONE')`, [title, ctaUrl]);
const quote = (text, author) => pool.query(`INSERT INTO howdi_connect_daily_quotes(quote_text,author) VALUES($1,$2)`, [text, author]);

// ---- scanners
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const FORBIDDEN_KEY = /^(id|user_?id|creator_?id|worker_?id|teacher_?id|vendor_?id|product_?id|course_?id|post_?id|story_?id|vibe_?id|space_?id|howdi_?id|master_?id|identity_?uuid|uuid|email|phone|mobile|address|full_?address|address_?line|pincode|lat|lng|latitude|longitude|provider_?id|session.*|token.*|password.*|score|rank.*|moderation.*|visibility|audience_?scope|kyc_?status|account_?status|post_?status|internal.*|entity_?key|item_?keys|viewer_?key)$/i;
function forbiddenKeys(value, where = '$', hits = []) {
  if (Array.isArray(value)) value.forEach((v, i) => forbiddenKeys(v, `${where}[${i}]`, hits));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { if (!(where === '$' && k === 'status') && FORBIDDEN_KEY.test(k)) hits.push(`${where}.${k}`); forbiddenKeys(v, `${where}.${k}`, hits); }
  return hits;
}
function leakedValues(text, secrets) {
  const hits = [];
  for (const s of secrets) {
    if (s === null || s === undefined || s === '') continue;
    const v = String(s);
    const re = /^\d+$/.test(v) ? new RegExp(`(^|[^0-9])${v}([^0-9]|$)`) : null;
    if (re ? re.test(text) : text.includes(v)) hits.push(v);
  }
  if (UUID_RE.test(text)) hits.push('uuid-shaped value');
  return hits;
}
const ALL = 'special,hero,stories,forYou,vibes,continueWatching,recommendedCreators,suggestedPeople,communities,trendingArticles,shopRecommendations,worksRecommendations,learnRecommendations,recentActivity,dailyQuote,continueYourJourney';
const home = (qs = '', opts) => L.api('GET', '/api/connect/home' + (qs ? '?' + qs : ''), opts);
const homeAll = (opts) => home('sections=' + ALL, opts);
const feed = (qs = '', opts) => L.api('GET', '/api/connect/home/feed' + (qs ? '?' + qs : ''), opts);
const codesIn = (json) => [...JSON.stringify(json || {}).matchAll(/"(?:PST|ART|STY|PRD|CRS)-[0-9A-F]{12}"/g)].map((m) => m[0].slice(1, -1));
const refFor = async (type, internal) => (await pool.query(`SELECT public_code FROM howdi_public_refs WHERE entity_type=$1 AND entity_key=$2`, [type, String(internal)])).rows[0]?.public_code || null;

module.exports = { ...L, bigId, member, post, react, story, viewStory, follow, block, vendor, product, worker, course, enroll, community, notify, vibe, special, hero, quote,
  forbiddenKeys, leakedValues, UUID_RE, ALL, home, homeAll, feed, codesIn, refFor };
