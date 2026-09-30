// K5A/K5B — configured trusted proxy (HOWDI_TRUSTED_PROXIES). The test client connects from loopback, so the server is
// booted with HOWDI_TRUSTED_PROXIES=127.0.0.1 to play the role of a reverse proxy. Then a second boot trusts a DIFFERENT
// address (10.0.0.1) and proves the same headers are ignored when the immediate peer is not the configured proxy.
process.env.HOWDI_TRUSTED_PROXIES = '127.0.0.1, ::1';
const L = require('./lib.cjs');
const { check, finish } = L;
const LABEL = 'k5b 07 trusted proxy';

async function get(p, headers = {}) { const r = await fetch(L.base() + p, { headers }); const t = await r.text(); let json = null; try { json = JSON.parse(t); } catch {} return { status: r.status, json }; }
async function exhaust(p, headers, n) { let ok = 0; for (let i = 0; i < n; i++) if ((await get(p, headers)).status !== 429) ok++; return ok; }

(async () => {
  let started = await L.start(); check('server starts with HOWDI_TRUSTED_PROXIES=127.0.0.1,::1', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  await L.course('Trellis course');
  await L.member('Tara Proxy', { username: 'tara_proxy' });
  const S = '/api/search?q=trellis&types=course';

  // K5B: the client address comes from the right-most untrusted X-Forwarded-For hop appended by the trusted proxy
  check('client C1 (via proxy) gets exactly 60 searches', (await exhaust(S, { 'x-forwarded-for': '203.0.113.10' }, 65)) === 60);
  check('C1 is limited: 429', (await get(S, { 'x-forwarded-for': '203.0.113.10' })).status === 429);
  check('C1 cannot reset by prepending spoofed hops (proxy appends the real address on the right)', (await get(S, { 'x-forwarded-for': '6.6.6.6, 7.7.7.7, 203.0.113.10' })).status === 429);
  check('C1 cannot reset via a trusted hop after it (chain C1 → 127.0.0.1)', (await get(S, { 'x-forwarded-for': '9.9.9.9, 203.0.113.10, 127.0.0.1' })).status === 429);
  check('C1 cannot reset via Forwarded / X-Real-IP / X-Client-IP / True-Client-IP / CF-Connecting-IP (never read)',
    (await Promise.all(['forwarded', 'x-real-ip', 'x-client-ip', 'true-client-ip', 'cf-connecting-ip'].map((h) => get(S, { 'x-forwarded-for': '203.0.113.10', [h]: h === 'forwarded' ? 'for=203.0.113.99' : '203.0.113.99' })))).every((r) => r.status === 429));
  const c2 = await get(S, { 'x-forwarded-for': '203.0.113.11' });
  check('a different real client C2 behind the trusted proxy has its own bucket', c2.status === 200 && c2.json.viewer === 'guest', c2.status);
  const v6 = await get(S, { 'x-forwarded-for': '2001:db8::10' });
  check('IPv6 client behind the proxy is keyed on its own address', v6.status === 200, v6.status);
  // with no usable forwarded address the proxy itself is the key; other headers never split that bucket
  check('no XFF: keyed on the proxy; rotating X-Real-IP/Forwarded does not split it (exactly 60)', (await (async () => { let ok = 0; for (let i = 0; i < 65; i++) if ((await get(S, { 'x-real-ip': `198.51.100.${i + 1}`, forwarded: `for=198.51.100.${i + 1}` })).status === 200) ok++; return ok; })()) === 60);
  check('malformed XFF ("unknown", garbage) falls back to the (now exhausted) proxy key', (await get(S, { 'x-forwarded-for': 'unknown' })).status === 429 && (await get(S, { 'x-forwarded-for': '203.0.113.12, garbage' })).status === 429);

  // K5A Home: same resolver
  check('K5A Home: client H1 via proxy gets exactly 60 manifest requests', (await exhaust('/api/connect/home', { 'x-forwarded-for': '203.0.113.20' }, 65)) === 60);
  check('K5A Home: H1 cannot reset with spoofed left hops or other IP headers', (await get('/api/connect/home', { 'x-forwarded-for': '1.1.1.1, 203.0.113.20', 'x-real-ip': '1.1.1.2' })).status === 429);
  check('K5A Home: a different client H2 behind the proxy has its own bucket', (await get('/api/connect/home', { 'x-forwarded-for': '203.0.113.21' })).status === 200);
  await L.stop();

  // Second boot: trust ONLY 10.0.0.1. Our loopback peer is not that proxy, so every forwarded header is ignored again.
  process.env.HOWDI_TRUSTED_PROXIES = '10.0.0.1';
  started = await L.start(); check('server re-starts with HOWDI_TRUSTED_PROXIES=10.0.0.1 (peer 127.0.0.1 is NOT trusted)', started, L.serverLog().slice(-600));
  let ok = 0;
  for (let i = 0; i < 70; i++) if ((await get(S, { 'x-forwarded-for': `203.0.113.${i + 1}` })).status === 200) ok++;
  check('untrusted peer: rotating X-Forwarded-For is ignored even though a proxy list is configured (exactly 60)', ok === 60, ok);
  check('untrusted peer: XFF naming the trusted proxy itself does not help', (await get(S, { 'x-forwarded-for': '203.0.113.200, 10.0.0.1' })).status === 429);
  process.env.HOWDI_TRUSTED_PROXIES = 'not-an-ip, 999.0.0.0/8';
  await L.stop(); started = await L.start();
  let ok2 = 0;
  for (let i = 0; i < 65; i++) if ((await get(S, { 'x-forwarded-for': `203.0.113.${i + 1}` })).status === 200) ok2++;
  check('invalid HOWDI_TRUSTED_PROXIES fails closed (nothing trusted, exactly 60) and is logged', started && ok2 === 60 && /ignoring invalid HOWDI_TRUSTED_PROXIES entries/.test(L.serverLog()), { ok2 });
  return finish(LABEL);
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish(LABEL); });
