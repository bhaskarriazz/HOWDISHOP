// HPay production-integration hardening — real PostgreSQL + real server.
// Authoritative wallet schema compatibility, replay/idempotency on legacy debit + add-money, cashback transfer, rollback on a
// failed audit write, concurrent V8 daily-limit enforcement, suspended/deactivated accounts, revoked sessions, cross-account
// isolation and response leakage.
const K = require('../k5a-pg/lib.cjs');
const crypto = require('node:crypto');
const { pool, check, finish, api } = K;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 16 hpay production (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const LEAK = /"(user_id|userId|howdi_id|master_id|identity_uuid|session_token|wallet_id|payer_user_id|counterparty_user_id)"\s*:/;
const key = () => 'k-' + crypto.randomBytes(8).toString('hex');
(async () => {
  const started = await K.start(); check('server starts', started, K.serverLog().slice(-600)); if (!started) return finish(LABEL);
  const A = await K.member('Anu Owner', { username: 'anu_prod' });
  const B = await K.member('Bindu Other', { username: 'bindu_prod' });
  const S = await K.member('Sid Suspended', { username: 'sid_prod' });
  const row = async (u) => (await pool.query(`SELECT * FROM user_wallets WHERE user_id=$1`, [u.id])).rows[0] || {};
  const avail = async (u) => Number((await row(u)).available_balance || 0);
  const setAvail = (u, n) => pool.query(`INSERT INTO user_wallets(user_id,available_balance) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET available_balance=$2`, [u.id, n]);

  // ================= 1. authoritative schema compatibility =================
  const cols = async (t) => Object.fromEntries((await pool.query(`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name=$1`, [t])).rows.map((r) => [r.column_name, r.is_nullable]));
  const uw = await cols('user_wallets'); const wt = await cols('wallet_transactions');
  check('schema: user_wallets has id + available_balance (authoritative spendable balance)', uw.id === 'NO' && uw.available_balance === 'NO' && 'balance' in uw, Object.keys(uw));
  check('schema: wallet_transactions needs wallet_id + title, keeps user_id/description', wt.wallet_id === 'NO' && wt.title === 'NO' && 'user_id' in wt && 'description' in wt, wt);
  await setAvail(A, 200); await setAvail(B, 300);
  await pool.query(`UPDATE user_wallets SET balance=77 WHERE user_id=$1`, [A.id]); // legacy column value must never be read or changed
  let r = await api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 50, idempotency_key: key() } });
  const tx = (await pool.query(`SELECT * FROM wallet_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, [A.id])).rows[0];
  check('schema: debit writes a valid audit row (wallet_id, positive amount, DEBIT, title)', r.status === 200 && tx && tx.wallet_id && Number(tx.amount) === 50 && tx.transaction_type === 'DEBIT' && tx.title, { s: r.status, tx });
  check('schema: debit spends available_balance only; legacy balance untouched', await avail(A) === 150 && Number((await row(A)).balance) === 77);
  r = await api('GET', '/api/wallet/user/me', { token: A.token });
  const h = await api('GET', '/api/hpay/me', { token: A.token });
  const wm = await api('GET', '/api/wallet/me', { token: A.token });
  check('reconciled: every wallet screen shows the same authoritative balance', r.json.wallet?.balance === 150 && h.json.wallet?.balance === 150 && wm.json.wallet?.available_balance === 150, { user_me: r.json.wallet?.balance, hpay: h.json.wallet?.balance, me: wm.json.wallet?.available_balance });
  check('no internal ids in wallet/HPay responses', ![r, h, wm].some((x) => LEAK.test(x.text)), [r, h, wm].map((x) => (x.text.match(LEAK) || [])[0]));

  // ================= 2. add-money (sandbox): authoritative balance + idempotency =================
  if (SANDBOX) {
    const k1 = key(); const a0 = await avail(A); const legacy0 = Number((await row(A)).balance);
    const m1 = await api('POST', '/api/wallet/add-money', { token: A.token, body: { amount: 120, idempotency_key: k1 } });
    const m2 = await api('POST', '/api/wallet/add-money', { token: A.token, body: { amount: 120, idempotency_key: k1 } });
    check('add-money: credits available_balance (was the unused legacy column)', m1.status === 200 && await avail(A) === a0 + 120 && Number((await row(A)).balance) === legacy0, { s: m1.status, a: await avail(A) });
    check('add-money: same key + same amount → applied once, flagged replayed', m2.status === 200 && m2.json.replayed === true && await avail(A) === a0 + 120);
    check('add-money: same key + different amount → refused (409), nothing added', (await api('POST', '/api/wallet/add-money', { token: A.token, body: { amount: 999, idempotency_key: k1 } })).status === 409 && await avail(A) === a0 + 120);
    const k2 = key(); const a1 = await avail(A);
    const burst = await Promise.all(Array.from({ length: 6 }, () => api('POST', '/api/wallet/add-money', { token: A.token, body: { amount: 40, idempotency_key: k2 } })));
    check('add-money: rapid double-submit (6 concurrent, one key) → one credit', burst.every((x) => x.status === 200) && burst.filter((x) => x.json.replayed === false).length === 1 && await avail(A) === a1 + 40, burst.map((x) => [x.status, x.json.replayed]));
    const audit = Number((await pool.query(`SELECT COUNT(*) n FROM wallet_transactions WHERE user_id=$1 AND reference_type='ADD_MONEY'`, [A.id])).rows[0].n);
    check('add-money: one audit row per applied credit', audit === 2, audit);
    check('add-money: malformed key refused', (await api('POST', '/api/wallet/add-money', { token: A.token, body: { amount: 10, idempotency_key: 'bad key!' } })).status === 400);
    { const before = await avail(A); const nk = await api('POST', '/api/wallet/add-money', { token: A.token, body: { amount: 10 } });
      check('add-money: missing request key refused (400 IDEMPOTENCY_KEY_REQUIRED), nothing added', nk.status === 400 && nk.json.code === 'IDEMPOTENCY_KEY_REQUIRED' && await avail(A) === before, nk.json); }
    check('add-money: a key used for add-money cannot be replayed as a debit', (await api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 40, idempotency_key: k2 } })).status === 409);
  } else {
    check('add-money (no sandbox): refused without a payment provider', (await api('POST', '/api/wallet/add-money', { token: A.token, body: { amount: 100, idempotency_key: key() } })).status === 503);
  }

  // ================= 3. debit: idempotency, conflict, rapid double-submit, concurrency =================
  await setAvail(A, 500);
  r = await api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 60 } });
  check('debit: missing request key refused (400 IDEMPOTENCY_KEY_REQUIRED), nothing debited', r.status === 400 && r.json.code === 'IDEMPOTENCY_KEY_REQUIRED' && await avail(A) === 500, r.json);
  const d = key();
  const d1 = await api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 60, idempotency_key: d } });
  const d2 = await api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 60, idempotency_key: d } });
  check('debit: same key + same amount → one debit', d1.status === 200 && d2.status === 200 && d2.json.replayed === true && await avail(A) === 440, { s: [d1.status, d2.status], a: await avail(A) });
  check('debit: same key + different amount → refused, nothing debited', (await api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 61, idempotency_key: d } })).json.code === 'IDEMPOTENCY_KEY_REUSED' && await avail(A) === 440);
  const dk = key();
  const dburst = await Promise.all(Array.from({ length: 6 }, () => api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 100, idempotency_key: dk } })));
  check('debit: rapid double-submit (6 concurrent, one key) → one debit', dburst.every((x) => x.status === 200) && await avail(A) === 340, { a: await avail(A), st: dburst.map((x) => x.status) });
  const many = await Promise.all(Array.from({ length: 8 }, () => api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 100, idempotency_key: key() } })));
  check('debit: 8 concurrent distinct debits never overspend (3 × ₹100 from ₹340)', many.filter((x) => x.status === 200).length === 3 && await avail(A) === 40, { ok: many.filter((x) => x.status === 200).length, a: await avail(A) });
  const kB = key();
  await api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 10, idempotency_key: kB } });
  r = await api('POST', '/api/wallet/debit', { token: B.token, body: { amount: 10, idempotency_key: kB } });
  check('isolation: another account using the same key is an independent request', r.status === 200 && r.json.replayed === false && await avail(B) === 290 && await avail(A) === 30);

  // ================= 4. rollback on partial failure =================
  await pool.query(`CREATE OR REPLACE FUNCTION howdi_test_fail_audit() RETURNS trigger AS $$ BEGIN IF NEW.description='force-audit-failure' THEN RAISE EXCEPTION 'forced audit failure'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql`);
  await pool.query(`DROP TRIGGER IF EXISTS howdi_test_fail_audit ON wallet_transactions`);
  await pool.query(`CREATE TRIGGER howdi_test_fail_audit BEFORE INSERT ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION howdi_test_fail_audit()`);
  await setAvail(A, 100); const fk = key();
  r = await api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 25, description: 'force-audit-failure', idempotency_key: fk } });
  const idemRow = (await pool.query(`SELECT 1 FROM howdi_wallet_idempotency WHERE user_id=$1 AND idem_key=$2`, [A.id, fk])).rows[0];
  check('rollback: audit write fails → balance unchanged, key not consumed, no raw DB error', r.status === 500 && await avail(A) === 100 && !idemRow && !/forced audit failure|violates|relation/.test(r.text), { s: r.status, a: await avail(A), t: r.text.slice(0, 120) });
  r = await api('POST', '/api/wallet/debit', { token: A.token, body: { amount: 25, description: 'retry after failure', idempotency_key: fk } });
  check('rollback: the same key succeeds on retry after the failure', r.status === 200 && await avail(A) === 75);
  await pool.query(`DROP TRIGGER howdi_test_fail_audit ON wallet_transactions`);

  // ================= 4b. retired self-awarded legacy rewards =================
  const pts = async (u) => (await pool.query(`SELECT available_points, lifetime_points FROM user_rewards_wallet WHERE user_id=$1`, [u.id])).rows[0];
  await pool.query(`INSERT INTO user_rewards_wallet(user_id,available_points,lifetime_points) VALUES($1,50,50) ON CONFLICT(user_id) DO UPDATE SET available_points=50, lifetime_points=50`, [B.id]);
  const rtx0 = Number((await pool.query(`SELECT COUNT(*) n FROM reward_transactions WHERE user_id=$1`, [B.id])).rows[0].n);
  r = await api('POST', '/api/rewards/earn', { token: B.token, body: { points: 100000, description: 'free points' } });
  check('rewards/earn: signed-in caller gets 410 REWARDS_ENDPOINT_RETIRED', r.status === 410 && r.json.code === 'REWARDS_ENDPOINT_RETIRED', { s: r.status, j: r.json });
  const p1 = await pts(B);
  check('rewards/earn: points unchanged, no reward transaction written', p1.available_points === 50 && p1.lifetime_points === 50 && Number((await pool.query(`SELECT COUNT(*) n FROM reward_transactions WHERE user_id=$1`, [B.id])).rows[0].n) === rtx0, p1);
  check('rewards/earn: unauthenticated caller refused', (await api('POST', '/api/rewards/earn', { body: { points: 5, description: 'x' } })).status === 401);
  r = await api('POST', '/api/rewards/redeem', { token: B.token, body: { points: 10 } });
  // /api/rewards/redeem is intentionally unchanged. On the repository's fresh-boot schema its INSERT does not match
  // reward_transactions (pre-existing, same at 602ec8a), so it may fail — it must then roll back fully.
  const p2 = (await pts(B)).available_points;
  check('rewards/redeem (unchanged): points move only on a successful redeem, never partially', r.status === 200 ? p2 === 40 : (r.status === 500 && p2 === 50), { s: r.status, p2 });

  // ================= 5. cashback transfer =================
  await setAvail(B, 0);
  await pool.query(`INSERT INTO user_cashback(user_id,title,amount,status) VALUES($1,'Order cashback',40,'AVAILABLE'),($1,'Order cashback',60,'AVAILABLE'),($1,'Pending cashback',25,'PENDING'),($2,'A cashback',500,'AVAILABLE')`, [B.id, A.id]);
  const aBefore = await avail(A);
  const cb = await Promise.all(Array.from({ length: 4 }, () => api('POST', '/api/wallet/transfer-cashback', { token: B.token })));
  const cbOk = cb.filter((x) => x.status === 200);
  check('cashback: concurrent transfers move AVAILABLE cashback exactly once', cbOk.length === 1 && cbOk[0].json.amount === 100 && await avail(B) === 100 && cb.filter((x) => x.json.code === 'NO_CASHBACK').length === 3, cb.map((x) => [x.status, x.json.code || x.json.amount]));
  const cbRows = (await pool.query(`SELECT status, COUNT(*) n FROM user_cashback WHERE user_id=$1 GROUP BY status`, [B.id])).rows;
  check('cashback: pending cashback untouched; transferred rows marked; audit row written', cbRows.some((x) => x.status === 'PENDING' && Number(x.n) === 1) && cbRows.some((x) => x.status === 'TRANSFERRED' && Number(x.n) === 2)
    && Number((await pool.query(`SELECT COUNT(*) n FROM wallet_transactions WHERE user_id=$1 AND transaction_type='CASHBACK' AND amount=100`, [B.id])).rows[0].n) === 1, cbRows);
  check('cashback: another account’s cashback is never moved', await avail(A) === aBefore && Number((await pool.query(`SELECT COUNT(*) n FROM user_cashback WHERE user_id=$1 AND status='AVAILABLE'`, [A.id])).rows[0].n) === 1);
  check('cashback: no internal ids in the response', cbOk.length === 1 && !LEAK.test(cbOk[0].text));

  // ================= 6. suspended / deactivated accounts and revoked sessions =================
  await setAvail(S, 100);
  await pool.query(`UPDATE users SET account_status='SUSPENDED', is_active=FALSE WHERE id=$1`, [S.id]); // admin suspension (session kept)
  check('suspended: the old session still exists (admin suspension does not revoke it)', Boolean((await pool.query(`SELECT 1 FROM user_sessions WHERE user_id=$1 AND is_active`, [S.id])).rows[0]));
  const blocked = [
    ['GET', '/api/wallet/me'], ['GET', '/api/wallet/user/me'], ['POST', '/api/wallet/debit', { amount: 10, idempotency_key: key() }], ['POST', '/api/wallet/transfer-cashback'],
    ['POST', '/api/wallet/credit', { amount: 10, description: 'x', idempotency_key: key() }], ['POST', '/api/wallet/add-money', { amount: 10 }],
    ['GET', '/api/hpay/me'], ['POST', '/api/hpay/accounts'], ['POST', '/api/hpay/requests', { amount: 10 }],
  ];
  for (const [m, p, body] of blocked) {
    r = await api(m, p, { token: S.token, body });
    const expected = (p === '/api/wallet/credit' || p === '/api/wallet/add-money') && !SANDBOX ? [503] : [403];
    check(`suspended: ${m} ${p} refused`, expected.includes(r.status), r.status);
  }
  check('suspended: balance unchanged', await avail(S) === 100);
  for (const [m, p, body] of [['GET', '/api/v8/wallet'], ['GET', '/api/v8/hpay/history'], ['POST', '/api/v8/hpay/add-money', { amount: 500, idem_key: key() }], ['GET', '/api/v8/hpay/qr']])
    check(`suspended: V8 ${m} ${p} refused`, (await api(m, p, { token: S.token, body })).status === 401);
  await pool.query(`UPDATE users SET account_status='ACTIVE', is_active=FALSE WHERE id=$1`, [S.id]);
  check('deactivated (is_active=false, status ACTIVE): debit refused', (await api('POST', '/api/wallet/debit', { token: S.token, body: { amount: 1 } })).status === 403);
  await pool.query(`UPDATE users SET account_status='ACTIVE', is_active=TRUE WHERE id=$1`, [S.id]);
  check('reinstated account works again', (await api('GET', '/api/wallet/me', { token: S.token })).status === 200);
  await pool.query(`UPDATE user_sessions SET is_active=FALSE WHERE user_id=$1`, [S.id]);
  check('revoked session: debit refused', (await api('POST', '/api/wallet/debit', { token: S.token, body: { amount: 1 } })).status === 401 && await avail(S) === 100);
  await pool.query(`UPDATE user_sessions SET is_active=TRUE, expires_at=NOW()-interval '1 minute' WHERE user_id=$1`, [S.id]);
  check('expired session: debit + HPay refused', (await api('POST', '/api/wallet/debit', { token: S.token, body: { amount: 1 } })).status === 401 && (await api('GET', '/api/hpay/me', { token: S.token })).status === 401);

  // ================= 7. V8 HPay daily limit under concurrency =================
  if (SANDBOX) {
    await api('GET', '/api/v8/wallet', { token: A.token }); await api('GET', '/api/v8/wallet', { token: B.token });
    await api('POST', '/api/v8/hpay/pin', { token: A.token, body: { pin: '4826' } });
    await pool.query(`UPDATE howdi_v8_wallets SET balance=100000 WHERE user_id=$1`, [A.id]);
    const qr = (await api('GET', '/api/v8/hpay/qr', { token: B.token })).json.payload;
    const pays = await Promise.all(Array.from({ length: 6 }, () => api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: qr, amount: 9000, pin: '4826', idempotency_key: key() } })));
    const paidToday = Number((await pool.query(`SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_ledger WHERE user_id=$1 AND direction='DEBIT' AND kind IN ('CHAT_PAYMENT','QR_PAYMENT','UTILITY') AND created_at>NOW()-interval '1 day'`, [A.id])).rows[0].s);
    check('V8 daily limit: 6 concurrent ₹9,000 payments → only 2 succeed, day total ≤ ₹25,000', pays.filter((x) => x.status === 201).length === 2 && paidToday === 18000 && pays.filter((x) => x.json.code === 'DAILY_LIMIT').length === 4,
      { ok: pays.filter((x) => x.status === 201).length, paidToday, st: pays.map((x) => x.status + ':' + (x.json.code || '')) });
    check('V8 daily limit: balance and two-sided ledger agree', Number((await pool.query(`SELECT balance FROM howdi_v8_wallets WHERE user_id=$1`, [A.id])).rows[0].balance) === 82000
      && Number((await pool.query(`SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_ledger WHERE user_id=$1 AND kind='QR_PAYMENT' AND direction='CREDIT'`, [B.id])).rows[0].s) === 18000);
    r = await api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: qr, amount: 7001, pin: '4826', idempotency_key: key() } });
    check('V8 daily limit: a payment crossing ₹25,000 is refused afterwards', r.status === 422 && r.json.code === 'DAILY_LIMIT', r.status);
    r = await api('POST', '/api/v8/hpay/qr/pay', { token: A.token, body: { code: qr, amount: 7000, pin: '4826', idempotency_key: key() } });
    check('V8 daily limit: exactly up to ₹25,000 is still allowed', r.status === 201, r.status);
  } else {
    check('V8 (no sandbox): no money can move', (await api('GET', '/api/v8/wallet', { token: A.token })).json.wallet === null);
  }
  finish(LABEL);
})().catch((e) => { console.error(e); check('suite completed', false, e.message); finish(LABEL); });
