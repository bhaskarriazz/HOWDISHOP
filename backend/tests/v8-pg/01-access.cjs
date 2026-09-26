// V8 S3 Access (board 05, AUTH-001–011) — real-PostgreSQL checks for backend/access-v8.cjs and the login throttle.
// Mode is chosen by the runner: V8_EXPECT_SANDBOX=1 runs on a *_preview database with HOWDI_PREVIEW_SANDBOX=1 (outbox ON);
// V8_EXPECT_SANDBOX=0 runs on an ordinary database with the SAME env flag set, proving the outbox stays inert there.
const crypto = require('node:crypto');
const L = require('../worker-pg/lib.cjs');
const { pool, check, finish, api } = L;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 01 access (${SANDBOX ? 'preview sandbox ON' : 'sandbox OFF'})`;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const outbox = (to) => api('GET', '/api/preview/outbox?to=' + encodeURIComponent(to));

(async () => {
  const started = await L.start(); check('server starts', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);

  // ---------- sandbox outbox gate
  const ob = await outbox('');
  if (SANDBOX) check('outbox readable on loopback in sandbox', ob.status === 200 && ob.json?.sandbox === true, ob.status + ' ' + ob.text.slice(0, 120));
  else {
    check('outbox is 404 outside a *_preview database even with HOWDI_PREVIEW_SANDBOX=1', ob.status === 404, ob.status);
    const t = (await pool.query(`SELECT to_regclass('public.howdi_preview_outbox') t`)).rows[0].t;
    check('no outbox table is created outside the sandbox', t === null, t);
  }
  check('outbox POST is never served', (await api('POST', '/api/preview/outbox', { body: {} })).status === 404);

  // ---------- fixtures
  const PW = 'Correct1234';
  const A = await L.mkUser('Asha Access', { email: 'asha.access@example.test', phone: '9123400001' });
  await pool.query(`UPDATE users SET password_hash=$2, is_active=TRUE WHERE id=$1`, [A.id, sha(PW)]);
  const B = await L.mkUser('Bala Other', { email: 'bala.other@example.test', phone: '9123400002' });
  await pool.query(`INSERT INTO howdi_connect_profiles(user_id,public_username,updated_at) VALUES($1,'bala_taken',NOW()) ON CONFLICT(user_id) DO UPDATE SET public_username='bala_taken'`, [B.id]);
  const secrets = [String(A.id), A.howdi, A.master, String(B.id), B.howdi];

  // ---------- OTP request never returns the code; sandbox captures it
  const otp = await api('POST', '/api/auth/otp/request', { body: { phone: A.phone } });
  check('OTP request → generic 200', otp.status === 200 && /If this mobile number/.test(otp.json?.message || ''), otp.text.slice(0, 160));
  check('OTP response carries no code', !/\b\d{6}\b/.test(otp.text), otp.text);
  if (SANDBOX) {
    const m = (await outbox(A.phone)).json?.messages?.[0];
    const code = (m?.body.match(/(\d{6})/) || [])[1];
    check('sandbox SMS captured in outbox', m?.channel === 'sms' && Boolean(code), m);
    const v = await api('POST', '/api/auth/otp/verify', { body: { phone: A.phone, code } });
    check('sandbox code signs in', v.status === 200 && Boolean(v.json?.token), v.status + ' ' + v.text.slice(0, 160));
  }

  // ---------- login throttle
  for (let i = 0; i < 8; i++) await api('POST', '/api/auth/login', { body: { email: A.email, password: 'wrong' + i } });
  const blocked = await api('POST', '/api/auth/login', { body: { email: A.email, password: PW } });
  check('9th attempt after 8 failures → 429 LOGIN_RATE_LIMITED, even with the right password', blocked.status === 429 && blocked.json?.code === 'LOGIN_RATE_LIMITED', blocked.status + ' ' + blocked.text.slice(0, 120));
  const other = await api('POST', '/api/auth/login', { body: { email: B.email, password: 'wrong' } });
  check('a different identifier is not throttled', other.status !== 429, other.status);
  const spoof = await api('POST', '/api/auth/login', { body: { email: A.email, password: PW }, headers: { 'x-forwarded-for': '203.0.113.' + Math.floor(Math.random() * 200) } });
  check('X-Forwarded-For does not reset the throttle (no trusted proxy)', spoof.status === 429, spoof.status);

  // ---------- forgot password
  const bad = await api('POST', '/api/auth/password/forgot', { body: { email: 'not-an-email' } });
  check('forgot: invalid e-mail → 400', bad.status === 400 && bad.json?.code === 'INVALID_EMAIL', bad.status);
  const unknown = await api('POST', '/api/auth/password/forgot', { body: { email: 'nobody.here@example.test' } });
  const known = await api('POST', '/api/auth/password/forgot', { body: { email: A.email }, headers: { origin: 'https://evil.example' } });
  check('forgot: unknown and known e-mail get byte-identical 200 bodies', unknown.status === 200 && known.status === 200 && unknown.text === known.text, [unknown.text, known.text]);
  check('forgot: response carries no token', !/token|reset-password/i.test(known.text), known.text);
  const resetRow = (await pool.query(`SELECT count(*)::int n FROM howdi_password_resets WHERE user_id=$1 AND used_at IS NULL`, [A.id])).rows[0].n;
  check('forgot: exactly one live reset token stored (hashed)', resetRow === 1, resetRow);
  const stored = (await pool.query(`SELECT token_hash FROM howdi_password_resets WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [A.id])).rows[0].token_hash;
  check('forgot: token stored as sha256 hex, not plaintext', /^[0-9a-f]{64}$/.test(stored), stored);
  let token = null;
  if (SANDBOX) {
    const mail = (await outbox(A.email)).json?.messages?.[0];
    token = (mail?.body.match(/token=([A-Za-z0-9_-]+)/) || [])[1];
    check('sandbox reset e-mail captured', Boolean(token) && sha(token) === stored, mail?.body);
    check('reset link uses the configured app origin, not the forged Origin header', /http:\/\/127\.0\.0\.1:5178\/reset-password#token=/.test(mail?.body || '') && !/evil\.example/.test(mail?.body || ''), mail?.body);
  } else {
    token = crypto.randomBytes(32).toString('base64url');
    await pool.query(`INSERT INTO howdi_password_resets(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+interval '30 minutes')`, [A.id, sha(token)]);
  }
  const lim = [];
  for (let i = 0; i < 3; i++) lim.push((await api('POST', '/api/auth/password/forgot', { body: { email: 'limit.me@example.test' } })).status);
  check('forgot: per-e-mail limit (3 / 15 min) → 4th is 429', lim.join() === '200,200,200' && (await api('POST', '/api/auth/password/forgot', { body: { email: 'limit.me@example.test' } })).status === 429, lim);

  // ---------- reset password
  const liveSession = (await L.mkUser('tmp', {})).token; // unrelated user, must stay signed in
  check('reset: malformed token → 400 RESET_LINK_INVALID', (await api('POST', '/api/auth/password/reset', { body: { token: 'abc', password: 'Newpass123' } })).json?.code === 'RESET_LINK_INVALID');
  check('reset: weak password → 400 WEAK_PASSWORD', (await api('POST', '/api/auth/password/reset', { body: { token, password: 'short' } })).json?.code === 'WEAK_PASSWORD');
  check('reset: letters-only password → 400 WEAK_PASSWORD', (await api('POST', '/api/auth/password/reset', { body: { token, password: 'onlyletters' } })).json?.code === 'WEAK_PASSWORD');
  const ok = await api('POST', '/api/auth/password/reset', { body: { token, password: 'Newpass123' } });
  check('reset: valid token → 200', ok.status === 200, ok.status + ' ' + ok.text.slice(0, 160));
  check('reset: password hash updated', (await pool.query(`SELECT password_hash FROM users WHERE id=$1`, [A.id])).rows[0].password_hash === sha('Newpass123'));
  check('reset: every session of that user revoked', (await pool.query(`SELECT count(*)::int n FROM user_sessions WHERE user_id=$1 AND is_active=TRUE`, [A.id])).rows[0].n === 0);
  check('reset: old session token now rejected', (await api('GET', '/api/v8/handle-available?handle=abcde', { token: A.token })).status === 401);
  check('reset: other users keep their sessions', (await api('GET', '/api/v8/handle-available?handle=abcde', { token: liveSession })).status === 200);
  const reuse = await api('POST', '/api/auth/password/reset', { body: { token, password: 'Another123' } });
  check('reset: token is single-use', reuse.status === 400 && reuse.json?.code === 'RESET_LINK_INVALID', reuse.text);
  const exp = crypto.randomBytes(32).toString('base64url');
  await pool.query(`INSERT INTO howdi_password_resets(user_id,token_hash,expires_at) VALUES($1,$2,NOW()-interval '1 minute')`, [A.id, sha(exp)]);
  check('reset: expired token → RESET_LINK_EXPIRED', (await api('POST', '/api/auth/password/reset', { body: { token: exp, password: 'Another123' } })).json?.code === 'RESET_LINK_EXPIRED');

  // ---------- handle availability
  const C = await L.mkUser('Chitra New', {});
  check('handle-available: guest → 401', (await api('GET', '/api/v8/handle-available?handle=chitra')).status === 401);
  const h1 = await api('GET', '/api/v8/handle-available?handle=bala_taken', { token: C.token });
  check('handle-available: taken', h1.json?.available === false && /taken/.test(h1.json?.reason), h1.text);
  check('handle-available: taken check is case-insensitive', (await api('GET', '/api/v8/handle-available?handle=BALA_TAKEN', { token: C.token })).json?.available === false);
  check('handle-available: reserved', (await api('GET', '/api/v8/handle-available?handle=admin', { token: C.token })).json?.available === false);
  check('handle-available: bad format', (await api('GET', '/api/v8/handle-available?handle=a%20b', { token: C.token })).json?.available === false);
  const h2 = await api('GET', '/api/v8/handle-available?handle=chitra_new', { token: C.token });
  check('handle-available: free handle', h2.json?.available === true, h2.text);
  check('handle-available: no internal ids in payload', !secrets.some((x) => h1.text.includes(x) || h2.text.includes(x)));

  // ---------- onboarding
  const base = { displayName: 'Chitra New', publicUsername: 'chitra_new', interests: ['Crochet', 'Food', 'NotAnInterest'], acceptTerms: true };
  check('onboarding: guest → 401', (await api('POST', '/api/v8/onboarding/profile', { body: base })).status === 401);
  const noTerms = await api('POST', '/api/v8/onboarding/profile', { token: C.token, body: { ...base, acceptTerms: false } });
  check('onboarding: terms required', noTerms.status === 400 && Boolean(noTerms.json?.errors?.acceptTerms), noTerms.text);
  const badAvatar = await api('POST', '/api/v8/onboarding/profile', { token: C.token, body: { ...base, avatarData: 'data:text/html;base64,PHNjcmlwdD4=' } });
  check('onboarding: non-image avatar rejected', badAvatar.status === 400 && Boolean(badAvatar.json?.errors?.avatarData), badAvatar.text);
  const badName = await api('POST', '/api/v8/onboarding/profile', { token: C.token, body: { ...base, displayName: '<script>' } });
  check('onboarding: markup in name rejected', badName.status === 400 && Boolean(badName.json?.errors?.displayName), badName.text);
  const taken = await api('POST', '/api/v8/onboarding/profile', { token: C.token, body: { ...base, publicUsername: 'bala_taken' } });
  check('onboarding: taken handle → 409', taken.status === 409, taken.status);
  const done = await api('POST', '/api/v8/onboarding/profile', { token: C.token, body: { ...base, userId: B.id, user_id: B.id } });
  check('onboarding: success', done.status === 200 && done.json?.profile?.public_username === 'chitra_new', done.text);
  check('onboarding: interests filtered to the allow-list', JSON.stringify(done.json?.profile?.interests) === '["Crochet","Food"]', done.json?.profile?.interests);
  check('onboarding: response has no internal id', !/"(id|user_id|howdi_id)"/.test(done.text) && !secrets.some((x) => done.text.includes(x)), done.text);
  check('onboarding: browser-supplied userId ignored (B untouched)', (await pool.query(`SELECT public_username FROM howdi_connect_profiles WHERE user_id=$1`, [B.id])).rows[0].public_username === 'bala_taken');
  check('onboarding: profile saved for the session user', (await pool.query(`SELECT public_username FROM howdi_connect_profiles WHERE user_id=$1`, [C.id])).rows[0]?.public_username === 'chitra_new');
  check('onboarding: two consents recorded', (await pool.query(`SELECT count(*)::int n FROM howdi_v8_consents WHERE user_id=$1`, [C.id])).rows[0].n === 2);

  await finish(LABEL);
})().catch(async (e) => { console.log('FAIL crashed', e && e.stack); await finish(LABEL); });
