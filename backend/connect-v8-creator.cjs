'use strict';
// =====================================================================================
// HOWDI V8 — CREATOR WORKSPACE, MEMBERSHIPS (subscriptions), EARNINGS and CREATOR SAFETY
// Boards: V8__27 Creator/Celebrity workspace (overview, calendar, memberships, community & live, content reach,
// safety & earnings, system strip) and PRIOR__14 (paid offer → HPay confirmation → member-only feed → manage).
//
// Subscriber side
//   GET  /api/v8/creators/{@h}/memberships              tiers (TIR codes) + my membership with this creator
//   POST /api/v8/memberships/{TIR}/quote                 price, HPay balance, consent lines (nothing is charged)
//   POST /api/v8/memberships/{TIR}/subscribe             {cycle, consent:true, idempotency_key} — debits the HPay
//                                                        Preview/Test sandbox wallet; without the sandbox → 503
//   GET  /api/v8/me/memberships                          my memberships (manage)
//   POST /api/v8/subscriptions/{SUB}/cancel|resume|retry cancel at period end · undo · retry a failed renewal
// Creator side (the signed-in user is the creator; nothing takes a creator id)
//   GET  /api/v8/creator/workspace                       header stats, calendar, tiers, next live, safeguards, shop link
//   GET|POST /api/v8/creator/tiers  ·  PATCH /api/v8/creator/tiers/{TIR}   create / edit / pause a paid tier
//   GET  /api/v8/creator/subscribers                     @handles, tier, since, status (no contact details)
//   GET  /api/v8/creator/content?kind=all|vibe|article|post|hype|tip       content with aggregate metrics
//   GET  /api/v8/creator/insights                        aggregates only (never viewer identities)
//   GET  /api/v8/creator/earnings · POST /api/v8/creator/payouts          ledger, ready-to-settle, payout request
//   GET|POST /api/v8/creator/drafts · GET|PUT|DELETE /api/v8/creator/drafts/{DRF}   server drafts (autosave)
//   GET|PUT /api/v8/creator/safety                       muted words, blocked phrases, mentions, sensitive default
//   GET  /api/v8/creator/held-comments · POST …/{HLD}/approve|remove       comments held by blocked phrases
//   GET  /api/v8/creator/moderation                      reports on my content, copyright claims, strikes, audit
//   POST /api/v8/creator/appeals                         appeal a strike / removal
//   GET|PUT|DELETE /api/v8/creator/shop-link             pin one canonical Shop product (PRD code) with disclosure
// HOWDI Admin (behind the global admin guard; every decision is written to the admin security audit)
//   GET  /api/admin/v8/payouts?status=  ·  POST /api/admin/v8/payouts/{PAY}/decide   {decision: paid|failed|rejected, note}
//   GET  /api/admin/v8/appeals          ·  POST /api/admin/v8/appeals/{APL}/decide   {decision: upheld|overturned, note}
//
// Money: amounts are INR. Real money needs a payment provider; until then every charge uses the clearly labelled
// Preview/Test HPay sandbox wallet (only on a *_preview database). Charges are idempotent per (user, key).
// =====================================================================================
const crypto = require('node:crypto');

const PFX = { TIER: 'TIR', SUB: 'SUB', PAYOUT: 'PAY', DRAFT: 'DRF', HOLD: 'HLD', APPEAL: 'APL' };
const CODE_RE = /^(TIR|SUB|PAY|DRF|HLD|APL)-[0-9A-F]{12}$/;
const FEE_RATE = 0.10;            // HOWDI platform fee on memberships (shown to the creator)
const MIN_PAYOUT = 100;           // ₹

function createConnectV8Creator(deps) {
  const { pool, getBody, clientIp, notify, wallet, sandboxEnabled, auditAdmin, logger = console } = deps;
  const H = deps.helpers;
  const { authorCols, authorJoins, authorDto, blockedSql, viewer, limited, ok, fail, userIdByHandle, issue } = H;
  const k5aIssue = deps.issueK5ARefs; const k5aResolve = deps.resolveK5ARef;
  const text = (v, max) => String(v ?? '').normalize('NFKC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max);
  const line = (v, max) => text(v, max * 2).replace(/\s+/g, ' ').slice(0, max);
  const iso = (v) => { if (!v) return null; const d = new Date(v); return Number.isFinite(d.getTime()) ? d.toISOString() : null; };
  const count = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const money = (v) => Math.round(Number(v || 0) * 100) / 100;
  const img = (v) => { const s = String(v || ''); return (/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 900000) || /^\/(?!\/)[^\s"'<>]{1,300}$/.test(s) || /^https?:\/\/[^\s"'<>]{1,500}$/.test(s) ? s : null; };

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_refs3(entity_type VARCHAR(16) NOT NULL, entity_key VARCHAR(64) NOT NULL, public_code VARCHAR(24) NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(entity_type, entity_key))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_idem(user_id BIGINT NOT NULL, idem_key VARCHAR(64) NOT NULL, scope VARCHAR(24) NOT NULL, response JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id, scope, idem_key))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_creator_payouts(id BIGSERIAL PRIMARY KEY, creator_user_id BIGINT NOT NULL, amount NUMERIC(14,2) NOT NULL CHECK (amount>0), status VARCHAR(12) NOT NULL DEFAULT 'REQUESTED',
      reference VARCHAR(24) NOT NULL UNIQUE, note VARCHAR(300), decided_by VARCHAR(80), requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), decided_at TIMESTAMPTZ)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_drafts(id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, kind VARCHAR(12) NOT NULL, title VARCHAR(160) NOT NULL DEFAULT '', payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      ready BOOLEAN NOT NULL DEFAULT FALSE, planned_for TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_drafts_user_idx ON howdi_v8_drafts(user_id, updated_at DESC)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_creator_safety(user_id BIGINT PRIMARY KEY, muted_words JSONB NOT NULL DEFAULT '[]'::jsonb, blocked_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,
      mentions VARCHAR(12) NOT NULL DEFAULT 'everyone', sensitive_default BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_comment_holds(id BIGSERIAL PRIMARY KEY, creator_user_id BIGINT NOT NULL, kind VARCHAR(8) NOT NULL, comment_key VARCHAR(64) NOT NULL, matched VARCHAR(60),
      status VARCHAR(10) NOT NULL DEFAULT 'HELD', decided_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(kind, comment_key))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_creator_strikes(id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, reason VARCHAR(40) NOT NULL, details VARCHAR(300), active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+interval '90 days')`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_appeals(id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, strike_id BIGINT, subject VARCHAR(120) NOT NULL, details VARCHAR(1000) NOT NULL,
      status VARCHAR(12) NOT NULL DEFAULT 'OPEN', decision_note VARCHAR(300), decided_by VARCHAR(80), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), decided_at TIMESTAMPTZ)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_moderation_audit(id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, action VARCHAR(40) NOT NULL, detail VARCHAR(200), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_creator_links(user_id BIGINT PRIMARY KEY, product_key VARCHAR(40) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`ALTER TABLE howdi_connect_subscription_plans ADD COLUMN IF NOT EXISTS v8_paused BOOLEAN NOT NULL DEFAULT FALSE`);
    await pool.query(`ALTER TABLE howdi_connect_subscriptions ADD COLUMN IF NOT EXISTS v8_payment_ref VARCHAR(24)`);
    await pool.query(`ALTER TABLE howdi_connect_subscriptions ADD COLUMN IF NOT EXISTS v8_failed_at TIMESTAMPTZ`);
  }

  // ------------------------------------------------------------ opaque codes
  async function issue3(type, keys) {
    const uniq = [...new Set(keys.map(String))]; const out = new Map(); if (!uniq.length) return out;
    for (let a = 0; a < 4; a++) {
      const codes = uniq.map(() => `${PFX[type]}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`);
      try { await pool.query(`INSERT INTO howdi_v8_refs3(entity_type,entity_key,public_code) SELECT $1,x.k,x.c FROM unnest($2::text[],$3::text[]) x(k,c) ON CONFLICT DO NOTHING`, [type, uniq, codes]); break; }
      catch (e) { if (!(e && e.code === '23505') || a === 3) throw e; }
    }
    for (const r of (await pool.query(`SELECT entity_key, public_code FROM howdi_v8_refs3 WHERE entity_type=$1 AND entity_key=ANY($2::text[])`, [type, uniq])).rows) out.set(String(r.entity_key), r.public_code);
    return out;
  }
  async function resolve3(code, type) {
    if (!CODE_RE.test(String(code)) || !String(code).startsWith(PFX[type] + '-')) return null;
    const r = (await pool.query(`SELECT entity_key FROM howdi_v8_refs3 WHERE public_code=$1 AND entity_type=$2`, [code, type])).rows[0];
    return r ? r.entity_key : null;
  }
  const txn = (p) => `${p}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  async function idemGet(uid, scope, key) {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(String(key || ''))) return undefined;
    const r = (await pool.query(`SELECT response FROM howdi_v8_idem WHERE user_id=$1 AND scope=$2 AND idem_key=$3`, [uid, scope, key])).rows[0];
    return r ? r.response : null;
  }
  async function idemPut(client, uid, scope, key, response) { await client.query(`INSERT INTO howdi_v8_idem(user_id,idem_key,scope,response) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT DO NOTHING`, [uid, key, scope, JSON.stringify(response)]); }
  async function audit(uid, action, detail) { await pool.query(`INSERT INTO howdi_v8_moderation_audit(user_id,action,detail) VALUES($1,$2,$3)`, [uid, action, line(detail, 200)]).catch(() => {}); }

  // ------------------------------------------------------------ memberships
  const TIER_COLS = `p.id::text tkey, p.plan_name, p.description, p.price_monthly, p.price_yearly, p.currency, p.benefits, p.is_active, p.v8_paused, p.created_at,
      (SELECT COUNT(*) FROM howdi_connect_subscriptions s WHERE s.plan_id=p.id AND s.status IN ('ACTIVE','PAST_DUE') AND (s.current_period_end IS NULL OR s.current_period_end>NOW())) members`;
  function benefitsOf(v) { let b = v; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = []; } } return Array.isArray(b) ? b.map((x) => line(typeof x === 'object' && x ? x.label || x.title : x, 80)).filter(Boolean).slice(0, 8) : []; }
  function tierDto(r, code) {
    return code ? { key: code, name: line(r.plan_name, 60), description: line(r.description, 200), monthly: money(r.price_monthly), yearly: money(r.price_yearly), currency: 'INR',
      benefits: benefitsOf(r.benefits), members: count(r.members), state: r.v8_paused ? 'paused' : r.is_active ? 'active' : 'archived' } : null;
  }
  const memberSql = (creator, viewerExpr) => `EXISTS(SELECT 1 FROM howdi_connect_subscriptions ms WHERE ms.creator_user_id=${creator} AND ms.subscriber_user_id=${viewerExpr} AND ms.status='ACTIVE' AND (ms.current_period_end IS NULL OR ms.current_period_end>NOW()))`;
  const SUB_COLS = `s.id::text skey, s.status, s.billing_cycle, s.amount, s.currency, s.started_at, s.current_period_end, s.cancel_at_period_end, s.cancelled_at, s.ended_at, s.v8_payment_ref, s.v8_failed_at, p.plan_name, p.benefits, p.id::text tkey`;
  function subDto(r, code, extra = {}) {
    const st = String(r.status || '').toUpperCase();
    const state = st === 'ACTIVE' ? (r.cancel_at_period_end ? 'cancelling' : 'active') : st === 'PAST_DUE' ? 'payment_failed' : st === 'CANCELLED' ? 'ended' : st.toLowerCase();
    return { key: code, state, tier: line(r.plan_name, 60), benefits: benefitsOf(r.benefits), cycle: String(r.billing_cycle || 'MONTHLY').toLowerCase(), amount: money(r.amount), currency: 'INR',
      since: iso(r.started_at), renews_on: state === 'active' ? iso(r.current_period_end) : null, access_until: iso(r.current_period_end), payment_reference: r.v8_payment_ref || null, ...extra };
  }
  async function charge(client, { payer, payee, amount, kind, note }) {
    await wallet(payer, client);
    const w = await client.query(`UPDATE howdi_v8_wallets SET balance=balance-$2, updated_at=NOW() WHERE user_id=$1 AND balance>=$2 RETURNING balance`, [payer, amount]);
    if (!w.rowCount) return null;
    const ref = txn('HPY');
    await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,counterparty_user_id,reference,note) VALUES($1,$2,'DEBIT',$3,$4,$5,$1,$6)`, [ref, payer, amount, kind, payee, line(note, 120)]);
    return { reference: ref, balance: money(w.rows[0].balance) };
  }
  // Renewals run lazily (on read) and every 10 minutes: due → charge; no balance → PAST_DUE (access paused); cancelled → ended.
  async function renewDue(limitTo) {
    const where = limitTo ? `AND (s.subscriber_user_id=$1 OR s.creator_user_id=$1)` : '';
    const due = (await pool.query(`SELECT s.id, s.subscriber_user_id, s.creator_user_id, s.billing_cycle, s.amount, s.cancel_at_period_end, p.plan_name FROM howdi_connect_subscriptions s JOIN howdi_connect_subscription_plans p ON p.id=s.plan_id
      WHERE s.status='ACTIVE' AND s.current_period_end IS NOT NULL AND s.current_period_end<=NOW() AND s.v8_payment_ref IS NOT NULL ${where} LIMIT 50`, limitTo ? [limitTo] : [])).rows;
    for (const s of due) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const lock = (await client.query(`SELECT status, current_period_end FROM howdi_connect_subscriptions WHERE id=$1 FOR UPDATE`, [s.id])).rows[0];
        if (!lock || lock.status !== 'ACTIVE' || new Date(lock.current_period_end) > new Date()) { await client.query('ROLLBACK'); continue; }
        if (s.cancel_at_period_end) {
          await client.query(`UPDATE howdi_connect_subscriptions SET status='CANCELLED', ended_at=NOW(), updated_at=NOW() WHERE id=$1`, [s.id]);
          await client.query('COMMIT');
          await notify(Number(s.subscriber_user_id), 'MEMBERSHIP_ENDED', `Your ${line(s.plan_name, 40)} membership has ended`, 'You can join again any time.', '/connect/memberships');
          continue;
        }
        const amount = money(s.amount);
        const paid = sandboxEnabled() && amount > 0 ? await charge(client, { payer: Number(s.subscriber_user_id), payee: Number(s.creator_user_id), amount, kind: 'MEMBERSHIP', note: `${s.plan_name} renewal` }) : null;
        if (!paid) {
          await client.query(`UPDATE howdi_connect_subscriptions SET status='PAST_DUE', v8_failed_at=NOW(), updated_at=NOW() WHERE id=$1`, [s.id]);
          await client.query('COMMIT');
          await notify(Number(s.subscriber_user_id), 'MEMBERSHIP_PAYMENT_FAILED', `Renewal payment failed for ${line(s.plan_name, 40)}`, 'Add HPay balance and retry to keep your membership.', '/connect/memberships');
          await notify(Number(s.creator_user_id), 'MEMBERSHIP_PAST_DUE', 'A member’s renewal payment failed', 'Their access is paused until they retry.', '/connect/creator?tab=memberships');
          continue;
        }
        const interval = s.billing_cycle === 'YEARLY' ? '1 year' : '1 month';
        await client.query(`UPDATE howdi_connect_subscriptions SET current_period_start=NOW(), current_period_end=NOW()+$2::interval, v8_payment_ref=$3, v8_failed_at=NULL, updated_at=NOW() WHERE id=$1`, [s.id, interval, paid.reference]);
        const fee = money(amount * FEE_RATE);
        await client.query(`INSERT INTO howdi_connect_subscription_ledger(subscription_id,creator_user_id,subscriber_user_id,event_type,gross_amount,platform_fee,creator_amount,currency,reference_code) VALUES($1,$2,$3,'SUBSCRIPTION_RENEWED',$4,$5,$6,'INR',$7)`,
          [s.id, s.creator_user_id, s.subscriber_user_id, amount, fee, money(amount - fee), paid.reference]);
        await client.query('COMMIT');
        await notify(Number(s.subscriber_user_id), 'MEMBERSHIP_RENEWED', `${line(s.plan_name, 40)} renewed`, `₹${amount} paid with HPay (Preview/Test) · ${paid.reference}`, '/connect/memberships');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); logger.error('[V8 renew]', e.message); } finally { client.release(); }
    }
  }
  const renewTimer = setInterval(() => { renewDue().catch(() => {}); }, 10 * 60 * 1000); if (renewTimer.unref) renewTimer.unref();

  async function creatorSummary(uid, vid) {
    const r = (await pool.query(`SELECT ${authorCols('a_u.id', 'a_')}, a_cp.headline, a_cp.about, a_cp.interests, a_cp.professional_category,
        (SELECT COUNT(*) FROM howdi_connect_follows f WHERE f.following_user_id=a_u.id) followers
      FROM (SELECT $1::bigint uid) x ${authorJoins('x.uid', 'a_')}`, [uid])).rows[0];
    return r ? { author: authorDto(r, 'a_'), headline: line(r.headline || r.professional_category, 120), about: line(r.about, 300), followers: count(r.followers) } : null;
  }

  // ------------------------------------------------------------ earnings
  async function earnings(uid) {
    const agg = (await pool.query(`SELECT COALESCE(SUM(creator_amount) FILTER (WHERE event_type IN ('SUBSCRIPTION_STARTED','SUBSCRIPTION_RENEWED')),0) earned,
        COALESCE(SUM(gross_amount) FILTER (WHERE event_type IN ('SUBSCRIPTION_STARTED','SUBSCRIPTION_RENEWED')),0) gross,
        COALESCE(SUM(platform_fee) FILTER (WHERE event_type IN ('SUBSCRIPTION_STARTED','SUBSCRIPTION_RENEWED')),0) fees
      FROM howdi_connect_subscription_ledger WHERE creator_user_id=$1 AND reference_code LIKE 'HPY-%'`, [uid])).rows[0];
    const pay = (await pool.query(`SELECT COALESCE(SUM(amount) FILTER (WHERE status IN ('REQUESTED','PAID')),0) committed, COALESCE(SUM(amount) FILTER (WHERE status='PAID'),0) paid,
        COALESCE(SUM(amount) FILTER (WHERE status='REQUESTED'),0) pending FROM howdi_v8_creator_payouts WHERE creator_user_id=$1`, [uid])).rows[0];
    const tips = (await pool.query(`SELECT COALESCE(SUM(amount),0) n FROM howdi_v8_ledger WHERE user_id=$1 AND direction='CREDIT' AND kind='LIVE_TIP'`, [uid])).rows[0].n;
    return { ready_to_settle: money(Number(agg.earned) - Number(pay.committed)), lifetime_memberships: money(agg.earned), gross: money(agg.gross), platform_fee: money(agg.fees),
      payout_pending: money(pay.pending), paid_out: money(pay.paid), tips_to_hpay: money(tips), fee_rate: FEE_RATE, min_payout: MIN_PAYOUT, currency: 'INR' };
  }

  // ------------------------------------------------------------ content (all kinds the creator owns)
  async function contentList(uid, kind, limit = 30) {
    const out = [];
    if (kind === 'all' || kind === 'vibe') {
      const rows = (await pool.query(`SELECT v.id::text vkey, v.caption, v.cover_url, v.status, v.published_at, v.created_at, COALESCE(s.likes,0) likes, COALESCE(s.comments,0) comments, COALESCE(s.saves,0) saves,
          COALESCE(s.shares,0) shares, COALESCE(s.remixes,0) remixes, COALESCE(s.plays,0) plays
        FROM vibes v LEFT JOIN vibe_stats s ON s.vibe_id=v.id WHERE v.creator_user_id=$1::text AND v.deleted_at IS NULL AND v.status IN ('published','draft','processing') ORDER BY COALESCE(v.published_at,v.created_at) DESC LIMIT $2`, [String(uid), limit])).rows;
      const refs = await issue('VIBE', rows.map((r) => r.vkey));
      for (const r of rows) { const c = refs.get(r.vkey); if (c) out.push({ kind: 'vibe', key: c, title: line(r.caption, 90) || 'Vibe', cover: img(r.cover_url), state: r.status === 'published' ? 'published' : 'draft', at: iso(r.published_at || r.created_at),
        metrics: { likes: count(r.likes), comments: count(r.comments), saves: count(r.saves), shares: count(r.shares), remixes: count(r.remixes), views: count(r.plays) }, route: `/connect/vibe/${c}` }); }
    }
    const types = { article: ['ARTICLE'], post: ['POST'], hype: ['HYPE'], tip: ['TIP'], all: ['ARTICLE', 'POST', 'HYPE', 'TIP'] }[kind];
    if (types) {
      const rows = (await pool.query(`SELECT p.id::text pkey, p.post_type, p.post_status, p.article_title, p.content, p.article_cover_data, p.media_gallery, p.scheduled_for, p.created_at, p.subscribers_only,
          (SELECT COUNT(*) FROM howdi_community_reactions r WHERE r.post_id=p.id) likes, (SELECT COUNT(*) FROM howdi_community_comments c WHERE c.post_id=p.id) comments,
          (SELECT COUNT(*) FROM howdi_connect_post_saves s WHERE s.post_id=p.id) saves, (SELECT COUNT(*) FROM howdi_connect_shares sh WHERE sh.post_id=p.id) shares
        FROM howdi_community_posts p WHERE p.user_id=$1 AND COALESCE(p.post_type,'POST')=ANY($2::text[]) AND p.post_status IN ('PUBLISHED','SCHEDULED') ORDER BY COALESCE(p.scheduled_for,p.created_at) DESC LIMIT $3`, [uid, types, limit])).rows;
      const posts = rows.filter((r) => r.post_type !== 'ARTICLE'); const arts = rows.filter((r) => r.post_type === 'ARTICLE');
      const pr = k5aIssue ? await k5aIssue('POST', posts.map((r) => r.pkey)) : new Map(); const ar = k5aIssue ? await k5aIssue('ARTICLE', arts.map((r) => r.pkey)) : new Map();
      for (const r of rows) {
        const isArt = r.post_type === 'ARTICLE'; const c = (isArt ? ar : pr).get(r.pkey); if (!c) continue;
        let g = r.media_gallery; if (typeof g === 'string') { try { g = JSON.parse(g); } catch { g = []; } }
        const cover = img(r.article_cover_data) || (Array.isArray(g) && g[0] ? img(g[0].url) : null);
        const k = String(r.post_type || 'POST').toLowerCase();
        out.push({ kind: k, key: c, title: line(r.article_title || r.content, 90) || k, cover, state: r.post_status === 'SCHEDULED' && new Date(r.scheduled_for) > new Date() ? 'scheduled' : 'published',
          members_only: r.subscribers_only === true, at: iso(r.scheduled_for || r.created_at), metrics: { likes: count(r.likes), comments: count(r.comments), saves: count(r.saves), shares: count(r.shares), remixes: 0 },
          route: isArt ? `/connect/articles/${c}` : k === 'tip' ? `/connect/tips/${c}` : k === 'hype' ? `/connect/hype/${c}` : `/connect/posts/${c}` });
      }
    }
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, limit);
  }

  // ------------------------------------------------------------ comment holds (blocked phrases) — exported for comment writers
  async function screenComment(creatorId, kind, commentKey, body) {
    const s = (await pool.query(`SELECT blocked_phrases, muted_words FROM howdi_v8_creator_safety WHERE user_id=$1`, [creatorId])).rows[0];
    if (!s) return null;
    const list = [...benefitsOf(s.blocked_phrases), ...benefitsOf(s.muted_words)].map((x) => x.toLowerCase()).filter(Boolean);
    const low = String(body || '').toLowerCase();
    const hit = list.find((w) => low.includes(w));
    if (!hit) return null;
    await pool.query(`INSERT INTO howdi_v8_comment_holds(creator_user_id,kind,comment_key,matched) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [creatorId, kind, String(commentKey), hit.slice(0, 60)]);
    return hit;
  }
  // SQL fragment: a held comment is shown only to its author and to the creator
  const heldHiddenSql = (kind, keyExpr, viewerExpr, authorExpr) => `NOT EXISTS(SELECT 1 FROM howdi_v8_comment_holds hh WHERE hh.kind='${kind}' AND hh.comment_key=(${keyExpr})::text AND hh.status IN ('HELD','REMOVED')
      AND NOT (hh.status='HELD' AND (${viewerExpr}=${authorExpr} OR ${viewerExpr}=hh.creator_user_id)))`;

  // ------------------------------------------------------------ router
  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (!/^\/api\/(v8\/(creators\/@?[a-z0-9._]{3,30}\/memberships|memberships|me\/memberships|subscriptions|creator)|admin\/v8\/(payouts|appeals))(\/|$)/i.test(p)) return false;
    let m;

    // ---------- HOWDI Admin (the global admin guard has already authenticated this request)
    if ((m = p.match(/^\/api\/admin\/v8\/(payouts|appeals)(?:\/((?:PAY|APL)-[0-9A-F]{12})\/decide)?$/))) {
      const admin = req.howdiAdminSession ? String(req.howdiAdminSession.username || 'admin') : 'admin-token';
      if (m[1] === 'payouts' && !m[2] && req.method === 'GET') {
        const st = String(url.searchParams.get('status') || 'REQUESTED').toUpperCase();
        const rows = (await pool.query(`SELECT py.id::text k, py.amount, py.status, py.reference, py.note, py.requested_at, py.decided_at, ${authorCols('a_u.id', 'a_')} FROM howdi_v8_creator_payouts py ${authorJoins('py.creator_user_id', 'a_')}
          WHERE ($1='ALL' OR py.status=$1) ORDER BY py.requested_at DESC LIMIT 100`, [st])).rows;
        const refs = await issue3('PAYOUT', rows.map((r) => r.k));
        ok(res, { items: rows.map((r) => ({ key: refs.get(r.k), creator: authorDto(r, 'a_'), amount: money(r.amount), status: r.status.toLowerCase(), reference: r.reference, note: r.note || null, requested_at: iso(r.requested_at), decided_at: iso(r.decided_at) })) });
        return true;
      }
      if (m[1] === 'payouts' && m[2] && req.method === 'POST') {
        const k = await resolve3(m[2], 'PAYOUT'); if (!k) { fail(res, 404, 'NOT_FOUND', 'Payout not found.'); return true; }
        const b = (await getBody(req)) || {}; const d = String(b.decision || ''); const note = line(b.note, 300);
        if (!['paid', 'failed', 'rejected'].includes(d)) { fail(res, 400, 'VALIDATION', 'Choose paid, failed or rejected.'); return true; }
        if (d !== 'paid' && !note) { fail(res, 400, 'VALIDATION', 'Give the creator a reason.'); return true; }
        const client = await pool.connect(); let row;
        try {
          await client.query('BEGIN');
          row = (await client.query(`SELECT * FROM howdi_v8_creator_payouts WHERE id=$1 FOR UPDATE`, [k])).rows[0];
          if (!row || row.status !== 'REQUESTED') { await client.query('ROLLBACK'); fail(res, 409, 'ALREADY_DECIDED', 'This payout was already decided.'); return true; }
          await client.query(`UPDATE howdi_v8_creator_payouts SET status=$2, note=$3, decided_by=$4, decided_at=NOW() WHERE id=$1`, [k, d.toUpperCase(), note || null, admin]);
          if (d === 'paid') {
            await wallet(Number(row.creator_user_id), client);
            await client.query(`UPDATE howdi_v8_wallets SET balance=balance+$2, updated_at=NOW() WHERE user_id=$1`, [row.creator_user_id, row.amount]);
            await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'CREDIT',$3,'CREATOR_PAYOUT',$4,'Creator earnings payout')`, [txn('HPY'), row.creator_user_id, row.amount, row.reference]);
          }
          await client.query('COMMIT');
        } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
        await auditAdmin(req, req.howdiAdminSession, 'V8_CREATOR_PAYOUT_' + d.toUpperCase(), { reference: row.reference });
        const msg = d === 'paid' ? [`Payout of ₹${money(row.amount)} sent to HPay`, `Reference ${row.reference} (Preview/Test sandbox).`] : [`Payout ${row.reference} was ${d}`, note + ' The amount is back in Ready to settle.'];
        await notify(Number(row.creator_user_id), 'PAYOUT_' + d.toUpperCase(), msg[0], msg[1], '/connect/creator?tab=earnings');
        ok(res, { decided: d }); return true;
      }
      if (m[1] === 'appeals' && !m[2] && req.method === 'GET') {
        const rows = (await pool.query(`SELECT ap.id::text k, ap.subject, ap.details, ap.status, ap.created_at, ${authorCols('a_u.id', 'a_')} FROM howdi_v8_appeals ap ${authorJoins('ap.user_id', 'a_')} WHERE ap.status='OPEN' ORDER BY ap.created_at LIMIT 100`)).rows;
        const refs = await issue3('APPEAL', rows.map((r) => r.k));
        ok(res, { items: rows.map((r) => ({ key: refs.get(r.k), creator: authorDto(r, 'a_'), subject: r.subject, details: r.details, status: r.status.toLowerCase(), created_at: iso(r.created_at) })) });
        return true;
      }
      if (m[1] === 'appeals' && m[2] && req.method === 'POST') {
        const k = await resolve3(m[2], 'APPEAL'); if (!k) { fail(res, 404, 'NOT_FOUND', 'Appeal not found.'); return true; }
        const b = (await getBody(req)) || {}; const d = String(b.decision || ''); const note = line(b.note, 300);
        if (!['upheld', 'overturned'].includes(d) || !note) { fail(res, 400, 'VALIDATION', 'Choose upheld or overturned and add a note.'); return true; }
        const row = (await pool.query(`UPDATE howdi_v8_appeals SET status=$2, decision_note=$3, decided_by=$4, decided_at=NOW() WHERE id=$1 AND status='OPEN' RETURNING user_id, strike_id`, [k, d.toUpperCase(), note, admin])).rows[0];
        if (!row) { fail(res, 409, 'ALREADY_DECIDED', 'This appeal was already decided.'); return true; }
        if (d === 'overturned' && row.strike_id) await pool.query(`UPDATE howdi_v8_creator_strikes SET active=FALSE WHERE id=$1`, [row.strike_id]);
        await auditAdmin(req, req.howdiAdminSession, 'V8_APPEAL_' + d.toUpperCase(), {});
        await audit(Number(row.user_id), 'APPEAL_' + d.toUpperCase(), note);
        await notify(Number(row.user_id), 'APPEAL_DECIDED', d === 'overturned' ? 'Your appeal was accepted' : 'Your appeal was reviewed', note, '/connect/creator?tab=safety');
        ok(res, { decided: d }); return true;
      }
      fail(res, 405, 'METHOD_NOT_ALLOWED', 'Not supported.'); return true;
    }

    const v = await viewer(req); const vid = v ? v.id : 0;

    // ---------- public: a creator's tiers
    if ((m = p.match(/^\/api\/v8\/creators\/@?([a-z0-9._]{3,30})\/memberships$/i)) && req.method === 'GET') {
      const cid = await userIdByHandle(m[1]);
      const blocked = cid && vid && (await pool.query(`SELECT ${blockedSql('$1::bigint', '$2::bigint')} b`, [vid, cid])).rows[0].b;
      if (!cid || blocked) { fail(res, 404, 'NOT_FOUND', 'This creator isn’t available.'); return true; }
      if (vid) await renewDue(vid);
      const rows = (await pool.query(`SELECT ${TIER_COLS} FROM howdi_connect_subscription_plans p WHERE p.creator_user_id=$1 AND p.is_active=TRUE AND p.v8_paused=FALSE AND p.price_monthly>0 ORDER BY p.price_monthly LIMIT 5`, [cid])).rows;
      const refs = await issue3('TIER', rows.map((r) => r.tkey));
      const mine = vid ? (await pool.query(`SELECT ${SUB_COLS} FROM howdi_connect_subscriptions s JOIN howdi_connect_subscription_plans p ON p.id=s.plan_id WHERE s.subscriber_user_id=$1 AND s.creator_user_id=$2 AND s.status IN ('ACTIVE','PAST_DUE') ORDER BY s.id DESC LIMIT 1`, [vid, cid])).rows[0] : null;
      const sc = mine ? (await issue3('SUB', [mine.skey])).get(mine.skey) : null;
      const creator = await creatorSummary(cid, vid);
      ok(res, { creator, is_me: vid === cid, free: { name: 'Free', description: 'Open to everyone — follow for public posts.', followers: creator ? creator.followers : 0 },
        tiers: rows.map((r) => tierDto(r, refs.get(r.tkey))).filter(Boolean), membership: mine ? subDto(mine, sc) : null, sandbox: sandboxEnabled() });
      return true;
    }

    if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to continue.'); return true; }

    // ---------- subscriber: quote / subscribe
    if ((m = p.match(/^\/api\/v8\/memberships\/(TIR-[0-9A-F]{12})\/(quote|subscribe)$/)) && req.method === 'POST') {
      const tk = await resolve3(m[1], 'TIER');
      const t = tk ? (await pool.query(`SELECT p.*, ${TIER_COLS} FROM howdi_connect_subscription_plans p WHERE p.id=$1 AND p.is_active=TRUE AND p.v8_paused=FALSE`, [tk])).rows[0] : null;
      const blocked = t && (await pool.query(`SELECT ${blockedSql('$1::bigint', '$2::bigint')} b`, [vid, t.creator_user_id])).rows[0].b;
      if (!t || blocked) { fail(res, 404, 'NOT_FOUND', 'This membership isn’t available.'); return true; }
      if (Number(t.creator_user_id) === vid) { fail(res, 400, 'OWN_TIER', 'You can’t join your own membership.'); return true; }
      const b = (await getBody(req)) || {}; const cycle = String(b.cycle || 'monthly').toLowerCase() === 'yearly' ? 'YEARLY' : 'MONTHLY';
      const amount = money(cycle === 'YEARLY' ? t.price_yearly || Number(t.price_monthly) * 10 : t.price_monthly);
      const creator = await creatorSummary(Number(t.creator_user_id), vid);
      const w = sandboxEnabled() ? await wallet(vid) : null;
      const consent = [`${cycle === 'YEARLY' ? 'Yearly' : 'Monthly'} recurring payment of ₹${amount}`, `Access to ${creator && creator.author ? creator.author.display_name : 'the creator'}’s ${line(t.plan_name, 40)} content`, 'You can cancel anytime in My memberships'];
      if (m[2] === 'quote') { ok(res, { tier: tierDto(t, m[1]), creator, cycle: cycle.toLowerCase(), amount, currency: 'INR', wallet: w ? { balance: money(w.balance), sandbox: true } : null, consent, provider_ready: sandboxEnabled() }); return true; }
      if (!sandboxEnabled()) { fail(res, 503, 'PAYMENT_PROVIDER_REQUIRED', 'Payments aren’t connected yet. No money was taken.'); return true; }
      if (b.consent !== true) { fail(res, 400, 'CONSENT_REQUIRED', 'Please agree to the recurring payment first.'); return true; }
      const key = String(b.idempotency_key || '');
      const prior = await idemGet(vid, 'membership', key);
      if (prior === undefined) { fail(res, 400, 'VALIDATION', 'Missing request key. Please try again.'); return true; }
      if (prior) { ok(res, { ...prior, replayed: true }); return true; }
      if (limited(res, `v8-subscribe:${vid}`, 10, 60 * 60 * 1000)) return true;
      const client = await pool.connect(); let out;
      try {
        await client.query('BEGIN');
        await client.query(`SELECT pg_advisory_xact_lock(hashtext('v8sub:' || $1::text || ':' || $2::text))`, [vid, t.creator_user_id]);
        const existing = (await client.query(`SELECT id FROM howdi_connect_subscriptions WHERE subscriber_user_id=$1 AND creator_user_id=$2 AND status IN ('ACTIVE','PAST_DUE','TRIALING') AND (current_period_end IS NULL OR current_period_end>NOW() OR status='PAST_DUE')`, [vid, t.creator_user_id])).rows[0];
        if (existing) { await client.query('ROLLBACK'); fail(res, 409, 'ALREADY_MEMBER', 'You already have a membership with this creator. Manage it in My memberships.'); return true; }
        const paid = await charge(client, { payer: vid, payee: Number(t.creator_user_id), amount, kind: 'MEMBERSHIP', note: `${t.plan_name} ${cycle.toLowerCase()}` });
        if (!paid) { await client.query('ROLLBACK'); const w2 = await wallet(vid); fail(res, 402, 'INSUFFICIENT_BALANCE', `Your HPay balance (₹${money(w2 && w2.balance)}) is less than ₹${amount}. Nothing was charged.`); return true; }
        const interval = cycle === 'YEARLY' ? '1 year' : '1 month';
        const s = (await client.query(`INSERT INTO howdi_connect_subscriptions(subscriber_user_id,creator_user_id,plan_id,billing_cycle,status,amount,currency,current_period_end,v8_payment_ref) VALUES($1,$2,$3,$4,'ACTIVE',$5,'INR',NOW()+$6::interval,$7) RETURNING id::text`,
          [vid, t.creator_user_id, t.id, cycle, amount, interval, paid.reference])).rows[0].id;
        const fee = money(amount * FEE_RATE);
        await client.query(`INSERT INTO howdi_connect_subscription_ledger(subscription_id,creator_user_id,subscriber_user_id,event_type,gross_amount,platform_fee,creator_amount,currency,reference_code) VALUES($1,$2,$3,'SUBSCRIPTION_STARTED',$4,$5,$6,'INR',$7)`,
          [s, t.creator_user_id, vid, amount, fee, money(amount - fee), paid.reference]);
        const row = (await client.query(`SELECT ${SUB_COLS} FROM howdi_connect_subscriptions s JOIN howdi_connect_subscription_plans p ON p.id=s.plan_id WHERE s.id=$1`, [s])).rows[0];
        const sc = (await issue3('SUB', [s])).get(s);
        out = { membership: subDto(row, sc), receipt: { reference: paid.reference, amount, currency: 'INR', method: 'HPay balance (Preview/Test)', balance_after: paid.balance, at: new Date().toISOString() } };
        await idemPut(client, vid, 'membership', key, out);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      const me = await creatorSummary(vid, 0);
      await notify(Number(t.creator_user_id), 'MEMBERSHIP_NEW', `@${me && me.author ? me.author.public_username : 'someone'} joined ${line(t.plan_name, 40)}`, `₹${amount} ${cycle.toLowerCase()} · after the ${FEE_RATE * 100}% HOWDI fee ₹${money(amount - amount * FEE_RATE)} goes to Ready to settle.`, '/connect/creator?tab=memberships', vid);
      await notify(vid, 'MEMBERSHIP_STARTED', `Welcome to ${line(t.plan_name, 40)}`, `Receipt ${out.receipt.reference} · ₹${amount}`, '/connect/memberships');
      ok(res, out, 201); return true;
    }

    // ---------- subscriber: my memberships
    if (p === '/api/v8/me/memberships' && req.method === 'GET') {
      await renewDue(vid);
      const rows = (await pool.query(`SELECT ${SUB_COLS}, ${authorCols('a_u.id', 'a_')} FROM howdi_connect_subscriptions s JOIN howdi_connect_subscription_plans p ON p.id=s.plan_id ${authorJoins('s.creator_user_id', 'a_')}
        WHERE s.subscriber_user_id=$1 AND (s.status IN ('ACTIVE','PAST_DUE') OR (s.status='CANCELLED' AND s.ended_at>NOW()-interval '60 days')) AND s.v8_payment_ref IS NOT NULL ORDER BY s.status, s.started_at DESC LIMIT 50`, [vid])).rows;
      const refs = await issue3('SUB', rows.map((r) => r.skey));
      const w = sandboxEnabled() ? await wallet(vid) : null;
      ok(res, { items: rows.map((r) => subDto(r, refs.get(r.skey), { creator: authorDto(r, 'a_') })), wallet: w ? { balance: money(w.balance), sandbox: true } : null });
      return true;
    }
    if ((m = p.match(/^\/api\/v8\/subscriptions\/(SUB-[0-9A-F]{12})\/(cancel|resume|retry)$/)) && req.method === 'POST') {
      const sk = await resolve3(m[1], 'SUB');
      const s = sk ? (await pool.query(`SELECT ${SUB_COLS}, s.subscriber_user_id, s.creator_user_id FROM howdi_connect_subscriptions s JOIN howdi_connect_subscription_plans p ON p.id=s.plan_id WHERE s.id=$1`, [sk])).rows[0] : null;
      if (!s || Number(s.subscriber_user_id) !== vid) { fail(res, 404, 'NOT_FOUND', 'Membership not found.'); return true; }
      const act = m[2];
      if (act === 'cancel') {
        if (s.status !== 'ACTIVE' && s.status !== 'PAST_DUE') { fail(res, 409, 'NOT_ACTIVE', 'This membership isn’t active.'); return true; }
        if (s.status === 'PAST_DUE') await pool.query(`UPDATE howdi_connect_subscriptions SET status='CANCELLED', cancelled_at=NOW(), ended_at=NOW(), updated_at=NOW() WHERE id=$1`, [sk]);
        else await pool.query(`UPDATE howdi_connect_subscriptions SET cancel_at_period_end=TRUE, cancelled_at=NOW(), updated_at=NOW() WHERE id=$1`, [sk]);
        const me = await creatorSummary(vid, 0);
        await notify(Number(s.creator_user_id), 'MEMBERSHIP_CANCELLED', `@${me && me.author ? me.author.public_username : 'A member'} cancelled ${line(s.plan_name, 40)}`, 'Their access continues until the end of the paid period.', '/connect/creator?tab=memberships', vid);
      } else if (act === 'resume') {
        if (s.status !== 'ACTIVE' || !s.cancel_at_period_end) { fail(res, 409, 'NOT_CANCELLING', 'Nothing to resume.'); return true; }
        await pool.query(`UPDATE howdi_connect_subscriptions SET cancel_at_period_end=FALSE, cancelled_at=NULL, updated_at=NOW() WHERE id=$1`, [sk]);
      } else {
        if (s.status !== 'PAST_DUE') { fail(res, 409, 'NOT_PAST_DUE', 'This membership has no failed payment.'); return true; }
        if (!sandboxEnabled()) { fail(res, 503, 'PAYMENT_PROVIDER_REQUIRED', 'Payments aren’t connected yet. No money was taken.'); return true; }
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const lock = (await client.query(`SELECT status FROM howdi_connect_subscriptions WHERE id=$1 FOR UPDATE`, [sk])).rows[0];
          if (!lock || lock.status !== 'PAST_DUE') { await client.query('ROLLBACK'); fail(res, 409, 'NOT_PAST_DUE', 'Already retried.'); return true; }
          const paid = await charge(client, { payer: vid, payee: Number(s.creator_user_id), amount: money(s.amount), kind: 'MEMBERSHIP', note: `${s.plan_name} retry` });
          if (!paid) { await client.query('ROLLBACK'); fail(res, 402, 'INSUFFICIENT_BALANCE', 'Your HPay balance is still too low. Nothing was charged.'); return true; }
          await client.query(`UPDATE howdi_connect_subscriptions SET status='ACTIVE', current_period_start=NOW(), current_period_end=NOW()+$2::interval, v8_payment_ref=$3, v8_failed_at=NULL, updated_at=NOW() WHERE id=$1`, [sk, s.billing_cycle === 'YEARLY' ? '1 year' : '1 month', paid.reference]);
          const fee = money(Number(s.amount) * FEE_RATE);
          await client.query(`INSERT INTO howdi_connect_subscription_ledger(subscription_id,creator_user_id,subscriber_user_id,event_type,gross_amount,platform_fee,creator_amount,currency,reference_code) VALUES($1,$2,$3,'SUBSCRIPTION_RENEWED',$4,$5,$6,'INR',$7)`,
            [sk, s.creator_user_id, vid, money(s.amount), fee, money(Number(s.amount) - fee), paid.reference]);
          await client.query('COMMIT');
        } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      }
      const row = (await pool.query(`SELECT ${SUB_COLS} FROM howdi_connect_subscriptions s JOIN howdi_connect_subscription_plans p ON p.id=s.plan_id WHERE s.id=$1`, [sk])).rows[0];
      ok(res, { membership: subDto(row, m[1]) }); return true;
    }

    // ---------- creator workspace
    if (!p.startsWith('/api/v8/creator')) { fail(res, 404, 'NOT_FOUND', 'Not found.'); return true; }
    if (limited(res, `v8-creator:${vid}`, 240, 60000)) return true;

    if (p === '/api/v8/creator/workspace' && req.method === 'GET') {
      await renewDue(vid);
      const [me, e, tiers, drafts, sched, live, holds, copyright, strikes, link, members, cal] = await Promise.all([
        creatorSummary(vid, vid), earnings(vid),
        pool.query(`SELECT ${TIER_COLS} FROM howdi_connect_subscription_plans p WHERE p.creator_user_id=$1 AND p.is_active=TRUE ORDER BY p.price_monthly LIMIT 5`, [vid]),
        pool.query(`SELECT COUNT(*) n FROM howdi_v8_drafts WHERE user_id=$1`, [vid]),
        pool.query(`SELECT COUNT(*) n FROM howdi_community_posts WHERE user_id=$1 AND post_status='SCHEDULED' AND scheduled_for>NOW()`, [vid]),
        pool.query(`SELECT c.id::text k, c.name, c.topic, c.session_status, c.scheduled_for, c.live_thumbnail_data, c.community_type FROM howdi_connect_communities c WHERE c.owner_user_id=$1 AND c.community_type IN ('LIVE','SPACE') AND c.session_status IN ('SCHEDULED','LIVE') ORDER BY (c.session_status='LIVE') DESC, c.scheduled_for LIMIT 1`, [vid]),
        pool.query(`SELECT COUNT(*) n FROM howdi_v8_comment_holds WHERE creator_user_id=$1 AND status='HELD'`, [vid]),
        pool.query(`SELECT COUNT(*) n FROM howdi_connect_trust_moderation_queue q WHERE q.target_user_id=$1 AND q.reason='copyright' AND UPPER(COALESCE(q.status,'OPEN')) IN ('OPEN','PENDING','UNDER_REVIEW')`, [vid]).catch(() => ({ rows: [{ n: 0 }] })),
        pool.query(`SELECT COUNT(*) n FROM howdi_v8_creator_strikes WHERE user_id=$1 AND active=TRUE AND expires_at>NOW()`, [vid]),
        pool.query(`SELECT product_key FROM howdi_v8_creator_links WHERE user_id=$1`, [vid]),
        pool.query(`SELECT COUNT(*) n FROM howdi_connect_subscriptions WHERE creator_user_id=$1 AND status='ACTIVE' AND (current_period_end IS NULL OR current_period_end>NOW())`, [vid]),
        calendar(vid),
      ]);
      const tr = await issue3('TIER', tiers.rows.map((r) => r.tkey));
      let nextLive = null;
      if (live.rows[0]) {
        const l = live.rows[0]; const code = (await issue(l.community_type === 'SPACE' ? 'SPACE' : 'LIVE', [l.k])).get(l.k);
        nextLive = { title: line(l.name, 80), topic: line(l.topic, 120), state: l.session_status === 'LIVE' ? 'live' : 'scheduled', starts_at: iso(l.scheduled_for), cover: img(l.live_thumbnail_data), route: `/connect/${l.community_type === 'SPACE' ? 'spaces' : 'live'}/${code}` };
      }
      ok(res, { creator: me, stats: { followers: me ? me.followers : 0, members: count(members.rows[0].n), ready_to_settle: e.ready_to_settle, drafts: count(drafts.rows[0].n), scheduled: count(sched.rows[0].n) },
        tiers: tiers.rows.map((r) => tierDto(r, tr.get(r.tkey))).filter(Boolean), calendar: cal, next_live: nextLive,
        safeguards: { comments_held: count(holds.rows[0].n), copyright_review: count(copyright.rows[0].n), active_strikes: count(strikes.rows[0].n) },
        shop_link: link.rows[0] ? await productCard(link.rows[0].product_key) : null, payouts_ready: sandboxEnabled() });
      return true;
    }
    if (p === '/api/v8/creator/tiers' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT ${TIER_COLS} FROM howdi_connect_subscription_plans p WHERE p.creator_user_id=$1 AND p.is_active=TRUE ORDER BY p.price_monthly`, [vid])).rows;
      const refs = await issue3('TIER', rows.map((r) => r.tkey));
      const followers = (await pool.query(`SELECT COUNT(*) n FROM howdi_connect_follows WHERE following_user_id=$1`, [vid])).rows[0].n;
      ok(res, { free: { name: 'Free', description: 'Open to everyone', members: count(followers) }, tiers: rows.map((r) => tierDto(r, refs.get(r.tkey))).filter(Boolean), fee_rate: FEE_RATE });
      return true;
    }
    if ((p === '/api/v8/creator/tiers' && req.method === 'POST') || ((m = p.match(/^\/api\/v8\/creator\/tiers\/(TIR-[0-9A-F]{12})$/)) && req.method === 'PATCH')) {
      const b = (await getBody(req)) || {};
      const name = line(b.name, 60); const monthly = money(b.monthly); const yearly = b.yearly === undefined || b.yearly === '' ? money(monthly * 10) : money(b.yearly);
      const benefits = (Array.isArray(b.benefits) ? b.benefits : []).map((x) => line(x, 80)).filter(Boolean).slice(0, 8);
      if (p === '/api/v8/creator/tiers') {
        if (!name || name.length < 2) { fail(res, 400, 'VALIDATION', 'Give the tier a name.'); return true; }
        if (!(monthly >= 10 && monthly <= 50000)) { fail(res, 400, 'VALIDATION', 'Monthly price must be between ₹10 and ₹50,000.'); return true; }
        if (!(yearly >= monthly && yearly <= monthly * 12)) { fail(res, 400, 'VALIDATION', 'Yearly price must be between one and twelve months’ price.'); return true; }
        if (!benefits.length) { fail(res, 400, 'VALIDATION', 'Add at least one benefit.'); return true; }
        const n = (await pool.query(`SELECT COUNT(*) n FROM howdi_connect_subscription_plans WHERE creator_user_id=$1 AND is_active=TRUE`, [vid])).rows[0].n;
        if (Number(n) >= 3) { fail(res, 400, 'LIMIT', 'You can have up to 3 paid tiers.'); return true; }
        const code = `V8-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
        const k = (await pool.query(`INSERT INTO howdi_connect_subscription_plans(creator_user_id,plan_name,plan_code,description,price_monthly,price_yearly,currency,benefits) VALUES($1,$2,$3,$4,$5,$6,'INR',$7::jsonb) RETURNING id::text`,
          [vid, name, code, line(b.description, 200), monthly, yearly, JSON.stringify(benefits)])).rows[0].id;
        await pool.query(`UPDATE howdi_connect_profiles SET creator_mode=TRUE WHERE user_id=$1`, [vid]).catch(() => {});
        const row = (await pool.query(`SELECT ${TIER_COLS} FROM howdi_connect_subscription_plans p WHERE p.id=$1`, [k])).rows[0];
        ok(res, { tier: tierDto(row, (await issue3('TIER', [k])).get(k)) }, 201); return true;
      }
      const tk = await resolve3(m[1], 'TIER');
      const own = tk ? (await pool.query(`SELECT * FROM howdi_connect_subscription_plans WHERE id=$1 AND creator_user_id=$2 AND is_active=TRUE`, [tk, vid])).rows[0] : null;
      if (!own) { fail(res, 404, 'NOT_FOUND', 'Tier not found.'); return true; }
      const paused = typeof b.paused === 'boolean' ? b.paused : own.v8_paused;
      // price changes apply to new members only; existing members keep their price until they cancel
      await pool.query(`UPDATE howdi_connect_subscription_plans SET plan_name=COALESCE(NULLIF($2,''),plan_name), description=$3, benefits=CASE WHEN $4::int>0 THEN $5::jsonb ELSE benefits END,
          price_monthly=CASE WHEN $6::numeric>=10 THEN $6 ELSE price_monthly END, price_yearly=CASE WHEN $7::numeric>=10 THEN $7 ELSE price_yearly END, v8_paused=$8, updated_at=NOW() WHERE id=$1`,
        [tk, name, b.description === undefined ? own.description : line(b.description, 200), benefits.length, JSON.stringify(benefits), b.monthly === undefined ? 0 : monthly, b.yearly === undefined ? 0 : yearly, paused]);
      const row = (await pool.query(`SELECT ${TIER_COLS} FROM howdi_connect_subscription_plans p WHERE p.id=$1`, [tk])).rows[0];
      ok(res, { tier: tierDto(row, m[1]) }); return true;
    }
    if (p === '/api/v8/creator/subscribers' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT s.status, s.billing_cycle, s.started_at, s.cancel_at_period_end, s.current_period_end, p.plan_name, ${authorCols('a_u.id', 'a_')}
        FROM howdi_connect_subscriptions s JOIN howdi_connect_subscription_plans p ON p.id=s.plan_id ${authorJoins('s.subscriber_user_id', 'a_')}
        WHERE s.creator_user_id=$1 AND s.status IN ('ACTIVE','PAST_DUE') AND s.v8_payment_ref IS NOT NULL ORDER BY s.started_at DESC LIMIT 200`, [vid])).rows;
      ok(res, { items: rows.map((r) => { const a = authorDto(r, 'a_'); return a ? { member: a, tier: line(r.plan_name, 60), cycle: String(r.billing_cycle).toLowerCase(), since: iso(r.started_at),
        state: r.status === 'PAST_DUE' ? 'payment_failed' : r.cancel_at_period_end ? 'cancelling' : 'active' } : null; }).filter(Boolean) });
      return true;
    }
    if (p === '/api/v8/creator/content' && req.method === 'GET') {
      const kind = ['all', 'vibe', 'article', 'post', 'hype', 'tip'].includes(url.searchParams.get('kind')) ? url.searchParams.get('kind') : 'all';
      ok(res, { items: await contentList(vid, kind, 40) }); return true;
    }
    if (p === '/api/v8/creator/insights' && req.method === 'GET') {
      const items = await contentList(vid, 'all', 60);
      const sum = (k) => items.reduce((a, x) => a + (x.metrics[k] || 0), 0);
      const f = (await pool.query(`SELECT COUNT(*) FILTER (WHERE created_at>NOW()-interval '30 days') d30, COUNT(*) total FROM howdi_connect_follows WHERE following_user_id=$1`, [vid])).rows[0];
      const byKind = {}; for (const x of items) byKind[x.kind] = (byKind[x.kind] || 0) + 1;
      ok(res, { totals: { likes: sum('likes'), comments: sum('comments'), saves: sum('saves'), shares: sum('shares'), remixes: sum('remixes'), views: sum('views') },
        followers: { total: count(f.total), new_30d: count(f.d30) }, content_by_kind: byKind, top: [...items].sort((a, b) => (b.metrics.likes + b.metrics.saves) - (a.metrics.likes + a.metrics.saves)).slice(0, 5),
        note: 'Aggregates only — HOWDI never shows who viewed your content.' });
      return true;
    }
    if (p === '/api/v8/creator/earnings' && req.method === 'GET') {
      const e = await earnings(vid);
      const led = (await pool.query(`SELECT l.event_type, l.gross_amount, l.platform_fee, l.creator_amount, l.reference_code, l.created_at, p.plan_name FROM howdi_connect_subscription_ledger l
          LEFT JOIN howdi_connect_subscriptions s ON s.id=l.subscription_id LEFT JOIN howdi_connect_subscription_plans p ON p.id=s.plan_id
        WHERE l.creator_user_id=$1 AND l.reference_code LIKE 'HPY-%' ORDER BY l.created_at DESC LIMIT 50`, [vid])).rows;
      const tips = (await pool.query(`SELECT amount, txn_code, created_at, note FROM howdi_v8_ledger WHERE user_id=$1 AND direction='CREDIT' AND kind='LIVE_TIP' ORDER BY created_at DESC LIMIT 20`, [vid])).rows;
      const pays = (await pool.query(`SELECT id::text k, amount, status, reference, note, requested_at, decided_at FROM howdi_v8_creator_payouts WHERE creator_user_id=$1 ORDER BY requested_at DESC LIMIT 20`, [vid])).rows;
      const w = sandboxEnabled() ? await wallet(vid) : null;
      ok(res, { summary: e, hpay: w ? { linked: true, sandbox: true, balance: money(w.balance) } : { linked: false },
        ledger: [...led.map((r) => ({ type: r.event_type === 'SUBSCRIPTION_RENEWED' ? 'renewal' : 'membership', label: line(r.plan_name || 'Membership', 60), gross: money(r.gross_amount), fee: money(r.platform_fee), net: money(r.creator_amount), reference: r.reference_code, at: iso(r.created_at), settles: 'ready_to_settle' })),
          ...tips.map((r) => ({ type: 'tip', label: 'Live tip', gross: money(r.amount), fee: 0, net: money(r.amount), reference: r.txn_code, at: iso(r.created_at), settles: 'hpay_instant' }))].sort((a, b) => String(b.at).localeCompare(String(a.at))),
        payouts: pays.map((r) => ({ amount: money(r.amount), status: r.status.toLowerCase(), reference: r.reference, note: r.note || null, requested_at: iso(r.requested_at), decided_at: iso(r.decided_at) })) });
      return true;
    }
    if (p === '/api/v8/creator/payouts' && req.method === 'POST') {
      if (!sandboxEnabled()) { fail(res, 503, 'PAYMENT_PROVIDER_REQUIRED', 'Payouts aren’t connected yet.'); return true; }
      const b = (await getBody(req)) || {}; const key = String(b.idempotency_key || '');
      const prior = await idemGet(vid, 'payout', key);
      if (prior === undefined) { fail(res, 400, 'VALIDATION', 'Missing request key. Please try again.'); return true; }
      if (prior) { ok(res, { ...prior, replayed: true }); return true; }
      const client = await pool.connect(); let out;
      try {
        await client.query('BEGIN');
        await client.query(`SELECT pg_advisory_xact_lock(hashtext('v8payout:' || $1::text))`, [vid]);
        const e = await earnings(vid); const amount = b.amount === undefined ? e.ready_to_settle : money(b.amount);
        if (!(amount >= MIN_PAYOUT)) { await client.query('ROLLBACK'); fail(res, 400, 'BELOW_MINIMUM', `The minimum payout is ₹${MIN_PAYOUT}.`); return true; }
        if (amount > e.ready_to_settle) { await client.query('ROLLBACK'); fail(res, 400, 'OVER_BALANCE', `You have ₹${e.ready_to_settle} ready to settle.`); return true; }
        const ref = txn('PYO');
        await client.query(`INSERT INTO howdi_v8_creator_payouts(creator_user_id,amount,reference) VALUES($1,$2,$3)`, [vid, amount, ref]);
        out = { payout: { amount, status: 'requested', reference: ref, requested_at: new Date().toISOString() } };
        await idemPut(client, vid, 'payout', key, out);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      await notify(vid, 'PAYOUT_REQUESTED', `Payout of ₹${out.payout.amount} requested`, `Reference ${out.payout.reference}. HOWDI finance reviews payouts within 2 working days.`, '/connect/creator?tab=earnings');
      ok(res, out, 201); return true;
    }

    // drafts
    if (p === '/api/v8/creator/drafts' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT id::text k, kind, title, ready, planned_for, updated_at FROM howdi_v8_drafts WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 50`, [vid])).rows;
      const refs = await issue3('DRAFT', rows.map((r) => r.k));
      ok(res, { items: rows.map((r) => ({ key: refs.get(r.k), kind: r.kind, title: r.title || 'Untitled', ready: r.ready, planned_for: iso(r.planned_for), saved_at: iso(r.updated_at) })) });
      return true;
    }
    if ((p === '/api/v8/creator/drafts' && req.method === 'POST') || ((m = p.match(/^\/api\/v8\/creator\/drafts\/(DRF-[0-9A-F]{12})$/)) && ['GET', 'PUT', 'DELETE'].includes(req.method))) {
      let dk = null;
      if (m) { dk = await resolve3(m[1], 'DRAFT'); const own = dk ? (await pool.query(`SELECT * FROM howdi_v8_drafts WHERE id=$1 AND user_id=$2`, [dk, vid])).rows[0] : null; if (!own) { fail(res, 404, 'NOT_FOUND', 'Draft not found.'); return true; }
        if (req.method === 'GET') { ok(res, { draft: { key: m[1], kind: own.kind, title: own.title, ready: own.ready, planned_for: iso(own.planned_for), payload: own.payload, saved_at: iso(own.updated_at) } }); return true; }
        if (req.method === 'DELETE') { await pool.query(`DELETE FROM howdi_v8_drafts WHERE id=$1 AND user_id=$2`, [dk, vid]); ok(res, { deleted: true }); return true; } }
      const b = (await getBody(req)) || {};
      const kind = ['vibe', 'story', 'article', 'hype', 'tip', 'post'].includes(b.kind) ? b.kind : null;
      if (!kind) { fail(res, 400, 'VALIDATION', 'Choose what you’re creating.'); return true; }
      const payload = b.payload && typeof b.payload === 'object' ? b.payload : {};
      const raw = JSON.stringify(payload); if (raw.length > 60000) { fail(res, 413, 'TOO_LARGE', 'Drafts keep text and settings; upload media when you publish.'); return true; }
      const planned = b.planned_for ? new Date(b.planned_for) : null;
      const plannedOk = planned && Number.isFinite(planned.getTime()) ? planned : null;
      if (!dk) {
        const n = (await pool.query(`SELECT COUNT(*) n FROM howdi_v8_drafts WHERE user_id=$1`, [vid])).rows[0].n;
        if (Number(n) >= 50) { fail(res, 400, 'LIMIT', 'You have 50 drafts. Publish or delete some first.'); return true; }
        dk = (await pool.query(`INSERT INTO howdi_v8_drafts(user_id,kind,title,payload,ready,planned_for) VALUES($1,$2,$3,$4::jsonb,$5,$6) RETURNING id::text`, [vid, kind, line(b.title, 160), raw, b.ready === true, plannedOk])).rows[0].id;
      } else await pool.query(`UPDATE howdi_v8_drafts SET kind=$3, title=$4, payload=$5::jsonb, ready=$6, planned_for=$7, updated_at=NOW() WHERE id=$1 AND user_id=$2`, [dk, vid, kind, line(b.title, 160), raw, b.ready === true, plannedOk]);
      ok(res, { draft: { key: (await issue3('DRAFT', [dk])).get(String(dk)), saved_at: new Date().toISOString() } }, m ? 200 : 201); return true;
    }

    // safety
    if (p === '/api/v8/creator/safety' && (req.method === 'GET' || req.method === 'PUT')) {
      if (req.method === 'PUT') {
        const b = (await getBody(req)) || {};
        const list = (x) => [...new Set((Array.isArray(x) ? x : []).map((w) => line(w, 40).toLowerCase()).filter((w) => w.length >= 2))].slice(0, 100);
        const mentions = ['everyone', 'following', 'members', 'nobody'].includes(b.mentions) ? b.mentions : 'everyone';
        await pool.query(`INSERT INTO howdi_v8_creator_safety(user_id,muted_words,blocked_phrases,mentions,sensitive_default) VALUES($1,$2::jsonb,$3::jsonb,$4,$5)
          ON CONFLICT(user_id) DO UPDATE SET muted_words=EXCLUDED.muted_words, blocked_phrases=EXCLUDED.blocked_phrases, mentions=EXCLUDED.mentions, sensitive_default=EXCLUDED.sensitive_default, updated_at=NOW()`,
          [vid, JSON.stringify(list(b.muted_words)), JSON.stringify(list(b.blocked_phrases)), mentions, b.sensitive_default === true]);
        await audit(vid, 'SAFETY_UPDATED', 'Muted words / blocked phrases / mentions updated');
      }
      const s = (await pool.query(`SELECT * FROM howdi_v8_creator_safety WHERE user_id=$1`, [vid])).rows[0] || {};
      ok(res, { safety: { muted_words: benefitsOf(s.muted_words || []), blocked_phrases: benefitsOf(s.blocked_phrases || []), mentions: s.mentions || 'everyone', sensitive_default: s.sensitive_default === true } });
      return true;
    }
    if (p === '/api/v8/creator/held-comments' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT h.id::text k, h.kind, h.matched, h.created_at, COALESCE(pc.content, vc.comment_text) body, COALESCE(pc.user_id, NULLIF(vc.user_id,'')::bigint) author_id
        FROM howdi_v8_comment_holds h LEFT JOIN howdi_community_comments pc ON h.kind='post' AND pc.id::text=h.comment_key LEFT JOIN vibe_comments vc ON h.kind='vibe' AND vc.id::text=h.comment_key
        WHERE h.creator_user_id=$1 AND h.status='HELD' ORDER BY h.created_at DESC LIMIT 100`, [vid])).rows;
      const refs = await issue3('HOLD', rows.map((r) => r.k));
      const authors = new Map();
      for (const r of rows) if (r.author_id && !authors.has(String(r.author_id))) { const a = await creatorSummary(Number(r.author_id), vid); authors.set(String(r.author_id), a ? a.author : null); }
      ok(res, { items: rows.map((r) => ({ key: refs.get(r.k), on: r.kind, text: line(r.body, 300), matched: r.matched, author: authors.get(String(r.author_id)) || null, at: iso(r.created_at) })) });
      return true;
    }
    if ((m = p.match(/^\/api\/v8\/creator\/held-comments\/(HLD-[0-9A-F]{12})\/(approve|remove)$/)) && req.method === 'POST') {
      const hk = await resolve3(m[1], 'HOLD');
      const r = hk ? (await pool.query(`UPDATE howdi_v8_comment_holds SET status=$3, decided_at=NOW() WHERE id=$1 AND creator_user_id=$2 AND status='HELD' RETURNING kind`, [hk, vid, m[2] === 'approve' ? 'APPROVED' : 'REMOVED'])).rows[0] : null;
      if (!r) { fail(res, 404, 'NOT_FOUND', 'Comment not found.'); return true; }
      await audit(vid, m[2] === 'approve' ? 'HELD_COMMENT_APPROVED' : 'HELD_COMMENT_REMOVED', `${r.kind} comment`);
      ok(res, { decided: m[2] }); return true;
    }
    if (p === '/api/v8/creator/moderation' && req.method === 'GET') {
      const reports = (await pool.query(`SELECT reason, UPPER(COALESCE(status,'OPEN')) st, COUNT(*) n FROM howdi_connect_trust_moderation_queue WHERE target_user_id=$1 GROUP BY 1,2`, [vid]).catch(() => ({ rows: [] }))).rows;
      const strikes = (await pool.query(`SELECT id::text k, reason, details, created_at, expires_at FROM howdi_v8_creator_strikes WHERE user_id=$1 AND active=TRUE AND expires_at>NOW() ORDER BY created_at DESC`, [vid])).rows;
      const appeals = (await pool.query(`SELECT subject, status, decision_note, created_at, decided_at FROM howdi_v8_appeals WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10`, [vid])).rows;
      const auditRows = (await pool.query(`SELECT action, detail, created_at FROM howdi_v8_moderation_audit WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`, [vid])).rows;
      const open = (r) => ['OPEN', 'PENDING', 'UNDER_REVIEW'].includes(r.st);
      ok(res, { counts: { reported: reports.reduce((a, r) => a + (open(r) ? count(r.n) : 0), 0), under_review: reports.filter((r) => r.st === 'UNDER_REVIEW').reduce((a, r) => a + count(r.n), 0),
          copyright: reports.filter((r) => r.reason === 'copyright' && open(r)).reduce((a, r) => a + count(r.n), 0), manual_review: 0, active_strikes: strikes.length,
          held: count((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_comment_holds WHERE creator_user_id=$1 AND status='HELD'`, [vid])).rows[0].n) },
        strikes: strikes.map((s, i) => ({ index: i + 1, reason: s.reason, details: s.details || null, issued_at: iso(s.created_at), expires_at: iso(s.expires_at) })),
        appeals: appeals.map((a) => ({ subject: a.subject, status: a.status.toLowerCase(), note: a.decision_note || null, at: iso(a.created_at), decided_at: iso(a.decided_at) })),
        audit: auditRows.map((a) => ({ action: a.action.toLowerCase(), detail: a.detail, at: iso(a.created_at) })) });
      return true;
    }
    if (p === '/api/v8/creator/appeals' && req.method === 'POST') {
      if (limited(res, `v8-appeal:${vid}`, 5, 24 * 60 * 60 * 1000)) return true;
      const b = (await getBody(req)) || {}; const subject = line(b.subject, 120); const details = text(b.details, 1000);
      if (subject.length < 4 || details.length < 10) { fail(res, 400, 'VALIDATION', 'Tell us what happened (at least 10 characters).'); return true; }
      const strike = b.strike_index ? (await pool.query(`SELECT id FROM howdi_v8_creator_strikes WHERE user_id=$1 AND active=TRUE ORDER BY created_at DESC OFFSET $2 LIMIT 1`, [vid, Math.max(0, Number(b.strike_index) - 1)])).rows[0] : null;
      await pool.query(`INSERT INTO howdi_v8_appeals(user_id,strike_id,subject,details) VALUES($1,$2,$3,$4)`, [vid, strike ? strike.id : null, subject, details]);
      await audit(vid, 'APPEAL_SUBMITTED', subject);
      ok(res, { submitted: true, message: 'Appeal sent. The HOWDI safety team replies within 3 working days.' }, 201); return true;
    }
    if (p === '/api/v8/creator/shop-link') {
      if (req.method === 'GET') { const l = (await pool.query(`SELECT product_key FROM howdi_v8_creator_links WHERE user_id=$1`, [vid])).rows[0]; ok(res, { link: l ? await productCard(l.product_key) : null }); return true; }
      if (req.method === 'DELETE') { await pool.query(`DELETE FROM howdi_v8_creator_links WHERE user_id=$1`, [vid]); ok(res, { link: null }); return true; }
      if (req.method === 'PUT') {
        const b = (await getBody(req)) || {}; const code = String(b.product || '');
        const r = k5aResolve && /^PRD-[0-9A-F]{12}$/.test(code) ? await k5aResolve(code, ['PRODUCT']) : null;
        const card = r ? await productCard(r.entity_key) : null;
        if (!card) { fail(res, 404, 'NOT_FOUND', 'That product isn’t available in Shop.'); return true; }
        await pool.query(`INSERT INTO howdi_v8_creator_links(user_id,product_key) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET product_key=EXCLUDED.product_key, created_at=NOW()`, [vid, String(r.entity_key)]);
        ok(res, { link: card }); return true;
      }
    }
    fail(res, 404, 'NOT_FOUND', 'Not found.'); return true;
  }

  // canonical Shop product card (the Shop S1 public gate); null when the product is no longer available
  async function productCard(productKey) {
    const r = (await pool.query(`SELECT p.id::text k, p.name, p.price, p.mrp, p.image_urls, p.short_description FROM vendor_products p JOIN vendor_profiles v ON v.id=p.vendor_profile_id
      WHERE p.id=$1::bigint AND p.status='published' AND p.archived_at IS NULL AND COALESCE(v.status,'active')='active'`, [productKey]).catch(() => ({ rows: [] }))).rows[0];
    if (!r || !k5aIssue) return null;
    const code = (await k5aIssue('PRODUCT', [r.k])).get(r.k);
    let im = r.image_urls; if (typeof im === 'string') { try { im = JSON.parse(im); } catch { im = [im]; } }
    return code ? { title: line(r.name, 80), subtitle: line(r.short_description, 80), price: money(r.price), image: Array.isArray(im) ? img(im[0]) : null, route: `/shop/products/${code}`,
      disclosure: 'Includes my creator link · I may earn a small commission' } : null;
  }
  async function calendar(uid) {
    const posts = (await pool.query(`SELECT p.id::text pkey, p.post_type, p.article_title, p.content, p.scheduled_for, p.media_gallery, p.article_cover_data FROM howdi_community_posts p
      WHERE p.user_id=$1 AND p.post_status='SCHEDULED' AND p.scheduled_for>NOW() ORDER BY p.scheduled_for LIMIT 10`, [uid])).rows;
    const drafts = (await pool.query(`SELECT id::text k, kind, title, ready, planned_for, payload, updated_at FROM howdi_v8_drafts WHERE user_id=$1 ORDER BY COALESCE(planned_for, updated_at) LIMIT 10`, [uid])).rows;
    const dr = await issue3('DRAFT', drafts.map((d) => d.k));
    const out = [];
    for (const r of posts) { let g = r.media_gallery; if (typeof g === 'string') { try { g = JSON.parse(g); } catch { g = []; } }
      out.push({ at: iso(r.scheduled_for), kind: String(r.post_type || 'POST').toLowerCase(), title: line(r.article_title || r.content, 70), sub: line(r.content, 80), state: 'scheduled', cover: img(r.article_cover_data) || (Array.isArray(g) && g[0] ? img(g[0].url) : null) }); }
    for (const d of drafts) out.push({ at: iso(d.planned_for || d.updated_at), kind: d.kind, title: d.title || 'Untitled draft', sub: line(d.payload && (d.payload.caption || d.payload.text || d.payload.excerpt), 80), state: d.ready ? 'ready' : 'draft', draft: dr.get(d.k), cover: d.payload && img(d.payload.cover) });
    return out.sort((a, b) => String(a.at).localeCompare(String(b.at))).slice(0, 12);
  }

  return { ensureSchema, handle, _internal: { memberSql, screenComment, heldHiddenSql, renewDue } };
}

module.exports = { createConnectV8Creator };
