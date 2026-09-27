'use strict';
// =====================================================================================
// HOWDI V8 — CONNECT FEATURE HUB API (boards 06, 07, 14, 17, 32, SUP-03, PRIOR-07)
//
// One allow-listed, public-reference API for the V8 Connect screens, built on the EXISTING tables
// (vibes*, howdi_connect_*, howdi_community_posts). Legacy endpoints are left untouched; the V8 UI uses these.
//
//   GET  /api/v8/connect/hub                          Connect home: stories, rails (communities, groups, channels,
//                                                     live, spaces), vibes and articles previews
//   GET  /api/v8/connect/stories                      stories grouped by author (24 h, audience rules)
//   GET  /api/v8/vibes?tab=for-you|following|explore|learn&category=slug&cursor=
//   GET  /api/v8/vibes/categories
//   GET  /api/v8/vibes/{VIB-code}                     one Vibe
//   POST|DELETE /api/v8/vibes/{VIB}/like|save         toggle
//   POST /api/v8/vibes/{VIB}/share|not-interested|report
//   GET|POST /api/v8/vibes/{VIB}/comments
//   POST /api/v8/vibes                                create + publish (media as data URL, stored without user ids)
//   POST|DELETE /api/v8/creators/{@handle}/follow|block
//   GET  /api/v8/media/{file}                         serves V8-stored media (range requests for video)
//
// Rules: the viewer comes ONLY from the Bearer session; request bodies never carry actor ids. Every response is built
// from an explicit DTO and passes through stripInternal() (no id / *_id / uuid / howdi_id / email / phone). Content
// is addressed by opaque public codes (howdi_v8_refs), issued only after visibility checks. SQL is static + bound.
// =====================================================================================
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PREFIX = Object.freeze({ VIBE: 'VIB', VCOMMENT: 'VCM', PCOMMENT: 'PCM', LIVE: 'LIV', SPACE: 'SPC', COMMUNITY: 'CMY', PLAN: 'PLN' });
const PREFIX_TYPE = Object.freeze(Object.fromEntries(Object.entries(PREFIX).map(([t, p]) => [p, t])));
const CODE_RE = /^(VIB|VCM|PCM|LIV|SPC|CMY|PLN)-[0-9A-F]{12}$/;
const HANDLE_RE = /^[a-z0-9._]{3,30}$/;
const REPORT_REASONS = Object.freeze(['spam', 'harassment', 'hate', 'violence', 'nudity', 'misinformation', 'copyright', 'self-harm', 'scam', 'other']);
const TABS = Object.freeze(['for-you', 'following', 'explore', 'learn']);

function text(v, max = 200) {
  return String(v ?? '').normalize('NFKC').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max);
}
function oneLine(v, max = 200) { return text(v, max * 4).replace(/\s+/g, ' ').slice(0, max); }
function count(v) { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? n : 0; }
function iso(v) { if (!v) return null; const d = new Date(v); return Number.isFinite(d.getTime()) ? d.toISOString() : null; }
function mediaUrl(v, inlineMax = 16384) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\/[^\s"'<>\\]{1,2000}$/i.test(s)) return s;
  if (/^\/(?!\/)[^\s"'<>\\]{0,1999}$/.test(s)) return s;
  if (/^data:(image\/(png|jpe?g|webp|gif|svg\+xml)|video\/(mp4|webm));base64,[A-Za-z0-9+/=]+$/i.test(s) && s.length <= inlineMax) return s;
  return null;
}
const AVATAR_MAX = 240000;
// Defence in depth: drop identity-bearing keys at any depth.
const FORBIDDEN_KEY_RE = /^(id|_id|pk|uuid|.*_id|.*Id|.*_uuid|.*Uuid|howdi_?id|master_?id|email|e_?mail|phone|mobile|address.*|pincode|lat|lng|session.*|token.*|password.*|internal.*)$/i;
function stripInternal(v) {
  if (Array.isArray(v)) return v.map(stripInternal);
  if (!v || typeof v !== 'object') return v;
  const out = {};
  for (const [k, x] of Object.entries(v)) if (!FORBIDDEN_KEY_RE.test(k)) out[k] = stripInternal(x);
  return out;
}

// Author columns for a numeric user-id SQL expression. Connect @handle wins over the Vibe-only handle.
function authorCols(uid, p) {
  return `COALESCE(NULLIF(${p}cp.public_username,''), NULLIF(${p}vp.public_username,'')) AS ${p}a_handle,
    COALESCE(NULLIF(${p}vp.display_name,''), NULLIF(${p}u.full_name,'')) AS ${p}a_name,
    COALESCE(NULLIF(${p}cp.profile_image,''), NULLIF(${p}cp.avatar_data,''), NULLIF(${p}vp.avatar_url,'')) AS ${p}a_avatar,
    (COALESCE(${p}cp.identity_verified,FALSE) OR LOWER(COALESCE(${p}vp.verified_status,''))='verified') AS ${p}a_verified,
    (COALESCE(${p}cp.creator_mode,FALSE) AND EXISTS(SELECT 1 FROM howdi_connect_creator_plans ${p}pl WHERE ${p}pl.creator_user_id=${p}u.id AND ${p}pl.is_active=TRUE AND COALESCE(${p}pl.price,0)>0)) AS ${p}a_premium,
    (COALESCE(${p}u.is_active,TRUE) AND UPPER(COALESCE(${p}u.account_status,'ACTIVE'))='ACTIVE' AND COALESCE(${p}cp.discoverable,TRUE)) AS ${p}a_ok`;
}
function authorJoins(uid, p) {
  return `LEFT JOIN users ${p}u ON ${p}u.id=(${uid})
    LEFT JOIN howdi_connect_profiles ${p}cp ON ${p}cp.user_id=${p}u.id
    LEFT JOIN vibe_creator_profiles ${p}vp ON ${p}vp.user_id=${p}u.id::text`;
}
function authorDto(r, p = '') {
  const h = String(r[p + 'a_handle'] || '').toLowerCase();
  if (!HANDLE_RE.test(h) || /^\d+$/.test(h.replace(/[._]/g, ''))) return null;
  return {
    public_username: h,
    display_name: oneLine(r[p + 'a_name'], 80) || '@' + h,
    avatar_url: mediaUrl(r[p + 'a_avatar'], AVATAR_MAX),
    verified: r[p + 'a_verified'] === true,
    premium: r[p + 'a_premium'] === true,
  };
}
// viewer ↔ owner block in either direction (Connect profile blocks + Vibe creator blocks). viewer/owner are SQL exprs.
function blockedSql(viewer, owner) {
  return `EXISTS(SELECT 1 FROM howdi_connect_profile_blocks bb WHERE (bb.blocker_user_id=${viewer} AND bb.blocked_user_id=${owner}) OR (bb.blocker_user_id=${owner} AND bb.blocked_user_id=${viewer}))
    OR EXISTS(SELECT 1 FROM vibe_creator_blocks vb WHERE (vb.blocker_user_id=${viewer}::text AND vb.blocked_creator_user_id=${owner}::text) OR (vb.blocker_user_id=${owner}::text AND vb.blocked_creator_user_id=${viewer}::text))`;
}
function privateOkSql(owner, viewer) {
  return `(${owner}=${viewer} OR NOT EXISTS(SELECT 1 FROM howdi_connect_profiles ppr WHERE ppr.user_id=${owner} AND COALESCE(ppr.private_profile,FALSE)=TRUE)
    OR EXISTS(SELECT 1 FROM howdi_connect_follows ppf WHERE ppf.follower_user_id=${viewer} AND ppf.following_user_id=${owner}))`;
}

function createConnectV8(deps) {
  const { pool, sendJSON, getBody, getSessionUserFromRequest, rateLimit, clientIp, mediaDir, logger = console } = deps;
  const k5aIssue = deps.issueK5ARefs || null;
  const MEDIA_DIR = path.join(mediaDir, 'v8');
  try { fs.mkdirSync(MEDIA_DIR, { recursive: true }); } catch { /* created on first write */ }

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_refs(
      entity_type VARCHAR(16) NOT NULL, entity_key VARCHAR(64) NOT NULL, public_code VARCHAR(24) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(entity_type, entity_key))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_vibe_links(
      vibe_id UUID PRIMARY KEY, link_kind VARCHAR(16) NOT NULL, link_label VARCHAR(120) NOT NULL, link_sub VARCHAR(120),
      link_route VARCHAR(200) NOT NULL, captions BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  }

  // ---------------------------------------------------------------- helpers
  const noStore = (res) => { res.setHeader('Cache-Control', 'no-store'); };
  const ok = (res, body, http = 200) => { noStore(res); sendJSON(res, http, { status: 'success', ...stripInternal(body) }); };
  const fail = (res, http, code, message) => { noStore(res); sendJSON(res, http, { status: 'error', code, message }); };
  async function viewer(req) {
    let u = null;
    try { u = await getSessionUserFromRequest(req); } catch { u = null; }
    const id = Number(u && u.id);
    if (!u || u.is_active === false || String(u.account_status || 'ACTIVE').toUpperCase() !== 'ACTIVE' || !Number.isSafeInteger(id) || id <= 0) return null;
    return { ...u, id };
  }
  function limited(res, key, n, ms) {
    const r = rateLimit(key, n, ms);
    if (r && r.allowed === false) { res.setHeader('Retry-After', String(Math.ceil((r.retryAfterMs || ms) / 1000))); fail(res, 429, 'RATE_LIMITED', 'Too many actions. Please wait a moment.'); return true; }
    return false;
  }
  async function issue(type, keys) {
    const prefix = PREFIX[type]; const uniq = [...new Set(keys.map(String))]; const out = new Map();
    if (!prefix || !uniq.length) return out;
    for (let attempt = 0; attempt < 4; attempt++) {
      const codes = uniq.map(() => `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`);
      try {
        await pool.query(`INSERT INTO howdi_v8_refs(entity_type,entity_key,public_code) SELECT $1,x.k,x.c FROM unnest($2::text[],$3::text[]) AS x(k,c) ON CONFLICT (entity_type,entity_key) DO NOTHING`, [type, uniq, codes]);
        break;
      } catch (e) { if (!(e && e.code === '23505') || attempt === 3) throw e; }
    }
    const rows = (await pool.query(`SELECT entity_key, public_code FROM howdi_v8_refs WHERE entity_type=$1 AND entity_key=ANY($2::text[])`, [type, uniq])).rows;
    for (const r of rows) if (CODE_RE.test(r.public_code)) out.set(String(r.entity_key), r.public_code);
    return out;
  }
  async function resolve(code, type) {
    if (typeof code !== 'string' || !CODE_RE.test(code) || PREFIX_TYPE[code.slice(0, 3)] !== type) return null;
    const r = (await pool.query(`SELECT entity_key FROM howdi_v8_refs WHERE public_code=$1 AND entity_type=$2`, [code, type])).rows[0];
    return r ? String(r.entity_key) : null;
  }
  async function userIdByHandle(handle) {
    const h = String(handle || '').replace(/^@/, '').toLowerCase();
    if (!HANDLE_RE.test(h)) return null;
    const r = (await pool.query(`SELECT u.id FROM users u LEFT JOIN howdi_connect_profiles cp ON cp.user_id=u.id LEFT JOIN vibe_creator_profiles vp ON vp.user_id=u.id::text
      WHERE (LOWER(cp.public_username)=$1 OR (cp.public_username IS NULL AND LOWER(vp.public_username)=$1)) AND COALESCE(u.is_active,TRUE)=TRUE
        AND UPPER(COALESCE(u.account_status,'ACTIVE'))='ACTIVE' ORDER BY (LOWER(cp.public_username)=$1) DESC NULLS LAST LIMIT 1`, [h])).rows[0];
    return r ? Number(r.id) : null;
  }

  // ---------------------------------------------------------------- media storage (no user ids in paths)
  const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
  const EXT_MIME = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
  function saveMedia(dataUrl, { images = true, videos = true, maxImage = 5 * 1024 * 1024, maxVideo = 20 * 1024 * 1024 } = {}) {
    const m = String(dataUrl || '').match(/^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
    if (!m) throw Object.assign(new Error('Choose a photo or video.'), { code: 'MEDIA_INVALID' });
    const mime = m[1].toLowerCase();
    const ext = MIME_EXT[mime];
    if (!ext || (mime.startsWith('image/') && !images) || (mime.startsWith('video/') && !videos)) throw Object.assign(new Error('That file type is not supported. Use JPG, PNG, WebP, MP4, WebM or MOV.'), { code: 'MEDIA_TYPE' });
    const raw = Buffer.from(m[2], 'base64');
    const max = mime.startsWith('video/') ? maxVideo : maxImage;
    if (raw.length > max) throw Object.assign(new Error(mime.startsWith('video/') ? `Videos can be up to ${Math.round(maxVideo / 1048576)} MB.` : `Images can be up to ${Math.round(maxImage / 1048576)} MB.`), { code: 'MEDIA_TOO_LARGE' });
    // magic-byte check: the declared type must match the content
    const head = raw.subarray(0, 12).toString('hex');
    const sniff = head.startsWith('ffd8ff') ? 'image/jpeg' : head.startsWith('89504e47') ? 'image/png' : (head.startsWith('52494646') && raw.subarray(8, 12).toString() === 'WEBP') ? 'image/webp'
      : raw.subarray(4, 8).toString() === 'ftyp' ? 'video/mp4' : head.startsWith('1a45dfa3') ? 'video/webm' : '';
    const family = (x) => (x === 'video/quicktime' ? 'video/mp4' : x);
    if (!sniff || family(sniff) !== family(mime)) throw Object.assign(new Error('The file content does not match its type.'), { code: 'MEDIA_MISMATCH' });
    const name = crypto.randomBytes(16).toString('hex') + ext;
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    fs.writeFileSync(path.join(MEDIA_DIR, name), raw);
    return { url: `/api/v8/media/${name}`, mime, size: raw.length, type: mime.startsWith('video/') ? 'video' : 'image' };
  }
  function serveMedia(req, res, file) {
    if (!/^[0-9a-f]{32}\.(jpg|png|webp|mp4|webm|mov)$/.test(file)) { fail(res, 404, 'NOT_FOUND', 'Not found'); return; }
    const full = path.join(MEDIA_DIR, file);
    let stat; try { stat = fs.statSync(full); } catch { fail(res, 404, 'NOT_FOUND', 'Not found'); return; }
    const type = EXT_MIME[path.extname(file)];
    const common = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-site' };
    const range = String(req.headers.range || '');
    const m = range.match(/^bytes=(\d*)-(\d*)$/);
    if (m && (m[1] || m[2])) {
      let start = m[1] ? Number(m[1]) : Math.max(0, stat.size - Number(m[2]));
      let end = m[1] && m[2] ? Math.min(stat.size - 1, Number(m[2])) : stat.size - 1;
      if (!Number.isFinite(start) || start >= stat.size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); res.end(); return; }
      res.writeHead(206, { ...common, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
      fs.createReadStream(full, { start, end }).pipe(res); return;
    }
    res.writeHead(200, { ...common, 'Content-Length': stat.size });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(full).pipe(res);
  }

  // ---------------------------------------------------------------- VIBES
  // v is the vibes alias; creator_user_id is TEXT holding a numeric users.id.
  const VIBE_SELECT = `v.id::text AS vkey, v.caption, v.cover_url, v.published_at, v.allow_comments, v.allow_remix, v.allow_share, v.is_learning_vibe, v.sensitive_content,
      COALESCE(s.likes,0) likes, COALESCE(s.comments,0) comments, COALESCE(s.saves,0) saves, COALESCE(s.shares,0) shares, COALESCE(s.plays,0) plays,
      COALESCE((SELECT json_agg(json_build_object('type',m.media_type,'url',m.media_url,'thumbnail',m.thumbnail_url,'durationMs',m.duration_ms) ORDER BY m.position) FROM vibe_media m WHERE m.vibe_id=v.id),'[]'::json) media,
      COALESCE((SELECT json_agg(json_build_object('name',c.name,'slug',c.slug) ORDER BY cm.is_primary DESC,c.sort_order) FROM vibe_category_map cm JOIN vibe_categories c ON c.id=cm.category_id WHERE cm.vibe_id=v.id),'[]'::json) cats,
      COALESCE((SELECT json_agg(t.tag ORDER BY t.tag) FROM vibe_tag_map tm JOIN vibe_tags t ON t.id=tm.tag_id WHERE tm.vibe_id=v.id),'[]'::json) tags,
      lk.link_kind, lk.link_label, lk.link_sub, lk.link_route, COALESCE(lk.captions,TRUE) captions,
      ($1::bigint>0 AND EXISTS(SELECT 1 FROM vibe_likes x WHERE x.vibe_id=v.id AND x.user_id=$1::text)) v_liked,
      ($1::bigint>0 AND EXISTS(SELECT 1 FROM vibe_saves x WHERE x.vibe_id=v.id AND x.user_id=$1::text)) v_saved,
      ($1::bigint>0 AND (EXISTS(SELECT 1 FROM vibe_follows x WHERE x.follower_user_id=$1::text AND x.creator_user_id=v.creator_user_id)
        OR EXISTS(SELECT 1 FROM howdi_connect_follows x WHERE x.follower_user_id=$1::bigint AND x.following_user_id=a_u.id))) v_following,
      ($1::bigint>0 AND a_u.id=$1::bigint) v_mine,
      ${authorCols('a_u.id', 'a_').replace(/\ba_u\.id\b/g, 'a_u.id')}`;
  const VIBE_FROM = `FROM vibes v LEFT JOIN vibe_stats s ON s.vibe_id=v.id LEFT JOIN howdi_v8_vibe_links lk ON lk.vibe_id=v.id
      ${authorJoins("CASE WHEN v.creator_user_id ~ '^[0-9]{1,18}$' THEN v.creator_user_id::bigint END", 'a_')}`;
  const VIBE_VISIBLE = `v.status='published' AND v.visibility='public' AND v.deleted_at IS NULL AND COALESCE(v.moderation_status,'approved') NOT IN ('rejected','removed','blocked')
      AND a_u.id IS NOT NULL AND (a_u.id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'a_u.id')})) AND ${privateOkSql('a_u.id', '$1::bigint')}`;
  function linkDto(r) {
    if (!r.link_kind || !/^(product|course|community|profile|service)$/.test(r.link_kind)) return null;
    const route = String(r.link_route || '');
    if (!/^\/(shop|learn|works|connect|@)[A-Za-z0-9/._@-]{0,120}$/.test(route)) return null;
    return { kind: r.link_kind, label: oneLine(r.link_label, 80), sub: oneLine(r.link_sub, 80) || null, route };
  }
  function vibeDto(r, code) {
    const author = authorDto(r, 'a_');
    if (!author) return null;
    const media = (Array.isArray(r.media) ? r.media : []).map((m) => ({ type: m.type === 'video' ? 'video' : 'image', url: mediaUrl(m.url, 0), poster: mediaUrl(m.thumbnail, 400000) })).filter((m) => m.url);
    const cover = mediaUrl(r.cover_url, 600000);
    if (!media.length && !cover) return null;
    return {
      public_key: code, caption: text(r.caption, 2200), author,
      media: media.length ? media : [{ type: 'image', url: cover, poster: null }], cover_url: cover || media[0].poster || null,
      categories: (Array.isArray(r.cats) ? r.cats : []).map((c) => ({ name: oneLine(c.name, 40), slug: oneLine(c.slug, 60) })).slice(0, 4),
      tags: (Array.isArray(r.tags) ? r.tags : []).map((t) => oneLine(t, 40)).filter(Boolean).slice(0, 8),
      linked: linkDto(r), captions: r.captions !== false, learning: r.is_learning_vibe === true, sensitive: r.sensitive_content === true,
      counts: { likes: count(r.likes), comments: count(r.comments), saves: count(r.saves), shares: count(r.shares), plays: count(r.plays) },
      allow: { comment: r.allow_comments !== false, remix: r.allow_remix !== false, share: r.allow_share !== false },
      viewer: { liked: r.v_liked === true, saved: r.v_saved === true, following: r.v_following === true, mine: r.v_mine === true },
      published_at: iso(r.published_at), route: `/connect/vibe/${code}`,
    };
  }
  async function vibeDtos(rows) {
    const refs = await issue('VIBE', rows.map((r) => r.vkey));
    return rows.map((r) => vibeDto(r, refs.get(String(r.vkey)))).filter((x) => x && x.public_key);
  }
  function seal(obj) { return Buffer.from(JSON.stringify(obj)).toString('base64url'); }
  function unseal(s) { try { const o = JSON.parse(Buffer.from(String(s || ''), 'base64url').toString()); return o && typeof o === 'object' ? o : null; } catch { return null; } }

  async function vibeFeed(vid, { tab, category, cursor, limit }) {
    const params = [vid];
    const where = [VIBE_VISIBLE];
    if (tab === 'following') {
      if (!vid) return { items: [], next_cursor: null, needs_sign_in: true };
      where.push(`(EXISTS(SELECT 1 FROM vibe_follows x WHERE x.follower_user_id=$1::text AND x.creator_user_id=v.creator_user_id)
        OR EXISTS(SELECT 1 FROM howdi_connect_follows x WHERE x.follower_user_id=$1::bigint AND x.following_user_id=a_u.id))`);
    }
    if (tab === 'learn') where.push('v.is_learning_vibe=TRUE');
    if (vid) where.push(`NOT EXISTS(SELECT 1 FROM vibe_not_interested ni WHERE ni.user_id=$1::text AND (ni.vibe_id=v.id OR (ni.vibe_id IS NULL AND ni.creator_user_id=v.creator_user_id)))`);
    if (category) { params.push(category); where.push(`EXISTS(SELECT 1 FROM vibe_category_map cm JOIN vibe_categories c ON c.id=cm.category_id WHERE cm.vibe_id=v.id AND c.slug=$${params.length})`); }
    const off = Math.max(0, Math.min(400, Number((unseal(cursor) || {}).o) || 0));
    params.push(limit + 1, off);
    const order = tab === 'explore'
      ? `ORDER BY (COALESCE(s.saves,0)*3+COALESCE(s.shares,0)*4+COALESCE(s.likes,0)+COALESCE(s.comments,0)*2) DESC, v.published_at DESC, v.id`
      : `ORDER BY v.published_at DESC NULLS LAST, v.id`;
    const rows = (await pool.query(`SELECT ${VIBE_SELECT} ${VIBE_FROM} WHERE ${where.join(' AND ')} ${order} LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
    const more = rows.length > limit;
    const items = await vibeDtos(rows.slice(0, limit));
    return { items, next_cursor: more ? seal({ o: off + limit }) : null };
  }
  async function vibeRowByCode(code, vid) {
    const key = await resolve(code, 'VIBE');
    if (!key) return null;
    return (await pool.query(`SELECT ${VIBE_SELECT}, v.creator_user_id AS owner_text ${VIBE_FROM} WHERE v.id=$2::uuid AND ${VIBE_VISIBLE}`, [vid || 0, key])).rows[0] || null;
  }
  async function bumpStat(vibeKey, col, delta) {
    if (!['likes', 'saves', 'comments', 'shares'].includes(col)) return;
    await pool.query(`INSERT INTO vibe_stats(vibe_id,${col}) VALUES($1::uuid,GREATEST(0,$2::bigint)) ON CONFLICT(vibe_id) DO UPDATE SET ${col}=GREATEST(0,COALESCE(vibe_stats.${col},0)+$2::bigint), updated_at=NOW()`, [vibeKey, delta]);
  }
  async function commentDtos(rows, vid) { return commentDtosFor('VCOMMENT', rows, vid); }
  async function commentDtosFor(type, rows, vid) {
    const refs = await issue(type, rows.map((r) => r.ckey));
    return rows.map((r) => {
      const author = authorDto(r, 'a_'); const code = refs.get(String(r.ckey));
      if (!author || !code) return null;
      return { public_key: code, text: text(r.comment_text, 1000), author, created_at: iso(r.created_at), likes: count(r.likes), reply_to: r.parent_code || null, mine: vid > 0 && Number(r.owner_id) === vid, by_creator: r.by_creator === true };
    }).filter(Boolean);
  }
  const COMMENT_SQL = `SELECT c.id::text ckey, c.comment_text, c.created_at, a_u.id AS owner_id,
      (SELECT COUNT(*) FROM vibe_comment_likes cl WHERE cl.comment_id=c.id) likes, (c.user_id=v.creator_user_id) by_creator,
      (SELECT r.public_code FROM howdi_v8_refs r WHERE r.entity_type='VCOMMENT' AND r.entity_key=c.parent_comment_id::text) parent_code,
      ${authorCols('a_u.id', 'a_')}
    FROM vibe_comments c JOIN vibes v ON v.id=c.vibe_id
    ${authorJoins("CASE WHEN c.user_id ~ '^[0-9]{1,18}$' THEN c.user_id::bigint END", 'a_')}
    WHERE c.vibe_id=$2::uuid AND COALESCE(c.status,'visible') NOT IN ('deleted','hidden','removed') AND a_u.id IS NOT NULL
      AND (a_u.id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'a_u.id')}))`;

  async function createVibe(req, res, v) {
    if (limited(res, `v8-vibe-create:${v.id}`, 12, 60 * 60 * 1000)) return;
    const body = (await getBody(req)) || {};
    const caption = text(body.caption, 2200);
    const audience = ['public', 'followers', 'private'].includes(String(body.audience || 'public').toLowerCase()) ? String(body.audience || 'public').toLowerCase() : 'public';
    const errors = {};
    if (!body.mediaData) errors.media = 'Add a video or photo.';
    if (caption.length > 2200) errors.caption = 'Captions can be up to 2,200 characters.';
    if (Object.keys(errors).length) return fail(res, 400, 'VALIDATION', Object.values(errors)[0]);
    let media, cover = null;
    try {
      media = saveMedia(body.mediaData, { maxVideo: 20 * 1024 * 1024 });
      if (body.coverData) cover = saveMedia(body.coverData, { videos: false, maxImage: 4 * 1024 * 1024 });
    } catch (e) { return fail(res, 400, e.code || 'MEDIA_INVALID', e.message); }
    let link = null;
    if (body.link && typeof body.link === 'object') {
      const kind = String(body.link.kind || '');
      if (kind === 'profile') {
        const h = String(body.link.handle || '').replace(/^@/, '').toLowerCase();
        if (HANDLE_RE.test(h) && await userIdByHandle(h)) link = { kind, label: '@' + h, sub: 'Profile', route: '/@' + h };
      } else if (kind === 'community') {
        const slug = String(body.link.slug || '');
        const r = /^[a-z0-9-]{2,80}$/.test(slug) ? (await pool.query(`SELECT name, space_type FROM howdi_connect_social_spaces WHERE slug=$1 AND COALESCE(is_archived,FALSE)=FALSE AND privacy<>'SECRET'`, [slug])).rows[0] : null;
        if (r) link = { kind, label: oneLine(r.name, 80), sub: r.space_type === 'CHANNEL' ? 'Channel' : 'Group', route: `/connect/communities/${slug}` };
      } else if (kind === 'product' || kind === 'course') {
        const code = String(body.link.code || '');
        const re = kind === 'product' ? /^PRD-[0-9A-F]{12}$/ : /^CRS-[0-9A-F]{12}$/;
        if (re.test(code)) {
          const r = (await pool.query(`SELECT 1 FROM howdi_public_refs WHERE public_code=$1`, [code])).rows[0];
          if (r) link = { kind, label: oneLine(body.link.label, 80) || (kind === 'product' ? 'Product' : 'Course'), sub: kind === 'product' ? 'Shop' : 'Learn & Earn', route: kind === 'product' ? `/shop/p/${code}` : `/learn/c/${code}` };
        }
      }
    }
    let remixId = null;
    if (body.remixOf) {
      const src = await vibeRowByCode(String(body.remixOf), v.id);
      if (!src || src.allow_remix === false) return fail(res, 403, 'REMIX_NOT_ALLOWED', 'This Vibe can’t be remixed.');
      remixId = src.vkey;
    }
    const client = await pool.connect();
    let vibeKey;
    try {
      await client.query('BEGIN');
      const n = (await client.query(`SELECT COALESCE(MAX(NULLIF(regexp_replace(vibe_code,'\\D','','g'),'')::bigint),0)+1 n FROM vibes`)).rows[0].n;
      const name = (await client.query(`SELECT COALESCE(NULLIF(u.full_name,''),'HOWDI member') n FROM users u WHERE u.id=$1`, [v.id])).rows[0]?.n || 'HOWDI member';
      vibeKey = (await client.query(`INSERT INTO vibes(vibe_code,creator_user_id,creator_name,vibe_type,caption,visibility,status,content_type,allow_comments,allow_remix,allow_share,cover_url,published_at,remix_source_vibe_id,moderation_status)
        VALUES($1,$2,$3,$4,$5,$6,'published','general',$7,$8,TRUE,$9,NOW(),$10,'approved') RETURNING id::text`,
        [`VIBE-${String(n).padStart(6, '0')}`, String(v.id), name, media.type === 'video' ? 'video' : 'photo', caption, audience, body.allowComments !== false, body.allowRemix !== false, cover ? cover.url : (media.type === 'image' ? media.url : null), remixId])).rows[0].id;
      await client.query(`INSERT INTO vibe_media(vibe_id,media_type,media_url,thumbnail_url,mime_type,file_size_bytes,position,processing_status) VALUES($1::uuid,$2,$3,$4,$5,$6,0,'ready')`,
        [vibeKey, media.type, media.url, cover ? cover.url : null, media.mime, media.size]);
      await client.query(`INSERT INTO vibe_stats(vibe_id) VALUES($1::uuid) ON CONFLICT DO NOTHING`, [vibeKey]);
      if (link) await client.query(`INSERT INTO howdi_v8_vibe_links(vibe_id,link_kind,link_label,link_sub,link_route,captions) VALUES($1::uuid,$2,$3,$4,$5,$6)`, [vibeKey, link.kind, link.label, link.sub, link.route, body.captions !== false]);
      else await client.query(`INSERT INTO howdi_v8_vibe_links(vibe_id,link_kind,link_label,link_sub,link_route,captions) VALUES($1::uuid,'none','','', '/connect',$2)`, [vibeKey, body.captions !== false]);
      const cats = Array.isArray(body.categories) ? body.categories.map((c) => String(c)).filter((c) => /^[a-z0-9-]{2,60}$/.test(c)).slice(0, 3) : [];
      if (cats.length) await client.query(`INSERT INTO vibe_category_map(vibe_id,category_id,is_primary) SELECT $1::uuid, c.id, (c.slug=$2) FROM vibe_categories c WHERE c.slug=ANY($3::text[]) AND c.is_active=TRUE ON CONFLICT DO NOTHING`, [vibeKey, cats[0], cats]);
      if (remixId) await client.query(`UPDATE vibe_stats SET remixes=COALESCE(remixes,0)+1 WHERE vibe_id=$1::uuid`, [remixId]);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    const code = (await issue('VIBE', [vibeKey])).get(String(vibeKey));
    ok(res, { vibe: { public_key: code, route: `/connect/vibe/${code}`, audience } }, 201);
  }

  // ---------------------------------------------------------------- STORIES (grouped by author)
  async function stories(vid) {
    const rows = (await pool.query(`SELECT s.id::text skey, s.content, s.media_data, s.media_type, s.created_at, s.audience, s.filter_name,
        ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_connect_story_views sv WHERE sv.story_id=s.id AND sv.user_id=$1::bigint)) seen,
        (a_u.id=$1::bigint) mine, ${authorCols('a_u.id', 'a_')}
      FROM howdi_connect_stories s ${authorJoins('s.user_id', 'a_')}
      WHERE s.expires_at>NOW() AND a_u.id IS NOT NULL
        AND (a_u.id=$1::bigint OR (NOT (${blockedSql('$1::bigint', 'a_u.id')}) AND ${privateOkSql('a_u.id', '$1::bigint')}
          AND (COALESCE(s.audience,'Everyone')='Everyone'
            OR (s.audience='Friends' AND EXISTS(SELECT 1 FROM howdi_connect_follows f1 WHERE f1.follower_user_id=$1::bigint AND f1.following_user_id=a_u.id) AND EXISTS(SELECT 1 FROM howdi_connect_follows f2 WHERE f2.follower_user_id=a_u.id AND f2.following_user_id=$1::bigint))
            OR (s.audience='Close friends' AND EXISTS(SELECT 1 FROM howdi_connect_close_friends cf WHERE cf.user_id=a_u.id AND cf.friend_user_id=$1::bigint)))))
      ORDER BY (a_u.id=$1::bigint) DESC, s.created_at DESC LIMIT 200`, [vid || 0])).rows;
    const refs = k5aIssue ? await k5aIssue('STORY', rows.map((r) => r.skey)) : new Map();
    const groups = new Map();
    for (const r of rows) {
      const a = authorDto(r, 'a_'); const code = refs.get(String(r.skey));
      if (!a || !code) continue;
      if (!groups.has(a.public_username)) groups.set(a.public_username, { author: a, mine: r.mine === true, seen_all: true, latest_at: iso(r.created_at), items: [] });
      const g = groups.get(a.public_username);
      const isVideo = /^data:video\//.test(String(r.media_data || '')) || String(r.media_type || '').toLowerCase().startsWith('video');
      g.items.push({ public_key: code, text: text(r.content, 280), media_type: r.media_data ? (isVideo ? 'video' : 'image') : 'text', media_url: mediaUrl(r.media_data, 6 * 1024 * 1024), created_at: iso(r.created_at), seen: r.seen === true, filter: ['warm', 'cool', 'mono'].includes(r.filter_name) ? r.filter_name : 'none', audience: r.mine ? oneLine(r.audience, 20) : undefined });
      if (!r.seen) g.seen_all = false;
    }
    const list = [...groups.values()].map((g) => ({ ...g, items: g.items.reverse() }));
    list.sort((a, b) => (b.mine - a.mine) || (a.seen_all - b.seen_all) || String(b.latest_at).localeCompare(String(a.latest_at)));
    return list;
  }

  // ---------------------------------------------------------------- HUB rails
  async function socialRail(vid, type, limit) {
    const rows = (await pool.query(`SELECT sp.slug, sp.name, sp.description, sp.category, sp.privacy, sp.cover_data, sp.avatar_data, sp.is_verified, sp.space_type,
        (SELECT COUNT(*) FROM howdi_connect_social_space_members am WHERE am.space_id=sp.id AND am.status='ACTIVE') member_count,
        (SELECT m.status FROM howdi_connect_social_space_members m WHERE m.space_id=sp.id AND m.user_id=$1::bigint) my_status
      FROM howdi_connect_social_spaces sp
      WHERE COALESCE(sp.is_archived,FALSE)=FALSE AND sp.privacy IN ('PUBLIC','PRIVATE') AND ($2::text IS NULL OR sp.space_type=$2)
        AND sp.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND (sp.owner_user_id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'sp.owner_user_id')}))
      ORDER BY sp.is_verified DESC, 10 DESC, sp.created_at DESC LIMIT $3`, [vid || 0, type, limit])).rows;
    return rows.map((r) => ({
      kind: r.space_type === 'CHANNEL' ? 'channel' : 'group', public_key: r.slug, name: oneLine(r.name, 80), description: oneLine(r.description, 160) || null,
      category: oneLine(r.category, 40) || null, privacy: r.privacy === 'PRIVATE' ? 'private' : 'public', image_url: mediaUrl(r.cover_data || r.avatar_data, 400000),
      member_count: count(r.member_count), verified: r.is_verified === true,
      membership: r.my_status === 'ACTIVE' ? 'member' : r.my_status === 'PENDING' ? 'pending' : 'none', route: `/connect/communities/${r.slug}`,
    }));
  }
  async function roomRail(vid, type, limit) {
    const rows = (await pool.query(`SELECT c.id::text rkey, c.name, c.topic, c.session_status, c.scheduled_for, c.started_at, c.live_thumbnail_data, c.category,
        (SELECT COUNT(*) FROM howdi_connect_community_members m WHERE m.community_id=c.id AND COALESCE(m.membership_status,'ACTIVE')='ACTIVE') going,
        ${authorCols('a_u.id', 'a_')}
      FROM howdi_connect_communities c ${authorJoins('c.owner_user_id', 'a_')}
      WHERE c.community_type=$2 AND COALESCE(c.status,'ACTIVE') NOT IN ('ARCHIVED','REMOVED','DELETED') AND COALESCE(c.privacy,'PUBLIC')='PUBLIC'
        AND COALESCE(c.session_status,'SCHEDULED') IN ('LIVE','SCHEDULED') AND a_u.id IS NOT NULL
        AND (a_u.id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'a_u.id')}))
      ORDER BY (c.session_status='LIVE') DESC, c.scheduled_for ASC NULLS LAST LIMIT $3`, [vid || 0, type, limit])).rows;
    const refs = await issue(type === 'LIVE' ? 'LIVE' : 'SPACE', rows.map((r) => r.rkey));
    return rows.map((r) => {
      const host = authorDto(r, 'a_'); const code = refs.get(String(r.rkey));
      if (!host || !code) return null;
      return { public_key: code, title: oneLine(r.name, 100), topic: oneLine(r.topic, 120) || null, state: r.session_status === 'LIVE' ? 'live' : 'scheduled',
        starts_at: iso(r.scheduled_for || r.started_at), image_url: mediaUrl(r.live_thumbnail_data, 400000), host, going: count(r.going),
        route: `/connect/${type === 'LIVE' ? 'live' : 'spaces'}/${code}` };
    }).filter(Boolean);
  }
  async function articleRail(vid, limit) {
    const rows = (await pool.query(`SELECT p.id::text pkey, p.article_title, p.article_excerpt, p.article_cover_url, p.article_read_minutes, p.article_category, p.created_at,
        ${authorCols('a_u.id', 'a_')}
      FROM howdi_community_posts p ${authorJoins('p.user_id', 'a_')}
      WHERE p.post_type='ARTICLE' AND p.post_status='PUBLISHED' AND COALESCE(p.audience_scope,'EVERYONE')='EVERYONE' AND COALESCE(p.subscribers_only,FALSE)=FALSE
        AND a_u.id IS NOT NULL AND (a_u.id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'a_u.id')})) AND ${privateOkSql('a_u.id', '$1::bigint')}
      ORDER BY p.created_at DESC LIMIT $2`, [vid || 0, limit])).rows;
    const refs = k5aIssue ? await k5aIssue('ARTICLE', rows.map((r) => r.pkey)) : new Map();
    return rows.map((r) => {
      const a = authorDto(r, 'a_'); const code = refs.get(String(r.pkey));
      if (!a || !code) return null;
      return { public_key: code, title: oneLine(r.article_title, 160), excerpt: oneLine(r.article_excerpt, 200) || null, cover_url: mediaUrl(r.article_cover_url, 0),
        read_minutes: count(r.article_read_minutes) || null, category: oneLine(r.article_category, 40) || null, author: a, published_at: iso(r.created_at), route: `/connect/articles/${code}` };
    }).filter(Boolean);
  }


  // ---------------------------------------------------------------- CONNECT POSTS (hub feed, composer, actions)
  const POST_SELECT = `p.id::text pkey, a_u.id AS owner_id, p.content, p.media_data, p.media_type, p.media_gallery, p.created_at, p.audience_scope, p.allow_comments, p.post_type,
      (SELECT COUNT(*) FROM howdi_community_reactions r WHERE r.post_id=p.id) reactions,
      (SELECT COUNT(*) FROM howdi_community_comments c WHERE c.post_id=p.id) comments,
      (SELECT COUNT(*) FROM howdi_connect_shares sh WHERE sh.post_id=p.id) shares,
      ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_community_reactions r WHERE r.post_id=p.id AND r.user_id=$1::bigint)) v_liked,
      ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_connect_post_saves s WHERE s.post_id=p.id AND s.user_id=$1::bigint)) v_saved,
      ($1::bigint>0 AND a_u.id=$1::bigint) v_mine,
      ${authorCols('a_u.id', 'a_')}`;
  const POST_FROM = `FROM howdi_community_posts p ${authorJoins('p.user_id', 'a_')}`;
  const POST_VISIBLE = `COALESCE(p.post_type,'POST') NOT IN ('ARTICLE') AND a_u.id IS NOT NULL
      AND (p.post_status='PUBLISHED' OR (p.post_status='SCHEDULED' AND p.scheduled_for<=NOW()) OR a_u.id=$1::bigint)
      AND (COALESCE(p.audience_scope,'EVERYONE')='EVERYONE' OR a_u.id=$1::bigint
        OR (p.audience_scope='FOLLOWERS' AND EXISTS(SELECT 1 FROM howdi_connect_follows f WHERE f.follower_user_id=$1::bigint AND f.following_user_id=a_u.id))
        OR (p.audience_scope='FRIENDS' AND EXISTS(SELECT 1 FROM howdi_connect_follows f WHERE f.follower_user_id=$1::bigint AND f.following_user_id=a_u.id) AND EXISTS(SELECT 1 FROM howdi_connect_follows f2 WHERE f2.follower_user_id=a_u.id AND f2.following_user_id=$1::bigint))
        OR (p.audience_scope='CLOSE_FRIENDS' AND EXISTS(SELECT 1 FROM howdi_connect_close_friends cf WHERE cf.user_id=a_u.id AND cf.friend_user_id=$1::bigint)))
      AND (COALESCE(p.subscribers_only,FALSE)=FALSE OR a_u.id=$1::bigint OR EXISTS(SELECT 1 FROM howdi_connect_creator_subscriptions cs WHERE cs.creator_user_id=a_u.id AND cs.subscriber_user_id=$1::bigint AND cs.status='ACTIVE' AND (cs.current_period_end IS NULL OR cs.current_period_end>NOW())))
      AND (a_u.id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'a_u.id')})) AND ${privateOkSql('a_u.id', '$1::bigint')}`;
  const AUDIENCE_OUT = { EVERYONE: 'everyone', FOLLOWERS: 'followers', FRIENDS: 'friends', CLOSE_FRIENDS: 'close_friends', ONLY_ME: 'only_me' };
  function postMedia(r) {
    let g = r.media_gallery; if (typeof g === 'string') { try { g = JSON.parse(g); } catch { g = []; } }
    const list = [];
    if (Array.isArray(g)) for (const it of g) { const u = mediaUrl(typeof it === 'object' && it ? it.url || it.data : it, 1600000); if (u) list.push({ type: /^data:video|\.mp4$/.test(u) ? 'video' : 'image', url: u }); }
    if (!list.length && r.media_data) { const u = mediaUrl(r.media_data, 1600000); if (u) list.push({ type: /^data:video|\.(mp4|webm)$/.test(u) ? 'video' : 'image', url: u }); }
    return list.slice(0, 4);
  }
  async function postDtos(rows) {
    const refs = k5aIssue ? await k5aIssue('POST', rows.map((r) => r.pkey)) : new Map();
    return rows.map((r) => {
      const a = authorDto(r, 'a_'); const code = refs.get(String(r.pkey));
      if (!a || !code) return null;
      return { public_key: code, author: a, text: text(r.content, 5000), media: postMedia(r), audience: AUDIENCE_OUT[String(r.audience_scope || 'EVERYONE')] || 'everyone',
        counts: { likes: count(r.reactions), comments: count(r.comments), shares: count(r.shares) }, allow_comments: r.allow_comments !== false,
        viewer: { liked: r.v_liked === true, saved: r.v_saved === true, mine: r.v_mine === true }, published_at: iso(r.created_at), route: `/posts/${code}` };
    }).filter(Boolean);
  }
  async function postFeed(vid, cursor, limit) {
    const off = Math.max(0, Math.min(500, Number((unseal(cursor) || {}).o) || 0));
    const rows = (await pool.query(`SELECT ${POST_SELECT} ${POST_FROM} WHERE ${POST_VISIBLE} ORDER BY p.created_at DESC, p.id DESC LIMIT $2 OFFSET $3`, [vid || 0, limit + 1, off])).rows;
    return { items: await postDtos(rows.slice(0, limit)), next_cursor: rows.length > limit ? seal({ o: off + limit }) : null };
  }
  async function postKeyByCode(code, vid) {
    if (!deps.resolveK5ARef || !/^PST-[0-9A-F]{12}$/.test(String(code))) return null;
    const r = await deps.resolveK5ARef(code, ['POST']);
    if (!r) return null;
    const row = (await pool.query(`SELECT ${POST_SELECT} ${POST_FROM} WHERE p.id=$2::bigint AND ${POST_VISIBLE}`, [vid || 0, r.entity_key])).rows[0];
    return row || null;
  }
  const PCOMMENT_SQL = `SELECT c.id::text ckey, c.content AS comment_text, c.created_at, a_u.id AS owner_id, 0 likes, (c.user_id=p.user_id) by_creator, NULL parent_code, ${authorCols('a_u.id', 'a_')}
    FROM howdi_community_comments c JOIN howdi_community_posts p ON p.id=c.post_id ${authorJoins('c.user_id', 'a_')}
    WHERE c.post_id=$2::bigint AND a_u.id IS NOT NULL AND (a_u.id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'a_u.id')}))`;
  async function createPost(req, res, v) {
    if (limited(res, `v8-post-create:${v.id}`, 20, 60 * 60 * 1000)) return;
    const body = (await getBody(req)) || {};
    const t = text(body.text, 5000);
    const aud = { everyone: 'EVERYONE', followers: 'FOLLOWERS', friends: 'FRIENDS', close_friends: 'CLOSE_FRIENDS', only_me: 'ONLY_ME' }[String(body.audience || 'everyone')];
    if (!aud) return fail(res, 400, 'VALIDATION', 'Choose who can see this post.');
    const media = Array.isArray(body.media) ? body.media.slice(0, 4) : [];
    if (!t && !media.length) return fail(res, 400, 'VALIDATION', 'Write something or add a photo.');
    const saved = [];
    try { for (const m of media) saved.push(saveMedia(m, { maxImage: 5 * 1024 * 1024, maxVideo: 20 * 1024 * 1024 })); } catch (e) { return fail(res, 400, e.code || 'MEDIA_INVALID', e.message); }
    const gallery = saved.map((m) => ({ url: m.url, type: m.type }));
    const key = (await pool.query(`INSERT INTO howdi_community_posts(user_id,content,category,visibility,post_type,post_status,audience_scope,allow_comments,media_gallery,media_type,created_at,updated_at)
      VALUES($1,$2,'GENERAL','PUBLIC','POST','PUBLISHED',$3,TRUE,$4::jsonb,$5,NOW(),NOW()) RETURNING id::text`, [v.id, t, aud, JSON.stringify(gallery), saved[0] ? saved[0].type : null])).rows[0].id;
    const rows = (await pool.query(`SELECT ${POST_SELECT} ${POST_FROM} WHERE p.id=$2::bigint`, [v.id, key])).rows;
    ok(res, { post: (await postDtos(rows))[0] || null }, 201);
  }

  // ---------------------------------------------------------------- router
  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (!p.startsWith('/api/v8/')) return false;
    let m;
    try {
      if ((m = p.match(/^\/api\/v8\/media\/([0-9a-f]{32}\.[a-z0-9]{3,4})$/)) && (req.method === 'GET' || req.method === 'HEAD')) { serveMedia(req, res, m[1]); return true; }

      if (p === '/api/v8/connect/hub' && req.method === 'GET') {
        const v = await viewer(req); const vid = v ? v.id : 0;
        if (limited(res, `v8-hub:${vid || clientIp(req)}`, 120, 60000)) return true;
        const [st, groups, channels, live, spaces, articles, vibes] = await Promise.all([
          stories(vid), socialRail(vid, 'GROUP', 4), socialRail(vid, 'CHANNEL', 4), roomRail(vid, 'LIVE', 4), roomRail(vid, 'SPACE', 4), articleRail(vid, 4),
          vibeFeed(vid, { tab: 'explore', limit: 6 }),
        ]);
        const communities = [...groups, ...channels].sort((a, b) => b.member_count - a.member_count).slice(0, 4);
        ok(res, { signed_in: Boolean(v), stories: st, rails: { communities, groups, channels, live, spaces }, articles, vibes: vibes.items });
        return true;
      }
      if (p === '/api/v8/connect/stories' && req.method === 'GET') {
        const v = await viewer(req);
        ok(res, { stories: await stories(v ? v.id : 0) });
        return true;
      }


      if (p === '/api/v8/connect/feed' && req.method === 'GET') {
        const v = await viewer(req); const vid = v ? v.id : 0;
        if (limited(res, `v8-feed:${vid || clientIp(req)}`, 120, 60000)) return true;
        const limit = Math.max(1, Math.min(20, Number(url.searchParams.get('limit')) || 8));
        ok(res, await postFeed(vid, url.searchParams.get('cursor'), limit));
        return true;
      }
      if (p === '/api/v8/posts' && req.method === 'POST') {
        const v = await viewer(req);
        if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to post.'); return true; }
        await createPost(req, res, v); return true;
      }
      if ((m = p.match(/^\/api\/v8\/posts\/(PST-[0-9A-F]{12})(?:\/([a-z-]+))?$/))) {
        const code = m[1]; const action = m[2] || '';
        const v = await viewer(req); const vid = v ? v.id : 0;
        const row = await postKeyByCode(code, vid);
        if (!row) { fail(res, 404, 'NOT_FOUND', 'This post isn’t available.'); return true; }
        if (!action && req.method === 'GET') { ok(res, { post: (await postDtos([row]))[0] }); return true; }
        if (action === 'comments' && req.method === 'GET') {
          const rows = (await pool.query(`${PCOMMENT_SQL} ORDER BY c.created_at ASC LIMIT 200`, [vid, row.pkey])).rows;
          ok(res, { allow_comments: row.allow_comments !== false, comments: (await commentDtosFor('PCOMMENT', rows, vid)) });
          return true;
        }
        if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to continue.'); return true; }
        if (limited(res, `v8-post-act:${vid}`, 120, 60000)) return true;
        if (action === 'like' && (req.method === 'POST' || req.method === 'DELETE')) {
          if (req.method === 'POST') await pool.query(`INSERT INTO howdi_community_reactions(post_id,user_id,reaction) VALUES($1,$2,'LIKE') ON CONFLICT DO NOTHING`, [row.pkey, vid]);
          else await pool.query(`DELETE FROM howdi_community_reactions WHERE post_id=$1 AND user_id=$2`, [row.pkey, vid]);
          const n = (await pool.query(`SELECT COUNT(*) n FROM howdi_community_reactions WHERE post_id=$1`, [row.pkey])).rows[0].n;
          ok(res, { liked: req.method === 'POST', count: count(n) }); return true;
        }
        if (action === 'save' && (req.method === 'POST' || req.method === 'DELETE')) {
          if (req.method === 'POST') await pool.query(`INSERT INTO howdi_connect_post_saves(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [row.pkey, vid]);
          else await pool.query(`DELETE FROM howdi_connect_post_saves WHERE post_id=$1 AND user_id=$2`, [row.pkey, vid]);
          ok(res, { saved: req.method === 'POST' }); return true;
        }
        if (action === 'share' && req.method === 'POST') {
          const body = (await getBody(req)) || {};
          const channel = ['copy', 'howdi', 'messages', 'external'].includes(String(body.channel)) ? String(body.channel).toUpperCase() : 'COPY';
          await pool.query(`INSERT INTO howdi_connect_shares(post_id,user_id,share_type) VALUES($1,$2,$3)`, [row.pkey, vid, channel]);
          ok(res, { shared: true, link: `/posts/${code}` }); return true;
        }
        if (action === 'comments' && req.method === 'POST') {
          if (row.allow_comments === false) { fail(res, 403, 'COMMENTS_OFF', 'Comments are turned off.'); return true; }
          if (limited(res, `v8-comment:${vid}`, 20, 60000)) return true;
          const body = (await getBody(req)) || {}; const t = text(body.text, 1000);
          if (!t) { fail(res, 400, 'VALIDATION', 'Write a comment first.'); return true; }
          const ck = (await pool.query(`INSERT INTO howdi_community_comments(post_id,user_id,content) VALUES($1,$2,$3) RETURNING id::text`, [row.pkey, vid, t])).rows[0].id;
          const rows = (await pool.query(`${PCOMMENT_SQL} AND c.id=$3::bigint`, [vid, row.pkey, ck])).rows;
          ok(res, { comment: (await commentDtosFor('PCOMMENT', rows, vid))[0] || null }, 201); return true;
        }
        if (action === 'report' && req.method === 'POST') {
          if (limited(res, `v8-report:${vid}`, 10, 60 * 60 * 1000)) return true;
          const body = (await getBody(req)) || {}; const reason = String(body.reason || '');
          if (!REPORT_REASONS.includes(reason)) { fail(res, 400, 'VALIDATION', 'Choose a reason.'); return true; }
          await pool.query(`INSERT INTO howdi_connect_trust_moderation_queue(reporter_user_id,target_user_id,entity_type,entity_id,reason,details,trust_weight) VALUES($1,$2,'POST',$3,$4,$5,1)`,
            [vid, Number(row.owner_id || 0) || null, row.pkey, reason, text(body.details, 1000) || '']).catch(async () => {
            await pool.query(`INSERT INTO howdi_connect_trust_moderation_queue(reporter_user_id,entity_type,entity_id,reason,details) VALUES($1,'POST',$2,$3,$4)`, [vid, row.pkey, reason, text(body.details, 1000) || '']);
          });
          ok(res, { reported: true, message: 'Thanks — our safety team will review this post. The author isn’t told who reported it.' }); return true;
        }
        if (action === '' && req.method === 'DELETE') {
          if (!row.v_mine) { fail(res, 404, 'NOT_FOUND', 'This post isn’t available.'); return true; }
          await pool.query(`UPDATE howdi_community_posts SET post_status='DELETED', updated_at=NOW() WHERE id=$1 AND user_id=$2`, [row.pkey, vid]);
          ok(res, { deleted: true }); return true;
        }
        fail(res, 405, 'METHOD_NOT_ALLOWED', 'Not supported.'); return true;
      }

      if (p === '/api/v8/stories' && req.method === 'POST') {
        const v = await viewer(req);
        if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to share a story.'); return true; }
        if (limited(res, `v8-story:${v.id}`, 30, 60 * 60 * 1000)) return true;
        const body = (await getBody(req)) || {};
        const t = text(body.text, 280);
        const aud = { everyone: 'Everyone', friends: 'Friends', close_friends: 'Close friends', only_me: 'Only me' }[String(body.audience || 'everyone')];
        if (!aud) { fail(res, 400, 'VALIDATION', 'Choose who can see your story.'); return true; }
        let media = null;
        if (body.mediaData) {
          const mm = String(body.mediaData).match(/^data:(image\/(jpeg|png|webp)|video\/(mp4|webm));base64,/i);
          if (!mm) { fail(res, 400, 'MEDIA_TYPE', 'Stories support JPG, PNG, WebP, MP4 or WebM.'); return true; }
          const isVideo = /^video/i.test(mm[1]);
          const bytes = Math.floor(String(body.mediaData).length * 3 / 4);
          if (bytes > (isVideo ? 20 : 5) * 1024 * 1024) { fail(res, 400, 'MEDIA_TOO_LARGE', isVideo ? 'Story videos can be up to 20 MB.' : 'Story images can be up to 5 MB.'); return true; }
          try { saveMedia(body.mediaData, { maxImage: 5 * 1024 * 1024, maxVideo: 20 * 1024 * 1024 }); } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message); return true; }
          media = { data: String(body.mediaData), type: isVideo ? 'video' : 'image' };
        }
        if (!t && !media) { fail(res, 400, 'VALIDATION', 'Add a photo, video or some text.'); return true; }
        await pool.query(`INSERT INTO howdi_connect_stories(user_id,content,media_data,media_type,audience,filter_name,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,NOW(),NOW()+interval '24 hours')`,
          [v.id, t, media ? media.data : null, media ? media.type : 'text', aud, ['warm', 'cool', 'mono'].includes(String(body.filterName)) ? String(body.filterName) : 'none']);
        ok(res, { created: true, audience: aud }, 201); return true;
      }
      if ((m = p.match(/^\/api\/v8\/stories\/(STY-[0-9A-F]{12})\/(view|react|reply|report)$/)) && req.method === 'POST') {
        const v = await viewer(req); const vid = v ? v.id : 0;
        const r = deps.resolveK5ARef ? await deps.resolveK5ARef(m[1], ['STORY']) : null;
        const visible = r ? (await stories(vid)).some((g) => g.items.some((it) => it.public_key === m[1])) : false;
        if (!visible) { fail(res, 404, 'NOT_FOUND', 'This story has ended.'); return true; }
        if (m[2] === 'view') {
          if (vid) await pool.query(`INSERT INTO howdi_connect_story_views(story_id,viewer_key,user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [r.entity_key, 'u:' + vid, vid]).catch(() => {});
          ok(res, { viewed: true }); return true;
        }
        if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to reply.'); return true; }
        if (limited(res, `v8-story-act:${vid}`, 60, 60000)) return true;
        const body = (await getBody(req)) || {};
        if (m[2] === 'react') {
          const reaction = ['❤️', '👏', '🔥', '✨', '😂'].includes(String(body.reaction)) ? String(body.reaction) : '❤️';
          await pool.query(`INSERT INTO howdi_connect_story_reactions(story_id,user_id,reaction) VALUES($1,$2,$3) ON CONFLICT (story_id,user_id) DO UPDATE SET reaction=EXCLUDED.reaction, updated_at=NOW()`, [r.entity_key, vid, reaction]).catch(async () => {
            await pool.query(`DELETE FROM howdi_connect_story_reactions WHERE story_id=$1 AND user_id=$2`, [r.entity_key, vid]);
            await pool.query(`INSERT INTO howdi_connect_story_reactions(story_id,user_id,reaction) VALUES($1,$2,$3)`, [r.entity_key, vid, reaction]);
          });
          ok(res, { reacted: reaction }); return true;
        }
        if (m[2] === 'report') {
          const reason = String(body.reason || '');
          if (!REPORT_REASONS.includes(reason)) { fail(res, 400, 'VALIDATION', 'Choose a reason.'); return true; }
          await pool.query(`INSERT INTO howdi_connect_trust_moderation_queue(reporter_user_id,target_user_id,entity_type,entity_id,reason,details,trust_weight) SELECT $1,s.user_id,'STORY',s.id::text,$3,$4,1 FROM howdi_connect_stories s WHERE s.id=$2`, [vid, r.entity_key, reason, text(body.details, 1000) || '']);
          ok(res, { reported: true, message: 'Thanks — our safety team will review this story. They aren’t told who reported it.' }); return true;
        }
        const t = text(body.text, 500);
        if (!t) { fail(res, 400, 'VALIDATION', 'Write a reply first.'); return true; }
        await pool.query(`INSERT INTO howdi_connect_story_replies(story_id,sender_user_id,body) VALUES($1,$2,$3)`, [r.entity_key, vid, t]);
        ok(res, { replied: true, message: 'Reply sent privately.' }); return true;
      }
      if (p === '/api/v8/vibes/categories' && req.method === 'GET') {
        const rows = (await pool.query(`SELECT name, slug FROM vibe_categories WHERE is_active=TRUE AND parent_category_id IS NULL ORDER BY sort_order, name LIMIT 30`)).rows;
        ok(res, { categories: rows.map((r) => ({ name: oneLine(r.name, 40), slug: oneLine(r.slug, 60) })).filter((c) => /^[a-z0-9-]{2,60}$/.test(c.slug)) });
        return true;
      }
      if (p === '/api/v8/vibes' && req.method === 'GET') {
        const allowed = new Set(['tab', 'category', 'cursor', 'limit']);
        for (const k of url.searchParams.keys()) if (!allowed.has(k)) { fail(res, 400, 'INVALID_PARAMS', 'Unknown parameter.'); return true; }
        const tab = String(url.searchParams.get('tab') || 'for-you');
        if (!TABS.includes(tab)) { fail(res, 400, 'INVALID_PARAMS', 'Unknown tab.'); return true; }
        const category = url.searchParams.get('category');
        if (category && !/^[a-z0-9-]{2,60}$/.test(category)) { fail(res, 400, 'INVALID_PARAMS', 'Unknown category.'); return true; }
        const limit = Math.max(1, Math.min(20, Number(url.searchParams.get('limit')) || 10));
        const v = await viewer(req); const vid = v ? v.id : 0;
        if (limited(res, `v8-vibes:${vid || clientIp(req)}`, 120, 60000)) return true;
        ok(res, { tab, ...(await vibeFeed(vid, { tab, category, cursor: url.searchParams.get('cursor'), limit })) });
        return true;
      }
      if (p === '/api/v8/vibes' && req.method === 'POST') {
        const v = await viewer(req);
        if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to post a Vibe.'); return true; }
        await createVibe(req, res, v); return true;
      }
      if ((m = p.match(/^\/api\/v8\/vibes\/(VIB-[0-9A-F]{12})(?:\/([a-z-]+))?$/))) {
        const code = m[1]; const action = m[2] || '';
        const v = await viewer(req); const vid = v ? v.id : 0;
        const row = await vibeRowByCode(code, vid);
        if (!row) { fail(res, 404, 'NOT_FOUND', 'This Vibe isn’t available.'); return true; }
        if (!action && req.method === 'GET') { ok(res, { vibe: vibeDto(row, code) }); return true; }
        if (action === 'comments' && req.method === 'GET') {
          const rows = (await pool.query(`${COMMENT_SQL} ORDER BY c.created_at ASC LIMIT 200`, [vid, row.vkey])).rows;
          ok(res, { allow_comments: row.allow_comments !== false, comments: await commentDtos(rows, vid) });
          return true;
        }
        if (action === 'share' && req.method === 'POST') {
          if (limited(res, `v8-share:${vid || clientIp(req)}`, 60, 60000)) return true;
          const body = (await getBody(req)) || {};
          const channel = ['copy', 'howdi', 'messages', 'external'].includes(String(body.channel)) ? String(body.channel) : 'copy';
          if (row.allow_share === false) { fail(res, 403, 'SHARE_OFF', 'Sharing is turned off for this Vibe.'); return true; }
          await bumpStat(row.vkey, 'shares', 1);
          ok(res, { shared: true, channel, link: `/connect/vibe/${code}` });
          return true;
        }
        if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to continue.'); return true; }
        if (limited(res, `v8-vibe-act:${vid}`, 120, 60000)) return true;
        if ((action === 'like' || action === 'save') && (req.method === 'POST' || req.method === 'DELETE')) {
          const table = action === 'like' ? 'vibe_likes' : 'vibe_saves'; const col = action === 'like' ? 'likes' : 'saves';
          let changed;
          if (req.method === 'POST') changed = (await pool.query(`INSERT INTO ${table}(vibe_id,user_id) VALUES($1::uuid,$2) ON CONFLICT DO NOTHING`, [row.vkey, String(vid)])).rowCount;
          else changed = -(await pool.query(`DELETE FROM ${table} WHERE vibe_id=$1::uuid AND user_id=$2`, [row.vkey, String(vid)])).rowCount;
          if (changed) await bumpStat(row.vkey, col, changed);
          const n = (await pool.query(`SELECT COALESCE(${col},0) n FROM vibe_stats WHERE vibe_id=$1::uuid`, [row.vkey])).rows[0];
          ok(res, { [action === 'like' ? 'liked' : 'saved']: req.method === 'POST', count: count(n && n.n) });
          return true;
        }
        if (action === 'comments' && req.method === 'POST') {
          if (row.allow_comments === false) { fail(res, 403, 'COMMENTS_OFF', 'Comments are turned off for this Vibe.'); return true; }
          if (limited(res, `v8-comment:${vid}`, 20, 60000)) return true;
          const body = (await getBody(req)) || {};
          const t = text(body.text, 1000);
          if (!t) { fail(res, 400, 'VALIDATION', 'Write a comment first.'); return true; }
          let parent = null;
          if (body.replyTo) { parent = await resolve(String(body.replyTo), 'VCOMMENT'); if (!parent) { fail(res, 400, 'VALIDATION', 'That comment is no longer available.'); return true; } }
          const ck = (await pool.query(`INSERT INTO vibe_comments(vibe_id,user_id,parent_comment_id,comment_text,status) VALUES($1::uuid,$2,$3::uuid,$4,'visible') RETURNING id::text`, [row.vkey, String(vid), parent, t])).rows[0].id;
          await bumpStat(row.vkey, 'comments', 1);
          const rows = (await pool.query(`${COMMENT_SQL} AND c.id=$3::uuid`, [vid, row.vkey, ck])).rows;
          ok(res, { comment: (await commentDtos(rows, vid))[0] || null }, 201);
          return true;
        }
        if (action === 'not-interested' && req.method === 'POST') {
          await pool.query(`INSERT INTO vibe_not_interested(user_id,vibe_id,creator_user_id,reason) VALUES($1,$2::uuid,NULL,'not_interested')`, [String(vid), row.vkey]);
          ok(res, { hidden: true });
          return true;
        }
        if (action === 'report' && req.method === 'POST') {
          if (limited(res, `v8-report:${vid}`, 10, 60 * 60 * 1000)) return true;
          const body = (await getBody(req)) || {};
          const reason = String(body.reason || '');
          if (!REPORT_REASONS.includes(reason)) { fail(res, 400, 'VALIDATION', 'Choose a reason.'); return true; }
          await pool.query(`INSERT INTO vibe_reports(vibe_id,reporter_user_id,reason,description,status) VALUES($1::uuid,$2,$3,$4,'open')`, [row.vkey, String(vid), reason, text(body.details, 1000) || null]);
          ok(res, { reported: true, message: 'Thanks — our safety team will review this Vibe. The creator isn’t told who reported it.' });
          return true;
        }
        fail(res, 405, 'METHOD_NOT_ALLOWED', 'Not supported.'); return true;
      }
      if ((m = p.match(/^\/api\/v8\/creators\/@?([a-z0-9._]{3,30})\/(follow|block)$/i)) && (req.method === 'POST' || req.method === 'DELETE')) {
        const v = await viewer(req);
        if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to continue.'); return true; }
        if (limited(res, `v8-rel:${v.id}`, 60, 60000)) return true;
        const target = await userIdByHandle(m[1]);
        if (!target || target === v.id) { fail(res, 404, 'NOT_FOUND', 'Profile not found.'); return true; }
        if (m[2] === 'follow') {
          if (req.method === 'POST') {
            const blocked = (await pool.query(`SELECT ${blockedSql('$1::bigint', '$2::bigint')} b`, [v.id, target])).rows[0].b;
            if (blocked) { fail(res, 404, 'NOT_FOUND', 'Profile not found.'); return true; }
            await pool.query(`INSERT INTO howdi_connect_follows(follower_user_id,following_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [v.id, target]);
            await pool.query(`INSERT INTO vibe_follows(follower_user_id,creator_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [String(v.id), String(target)]);
          } else {
            await pool.query(`DELETE FROM howdi_connect_follows WHERE follower_user_id=$1 AND following_user_id=$2`, [v.id, target]);
            await pool.query(`DELETE FROM vibe_follows WHERE follower_user_id=$1 AND creator_user_id=$2`, [String(v.id), String(target)]);
          }
          ok(res, { following: req.method === 'POST' });
        } else {
          if (req.method === 'POST') {
            await pool.query(`INSERT INTO howdi_connect_profile_blocks(blocker_user_id,blocked_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [v.id, target]);
            await pool.query(`DELETE FROM howdi_connect_follows WHERE (follower_user_id=$1 AND following_user_id=$2) OR (follower_user_id=$2 AND following_user_id=$1)`, [v.id, target]);
            await pool.query(`DELETE FROM vibe_follows WHERE (follower_user_id=$1 AND creator_user_id=$2) OR (follower_user_id=$2 AND creator_user_id=$1)`, [String(v.id), String(target)]);
          } else await pool.query(`DELETE FROM howdi_connect_profile_blocks WHERE blocker_user_id=$1 AND blocked_user_id=$2`, [v.id, target]);
          ok(res, { blocked: req.method === 'POST' });
        }
        return true;
      }
      return false;
    } catch (e) {
      logger.error('[V8 connect]', e && e.message);
      fail(res, 500, 'SERVER_ERROR', 'Something went wrong. Please try again.');
      return true;
    }
  }

  return { ensureSchema, handle, _internal: { issue, resolve, saveMedia, stripInternal, authorCols, authorJoins, authorDto, blockedSql, privateOkSql, viewer, limited, ok, fail, userIdByHandle } };
}

module.exports = { createConnectV8, stripInternal, CODE_RE };
