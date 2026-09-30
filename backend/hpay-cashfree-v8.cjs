'use strict';
// =====================================================================================
// HOWDI V8 — HPay "Add money" through Cashfree Payments (SANDBOX ONLY).
//   HOWDI → backend-created Cashfree order → Cashfree checkout (browser SDK, payment session only) → server-side verification
//   (Get Order + Get Payments for an Order) and/or signed webhook → idempotent settlement into the V8 HPay wallet + ledger.
//
//   GET  /api/v8/hpay/cashfree/config                  { enabled, mode } — whether the sandbox checkout can be offered
//   POST /api/v8/hpay/cashfree/orders {amount, idempotency_key}   create (or replay) a top-up order → { payment, checkout_session }
//   GET  /api/v8/hpay/cashfree/orders/{HCF-…}          owner only: verifies with Cashfree server-side, settles once, returns state
//   POST /api/v8/hpay/cashfree/webhook                  Cashfree → HOWDI; signature over timestamp + raw body; idempotent
//
// Rules
//   * Sandbox only: enabled only when CASHFREE_ENV=sandbox, credentials are set, the API base is Cashfree's sandbox host (or a
//     loopback stub when HOWDI_CASHFREE_ALLOW_LOCAL_STUB=1, for tests) AND the HOWDI Preview/Test sandbox is on. The production
//     host is refused outright. Otherwise every call fails closed (503 PAYMENT_PROVIDER_REQUIRED).
//   * The server decides amount, currency and the order id (HOWDI's own immutable reference HCF-…, used as Cashfree order_id).
//     The browser only ever receives that reference, the amount and the payment session needed by the Cashfree SDK.
//   * Nothing is credited from a browser redirect or from webhook fields: settlement happens only after HOWDI itself reads the
//     order and its payments from Cashfree and finds a SUCCESS payment for exactly the order amount in INR.
//   * Settlement locks the provider payment row, credits the wallet and writes the ledger in one transaction; a PAID row is never
//     settled again and never downgraded, so duplicate / out-of-order webhooks and polling races cannot double-credit.
//   * The client secret stays server-side. Cashfree receives an opaque customer id (HMAC), never a HOWDI user id.
//   * Refunds: verified REFUND_STATUS webhooks are recorded on the payment (refund_status); no automatic wallet reversal — a
//     top-up refund policy is a product decision.
// =====================================================================================
const crypto = require('node:crypto');

const SANDBOX_BASE = 'https://sandbox.cashfree.com/pg';
const PRODUCTION_HOST = 'api.cashfree.com';
const API_VERSION_DEFAULT = '2025-01-01';
const MIN = 100, MAX = 5000, DAY_MAX = 10000, OPEN_MAX = 3;
const REF_RE = /^HCF-[0-9A-F]{16}$/;
const KEY_RE = /^[A-Za-z0-9._:-]{8,80}$/;
const OPEN = ['CREATED', 'ACTIVE', 'PENDING', 'FAILED', 'USER_DROPPED'];
const MONEY = (v) => Math.round(Number(v) * 100) / 100;

// ---------------------------------------------------------------- config (pure)
function cashfreeConfig(env = process.env) {
  const mode = String(env.CASHFREE_ENV || '').trim().toLowerCase();
  const id = String(env.CASHFREE_CLIENT_ID || '').trim(); const secret = String(env.CASHFREE_CLIENT_SECRET || '').trim();
  const base = String(env.CASHFREE_API_BASE || SANDBOX_BASE).trim().replace(/\/+$/, '');
  let reason = null; let host = '';
  try { host = new URL(base).hostname; } catch { reason = 'invalid API base'; }
  const loopback = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(host);
  if (!reason && mode !== 'sandbox') reason = mode ? `CASHFREE_ENV=${mode} is not allowed (sandbox only)` : 'CASHFREE_ENV not set';
  if (!reason && (!id || !secret)) reason = 'Cashfree sandbox credentials not set';
  if (!reason && host === PRODUCTION_HOST) reason = 'production Cashfree host refused (sandbox only)';
  if (!reason && base !== SANDBOX_BASE && !(loopback && env.HOWDI_CASHFREE_ALLOW_LOCAL_STUB === '1')) reason = 'API base must be the Cashfree sandbox';
  return { enabled: !reason, reason, mode: 'sandbox', id, secret, base, version: String(env.CASHFREE_API_VERSION || API_VERSION_DEFAULT),
    timeoutMs: Math.max(500, Math.min(30000, Number(env.CASHFREE_TIMEOUT_MS) || 8000)), returnUrl: String(env.HOWDI_CASHFREE_RETURN_URL || '').trim(),
    notifyUrl: String(env.HOWDI_CASHFREE_NOTIFY_URL || '').trim() };
}

// ---------------------------------------------------------------- webhook signature (pure)
// Cashfree: signature = Base64(HMAC-SHA256(client secret, x-webhook-timestamp + raw body)).
function verifyWebhookSignature({ rawBody, timestamp, signature, secret, nowMs = Date.now(), maxAgeMs = 24 * 3600 * 1000 }) {
  if (!secret || typeof rawBody !== 'string' || !timestamp || !signature) return { ok: false, reason: 'MISSING' };
  if (!/^\d{9,14}$/.test(String(timestamp))) return { ok: false, reason: 'TIMESTAMP' };
  const t = Number(timestamp); const ms = t < 1e12 ? t * 1000 : t;
  if (ms > nowMs + 5 * 60 * 1000 || nowMs - ms > maxAgeMs) return { ok: false, reason: 'STALE' };
  const expected = crypto.createHmac('sha256', secret).update(String(timestamp) + rawBody).digest('base64');
  const a = Buffer.from(expected); const b = Buffer.from(String(signature));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'SIGNATURE' };
  return { ok: true };
}

// ---------------------------------------------------------------- verified provider state → HOWDI state (pure)
// order: Cashfree Get Order; payments: Cashfree Get Payments for an Order; row: HOWDI provider payment.
function assessPayment(row, order, payments) {
  const amount = MONEY(row.amount);
  if (!order || String(order.order_id) !== String(row.reference)) return { state: 'UNKNOWN' };
  if (MONEY(order.order_amount) !== amount || String(order.order_currency || 'INR') !== 'INR') return { state: 'MISMATCH' };
  const list = Array.isArray(payments) ? payments : [];
  const success = list.find((p) => String(p.payment_status).toUpperCase() === 'SUCCESS' && MONEY(p.payment_amount) === amount && String(p.payment_currency || 'INR') === 'INR');
  if (success) return { state: 'PAID', cfPaymentId: String(success.cf_payment_id || '') };
  if (list.some((p) => String(p.payment_status).toUpperCase() === 'SUCCESS')) return { state: 'MISMATCH' }; // success for a different amount
  if (list.some((p) => String(p.payment_status).toUpperCase() === 'PENDING')) return { state: 'PENDING' };
  const orderStatus = String(order.order_status || '').toUpperCase();
  if (['EXPIRED', 'TERMINATED', 'TERMINATION_REQUESTED'].includes(orderStatus)) return { state: 'EXPIRED' };
  const latest = [...list].sort((a, b) => String(b.payment_time || b.payment_completion_time || '').localeCompare(String(a.payment_time || a.payment_completion_time || '')))[0];
  const ls = String(latest?.payment_status || '').toUpperCase();
  if (ls === 'FAILED' || ls === 'CANCELLED' || ls === 'VOID') return { state: 'FAILED' };
  if (ls === 'USER_DROPPED') return { state: 'USER_DROPPED' };
  return { state: orderStatus === 'PAID' ? 'PENDING' : 'ACTIVE' }; // PAID without a matching SUCCESS payment yet: keep verifying
}

function createHpayCashfreeV8(deps) {
  const { pool, helpers: H, wallet, sandboxEnabled, env = process.env, fetchImpl = globalThis.fetch, refSecret = '' } = deps;
  const { ok, fail, viewer, limited } = H;
  const cfg = () => cashfreeConfig(env);
  const enabled = () => { const c = cfg(); return c.enabled && sandboxEnabled() ? c : null; };

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_provider_payments(id BIGSERIAL PRIMARY KEY, reference VARCHAR(24) NOT NULL UNIQUE, user_id BIGINT NOT NULL,
      purpose VARCHAR(12) NOT NULL DEFAULT 'TOPUP', provider VARCHAR(12) NOT NULL DEFAULT 'CASHFREE', provider_env VARCHAR(10) NOT NULL DEFAULT 'sandbox',
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), currency CHAR(3) NOT NULL DEFAULT 'INR', idem_key VARCHAR(80) NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'CREATED',
      cf_order_id VARCHAR(64), checkout_session TEXT, cf_payment_id VARCHAR(64), settled_txn VARCHAR(24), settled_at TIMESTAMPTZ, refund_status VARCHAR(16),
      last_error VARCHAR(200), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id, idem_key))`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_provider_payments_user ON howdi_v8_provider_payments(user_id, created_at DESC)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_provider_events(id BIGSERIAL PRIMARY KEY, provider VARCHAR(12) NOT NULL, event_hash CHAR(64) NOT NULL UNIQUE,
      event_type VARCHAR(48), reference VARCHAR(64), outcome VARCHAR(24) NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  }

  // ---------------------------------------------------------------- Cashfree HTTP (server-to-server only)
  async function cf(method, path, body) {
    const c = cfg(); const ac = new AbortController(); const t = setTimeout(() => ac.abort(), c.timeoutMs);
    try {
      const r = await fetchImpl(`${c.base}${path}`, { method, signal: ac.signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-client-id': c.id, 'x-client-secret': c.secret, 'x-api-version': c.version, 'x-request-id': crypto.randomUUID() },
        body: body ? JSON.stringify(body) : undefined });
      const json = await r.json().catch(() => null);
      return { status: r.status, json };
    } catch (e) {
      return { status: 0, json: null, timeout: e && e.name === 'AbortError' };
    } finally { clearTimeout(t); }
  }
  const customerId = (uid) => 'hc_' + crypto.createHmac('sha256', refSecret || cfg().secret || 'howdi').update(`cashfree-customer:${uid}`).digest('hex').slice(0, 24);
  const phoneOf = (u) => { const d = String(u.phone || '').replace(/\D/g, ''); const t = d.length > 10 ? d.slice(-10) : d; return /^[6-9]\d{9}$/.test(t) ? t : null; };

  function dto(row) {
    const open = OPEN.includes(row.status);
    return { reference: row.reference, amount: MONEY(row.amount), currency: row.currency, status: row.status.toLowerCase(), mode: 'sandbox',
      settled: row.status === 'PAID', can_pay: open && Boolean(row.checkout_session), created_at: row.created_at ? new Date(row.created_at).toISOString() : null };
  }

  // Verify with Cashfree and settle at most once. Returns the fresh row (+ provider flag when Cashfree could not be reached).
  async function reconcile(row) {
    if (row.status === 'PAID' || row.status === 'EXPIRED' || row.status === 'MISMATCH') return { row };
    const o = await cf('GET', `/orders/${encodeURIComponent(row.reference)}`);
    if (o.status !== 200) return { row, unavailable: true };
    const p = await cf('GET', `/orders/${encodeURIComponent(row.reference)}/payments`);
    if (p.status !== 200) return { row, unavailable: true };
    const verdict = assessPayment(row, o.json, p.json);
    if (verdict.state === 'UNKNOWN') return { row, unavailable: true };
    if (verdict.state === 'PAID') return { row: await settle(row.id, verdict.cfPaymentId) };
    const r = (await pool.query(`UPDATE howdi_v8_provider_payments SET status=$2, updated_at=NOW() WHERE id=$1 AND status<>'PAID' RETURNING *`, [row.id, verdict.state])).rows[0];
    return { row: r || (await pool.query(`SELECT * FROM howdi_v8_provider_payments WHERE id=$1`, [row.id])).rows[0] };
  }

  // One transaction: lock the payment row → (already PAID? done) → credit wallet → ledger TOPUP → mark PAID.
  async function settle(id, cfPaymentId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const row = (await client.query(`SELECT * FROM howdi_v8_provider_payments WHERE id=$1 FOR UPDATE`, [id])).rows[0];
      if (row.status === 'PAID') { await client.query('COMMIT'); return row; }
      const w = await wallet(Number(row.user_id), client);
      if (!w) throw new Error('HPay wallet unavailable');
      await client.query(`UPDATE howdi_v8_wallets SET balance=balance+$2, updated_at=NOW() WHERE user_id=$1`, [row.user_id, row.amount]);
      const txn = 'HPC-' + crypto.randomBytes(5).toString('hex').toUpperCase();
      await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'CREDIT',$3,'TOPUP',$4,'Added money · Cashfree (sandbox)')`, [txn, row.user_id, row.amount, row.reference]);
      const done = (await client.query(`UPDATE howdi_v8_provider_payments SET status='PAID', cf_payment_id=$2, settled_txn=$3, settled_at=NOW(), updated_at=NOW() WHERE id=$1 RETURNING *`, [id, cfPaymentId || null, txn])).rows[0];
      await client.query('COMMIT');
      return done;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }
  }

  async function readRaw(req, max = 65536) {
    return new Promise((resolve, reject) => {
      const chunks = []; let n = 0;
      req.on('data', (c) => { n += c.length; if (n > max) { reject(Object.assign(new Error('too large'), { code: 'TOO_LARGE' })); req.destroy(); return; } chunks.push(c); });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); req.on('error', reject);
    });
  }

  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '');
    if (!p.startsWith('/api/v8/hpay/cashfree')) return false;
    let m;

    // ---- webhook: no session; authenticity = signature over timestamp + raw body
    if (p === '/api/v8/hpay/cashfree/webhook' && req.method === 'POST') {
      const c = cfg();
      let raw; try { raw = await readRaw(req); } catch { fail(res, 413, 'TOO_LARGE', 'Payload too large.'); return true; }
      if (!c.enabled) { fail(res, 503, 'PROVIDER_DISABLED', 'Provider not enabled.'); return true; }
      const sig = verifyWebhookSignature({ rawBody: raw, timestamp: req.headers['x-webhook-timestamp'], signature: req.headers['x-webhook-signature'], secret: c.secret });
      if (!sig.ok) { fail(res, 401, 'INVALID_SIGNATURE', 'Signature verification failed.'); return true; }
      let evt = null; try { evt = JSON.parse(raw); } catch { evt = null; }
      const type = String(evt?.type || '').slice(0, 48); const ref = String(evt?.data?.order?.order_id || '').slice(0, 64);
      const hash = crypto.createHash('sha256').update(raw).digest('hex');
      const first = (await pool.query(`INSERT INTO howdi_v8_provider_events(provider,event_hash,event_type,reference,outcome) VALUES('CASHFREE',$1,$2,$3,'RECEIVED') ON CONFLICT(event_hash) DO NOTHING RETURNING id`, [hash, type, ref])).rows[0];
      const row = REF_RE.test(ref) ? (await pool.query(`SELECT * FROM howdi_v8_provider_payments WHERE reference=$1`, [ref])).rows[0] : null;
      let outcome = 'IGNORED';
      if (row && /^REFUND/.test(type)) {
        const rs = String(evt?.data?.refund?.refund_status || '').toUpperCase().slice(0, 16);
        if (rs) await pool.query(`UPDATE howdi_v8_provider_payments SET refund_status=$2, updated_at=NOW() WHERE id=$1`, [row.id, rs]);
        outcome = 'REFUND_RECORDED';
      } else if (row) {
        // Never trust the webhook's fields for money: re-read Cashfree server-side and settle idempotently.
        try { const r = await reconcile(row); outcome = r.unavailable ? 'VERIFY_DEFERRED' : r.row.status; }
        catch (e) { console.error('[HPay Cashfree] settlement failed', e && e.message); outcome = 'SETTLE_FAILED'; }
      }
      if (first) await pool.query(`UPDATE howdi_v8_provider_events SET outcome=$2 WHERE id=$1`, [first.id, outcome.slice(0, 24)]);
      // 5xx only when settlement itself failed, so Cashfree retries; duplicates and unknown orders are acknowledged.
      if (outcome === 'SETTLE_FAILED') { fail(res, 500, 'RETRY', 'Temporary failure.'); return true; }
      ok(res, { received: true, duplicate: !first }); return true;
    }

    const v = await viewer(req); // session + active account (is_active, account_status ACTIVE)
    if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to use HPay.'); return true; }
    const uid = Number(v.id);

    if (p === '/api/v8/hpay/cashfree/config' && req.method === 'GET') {
      const c = enabled(); ok(res, { enabled: Boolean(c), mode: 'sandbox', min: MIN, max: MAX, day_max: DAY_MAX }); return true;
    }
    const c = enabled();
    if (!c) { fail(res, 503, 'PAYMENT_PROVIDER_REQUIRED', 'Adding money needs a payment provider, which isn’t connected here.'); return true; }

    if (p === '/api/v8/hpay/cashfree/orders' && req.method === 'POST') {
      let b = {}; try { b = JSON.parse(await readRaw(req, 8192) || '{}') || {}; } catch { b = {}; }
      const amount = typeof b.amount === 'number' && Number.isInteger(b.amount) ? b.amount : NaN;
      const key = String(b.idempotency_key ?? '');
      if (!(amount >= MIN && amount <= MAX)) { fail(res, 400, 'AMOUNT', `Add between ₹${MIN} and ₹${MAX.toLocaleString('en-IN')} at a time.`); return true; }
      if (!KEY_RE.test(key)) { fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'A request key is required.'); return true; }
      const phone = phoneOf(v); if (!phone) { fail(res, 409, 'PHONE_REQUIRED', 'Add a mobile number to your account to pay with Cashfree.'); return true; }
      // Rate limit counts new orders only (a replay of an existing key, e.g. reopening checkout, is free).
      const known = (await pool.query(`SELECT 1 FROM howdi_v8_provider_payments WHERE user_id=$1 AND idem_key=$2`, [uid, key])).rows[0];
      if (!known && limited(res, `v8-cf-order:${uid}`, 10, 10 * 60000)) return true;
      // 1) find-or-create the HOWDI order row (serialised per user)
      const client = await pool.connect(); let row; let replay = false;
      try {
        await client.query('BEGIN'); await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`hpay-cf-order:${uid}`]);
        row = (await client.query(`SELECT * FROM howdi_v8_provider_payments WHERE user_id=$1 AND idem_key=$2`, [uid, key])).rows[0];
        if (row) {
          if (MONEY(row.amount) !== amount) { await client.query('ROLLBACK'); fail(res, 409, 'IDEMPOTENCY_KEY_REUSED', 'This request key was already used for a different amount.'); return true; }
          replay = true;
        } else {
          const open = Number((await client.query(`SELECT COUNT(*) n FROM howdi_v8_provider_payments WHERE user_id=$1 AND status IN ('CREATED','ACTIVE','PENDING') AND created_at>NOW()-interval '30 minutes'`, [uid])).rows[0].n);
          if (open >= OPEN_MAX) { await client.query('ROLLBACK'); fail(res, 429, 'TOO_MANY_OPEN', 'Finish or wait for your open payments first.'); return true; }
          const today = Number((await client.query(`SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_ledger WHERE user_id=$1 AND kind='TOPUP' AND created_at>NOW()-interval '1 day'`, [uid])).rows[0].s)
            + Number((await client.query(`SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_provider_payments WHERE user_id=$1 AND status IN ('CREATED','ACTIVE','PENDING') AND created_at>NOW()-interval '30 minutes'`, [uid])).rows[0].s);
          if (today + amount > DAY_MAX) { await client.query('ROLLBACK'); fail(res, 422, 'DAILY_LIMIT', `You can add up to ₹${DAY_MAX.toLocaleString('en-IN')} a day in this preview.`); return true; }
          const reference = 'HCF-' + crypto.randomBytes(8).toString('hex').toUpperCase();
          row = (await client.query(`INSERT INTO howdi_v8_provider_payments(reference,user_id,amount,idem_key) VALUES($1,$2,$3,$4) RETURNING *`, [reference, uid, amount, key])).rows[0];
        }
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      if (replay && row.checkout_session) {
        if (OPEN.includes(row.status)) ({ row } = await reconcile(row));
        ok(res, { payment: dto(row), checkout_session: OPEN.includes(row.status) ? row.checkout_session : null, replayed: true }); return true;
      }
      // 2) create the Cashfree order (amount + id from the server); a retry after a timeout adopts an order that already exists
      const body = { order_id: row.reference, order_amount: MONEY(row.amount), order_currency: 'INR', customer_details: { customer_id: customerId(uid), customer_phone: phone },
        order_note: 'HOWDI HPay add money (sandbox)', order_tags: { purpose: 'HPAY_TOPUP' } };
      const meta = {}; if (/^https:\/\//.test(c.returnUrl)) meta.return_url = `${c.returnUrl}${c.returnUrl.includes('?') ? '&' : '?'}cf_order={order_id}`; if (/^https:\/\//.test(c.notifyUrl)) meta.notify_url = c.notifyUrl;
      if (Object.keys(meta).length) body.order_meta = meta;
      let r = await cf('POST', '/orders', body);
      if (r.status === 409) r = await cf('GET', `/orders/${encodeURIComponent(row.reference)}`);
      const good = r.status === 200 && r.json && String(r.json.order_id) === row.reference && MONEY(r.json.order_amount) === MONEY(row.amount) && r.json.payment_session_id;
      if (!good) {
        await pool.query(`UPDATE howdi_v8_provider_payments SET last_error=$2, updated_at=NOW() WHERE id=$1 AND status='CREATED'`, [row.id, r.timeout ? 'timeout' : `http ${r.status}`]);
        fail(res, r.timeout || r.status === 0 ? 504 : 502, 'PROVIDER_UNAVAILABLE', 'Cashfree didn’t respond. Nothing was charged — try again.'); return true;
      }
      row = (await pool.query(`UPDATE howdi_v8_provider_payments SET status=CASE WHEN status='CREATED' THEN 'ACTIVE' ELSE status END, cf_order_id=$2, checkout_session=$3, last_error=NULL, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [row.id, String(r.json.cf_order_id || ''), String(r.json.payment_session_id)])).rows[0];
      ok(res, { payment: dto(row), checkout_session: row.checkout_session, replayed: replay }, replay ? 200 : 201); return true;
    }

    if ((m = p.match(/^\/api\/v8\/hpay\/cashfree\/orders\/(HCF-[0-9A-F]{16})$/)) && req.method === 'GET') {
      const row = (await pool.query(`SELECT * FROM howdi_v8_provider_payments WHERE reference=$1 AND user_id=$2`, [m[1], uid])).rows[0];
      if (!row) { fail(res, 404, 'NOT_FOUND', 'Payment not found.'); return true; }
      let out; try { out = await reconcile(row); } catch (e) { console.error('[HPay Cashfree] settlement failed', e && e.message); out = { row, unavailable: true }; }
      const w = await wallet(uid);
      ok(res, { payment: dto(out.row), verifying: Boolean(out.unavailable), balance: w ? MONEY(w.balance) : null }); return true;
    }
    fail(res, 404, 'NOT_FOUND', 'Not found.'); return true;
  }
  return { ensureSchema, handle, _internal: { reconcile, settle } };
}

module.exports = { createHpayCashfreeV8, cashfreeConfig, verifyWebhookSignature, assessPayment, SANDBOX_BASE };
