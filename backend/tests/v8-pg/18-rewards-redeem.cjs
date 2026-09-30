// Legacy rewards redeem (POST /api/rewards/redeem) against the authoritative fresh-boot schema — real PostgreSQL + real server.
// Success, insufficient points, malformed input, request-key replay, concurrency, rollback on a failed insert, history
// consistency, account state, retired earn, and no money created from points.
const K = require('../k5a-pg/lib.cjs');
const crypto = require('node:crypto');
const { pool, check, finish, api } = K;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 18 rewards redeem (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const LEAK = /"(id|user_id|userId|howdi_id|master_id|transaction_ref|idem_key)"\s*:|invalid input|violates|relation "|column "/;
const key = () => 'k-' + crypto.randomBytes(8).toString('hex');
(async () => {
  const started = await K.start(); check('server starts', started, K.serverLog().slice(-600)); if (!started) return finish(LABEL);
  const A = await K.member('Asha Points', { username: 'asha_rw' }); const B = await K.member('Bala Points', { username: 'bala_rw' });
  const setPts = (u, n, life = n) => pool.query(`INSERT INTO user_rewards_wallet(user_id,available_points,lifetime_points) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET available_points=$2, lifetime_points=$3`, [u.id, n, life]);
  const pts = async (u) => (await pool.query(`SELECT available_points, lifetime_points FROM user_rewards_wallet WHERE user_id=$1`, [u.id])).rows[0];
  const redeemedSum = async (u) => Number((await pool.query(`SELECT COALESCE(SUM(points),0) s FROM reward_transactions WHERE user_id=$1 AND transaction_type='REDEEMED'`, [u.id])).rows[0].s);
  const redeem = (u, body) => api('POST', '/api/rewards/redeem', { token: u.token, body });
  await setPts(A, 1000); await setPts(B, 500);

  check('redeem: unauthenticated refused', (await api('POST', '/api/rewards/redeem', { body: { points: 10 } })).status === 401);
  // ---- success against the authoritative schema
  let r = await redeem(A, { points: 300, description: 'Customer reward redemption request', user_id: B.id, userId: B.id });
  check('redeem: succeeds (REDEEMED row + deduction)', r.status === 200 && r.json.wallet?.available_points === 700 && r.json.transaction?.transaction_type === 'REDEEMED' && r.json.transaction.points === -300 && r.json.transaction.title === 'Customer reward redemption request', r.json);
  check('redeem: forged user id ignored — only the caller’s points move', (await pts(B)).available_points === 500 && (await pts(A)).lifetime_points === 1000);
  check('redeem: response has no internal ids or raw DB text', !LEAK.test(r.text), r.text.match(LEAK)?.[0]);
  const act = await api('GET', '/api/rewards/wallet/me', { token: A.token });
  check('history: rewards center shows the redemption', act.status === 200 && act.json.wallet.available_points === 700 && act.json.activity.some((x) => x.transaction_type === 'REDEEMED' && x.points === -300 && x.description === 'Customer reward redemption request'));

  // ---- malformed / insufficient: fail closed, nothing written
  const rows0 = Number((await pool.query(`SELECT COUNT(*) n FROM reward_transactions WHERE user_id=$1`, [A.id])).rows[0].n);
  for (const [label, points] of [['zero', 0], ['negative', -5], ['negative string', '-5'], ['fraction', 12.5], ['fraction string', '12.5'], ['exponent', '1e3'], ['text', 'abc'], ['null', null], ['missing', undefined], ['too large', 1000001], ['array', [5]], ['boolean', true], ['NaN', 'NaN']]) {
    r = await redeem(A, { points });
    check(`malformed (${label}): 400, nothing written`, r.status === 400 && r.json.code === 'POINTS_INVALID', { s: r.status, j: r.json });
  }
  r = await redeem(A, { points: 701 });
  check('insufficient points: 400 INSUFFICIENT_POINTS', r.status === 400 && r.json.code === 'INSUFFICIENT_POINTS');
  check('malformed + insufficient: points and history unchanged', (await pts(A)).available_points === 700 && Number((await pool.query(`SELECT COUNT(*) n FROM reward_transactions WHERE user_id=$1`, [A.id])).rows[0].n) === rows0);

  // ---- request key: replay deducts once; conflicting payload refused
  const k1 = key();
  const r1 = await redeem(A, { points: 100, idempotency_key: k1 }); const r2 = await redeem(A, { points: 100, idempotency_key: k1 });
  check('replay: same key deducts once', r1.status === 200 && r2.status === 200 && r2.json.replayed === true && (await pts(A)).available_points === 600 && r2.json.transaction?.points === -100);
  check('replay: same key + different points → 409, nothing deducted', (await redeem(A, { points: 50, idempotency_key: k1 })).json.code === 'IDEMPOTENCY_KEY_REUSED' && (await pts(A)).available_points === 600);
  check('replay: malformed key refused', (await redeem(A, { points: 10, idempotency_key: 'bad key' })).json.code === 'IDEMPOTENCY_KEY_INVALID');
  const k2 = key(); const burst = await Promise.all(Array.from({ length: 5 }, () => redeem(A, { points: 100, idempotency_key: k2 })));
  check('double-submit: 5 concurrent, one key → one deduction', burst.every((x) => x.status === 200) && burst.filter((x) => x.json.replayed === false).length === 1 && (await pts(A)).available_points === 500);

  // ---- concurrency without keys: never below zero, history matches
  const many = await Promise.all(Array.from({ length: 8 }, () => redeem(A, { points: 100 })));
  check('concurrent redeems: exactly 5 × 100 from 500, rest refused, never negative', many.filter((x) => x.status === 200).length === 5 && many.filter((x) => x.json.code === 'INSUFFICIENT_POINTS').length === 3 && (await pts(A)).available_points === 0);
  check('consistency: redeemed history equals points removed', await redeemedSum(A) === -1000 && (await pts(A)).lifetime_points === 1000, { sum: await redeemedSum(A) });

  // ---- rollback if the transaction insert fails
  await setPts(A, 200, 1000);
  await pool.query(`CREATE OR REPLACE FUNCTION howdi_test_fail_rewards() RETURNS trigger AS $$ BEGIN IF NEW.title='force-rewards-failure' THEN RAISE EXCEPTION 'forced rewards failure'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql`);
  await pool.query(`CREATE TRIGGER howdi_test_fail_rewards BEFORE INSERT ON reward_transactions FOR EACH ROW EXECUTE FUNCTION howdi_test_fail_rewards()`);
  const fk = key();
  r = await redeem(A, { points: 50, description: 'force-rewards-failure', idempotency_key: fk });
  check('rollback: insert failure → generic 500, points unchanged, key not consumed', r.status === 500 && !/forced rewards failure/.test(r.text) && (await pts(A)).available_points === 200
    && !(await pool.query(`SELECT 1 FROM howdi_wallet_idempotency WHERE user_id=$1 AND idem_key=$2`, [A.id, fk])).rows[0], { s: r.status, t: r.text.slice(0, 120) });
  await pool.query(`DROP TRIGGER howdi_test_fail_rewards ON reward_transactions`);
  check('rollback: the same key succeeds on retry', (await redeem(A, { points: 50, idempotency_key: fk })).status === 200 && (await pts(A)).available_points === 150);

  // ---- points never become money; legacy Wallet-screen payload
  const money0 = Number((await pool.query(`SELECT COALESCE(available_balance,0) b FROM user_wallets WHERE user_id=$1`, [B.id])).rows[0]?.b || 0);
  r = await redeem(B, { points: 500, wallet_credit: 50 });
  check('legacy payload {points, wallet_credit}: points redeemed, no wallet money created', r.status === 200 && (await pts(B)).available_points === 0
    && Number((await pool.query(`SELECT COALESCE(available_balance,0) b FROM user_wallets WHERE user_id=$1`, [B.id])).rows[0]?.b || 0) === money0
    && !(await pool.query(`SELECT 1 FROM howdi_v8_ledger WHERE user_id=$1 AND direction='CREDIT'`, [B.id])).rows[0]);

  // ---- account state + retired earn
  await pool.query(`UPDATE users SET account_status='SUSPENDED', is_active=FALSE WHERE id=$1`, [A.id]);
  check('suspended account: redeem refused, points unchanged', (await redeem(A, { points: 10 })).status === 403 && (await pts(A)).available_points === 150);
  await pool.query(`UPDATE users SET account_status='ACTIVE', is_active=TRUE WHERE id=$1`, [A.id]);
  await pool.query(`UPDATE user_sessions SET is_active=FALSE WHERE user_id=$1`, [A.id]);
  check('revoked session: redeem refused', (await redeem(A, { points: 10 })).status === 401 && (await pts(A)).available_points === 150);
  r = await api('POST', '/api/rewards/earn', { token: B.token, body: { points: 5000, description: 'free' } });
  check('retired earn stays 410, points unchanged', r.status === 410 && r.json.code === 'REWARDS_ENDPOINT_RETIRED' && (await pts(B)).available_points === 0);
  check('V8 rewards unaffected', (await api('GET', '/api/v8/me/rewards', { token: B.token })).status === 200);
  finish(LABEL);
})().catch((e) => { console.error(e); check('suite completed', false, e.message); finish(LABEL); });
