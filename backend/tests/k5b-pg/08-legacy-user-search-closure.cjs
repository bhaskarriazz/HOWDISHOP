// Security closure — legacy /api/users/search and /api/users/mention-search (K5B verification observation 3, legacy P0).
// Before: guests got users.id + howdi_id and could match on email / phone substrings (account enumeration).
// After: signed-in only, public @handle / display-name matching only, public DTO only, blocks/private/self excluded, rate limited.
const L = require('./lib.cjs');
const { check, finish } = L;
const LABEL = 'k5b 08 legacy user-search closure';
const PATHS = ['/api/users/search', '/api/users/search/', '/api/users/mention-search', '/api/users/mention-search/'];
const ALLOWED = ['public_username', 'display_name', 'avatar_url'];

(async () => {
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const V = await L.member('Viewer Vani', { username: 'vani_viewer' });
  const A = await L.member('Asha Potter', { username: 'asha_pots' });
  const B = await L.member('Asha Blocked', { username: 'asha_blocked' });
  const C = await L.member('Asha Blocker', { username: 'asha_blocker' });
  const P = await L.member('Asha Private', { username: 'asha_private', privateProfile: true });
  const H = await L.member('Asha Hidden', { username: 'asha_hidden', discoverable: false });
  const S = await L.member('Asha Suspended', { username: 'asha_susp', accountStatus: 'SUSPENDED' });
  const N = await L.member('Asha NoHandle');
  await L.block(V, B); await L.block(C, V);
  const secrets = [V, A, B, C, P, H, S, N].flatMap((m) => [String(m.id), m.howdi, m.email, m.phone]).filter(Boolean);

  for (const p of PATHS) {
    for (const q of ['', 'asha', A.email, A.phone, A.howdi]) {
      const r = await L.api('GET', p + '?q=' + encodeURIComponent(q));
      check(`guest ${p}?q=${q ? '[' + (q === A.email ? 'email' : q === A.phone ? 'phone' : q === A.howdi ? 'howdi_id' : q) + ']' : ''} → 401, no user data`, r.status === 401 && !/public_username|howdi_id|"id"/.test(r.text), r.status + ' ' + r.text.slice(0, 120));
    }
    const forged = await L.api('GET', p + '?q=asha', { headers: { authorization: 'Bearer forged-' + Date.now() } });
    check(`forged token ${p} → 401`, forged.status === 401, forged.status);
  }

  const r = await L.api('GET', '/api/users/search?q=asha', { token: V.token });
  const users = r.json?.users || [];
  const handles = users.map((u) => u.public_username).sort();
  check('signed-in search returns only the visible public profile', r.status === 200 && JSON.stringify(handles) === JSON.stringify(['asha_pots']), JSON.stringify(handles));
  check('DTO is exactly {public_username, display_name, avatar_url}', users.every((u) => JSON.stringify(Object.keys(u).sort()) === JSON.stringify([...ALLOWED].sort())), JSON.stringify(users));
  const leaked = secrets.filter((x) => r.text.includes(x));
  check('response carries no internal id, howdi_id, email or phone of anyone', leaked.length === 0, leaked);
  const raw = await fetch(L.base() + '/api/users/search?q=asha', { headers: { authorization: 'Bearer ' + V.token } });
  check('Cache-Control: no-store on the response', /no-store/.test(raw.headers.get('cache-control') || ''), raw.headers.get('cache-control'));

  for (const [what, q] of [['email', A.email], ['email local part', A.email.split('@')[0]], ['phone', A.phone], ['phone digits', A.phone.slice(3)], ['howdi_id', A.howdi], ['internal id', String(A.id)]]) {
    const x = await L.api('GET', '/api/users/search?q=' + encodeURIComponent(q), { token: V.token });
    check(`signed-in search by ${what} matches nobody (no enumeration)`, x.status === 200 && (x.json?.users || []).length === 0, x.text.slice(0, 160));
  }
  const self = await L.api('GET', '/api/users/search?q=vani', { token: V.token });
  check('the viewer never finds themself', (self.json?.users || []).length === 0, self.text.slice(0, 120));
  const handle = await L.api('GET', '/api/users/mention-search?q=%40asha_p', { token: V.token });
  check('@handle prefix works on the mention alias', (handle.json?.users || []).map((u) => u.public_username).join() === 'asha_pots', handle.text.slice(0, 160));
  const blockedView = await L.api('GET', '/api/users/search?q=vani', { token: B.token });
  check('a user the viewer blocked cannot find the viewer either', (blockedView.json?.users || []).length === 0, blockedView.text.slice(0, 120));
  for (const q of ['%', '_', '\\', 'a%', '%25']) {
    const x = await L.api('GET', '/api/users/search?q=' + encodeURIComponent(q), { token: V.token });
    check(`LIKE wildcard "${q}" is literal (no match-all)`, x.status === 200 && (x.json?.users || []).length === 0, x.text.slice(0, 120));
  }
  for (const qs of ['q=asha&userId=1', 'q=asha&q=b', 'q=asha&limit=100', 'id=1']) {
    const x = await L.api('GET', '/api/users/search?' + qs, { token: V.token });
    check(`unknown / duplicated parameter (${qs}) → 400`, x.status === 400, x.status);
  }
  const ctl = await L.api('GET', '/api/users/search?q=' + encodeURIComponent('as\u0001ha'), { token: V.token });
  check('control characters → 400', ctl.status === 400, ctl.status);
  const empty = await L.api('GET', '/api/users/search?q=', { token: V.token });
  check('empty query returns no users (no directory dump)', empty.status === 200 && (empty.json?.users || []).length === 0, empty.text.slice(0, 120));

  let ok = 0, limited = 0;
  for (let i = 0; i < 70; i++) { const x = await L.api('GET', '/api/users/search?q=asha', { token: A.token, headers: { 'x-forwarded-for': `203.0.113.${i + 1}` } }); if (x.status === 200) ok++; if (x.status === 429) limited++; }
  check('per-user rate limit: 60/min then 429, X-Forwarded-For does not reset it', ok === 60 && limited === 10, `${ok} ok / ${limited} limited`);
  finish(LABEL);
})().catch((e) => { console.error(e); process.exit(1); });
