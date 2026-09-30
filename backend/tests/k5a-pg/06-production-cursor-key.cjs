// K5A Phase 1 — HOWDI_HOME_CURSOR_KEY is required outside development: with NODE_ENV=production and no key the
// For You feed fails closed (no predictable fallback key), while the rest of Connect Home keeps working.
process.env.NODE_ENV = 'production';
process.env.HOWDI_HOME_CURSOR_KEY = '';
const L = require('./lib.cjs');
process.env.HOWDI_HOME_CURSOR_KEY = '';   // lib.cjs sets a suite key when none is present; remove it again for this suite
const { check, finish } = L;

(async () => {
  const started = await L.start(); check('server starts in production mode without the cursor key', started, L.serverLog().slice(-800));
  if (!started) return finish('k5a 06 production cursor key');
  const A = await L.member('Anu Prod', { username: 'anu_prod' });
  await L.post(A, 'PROD public post');
  check('the missing key is reported loudly at boot', /HOWDI_HOME_CURSOR_KEY \(32\+ chars\) is required outside development/.test(L.serverLog()), L.serverLog().slice(-600));
  const h = await L.home('sections=special,stories,forYou');
  check('Home still loads; only For You reports an error state', h.status === 200 && h.json.sections.forYou.state === 'error' && h.json.sections.stories.state !== 'error', h.json?.sections && Object.fromEntries(Object.entries(h.json.sections).map(([k, s]) => [k, s.state])));
  const f = await L.feed('limit=5');
  check('/api/connect/home/feed fails closed with 503 and no cursor', f.status === 503 && f.json.code === 'HOME_FEED_UNAVAILABLE' && !('next_cursor' in f.json), f.text);
  return finish('k5a 06 production cursor key');
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish('k5a 06 production cursor key'); });
