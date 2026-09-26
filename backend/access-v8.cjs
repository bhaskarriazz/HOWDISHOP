'use strict';
// =====================================================================================
// HOWDI V8 S3 — Access support endpoints (Flow Register AUTH-006/007/008, preview sandbox for AUTH-002/007)
//
//   POST /api/auth/password/forgot      { email }                 → always the same generic 200 (no account probing)
//   POST /api/auth/password/reset       { token, password }       → one-time, 30-minute token; revokes every session
//   GET  /api/v8/handle-available?handle=                         → signed-in only; { available, reason }
//   POST /api/v8/onboarding/profile     { displayName, publicUsername, avatarData?, interests[], acceptTerms }
//   GET  /api/preview/outbox?to=                                  → PREVIEW SANDBOX ONLY (see below)
//
// Login throttle: failed password sign-ins are counted per (client IP, identifier); after 8 failures in 15 minutes the
// login endpoint answers 429 until the window passes. A successful sign-in clears that bucket.
//
// PREVIEW SANDBOX (no SMS / e-mail provider is connected yet): when — and only when — HOWDI_PREVIEW_SANDBOX=1 AND the
// connected database name ends in "_preview", outgoing OTP SMS and password-reset e-mails are written to a local outbox
// table instead of being sent, and GET /api/preview/outbox returns them to LOOPBACK callers only. In any other
// configuration the outbox is disabled, nothing is stored, and the route answers 404 exactly like an unknown path.
// =====================================================================================
const crypto = require('node:crypto');

const HANDLE_RE = /^[a-z0-9._]{3,30}$/;
const RESERVED = new Set(['admin', 'howdi', 'support', 'help', 'official', 'security', 'payments', 'hpay', 'root', 'system', 'me', 'settings', 'shop', 'works', 'learn', 'connect', 'home']);
const INTERESTS = ['Crochet', 'Handmade', 'Home decor', 'Fashion', 'Travel', 'Food', 'Music', 'Movies', 'Art', 'Learning', 'Local services', 'Small business'];
const RESET_TTL_MIN = 30;
const LOGIN_FAIL_LIMIT = 8;
const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function createAccessV8(deps) {
  const { pool, sendJSON, getBody, getSessionUserFromRequest, hashPassword, clientIp, rateLimit, logger = console } = deps;
  let sandboxOn = false;
  const failBuckets = new Map();

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_password_resets (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_password_resets_user_idx ON howdi_password_resets(user_id, created_at DESC)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_consents (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, document TEXT NOT NULL, version TEXT NOT NULL,
      accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id, document, version))`);
    const dbName = (await pool.query('SELECT current_database() AS d')).rows[0].d;
    sandboxOn = process.env.HOWDI_PREVIEW_SANDBOX === '1' && /_preview$/.test(String(dbName));
    if (sandboxOn) {
      await pool.query(`CREATE TABLE IF NOT EXISTS howdi_preview_outbox (
        id BIGSERIAL PRIMARY KEY, channel TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT, body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
      logger.log(`[V8 access] PREVIEW SANDBOX outbox ON (database ${dbName}) — SMS / e-mail are captured locally, never sent`);
    }
  }

  async function outbox(channel, recipient, subject, body) {
    if (!sandboxOn) return false;
    await pool.query(`INSERT INTO howdi_preview_outbox(channel,recipient,subject,body) VALUES($1,$2,$3,$4)`, [channel, String(recipient).slice(0, 120), subject || null, String(body).slice(0, 2000)]);
    return true;
  }

  // ---------------- login throttle (called by the legacy /api/auth/login handler)
  function loginKey(req, identifier) { return `${clientIp(req)}|${String(identifier || '').trim().toLowerCase().slice(0, 120)}`; }
  function loginBlocked(req, identifier) {
    const b = failBuckets.get(loginKey(req, identifier));
    if (!b) return 0;
    if (Date.now() - b.first > LOGIN_FAIL_WINDOW_MS) { failBuckets.delete(loginKey(req, identifier)); return 0; }
    return b.count >= LOGIN_FAIL_LIMIT ? Math.ceil((b.first + LOGIN_FAIL_WINDOW_MS - Date.now()) / 1000) : 0;
  }
  function loginFailed(req, identifier) {
    const k = loginKey(req, identifier); const b = failBuckets.get(k);
    if (!b || Date.now() - b.first > LOGIN_FAIL_WINDOW_MS) failBuckets.set(k, { first: Date.now(), count: 1 }); else b.count += 1;
    if (failBuckets.size > 50000) failBuckets.clear();
  }
  function loginSucceeded(req, identifier) { failBuckets.delete(loginKey(req, identifier)); }

  function resetLinkOrigin() {
    const cands = [process.env.HOWDI_PUBLIC_APP_URL, ...String(process.env.HOWDI_ALLOWED_ORIGINS || '').split(',')].map((x) => String(x || '').trim().replace(/\/+$/, ''));
    return cands.find((x) => /^https?:\/\/[A-Za-z0-9.-]+(:\d{2,5})?$/.test(x)) || '';
  }
  function isLoopback(req) {
    const a = String((req.socket && req.socket.remoteAddress) || '').replace(/^::ffff:/, '');
    return a === '127.0.0.1' || a === '::1';
  }
  function noStore(res) { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Pragma', 'no-cache'); }
  function limited(res, key, n, ms) {
    const r = rateLimit(key, n, ms);
    if (r && r.allowed === false) { res.setHeader('Retry-After', String(Math.ceil((r.retryAfterMs || ms) / 1000))); sendJSON(res, 429, { status: 'error', code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a moment and try again.' }); return true; }
    return false;
  }
  async function viewer(req) {
    const u = await getSessionUserFromRequest(req);
    const id = Number(u && u.id);
    if (!u || u.is_active === false || String(u.account_status || 'ACTIVE').toUpperCase() !== 'ACTIVE' || !Number.isSafeInteger(id) || id <= 0) return null;
    return { ...u, id };
  }
  function handleProblem(h) {
    if (!HANDLE_RE.test(h)) return 'Use 3–30 characters: letters, numbers, dot or underscore.';
    if (RESERVED.has(h)) return 'That @handle is reserved.';
    return '';
  }

  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';

    if (p === '/api/preview/outbox') {
      if (!sandboxOn || req.method !== 'GET' || !isLoopback(req)) { sendJSON(res, 404, { status: 'error', message: 'API endpoint not found' }); return true; }
      noStore(res);
      const to = String(url.searchParams.get('to') || '').trim().slice(0, 120);
      const rows = (await pool.query(`SELECT channel, recipient, subject, body, created_at FROM howdi_preview_outbox WHERE ($1='' OR recipient=$1) ORDER BY id DESC LIMIT 5`, [to])).rows;
      sendJSON(res, 200, { status: 'success', sandbox: true, notice: 'Preview/Test sandbox — nothing here was sent to a real phone or inbox.', messages: rows });
      return true;
    }

    if (p === '/api/auth/password/forgot' && req.method === 'POST') {
      noStore(res);
      const ip = clientIp(req);
      if (limited(res, `pw-forgot:ip:${ip}`, 10, 15 * 60 * 1000)) return true;
      const body = await getBody(req);
      const email = String((body && body.email) || '').trim().toLowerCase().slice(0, 160);
      const generic = { status: 'success', message: 'If an account uses that e-mail, we’ve sent a link to reset the password. The link works for 30 minutes.' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { sendJSON(res, 400, { status: 'error', code: 'INVALID_EMAIL', message: 'Enter a valid e-mail address.' }); return true; }
      if (limited(res, `pw-forgot:email:${sha(email)}`, 3, 15 * 60 * 1000)) return true;
      const u = (await pool.query(`SELECT id FROM users WHERE LOWER(email)=$1 AND COALESCE(is_active,TRUE)=TRUE AND UPPER(COALESCE(account_status,'ACTIVE'))='ACTIVE' LIMIT 1`, [email])).rows[0];
      if (u) {
        const token = crypto.randomBytes(32).toString('base64url');
        await pool.query(`UPDATE howdi_password_resets SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL`, [u.id]);
        await pool.query(`INSERT INTO howdi_password_resets(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+($3||' minutes')::interval)`, [u.id, sha(token), String(RESET_TTL_MIN)]);
        // Reset links are built only from server configuration, never from a request header (a forged Origin/Host would
        // otherwise put the victim's token into a link pointing at someone else's site). HOWDI_PUBLIC_APP_URL wins; else the
        // first HOWDI_ALLOWED_ORIGINS entry; else a relative link.
        const origin = resetLinkOrigin();
        const link = `${origin}/reset-password#token=${token}`;
        if (!(await outbox('email', email, 'Reset your HOWDI password', `Use this link within ${RESET_TTL_MIN} minutes to choose a new password: ${link}`)))
          logger.log('[V8 access] password reset requested — no e-mail provider connected, link not delivered');
      }
      sendJSON(res, 200, generic);
      return true;
    }

    if (p === '/api/auth/password/reset' && req.method === 'POST') {
      noStore(res);
      if (limited(res, `pw-reset:ip:${clientIp(req)}`, 20, 15 * 60 * 1000)) return true;
      const body = await getBody(req);
      const token = String((body && body.token) || '');
      const password = String((body && body.password) || '');
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) { sendJSON(res, 400, { status: 'error', code: 'RESET_LINK_INVALID', message: 'This reset link is not valid. Request a new one.' }); return true; }
      if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { sendJSON(res, 400, { status: 'error', code: 'WEAK_PASSWORD', message: 'Use at least 8 characters with letters and numbers.' }); return true; }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const row = (await client.query(`SELECT id, user_id, expires_at, used_at FROM howdi_password_resets WHERE token_hash=$1 FOR UPDATE`, [sha(token)])).rows[0];
        if (!row || row.used_at) { await client.query('ROLLBACK'); sendJSON(res, 400, { status: 'error', code: 'RESET_LINK_INVALID', message: 'This reset link has already been used or is not valid. Request a new one.' }); return true; }
        if (new Date(row.expires_at).getTime() <= Date.now()) { await client.query('ROLLBACK'); sendJSON(res, 400, { status: 'error', code: 'RESET_LINK_EXPIRED', message: 'This reset link has expired. Request a new one.' }); return true; }
        await client.query(`UPDATE users SET password_hash=$2 WHERE id=$1`, [row.user_id, hashPassword(password)]);
        await client.query(`UPDATE howdi_password_resets SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL`, [row.user_id]);
        await client.query(`UPDATE user_sessions SET is_active=FALSE WHERE user_id=$1 AND is_active=TRUE`, [row.user_id]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      sendJSON(res, 200, { status: 'success', message: 'Your password was changed. For your safety, you’ve been signed out on every device. Sign in with the new password.' });
      return true;
    }

    if (p === '/api/v8/handle-available' && req.method === 'GET') {
      noStore(res);
      const v = await viewer(req);
      if (!v) { sendJSON(res, 401, { status: 'error', code: 'SIGN_IN_REQUIRED', message: 'Please sign in.' }); return true; }
      if (limited(res, `handle-check:${v.id}`, 60, 60 * 1000)) return true;
      const h = String(url.searchParams.get('handle') || '').trim().replace(/^@/, '').toLowerCase();
      const problem = handleProblem(h);
      if (problem) { sendJSON(res, 200, { status: 'success', available: false, reason: problem }); return true; }
      const taken = (await pool.query(`SELECT 1 FROM howdi_connect_profiles WHERE LOWER(public_username)=$1 AND user_id<>$2 LIMIT 1`, [h, v.id])).rowCount > 0;
      sendJSON(res, 200, { status: 'success', available: !taken, reason: taken ? 'That @handle is already taken.' : '' });
      return true;
    }

    if (p === '/api/v8/onboarding/profile' && req.method === 'POST') {
      noStore(res);
      const v = await viewer(req);
      if (!v) { sendJSON(res, 401, { status: 'error', code: 'SIGN_IN_REQUIRED', message: 'Please sign in.' }); return true; }
      if (limited(res, `onboarding:${v.id}`, 20, 10 * 60 * 1000)) return true;
      const body = (await getBody(req)) || {};
      const name = String(body.displayName || '').replace(/\s+/g, ' ').trim();
      const h = String(body.publicUsername || '').trim().replace(/^@/, '').toLowerCase();
      const errors = {};
      if (name.length < 2 || name.length > 60 || /[<>{}]/.test(name)) errors.displayName = 'Enter your name (2–60 characters).';
      const problem = handleProblem(h); if (problem) errors.publicUsername = problem;
      if (body.acceptTerms !== true) errors.acceptTerms = 'Please agree to the Community Guidelines and Privacy Policy to continue.';
      const interests = Array.isArray(body.interests) ? [...new Set(body.interests.map((x) => String(x)).filter((x) => INTERESTS.includes(x)))].slice(0, 8) : [];
      let avatar = null;
      if (body.avatarData != null && body.avatarData !== '') {
        const a = String(body.avatarData);
        if (!/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(a) || a.length > 1500000) errors.avatarData = 'Use a PNG, JPG or WebP photo under 1 MB.'; else avatar = a;
      }
      if (Object.keys(errors).length) { sendJSON(res, 400, { status: 'error', code: 'VALIDATION', errors }); return true; }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const taken = (await client.query(`SELECT 1 FROM howdi_connect_profiles WHERE LOWER(public_username)=$1 AND user_id<>$2 LIMIT 1`, [h, v.id])).rowCount > 0;
        if (taken) { await client.query('ROLLBACK'); sendJSON(res, 409, { status: 'error', code: 'VALIDATION', errors: { publicUsername: 'That @handle is already taken.' } }); return true; }
        await client.query(`UPDATE users SET full_name=$2 WHERE id=$1`, [v.id, name]);
        await client.query(`INSERT INTO howdi_connect_profiles(user_id,public_username,interests,avatar_data,updated_at) VALUES($1,$2,$3,$4,NOW())
          ON CONFLICT(user_id) DO UPDATE SET public_username=EXCLUDED.public_username, interests=EXCLUDED.interests,
            avatar_data=COALESCE(EXCLUDED.avatar_data, howdi_connect_profiles.avatar_data), updated_at=NOW()`, [v.id, h, interests.join(', '), avatar]);
        for (const doc of ['community-guidelines', 'privacy-policy'])
          await client.query(`INSERT INTO howdi_v8_consents(user_id,document,version) VALUES($1,$2,'preview-2026-09') ON CONFLICT DO NOTHING`, [v.id, doc]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        if (e && e.code === '23505') { sendJSON(res, 409, { status: 'error', code: 'VALIDATION', errors: { publicUsername: 'That @handle is already taken.' } }); return true; }
        throw e;
      } finally { client.release(); }
      sendJSON(res, 200, { status: 'success', profile: { public_username: h, display_name: name, interests } });
      return true;
    }
    return false;
  }

  return { ensureSchema, handle, outbox, loginBlocked, loginFailed, loginSucceeded, sandboxEnabled: () => sandboxOn, INTERESTS };
}

module.exports = { createAccessV8, INTERESTS };
