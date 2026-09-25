// K5A Phase 1 — session-personalised Home; the session is the only actor; blocks and audience rules per viewer.
const L = require('./lib.cjs');
const { check, finish, pool } = L;
const itemsText = (j, k) => JSON.stringify(j?.sections?.[k] || {});

(async () => {
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish('k5a 02 session spoof blocks');

  const A = await L.member('Anu Viewer', { username: 'anu_viewer' });
  const B = await L.member('Bala Maker', { username: 'bala_maker', creator: true });
  const C = await L.member('Chitra Maker', { username: 'chitra_maker', creator: true });
  const X = await L.member('Xavier Blocked', { username: 'xavier_blocked', creator: true });
  const Y = await L.member('Yamini Blocker', { username: 'yamini_blocker', creator: true });
  const P = await L.member('Pavan Private', { username: 'pavan_private', privateProfile: true, creator: true });
  await L.follow(A, B); await L.follow(A, P);
  await L.block(A, X); await L.block(Y, A);

  await L.post(B, 'SESS-B-PUBLIC');
  await L.post(B, 'SESS-B-FOLLOWERS', { audience: 'FOLLOWERS' });
  await L.post(C, 'SESS-C-FOLLOWERS', { audience: 'FOLLOWERS' });
  await L.post(P, 'SESS-P-PRIVATE-AUTHOR');
  await L.post(X, 'SESS-X-BLOCKED-BY-A');
  await L.post(Y, 'SESS-Y-BLOCKED-A');
  await L.post(X, 'body', { type: 'ARTICLE', title: 'SESS-X-ARTICLE' });
  const sB = await L.story(B, 'SESS-B-STORY');
  await L.story(X, 'SESS-X-STORY');
  await L.story(Y, 'SESS-Y-STORY');
  await L.viewStory(sB, A);
  await L.product(await L.vendor(X, { business: 'X Kiln' }), 'SESS-X-PRODUCT');
  await L.product(await L.vendor(B, { business: 'B Kiln' }), 'SESS-B-PRODUCT');
  await L.worker(Y, { code: 'HOWDI-WRK-K5A10001' });
  await L.community(X, 'SESS-X-GROUP', 'x-group');
  const course = await L.course('SESS-COURSE resume me');
  await L.enroll(A, course, 35);
  await L.notify(A, B, 'SESS-NOTIFY-A from bala');
  await L.notify(A, X, 'SESS-NOTIFY-A from blocked');
  await L.notify(B, C, 'SESS-NOTIFY-B-ONLY');

  const guest = await L.homeAll();
  const asA = await L.homeAll({ token: A.token });
  const asB = await L.homeAll({ token: B.token });
  check('signed-in manifest: viewer=session, home_variant=personalized', asA.json?.viewer === 'session' && asA.json?.home_variant === 'personalized', asA.json?.viewer);
  check('follower sees followers-only post of someone they follow; guest and non-followers do not',
    itemsText(asA.json, 'forYou').includes('SESS-B-FOLLOWERS') && !itemsText(guest.json, 'forYou').includes('SESS-B-FOLLOWERS') && !itemsText(asA.json, 'forYou').includes('SESS-C-FOLLOWERS'), '');
  check('followed private profile is visible to its follower only', itemsText(asA.json, 'forYou').includes('SESS-P-PRIVATE-AUTHOR') && !itemsText(guest.json, 'forYou').includes('SESS-P-PRIVATE-AUTHOR') && !itemsText(asB.json, 'forYou').includes('SESS-P-PRIVATE-AUTHOR'), '');
  const aAll = asA.text;
  check('member A blocked is absent everywhere for A (feed, stories, articles, people, shop, communities, activity actor)',
    !/SESS-X-|xavier_blocked/.test(aAll.replace(/"message":"SESS-NOTIFY-A from blocked"/, '')), aAll.match(/SESS-X-[A-Z]+|xavier_blocked/g));
  check('member who blocked A is absent everywhere for A (feed, stories, works worker)', !/SESS-Y-|yamini_blocker|HOWDI-WRK-K5A10001/.test(aAll), aAll.match(/SESS-Y-[A-Z]+|yamini_blocker|HOWDI-WRK-K5A10001/g));
  check('guest still sees those public members/content (blocks are viewer-specific)', guest.text.includes('SESS-X-BLOCKED-BY-A') && guest.text.includes('HOWDI-WRK-K5A10001'), '');
  check('story viewed flag is per viewer', asA.json.sections.stories.items.find((s) => s.author.public_username === 'bala_maker')?.viewed === true
    && asB.json.sections.stories.items.find((s) => s.author.public_username === 'bala_maker')?.viewed === false, '');
  check('Continue Your Journey belongs to the session user', itemsText(asA.json, 'continueYourJourney').includes('SESS-COURSE') && !itemsText(asB.json, 'continueYourJourney').includes('SESS-COURSE'), asA.json.sections.continueYourJourney);
  check('Recent Activity belongs to the session user', itemsText(asA.json, 'recentActivity').includes('SESS-NOTIFY-A from bala') && !itemsText(asA.json, 'recentActivity').includes('SESS-NOTIFY-B-ONLY') && itemsText(asB.json, 'recentActivity').includes('SESS-NOTIFY-B-ONLY'), '');
  const blockedActor = asA.json.sections.recentActivity.items.find((n) => n.message === 'SESS-NOTIFY-A from blocked');
  check('a notification from a blocked member never carries their identity', !blockedActor || blockedActor.actor === null, blockedActor);
  check('suggested people exclude who A already follows; creators show follow state', !itemsText(asA.json, 'suggestedPeople').includes('bala_maker') && asA.json.sections.recommendedCreators.items.find((p) => p.public_username === 'bala_maker')?.following === true, '');

  // ---------------- spoofed actor identifiers
  const base = JSON.stringify(asA.json);
  for (const q of [`userId=${B.id}`, `user_id=${B.id}`, `viewerId=${B.id}`, `viewer_id=${B.id}`]) {
    const r = await L.home(`sections=${L.ALL}&${q}`, { token: A.token });
    check(`session A + ${q.split('=')[0]}=B still acts as A`, r.status === 200 && JSON.stringify(r.json) === base, r.text.slice(0, 200));
    const g = await L.home(`sections=${L.ALL}&${q}`);
    check(`guest + ${q.split('=')[0]}=B stays a guest`, g.status === 200 && g.json.viewer === 'guest' && g.json.sections.recentActivity.state === 'hidden', g.text.slice(0, 160));
  }
  for (const q of [`accountId=${B.id}`, `masterId=${B.master}`, `howdiId=${B.howdi}`, 'actor=bala_maker', `sections=forYou&forYouCursor=abc`]) {
    const r = await L.home(q, { token: A.token });
    check(`unknown actor-like parameter ${q.split('=')[0]} is rejected, not honoured`, r.status === 400 && r.json?.code === 'INVALID_HOME_PARAMETER' && !r.text.includes(String(B.id)), r.text);
  }
  const hdr = await L.homeAll({ token: A.token, headers: { 'x-howdi-user-id': String(B.id), 'x-user-id': String(B.id), 'x-howdi-worker-id': String(B.id), 'x-viewer-id': String(B.id) } });
  check('actor headers naming B are ignored for session A', JSON.stringify(hdr.json) === base, '');
  const hdrG = await L.homeAll({ headers: { 'x-howdi-user-id': String(A.id) } });
  check('actor headers cannot turn a guest into A', hdrG.json.viewer === 'guest' && JSON.stringify(hdrG.json) === JSON.stringify(guest.json), '');
  const bad = await L.homeAll({ token: 'tok-forged' });
  check('unknown bearer token → curated guest Home', bad.status === 200 && bad.json.viewer === 'guest', bad.text.slice(0, 100));
  await pool.query(`UPDATE users SET account_status='SUSPENDED' WHERE id=$1`, [C.id]);
  const suspended = await L.homeAll({ token: C.token });
  check('suspended account session → curated guest Home (no personal data)', suspended.json.viewer === 'guest' && suspended.json.sections.recentActivity.state === 'hidden', suspended.json.viewer);
  await pool.query(`UPDATE user_sessions SET is_active=FALSE WHERE user_id=$1`, [B.id]);
  const revoked = await L.homeAll({ token: B.token });
  check('revoked session → curated guest Home', revoked.json.viewer === 'guest', revoked.json.viewer);

  check('no uncaught server error occurred', !/UnhandledPromiseRejection|uncaughtException|\[K5A home\] (section|request)/i.test(L.serverLog()), L.serverLog().slice(-800));
  return finish('k5a 02 session spoof blocks');
})().catch((e) => { console.error(e); L.check('suite crashed', false, e.message); return L.finish('k5a 02 session spoof blocks'); });
