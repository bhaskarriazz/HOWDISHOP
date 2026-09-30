// HPay / wallet security helpers — pure tests (no database). PostgreSQL behaviour: tests/v8-pg/15-hpay-security.cjs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const W = require('../wallet-security-v8.cjs');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8').replace(/\r\n/g, '\n');
const route = (start) => { const i = server.indexOf(start); assert.ok(i >= 0, start); return server.slice(i, server.indexOf('\n            if(req.method', i + start.length)).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n'); };

test('amounts: finite, positive, at most 2 decimals, within the route maximum', () => {
  for (const ok of [[1, 1], [0.01, 0.01], ['12.50', 12.5], [5000, 5000], [' 7 ', 7]]) assert.equal(W.parseAmount(ok[0], { max: 5000 }), ok[1], String(ok[0]));
  for (const bad of [0, -1, -0.01, 5000.01, 1e12, 10.005, NaN, Infinity, 'Infinity', '1e3', '0x10', 'abc', '', null, undefined, true, [5], { a: 1 }, '-5'])
    assert.equal(W.parseAmount(bad, { max: 5000 }), null, JSON.stringify(bad));
});

test('idempotency keys: absent → undefined, malformed → null, valid → the key (body or header)', () => {
  const req = (h = {}) => ({ headers: h });
  assert.equal(W.idempotencyKey(req(), {}), undefined);
  assert.equal(W.idempotencyKey(req(), { idempotency_key: 'short' }), null);
  assert.equal(W.idempotencyKey(req(), { idempotency_key: 'has space in it' }), null);
  assert.equal(W.idempotencyKey(req(), { idem_key: 'k-0123456789' }), 'k-0123456789');
  assert.equal(W.idempotencyKey(req({ 'idempotency-key': 'hdr-0123456789' }), {}), 'hdr-0123456789');
});

test('retired V16.4A/B HPay packs: deny by default, capabilities public, admin paths left to the admin guard', () => {
  const g = (method, p) => W.hpayPackGuard({ method }, p);
  for (const [m, p] of [['GET', '/api/hpay/v164a/wallet'], ['POST', '/api/hpay/v164b/payouts'], ['POST', '/api/hpay/v164b/webhooks/razorpay'], ['PATCH', '/api/hpay/v164a/escrow/1/status'], ['GET', '/api/hpay/v164b/merchant/1/dashboard'], ['POST', '/api/hpay/v164a/capabilities']])
    assert.equal(g(m, p)?.status, 410, `${m} ${p}`);
  assert.equal(g('GET', '/api/hpay/v164a/capabilities'), null);
  assert.equal(g('GET', '/api/hpay/v164a/admin/review-queue'), null);
  assert.equal(g('GET', '/api/hpay/me'), null, 'other HPay routes are untouched');
  assert.match(server, /const hpayRetired=require\("\.\/wallet-security-v8\.cjs"\)\.hpayPackGuard\(req,pathname\);/);
  assert.ok(server.indexOf('const hpayRetired=') > server.indexOf('if(!sessionUser||!Number(sessionUser.id))'), 'session gate runs first (unauthenticated → 401)');
});

test('legacy wallet routes: session-only actor, validated amounts, atomic helper, no raw user ids', () => {
  const credit = route('if(req.method==="POST" && pathname==="/api/wallet/credit"){');
  assert.match(credit, /if\(!accessV8\.sandboxEnabled\(\)\)return sendJSON\(res,503/);
  assert.match(credit, /const userId=await k5eRequireSelf\(req,res\);/);
  assert.match(credit, /parseAmount\(body\.amount,\{max:5000\}\)/);
  assert.match(credit, /if\(transactionType!=="CREDIT"\)/);
  assert.match(credit, /if\(!key\) return sendJSON\(res,400/);
  assert.doesNotMatch(credit, /body\.user_?[iI]d/);
  const debit = route('if(req.method==="POST" && pathname==="/api/wallet/debit"){');
  assert.match(debit, /const userId=await k5eRequireSelf\(req,res\);/);
  assert.match(debit, /mutateWallet\(pool,\{userId,op:"DEBIT"/);
  assert.match(debit, /wallet:k5eOmitUserId\(r\.wallet\),transaction:k5eOmitUserId\(r\.transaction\)/);
  assert.doesNotMatch(debit, /body\.user_?[iI]d/);
  assert.match(route('if(req.method==="POST" && pathname==="/api/wallet/transactions"){'), /sendJSON\(res,410/);
  assert.match(route('if(req.method==="POST" && pathname==="/api/wallet/add-money"){'), /parseAmount\(body\.amount,\{max:5000\}\)/);
  assert.equal((server.match(/pathname==="\/api\/rewards\/redeem"/g) || []).length, 1, 'the unreachable body.user_id redeem duplicate is gone');
});

test('mutateWallet: locks the wallet row before the idempotency check and the balance check', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'wallet-security-v8.cjs'), 'utf8');
  const body = src.slice(src.indexOf('async function mutateWallet'));
  const lock = body.indexOf('FOR UPDATE'); const idem = body.indexOf('FROM howdi_wallet_idempotency'); const check = body.indexOf("op === 'DEBIT' && Number(w.available_balance");
  assert.ok(lock > 0 && lock < idem && idem < check);
  assert.match(body, /INSERT INTO wallet_transactions\(wallet_id, user_id, transaction_type, amount, title/);
  assert.match(body, /await client\.query\('COMMIT'\)/);
});
