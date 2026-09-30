// HPay × Cashfree (sandbox only) — pure tests: config guard, webhook signature, verified-state reducer, client polling.
// Real PostgreSQL + server + Cashfree API stub: tests/v8-pg/17-hpay-cashfree.cjs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs'); const path = require('node:path');
const C = require('../hpay-cashfree-v8.cjs');

test('config: sandbox only — production mode/host, foreign hosts and missing credentials fail closed', () => {
  const base = { CASHFREE_ENV: 'sandbox', CASHFREE_CLIENT_ID: 'id', CASHFREE_CLIENT_SECRET: 'secret' };
  assert.equal(C.cashfreeConfig(base).enabled, true);
  assert.equal(C.cashfreeConfig(base).base, C.SANDBOX_BASE);
  for (const [label, env] of [
    ['production mode', { ...base, CASHFREE_ENV: 'production' }], ['no mode', { ...base, CASHFREE_ENV: '' }],
    ['production host', { ...base, CASHFREE_API_BASE: 'https://api.cashfree.com/pg' }], ['foreign host', { ...base, CASHFREE_API_BASE: 'https://evil.example/pg' }],
    ['loopback without the test flag', { ...base, CASHFREE_API_BASE: 'http://127.0.0.1:9999/pg' }], ['no secret', { ...base, CASHFREE_CLIENT_SECRET: '' }], ['no id', { ...base, CASHFREE_CLIENT_ID: '' }],
    ['production host even with the test flag', { ...base, CASHFREE_API_BASE: 'https://api.cashfree.com/pg', HOWDI_CASHFREE_ALLOW_LOCAL_STUB: '1' }],
  ]) assert.equal(C.cashfreeConfig(env).enabled, false, label);
  assert.equal(C.cashfreeConfig({ ...base, CASHFREE_API_BASE: 'http://127.0.0.1:9999/pg', HOWDI_CASHFREE_ALLOW_LOCAL_STUB: '1' }).enabled, true, 'loopback stub only with the explicit test flag');
});

test('webhook signature: Base64(HMAC-SHA256(secret, timestamp + raw body)), timing-safe, fresh', () => {
  const secret = 's3cret'; const raw = '{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"order":{"order_id":"HCF-0123456789ABCDEF"}}}'; const now = 1_900_000_000_000; const ts = String(now);
  const sig = crypto.createHmac('sha256', secret).update(ts + raw).digest('base64');
  assert.deepEqual(C.verifyWebhookSignature({ rawBody: raw, timestamp: ts, signature: sig, secret, nowMs: now }), { ok: true });
  assert.equal(C.verifyWebhookSignature({ rawBody: raw + ' ', timestamp: ts, signature: sig, secret, nowMs: now }).reason, 'SIGNATURE', 'body must be byte-exact');
  assert.equal(C.verifyWebhookSignature({ rawBody: raw, timestamp: ts, signature: sig, secret: 'other', nowMs: now }).reason, 'SIGNATURE');
  assert.equal(C.verifyWebhookSignature({ rawBody: raw, timestamp: ts, signature: sig.slice(0, -2), secret, nowMs: now }).reason, 'SIGNATURE');
  assert.equal(C.verifyWebhookSignature({ rawBody: raw, timestamp: String(now - 2 * 86400000), signature: sig, secret, nowMs: now }).reason, 'STALE');
  assert.equal(C.verifyWebhookSignature({ rawBody: raw, timestamp: String(now + 10 * 60000), signature: sig, secret, nowMs: now }).reason, 'STALE');
  assert.equal(C.verifyWebhookSignature({ rawBody: raw, timestamp: 'abc', signature: sig, secret, nowMs: now }).reason, 'TIMESTAMP');
  assert.equal(C.verifyWebhookSignature({ rawBody: raw, timestamp: ts, signature: '', secret, nowMs: now }).reason, 'MISSING');
  const secTs = String(Math.floor(now / 1000)); const secSig = crypto.createHmac('sha256', secret).update(secTs + raw).digest('base64');
  assert.equal(C.verifyWebhookSignature({ rawBody: raw, timestamp: secTs, signature: secSig, secret, nowMs: now }).ok, true, 'second-resolution timestamps accepted');
});

test('verified state: only a SUCCESS payment for exactly the order amount in INR settles; nothing else credits', () => {
  const row = { reference: 'HCF-0123456789ABCDEF', amount: '500.00' };
  const order = (o = {}) => ({ order_id: row.reference, order_amount: 500, order_currency: 'INR', order_status: 'ACTIVE', ...o });
  const pay = (s, amt = 500, t = '2026-09-30T10:00:00Z', cur = 'INR') => ({ cf_payment_id: 1, payment_status: s, payment_amount: amt, payment_currency: cur, payment_time: t });
  assert.deepEqual(C.assessPayment(row, order({ order_status: 'PAID' }), [pay('SUCCESS')]), { state: 'PAID', cfPaymentId: '1' });
  assert.equal(C.assessPayment(row, order(), [pay('FAILED', 500, '2026-09-30T10:00:00Z'), pay('SUCCESS', 500, '2026-09-30T10:05:00Z')]).state, 'PAID', 'retry after failure');
  assert.equal(C.assessPayment(row, order(), [pay('SUCCESS', 50)]).state, 'MISMATCH', 'success for another amount');
  assert.equal(C.assessPayment(row, order(), [pay('SUCCESS', 500, undefined, 'USD')]).state, 'MISMATCH');
  assert.equal(C.assessPayment(row, order({ order_amount: 5 }), [pay('SUCCESS', 5)]).state, 'MISMATCH', 'provider order amount differs from HOWDI');
  assert.equal(C.assessPayment(row, order({ order_id: 'HCF-FFFFFFFFFFFFFFFF' }), [pay('SUCCESS')]).state, 'UNKNOWN');
  assert.equal(C.assessPayment(row, order(), [pay('PENDING')]).state, 'PENDING');
  assert.equal(C.assessPayment(row, order({ order_status: 'EXPIRED' }), []).state, 'EXPIRED');
  assert.equal(C.assessPayment(row, order(), [pay('USER_DROPPED')]).state, 'USER_DROPPED');
  assert.equal(C.assessPayment(row, order(), [pay('USER_DROPPED', 500, '2026-09-30T10:00:00Z'), pay('FAILED', 500, '2026-09-30T10:01:00Z')]).state, 'FAILED');
  assert.equal(C.assessPayment(row, order(), []).state, 'ACTIVE');
  assert.equal(C.assessPayment(row, order({ order_status: 'PAID' }), []).state, 'PENDING', 'order PAID without a verifiable payment is not credited');
});

test('module contract: amounts/ids from the server, secret server-side, settlement locked and single, ledger in the same transaction', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'hpay-cashfree-v8.cjs'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(src, /order_id: row\.reference, order_amount: MONEY\(row\.amount\), order_currency: 'INR'/);
  assert.match(src, /customer_id: customerId\(uid\)/);
  assert.doesNotMatch(src.slice(src.indexOf('function dto('), src.indexOf('// Verify with Cashfree and settle')), /secret|cf_order_id|cf_payment_id|user_id|idem_key/, 'no secret/provider/HOWDI ids in DTOs');
  assert.match(src, /'x-client-secret': c\.secret/, 'secret only in the server-to-server header');
  const settle = src.slice(src.indexOf('async function settle('), src.indexOf('async function readRaw('));
  assert.match(settle, /BEGIN[\s\S]*FOR UPDATE[\s\S]*if \(row\.status === 'PAID'\)[\s\S]*UPDATE howdi_v8_wallets[\s\S]*INSERT INTO howdi_v8_ledger[\s\S]*SET status='PAID'[\s\S]*COMMIT/);
  const hook = src.slice(src.indexOf("if (p === '/api/v8/hpay/cashfree/webhook'"), src.indexOf('const v = await viewer(req);'));
  assert.ok(hook.indexOf('verifyWebhookSignature') < hook.indexOf('JSON.parse(raw)'), 'signature checked before the payload is read');
  assert.match(hook, /await reconcile\(row\)/, 'webhook re-verifies with Cashfree instead of trusting its fields');
  assert.doesNotMatch(hook, /payment_amount|payment_status\)/, 'webhook payment fields never drive money');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.ok(server.indexOf('v8SafeHandle(hpayCashfreeV8') < server.indexOf('v8SafeHandle(hpayV8Utilities'), 'dispatched before HPay utilities');
});

test('client: polls HOWDI until a final state; never treats checkout completion as success', async () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'apps', 'customer', 'src', 'v8', 'me', 'V8Wallet.jsx'), 'utf8');
  assert.match(src, /await cashfree\.checkout\(\{ paymentSessionId: r\.json\.checkout_session, redirectTarget: "_modal" \}\);[\s\S]*setCfState\("verifying"\); cfFinish\(await pollPayment\(api, ref\)\);/);
  const { pollPayment, FINAL_STATES } = await import('../../apps/customer/src/v8/me/cashfreeCheckout.js');
  assert.deepEqual([...FINAL_STATES], ['paid', 'failed', 'user_dropped', 'expired', 'mismatch']);
  const seq = ['active', 'pending', 'paid']; let i = 0;
  const api = async () => ({ ok: true, status: 200, json: { payment: { status: seq[Math.min(i++, seq.length - 1)] } } });
  const out = await pollPayment(api, 'HCF-0123456789ABCDEF', { tries: 10, sleep: async () => {} });
  assert.equal(out.payment.status, 'paid'); assert.equal(i, 3);
  const nf = await pollPayment(async () => ({ ok: false, status: 404, json: { message: 'Payment not found.' } }), 'HCF-0123456789ABCDEF', { sleep: async () => {} });
  assert.equal(nf.error, 'Payment not found.');
});
