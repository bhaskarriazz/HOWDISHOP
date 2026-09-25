// K5B — guest rate-limit trust boundary (no trusted proxy configured, the default).
// After an untrusted guest exhausts its 60/min bucket, nothing the client controls — forwarded/client-IP headers, other
// headers, URL shape or query — may produce a fresh bucket. Signed-in per-user buckets are preserved.
const L = require('./lib.cjs');
const { check, finish } = L;
const LABEL = 'k5b 06 client-ip rate-limit trust boundary';

const IP_HEADERS = ['x-forwarded-for', 'forwarded', 'x-real-ip', 'x-client-ip', 'true-client-ip', 'cf-connecting-ip', 'x-cluster-client-ip', 'fastly-client-ip',
  'x-originating-ip', 'x-remote-ip', 'x-remote-addr', 'client-ip', 'x-forwarded', 'forwarded-for', 'x-forwarded-host', 'via'];
const ipFor = (h, i) => h === 'forwarded' ? `for=203.0.113.${i};proto=https` : h === 'via' ? `1.1 proxy-${i}` : `203.0.113.${i}`;

async function get(p, headers = {}) {
  const r = await fetch(L.base() + p, { headers });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, headers: Object.fromEntries(r.headers) };
}

(async () => {
  const started = await L.start(); check('server starts on a fresh database (no HOWDI_TRUSTED_PROXIES)', started && !process.env.HOWDI_TRUSTED_PROXIES, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const A = await L.member('Rhea Alpha', { username: 'rhea_alpha' });
  const B = await L.member('Rhea Beta', { username: 'rhea_beta' });
  await L.course('Rhapsody weaving');

  // exhaust the guest bucket while rotating X-Forwarded-For on EVERY request (the original bypass)
  let ok = 0;
  for (let i = 0; i < 70; i++) { const r = await get('/api/search?q=rhapsody&types=course', { 'x-forwarded-for': `198.51.100.${i + 1}` }); if (r.status === 200) ok++; }
  check('rotating X-Forwarded-For per request: exactly 60 succeed, then 429 (one bucket for the real peer)', ok === 60, ok);

  // every client-controlled variation after exhaustion must still be 429
  const variants = [];
  for (const h of IP_HEADERS) for (let i = 1; i <= 3; i++) variants.push([`${h} #${i}`, '/api/search?q=rhapsody&types=course', { [h]: ipFor(h, i) }]);
  variants.push(['all IP headers at once', '/api/search?q=rhapsody', Object.fromEntries(IP_HEADERS.map((h) => [h, ipFor(h, 77)]))]);
  variants.push(['XFF list', '/api/search?q=rhapsody', { 'x-forwarded-for': '203.0.113.1, 203.0.113.2, 127.0.0.1' }]);
  variants.push(['XFF IPv6', '/api/search?q=rhapsody', { 'x-forwarded-for': '2001:db8::1' }]);
  variants.push(['XFF garbage', '/api/search?q=rhapsody', { 'x-forwarded-for': 'unknown, <x>' }]);
  variants.push(['Forwarded v6', '/api/search?q=rhapsody', { forwarded: 'for="[2001:db8::2]:443"' }]);
  for (const [n, h] of Object.entries({ 'user-agent': 'Mozilla/5.0 (Evil) ' + Date.now(), 'accept-language': 'te-IN', origin: 'https://evil.example', referer: 'https://evil.example/x', cookie: 'howdiSessionToken=zzz; sid=1',
    authorization: 'Bearer forged-token-' + Date.now(), 'x-howdi-worker-id': '99', 'x-request-id': 'r-' + Date.now(), 'cache-control': 'no-cache', 'x-http-method-override': 'POST' }))
    variants.push([`header ${n}`, '/api/search?q=rhapsody', { [n]: h }]);
  for (const p of ['/api/search/?q=rhapsody', '/api/search?q=RHAPSODY', '/api/search?q=rhapsody%20weaving', '/api/search?q=%72hapsody', '/api/search?q=rhapsody&limit=10',
    '/api/search?q=rhapsody&types=course,person', '/api/search?q=rhapsody&pillar=learn', '/api/search?q=zz&pillar=all', '/api/search?limit=3&q=rhapsody', '/api/search?q=rhapsody#frag'])
    variants.push([`url ${p}`, p, {}]);
  const results = [];
  for (const [name, p, h] of variants) results.push([name, await get(p, h)]);
  const escaped = results.filter(([, r]) => r.status !== 429);
  check(`after exhaustion, all ${results.length} header/URL/query variations stay 429 (no fresh bucket)`, escaped.length === 0, escaped.map(([n, r]) => n + ' → ' + r.status));
  check('each 429 is the generic RATE_LIMITED body with Retry-After and no-store', results.every(([, r]) => r.json?.code === 'RATE_LIMITED' && Number(r.headers['retry-after']) >= 1 && r.headers['cache-control'] === 'no-store'), results.slice(0, 1).map(([, r]) => r.json));
  const burst = await Promise.all(Array.from({ length: 40 }, (_, i) => get('/api/search?q=rhapsody', { 'x-forwarded-for': `192.0.2.${i + 1}`, 'x-real-ip': `192.0.2.${i + 1}`, forwarded: `for=192.0.2.${i + 1}` })));
  check('40 concurrent requests with distinct spoofed IPs: none succeed', burst.every((r) => r.status === 429), burst.filter((r) => r.status !== 429).length);
  const bad = await get('/api/search?q=r', { 'x-forwarded-for': '203.0.113.200' });
  check('malformed requests are still a 400 (validation precedes limiting; no DB access)', bad.status === 400);

  // signed-in users keep their own per-session-user buckets, unaffected by the guest bucket and by IP headers
  const a1 = await get('/api/search?q=rhapsody&types=course', { authorization: 'Bearer ' + A.token });
  check('a signed-in user on the exhausted IP is served (own bucket)', a1.status === 200 && a1.json.viewer === 'session', a1.status);
  let aok = 1;
  for (let i = 0; i < 125; i++) { const r = await get('/api/search?q=rhapsody&types=course', { authorization: 'Bearer ' + A.token, 'x-forwarded-for': `203.0.113.${(i % 200) + 1}` }); if (r.status === 200) aok++; }
  check('signed-in bucket is exactly 120/min and IP headers do not change it', aok === 120, aok);
  const aAfter = await get('/api/search/?q=RHAPSODY&limit=2', { authorization: 'Bearer ' + A.token, 'x-real-ip': '203.0.113.250', forwarded: 'for=203.0.113.251' });
  check('exhausted user: URL/query/IP-header changes do not reset the user bucket', aAfter.status === 429, aAfter.status);
  const b1 = await get('/api/search?q=rhapsody&types=course', { authorization: 'Bearer ' + B.token });
  check('another user (B) is unaffected', b1.status === 200 && b1.json.viewer === 'session', b1.status);
  return finish(LABEL);
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish(LABEL); });
