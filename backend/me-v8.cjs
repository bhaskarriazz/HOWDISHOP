'use strict';
// =====================================================================================
// HOWDI V8 — My HOWDI: profile edit, account deletion (30-day grace, cancel), download my data, family account,
// size profile (height / width / length / chest / hands / waist; shared with a seller only when the buyer chooses at checkout),
// HOWDI Rewards (10 points per ₹1,000 on delivered Shop orders, valid 1 year, 1 point = ₹1 redeemed into HPay; each seller
// chooses who funds the points: HOWDI or the seller), and the HOWDI Admin queue for reported reviews.
//   GET|PATCH /api/v8/me/profile · GET|POST|DELETE /api/v8/me/deletion · GET /api/v8/me/export
//   GET|POST|DELETE /api/v8/me/family · POST /api/v8/me/family/(invite|respond|remove|leave)
//   GET|PUT|DELETE /api/v8/me/size
//   GET /api/v8/me/rewards · POST /api/v8/me/rewards/redeem · GET|PUT /api/v8/me/rewards/seller-setting
//   admin: GET /api/admin/v8/reviews/reports?status= · POST /api/admin/v8/reviews/reports/{RPT}/decide {decision: keep|hide, note}
// The session decides who acts. Only @handles and public codes leave the server.
// =====================================================================================
const crypto = require('node:crypto');
const POINTS_PER_100 = 1;            // ₹1,000 → 10 points
const POINT_VALUE = 1;               // 1 point = ₹1 when redeemed into HPay (assumption — confirm with Bhaskar)
const MIN_REDEEM = 100;
const GRACE_DAYS = 30;
const FAMILY_MAX = 6;
const RELATIONS = ['spouse', 'parent', 'child', 'sibling', 'grandparent', 'other'];
const SIZE = { height_cm: [50, 230], width_cm: [20, 70], length_cm: [30, 150], chest_cm: [40, 180], hand_cm: [20, 90], waist_cm: [40, 180] };
const FITS = ['slim', 'regular', 'loose'];
const REPORT_REASONS = { spam: 'Spam or advertising', offensive: 'Offensive or abusive', fake: 'Fake or not a real purchase', personal_info: 'Shares personal information', off_topic: 'Not about the product' };

function createMeV8(deps) {
  const { pool, getBody, notify, auditAdmin, wallet } = deps;
  const H = deps.helpers; const M = deps.messages;
  const { viewer, ok, fail, authorCols, authorJoins, authorDto } = H;
  const { issue, line, text, iso, money } = M;

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_account_deletions(user_id BIGINT PRIMARY KEY, status VARCHAR(10) NOT NULL, reason VARCHAR(300), requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), scheduled_for TIMESTAMPTZ NOT NULL, cancelled_at TIMESTAMPTZ)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_families(id BIGSERIAL PRIMARY KEY, owner_id BIGINT NOT NULL UNIQUE, name VARCHAR(60) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_family_members(family_id BIGINT NOT NULL, user_id BIGINT NOT NULL, relation VARCHAR(12) NOT NULL, status VARCHAR(8) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(family_id, user_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_size_profiles(user_id BIGINT PRIMARY KEY, height_cm NUMERIC(5,1), width_cm NUMERIC(5,1), length_cm NUMERIC(5,1), chest_cm NUMERIC(5,1), hand_cm NUMERIC(5,1), waist_cm NUMERIC(5,1), fit VARCHAR(8) NOT NULL DEFAULT 'regular', consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_rewards(id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, kind VARCHAR(8) NOT NULL, points INT NOT NULL CHECK (points > 0), reference VARCHAR(40) NOT NULL, funded_by VARCHAR(6), seller_user_id BIGINT, expires_at TIMESTAMPTZ, available_at TIMESTAMPTZ, note VARCHAR(160), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id, kind, reference))`);
    await pool.query(`ALTER TABLE howdi_v8_rewards ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_vendor_reward_settings(vendor_user_id BIGINT PRIMARY KEY, funded_by VARCHAR(6) NOT NULL DEFAULT 'howdi', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  }
  const handleOf = async (uid) => (await pool.query(`SELECT public_username FROM howdi_connect_profiles WHERE user_id=$1`, [uid])).rows[0]?.public_username || null;
  const uidOf = async (h) => (await pool.query(`SELECT user_id FROM howdi_connect_profiles WHERE public_username=$1`, [String(h || '').replace(/^@/, '').toLowerCase()])).rows[0]?.user_id || null;
  const person = async (uid) => { const r = (await pool.query(`SELECT ${authorCols('$1::bigint', 'a_')} FROM (SELECT 1) x ${authorJoins('$1::bigint', 'a_')}`, [uid])).rows[0]; return r ? authorDto(r, 'a_') : null; };

  // ------------------------------------------------------------ rewards
  async function rewardSummary(uid) {
    const r = (await pool.query(`SELECT
      COALESCE(SUM(points) FILTER (WHERE kind='EARN' AND expires_at>NOW() AND COALESCE(available_at,created_at)<=NOW()),0) earned,
      COALESCE(SUM(points) FILTER (WHERE kind='EARN' AND COALESCE(available_at,created_at)>NOW() AND NOT EXISTS (SELECT 1 FROM howdi_v8_rewards x WHERE x.user_id=howdi_v8_rewards.user_id AND x.kind='REVERSE' AND x.reference=howdi_v8_rewards.reference)),0) pending,
      COALESCE(SUM(points) FILTER (WHERE kind='REVERSE' AND EXISTS (SELECT 1 FROM howdi_v8_rewards x WHERE x.user_id=howdi_v8_rewards.user_id AND x.kind='EARN' AND x.reference=howdi_v8_rewards.reference AND COALESCE(x.available_at,x.created_at)>NOW())),0) reversed_pending,
      COALESCE(SUM(points) FILTER (WHERE kind IN ('REDEEM','REVERSE')),0) used_all,
      COALESCE(SUM(points) FILTER (WHERE kind='EARN' AND expires_at>NOW() AND expires_at<NOW()+interval '30 days'),0) soon,
      COALESCE(SUM(points) FILTER (WHERE kind='EARN' AND expires_at<=NOW()),0) expired FROM howdi_v8_rewards WHERE user_id=$1`, [uid])).rows[0];
    return { available: Math.max(0, Number(r.earned) - (Number(r.used_all) - Number(r.reversed_pending))), pending: Number(r.pending), expiring_30_days: Number(r.soon), expired: Number(r.expired) };
  }
  async function sellerFunding(sellerUid) { return (await pool.query(`SELECT funded_by FROM howdi_v8_vendor_reward_settings WHERE vendor_user_id=$1`, [sellerUid])).rows[0]?.funded_by || 'howdi'; }
  // called by shop-v8 inside the delivery transaction
  async function earn(c, so, sellerUid, orderCode) {
    const points = Math.floor(Number(so.amount) / 100) * POINTS_PER_100; if (points <= 0) return;
    const funded = await sellerFunding(sellerUid);
    const ins = await c.query(`INSERT INTO howdi_v8_rewards(user_id,kind,points,reference,funded_by,seller_user_id,expires_at,note,available_at) VALUES($1,'EARN',$2,$3,$4,$5,NOW()+interval '1 year',$6,NOW()+interval '7 days') ON CONFLICT DO NOTHING RETURNING id`,
      [so.buyer_user_id, points, orderCode, funded, sellerUid, `Shop order ${orderCode}`]);
    if (!ins.rows[0]) return;
    if (funded === 'seller' && await wallet(sellerUid, c)) {
      await c.query(`UPDATE howdi_v8_wallets SET balance=balance-$2, updated_at=NOW() WHERE user_id=$1`, [sellerUid, points * POINT_VALUE]);
      await c.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'DEBIT',$3,'REWARD_FUNDING',$4,'Buyer reward points you fund')`, ['HPR-' + crypto.randomBytes(5).toString('hex').toUpperCase(), sellerUid, points * POINT_VALUE, orderCode]);
    }
    await notify(Number(so.buyer_user_id), 'REWARD_EARNED', `You earned ${points} HOWDI Rewards points`, `From order ${orderCode}. You can use them after the 7-day return window; valid for 1 year.`, '/me/rewards', null);
  }
  async function reverse(c, so, orderCode) {
    const e = (await c.query(`SELECT * FROM howdi_v8_rewards WHERE user_id=$1 AND kind='EARN' AND reference=$2`, [so.buyer_user_id, orderCode])).rows[0]; if (!e) return;
    const ins = await c.query(`INSERT INTO howdi_v8_rewards(user_id,kind,points,reference,funded_by,seller_user_id,note) VALUES($1,'REVERSE',$2,$3,$4,$5,'Order returned') ON CONFLICT DO NOTHING RETURNING id`, [so.buyer_user_id, e.points, orderCode, e.funded_by, e.seller_user_id]);
    if (ins.rows[0] && e.funded_by === 'seller' && e.seller_user_id && await wallet(Number(e.seller_user_id), c)) {
      await c.query(`UPDATE howdi_v8_wallets SET balance=balance+$2, updated_at=NOW() WHERE user_id=$1`, [e.seller_user_id, e.points * POINT_VALUE]);
      await c.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'CREDIT',$3,'REWARD_FUNDING',$4,'Reward points returned (order returned)')`, ['HPR-' + crypto.randomBytes(5).toString('hex').toUpperCase(), e.seller_user_id, e.points * POINT_VALUE, orderCode]);
    }
  }

  // ------------------------------------------------------------ helpers
  const openOrders = async (uid) => Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_shop_orders WHERE buyer_user_id=$1 AND state IN ('placed','accepted','packed','shipped')`, [uid])).rows[0].n);
  const openSales = async (uid) => Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_shop_orders s JOIN vendor_profiles v ON v.id=s.vendor_profile_id WHERE v.user_id=$1 AND s.state IN ('placed','accepted','packed','shipped')`, [uid])).rows[0].n);
  async function familyOf(uid) {
    const mem = (await pool.query(`SELECT f.*, m.status mstatus FROM howdi_v8_family_members m JOIN howdi_v8_families f ON f.id=m.family_id WHERE m.user_id=$1 AND m.status='active'`, [uid])).rows[0];
    return mem || null;
  }
  async function familyDto(uid) {
    const f = await familyOf(uid);
    const invites = (await pool.query(`SELECT f.name, f.owner_id, m.relation FROM howdi_v8_family_members m JOIN howdi_v8_families f ON f.id=m.family_id WHERE m.user_id=$1 AND m.status='invited'`, [uid])).rows;
    const out = { family: null, invitations: await Promise.all(invites.map(async (i) => ({ from: await person(i.owner_id), family_name: i.name, relation: i.relation }))), relations: RELATIONS, max: FAMILY_MAX };
    if (f) {
      const ms = (await pool.query(`SELECT user_id, relation, status FROM howdi_v8_family_members WHERE family_id=$1 ORDER BY (user_id=$2) DESC, status, created_at`, [f.id, f.owner_id])).rows;
      out.family = { name: f.name, is_owner: Number(f.owner_id) === uid, owner: await person(f.owner_id),
        members: await Promise.all(ms.map(async (x) => ({ person: await person(x.user_id), relation: Number(x.user_id) === Number(f.owner_id) ? 'owner' : x.relation, status: x.status, me: Number(x.user_id) === uid }))) };
    }
    return out;
  }

  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (p.startsWith('/api/admin/v8/reviews/')) return admin(req, res, url, p);
    if (!/^\/api\/v8\/me\/(profile|deletion|export|family|size|rewards)(\/|$)/.test(p)) return false;
    const v = await viewer(req); if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in first.'); return true; }
    const uid = v.id; let m;
    const body = async () => (await getBody(req).catch(() => ({}))) || {};

    // ---- profile
    if (p === '/api/v8/me/profile') {
      if (req.method === 'PATCH') {
        const b = await body(); const name = b.name !== undefined ? line(b.name, 60) : undefined;
        if (name !== undefined && name.length < 2) { fail(res, 400, 'NAME', 'Your name needs at least 2 characters.'); return true; }
        if (name !== undefined) await pool.query(`UPDATE users SET full_name=$2, updated_at=NOW() WHERE id=$1`, [uid, name]);
        if (b.headline !== undefined || b.about !== undefined) await pool.query(`UPDATE howdi_connect_profiles SET headline=COALESCE($2,headline), about=COALESCE($3,about), updated_at=NOW() WHERE user_id=$1`, [uid, b.headline !== undefined ? line(b.headline, 80) : null, b.about !== undefined ? text(b.about, 300) : null]);
      } else if (req.method !== 'GET') { fail(res, 405, 'METHOD', 'Not allowed.'); return true; }
      const r = (await pool.query(`SELECT u.full_name, u.created_at, cp.headline, cp.about FROM users u LEFT JOIN howdi_connect_profiles cp ON cp.user_id=u.id WHERE u.id=$1`, [uid])).rows[0];
      ok(res, { profile: { me: await person(uid), name: r.full_name, headline: r.headline || '', about: r.about || '', member_since: iso(r.created_at), public_route: `/@${await handleOf(uid)}` } }); return true;
    }
    // ---- account deletion
    if (p === '/api/v8/me/deletion') {
      const d = (await pool.query(`SELECT * FROM howdi_v8_account_deletions WHERE user_id=$1`, [uid])).rows[0];
      const w = await wallet(uid); const rw = await rewardSummary(uid);
      const blockers = []; const oo = await openOrders(uid); const os = await openSales(uid);
      if (oo) blockers.push(`${oo} Shop order${oo > 1 ? 's are' : ' is'} still on the way`); if (os) blockers.push(`${os} order${os > 1 ? 's' : ''} from your store still need${os > 1 ? '' : 's'} to be delivered`);
      const warnings = []; if (w && Number(w.balance) > 0) warnings.push(`HPay balance ₹${money(w.balance)} — spend or transfer it first; it can’t be refunded after deletion`); if (rw.available) warnings.push(`${rw.available} reward points will be lost`);
      const fam = await familyOf(uid); if (fam) warnings.push(Number(fam.owner_id) === uid ? 'Your family group will be closed' : 'You’ll leave your family group');
      const state = d && d.status === 'pending' ? { status: 'pending', scheduled_for: iso(d.scheduled_for), requested_at: iso(d.requested_at) } : { status: 'none' };
      if (req.method === 'GET') { ok(res, { deletion: state, blockers, warnings, grace_days: GRACE_DAYS, handle: await handleOf(uid) }); return true; }
      if (req.method === 'POST') {
        const b = await body();
        if (String(b.confirm || '').replace(/^@/, '').toLowerCase() !== await handleOf(uid)) { fail(res, 400, 'CONFIRM', 'Type your @username exactly to confirm.'); return true; }
        if (blockers.length) { fail(res, 409, 'BLOCKED', `You can’t delete your account yet: ${blockers.join('; ')}.`); return true; }
        await pool.query(`INSERT INTO howdi_v8_account_deletions(user_id,status,reason,scheduled_for) VALUES($1,'pending',$2,NOW()+($3||' days')::interval)
          ON CONFLICT(user_id) DO UPDATE SET status='pending', reason=$2, requested_at=NOW(), scheduled_for=NOW()+($3||' days')::interval, cancelled_at=NULL`, [uid, line(b.reason, 300) || null, String(GRACE_DAYS)]);
        await notify(uid, 'ACCOUNT_DELETION', 'Account deletion scheduled', `Your HOWDI account will be deleted in ${GRACE_DAYS} days. Sign in and cancel any time before then.`, '/me/delete', null);
        const n = (await pool.query(`SELECT scheduled_for FROM howdi_v8_account_deletions WHERE user_id=$1`, [uid])).rows[0];
        ok(res, { deletion: { status: 'pending', scheduled_for: iso(n.scheduled_for) } }); return true;
      }
      if (req.method === 'DELETE') {
        await pool.query(`UPDATE howdi_v8_account_deletions SET status='cancelled', cancelled_at=NOW() WHERE user_id=$1 AND status='pending'`, [uid]);
        await notify(uid, 'ACCOUNT_DELETION_CANCELLED', 'Account deletion cancelled', 'Your HOWDI account stays active.', '/me', null);
        ok(res, { deletion: { status: 'none' } }); return true;
      }
    }
    // ---- download my data (no internal ids; sent as a JSON file)
    if (p === '/api/v8/me/export' && req.method === 'GET') {
      const prof = (await pool.query(`SELECT u.full_name, u.created_at, cp.headline, cp.about FROM users u LEFT JOIN howdi_connect_profiles cp ON cp.user_id=u.id WHERE u.id=$1`, [uid])).rows[0];
      const places = (await pool.query(`SELECT name, line1, line2, landmark, city, state, pincode FROM howdi_v8_addresses WHERE user_id=$1`, [uid])).rows.map((a) => ({ name: a.name, line: [a.line1, a.line2, a.landmark].filter(Boolean).join(', '), city: a.city, state: a.state, pin_code: a.pincode }));
      const ords = (await pool.query(`SELECT s.order_id, s.state, s.amount, s.placed_at FROM howdi_v8_shop_orders s WHERE s.buyer_user_id=$1 ORDER BY s.placed_at DESC LIMIT 500`, [uid])).rows;
      const oc = await issue('SORD', ords.map((o) => String(o.order_id)));
      const orders = await Promise.all(ords.map(async (o) => ({ order: oc.get(String(o.order_id)), state: o.state, total: money(o.amount), placed_at: iso(o.placed_at), items: (await pool.query(`SELECT product_name, quantity, line_total FROM order_items WHERE order_id=$1`, [o.order_id])).rows.map((i) => ({ name: i.product_name, qty: i.quantity, total: money(i.line_total) })) })));
      const reviews = (await pool.query(`SELECT r.rating, r.body, r.updated_at, p.name FROM howdi_v8_product_reviews r JOIN vendor_products p ON p.id=r.product_id WHERE r.user_id=$1`, [uid])).rows.map((r) => ({ product: r.name, rating: r.rating, text: r.body, at: iso(r.updated_at) }));
      const wishlist = (await pool.query(`SELECT product_name FROM user_wishlist WHERE user_id=$1`, [uid])).rows.map((r) => r.product_name);
      const hpay = (await pool.query(`SELECT txn_code, direction, amount, kind, note, created_at FROM howdi_v8_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1000`, [uid])).rows.map((t) => ({ reference: t.txn_code, direction: t.direction === 'CREDIT' ? 'in' : 'out', amount: money(t.amount), type: t.kind, note: t.note, at: iso(t.created_at) }));
      const rewards = (await pool.query(`SELECT kind, points, reference, expires_at, created_at FROM howdi_v8_rewards WHERE user_id=$1 ORDER BY created_at DESC`, [uid])).rows.map((r) => ({ type: r.kind.toLowerCase(), points: r.points, reference: r.reference, expires: iso(r.expires_at), at: iso(r.created_at) }));
      const size = (await pool.query(`SELECT height_cm, width_cm, length_cm, chest_cm, hand_cm, waist_cm, fit FROM howdi_v8_size_profiles WHERE user_id=$1`, [uid])).rows[0] || null;
      const roles = (await pool.query(`SELECT r.code, ur.role_status FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1 AND r.code IN ('CUSTOMER','CREATOR','VENDOR','WORKER','LEARNER','TEACHER','INSTITUTE','STARTUP')`, [uid])).rows.map((r) => ({ role: r.code.toLowerCase(), status: String(r.role_status || '').toLowerCase() }));
      ok(res, { export: { generated_at: new Date().toISOString(), username: await handleOf(uid), name: prof.full_name, headline: prof.headline, about: prof.about, member_since: iso(prof.created_at), roles, saved_places: places, orders, reviews, wishlist, hpay, rewards, size_profile: size } }); return true;
    }
    // ---- family
    if (p === '/api/v8/me/family' || p.startsWith('/api/v8/me/family/')) {
      if (p === '/api/v8/me/family' && req.method === 'GET') { ok(res, await familyDto(uid)); return true; }
      const b = await body(); const f = await familyOf(uid);
      if (p === '/api/v8/me/family' && req.method === 'POST') {
        if (f) { fail(res, 409, 'IN_FAMILY', 'You’re already in a family group.'); return true; }
        const name = line(b.name, 60); if (name.length < 2) { fail(res, 400, 'NAME', 'Give your family group a name.'); return true; }
        const fid = (await pool.query(`INSERT INTO howdi_v8_families(owner_id,name) VALUES($1,$2) RETURNING id`, [uid, name])).rows[0].id;
        await pool.query(`INSERT INTO howdi_v8_family_members(family_id,user_id,relation,status) VALUES($1,$2,'owner','active')`, [fid, uid]);
        await pool.query(`DELETE FROM howdi_v8_family_members WHERE user_id=$1 AND status='invited'`, [uid]);
        ok(res, await familyDto(uid)); return true;
      }
      if (p === '/api/v8/me/family' && req.method === 'DELETE') {
        if (!f || Number(f.owner_id) !== uid) { fail(res, 403, 'OWNER_ONLY', 'Only the family owner can close the group.'); return true; }
        const ms = (await pool.query(`SELECT user_id FROM howdi_v8_family_members WHERE family_id=$1 AND user_id<>$2 AND status='active'`, [f.id, uid])).rows;
        await pool.query(`DELETE FROM howdi_v8_family_members WHERE family_id=$1`, [f.id]); await pool.query(`DELETE FROM howdi_v8_families WHERE id=$1`, [f.id]);
        for (const x of ms) await notify(Number(x.user_id), 'FAMILY_CLOSED', `The family group “${f.name}” was closed`, 'The owner closed it.', '/me/family', null);
        ok(res, await familyDto(uid)); return true;
      }
      if (p === '/api/v8/me/family/invite' && req.method === 'POST') {
        if (!f || Number(f.owner_id) !== uid) { fail(res, 403, 'OWNER_ONLY', 'Only the family owner can invite.'); return true; }
        if (!RELATIONS.includes(b.relation)) { fail(res, 400, 'RELATION', 'Choose how they’re related to you.'); return true; }
        const t = await uidOf(b.handle); if (!t || Number(t) === uid) { fail(res, 404, 'NOT_FOUND', 'No HOWDI member has that @username.'); return true; }
        if (await familyOf(t)) { fail(res, 409, 'IN_FAMILY', 'They’re already in a family group.'); return true; }
        const n = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_family_members WHERE family_id=$1`, [f.id])).rows[0].n);
        if (n >= FAMILY_MAX) { fail(res, 409, 'FAMILY_FULL', `A family group can have up to ${FAMILY_MAX} people.`); return true; }
        await pool.query(`INSERT INTO howdi_v8_family_members(family_id,user_id,relation,status) VALUES($1,$2,$3,'invited') ON CONFLICT(family_id,user_id) DO UPDATE SET relation=$3`, [f.id, t, b.relation]);
        await notify(Number(t), 'FAMILY_INVITE', `@${await handleOf(uid)} invited you to their family on HOWDI`, `Family group “${f.name}”. Accept or decline in My HOWDI → Family.`, '/me/family', uid);
        ok(res, await familyDto(uid)); return true;
      }
      if (p === '/api/v8/me/family/respond' && req.method === 'POST') {
        const owner = await uidOf(b.from); const fam = owner ? (await pool.query(`SELECT * FROM howdi_v8_families WHERE owner_id=$1`, [owner])).rows[0] : null;
        const inv = fam ? (await pool.query(`SELECT 1 FROM howdi_v8_family_members WHERE family_id=$1 AND user_id=$2 AND status='invited'`, [fam.id, uid])).rows[0] : null;
        if (!inv) { fail(res, 404, 'NOT_FOUND', 'That invitation is no longer open.'); return true; }
        if (b.accept === true) {
          if (f) { fail(res, 409, 'IN_FAMILY', 'Leave your current family group first.'); return true; }
          await pool.query(`UPDATE howdi_v8_family_members SET status='active' WHERE family_id=$1 AND user_id=$2`, [fam.id, uid]);
          await pool.query(`DELETE FROM howdi_v8_family_members WHERE user_id=$1 AND status='invited'`, [uid]);
          await notify(Number(owner), 'FAMILY_JOINED', `@${await handleOf(uid)} joined “${fam.name}”`, 'They’re now in your family group.', '/me/family', uid);
        } else {
          await pool.query(`DELETE FROM howdi_v8_family_members WHERE family_id=$1 AND user_id=$2`, [fam.id, uid]);
          await notify(Number(owner), 'FAMILY_DECLINED', `@${await handleOf(uid)} declined your family invitation`, fam.name, '/me/family', uid);
        }
        ok(res, await familyDto(uid)); return true;
      }
      if (p === '/api/v8/me/family/remove' && req.method === 'POST') {
        if (!f || Number(f.owner_id) !== uid) { fail(res, 403, 'OWNER_ONLY', 'Only the family owner can remove people.'); return true; }
        const t = await uidOf(b.handle); if (!t || Number(t) === uid) { fail(res, 404, 'NOT_FOUND', 'Not in your family group.'); return true; }
        const del = await pool.query(`DELETE FROM howdi_v8_family_members WHERE family_id=$1 AND user_id=$2 RETURNING status`, [f.id, t]);
        if (del.rows[0]?.status === 'active') await notify(Number(t), 'FAMILY_REMOVED', `You were removed from “${f.name}”`, 'The family owner removed you.', '/me/family', null);
        ok(res, await familyDto(uid)); return true;
      }
      if (p === '/api/v8/me/family/leave' && req.method === 'POST') {
        if (!f) { fail(res, 404, 'NOT_FOUND', 'You’re not in a family group.'); return true; }
        if (Number(f.owner_id) === uid) { fail(res, 409, 'OWNER', 'You own this group — close it instead.'); return true; }
        await pool.query(`DELETE FROM howdi_v8_family_members WHERE family_id=$1 AND user_id=$2`, [f.id, uid]);
        await notify(Number(f.owner_id), 'FAMILY_LEFT', `@${await handleOf(uid)} left “${f.name}”`, '', '/me/family', uid);
        ok(res, await familyDto(uid)); return true;
      }
    }
    // ---- size profile
    if (p === '/api/v8/me/size') {
      if (req.method === 'PUT') {
        const b = await body(); const vals = {};
        for (const [k, [lo, hi]] of Object.entries(SIZE)) {
          if (b[k] === '' || b[k] === null || b[k] === undefined) { vals[k] = null; continue; }
          const n = Math.round(Number(b[k]) * 10) / 10; if (!(n >= lo && n <= hi)) { fail(res, 400, 'SIZE_RANGE', `${k.replace('_cm', '').replace('hand', 'hands (sleeve)')} must be between ${lo} and ${hi} cm.`); return true; } vals[k] = n;
        }
        if (!Object.values(vals).some((x) => x !== null)) { fail(res, 400, 'SIZE_EMPTY', 'Add at least one measurement.'); return true; }
        if (b.consent !== true) { fail(res, 400, 'CONSENT', 'Tick the box to let HOWDI save your measurements.'); return true; }
        const fit = FITS.includes(b.fit) ? b.fit : 'regular';
        await pool.query(`INSERT INTO howdi_v8_size_profiles(user_id,height_cm,width_cm,length_cm,chest_cm,hand_cm,waist_cm,fit) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT(user_id) DO UPDATE SET height_cm=$2,width_cm=$3,length_cm=$4,chest_cm=$5,hand_cm=$6,waist_cm=$7,fit=$8,updated_at=NOW()`, [uid, vals.height_cm, vals.width_cm, vals.length_cm, vals.chest_cm, vals.hand_cm, vals.waist_cm, fit]);
      } else if (req.method === 'DELETE') { await pool.query(`DELETE FROM howdi_v8_size_profiles WHERE user_id=$1`, [uid]); }
      else if (req.method !== 'GET') { fail(res, 405, 'METHOD', 'Not allowed.'); return true; }
      const s = (await pool.query(`SELECT * FROM howdi_v8_size_profiles WHERE user_id=$1`, [uid])).rows[0];
      ok(res, { size: s ? { ...Object.fromEntries(Object.keys(SIZE).map((k) => [k, s[k] === null ? null : Number(s[k])])), fit: s.fit, updated_at: iso(s.updated_at) } : null, ranges: SIZE, fits: FITS }); return true;
    }
    // ---- rewards
    if (p === '/api/v8/me/rewards' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT kind, points, reference, funded_by, expires_at, available_at, note, created_at FROM howdi_v8_rewards WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`, [uid])).rows;
      ok(res, { summary: await rewardSummary(uid), rules: { earn: '10 points for every ₹1,000 on delivered Shop orders', value: `1 point = ₹${POINT_VALUE} when added to HPay`, validity: 'Usable after the 7-day return window; valid for 1 year', min_redeem: MIN_REDEEM },
        items: rows.map((r) => ({ type: r.kind.toLowerCase(), points: r.points, reference: r.reference, funded_by: r.funded_by, expires_at: iso(r.expires_at), expired: r.kind === 'EARN' && r.expires_at && new Date(r.expires_at) <= new Date(), usable_from: r.kind === 'EARN' ? iso(r.available_at || r.created_at) : null, note: r.note, at: iso(r.created_at) })) }); return true;
    }
    if (p === '/api/v8/me/rewards/redeem' && req.method === 'POST') {
      const b = await body(); const pts = Math.floor(Number(b.points)); const idem = line(b.idem_key, 64);
      if (!idem) { fail(res, 400, 'VALIDATION', 'Missing key. Please try again.'); return true; }
      if (!(pts >= MIN_REDEEM)) { fail(res, 400, 'MIN_REDEEM', `Redeem at least ${MIN_REDEEM} points.`); return true; }
      if (!(await wallet(uid))) { fail(res, 503, 'PAYMENT_PROVIDER_REQUIRED', 'HPay isn’t connected here, so points can’t be added to it.'); return true; }
      const ref = 'RDM-' + crypto.createHash('sha256').update(`${uid}:${idem}`).digest('hex').slice(0, 12).toUpperCase();
      const client = await pool.connect();
      try {
        await client.query('BEGIN'); await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`rewards:${uid}`]);
        const prior = (await client.query(`SELECT points FROM howdi_v8_rewards WHERE user_id=$1 AND kind='REDEEM' AND reference=$2`, [uid, ref])).rows[0];
        if (!prior) {
          const sum = await rewardSummary(uid); if (pts > sum.available) { await client.query('ROLLBACK'); fail(res, 422, 'NOT_ENOUGH_POINTS', `You have ${sum.available} points.`); return true; }
          await client.query(`INSERT INTO howdi_v8_rewards(user_id,kind,points,reference,note) VALUES($1,'REDEEM',$2,$3,'Added to HPay')`, [uid, pts, ref]);
          await wallet(uid, client); await client.query(`UPDATE howdi_v8_wallets SET balance=balance+$2, updated_at=NOW() WHERE user_id=$1`, [uid, pts * POINT_VALUE]);
          await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'CREDIT',$3,'REWARD_REDEEM',$4,$5)`, ['HPR-' + crypto.randomBytes(5).toString('hex').toUpperCase(), uid, pts * POINT_VALUE, ref, `${pts} reward points`]);
        }
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      const w = await wallet(uid); ok(res, { redeemed: pts, amount: pts * POINT_VALUE, balance: money(w.balance), summary: await rewardSummary(uid) }); return true;
    }
    if (p === '/api/v8/me/rewards/seller-setting') {
      const vend = (await pool.query(`SELECT 1 FROM vendor_profiles WHERE user_id=$1 AND LOWER(COALESCE(kyc_status,''))='verified'`, [uid])).rows[0];
      if (!vend) { fail(res, 403, 'NOT_A_VENDOR', 'Only approved sellers choose who funds reward points.'); return true; }
      if (req.method === 'PUT') { const b = await body(); if (!['howdi', 'seller'].includes(b.funded_by)) { fail(res, 400, 'VALIDATION', 'Choose HOWDI or seller.'); return true; } await pool.query(`INSERT INTO howdi_v8_vendor_reward_settings(vendor_user_id,funded_by) VALUES($1,$2) ON CONFLICT(vendor_user_id) DO UPDATE SET funded_by=$2, updated_at=NOW()`, [uid, b.funded_by]); }
      ok(res, { funded_by: await sellerFunding(uid), explain: { howdi: 'HOWDI pays for the points your buyers earn.', seller: 'You pay ₹1 per point your buyers earn (10 points = ₹10 on a ₹1,000 order), taken from your HPay earnings at delivery and given back if the order is returned.' } }); return true;
    }
    return false;
  }

  // ------------------------------------------------------------ admin: reported reviews
  async function admin(req, res, url, p) {
    const session = req.howdiAdminSession || null; const who = session?.username || 'admin-token'; let m;
    if (p === '/api/admin/v8/reviews/reports' && req.method === 'GET') {
      const status = ['open', 'kept', 'hidden'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : 'open';
      const rows = (await pool.query(`SELECT rr.*, r.rating, r.body, r.hidden, p.name product FROM howdi_v8_review_reports rr JOIN howdi_v8_product_reviews r ON r.product_id=rr.product_id AND r.user_id=rr.reviewer_id JOIN vendor_products p ON p.id=rr.product_id WHERE rr.status=$1 ORDER BY rr.created_at ${status === 'open' ? 'ASC' : 'DESC'} LIMIT 100`, [status])).rows;
      const codes = await issue('RRPT', rows.map((r) => String(r.id)));
      const counts = Object.fromEntries((await pool.query(`SELECT status s, COUNT(*) n FROM howdi_v8_review_reports GROUP BY 1`)).rows.map((r) => [r.s, Number(r.n)]));
      const items = await Promise.all(rows.map(async (r) => ({ public_key: codes.get(String(r.id)), product: r.product, reviewer: await person(r.reviewer_id), reporter: await person(r.reporter_id), rating: r.rating, review: r.body, reason: REPORT_REASONS[r.reason] || r.reason, details: r.details, status: r.status, at: iso(r.created_at), decided_by: r.decided_by, decided_at: iso(r.decided_at) })));
      await auditAdmin(req, session, 'V8_REVIEW_REPORTS_LIST', { status }); ok(res, { status, counts, items }); return true;
    }
    if ((m = p.match(/^\/api\/admin\/v8\/reviews\/reports\/(RPT-[0-9A-F]{12})\/decide$/)) && req.method === 'POST') {
      const k = (await pool.query(`SELECT entity_key FROM howdi_v8_refs2 WHERE public_code=$1 AND entity_type='RRPT'`, [m[1]])).rows[0];
      const r = k ? (await pool.query(`SELECT rr.*, p.name product FROM howdi_v8_review_reports rr JOIN vendor_products p ON p.id=rr.product_id WHERE rr.id=$1`, [k.entity_key])).rows[0] : null;
      if (!r) { fail(res, 404, 'NOT_FOUND', 'Report not found.'); return true; }
      if (r.status !== 'open') { fail(res, 409, 'INVALID_STATE', `Already ${r.status}.`); return true; }
      const b = (await getBody(req).catch(() => ({}))) || {}; if (!['keep', 'hide'].includes(b.decision)) { fail(res, 400, 'INVALID_DECISION', 'Choose keep or hide.'); return true; }
      const ns = b.decision === 'hide' ? 'hidden' : 'kept';
      await pool.query(`UPDATE howdi_v8_review_reports SET status=$4, decided_by=$5, decided_at=NOW() WHERE product_id=$1 AND reviewer_id=$2 AND (id=$3 OR ($4='hidden' AND status='open'))`, [r.product_id, r.reviewer_id, r.id, ns, who]);
      if (ns === 'hidden') {
        await pool.query(`UPDATE howdi_v8_product_reviews SET hidden=TRUE WHERE product_id=$1 AND user_id=$2`, [r.product_id, r.reviewer_id]);
        await notify(Number(r.reviewer_id), 'REVIEW_HIDDEN', `Your review of ${line(r.product, 50)} was hidden`, `${REPORT_REASONS[r.reason] || 'It broke the review rules'}. ${line(b.note, 200) || ''}`.trim(), '/me', null);
      }
      await auditAdmin(req, session, 'V8_REVIEW_REPORT_DECISION', { report: m[1], decision: ns });
      ok(res, { status: ns }); return true;
    }
    return false;
  }

  return { ensureSchema, handle, _internal: { earn, reverse, rewardSummary } };
}
module.exports = { createMeV8 };
