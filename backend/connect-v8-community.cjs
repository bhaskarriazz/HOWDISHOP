'use strict';
// =====================================================================================
// HOWDI V8 — COMMUNITIES (Groups, Channels), ARTICLES and NOTIFICATIONS
// Boards: 17 (communities browser, group/channel detail, admin & moderation: overview, member roles, report queue,
// moderation actions), 06 panel 4 (group/channel page), PRIOR-07 panels 5–6 (articles, communities), 07 panel 5 (article).
//
//   GET  /api/v8/communities?type=all|groups|channels&q=&topic=          browse (public + private listings)
//   POST /api/v8/communities                                              create group / channel (creator becomes OWNER): cover, rules, topic, location,
//                                                                         privacy public | private | invite (invite-only = INVITE_ONLY: members only, joined by invite link)
//   PATCH /api/v8/communities/{slug}/settings                             owner/admin: about, topic, location, rules, cover, privacy
//   GET|POST /api/v8/communities/invite/{code} · POST {slug}/invite/reset  invite-link preview · join · mods rotate the link
//   GET  /api/v8/communities/{slug}                                       detail + my membership/role + rules + counts
//   POST|DELETE /api/v8/communities/{slug}/join                           join / request / subscribe · leave / cancel
//   GET|POST /api/v8/communities/{slug}/feed                              posts inside (channels: only owner/admin/mod post)
//   POST /api/v8/communities/{slug}/feed/{CPS}/report                     report a post to the community moderators
//   GET  /api/v8/communities/{slug}/members                               members + roles (+ pending requests for mods)
//   POST /api/v8/communities/{slug}/requests/{@h}/approve|decline         mods decide join requests (applicant notified)
//   POST /api/v8/communities/{slug}/members/{@h}/role|remove|mute         owner/admin manage roles; mods remove/mute
//   GET  /api/v8/communities/{slug}/moderation                                 overview counts, report queue (mods only)
//   POST /api/v8/communities/{slug}/reports/{CRP}/resolve                 remove post · keep · warn · mute (reporter notified)
//   GET|POST /api/v8/communities/{slug}/events · POST …/events/{CEV}/rsvp events and RSVPs
//   POST /api/v8/communities/{slug}/report                                report the community to HOWDI safety
//   GET  /api/v8/articles?tab=for-you|trending|following&category=&q=     GET /api/v8/articles/{ART}
//   POST /api/v8/articles   POST|DELETE /api/v8/articles/{ART}/like|save   GET|POST …/comments   POST …/share|report
//   GET  /api/v8/notifications   POST /api/v8/notifications/read           unified V8 inbox (decisions, requests, replies)
// =====================================================================================
const crypto = require('node:crypto');

function createConnectV8Community(deps) {
  const { pool, getBody, clientIp, logger = console } = deps;
  const H = deps.helpers;
  const { issue, resolve, authorCols, authorJoins, authorDto, blockedSql, privateOkSql, viewer, limited, ok, fail, userIdByHandle, saveMedia } = H;
  const k5aIssue = deps.issueK5ARefs; const k5aResolve = deps.resolveK5ARef;
  const text = (v, max) => String(v ?? '').normalize('NFKC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max);
  const line = (v, max) => text(v, max * 2).replace(/\s+/g, ' ').slice(0, max);
  const iso = (v) => { if (!v) return null; const d = new Date(v); return Number.isFinite(d.getTime()) ? d.toISOString() : null; };
  const count = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const img = (v) => { const s = String(v || ''); return (/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 900000) || /^\/(?!\/)[^\s"'<>]{1,300}$/.test(s) || /^https?:\/\/[^\s"'<>]{1,500}$/.test(s) ? s : null; };
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const REASONS = ['spam', 'harassment', 'hate', 'violence', 'nudity', 'misinformation', 'copyright', 'self-harm', 'scam', 'other'];
  const MOD_ROLES = ['OWNER', 'ADMIN', 'MODERATOR'];

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_refs2(entity_type VARCHAR(16) NOT NULL, entity_key VARCHAR(64) NOT NULL, public_code VARCHAR(24) NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(entity_type, entity_key))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_community_meta(space_id BIGINT PRIMARY KEY, rules JSONB NOT NULL DEFAULT '[]'::jsonb, topics JSONB NOT NULL DEFAULT '[]'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_community_reports(id BIGSERIAL PRIMARY KEY, space_id BIGINT NOT NULL, message_id BIGINT, reporter_user_id BIGINT NOT NULL, reason VARCHAR(24) NOT NULL, details VARCHAR(1000),
      status VARCHAR(12) NOT NULL DEFAULT 'OPEN', action VARCHAR(16), resolved_by BIGINT, resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_community_events(id BIGSERIAL PRIMARY KEY, space_id BIGINT NOT NULL, title VARCHAR(120) NOT NULL, details VARCHAR(600), starts_at TIMESTAMPTZ NOT NULL, place VARCHAR(120), created_by BIGINT NOT NULL, cancelled BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_community_rsvps(event_id BIGINT NOT NULL, user_id BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(event_id,user_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_notifications(id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, kind VARCHAR(32) NOT NULL, title VARCHAR(160) NOT NULL, body VARCHAR(300), route VARCHAR(200), actor_user_id BIGINT, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_notifications_user_idx ON howdi_v8_notifications(user_id, created_at DESC)`);
    await pool.query(`ALTER TABLE howdi_v8_community_meta ADD COLUMN IF NOT EXISTS location VARCHAR(80)`);
    await pool.query(`ALTER TABLE howdi_v8_community_meta ADD COLUMN IF NOT EXISTS invite_code VARCHAR(16)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS howdi_v8_community_meta_invite_uq ON howdi_v8_community_meta(invite_code) WHERE invite_code IS NOT NULL`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_community_mutes(space_id BIGINT NOT NULL, user_id BIGINT NOT NULL, until TIMESTAMPTZ NOT NULL, PRIMARY KEY(space_id,user_id))`);
  }
  const PFX = { CPOST: 'CPS', CREPORT: 'CRP', CEVENT: 'CEV', NOTIF: 'NTF' };
  const CODE2 = /^(CPS|CRP|CEV|NTF)-[0-9A-F]{12}$/;
  async function issue2(type, keys) {
    const uniq = [...new Set(keys.map(String))]; const out = new Map(); if (!uniq.length) return out;
    for (let a = 0; a < 4; a++) {
      const codes = uniq.map(() => `${PFX[type]}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`);
      try { await pool.query(`INSERT INTO howdi_v8_refs2(entity_type,entity_key,public_code) SELECT $1,x.k,x.c FROM unnest($2::text[],$3::text[]) x(k,c) ON CONFLICT DO NOTHING`, [type, uniq, codes]); break; }
      catch (e) { if (!(e && e.code === '23505') || a === 3) throw e; }
    }
    for (const r of (await pool.query(`SELECT entity_key, public_code FROM howdi_v8_refs2 WHERE entity_type=$1 AND entity_key=ANY($2::text[])`, [type, uniq])).rows) out.set(String(r.entity_key), r.public_code);
    return out;
  }
  async function resolve2(code, type) {
    if (!CODE2.test(String(code)) || !String(code).startsWith(PFX[type])) return null;
    const r = (await pool.query(`SELECT entity_key FROM howdi_v8_refs2 WHERE public_code=$1 AND entity_type=$2`, [code, type])).rows[0];
    return r ? r.entity_key : null;
  }
  async function notify(userId, kind, title, body, route, actor) {
    if (!userId) return;
    try {
      // anti-spam: the same unread notice (same kind, route and actor) is refreshed instead of repeated
      const up = await pool.query(`UPDATE howdi_v8_notifications SET title=$3, body=$4, created_at=NOW() WHERE user_id=$1 AND kind=$2 AND read_at IS NULL AND route IS NOT DISTINCT FROM $5 AND actor_user_id IS NOT DISTINCT FROM $6::bigint`, [userId, kind, line(title, 160), line(body, 300) || null, route || null, actor || null]);
      if (up.rowCount) return;
      await pool.query(`INSERT INTO howdi_v8_notifications(user_id,kind,title,body,route,actor_user_id) VALUES($1,$2,$3,$4,$5,$6)`, [userId, kind, line(title, 160), line(body, 300) || null, route || null, actor || null]);
    } catch (e) { logger.error('[V8 notify]', e.message); }
  }

  // ------------------------------------------------------------ communities
  const SPACE_COLS = `sp.id AS sid, sp.slug, sp.name, sp.description, sp.category, sp.privacy, sp.space_type, sp.avatar_data, sp.cover_data, sp.member_count, sp.is_verified, sp.owner_user_id AS owner_id, sp.created_at,
      (SELECT m.status FROM howdi_connect_social_space_members m WHERE m.space_id=sp.id AND m.user_id=$1::bigint) my_status,
      (SELECT m.role FROM howdi_connect_social_space_members m WHERE m.space_id=sp.id AND m.user_id=$1::bigint) my_role,
      (SELECT COUNT(*) FROM howdi_connect_social_space_members m WHERE m.space_id=sp.id AND m.status='ACTIVE') active_members,
      (SELECT COUNT(*) FROM howdi_connect_social_space_members m WHERE m.space_id=sp.id AND m.status='PENDING') pending_members,
      (SELECT meta.rules FROM howdi_v8_community_meta meta WHERE meta.space_id=sp.id) rules,
      (SELECT meta.location FROM howdi_v8_community_meta meta WHERE meta.space_id=sp.id) location,
      (SELECT meta.invite_code FROM howdi_v8_community_meta meta WHERE meta.space_id=sp.id) invite_code,
      ${authorCols('a_u.id', 'a_')}`;
  const SPACE_FROM = `FROM howdi_connect_social_spaces sp ${authorJoins('sp.owner_user_id', 'a_')}`;
  const SPACE_VISIBLE = `COALESCE(sp.is_archived,FALSE)=FALSE AND sp.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      AND (sp.privacy IN ('PUBLIC','PRIVATE') OR EXISTS(SELECT 1 FROM howdi_connect_social_space_members m WHERE m.space_id=sp.id AND m.user_id=$1::bigint AND m.status='ACTIVE'))
      AND (sp.owner_user_id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'sp.owner_user_id')}))`;
  function spaceDto(r) {
    const role = r.my_status === 'ACTIVE' ? String(r.my_role || 'MEMBER').toUpperCase() : null;
    return {
      kind: r.space_type === 'CHANNEL' ? 'channel' : 'group', public_key: r.slug, name: line(r.name, 80), description: text(r.description, 600) || null, category: line(r.category, 40) || null,
      privacy: r.privacy === 'PRIVATE' ? 'private' : r.privacy === 'PUBLIC' ? 'public' : 'invite', image_url: img(r.avatar_data || r.cover_data), cover_url: img(r.cover_data || r.avatar_data),
      member_count: count(r.active_members), verified: r.is_verified === true, owner: authorDto(r, 'a_'),
      membership: r.my_status === 'ACTIVE' ? 'member' : r.my_status === 'PENDING' ? 'pending' : 'none', role: role ? role.toLowerCase() : null,
      is_mod: Boolean(role && MOD_ROLES.includes(role)), pending_requests: role && MOD_ROLES.includes(role) ? count(r.pending_members) : undefined,
      rules: Array.isArray(r.rules) ? r.rules.map((x) => line(x, 140)).filter(Boolean).slice(0, 10) : [],
      location: line(r.location, 80) || null,
      // the invite link is shown only to owners / admins / moderators
      invite_code: role && MOD_ROLES.includes(role) && /^[A-Z0-9]{10}$/.test(String(r.invite_code || '')) ? r.invite_code : undefined,
      created_at: iso(r.created_at), route: `/connect/communities/${r.slug}`,
    };
  }
  async function space(slug, vid) {
    if (!SLUG_RE.test(String(slug)) || String(slug).length > 80) return null;
    return (await pool.query(`SELECT ${SPACE_COLS} ${SPACE_FROM} WHERE sp.slug=$2 AND ${SPACE_VISIBLE}`, [vid || 0, slug])).rows[0] || null;
  }
  const canRead = (r) => r.privacy === 'PUBLIC' || r.my_status === 'ACTIVE';
  const isMod = (r) => r.my_status === 'ACTIVE' && MOD_ROLES.includes(String(r.my_role || '').toUpperCase());
  async function feed(r, vid) {
    const rows = (await pool.query(`SELECT msg.id::text mkey, msg.body, msg.media_data, msg.is_pinned, msg.created_at, (msg.sender_user_id=$1::bigint) mine,
        (SELECT m.role FROM howdi_connect_social_space_members m WHERE m.space_id=msg.space_id AND m.user_id=msg.sender_user_id) author_role,
        ${authorCols('a_u.id', 'a_')}
      FROM howdi_connect_social_messages msg ${authorJoins('msg.sender_user_id', 'a_')}
      WHERE msg.space_id=$2 AND msg.deleted_at IS NULL AND a_u.id IS NOT NULL AND (a_u.id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'a_u.id')}))
      ORDER BY msg.is_pinned DESC, msg.created_at DESC LIMIT 60`, [vid || 0, r.sid])).rows;
    const refs = await issue2('CPOST', rows.map((x) => x.mkey));
    return rows.map((x) => ({ public_key: refs.get(String(x.mkey)), author: authorDto(x, 'a_'), author_role: x.author_role ? String(x.author_role).toLowerCase() : null, text: text(x.body, 4000), media_url: img(x.media_data), pinned: x.is_pinned === true, mine: x.mine === true, created_at: iso(x.created_at) })).filter((x) => x.author && x.public_key);
  }
  async function members(r, vid, withPending) {
    const rows = (await pool.query(`SELECT m.role, m.status, m.joined_at, (m.user_id=$1::bigint) me,
        EXISTS(SELECT 1 FROM howdi_v8_community_mutes mu WHERE mu.space_id=m.space_id AND mu.user_id=m.user_id AND mu.until>NOW()) muted, ${authorCols('a_u.id', 'a_')}
      FROM howdi_connect_social_space_members m ${authorJoins('m.user_id', 'a_')}
      WHERE m.space_id=$2 AND (m.status='ACTIVE' OR ($3::boolean AND m.status='PENDING')) AND a_u.id IS NOT NULL
      ORDER BY CASE m.role WHEN 'OWNER' THEN 0 WHEN 'ADMIN' THEN 1 WHEN 'MODERATOR' THEN 2 ELSE 3 END, m.joined_at LIMIT 200`, [vid || 0, r.sid, Boolean(withPending)])).rows;
    return rows.map((x) => ({ person: authorDto(x, 'a_'), role: String(x.role || 'MEMBER').toLowerCase(), status: x.status === 'PENDING' ? 'pending' : 'active', me: x.me === true, muted: x.muted === true, since: iso(x.joined_at) })).filter((x) => x.person);
  }
  const inviteCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = crypto.randomBytes(10); let o = ''; for (let i = 0; i < 10; i++) o += A[b[i] % A.length]; return o; };
  async function recount(sid) {
    await pool.query(`UPDATE howdi_connect_social_spaces SET member_count=(SELECT COUNT(*) FROM howdi_connect_social_space_members WHERE space_id=$1 AND status='ACTIVE'), updated_at=NOW() WHERE id=$1`, [sid]);
  }

  // ------------------------------------------------------------ articles
  const ART_COLS = `p.id::text pkey, p.article_title, p.article_excerpt, p.article_cover_url, p.article_cover_data, p.article_read_minutes, p.article_category, p.content, p.created_at, p.allow_comments, p.topics,
      (SELECT COUNT(*) FROM howdi_community_reactions r WHERE r.post_id=p.id) likes, (SELECT COUNT(*) FROM howdi_community_comments c WHERE c.post_id=p.id) comments,
      (SELECT COUNT(*) FROM howdi_connect_post_saves s WHERE s.post_id=p.id) saves, (SELECT COUNT(*) FROM howdi_connect_shares sh WHERE sh.post_id=p.id) shares,
      ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_community_reactions r WHERE r.post_id=p.id AND r.user_id=$1::bigint)) v_liked,
      ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_connect_post_saves s WHERE s.post_id=p.id AND s.user_id=$1::bigint)) v_saved,
      ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_connect_follows f WHERE f.follower_user_id=$1::bigint AND f.following_user_id=p.user_id)) v_following,
      (p.user_id=$1::bigint) v_mine, p.user_id AS owner_id, ${authorCols('a_u.id', 'a_')}`;
  const ART_FROM = `FROM howdi_community_posts p ${authorJoins('p.user_id', 'a_')}`;
  const ART_VISIBLE = `p.post_type='ARTICLE' AND a_u.id IS NOT NULL AND (p.post_status='PUBLISHED' OR p.user_id=$1::bigint) AND COALESCE(p.post_status,'')<>'DELETED'
      AND (COALESCE(p.audience_scope,'EVERYONE')='EVERYONE' OR p.user_id=$1::bigint) AND (COALESCE(p.subscribers_only,FALSE)=FALSE OR p.user_id=$1::bigint
        OR EXISTS(SELECT 1 FROM howdi_connect_creator_subscriptions cs WHERE cs.creator_user_id=p.user_id AND cs.subscriber_user_id=$1::bigint AND cs.status='ACTIVE' AND (cs.current_period_end IS NULL OR cs.current_period_end>NOW())))
      AND (p.user_id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'a_u.id')})) AND ${privateOkSql('a_u.id', '$1::bigint')}`;
  function artDto(r, code, full) {
    const a = authorDto(r, 'a_'); if (!a || !code) return null;
    const body = text(r.content, 40000);
    return {
      public_key: code, title: line(r.article_title, 160) || 'Untitled', excerpt: line(r.article_excerpt || body, 220) || null,
      cover_url: img(r.article_cover_url) || img(r.article_cover_data), read_minutes: count(r.article_read_minutes) || Math.max(1, Math.round(body.split(/\s+/).length / 200)),
      category: line(r.article_category, 40) || null, author: a, published_at: iso(r.created_at),
      counts: { likes: count(r.likes), comments: count(r.comments), saves: count(r.saves), shares: count(r.shares) },
      viewer: { liked: r.v_liked === true, saved: r.v_saved === true, following: r.v_following === true, mine: r.v_mine === true }, allow_comments: r.allow_comments !== false,
      body: full ? body : undefined, route: `/connect/articles/${code}`,
    };
  }
  async function artList(vid, tab, category, q) {
    const params = [vid || 0]; const where = [ART_VISIBLE, `p.post_status='PUBLISHED'`];
    if (tab === 'following') { if (!vid) return { items: [], needs_sign_in: true }; where.push(`EXISTS(SELECT 1 FROM howdi_connect_follows f WHERE f.follower_user_id=$1::bigint AND f.following_user_id=p.user_id)`); }
    if (category) { params.push(category); where.push(`LOWER(p.article_category)=LOWER($${params.length})`); }
    if (q) { params.push(`%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`); where.push(`(p.article_title ILIKE $${params.length} OR p.article_excerpt ILIKE $${params.length})`); }
    const order = tab === 'trending' ? `ORDER BY ((SELECT COUNT(*) FROM howdi_community_reactions r WHERE r.post_id=p.id)*2+(SELECT COUNT(*) FROM howdi_connect_post_saves s WHERE s.post_id=p.id)*3+(SELECT COUNT(*) FROM howdi_community_comments c WHERE c.post_id=p.id)) DESC, p.created_at DESC` : `ORDER BY p.created_at DESC`;
    const rows = (await pool.query(`SELECT ${ART_COLS} ${ART_FROM} WHERE ${where.join(' AND ')} ${order} LIMIT 40`, params)).rows;
    const refs = await k5aIssue('ARTICLE', rows.map((r) => r.pkey));
    return { items: rows.map((r) => artDto(r, refs.get(String(r.pkey)), false)).filter(Boolean) };
  }
  async function artRow(code, vid) {
    if (!/^ART-[0-9A-F]{12}$/.test(String(code))) return null;
    const ref = await k5aResolve(code, ['ARTICLE']); if (!ref) return null;
    return (await pool.query(`SELECT ${ART_COLS} ${ART_FROM} WHERE p.id=$2::bigint AND ${ART_VISIBLE}`, [vid || 0, ref.entity_key])).rows[0] || null;
  }

  // ------------------------------------------------------------ router
  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (!/^\/api\/v8\/(communities|articles|notifications)(\/|$)/.test(p)) return false;
    let m;
    const v = await viewer(req); const vid = v ? v.id : 0;
    if (limited(res, `v8-com:${vid || clientIp(req)}`, 180, 60000)) return true;
    const needV = () => { if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to continue.'); return true; } return false; };

    // ---------------- notifications
    if (p === '/api/v8/notifications' && req.method === 'GET') {
      if (needV()) return true;
      const rows = (await pool.query(`SELECT id::text nkey, kind, title, body, route, read_at, created_at FROM howdi_v8_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 60`, [vid])).rows;
      const nref = await issue2('NOTIF', rows.map((r) => r.nkey));
      ok(res, { unread: rows.filter((r) => !r.read_at).length, items: rows.map((r) => ({ key: nref.get(r.nkey), kind: r.kind, title: r.title, body: r.body, route: /^\/[A-Za-z0-9/@._?=&-]{0,190}$/.test(String(r.route || '')) ? r.route : null, read: Boolean(r.read_at), created_at: iso(r.created_at) })) });
      return true;
    }
    if (p === '/api/v8/notifications/read' && req.method === 'POST') {
      if (needV()) return true;
      const b = (await getBody(req)) || {};
      if (b.key !== undefined) { // one notification (tap to open); owner-scoped so another user's key does nothing
        const nk = await resolve2(String(b.key), 'NOTIF'); if (!nk) { fail(res, 404, 'NOT_FOUND', 'Notification not found.'); return true; }
        await pool.query(`UPDATE howdi_v8_notifications SET read_at=NOW() WHERE id=$1::bigint AND user_id=$2 AND read_at IS NULL`, [nk, vid]);
      } else await pool.query(`UPDATE howdi_v8_notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL`, [vid]);
      ok(res, { read: true }); return true;
    }

    // ---------------- articles
    if (p === '/api/v8/articles' && req.method === 'GET') {
      const tab = String(url.searchParams.get('tab') || 'for-you');
      if (!['for-you', 'trending', 'following'].includes(tab)) { fail(res, 400, 'INVALID_PARAMS', 'Unknown tab.'); return true; }
      const cat = line(url.searchParams.get('category'), 40); const q = line(url.searchParams.get('q'), 60);
      ok(res, { tab, ...(await artList(vid, tab, cat, q)) }); return true;
    }
    if (p === '/api/v8/articles' && req.method === 'POST') {
      if (needV()) return true;
      if (limited(res, `v8-art-create:${vid}`, 10, 60 * 60000)) return true;
      const b = (await getBody(req)) || {};
      const title = line(b.title, 160); const body = text(b.body, 40000); const cat = line(b.category, 40) || 'General';
      const status = b.status === 'draft' ? 'DRAFT' : 'PUBLISHED';
      if (title.length < 5) { fail(res, 400, 'VALIDATION', 'Add a title (at least 5 characters).'); return true; }
      if (status === 'PUBLISHED' && body.split(/\s+/).filter(Boolean).length < 30) { fail(res, 400, 'VALIDATION', 'Write at least 30 words before publishing, or save a draft.'); return true; }
      let cover = null;
      if (b.coverData) { try { cover = saveMedia(b.coverData, { videos: false, maxImage: 4 * 1024 * 1024 }).url; } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message); return true; } }
      const words = body.split(/\s+/).filter(Boolean).length;
      const key = (await pool.query(`INSERT INTO howdi_community_posts(user_id,content,category,visibility,post_type,post_status,audience_scope,allow_comments,article_title,article_excerpt,article_cover_url,article_category,article_read_minutes,created_at,updated_at)
        VALUES($1,$2,'ARTICLE','PUBLIC','ARTICLE',$3,'EVERYONE',TRUE,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING id::text`, [vid, body, status, title, line(b.excerpt || body, 220), cover, cat, Math.max(1, Math.round(words / 200))])).rows[0].id;
      const code = (await k5aIssue('ARTICLE', [key])).get(String(key));
      ok(res, { article: { public_key: code, status: status.toLowerCase(), route: `/connect/articles/${code}` } }, 201); return true;
    }
    if ((m = p.match(/^\/api\/v8\/articles\/(ART-[0-9A-F]{12})(?:\/([a-z-]+))?$/))) {
      const code = m[1]; const action = m[2] || '';
      const r = await artRow(code, vid);
      if (!r) { fail(res, 404, 'NOT_FOUND', 'This article isn’t available.'); return true; }
      if (!action && req.method === 'GET') {
        const rel = (await pool.query(`SELECT ${ART_COLS} ${ART_FROM} WHERE ${ART_VISIBLE} AND p.post_status='PUBLISHED' AND p.id<>$2::bigint ORDER BY (p.user_id=$3::bigint) DESC, p.created_at DESC LIMIT 3`, [vid || 0, r.pkey, r.owner_id])).rows;
        const refs = await k5aIssue('ARTICLE', rel.map((x) => x.pkey));
        ok(res, { article: artDto(r, code, true), related: rel.map((x) => artDto(x, refs.get(String(x.pkey)), false)).filter(Boolean) }); return true;
      }
      if (action === 'comments' && req.method === 'GET') {
        const rows = (await pool.query(`SELECT c.id::text ckey, c.content, c.created_at, (c.user_id=p.user_id) by_author, (c.user_id=$1::bigint) mine, ${authorCols('a_u.id', 'a_')}
          FROM howdi_community_comments c JOIN howdi_community_posts p ON p.id=c.post_id ${authorJoins('c.user_id', 'a_')} WHERE c.post_id=$2 AND a_u.id IS NOT NULL AND (a_u.id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'a_u.id')})) ORDER BY c.created_at LIMIT 200`, [vid || 0, r.pkey])).rows;
        const refs = await issue('PCOMMENT', rows.map((x) => x.ckey));
        ok(res, { allow_comments: r.allow_comments !== false, comments: rows.map((x) => ({ public_key: refs.get(String(x.ckey)), text: text(x.content, 1000), author: authorDto(x, 'a_'), by_creator: x.by_author === true, mine: x.mine === true, created_at: iso(x.created_at) })).filter((x) => x.author && x.public_key) });
        return true;
      }
      if (needV()) return true;
      if ((action === 'like' || action === 'save') && ['POST', 'DELETE'].includes(req.method)) {
        const t = action === 'like' ? 'howdi_community_reactions' : 'howdi_connect_post_saves';
        if (req.method === 'POST') await pool.query(action === 'like' ? `INSERT INTO ${t}(post_id,user_id,reaction) VALUES($1,$2,'LIKE') ON CONFLICT DO NOTHING` : `INSERT INTO ${t}(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [r.pkey, vid]);
        else await pool.query(`DELETE FROM ${t} WHERE post_id=$1 AND user_id=$2`, [r.pkey, vid]);
        const n = (await pool.query(`SELECT COUNT(*) n FROM ${t} WHERE post_id=$1`, [r.pkey])).rows[0].n;
        ok(res, { [action === 'like' ? 'liked' : 'saved']: req.method === 'POST', count: count(n) }); return true;
      }
      if (action === 'comments' && req.method === 'POST') {
        if (r.allow_comments === false) { fail(res, 403, 'COMMENTS_OFF', 'Comments are off.'); return true; }
        if (limited(res, `v8-comment:${vid}`, 20, 60000)) return true;
        const b = (await getBody(req)) || {}; const t = text(b.text, 1000); if (!t) { fail(res, 400, 'VALIDATION', 'Write a comment first.'); return true; }
        const ck = (await pool.query(`INSERT INTO howdi_community_comments(post_id,user_id,content) VALUES($1,$2,$3) RETURNING id::text`, [r.pkey, vid, t])).rows[0].id;
        const ref = (await issue('PCOMMENT', [ck])).get(String(ck));
        if (Number(r.owner_id) !== vid) await notify(Number(r.owner_id), 'ARTICLE_COMMENT', `New comment on “${line(r.article_title, 60)}”`, t.slice(0, 120), `/connect/articles/${code}`, vid);
        const me = (await pool.query(`SELECT ${authorCols('a_u.id', 'a_')} FROM (SELECT $1::bigint uid) z ${authorJoins('z.uid', 'a_')}`, [vid])).rows[0];
        ok(res, { comment: { public_key: ref, text: t, author: authorDto(me, 'a_'), mine: true, by_creator: Number(r.owner_id) === vid, created_at: new Date().toISOString() } }, 201); return true;
      }
      if (action === 'share' && req.method === 'POST') { const b = (await getBody(req)) || {}; await pool.query(`INSERT INTO howdi_connect_shares(post_id,user_id,share_type) VALUES($1,$2,$3)`, [r.pkey, vid, ['copy', 'messages', 'external'].includes(b.channel) ? b.channel.toUpperCase() : 'COPY']); ok(res, { shared: true }); return true; }
      if (action === 'report' && req.method === 'POST') {
        const b = (await getBody(req)) || {}; if (!REASONS.includes(String(b.reason))) { fail(res, 400, 'VALIDATION', 'Choose a reason.'); return true; }
        await pool.query(`INSERT INTO howdi_connect_trust_moderation_queue(reporter_user_id,target_user_id,entity_type,entity_id,reason,details,trust_weight) VALUES($1,$2,'ARTICLE',$3,$4,$5,1)`, [vid, r.owner_id, r.pkey, b.reason, text(b.details, 1000) || '']);
        ok(res, { reported: true, message: 'Thanks — our safety team will review this article.' }); return true;
      }
      fail(res, 405, 'METHOD_NOT_ALLOWED', 'Not supported.'); return true;
    }

    // ---------------- communities
    if (p === '/api/v8/communities' && req.method === 'GET') {
      const type = String(url.searchParams.get('type') || 'all');
      if (!['all', 'groups', 'channels', 'mine'].includes(type)) { fail(res, 400, 'INVALID_PARAMS', 'Unknown type.'); return true; }
      const q = line(url.searchParams.get('q'), 60); const topic = line(url.searchParams.get('topic'), 40);
      const params = [vid || 0]; const where = [SPACE_VISIBLE];
      if (type === 'groups') where.push(`sp.space_type='GROUP'`); if (type === 'channels') where.push(`sp.space_type='CHANNEL'`);
      if (type === 'mine') { if (!v) { ok(res, { items: [], needs_sign_in: true }); return true; } where.push(`EXISTS(SELECT 1 FROM howdi_connect_social_space_members m WHERE m.space_id=sp.id AND m.user_id=$1::bigint AND m.status IN ('ACTIVE','PENDING'))`); }
      if (q) { params.push(`%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`); where.push(`(sp.name ILIKE $${params.length} OR sp.description ILIKE $${params.length})`); }
      if (topic) { params.push(topic); where.push(`LOWER(sp.category)=LOWER($${params.length})`); }
      const rows = (await pool.query(`SELECT ${SPACE_COLS} ${SPACE_FROM} WHERE ${where.join(' AND ')} ORDER BY sp.is_verified DESC, sp.member_count DESC, sp.created_at DESC LIMIT 60`, params)).rows;
      const topics = (await pool.query(`SELECT DISTINCT category FROM howdi_connect_social_spaces WHERE COALESCE(is_archived,FALSE)=FALSE AND privacy IN ('PUBLIC','PRIVATE') AND category IS NOT NULL ORDER BY 1 LIMIT 20`)).rows.map((r) => line(r.category, 40));
      ok(res, { type, items: rows.map(spaceDto), topics }); return true;
    }
    if (p === '/api/v8/communities' && req.method === 'POST') {
      if (needV()) return true;
      if (limited(res, `v8-com-create:${vid}`, 5, 60 * 60000)) return true;
      const b = (await getBody(req)) || {};
      const kind = b.kind === 'channel' ? 'CHANNEL' : 'GROUP'; const name = line(b.name, 80); const desc = text(b.description, 600); const cat = line(b.category, 40) || 'General';
      const privacy = b.privacy === 'private' ? 'PRIVATE' : b.privacy === 'invite' ? 'INVITE_ONLY' : 'PUBLIC';
      const location = line(b.location, 80) || null;
      let cover = null;
      if (b.coverData) { try { cover = saveMedia(b.coverData, { videos: false, maxImage: 4 * 1024 * 1024 }).url; } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message); return true; } }
      if (name.length < 3) { fail(res, 400, 'VALIDATION', 'Give it a name (at least 3 characters).'); return true; }
      if (desc.length < 10) { fail(res, 400, 'VALIDATION', 'Describe what it’s about (at least 10 characters).'); return true; }
      const rules = Array.isArray(b.rules) ? b.rules.map((x) => line(x, 140)).filter(Boolean).slice(0, 10) : [];
      let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'community';
      if ((await pool.query(`SELECT 1 FROM howdi_connect_social_spaces WHERE slug=$1`, [slug])).rows[0]) slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const sid = (await client.query(`INSERT INTO howdi_connect_social_spaces(owner_user_id,space_type,name,slug,description,category,privacy,member_count,message_count,is_verified,is_archived,cover_data,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,1,0,FALSE,FALSE,$8,NOW(),NOW()) RETURNING id`, [vid, kind, name, slug, desc, cat, privacy, cover])).rows[0].id;
        await client.query(`INSERT INTO howdi_connect_social_space_members(space_id,user_id,role,status,joined_via,joined_at,updated_at) VALUES($1,$2,'OWNER','ACTIVE','create',NOW(),NOW())`, [sid, vid]);
        await client.query(`INSERT INTO howdi_v8_community_meta(space_id,rules,location,invite_code) VALUES($1,$2::jsonb,$3,$4)`, [sid, JSON.stringify(rules), location, inviteCode()]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      const made = await space(slug, vid);
      ok(res, { community: { public_key: slug, route: `/connect/communities/${slug}`, ...(made ? { invite_code: spaceDto(made).invite_code, privacy: spaceDto(made).privacy, kind: spaceDto(made).kind } : {}) } }, 201); return true;
    }
    if ((m = p.match(/^\/api\/v8\/communities\/invite\/([A-Z0-9]{10})$/)) && (req.method === 'GET' || req.method === 'POST')) {
      if (limited(res, `v8-com-invite:${vid || clientIp(req)}`, 30, 60000)) return true;
      const row = (await pool.query(`SELECT ${SPACE_COLS} ${SPACE_FROM} JOIN howdi_v8_community_meta im ON im.space_id=sp.id
        WHERE im.invite_code=$2 AND COALESCE(sp.is_archived,FALSE)=FALSE AND (sp.owner_user_id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'sp.owner_user_id')}))`, [vid || 0, m[1]])).rows[0];
      // a wrong, rotated or blocked link all look the same
      if (!row) { fail(res, 404, 'INVITE_INVALID', 'This invite link isn’t valid any more. Ask for a new one.'); return true; }
      const dto = spaceDto(row);
      if (req.method === 'GET') { ok(res, { invite: { name: dto.name, kind: dto.kind, privacy: dto.privacy, description: dto.description, cover_url: dto.cover_url, member_count: dto.member_count, owner: dto.owner, membership: dto.membership, public_key: dto.public_key } }); return true; }
      if (needV()) return true;
      // an invite from the community is pre-approved: private and invite-only communities join directly
      if (row.my_status !== 'ACTIVE') {
        await pool.query(`INSERT INTO howdi_connect_social_space_members(space_id,user_id,role,status,joined_via,joined_at,updated_at) VALUES($1,$2,'MEMBER','ACTIVE','invite',NOW(),NOW())
          ON CONFLICT(space_id,user_id) DO UPDATE SET status='ACTIVE', joined_via='invite', updated_at=NOW()`, [row.sid, vid]);
        await recount(row.sid);
        await notify(Number(row.owner_id), 'COMMUNITY_JOINED', `Someone joined ${line(row.name, 60)} with your invite link`, 'See who’s new in Members.', `/connect/communities/${row.slug}?tab=members`, vid);
      }
      ok(res, { membership: 'member', public_key: row.slug, message: `You joined ${line(row.name, 60)}.` }); return true;
    }
    if (!(m = p.match(/^\/api\/v8\/communities\/([a-z0-9-]{2,80})(?:\/(.+))?$/))) { fail(res, 404, 'NOT_FOUND', 'Not found.'); return true; }
    const r = await space(m[1], vid);
    if (!r) { fail(res, 404, 'NOT_FOUND', 'This community isn’t available.'); return true; }
    const sub = m[2] || '';
    const mod = isMod(r); const role = String(r.my_role || '').toUpperCase();
    if (!sub && req.method === 'GET') {
      const ev = (await pool.query(`SELECT COUNT(*) n FROM howdi_v8_community_events WHERE space_id=$1 AND starts_at>NOW() AND NOT cancelled`, [r.sid])).rows[0].n;
      ok(res, { community: { ...spaceDto(r), upcoming_events: count(ev), can_post: r.my_status === 'ACTIVE' && (r.space_type !== 'CHANNEL' || mod), can_read: canRead(r) } }); return true;
    }
    if (sub === 'settings' && req.method === 'PATCH') {
      if (needV()) return true;
      if (!['OWNER', 'ADMIN'].includes(role) || r.my_status !== 'ACTIVE') { fail(res, 403, 'FORBIDDEN', 'Only the owner or an admin can change these settings.'); return true; }
      const b = (await getBody(req)) || {};
      const desc = b.description !== undefined ? text(b.description, 600) : null;
      if (desc !== null && desc.length < 10) { fail(res, 400, 'VALIDATION', 'Describe what it’s about (at least 10 characters).'); return true; }
      let cover; // undefined = unchanged, null = removed
      if (b.removeCover === true) cover = null;
      else if (b.coverData) { try { cover = saveMedia(b.coverData, { videos: false, maxImage: 4 * 1024 * 1024 }).url; } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message); return true; } }
      const privacy = b.privacy === undefined ? null : b.privacy === 'private' ? 'PRIVATE' : b.privacy === 'invite' ? 'INVITE_ONLY' : b.privacy === 'public' ? 'PUBLIC' : 'X';
      if (privacy === 'X') { fail(res, 400, 'VALIDATION', 'Choose public, private or invite only.'); return true; }
      if (privacy && role !== 'OWNER') { fail(res, 403, 'FORBIDDEN', 'Only the owner can change privacy.'); return true; }
      const rules = Array.isArray(b.rules) ? b.rules.map((x) => line(x, 140)).filter(Boolean).slice(0, 10) : null;
      await pool.query(`UPDATE howdi_connect_social_spaces SET description=COALESCE($2,description), category=COALESCE($3,category), privacy=COALESCE($4,privacy),
        cover_data=CASE WHEN $5::boolean THEN $6 ELSE cover_data END, updated_at=NOW() WHERE id=$1`,
        [r.sid, desc, b.category !== undefined ? (line(b.category, 40) || null) : null, privacy, cover !== undefined, cover === undefined ? null : cover]);
      await pool.query(`INSERT INTO howdi_v8_community_meta(space_id,rules,location) VALUES($1,COALESCE($2::jsonb,'[]'::jsonb),$3) ON CONFLICT(space_id) DO UPDATE SET
        rules=COALESCE($2::jsonb,howdi_v8_community_meta.rules), location=CASE WHEN $4::boolean THEN $3 ELSE howdi_v8_community_meta.location END, updated_at=NOW()`,
        [r.sid, rules ? JSON.stringify(rules) : null, b.location !== undefined ? (line(b.location, 80) || null) : null, b.location !== undefined]);
      ok(res, { community: spaceDto(await space(r.slug, vid)) }); return true;
    }
    if (sub === 'invite/reset' && req.method === 'POST') {
      if (needV()) return true;
      if (!mod) { fail(res, 403, 'FORBIDDEN', 'Only moderators can reset the invite link.'); return true; }
      const code = inviteCode();
      await pool.query(`INSERT INTO howdi_v8_community_meta(space_id,invite_code) VALUES($1,$2) ON CONFLICT(space_id) DO UPDATE SET invite_code=EXCLUDED.invite_code, updated_at=NOW()`, [r.sid, code]);
      ok(res, { invite_code: code, message: 'New invite link created. The old link no longer works.' }); return true;
    }
    if (sub === 'join') {
      if (needV()) return true;
      if (req.method === 'POST') {
        if (r.my_status === 'ACTIVE') { ok(res, { membership: 'member' }); return true; }
        if (r.my_status === 'PENDING') { ok(res, { membership: 'pending' }); return true; }
        const pending = r.privacy === 'PRIVATE';
        await pool.query(`INSERT INTO howdi_connect_social_space_members(space_id,user_id,role,status,joined_via,joined_at,updated_at) VALUES($1,$2,'MEMBER',$3,$4,NOW(),NOW())
          ON CONFLICT(space_id,user_id) DO UPDATE SET status=EXCLUDED.status, role='MEMBER', updated_at=NOW()`, [r.sid, vid, pending ? 'PENDING' : 'ACTIVE', pending ? 'request' : 'join']);
        if (pending) {
          const mods = (await pool.query(`SELECT user_id FROM howdi_connect_social_space_members WHERE space_id=$1 AND status='ACTIVE' AND role IN ('OWNER','ADMIN','MODERATOR')`, [r.sid])).rows;
          const who = (await pool.query(`SELECT ${authorCols('a_u.id', 'a_')} FROM (SELECT $1::bigint uid) z ${authorJoins('z.uid', 'a_')}`, [vid])).rows[0];
          for (const x of mods) await notify(Number(x.user_id), 'COMMUNITY_REQUEST', `@${who.a_a_handle || 'someone'} asked to join ${line(r.name, 60)}`, 'Review the request in Members.', `/connect/communities/${r.slug}?tab=members`, vid);
        } else await recount(r.sid);
        ok(res, { membership: pending ? 'pending' : 'member', message: pending ? 'Request sent. You’ll be notified when a moderator decides.' : r.space_type === 'CHANNEL' ? `Subscribed to ${line(r.name, 60)}.` : `You joined ${line(r.name, 60)}.` }); return true;
      }
      if (req.method === 'DELETE') {
        if (role === 'OWNER') { fail(res, 409, 'OWNER_CANNOT_LEAVE', 'Owners can’t leave. Transfer ownership first.'); return true; }
        await pool.query(`DELETE FROM howdi_connect_social_space_members WHERE space_id=$1 AND user_id=$2`, [r.sid, vid]); await recount(r.sid);
        ok(res, { membership: 'none' }); return true;
      }
    }
    if (sub === 'report' && req.method === 'POST') {
      if (needV()) return true;
      const b = (await getBody(req)) || {}; if (!REASONS.includes(String(b.reason))) { fail(res, 400, 'VALIDATION', 'Choose a reason.'); return true; }
      await pool.query(`INSERT INTO howdi_connect_trust_moderation_queue(reporter_user_id,target_user_id,entity_type,entity_id,reason,details,trust_weight) VALUES($1,$2,'COMMUNITY',$3,$4,$5,1)`, [vid, r.owner_id, String(r.sid), b.reason, text(b.details, 1000) || '']);
      ok(res, { reported: true, message: 'Thanks — HOWDI safety will review this community.' }); return true;
    }
    if (sub === 'feed' && req.method === 'GET') {
      if (!canRead(r)) { ok(res, { locked: true, items: [] }); return true; }
      ok(res, { items: await feed(r, vid) }); return true;
    }
    if (sub === 'feed' && req.method === 'POST') {
      if (needV()) return true;
      if (r.my_status !== 'ACTIVE') { fail(res, 403, 'MEMBERS_ONLY', 'Join to post here.'); return true; }
      if (r.space_type === 'CHANNEL' && !mod) { fail(res, 403, 'CHANNEL_READ_ONLY', 'Only channel admins can post. You can react and comment.'); return true; }
      const muted = (await pool.query(`SELECT until FROM howdi_v8_community_mutes WHERE space_id=$1 AND user_id=$2 AND until>NOW()`, [r.sid, vid])).rows[0];
      if (muted) { fail(res, 403, 'MUTED', 'A moderator muted you here for a while.'); return true; }
      if (limited(res, `v8-com-post:${vid}`, 20, 60 * 60000)) return true;
      const b = (await getBody(req)) || {}; const t = text(b.text, 4000);
      let media = null; if (b.mediaData) { try { media = saveMedia(b.mediaData, { videos: false }).url; } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message); return true; } }
      if (!t && !media) { fail(res, 400, 'VALIDATION', 'Write something first.'); return true; }
      await pool.query(`INSERT INTO howdi_connect_social_messages(space_id,sender_user_id,message_type,body,media_data,is_pinned,created_at) VALUES($1,$2,'POST',$3,$4,FALSE,NOW())`, [r.sid, vid, t, media]);
      await pool.query(`UPDATE howdi_connect_social_spaces SET message_count=COALESCE(message_count,0)+1 WHERE id=$1`, [r.sid]);
      ok(res, { posted: true }, 201); return true;
    }
    if ((m = sub.match(/^feed\/(CPS-[0-9A-F]{12})\/(report|pin|delete)$/)) && req.method === 'POST') {
      if (needV()) return true;
      const mk = await resolve2(m[1], 'CPOST');
      const msg = mk ? (await pool.query(`SELECT id, sender_user_id FROM howdi_connect_social_messages WHERE id=$1 AND space_id=$2 AND deleted_at IS NULL`, [mk, r.sid])).rows[0] : null;
      if (!msg || !canRead(r)) { fail(res, 404, 'NOT_FOUND', 'That post isn’t available.'); return true; }
      if (m[2] === 'report') {
        const b = (await getBody(req)) || {}; if (!REASONS.includes(String(b.reason))) { fail(res, 400, 'VALIDATION', 'Choose a reason.'); return true; }
        await pool.query(`INSERT INTO howdi_v8_community_reports(space_id,message_id,reporter_user_id,reason,details) VALUES($1,$2,$3,$4,$5)`, [r.sid, msg.id, vid, b.reason, text(b.details, 1000) || null]);
        const mods = (await pool.query(`SELECT user_id FROM howdi_connect_social_space_members WHERE space_id=$1 AND status='ACTIVE' AND role IN ('OWNER','ADMIN','MODERATOR')`, [r.sid])).rows;
        for (const x of mods) await notify(Number(x.user_id), 'COMMUNITY_REPORT', `New report in ${line(r.name, 60)}`, `Reason: ${b.reason}`, `/connect/communities/${r.slug}?tab=admin`, null);
        ok(res, { reported: true, message: 'Thanks — the moderators will review this post.' }); return true;
      }
      if (m[2] === 'pin') { if (!mod) { fail(res, 403, 'MODS_ONLY', 'Only moderators can pin.'); return true; } await pool.query(`UPDATE howdi_connect_social_messages SET is_pinned=NOT is_pinned WHERE id=$1`, [msg.id]); ok(res, { toggled: true }); return true; }
      if (m[2] === 'delete') {
        if (!(mod || Number(msg.sender_user_id) === vid)) { fail(res, 403, 'FORBIDDEN', 'You can’t delete this post.'); return true; }
        await pool.query(`UPDATE howdi_connect_social_messages SET deleted_at=NOW() WHERE id=$1`, [msg.id]); ok(res, { deleted: true }); return true;
      }
    }
    if (sub === 'members' && req.method === 'GET') {
      if (!canRead(r)) { ok(res, { locked: true, items: [], pending: [] }); return true; }
      const all = await members(r, vid, mod);
      ok(res, { items: all.filter((x) => x.status === 'active'), pending: mod ? all.filter((x) => x.status === 'pending') : undefined }); return true;
    }
    if ((m = sub.match(/^requests\/@?([a-z0-9._]{3,30})\/(approve|decline)$/)) && req.method === 'POST') {
      if (needV()) return true;
      if (!mod) { fail(res, 403, 'MODS_ONLY', 'Only moderators can review requests.'); return true; }
      const target = await userIdByHandle(m[1]);
      const row = target ? (await pool.query(`SELECT status FROM howdi_connect_social_space_members WHERE space_id=$1 AND user_id=$2`, [r.sid, target])).rows[0] : null;
      if (!row || row.status !== 'PENDING') { fail(res, 404, 'NOT_FOUND', 'That request is no longer pending.'); return true; }
      if (m[2] === 'approve') {
        await pool.query(`UPDATE howdi_connect_social_space_members SET status='ACTIVE', joined_at=NOW(), updated_at=NOW() WHERE space_id=$1 AND user_id=$2`, [r.sid, target]); await recount(r.sid);
        await notify(target, 'COMMUNITY_APPROVED', `You’re in! Welcome to ${line(r.name, 60)}`, 'Your request to join was approved.', `/connect/communities/${r.slug}`, vid);
      } else {
        await pool.query(`DELETE FROM howdi_connect_social_space_members WHERE space_id=$1 AND user_id=$2`, [r.sid, target]);
        await notify(target, 'COMMUNITY_DECLINED', `Your request to join ${line(r.name, 60)} wasn’t approved`, 'You can ask again later or explore other communities.', `/connect/communities`, vid);
      }
      ok(res, { decided: m[2] }); return true;
    }
    if ((m = sub.match(/^members\/@?([a-z0-9._]{3,30})\/(role|remove|mute)$/)) && req.method === 'POST') {
      if (needV()) return true;
      if (!mod) { fail(res, 403, 'MODS_ONLY', 'Only moderators can do that.'); return true; }
      const target = await userIdByHandle(m[1]);
      const row = target ? (await pool.query(`SELECT role, status FROM howdi_connect_social_space_members WHERE space_id=$1 AND user_id=$2`, [r.sid, target])).rows[0] : null;
      if (!row || row.status !== 'ACTIVE' || target === vid) { fail(res, 404, 'NOT_FOUND', 'That member isn’t here.'); return true; }
      const rank = { OWNER: 0, ADMIN: 1, MODERATOR: 2, MEMBER: 3 };
      if (rank[String(row.role).toUpperCase()] <= rank[role]) { fail(res, 403, 'FORBIDDEN', 'You can only manage members below your role.'); return true; }
      const b = (await getBody(req)) || {};
      if (m[2] === 'role') {
        if (!['OWNER', 'ADMIN'].includes(role)) { fail(res, 403, 'FORBIDDEN', 'Only owners and admins change roles.'); return true; }
        const nr = { moderator: 'MODERATOR', member: 'MEMBER', admin: 'ADMIN' }[String(b.role)];
        if (!nr || (nr === 'ADMIN' && role !== 'OWNER')) { fail(res, 400, 'VALIDATION', 'Choose a valid role.'); return true; }
        await pool.query(`UPDATE howdi_connect_social_space_members SET role=$3, updated_at=NOW() WHERE space_id=$1 AND user_id=$2`, [r.sid, target, nr]);
        await notify(target, 'COMMUNITY_ROLE', `You’re now ${nr.toLowerCase()} in ${line(r.name, 60)}`, null, `/connect/communities/${r.slug}`, vid);
        ok(res, { role: nr.toLowerCase() }); return true;
      }
      if (m[2] === 'remove') {
        await pool.query(`DELETE FROM howdi_connect_social_space_members WHERE space_id=$1 AND user_id=$2`, [r.sid, target]); await recount(r.sid);
        await notify(target, 'COMMUNITY_REMOVED', `You were removed from ${line(r.name, 60)}`, 'A moderator removed you for breaking the community rules.', `/connect/communities`, null);
        ok(res, { removed: true }); return true;
      }
      if (m[2] === 'mute') {
        const hours = [1, 24, 168].includes(Number(b.hours)) ? Number(b.hours) : 24;
        await pool.query(`INSERT INTO howdi_v8_community_mutes(space_id,user_id,until) VALUES($1,$2,NOW()+($3||' hours')::interval) ON CONFLICT(space_id,user_id) DO UPDATE SET until=EXCLUDED.until`, [r.sid, target, String(hours)]);
        await notify(target, 'COMMUNITY_MUTED', `You’re muted in ${line(r.name, 60)} for ${hours === 168 ? '7 days' : `${hours} h`}`, 'You can still read posts.', `/connect/communities/${r.slug}`, null);
        ok(res, { muted_hours: hours }); return true;
      }
    }
    if (sub === 'moderation' && req.method === 'GET') {
      if (!v || !mod) { fail(res, 403, 'MODS_ONLY', 'Only moderators can see this.'); return true; }
      const reps = (await pool.query(`SELECT cr.id::text rkey, cr.reason, cr.details, cr.created_at, msg.body, ${authorCols('a_u.id', 'a_')}
        FROM howdi_v8_community_reports cr LEFT JOIN howdi_connect_social_messages msg ON msg.id=cr.message_id ${authorJoins('msg.sender_user_id', 'a_')}
        WHERE cr.space_id=$1 AND cr.status='OPEN' ORDER BY cr.created_at DESC LIMIT 50`, [r.sid])).rows;
      const refs = await issue2('CREPORT', reps.map((x) => x.rkey));
      const counts = (await pool.query(`SELECT (SELECT COUNT(*) FROM howdi_connect_social_space_members WHERE space_id=$1 AND status='ACTIVE') members,
        (SELECT COUNT(*) FROM howdi_connect_social_space_members WHERE space_id=$1 AND status='PENDING') pending,
        (SELECT COUNT(*) FROM howdi_v8_community_reports WHERE space_id=$1 AND status='OPEN') reports,
        (SELECT COUNT(*) FROM howdi_connect_social_space_members WHERE space_id=$1 AND status='ACTIVE' AND role IN ('OWNER','ADMIN','MODERATOR')) mods`, [r.sid])).rows[0];
      ok(res, { counts: { members: count(counts.members), pending: count(counts.pending), reports: count(counts.reports), mods: count(counts.mods) },
        reports: reps.map((x) => ({ public_key: refs.get(String(x.rkey)), reason: x.reason, details: text(x.details, 300) || null, created_at: iso(x.created_at), post_text: text(x.body, 280) || null, post_author: x.a_a_handle ? authorDto(x, 'a_') : null })) });
      return true;
    }
    if ((m = sub.match(/^reports\/(CRP-[0-9A-F]{12})\/resolve$/)) && req.method === 'POST') {
      if (needV()) return true;
      if (!mod) { fail(res, 403, 'MODS_ONLY', 'Only moderators can do that.'); return true; }
      const key = await resolve2(m[1], 'CREPORT');
      const rep = key ? (await pool.query(`SELECT * FROM howdi_v8_community_reports WHERE id=$1 AND space_id=$2 AND status='OPEN'`, [key, r.sid])).rows[0] : null;
      if (!rep) { fail(res, 404, 'NOT_FOUND', 'That report is already resolved.'); return true; }
      const b = (await getBody(req)) || {}; const action = ['remove', 'keep', 'warn', 'mute'].includes(b.action) ? b.action : null;
      if (!action) { fail(res, 400, 'VALIDATION', 'Choose an action.'); return true; }
      const msg = rep.message_id ? (await pool.query(`SELECT id, sender_user_id FROM howdi_connect_social_messages WHERE id=$1`, [rep.message_id])).rows[0] : null;
      if (action === 'remove' && msg) await pool.query(`UPDATE howdi_connect_social_messages SET deleted_at=NOW() WHERE id=$1`, [msg.id]);
      if (action === 'mute' && msg) await pool.query(`INSERT INTO howdi_v8_community_mutes(space_id,user_id,until) VALUES($1,$2,NOW()+interval '24 hours') ON CONFLICT(space_id,user_id) DO UPDATE SET until=EXCLUDED.until`, [r.sid, msg.sender_user_id]);
      if ((action === 'warn' || action === 'remove' || action === 'mute') && msg) await notify(Number(msg.sender_user_id), 'COMMUNITY_WARNING', action === 'remove' ? `Your post in ${line(r.name, 60)} was removed` : action === 'mute' ? `You’re muted in ${line(r.name, 60)} for 24 h` : `A moderator warned you in ${line(r.name, 60)}`, 'Please follow the community rules.', `/connect/communities/${r.slug}`, null);
      await pool.query(`UPDATE howdi_v8_community_reports SET status='RESOLVED', action=$2, resolved_by=$3, resolved_at=NOW() WHERE id=$1`, [rep.id, action, vid]);
      await notify(Number(rep.reporter_user_id), 'REPORT_UPDATE', `Update on your report in ${line(r.name, 60)}`, action === 'keep' ? 'Moderators reviewed it and found no rule was broken.' : 'Moderators reviewed it and took action. Thanks for helping.', `/connect/communities/${r.slug}`, null);
      ok(res, { resolved: action }); return true;
    }
    if (sub === 'events' && req.method === 'GET') {
      if (!canRead(r)) { ok(res, { locked: true, items: [] }); return true; }
      const rows = (await pool.query(`SELECT e.id::text ekey, e.title, e.details, e.starts_at, e.place, (SELECT COUNT(*) FROM howdi_v8_community_rsvps x WHERE x.event_id=e.id) going,
        ($2::bigint>0 AND EXISTS(SELECT 1 FROM howdi_v8_community_rsvps x WHERE x.event_id=e.id AND x.user_id=$2::bigint)) me FROM howdi_v8_community_events e WHERE e.space_id=$1 AND NOT e.cancelled AND e.starts_at>NOW()-interval '3 hours' ORDER BY e.starts_at LIMIT 20`, [r.sid, vid || 0])).rows;
      const refs = await issue2('CEVENT', rows.map((x) => x.ekey));
      ok(res, { items: rows.map((x) => ({ public_key: refs.get(String(x.ekey)), title: line(x.title, 120), details: text(x.details, 600) || null, starts_at: iso(x.starts_at), place: line(x.place, 120) || null, going: count(x.going), rsvp: x.me === true })), can_create: mod }); return true;
    }
    if (sub === 'events' && req.method === 'POST') {
      if (needV()) return true; if (!mod) { fail(res, 403, 'MODS_ONLY', 'Only moderators create events.'); return true; }
      const b = (await getBody(req)) || {}; const title = line(b.title, 120); const at = new Date(b.startsAt);
      if (title.length < 3 || !Number.isFinite(at.getTime()) || at.getTime() < Date.now()) { fail(res, 400, 'VALIDATION', 'Add a title and a future date and time.'); return true; }
      await pool.query(`INSERT INTO howdi_v8_community_events(space_id,title,details,starts_at,place,created_by) VALUES($1,$2,$3,$4,$5,$6)`, [r.sid, title, text(b.details, 600) || null, at, line(b.place, 120) || 'Online', vid]);
      ok(res, { created: true }, 201); return true;
    }
    if ((m = sub.match(/^events\/(CEV-[0-9A-F]{12})\/rsvp$/)) && req.method === 'POST') {
      if (needV()) return true; if (r.my_status !== 'ACTIVE') { fail(res, 403, 'MEMBERS_ONLY', 'Join to RSVP.'); return true; }
      const ek = await resolve2(m[1], 'CEVENT'); if (!ek) { fail(res, 404, 'NOT_FOUND', 'Event not found.'); return true; }
      const had = (await pool.query(`DELETE FROM howdi_v8_community_rsvps WHERE event_id=$1 AND user_id=$2`, [ek, vid])).rowCount;
      if (!had) await pool.query(`INSERT INTO howdi_v8_community_rsvps(event_id,user_id) VALUES($1,$2)`, [ek, vid]);
      ok(res, { rsvp: !had }); return true;
    }
    fail(res, 404, 'NOT_FOUND', 'Not found.'); return true;
  }
  return { ensureSchema, handle, _internal: { notify } };
}
module.exports = { createConnectV8Community };
