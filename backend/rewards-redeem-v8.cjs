'use strict';
// =====================================================================================
// HOWDI — legacy rewards redeem (POST /api/rewards/redeem) against the authoritative schema.
// Fresh-boot winning schema (server.js bootstrap, first CREATE wins):
//   reward_transactions(id uuid, user_id, points int, title NOT NULL, transaction_type CHECK IN ('EARNED','REDEEMED','ADJUSTMENT'),
//                       reference_id, created_at)
//   user_rewards_wallet(user_id PK, available_points >= 0, lifetime_points >= 0, updated_at)
// The old handler inserted ('REDEEM', description) — both rejected by that schema — so every redeem failed.
// Points only: redeeming never credits wallet or HPay money.
// =====================================================================================
const MAX_POINTS = 1000000;

// Whole points, 1..1,000,000; numbers must already be integers, strings must be plain digits (no "1e3", "12.5", "-5").
function parsePoints(value) {
  let n;
  if (typeof value === 'number') n = value;
  else if (typeof value === 'string' && /^\s*\d{1,7}\s*$/.test(value)) n = Number(value);
  else return null;
  return Number.isSafeInteger(n) && n >= 1 && n <= MAX_POINTS ? n : null;
}

class RewardsError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
const walletDto = (w) => (w ? { available_points: Number(w.available_points), lifetime_points: Number(w.lifetime_points), updated_at: w.updated_at } : null);
const txDto = (t) => (t ? { transaction_type: t.transaction_type, points: Number(t.points), title: t.title, created_at: t.created_at } : null);

// One transaction: lock the points row → (replayed key?) → enough points? → REDEEMED row + deduction (+ key record).
async function redeemPoints(pool, { userId, points, title, key }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO user_rewards_wallet(user_id,available_points,lifetime_points) VALUES($1,0,0) ON CONFLICT(user_id) DO NOTHING`, [userId]);
    const w = (await client.query(`SELECT available_points, lifetime_points, updated_at FROM user_rewards_wallet WHERE user_id=$1 FOR UPDATE`, [userId])).rows[0];
    if (key) {
      const prior = (await client.query(`SELECT op, amount, transaction_ref FROM howdi_wallet_idempotency WHERE user_id=$1 AND idem_key=$2`, [userId, key])).rows[0];
      if (prior) {
        await client.query('ROLLBACK');
        if (prior.op !== 'RW_REDEEM' || Number(prior.amount) !== points) throw new RewardsError(409, 'IDEMPOTENCY_KEY_REUSED', 'This request key was already used for a different request.');
        const tx = prior.transaction_ref ? (await pool.query(`SELECT transaction_type, points, title, created_at FROM reward_transactions WHERE id::text=$1 AND user_id=$2`, [prior.transaction_ref, userId])).rows[0] : null;
        const cur = (await pool.query(`SELECT available_points, lifetime_points, updated_at FROM user_rewards_wallet WHERE user_id=$1`, [userId])).rows[0];
        return { wallet: walletDto(cur), transaction: txDto(tx), replayed: true };
      }
    }
    if (Number(w.available_points) < points) throw new RewardsError(400, 'INSUFFICIENT_POINTS', 'Not enough available reward points');
    const tx = (await client.query(`INSERT INTO reward_transactions(user_id, transaction_type, points, title) VALUES($1,'REDEEMED',$2,$3) RETURNING id, transaction_type, points, title, created_at`, [userId, -points, title])).rows[0];
    const wallet = (await client.query(`UPDATE user_rewards_wallet SET available_points=available_points-$2, updated_at=NOW() WHERE user_id=$1 RETURNING available_points, lifetime_points, updated_at`, [userId, points])).rows[0];
    if (key) await client.query(`INSERT INTO howdi_wallet_idempotency(user_id, idem_key, op, amount, transaction_ref) VALUES($1,$2,'RW_REDEEM',$3,$4)`, [userId, key, points, String(tx.id)]);
    await client.query('COMMIT');
    return { wallet: walletDto(wallet), transaction: txDto(tx), replayed: false };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { client.release(); }
}

module.exports = { parsePoints, redeemPoints, RewardsError, MAX_POINTS };
