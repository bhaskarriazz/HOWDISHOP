// K5A Phase 1 — internal-ID leak crawl across all 16 sections, feed pages and by-code reads, as guest and signed in.
const L = require('./lib.cjs');
const { check, finish, pool } = L;

(async () => {
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish('k5a 03 leak crawl');

  const A = await L.member('Anu Leak', { username: 'anu_leak', creator: true, avatar: 'data:image/png;base64,QUFB' });
  const B = await L.member('Bala Leak', { username: 'bala_leak', creator: true });
  await L.follow(A, B);
  const made = [];
  for (let i = 0; i < 14; i++) made.push(await L.post(i % 2 ? A : B, `LEAK post ${i}`));
  const art = await L.post(B, 'body', { type: 'ARTICLE', title: 'LEAK article' });
  const st = await L.story(B, 'LEAK story');
  const v = await L.vendor(B);
  const pr = await L.product(v, 'LEAK product');
  const w = await L.worker(A, { code: 'HOWDI-WRK-K5A20001' });
  const c = await L.course('LEAK course');
  await L.enroll(A, c, 55);
  const sp = await L.community(B, 'LEAK group', 'leak-group');
  const vb = await L.vibe(B, 'VIBE-K5A-LEAK1', 'LEAK vibe');
  await pool.query(`INSERT INTO vibe_watch_session_items(session_id,user_id,vibe_id,max_completion_percent,completed,last_seen_at,max_position_ms) VALUES('s1',$1,$2::uuid,40,FALSE,NOW(),12000)`, [String(A.id), vb.id]);
  await L.notify(A, B, 'LEAK notification');
  await L.special('LEAK special', 'https://example.org/festival');
  await L.quote('LEAK quote', 'HOWDI');

  const secrets = [];
  for (const m of [A, B]) secrets.push(m.id, m.howdi, m.master, m.email, m.phone, m.token);
  for (const x of [...made, art, st, pr, sp]) secrets.push(x.id);
  secrets.push(v.id, w.id, c.id, vb.id, '506002', '14 Private Kiln Lane');

  const responses = [];
  for (const opts of [{}, { token: A.token }, { token: B.token }]) {
    responses.push(['home default', await L.home('', opts)]);
    responses.push(['home all', await L.homeAll(opts)]);
    for (const k of L.ALL.split(',')) responses.push(['home ' + k, await L.home('sections=' + k, opts)]);
    let f = await L.feed('limit=5', opts); responses.push(['feed p1', f]);
    let guard = 0;
    while (f.json?.next_cursor && guard++ < 6) { f = await L.feed('limit=5&cursor=' + encodeURIComponent(f.json.next_cursor), opts); responses.push(['feed pN', f]); }
  }
  const all = await L.homeAll({ token: A.token });
  for (const code of L.codesIn(all.json)) {
    if (/^(PST|ART)-/.test(code)) responses.push(['post by code', await L.api('GET', '/api/connect/posts/by-code/' + code, { token: A.token })]);
    if (/^STY-/.test(code)) responses.push(['story by code', await L.api('GET', '/api/connect/stories/by-code/' + code)]);
  }
  check('crawl covered the Home, feed pages and by-code reads', responses.length > 60 && responses.every(([, r]) => r.status === 200), responses.filter(([, r]) => r.status !== 200).map(([n, r]) => n + ' ' + r.status));
  check('the crawl actually saw populated data in every data section', ['stories', 'forYou', 'vibes', 'continueWatching', 'recommendedCreators', 'communities', 'trendingArticles', 'shopRecommendations', 'worksRecommendations', 'learnRecommendations', 'recentActivity', 'continueYourJourney']
    .every((k) => (all.json.sections[k].items || []).length > 0) && all.json.sections.special.item && all.json.sections.dailyQuote.item, Object.fromEntries(Object.entries(all.json.sections).map(([k, s]) => [k, (s.items || []).length])));
  let keyHits = [], valueHits = [];
  for (const [name, r] of responses) {
    keyHits.push(...L.forbiddenKeys(r.json).map((h) => name + ' ' + h));
    valueHits.push(...L.leakedValues(r.text, secrets).map((h) => name + ' ' + h));
  }
  check('no forbidden key (ids, UUIDs, howdi/master ids, email, phone, address, score, moderation, status) anywhere', keyHits.length === 0, keyHits.slice(0, 20));
  check('no internal value (numeric ids, UUIDs, howdi/master ids, emails, phones, tokens, pincode, address) anywhere', valueHits.length === 0, valueHits.slice(0, 20));
  const routes = responses.flatMap(([, r]) => [...r.text.matchAll(/"route":"([^"]+)"/g)].map((m) => m[1]));
  check('every route is a public-key route (no numeric or UUID segment)', routes.length > 20 && routes.every((rt) => !rt.split('/').some((seg) => /^\d+$/.test(seg) || L.UUID_RE.test(seg))), routes.filter((rt) => rt.split('/').some((seg) => /^\d+$/.test(seg))));
  const cursors = responses.map(([, r]) => r.json?.next_cursor || r.json?.sections?.forYou?.next_cursor).filter(Boolean);
  check('cursors were issued during the crawl', cursors.length >= 3, cursors.length);
  const readable = cursors.filter((cur) => { const b = Buffer.from(cur.slice(4), 'base64url').toString('latin1'); return /[{}":]|\bs\b|\bp\b/.test(b.replace(/[^\x20-\x7e]/g, '')) && /"[a-z]":/.test(b); });
  check('cursors are opaque ciphertext: no readable JSON, ids or positions', cursors.every((cur) => /^hc1\.[A-Za-z0-9_-]+$/.test(cur)) && readable.length === 0 && L.leakedValues(cursors.join(' '), secrets).length === 0, readable.slice(0, 2));
  const again = await L.feed('limit=5', { token: A.token });
  check('two cursors for the same position differ (fresh IV each time)', again.json.next_cursor !== responses.find(([n]) => n === 'feed p1')[1].json.next_cursor, '');
  check('continue-watching exposes a progress percentage, not internal watch rows', all.json.sections.continueWatching.items[0].progress_percent === 40 && !JSON.stringify(all.json.sections.continueWatching).includes('12000'), all.json.sections.continueWatching.items[0]);

  check('no uncaught server error occurred', !/UnhandledPromiseRejection|uncaughtException|\[K5A home\] (section|request)/i.test(L.serverLog()), L.serverLog().slice(-800));
  return finish('k5a 03 leak crawl');
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish('k5a 03 leak crawl'); });
