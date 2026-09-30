// K5B Part 1 — strict allow-list validation, injection probes, actor spoofing, guest behaviour, headers,
// method/namespace handling, generic errors and the rate limit.
const L = require('./lib.cjs');
const { check, finish, pool } = L;
const LABEL = 'k5b 03 params + injection + spoofing';

(async () => {
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);

  const A = await L.member('Ira Alpha', { username: 'ira_alpha' });
  const B = await L.member('Ira Beta', { username: 'ira_beta' });
  const P = await L.member('Ira Private', { username: 'ira_private', privateProfile: true });
  await L.follow(B, P);                      // only B may see the private profile
  const T = await L.member('Ira Target', { username: 'ira_target' });
  await L.block(A, T);                       // A blocked T
  const v = await L.vendor(await L.member('Ira Vendor', { username: 'ira_vendor' }));
  await L.product(v, 'Iris 100% cotton_bag');
  await L.product(v, 'Iris plain bag');
  await L.course("Iris O'Neil's loom");

  // ---------------- allow-list validation (all must be a safe 400, never touching data)
  const bad = {
    'missing q': '',
    'unknown param': 'q=iris&foo=1',
    'duplicate q': 'q=iris&q=bag',
    'duplicate types': 'q=iris&types=person&types=product',
    'q too short': 'q=i',
    'q too long': 'q=' + 'a'.repeat(81),
    'q whitespace only': 'q=%20%20%20',
    'q with control char': 'q=ir%00is',
    'q with newline': 'q=ir%0Ais',
    'bad pillar': 'q=iris&pillar=admin',
    'empty pillar': 'q=iris&pillar=',
    'bad type': 'q=iris&types=post',
    'empty types': 'q=iris&types=',
    'dup type in list': 'q=iris&types=person,person',
    'pillar/type mismatch': 'q=iris&pillar=works&types=course',
    'limit 0': 'q=iris&limit=0', 'limit 11': 'q=iris&limit=11', 'limit text': 'q=iris&limit=ten', 'limit negative': 'q=iris&limit=-1', 'limit float': 'q=iris&limit=2.5',
    'cursor (not in Part 1)': 'q=iris&cursor=abc', 'offset': 'q=iris&offset=10', 'page': 'q=iris&page=2', 'sort': 'q=iris&sort=newest', 'location': 'q=iris&location=warangal',
  };
  for (const [name, qs] of Object.entries(bad)) {
    const r = await L.search(qs);
    check(`400 ${name}`, r.status === 400 && r.json?.status === 'error' && r.json.code === 'INVALID_SEARCH_PARAMETER' && JSON.stringify(Object.keys(r.json)) === '["status","code","message"]', r.status + ' ' + r.text.slice(0, 160));
  }
  const ok = await L.search('q=' + encodeURIComponent('ǐ'.repeat(80)));
  check('80 multi-byte characters is accepted (length is counted in characters)', ok.status === 200, ok.status);
  const trimmed = await L.search('q=' + encodeURIComponent('   iris    plain  '));
  check('whitespace is normalised and echoed normalised', trimmed.status === 200 && trimmed.json.query.q === 'iris plain' && L.titles(trimmed).join() === 'Iris plain bag', trimmed.json && trimmed.json.query);
  const canon = await L.search('q=iris&types=course,person&pillar=all&limit=3');
  check('types are echoed in canonical order', JSON.stringify(canon.json?.query?.types) === '["person","course"]', canon.json && canon.json.query);
  const pill = await L.search('q=iris&pillar=shop');
  check('pillar=shop restricts results to products', pill.status === 200 && JSON.stringify(pill.json.query.types) === '["product"]' && pill.json.results.every((x) => x.type === 'product' && x.pillar === 'shop'), pill.json && pill.json.query);

  // ---------------- actor / id parameters are refused, never read
  const actorKeys = ['userId', 'user_id', 'viewerId', 'viewer_id', 'actorId', 'accountId', 'masterId', 'howdiId', 'howdi_id', 'id', 'ids', 'uuid', 'creatorId', 'workerId', 'vendor_id', 'ownerId', 'sessionToken', 'token', 'session'];
  for (const k of actorKeys) {
    const r = await L.search(`q=ira&${k}=${B.id}`, { token: A.token });
    check(`actor/id parameter "${k}" → 400`, r.status === 400 && r.json?.code === 'INVALID_SEARCH_PARAMETER', r.status + ' ' + r.text.slice(0, 120));
  }
  // Session is the only authority: A's session + B's identity in headers still acts as A.
  const spoofHeaders = { 'x-howdi-worker-id': String(B.id), 'x-user-id': String(B.id), 'x-howdi-user-id': String(B.id), 'x-viewer-id': String(B.id), 'x-forwarded-user': B.email, cookie: 'howdiSessionToken=' + B.token };
  const asA = await L.s('ira_private', 'types=person', { token: A.token, headers: spoofHeaders });
  check('A + B\'s identity in headers/cookie → still A (cannot see B\'s follower-only private profile)', asA.status === 200 && asA.json.viewer === 'session' && asA.json.results.length === 0, asA.json);
  const asB = await L.s('ira_private', 'types=person', { token: B.token });
  check('control: B\'s own session does see the follower-only profile', L.routes(asB).join() === '/@ira_private', L.routes(asB));
  const aT = await L.s('ira_target', 'types=person', { token: A.token, headers: spoofHeaders });
  check('A + spoof headers still applies A\'s block of T', aT.json.results.length === 0, aT.json.results);
  const guestSpoof = await L.s('ira_private', 'types=person', { headers: spoofHeaders });
  check('guest + spoof headers/cookie stays a guest', guestSpoof.json.viewer === 'guest' && guestSpoof.json.results.length === 0, guestSpoof.json);
  for (const tok of ['not-a-token', B.token + 'x', String(B.id), B.howdi, '']) {
    const r = await L.s('ira_private', 'types=person', { headers: { authorization: 'Bearer ' + tok } });
    check(`unknown/forged bearer "${tok.slice(0, 12)}…" → guest results, never an error`, r.status === 200 && r.json.viewer === 'guest' && r.json.results.length === 0, r.status + ' ' + r.text.slice(0, 100));
  }
  const basic = await L.s('ira', 'types=person', { headers: { authorization: 'Basic ' + Buffer.from('a:b').toString('base64') } });
  check('non-Bearer authorization → guest', basic.status === 200 && basic.json.viewer === 'guest', basic.status);

  // ---------------- guest behaviour
  const guest = await L.s('iris');
  check('guest: 200 with public results, no personal badges', guest.status === 200 && guest.json.viewer === 'guest' && guest.json.results.length > 0 && !guest.json.results.some((x) => x.badges.includes('following')), guest.json);
  check('guest: a guest search never sets a cookie', !(await fetch(L.base() + '/api/search?q=iris')).headers.get('set-cookie'), '');

  // ---------------- injection probes: data only, never SQL, never an error
  const probes = ["'", '"', "' OR '1'='1", "') OR ('1'='1", "1; DROP TABLE users;--", "iris' UNION SELECT email,phone,howdi_id,4,5 FROM users--",
    "iris'--", '%', '%%', '_', '__', '\\', '\\%', '%_%', "%' OR 1=1 --", '$1', '$2::text', '${1}', ':name', "iris\\'", 'iris) OR TRUE --', '*', '.*', 'ira%', 'ira_'];
  const probeRes = [];
  for (const p of probes) probeRes.push([p, await L.s(p.length >= 2 ? p : p + p)]);
  check('every injection probe → 200 or safe 400, never 500', probeRes.every(([, r]) => r.status === 200 || (r.status === 400 && r.json?.code === 'INVALID_SEARCH_PARAMETER')), probeRes.filter(([, r]) => r.status !== 200 && r.status !== 400).map(([p, r]) => p + ' ' + r.status));
  check('no probe returns SQL, driver, stack or schema text', !probeRes.some(([, r]) => /syntax|SELECT|relation|column|pg_|stack|at .*\.cjs|ERROR:/i.test(r.json?.message || '') || /syntax error|at Object|node_modules/i.test(r.text)), '');
  check('no probe returns any email/phone/howdi_id', !probeRes.some(([, r]) => L.leakedValues(r.text, [A.email, A.phone, A.howdi, B.email, B.phone, B.howdi]).length), '');
  check('users table survived the DROP probe', Number((await pool.query('SELECT COUNT(*) FROM users')).rows[0].count) > 0, '');
  const pct = await L.s('%%', 'types=product');
  check('"%%" is literal: matches nothing, not everything', pct.status === 200 && pct.json.results.length === 0, L.titles(pct));
  const lit = await L.s('100%', 'types=product');
  check('"100%" matches the product whose name literally contains "100%"', L.titles(lit).join() === 'Iris 100% cotton_bag', L.titles(lit));
  const us = await L.s('n_b', 'types=product');
  check('"_" is literal (n_b matches "cotton_bag" but not "n b"/"nXb")', L.titles(us).join() === 'Iris 100% cotton_bag', L.titles(us));
  const usWide = await L.s('__', 'types=product');
  check('"__" does not act as a two-character wildcard', usWide.json.results.length === 0, L.titles(usWide));
  const quote = await L.s("o'neil's", 'types=course');
  check('apostrophes are ordinary text (finds O\'Neil\'s loom)', L.titles(quote).join() === "Iris O'Neil's loom", L.titles(quote));
  const idq = await L.s(String(A.id), 'types=person');
  check('a numeric user id as q finds nothing', idq.json.results.length === 0, idq.json.results);

  // ---------------- method, namespace and headers
  for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const r = await L.api(m, '/api/search?q=iris', { token: A.token, body: { userId: B.id } });
    check(`${m} /api/search → 405`, r.status === 405 && r.json?.code === 'METHOD_NOT_ALLOWED', r.status);
  }
  for (const p of ['/api/search/recent', '/api/search/suggestions', '/api/search/trending']) {
    const r = await L.api('GET', p + '?q=iris');
    check(`GET ${p} is not served in Part 1`, r.status === 404 && !/"results"/.test(r.text), r.status + ' ' + r.text.slice(0, 100));
  }
  const raw = await fetch(L.base() + '/api/search?q=iris', { headers: { authorization: 'Bearer ' + A.token } });
  check('Cache-Control: no-store, Pragma: no-cache, nosniff, Vary: Authorization, JSON', raw.headers.get('cache-control') === 'no-store' && raw.headers.get('pragma') === 'no-cache'
    && raw.headers.get('x-content-type-options') === 'nosniff' && /authorization/i.test(raw.headers.get('vary') || '') && /application\/json/.test(raw.headers.get('content-type') || ''), Object.fromEntries(raw.headers));
  const rawErr = await fetch(L.base() + '/api/search?q=i');
  check('400 responses are also no-store', rawErr.status === 400 && rawErr.headers.get('cache-control') === 'no-store', rawErr.headers.get('cache-control'));

  // ---------------- generic errors: force a database failure
  await pool.query(`ALTER TABLE learning_courses RENAME TO learning_courses_k5b_off`);
  const boom = await L.s('iris');
  await pool.query(`ALTER TABLE learning_courses_k5b_off RENAME TO learning_courses`);
  check('a database failure → generic 500 with no driver/SQL/table text', boom.status === 500 && boom.json?.code === 'SEARCH_UNAVAILABLE' && !/learning_courses|relation|does not exist|42P01/i.test(boom.text), boom.status + ' ' + boom.text);
  check('the server log records the failure without the search term', /\[K5B search\] request failed/.test(L.serverLog()) && !/iris/i.test(L.serverLog()), L.serverLog().split('\n').filter((l) => /K5B|iris/i.test(l)).slice(-3));
  const after = await L.s('iris');
  check('search recovers after the failure', after.status === 200, after.status);

  // ---------------- rate limit (guest 60/min per IP; user 120/min per session user)
  let guest429 = null, n = 0;
  for (; n < 70 && !guest429; n++) { const r = await L.s('iris', 'types=course'); if (r.status === 429) guest429 = r; }
  check('guest searches are rate limited within 60/min per IP', guest429 && guest429.json?.code === 'RATE_LIMITED' && n <= 61, n);
  const rl = await fetch(L.base() + '/api/search?q=iris');
  check('429 carries Retry-After and no-store', rl.status === 429 && Number(rl.headers.get('retry-after')) > 0 && rl.headers.get('cache-control') === 'no-store', rl.status);
  const signedIn = await L.s('iris', 'types=course', { token: B.token });
  check('a signed-in member has their own bucket (not blocked by the guest IP bucket)', signedIn.status === 200, signedIn.status);

  check('no uncaught server error', !/UnhandledPromiseRejection|uncaughtException/i.test(L.serverLog()), L.serverLog().slice(-800));
  return finish(LABEL);
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish(LABEL); });
