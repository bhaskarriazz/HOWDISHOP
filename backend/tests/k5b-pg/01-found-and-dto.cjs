// K5B Part 1 — FOUND for all four types, the seven-key public DTO, and a private-value scan over every response.
const L = require('./lib.cjs');
const { check, finish, pool } = L;
const LABEL = 'k5b 01 found + dto + private-value scan';

(async () => {
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);

  const asha = await L.member('Asha Kumari', { username: 'asha_kilnwork', creator: true, avatar: 'data:image/png;base64,QUFB' });
  const viewer = await L.member('Vik Viewer', { username: 'vik_viewer' });
  await L.follow(viewer, asha);
  const v = await L.vendor(asha, { business: 'Kilnwork Studio' });
  const prod = await L.product(v, 'Kilnwork glazed mug');
  const sale = await L.product(v, 'Kilnwork tea bowl');                   // price 450 < mrp 500 → on_sale
  const wUser = await L.member('Ravi Kilnwork');
  const w = await L.worker(wUser, { code: 'HOWDI-WRK-K5B00001' });
  const svcName = (await pool.query(`SELECT s.name FROM works_worker_services ws JOIN works_services s ON s.id=ws.service_id WHERE ws.worker_id=$1`, [w.id])).rows[0].name;
  const c = await L.course('Kilnwork basics');
  await pool.query(`UPDATE learning_courses SET duration_minutes=45,thumbnail_url='https://cdn.example/c.jpg',purchase_mode='FREE' WHERE id=$1::uuid`, [c.id]);

  // ---------------- FOUND: each type is found by its own text, guest and signed in
  const g = await L.s('kilnwork');
  check('FOUND guest: 200, viewer=guest', g.status === 200 && g.json?.status === 'success' && g.json.viewer === 'guest', g.text.slice(0, 300));
  check('FOUND person by public username / display name', L.ofType(g, 'person').some((x) => x.route === '/@asha_kilnwork' && x.title === 'Asha Kumari'), L.ofType(g, 'person'));
  check('FOUND product by name', L.ofType(g, 'product').map((x) => x.title).sort().join('|') === 'Kilnwork glazed mug|Kilnwork tea bowl', L.ofType(g, 'product'));
  check('FOUND worker by name', L.ofType(g, 'worker').some((x) => x.route === '/works/workers/HOWDI-WRK-K5B00001' && x.title === 'Ravi Kilnwork'), L.ofType(g, 'worker'));
  check('FOUND course by title', L.ofType(g, 'course').some((x) => x.title === 'Kilnwork basics'), L.ofType(g, 'course'));
  const bySvc = await L.s(svcName, 'types=worker');
  check('FOUND worker by approved service name', L.ofType(bySvc, 'worker').length === 1, bySvc.json);
  const multi = await L.s('glazed KILNWORK');
  check('multi-word search: every term must match (case-insensitive)', L.titles(multi).join() === 'Kilnwork glazed mug', L.titles(multi));
  const sess = await L.s('kilnwork', '', { token: viewer.token });
  check('FOUND signed in: viewer=session, same four types', sess.status === 200 && sess.json.viewer === 'session' && ['person', 'product', 'worker', 'course'].every((t) => L.ofType(sess, t).length > 0), sess.json && sess.json.viewer);
  check('results are grouped in canonical type order', JSON.stringify([...new Set(g.json.results.map((x) => x.type))]) === JSON.stringify(['person', 'product', 'worker', 'course']), g.json.results.map((x) => x.type));
  check('response envelope is exactly status/viewer/query/results/has_more', JSON.stringify(Object.keys(g.json)) === JSON.stringify(['status', 'viewer', 'query', 'results', 'has_more'])
    && JSON.stringify(g.json.query) === JSON.stringify({ q: 'kilnwork', pillar: 'all', types: ['person', 'product', 'worker', 'course'], limit: 5 }), g.json);

  // ---------------- DTO contract
  check('every result is exactly { type, pillar, title, subtitle, image, badges, route } with a public-key route', L.dtoProblems(g).length === 0 && L.dtoProblems(sess).length === 0, [...L.dtoProblems(g), ...L.dtoProblems(sess)]);
  const person = L.ofType(sess, 'person').find((x) => x.route === '/@asha_kilnwork');
  check('person DTO: @handle subtitle, avatar, creator + following badges for a follower', person && person.subtitle.startsWith('@asha_kilnwork') && person.image === 'data:image/png;base64,QUFB'
    && person.badges.includes('creator') && person.badges.includes('following'), person);
  check('guest person DTO never says following', !L.ofType(g, 'person').some((x) => x.badges.includes('following')), L.ofType(g, 'person'));
  const mug = L.ofType(g, 'product').find((x) => x.title === 'Kilnwork glazed mug');
  check('product DTO: price, category and store in the subtitle, image, on_sale badge', mug && mug.subtitle === '₹450 · Pottery · Kilnwork Studio' && mug.image === 'https://cdn.example/p.jpg' && mug.badges.includes('on_sale'), mug);
  const worker = L.ofType(g, 'worker')[0];
  check('worker DTO: service · coarse city · rating, verified badge, no image', worker && worker.subtitle === `${svcName} · Warangal · ★ 4.7` && worker.image === null && JSON.stringify(worker.badges) === '["verified"]', worker);
  const course = L.ofType(g, 'course')[0];
  check('course DTO: category · level · duration, thumbnail, free badge', course && course.subtitle === 'Pottery · Beginner · 45 min' && course.image === 'https://cdn.example/c.jpg' && course.badges.includes('free'), course);
  check('product/course routes are K5A howdi_public_refs codes for exactly those records',
    mug.route === '/shop/products/' + await L.refFor('PRODUCT', prod.id) && course.route === '/learn/courses/' + await L.refFor('COURSE', c.id), [mug.route, course.route]);

  // ---------------- private-value scan across a broad set of responses
  const secrets = [];
  for (const m of [asha, viewer, wUser]) secrets.push(m.id, m.howdi, m.master, m.email, m.phone, m.token);
  const vend = (await pool.query(`SELECT vendor_code FROM vendor_profiles WHERE id=$1`, [v.id])).rows[0].vendor_code;
  const skus = (await pool.query(`SELECT sku FROM vendor_products WHERE id=ANY($1::bigint[])`, [[prod.id, sale.id]])).rows.map((r) => r.sku);
  secrets.push(v.id, prod.id, sale.id, w.id, c.id, vend, ...skus, '506002', '14 Private Kiln Lane');
  const responses = [];
  const queries = ['kilnwork', 'asha', 'mug', 'ravi', 'basics', 'pottery', 'warangal', svcName];
  for (const opts of [{}, { token: viewer.token }, { token: asha.token }]) {
    for (const q of queries) {
      responses.push(await L.s(q, '', opts));
      for (const t of ['person', 'product', 'worker', 'course']) responses.push(await L.s(q, 'types=' + t + '&limit=10', opts));
    }
  }
  check('every scanned response was a 200 (no rate-limit or error noise in the scan)', responses.every((r) => r.status === 200), responses.filter((r) => r.status !== 200).map((r) => r.status).slice(0, 5));
  check('the scan saw populated results for every type', ['person', 'product', 'worker', 'course'].every((t) => responses.some((r) => L.ofType(r, t).length)), '');
  const keyHits = [], valueHits = [], numHits = [];
  for (const r of responses) {
    keyHits.push(...L.forbiddenKeys(r.json));
    valueHits.push(...L.leakedValues(r.text, secrets));
    if (L.LONG_NUMBER_RE.test(r.text)) numHits.push(r.text.slice(0, 200));
  }
  check('no forbidden key anywhere (ids, UUIDs, howdi/master ids, email, phone, address, pincode, status, tokens)', keyHits.length === 0, keyHits.slice(0, 10));
  check('no private value anywhere (numeric ids, UUIDs, emails, phones, tokens, sku, vendor code, pincode, address)', valueHits.length === 0, valueHits.slice(0, 10));
  check('no reversible member reference (long numeric run) anywhere', numHits.length === 0, numHits.slice(0, 2));
  check('no internal role/status words in any result', !responses.some((r) => /"(role|account_status|kyc_status|publish_status|ACTIVE|PUBLISHED|APPROVED|verified_status)"/.test(JSON.stringify(r.json?.results || []))), '');
  check('city is the only location (never pincode or coordinates)', !responses.some((r) => /506002|latitude|longitude|"lat"|"lng"/.test(r.text)), '');

  // ---------------- fixed caps
  for (let i = 0; i < 12; i++) await L.product(v, `Capcheck vase ${i}`);
  const capDefault = await L.s('capcheck', 'types=product', { token: viewer.token });
  const capMax = await L.s('capcheck', 'types=product&limit=10', { token: viewer.token });
  check('default cap is 5 per type with has_more=true', L.ofType(capDefault, 'product').length === 5 && capDefault.json.has_more.product === true, capDefault.json && capDefault.json.has_more);
  check('limit=10 is the hard ceiling (12 matches → 10 + has_more)', L.ofType(capMax, 'product').length === 10 && capMax.json.has_more.product === true, L.ofType(capMax, 'product').length);
  check('no cursor or pagination token is ever returned', !responses.concat([capDefault, capMax]).some((r) => /cursor|next_|offset|page/i.test(Object.keys(r.json || {}).join(','))), '');

  check('no uncaught server error / search failure logged', !/UnhandledPromiseRejection|uncaughtException|\[K5B search\]/i.test(L.serverLog()), L.serverLog().slice(-800));
  check('search terms never reach the server log', !/kilnwork|capcheck/i.test(L.serverLog()), L.serverLog().match(/.*(kilnwork|capcheck).*/i)?.[0]);
  return finish(LABEL);
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish(LABEL); });
