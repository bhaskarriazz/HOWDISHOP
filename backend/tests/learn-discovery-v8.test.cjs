// P8 Learn Discovery (LRN-DISC-001/002, TG-LRN-01/02) — pure query-layer tests (no database).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const D = require('../learn-discovery-v8.cjs');
const P = (qs) => new URLSearchParams(qs);
const LANGS = ['English', 'Telugu', 'Hindi'];
const PUB = `c.is_active AND c.publish_status='PUBLISHED'`;
const placeholders = (sql) => new Set([...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])));

test('filters accept only allowed values, dedupe, keep canonical casing and cap list length', () => {
  const f = D.parseDiscoveryQuery(P('goal=certificate&goal=CERTIFICATE&goal=earn-money&level=Beginner,advanced,expert&price=free&price=gratis&skill=cooking&format=video,live,vr&time=under1h&materials=none&lang=telugu&lang=Klingon'), { languages: LANGS });
  assert.deepEqual(f.goal, ['certificate']);
  assert.deepEqual(f.level, ['beginner', 'advanced']);
  assert.deepEqual(f.price, ['free']);
  assert.deepEqual(f.skill, ['Cooking']);
  assert.deepEqual(f.format, ['video', 'live']);
  assert.deepEqual(f.time, ['under1h']);
  assert.deepEqual(f.materials, ['none']);
  assert.deepEqual(f.lang, ['Telugu'], 'languages validated against the published catalogue list');
  const allSkills = new URLSearchParams(); for (const c of D.CATEGORIES) allSkills.append('skill', c);
  const many = D.parseDiscoveryQuery(allSkills, {});
  assert.equal(many.skill.length, 7);
});

test('sort, limit and offset are bounded; relevance only exists with a query', () => {
  assert.equal(D.parseDiscoveryQuery(P('')).sort, 'newest');
  assert.equal(D.parseDiscoveryQuery(P('q=yarn')).sort, 'relevance');
  assert.equal(D.parseDiscoveryQuery(P('sort=relevance')).sort, 'newest');
  assert.equal(D.parseDiscoveryQuery(P('sort=price_low&q=x')).sort, 'price_low');
  assert.equal(D.parseDiscoveryQuery(P('sort=drop table')).sort, 'newest');
  const f = D.parseDiscoveryQuery(P('limit=999&offset=-4'));
  assert.equal(f.limit, D.MAX_LIMIT); assert.equal(f.offset, 0);
  assert.equal(D.parseDiscoveryQuery(P('limit=abc&offset=99999999')).offset, 5000);
  assert.equal(D.parseDiscoveryQuery(P('limit=abc')).limit, D.DEFAULT_LIMIT);
  assert.equal(D.parseDiscoveryQuery(P('q=' + 'x'.repeat(200))).q.length, 60);
});

test('user text never enters SQL text; every value is a positional parameter', () => {
  const evil = "'; DROP TABLE learning_courses; --";
  const f = D.parseDiscoveryQuery(P(`q=${encodeURIComponent(evil)}&lang=${encodeURIComponent(evil)}&skill=Cooking&sort=learners`), { languages: LANGS });
  const s = D.buildDiscoverySql(f, { published: PUB });
  for (const sql of [s.listSql, s.countSql]) { assert.ok(!sql.includes('DROP TABLE')); assert.ok(!sql.includes('Cooking')); }
  assert.ok(s.listParams.some((p) => typeof p === 'string' && p.includes('drop table')), 'query text travels as a parameter');
  assert.equal(Math.max(...placeholders(s.listSql)), s.listParams.length);
  assert.equal(Math.max(...placeholders(s.countSql)), s.countParams.length);
});

test('LIKE wildcards in the query are literal', () => {
  const s = D.buildDiscoverySql(D.parseDiscoveryQuery(P('q=100%_off')), { published: PUB });
  assert.equal(s.listParams[0], '%100\\%\\_off%');
  assert.ok(s.listSql.includes("ESCAPE '\\'"));
  assert.ok(!s.listSql.includes("'%'||"), 'ranking also uses the escaped pattern');
});

test('published predicate is always applied and count/list share the same WHERE', () => {
  for (const qs of ['', 'q=yarn', 'goal=sell&price=over2000&time=over3h&materials=list&format=reading']) {
    const s = D.buildDiscoverySql(D.parseDiscoveryQuery(P(qs), { languages: LANGS }), { published: PUB });
    const where = (sql) => sql.split(' WHERE ')[1].split(/ ORDER BY | LIMIT /)[0];
    assert.ok(s.listSql.includes(`WHERE ${PUB}`)); assert.ok(s.countSql.includes(`WHERE ${PUB}`));
    assert.equal(where(s.countSql).trim(), where(s.listSql).trim(), qs);
  }
});

test('search covers course, skill, outcomes, lesson/project text and teacher handle; real names only for public profiles', () => {
  const s = D.buildDiscoverySql(D.parseDiscoveryQuery(P('q=anika')), { published: PUB });
  for (const col of ['c.title', 'c.tagline', 'c.description', 'c.category', 'c.outcomes::text', 'dl.title', 'dl.practice_task', 'dp.public_username', 'du.full_name']) assert.ok(s.listSql.includes(col), col);
  assert.match(s.listSql, /COALESCE\(dp\.discoverable,TRUE\) AND COALESCE\(dp\.private_profile,FALSE\)=FALSE AND LOWER\(COALESCE\(du\.full_name/);
});

test('filter semantics map to real columns (OR within a filter, AND across filters)', () => {
  const s = D.buildDiscoverySql(D.parseDiscoveryQuery(P('goal=certificate,project&price=free,over2000&format=live')), { published: PUB });
  assert.match(s.listSql, /\(c\.certificate_enabled IS NOT FALSE OR \(CASE WHEN c\.v8_project_declared_at IS NOT NULL THEN c\.project_required IS TRUE ELSE \(c\.project_required IS TRUE OR EXISTS\(/);
  assert.match(s.listSql, /\(COALESCE\(c\.sale_price, c\.price, 0\) <= 0 OR COALESCE\(c\.sale_price, c\.price, 0\) > 2000\)/);
  assert.match(s.listSql, /\(c\.live_class_included IS TRUE\)/);
  const sell = D.buildDiscoverySql(D.parseDiscoveryQuery(P('goal=sell')), { published: PUB });
  assert.ok(sell.listSql.includes('c.v8_sell_goal IS TRUE'), 'sell is the teacher-declared goal');
  assert.ok(!sell.listParams.includes('Business & Selling') && !/c\.category\s*=/.test(sell.listSql), 'goal never derives from a category name');
});

test('applied filters echo only what survived validation', () => {
  const f = D.parseDiscoveryQuery(P('lang=Klingon&level=beginner&q=yarn'), { languages: LANGS });
  assert.deepEqual(D.appliedFilters(f), { q: 'yarn', level: ['beginner'], sort: 'relevance' });
});

test('course card and list endpoint carry no internal ids and stay published-only', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'learn-v8.cjs'), 'utf8');
  const list = src.slice(src.indexOf("if (p === '/api/v8/learn/courses' && req.method === 'GET')"), src.indexOf("if ((m = p.match(/^\\/api\\/v8\\/learn\\/courses\\/(CRS-"));
  assert.match(list, /c\.is_active AND c\.publish_status='PUBLISHED'/);
  const card = src.slice(src.indexOf('async function courseCard('), src.indexOf("const published ="));
  assert.doesNotMatch(card, /\bid: c\.id|course_id:|user_id:|teacher_id:/);
  assert.match(card, /preview_lesson: kinds\.preview \? await code\('LLSN'/, 'preview lesson exposed only as a public LSN code');
});

test('save endpoint is session-authoritative and private', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'learn-v8.cjs'), 'utf8');
  const save = src.slice(src.indexOf("if (m[2] === 'save' && req.method === 'POST')"), src.indexOf("if (m[2] === 'enroll' && req.method === 'POST')"));
  assert.match(save, /if \(!uid\) \{ fail\(res, 401, 'SIGN_IN_REQUIRED'/);
  assert.match(save, /\[uid, c\.id\]/);
  assert.doesNotMatch(save, /b\.user|b\.uid|searchParams/);
});

test('P8 correction 2 (legacy courses): project is affirmative evidence only (explicit TRUE or a real practice task), never NULL/missing', () => {
  const s = D.buildDiscoverySql(D.parseDiscoveryQuery(P('goal=project')), { published: PUB });
  assert.ok(s.listSql.includes("ELSE (c.project_required IS TRUE OR EXISTS(SELECT 1 FROM learning_course_modules pm JOIN learning_course_lessons pl ON pl.module_id=pm.id WHERE pm.course_id=c.id AND pm.is_active AND pl.is_active AND COALESCE(TRIM(pl.practice_task),'')<>''))"));
  assert.ok(!s.listSql.includes('project_required IS NOT FALSE'));
  const srcs = ['learn-v8.cjs', 'learn-journey-v8.cjs', 'learn-discovery-v8.cjs'].map((f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
  for (const src of srcs) { assert.ok(!/project_required\s*!==\s*false/.test(src)); assert.ok(!/project_required IS NOT FALSE/.test(src)); }
  const card = srcs[0].slice(srcs[0].indexOf('async function courseCard('), srcs[0].indexOf('const published ='));
  assert.match(card, /const project = taxonomy\.projectOf\(c, kinds\.practice === true\)\.has;/);
  assert.match(card, /BOOL_OR\(COALESCE\(TRIM\(l\.practice_task\),''\)<>''\) practice/);
  const journey = srcs[1];
  assert.match(journey, /async function hasProject\(c\) \{[\s\S]*?return taxonomy\.projectOf\(c, practice\)\.has;/);
  assert.match(journey, /const project = await hasProject\(c\);/);
  assert.match(journey, /if \(!\(await hasProject\(c\)\)\) \{ fail\(res, 409, 'NO_PROJECT'/);
});
