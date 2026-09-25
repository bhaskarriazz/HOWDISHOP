// K5B Part 1 — public-code deep-link safety: PRD-/CRS- codes come from the shared K5A howdi_public_refs registry,
// are stable, carry no internal value, are issued only for visible rows, cannot be used to look records up, and a
// record hidden after its code was issued is never returned again.
const L = require('./lib.cjs');
const { check, finish, pool } = L;
const LABEL = 'k5b 04 public-code deep-link safety';

(async () => {
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);

  const owner = await L.member('Neha Owner', { username: 'neha_owner' });
  const viewer = await L.member('Vani Viewer', { username: 'vani_viewer' });
  const v = await L.vendor(owner, { business: 'Neha Looms' });
  const p1 = await L.product(v, 'Nimbus shawl');
  const p2 = await L.product(v, 'Nimbus stole');
  const pHidden = await L.product(v, 'Nimbus draft', { status: 'draft' });
  const c1 = await L.course('Nimbus knitting');
  const cHidden = await L.course('Nimbus review', { publish: 'REVIEW' });
  await L.worker(await L.member('Nimbus Fixer'), { code: 'HOWDI-WRK-K5B30001' });
  await L.worker(await L.member('Nimbus Uuidcode'), { code: '3f2a9c1e-8b7d-4e6f-9a0b-1c2d3e4f5a6b' });

  // Home (K5A) issues first for one product, Search reuses it: one shared registry.
  const home = await L.home('sections=shopRecommendations,learnRecommendations');
  const homeCodes = L.codesInText(home.json);
  const r1 = await L.s('nimbus', 'limit=10');
  const codes = L.codesInText(r1.json);
  const prd = codes.filter((c) => c.startsWith('PRD-')), crs = codes.filter((c) => c.startsWith('CRS-'));
  check('search returns PRD- codes for both visible products and a CRS- code for the visible course', prd.length === 2 && crs.length === 1, codes);
  check('Search and K5A Home share one code per record (howdi_public_refs)', homeCodes.filter((c) => /^(PRD|CRS)-/.test(c)).every((c) => codes.includes(c)) && homeCodes.length > 0, { homeCodes, codes });
  check('codes are exactly the registry rows for those records', (await L.refFor('PRODUCT', p1.id)) && prd.includes(await L.refFor('PRODUCT', p1.id)) && prd.includes(await L.refFor('PRODUCT', p2.id)) && crs[0] === await L.refFor('COURSE', c1.id), '');
  const again = await L.s('nimbus', 'limit=10', { token: viewer.token });
  check('codes are stable across requests and viewers', JSON.stringify(L.codesInText(again.json).sort()) === JSON.stringify(codes.sort()), '');
  const rowCount = Number((await pool.query(`SELECT COUNT(*) FROM howdi_public_refs WHERE entity_type IN ('PRODUCT','COURSE')`)).rows[0].count);
  await L.s('nimbus', 'limit=10'); await L.s('nimbus shawl');
  check('repeat searches never mint duplicate codes', Number((await pool.query(`SELECT COUNT(*) FROM howdi_public_refs WHERE entity_type IN ('PRODUCT','COURSE')`)).rows[0].count) === rowCount, rowCount);

  // Code shape: prefix + 12 random hex, no id / UUID / predictable derivation.
  const all = [...prd, ...crs];
  check('every code is PRD-/CRS- + 12 uppercase hex', all.every((c) => /^(PRD|CRS)-[0-9A-F]{12}$/.test(c)), all);
  check('no code embeds the internal numeric id or any part of the course UUID', all.every((c) => !c.includes(String(p1.id)) && !c.includes(String(p2.id)) && !c.toLowerCase().includes(String(c1.id).split('-')[0])), all);
  check('codes of consecutive products are unrelated (not sequential)', prd[0].slice(4) !== prd[1].slice(4) && Math.abs(parseInt(prd[0].slice(4), 16) - parseInt(prd[1].slice(4), 16)) > 1, prd);

  // Hidden rows: never issued a code.
  check('no code was issued for the hidden product or hidden course', !(await L.refFor('PRODUCT', pHidden.id)) && !(await L.refFor('COURSE', cHidden.id)), '');

  // Codes and internal keys cannot be used as search lookups.
  const lookups = [prd[0], crs[0], String(p1.id), String(c1.id), 'PRD-000000000000', 'CRS-FFFFFFFFFFFF', String(pHidden.id)];
  for (const q of lookups) {
    const r = await L.s(q);
    check(`q="${q.slice(0, 16)}…" finds nothing (codes and internal keys are not searchable handles)`, r.status === 200 && r.json.results.length === 0, L.titles(r));
  }

  // A record hidden after its code was issued is never returned again, although the registry row persists.
  const shawlCode = await L.refFor('PRODUCT', p1.id);
  await pool.query(`UPDATE vendor_products SET archived_at=NOW() WHERE id=$1`, [p1.id]);
  const afterHide = await L.s('nimbus', 'limit=10');
  check('an archived product no longer appears and its code is not exposed', !JSON.stringify(afterHide.json).includes(shawlCode) && !L.titles(afterHide).includes('Nimbus shawl'), L.titles(afterHide));
  check('its registry row remains (codes are stable if it is restored)', (await L.refFor('PRODUCT', p1.id)) === shawlCode, '');
  await pool.query(`UPDATE vendor_products SET archived_at=NULL WHERE id=$1`, [p1.id]);
  check('restored product returns with the same code', L.codesInText((await L.s('nimbus shawl')).json).includes(shawlCode), '');

  // Codes do not open anything they should not through existing endpoints.
  const wrongKind = await L.api('GET', '/api/connect/posts/by-code/' + prd[0]);
  check('a PRD- code is rejected by the K5A post reader like any unknown code (404)', wrongKind.status === 404 && wrongKind.json?.code === 'NOT_FOUND', wrongKind.status);
  const legacyShop = await L.api('GET', '/api/shop/catalogue/products/' + prd[0]);
  check('the Shop catalogue does not treat a PRD- code as a product id (no 200)', legacyShop.status !== 200 && !/Nimbus/.test(legacyShop.text), legacyShop.status);

  // Routes: public-key only, no query string, no traversal, worker codes only when safe.
  const rts = L.routes(await L.s('nimbus', 'limit=10'));
  check('every route matches its type\'s public-route pattern', L.dtoProblems(await L.s('nimbus', 'limit=10')).length === 0 && rts.length === 4, rts);
  check('no route has a query string, fragment, scheme, traversal or numeric/UUID segment', rts.every((rt) => !/[?#]|:\/\/|\.\./.test(rt) && !rt.split('/').some((seg) => /^\d+$/.test(seg) || L.UUID_RE.test(seg))), rts);
  check('a worker whose code is UUID-shaped is excluded (never exposed as a route key)', !rts.some((rt) => /3f2a9c1e/i.test(rt)) && rts.includes('/works/workers/HOWDI-WRK-K5B30001'), rts);

  check('no uncaught server error / search failure logged', !/UnhandledPromiseRejection|uncaughtException|\[K5B search\]/i.test(L.serverLog()), L.serverLog().slice(-800));
  return finish(LABEL);
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish(LABEL); });
