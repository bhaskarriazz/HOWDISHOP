'use strict';
// =====================================================================================
// HOWDI V8 — MESSAGES with in-chat HPay (board V8__18 Messages Inbox & Safety; register CON-009..012, MSG-002/003/009/011/015)
// Built on the existing Connect tables (howdi_connect_conversations / _members / _messages) plus the V8 Preview/Test HPay
// wallet + ledger (howdi_v8_wallets / howdi_v8_ledger, shared with Live tips and memberships).
//
//   GET  /api/v8/messages/eligibility/{@h}           can I message them: direct · request · no (+ plain-language reason)
//   GET  /api/v8/conversations?tab=all|requests&q=   inbox: last message, unread, muted, request state
//   POST /api/v8/conversations                       {handle, text} direct (reuses an existing chat) · {group:{title, handles[]}}
//   GET  /api/v8/conversations/{CNV}                 detail: members + roles, my role, request state, muted
//   GET|POST /api/v8/conversations/{CNV}/messages    history (before=) · send {text, imageData?, idempotency_key}
//   POST /api/v8/conversations/{CNV}/read · /mute {on} · /request/accept|decline|block · /report {reason}
//   PATCH /api/v8/conversations/{CNV}                group rename (admin) · POST|DELETE …/members[/@h] add · remove / leave
//   POST /api/v8/conversations/{CNV}/members/{@h}/admin  owner toggles admin
//   POST /api/v8/conversations/{CNV}/call-log {call} history line for a finished voice/video call (read from the call record)
//   GET  /api/v8/conversations?filter=unread|groups|payments   inbox filters
//   PATCH|DELETE /api/v8/chat-messages/{CMS}         edit own within 15 min (versions kept for safety) · delete own
//   POST /api/v8/chat-messages/{CMS}/open            view-once photo / video: each recipient can open it once (MSG-007)
//   POST /api/v8/conversations/{CNV}/auto-erase {hours: 24|0}  per-chat 24-hour auto-erase, both sides told (MSG-008)
//   send {card:{type: product|community|worker, ref}}  rich cards resolved server-side for every viewer (MSG-004/005/006)
//   GET|POST /api/v8/hpay/pin                        HPay PIN status · set / change (scrypt, 5 tries then 15 min lock)
//   POST /api/v8/conversations/{CNV}/payments/quote  review: amount, fee, total, balance, counterpart — nothing moves
//   POST /api/v8/conversations/{CNV}/payments        {kind: send|request, amount, note, pin (send), idempotency_key}
//   POST /api/v8/payments/{PAY}/pay|decline|cancel|remind   payer pays / declines a request · requester cancels / reminds
//
// Rules: session-only actor; public codes (CNV / CMS / PAY) and @handles only; blocks both ways; one idempotency key per
// payment attempt (double taps can't charge twice); every money movement is one transaction with a double-entry ledger row.
// Money is the Preview/Test sandbox only: without it payments answer 503 PAYMENT_PROVIDER_REQUIRED.
// =====================================================================================
const crypto = require('node:crypto');
const { mediaUrl, isPublicWorkerCode } = require('./connect-home-k5a.cjs');

function createConnectV8Messages(deps) {
  const { pool, getBody, clientIp, notify, wallet, sandboxEnabled, logger = console } = deps;
  const resolveK5ARef = deps.resolveK5ARef || (async () => null);
  const H = deps.helpers;
  const { authorCols, authorJoins, authorDto, blockedSql, viewer, limited, ok, fail, userIdByHandle, saveMedia, savePrivate, readPrivate, deletePrivate } = H;
  const hooks = {}; // utilities module registers utilityDto(orderId, viewerId) for 'utility' messages
  const text = (v, max) => String(v ?? '').normalize('NFKC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max);
  const line = (v, max) => text(v, max * 2).replace(/\s+/g, ' ').slice(0, max);
  const iso = (v) => { if (!v) return null; const d = new Date(v); return Number.isFinite(d.getTime()) ? d.toISOString() : null; };
  const money = (n) => Math.round(Number(n || 0) * 100) / 100;
  const EDIT_WINDOW_MS = 15 * 60000;
  const PAY_MIN = 1, PAY_MAX = 10000, DAY_MAX = 25000, REQUEST_DAYS = 7;
  const REASONS = ['spam', 'harassment', 'hate', 'violence', 'nudity', 'scam', 'misinformation', 'copyright', 'self-harm', 'other'];

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_refs2(entity_type VARCHAR(16) NOT NULL, entity_key VARCHAR(64) NOT NULL, public_code VARCHAR(24) NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(entity_type, entity_key))`);
    await pool.query(`ALTER TABLE howdi_connect_conversations ADD COLUMN IF NOT EXISTS title VARCHAR(80)`);
    await pool.query(`ALTER TABLE howdi_connect_conversations ADD COLUMN IF NOT EXISTS created_by BIGINT`);
    await pool.query(`ALTER TABLE howdi_connect_conversations ADD COLUMN IF NOT EXISTS request_status VARCHAR(10)`); // NULL (open) · PENDING · DECLINED
    await pool.query(`ALTER TABLE howdi_connect_conversations ADD COLUMN IF NOT EXISTS requested_by BIGINT`);
    await pool.query(`ALTER TABLE howdi_connect_conversation_members ADD COLUMN IF NOT EXISTS role VARCHAR(8) NOT NULL DEFAULT 'member'`);
    await pool.query(`ALTER TABLE howdi_connect_conversation_members ADD COLUMN IF NOT EXISTS muted BOOLEAN NOT NULL DEFAULT FALSE`);
    await pool.query(`ALTER TABLE howdi_connect_conversation_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE howdi_connect_messages ADD COLUMN IF NOT EXISTS kind VARCHAR(10) NOT NULL DEFAULT 'text'`);
    await pool.query(`ALTER TABLE howdi_connect_messages ADD COLUMN IF NOT EXISTS payment_id BIGINT`);
    await pool.query(`ALTER TABLE howdi_connect_messages ADD COLUMN IF NOT EXISTS idem_key VARCHAR(64)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS howdi_connect_messages_idem_uq ON howdi_connect_messages(sender_user_id, idem_key) WHERE idem_key IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_connect_messages_conv_id_idx ON howdi_connect_messages(conversation_id, id DESC)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_message_edits(id BIGSERIAL PRIMARY KEY, message_id BIGINT NOT NULL, previous_text TEXT NOT NULL, edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_message_reports(id BIGSERIAL PRIMARY KEY, conversation_id BIGINT NOT NULL, message_id BIGINT, reporter_user_id BIGINT NOT NULL, reason VARCHAR(20) NOT NULL, details VARCHAR(1000), snapshot JSONB NOT NULL DEFAULT '[]'::jsonb, status VARCHAR(10) NOT NULL DEFAULT 'OPEN', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_chat_payments(id BIGSERIAL PRIMARY KEY, conversation_id BIGINT NOT NULL, kind VARCHAR(8) NOT NULL CHECK (kind IN ('SEND','REQUEST')),
      payer_user_id BIGINT NOT NULL, payee_user_id BIGINT NOT NULL, created_by BIGINT NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK (amount>0), note VARCHAR(140),
      status VARCHAR(10) NOT NULL, txn_code VARCHAR(24), failure VARCHAR(160), expires_at TIMESTAMPTZ, reminded_at TIMESTAMPTZ, decided_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_chat_payments_conv_idx ON howdi_v8_chat_payments(conversation_id, created_at DESC)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_pay_idem(user_id BIGINT NOT NULL, idem_key VARCHAR(64) NOT NULL, payment_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id, idem_key))`);
    await pool.query(`ALTER TABLE howdi_connect_messages ADD COLUMN IF NOT EXISTS view_once BOOLEAN NOT NULL DEFAULT FALSE`);
    await pool.query(`ALTER TABLE howdi_connect_messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE howdi_connect_messages ADD COLUMN IF NOT EXISTS card_type VARCHAR(12)`);
    await pool.query(`ALTER TABLE howdi_connect_messages ADD COLUMN IF NOT EXISTS card_ref VARCHAR(100)`);
    await pool.query(`ALTER TABLE howdi_connect_messages ADD COLUMN IF NOT EXISTS utility_id BIGINT`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_message_opens(message_id BIGINT NOT NULL, user_id BIGINT NOT NULL, opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(message_id, user_id))`);
    await pool.query(`ALTER TABLE howdi_connect_conversations ADD COLUMN IF NOT EXISTS auto_erase_hours INT`);
    await pool.query(`ALTER TABLE howdi_connect_conversations ADD COLUMN IF NOT EXISTS auto_erase_by BIGINT`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_hpay_pins(user_id BIGINT PRIMARY KEY, pin_hash VARCHAR(128) NOT NULL, salt VARCHAR(32) NOT NULL, failed INT NOT NULL DEFAULT 0, locked_until TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  }

  // ------------------------------------------------------------ public codes (shared refs2 table)
  const PFX = { CONV: 'CNV', CMSG: 'CMS', PAY: 'PAY', UTL: 'UTL', WBKG: 'BKG', WAPP: 'WAP', VAPP: 'VAP', SORD: 'ORD', SRET: 'RTN', LCRS: 'CRS', LLSN: 'LSN', RAPP: 'RAP', RRPT: 'RPT', LEVD: 'EVD' };
  const CODE = /^(CNV|CMS|PAY|UTL|BKG|WAP|VAP|ORD|RTN|CRS|LSN|RAP|RPT|EVD)-[0-9A-F]{12}$/;
  async function issue(type, keys) {
    const uniq = [...new Set(keys.map(String))]; const out = new Map(); if (!uniq.length) return out;
    for (let a = 0; a < 4; a++) {
      const codes = uniq.map(() => `${PFX[type]}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`);
      try { await pool.query(`INSERT INTO howdi_v8_refs2(entity_type,entity_key,public_code) SELECT $1,x.k,x.c FROM unnest($2::text[],$3::text[]) x(k,c) ON CONFLICT DO NOTHING`, [type, uniq, codes]); break; }
      catch (e) { if (!(e && e.code === '23505') || a === 3) throw e; }
    }
    for (const r of (await pool.query(`SELECT entity_key, public_code FROM howdi_v8_refs2 WHERE entity_type=$1 AND entity_key=ANY($2::text[])`, [type, uniq])).rows) out.set(String(r.entity_key), r.public_code);
    return out;
  }
  async function resolve(code, type) {
    if (!CODE.test(String(code)) || !String(code).startsWith(PFX[type])) return null;
    const r = (await pool.query(`SELECT entity_key FROM howdi_v8_refs2 WHERE public_code=$1 AND entity_type=$2`, [code, type])).rows[0];
    return r ? Number(r.entity_key) : null;
  }

  // ------------------------------------------------------------ who can message whom
  async function eligibility(vid, target) {
    if (!target || target === vid) return { can: 'no', reason: 'You can’t message yourself.' };
    if ((await pool.query(`SELECT ${blockedSql('$1::bigint', '$2::bigint')} b`, [vid, target])).rows[0].b) return { can: 'no', reason: 'You can’t message this person.' };
    const p = (await pool.query(`SELECT COALESCE(contact_permission,'EVERYONE') cp FROM howdi_connect_profiles WHERE user_id=$1`, [target])).rows[0];
    const mode = String(p ? p.cp : 'EVERYONE').toUpperCase();
    const follows = async (a, b) => (await pool.query(`SELECT 1 FROM howdi_connect_follows WHERE follower_user_id=$1 AND following_user_id=$2`, [a, b])).rowCount > 0;
    if (mode === 'NO_ONE') return { can: 'no', reason: 'This person isn’t accepting new messages.' };
    if (mode === 'EVERYONE') return { can: 'direct', reason: 'Anyone can message this person.' };
    if (mode === 'FOLLOWERS' && await follows(vid, target)) return { can: 'direct', reason: 'You follow them, so you can message them.' };
    if (mode === 'FOLLOWING' && await follows(target, vid)) return { can: 'direct', reason: 'They follow you, so you can message them.' };
    return { can: 'request', reason: mode === 'FOLLOWERS' ? 'They only accept messages from followers. Your first message arrives as a request they can accept or decline.' : 'They only accept messages from people they follow. Your first message arrives as a request they can accept or decline.' };
  }

  // ------------------------------------------------------------ conversation loading
  const CONV_SQL = `SELECT c.id, c.conversation_type, c.title, c.request_status, c.requested_by, c.created_by, c.updated_at, c.auto_erase_hours, c.auto_erase_by,
      me.role my_role, me.muted my_muted, me.last_read_at my_read
    FROM howdi_connect_conversations c JOIN howdi_connect_conversation_members me ON me.conversation_id=c.id AND me.user_id=$1::bigint AND me.left_at IS NULL`;
  async function convFor(vid, cid) { return (await pool.query(`${CONV_SQL} WHERE c.id=$2`, [vid, cid])).rows[0] || null; }
  async function members(cid, vid) {
    const rows = (await pool.query(`SELECT m.user_id uid, m.role, m.last_read_at, (m.user_id=$2::bigint) me, ${authorCols('a_u.id', 'a_')}
      FROM howdi_connect_conversation_members m ${authorJoins('m.user_id', 'a_')} WHERE m.conversation_id=$1 AND m.left_at IS NULL ORDER BY (m.role='owner') DESC, (m.role='admin') DESC, m.created_at`, [cid, vid])).rows;
    return rows.map((r) => ({ uid: Number(r.uid), me: r.me === true, role: r.role, last_read_at: r.last_read_at, person: authorDto(r, 'a_') })).filter((x) => x.person);
  }
  function convTitle(c, others) { if (c.conversation_type === 'GROUP') return line(c.title, 80) || 'Group chat'; const o = others[0]; return o ? o.person.display_name : 'Conversation'; }
  async function convDto(c, vid, code, ms) {
    const others = ms.filter((m) => !m.me);
    const blocked = c.conversation_type !== 'GROUP' && others[0] ? (await pool.query(`SELECT ${blockedSql('$1::bigint', '$2::bigint')} b`, [vid, others[0].uid])).rows[0].b : false;
    const req = c.request_status === 'PENDING' ? (Number(c.requested_by) === vid ? 'sent' : 'received') : c.request_status === 'DECLINED' ? (Number(c.requested_by) === vid ? 'declined_by_them' : 'declined') : null;
    return {
      public_key: code, kind: c.conversation_type === 'GROUP' ? 'group' : 'direct', title: convTitle(c, others),
      members: ms.map((m) => ({ ...m.person, role: m.role, me: m.me })), member_count: ms.length,
      my_role: c.my_role || 'member', muted: c.my_muted === true, request: req, blocked,
      can_send: !blocked && req !== 'declined' && req !== 'declined_by_them' && req !== 'received',
      can_pay: c.conversation_type !== 'GROUP' && !blocked && !req,
      auto_erase: c.auto_erase_hours ? { hours: Number(c.auto_erase_hours), set_by: (ms.find((x) => x.uid === Number(c.auto_erase_by)) || {}).person?.public_username || null, by_me: Number(c.auto_erase_by) === vid } : null,
      can_auto_erase: c.conversation_type !== 'GROUP' || ['owner', 'admin'].includes(c.my_role),
      safety: { encryption: 'Encrypted in transit', retention: c.auto_erase_hours ? `Auto-erase is on: new messages disappear ${Number(c.auto_erase_hours)} hours after they’re sent (payments and receipts stay in HPay history). If you report a chat,` : 'Messages stay until someone deletes them. If you report a chat, HOWDI’s safety team sees the reported messages and any earlier versions of edited messages.' },
    };
  }

  // ------------------------------------------------------------ messages
  async function payDto(p, vid) {
    if (!p) return null;
    const code = (await issue('PAY', [p.id])).get(String(p.id));
    const payer = (await pool.query(`SELECT ${authorCols('a_u.id', 'a_')} FROM (SELECT $1::bigint u) z ${authorJoins('z.u', 'a_')}`, [p.payer_user_id])).rows[0];
    const payee = (await pool.query(`SELECT ${authorCols('a_u.id', 'a_')} FROM (SELECT $1::bigint u) z ${authorJoins('z.u', 'a_')}`, [p.payee_user_id])).rows[0];
    const st = expired(p) ? 'expired' : String(p.status).toLowerCase();
    const iAmPayer = Number(p.payer_user_id) === vid; const iAmPayee = Number(p.payee_user_id) === vid;
    return {
      public_key: code, kind: p.kind === 'SEND' ? 'send' : 'request', amount: money(p.amount), currency: 'INR', note: p.note || null, status: st,
      payer: payer ? authorDto(payer, 'a_') : null, payee: payee ? authorDto(payee, 'a_') : null, reference: p.txn_code || null, failure: p.failure || null,
      created_at: iso(p.created_at), decided_at: iso(p.decided_at), expires_at: iso(p.expires_at), reminded_at: iso(p.reminded_at),
      mine: Number(p.created_by) === vid, role: iAmPayer ? 'payer' : iAmPayee ? 'payee' : 'viewer',
      actions: p.kind === 'REQUEST' && st === 'pending' ? (iAmPayer ? ['pay', 'decline'] : iAmPayee ? ['remind', 'cancel'] : []) : [],
      sandbox: true,
    };
  }
  // ------------------------------------------------------------ rich cards (MSG-004/005/006): stored as a public ref, resolved for EACH viewer at
  // read time with the same visibility gates as Shop / Works / Communities, so a card never shows something the viewer may not see
  // (a product taken down, a worker suspended, a private group) and never carries ids, phone numbers or addresses.
  const firstImg = (list) => { let a = list; if (typeof a === 'string') { try { a = JSON.parse(a); } catch { a = [a]; } } if (!Array.isArray(a)) return null; for (const x of a) { const u = mediaUrl(typeof x === 'object' && x ? x.url : x); if (u) return u; } return null; };
  const CARD_RE = { product: /^PRD-[0-9A-F]{12}$/, community: /^[a-z0-9]+(?:-[a-z0-9]+)*(?:#[A-Z0-9]{10})?$/, worker: /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/ };
  async function cardDto(type, ref, vid) {
    if (!CARD_RE[type] || !CARD_RE[type].test(String(ref || ''))) return null;
    if (type === 'product') {
      const k = await resolveK5ARef(ref, ['PRODUCT']); if (!k) return null;
      const r = (await pool.query(`SELECT p.name, p.category, p.price, p.mrp, p.image_urls, v.business_name store,
          CASE WHEN EXISTS(SELECT 1 FROM vendor_product_variants pv WHERE pv.product_id=p.id) THEN EXISTS(SELECT 1 FROM vendor_product_variants pv WHERE pv.product_id=p.id AND LOWER(COALESCE(pv.status,'active'))='active' AND COALESCE(pv.stock,0)>0) ELSE COALESCE(p.stock,0)>0 END in_stock
        FROM vendor_products p JOIN vendor_profiles v ON v.id=p.vendor_profile_id JOIN users u ON u.id=v.user_id
        WHERE p.id::text=$2 AND p.status='published' AND p.archived_at IS NULL AND (p.published_at IS NULL OR p.published_at<=NOW()) AND COALESCE(v.status,'active')='active'
          AND COALESCE(UPPER((SELECT m.status FROM howdi_shop_product_moderation_v162c m WHERE m.product_id=p.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1)),'APPROVED')='APPROVED'
          AND COALESCE(u.is_active,TRUE)=TRUE AND UPPER(COALESCE(u.account_status,'ACTIVE'))='ACTIVE' AND NOT (${blockedSql('$1::bigint', 'v.user_id')})`, [vid, String(k.entity_key)])).rows[0];
      if (!r) return null;
      const price = money(r.price), mrp = r.mrp != null ? money(r.mrp) : null;
      return { type, ref, title: line(r.name, 100), subtitle: [line(r.category, 40), line(r.store, 60)].filter(Boolean).join(' · '), price, mrp: mrp && mrp > price ? mrp : null, image_url: firstImg(r.image_urls), in_stock: r.in_stock === true, route: `/shop/products/${ref}`, actions: r.in_stock === true ? ['view', 'buy'] : ['view'] };
    }
    if (type === 'worker') {
      if (!isPublicWorkerCode(ref)) return null;
      const r = (await pool.query(`SELECT w.full_name, w.city, w.rating, w.completed_jobs, ps.name service
        FROM works_workers w JOIN works_worker_services pws ON pws.worker_id=w.id AND pws.is_primary=TRUE AND LOWER(TRIM(pws.status))='approved'
          JOIN works_services ps ON ps.id=pws.service_id AND ps.active=TRUE AND ps.customer_visible=TRUE LEFT JOIN users u ON u.id=w.user_id
        WHERE w.worker_code=$2 AND LOWER(TRIM(w.kyc_status))='verified' AND LOWER(TRIM(w.skill_status))='verified' AND LOWER(TRIM(w.account_status))='active' AND COALESCE(w.active,TRUE)=TRUE
          AND (w.user_id IS NULL OR (COALESCE(u.is_active,TRUE)=TRUE AND UPPER(COALESCE(u.account_status,'ACTIVE'))='ACTIVE' AND NOT (${blockedSql('$1::bigint', 'w.user_id')})))`, [vid, ref])).rows[0];
      if (!r) return null;
      const rating = Number(r.rating);
      return { type, ref, title: line(r.full_name, 80), subtitle: [line(r.service, 60), line(r.city, 40)].filter(Boolean).join(' · '), rating: Number.isFinite(rating) && rating > 0 ? Math.round(Math.min(5, rating) * 10) / 10 : null, jobs: Number(r.completed_jobs) || 0, verified: true, route: `/works/workers/${encodeURIComponent(ref)}`, actions: ['view', 'book'] };
    }
    const [slug, invite] = String(ref).split('#');
    const r = (await pool.query(`SELECT sp.slug, sp.name, sp.space_type, sp.privacy, sp.avatar_data, sp.cover_data, sp.category, meta.invite_code,
        (SELECT COUNT(*) FROM howdi_connect_social_space_members m WHERE m.space_id=sp.id AND m.status='ACTIVE') members,
        (SELECT m.status FROM howdi_connect_social_space_members m WHERE m.space_id=sp.id AND m.user_id=$1::bigint) my_status
      FROM howdi_connect_social_spaces sp LEFT JOIN howdi_v8_community_meta meta ON meta.space_id=sp.id
      WHERE sp.slug=$2 AND COALESCE(sp.is_archived,FALSE)=FALSE AND (sp.owner_user_id=$1::bigint OR NOT (${blockedSql('$1::bigint', 'sp.owner_user_id')}))`, [vid, slug])).rows[0];
    if (!r) return null;
    const member = r.my_status === 'ACTIVE';
    const inviteOk = Boolean(invite) && r.invite_code === invite; // an invite-only group appears only through its current invite link
    if (!['PUBLIC', 'PRIVATE'].includes(r.privacy) && !member && !inviteOk) return null;
    return { type, ref, title: line(r.name, 80), subtitle: [r.space_type === 'CHANNEL' ? 'Channel' : 'Group', r.privacy === 'PUBLIC' ? 'Public' : r.privacy === 'PRIVATE' ? 'Private · approval needed' : 'Invite only', `${Number(r.members) || 0} members`].join(' · '),
      image_url: mediaUrl(r.cover_data || r.avatar_data) || null, kind: r.space_type === 'CHANNEL' ? 'channel' : 'group', privacy: r.privacy === 'PUBLIC' ? 'public' : r.privacy === 'PRIVATE' ? 'private' : 'invite',
      membership: member ? 'member' : r.my_status === 'PENDING' ? 'pending' : 'none',
      route: inviteOk && !member ? `/connect/communities/invite/${invite}` : `/connect/communities/${r.slug}`, actions: member ? ['open'] : r.my_status === 'PENDING' ? ['view'] : ['join'] };
  }
  const expired = (p) => p.kind === 'REQUEST' && p.status === 'PENDING' && p.expires_at && new Date(p.expires_at) <= new Date();
  async function msgDtos(rows, vid, ms) {
    const refs = await issue('CMSG', rows.map((r) => r.id));
    const others = ms.filter((m) => !m.me);
    const out = [];
    for (const r of rows) {
      const a = authorDto(r, 'a_'); const code = refs.get(String(r.id)); if (!code) continue;
      const mine = Number(r.sender_user_id) === vid;
      // delivery state for my own messages: read when every other member has read past it
      const readBy = mine ? others.filter((o) => o.last_read_at && new Date(o.last_read_at) >= new Date(r.created_at)).length : 0;
      const pay = r.payment_id ? await payDto((await pool.query(`SELECT * FROM howdi_v8_chat_payments WHERE id=$1`, [r.payment_id])).rows[0], vid) : null;
      const card = r.card_type && !r.deleted_at ? (await cardDto(r.card_type, r.card_ref, vid)) || { type: r.card_type, unavailable: true } : null;
      const util = r.utility_id && hooks.utilityDto ? await hooks.utilityDto(Number(r.utility_id), vid) : null;
      let vo = null;
      if (r.view_once && !r.deleted_at) {
        const opens = (await pool.query(`SELECT user_id FROM howdi_v8_message_opens WHERE message_id=$1`, [r.id])).rows.map((x) => Number(x.user_id));
        vo = { media: r.attachment_type === 'vo-video' ? 'video' : 'photo', opened: mine ? others.length > 0 && others.every((o) => opens.includes(o.uid)) : opens.includes(vid), opened_count: mine ? opens.length : undefined };
      }
      out.push({
        public_key: code, kind: r.deleted_at ? 'deleted' : r.kind, author: a, mine,
        text: r.deleted_at ? null : text(r.message_text, 4000), image_url: r.deleted_at || r.view_once ? null : (r.attachment_type === 'image' && /^\/api\/v8\/media\//.test(String(r.attachment_data || '')) ? r.attachment_data : null),
        card, utility: util, view_once: vo, expires_at: iso(r.expires_at),
        created_at: iso(r.created_at), edited: Boolean(r.edited_at) && !r.deleted_at, can_edit: mine && !r.deleted_at && r.kind === 'text' && Date.now() - new Date(r.created_at).getTime() < EDIT_WINDOW_MS,
        status: mine ? (others.length && readBy === others.length ? 'read' : 'delivered') : null, payment: pay,
      });
    }
    return out;
  }
  const MSG_COLS = `m.id, m.sender_user_id, m.message_text, m.created_at, m.edited_at, m.deleted_at, m.kind, m.payment_id, m.attachment_type, m.attachment_data, m.view_once, m.expires_at, m.card_type, m.card_ref, m.utility_id`;
  const LIVE = `(m.expires_at IS NULL OR m.expires_at>NOW())`; // auto-erased messages are gone for everyone
  async function pageOf(cid, vid, before, limit = 40) {
    const rows = (await pool.query(`SELECT ${MSG_COLS}, ${authorCols('a_u.id', 'a_')}
      FROM howdi_connect_messages m ${authorJoins('m.sender_user_id', 'a_')}
      WHERE m.conversation_id=$1 AND ($2::bigint IS NULL OR m.id<$2) AND ${LIVE} AND (m.sender_user_id=$3::bigint OR NOT (${blockedSql('$3::bigint', 'm.sender_user_id')}))
      ORDER BY m.id DESC LIMIT $4`, [cid, before || null, vid, limit + 1])).rows;
    return { rows: rows.slice(0, limit).reverse(), more: rows.length > limit };
  }
  async function addMessage(client, cid, uid, t, extra = {}) {
    const r = (await client.query(`INSERT INTO howdi_connect_messages(conversation_id,sender_user_id,message_text,kind,payment_id,attachment_type,attachment_data,idem_key,view_once,card_type,card_ref,utility_id,expires_at)
      VALUES($1,$2,$3,$4::varchar,$5,$6,$7,$8,$9,$10,$11,$12,CASE WHEN $4::varchar IN ('text','image','card','viewonce') THEN (SELECT NOW()+make_interval(hours=>c.auto_erase_hours) FROM howdi_connect_conversations c WHERE c.id=$1) END)
      ON CONFLICT (sender_user_id, idem_key) WHERE idem_key IS NOT NULL DO NOTHING RETURNING id`, [cid, uid, t, extra.kind || 'text', extra.payment || null, extra.attachmentType || null, extra.attachment || null, extra.idem || null, extra.viewOnce === true, extra.cardType || null, extra.cardRef || null, extra.utility || null])).rows[0];
    await client.query(`UPDATE howdi_connect_conversations SET updated_at=NOW() WHERE id=$1`, [cid]);
    await client.query(`UPDATE howdi_connect_conversation_members SET last_read_at=NOW() WHERE conversation_id=$1 AND user_id=$2`, [cid, uid]);
    return r ? Number(r.id) : null;
  }
  async function handleOf(uid) { const r = (await pool.query(`SELECT public_username h FROM howdi_connect_profiles WHERE user_id=$1`, [uid])).rows[0]; return r && r.h ? r.h : 'someone'; }
  async function notifyOthers(ms, vid, kind, title, body, route) { for (const m of ms) if (!m.me) await notify(m.uid, kind, title, body, route, vid); }

  // ------------------------------------------------------------ HPay PIN (sandbox step-up)
  const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex');
  async function pinState(uid) { const r = (await pool.query(`SELECT failed, locked_until FROM howdi_v8_hpay_pins WHERE user_id=$1`, [uid])).rows[0]; return r ? { set: true, locked_until: r.locked_until && new Date(r.locked_until) > new Date() ? iso(r.locked_until) : null, tries_left: Math.max(0, 5 - Number(r.failed || 0)) } : { set: false, locked_until: null, tries_left: 5 }; }
  async function checkPin(uid, pin) {
    const r = (await pool.query(`SELECT pin_hash, salt, failed, locked_until FROM howdi_v8_hpay_pins WHERE user_id=$1`, [uid])).rows[0];
    if (!r) return { error: [428, 'PIN_REQUIRED', 'Set your HPay PIN first.'] };
    if (r.locked_until && new Date(r.locked_until) > new Date()) return { error: [423, 'PIN_LOCKED', 'Too many wrong PINs. Try again in 15 minutes.'] };
    const good = /^\d{4,6}$/.test(String(pin || '')) && crypto.timingSafeEqual(Buffer.from(hashPin(pin, r.salt), 'hex'), Buffer.from(r.pin_hash, 'hex'));
    if (good) { if (r.failed) await pool.query(`UPDATE howdi_v8_hpay_pins SET failed=0, locked_until=NULL WHERE user_id=$1`, [uid]); return { ok: true }; }
    const failed = Number(r.failed || 0) + 1;
    // the 5th wrong PIN locks for 15 minutes and resets the counter, so the next window starts with 5 tries again
    await pool.query(`UPDATE howdi_v8_hpay_pins SET failed=$2, locked_until=CASE WHEN $3::boolean THEN NOW()+interval '15 minutes' ELSE NULL END WHERE user_id=$1`, [uid, failed >= 5 ? 0 : failed, failed >= 5]);
    return { error: failed >= 5 ? [423, 'PIN_LOCKED', 'Too many wrong PINs. Try again in 15 minutes.'] : [403, 'PIN_WRONG', `Wrong PIN. ${5 - failed} ${5 - failed === 1 ? 'try' : 'tries'} left.`] };
  }

  // ------------------------------------------------------------ money movement (one transaction, double entry, sandbox wallet)
  async function transfer(client, payer, payee, amount, note, refCode, kind = 'CHAT_PAYMENT') {
    const w = await wallet(payer, client);
    if (!w) return { error: [503, 'PAYMENT_PROVIDER_REQUIRED', 'HPay isn’t connected in this environment, so no money can move.'] };
    const today = Number((await client.query(`SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_ledger WHERE user_id=$1 AND direction='DEBIT' AND kind IN ('CHAT_PAYMENT','QR_PAYMENT','UTILITY') AND created_at>NOW()-interval '1 day'`, [payer])).rows[0].s);
    if (today + amount > DAY_MAX) return { error: [422, 'DAILY_LIMIT', `You can pay up to ₹${DAY_MAX.toLocaleString('en-IN')} a day with HPay in this preview.`] };
    const up = await client.query(`UPDATE howdi_v8_wallets SET balance=balance-$2, updated_at=NOW() WHERE user_id=$1 AND balance>=$2 RETURNING balance`, [payer, amount]);
    if (!up.rows[0]) return { error: [402, 'INSUFFICIENT_BALANCE', 'Not enough HPay balance. Nothing was sent.'] };
    await wallet(payee, client);
    await client.query(`UPDATE howdi_v8_wallets SET balance=balance+$2, updated_at=NOW() WHERE user_id=$1`, [payee, amount]);
    const txn = 'HPM-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,counterparty_user_id,reference,note) VALUES($1,$2,'DEBIT',$3,$7,$4,$5,$6),($1,$4,'CREDIT',$3,$7,$2,$5,$6)`,
      [txn, payer, amount, payee, refCode, line(note, 190) || (kind === 'QR_PAYMENT' ? 'QR payment' : 'Payment in Messages'), kind]);
    return { txn, balance: money(up.rows[0].balance) };
  }

  // ------------------------------------------------------------ router
  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (!/^\/api\/v8\/(messages|conversations|chat-messages|hpay\/pin|payments)(\/|$)/.test(p)) return false;
    const v = await viewer(req);
    if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to use Messages.'); return true; }
    const vid = v.id; let m;

    if ((m = p.match(/^\/api\/v8\/messages\/eligibility\/@?([a-z0-9._]{3,30})$/i)) && req.method === 'GET') {
      const t = await userIdByHandle(m[1]);
      if (!t) { fail(res, 404, 'NOT_FOUND', 'No one on HOWDI has that @handle.'); return true; }
      const e = await eligibility(vid, t);
      const ex = (await pool.query(`SELECT c.id FROM howdi_connect_conversations c JOIN howdi_connect_conversation_members a ON a.conversation_id=c.id AND a.user_id=$1 JOIN howdi_connect_conversation_members b ON b.conversation_id=c.id AND b.user_id=$2 WHERE c.conversation_type='DIRECT' ORDER BY c.updated_at DESC LIMIT 1`, [vid, t])).rows[0];
      ok(res, { ...e, existing: ex ? (await issue('CONV', [ex.id])).get(String(ex.id)) : null }); return true;
    }

    if (p === '/api/v8/hpay/pin') {
      if (req.method === 'GET') { ok(res, await pinState(vid)); return true; }
      if (req.method === 'POST') {
        if (limited(res, `v8-pin:${vid}`, 10, 15 * 60000)) return true;
        const b = (await getBody(req)) || {}; const pin = String(b.pin || '');
        if (!/^\d{4,6}$/.test(pin) || /^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) { fail(res, 400, 'PIN_WEAK', 'Choose 4–6 digits that aren’t all the same or in a row.'); return true; }
        const st = await pinState(vid);
        if (st.set) { const c = await checkPin(vid, b.current); if (c.error) { fail(res, c.error[0], c.error[1], c.error[1] === 'PIN_WRONG' ? 'Your current PIN is wrong.' : c.error[2]); return true; } }
        const salt = crypto.randomBytes(16).toString('hex');
        await pool.query(`INSERT INTO howdi_v8_hpay_pins(user_id,pin_hash,salt) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash, salt=EXCLUDED.salt, failed=0, locked_until=NULL, updated_at=NOW()`, [vid, hashPin(pin, salt), salt]);
        ok(res, { set: true, message: st.set ? 'HPay PIN changed.' : 'HPay PIN set. You’ll enter it to confirm payments.' }); return true;
      }
    }

    if (p === '/api/v8/conversations' && req.method === 'GET') {
      const tab = url.searchParams.get('tab') === 'requests' ? 'requests' : 'all';
      const filter = ['unread', 'groups', 'payments'].includes(url.searchParams.get('filter')) ? url.searchParams.get('filter') : 'all';
      const q = line(url.searchParams.get('q'), 60).toLowerCase();
      const rows = (await pool.query(`${CONV_SQL}
        WHERE ${tab === 'requests' ? `c.request_status='PENDING' AND c.requested_by<>$1::bigint` : `(c.request_status IS NULL OR c.requested_by=$1::bigint)`}
        ORDER BY c.updated_at DESC LIMIT 100`, [vid])).rows;
      const refs = await issue('CONV', rows.map((r) => r.id));
      const items = [];
      for (const c of rows) {
        const ms = await members(c.id, vid);
        const others = ms.filter((x) => !x.me);
        if (c.conversation_type !== 'GROUP' && others[0] && (await pool.query(`SELECT ${blockedSql('$1::bigint', '$2::bigint')} b`, [vid, others[0].uid])).rows[0].b) continue;
        const last = (await pool.query(`SELECT m.message_text, m.kind, m.deleted_at, m.created_at, m.sender_user_id, m.payment_id, m.card_type, m.attachment_type FROM howdi_connect_messages m WHERE m.conversation_id=$1 AND ${LIVE} ORDER BY m.id DESC LIMIT 1`, [c.id])).rows[0];
        const unread = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_connect_messages m WHERE m.conversation_id=$1 AND m.sender_user_id<>$2 AND ($3::timestamptz IS NULL OR m.created_at>$3) AND ${LIVE}`, [c.id, vid, c.my_read])).rows[0].n);
        const dto = await convDto(c, vid, refs.get(String(c.id)), ms);
        let preview = last ? (last.deleted_at ? 'Message deleted' : last.kind === 'image' ? '📷 Photo' : last.kind === 'viewonce' ? (last.attachment_type === 'vo-video' ? 'View-once video' : 'View-once photo')
          : last.kind === 'card' ? `${{ product: 'Shared a product', community: 'Shared a group', worker: 'Shared a worker' }[last.card_type] || 'Shared a card'}${last.message_text ? ` · ${line(last.message_text, 50)}` : ''}` : line(last.message_text, 80)) : 'No messages yet';
        if (last && Number(last.sender_user_id) === vid && last.kind === 'text') preview = `You: ${preview}`;
        if (q && !`${dto.title} ${dto.members.map((x) => x.public_username).join(' ')} ${preview}`.toLowerCase().includes(q)) continue;
        if (filter === 'unread' && !unread) continue;
        if (filter === 'groups' && c.conversation_type !== 'GROUP') continue;
        if (filter === 'payments' && !(await pool.query(`SELECT 1 FROM howdi_connect_messages WHERE conversation_id=$1 AND (payment_id IS NOT NULL OR utility_id IS NOT NULL) UNION ALL SELECT 1 FROM howdi_v8_chat_payments WHERE conversation_id=$1 LIMIT 1`, [c.id])).rowCount) continue;
        items.push({ ...dto, preview, last_at: iso(last ? last.created_at : c.updated_at), unread });
      }
      const requests = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_connect_conversations c JOIN howdi_connect_conversation_members me ON me.conversation_id=c.id AND me.user_id=$1 AND me.left_at IS NULL WHERE c.request_status='PENDING' AND c.requested_by<>$1`, [vid])).rows[0].n);
      ok(res, { tab, filter, items, requests, safety: 'Encrypted in transit' }); return true;
    }

    if (p === '/api/v8/conversations' && req.method === 'POST') {
      if (limited(res, `v8-conv-new:${vid}`, 30, 60 * 60000)) return true;
      const b = (await getBody(req)) || {};
      if (b.group) {
        const title = line(b.group.title, 80); const handles = [...new Set((Array.isArray(b.group.handles) ? b.group.handles : []).map((h) => String(h).replace(/^@/, '').toLowerCase()))].slice(0, 49);
        if (title.length < 2) { fail(res, 400, 'VALIDATION', 'Name the group (at least 2 characters).'); return true; }
        const ids = [];
        for (const h of handles) { const t = await userIdByHandle(h); if (!t || t === vid) continue; if ((await eligibility(vid, t)).can !== 'direct') { fail(res, 403, 'NOT_ALLOWED', `@${h} can’t be added: they don’t accept messages from you.`); return true; } ids.push(t); }
        if (!ids.length) { fail(res, 400, 'VALIDATION', 'Add at least one person.'); return true; }
        const client = await pool.connect(); let cid;
        try {
          await client.query('BEGIN');
          cid = Number((await client.query(`INSERT INTO howdi_connect_conversations(conversation_type,title,created_by) VALUES('GROUP',$1,$2) RETURNING id`, [title, vid])).rows[0].id);
          await client.query(`INSERT INTO howdi_connect_conversation_members(conversation_id,user_id,role,last_read_at) VALUES($1,$2,'owner',NOW())`, [cid, vid]);
          for (const t of ids) await client.query(`INSERT INTO howdi_connect_conversation_members(conversation_id,user_id,role) VALUES($1,$2,'member') ON CONFLICT DO NOTHING`, [cid, t]);
          await addMessage(client, cid, vid, `@${await handleOf(vid)} created the group “${title}”`, { kind: 'system' });
          await client.query('COMMIT');
        } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
        const code = (await issue('CONV', [cid])).get(String(cid));
        for (const t of ids) await notify(t, 'GROUP_ADDED', `@${await handleOf(vid)} added you to “${title}”`, 'Open the group in Messages.', `/connect/messages/${code}`, vid);
        ok(res, { conversation: { public_key: code, route: `/connect/messages/${code}` } }, 201); return true;
      }
      const t = await userIdByHandle(b.handle);
      if (!t) { fail(res, 404, 'NOT_FOUND', 'No one on HOWDI has that @handle.'); return true; }
      const e = await eligibility(vid, t);
      if (e.can === 'no') { fail(res, 403, 'NOT_ALLOWED', e.reason); return true; }
      const first = text(b.text, 2000);
      const ex = (await pool.query(`SELECT c.id, c.request_status, c.requested_by FROM howdi_connect_conversations c JOIN howdi_connect_conversation_members a ON a.conversation_id=c.id AND a.user_id=$1 JOIN howdi_connect_conversation_members b ON b.conversation_id=c.id AND b.user_id=$2 WHERE c.conversation_type='DIRECT' ORDER BY c.updated_at DESC LIMIT 1`, [vid, t])).rows[0];
      let cid = ex ? Number(ex.id) : null; let created = false;
      if (!cid) {
        if (e.can === 'request' && !first) { fail(res, 400, 'VALIDATION', 'Write a first message — it arrives as a request.'); return true; }
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          cid = Number((await client.query(`INSERT INTO howdi_connect_conversations(conversation_type,created_by,request_status,requested_by) VALUES('DIRECT',$1,$2,$3) RETURNING id`, [vid, e.can === 'request' ? 'PENDING' : null, e.can === 'request' ? vid : null])).rows[0].id);
          await client.query(`INSERT INTO howdi_connect_conversation_members(conversation_id,user_id,role,last_read_at) VALUES($1,$2,'member',NOW()),($1,$3,'member',NULL)`, [cid, vid, t]);
          if (first) await addMessage(client, cid, vid, first);
          await client.query('COMMIT'); created = true;
        } catch (er) { await client.query('ROLLBACK').catch(() => {}); throw er; } finally { client.release(); }
      } else if (first) {
        const c = await convFor(vid, cid);
        const dto = await convDto(c, vid, '', await members(cid, vid));
        if (!dto.can_send) { fail(res, 403, 'NOT_ALLOWED', dto.request === 'received' ? 'Accept the request to reply.' : 'You can’t send messages in this chat.'); return true; }
        await addMessage(pool, cid, vid, first);
      }
      const code = (await issue('CONV', [cid])).get(String(cid));
      if (created || first) await notify(t, e.can === 'request' && created ? 'MESSAGE_REQUEST' : 'MESSAGE', e.can === 'request' && created ? `Message request from @${await handleOf(vid)}` : `New message from @${await handleOf(vid)}`, line(first, 100) || 'Open Messages to reply.', `/connect/messages/${code}`, vid);
      ok(res, { conversation: { public_key: code, route: `/connect/messages/${code}`, request: e.can === 'request' && created ? 'sent' : null } }, created ? 201 : 200); return true;
    }

    // ---- MSG-007 view-once: the recipient gets the media inline exactly once (it is never served from a public URL)
    if ((m = p.match(/^\/api\/v8\/chat-messages\/(CMS-[0-9A-F]{12})\/open$/)) && req.method === 'POST') {
      const k = await resolve(m[1], 'CMSG');
      const row = k ? (await pool.query(`SELECT m.* FROM howdi_connect_messages m JOIN howdi_connect_conversation_members x ON x.conversation_id=m.conversation_id AND x.user_id=$2 AND x.left_at IS NULL
        WHERE m.id=$1 AND m.view_once=TRUE AND m.deleted_at IS NULL AND ${LIVE} AND NOT (${blockedSql('$2::bigint', 'm.sender_user_id')})`, [k, vid])).rows[0] : null;
      if (!row) { fail(res, 404, 'NOT_FOUND', 'That photo isn’t available.'); return true; }
      if (Number(row.sender_user_id) === vid) { fail(res, 403, 'NOT_ALLOWED', 'View-once media can only be opened by the people you sent it to.'); return true; }
      const first = await pool.query(`INSERT INTO howdi_v8_message_opens(message_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING opened_at`, [k, vid]);
      if (!first.rowCount) { fail(res, 410, 'ALREADY_OPENED', 'You’ve already opened this. View-once media can be opened only once.'); return true; }
      const f = readPrivate(row.attachment_data);
      if (!f) { fail(res, 410, 'GONE', 'This media is no longer available.'); return true; }
      // once every recipient has opened it, the file itself is deleted
      const left = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_connect_conversation_members x WHERE x.conversation_id=$1 AND x.left_at IS NULL AND x.user_id<>$2 AND NOT EXISTS(SELECT 1 FROM howdi_v8_message_opens o WHERE o.message_id=$3 AND o.user_id=x.user_id)`, [row.conversation_id, row.sender_user_id, k])).rows[0].n);
      if (!left) deletePrivate(row.attachment_data);
      ok(res, { media: { type: row.attachment_type === 'vo-video' ? 'video' : 'photo', data: `data:${f.mime};base64,${f.buf.toString('base64')}` }, notice: 'This closes for good when you leave it.' }); return true;
    }

    // ---- single message edit / delete
    if ((m = p.match(/^\/api\/v8\/chat-messages\/(CMS-[0-9A-F]{12})$/)) && (req.method === 'PATCH' || req.method === 'DELETE')) {
      const k = await resolve(m[1], 'CMSG');
      const row = k ? (await pool.query(`SELECT m.*, (SELECT 1 FROM howdi_connect_conversation_members x WHERE x.conversation_id=m.conversation_id AND x.user_id=$2 AND x.left_at IS NULL) member FROM howdi_connect_messages m WHERE m.id=$1`, [k, vid])).rows[0] : null;
      if (!row || !row.member || Number(row.sender_user_id) !== vid || row.deleted_at) { fail(res, 404, 'NOT_FOUND', 'That message isn’t available.'); return true; }
      if (req.method === 'DELETE') {
        if (!['text', 'image', 'card', 'viewonce'].includes(row.kind)) { fail(res, 400, 'NOT_ALLOWED', 'Payment and receipt messages can’t be deleted.'); return true; }
        await pool.query(`UPDATE howdi_connect_messages SET deleted_at=NOW() WHERE id=$1`, [k]);
        if (row.view_once) deletePrivate(row.attachment_data);
        ok(res, { deleted: true }); return true;
      }
      if (row.kind !== 'text') { fail(res, 400, 'NOT_ALLOWED', 'Only text messages can be edited.'); return true; }
      if (Date.now() - new Date(row.created_at).getTime() >= EDIT_WINDOW_MS) { fail(res, 409, 'EDIT_WINDOW_CLOSED', 'Messages can be edited for 15 minutes after sending.'); return true; }
      const b = (await getBody(req)) || {}; const t = text(b.text, 2000);
      if (!t) { fail(res, 400, 'VALIDATION', 'Message can’t be empty.'); return true; }
      if (t !== row.message_text) {
        await pool.query(`INSERT INTO howdi_v8_message_edits(message_id,previous_text) VALUES($1,$2)`, [k, row.message_text]);
        await pool.query(`UPDATE howdi_connect_messages SET message_text=$2, edited_at=NOW() WHERE id=$1`, [k, t]);
      }
      ok(res, { edited: true, text: t }); return true;
    }

    // ---- payments on an existing request
    if ((m = p.match(/^\/api\/v8\/payments\/(PAY-[0-9A-F]{12})\/(pay|decline|cancel|remind)$/)) && req.method === 'POST') {
      const k = await resolve(m[1], 'PAY');
      const pay0 = k ? (await pool.query(`SELECT * FROM howdi_v8_chat_payments WHERE id=$1 AND kind='REQUEST' AND (payer_user_id=$2 OR payee_user_id=$2)`, [k, vid])).rows[0] : null;
      if (!pay0) { fail(res, 404, 'NOT_FOUND', 'That request isn’t available.'); return true; }
      const act = m[2]; const b = (await getBody(req)) || {};
      const conv = await convFor(vid, pay0.conversation_id); const ms = conv ? await members(conv.id, vid) : [];
      const ccode = (await issue('CONV', [pay0.conversation_id])).get(String(pay0.conversation_id)); const route = `/connect/messages/${ccode}`;
      if (expired(pay0)) { await pool.query(`UPDATE howdi_v8_chat_payments SET status='EXPIRED', decided_at=NOW() WHERE id=$1 AND status='PENDING'`, [k]); fail(res, 409, 'EXPIRED', 'This request has expired.'); return true; }
      if (act === 'remind') {
        if (Number(pay0.payee_user_id) !== vid || pay0.status !== 'PENDING') { fail(res, 409, 'INVALID_STATE', 'You can only remind about your own pending request.'); return true; }
        if (pay0.reminded_at && Date.now() - new Date(pay0.reminded_at).getTime() < 12 * 3600e3) { fail(res, 429, 'REMINDED_RECENTLY', 'You already sent a reminder. You can remind again 12 hours later.'); return true; }
        await pool.query(`UPDATE howdi_v8_chat_payments SET reminded_at=NOW() WHERE id=$1`, [k]);
        await notify(Number(pay0.payer_user_id), 'PAYMENT_REMINDER', `Reminder: @${await handleOf(vid)} requested ₹${money(pay0.amount)}`, pay0.note || 'Pay or decline in Messages.', route, vid);
        ok(res, { reminded: true, message: 'Reminder sent.' }); return true;
      }
      if (act === 'cancel') {
        const u = await pool.query(`UPDATE howdi_v8_chat_payments SET status='CANCELLED', decided_at=NOW() WHERE id=$1 AND payee_user_id=$2 AND status='PENDING' RETURNING id`, [k, vid]);
        if (!u.rowCount) { fail(res, 409, 'INVALID_STATE', 'Only a pending request you sent can be cancelled.'); return true; }
        await notify(Number(pay0.payer_user_id), 'PAYMENT_REQUEST_CANCELLED', `@${await handleOf(vid)} cancelled their request`, `₹${money(pay0.amount)} — nothing to pay.`, route, vid);
        ok(res, { status: 'cancelled' }); return true;
      }
      if (act === 'decline') {
        const u = await pool.query(`UPDATE howdi_v8_chat_payments SET status='DECLINED', decided_at=NOW() WHERE id=$1 AND payer_user_id=$2 AND status='PENDING' RETURNING id`, [k, vid]);
        if (!u.rowCount) { fail(res, 409, 'INVALID_STATE', 'This request can’t be declined now.'); return true; }
        await notify(Number(pay0.payee_user_id), 'PAYMENT_REQUEST_DECLINED', `@${await handleOf(vid)} declined your request`, `₹${money(pay0.amount)}${pay0.note ? ` · ${pay0.note}` : ''}`, route, vid);
        ok(res, { status: 'declined' }); return true;
      }
      // pay
      if (Number(pay0.payer_user_id) !== vid) { fail(res, 403, 'NOT_ALLOWED', 'Only the person asked can pay this request.'); return true; }
      const idem = /^[A-Za-z0-9_-]{8,64}$/.test(String(b.idempotency_key || '')) ? String(b.idempotency_key) : null;
      if (!idem) { fail(res, 400, 'VALIDATION', 'Missing payment key. Please try again.'); return true; }
      if (pay0.status === 'PAID') { ok(res, { status: 'paid', replayed: true, payment: await payDto(pay0, vid) }); return true; }
      if (pay0.status !== 'PENDING') { fail(res, 409, 'INVALID_STATE', `This request is ${String(pay0.status).toLowerCase()}.`); return true; }
      if (limited(res, `v8-pay:${vid}`, 20, 10 * 60000)) return true;
      const pin = await checkPin(vid, b.pin); if (pin.error) { fail(res, pin.error[0], pin.error[1], pin.error[2]); return true; }
      const client = await pool.connect(); let result;
      try {
        await client.query('BEGIN');
        const lock = (await client.query(`SELECT * FROM howdi_v8_chat_payments WHERE id=$1 FOR UPDATE`, [k])).rows[0];
        if (lock.status !== 'PENDING') { await client.query('ROLLBACK'); ok(res, { status: String(lock.status).toLowerCase(), replayed: true, payment: await payDto(lock, vid) }); return true; }
        result = await transfer(client, vid, Number(lock.payee_user_id), money(lock.amount), lock.note, m[1]);
        if (result.error) { await client.query('ROLLBACK'); fail(res, result.error[0], result.error[1], result.error[2]); return true; }
        await client.query(`UPDATE howdi_v8_chat_payments SET status='PAID', txn_code=$2, decided_at=NOW() WHERE id=$1`, [k, result.txn]);
        await addMessage(client, lock.conversation_id, vid, `Paid ₹${money(lock.amount)} request`, { kind: 'payment', payment: k });
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      await notify(Number(pay0.payee_user_id), 'PAYMENT_REQUEST_PAID', `@${await handleOf(vid)} paid your request: ₹${money(pay0.amount)}`, `Reference ${result.txn} · HPay Preview/Test`, route, vid);
      const fresh = (await pool.query(`SELECT * FROM howdi_v8_chat_payments WHERE id=$1`, [k])).rows[0];
      ok(res, { status: 'paid', payment: await payDto(fresh, vid), balance: result.balance }); return true;
    }

    // ---- one conversation
    if (!(m = p.match(/^\/api\/v8\/conversations\/(CNV-[0-9A-F]{12})(?:\/(.+))?$/))) { fail(res, 404, 'NOT_FOUND', 'Not found.'); return true; }
    const code = m[1]; const sub = m[2] || '';
    const cid = await resolve(code, 'CONV'); const c = cid ? await convFor(vid, cid) : null;
    if (!c) { fail(res, 404, 'NOT_FOUND', 'This conversation isn’t available.'); return true; }
    const ms = await members(cid, vid); const dto = await convDto(c, vid, code, ms);
    const isAdmin = ['owner', 'admin'].includes(c.my_role);
    const route = `/connect/messages/${code}`;

    if (!sub && req.method === 'GET') {
      const pins = await pinState(vid); const w = dto.can_pay ? await wallet(vid) : null;
      ok(res, { conversation: dto, hpay: { pin_set: pins.set, sandbox: sandboxEnabled(), balance: w ? money(w.balance) : null } }); return true;
    }
    if (!sub && req.method === 'PATCH') {
      if (c.conversation_type !== 'GROUP' || !isAdmin) { fail(res, 403, 'NOT_ALLOWED', 'Only group admins can rename the group.'); return true; }
      const b = (await getBody(req)) || {}; const title = line(b.title, 80);
      if (title.length < 2) { fail(res, 400, 'VALIDATION', 'Name the group (at least 2 characters).'); return true; }
      await pool.query(`UPDATE howdi_connect_conversations SET title=$2, updated_at=NOW() WHERE id=$1`, [cid, title]);
      await addMessage(pool, cid, vid, `@${await handleOf(vid)} renamed the group to “${title}”`, { kind: 'system' });
      ok(res, { title }); return true;
    }
    if (sub === 'messages' && req.method === 'GET') {
      const before = url.searchParams.get('before') ? await resolve(url.searchParams.get('before'), 'CMSG') : null;
      await pool.query(`UPDATE howdi_v8_chat_payments SET status='EXPIRED', decided_at=NOW() WHERE conversation_id=$1 AND kind='REQUEST' AND status='PENDING' AND expires_at<=NOW()`, [cid]);
      const pg = await pageOf(cid, vid, before);
      const items = await msgDtos(pg.rows, vid, ms);
      ok(res, { items, has_more: pg.more, before: items[0] ? items[0].public_key : null }); return true;
    }
    if (sub === 'messages' && req.method === 'POST') {
      if (!dto.can_send) { fail(res, 403, 'NOT_ALLOWED', dto.blocked ? 'You can’t message this person.' : dto.request === 'received' ? 'Accept the request to reply.' : dto.request === 'sent' ? 'Wait for them to accept your request.' : 'You can’t send messages in this chat.'); return true; }
      if (dto.request === 'sent') {
        const n = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_connect_messages WHERE conversation_id=$1 AND sender_user_id=$2`, [cid, vid])).rows[0].n);
        if (n >= 3) { fail(res, 403, 'REQUEST_PENDING', 'You can send up to 3 messages until they accept your request.'); return true; }
      }
      if (limited(res, `v8-msg:${vid}`, 60, 60000)) return true;
      const b = (await getBody(req)) || {}; const t = text(b.text, 2000);
      const idem = /^[A-Za-z0-9_-]{8,64}$/.test(String(b.idempotency_key || '')) ? String(b.idempotency_key) : null;
      if (idem) { const dup = (await pool.query(`SELECT id FROM howdi_connect_messages WHERE sender_user_id=$1 AND idem_key=$2`, [vid, idem])).rows[0]; if (dup) { const row0 = (await pool.query(`SELECT ${MSG_COLS}, ${authorCols('a_u.id', 'a_')} FROM howdi_connect_messages m ${authorJoins('m.sender_user_id', 'a_')} WHERE m.id=$1`, [dup.id])).rows[0]; ok(res, { message: (await msgDtos([row0], vid, ms))[0], replayed: true }); return true; } }
      let img = null; let vo = null; let card = null;
      if (b.card) {
        const type = String(b.card.type || ''); const ref = String(b.card.ref || '');
        if (!CARD_RE[type]) { fail(res, 400, 'VALIDATION', 'Choose a product, group or worker to share.'); return true; }
        // an invite-only group can be shared only by its moderators, with its current invite link
        let cref = ref;
        if (type === 'community') {
          const [slug] = ref.split('#');
          const own = (await pool.query(`SELECT sp.privacy, meta.invite_code, (SELECT m.role FROM howdi_connect_social_space_members m WHERE m.space_id=sp.id AND m.user_id=$1 AND m.status='ACTIVE') role FROM howdi_connect_social_spaces sp LEFT JOIN howdi_v8_community_meta meta ON meta.space_id=sp.id WHERE sp.slug=$2`, [vid, slug])).rows[0];
          cref = own && !['PUBLIC', 'PRIVATE'].includes(own.privacy) && ['OWNER', 'ADMIN', 'MODERATOR'].includes(String(own.role || '').toUpperCase()) && own.invite_code ? `${slug}#${own.invite_code}` : slug;
        }
        card = await cardDto(type, cref, vid);
        if (!card) { fail(res, 404, 'NOT_FOUND', 'That isn’t available to share.'); return true; }
        card.ref = cref;
      } else if (b.viewOnce && b.imageData) {
        try { vo = savePrivate(b.imageData, { videos: true, maxImage: 5 * 1024 * 1024, maxVideo: 8 * 1024 * 1024 }); } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message); return true; }
      } else if (b.imageData) { try { img = saveMedia(b.imageData, { videos: false, maxImage: 5 * 1024 * 1024 }); } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message); return true; } }
      if (!t && !img && !vo && !card) { fail(res, 400, 'VALIDATION', 'Write a message first.'); return true; }
      const id = card ? await addMessage(pool, cid, vid, t, { kind: 'card', cardType: card.type, cardRef: card.ref, idem })
        : vo ? await addMessage(pool, cid, vid, '', { kind: 'viewonce', viewOnce: true, attachmentType: vo.type === 'video' ? 'vo-video' : 'vo-photo', attachment: vo.file, idem })
          : await addMessage(pool, cid, vid, t, { kind: img ? 'image' : 'text', attachmentType: img ? 'image' : null, attachment: img ? img.url : null, idem });
      const row = (await pool.query(`SELECT ${MSG_COLS}, ${authorCols('a_u.id', 'a_')} FROM howdi_connect_messages m ${authorJoins('m.sender_user_id', 'a_')} WHERE ${id ? 'm.id=$1' : 'm.sender_user_id=$2 AND m.idem_key=$1'}`, id ? [id] : [idem, vid])).rows[0];
      if (id) for (const x of ms) if (!x.me && !(await pool.query(`SELECT muted FROM howdi_connect_conversation_members WHERE conversation_id=$1 AND user_id=$2`, [cid, x.uid])).rows[0]?.muted)
        await notify(x.uid, 'MESSAGE', c.conversation_type === 'GROUP' ? `@${await handleOf(vid)} in ${dto.title}` : `New message from @${await handleOf(vid)}`, vo ? `View-once ${vo.type === 'video' ? 'video' : 'photo'}` : card ? `Shared ${card.title}` : img && !t ? '📷 Photo' : line(t, 100), route, vid);
      ok(res, { message: (await msgDtos([row], vid, ms))[0], replayed: !id }, id ? 201 : 200); return true;
    }
    if (sub === 'call-log' && req.method === 'POST') {
      // the outcome comes from the call record, never from the browser: only the caller logs, only for a call with this chat's other member
      const b = (await getBody(req)) || {}; const callId = Number(b.call);
      const other = ms.find((x) => !x.me);
      const call = Number.isSafeInteger(callId) && other ? (await pool.query(`SELECT c.id, c.call_type, c.status, c.started_at, c.ended_at, p.invite_status
        FROM howdi_connect_calls c JOIN howdi_connect_call_participants p ON p.call_id=c.id AND p.user_id=$3 WHERE c.id=$1 AND c.caller_user_id=$2`, [callId, vid, other.uid])).rows[0] : null;
      if (!call || c.conversation_type === 'GROUP') { fail(res, 404, 'NOT_FOUND', 'Call not found.'); return true; }
      if (call.status !== 'ENDED') { fail(res, 409, 'CALL_ACTIVE', 'The call hasn’t ended yet.'); return true; }
      const kind = call.call_type === 'VIDEO' ? 'Video call' : 'Voice call';
      const secs = call.started_at && call.ended_at ? Math.max(0, Math.round((new Date(call.ended_at) - new Date(call.started_at)) / 1000)) : 0;
      const line2 = call.started_at ? `${kind} · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : call.invite_status === 'DECLINED' ? `${kind} declined` : `Missed ${kind.toLowerCase()}`;
      const id = await addMessage(pool, cid, vid, line2, { kind: 'call', idem: `call-${call.id}` });
      if (id && !call.started_at) await notify(other.uid, 'CALL_MISSED', `Missed ${kind.toLowerCase()} from @${await handleOf(vid)}`, 'Call back from Messages.', route, vid);
      ok(res, { logged: Boolean(id), text: line2 }); return true;
    }
    // ---- MSG-008 per-chat auto-erase (24 h). Either person in a 1:1 chat, admins in a group; everyone sees the change.
    if (sub === 'auto-erase' && req.method === 'POST') {
      if (!dto.can_auto_erase) { fail(res, 403, 'NOT_ALLOWED', 'Only group admins can change auto-erase.'); return true; }
      if (dto.blocked || dto.request) { fail(res, 409, 'INVALID_STATE', 'Auto-erase is available once you can chat.'); return true; }
      const b = (await getBody(req)) || {}; const hours = Number(b.hours) === 24 ? 24 : 0;
      if ((Number(c.auto_erase_hours) || 0) === hours) { ok(res, { auto_erase: hours ? { hours } : null, unchanged: true }); return true; }
      await pool.query(`UPDATE howdi_connect_conversations SET auto_erase_hours=$2, auto_erase_by=$3, updated_at=NOW() WHERE id=$1`, [cid, hours || null, hours ? vid : null]);
      const me = await handleOf(vid);
      await addMessage(pool, cid, vid, hours ? `@${me} turned on auto-erase. New messages disappear 24 hours after they’re sent.` : `@${me} turned off auto-erase. New messages stay.`, { kind: 'system' });
      await notifyOthers(ms, vid, 'CHAT_AUTO_ERASE', hours ? `@${me} turned on 24-hour auto-erase` : `@${me} turned off auto-erase`, dto.title, route);
      ok(res, { auto_erase: hours ? { hours } : null }); return true;
    }
    if (sub === 'read' && req.method === 'POST') { await pool.query(`UPDATE howdi_connect_conversation_members SET last_read_at=NOW() WHERE conversation_id=$1 AND user_id=$2`, [cid, vid]); ok(res, { read: true }); return true; }
    if (sub === 'mute' && req.method === 'POST') { const b = (await getBody(req)) || {}; await pool.query(`UPDATE howdi_connect_conversation_members SET muted=$3 WHERE conversation_id=$1 AND user_id=$2`, [cid, vid, b.on === true]); ok(res, { muted: b.on === true }); return true; }
    if ((m = sub.match(/^request\/(accept|decline|block)$/)) && req.method === 'POST') {
      if (dto.request !== 'received') { fail(res, 409, 'INVALID_STATE', 'There’s no request to answer.'); return true; }
      const other = ms.find((x) => !x.me);
      if (m[1] === 'accept') { await pool.query(`UPDATE howdi_connect_conversations SET request_status=NULL, updated_at=NOW() WHERE id=$1`, [cid]); await notify(other.uid, 'MESSAGE_REQUEST_ACCEPTED', `@${await handleOf(vid)} accepted your message request`, 'You can chat now.', route, vid); ok(res, { request: null, message: 'Request accepted. You can reply now.' }); return true; }
      await pool.query(`UPDATE howdi_connect_conversations SET request_status='DECLINED', updated_at=NOW() WHERE id=$1`, [cid]);
      if (m[1] === 'block') await pool.query(`INSERT INTO howdi_connect_profile_blocks(blocker_user_id,blocked_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [vid, other.uid]);
      // declining is quiet: the sender isn't notified
      ok(res, { request: 'declined', blocked: m[1] === 'block', message: m[1] === 'block' ? `@${other.person.public_username} is blocked.` : 'Request declined. They won’t be told.' }); return true;
    }
    if (sub === 'report' && req.method === 'POST') {
      const b = (await getBody(req)) || {};
      if (!REASONS.includes(String(b.reason))) { fail(res, 400, 'VALIDATION', 'Choose a reason.'); return true; }
      const mk = b.message ? await resolve(b.message, 'CMSG') : null;
      // the safety team sees recent messages and every earlier version of edited ones
      const snap = (await pool.query(`SELECT m.id, m.sender_user_id, m.message_text, m.created_at, m.deleted_at,
          (SELECT COALESCE(json_agg(json_build_object('text', e.previous_text, 'at', e.edited_at) ORDER BY e.edited_at), '[]'::json) FROM howdi_v8_message_edits e WHERE e.message_id=m.id) versions
        FROM howdi_connect_messages m WHERE m.conversation_id=$1 ORDER BY m.id DESC LIMIT 30`, [cid])).rows;
      await pool.query(`INSERT INTO howdi_v8_message_reports(conversation_id,message_id,reporter_user_id,reason,details,snapshot) VALUES($1,$2,$3,$4,$5,$6::jsonb)`, [cid, mk, vid, b.reason, text(b.details, 1000) || null, JSON.stringify(snap)]);
      if (b.block === true && c.conversation_type !== 'GROUP') { const o = ms.find((x) => !x.me); if (o) await pool.query(`INSERT INTO howdi_connect_profile_blocks(blocker_user_id,blocked_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [vid, o.uid]); }
      ok(res, { reported: true, message: 'Thanks — HOWDI’s safety team will review this chat. They aren’t told who reported it.' }); return true;
    }
    // group members
    if (sub === 'members' && req.method === 'POST') {
      if (c.conversation_type !== 'GROUP' || !isAdmin) { fail(res, 403, 'NOT_ALLOWED', 'Only group admins can add people.'); return true; }
      const b = (await getBody(req)) || {}; const added = [];
      for (const h of (Array.isArray(b.handles) ? b.handles : []).slice(0, 20)) {
        const t = await userIdByHandle(h); if (!t || ms.some((x) => x.uid === t)) continue;
        if ((await eligibility(vid, t)).can !== 'direct') { fail(res, 403, 'NOT_ALLOWED', `@${String(h).replace(/^@/, '')} can’t be added: they don’t accept messages from you.`); return true; }
        await pool.query(`INSERT INTO howdi_connect_conversation_members(conversation_id,user_id,role) VALUES($1,$2,'member') ON CONFLICT (conversation_id,user_id) DO UPDATE SET left_at=NULL, role='member'`, [cid, t]);
        added.push(await handleOf(t)); await notify(t, 'GROUP_ADDED', `@${await handleOf(vid)} added you to “${dto.title}”`, 'Open the group in Messages.', route, vid);
      }
      if (added.length) await addMessage(pool, cid, vid, `@${await handleOf(vid)} added ${added.map((h) => '@' + h).join(', ')}`, { kind: 'system' });
      ok(res, { added }); return true;
    }
    if ((m = sub.match(/^members\/@?([a-z0-9._]{3,30})(\/admin)?$/i))) {
      if (c.conversation_type !== 'GROUP') { fail(res, 400, 'NOT_A_GROUP', 'This is not a group.'); return true; }
      const t = await userIdByHandle(m[1]); const target = ms.find((x) => x.uid === t);
      if (!target) { fail(res, 404, 'NOT_FOUND', 'That person isn’t in this group.'); return true; }
      if (m[2] && req.method === 'POST') {
        if (c.my_role !== 'owner' || target.me) { fail(res, 403, 'NOT_ALLOWED', 'Only the group owner can change admins.'); return true; }
        const role = target.role === 'admin' ? 'member' : 'admin';
        await pool.query(`UPDATE howdi_connect_conversation_members SET role=$3 WHERE conversation_id=$1 AND user_id=$2`, [cid, t, role]);
        ok(res, { role }); return true;
      }
      if (!m[2] && req.method === 'DELETE') {
        if (target.me) {
          if (c.my_role === 'owner') { const next = ms.find((x) => !x.me && x.role === 'admin') || ms.find((x) => !x.me); if (next) await pool.query(`UPDATE howdi_connect_conversation_members SET role='owner' WHERE conversation_id=$1 AND user_id=$2`, [cid, next.uid]); }
          await pool.query(`UPDATE howdi_connect_conversation_members SET left_at=NOW(), role='member' WHERE conversation_id=$1 AND user_id=$2`, [cid, vid]);
          await addMessage(pool, cid, vid, `@${await handleOf(vid)} left the group`, { kind: 'system' });
          ok(res, { left: true }); return true;
        }
        if (!isAdmin || target.role === 'owner' || (c.my_role === 'admin' && target.role === 'admin')) { fail(res, 403, 'NOT_ALLOWED', 'You can’t remove this person.'); return true; }
        await pool.query(`UPDATE howdi_connect_conversation_members SET left_at=NOW(), role='member' WHERE conversation_id=$1 AND user_id=$2`, [cid, t]);
        await addMessage(pool, cid, vid, `@${await handleOf(vid)} removed @${target.person.public_username}`, { kind: 'system' });
        await notify(t, 'GROUP_REMOVED', `You were removed from “${dto.title}”`, 'You can’t see new messages in this group.', '/connect/messages', vid);
        ok(res, { removed: true }); return true;
      }
    }
    // ---- in-chat HPay: review (nothing moves), then send or request
    if (sub === 'payments/quote' && req.method === 'POST') {
      if (!dto.can_pay) { fail(res, 403, 'NOT_ALLOWED', dto.request ? 'Payments open once the message request is accepted.' : 'Payments are available in one-to-one chats.'); return true; }
      const b = (await getBody(req)) || {}; const amount = money(b.amount); const kind = b.kind === 'request' ? 'request' : 'send';
      if (!(amount >= PAY_MIN && amount <= PAY_MAX)) { fail(res, 400, 'VALIDATION', `Enter an amount from ₹${PAY_MIN} to ₹${PAY_MAX.toLocaleString('en-IN')}.`); return true; }
      const other = ms.find((x) => !x.me); const w = await wallet(vid); const pins = await pinState(vid);
      ok(res, { review: { kind, amount, fee: 0, total: amount, currency: 'INR', counterpart: other.person, note: line(b.note, 140) || null, balance: w ? money(w.balance) : null,
        provider_ready: Boolean(w), sandbox: sandboxEnabled(), pin_set: pins.set, warning: kind === 'send' ? 'Please review. No payment has been sent yet.' : `@${other.person.public_username} will see a request they can pay or decline. Nothing moves until they pay.` } });
      return true;
    }
    if (sub === 'payments' && req.method === 'POST') {
      if (!dto.can_pay) { fail(res, 403, 'NOT_ALLOWED', dto.request ? 'Payments open once the message request is accepted.' : 'Payments are available in one-to-one chats.'); return true; }
      const b = (await getBody(req)) || {}; const amount = money(b.amount); const kind = b.kind === 'request' ? 'REQUEST' : 'SEND'; const note = line(b.note, 140) || null;
      if (!(amount >= PAY_MIN && amount <= PAY_MAX)) { fail(res, 400, 'VALIDATION', `Enter an amount from ₹${PAY_MIN} to ₹${PAY_MAX.toLocaleString('en-IN')}.`); return true; }
      const idem = /^[A-Za-z0-9_-]{8,64}$/.test(String(b.idempotency_key || '')) ? String(b.idempotency_key) : null;
      if (!idem) { fail(res, 400, 'VALIDATION', 'Missing payment key. Please try again.'); return true; }
      const prior = (await pool.query(`SELECT p.* FROM howdi_v8_pay_idem i JOIN howdi_v8_chat_payments p ON p.id=i.payment_id WHERE i.user_id=$1 AND i.idem_key=$2`, [vid, idem])).rows[0];
      if (prior) { ok(res, { payment: await payDto(prior, vid), replayed: true }); return true; }
      if (limited(res, `v8-pay:${vid}`, 20, 10 * 60000)) return true;
      const other = ms.find((x) => !x.me);
      if (kind === 'SEND') { const pin = await checkPin(vid, b.pin); if (pin.error) { fail(res, pin.error[0], pin.error[1], pin.error[2]); return true; } }
      if (kind === 'REQUEST' && !(await wallet(other.uid))) { fail(res, 503, 'PAYMENT_PROVIDER_REQUIRED', 'HPay isn’t connected in this environment, so requests can’t be paid.'); return true; }
      const client = await pool.connect(); let pid, result = null;
      try {
        await client.query('BEGIN');
        const claimed = await client.query(`INSERT INTO howdi_v8_pay_idem(user_id,idem_key) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING user_id`, [vid, idem]);
        if (!claimed.rowCount) { await client.query('ROLLBACK'); fail(res, 409, 'IN_PROGRESS', 'This payment is already being processed.'); return true; }
        pid = Number((await client.query(`INSERT INTO howdi_v8_chat_payments(conversation_id,kind,payer_user_id,payee_user_id,created_by,amount,note,status,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [cid, kind, kind === 'SEND' ? vid : other.uid, kind === 'SEND' ? other.uid : vid, vid, amount, note, kind === 'SEND' ? 'PROCESSING' : 'PENDING', kind === 'REQUEST' ? new Date(Date.now() + REQUEST_DAYS * 86400e3) : null])).rows[0].id);
        const pcode = (await issue('PAY', [pid])).get(String(pid));
        if (kind === 'SEND') {
          result = await transfer(client, vid, other.uid, amount, note, pcode);
          if (result.error) {
            // keep a failed record so the person sees what happened; the key is released so Retry makes a new attempt
            await client.query('ROLLBACK');
            await pool.query(`INSERT INTO howdi_v8_chat_payments(conversation_id,kind,payer_user_id,payee_user_id,created_by,amount,note,status,failure,decided_at) VALUES($1,'SEND',$2,$3,$2,$4,$5,'FAILED',$6,NOW())`, [cid, vid, other.uid, amount, note, result.error[2]]);
            fail(res, result.error[0], result.error[1], result.error[2]); return true;
          }
          await client.query(`UPDATE howdi_v8_chat_payments SET status='COMPLETED', txn_code=$2, decided_at=NOW() WHERE id=$1`, [pid, result.txn]);
        }
        await client.query(`UPDATE howdi_v8_pay_idem SET payment_id=$3 WHERE user_id=$1 AND idem_key=$2`, [vid, idem, pid]);
        await addMessage(client, cid, vid, kind === 'SEND' ? `Sent ₹${amount}` : `Requested ₹${amount}`, { kind: kind === 'SEND' ? 'payment' : 'request', payment: pid });
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      const me = await handleOf(vid);
      if (kind === 'SEND') await notify(other.uid, 'PAYMENT_RECEIVED', `@${me} sent you ₹${amount}`, `${note ? note + ' · ' : ''}Reference ${result.txn} · HPay Preview/Test`, route, vid);
      else await notify(other.uid, 'PAYMENT_REQUEST', `@${me} requested ₹${amount}`, `${note ? note + ' · ' : ''}Pay or decline in Messages.`, route, vid);
      const row = (await pool.query(`SELECT * FROM howdi_v8_chat_payments WHERE id=$1`, [pid])).rows[0];
      ok(res, { payment: await payDto(row, vid), balance: result ? result.balance : undefined }, 201); return true;
    }
    fail(res, 404, 'NOT_FOUND', 'Not found.'); return true;
  }
  return { ensureSchema, handle, _internal: { issue, resolve, convFor, members, convDto, payDto, addMessage, handleOf, checkPin, pinState, transfer, eligibility, money, line, text, iso, LIVE, hooks, PAY_MIN, PAY_MAX } };
}
module.exports = { createConnectV8Messages };
