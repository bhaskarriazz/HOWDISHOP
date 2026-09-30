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
  assert.match(credit, /const userId=await k5eRequireFinancialSelf\(req,res\);/);
  assert.match(credit, /parseAmount\(body\.amount,\{max:5000\}\)/);
  assert.match(credit, /if\(transactionType!=="CREDIT"\)/);
  assert.match(credit, /if\(!key\) return sendJSON\(res,400/);
  assert.doesNotMatch(credit, /body\.user_?[iI]d/);
  const debit = route('if(req.method==="POST" && pathname==="/api/wallet/debit"){');
  assert.match(debit, /const userId=await k5eRequireFinancialSelf\(req,res\);/);
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

// ---------------------------------------------------------------- production-integration hardening
test('financial access needs the sign-in account state (is_active + ACTIVE); anything else fails closed', () => {
  assert.equal(W.financialActive({ is_active: true, account_status: 'ACTIVE' }), true);
  assert.equal(W.financialActive({ is_active: true, account_status: ' active ' }), true);
  for (const u of [null, {}, { is_active: false, account_status: 'ACTIVE' }, { is_active: true, account_status: 'SUSPENDED' }, { is_active: true, account_status: 'BLOCKED' },
    { is_active: null, account_status: 'ACTIVE' }, { is_active: true, account_status: '' }, { is_active: 'true', account_status: 'ACTIVE' }])
    assert.equal(W.financialActive(u), false, JSON.stringify(u));
  const gate = server.slice(server.indexOf('async function k5eRequireFinancialSelf'), server.indexOf('async function k5eRequireSelf'));
  assert.match(gate, /if \(!session\) \{ sendJSON\(res, 401/);
  assert.match(gate, /financialActive\(session\)\) \{ sendJSON\(res, 403/);
  for (const r of ['"/api/wallet/me"', '"/api/wallet/transactions"', '"/api/wallet/credit"', '"/api/wallet/debit"', 'pathname === "/api/wallet/user/me"', '"/api/wallet/add-money"', '"/api/wallet/transfer-cashback"']) {
    const i = server.indexOf(r); const block = server.slice(i, i + 1400);
    assert.match(block, /const userId=await k5eRequireFinancialSelf\(req,res\);/, r);
  }
  assert.equal((server.match(/financialActive\(sessionUser\)\) return sendJSON\(res,403/g) || []).length, 4, 'hpay me / accounts / accounts/user / requests');
});

test('legacy balance reconciliation: available_balance is the only balance written and shown', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'wallet-security-v8.cjs'), 'utf8');
  assert.doesNotMatch(src, /SET balance=|balance=balance\+/, 'the legacy balance column is never written');
  assert.doesNotMatch(route('if(req.method==="POST" && pathname==="/api/wallet/add-money"){'), /UPDATE user_wallets SET balance/);
  assert.match(route('if(req.method==="POST" && pathname==="/api/wallet/add-money"){'), /mutateWallet\(pool,\{userId,op:"CREDIT",kind:"ADD_MONEY"/);
  assert.match(server, /balance:Number\(wallet\.available_balance\?\?0\),transactions:k5eOmitUserId\(tx\)\.map\(\(\{wallet_id,\.\.\.t\}\)=>t\)/);
  const cash = src.slice(src.indexOf('async function transferCashback'));
  assert.doesNotMatch(cash, /SUM\([^)]*\)[^`]*FOR UPDATE/, 'no aggregate FOR UPDATE');
  assert.match(cash, /FROM user_wallets WHERE user_id=\$1 FOR UPDATE[\s\S]*status='AVAILABLE' FOR UPDATE/);
});

test('idempotency records the operation kind, so one key cannot be replayed as another operation', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'wallet-security-v8.cjs'), 'utf8');
  assert.match(src, /const record = kind \|\| op;/);
  assert.match(src, /if \(prior\.op !== record \|\| Number\(prior\.amount\) !== amount\)/);
});

test('V8 daily limit: one per-payer transaction lock, shared by chat/QR and Utilities, taken before the day total is read', () => {
  for (const f of ['connect-v8-messages.cjs', 'hpay-v8-utilities.cjs']) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    const lock = src.indexOf("pg_advisory_xact_lock(hashtext($1))`, [`hpay-daily:");
    const today = src.indexOf("SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_ledger WHERE user_id=$1 AND direction='DEBIT'");
    assert.ok(lock > 0 && lock < today, f);
  }
});

test('legacy wallet UI sends one request key per attempt (retry/double-click reuse it; new amount or success resets)', async () => {
  const app = fs.readFileSync(path.join(__dirname, '..', '..', 'apps', 'customer', 'src', 'App.jsx'), 'utf8');
  assert.match(app, /idempotency_key:walletRequestKeys\.current\.keyFor\("add-money",amount\)/);
  assert.match(app, /idempotency_key: walletRequestKeys\.current\.keyFor\("debit", amount\)/);
  const { createWalletRequestKeys } = await import('../../apps/customer/src/walletRequestKey.js');
  const k = createWalletRequestKeys();
  const a = k.keyFor('debit', 10);
  assert.equal(k.keyFor('debit', 10), a, 'retry / double-click reuses the key');
  assert.match(a, /^[A-Za-z0-9._:-]{8,80}$/);
  assert.notEqual(k.keyFor('debit', 11), a, 'a different amount is a new request');
  const b = k.keyFor('add-money', 11); k.done();
  assert.notEqual(k.keyFor('add-money', 11), b, 'after success the next attempt is new');
});
