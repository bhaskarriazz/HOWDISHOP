'use strict';
// =====================================================================================
// HOWDI — HPay / legacy wallet security helpers (security hardening lane).
//   parseAmount   strict rupee amounts: finite, > 0, at most 2 decimals, within a per-route maximum
//   idempotencyKey  optional/required client key (body idempotency_key | idem_key, or the Idempotency-Key header)
//   mutateWallet  one atomic, idempotent credit/debit on the legacy user_wallets.available_balance with an audit row in
//                 wallet_transactions (wallet_id + user_id + positive amount + title), serialised per wallet (FOR UPDATE)
//   hpayPackGuard deny-by-default for the retired V16.4A/B HPay packs (/api/hpay/v164a|b/*)
//   financialActive  wallet/HPay access needs the same account state that sign-in needs (is_active + account_status ACTIVE),
//                 so a session that outlives a suspension cannot move or read money
//   transferCashback  moves AVAILABLE cashback into available_balance in one locked transaction with an audit row
// Authoritative legacy balance: user_wallets.available_balance (what debit spends and every wallet/HPay screen shows).
// The older user_wallets.balance column is neither read nor written here.
// The acting user always comes from the authenticated session (callers pass the session user id only).
// =====================================================================================
const KEY_RE = /^[A-Za-z0-9._:-]{8,80}$/;

function parseAmount(value, { max }) {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\s*\d+(\.\d{1,2})?\s*$/.test(value))) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > max) return null;
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return null; // no fractions of a paisa
  return Math.round(n * 100) / 100;
}

// undefined → no key supplied; null → a key was supplied but is malformed; string → valid key
function idempotencyKey(req, body) {
  const raw = body && (body.idempotency_key ?? body.idem_key ?? body.idempotencyKey);
  const v = raw != null ? raw : req.headers['idempotency-key'];
  if (v == null || v === '') return undefined;
  const s = String(v);
  return KEY_RE.test(s) ? s : null;
}

async function ensureWalletSecuritySchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS howdi_wallet_idempotency(user_id BIGINT NOT NULL, idem_key VARCHAR(80) NOT NULL, op VARCHAR(12) NOT NULL,
    amount NUMERIC(14,2) NOT NULL, transaction_ref VARCHAR(64), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id, idem_key))`);
}

class WalletError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }

// op: 'CREDIT' | 'DEBIT'. kind (optional) names the operation for idempotency (defaults to op), so one key can never be
// replayed as a different operation. Returns { wallet, transaction, replayed }. Throws WalletError for business refusals.
async function mutateWallet(pool, { userId, op, amount, title, description, referenceType, key, kind }) {
  const record = kind || op;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO user_wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING`, [userId]);
    // Every mutation of this wallet (and its idempotency check) is serialised on the wallet row.
    const w = (await client.query(`SELECT * FROM user_wallets WHERE user_id=$1 FOR UPDATE`, [userId])).rows[0];
    if (key) {
      const prior = (await client.query(`SELECT op, amount, transaction_ref FROM howdi_wallet_idempotency WHERE user_id=$1 AND idem_key=$2`, [userId, key])).rows[0];
      if (prior) {
        await client.query('ROLLBACK');
        if (prior.op !== record || Number(prior.amount) !== amount) throw new WalletError(409, 'IDEMPOTENCY_KEY_REUSED', 'This request key was already used for a different payment.');
        const tx = prior.transaction_ref ? (await pool.query(`SELECT id, transaction_type, amount, title, description, reference_type, created_at FROM wallet_transactions WHERE id::text=$1 AND user_id=$2`, [prior.transaction_ref, userId])).rows[0] : null;
        const cur = (await pool.query(`SELECT * FROM user_wallets WHERE user_id=$1`, [userId])).rows[0];
        return { wallet: cur, transaction: tx || null, replayed: true };
      }
    }
    if (op === 'DEBIT' && Number(w.available_balance || 0) < amount) throw new WalletError(400, 'INSUFFICIENT_BALANCE', 'Insufficient HOWDI wallet balance');
    const wallet = (await client.query(op === 'DEBIT'
      ? `UPDATE user_wallets SET available_balance=available_balance-$2, total_spent=total_spent+$2, updated_at=NOW() WHERE user_id=$1 RETURNING *`
      : `UPDATE user_wallets SET available_balance=available_balance+$2, updated_at=NOW() WHERE user_id=$1 RETURNING *`, [userId, amount])).rows[0];
    const transaction = (await client.query(`INSERT INTO wallet_transactions(wallet_id, user_id, transaction_type, amount, title, description, reference_type, reference_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, transaction_type, amount, title, description, reference_type, created_at`,
      [w.id, userId, op, amount, title, description || title, referenceType || null, key ? `IDEM:${key}` : null])).rows[0];
    if (key) await client.query(`INSERT INTO howdi_wallet_idempotency(user_id, idem_key, op, amount, transaction_ref) VALUES($1,$2,$3,$4,$5)`, [userId, key, record, amount, String(transaction.id)]);
    await client.query('COMMIT');
    return { wallet, transaction, replayed: false };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { client.release(); }
}

// Retired V16.4A/B HPay packs: they keyed money records by caller-supplied UUIDs (beneficiaries, escrow ids, merchant ids,
// "verified" webhook events) that no HOWDI screen uses. Public capability reads and the admin-gated paths stay; everything
// else is refused so nobody can create payouts/splits/escrow changes/provider events for other accounts.
const HPAY_PACK_RE = /^\/api\/hpay\/v164[ab]\//;
function hpayPackGuard(req, pathname) {
  if (!HPAY_PACK_RE.test(pathname)) return null;
  if (req.method === 'GET' && /^\/api\/hpay\/v164[ab]\/capabilities\/?$/.test(pathname)) return null;
  if (/^\/api\/hpay\/v164[ab]\/admin(\/|$)/.test(pathname)) return null; // v8AdminGuard already required an admin session/token
  return { status: 410, body: { ok: false, code: 'HPAY_ENDPOINT_RETIRED', error: 'This HPay endpoint is retired. Use HOWDI HPay.' } };
}

const financialActive = (u) => Boolean(u && u.is_active === true && String(u.account_status || '').trim().toUpperCase() === 'ACTIVE');

// All AVAILABLE cashback → available_balance, once. Serialised on the wallet row; a second call finds nothing to move.
async function transferCashback(pool, { userId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO user_wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING`, [userId]);
    const w = (await client.query(`SELECT * FROM user_wallets WHERE user_id=$1 FOR UPDATE`, [userId])).rows[0];
    const rows = (await client.query(`SELECT id, amount FROM user_cashback WHERE user_id=$1 AND status='AVAILABLE' FOR UPDATE`, [userId])).rows;
    const amount = Math.round(rows.reduce((t, r) => t + Number(r.amount || 0), 0) * 100) / 100;
    if (!(amount > 0)) throw new WalletError(400, 'NO_CASHBACK', 'No available cashback to transfer');
    const wallet = (await client.query(`UPDATE user_wallets SET available_balance=available_balance+$2, total_cashback=total_cashback+$2, updated_at=NOW() WHERE user_id=$1 RETURNING *`, [userId, amount])).rows[0];
    await client.query(`UPDATE user_cashback SET status='TRANSFERRED', updated_at=NOW() WHERE id::text = ANY($1::text[]) AND user_id=$2`, [rows.map((r) => String(r.id)), userId]);
    const transaction = (await client.query(`INSERT INTO wallet_transactions(wallet_id, user_id, transaction_type, amount, title, description, reference_type)
      VALUES($1,$2,'CASHBACK',$3,'Cashback transferred to wallet','Cashback transferred to wallet','CASHBACK') RETURNING id, transaction_type, amount, title, description, reference_type, created_at`, [w.id, userId, amount])).rows[0];
    await client.query('COMMIT');
    return { amount, wallet, transaction };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { client.release(); }
}

module.exports = { financialActive, transferCashback, parseAmount, idempotencyKey, ensureWalletSecuritySchema, mutateWallet, WalletError, hpayPackGuard };
