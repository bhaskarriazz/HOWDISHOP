'use strict';
// =====================================================================================
// HOWDI K5B — GLOBAL SEARCH, PART 1 (search foundation + public DTO contract only)
//
//   GET /api/search?q=&pillar=&types=&limit=
//
// Scope (approved Part 1 boundary): four result types — person (Connect), product (Shop), worker (Works),
// course (Learn). No autocomplete, cursor, typo correction, recent/trending, location filtering, posts,
// communities, Vibes or articles. No UI. No legacy endpoint is changed or reused (in particular the legacy
// /api/users/search route is NOT used by this module).
//
// Rules enforced here:
//   - The viewer comes ONLY from the Bearer session. Guests get public results. Any actor/id-looking query
//     parameter (userId, viewerId, id, …) is rejected with a safe 400 — it is never read.
//   - Strict parameter allow-list: q, pillar, types, limit. Unknown or duplicated parameters → 400.
//   - q is 2–80 characters after whitespace normalisation; control characters are rejected. LIKE
//     metacharacters (%, _ and the escape character) are escaped, and every term is a bound parameter:
//     all SQL below is static text.
//   - Every result is an explicit allow-list DTO: { type, pillar, title, subtitle, image, badges, route } —
//     nothing else. Routes carry only public keys: @public_username, the Works worker_code, and K5A
//     howdi_public_refs codes (PRD-/CRS-) for products and courses. Codes are issued only for rows that passed
//     every SQL and JS visibility check for this viewer. No numeric id, UUID, reversible user reference,
//     email, phone, address, pincode, coordinate, internal role/status or token is ever copied out.
//   - Visibility: public, active, published, non-deleted, non-suspended, and not blocked in either direction.
//   - Fixed result caps (no cursor, no pagination). Cache-Control: no-store. Generic errors. Rate limited.
//   - The request is dispatched before the server's request logger, so search terms are never logged.
// =====================================================================================
const K5A = require('./connect-home-k5a.cjs');
const { stripInternalKeys, mediaUrl, isPublicUsername, isPublicWorkerCode, PUBLIC_CODE_RE } = K5A;

const SEARCH_PATH = '/api/search';
const TYPES = Object.freeze(['person', 'product', 'worker', 'course']);
const PILLARS = Object.freeze(['all', 'connect', 'shop', 'works', 'learn']);
const TYPE_PILLAR = Object.freeze({ person: 'connect', product: 'shop', worker: 'works', course: 'learn' });
const ALLOWED_PARAMS = Object.freeze(['q', 'pillar', 'types', 'limit']);
const LIMITS = Object.freeze({ DEFAULT: 5, MAX: 10 });          // per type; a response therefore never exceeds 40 results
const Q = Object.freeze({ MIN: 2, MAX: 80, MAX_TERMS: 6 });
const RATE = Object.freeze({ GUEST: 60, USER: 120, WINDOW_MS: 60000 });
const DTO_KEYS = Object.freeze(['type', 'pillar', 'title', 'subtitle', 'image', 'badges', 'route']);
const BADGES = Object.freeze(['creator', 'professional', 'following', 'verified', 'on_sale', 'out_of_stock', 'free']);
// An actor or identifier smuggled in through the query string is refused outright (never stripped and ignored).
const ACTOR_PARAM_RE = /(^|_)(id|ids|uuid)$|Ids?$|^(user|viewer|actor|account|master|howdi|owner|creator|worker|vendor|customer|session|token)/i;

function oneLine(value, max) { return String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function money(value) { if (value === null || value === undefined || value === '') return null; const n = Number(value); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; }
function inr(n) { return n === null ? null : '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function firstImage(list) {
  let arr = list;
  if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch { arr = [arr]; } }
  if (!Array.isArray(arr)) return null;
  for (const item of arr) { const u = mediaUrl(typeof item === 'object' && item ? item.url : item); if (u) return u; }
  return null;
}
function escapeLike(term) { return term.replace(/[\\%_]/g, (m) => '\\' + m); }

// -------------------------------------------------------------------- parameter parsing (pure)
function parseSearchQuery(searchParams) {
  const seen = new Set();
  for (const key of searchParams.keys()) {
    if (ACTOR_PARAM_RE.test(key) || !ALLOWED_PARAMS.includes(key)) return { error: 'Unsupported search parameter.' };
    if (seen.has(key)) return { error: 'Duplicate search parameter.' };
    seen.add(key);
  }
  const rawQ = searchParams.get('q');
  if (rawQ === null) return { error: 'q is required.' };
  if (/[\u0000-\u001f\u007f]/.test(rawQ)) return { error: 'q contains unsupported characters.' };
  const q = rawQ.normalize('NFKC').replace(/\s+/g, ' ').trim();
  const qLen = [...q].length;
  if (qLen < Q.MIN || qLen > Q.MAX) return { error: `q must be ${Q.MIN}–${Q.MAX} characters.` };

  let pillar = 'all';
  const rawPillar = searchParams.get('pillar');
  if (rawPillar !== null) { if (!PILLARS.includes(rawPillar)) return { error: 'Unsupported pillar.' }; pillar = rawPillar; }

  let types = [...TYPES];
  const rawTypes = searchParams.get('types');
  if (rawTypes !== null) {
    const list = rawTypes.split(',');
    if (!list.length || list.length > TYPES.length || list.some((t) => !TYPES.includes(t)) || new Set(list).size !== list.length) return { error: 'Unsupported types.' };
    types = TYPES.filter((t) => list.includes(t));                 // canonical order
  }
  if (pillar !== 'all') {
    types = types.filter((t) => TYPE_PILLAR[t] === pillar);
    if (!types.length) return { error: 'types do not belong to the selected pillar.' };
  }

  let limit = LIMITS.DEFAULT;
  const rawLimit = searchParams.get('limit');
  if (rawLimit !== null) {
    if (!/^\d{1,2}$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > LIMITS.MAX) return { error: `limit must be between 1 and ${LIMITS.MAX}.` };
    limit = Number(rawLimit);
  }
  const lower = q.toLowerCase();
  const terms = [...new Set(lower.split(' ').filter(Boolean))].slice(0, Q.MAX_TERMS);
  return {
    query: { q, pillar, types, limit },
    sql: { patterns: terms.map((t) => `%${escapeLike(t)}%`), exact: lower, prefix: `${escapeLike(lower)}%` },
  };
}

// -------------------------------------------------------------------- DTO (explicit allow-list)
function searchDto({ type, title, subtitle, image, badges, route }) {
  const dto = {
    type, pillar: TYPE_PILLAR[type],
    title: oneLine(title, 120),
    subtitle: oneLine(subtitle, 160) || null,
    image: mediaUrl(image) || null,
    badges: [...new Set((badges || []).filter((b) => BADGES.includes(b)))],
    route,
  };
  return dto.title && typeof route === 'string' && route ? dto : null;
}

function createSearchK5B(deps) {
  const { pool, getSessionUserFromRequest, sendJSON, k5ePrivateProfileOkSql, issuePublicRefs, rateLimit, getRequestIp, logger = console } = deps;
  if (typeof issuePublicRefs !== 'function') throw new Error('K5B search needs the K5A howdi_public_refs issuer');

  // ---------------- SQL fragments (static; $1 is always the viewer id, 0 for guests)
  // $2 text[] = escaped %term% patterns (every term must match), $3 = lower(q), $4 = escaped lower(q)% prefix, $5 = fetch cap.
  const ACTIVE_USER = (u) => `(COALESCE(${u}.is_active,TRUE)=TRUE AND UPPER(COALESCE(${u}.account_status,'ACTIVE'))='ACTIVE')`;
  const NOT_BLOCKED = (owner) => `NOT EXISTS(SELECT 1 FROM howdi_connect_profile_blocks kb WHERE (kb.blocker_user_id=$1::bigint AND kb.blocked_user_id=${owner}) OR (kb.blocker_user_id=${owner} AND kb.blocked_user_id=$1::bigint))`;
  const ALL_TERMS = (hay) => `NOT EXISTS(SELECT 1 FROM unnest($2::text[]) AS term(p) WHERE NOT ((${hay}) ILIKE term.p ESCAPE '\\'))`;
  const MODERATION = `(SELECT m.status FROM howdi_shop_product_moderation_v162c m WHERE m.product_id=p.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1)`;

  const SQL = {
    // People: public username (validated again in JS), discoverable, active account, not blocked either way, never the
    // viewer; a private profile only for a signed-in follower (the existing K5E rule). Matched on public identity only.
    person: `SELECT cp.public_username, u.full_name AS display_name, COALESCE(NULLIF(cp.avatar_data,''),NULLIF(ps.profile_image,''),'') AS avatar,
        cp.profession_title, cp.professional_category, cp.creator_mode, cp.professional_mode, u.is_active, u.account_status, cp.discoverable,
        ($1::bigint>0 AND EXISTS(SELECT 1 FROM howdi_connect_follows f WHERE f.follower_user_id=$1::bigint AND f.following_user_id=u.id)) AS following
      FROM users u JOIN howdi_connect_profiles cp ON cp.user_id=u.id LEFT JOIN user_profile_settings ps ON ps.user_id=u.id
      WHERE u.id<>$1::bigint AND cp.public_username IS NOT NULL AND cp.public_username<>'' AND COALESCE(cp.discoverable,TRUE)=TRUE
        AND ${ACTIVE_USER('u')} AND ${NOT_BLOCKED('u.id')}
        AND (COALESCE(cp.private_profile,FALSE)=FALSE OR ($1::bigint>0 AND ${k5ePrivateProfileOkSql('u.id', '$1::bigint')}))
        AND ${ALL_TERMS(`concat_ws(' ',cp.public_username,u.full_name,cp.profession_title,cp.professional_category)`)}
      ORDER BY CASE WHEN LOWER(cp.public_username)=$3 THEN 0 WHEN LOWER(u.full_name)=$3 THEN 1
                    WHEN LOWER(cp.public_username) LIKE $4 ESCAPE '\\' THEN 2 WHEN LOWER(u.full_name) LIKE $4 ESCAPE '\\' THEN 3 ELSE 4 END,
        LOWER(cp.public_username)
      LIMIT $5`,
    // Products: the Shop S1 catalogue gate (published, not archived, released, active vendor, moderation APPROVED or none)
    // plus an active, unblocked vendor owner. Matched on product text only (never sku, vendor code or owner identity).
    product: `SELECT p.id::text AS internal_key, p.name, p.category, p.subcategory, p.price, p.mrp, p.stock, p.image_urls,
        p.status, p.archived_at, p.published_at, COALESCE(v.status,'active') AS vendor_status, ${MODERATION} AS moderation_status,
        v.business_name AS store_name, u.is_active, u.account_status,
        CASE WHEN EXISTS(SELECT 1 FROM vendor_product_variants pv WHERE pv.product_id=p.id)
             THEN EXISTS(SELECT 1 FROM vendor_product_variants pv WHERE pv.product_id=p.id AND LOWER(COALESCE(pv.status,'active'))='active' AND COALESCE(pv.stock,0)>0)
             ELSE COALESCE(p.stock,0)>0 END AS in_stock
      FROM vendor_products p JOIN vendor_profiles v ON v.id=p.vendor_profile_id JOIN users u ON u.id=v.user_id
      WHERE p.status='published' AND p.archived_at IS NULL AND (p.published_at IS NULL OR p.published_at<=NOW()) AND COALESCE(v.status,'active')='active'
        AND COALESCE(UPPER(${MODERATION}),'APPROVED')='APPROVED'
        AND ${ACTIVE_USER('u')} AND ${NOT_BLOCKED('v.user_id')}
        AND ${ALL_TERMS(`concat_ws(' ',p.name,p.category,p.subcategory,p.product_type,p.short_description)`)}
      ORDER BY CASE WHEN LOWER(p.name)=$3 THEN 0 WHEN LOWER(p.name) LIKE $4 ESCAPE '\\' THEN 1 ELSE 2 END,
        p.published_at DESC NULLS LAST, p.updated_at DESC, p.id DESC
      LIMIT $5`,
    // Workers: the public Works gate (verified KYC + skill, active account and row, approved primary service that is
    // active and customer-visible, a public worker_code) plus an active, unblocked linked member. Coarse city only.
    worker: `SELECT w.worker_code, w.full_name, w.city, w.rating, ps.name AS primary_service, u.id IS NOT NULL AS has_member,
        u.is_active, u.account_status
      FROM works_workers w
        JOIN works_worker_services pws ON pws.worker_id=w.id AND pws.is_primary=TRUE AND LOWER(TRIM(pws.status))='approved'
        JOIN works_services ps ON ps.id=pws.service_id AND ps.active=TRUE AND ps.customer_visible=TRUE
        LEFT JOIN users u ON u.id=w.user_id
      WHERE LOWER(TRIM(w.kyc_status))='verified' AND LOWER(TRIM(w.skill_status))='verified' AND LOWER(TRIM(w.account_status))='active'
        AND COALESCE(w.active,TRUE)=TRUE AND w.worker_code IS NOT NULL
        AND (w.user_id IS NULL OR (${ACTIVE_USER('u')} AND ${NOT_BLOCKED('w.user_id')}))
        AND ${ALL_TERMS(`concat_ws(' ',w.full_name,ps.name,(SELECT string_agg(s.name,' ') FROM works_worker_services ws JOIN works_services s ON s.id=ws.service_id
              WHERE ws.worker_id=w.id AND LOWER(TRIM(ws.status))='approved' AND s.active=TRUE AND s.customer_visible=TRUE))`)}
      ORDER BY CASE WHEN LOWER(w.full_name)=$3 OR LOWER(ps.name)=$3 THEN 0 WHEN LOWER(ps.name) LIKE $4 ESCAPE '\\' OR LOWER(w.full_name) LIKE $4 ESCAPE '\\' THEN 1 ELSE 2 END,
        w.rating DESC NULLS LAST, w.completed_jobs DESC NULLS LAST, w.worker_code
      LIMIT $5`,
    // Courses: active + PUBLISHED. A course whose active, approved teacher is blocked either way (or is no longer an
    // active account) is hidden from that viewer. Teacher identity is never returned.
    course: `SELECT c.id::text AS internal_key, c.title, c.category, c.level, c.duration_minutes, c.thumbnail_url, c.price, c.sale_price, c.purchase_mode,
        c.is_active, c.publish_status
      FROM learning_courses c
      WHERE c.is_active=TRUE AND c.publish_status='PUBLISHED'
        AND NOT EXISTS(SELECT 1 FROM learning_teacher_course_assignments a JOIN learning_teacher_profiles tp ON tp.id=a.teacher_profile_id
              JOIN users tu ON tu.id=tp.user_id
            WHERE a.course_id=c.id AND a.status='ACTIVE' AND tp.application_status='APPROVED'
              AND (NOT ${ACTIVE_USER('tu')} OR NOT ${NOT_BLOCKED('tp.user_id')}))
        AND ${ALL_TERMS(`concat_ws(' ',c.title,c.category,c.tagline,c.level)`)}
      ORDER BY CASE WHEN LOWER(c.title)=$3 THEN 0 WHEN LOWER(c.title) LIKE $4 ESCAPE '\\' THEN 1 ELSE 2 END, c.updated_at DESC, c.title
      LIMIT $5`,
  };

  // ---------------- JS re-checks (never trust the SQL alone)
  const userOk = (r) => r.is_active !== false && String(r.account_status || 'ACTIVE').toUpperCase() === 'ACTIVE';
  const shopRowVisible = (r) => {
    if (String(r.status || '').toLowerCase() !== 'published' || r.archived_at) return false;
    if (String(r.vendor_status || 'active').toLowerCase() !== 'active') return false;
    const at = r.published_at ? new Date(r.published_at).getTime() : null;
    if (at && Number.isFinite(at) && at > Date.now()) return false;
    if (r.moderation_status && String(r.moderation_status).trim().toUpperCase() !== 'APPROVED') return false;
    return userOk(r);
  };

  const BUILD = {
    async person(rows, viewerId) {
      return rows.filter((r) => isPublicUsername(r.public_username) && r.discoverable !== false && userOk(r)).map((r) => searchDto({
        type: 'person',
        title: oneLine(r.display_name, 80) || '@' + r.public_username,
        subtitle: ['@' + r.public_username, oneLine(r.profession_title || r.professional_category, 80)].filter(Boolean).join(' · '),
        image: r.avatar,
        badges: [r.creator_mode === true && 'creator', r.professional_mode === true && 'professional', viewerId > 0 && r.following === true && 'following'],
        route: `/@${r.public_username}`,
      }));
    },
    async product(rows) {
      const ok = rows.filter(shopRowVisible);
      const refs = await issuePublicRefs('PRODUCT', ok.map((r) => r.internal_key));
      return ok.map((r) => {
        const code = refs.get(String(r.internal_key));
        if (!code || !PUBLIC_CODE_RE.test(code) || !code.startsWith('PRD-')) return null;
        const price = money(r.price), mrp = money(r.mrp);
        return searchDto({
          type: 'product', title: r.name,
          subtitle: [inr(price), oneLine(r.category, 60), oneLine(r.store_name, 60)].filter(Boolean).join(' · '),
          image: firstImage(r.image_urls),
          badges: [mrp !== null && price !== null && mrp > price && 'on_sale', r.in_stock !== true && 'out_of_stock'],
          route: `/shop/products/${code}`,
        });
      });
    },
    async worker(rows) {
      return rows.filter((r) => isPublicWorkerCode(r.worker_code) && (!r.has_member || userOk(r))).map((r) => {
        const rating = Number(r.rating);
        return searchDto({
          type: 'worker', title: r.full_name,
          subtitle: [oneLine(r.primary_service, 60), oneLine(r.city, 60), Number.isFinite(rating) && rating > 0 ? `★ ${(Math.round(Math.min(5, rating) * 10) / 10).toFixed(1)}` : ''].filter(Boolean).join(' · '),
          image: null, badges: ['verified'],
          route: `/works/workers/${encodeURIComponent(r.worker_code)}`,
        });
      });
    },
    async course(rows) {
      const ok = rows.filter((r) => r.is_active === true && r.publish_status === 'PUBLISHED');
      const refs = await issuePublicRefs('COURSE', ok.map((r) => r.internal_key));
      return ok.map((r) => {
        const code = refs.get(String(r.internal_key));
        if (!code || !PUBLIC_CODE_RE.test(code) || !code.startsWith('CRS-')) return null;
        const minutes = Math.floor(Number(r.duration_minutes));
        const list = money(r.price), sale = money(r.sale_price), payable = sale !== null ? sale : list;
        return searchDto({
          type: 'course', title: r.title,
          subtitle: [oneLine(r.category, 60), oneLine(r.level, 40), Number.isFinite(minutes) && minutes > 0 ? `${minutes} min` : ''].filter(Boolean).join(' · '),
          image: r.thumbnail_url,
          badges: [(String(r.purchase_mode || '').toUpperCase() === 'FREE' || payable === null || payable <= 0) && 'free'],
          route: `/learn/courses/${code}`,
        });
      });
    },
  };

  async function searchType(type, viewerId, parsed) {
    const { patterns, exact, prefix } = parsed.sql;
    const cap = parsed.query.limit;
    const rows = (await pool.query(SQL[type], [viewerId, patterns, exact, prefix, cap + 1])).rows;
    const items = (await BUILD[type](rows.slice(0, cap), viewerId)).filter(Boolean);
    return { items, hasMore: rows.length > cap };
  }

  // ---------------- request handling
  function fail(res, http, code, message) { sendJSON(res, http, { status: 'error', code, message }); }
  async function resolveViewer(req) {
    const u = await getSessionUserFromRequest(req);
    if (!u || u.is_active === false || String(u.account_status || 'ACTIVE').toUpperCase() !== 'ACTIVE') return 0;
    const id = Number(u.id);
    return Number.isSafeInteger(id) && id > 0 ? id : 0;
  }
  function limited(req, res, viewerId) {
    if (typeof rateLimit !== 'function') return false;
    const key = viewerId ? `k5b-search:user:${viewerId}` : `k5b-search:ip:${typeof getRequestIp === 'function' ? getRequestIp(req) : 'unknown'}`;
    const r = rateLimit(key, viewerId ? RATE.USER : RATE.GUEST, RATE.WINDOW_MS);
    if (r && r.allowed === false) {
      res.setHeader('Retry-After', String(Math.ceil((r.retryAfterMs || RATE.WINDOW_MS) / 1000)));
      fail(res, 429, 'RATE_LIMITED', 'Too many searches. Please slow down and try again shortly.');
      return true;
    }
    return false;
  }

  async function search(req, res, url) {
    const parsed = parseSearchQuery(url.searchParams);
    if (parsed.error) return fail(res, 400, 'INVALID_SEARCH_PARAMETER', parsed.error);
    const viewerId = await resolveViewer(req);
    if (limited(req, res, viewerId)) return;
    const results = [];
    const hasMore = {};
    // Sequential on purpose: one pooled connection per search, predictable load.
    for (const type of parsed.query.types) {
      const r = await searchType(type, viewerId, parsed);
      results.push(...r.items);
      hasMore[type] = r.hasMore;
    }
    // Final guard: exactly the seven allow-listed keys, then the shared K5A identity-key scrub.
    const safe = results.map((d) => Object.fromEntries(DTO_KEYS.map((k) => [k, d[k]])));
    sendJSON(res, 200, { status: 'success', ...stripInternalKeys({ viewer: viewerId ? 'session' : 'guest', query: parsed.query, results: safe, has_more: hasMore }) });
  }

  // Returns true when the request was handled.
  async function handle(req, res, url) {
    const p = url.pathname;
    if (p !== SEARCH_PATH && p !== SEARCH_PATH + '/' && !p.startsWith(SEARCH_PATH + '/')) return false;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Authorization');
    if (p !== SEARCH_PATH && p !== SEARCH_PATH + '/') { fail(res, 404, 'NOT_FOUND', 'Not found.'); return true; }   // namespace reserved for later parts
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); fail(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET.'); return true; }
    try {
      await search(req, res, url);
    } catch (error) {
      // Never log the query text; the error code/message from the driver only.
      logger.error('[K5B search] request failed:', error && (error.code || error.message));
      if (!res.headersSent) fail(res, 500, 'SEARCH_UNAVAILABLE', 'Search is temporarily unavailable. Please try again.');
    }
    return true;
  }

  return { handle, _internal: { SQL, parseSearchQuery, searchDto } };
}

module.exports = { createSearchK5B, parseSearchQuery, searchDto, escapeLike, TYPES, PILLARS, TYPE_PILLAR, ALLOWED_PARAMS, LIMITS, Q, RATE, DTO_KEYS, BADGES, ACTOR_PARAM_RE, SEARCH_PATH };
