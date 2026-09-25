// K5B Part 1 — browser JSON / DOM / URL leak scan.
// Part 1 changes no UI, so this drives a real Chromium on the PRODUCTION customer build, served from a different origin than
// the API (CORS enforced, no --disable-web-security), and calls GET /api/search from the page exactly as a browser client
// would (guest, then with the session token the app keeps in localStorage). It then scans:
//   JSON  — every /api/search response body the browser received,
//   URL   — every request URL the page made plus the page URL,
//   DOM   — the app DOM after the calls, plus the DTOs rendered into the page with textContent/href (what a UI would show),
//   store — localStorage/sessionStorage/cookies (search must not persist anything client-side).
// Run by run.cjs only when K5B_BROWSER=1 and K5B_APP_DIR points at a customer build (npx vite build).
const L = require('./lib.cjs');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { check, finish, pool } = L;
const { chromium } = require(process.env.K5B_PLAYWRIGHT || 'playwright');
const LABEL = 'k5b 05 browser json/dom/url leak scan';
const APP_DIR = process.env.K5B_APP_DIR;

function serveStatic(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let f = path.normalize(path.join(dir, decodeURIComponent(u.pathname)));
    if (!f.startsWith(dir)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ srv, url: 'http://127.0.0.1:' + srv.address().port })));
}

(async () => {
  if (!APP_DIR || !fs.existsSync(path.join(APP_DIR, 'index.html'))) { check('K5B_APP_DIR points at a customer build', false, APP_DIR); return finish(LABEL); }
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);

  const asha = await L.member('Asha Browser', { username: 'asha_browser', creator: true, avatar: 'data:image/png;base64,QUFB' });
  const viewer = await L.member('Vik Browser', { username: 'vik_browser' });
  const priv = await L.member('Pia Browser', { username: 'pia_browser', privateProfile: true });
  await L.follow(viewer, asha); await L.follow(viewer, priv);
  const v = await L.vendor(asha, { business: 'Browser Kiln' });
  const pr = await L.product(v, 'Browser kiln mug');
  const wu = await L.member('Browser Kiln Fixer');
  const w = await L.worker(wu, { code: 'HOWDI-WRK-K5B50001' });
  const c = await L.course('Browser kiln course');
  const skus = (await pool.query(`SELECT sku FROM vendor_products WHERE id=$1`, [pr.id])).rows.map((r) => r.sku);
  const vcode = (await pool.query(`SELECT vendor_code FROM vendor_profiles WHERE id=$1`, [v.id])).rows[0].vendor_code;
  const secrets = [];
  for (const m of [asha, viewer, priv, wu]) secrets.push(m.id, m.howdi, m.master, m.email, m.phone);
  secrets.push(v.id, pr.id, w.id, c.id, vcode, ...skus, '506002', '14 Private Kiln Lane');
  // The viewer's own token legitimately lives in the app's localStorage and is sent as a header; it must never appear
  // in a URL, a response body or the DOM.
  const tokenSecrets = [viewer.token, asha.token];

  const app = await serveStatic(APP_DIR);
  const browser = await chromium.launch({ executablePath: process.env.K5B_CHROMIUM || undefined, args: ['--no-sandbox'] });
  const API = L.base();
  const queries = ['browser', 'kiln', 'asha', 'mug', 'fixer', 'course', 'pia', "b' OR 1=1--", '100%_'];

  async function session(label, token) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    if (token) await ctx.addInitScript((t) => { try { localStorage.setItem('howdiSessionToken', t); } catch (e) {} }, token);
    await ctx.route(/^http:\/\/localhost:5000\//, (route) => route.continue({ url: route.request().url().replace('http://localhost:5000', API) }));
    const page = await ctx.newPage();
    const urls = [], bodies = [], errors = [];
    page.on('request', (r) => urls.push(r.url()));
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    page.on('response', async (r) => { if (/\/api\/search/.test(r.url())) { try { bodies.push({ url: r.url(), status: r.status(), headers: r.headers(), text: await r.text() }); } catch {} } });
    await page.goto(app.url + '/', { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => errors.push('goto: ' + e.message));
    const rendered = await page.evaluate(async ({ api, queries }) => {
      const out = [];
      const host = document.createElement('section'); host.id = 'k5b-search-probe'; document.body.appendChild(host);
      const token = (() => { try { return localStorage.getItem('howdiSessionToken'); } catch { return null; } })();
      for (const q of queries) {
        const r = await fetch(`${api}/api/search?q=${encodeURIComponent(q)}&limit=10`, { headers: token ? { authorization: 'Bearer ' + token } : {}, cache: 'no-store' });
        const j = await r.json().catch(() => null);
        out.push({ q, status: r.status, viewer: j && j.viewer, n: j && Array.isArray(j.results) ? j.results.length : -1 });
        for (const d of (j && j.results) || []) {           // render the public DTO the way a UI would: text + href only
          const a = document.createElement('a'); a.href = d.route; a.dataset.type = d.type; a.dataset.pillar = d.pillar;
          const t = document.createElement('strong'); t.textContent = d.title; a.appendChild(t);
          const s = document.createElement('span'); s.textContent = d.subtitle || ''; a.appendChild(s);
          if (d.image) { const i = document.createElement('img'); i.src = d.image; i.alt = ''; a.appendChild(i); }
          for (const b of d.badges) { const e = document.createElement('em'); e.textContent = b; a.appendChild(e); }
          host.appendChild(a);
        }
      }
      return out;
    }, { api: API, queries });
    await page.waitForTimeout(500);
    const dom = await page.evaluate(() => document.documentElement.outerHTML);
    const probeHrefs = await page.$$eval('#k5b-search-probe a', (as) => as.map((a) => a.getAttribute('href')));
    const storage = await page.evaluate(() => { const o = {}; for (const s of [localStorage, sessionStorage]) for (let i = 0; i < s.length; i++) o[(s === localStorage ? 'L:' : 'S:') + s.key(i)] = s.getItem(s.key(i)); return o; });
    const cookies = await ctx.cookies();
    const pageUrl = page.url();
    await ctx.close();
    return { label, urls, bodies, errors, rendered, dom, probeHrefs, storage, cookies, pageUrl };
  }

  const runs = [await session('guest', null), await session('signed-in', viewer.token)];
  for (const r of runs) {
    check(`${r.label}: every search call reached the API through CORS and returned 200`, r.rendered.length === queries.length && r.rendered.every((x) => x.status === 200), r.rendered);
    check(`${r.label}: viewer is ${r.label === 'guest' ? 'guest' : 'session'} (session only from the Bearer token)`, r.rendered.every((x) => x.viewer === (r.label === 'guest' ? 'guest' : 'session')), r.rendered.map((x) => x.viewer));
    check(`${r.label}: all four types were rendered into the DOM`, ['person', 'product', 'worker', 'course'].every((t) => r.dom.includes(`data-type="${t}"`)), '');
    check(`${r.label}: the browser captured every /api/search response body`, r.bodies.length === queries.length, r.bodies.length);
    // JSON
    const jsonKeyHits = r.bodies.flatMap((b) => { try { return L.forbiddenKeys(JSON.parse(b.text)); } catch { return ['unparseable']; } });
    const jsonValHits = r.bodies.flatMap((b) => L.leakedValues(b.text, [...secrets, ...tokenSecrets]));
    check(`${r.label} JSON: no forbidden keys`, jsonKeyHits.length === 0, jsonKeyHits.slice(0, 10));
    check(`${r.label} JSON: no private values (ids, UUIDs, emails, phones, tokens, sku, vendor code, pincode, address)`, jsonValHits.length === 0, jsonValHits.slice(0, 10));
    check(`${r.label} JSON: no long numeric member references`, !r.bodies.some((b) => L.LONG_NUMBER_RE.test(b.text)), '');
    check(`${r.label} JSON: every response was no-store`, r.bodies.every((b) => b.headers['cache-control'] === 'no-store'), r.bodies.map((b) => b.headers['cache-control']));
    // URL
    const searchUrls = r.urls.filter((u) => /\/api\/search/.test(u));
    const urlHits = [...searchUrls, r.pageUrl].flatMap((u) => L.leakedValues(decodeURIComponent(u), [...secrets, ...tokenSecrets]));
    check(`${r.label} URL: search request URLs carry only q and limit`, searchUrls.length === queries.length && searchUrls.every((u) => [...new URL(u).searchParams.keys()].join() === 'q,limit'), searchUrls.slice(0, 3));
    check(`${r.label} URL: no id, UUID, token or private value in any search URL or the page URL`, urlHits.length === 0, urlHits);
    check(`${r.label} URL: rendered hrefs are public-key routes only`, r.probeHrefs.length > 0 && r.probeHrefs.every((h) => Object.values(L.ROUTE_RE).some((re) => re.test(h))), r.probeHrefs.filter((h) => !Object.values(L.ROUTE_RE).some((re) => re.test(h))));
    // DOM
    const probeStart = r.dom.indexOf('id="k5b-search-probe"');
    const probeHtml = probeStart >= 0 ? r.dom.slice(probeStart) : '';
    const domHits = L.leakedValues(probeHtml, [...secrets, ...tokenSecrets]);
    check(`${r.label} DOM: rendered search results contain no private value`, probeHtml.length > 0 && domHits.length === 0, domHits);
    check(`${r.label} DOM: no internal key names in rendered attributes`, !/data-(id|user-?id|uuid|howdi|master|email|phone|token)=/i.test(probeHtml), '');
    check(`${r.label} DOM: no long numeric member references in rendered results`, !L.LONG_NUMBER_RE.test(probeHtml.replace(/data:image\/[^"]+/g, '')), '');
    check(`${r.label} DOM: whole-page DOM carries no search-derived private value`, L.leakedValues(r.dom, secrets.filter((x) => typeof x === 'string' && x.length > 6)).length === 0, L.leakedValues(r.dom, secrets.filter((x) => typeof x === 'string' && x.length > 6)));
    check(`${r.label} DOM: the injection probe query was only ever text (no script/markup injected)`, !/<script[^>]*>[^<]*1=1/i.test(r.dom), '');
    // storage
    const stored = JSON.stringify(r.storage) + JSON.stringify(r.cookies);
    check(`${r.label} storage: search wrote nothing to local/session storage or cookies`, !/k5b|search|browser kiln|PRD-|CRS-/i.test(stored), Object.keys(r.storage));
    check(`${r.label}: no page error from the search calls`, !r.errors.some((e) => /search|k5b/i.test(e)), r.errors.slice(0, 3));
  }
  const g = runs[0].rendered.find((x) => x.q === 'pia'), sgn = runs[1].rendered.find((x) => x.q === 'pia');
  check('guest does not see the follower-only profile; the signed-in follower does', g.n === 0 && sgn.n === 1, { guest: g, signedIn: sgn });

  await browser.close(); app.srv.close();
  check('search terms never reach the server log', !/browser kiln|asha|fixer/i.test(L.serverLog().split('\n').filter((l) => /search/i.test(l)).join('\n')), '');
  return finish(LABEL);
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish(LABEL); });
