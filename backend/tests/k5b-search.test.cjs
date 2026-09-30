// K5B Global Search Part 1 — unit tests (no database): parameter allow-list, DTO allow-list, SQL pins,
// handler behaviour with a mocked pool, and wiring/scope pins in server.js.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../search-k5b.cjs');

const SRC = fs.readFileSync(path.join(__dirname, '../search-k5b.cjs'), 'utf8');
const SERVER = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const parse = (qs) => S.parseSearchQuery(new URLSearchParams(qs));

// ------------------------------------------------------------------ parameters
test('allow-list: only q, pillar, types, limit; unknown and duplicated parameters are refused', () => {
  assert.deepEqual([...S.ALLOWED_PARAMS], ['q', 'pillar', 'types', 'limit']);
  for (const qs of ['q=ab&x=1', 'q=ab&q=cd', 'q=ab&limit=2&limit=3', 'q=ab&cursor=x', 'q=ab&offset=1', 'q=ab&sort=new', 'q=ab&location=x', 'q=ab&Q=ab'])
    assert.ok(parse(qs).error, qs);
});
test('actor / id parameters are refused (never read), whatever their spelling', () => {
  for (const k of ['userId', 'user_id', 'viewerId', 'viewer_id', 'actorId', 'accountId', 'masterId', 'howdiId', 'howdi_id', 'id', 'ids', 'uuid', 'creator', 'workerId', 'vendor_id', 'ownerId', 'session', 'sessionToken', 'token', 'customerId'])
    assert.equal(parse(`q=ab&${k}=1`).error, 'Unsupported search parameter.', k);
});
test('q: required, 2–80 characters counted as characters, whitespace normalised, control characters refused', () => {
  assert.ok(parse('').error); assert.ok(parse('q=').error); assert.ok(parse('q=a').error); assert.ok(parse('q=%20%20a%20').error);
  assert.ok(parse('q=' + 'a'.repeat(81)).error);
  assert.equal(parse('q=' + 'a'.repeat(80)).query.q.length, 80);
  assert.equal(parse('q=' + encodeURIComponent('ǐ'.repeat(80))).query.q, 'ǐ'.repeat(80));
  assert.equal(parse('q=' + encodeURIComponent('  pot   mug ')).query.q, 'pot mug');
  for (const c of ['%00', '%0A', '%09', '%1F', '%7F']) assert.ok(parse('q=ab' + c + 'cd').error, c);
  assert.equal(parse('q=' + encodeURIComponent('ＰＯＴ')).query.q, 'POT', 'NFKC normalisation');
});
test('LIKE metacharacters are escaped; terms are lowered, de-duplicated and capped', () => {
  assert.equal(S.escapeLike('100%_a\\b'), '100\\%\\_a\\\\b');
  const p = parse('q=' + encodeURIComponent('50% Off_ off 50%'));
  assert.deepEqual(p.sql.patterns, ['%50\\%%', '%off\\_%', '%off%']);
  assert.equal(p.sql.exact, '50% off_ off 50%');
  assert.equal(p.sql.prefix, '50\\% off\\_ off 50\\%%');
  assert.equal(parse('q=' + encodeURIComponent('a1 a2 a3 a4 a5 a6 a7 a8')).sql.patterns.length, S.Q.MAX_TERMS);
});
test('pillar / types / limit validation and canonical ordering', () => {
  assert.deepEqual(parse('q=ab').query, { q: 'ab', pillar: 'all', types: ['person', 'product', 'worker', 'course'], limit: 5 });
  assert.deepEqual(parse('q=ab&types=course,person').query.types, ['person', 'course']);
  assert.deepEqual(parse('q=ab&pillar=works').query.types, ['worker']);
  assert.deepEqual(parse('q=ab&pillar=learn&types=course,person').query.types, ['course']);
  for (const qs of ['q=ab&pillar=admin', 'q=ab&pillar=', 'q=ab&types=', 'q=ab&types=post', 'q=ab&types=person,person', 'q=ab&types=person,', 'q=ab&pillar=shop&types=person',
    'q=ab&limit=0', 'q=ab&limit=11', 'q=ab&limit=', 'q=ab&limit=01a', 'q=ab&limit=-1', 'q=ab&limit=1.5', 'q=ab&limit=100'])
    assert.ok(parse(qs).error, qs);
  assert.equal(parse('q=ab&limit=10').query.limit, 10);
  assert.equal(S.LIMITS.MAX, 10);
});

// ------------------------------------------------------------------ DTO
test('DTO allow-list: exactly seven keys, badge vocabulary, safe images, no extra fields ever copied', () => {
  const d = S.searchDto({ type: 'product', title: '  Mug\n', subtitle: 's', image: 'javascript:alert(1)', badges: ['on_sale', 'admin', 'on_sale', false], route: '/shop/products/PRD-0123456789AB', id: 7, email: 'x@y' });
  assert.deepEqual(Object.keys(d), [...S.DTO_KEYS]);
  assert.deepEqual(d, { type: 'product', pillar: 'shop', title: 'Mug', subtitle: 's', image: null, badges: ['on_sale'], route: '/shop/products/PRD-0123456789AB' });
  assert.equal(S.searchDto({ type: 'course', title: '', route: '/x' }), null, 'empty title is dropped');
  assert.equal(S.searchDto({ type: 'course', title: 't', route: null }), null, 'missing route is dropped');
  assert.equal(S.searchDto({ type: 'person', title: 't', image: 'https://cdn.example/a.png', route: '/@abc' }).image, 'https://cdn.example/a.png');
  assert.deepEqual([...S.DTO_KEYS], ['type', 'pillar', 'title', 'subtitle', 'image', 'badges', 'route']);
});

// ------------------------------------------------------------------ SQL pins
const { createSearchK5B } = S;
const mk = (over = {}) => {
  const sent = [];
  const calls = [];
  const h = createSearchK5B({
    pool: { query: async (sql, params) => { calls.push({ sql, params }); return { rows: (over.rows && over.rows(sql, params)) || [] }; } },
    getSessionUserFromRequest: over.session || (async () => null),
    sendJSON: (res, status, body) => { sent.push({ status, body }); res.statusCode = status; res.headersSent = true; },
    k5ePrivateProfileOkSql: (col, viewer) => `PRIVATE_OK(${col},${viewer})`,
    issuePublicRefs: over.issue || (async (type, keys) => new Map(keys.map((k, i) => [String(k), (type === 'PRODUCT' ? 'PRD-' : 'CRS-') + String(i).padStart(12, 'A')]))),
    rateLimit: over.rateLimit, getRequestIp: () => '10.0.0.1', logger: { error: (...a) => sent.push({ log: a }) },
  });
  return { h, sent, calls };
};
const SQL = mk().h._internal.SQL;
test('SQL is static text with bound parameters and ESCAPE on every LIKE', () => {
  for (const [t, sql] of Object.entries(SQL)) {
    assert.ok(!/\$\{/.test(sql), t + ' has no template holes');
    assert.equal((sql.match(/I?LIKE/g) || []).length, (sql.match(/ESCAPE '\\'/g) || []).length, t + ': every LIKE has ESCAPE');
    assert.match(sql, /LIMIT \$5\s*$/, t + ': fixed cap parameter');
    assert.match(sql, /unnest\(\$2::text\[\]\)/, t + ': every term must match');
  }
});
test('SQL never selects or matches private columns', () => {
  const all = Object.values(SQL).join('\n');
  for (const col of ['email', 'phone', 'howdi_id', 'master_id', 'identity_uuid', 'password', 'pincode', 'address', 'latitude', 'longitude', 'sku', 'vendor_code', 'session_token', 'gstin', 'pan'])
    assert.ok(!new RegExp(`\\b${col}\\b`, 'i').test(all), col);
});
test('SQL enforces the visibility floor for each type', () => {
  assert.match(SQL.person, /discoverable/); assert.match(SQL.person, /is_active/); assert.match(SQL.person, /account_status/); assert.match(SQL.person, /howdi_connect_profile_blocks/);
  assert.match(SQL.person, /private_profile/); assert.match(SQL.person, /PRIVATE_OK\(u\.id,\$1::bigint\)/); assert.match(SQL.person, /u\.id<>\$1::bigint/);
  for (const s of ["p.status='published'", 'p.archived_at IS NULL', 'p.published_at<=NOW()', "COALESCE(v.status,'active')='active'", "'APPROVED'", 'howdi_connect_profile_blocks']) assert.ok(SQL.product.includes(s), s);
  for (const s of ["w.kyc_status))='verified'", "w.skill_status))='verified'", "w.account_status))='active'", 'COALESCE(w.active,TRUE)=TRUE', 'customer_visible=TRUE', 'howdi_connect_profile_blocks']) assert.ok(SQL.worker.includes(s), s);
  for (const s of ['c.is_active=TRUE', "c.publish_status='PUBLISHED'", 'learning_teacher_course_assignments', 'howdi_connect_profile_blocks']) assert.ok(SQL.course.includes(s), s);
});

// ------------------------------------------------------------------ handler behaviour (mocked pool)
const req = (headers = {}, method = 'GET') => ({ method, headers });
const res = () => { const h = {}; return { h, setHeader: (k, v) => { h[k.toLowerCase()] = v; } }; };
const url = (qs, p = '/api/search') => new URL('http://x' + p + (qs ? '?' + qs : ''));

test('handler: only /api/search (+ reserved sub-paths); other paths are not handled', async () => {
  const { h } = mk();
  assert.equal(await h.handle(req(), res(), url('q=ab', '/api/users/search')), false);
  assert.equal(await h.handle(req(), res(), url('q=ab', '/api/searchx')), false);
  const { h: h2, sent } = mk();
  assert.equal(await h2.handle(req(), res(), url('q=ab', '/api/search/recent')), true);
  assert.equal(sent[0].status, 404);
});
test('handler: headers, 405, 400 before any query, and generic 500 without the search term', async () => {
  let m = mk(); let r = res();
  await m.h.handle(req({}, 'POST'), r, url('q=ab'));
  assert.equal(m.sent[0].status, 405); assert.equal(r.h['cache-control'], 'no-store'); assert.equal(r.h.pragma, 'no-cache'); assert.equal(r.h['x-content-type-options'], 'nosniff'); assert.match(r.h.vary, /Authorization/);
  m = mk(); await m.h.handle(req(), res(), url('q=ab&userId=9'));
  assert.equal(m.sent[0].status, 400); assert.equal(m.calls.length, 0, 'no database access on a rejected request');
  m = mk({ rows: () => { const e = new Error('relation "learning_courses" does not exist'); e.code = '42P01'; throw e; } });
  await m.h.handle(req(), res(), url('q=secretterm'));
  const out = m.sent.find((x) => x.status);
  assert.equal(out.status, 500); assert.deepEqual(out.body, { status: 'error', code: 'SEARCH_UNAVAILABLE', message: 'Search is temporarily unavailable. Please try again.' });
  const log = JSON.stringify(m.sent.filter((x) => x.log));
  assert.ok(log.includes('42P01') && !log.includes('secretterm') && !log.includes('learning_courses'), log);
});
test('handler: the viewer is the session only; a suspended session is a guest; $1 is always that viewer', async () => {
  const seen = [];
  let m = mk({ session: async () => ({ id: '42', is_active: true, account_status: 'ACTIVE' }), rows: (sql, p) => { seen.push(p[0]); return []; } });
  await m.h.handle(req({ authorization: 'Bearer t', 'x-user-id': '7' }), res(), url('q=ab'));
  assert.deepEqual([...new Set(seen)], [42]); assert.equal(m.sent[0].body.viewer, 'session');
  seen.length = 0;
  m = mk({ session: async () => ({ id: '42', is_active: true, account_status: 'SUSPENDED' }), rows: (sql, p) => { seen.push(p[0]); return []; } });
  await m.h.handle(req({ authorization: 'Bearer t' }), res(), url('q=ab'));
  assert.deepEqual([...new Set(seen)], [0]); assert.equal(m.sent[0].body.viewer, 'guest');
});
test('handler: JS re-checks drop rows the SQL should already have excluded; codes issued only for survivors', async () => {
  const issued = [];
  const rows = (sql) => {
    if (sql === SQL.product) return [
      { internal_key: '1', name: 'Ok mug', status: 'published', vendor_status: 'active', price: 10, mrp: 12, in_stock: true, is_active: true, account_status: 'ACTIVE' },
      { internal_key: '2', name: 'Draft', status: 'draft', vendor_status: 'active', is_active: true },
      { internal_key: '3', name: 'Rejected', status: 'published', vendor_status: 'active', moderation_status: 'REJECTED', is_active: true },
      { internal_key: '4', name: 'Suspended owner', status: 'published', vendor_status: 'active', is_active: true, account_status: 'SUSPENDED' },
    ];
    if (sql === SQL.person) return [{ public_username: 'ok_user', display_name: 'Ok' }, { public_username: '12345678', display_name: 'Numeric' }, { public_username: 'x_user', display_name: 'Susp', account_status: 'SUSPENDED' }, { public_username: 'hid_user', display_name: 'H', discoverable: false }];
    if (sql === SQL.worker) return [{ worker_code: 'HOWDI-WRK-1', full_name: 'W', has_member: false }, { worker_code: '99999999', full_name: 'N' }, { worker_code: 'HOWDI-WRK-2', full_name: 'S', has_member: true, account_status: 'SUSPENDED' }];
    if (sql === SQL.course) return [{ internal_key: 'u-1', title: 'C', is_active: true, publish_status: 'PUBLISHED' }, { internal_key: 'u-2', title: 'D', is_active: true, publish_status: 'DRAFT' }];
    return [];
  };
  const m = mk({ rows, issue: async (type, keys) => { issued.push([type, keys]); return new Map(keys.map((k) => [String(k), (type === 'PRODUCT' ? 'PRD-' : 'CRS-') + 'ABCDEF012345'])); } });
  await m.h.handle(req(), res(), url('q=ab&limit=10'));
  const body = m.sent[0].body;
  assert.deepEqual(body.results.map((x) => x.title), ['Ok', 'Ok mug', 'W', 'C']);
  assert.deepEqual(issued, [['PRODUCT', ['1']], ['COURSE', ['u-1']]]);
  assert.ok(body.results.every((x) => JSON.stringify(Object.keys(x)) === JSON.stringify([...S.DTO_KEYS])));
  assert.ok(!/"(1|2|3|4|u-1|u-2)"/.test(JSON.stringify(body.results)), 'internal keys never leave');
});
test('handler: a malformed code from the registry is never used as a route', async () => {
  const m = mk({ rows: (sql) => (sql === SQL.product ? [{ internal_key: '1', name: 'Mug', status: 'published', is_active: true }] : []), issue: async () => new Map([['1', '12345']]) });
  await m.h.handle(req(), res(), url('q=ab&types=product'));
  assert.deepEqual(m.sent[0].body.results, []);
});
test('handler: fixed caps — fetches limit+1 and reports has_more, never a cursor', async () => {
  const caps = [];
  const m = mk({ rows: (sql, p) => { caps.push(p[4]); return sql === SQL.person ? Array.from({ length: p[4] }, (_, i) => ({ public_username: 'user_' + i, display_name: 'U' + i })) : []; } });
  await m.h.handle(req(), res(), url('q=ab&limit=3'));
  assert.deepEqual([...new Set(caps)], [4]);
  const b = m.sent[0].body;
  assert.equal(b.results.length, 3); assert.equal(b.has_more.person, true); assert.equal(b.has_more.product, false);
  assert.deepEqual(Object.keys(b), ['status', 'viewer', 'query', 'results', 'has_more']);
});
test('handler: rate limit — 429 with Retry-After, per session user or per guest IP', async () => {
  const keys = [];
  let m = mk({ rateLimit: (k, max) => { keys.push([k, max]); return { allowed: false, retryAfterMs: 5000 }; } }); let r = res();
  await m.h.handle(req(), r, url('q=ab'));
  assert.equal(m.sent[0].status, 429); assert.equal(r.h['retry-after'], '5'); assert.equal(m.calls.length, 0);
  m = mk({ session: async () => ({ id: 9 }), rateLimit: (k, max) => { keys.push([k, max]); return { allowed: true }; } });
  await m.h.handle(req({ authorization: 'Bearer t' }), res(), url('q=ab'));
  assert.deepEqual(keys, [['k5b-search:ip:10.0.0.1', S.RATE.GUEST], ['k5b-search:user:9', S.RATE.USER]]);
});

// ------------------------------------------------------------------ wiring and scope pins
test('server.js wires search after the K5A handler and before the request logger; reuses the K5A ref issuer', () => {
  const iK5a = SERVER.indexOf('if (await connectHomeK5A.handle(req, res, url)) return;');
  const iK5b = SERVER.indexOf('if (await searchK5B.handle(req, res, url)) return;');
  const iLog = SERVER.indexOf('`${req.method} ${req.url}`');
  assert.ok(iK5a > 0 && iK5b > iK5a && iLog > iK5b, 'order: K5A → K5B → request logger');
  assert.match(SERVER, /issuePublicRefs: connectHomeK5A\._internal\.issueRefs/);
  assert.equal((SERVER.match(/require\("\.\/search-k5b\.cjs"\)/g) || []).length, 1);
});
test('scope: no legacy search reuse, no schema change, no cursor, no UI', () => {
  assert.ok(!/\/api\/users\/search|mention-search/.test(SRC.replace(/\/\/.*$/gm, '')), 'legacy /api/users/search is never called');
  assert.ok(!/CREATE TABLE|ALTER TABLE|INSERT INTO|UPDATE |DELETE FROM/i.test(SRC.replace(/\/\/.*$/gm, '')), 'no schema or write SQL in the module');
  assert.ok(!/cursor|offset/i.test(SRC.replace(/\/\/.*$/gm, '').replace(/'cursor'|cursor \(/g, '')), 'no cursor/offset pagination');
  const uiRefs = fs.readFileSync(path.join(__dirname, '../../apps/customer/src/App.jsx'), 'utf8');
  assert.ok(!/\/api\/search\b/.test(uiRefs), 'Part 1 does not wire any UI to /api/search');
});
