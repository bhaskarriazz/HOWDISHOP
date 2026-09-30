'use strict';
// =====================================================================================
// HOWDI V8 — Learn Discovery (P8 / LRN-DISC-001..003). Pure query layer for GET /api/v8/learn/courses.
// Every filter maps to a real learning_courses / lesson column; unknown values are dropped server-side, so a
// shared URL can never widen what the catalogue exposes (published + active only, applied by the caller).
//   q        course title, tagline, description, skill, outcomes, lesson titles / practice tasks, teacher @handle / name
//   goal     authoritative taxonomy in learn-taxonomy-v8.cjs: certificate → certificate_enabled · project → teacher-declared
//            project (legacy courses: project_required IS TRUE or a practice task) · sell → teacher-declared v8_sell_goal + project
//   lang     language values that exist in the published catalogue (validated against that list)
//   level    beginner | intermediate | advanced
//   price    free | under500 | 500to2000 | over2000   (effective price = sale_price when set, else price)
//   skill    course category
//   format   video (has a video lesson) | reading (has a text lesson) | live (live class included)
//   time     under1h | 1to3h | over3h   (total course minutes)
//   materials none | list
//   sort     relevance (only with q) | newest | learners | shortest | price_low | price_high
//   offset / limit   paging (limit 1–48, default 12)
// =====================================================================================
const CATEGORIES = ['Crochet & Handmade', 'Tailoring & Textiles', 'Cooking', 'Digital skills', 'Business & Selling', 'Languages', 'Wellness'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const T = require('./learn-taxonomy-v8.cjs');
const GOALS = T.GOAL_VALUES;
const PRICES = ['free', 'under500', '500to2000', 'over2000'];
const FORMATS = ['video', 'reading', 'live'];
const TIMES = ['under1h', '1to3h', 'over3h'];
const MATERIALS = ['none', 'list'];
const SORTS = ['relevance', 'newest', 'learners', 'shortest', 'price_low', 'price_high'];
const MAX_LIMIT = 48;
const DEFAULT_LIMIT = 12;
const MAX_OFFSET = 5000;

const clean = (v, max) => String(v ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
function multi(params, name, allowed, max = 8) {
  const raw = [];
  for (const v of params.getAll(name)) for (const part of String(v).split(',')) raw.push(clean(part, 60));
  const out = [];
  for (const v of raw) {
    const hit = allowed.find((a) => a.toLowerCase() === v.toLowerCase());
    if (hit && !out.includes(hit)) out.push(hit);
    if (out.length >= max) break;
  }
  return out;
}

// languages: the allowed list is whatever the published catalogue actually contains (passed in by the caller)
function parseDiscoveryQuery(params, { languages = [] } = {}) {
  const q = clean(params.get('q'), 60);
  const f = {
    q,
    goal: multi(params, 'goal', GOALS),
    lang: multi(params, 'lang', languages),
    level: multi(params, 'level', LEVELS),
    price: multi(params, 'price', PRICES),
    skill: multi(params, 'skill', CATEGORIES),
    format: multi(params, 'format', FORMATS),
    time: multi(params, 'time', TIMES),
    materials: multi(params, 'materials', MATERIALS),
  };
  let sort = clean(params.get('sort'), 20).toLowerCase();
  if (!SORTS.includes(sort) || (sort === 'relevance' && !q)) sort = q ? 'relevance' : 'newest';
  f.sort = sort;
  const lim = Math.floor(Number(params.get('limit')));
  f.limit = Number.isFinite(lim) && lim >= 1 ? Math.min(lim, MAX_LIMIT) : DEFAULT_LIMIT;
  const off = Math.floor(Number(params.get('offset')));
  f.offset = Number.isFinite(off) && off >= 0 ? Math.min(off, MAX_OFFSET) : 0;
  return f;
}

const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const EFFECTIVE_PRICE = `COALESCE(c.sale_price, c.price, 0)`;

// Builds the WHERE clause (appended to the caller's published predicate) + ORDER BY with positional params only.
function buildDiscoverySql(f, { published }) {
  const params = []; const where = [published];
  const p = (v) => { params.push(v); return `$${params.length}`; };
  const or = (parts) => (parts.length ? `(${parts.join(' OR ')})` : null);
  let like = null;
  if (f.q) {
    like = p(`%${likeEscape(f.q.toLowerCase())}%`);
    where.push(`(LOWER(c.title) LIKE ${like} ESCAPE '\\' OR LOWER(COALESCE(c.tagline,'')) LIKE ${like} ESCAPE '\\' OR LOWER(COALESCE(c.description,'')) LIKE ${like} ESCAPE '\\'
      OR LOWER(COALESCE(c.category,'')) LIKE ${like} ESCAPE '\\' OR LOWER(COALESCE(c.outcomes::text,'')) LIKE ${like} ESCAPE '\\'
      OR EXISTS(SELECT 1 FROM learning_course_modules dm JOIN learning_course_lessons dl ON dl.module_id=dm.id WHERE dm.course_id=c.id AND dm.is_active AND dl.is_active
        AND (LOWER(dl.title) LIKE ${like} ESCAPE '\\' OR LOWER(COALESCE(dl.practice_task,'')) LIKE ${like} ESCAPE '\\'))
      OR EXISTS(SELECT 1 FROM users du LEFT JOIN howdi_connect_profiles dp ON dp.user_id=du.id WHERE du.id=c.v8_teacher_user_id
        AND (LOWER(COALESCE(dp.public_username,'')) LIKE ${like} ESCAPE '\\' OR (COALESCE(dp.discoverable,TRUE) AND COALESCE(dp.private_profile,FALSE)=FALSE AND LOWER(COALESCE(du.full_name,'')) LIKE ${like} ESCAPE '\\'))))`);
  }
  const goal = f.goal.map((g) => T.goalSql(g, 'c')).filter(Boolean);
  if (goal.length) where.push(or(goal));
  if (f.lang.length) where.push(`LOWER(c.language) = ANY(${p(f.lang.map((x) => x.toLowerCase()))}::text[])`);
  if (f.level.length) where.push(`LOWER(c.level) = ANY(${p(f.level)}::text[])`);
  const price = f.price.map((x) => (x === 'free' ? `${EFFECTIVE_PRICE} <= 0` : x === 'under500' ? `(${EFFECTIVE_PRICE} > 0 AND ${EFFECTIVE_PRICE} < 500)`
    : x === '500to2000' ? `(${EFFECTIVE_PRICE} >= 500 AND ${EFFECTIVE_PRICE} <= 2000)` : `${EFFECTIVE_PRICE} > 2000`));
  if (price.length) where.push(or(price));
  if (f.skill.length) where.push(`c.category = ANY(${p(f.skill)}::text[])`);
  const lessonKind = (cond) => `EXISTS(SELECT 1 FROM learning_course_modules fm JOIN learning_course_lessons fl ON fl.module_id=fm.id WHERE fm.course_id=c.id AND fm.is_active AND fl.is_active AND ${cond})`;
  const format = f.format.map((x) => (x === 'video' ? lessonKind(`UPPER(fl.lesson_type)='VIDEO' AND COALESCE(fl.content_url,'')<>''`) : x === 'reading' ? lessonKind(`UPPER(fl.lesson_type)='TEXT'`) : `c.live_class_included IS TRUE`));
  if (format.length) where.push(or(format));
  const time = f.time.map((x) => (x === 'under1h' ? `COALESCE(c.duration_minutes,0) < 60` : x === '1to3h' ? `(COALESCE(c.duration_minutes,0) >= 60 AND COALESCE(c.duration_minutes,0) <= 180)` : `COALESCE(c.duration_minutes,0) > 180`));
  if (time.length) where.push(or(time));
  const mats = f.materials.map((x) => (x === 'none' ? `jsonb_array_length(COALESCE(c.materials,'[]'::jsonb)) = 0` : `jsonb_array_length(COALESCE(c.materials,'[]'::jsonb)) > 0`));
  if (mats.length) where.push(or(mats));
  const learners = `(SELECT COUNT(*) FROM learning_course_entitlements se WHERE se.course_id=c.id AND se.entitlement_status='ACTIVE')`;
  let order;
  if (f.sort === 'relevance') {
    const exact = p(f.q.toLowerCase()); const prefix = p(`${likeEscape(f.q.toLowerCase())}%`);
    order = `CASE WHEN LOWER(c.title)=${exact} THEN 0 WHEN LOWER(c.title) LIKE ${prefix} ESCAPE '\\' THEN 1 WHEN LOWER(c.title) LIKE ${like} ESCAPE '\\' THEN 2 ELSE 3 END, c.created_at DESC, c.id`;
  } else if (f.sort === 'learners') order = `${learners} DESC, c.created_at DESC, c.id`;
  else if (f.sort === 'shortest') order = `COALESCE(c.duration_minutes,0) ASC, c.created_at DESC, c.id`;
  else if (f.sort === 'price_low') order = `${EFFECTIVE_PRICE} ASC, c.created_at DESC, c.id`;
  else if (f.sort === 'price_high') order = `${EFFECTIVE_PRICE} DESC, c.created_at DESC, c.id`;
  else order = `c.created_at DESC, c.id`;
  const whereSql = where.filter(Boolean).join(' AND ');
  const countSql = `SELECT COUNT(*)::int AS n FROM learning_courses c WHERE ${whereSql}`;
  const countParams = params.slice(0, params.length - (f.sort === 'relevance' ? 2 : 0));
  const lim = p(f.limit); const off = p(f.offset);
  return {
    listSql: `SELECT c.* FROM learning_courses c WHERE ${whereSql} ORDER BY ${order} LIMIT ${lim} OFFSET ${off}`,
    listParams: params,
    countSql,
    countParams,
  };
}

// Echo of the filters that were actually applied (after validation) — the client rebuilds chips/URL from this.
function appliedFilters(f) {
  const out = {};
  for (const k of ['q', 'goal', 'lang', 'level', 'price', 'skill', 'format', 'time', 'materials']) if (k === 'q' ? f.q : f[k].length) out[k] = f[k];
  out.sort = f.sort;
  return out;
}

module.exports = { parseDiscoveryQuery, buildDiscoverySql, appliedFilters, CATEGORIES, LEVELS, GOALS, PRICES, FORMATS, TIMES, MATERIALS, SORTS, MAX_LIMIT, DEFAULT_LIMIT };
