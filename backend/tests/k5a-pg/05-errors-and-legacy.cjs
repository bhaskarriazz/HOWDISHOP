// K5A Phase 1 — one failing section never breaks Home; safe errors; legacy routes and admin Home routes untouched.
const L = require('./lib.cjs');
const { check, finish, pool } = L;

(async () => {
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish('k5a 05 errors legacy');
  const A = await L.member('Anu Errors', { username: 'anu_errors' });
  await L.post(A, 'ERR public post');
  await L.special('ERR special', '/connect');

  await pool.query(`ALTER TABLE howdi_connect_daily_quotes RENAME TO howdi_connect_daily_quotes_k5a_off`);
  const r = await L.homeAll({ token: A.token });
  await pool.query(`ALTER TABLE howdi_connect_daily_quotes_k5a_off RENAME TO howdi_connect_daily_quotes`);
  check('a failing section returns state=error while the other 15 load', r.status === 200 && r.json.sections.dailyQuote.state === 'error'
    && Object.entries(r.json.sections).filter(([k]) => k !== 'dailyQuote').every(([, s]) => s.state !== 'error'), Object.fromEntries(Object.entries(r.json.sections).map(([k, s]) => [k, s.state])));
  check('the failed section carries no SQL, stack or relation text', !/relation|does not exist|select|stack|pg_|error:/i.test(JSON.stringify(r.json.sections.dailyQuote)), r.json.sections.dailyQuote);

  for (const [qs, code] of [['sections=nope', 'INVALID_HOME_PARAMETER'], ['sections=forYou,' + 'x'.repeat(40), 'INVALID_HOME_PARAMETER'], ['debug=1', 'INVALID_HOME_PARAMETER'], ['sections=forYou&sections=hero', 'INVALID_HOME_PARAMETER']]) {
    const x = await L.home(qs);
    check(`home ${qs.slice(0, 30)} → 400 ${code}`, x.status === 400 && x.json?.code === code && !/select|stack|pg_/i.test(x.text), x.text);
  }
  for (const m of ['POST', 'PUT', 'DELETE']) {
    const x = await L.api(m, '/api/connect/home', { token: A.token, body: {} });
    check(`${m} /api/connect/home → 405 (no write surface)`, x.status === 405, x.status + ' ' + x.text.slice(0, 120));
  }
  const bc = await L.api('GET', '/api/connect/posts/by-code/PST-000000000000?userId=1&extra=1', { token: A.token });
  check('by-code reads reject extra parameters safely', bc.status === 400 && !/select|stack/i.test(bc.text), bc.text);

  // legacy + neighbouring routes are unchanged
  const legacyFeed = await L.api('GET', '/api/connect/feed', { token: A.token });
  check('legacy /api/connect/feed still answers as before (untouched)', legacyFeed.status === 200 && Array.isArray(legacyFeed.json?.posts || legacyFeed.json?.feed || legacyFeed.json), Object.keys(legacyFeed.json || {}));
  const caps = await L.api('GET', '/api/connect/home-capabilities');
  check('/api/connect/home-capabilities is unaffected', caps.status === 200, caps.status);
  const adminCfg = await L.api('GET', '/api/admin/connect/home/config');
  check('admin Home config still requires an admin session', adminCfg.status === 401, adminCfg.status);
  const stories = await L.api('GET', '/api/connect/stories');
  check('legacy /api/connect/stories still answers for guests', stories.status === 200, stories.status);

  check('no uncaught server error occurred', !/UnhandledPromiseRejection|uncaughtException/i.test(L.serverLog()), L.serverLog().slice(-800));
  return finish('k5a 05 errors legacy');
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish('k5a 05 errors legacy'); });
