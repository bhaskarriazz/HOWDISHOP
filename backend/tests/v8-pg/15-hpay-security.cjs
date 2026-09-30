// HPay / Wallet security — adversarial suite on a real PostgreSQL + real server.
// Covers the legacy customer wallet (/api/wallet/*), the retired V16.4A/B HPay packs (/api/hpay/v164a|b/*), the HPay account
// surface (/api/hpay/me) and the V8 HPay wallet (/api/v8/wallet, /api/v8/hpay/*): authenticated owner, unauthenticated caller,
// forged user ids, cross-account access, malformed/negative/zero/extreme amounts, replays, concurrency, revoked/expired
// sessions, unauthorized credit/debit and balance/history isolation.
const K = require('../k5a-pg/lib.cjs');
const crypto = require('node:crypto');
const { pool, check, finish, api } = K;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 15 hpay security (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const LEAK = /"(user_id|userId|howdi_id|master_id|identity_uuid|session_token|owner_user_id|beneficiary_user_id|payer_user_id)"\s*:/;
const RAW_DB_ERROR = /invalid input syntax|violates|relation "|column "|syntax error at/i;
const idem = () => 'k-' + crypto.randomBytes(8).toString('hex');
(async () => {
  const started = await K.start(); check('server starts', started, K.serverLog().slice(-600)); if (!started) return finish(LABEL);
  const A = await K.member('Asha Owner', { username: 'asha_hpay' });
  const B = await K.member('Bala Victim', { username: 'bala_hpay' });
  const X = await K.member('Xen Revoked', { username: 'xen_hpay' });
  const legacy = async (u) => (await pool.query(`SELECT * FROM user_wallets WHERE user_id=$1`, [u.id])).rows[0] || {};
  const setLegacy = (u, n) => pool.query(`INSERT INTO user_wallets(user_id,available_balance,balance) VALUES($1,$2,$2) ON CONFLICT(user_id) DO UPDATE SET available_balance=$2, balance=$2`, [u.id, n]);
  const bal = async (u, col = 'available_balance') => Number((await legacy(u))[col] || 0);
  await setLegacy(A, 100); await setLegacy(B, 500);

  // ================= legacy /api/wallet — authentication =================
  let r = await api('POST', '/api/wallet/credit', { body: { user_id: B.id, amount: 50, description: 'x' } });
  check('credit: unauthenticated caller refused', [401, 503].includes(r.status) && await bal(B) === 500, r.status);
  r = await api('POST', '/api/wallet/debit', { body: { user_id: B.id, amount: 50 } });
  check('debit: unauthenticated caller refused', r.status === 401 && await bal(B) === 500, r.status);
  check('wallet/me: unauthenticated caller refused', (await api('GET', '/api/wallet/me')).status === 401);
  check('hpay/me: unauthenticated caller refused', (await api('GET', '/api/hpay/me')).status === 401);
  check('invalid bearer token refused', (await api('GET', '/api/wallet/me', { token: 'tok-forged-000' })).status === 401);

  // ================= legacy /api/wallet/credit — forged identity, amounts, replay =================
  r = await api('POST', '/api/wallet/credit', { token: A.token, body: { user_id: B.id, userId: B.id, amount: 25, description: 'Test top-up', idempotency_key: idem() } });
  if (SANDBOX) check('credit (sandbox): forged user_id ignored — only the session owner is credited', r.status === 201 && await bal(B) === 500 && await bal(A) === 125, { s: r.status, a: await bal(A), b: await bal(B) });
  else check('credit (no sandbox): refused without a payment provider', r.status === 503 && await bal(A) === 100);
  for (const [label, amount] of [['zero', 0], ['negative', -5], ['text', 'lots'], ['NaN', 'NaN'], ['extreme', 1e12], ['fractional paise', 10.005], ['infinity', 'Infinity']]) {
    const before = await bal(A);
    r = await api('POST', '/api/wallet/credit', { token: A.token, body: { amount, description: 'Test top-up', idempotency_key: idem() } });
    check(`credit: ${label} amount refused, balance unchanged`, r.status >= 400 && await bal(A) === before, { s: r.status, amount });
  }
  r = await api('POST', '/api/wallet/credit', { token: A.token, body: { amount: 10, description: 'Test', transaction_type: 'REFUND', idempotency_key: idem() } });
  check('credit: caller cannot label test money as a refund/adjustment', r.status >= 400, r.status);
  if (SANDBOX) {
    const key = idem(); const before = await bal(A);
    const a1 = await api('POST', '/api/wallet/credit', { token: A.token, body: { amount: 10, description: 'Test top-up', idempotency_key: key } });
    const a2 = await api('POST', '/api/wallet/credit', { token: A.token, body: { amount: 10, description: 'Test top-up', idempotency_key: key } });
    check('credit: replayed request credits once', a1.status === 201 && a2.status < 300 && await bal(A) === before + 10, { s: [a1.status, a2.status], d: await bal(A) - before });
    check('credit: a key cannot be replayed with a different amount', (await api('POST', '/api/wallet/credit', { token: A.token, body: { amount: 99, description: 'Test top-up', idempotency_key: key } })).status === 409);
    check('credit: idempotency key is required', (await api('POST', '/api/wallet/credit', { token: A.token, body: { amount: 10, description: 'Test top-up' } })).status === 400);
    check('credit: response carries no internal ids', !LEAK.test(a1.text), a1.text.slice(0, 200));
  }

  // ================= legacy /api/wallet/debit — isolation, amounts, replay, concurrency =================
  await setLegacy(A, 100);
  r = await api('POST', '/api/wallet/debit', { token: A.token, body: { user_id: B.id, userId: B.id, amount: 30, idempotency_key: idem() } });
  check('debit: forged user_id cannot drain another account', r.status === 200 && await bal(B) === 500 && await bal(A) === 70, { s: r.status, a: await bal(A), b: await bal(B) });
  check('debit: response carries no internal ids', !LEAK.test(r.text), r.text.slice(0, 200));
  for (const [label, amount] of [['zero', 0], ['negative', -40], ['text', 'x'], ['extreme', 1e12], ['over balance', 71]]) {
    r = await api('POST', '/api/wallet/debit', { token: A.token, body: { amount, idempotency_key: idem() } });
    check(`debit: ${label} amount refused, balance unchanged`, r.status === 400 && await bal(A) === 70, { s: r.status, a: await bal(A) });
  }
  {
    const key = idem();
    const d1 = await api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 10, idempotency_key: key } });
    const d2 = await api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 10, idempotency_key: key } });
    check('debit: replayed request (same key) debits once', d1.status === 200 && d2.status === 200 && await bal(A) === 60, { s: [d1.status, d2.status], a: await bal(A) });
  }
  await setLegacy(A, 100);
  const debited = async () => Number((await pool.query(`SELECT COALESCE(SUM(amount),0) s FROM wallet_transactions WHERE user_id=$1 AND transaction_type='DEBIT'`, [A.id])).rows[0].s);
  const trail0 = await debited();
  const conc = await Promise.all(Array.from({ length: 6 }, () => api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 30, idempotency_key: idem() } })));
  const okN = conc.filter((x) => x.status === 200).length;
  const trail = (await debited()) - trail0;
  check('debit: concurrent debits never overspend; trail matches balance', okN === 3 && await bal(A) === 10 && trail === 90, { okN, a: await bal(A), trail });

  // ================= legacy /api/wallet/transactions — self-minting =================
  await setLegacy(A, 100);
  const beforeRow = await legacy(A);
  r = await api('POST', '/api/wallet/transactions', { token: A.token, body: { title: 'Free money', amount: 100000, direction: 'CREDIT', transaction_type: 'WALLET' } });
  const afterRow = await legacy(A);
  check('wallet/transactions: a caller cannot mint balance for themselves', r.status >= 400 && Number(afterRow.wallet_balance || 0) === Number(beforeRow.wallet_balance || 0) && Number(afterRow.credit_balance || 0) === Number(beforeRow.credit_balance || 0), { s: r.status, before: beforeRow.wallet_balance, after: afterRow.wallet_balance });
  r = await api('POST', '/api/wallet/transactions', { token: A.token, body: { title: 'Credit', amount: 5000, direction: 'CREDIT', transaction_type: 'HOWDI_CREDIT' } });
  check('wallet/transactions: HOWDI credit cannot be self-issued', r.status >= 400, r.status);

  // ================= legacy /api/wallet/add-money =================
  r = await api('POST', '/api/wallet/add-money', { token: A.token, body: { amount: 1e9 } });
  check('add-money: extreme amount refused', r.status >= 400, r.status);
  r = await api('POST', '/api/wallet/add-money', { body: { amount: 100 } });
  check('add-money: unauthenticated refused', [401, 503].includes(r.status));
  if (!SANDBOX) check('add-money (no sandbox): refused without a payment provider', (await api('POST', '/api/wallet/add-money', { token: A.token, body: { amount: 100 } })).status === 503);

  // ================= balance / history isolation =================
  await pool.query(`INSERT INTO wallet_transactions(wallet_id,user_id,transaction_type,amount,title,description) SELECT id,user_id,'CREDIT',777,'B private marker','B private marker' FROM user_wallets WHERE user_id=$1`, [B.id]);
  r = await api('GET', `/api/wallet/me?user_id=${B.id}&userId=${B.id}`, { token: A.token });
  check('wallet/me: forged user id returns only the caller’s own history', r.status === 200 && !/B private marker/.test(r.text) && !LEAK.test(r.text), r.status);
  r = await api('GET', `/api/hpay/me?userId=${B.id}`, { token: A.token });
  check('hpay/me: forged user id returns only the caller’s own account', r.status === 200 && !/B private marker/.test(r.text) && !LEAK.test(r.text), r.status);
  r = await api('GET', `/api/wallet/${B.id}`, { token: A.token });
  check('legacy /api/wallet/{id} IDOR route stays closed', r.status !== 200 || !/B private marker|available_balance/.test(r.text), r.status);
  check('hpay/accounts/user/{other} refused', (await api('GET', `/api/hpay/accounts/user/${B.id}`, { token: A.token })).status === 403);

  // ================= revoked / expired sessions =================
  await pool.query(`UPDATE user_sessions SET is_active=FALSE WHERE user_id=$1`, [X.id]);
  check('revoked session: wallet read refused', (await api('GET', '/api/wallet/me', { token: X.token })).status === 401);
  check('revoked session: debit refused', (await api('POST', '/api/wallet/debit', { token: X.token, body: { amount: 1 } })).status === 401);
  check('revoked session: V8 wallet refused', (await api('GET', '/api/v8/wallet', { token: X.token })).status === 401);
  check('revoked session: v164 pack refused', (await api('GET', '/api/hpay/v164a/wallet', { token: X.token })).status === 401);
  const Y = await K.member('Yuki Expired', { username: 'yuki_hpay' });
  await pool.query(`UPDATE user_sessions SET expires_at=NOW()-interval '1 minute' WHERE user_id=$1`, [Y.id]);
  check('expired session: wallet read refused', (await api('GET', '/api/wallet/me', { token: Y.token })).status === 401);
  check('expired session: V8 add-money refused', (await api('POST', '/api/v8/hpay/add-money', { token: Y.token, body: { amount: 500, idem_key: idem() } })).status === 401);

  // ================= retired V16.4A/B HPay packs =================
  check('v164 packs: unauthenticated refused', (await api('GET', '/api/hpay/v164a/wallet')).status === 401);
  check('v164 packs: capabilities stay public', (await api('GET', '/api/hpay/v164a/capabilities')).status === 200);
  r = await api('GET', `/api/hpay/v164a/wallet?userId=${B.id}`, { token: A.token });
  check('v164a wallet: forged userId returns no account data and no raw DB error', !(r.status === 200 && r.json.wallet) && !RAW_DB_ERROR.test(r.text), { s: r.status, t: r.text.slice(0, 160) });
  const esc = (await pool.query(`INSERT INTO howdi_hpay_escrow_v164a(owner_user_id,beneficiary_user_id,module,amount) VALUES(gen_random_uuid(),gen_random_uuid(),'WORKS',500) RETURNING id, status`)).rows[0];
  r = await api('PATCH', `/api/hpay/v164a/escrow/${esc.id}/status`, { token: A.token, body: { status: 'RELEASED' } });
  const escAfter = (await pool.query(`SELECT status FROM howdi_hpay_escrow_v164a WHERE id=$1`, [esc.id])).rows[0].status;
  check('v164a escrow: another account’s escrow cannot be released', r.status >= 400 && escAfter === esc.status, { s: r.status, before: esc.status, after: escAfter });
  const victim = crypto.randomUUID();
  r = await api('POST', '/api/hpay/v164b/payouts', { token: A.token, body: { beneficiaryUserId: victim, amount: 99999999, payoutMethod: 'BANK' } });
  const payouts = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_hpay_payouts_v164b WHERE beneficiary_user_id=$1`, [victim])).rows[0].n);
  check('v164b payouts: caller cannot create a payout for another account', r.status >= 400 && payouts === 0, { s: r.status, payouts });
  r = await api('POST', '/api/hpay/v164b/webhooks/razorpay', { token: A.token, body: { providerEventId: 'evt-forged', eventType: 'payment.captured', signatureStatus: 'VERIFIED', payload: { amount: 1e7 } } });
  const hooks = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_hpay_webhook_events_v164b WHERE provider_event_id='evt-forged'`)).rows[0].n);
  check('v164b webhooks: a user cannot inject a "verified" provider event', r.status >= 400 && hooks === 0, { s: r.status, hooks });
  r = await api('POST', `/api/hpay/v164b/payment-intents/1/splits`, { token: A.token, body: { beneficiaryUserId: victim, splitValue: 100 } });
  check('v164b splits: caller cannot route a payment split to another account', r.status >= 400 && !RAW_DB_ERROR.test(r.text), r.status);
  r = await api('GET', '/api/hpay/v164b/merchant/1/dashboard', { token: A.token });
  check('v164b merchant dashboard: no cross-merchant reads', r.status >= 400, r.status);
  r = await api('POST', '/api/hpay/v164a/transfers', { token: A.token, body: { senderUserId: victim, receiverUserId: crypto.randomUUID(), amount: 5000 } });
  check('v164a transfers: forged sender refused, no raw DB error', r.status >= 400 && !RAW_DB_ERROR.test(r.text), { s: r.status, t: r.text.slice(0, 160) });
  check('v164a admin queue: members refused', [401, 403].includes((await api('GET', '/api/hpay/v164a/admin/review-queue', { token: A.token })).status));

  // ================= V8 HPay wallet =================
  check('V8 wallet: unauthenticated refused', (await api('GET', '/api/v8/wallet')).status === 401);
  check('V8 history: unauthenticated refused', (await api('GET', '/api/v8/hpay/history')).status === 401);
  check('V8 add-money: unauthenticated refused', (await api('POST', '/api/v8/hpay/add-money', { body: { amount: 500, idem_key: idem() } })).status === 401);
  const v8bal = async (u) => Number((await pool.query(`SELECT balance FROM howdi_v8_wallets WHERE user_id=$1`, [u.id])).rows[0]?.balance || 0);
  if (SANDBOX) {
    await api('GET', '/api/v8/wallet', { token: A.token }); await api('GET', '/api/v8/wallet', { token: B.token });
    const a0 = await v8bal(A), b0 = await v8bal(B);
    for (const [label, amount] of [['zero', 0], ['negative', -100], ['below minimum', 99], ['above maximum', 5001], ['text', 'x'], ['extreme', 1e15]]) {
      r = await api('POST', '/api/v8/hpay/add-money', { token: A.token, body: { amount, idem_key: idem() } });
      check(`V8 add-money: ${label} refused`, r.status === 400 && await v8bal(A) === a0, { s: r.status });
    }
    r = await api('POST', '/api/v8/hpay/add-money', { token: A.token, body: { amount: 500, idem_key: idem(), userId: B.id, user_id: B.id } });
    check('V8 add-money: forged user id credits only the session owner', r.status === 200 && await v8bal(A) === a0 + 500 && await v8bal(B) === b0, { s: r.status });
    const key = idem();
    const same = await Promise.all(Array.from({ length: 5 }, () => api('POST', '/api/v8/hpay/add-money', { token: A.token, body: { amount: 300, idem_key: key } })));
    const rows = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_ledger WHERE user_id=$1 AND kind='TOPUP' AND amount=300`, [A.id])).rows[0].n);
    check('V8 add-money: 5 concurrent replays of one key → one credit', rows === 1 && same.every((x) => x.status === 200) && await v8bal(A) === a0 + 800, { rows, st: same.map((x) => x.status) });
    r = await api('GET', `/api/v8/hpay/history?userId=${B.id}`, { token: B.token });
    check('V8 history: isolated to the caller (no one else’s top-ups)', r.status === 200 && !(r.json.items || []).some((i) => i.label === 'Added money') && !LEAK.test(r.text), (r.json.items || []).map((i) => i.label));
    // QR payments: PIN, concurrency, no overspend, double-entry trail
    for (const u of [A]) await api('POST', '/api/v8/hpay/pin', { token: u.token, body: { pin: '4826' } });
    const qr = (await api('GET', '/api/v8/hpay/qr', { token: B.token })).json.payload;
    check('V8 QR: wrong PIN refused', (await api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: qr, amount: 10, pin: '1111', idempotency_key: idem() } })).status >= 400);
    await pool.query(`UPDATE howdi_v8_wallets SET balance=1000 WHERE user_id=$1`, [A.id]); const bBefore = await v8bal(B);
    const pays = await Promise.all(Array.from({ length: 5 }, () => api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: qr, amount: 300, pin: '4826', idempotency_key: idem(), userId: B.id } })));
    const paid = pays.filter((x) => x.status === 201).length;
    const aAfter = await v8bal(A), bAfter = await v8bal(B);
    check('V8 QR: concurrent payments never overspend; payer/payee move together', paid === 3 && aAfter === 100 && bAfter - bBefore === 900, { paid, aAfter, bGain: bAfter - bBefore, st: pays.map((x) => x.status) });
    const legs = (await pool.query(`SELECT direction, SUM(amount) s FROM howdi_v8_ledger WHERE kind='QR_PAYMENT' GROUP BY direction`)).rows;
    check('V8 QR: ledger is double-entry (debits = credits)', legs.length === 2 && Number(legs[0].s) === Number(legs[1].s), legs);
    const qkey = idem();
    const q1 = await api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: qr, amount: 50, pin: '4826', idempotency_key: qkey } });
    const q2 = await api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: qr, amount: 50, pin: '4826', idempotency_key: qkey } });
    check('V8 QR: replayed payment (same key) moves money once', q1.status === 201 && q2.json.replayed === true && await v8bal(A) === 50, { s: [q1.status, q2.status], a: await v8bal(A) });
  } else {
    check('V8 add-money (no sandbox): refused without a payment provider', (await api('POST', '/api/v8/hpay/add-money', { token: A.token, body: { amount: 500, idem_key: idem() } })).status === 503);
    r = await api('GET', '/api/v8/wallet', { token: A.token });
    check('V8 wallet (no sandbox): no test balance is created', r.status === 200 && r.json.wallet === null, r.json);
  }
  finish(LABEL);
})().catch((e) => { console.error(e); check('suite completed', false, e.message); finish(LABEL); });
