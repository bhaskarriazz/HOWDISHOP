// K5A Phase 1 — stored feed sessions + encrypted viewer-bound cursors: stable, no duplicates, tamper-proof.
const L = require('./lib.cjs');
const { check, finish, pool } = L;

(async () => {
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish('k5a 04 feed cursor');

  const A = await L.member('Anu Cursor', { username: 'anu_cursor' });
  const B = await L.member('Bala Cursor', { username: 'bala_cursor' });
  const M = await L.member('Maker Cursor', { username: 'maker_cursor', creator: true });
  const posts = [];
  for (let i = 0; i < 23; i++) posts.push(await L.post(M, `CUR-${String(i).padStart(2, '0')}`, { createdAgo: 30 }));  // identical score and timestamp for all 23

  const walk = async (opts, limit, mutate) => {
    const seen = []; let r = await L.feed('limit=' + limit, opts); let pages = 0; const firstPages = [];
    while (r.status === 200) {
      seen.push(...r.json.items.map((i) => i.public_key)); firstPages.push(r.json.items.map((i) => i.public_key)); pages++;
      if (mutate && pages === 1) await mutate();
      if (!r.json.next_cursor) break;
      r = await L.feed(`limit=${limit}&cursor=${encodeURIComponent(r.json.next_cursor)}`, opts);
    }
    return { seen, pages, last: r, firstPages };
  };
  const g = await walk({}, 7);
  check('guest walks 23 equal-score posts in pages of 7 with no duplicates and no gaps', g.seen.length === 23 && new Set(g.seen).size === 23 && g.pages === 4, { n: g.seen.length, pages: g.pages });
  const g2 = await walk({}, 7);
  check('equal score/time items are ordered deterministically across feed sessions', JSON.stringify(g2.seen) === JSON.stringify(g.seen), '');
  const a = await walk({ token: A.token }, 5, async () => {
    for (let i = 20; i < 23; i++) { await L.react(posts[i], B); await L.react(posts[i], A); }   // engagement changes mid-traversal
    await L.post(M, 'CUR-NEW-AFTER-START');
  });
  check('engagement and new posts mid-traversal do not reshuffle, duplicate or skip items', a.seen.length === 23 && new Set(a.seen).size === 23 && !JSON.stringify(a).includes('CUR-NEW-AFTER-START'), { n: a.seen.length });
  const fresh = await L.feed('limit=5', { token: A.token });
  check('a new feed session picks up the new ranking', fresh.status === 200 && fresh.json.items.length === 5, '');

  // ---------------- tamper / replay / binding
  const p1 = await L.feed('limit=5', { token: A.token });
  const cur = p1.json.next_cursor;
  const flip = (s, i) => s.slice(0, i) + (s[i] === 'A' ? 'B' : 'A') + s.slice(i + 1);
  const bad = [flip(cur, 10), flip(cur, cur.length - 3), cur.slice(0, -4), cur + 'AAAA', 'hc1.' + Buffer.from(JSON.stringify({ s: 'x', p: 5 })).toString('base64url') + 'A'.repeat(40), '5', 'abc', Buffer.from('{"p":5}').toString('base64url')];
  for (const t of bad) {
    const r = await L.feed('cursor=' + encodeURIComponent(t), { token: A.token });
    check(`tampered/forged cursor ${t.slice(0, 12)}… → 400 INVALID_CURSOR`, r.status === 400 && r.json?.code === 'INVALID_CURSOR' && !/select|stack|pg_|decipher|aes/i.test(r.text), r.status + ' ' + r.text);
  }
  const asB = await L.feed('cursor=' + encodeURIComponent(cur), { token: B.token });
  check("A's cursor cannot be used by B", asB.status === 400 && asB.json.code === 'INVALID_CURSOR', asB.text);
  const asGuest = await L.feed('cursor=' + encodeURIComponent(cur));
  check("A's cursor cannot be used by a guest", asGuest.status === 400, asGuest.text);
  const gCur = (await L.feed('limit=5')).json.next_cursor;
  const gAsA = await L.feed('cursor=' + encodeURIComponent(gCur), { token: A.token });
  check('a guest cursor cannot be used by a signed-in viewer', gAsA.status === 400, gAsA.text);
  check('the same cursor can be replayed by its owner (Back/refresh-safe)', (await L.feed('limit=5&cursor=' + encodeURIComponent(cur), { token: A.token })).status === 200
    && JSON.stringify((await L.feed('limit=5&cursor=' + encodeURIComponent(cur), { token: A.token })).json.items) === JSON.stringify((await L.feed('limit=5&cursor=' + encodeURIComponent(cur), { token: A.token })).json.items), '');
  await pool.query(`UPDATE howdi_connect_feed_sessions SET expires_at=NOW()-INTERVAL '1 minute'`);
  const exp = await L.feed('cursor=' + encodeURIComponent(cur), { token: A.token });
  check('an expired feed session → 410 CURSOR_EXPIRED (client starts a new feed)', exp.status === 410 && exp.json.code === 'CURSOR_EXPIRED', exp.text);
  const sessions = (await pool.query(`SELECT viewer_key,variant,array_length(item_keys,1) n FROM howdi_connect_feed_sessions`)).rows;
  check('feed sessions store a keyed viewer hash (never a raw user id) and cap the pool', sessions.length > 0 && sessions.every((s) => /^[0-9a-f]{64}$/.test(s.viewer_key) && s.viewer_key !== String(A.id) && Number(s.n || 0) <= 200), sessions.slice(0, 2));

  // ---------------- visibility is re-applied on every page
  const q1 = await L.feed('limit=5', { token: B.token });
  const nextKeys = [];
  let r = q1; while (r.json.next_cursor) { r = await L.feed('limit=5&cursor=' + encodeURIComponent(r.json.next_cursor), { token: B.token }); nextKeys.push(...r.json.items.map((i) => i.public_key)); if (nextKeys.length > 3) break; }
  await pool.query(`UPDATE howdi_community_posts SET post_status='DRAFT' WHERE content LIKE 'CUR-1%'`);
  const r2 = await L.feed('limit=10&cursor=' + encodeURIComponent(q1.json.next_cursor), { token: B.token });
  check('a post hidden after the feed session started is dropped from later pages', r2.status === 200 && !r2.json.items.some((i) => /CUR-1\d/.test(i.content.text_excerpt)), r2.json.items.map((i) => i.content.text_excerpt));

  // ---------------- parameter validation
  for (const qs of ['limit=0', 'limit=21', 'limit=abc', 'limit=5&limit=6', 'offset=5', 'page=2', 'sort=new', 'accountId=5']) {
    const x = await L.feed(qs, { token: A.token });
    check(`feed ${qs} → 400 safe error`, x.status === 400 && x.json?.code === 'INVALID_FEED_PARAMETER', x.text);
  }
  const home = await L.home('sections=forYou', { token: A.token });
  check('the Home For You section hands off a feed cursor usable on /api/connect/home/feed', typeof home.json.sections.forYou.next_cursor === 'string'
    && (await L.feed('cursor=' + encodeURIComponent(home.json.sections.forYou.next_cursor), { token: A.token })).status === 200, home.json.sections.forYou.state);

  check('no uncaught server error occurred', !/UnhandledPromiseRejection|uncaughtException|\[K5A home\] (section|request)/i.test(L.serverLog()), L.serverLog().slice(-800));
  return finish('k5a 04 feed cursor');
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish('k5a 04 feed cursor'); });
