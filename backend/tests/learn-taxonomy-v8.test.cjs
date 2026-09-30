// P8 decision closure — Learn taxonomy (project, goals, learner support), teacher authoring contract, Show My Work
// audit/lifecycle contract and LRN-NAV-001. Pure tests (no database); PostgreSQL behaviour is in tests/v8-pg/14-learn-p8.cjs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const T = require('../learn-taxonomy-v8.cjs');
const text = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const read = (...p) => text(path.join(__dirname, '..', ...p));

test('project: the teacher answer decides; legacy courses keep the affirmative-evidence rule', () => {
  const at = '2026-09-30T00:00:00Z';
  assert.deepEqual(T.projectOf({ v8_project_declared_at: at, project_required: true }, false), { has: true, declared: true });
  assert.deepEqual(T.projectOf({ v8_project_declared_at: at, project_required: false }, true), { has: false, declared: true }, 'declared No wins over a practice task');
  assert.deepEqual(T.projectOf({ project_required: true }, false), { has: true, declared: false });
  assert.deepEqual(T.projectOf({ project_required: false }, true), { has: true, declared: false });
  assert.deepEqual(T.projectOf({ project_required: null }, false), { has: false, declared: false }, 'NULL is never positive');
  assert.deepEqual(T.projectOf({}, undefined), { has: false, declared: false });
  const sql = T.projectSql('c');
  assert.match(sql, /^\(CASE WHEN c\.v8_project_declared_at IS NOT NULL THEN c\.project_required IS TRUE ELSE \(c\.project_required IS TRUE OR EXISTS\(/);
  assert.doesNotMatch(sql, /IS NOT FALSE/);
});

test('goals: a closed list backed by course facts, never by a category name', () => {
  assert.deepEqual(T.GOAL_VALUES, ['certificate', 'project', 'sell']);
  for (const g of T.GOAL_VALUES) { const sql = T.goalSql(g); assert.ok(sql); assert.doesNotMatch(sql, /category/i, g); }
  assert.equal(T.goalSql('earn-money'), null);
  assert.match(T.goalSql('sell'), /c\.v8_sell_goal IS TRUE AND \(CASE WHEN/, 'selling needs a project');
  const c = { certificate_enabled: null, v8_sell_goal: true };
  assert.deepEqual(T.goalsOf(c, true), ['certificate', 'project', 'sell']);
  assert.deepEqual(T.goalsOf(c, false), ['certificate'], 'no project → neither project nor sell');
  assert.deepEqual(T.goalsOf({ certificate_enabled: false, v8_sell_goal: false }, true), ['project']);
});

test('learner support: factual capabilities only', () => {
  assert.deepEqual(T.SUPPORT_VALUES, ['live_class', 'certificate', 'teacher_review']);
  assert.deepEqual(T.supportOf({ live_class_included: true, certificate_enabled: true, v8_teacher_user_id: 7 }, true), ['live_class', 'certificate', 'teacher_review']);
  assert.deepEqual(T.supportOf({ live_class_included: false, certificate_enabled: false, v8_teacher_user_id: 7 }, false), []);
  assert.deepEqual(T.supportOf({ certificate_enabled: true, v8_teacher_user_id: null }, true), ['certificate'], 'no V8 teacher → nobody reviews shared work');
});

test('authoring: the project question has no default; selling needs a project', () => {
  assert.deepEqual(T.authoringChoice({}).project, null);
  assert.ok(T.authoringChoice({}).errors.length);
  assert.ok(T.authoringChoice({ project_required: 'true' }).errors.length, 'strings are not answers');
  assert.deepEqual(T.authoringChoice({ project_required: false }), { project: false, sell: false, errors: [] });
  assert.deepEqual(T.authoringChoice({ project_required: true, sell_goal: true }), { project: true, sell: true, errors: [] });
  assert.ok(T.authoringChoice({ project_required: false, sell_goal: true }).errors.some((e) => /selling course needs/.test(e)));
  assert.ok(T.authoringChoice({ project_required: true, sell_goal: 'yes' }).errors.length);
});

test('teacher create + confirm write the answer explicitly and protect shared work', () => {
  const src = read('learn-v8.cjs');
  assert.match(src, /project_required,v8_sell_goal,v8_project_declared_at\) VALUES\([^)]*\$15,\$16,NOW\(\)\)/);
  assert.match(src, /choice\.project, choice\.sell\]\)\)\.rows\[0\]\.id;/);
  assert.match(src, /const bad = \[!title && 'title', \.\.\.choice\.errors,/);
  const confirm = src.slice(src.indexOf("if (m[2] === 'project' && req.method === 'POST')"), src.indexOf("if (m[2] && req.method === 'POST')"));
  assert.match(confirm, /if \(!choice\.project && shared\) \{ fail\(res, 409, 'WORK_EXISTS'/);
  assert.match(confirm, /v8_project_declared_at=NOW\(\)/);
  assert.match(src, /SELECT \* FROM learning_courses WHERE id=\$1 AND v8_teacher_user_id=\$2 AND is_active/, 'only the owning teacher');
  assert.doesNotMatch(src, /ALTER COLUMN project_required/, 'the legacy default is not migrated');
});

test('client mirrors the taxonomy labels and the authoring form has no preselected project answer', () => {
  const client = text(path.join(__dirname, '..', '..', 'apps', 'customer', 'src', 'v8', 'learn', 'learnDiscovery.js'));
  for (const g of T.GOALS) assert.ok(client.includes(`["${g.value}", "${g.label}"]`), g.value);
  for (const x of T.SUPPORT) assert.ok(client.includes(`["${x.value}", "${x.label}"]`), x.value);
  const learn = text(path.join(__dirname, '..', '..', 'apps', 'customer', 'src', 'v8', 'learn', 'V8Learn.jsx'));
  assert.match(learn, /project_required: null, sell_goal: false/);
  assert.match(learn, /typeof f\.project_required !== "boolean"/);
});

test('Show My Work contract: audited transitions, race-safe shares, lifecycle guards, private media', () => {
  const src = read('learn-journey-v8.cjs');
  assert.match(src, /CREATE TABLE IF NOT EXISTS howdi_v8_learn_work_events/);
  const submit = src.slice(src.indexOf("if (req.method === 'POST') {\n          if (H.limited"), src.indexOf('if ((m = p.match(/^\\/api\\/v8\\/learn\\/work\\/'));
  assert.match(submit, /BEGIN[\s\S]*INSERT INTO howdi_v8_learn_work\([\s\S]*event\(client, row\.id, uid, 'learner', 'submitted'\)[\s\S]*COMMIT/);
  assert.match(submit, /H\.deletePrivate\(saved\.file\)/, 'a refused/failed share leaves no stored file');
  assert.match(submit, /e\.code === '23505'\) \{ fail\(res, 409, 'AWAITING_REVIEW'/);
  const review = src.slice(src.indexOf('/review$/)) && req.method === \'POST\')'));
  assert.match(review, /WHERE w\.id=\$1 AND c\.is_active/);
  assert.match(review, /if \(!\(await entitled\(Number\(w\.user_id\), w\.course_id\)\)\) \{ fail\(res, 409, 'NOT_ENROLLED'/);
  assert.match(review, /BEGIN[\s\S]*UPDATE howdi_v8_learn_work SET status=\$2[\s\S]*event\(client, r\.id, uid, 'teacher', decision\)[\s\S]*COMMIT/);
  const media = src.slice(src.indexOf('/media$/)) && req.method === \'GET\')'), src.indexOf('/api\\/v8\\/learn\\/teach\\/courses\\/(CRS-'));
  assert.match(media, /Number\(w\.user_id\) === uid \|\| Number\(w\.v8_teacher_user_id\) === uid/);
  assert.match(media, /'Cache-Control', 'private, no-store'/);
  assert.doesNotMatch(src, /media_file:|actor_user_id:/, 'no storage names or actor ids in responses');
});

test('LRN-NAV-001: three learner tabs with a current tab, Teach as a separate entry, routes unchanged', () => {
  const learn = text(path.join(__dirname, '..', '..', 'apps', 'customer', 'src', 'v8', 'learn', 'V8Learn.jsx'));
  assert.match(learn, /\["discover", "Discover", "courses", "search"\], \["mine", "My learning", "mine", "learn"\], \["live", "Live & Passport", "\/learn\/live", "live", "Live"\]\];/);
  assert.match(learn, /aria-current=\{section === id \? "page" : undefined\}/);
  assert.match(learn, /className=\{`v8l-teach/);
  assert.doesNotMatch(learn, /className="v8s-top" aria-label="Learn & Earn"/);
});
