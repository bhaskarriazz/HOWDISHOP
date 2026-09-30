// HPay × Cashfree (SANDBOX ONLY) — real PostgreSQL + real server + a local Cashfree PG API stub (loopback only).
// The stub implements the Cashfree PG endpoints HOWDI calls (Create Order, Get Order, Get Payments for an Order) with the
// same field names; the suite controls payment states, delays and failures. Webhooks are signed exactly like Cashfree:
// Base64(HMAC-SHA256(client secret, x-webhook-timestamp + raw body)).
const http = require('node:http');
const crypto = require('node:crypto');
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const SECRET = 'cfsk_sandbox_test_' + crypto.randomBytes(8).toString('hex');
const CLIENT_ID = 'TEST' + crypto.randomBytes(6).toString('hex').toUpperCase();

// ---------------------------------------------------------------- Cashfree stub
const stub = { orders: new Map(), creates: [], delayMs: 0, down: false };
const stubServer = http.createServer((req, res) => {
  let raw = ''; req.on('data', (c) => { raw += c; });
  req.on('end', () => setTimeout(() => {
    const send = (s, j) => { if (!res.writableEnded) { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(j)); } };
    if (req.headers['x-client-id'] !== CLIENT_ID || req.headers['x-client-secret'] !== SECRET || !req.headers['x-api-version']) return send(401, { message: 'authentication Failed', code: 'request_failed', type: 'authentication_error' });
    if (stub.down) return send(500, { message: 'internal', code: 'internal_error' });
    const u = new URL(req.url, 'http://x'); let m;
    if (req.method === 'POST' && u.pathname === '/pg/orders') {
      const b = JSON.parse(raw || '{}'); stub.creates.push(b);
      if (stub.orders.has(b.order_id)) return send(409, { message: 'order with same id is already present', code: 'order_already_exists', type: 'invalid_request_error' });
      const o = { cf_order_id: String(Math.floor(Math.random() * 1e12)), order_id: b.order_id, order_amount: b.order_amount, order_currency: b.order_currency, order_status: 'ACTIVE',
        payment_session_id: 'session_' + crypto.randomBytes(12).toString('hex'), customer_details: b.customer_details, payments: [] };
      stub.orders.set(b.order_id, o); const { payments, ...pub } = o; return send(200, pub);
    }
    if (req.method === 'GET' && (m = u.pathname.match(/^\/pg\/orders\/([^/]+)$/))) { const o = stub.orders.get(decodeURIComponent(m[1])); if (!o) return send(404, { code: 'order_not_found' }); const { payments, ...pub } = o; return send(200, pub); }
    if (req.method === 'GET' && (m = u.pathname.match(/^\/pg\/orders\/([^/]+)\/payments$/))) { const o = stub.orders.get(decodeURIComponent(m[1])); if (!o) return send(404, { code: 'order_not_found' }); return send(200, o.payments); }
    send(404, { code: 'not_found' });
  }, stub.delayMs));
});
const pay = (ref, status, amount) => { const o = stub.orders.get(ref); const p = { cf_payment_id: String(Math.floor(Math.random() * 1e12)), order_id: ref, payment_status: status, payment_amount: amount ?? o.order_amount, payment_currency: 'INR', payment_time: new Date(Date.now() + o.payments.length * 1000).toISOString() }; o.payments.push(p); if (status === 'SUCCESS') o.order_status = 'PAID'; return p; };

(async () => {
  await new Promise((r) => stubServer.listen(0, '127.0.0.1', r));
  Object.assign(process.env, { CASHFREE_ENV: 'sandbox', CASHFREE_CLIENT_ID: CLIENT_ID, CASHFREE_CLIENT_SECRET: SECRET, CASHFREE_API_BASE: `http://127.0.0.1:${stubServer.address().port}/pg`,
    HOWDI_CASHFREE_ALLOW_LOCAL_STUB: '1', CASHFREE_TIMEOUT_MS: '1500' });
  const K = require('../k5a-pg/lib.cjs');
  const { pool, check, finish, api } = K;
  const LABEL = `v8 17 hpay cashfree (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
  const LEAK = /"(id|user_id|userId|cf_order_id|cf_payment_id|payment_session_id|customer_id|customer_phone|howdi_id|master_id|x-client-secret|client_secret)"\s*:|cfsk_sandbox_test_/;
  const key = () => 'k-' + crypto.randomBytes(8).toString('hex');
  const webhook = async (payload, { secret = SECRET, ts = String(Date.now()), tamper = false } = {}) => {
    const raw = JSON.stringify(payload); const sig = crypto.createHmac('sha256', secret).update(ts + raw).digest('base64');
    const body = tamper ? raw.replace(/"payment_amount":\d+/, '"payment_amount":1') : raw;
    const r = await fetch(`${K.base()}/api/v8/hpay/cashfree/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-webhook-signature': sig, 'x-webhook-timestamp': ts, 'x-webhook-version': '2025-01-01' }, body });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  };
  const successEvent = (ref, amount, status = 'SUCCESS') => ({ type: status === 'SUCCESS' ? 'PAYMENT_SUCCESS_WEBHOOK' : status === 'USER_DROPPED' ? 'PAYMENT_USER_DROPPED_WEBHOOK' : 'PAYMENT_FAILED_WEBHOOK', event_time: new Date().toISOString(),
    data: { order: { order_id: ref, order_amount: amount, order_currency: 'INR' }, payment: { cf_payment_id: String(Date.now()), payment_status: status, payment_amount: amount, payment_currency: 'INR' } } });

  const started = await K.start(); check('server starts', started, K.serverLog().slice(-600)); if (!started) { stubServer.close(); return finish(LABEL); }
  const A = await K.member('Asha Payer', { username: 'asha_cf' }); const B = await K.member('Bala Other', { username: 'bala_cf' });
  const bal = async (u) => Number((await pool.query(`SELECT balance FROM howdi_v8_wallets WHERE user_id=$1`, [u.id])).rows[0]?.balance || 0);
  const topups = async (u) => (await pool.query(`SELECT COUNT(*)::int n, COALESCE(SUM(amount),0)::numeric s FROM howdi_v8_ledger WHERE user_id=$1 AND kind='TOPUP'`, [u.id])).rows[0];
  const create = (u, body) => api('POST', '/api/v8/hpay/cashfree/orders', { token: u.token, body });
  const status = (u, ref) => api('GET', `/api/v8/hpay/cashfree/orders/${ref}`, { token: u.token });

  check('config: unauthenticated refused', (await api('GET', '/api/v8/hpay/cashfree/config')).status === 401);
  if (!SANDBOX) {
    const c = await api('GET', '/api/v8/hpay/cashfree/config', { token: A.token });
    check('no sandbox: Cashfree not offered (fail-closed funding gate kept)', c.status === 200 && c.json.enabled === false);
    check('no sandbox: create order refused 503, nothing sent to Cashfree', (await create(A, { amount: 500, idempotency_key: key() })).status === 503 && stub.creates.length === 0);
    stubServer.close(); return finish(LABEL);
  }
  check('config: sandbox checkout offered', (await api('GET', '/api/v8/hpay/cashfree/config', { token: A.token })).json.enabled === true);
  await api('GET', '/api/v8/wallet', { token: A.token }); await api('GET', '/api/v8/wallet', { token: B.token });
  const a0 = await bal(A);

  // ---------------- create: authentication, forged amount / identity, request key
  check('create: unauthenticated refused', (await api('POST', '/api/v8/hpay/cashfree/orders', { body: { amount: 500, idempotency_key: key() } })).status === 401);
  for (const [label, amount] of [['string', '500'], ['below minimum', 99], ['above maximum', 5001], ['fraction', 500.5], ['negative', -500], ['zero', 0], ['extreme', 1e12], ['missing', undefined]]) {
    const r = await create(A, { amount, idempotency_key: key() });
    check(`create: ${label} amount refused`, r.status === 400 && r.json.code === 'AMOUNT', { s: r.status });
  }
  check('create: request key required', (await create(A, { amount: 500 })).json.code === 'IDEMPOTENCY_KEY_REQUIRED');
  const k1 = key(); const before = stub.creates.length;
  let r = await create(A, { amount: 500, idempotency_key: k1, user_id: B.id, userId: B.id, order_amount: 1, order_id: 'HCF-0000000000000001', customer_id: String(B.id) });
  const ref1 = r.json.payment?.reference; const sent = stub.creates[stub.creates.length - 1];
  check('create: 201 with HOWDI reference + checkout session only', r.status === 201 && /^HCF-[0-9A-F]{16}$/.test(ref1 || '') && /^session_/.test(r.json.checkout_session || '') && r.json.payment.amount === 500 && r.json.payment.status === 'active', r.json);
  check('create: Cashfree got the server amount/id, never the forged ones', sent.order_amount === 500 && sent.order_id === ref1 && sent.order_currency === 'INR' && stub.creates.length === before + 1, sent);
  check('create: Cashfree customer id is opaque (no HOWDI user id)', /^hc_[0-9a-f]{24}$/.test(sent.customer_details.customer_id) && !sent.customer_details.customer_id.includes(String(A.id)));
  const owner = (await pool.query(`SELECT user_id FROM howdi_v8_provider_payments WHERE reference=$1`, [ref1])).rows[0];
  check('create: forged user id ignored — the order belongs to the session user', Number(owner.user_id) === A.id);
  check('create: no secret / provider ids / HOWDI ids in the response', !LEAK.test(r.text), r.text.match(LEAK)?.[0]);
  // replayed checkout + conflicting payload + concurrency
  r = await create(A, { amount: 500, idempotency_key: k1 });
  check('replayed checkout: same key → same order and session, no new Cashfree order', r.status === 200 && r.json.replayed === true && r.json.payment.reference === ref1 && stub.orders.size === 1, r.json);
  check('replayed checkout: same key + different amount → 409', (await create(A, { amount: 900, idempotency_key: k1 })).json.code === 'IDEMPOTENCY_KEY_REUSED');
  const k2 = key(); const burst = await Promise.all(Array.from({ length: 5 }, () => create(A, { amount: 300, idempotency_key: k2 })));
  const refs = new Set(burst.map((x) => x.json.payment?.reference).filter(Boolean));
  check('rapid double-submit: 5 concurrent creates, one key → one HOWDI order, one Cashfree order', refs.size === 1 && burst.every((x) => x.status === 200 || x.status === 201)
    && Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_provider_payments WHERE user_id=$1 AND idem_key=$2`, [A.id, k2])).rows[0].n) === 1 && stub.orders.has([...refs][0]), burst.map((x) => x.status));
  const ref2 = [...refs][0];

  // ---------------- cross-account + forged references
  check('cross-account: another user cannot read the order', (await status(B, ref1)).status === 404);
  check('forged reference: unknown order → 404', (await status(A, 'HCF-0000000000000000')).status === 404);
  check('forged reference: malformed → 404', (await status(A, 'HCF-xyz')).status === 404);

  // ---------------- browser/redirect never credits; pending → success; double-credit prevention
  r = await status(A, ref1);
  check('no payment yet: status active, nothing credited (redirect success is not trusted)', r.json.payment.status === 'active' && await bal(A) === a0);
  pay(ref1, 'PENDING');
  r = await status(A, ref1); check('pending: shown as pending, balance unchanged', r.json.payment.status === 'pending' && await bal(A) === a0);
  pay(ref1, 'SUCCESS');
  const polls = await Promise.all([status(A, ref1), status(A, ref1), status(A, ref1), webhook(successEvent(ref1, 500)), webhook(successEvent(ref1, 500)), status(A, ref1)]);
  const t1 = await topups(A);
  check('pending → success: credited exactly once under concurrent polls + webhooks', await bal(A) === a0 + 500 && t1.n === 1 && Number(t1.s) === 500 && polls.every((x) => x.status === 200), { bal: await bal(A), t1 });
  const dupEvent = successEvent(ref1, 500); const firstDelivery = await webhook(dupEvent); r = await webhook(dupEvent);
  check('duplicate webhook: identical redelivery acknowledged as duplicate, no second credit', firstDelivery.json.duplicate === false && r.status === 200 && r.json.duplicate === true && (await topups(A)).n === 1
    && Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_provider_events WHERE event_hash=$1`, [crypto.createHash('sha256').update(JSON.stringify(dupEvent)).digest('hex')])).rows[0].n) === 1);
  r = await webhook(successEvent(ref1, 500, 'FAILED'));
  check('out-of-order webhook: FAILED after PAID never downgrades or debits', r.status === 200 && (await status(A, ref1)).json.payment.status === 'paid' && await bal(A) === a0 + 500);
  check('paid order replay: no checkout session handed out again', (await create(A, { amount: 500, idempotency_key: k1 })).json.checkout_session === null);
  const ledger = (await pool.query(`SELECT reference, note FROM howdi_v8_ledger WHERE user_id=$1 AND kind='TOPUP'`, [A.id])).rows[0];
  check('ledger: HOWDI reference + provider note on the TOPUP credit', ledger.reference === ref1 && /Cashfree/.test(ledger.note));

  // ---------------- webhook verification
  const events0 = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_provider_events`)).rows[0].n);
  check('webhook: wrong secret → 401', (await webhook(successEvent(ref2, 300), { secret: 'wrong-secret' })).status === 401);
  check('webhook: tampered body → 401', (await webhook(successEvent(ref2, 300), { tamper: true })).status === 401);
  check('webhook: stale timestamp → 401', (await webhook(successEvent(ref2, 300), { ts: String(Date.now() - 3 * 24 * 3600 * 1000) })).status === 401);
  const noSig = await fetch(`${K.base()}/api/v8/hpay/cashfree/webhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(successEvent(ref2, 300)) });
  check('webhook: missing signature → 401', noSig.status === 401);
  check('webhook: rejected events are not recorded', Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_provider_events`)).rows[0].n) === events0);
  r = await webhook(successEvent(ref2, 300));
  check('webhook: valid signature but Cashfree shows no payment → nothing credited (webhook fields not trusted)', r.status === 200 && (await status(A, ref2)).json.payment.status === 'active' && (await topups(A)).n === 1);
  r = await webhook(successEvent('HCF-0000000000000000', 300));
  check('webhook: unknown order acknowledged, nothing credited', r.status === 200 && (await topups(A)).n === 1);

  // ---------------- failure → retry in the same order → success; user dropped; amount mismatch
  pay(ref2, 'FAILED');
  r = await status(A, ref2); check('failed attempt: status failed, can retry in the same order', r.json.payment.status === 'failed' && r.json.payment.can_pay === true && (await topups(A)).n === 1);
  r = await create(A, { amount: 300, idempotency_key: k2 });
  check('retry after failure: same order + session returned', r.json.payment.reference === ref2 && Boolean(r.json.checkout_session));
  pay(ref2, 'SUCCESS'); r = await status(A, ref2);
  check('failure then retry success: credited once', r.json.payment.status === 'paid' && await bal(A) === a0 + 800 && (await topups(A)).n === 2);
  const k3 = key(); const ref3 = (await create(A, { amount: 400, idempotency_key: k3 })).json.payment.reference;
  pay(ref3, 'USER_DROPPED'); await webhook(successEvent(ref3, 400, 'USER_DROPPED'));
  check('user dropped: status user_dropped, nothing credited', (await status(A, ref3)).json.payment.status === 'user_dropped' && await bal(A) === a0 + 800);
  const k4 = key(); const ref4 = (await create(A, { amount: 600, idempotency_key: k4 })).json.payment.reference;
  pay(ref4, 'SUCCESS', 6000); r = await status(A, ref4);
  check('forged amount at provider: SUCCESS for a different amount → mismatch, nothing credited', r.json.payment.status === 'mismatch' && await bal(A) === a0 + 800, r.json.payment);

  // ---------------- provider timeout / outage
  stub.delayMs = 2500; const k5 = key();
  r = await create(A, { amount: 200, idempotency_key: k5 });
  check('provider timeout on create: 504, nothing charged, no session handed out', r.status === 504 && r.json.code === 'PROVIDER_UNAVAILABLE' && !r.json.checkout_session, r.status);
  stub.delayMs = 0; await new Promise((x) => setTimeout(x, 1200));
  r = await create(A, { amount: 200, idempotency_key: k5 });
  const ref5 = r.json.payment?.reference;
  check('retry after timeout: adopts the order Cashfree already created (same reference, one order)', (r.status === 200 || r.status === 201) && /^session_/.test(r.json.checkout_session || '') && stub.orders.has(ref5)
    && stub.creates.filter((c) => c.order_id === ref5).length === 2, { s: r.status, n: stub.creates.filter((c) => c.order_id === ref5).length });
  pay(ref5, 'SUCCESS'); stub.down = true;
  r = await status(A, ref5);
  check('provider outage on status: verifying, nothing credited yet', r.status === 200 && r.json.verifying === true && r.json.payment.status !== 'paid' && await bal(A) === a0 + 800);
  stub.down = false;

  // ---------------- rollback on ledger failure
  await pool.query(`CREATE OR REPLACE FUNCTION howdi_test_fail_ledger() RETURNS trigger AS $$ BEGIN IF NEW.reference='${ref5}' THEN RAISE EXCEPTION 'forced ledger failure'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql`);
  await pool.query(`CREATE TRIGGER howdi_test_fail_ledger BEFORE INSERT ON howdi_v8_ledger FOR EACH ROW EXECUTE FUNCTION howdi_test_fail_ledger()`);
  r = await status(A, ref5);
  const row5 = (await pool.query(`SELECT status, settled_txn FROM howdi_v8_provider_payments WHERE reference=$1`, [ref5])).rows[0];
  check('ledger failure: whole settlement rolls back (no balance, no PAID), no raw error', r.status === 200 && r.json.verifying === true && row5.status !== 'PAID' && !row5.settled_txn && await bal(A) === a0 + 800 && !/forced ledger failure/.test(r.text), { row5, s: r.status });
  r = await webhook(successEvent(ref5, 200));
  check('ledger failure: webhook answers 500 so Cashfree retries', r.status === 500 && await bal(A) === a0 + 800);
  await pool.query(`DROP TRIGGER howdi_test_fail_ledger ON howdi_v8_ledger`);
  r = await webhook(successEvent(ref5, 200));
  check('after recovery: Cashfree retry settles exactly once', r.status === 200 && (await status(A, ref5)).json.payment.status === 'paid' && await bal(A) === a0 + 1000 && (await topups(A)).n === 3);

  // ---------------- refunds recorded, balance untouched
  r = await webhook({ type: 'REFUND_STATUS_WEBHOOK', event_time: new Date().toISOString(), data: { refund: { refund_id: 'r1', order_id: ref1, refund_status: 'SUCCESS', refund_amount: 500 }, order: { order_id: ref1 } } });
  check('refund webhook: recorded on the payment, wallet not auto-reversed', r.status === 200 && (await pool.query(`SELECT refund_status FROM howdi_v8_provider_payments WHERE reference=$1`, [ref1])).rows[0].refund_status === 'SUCCESS' && await bal(A) === a0 + 1000);

  // ---------------- limits
  const C = await K.member('Chitra Limits', { username: 'chitra_cf' }); await api('GET', '/api/v8/wallet', { token: C.token });
  await create(C, { amount: 5000, idempotency_key: key() }); await create(C, { amount: 5000, idempotency_key: key() });
  check('daily limit: open + settled top-ups cannot exceed ₹10,000', (await create(C, { amount: 100, idempotency_key: key() })).json.code === 'DAILY_LIMIT');

  // ---------------- suspended / revoked / expired
  const S = await K.member('Sid Suspended', { username: 'sid_cf' }); await api('GET', '/api/v8/wallet', { token: S.token });
  const refS = (await create(S, { amount: 500, idempotency_key: key() })).json.payment.reference;
  await pool.query(`UPDATE users SET account_status='SUSPENDED', is_active=FALSE WHERE id=$1`, [S.id]);
  check('suspended: create refused', (await create(S, { amount: 500, idempotency_key: key() })).status === 401);
  check('suspended: status refused', (await status(S, refS)).status === 401);
  await pool.query(`UPDATE users SET account_status='ACTIVE', is_active=TRUE WHERE id=$1`, [S.id]);
  await pool.query(`UPDATE user_sessions SET is_active=FALSE WHERE user_id=$1`, [S.id]);
  check('revoked session: create refused', (await create(S, { amount: 500, idempotency_key: key() })).status === 401);
  await pool.query(`UPDATE user_sessions SET is_active=TRUE, expires_at=NOW()-interval '1 minute' WHERE user_id=$1`, [S.id]);
  check('expired session: status refused', (await status(S, refS)).status === 401);
  check('no Cashfree order was created for refused calls', stub.creates.filter((c) => c.order_id === refS).length === 1);

  stubServer.close(); finish(LABEL);
})().catch((e) => { console.error(e); try { stubServer.close(); } catch {} const K = require('../k5a-pg/lib.cjs'); K.check('suite completed', false, e.message); K.finish('v8 17 hpay cashfree'); });
