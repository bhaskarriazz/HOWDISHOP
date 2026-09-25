// K5B Global Search Part 1 — real-PostgreSQL suite helpers.
// Reuses the K5A Home fixtures (which reuse the Worker harness: the real backend/server.js booted on a scratch database).
if (!process.env.WORKER_PG_URL && process.env.K5B_PG_URL) process.env.WORKER_PG_URL = process.env.K5B_PG_URL;
const L = require('../k5a-pg/lib.cjs');
const { pool } = L;

const DTO_KEYS = ['type', 'pillar', 'title', 'subtitle', 'image', 'badges', 'route'];
const ROUTE_RE = {
  person: /^\/@[a-z0-9._]{3,30}$/,
  product: /^\/shop\/products\/PRD-[0-9A-F]{12}$/,
  worker: /^\/works\/workers\/[A-Za-z0-9_-]{3,64}$/,
  course: /^\/learn\/courses\/CRS-[0-9A-F]{12}$/,
};
const PILLAR = { person: 'connect', product: 'shop', worker: 'works', course: 'learn' };

const search = (qs, opts) => L.api('GET', '/api/search' + (qs === undefined ? '' : '?' + qs), opts);
const s = (q, extra = '', opts) => search('q=' + encodeURIComponent(q) + (extra ? '&' + extra : ''), opts);
const titles = (r) => (r.json?.results || []).map((x) => x.title);
const routes = (r) => (r.json?.results || []).map((x) => x.route);
const ofType = (r, t) => (r.json?.results || []).filter((x) => x.type === t);

// A result must be exactly the seven-key DTO with the right pillar and a public-key route.
function dtoProblems(r) {
  const out = [];
  for (const d of r.json?.results || []) {
    if (JSON.stringify(Object.keys(d)) !== JSON.stringify(DTO_KEYS)) out.push('keys ' + Object.keys(d).join(','));
    if (PILLAR[d.type] !== d.pillar) out.push('pillar ' + d.type + '/' + d.pillar);
    if (!ROUTE_RE[d.type] || !ROUTE_RE[d.type].test(d.route)) out.push('route ' + d.route);
    if (typeof d.title !== 'string' || !d.title) out.push('title');
    if (d.subtitle !== null && typeof d.subtitle !== 'string') out.push('subtitle');
    if (d.image !== null && !(typeof d.image === 'string' && /^(https?:\/\/|\/(?!\/)|data:image\/)/.test(d.image))) out.push('image ' + String(d.image).slice(0, 40));
    if (!Array.isArray(d.badges) || d.badges.some((b) => typeof b !== 'string')) out.push('badges');
  }
  return out;
}
// Public codes anywhere in a payload (inside routes too; K5A's codesIn only sees bare quoted codes).
const codesInText = (json) => [...new Set([...JSON.stringify(json || {}).matchAll(/(?:PST|ART|STY|PRD|CRS)-[0-9A-F]{12}/g)].map((m) => m[0]))];
// Very long digit runs are how K5E's reversible member references look (safe integers ≥ 2^52).
const LONG_NUMBER_RE = /(^|[^0-9])\d{13,}([^0-9]|$)/;

// Learn teacher assignment (active + approved) so a block against the teacher can be tested.
async function teachCourse(teacher, course, { approved = true } = {}) {
  const tp = (await pool.query(`INSERT INTO learning_teacher_profiles(id,user_id,teacher_code,display_name,application_status)
    VALUES(gen_random_uuid(),$1,$2,$3,$4) RETURNING id`, [teacher.id, 'TCH-K5B-' + teacher.id, teacher.name, approved ? 'APPROVED' : 'PENDING'])).rows[0].id;
  await pool.query(`INSERT INTO learning_teacher_course_assignments(id,teacher_profile_id,course_id,status,assigned_at) VALUES(gen_random_uuid(),$1,$2::uuid,'ACTIVE',NOW())`, [tp, course.id]);
  return { profileId: tp };
}

module.exports = { ...L, DTO_KEYS, ROUTE_RE, PILLAR, search, s, titles, routes, ofType, dtoProblems, codesInText, LONG_NUMBER_RE, teachCourse };
