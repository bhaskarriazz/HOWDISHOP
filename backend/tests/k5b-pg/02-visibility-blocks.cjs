// K5B Part 1 — visibility floor for every type, block filtering in both directions, guest vs session,
// and "hidden looks exactly like absent" (no count/facet/status differential).
const L = require('./lib.cjs');
const { check, finish, pool } = L;
const LABEL = 'k5b 02 visibility + blocks';

(async () => {
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);

  // ---------------- people
  const pub = await L.member('Zeno Visible', { username: 'zeno_visible', creator: true });
  const hiddenPeople = {
    private: await L.member('Zeno Private', { username: 'zeno_private', privateProfile: true }),
    nondiscoverable: await L.member('Zeno Hidden', { username: 'zeno_hidden', discoverable: false }),
    suspended: await L.member('Zeno Suspended', { username: 'zeno_suspended', accountStatus: 'SUSPENDED' }),
    deleted: await L.member('Zeno Deleted', { username: 'zeno_deleted', accountStatus: 'DELETED', isActive: false }),
    inactive: await L.member('Zeno Inactive', { username: 'zeno_inactive', isActive: false }),
    numeric: await L.member('Zeno Numeric', { username: '98765432' }),
  };
  await L.member('Zeno Nameless');                                           // no Connect profile at all
  const follower = await L.member('Fola Follower', { username: 'fola_follower' });
  await L.follow(follower, hiddenPeople.private);

  const g = await L.s('zeno', 'types=person&limit=10');
  check('people: guest sees only the public, discoverable, active member with a public username', JSON.stringify(L.routes(g)) === JSON.stringify(['/@zeno_visible']), L.routes(g));
  const f = await L.s('zeno', 'types=person&limit=10', { token: follower.token });
  check('people: a private profile is visible to a signed-in follower only', L.routes(f).sort().join() === '/@zeno_private,/@zeno_visible', L.routes(f));
  check('people: the viewer never finds themself', !L.routes(await L.s('fola', 'types=person', { token: follower.token })).includes('/@fola_follower'), '');
  check('people: never matched on email, phone or howdi_id', L.ofType(await L.s(pub.email), 'person').length === 0 && L.ofType(await L.s(pub.phone), 'person').length === 0 && L.ofType(await L.s(pub.howdi), 'person').length === 0, '');

  // ---------------- products
  const owner = await L.member('Omar Owner', { username: 'omar_owner' });
  const vOk = await L.vendor(owner, { business: 'Omar Pots' });
  await L.product(vOk, 'Quokka planter');
  const vPaused = await L.vendor(await L.member('Pam Paused', { username: 'pam_paused' }), { status: 'suspended' });
  const vSuspOwner = await L.vendor(await L.member('Sid Suspended', { username: 'sid_susp', accountStatus: 'SUSPENDED' }));
  const hiddenProducts = {
    draft: await L.product(vOk, 'Quokka draft', { status: 'draft' }),
    archived: await L.product(vOk, 'Quokka archived', { archived: true }),
    future: await L.product(vOk, 'Quokka future', { future: true }),
    rejected: await L.product(vOk, 'Quokka rejected', { moderation: 'REJECTED' }),
    pending: await L.product(vOk, 'Quokka pending', { moderation: 'PENDING' }),
    vendorPaused: await L.product(vPaused, 'Quokka paused vendor'),
    ownerSuspended: await L.product(vSuspOwner, 'Quokka suspended owner'),
  };
  const soldOut = await L.product(vOk, 'Quokka soldout', { stock: 0 });
  const pg = await L.s('quokka', 'types=product&limit=10');
  check('products: only published, released, non-archived, approved, active-vendor, active-owner rows', L.titles(pg).sort().join('|') === 'Quokka planter|Quokka soldout', L.titles(pg));
  check('products: a sold-out product is listed but badged out_of_stock', L.ofType(pg, 'product').find((x) => x.title === 'Quokka soldout')?.badges.includes('out_of_stock'), L.ofType(pg, 'product'));
  check('products: never matched on sku or vendor code', L.ofType(await L.s('SKU-' + soldOut.id), 'product').length === 0
    && L.ofType(await L.s((await pool.query(`SELECT vendor_code FROM vendor_profiles WHERE id=$1`, [vOk.id])).rows[0].vendor_code), 'product').length === 0, '');

  // ---------------- workers
  const wOk = await L.worker(await L.member('Yara Worker'), { code: 'HOWDI-WRK-K5B10001' });
  const hiddenWorkers = {
    kycPending: await L.worker(await L.member('Yara Pending'), { code: 'HOWDI-WRK-K5B10002', kyc: 'pending' }),
    serviceHidden: await L.worker(await L.member('Yara Svc'), { code: 'HOWDI-WRK-K5B10003', visibleService: false }),
    skillPending: await L.worker(await L.member('Yara Skill'), { code: 'HOWDI-WRK-K5B10004' }),
    accountBlocked: await L.worker(await L.member('Yara Account'), { code: 'HOWDI-WRK-K5B10005' }),
    rowInactive: await L.worker(await L.member('Yara Row'), { code: 'HOWDI-WRK-K5B10006' }),
    memberSuspended: await L.worker(await L.member('Yara Member', { accountStatus: 'SUSPENDED' }), { code: 'HOWDI-WRK-K5B10007' }),
    numericCode: await L.worker(await L.member('Yara Numeric'), { code: '10000008' }),
  };
  await pool.query(`UPDATE works_workers SET skill_status='pending' WHERE id=$1`, [hiddenWorkers.skillPending.id]);
  await pool.query(`UPDATE works_workers SET account_status='suspended' WHERE id=$1`, [hiddenWorkers.accountBlocked.id]);
  await pool.query(`UPDATE works_workers SET active=FALSE WHERE id=$1`, [hiddenWorkers.rowInactive.id]);
  const wg = await L.s('yara', 'types=worker&limit=10');
  check('workers: only verified (KYC + skill), active, visible-service, active-member, public-code workers', JSON.stringify(L.routes(wg)) === JSON.stringify(['/works/workers/HOWDI-WRK-K5B10001']), L.routes(wg));

  // ---------------- courses
  const cOk = await L.course('Xylo weaving');
  const hiddenCourses = { draft: await L.course('Xylo draft', { publish: 'DRAFT' }), review: await L.course('Xylo review', { publish: 'REVIEW' }), inactive: await L.course('Xylo inactive', { active: false }) };
  const teacher = await L.member('Tara Teacher', { username: 'tara_teacher' });
  const taught = await L.course('Xylo taught');
  await L.teachCourse(teacher, taught);
  const suspTeacher = await L.member('Sunil Teacher', { username: 'sunil_teacher', accountStatus: 'SUSPENDED' });
  const suspTaught = await L.course('Xylo suspended teacher');
  await L.teachCourse(suspTeacher, suspTaught);
  const cg = await L.s('xylo', 'types=course&limit=10');
  check('courses: only active + PUBLISHED courses; a suspended teacher hides their course', L.titles(cg).sort().join('|') === 'Xylo taught|Xylo weaving', L.titles(cg));

  // ---------------- blocks, both directions, every type
  const A = await L.member('Anil Blocker', { username: 'anil_blocker' });
  const B = await L.member('Bhanu Blocked', { username: 'bhanu_blocked' });
  const vB = await L.vendor(B, { business: 'Bhanu Crafts' });
  await L.product(vB, 'Wombat lamp');
  await L.worker(B, { code: 'HOWDI-WRK-K5B20001' });
  await pool.query(`UPDATE works_workers SET full_name='Wombat Bhanu' WHERE worker_code='HOWDI-WRK-K5B20001'`);
  const cB = await L.course('Wombat pottery');
  await L.teachCourse(B, cB);
  await pool.query(`UPDATE users SET full_name='Wombat Bhanu' WHERE id=$1`, [B.id]);
  const C = await L.member('Chitra Blocked-By', { username: 'chitra_blocked_by' });
  await L.block(A, B);                        // A blocked B
  await L.block(B, C);                        // B blocked C
  const all4 = 'limit=10';
  const guestW = await L.s('wombat', all4);
  check('block precondition: a guest sees B as person, product, worker and course', ['person', 'product', 'worker', 'course'].every((t) => L.ofType(guestW, t).length === 1), guestW.json && guestW.json.results.map((x) => x.type));
  const aW = await L.s('wombat', all4, { token: A.token });
  check('A blocked B → B\'s person, product, worker and course are all absent for A', aW.status === 200 && aW.json.results.length === 0, aW.json && aW.json.results);
  const cW = await L.s('wombat', all4, { token: C.token });
  check('B blocked C → B\'s person, product, worker and course are all absent for C', cW.status === 200 && cW.json.results.length === 0, cW.json && cW.json.results);
  check('B still does not see A or C (both directions for people)', L.ofType(await L.s('anil', 'types=person', { token: B.token }), 'person').length === 0 && L.ofType(await L.s('chitra', 'types=person', { token: B.token }), 'person').length === 0, '');
  check('blocked responses carry no count/has_more hint (has_more false for all four)', Object.values(aW.json.has_more).every((x) => x === false), aW.json.has_more);

  // ---------------- hidden looks exactly like absent (no differential)
  const noMatch = await L.s('qqzzqqzz');
  const probes = [
    await L.s('zeno_private', 'types=person'), await L.s('zeno_suspended', 'types=person'), await L.s('zeno_hidden', 'types=person'),
    await L.s('Quokka draft', 'types=product'), await L.s('Quokka rejected', 'types=product'), await L.s('Quokka suspended owner', 'types=product'),
    await L.s('Yara Pending', 'types=worker'), await L.s('Yara Member', 'types=worker'),
    await L.s('Xylo draft', 'types=course'), await L.s('Xylo suspended teacher', 'types=course'),
  ];
  const norm = (r) => JSON.stringify({ status: r.status, results: r.json?.results, has_more: Object.values(r.json?.has_more || {}) });
  check('every hidden-record probe returns 200 with no results and has_more=false, identical to a true zero-result query',
    probes.every((r) => r.status === 200 && r.json.results.length === 0 && Object.values(r.json.has_more).every((x) => x === false)) && noMatch.json.results.length === 0,
    probes.map((r) => r.status + ':' + (r.json?.results || []).length));
  check('hidden probes and a true zero-result query share one response shape', probes.every((r) => JSON.stringify(Object.keys(r.json)) === JSON.stringify(Object.keys(noMatch.json))), '');
  check('blocked-owner results for A look exactly like no match', norm({ status: aW.status, json: { results: aW.json.results, has_more: aW.json.has_more } }) === norm({ status: 200, json: { results: [], has_more: { a: false, b: false, c: false, d: false } } }), '');

  // ---------------- references never issued for hidden products/courses; visibility change removes a result
  const refCount = async (type, list) => Number((await pool.query(`SELECT COUNT(*) FROM howdi_public_refs WHERE entity_type=$1 AND entity_key=ANY($2::text[])`, [type, list.map((x) => String(x.id))])).rows[0].count);
  check('no PRD- reference was issued for any hidden product', (await refCount('PRODUCT', Object.values(hiddenProducts))) === 0, '');
  check('no CRS- reference was issued for any hidden course (incl. suspended teacher)', (await refCount('COURSE', [...Object.values(hiddenCourses), suspTaught])) === 0, '');
  await pool.query(`UPDATE learning_courses SET publish_status='DRAFT' WHERE id=$1::uuid`, [cOk.id]);
  check('a course unpublished after being found disappears from the next search', !L.titles(await L.s('xylo', 'types=course&limit=10')).includes('Xylo weaving'), '');
  await pool.query(`UPDATE users SET account_status='SUSPENDED' WHERE id=$1`, [pub.id]);
  check('a member suspended after being found disappears from the next search', L.routes(await L.s('zeno', 'types=person')).length === 0, '');

  // ---------------- suspended / revoked sessions fall back to guest
  const suspViewer = await L.member('Sam Suspended Viewer', { username: 'sam_susp_viewer' });
  await L.follow(suspViewer, hiddenPeople.private);
  await pool.query(`UPDATE users SET account_status='SUSPENDED' WHERE id=$1`, [suspViewer.id]);
  const sv = await L.s('zeno_private', 'types=person', { token: suspViewer.token });
  check('a suspended account\'s session is treated as a guest (viewer=guest, follower-only profile hidden)', sv.status === 200 && sv.json.viewer === 'guest' && sv.json.results.length === 0, sv.json);
  await pool.query(`UPDATE user_sessions SET is_active=FALSE WHERE user_id=$1`, [follower.id]);
  const rv = await L.s('zeno_private', 'types=person', { token: follower.token });
  check('a revoked session is treated as a guest', rv.status === 200 && rv.json.viewer === 'guest' && rv.json.results.length === 0, rv.json);

  check('no uncaught server error / search failure logged', !/UnhandledPromiseRejection|uncaughtException|\[K5B search\]/i.test(L.serverLog()), L.serverLog().slice(-800));
  return finish(LABEL);
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish(LABEL); });
