'use strict';
// =====================================================================================
// HOWDI K5A — CONNECT HOME, PHASE 1 (Home shell + shared public contracts)
// Source of truth: K5A Connect Home / Feed Implementation Blueprint + approved Phase 1 boundary.
//
//   GET /api/connect/home?sections=a,b          Home manifest (+ data for the requested / above-fold sections)
//   GET /api/connect/home/feed?cursor=&limit=   For You feed page (opaque, encrypted, viewer-bound cursor)
//   GET /api/connect/posts/by-code/{PST|ART}    one post / article by public code (hidden and missing look identical)
//   GET /api/connect/stories/by-code/{STY}      one story by public code
//
// Rules enforced here:
//   - The viewer comes ONLY from the Bearer session. Query/header/body actor ids are never read.
//   - Every card is built from an explicit allow-list DTO. No internal numeric id, UUID, howdi_id, master_id,
//     email, phone, address, score or moderation field is ever copied into a response.
//   - Public references (PST-/ART-/STY-/PRD-/CRS-) live in howdi_public_refs and are issued ONLY for records that
//     have already passed every visibility check for the current viewer, in SQL and again in JS.
//   - The For You cursor is AES-256-GCM encrypted and authenticated, bound to the viewer, and points into a stored
//     feed session (a frozen ranked list), so pages never duplicate or reshuffle and no ordering key is visible.
//   - All SQL is static text with bound parameters.
// =====================================================================================
const crypto = require('node:crypto');

const SECTION_KEYS = Object.freeze(['special', 'hero', 'stories', 'forYou', 'vibes', 'continueWatching', 'recommendedCreators', 'suggestedPeople', 'communities',
  'trendingArticles', 'shopRecommendations', 'worksRecommendations', 'learnRecommendations', 'recentActivity', 'dailyQuote', 'continueYourJourney']);
const SECTION_TITLES = Object.freeze({
  special: 'HOWDI Special', hero: 'Connect Hero', stories: 'Stories', forYou: 'For You', vibes: 'Discover Vibes', continueWatching: 'Continue Watching',
  recommendedCreators: 'Recommended Creators', suggestedPeople: 'Suggested People', communities: 'Communities', trendingArticles: 'Trending Articles',
  shopRecommendations: 'Shop for You', worksRecommendations: 'Works for You', learnRecommendations: 'Learn for You', recentActivity: 'Recent Activity',
  dailyQuote: 'Daily Quote', continueYourJourney: 'Continue Your Journey',
});
const ABOVE_FOLD = Object.freeze(['special', 'hero', 'stories', 'forYou', 'vibes']);
const PERSONAL_ONLY = Object.freeze(['continueWatching', 'recentActivity', 'continueYourJourney']);
const REF_PREFIX = Object.freeze({ POST: 'PST', ARTICLE: 'ART', STORY: 'STY', PRODUCT: 'PRD', COURSE: 'CRS' });
const PREFIX_TYPE = Object.freeze(Object.fromEntries(Object.entries(REF_PREFIX).map(([t, p]) => [p, t])));
const PUBLIC_CODE_RE = /^(PST|ART|STY|PRD|CRS)-[0-9A-F]{12}$/;
const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
const FEED = Object.freeze({ POOL: 200, PAGE_DEFAULT: 10, PAGE_MAX: 20, TTL_HOURS: 24 });
const GUARD_OWNED_PARAMS = Object.freeze(['userId', 'user_id', 'viewerId', 'viewer_id']); // stripped/replaced by the K5E guard; never read here

// ------------------------------------------------------------------ sanitizers
function text(value, max = 200) {
  return String(value ?? '').normalize('NFKC').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max);
}
function oneLine(value, max = 200) { return text(value, max * 4).replace(/\s+/g, ' ').slice(0, max); }
function excerpt(value, max = 180) {
  const t = oneLine(value, 4000);
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : t;
}
function count(value) { const n = Math.floor(Number(value)); return Number.isFinite(n) && n >= 0 ? n : 0; }
function money(value) { if (value === null || value === undefined || value === '') return null; const n = Number(value); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; }
function rating(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? Math.round(Math.min(5, n) * 10) / 10 : null; }
function iso(value) { if (!value) return null; const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toISOString() : null; }
// http(s) URLs, same-site absolute paths, or inline images up to `inlineMax` bytes. Everything else (javascript:, //host, data:text …) is dropped.
function mediaUrl(value, inlineMax = 16384) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  if (/^https?:\/\/[^\s"'<>\\]{1,2000}$/i.test(v)) return v;
  if (/^\/(?!\/)[^\s"'<>\\]{0,1999}$/.test(v)) return v;
  if (/^data:(image\/(png|jpe?g|webp|gif)|video\/(mp4|webm));base64,[A-Za-z0-9+/=]+$/i.test(v) && v.length <= inlineMax) return v;
  return null;
}
function firstImage(list) {
  let arr = list;
  if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch { arr = [arr]; } }
  if (!Array.isArray(arr)) return null;
  for (const item of arr) { const u = mediaUrl(typeof item === 'object' && item ? item.url : item); if (u) return u; }
  return null;
}
function isPublicUsername(v) { return typeof v === 'string' && USERNAME_RE.test(v) && !/^\d+$/.test(v.replace(/[._]/g, '')); }
function isPublicWorkerCode(v) {
  return typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(v) && !/^\d+$/.test(v.replace(/[-_]/g, ''))
    && !/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i.test(v);
}
function isSlug(v) { return typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 80 && !/^\d+$/.test(v.replace(/-/g, '')); }

// Admin CTA → a safe route. Allow-listed in-app routes or an https URL; anything else is dropped.
const CTA_ROUTE_RES = [
  /^\/(connect|shop|works|learn)(\/[a-z0-9-]{1,40}){0,2}\/?$/,
  /^\/(posts|articles|stories|vibes|groups|channels)\/[A-Za-z0-9_-]{3,64}$/,
  /^\/@[a-z0-9._]{3,30}$/,
];
function safeCta(label, url) {
  const l = oneLine(label, 80);
  const u = String(url ?? '').trim();
  if (!l || !u || u.length > 500) return null;
  if (CTA_ROUTE_RES.some((re) => re.test(u))) return { label: l, route: u, external: false };
  if (/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d{2,5})?(\/[^\s"'<>\\]*)?$/i.test(u) && !/@/.test(u.split('/')[2] || '')) return { label: l, route: u, external: true };
  return null;
}

// Defence in depth: removes any identity-bearing key, at any depth, that a DTO might ever gain by mistake.
const FORBIDDEN_KEY_RE = /^(id|_id|pk|uuid|.*_id|.*Id|.*_uuid|.*Uuid|howdi_?id|master_?id|identity_?uuid|email|e_?mail|phone|mobile|address|full_?address|address_?line|pincode|lat|lng|latitude|longitude|coordinates|provider_?id|session.*|token.*|password.*|status|.*_status|moderation.*|visibility|score|rank.*|internal.*|entity_?key|item_?keys|viewer_?key)$/i;
function stripInternalKeys(value) {
  if (Array.isArray(value)) return value.map(stripInternalKeys);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) if (!FORBIDDEN_KEY_RE.test(k)) out[k] = stripInternalKeys(v);
  return out;
}

// ------------------------------------------------------------------ DTOs
function authorDto(r, prefix = '') {
  const u = r[prefix + 'public_username'];
  if (!isPublicUsername(u)) return null;
  return { public_username: u, display_name: oneLine(r[prefix + 'display_name'], 80) || '@' + u, avatar_url: mediaUrl(r[prefix + 'avatar']) };
}
function feedItemDto(r, code) {
  const isArticle = String(r.post_type || '').toUpperCase() === 'ARTICLE';
  return {
    type: isArticle ? 'article' : 'post',
    public_key: code,
    author: authorDto(r),
    content: {
      title: isArticle ? oneLine(r.article_title, 160) || null : null,
      text_excerpt: excerpt(isArticle ? (r.article_excerpt || r.content) : r.content, 280),
      media_type: r.has_media ? (oneLine(r.media_type, 20).toLowerCase() || 'media') : null,
      has_media: r.has_media === true,
    },
    counts: { reactions: count(r.reaction_count), comments: count(r.comment_count) },
    from_followed: r.from_followed === true,
    published_at: iso(r.published_at),
    route: `/${isArticle ? 'articles' : 'posts'}/${code}`,
  };
}

// ------------------------------------------------------------------ opaque cursor (AES-256-GCM, viewer-bound)
function createCursorBox({ key, now = () => Date.now() }) {
  if (!key) return null;
  const k = crypto.createHash('sha256').update('howdi-k5a-home-cursor-v1|').update(key).digest();
  const viewerKey = (viewerId) => crypto.createHmac('sha256', k).update('viewer|' + (viewerId ? String(viewerId) : 'guest')).digest('hex');
  return {
    viewerKey,
    seal(payload) {
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv('aes-256-gcm', k, iv);
      const body = Buffer.concat([c.update(JSON.stringify({ ...payload, t: now() }), 'utf8'), c.final()]);
      return 'hc1.' + Buffer.concat([iv, body, c.getAuthTag()]).toString('base64url');
    },
    open(token) {
      if (typeof token !== 'string' || token.length > 400 || !/^hc1\.[A-Za-z0-9_-]{40,380}$/.test(token)) return null;
      const raw = Buffer.from(token.slice(4), 'base64url');
      if (raw.length < 12 + 16 + 2) return null;
      try {
        const d = crypto.createDecipheriv('aes-256-gcm', k, raw.subarray(0, 12));
        d.setAuthTag(raw.subarray(raw.length - 16));
        const plain = Buffer.concat([d.update(raw.subarray(12, raw.length - 16)), d.final()]).toString('utf8');
        const obj = JSON.parse(plain);
        return obj && typeof obj === 'object' ? obj : null;
      } catch { return null; }
    },
  };
}
// Key policy: HOWDI_HOME_CURSOR_KEY is required outside development. There is no predictable fallback anywhere:
// development/test without a key get a random per-process key; any other NODE_ENV without a key disables cursors.
function resolveCursorKey(env) {
  const key = String(env.HOWDI_HOME_CURSOR_KEY || '');
  if (key.length >= 32) return { key, mode: 'configured' };
  const nodeEnv = String(env.NODE_ENV || '').toLowerCase();
  if (!nodeEnv || nodeEnv === 'development' || nodeEnv === 'test') return { key: crypto.randomBytes(32).toString('hex'), mode: 'ephemeral-dev' };
  return { key: null, mode: 'missing' };
}

// ------------------------------------------------------------------ service
function createConnectHomeK5A(deps) {
  const { pool, getSessionUserFromRequest, sendJSON, connectPostVisibleSql, k5ePrivateProfileOkSql, rateLimit, getRequestIp, env = process.env, logger = console } = deps;
  const keyInfo = resolveCursorKey(env);
  if (keyInfo.mode === 'missing') logger.error('[K5A home] FATAL CONFIG: HOWDI_HOME_CURSOR_KEY (32+ chars) is required outside development. The For You feed is disabled until it is set.');
  else if (keyInfo.mode === 'ephemeral-dev') logger.warn('[K5A home] HOWDI_HOME_CURSOR_KEY not set: using a random per-process development key (cursors reset on restart).');
  const box = createCursorBox({ key: keyInfo.key });

  // ---------------- SQL fragments (static; $1 is always the viewer id, 0 for guests)
  const ACTIVE_USER = (u) => `(COALESCE(${u}.is_active,TRUE)=TRUE AND UPPER(COALESCE(${u}.account_status,'ACTIVE'))='ACTIVE')`;
  const NOT_BLOCKED = (owner) => `NOT EXISTS(SELECT 1 FROM howdi_connect_profile_blocks kb WHERE (kb.blocker_user_id=$1::bigint AND kb.blocked_user_id=${owner}) OR (kb.blocker_user_id=${owner} AND kb.blocked_user_id=$1::bigint))`;
  // Author / person floor. A private profile is visible to a signed-in follower (existing K5E rule) but never to guests.
  const AUTHOR_FLOOR = (u, cp, owner) => `(${cp}.public_username IS NOT NULL AND ${cp}.public_username<>'' AND COALESCE(${cp}.discoverable,TRUE)=TRUE
      AND ${ACTIVE_USER(u)} AND (${owner}=$1::bigint OR ${NOT_BLOCKED(owner)})
      AND (COALESCE(${cp}.private_profile,FALSE)=FALSE OR ($1::bigint>0 AND ${k5ePrivateProfileOkSql(owner, '$1::bigint')})))`;
  // Posts / articles: published (or a due scheduled post), audience rules, never subscriber-only content on Home.
  const POST_VISIBLE = (p) => `((${p}.post_status='PUBLISHED' OR (${p}.post_status='SCHEDULED' AND ${p}.scheduled_for IS NOT NULL AND ${p}.scheduled_for<=NOW()))
      AND COALESCE(${p}.subscribers_only,FALSE)=FALSE AND COALESCE(${p}.subscriber_only,FALSE)=FALSE
      AND (($1::bigint=0 AND COALESCE(${p}.audience_scope,'EVERYONE')='EVERYONE') OR ($1::bigint>0 AND ${connectPostVisibleSql(p, '$1::bigint')})))`;
  const AVATAR = (cp, ps) => `COALESCE(NULLIF(${cp}.avatar_data,''),NULLIF(${ps}.profile_image,''),'')`;
  const POST_COLUMNS = `p.id AS internal_key, p.post_type, p.content, p.article_title, p.article_excerpt, p.media_type,
      (COALESCE(p.media_data,'')<>'' OR jsonb_array_length(CASE WHEN jsonb_typeof(p.media_gallery)='array' THEN p.media_gallery ELSE '[]'::jsonb END)>0) AS has_media,
      COALESCE(CASE WHEN p.post_status='SCHEDULED' THEN p.scheduled_for END,p.created_at) AS published_at, p.post_status, p.audience_scope, p.subscribers_only, p.subscriber_only,
      u.full_name AS display_name, cp.public_username, ${AVATAR('cp', 'ps')} AS avatar, u.is_active, u.account_status, cp.discoverable,
      (SELECT COUNT(*)::int FROM howdi_community_reactions r WHERE r.post_id=p.id) AS reaction_count,
      (SELECT COUNT(*)::int FROM howdi_community_comments c WHERE c.post_id=p.id) AS comment_count,
      ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_connect_follows f WHERE f.follower_user_id=$1::bigint AND f.following_user_id=p.user_id)) AS from_followed`;
  const POST_FROM = `FROM howdi_community_posts p JOIN users u ON u.id=p.user_id JOIN howdi_connect_profiles cp ON cp.user_id=p.user_id LEFT JOIN user_profile_settings ps ON ps.user_id=p.user_id`;
  const POST_WHERE = `${POST_VISIBLE('p')} AND ${AUTHOR_FLOOR('u', 'cp', 'p.user_id')}`;

  const SQL = {
    feedCandidates: `
      SELECT p.id AS internal_key FROM howdi_community_posts p JOIN users u ON u.id=p.user_id JOIN howdi_connect_profiles cp ON cp.user_id=p.user_id
      WHERE ${POST_WHERE}
      ORDER BY (CASE WHEN $1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_connect_follows f WHERE f.follower_user_id=$1::bigint AND f.following_user_id=p.user_id) THEN 20 ELSE 0 END
        +(SELECT COUNT(*) FROM howdi_community_reactions r WHERE r.post_id=p.id)*2
        +(SELECT COUNT(*) FROM howdi_community_comments c WHERE c.post_id=p.id)*3
        +CASE WHEN p.created_at>NOW()-INTERVAL '72 hours' THEN 10 ELSE 0 END) DESC, p.created_at DESC, p.id DESC
      LIMIT $2`,
    postsByKeys: `SELECT ${POST_COLUMNS} ${POST_FROM} WHERE p.id=ANY($2::bigint[]) AND ${POST_WHERE}`,
    heroFallback: `SELECT ${POST_COLUMNS} ${POST_FROM} WHERE ${POST_WHERE}
      ORDER BY ((SELECT COUNT(*) FROM howdi_community_reactions r WHERE r.post_id=p.id)*3+(SELECT COUNT(*) FROM howdi_connect_post_views v WHERE v.post_id=p.id)
        +CASE WHEN p.created_at>NOW()-INTERVAL '48 hours' THEN 25 ELSE 0 END) DESC, p.created_at DESC, p.id DESC LIMIT 1`,
    trendingArticles: `SELECT ${POST_COLUMNS}, COALESCE(NULLIF(p.article_cover_url,''),'') AS cover,
        (SELECT COUNT(*)::int FROM howdi_connect_post_views v WHERE v.post_id=p.id) AS view_count
      ${POST_FROM} WHERE UPPER(COALESCE(p.post_type,''))='ARTICLE' AND ${POST_WHERE}
      ORDER BY ((SELECT COUNT(*) FROM howdi_connect_post_views v WHERE v.post_id=p.id)+(SELECT COUNT(*) FROM howdi_community_reactions r WHERE r.post_id=p.id)*3) DESC, p.created_at DESC, p.id DESC LIMIT 8`,
    special: `SELECT title,subtitle,cta_label,cta_url,media_url,media_type FROM howdi_connect_home_specials
      WHERE status='ACTIVE' AND (starts_at IS NULL OR starts_at<=NOW()) AND (ends_at IS NULL OR ends_at>NOW()) AND audience IN ('ALL','CONNECT')
      ORDER BY sort_order ASC, created_at DESC, id DESC LIMIT 1`,
    heroAdmin: `SELECT title,body_text,media_url,media_type,cta_label,cta_url FROM howdi_connect_home_hero
      WHERE status='ACTIVE' AND (starts_at IS NULL OR starts_at<=NOW()) AND (ends_at IS NULL OR ends_at>NOW())
      ORDER BY sort_order ASC, created_at DESC, id DESC LIMIT 1`,
    stories: `SELECT s.id AS internal_key, s.media_type, s.created_at, s.expires_at, s.audience, (s.user_id=$1::bigint) AS mine,
        u.full_name AS display_name, cp.public_username, ${AVATAR('cp', 'ps')} AS avatar, u.is_active, u.account_status, cp.discoverable,
        ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_connect_story_views sv WHERE sv.story_id=s.id AND sv.user_id=$1::bigint)) AS viewed
      FROM howdi_connect_stories s JOIN users u ON u.id=s.user_id JOIN howdi_connect_profiles cp ON cp.user_id=s.user_id LEFT JOIN user_profile_settings ps ON ps.user_id=s.user_id
      WHERE s.expires_at>NOW() AND ${AUTHOR_FLOOR('u', 'cp', 's.user_id')}
        AND (s.audience='Everyone' OR ($1::bigint>0 AND s.user_id=$1::bigint)
          OR ($1::bigint>0 AND s.audience='Friends' AND EXISTS(SELECT 1 FROM howdi_connect_follows f1 WHERE f1.follower_user_id=$1::bigint AND f1.following_user_id=s.user_id)
              AND EXISTS(SELECT 1 FROM howdi_connect_follows f2 WHERE f2.follower_user_id=s.user_id AND f2.following_user_id=$1::bigint))
          OR ($1::bigint>0 AND s.audience='Close friends' AND EXISTS(SELECT 1 FROM howdi_connect_close_friends cf WHERE cf.user_id=s.user_id AND cf.friend_user_id=$1::bigint)))
      ORDER BY s.created_at DESC, s.id DESC LIMIT 20`,
    storyByKey: null, // built below (same predicate + key)
    vibes: `SELECT v.vibe_code, v.caption, v.cover_url, v.published_at, u.full_name AS display_name, cp.public_username, ${AVATAR('cp', 'ps')} AS avatar,
        COALESCE(st.likes,0) AS likes, COALESCE(st.comments,0) AS comments
      FROM vibes v JOIN users u ON u.id::text=v.creator_user_id JOIN howdi_connect_profiles cp ON cp.user_id=u.id LEFT JOIN user_profile_settings ps ON ps.user_id=u.id
        LEFT JOIN vibe_stats st ON st.vibe_id=v.id
      WHERE v.status='published' AND v.visibility='public' AND v.deleted_at IS NULL AND v.vibe_code IS NOT NULL AND ${AUTHOR_FLOOR('u', 'cp', 'u.id')}
        AND ($1::bigint=0 OR NOT EXISTS(SELECT 1 FROM vibe_creator_blocks b WHERE (b.blocker_user_id=$1::text AND b.blocked_creator_user_id=v.creator_user_id) OR (b.blocker_user_id=v.creator_user_id AND b.blocked_creator_user_id=$1::text)))
      ORDER BY v.published_at DESC NULLS LAST, v.vibe_code DESC LIMIT 10`,
    continueWatching: `SELECT v.vibe_code, v.caption, v.cover_url, u.full_name AS display_name, cp.public_username, ${AVATAR('cp', 'ps')} AS avatar,
        MAX(wsi.max_completion_percent) AS completion, MAX(wsi.last_seen_at) AS last_seen_at
      FROM vibe_watch_session_items wsi JOIN vibes v ON v.id=wsi.vibe_id JOIN users u ON u.id::text=v.creator_user_id JOIN howdi_connect_profiles cp ON cp.user_id=u.id
        LEFT JOIN user_profile_settings ps ON ps.user_id=u.id
      WHERE $1::bigint>0 AND wsi.user_id=$1::text AND v.status='published' AND v.visibility='public' AND v.deleted_at IS NULL AND v.vibe_code IS NOT NULL
        AND ${AUTHOR_FLOOR('u', 'cp', 'u.id')}
      GROUP BY v.vibe_code, v.caption, v.cover_url, u.full_name, cp.public_username, cp.avatar_data, ps.profile_image
      HAVING BOOL_OR(wsi.completed)=FALSE AND MAX(wsi.max_completion_percent)>0
      ORDER BY MAX(wsi.last_seen_at) DESC, v.vibe_code LIMIT 8`,
    people: (creatorsOnly) => `SELECT cp.public_username, u.full_name AS display_name, ${AVATAR('cp', 'ps')} AS avatar, cp.profession_title, cp.professional_category,
        ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_connect_follows f WHERE f.follower_user_id=$1::bigint AND f.following_user_id=u.id)) AS following
      FROM users u JOIN howdi_connect_profiles cp ON cp.user_id=u.id LEFT JOIN user_profile_settings ps ON ps.user_id=u.id
      WHERE u.id<>$1::bigint AND COALESCE(cp.private_profile,FALSE)=FALSE AND ${AUTHOR_FLOOR('u', 'cp', 'u.id')}
        ${creatorsOnly ? 'AND cp.creator_mode=TRUE' : 'AND NOT EXISTS(SELECT 1 FROM howdi_connect_follows f2 WHERE f2.follower_user_id=$1::bigint AND f2.following_user_id=u.id)'}
      ORDER BY cp.updated_at DESC NULLS LAST, LOWER(cp.public_username) LIMIT 10`,
    communities: `SELECT s.space_type, s.name, s.slug, s.category, s.member_count,
        ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_connect_social_space_members mm WHERE mm.space_id=s.id AND mm.user_id=$1::bigint AND mm.status='ACTIVE')) AS joined
      FROM howdi_connect_social_spaces s JOIN users ou ON ou.id=s.owner_user_id
      WHERE s.is_archived=FALSE AND s.privacy='PUBLIC' AND s.slug IS NOT NULL AND ${ACTIVE_USER('ou')} AND ${NOT_BLOCKED('s.owner_user_id')}
      ORDER BY s.member_count DESC, s.created_at DESC, s.slug LIMIT 8`,
    // Mirrors the Shop S1 catalogue gate (read-only; Shop code is unchanged) and is re-checked by shopRowVisible below.
    shop: `SELECT p.id AS internal_key, p.name, p.category, p.price, p.mrp, p.image_urls, p.status, p.archived_at, p.published_at, COALESCE(v.status,'active') AS vendor_status,
        (SELECT m.status FROM howdi_shop_product_moderation_v162c m WHERE m.product_id=p.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS moderation_status,
        v.business_name AS store_name, CASE WHEN cp.user_id IS NOT NULL AND ${'COALESCE(cp.private_profile,FALSE)=FALSE'} THEN cp.public_username END AS creator_public_username
      FROM vendor_products p JOIN vendor_profiles v ON v.id=p.vendor_profile_id JOIN users u ON u.id=v.user_id
        LEFT JOIN howdi_connect_profiles cp ON cp.user_id=v.user_id AND cp.public_username IS NOT NULL AND COALESCE(cp.discoverable,TRUE)=TRUE
      WHERE p.status='published' AND p.archived_at IS NULL AND (p.published_at IS NULL OR p.published_at<=NOW()) AND COALESCE(v.status,'active')='active'
        AND COALESCE(UPPER((SELECT m.status FROM howdi_shop_product_moderation_v162c m WHERE m.product_id=p.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1)),'APPROVED')='APPROVED'
        AND ${ACTIVE_USER('u')} AND ${NOT_BLOCKED('v.user_id')}
        AND (CASE WHEN EXISTS(SELECT 1 FROM vendor_product_variants pv WHERE pv.product_id=p.id)
              THEN EXISTS(SELECT 1 FROM vendor_product_variants pv WHERE pv.product_id=p.id AND LOWER(COALESCE(pv.status,'active'))='active' AND COALESCE(pv.stock,0)>0)
              ELSE COALESCE(p.stock,0)>0 END)
      ORDER BY p.published_at DESC NULLS LAST, p.updated_at DESC, p.id DESC LIMIT 8`,
    // Mirrors the public Works list gate (verified KYC + skill, active, approved visible primary service). Coarse city only.
    works: `SELECT w.worker_code, w.full_name, w.city, w.rating, w.completed_jobs, ps.name AS primary_service
      FROM works_workers w
        JOIN works_worker_services pws ON pws.worker_id=w.id AND pws.is_primary=TRUE AND LOWER(TRIM(pws.status))='approved'
        JOIN works_services ps ON ps.id=pws.service_id AND ps.active=TRUE AND ps.customer_visible=TRUE
        LEFT JOIN users u ON u.id=w.user_id
      WHERE LOWER(TRIM(w.kyc_status))='verified' AND LOWER(TRIM(w.skill_status))='verified' AND LOWER(TRIM(w.account_status))='active' AND COALESCE(w.active,TRUE)=TRUE
        AND w.worker_code IS NOT NULL AND (w.user_id IS NULL OR (${ACTIVE_USER('u')} AND ${NOT_BLOCKED('w.user_id')}))
      ORDER BY w.rating DESC NULLS LAST, w.completed_jobs DESC NULLS LAST, w.worker_code LIMIT 8`,
    // Same teacher rule as K5B Search: a course whose active, approved teacher is blocked either way (or is no longer an
    // active account) is hidden from that viewer. Teacher identity is never returned.
    learn: `SELECT c.id::text AS internal_key, c.title, c.category, c.level, c.duration_minutes, c.thumbnail_url
      FROM learning_courses c WHERE c.is_active=TRUE AND c.publish_status='PUBLISHED' AND $1::bigint>=0
        AND NOT EXISTS(SELECT 1 FROM learning_teacher_course_assignments a JOIN learning_teacher_profiles tp ON tp.id=a.teacher_profile_id
              JOIN users tu ON tu.id=tp.user_id
            WHERE a.course_id=c.id AND a.status='ACTIVE' AND tp.application_status='APPROVED'
              AND (NOT ${ACTIVE_USER('tu')} OR NOT ${NOT_BLOCKED('tp.user_id')}))
      ORDER BY c.updated_at DESC, c.title LIMIT 8`,
    recentActivity: `SELECT n.notification_type, n.message, n.is_read, n.created_at,
        CASE WHEN au.id IS NOT NULL AND ${AUTHOR_FLOOR('au', 'acp', 'au.id')} THEN acp.public_username END AS actor_public_username,
        CASE WHEN au.id IS NOT NULL AND ${AUTHOR_FLOOR('au', 'acp', 'au.id')} THEN au.full_name END AS actor_display_name
      FROM howdi_connect_notifications n LEFT JOIN users au ON au.id=n.actor_user_id LEFT JOIN howdi_connect_profiles acp ON acp.user_id=n.actor_user_id
      WHERE $1::bigint>0 AND n.user_id=$1::bigint AND (n.actor_user_id IS NULL OR ${NOT_BLOCKED('n.actor_user_id')})
      ORDER BY n.created_at DESC, n.id DESC LIMIT 10`,
    dailyQuoteCount: `SELECT COUNT(*)::int n FROM howdi_connect_daily_quotes`,
    dailyQuote: `SELECT quote_text, author FROM howdi_connect_daily_quotes ORDER BY id ASC OFFSET $1 LIMIT 1`,
    continueJourney: `SELECT c.id::text AS internal_key, c.title, c.category, e.progress
      FROM user_course_enrollments e JOIN learning_courses c ON c.id=e.course_id
      WHERE $1::bigint>0 AND e.user_id=$1::bigint AND e.status='IN_PROGRESS' AND c.is_active=TRUE AND c.publish_status='PUBLISHED'
      ORDER BY e.updated_at DESC, c.title LIMIT 6`,
  };
  SQL.storyByKey = SQL.stories.replace('WHERE s.expires_at>NOW()', 'WHERE s.id=$2::bigint AND s.expires_at>NOW()').replace(/LIMIT 20$/, 'LIMIT 1')
    .replace('SELECT s.id AS internal_key, s.media_type,', 'SELECT s.id AS internal_key, s.content, s.media_data, s.media_type,');

  // ---------------- JS re-checks (never trust the SQL alone)
  const userOk = (r) => r.is_active !== false && String(r.account_status || 'ACTIVE').toUpperCase() === 'ACTIVE';
  const authorOk = (r) => isPublicUsername(r.public_username) && r.discoverable !== false && userOk(r);
  // Same rule as the Shop S1 catalogue's JS gate (shopS1RowVisible), mirrored because that helper is request-scoped.
  const shopRowVisible = (r) => {
    if (String(r.status || '').toLowerCase() !== 'published' || r.archived_at) return false;
    if (String(r.vendor_status || 'active').toLowerCase() !== 'active') return false;
    const at = r.published_at ? new Date(r.published_at).getTime() : null;
    if (at && Number.isFinite(at) && at > Date.now()) return false;
    if (r.moderation_status && String(r.moderation_status).trim().toUpperCase() !== 'APPROVED') return false;
    return true;
  };
  const postOk = (r, viewerId) => authorOk(r) && r.subscribers_only !== true && r.subscriber_only !== true
    && (r.post_status === 'PUBLISHED' || r.post_status === 'SCHEDULED')
    && (viewerId > 0 || String(r.audience_scope || 'EVERYONE') === 'EVERYONE');

  // ---------------- public references (issued only after visibility checks passed)
  async function issueRefs(type, keys) {
    const prefix = REF_PREFIX[type];
    const uniq = [...new Set(keys.map(String))];
    const out = new Map();
    if (!prefix || !uniq.length) return out;
    for (let attempt = 0; attempt < 4; attempt++) {
      const codes = uniq.map(() => `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`);
      try {
        await pool.query(`INSERT INTO howdi_public_refs(entity_type,entity_key,public_code)
          SELECT $1, x.k, x.c FROM unnest($2::text[],$3::text[]) AS x(k,c) ON CONFLICT (entity_type,entity_key) DO NOTHING`, [type, uniq, codes]);
        break;
      } catch (error) {
        if (!(error && error.code === '23505') || attempt === 3) throw error; // public_code collision: retry with fresh codes
      }
    }
    const rows = (await pool.query(`SELECT entity_key, public_code FROM howdi_public_refs WHERE entity_type=$1 AND entity_key=ANY($2::text[])`, [type, uniq])).rows;
    for (const r of rows) if (PUBLIC_CODE_RE.test(r.public_code)) out.set(String(r.entity_key), r.public_code);
    return out;
  }
  async function resolveRef(code, allowedTypes) {
    if (typeof code !== 'string' || !PUBLIC_CODE_RE.test(code) || !allowedTypes.includes(PREFIX_TYPE[code.slice(0, 3)])) return null;
    const r = (await pool.query(`SELECT entity_type, entity_key FROM howdi_public_refs WHERE public_code=$1`, [code])).rows[0];
    return r && allowedTypes.includes(r.entity_type) ? r : null;
  }
  // Posts/articles → feed DTOs, preserving the given order; refs issued only for the rows that passed both gates.
  async function postDtos(rows, viewerId) {
    const ok = rows.filter((r) => postOk(r, viewerId));
    const posts = ok.filter((r) => String(r.post_type || '').toUpperCase() !== 'ARTICLE');
    const arts = ok.filter((r) => String(r.post_type || '').toUpperCase() === 'ARTICLE');
    const [pRefs, aRefs] = await Promise.all([issueRefs('POST', posts.map((r) => r.internal_key)), issueRefs('ARTICLE', arts.map((r) => r.internal_key))]);
    return ok.map((r) => {
      const code = (String(r.post_type || '').toUpperCase() === 'ARTICLE' ? aRefs : pRefs).get(String(r.internal_key));
      return code ? { row: r, dto: feedItemDto(r, code) } : null;
    }).filter(Boolean);
  }

  // ---------------- For You feed sessions
  function feedDisabled() { return !box; }
  async function createFeedSession(viewerId) {
    const keys = (await pool.query(SQL.feedCandidates, [viewerId, FEED.POOL])).rows.map((r) => String(r.internal_key));
    await pool.query(`DELETE FROM howdi_connect_feed_sessions WHERE id IN (SELECT id FROM howdi_connect_feed_sessions WHERE expires_at<NOW() LIMIT 200)`).catch(() => {});
    const row = (await pool.query(`INSERT INTO howdi_connect_feed_sessions(viewer_key,variant,item_keys,expires_at)
      VALUES($1,$2,$3::bigint[],NOW()+($4||' hours')::interval) RETURNING id`, [box.viewerKey(viewerId), viewerId ? 'personalized' : 'curated', keys, String(FEED.TTL_HOURS)])).rows[0];
    return { sessionId: row.id, keys };
  }
  async function feedPage(viewerId, { cursor = null, limit = FEED.PAGE_DEFAULT } = {}) {
    let sessionId, keys, position = 0;
    if (cursor) {
      const c = box.open(cursor);
      if (!c || typeof c.s !== 'string' || !Number.isSafeInteger(c.p) || c.p < 1 || c.p > FEED.POOL || c.v !== box.viewerKey(viewerId).slice(0, 24)) return { error: 'INVALID_CURSOR' };
      if (!Number.isFinite(c.t) || Date.now() - c.t > FEED.TTL_HOURS * 3600e3) return { error: 'CURSOR_EXPIRED' };
      const row = (await pool.query(`SELECT item_keys FROM howdi_connect_feed_sessions WHERE id=$1::uuid AND viewer_key=$2 AND expires_at>NOW()`, [c.s, box.viewerKey(viewerId)])).rows[0];
      if (!row) return { error: 'CURSOR_EXPIRED' };
      sessionId = c.s; keys = (row.item_keys || []).map(String); position = c.p;
    } else {
      ({ sessionId, keys } = await createFeedSession(viewerId));
    }
    const slice = keys.slice(position, position + limit);
    let items = [];
    if (slice.length) {
      const rows = (await pool.query(SQL.postsByKeys, [viewerId, slice])).rows;   // visibility re-applied on every page
      const byKey = new Map(rows.map((r) => [String(r.internal_key), r]));
      items = (await postDtos(slice.map((k) => byKey.get(k)).filter(Boolean), viewerId)).map((x) => x.dto);
    }
    const next = position + limit;
    const hasMore = next < keys.length;
    return { items, has_more: hasMore, next_cursor: hasMore ? box.seal({ s: sessionId, p: next, v: box.viewerKey(viewerId).slice(0, 24) }) : null };
  }

  // ---------------- section builders → {state, ...data}
  const ready = (data, isEmpty) => ({ state: isEmpty ? 'empty' : 'ready', ...data });
  const B = {
    async special() {
      const r = (await pool.query(SQL.special)).rows[0];
      if (!r) return ready({ item: null }, true);
      return ready({ item: { title: oneLine(r.title, 200), body: oneLine(r.subtitle, 400) || null, media: mediaUrl(r.media_url, 2e6) ? { type: oneLine(r.media_type, 10).toLowerCase(), url: mediaUrl(r.media_url, 2e6) } : null, cta: safeCta(r.cta_label, r.cta_url) } });
    },
    async hero(viewerId) {
      const a = (await pool.query(SQL.heroAdmin)).rows[0];
      if (a) return ready({ source: 'admin', item: { title: oneLine(a.title, 200), body: text(a.body_text, 600) || null, media: mediaUrl(a.media_url, 2e6) ? { type: oneLine(a.media_type, 10).toLowerCase(), url: mediaUrl(a.media_url, 2e6) } : null, cta: safeCta(a.cta_label, a.cta_url) } });
      const rows = (await pool.query(SQL.heroFallback, [viewerId])).rows;
      const [first] = await postDtos(rows, viewerId);
      return first ? ready({ source: 'featured', item: first.dto }) : ready({ source: null, item: null }, true);
    },
    async stories(viewerId) {
      const rows = (await pool.query(SQL.stories, [viewerId])).rows.filter(authorOk);
      const refs = await issueRefs('STORY', rows.map((r) => r.internal_key));
      const items = rows.map((r) => { const code = refs.get(String(r.internal_key)); return code && { public_key: code, author: authorDto(r), mine: r.mine === true, viewed: r.viewed === true, media_type: oneLine(r.media_type, 20).toLowerCase() || 'text', created_at: iso(r.created_at), expires_at: iso(r.expires_at), route: `/stories/${code}` }; }).filter(Boolean);
      return ready({ items }, !items.length);
    },
    async forYou(viewerId) {
      if (feedDisabled()) return { state: 'error', items: [], next_cursor: null, has_more: false };
      const page = await feedPage(viewerId, {});
      return ready({ items: page.items, next_cursor: page.next_cursor, has_more: page.has_more }, !page.items.length);
    },
    async vibes(viewerId) {
      const items = (await pool.query(SQL.vibes, [viewerId])).rows.filter((r) => isPublicWorkerCode(r.vibe_code) && isPublicUsername(r.public_username))
        .map((r) => ({ public_key: r.vibe_code, caption: excerpt(r.caption, 140) || null, cover_url: mediaUrl(r.cover_url), author: authorDto(r), counts: { likes: count(r.likes), comments: count(r.comments) }, route: `/vibes/${encodeURIComponent(r.vibe_code)}` }));
      return ready({ items }, !items.length);
    },
    async continueWatching(viewerId) {
      const items = (await pool.query(SQL.continueWatching, [viewerId])).rows.filter((r) => isPublicWorkerCode(r.vibe_code) && isPublicUsername(r.public_username))
        .map((r) => ({ public_key: r.vibe_code, caption: excerpt(r.caption, 140) || null, cover_url: mediaUrl(r.cover_url), author: authorDto(r), progress_percent: Math.max(0, Math.min(100, Math.round(Number(r.completion || 0)))), label: 'Continue watching', route: `/vibes/${encodeURIComponent(r.vibe_code)}` }));
      return ready({ items }, !items.length);
    },
    async recommendedCreators(viewerId) { return peopleSection(viewerId, true); },
    async suggestedPeople(viewerId) { return peopleSection(viewerId, false); },
    async communities(viewerId) {
      const items = (await pool.query(SQL.communities, [viewerId])).rows.filter((r) => isSlug(r.slug)).map((r) => {
        const kind = String(r.space_type || '').toUpperCase() === 'CHANNEL' ? 'channel' : 'group';
        return { type: kind, public_key: r.slug, name: oneLine(r.name, 80), category: oneLine(r.category, 60) || null, member_count: count(r.member_count), joined: viewerId > 0 && r.joined === true, route: `/${kind}s/${r.slug}` };
      });
      return ready({ items }, !items.length);
    },
    async trendingArticles(viewerId) {
      const rows = (await pool.query(SQL.trendingArticles, [viewerId])).rows;
      const items = (await postDtos(rows, viewerId)).map(({ row, dto }) => ({ ...dto, cover_url: mediaUrl(row.cover), counts: { ...dto.counts, views: count(row.view_count) } }));
      return ready({ items }, !items.length);
    },
    async shopRecommendations(viewerId) {
      const rows = (await pool.query(SQL.shop, [viewerId])).rows.filter(shopRowVisible);
      const refs = await issueRefs('PRODUCT', rows.map((r) => r.internal_key));
      const items = rows.map((r) => {
        const code = refs.get(String(r.internal_key));
        const price = money(r.price), mrp = money(r.mrp);
        return code && { type: 'product', public_key: code, title: oneLine(r.name, 120), image_url: firstImage(r.image_urls), price, compare_at_price: mrp !== null && price !== null && mrp > price ? mrp : null, currency: 'INR', category: oneLine(r.category, 60) || null,
          store: { name: oneLine(r.store_name, 80) || null, public_username: isPublicUsername(r.creator_public_username) ? r.creator_public_username : null },
          pillar: 'shop', label: 'SHOP · PRODUCT', route: `/shop/products/${code}`, landing: { area: 'shop', view: 'catalogue' } };
      }).filter(Boolean);
      return ready({ items }, !items.length);
    },
    async worksRecommendations(viewerId) {
      const items = (await pool.query(SQL.works, [viewerId])).rows.filter((r) => isPublicWorkerCode(r.worker_code)).map((r) => ({
        type: 'worker', public_key: r.worker_code, display_name: oneLine(r.full_name, 80), skill: oneLine(r.primary_service, 60) || null, service_area: oneLine(r.city, 60) || null,
        rating: rating(r.rating), completed_jobs: count(r.completed_jobs), verified: true, pillar: 'works', label: 'WORKS · WORKER',
        route: `/works/workers/${encodeURIComponent(r.worker_code)}`, landing: { area: 'works', view: 'find' },
      }));
      return ready({ items }, !items.length);
    },
    async learnRecommendations(viewerId) {
      const rows = (await pool.query(SQL.learn, [viewerId])).rows;
      const refs = await issueRefs('COURSE', rows.map((r) => r.internal_key));
      const items = rows.map((r) => { const code = refs.get(String(r.internal_key)); return code && { type: 'course', public_key: code, title: oneLine(r.title, 120), category: oneLine(r.category, 60) || null, level: oneLine(r.level, 40) || null, duration_minutes: count(r.duration_minutes) || null, image_url: mediaUrl(r.thumbnail_url), pillar: 'learn', label: 'LEARN · COURSE', route: `/learn/courses/${code}`, landing: { area: 'learn', view: 'discover' } }; }).filter(Boolean);
      return ready({ items }, !items.length);
    },
    async recentActivity(viewerId) {
      const items = (await pool.query(SQL.recentActivity, [viewerId])).rows.map((r) => ({
        kind: oneLine(r.notification_type, 40).toLowerCase() || 'activity', message: oneLine(r.message, 200), unread: r.is_read !== true, created_at: iso(r.created_at),
        actor: isPublicUsername(r.actor_public_username) ? { public_username: r.actor_public_username, display_name: oneLine(r.actor_display_name, 80) || '@' + r.actor_public_username } : null,
      }));
      return ready({ items }, !items.length);
    },
    async dailyQuote() {
      const n = Number((await pool.query(SQL.dailyQuoteCount)).rows[0]?.n || 0);
      if (!n) return ready({ item: null }, true);
      const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
      const r = (await pool.query(SQL.dailyQuote, [day % n])).rows[0];
      return r ? ready({ item: { text: text(r.quote_text, 500), attribution: oneLine(r.author, 120) || null } }) : ready({ item: null }, true);
    },
    async continueYourJourney(viewerId) {
      const rows = (await pool.query(SQL.continueJourney, [viewerId])).rows;
      const refs = await issueRefs('COURSE', rows.map((r) => r.internal_key));
      const items = rows.map((r) => { const code = refs.get(String(r.internal_key)); return code && { type: 'course', public_key: code, title: oneLine(r.title, 120), category: oneLine(r.category, 60) || null, progress_percent: Math.max(0, Math.min(100, Math.round(Number(r.progress || 0)))), label: 'Resume course', pillar: 'learn', route: `/learn/courses/${code}`, landing: { area: 'learn', view: 'my-learning' } }; }).filter(Boolean);
      return ready({ items }, !items.length);
    },
  };
  async function peopleSection(viewerId, creatorsOnly) {
    const items = (await pool.query(SQL.people(creatorsOnly), [viewerId])).rows.filter((r) => isPublicUsername(r.public_username)).map((r) => ({
      ...authorDto(r), headline: oneLine(r.profession_title || r.professional_category, 80) || null, following: viewerId > 0 && r.following === true, route: `/@${r.public_username}`,
    }));
    return ready({ items }, !items.length);
  }

  // ---------------- request handling
  function fail(res, http, code, message) { sendJSON(res, http, { status: 'error', code, message }); }
  function badParams(url, allowed) {
    const seen = new Set();
    for (const k of url.searchParams.keys()) {
      if (GUARD_OWNED_PARAMS.includes(k)) continue;
      if (!allowed.includes(k) || seen.has(k)) return true;
      seen.add(k);
    }
    return false;
  }
  async function resolveViewer(req) {
    const u = await getSessionUserFromRequest(req);
    if (!u || u.is_active === false || String(u.account_status || 'ACTIVE').toUpperCase() !== 'ACTIVE') return 0;
    const id = Number(u.id);
    return Number.isSafeInteger(id) && id > 0 ? id : 0;
  }
  function limited(req, res, viewerId, bucket, userMax, guestMax) {
    if (typeof rateLimit !== 'function') return false;
    const key = viewerId ? `k5a-${bucket}:user:${viewerId}` : `k5a-${bucket}:ip:${typeof getRequestIp === 'function' ? getRequestIp(req) : 'unknown'}`;
    const r = rateLimit(key, viewerId ? userMax : guestMax, 60000);
    if (r && r.allowed === false) { res.setHeader('Retry-After', String(Math.ceil((r.retryAfterMs || 60000) / 1000))); fail(res, 429, 'RATE_LIMITED', 'Too many requests. Please slow down and try again shortly.'); return true; }
    return false;
  }

  async function home(req, res, url) {
    if (badParams(url, ['sections'])) return fail(res, 400, 'INVALID_HOME_PARAMETER', 'Unsupported Home parameter.');
    const raw = url.searchParams.get('sections');
    let requested;
    if (raw === null || raw === '') requested = null;
    else {
      requested = [...new Set(raw.split(','))];
      if (requested.length > SECTION_KEYS.length || requested.some((k) => !SECTION_KEYS.includes(k))) return fail(res, 400, 'INVALID_HOME_PARAMETER', 'Unknown Home section.');
    }
    const viewerId = await resolveViewer(req);
    // A page load is one manifest call; its lazy section calls use a separate, larger budget.
    if (limited(req, res, viewerId, requested ? 'home-part' : 'home', requested ? 360 : 120, requested ? 180 : 60)) return;
    const want = requested || ABOVE_FOLD;
    const built = {};
    await Promise.all(SECTION_KEYS.map(async (key) => {
      if (!want.includes(key)) { built[key] = { state: (!viewerId && PERSONAL_ONLY.includes(key)) ? 'hidden' : 'deferred', title: SECTION_TITLES[key] }; return; }
      if (!viewerId && PERSONAL_ONLY.includes(key)) { built[key] = { state: 'hidden', title: SECTION_TITLES[key] }; return; }
      try { built[key] = { title: SECTION_TITLES[key], ...(await B[key](viewerId)) }; }
      catch (error) { logger.error(`[K5A home] section "${key}" failed:`, error && error.message); built[key] = { state: 'error', title: SECTION_TITLES[key] }; }
    }));
    const sections = Object.fromEntries(SECTION_KEYS.map((k) => [k, built[k]]));
    const body = { status: 'success', ...stripInternalKeys({ viewer: viewerId ? 'session' : 'guest', home_variant: viewerId ? 'personalized' : 'curated', order: [...SECTION_KEYS], sections }) };
    sendJSON(res, 200, body);
  }
  async function feed(req, res, url) {
    if (badParams(url, ['cursor', 'limit'])) return fail(res, 400, 'INVALID_FEED_PARAMETER', 'Unsupported feed parameter.');
    const limitRaw = url.searchParams.get('limit');
    let limit = FEED.PAGE_DEFAULT;
    if (limitRaw !== null && limitRaw !== '') {
      if (!/^\d{1,2}$/.test(limitRaw) || Number(limitRaw) < 1 || Number(limitRaw) > FEED.PAGE_MAX) return fail(res, 400, 'INVALID_FEED_PARAMETER', `limit must be between 1 and ${FEED.PAGE_MAX}.`);
      limit = Number(limitRaw);
    }
    const cursor = url.searchParams.get('cursor') || null;
    const viewerId = await resolveViewer(req);
    if (limited(req, res, viewerId, 'home-feed', 240, 120)) return;
    if (feedDisabled()) return fail(res, 503, 'HOME_FEED_UNAVAILABLE', 'The feed is temporarily unavailable.');
    const page = await feedPage(viewerId, { cursor, limit });
    if (page.error === 'INVALID_CURSOR') return fail(res, 400, 'INVALID_CURSOR', 'This feed link is not valid. Refresh to start again.');
    if (page.error === 'CURSOR_EXPIRED') return fail(res, 410, 'CURSOR_EXPIRED', 'This feed has expired. Refresh to see the latest.');
    sendJSON(res, 200, { status: 'success', ...stripInternalKeys({ viewer: viewerId ? 'session' : 'guest', items: page.items, next_cursor: page.next_cursor, has_more: page.has_more }) });
  }
  async function postByCode(req, res, code) {
    const viewerId = await resolveViewer(req);
    if (limited(req, res, viewerId, 'home-item', 240, 120)) return;
    const ref = await resolveRef(code, ['POST', 'ARTICLE']);
    const notFound = () => fail(res, 404, 'NOT_FOUND', 'This content is not available.');
    if (!ref || !/^\d{1,18}$/.test(ref.entity_key)) return notFound();
    const rows = (await pool.query(`SELECT ${POST_COLUMNS}, p.content AS full_content, p.media_data, COALESCE(NULLIF(p.article_cover_url,''),'') AS cover ${POST_FROM} WHERE p.id=$2::bigint AND ${POST_WHERE}`, [viewerId, ref.entity_key])).rows;
    const r = rows[0];
    if (!r || !postOk(r, viewerId) || (String(r.post_type || '').toUpperCase() === 'ARTICLE' ? 'ARTICLE' : 'POST') !== ref.entity_type) return notFound();
    const dto = feedItemDto(r, code);
    const media = mediaUrl(r.media_data, 2e6);
    sendJSON(res, 200, { status: 'success', ...stripInternalKeys({ item: { ...dto, content: { ...dto.content, text: text(r.full_content, 20000), media: media ? { type: dto.content.media_type || 'media', url: media } : null }, cover_url: mediaUrl(r.cover) } }) });
  }
  async function storyByCode(req, res, code) {
    const viewerId = await resolveViewer(req);
    if (limited(req, res, viewerId, 'home-item', 240, 120)) return;
    const ref = await resolveRef(code, ['STORY']);
    const notFound = () => fail(res, 404, 'NOT_FOUND', 'This content is not available.');
    if (!ref || !/^\d{1,18}$/.test(ref.entity_key)) return notFound();
    const r = (await pool.query(SQL.storyByKey, [viewerId, ref.entity_key])).rows[0];
    if (!r || !authorOk(r)) return notFound();
    const media = mediaUrl(r.media_data, 2e6);
    sendJSON(res, 200, { status: 'success', ...stripInternalKeys({ item: { public_key: code, author: authorDto(r), mine: r.mine === true, viewed: r.viewed === true, text: text(r.content, 2000) || null, media: media ? { type: oneLine(r.media_type, 20).toLowerCase() || 'image', url: media } : null, created_at: iso(r.created_at), expires_at: iso(r.expires_at), route: `/stories/${code}` } }) });
  }

  // Returns true when the request was handled.
  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    let route = null, code = null;
    if (p === '/api/connect/home') route = 'home';
    else if (p === '/api/connect/home/feed') route = 'feed';
    else { const m = p.match(/^\/api\/connect\/(posts|stories)\/by-code\/([^/]{1,40})$/); if (m) { route = m[1] === 'posts' ? 'post' : 'story'; code = m[2]; } }
    if (!route) return false;
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET') { fail(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET.'); return true; }
    try {
      if (route === 'home') await home(req, res, url);
      else if (route === 'feed') await feed(req, res, url);
      else {
        if (badParams(url, [])) fail(res, 400, 'INVALID_PARAMETER', 'Unsupported parameter.');
        else if (route === 'post') await postByCode(req, res, code);
        else await storyByCode(req, res, code);
      }
    } catch (error) {
      logger.error('[K5A home] request failed:', error && error.message);
      if (!res.headersSent) fail(res, 500, 'HOME_UNAVAILABLE', 'Connect Home is temporarily unavailable. Please try again.');
    }
    return true;
  }

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_public_refs(
      entity_type VARCHAR(16) NOT NULL CHECK (entity_type IN ('POST','ARTICLE','STORY','PRODUCT','COURSE')),
      entity_key VARCHAR(64) NOT NULL,
      public_code VARCHAR(24) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(entity_type, entity_key))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_connect_feed_sessions(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      viewer_key VARCHAR(64) NOT NULL,
      variant VARCHAR(20) NOT NULL,
      item_keys BIGINT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_howdi_connect_feed_sessions_expiry ON howdi_connect_feed_sessions(expires_at)`);
  }

  return { handle, ensureSchema, keyMode: keyInfo.mode, _internal: { feedPage, issueRefs, resolveRef, SQL } };
}

module.exports = {
  createConnectHomeK5A, createCursorBox, resolveCursorKey,
  SECTION_KEYS, SECTION_TITLES, ABOVE_FOLD, PERSONAL_ONLY, REF_PREFIX, PUBLIC_CODE_RE, FEED, FORBIDDEN_KEY_RE,
  safeCta, mediaUrl, stripInternalKeys, feedItemDto, authorDto, isPublicUsername, isPublicWorkerCode, isSlug, excerpt,
};
