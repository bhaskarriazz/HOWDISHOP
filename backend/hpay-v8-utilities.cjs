'use strict';
// =====================================================================================
// HOWDI V8 — HPay Utilities + QR Pay in Messages (boards V8__18 / V8__19; register MSG-012..016)
// Preview/Test only: every biller, operator, event and gift card below is a sandbox catalogue. No real provider is called and
// no real money moves (the V8 sandbox wallet + double-entry ledger shared with chat payments, Live tips and memberships).
//
//   GET  /api/v8/hpay/utilities/catalog                 operators + plans, billers, events, gift cards (sandbox)
//   POST /api/v8/hpay/bills/fetch {biller, consumer}     bill lookup: amount, due date, masked account
//   POST /api/v8/hpay/utilities/quote {…order}          review screen — nothing moves
//   POST /api/v8/hpay/utilities/orders {…order, pin, idempotency_key, conversation?, share?}
//        recharge · bill · ticket (self or gift to the chat peer) · gift card (to the chat peer or self)
//   POST /api/v8/hpay/utilities/requests {conversation, mobile, operator, circle, plan}   ask a chat peer to recharge you
//   GET  /api/v8/hpay/utilities/orders[?mine]            my utility history (bought, received, asked)
//   GET  /api/v8/hpay/utilities/orders/{UTL}             status (a pending order settles or is refunded here)
//   POST /api/v8/hpay/utilities/orders/{UTL}/pay|decline|cancel|redeem   pay / decline a recharge request · requester
//        cancels · gift-card recipient redeems to HPay balance
//   GET  /api/v8/hpay/qr[?amount=]                       my HPay QR (signed; optional fixed amount)
//   POST /api/v8/hpay/qr/resolve {code} · /qr/pay {code, amount, note, pin, idempotency_key}   scan → review → pay
//   GET  /api/v8/hpay/history                            receipts: every HPay debit / credit with reference
//
// Sandbox provider rules (so every state can be seen): a number / account ending 0000 → provider failure (nothing charged),
// 5555 → pending then success, 4444 → pending then failed and refunded. Everything else succeeds immediately.
// Rules: session-only actor; phone numbers and account numbers are stored server-side and shown masked (the requester's own
// full number is never sent to the person paying); gift-card and ticket codes only to their holder; one idempotency key per
// attempt; balance, per-order and daily limits; HPay PIN on every payment.
// =====================================================================================
const crypto = require('node:crypto');

const OPERATORS = [
  { key: 'jio', name: 'Jio' }, { key: 'airtel', name: 'Airtel' }, { key: 'vi', name: 'Vi' }, { key: 'bsnl', name: 'BSNL' },
];
const CIRCLES = ['Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Delhi NCR'];
const PLANS = {
  jio: [[199, '18 days', '1.5 GB/day'], [299, '28 days', '2 GB/day'], [749, '72 days', '2 GB/day'], [1899, '336 days', '24 GB total']],
  airtel: [[199, '28 days', '2 GB total'], [299, '28 days', '1.5 GB/day'], [859, '84 days', '1.5 GB/day'], [1999, '365 days', '24 GB total']],
  vi: [[179, '28 days', '2 GB total'], [299, '28 days', '1.5 GB/day'], [719, '84 days', '1.5 GB/day']],
  bsnl: [[107, '35 days', '3 GB total'], [199, '30 days', '2 GB/day'], [797, '300 days', '2 GB/day (60 days)']],
};
const planList = (op) => (PLANS[op] || []).map(([amount, validity, data]) => ({ key: `${op}-${amount}`, amount, validity, data, calls: 'Unlimited calls', sms: '100 SMS/day' }));
const BILLERS = [
  { key: 'tgspdcl', name: 'TGSPDCL — Telangana South Electricity', category: 'Electricity', label: 'Service number', re: '^\\d{9,13}$' },
  { key: 'tgnpdcl', name: 'TGNPDCL — Telangana North Electricity', category: 'Electricity', label: 'Service number', re: '^\\d{9,13}$' },
  { key: 'hmwssb', name: 'HMWSSB — Hyderabad Water', category: 'Water', label: 'CAN number', re: '^\\d{8,10}$' },
  { key: 'actfiber', name: 'ACT Fibernet', category: 'Broadband', label: 'Account number', re: '^\\d{6,12}$' },
  { key: 'bgl', name: 'Bhagyanagar Gas', category: 'Piped gas', label: 'BP number', re: '^\\d{8,12}$' },
  { key: 'tataplay', name: 'Tata Play', category: 'DTH', label: 'Subscriber ID', re: '^\\d{10}$' },
];
const EVENTS = [
  { key: 'crafts-fair', title: 'Hyderabad Crafts & Handloom Fair', venue: 'Shilparamam, Madhapur', dates: ['2026-10-10', '2026-10-11', '2026-10-12'], tiers: [{ key: 'gen', label: 'General entry', price: 100 }, { key: 'workshop', label: 'Entry + crochet workshop', price: 450 }] },
  { key: 'bathukamma', title: 'Bathukamma Evening Celebrations', venue: 'Tank Bund, Hyderabad', dates: ['2026-10-18'], tiers: [{ key: 'gen', label: 'Open seating', price: 50 }, { key: 'front', label: 'Front enclosure', price: 250 }] },
  { key: 'khammam-expo', title: 'Khammam Makers Expo', venue: 'Pavilion Grounds, Khammam', dates: ['2026-11-01', '2026-11-02'], tiers: [{ key: 'gen', label: 'Day pass', price: 80 }] },
];
const GIFTCARDS = [
  { key: 'howdi-shop', brand: 'HOWDI Shop', note: 'Spend on anything in HOWDI Shop', amounts: [250, 500, 1000, 2000] },
  { key: 'howdi-learn', brand: 'HOWDI Learn & Earn', note: 'Courses, workshops and batches', amounts: [500, 1000, 2500] },
  { key: 'howdi-hpay', brand: 'HPay Balance', note: 'Adds to their HPay balance when redeemed', amounts: [100, 250, 500, 1000] },
];
const MIN = 10, MAX = 10000;

function createHpayV8Utilities(deps) {
  const { pool, getBody, notify, wallet, sandboxEnabled, secret } = deps;
  const H = deps.helpers; const M = deps.messages;
  const { authorCols, authorJoins, authorDto, blockedSql, viewer, limited, ok, fail, userIdByHandle } = H;
  const { issue, resolve, convFor, members, convDto, payDto, addMessage, handleOf, checkPin, transfer, money, line, iso } = M;
  const QR_KEY = crypto.createHash('sha256').update(`howdi-v8-qr:${secret || crypto.randomBytes(16).toString('hex')}`).digest();

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_utility_orders(id BIGSERIAL PRIMARY KEY, type VARCHAR(10) NOT NULL CHECK (type IN ('RECHARGE','BILL','TICKET','GIFTCARD')),
      buyer_user_id BIGINT, requester_user_id BIGINT, recipient_user_id BIGINT, conversation_id BIGINT, amount NUMERIC(12,2) NOT NULL CHECK (amount>0),
      status VARCHAR(10) NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb, secret JSONB NOT NULL DEFAULT '{}'::jsonb, provider_ref VARCHAR(32), txn_code VARCHAR(24),
      failure VARCHAR(200), idem_key VARCHAR(64), settle_at TIMESTAMPTZ, settle_to VARCHAR(10), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), decided_at TIMESTAMPTZ, redeemed_at TIMESTAMPTZ)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS howdi_v8_utility_idem_uq ON howdi_v8_utility_orders(buyer_user_id, idem_key) WHERE idem_key IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_utility_user_idx ON howdi_v8_utility_orders(buyer_user_id, created_at DESC)`);
    await pool.query(`ALTER TABLE howdi_v8_chat_payments ALTER COLUMN conversation_id DROP NOT NULL`);
    await pool.query(`ALTER TABLE howdi_v8_chat_payments ADD COLUMN IF NOT EXISTS channel VARCHAR(6) NOT NULL DEFAULT 'CHAT'`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_qr_idem(user_id BIGINT NOT NULL, idem_key VARCHAR(64) NOT NULL, payment_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id, idem_key))`);
  }

  const mask = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 4 ? `•••• ${d.slice(-4)}` : '••••'; };
  const outcome = (digits) => (/0000$/.test(digits) ? 'fail' : /5555$/.test(digits) ? 'pending-ok' : /4444$/.test(digits) ? 'pending-refund' : 'ok');
  const code6 = (p) => `${p}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const idemOf = (b) => (/^[A-Za-z0-9_-]{8,64}$/.test(String(b.idempotency_key || '')) ? String(b.idempotency_key) : null);

  // ------------------------------------------------------------ order validation → { type, amount, details, secret, digits } | { error }
  function buildOrder(b) {
    const t = String(b.type || '').toLowerCase();
    if (t === 'recharge') {
      const mobile = String(b.mobile || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      if (!/^[6-9]\d{9}$/.test(mobile)) return { error: 'Enter a 10-digit Indian mobile number.' };
      const op = OPERATORS.find((o) => o.key === b.operator); if (!op) return { error: 'Choose the operator.' };
      const circle = CIRCLES.includes(b.circle) ? b.circle : null; if (!circle) return { error: 'Choose the circle.' };
      const plan = planList(op.key).find((x) => x.key === b.plan); if (!plan) return { error: 'Choose a plan.' };
      return { type: 'RECHARGE', amount: plan.amount, digits: mobile, details: { operator: op.name, circle, plan: `${plan.validity} · ${plan.data}`, number: mask(mobile) }, secret: { mobile } };
    }
    if (t === 'bill') {
      const bl = BILLERS.find((x) => x.key === b.biller); if (!bl) return { error: 'Choose a biller.' };
      const acct = String(b.consumer || '').replace(/\s/g, '');
      if (!new RegExp(bl.re).test(acct)) return { error: `Enter a valid ${bl.label.toLowerCase()}.` };
      const bill = billFor(bl, acct); if (!bill) return { error: 'No bill is due for this account.', code: 'NO_BILL' };
      return { type: 'BILL', amount: bill.amount, digits: acct, details: { biller: bl.name, category: bl.category, account: mask(acct), bill_date: bill.bill_date, due_date: bill.due_date, customer: bill.customer }, secret: { account: acct } };
    }
    if (t === 'ticket') {
      const ev = EVENTS.find((x) => x.key === b.event); if (!ev) return { error: 'Choose an event.' };
      const date = ev.dates.includes(b.date) ? b.date : null; if (!date) return { error: 'Choose a date.' };
      const tier = ev.tiers.find((x) => x.key === b.tier); if (!tier) return { error: 'Choose a ticket type.' };
      const qty = Math.floor(Number(b.qty)); if (!(qty >= 1 && qty <= 6)) return { error: 'Choose 1 to 6 tickets.' };
      return { type: 'TICKET', amount: tier.price * qty, digits: '', details: { event: ev.title, venue: ev.venue, date, tier: tier.label, qty }, secret: {} };
    }
    if (t === 'giftcard') {
      const g = GIFTCARDS.find((x) => x.key === b.card); if (!g) return { error: 'Choose a gift card.' };
      const amount = Number(b.amount); if (!g.amounts.includes(amount)) return { error: 'Choose an amount.' };
      return { type: 'GIFTCARD', amount, digits: '', details: { brand: g.brand, card: g.key, note: g.note, message: line(b.message, 140) || null }, secret: {} };
    }
    return { error: 'Choose what to pay for.' };
  }
  function billFor(bl, acct) {
    if (/0000$/.test(acct) && bl.category !== 'Electricity') return null; // "no bill due" state for non-electricity billers
    const h = crypto.createHash('sha256').update(`${bl.key}:${acct}`).digest();
    const amount = 150 + (h.readUInt16BE(0) % 2400); const days = 3 + (h[2] % 18);
    const due = new Date(Date.now() + days * 86400e3); const billed = new Date(Date.now() - 12 * 86400e3);
    const names = ['M. Reddy', 'A. Rao', 'L. Devi', 'K. Kumar', 'D. Sharma', 'R. Naidu'];
    return { amount, due_date: due.toISOString().slice(0, 10), bill_date: billed.toISOString().slice(0, 10), customer: names[h[3] % names.length] };
  }

  // ------------------------------------------------------------ DTO for whoever is looking (buyer / recipient / requester / chat member)
  const TITLE = { RECHARGE: 'Mobile recharge', BILL: 'Bill payment', TICKET: 'Event tickets', GIFTCARD: 'Gift card' };
  async function person(uid) { if (!uid) return null; const r = (await pool.query(`SELECT ${authorCols('a_u.id', 'a_')} FROM (SELECT $1::bigint u) z ${authorJoins('z.u', 'a_')}`, [uid])).rows[0]; return r ? authorDto(r, 'a_') : null; }
  async function orderDto(o, vid) {
    if (!o) return null;
    const code = (await issue('UTL', [o.id])).get(String(o.id));
    const buyer = Number(o.buyer_user_id) || null, recipient = Number(o.recipient_user_id) || null, requester = Number(o.requester_user_id) || null;
    const role = requester === vid && o.status === 'REQUESTED' ? 'requester' : buyer === vid ? 'buyer' : recipient === vid ? 'recipient' : requester === vid ? 'requester' : 'viewer';
    const st = String(o.status).toLowerCase(); const d = o.details || {};
    const holder = o.type === 'TICKET' || o.type === 'GIFTCARD' ? (recipient || buyer) : null;
    const lines = o.type === 'RECHARGE' ? [['Number', d.number], ['Operator', `${d.operator} · ${d.circle}`], ['Plan', d.plan]]
      : o.type === 'BILL' ? [['Biller', d.biller], ['Account', d.account], ['Name on bill', d.customer], ['Due', d.due_date]]
        : o.type === 'TICKET' ? [['Event', d.event], ['Venue', d.venue], ['Date', d.date], ['Tickets', `${d.qty} × ${d.tier}`]]
          : [['Card', d.brand], ...(d.message ? [['Message', d.message]] : [])];
    const actions = [];
    if (st === 'requested') { if (buyer === vid) actions.push('pay', 'decline'); if (requester === vid) actions.push('cancel'); }
    if (o.type === 'GIFTCARD' && st === 'success' && holder === vid && !o.redeemed_at && d.card === 'howdi-hpay') actions.push('redeem');
    const out = {
      public_key: code, type: o.type.toLowerCase(), title: TITLE[o.type], status: o.redeemed_at ? 'redeemed' : st, amount: money(o.amount), currency: 'INR', lines: lines.filter((x) => x[1]).map(([k, v]) => ({ label: k, value: String(v) })),
      role, actions, reference: o.txn_code || null, provider_ref: o.provider_ref || null, failure: o.failure || null,
      buyer: await person(buyer), recipient: recipient && recipient !== buyer ? await person(recipient) : null, requester: requester ? await person(requester) : null,
      created_at: iso(o.created_at), decided_at: iso(o.decided_at), redeemed_at: iso(o.redeemed_at), sandbox: true,
    };
    // secrets only to the holder: gift-card code, ticket codes (shown as a QR in the app)
    if (holder === vid && st === 'success') {
      if (o.type === 'GIFTCARD') out.code = o.secret?.code || null;
      if (o.type === 'TICKET') out.tickets = Array.isArray(o.secret?.tickets) ? o.secret.tickets : [];
    }
    return out;
  }
  M.hooks.utilityDto = async (id, vid) => {
    const o = (await pool.query(`SELECT * FROM howdi_v8_utility_orders WHERE id=$1`, [id])).rows[0];
    if (o) await settle(o);
    return orderDto(o && (await pool.query(`SELECT * FROM howdi_v8_utility_orders WHERE id=$1`, [id])).rows[0], vid);
  };

  // ------------------------------------------------------------ money (one transaction; debit to the sandbox provider, refunds credit back)
  async function debit(client, uid, amount, ref, note) {
    const w = await wallet(uid, client);
    if (!w) return { error: [503, 'PAYMENT_PROVIDER_REQUIRED', 'HPay isn’t connected in this environment, so no money can move.'] };
    // Same per-payer daily-limit lock as chat/QR payments (connect-v8-messages transfer), held until the transaction ends.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`hpay-daily:${uid}`]);
    const today = Number((await client.query(`SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_ledger WHERE user_id=$1 AND direction='DEBIT' AND kind IN ('CHAT_PAYMENT','QR_PAYMENT','UTILITY') AND created_at>NOW()-interval '1 day'`, [uid])).rows[0].s);
    if (today + amount > 25000) return { error: [422, 'DAILY_LIMIT', 'You can pay up to ₹25,000 a day with HPay in this preview.'] };
    const up = await client.query(`UPDATE howdi_v8_wallets SET balance=balance-$2, updated_at=NOW() WHERE user_id=$1 AND balance>=$2 RETURNING balance`, [uid, amount]);
    if (!up.rows[0]) return { error: [402, 'INSUFFICIENT_BALANCE', 'Not enough HPay balance. Nothing was charged.'] };
    const txn = 'HPU-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'DEBIT',$3,'UTILITY',$4,$5)`, [txn, uid, amount, ref, line(note, 190)]);
    return { txn, balance: money(up.rows[0].balance) };
  }
  async function credit(client, uid, amount, kind, ref, note) {
    await wallet(uid, client);
    await client.query(`UPDATE howdi_v8_wallets SET balance=balance+$2, updated_at=NOW() WHERE user_id=$1`, [uid, amount]);
    const txn = 'HPR-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'CREDIT',$3,$4,$5,$6)`, [txn, uid, amount, kind, ref, line(note, 190)]);
    return txn;
  }
  function secretsFor(type, qty) {
    if (type === 'GIFTCARD') return { code: `HGC-${crypto.randomBytes(6).toString('hex').toUpperCase().match(/.{4}/g).join('-')}` };
    if (type === 'TICKET') return { tickets: Array.from({ length: qty }, () => code6('TKT')) };
    return {};
  }
  // a pending sandbox order settles the first time anyone looks at it after settle_at
  async function settle(o) {
    if (o.status !== 'PENDING' || !o.settle_at || new Date(o.settle_at) > new Date()) return;
    const client = await pool.connect(); let done = null;
    try {
      await client.query('BEGIN');
      const row = (await client.query(`SELECT * FROM howdi_v8_utility_orders WHERE id=$1 FOR UPDATE`, [o.id])).rows[0];
      if (row.status !== 'PENDING') { await client.query('ROLLBACK'); return; }
      if (row.settle_to === 'SUCCESS') { await client.query(`UPDATE howdi_v8_utility_orders SET status='SUCCESS', provider_ref=$2, decided_at=NOW() WHERE id=$1`, [row.id, code6('PRV')]); done = 'SUCCESS'; }
      else {
        const ref = (await issue('UTL', [row.id])).get(String(row.id));
        await credit(client, Number(row.buyer_user_id), money(row.amount), 'UTILITY_REFUND', ref, `Refund · ${TITLE[row.type]}`);
        await client.query(`UPDATE howdi_v8_utility_orders SET status='REFUNDED', failure='The provider couldn’t complete this. Your money is back in HPay.', decided_at=NOW() WHERE id=$1`, [row.id]); done = 'REFUNDED';
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    const route = await routeFor(o);
    await notify(Number(o.buyer_user_id), done === 'SUCCESS' ? 'UTILITY_COMPLETED' : 'UTILITY_REFUNDED', done === 'SUCCESS' ? `${TITLE[o.type]} completed: ₹${money(o.amount)}` : `${TITLE[o.type]} refunded: ₹${money(o.amount)}`, done === 'SUCCESS' ? 'The provider confirmed it.' : 'The provider couldn’t complete it. The money is back in HPay.', route, null);
    if (o.requester_user_id && done === 'SUCCESS') await notify(Number(o.requester_user_id), 'RECHARGE_DONE', `Your recharge is done: ₹${money(o.amount)}`, `${o.details?.operator || ''} ${o.details?.number || ''}`.trim(), route, Number(o.buyer_user_id));
  }
  async function routeFor(o) { if (!o.conversation_id) return '/connect/messages'; const c = (await issue('CONV', [o.conversation_id])).get(String(o.conversation_id)); return `/connect/messages/${c}`; }

  // run a purchase / request payment inside one transaction; returns { order } or { error }
  async function execute(client, row, vid, digits) {
    const ref = (await issue('UTL', [row.id])).get(String(row.id));
    const how = digits ? outcome(digits) : 'ok';
    if (how === 'fail') return { error: [502, 'PROVIDER_FAILED', row.type === 'RECHARGE' ? 'The operator didn’t accept this recharge. Nothing was charged.' : 'The biller didn’t accept this payment. Nothing was charged.'] };
    const r = await debit(client, vid, money(row.amount), ref, `${TITLE[row.type]}${row.details?.operator ? ` · ${row.details.operator}` : row.details?.biller ? ` · ${row.details.biller}` : row.details?.event ? ` · ${row.details.event}` : row.details?.brand ? ` · ${row.details.brand}` : ''}`);
    if (r.error) return r;
    const pending = how.startsWith('pending');
    const sec = { ...(row.secret || {}), ...secretsFor(row.type, Number(row.details?.qty) || 1) };
    await client.query(`UPDATE howdi_v8_utility_orders SET status=$2::varchar, txn_code=$3, provider_ref=$4, secret=$5::jsonb, settle_at=$6, settle_to=$7, decided_at=CASE WHEN $2::varchar='SUCCESS' THEN NOW() END, buyer_user_id=$8 WHERE id=$1`,
      [row.id, pending ? 'PENDING' : 'SUCCESS', r.txn, pending ? null : code6('PRV'), JSON.stringify(sec), pending ? new Date(Date.now() + 6000) : null, how === 'pending-ok' ? 'SUCCESS' : how === 'pending-refund' ? 'REFUNDED' : null, vid]);
    return { txn: r.txn, balance: r.balance, pending };
  }

  // ------------------------------------------------------------ QR (MSG-016): HOWDIPAY:1:<handle>:<amount|->:<sig>
  const qrSig = (h, a) => crypto.createHmac('sha256', QR_KEY).update(`1:${h}:${a}`).digest('hex').slice(0, 16);
  function parseQr(code) {
    const m = String(code || '').trim().match(/^HOWDIPAY:1:([a-z0-9._]{3,30}):(-|\d{1,5}):([0-9a-f]{16})$/);
    if (!m) return null;
    const good = crypto.timingSafeEqual(Buffer.from(qrSig(m[1], m[2])), Buffer.from(m[3]));
    return good ? { handle: m[1], amount: m[2] === '-' ? null : Number(m[2]) } : null;
  }

  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (!/^\/api\/v8\/hpay\/(utilities|bills|qr|history|add-money)(\/|$)/.test(p)) return false;
    const v = await viewer(req);
    if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to use HPay.'); return true; }
    const vid = v.id; let m;
    const conv1to1 = async (code) => {
      const cid = await resolve(code, 'CONV'); const c = cid ? await convFor(vid, cid) : null; if (!c) return null;
      const ms = await members(cid, vid); const dto = await convDto(c, vid, code, ms);
      return { cid, c, ms, dto, other: ms.find((x) => !x.me), route: `/connect/messages/${code}` };
    };

    if (p === '/api/v8/hpay/utilities/catalog' && req.method === 'GET') {
      ok(res, { sandbox: true, notice: 'Preview / Test catalogue — no real operator, biller or event is charged.', operators: OPERATORS, circles: CIRCLES, plans: Object.fromEntries(OPERATORS.map((o) => [o.key, planList(o.key)])),
        billers: BILLERS.map(({ re, ...b }) => b), events: EVENTS, giftcards: GIFTCARDS, limits: { min: MIN, max: MAX } }); return true;
    }
    if (p === '/api/v8/hpay/bills/fetch' && req.method === 'POST') {
      if (limited(res, `v8-bill:${vid}`, 30, 10 * 60000)) return true;
      const b = (await getBody(req)) || {}; const o = buildOrder({ ...b, type: 'bill' });
      if (o.error) { fail(res, o.code === 'NO_BILL' ? 404 : 400, o.code || 'VALIDATION', o.error); return true; }
      ok(res, { bill: { amount: o.amount, ...o.details } }); return true;
    }
    if (p === '/api/v8/hpay/utilities/quote' && req.method === 'POST') {
      const b = (await getBody(req)) || {}; const o = buildOrder(b);
      if (o.error) { fail(res, o.code === 'NO_BILL' ? 404 : 400, o.code || 'VALIDATION', o.error); return true; }
      const w = await wallet(vid);
      ok(res, { review: { type: o.type.toLowerCase(), amount: o.amount, fee: 0, total: o.amount, details: o.details, balance: w ? money(w.balance) : null, provider_ready: Boolean(w), sandbox: sandboxEnabled(), warning: 'Please review. Nothing has been paid yet.' } }); return true;
    }

    if (p === '/api/v8/hpay/utilities/orders' && req.method === 'POST') {
      const b = (await getBody(req)) || {}; const idem = idemOf(b);
      if (!idem) { fail(res, 400, 'VALIDATION', 'Missing payment key. Please try again.'); return true; }
      const prior = (await pool.query(`SELECT * FROM howdi_v8_utility_orders WHERE buyer_user_id=$1 AND idem_key=$2`, [vid, idem])).rows[0];
      if (prior && !['FAILED'].includes(prior.status)) { ok(res, { order: await orderDto(prior, vid), replayed: true }); return true; }
      const o = buildOrder(b); if (o.error) { fail(res, 400, o.code || 'VALIDATION', o.error); return true; }
      if (!(o.amount >= MIN && o.amount <= MAX)) { fail(res, 400, 'VALIDATION', `HPay utilities take ₹${MIN} to ₹${MAX.toLocaleString('en-IN')} per order.`); return true; }
      let cv = null, recipient = null;
      if (b.conversation) {
        cv = await conv1to1(String(b.conversation));
        if (!cv) { fail(res, 404, 'NOT_FOUND', 'This conversation isn’t available.'); return true; }
        if (!cv.dto.can_pay) { fail(res, 403, 'NOT_ALLOWED', 'HPay in chat is available in one-to-one chats you can message.'); return true; }
        // a gift card always goes to the chat peer; tickets only when "for them" is chosen
        if (o.type === 'GIFTCARD' || (o.type === 'TICKET' && b.for === 'them')) recipient = cv.other.uid;
      } else if (o.type === 'GIFTCARD' && b.for !== 'me') { fail(res, 400, 'VALIDATION', 'Send a gift card from a chat, or choose “for me”.'); return true; }
      if (limited(res, `v8-util:${vid}`, 20, 10 * 60000)) return true;
      const pin = await checkPin(vid, b.pin); if (pin.error) { fail(res, pin.error[0], pin.error[1], pin.error[2]); return true; }
      const client = await pool.connect(); let row, r;
      try {
        await client.query('BEGIN');
        if (prior) await client.query(`UPDATE howdi_v8_utility_orders SET idem_key=NULL WHERE id=$1`, [prior.id]); // a failed attempt frees its key for Retry
        row = (await client.query(`INSERT INTO howdi_v8_utility_orders(type,buyer_user_id,recipient_user_id,conversation_id,amount,status,details,secret,idem_key) VALUES($1,$2,$3,$4,$5,'PROCESSING',$6::jsonb,$7::jsonb,$8)
          ON CONFLICT (buyer_user_id, idem_key) WHERE idem_key IS NOT NULL DO NOTHING RETURNING *`, [o.type, vid, recipient || (o.type === 'GIFTCARD' || o.type === 'TICKET' ? vid : null), cv ? cv.cid : null, o.amount, JSON.stringify(o.details), JSON.stringify(o.secret), idem])).rows[0];
        if (!row) { await client.query('ROLLBACK'); fail(res, 409, 'IN_PROGRESS', 'This payment is already being processed.'); return true; }
        r = await execute(client, row, vid, o.digits);
        if (r.error) {
          await client.query('ROLLBACK');
          await pool.query(`INSERT INTO howdi_v8_utility_orders(type,buyer_user_id,conversation_id,amount,status,details,failure,idem_key,decided_at) VALUES($1,$2,$3,$4,'FAILED',$5::jsonb,$6,$7,NOW()) ON CONFLICT DO NOTHING`, [o.type, vid, cv ? cv.cid : null, o.amount, JSON.stringify(o.details), r.error[2], idem]);
          fail(res, r.error[0], r.error[1], r.error[2]); return true;
        }
        if (cv && b.share !== false) await addMessage(client, cv.cid, vid, `${TITLE[o.type]} · ₹${o.amount}`, { kind: 'utility', utility: row.id });
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      const me = await handleOf(vid);
      if (recipient && recipient !== vid) await notify(recipient, o.type === 'GIFTCARD' ? 'GIFT_CARD_RECEIVED' : 'TICKET_RECEIVED', o.type === 'GIFTCARD' ? `@${me} sent you a ₹${o.amount} ${o.details.brand} gift card` : `@${me} got you ${o.details.qty} ticket${o.details.qty > 1 ? 's' : ''}: ${o.details.event}`, 'Open Messages to see it.', cv.route, vid);
      const fresh = (await pool.query(`SELECT * FROM howdi_v8_utility_orders WHERE id=$1`, [row.id])).rows[0];
      ok(res, { order: await orderDto(fresh, vid), balance: r.balance, pending: r.pending }, 201); return true;
    }

    if (p === '/api/v8/hpay/utilities/requests' && req.method === 'POST') {
      // MSG-013: "recharge me" — the requester's number stays on the server; the payer sees it masked
      const b = (await getBody(req)) || {};
      const cv = await conv1to1(String(b.conversation || ''));
      if (!cv) { fail(res, 404, 'NOT_FOUND', 'This conversation isn’t available.'); return true; }
      if (!cv.dto.can_pay) { fail(res, 403, 'NOT_ALLOWED', 'Recharge requests work in one-to-one chats you can message.'); return true; }
      const o = buildOrder({ ...b, type: 'recharge' }); if (o.error) { fail(res, 400, 'VALIDATION', o.error); return true; }
      if (limited(res, `v8-util-req:${vid}`, 10, 60 * 60000)) return true;
      const open = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_utility_orders WHERE requester_user_id=$1 AND conversation_id=$2 AND status='REQUESTED'`, [vid, cv.cid])).rows[0].n);
      if (open >= 2) { fail(res, 409, 'TOO_MANY_OPEN', 'You already have open recharge requests in this chat.'); return true; }
      const row = (await pool.query(`INSERT INTO howdi_v8_utility_orders(type,requester_user_id,buyer_user_id,recipient_user_id,conversation_id,amount,status,details,secret) VALUES('RECHARGE',$1,$2,$1,$3,$4,'REQUESTED',$5::jsonb,$6::jsonb) RETURNING *`,
        [vid, cv.other.uid, cv.cid, o.amount, JSON.stringify(o.details), JSON.stringify(o.secret)])).rows[0];
      await addMessage(pool, cv.cid, vid, `Recharge request · ₹${o.amount}`, { kind: 'utility', utility: row.id });
      await notify(cv.other.uid, 'RECHARGE_REQUEST', `@${await handleOf(vid)} asked you for a ₹${o.amount} recharge`, `${o.details.operator} · ${o.details.plan}`, cv.route, vid);
      ok(res, { order: await orderDto(row, vid) }, 201); return true;
    }

    if (p === '/api/v8/hpay/utilities/orders' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT * FROM howdi_v8_utility_orders WHERE buyer_user_id=$1 OR recipient_user_id=$1 OR requester_user_id=$1 ORDER BY created_at DESC LIMIT 50`, [vid])).rows;
      const items = []; for (const o of rows) { await settle(o); items.push(await orderDto((await pool.query(`SELECT * FROM howdi_v8_utility_orders WHERE id=$1`, [o.id])).rows[0], vid)); }
      ok(res, { items }); return true;
    }
    if ((m = p.match(/^\/api\/v8\/hpay\/utilities\/orders\/(UTL-[0-9A-F]{12})(?:\/(pay|decline|cancel|redeem))?$/))) {
      const k = await resolve(m[1], 'UTL');
      let o = k ? (await pool.query(`SELECT * FROM howdi_v8_utility_orders WHERE id=$1 AND (buyer_user_id=$2 OR recipient_user_id=$2 OR requester_user_id=$2)`, [k, vid])).rows[0] : null;
      if (!o) { fail(res, 404, 'NOT_FOUND', 'That order isn’t available.'); return true; }
      if (!m[2] && req.method === 'GET') { await settle(o); o = (await pool.query(`SELECT * FROM howdi_v8_utility_orders WHERE id=$1`, [k])).rows[0]; ok(res, { order: await orderDto(o, vid) }); return true; }
      if (req.method !== 'POST') { fail(res, 405, 'METHOD', 'Not allowed.'); return true; }
      const b = (await getBody(req)) || {}; const route = await routeFor(o); const me = await handleOf(vid);
      if (m[2] === 'cancel') {
        const u = await pool.query(`UPDATE howdi_v8_utility_orders SET status='CANCELLED', decided_at=NOW() WHERE id=$1 AND requester_user_id=$2 AND status='REQUESTED' RETURNING *`, [k, vid]);
        if (!u.rowCount) { fail(res, 409, 'INVALID_STATE', 'Only your own open request can be cancelled.'); return true; }
        await notify(Number(o.buyer_user_id), 'RECHARGE_REQUEST_CANCELLED', `@${me} cancelled their recharge request`, 'Nothing to pay.', route, vid);
        ok(res, { order: await orderDto(u.rows[0], vid) }); return true;
      }
      if (m[2] === 'decline') {
        const u = await pool.query(`UPDATE howdi_v8_utility_orders SET status='DECLINED', decided_at=NOW() WHERE id=$1 AND buyer_user_id=$2 AND requester_user_id IS NOT NULL AND status='REQUESTED' RETURNING *`, [k, vid]);
        if (!u.rowCount) { fail(res, 409, 'INVALID_STATE', 'This request can’t be declined now.'); return true; }
        await notify(Number(o.requester_user_id), 'RECHARGE_REQUEST_DECLINED', `@${me} declined your recharge request`, `₹${money(o.amount)} · ${o.details?.operator || ''}`, route, vid);
        ok(res, { order: await orderDto(u.rows[0], vid) }); return true;
      }
      if (m[2] === 'redeem') {
        const client = await pool.connect(); let out;
        try {
          await client.query('BEGIN');
          const row = (await client.query(`SELECT * FROM howdi_v8_utility_orders WHERE id=$1 FOR UPDATE`, [k])).rows[0];
          const holder = Number(row.recipient_user_id || row.buyer_user_id);
          if (row.type !== 'GIFTCARD' || holder !== vid || row.status !== 'SUCCESS' || row.details?.card !== 'howdi-hpay') { await client.query('ROLLBACK'); fail(res, 409, 'INVALID_STATE', 'This gift card can’t be redeemed to HPay.'); return true; }
          if (row.redeemed_at) { await client.query('ROLLBACK'); ok(res, { order: await orderDto(row, vid), replayed: true }); return true; }
          await credit(client, vid, money(row.amount), 'GIFT_CARD', m[1], `Gift card redeemed · ${row.details?.brand || ''}`);
          await client.query(`UPDATE howdi_v8_utility_orders SET redeemed_at=NOW() WHERE id=$1`, [k]);
          await client.query('COMMIT');
          out = (await pool.query(`SELECT * FROM howdi_v8_utility_orders WHERE id=$1`, [k])).rows[0];
        } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
        if (Number(out.buyer_user_id) !== vid) await notify(Number(out.buyer_user_id), 'GIFT_CARD_REDEEMED', `@${me} redeemed your gift card`, `₹${money(out.amount)} · ${out.details?.brand || ''}`, route, vid);
        const w = await wallet(vid);
        ok(res, { order: await orderDto(out, vid), balance: w ? money(w.balance) : null }); return true;
      }
      // pay a recharge request
      if (Number(o.buyer_user_id) !== vid || !o.requester_user_id) { fail(res, 403, 'NOT_ALLOWED', 'Only the person asked can pay this request.'); return true; }
      if (o.status !== 'REQUESTED') { if (['SUCCESS', 'PENDING'].includes(o.status)) { ok(res, { order: await orderDto(o, vid), replayed: true }); return true; } fail(res, 409, 'INVALID_STATE', `This request is ${String(o.status).toLowerCase()}.`); return true; }
      if (!idemOf(b)) { fail(res, 400, 'VALIDATION', 'Missing payment key. Please try again.'); return true; }
      if ((await pool.query(`SELECT ${blockedSql('$1::bigint', '$2::bigint')} b`, [vid, o.requester_user_id])).rows[0].b) { fail(res, 403, 'NOT_ALLOWED', 'You can’t pay this person.'); return true; }
      if (limited(res, `v8-util:${vid}`, 20, 10 * 60000)) return true;
      const pin = await checkPin(vid, b.pin); if (pin.error) { fail(res, pin.error[0], pin.error[1], pin.error[2]); return true; }
      const client = await pool.connect(); let r;
      try {
        await client.query('BEGIN');
        const row = (await client.query(`SELECT * FROM howdi_v8_utility_orders WHERE id=$1 FOR UPDATE`, [k])).rows[0];
        if (row.status !== 'REQUESTED') { await client.query('ROLLBACK'); ok(res, { order: await orderDto(row, vid), replayed: true }); return true; }
        r = await execute(client, row, vid, String(row.secret?.mobile || ''));
        if (r.error) { await client.query('ROLLBACK'); fail(res, r.error[0], r.error[1], r.error[2]); return true; }
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      const fresh = (await pool.query(`SELECT * FROM howdi_v8_utility_orders WHERE id=$1`, [k])).rows[0];
      if (fresh.status === 'SUCCESS') await notify(Number(o.requester_user_id), 'RECHARGE_DONE', `@${me} recharged your number: ₹${money(o.amount)}`, `${o.details?.operator || ''} ${o.details?.number || ''}`.trim(), route, vid);
      ok(res, { order: await orderDto(fresh, vid), balance: r.balance, pending: r.pending }); return true;
    }

    // ---- QR
    if (p === '/api/v8/hpay/qr' && req.method === 'GET') {
      const h = await handleOf(vid); if (!/^[a-z0-9._]{3,30}$/.test(h)) { fail(res, 409, 'NO_HANDLE', 'Choose your @username first.'); return true; }
      const a = url.searchParams.get('amount'); const amount = a ? Math.floor(Number(a)) : null;
      if (amount !== null && !(amount >= 1 && amount <= M.PAY_MAX)) { fail(res, 400, 'VALIDATION', `Fixed amounts are ₹1 to ₹${M.PAY_MAX.toLocaleString('en-IN')}.`); return true; }
      const part = amount === null ? '-' : String(amount);
      ok(res, { payload: `HOWDIPAY:1:${h}:${part}:${qrSig(h, part)}`, handle: h, amount, sandbox: true }); return true;
    }
    if ((p === '/api/v8/hpay/qr/resolve' || p === '/api/v8/hpay/qr/pay') && req.method === 'POST') {
      const b = (await getBody(req)) || {}; const q = parseQr(b.code);
      if (!q) { fail(res, 400, 'QR_INVALID', 'This isn’t a valid HOWDI Pay QR code.'); return true; }
      const payee = await userIdByHandle(q.handle);
      if (!payee) { fail(res, 404, 'NOT_FOUND', 'This QR code belongs to an account that isn’t available.'); return true; }
      if (payee === vid) { fail(res, 400, 'SELF', 'That’s your own QR code.'); return true; }
      if ((await pool.query(`SELECT ${blockedSql('$1::bigint', '$2::bigint')} b`, [vid, payee])).rows[0].b) { fail(res, 403, 'NOT_ALLOWED', 'You can’t pay this person.'); return true; }
      const who = await person(payee);
      if (p.endsWith('/resolve')) { const w = await wallet(vid); ok(res, { payee: who, amount: q.amount, balance: w ? money(w.balance) : null, provider_ready: Boolean(w), warning: 'Check the name and @username before you pay.' }); return true; }
      const idem = idemOf(b); if (!idem) { fail(res, 400, 'VALIDATION', 'Missing payment key. Please try again.'); return true; }
      const prior = (await pool.query(`SELECT p.* FROM howdi_v8_qr_idem i JOIN howdi_v8_chat_payments p ON p.id=i.payment_id WHERE i.user_id=$1 AND i.idem_key=$2`, [vid, idem])).rows[0];
      if (prior) { ok(res, { payment: await payDto(prior, vid), replayed: true }); return true; }
      const amount = q.amount !== null ? q.amount : money(b.amount);
      if (!(amount >= M.PAY_MIN && amount <= M.PAY_MAX)) { fail(res, 400, 'VALIDATION', `Enter an amount from ₹${M.PAY_MIN} to ₹${M.PAY_MAX.toLocaleString('en-IN')}.`); return true; }
      if (limited(res, `v8-pay:${vid}`, 20, 10 * 60000)) return true;
      const pin = await checkPin(vid, b.pin); if (pin.error) { fail(res, pin.error[0], pin.error[1], pin.error[2]); return true; }
      const dm = (await pool.query(`SELECT c.id FROM howdi_connect_conversations c JOIN howdi_connect_conversation_members a ON a.conversation_id=c.id AND a.user_id=$1 AND a.left_at IS NULL JOIN howdi_connect_conversation_members b ON b.conversation_id=c.id AND b.user_id=$2 WHERE c.conversation_type='DIRECT' AND c.request_status IS NULL ORDER BY c.updated_at DESC LIMIT 1`, [vid, payee])).rows[0];
      const note = line(b.note, 140) || null;
      const client = await pool.connect(); let pid, result;
      try {
        await client.query('BEGIN');
        const claimed = await client.query(`INSERT INTO howdi_v8_qr_idem(user_id,idem_key) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING user_id`, [vid, idem]);
        if (!claimed.rowCount) { await client.query('ROLLBACK'); fail(res, 409, 'IN_PROGRESS', 'This payment is already being processed.'); return true; }
        pid = Number((await client.query(`INSERT INTO howdi_v8_chat_payments(conversation_id,kind,payer_user_id,payee_user_id,created_by,amount,note,status,channel) VALUES($1,'SEND',$2,$3,$2,$4,$5,'PROCESSING','QR') RETURNING id`, [dm ? dm.id : null, vid, payee, amount, note])).rows[0].id);
        const pcode = (await issue('PAY', [pid])).get(String(pid));
        result = await transfer(client, vid, payee, amount, note || 'QR payment', pcode, 'QR_PAYMENT');
        if (result.error) { await client.query('ROLLBACK'); fail(res, result.error[0], result.error[1], result.error[2]); return true; }
        await client.query(`UPDATE howdi_v8_chat_payments SET status='COMPLETED', txn_code=$2, decided_at=NOW() WHERE id=$1`, [pid, result.txn]);
        await client.query(`UPDATE howdi_v8_qr_idem SET payment_id=$3 WHERE user_id=$1 AND idem_key=$2`, [vid, idem, pid]);
        if (dm) await addMessage(client, Number(dm.id), vid, `Paid ₹${amount} by QR`, { kind: 'payment', payment: pid });
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      const route = dm ? `/connect/messages/${(await issue('CONV', [dm.id])).get(String(dm.id))}` : '/connect/messages';
      await notify(payee, 'PAYMENT_RECEIVED', `@${await handleOf(vid)} paid you ₹${amount} by QR`, `${note ? note + ' · ' : ''}Reference ${result.txn} · HPay Preview/Test`, route, vid);
      const row = (await pool.query(`SELECT * FROM howdi_v8_chat_payments WHERE id=$1`, [pid])).rows[0];
      ok(res, { payment: await payDto(row, vid), balance: result.balance }, 201); return true;
    }

    // Preview/Test only: add test money to the sandbox wallet (never available without the sandbox). Idempotent per key.
    if (p === '/api/v8/hpay/add-money' && req.method === 'POST') {
      if (!sandboxEnabled()) { fail(res, 503, 'PAYMENT_PROVIDER_REQUIRED', 'Adding money needs a payment provider, which isn’t connected yet.'); return true; }
      const b = (await getBody(req)) || {}; const amount = Math.round(Number(b.amount)); const idem = line(b.idem_key, 64);
      if (!idem) { fail(res, 400, 'VALIDATION', 'Missing payment key. Please try again.'); return true; }
      if (!(amount >= 100 && amount <= 5000)) { fail(res, 400, 'AMOUNT', 'Add between ₹100 and ₹5,000 at a time.'); return true; }
      const ref = 'TOPUP-' + crypto.createHash('sha256').update(`${vid}:${idem}`).digest('hex').slice(0, 16).toUpperCase();
      const client = await pool.connect();
      try {
        await client.query('BEGIN'); await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`topup:${vid}`]);
        const prior = (await client.query(`SELECT amount FROM howdi_v8_ledger WHERE user_id=$1 AND kind='TOPUP' AND reference=$2`, [vid, ref])).rows[0];
        if (!prior) {
          const today = Number((await client.query(`SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_ledger WHERE user_id=$1 AND kind='TOPUP' AND created_at>NOW()-interval '1 day'`, [vid])).rows[0].s);
          if (today + amount > 10000) { await client.query('ROLLBACK'); fail(res, 422, 'DAILY_LIMIT', 'You can add up to ₹10,000 a day in this preview.'); return true; }
          await wallet(vid, client); await client.query(`UPDATE howdi_v8_wallets SET balance=balance+$2, updated_at=NOW() WHERE user_id=$1`, [vid, amount]);
          await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'CREDIT',$3,'TOPUP',$4,'Added money (Preview/Test)')`, ['HPT-' + crypto.randomBytes(5).toString('hex').toUpperCase(), vid, amount, ref]);
        }
        await client.query('COMMIT');
        const w = await wallet(vid); ok(res, { added: prior ? money(prior.amount) : amount, replayed: Boolean(prior), balance: money(w.balance) }); return true;
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    }
    if (p === '/api/v8/hpay/history' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT l.txn_code, l.direction, l.amount, l.kind, l.reference, l.note, l.status, l.created_at, ${authorCols('a_u.id', 'a_')}
        FROM howdi_v8_ledger l ${authorJoins('l.counterparty_user_id', 'a_')} WHERE l.user_id=$1 ORDER BY l.created_at DESC, l.id DESC LIMIT 60`, [vid])).rows;
      const LABEL = { CHAT_PAYMENT: 'Payment in Messages', QR_PAYMENT: 'QR payment', UTILITY: 'Utilities', UTILITY_REFUND: 'Refund', GIFT_CARD: 'Gift card redeemed', LIVE_TIP: 'Live tip', CREATOR_PAYOUT: 'Creator payout', TOPUP: 'Added money', SHOP_PAYMENT: 'Shop order', SHOP_REFUND: 'Shop refund', SHOP_EARNING: 'Shop sale', SHOP_RETURN: 'Shop return', LEARN_PAYMENT: 'Course', WORKS_PAYMENT: 'Works booking' };
      const w = await wallet(vid);
      ok(res, { balance: w ? money(w.balance) : null, sandbox: sandboxEnabled(), items: rows.map((r) => ({ reference: r.txn_code, direction: r.direction === 'CREDIT' ? 'in' : 'out', amount: money(r.amount), label: LABEL[r.kind] || 'HPay', note: line(r.note, 190) || null, status: String(r.status || 'COMPLETED').toLowerCase(), counterpart: authorDto(r, 'a_'), order: /^(PAY|UTL)-[0-9A-F]{12}$/.test(String(r.reference || '')) ? r.reference : null, created_at: iso(r.created_at) })) });
      return true;
    }
    fail(res, 404, 'NOT_FOUND', 'Not found.'); return true;
  }
  return { ensureSchema, handle };
}
module.exports = { createHpayV8Utilities, _catalog: { OPERATORS, CIRCLES, BILLERS, EVENTS, GIFTCARDS } };
