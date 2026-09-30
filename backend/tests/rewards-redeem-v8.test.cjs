// Legacy rewards redeem compatibility fix — pure tests. PostgreSQL behaviour: tests/v8-pg/18-rewards-redeem.cjs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const R = require('../rewards-redeem-v8.cjs');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8').replace(/\r\n/g, '\n');
const src = fs.readFileSync(path.join(__dirname, '..', 'rewards-redeem-v8.cjs'), 'utf8').replace(/\r\n/g, '\n').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const route = (start) => { const i = server.indexOf(start); assert.ok(i >= 0, start); return server.slice(i, server.indexOf('\n            if(req.method', i + start.length)); };

test('points: whole numbers 1..1,000,000 only; everything else fails closed', () => {
  for (const [v, n] of [[1, 1], [500, 500], ['500', 500], [' 42 ', 42], [1000000, 1000000]]) assert.equal(R.parsePoints(v), n, JSON.stringify(v));
  for (const v of [0, -1, '-5', 12.5, '12.5', '1e3', 'abc', '', null, undefined, NaN, Infinity, 1000001, [5], {}, true, '0x10'])
    assert.equal(R.parsePoints(v), null, JSON.stringify(v));
});

test('schema compatibility: REDEEMED + title (the authoritative reward_transactions columns), never REDEEM/description', () => {
  const create = server.slice(server.indexOf('CREATE TABLE IF NOT EXISTS reward_transactions'), server.indexOf('CREATE TABLE IF NOT EXISTS reward_transactions') + 600);
  assert.match(create, /title VARCHAR\(255\) NOT NULL/); assert.match(create, /CHECK \(transaction_type IN \('EARNED','REDEEMED','ADJUSTMENT'\)\)/);
  assert.match(src, /INSERT INTO reward_transactions\(user_id, transaction_type, points, title\) VALUES\(\$1,'REDEEMED',\$2,\$3\)/);
  assert.doesNotMatch(src, /'REDEEM'|description\)/);
  assert.match(src, /FOR UPDATE[\s\S]*INSUFFICIENT_POINTS[\s\S]*INSERT INTO reward_transactions[\s\S]*UPDATE user_rewards_wallet[\s\S]*COMMIT/, 'check, insert and deduction in one locked transaction');
  const kinds = [...src.matchAll(/'(RW_[A-Z_]+)'/g)].map((m) => m[1]);
  assert.ok(kinds.length && kinds.every((k) => k.length <= 12), 'idempotency op fits howdi_wallet_idempotency.op VARCHAR(12)');
});

test('route: active-account session, strict input, allow-listed DTOs, generic errors, points only', () => {
  const r = route('if(req.method==="POST" && pathname==="/api/rewards/redeem"){').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  assert.match(r, /const userId=await k5eRequireFinancialSelf\(req,res\);/);
  assert.match(r, /R\.parsePoints\(body\.points\)/);
  assert.match(r, /console\.error\("HOWDI rewards redeem error:"[\s\S]*sendJSON\(res,500,\{status:"error",message:"Unable to redeem reward points right now"\}\)/);
  assert.doesNotMatch(r, /throw error|body\.user_?[iI]d|wallet_credit|user_wallets|howdi_v8_wallets/);
  assert.doesNotMatch(src.slice(src.indexOf('const walletDto'), src.indexOf('async function redeemPoints')), /\bid\b|user_id/, 'DTOs carry no ids');
  assert.equal((server.match(/pathname==="\/api\/rewards\/redeem"/g) || []).length, 1);
  assert.match(route('if(req.method==="POST" && pathname==="/api/rewards/earn"){'), /sendJSON\(res,410,\{status:"error",code:"REWARDS_ENDPOINT_RETIRED"/, 'earn stays retired');
});
