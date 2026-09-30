// K5A — guest rate-limit trust boundary for Connect Home (no trusted proxy configured, the default).
// After an untrusted guest exhausts the 60/min manifest bucket (and the by-code / feed buckets), no forwarded/client-IP
// header, other header, URL shape or query variation yields a fresh bucket. Signed-in per-user buckets are preserved.
const L = require('./lib.cjs');
const { check, finish } = L;
const LABEL = 'k5a 07 client-ip rate-limit trust boundary';
const IP_HEADERS = ['x-forwarded-for', 'forwarded', 'x-real-ip', 'x-client-ip', 'true-client-ip', 'cf-connecting-ip', 'x-cluster-client-ip', 'fastly-client-ip', 'x-originating-ip', 'client-ip'];
const ipFor = (h, i) => (h === 'forwarded' ? `for=203.0.113.${i}` : `203.0.113.${i}`);

async function get(p, headers = {}) {
  const r = await fetch(L.base() + p, { headers });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, headers: Object.fromEntries(r.headers) };
}

(async () => {
  const started = await L.start(); check('server starts on a fresh database (no HOWDI_TRUSTED_PROXIES)', started && !process.env.HOWDI_TRUSTED_PROXIES, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const A = await L.member('Hira Alpha', { username: 'hira_alpha', creator: true });
  const B = await L.member('Hira Beta', { username: 'hira_beta' });
  await L.post(A, 'Hira public post');

  // manifest bucket (guest 60/min), rotating XFF on every request
  let ok = 0;
  for (let i = 0; i < 70; i++) { const r = await get('/api/connect/home', { 'x-forwarded-for': `198.51.100.${i + 1}` }); if (r.status === 200) ok++; }
  check('Home manifest with rotating X-Forwarded-For: exactly 60 succeed, then 429', ok === 60, ok);
  const variants = [];
  for (const h of IP_HEADERS) for (let i = 1; i <= 3; i++) variants.push([`${h} #${i}`, '/api/connect/home', { [h]: ipFor(h, i) }]);
  variants.push(['all IP headers', '/api/connect/home', Object.fromEntries(IP_HEADERS.map((h) => [h, ipFor(h, 99)]))]);
  for (const [n, v] of Object.entries({ 'user-agent': 'Evil/1.0', origin: 'https://evil.example', referer: 'https://evil.example/', cookie: 'howdiSessionToken=zzz', authorization: 'Bearer forged-' + Date.now(), 'accept-language': 'hi-IN' }))
    variants.push([`header ${n}`, '/api/connect/home', { [n]: v }]);
  for (const p of ['/api/connect/home/', '/api/connect/home?sections=', '/api/connect/home?userId=' + A.id, '/api/connect/home?viewerId=' + B.id, '/api/connect/home?user_id=1&viewer_id=2'])
    variants.push([`url ${p}`, p, {}]);
  const res = [];
  for (const [n, p, h] of variants) res.push([n, await get(p, h)]);
  const escaped = res.filter(([, r]) => r.status !== 429);
  check(`after exhaustion, all ${res.length} header/URL/query variations of the manifest stay 429`, escaped.length === 0, escaped.map(([n, r]) => n + ' → ' + r.status));
  check('429s are the generic RATE_LIMITED body with Retry-After', res.every(([, r]) => r.json?.code === 'RATE_LIMITED' && Number(r.headers['retry-after']) >= 1), res.slice(0, 1).map(([, r]) => r.json));

  // by-code bucket (guest 120/min): exhaust with rotating headers, then vary
  let codeOk = 0;
  for (let i = 0; i < 125; i++) { const r = await get('/api/connect/posts/by-code/PST-000000000000', { 'x-real-ip': `198.51.100.${(i % 200) + 1}`, 'x-forwarded-for': `198.51.100.${(i % 200) + 1}` }); if (r.status !== 429) codeOk++; }
  check('by-code reads with rotating X-Real-IP/X-Forwarded-For: exactly 120 answered, then 429', codeOk === 120, codeOk);
  const codeAfter = await Promise.all(IP_HEADERS.map((h, i) => get('/api/connect/stories/by-code/STY-000000000000', { [h]: ipFor(h, 150 + i) })));
  check('by-code bucket stays exhausted across posts/stories paths and every IP header', codeAfter.every((r) => r.status === 429), codeAfter.map((r) => r.status));

  // signed-in per-user buckets preserved
  const a = await get('/api/connect/home', { authorization: 'Bearer ' + A.token, 'x-forwarded-for': '203.0.113.5' });
  check('a signed-in user on the exhausted IP gets their personalised Home (own bucket)', a.status === 200 && a.json.viewer === 'session', a.status);
  let aok = 1;
  for (let i = 0; i < 125; i++) { const r = await get('/api/connect/home', { authorization: 'Bearer ' + A.token, 'x-forwarded-for': `203.0.113.${(i % 200) + 1}` }); if (r.status === 200) aok++; }
  check('signed-in manifest bucket is exactly 120/min regardless of IP headers', aok === 120, aok);
  const b = await get('/api/connect/home', { authorization: 'Bearer ' + B.token });
  check('another user is unaffected', b.status === 200 && b.json.viewer === 'session', b.status);
  return finish(LABEL);
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish(LABEL); });
