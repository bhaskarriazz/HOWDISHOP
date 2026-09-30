// K5A Connect Home Phase 1 — unit tests for the public contracts, the cursor box, the CTA sanitizer and static SQL pins.
// No database, no server:  node --test backend/tests/k5a-home.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const K = require('../connect-home-k5a.cjs');

const fakeDeps = (over = {}) => ({
  pool: { query: async () => ({ rows: [] }) }, getSessionUserFromRequest: async () => null, sendJSON: () => {},
  connectPostVisibleSql: (a, v) => `(${a}.user_id=${v} OR TRUE)`, k5ePrivateProfileOkSql: (o, v) => `(${o}=${v})`, logger: { error() {}, warn() {} }, ...over,
});

test('16 frozen sections, above-fold subset and personal-only sections', () => {
  assert.equal(K.SECTION_KEYS.length, 16);
  assert.deepEqual(K.ABOVE_FOLD, ['special', 'hero', 'stories', 'forYou', 'vibes']);
  assert.deepEqual(K.PERSONAL_ONLY, ['continueWatching', 'recentActivity', 'continueYourJourney']);
  for (const k of K.SECTION_KEYS) assert.ok(K.SECTION_TITLES[k], k);
});

test('public reference prefixes are distinct per type', () => {
  assert.deepEqual(K.REF_PREFIX, { POST: 'PST', ARTICLE: 'ART', STORY: 'STY', PRODUCT: 'PRD', COURSE: 'CRS' });
  for (const ok of ['PST-0123456789AB', 'ART-ABCDEF012345', 'STY-000000000000', 'PRD-FFFFFFFFFFFF', 'CRS-A1B2C3D4E5F6']) assert.match(ok, K.PUBLIC_CODE_RE);
  for (const bad of ['POST-0123456789AB', 'PST-0123456789ab', 'PST-123', '123', '3f2504e0-4f89-11d3-9a0c-0305e82c3301', 'PST-0123456789ABC']) assert.doesNotMatch(bad, K.PUBLIC_CODE_RE);
});

test('feed item DTO: exact public shape, no internal keys, correct route per type', () => {
  const row = { internal_key: 7731, post_type: 'POST', content: 'Hello\nworld', has_media: false, public_username: 'asha_clay', display_name: 'Asha', avatar: 'https://cdn.x/a.png',
    reaction_count: 3, comment_count: 1, from_followed: true, published_at: '2026-09-20T10:00:00Z', user_id: 9, howdi_id: 'HWD-1', email: 'a@b.c', score: 99, post_status: 'PUBLISHED' };
  const d = K.feedItemDto(row, 'PST-0123456789AB');
  assert.deepEqual(Object.keys(d), ['type', 'public_key', 'author', 'content', 'counts', 'from_followed', 'published_at', 'route']);
  assert.equal(d.route, '/posts/PST-0123456789AB');
  assert.deepEqual(d.author, { public_username: 'asha_clay', display_name: 'Asha', avatar_url: 'https://cdn.x/a.png' });
  const t = JSON.stringify(d);
  for (const leak of ['7731', 'HWD-1', 'a@b.c', '99', 'PUBLISHED', '"user_id"']) assert.ok(!t.includes(leak), leak);
  assert.equal(K.feedItemDto({ ...row, post_type: 'ARTICLE', article_title: 'T' }, 'ART-0123456789AB').route, '/articles/ART-0123456789AB');
  assert.equal(K.authorDto({ public_username: '1234567' }), null, 'digits-only handles are never an identity');
  assert.equal(K.authorDto({ public_username: 'Asha' }), null, 'usernames are lower-case');
});

test('stripInternalKeys removes identity/score/status keys at any depth', () => {
  const out = K.stripInternalKeys({ a: 1, sections: { x: { items: [{ id: 1, user_id: 2, score: 3, entity_key: '4', public_key: 'PST-0123456789AB', nested: { masterId: 'm', email: 'e', status: 's' } }] } } });
  assert.deepEqual(out, { a: 1, sections: { x: { items: [{ public_key: 'PST-0123456789AB', nested: {} }] } } });
});

test('media URLs: http(s), same-site paths and small inline media only', () => {
  assert.equal(K.mediaUrl('https://cdn.example/a.jpg'), 'https://cdn.example/a.jpg');
  assert.equal(K.mediaUrl('/uploads/a.jpg'), '/uploads/a.jpg');
  for (const bad of ['javascript:alert(1)', '//evil.example/x.png', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,' + 'A'.repeat(20000), ' "><img', 'ftp://x/y']) assert.equal(K.mediaUrl(bad), null, bad);
  assert.equal(K.mediaUrl('data:image/png;base64,QUFB'), 'data:image/png;base64,QUFB');
});

test('admin CTA → safe route (allow-listed in-app routes or https only)', () => {
  assert.deepEqual(K.safeCta('Shop', '/shop/catalogue'), { label: 'Shop', route: '/shop/catalogue', external: false });
  assert.deepEqual(K.safeCta('Read', '/articles/ART-0123456789AB'), { label: 'Read', route: '/articles/ART-0123456789AB', external: false });
  assert.deepEqual(K.safeCta('Profile', '/@asha_clay'), { label: 'Profile', route: '/@asha_clay', external: false });
  assert.deepEqual(K.safeCta('Festival', 'https://howdi.in/festival'), { label: 'Festival', route: 'https://howdi.in/festival', external: true });
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', '//evil.com', 'http://howdi.in', 'https://user:pw@evil.com/', '/users/123/edit', 'shop', '/shop/../admin', 'data:text/html,x', '/@Asha']) assert.equal(K.safeCta('x', bad), null, bad);
  assert.equal(K.safeCta('', '/shop'), null);
});

test('cursor box: AES-GCM opaque, tamper-evident, key-bound, viewer key is keyed', () => {
  const box = K.createCursorBox({ key: 'k'.repeat(40) });
  const t = box.seal({ s: '00000000-0000-4000-8000-000000000000', p: 10, v: 'abc' });
  assert.match(t, /^hc1\.[A-Za-z0-9_-]+$/);
  const plain = Buffer.from(t.slice(4), 'base64url').toString('latin1');
  assert.ok(!/"p"|"s"|00000000|10/.test(plain), 'ciphertext reveals nothing');
  assert.equal(box.open(t).p, 10);
  assert.notEqual(box.seal({ p: 10 }), box.seal({ p: 10 }), 'fresh IV per token');
  const flipped = t.slice(0, 12) + (t[12] === 'A' ? 'B' : 'A') + t.slice(13);
  assert.equal(box.open(flipped), null);
  assert.equal(box.open(t.slice(0, -2)), null);
  assert.equal(K.createCursorBox({ key: 'x'.repeat(40) }).open(t), null, 'other key cannot open');
  for (const bad of ['', 'abc', '5', 'hc1.', 'hc1.' + 'A'.repeat(500), null, 42]) assert.equal(box.open(bad), null);
  assert.match(box.viewerKey(0), /^[0-9a-f]{64}$/);
  assert.notEqual(box.viewerKey(0), box.viewerKey(7));
  assert.ok(!box.viewerKey(7).includes('7'.repeat(3)));
});

test('cursor key policy: required outside development, never a predictable fallback', () => {
  assert.deepEqual(K.resolveCursorKey({ HOWDI_HOME_CURSOR_KEY: 'z'.repeat(32), NODE_ENV: 'production' }), { key: 'z'.repeat(32), mode: 'configured' });
  for (const env of ['production', 'staging', 'prod']) assert.deepEqual(K.resolveCursorKey({ NODE_ENV: env }), { key: null, mode: 'missing' }, env);
  assert.deepEqual(K.resolveCursorKey({ NODE_ENV: 'production', HOWDI_HOME_CURSOR_KEY: 'short' }), { key: null, mode: 'missing' });
  const a = K.resolveCursorKey({ NODE_ENV: 'development' }), b = K.resolveCursorKey({});
  assert.equal(a.mode, 'ephemeral-dev'); assert.equal(b.mode, 'ephemeral-dev');
  assert.notEqual(a.key, b.key, 'development keys are random per process, not derived from anything predictable');
  const svc = K.createConnectHomeK5A(fakeDeps({ env: { NODE_ENV: 'production' } }));
  assert.equal(svc.keyMode, 'missing');
});

test('static SQL: bound parameters only; visibility, block and audience predicates are present', () => {
  const svc = K.createConnectHomeK5A(fakeDeps({ env: { HOWDI_HOME_CURSOR_KEY: 'q'.repeat(40) } }));
  const SQL = svc._internal.SQL;
  for (const [name, sql] of Object.entries(SQL)) {
    const text = typeof sql === 'function' ? sql(true) + sql(false) : sql;
    assert.ok(!/\$\{/.test(text), `${name} has a template hole`);
    assert.ok(!/SELECT\s+\*/i.test(text), `${name} uses SELECT *`);
    for (const p of text.match(/\$\d+/g) || []) assert.ok(['$1', '$2'].includes(p), `${name} uses ${p}`);
  }
  assert.match(SQL.feedCandidates, /post_status='PUBLISHED'/); assert.match(SQL.feedCandidates, /subscribers_only,FALSE\)=FALSE/); assert.match(SQL.feedCandidates, /subscriber_only,FALSE\)=FALSE/);
  assert.match(SQL.feedCandidates, /\$1::bigint=0 AND COALESCE\(p\.audience_scope,'EVERYONE'\)='EVERYONE'/, 'guests see EVERYONE posts only');
  assert.match(SQL.feedCandidates, /ORDER BY .* DESC, p\.created_at DESC, p\.id DESC/s, 'deterministic tie-break');
  for (const k of ['feedCandidates', 'postsByKeys', 'heroFallback', 'trendingArticles', 'stories', 'vibes', 'continueWatching', 'communities', 'shop', 'works', 'recentActivity']) assert.match(SQL[k], /howdi_connect_profile_blocks/, `${k} block filter`);
  assert.match(SQL.people(true), /howdi_connect_profile_blocks/);
  for (const k of ['feedCandidates', 'stories', 'vibes']) { assert.match(SQL[k], /discoverable,TRUE\)=TRUE/); assert.match(SQL[k], /account_status,'ACTIVE'\)\)='ACTIVE'/); }
  assert.match(SQL.people(false), /private_profile,FALSE\)=FALSE/);
  assert.match(SQL.shop, /p\.status='published' AND p\.archived_at IS NULL/); assert.match(SQL.shop, /'APPROVED'\)='APPROVED'/); assert.match(SQL.shop, /COALESCE\(v\.status,'active'\)='active'/);
  assert.match(SQL.works, /kyc_status\)\)='verified'/); assert.match(SQL.works, /skill_status\)\)='verified'/); assert.match(SQL.works, /customer_visible=TRUE/);
  assert.match(SQL.learn, /is_active=TRUE AND c\.publish_status='PUBLISHED'/); assert.match(SQL.continueJourney, /publish_status='PUBLISHED'/);
  assert.match(SQL.continueWatching, /v\.status='published' AND v\.visibility='public' AND v\.deleted_at IS NULL/);
  assert.match(SQL.continueWatching, /wsi\.user_id=\$1::text/);
  assert.ok(!/\$1(?!::)/.test(SQL.continueWatching.replace(/\$1::(text|bigint)/g, '')), 'every $1 use is explicitly cast (no bigint=text inference errors)');
  assert.match(SQL.recentActivity, /n\.user_id=\$1::bigint/);
  assert.match(SQL.storyByKey, /s\.id=\$2::bigint AND s\.expires_at>NOW\(\)/);
  assert.doesNotMatch(SQL.works, /pincode|phone|email/);
});

test('public references are issued only after the visibility gates, never for filtered rows', () => {
  const src = fs.readFileSync(path.join(__dirname, '../connect-home-k5a.cjs'), 'utf8');
  // every issueRefs call is fed from rows that already passed SQL + a JS gate
  assert.match(src, /const ok = rows\.filter\(\(r\) => postOk\(r, viewerId\)\);[\s\S]{0,400}issueRefs\('POST', posts\.map/);
  assert.match(src, /\.rows\.filter\(authorOk\);\s*const refs = await issueRefs\('STORY'/);
  assert.match(src, /\.rows\.filter\(shopRowVisible\);\s*const refs = await issueRefs\('PRODUCT'/);
  const calls = src.match(/issueRefs\('([A-Z]+)'/g);
  assert.deepEqual([...new Set(calls)].sort(), ["issueRefs('ARTICLE'", "issueRefs('COURSE'", "issueRefs('POST'", "issueRefs('PRODUCT'", "issueRefs('STORY'"]);
});

test('server.js: guard lets guests reach Home; module dispatched after the session guard; old handler removed', () => {
  const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const privateRe = server.slice(server.indexOf('const K5E_PRIVATE_GET_RE'), server.indexOf('async function k5eConnectGuard'));
  assert.ok(!/\(\?:home\|/.test(privateRe), 'home is no longer a sign-in-only read');
  const guard = server.indexOf('if (await k5eLegacyNotificationGuard(req, res, url)) return;');
  const hook = server.indexOf('if (await connectHomeK5A.handle(req, res, url)) return;');
  assert.ok(guard > 0 && hook > guard && hook - guard < 400);
  assert.ok(!server.includes('if (req.method === "GET" && pathname === "/api/connect/home") {'), 'legacy in-line Home handler is gone');
  assert.match(server, /await ensureConnectHomeV166K5ASchema\(\);\n\s+await connectHomeK5A\.ensureSchema\(\);/);
  assert.ok(server.includes('if (req.method === "GET" && pathname === "/api/connect/feed") {'), 'legacy /api/connect/feed is untouched');
});

test('frontend: one Home render, Home opens Connect Home, public keys drive React keys', () => {
  const app = fs.readFileSync(path.join(__dirname, '../../apps/customer/src/App.jsx'), 'utf8');
  assert.equal((app.match(/renderConnectHomeFeed\(\)/g) || []).length, 1, 'Connect Home is rendered exactly once');
  assert.match(app, /if\(next==="home"&&view!=="crochet"\)return openNavigationOSArea\("connect","home"\);/);
  const render = app.slice(app.indexOf('const renderConnectHomeFeed = () => {'), app.indexOf('return (\n    <div className="howdi-app"'));
  assert.ok(!/key=\{[a-z]+\.id\}|key=\{[a-z]+\.(vibeId|course_id)\}/.test(render), 'no internal id used as a React key');
  assert.ok(!/openProductDetails\(/.test(render), 'Home cards never open products by internal id');
  assert.match(render, /\/api\/connect\/home\/feed|loadConnectHomeForYouMore/);
  assert.match(app, /\/api\/connect\/home\/feed\?cursor=/);
  assert.ok(!/forYouCursor/.test(app), 'old readable cursor parameter is gone from the client');
});
