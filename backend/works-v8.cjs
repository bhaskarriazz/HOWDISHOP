'use strict';
// =====================================================================================
// HOWDI V8 — WORKS booking journey, both sides (boards V8__09 Works, V8__20 Worker dashboard, V8__33 Consent & Job PIN;
// register WRK-001..013, WKR-003A/004..008/011, WRK-005A/B/C, WKR-005A, WRK-010/010A).
// Built on the existing Works tables (works_workers / works_worker_services / works_services / works_work_orders /
// works_work_offers / works_job_journeys / works_reviews) plus V8 tables for the pieces the legacy flow got wrong:
//   • private details (exact address, phone, name, private notes) are stored apart from the order and released to the
//     worker field by field only after the customer consents (every release is logged) — before that the worker sees only
//     service, area, date/time and price;
//   • the job PIN is shown to the customer only after the worker marks "arrived", and the WORKER enters it (5 tries, then a
//     15-minute lock and the customer is told);
//   • payment: HPay (Preview/Test sandbox) is held at booking and released to the worker when the customer confirms the job
//     is done (refunded on cancel / expiry), or "pay after the job" (recorded, no money moves in HOWDI). Idempotent.
//
// Customer   GET  /api/v8/works/services · /workers?service=&q=&sort= · /workers/{ref} · /workers/{ref}/slots?days=
//            POST /api/v8/works/workers/{ref}/save|block|report · GET /api/v8/works/saved
//            POST /api/v8/works/bookings/quote · POST /api/v8/works/bookings · GET /api/v8/works/bookings?tab=
//            GET  /api/v8/works/bookings/{BKG}   (role-aware: customer or worker)
//            POST /api/v8/works/bookings/{BKG}/consent {fields[]} | consent/decline | consent/withdraw | cancel | confirm | issue | review
// Worker     GET  /api/v8/works/worker/me · /worker/jobs?tab=offers|active|history · /worker/earnings · GET|PUT /worker/hours
//            POST /api/v8/works/worker/status {online|busy|offline} · POST /worker/payouts
//            POST /api/v8/works/bookings/{BKG}/accept | decline | stage {en_route|arrived} | pin {pin} | complete | worker-cancel | review/respond
// Both       GET|POST /api/v8/works/bookings/{BKG}/messages   (after the customer consents, until 7 days after closing)
// Rules: session-only actor; public codes (BKG-…), worker codes and @handles only; no numeric ids, phone numbers or emails
// in any payload unless that field was consented; blocks both ways hide workers and stop bookings.
// =====================================================================================
const crypto = require('node:crypto');

const PRIVATE_FIELDS = ['name', 'address', 'phone', 'notes'];
const FIELD_LABEL = { name: 'Your name', address: 'Exact address', phone: 'Phone number', notes: 'Private notes' };
const REQUEST_TTL_MIN = 30, CONSENT_TTL_MIN = 15, AUTO_CONFIRM_H = 48, FEE_RATE = 0.1;
const STATES = ['REQUESTED', 'ACCEPTED', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'DISPUTED'];
const LEGACY_STATUS = { REQUESTED: 'offered', ACCEPTED: 'accepted', CONFIRMED: 'accepted', EN_ROUTE: 'in_progress', ARRIVED: 'in_progress', IN_PROGRESS: 'in_progress', COMPLETED: 'completed', CLOSED: 'completed', DECLINED: 'cancelled', EXPIRED: 'cancelled', CANCELLED: 'cancelled', DISPUTED: 'in_progress' };
const REPORT_REASONS = ['safety', 'harassment', 'no_show', 'fraud', 'poor_work', 'overcharging', 'other'];

function createWorksV8(deps) {
  const { pool, getBody, notify, wallet, sandboxEnabled } = deps;
  const H = deps.helpers; const M = deps.messages;
  const { authorCols, authorJoins, authorDto, blockedSql, viewer, limited, ok, fail } = H;
  const { issue, resolve, checkPin, money, line, text, iso } = M;

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_bookings(work_order_id BIGINT PRIMARY KEY, worker_id BIGINT NOT NULL, customer_user_id BIGINT NOT NULL, service_id BIGINT,
      state VARCHAR(12) NOT NULL, starts_at TIMESTAMPTZ NOT NULL, area VARCHAR(120), summary VARCHAR(600), amount NUMERIC(12,2) NOT NULL, fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      method VARCHAR(8) NOT NULL DEFAULT 'HPAY', pay_state VARCHAR(10) NOT NULL DEFAULT 'NONE', hold_txn VARCHAR(24), release_txn VARCHAR(24), refund_txn VARCHAR(24), idem_key VARCHAR(64),
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), accepted_at TIMESTAMPTZ, consent_due TIMESTAMPTZ, confirmed_at TIMESTAMPTZ, en_route_at TIMESTAMPTZ, arrived_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, closed_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ, cancelled_by VARCHAR(8), cancel_reason VARCHAR(300), decline_reason VARCHAR(300))`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS howdi_v8_works_bookings_idem ON howdi_v8_works_bookings(customer_user_id, idem_key) WHERE idem_key IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_works_bookings_worker ON howdi_v8_works_bookings(worker_id, starts_at)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_private(work_order_id BIGINT PRIMARY KEY, name VARCHAR(80), address TEXT, landmark VARCHAR(120), pincode VARCHAR(10), phone VARCHAR(16), notes VARCHAR(600))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_consents(work_order_id BIGINT PRIMARY KEY, fields JSONB NOT NULL DEFAULT '[]'::jsonb, status VARCHAR(10) NOT NULL, decided_at TIMESTAMPTZ, withdrawn_at TIMESTAMPTZ)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_release_log(id BIGSERIAL PRIMARY KEY, work_order_id BIGINT NOT NULL, worker_user_id BIGINT NOT NULL, fields JSONB NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_pins(work_order_id BIGINT PRIMARY KEY, pin VARCHAR(6) NOT NULL, attempts INT NOT NULL DEFAULT 0, locked_until TIMESTAMPTZ, verified_at TIMESTAMPTZ)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_events(id BIGSERIAL PRIMARY KEY, work_order_id BIGINT NOT NULL, actor VARCHAR(8) NOT NULL, event VARCHAR(24) NOT NULL, note VARCHAR(300), at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_messages(id BIGSERIAL PRIMARY KEY, work_order_id BIGINT NOT NULL, sender_user_id BIGINT NOT NULL, body VARCHAR(1000) NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_hours(worker_id BIGINT NOT NULL, weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), start_min SMALLINT NOT NULL, end_min SMALLINT NOT NULL, PRIMARY KEY(worker_id, weekday))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_timeoff(worker_id BIGINT NOT NULL, day DATE NOT NULL, PRIMARY KEY(worker_id, day))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_saved(user_id BIGINT NOT NULL, worker_id BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id, worker_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_reports(id BIGSERIAL PRIMARY KEY, reporter_user_id BIGINT NOT NULL, worker_id BIGINT NOT NULL, work_order_id BIGINT, reason VARCHAR(20) NOT NULL, details VARCHAR(1000), status VARCHAR(10) NOT NULL DEFAULT 'OPEN', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_issues(id BIGSERIAL PRIMARY KEY, work_order_id BIGINT NOT NULL, raised_by VARCHAR(8) NOT NULL, reason VARCHAR(40) NOT NULL, details VARCHAR(1000), status VARCHAR(10) NOT NULL DEFAULT 'OPEN', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_works_payouts(id BIGSERIAL PRIMARY KEY, worker_id BIGINT NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK (amount>0), status VARCHAR(10) NOT NULL, txn_code VARCHAR(24), idem_key VARCHAR(64), settle_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(worker_id, idem_key))`);
    await pool.query(`ALTER TABLE works_reviews ADD COLUMN IF NOT EXISTS worker_response VARCHAR(600)`);
    await pool.query(`ALTER TABLE works_reviews ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ`);
  }

  // ------------------------------------------------------------ workers (public view)
  const WORKER_OK = `LOWER(TRIM(w.kyc_status))='verified' AND LOWER(TRIM(w.skill_status))='verified' AND LOWER(TRIM(w.account_status))='active' AND COALESCE(w.active,TRUE)=TRUE
    AND w.user_id IS NOT NULL AND COALESCE(wu.is_active,TRUE)=TRUE AND UPPER(COALESCE(wu.account_status,'ACTIVE'))='ACTIVE'
    AND EXISTS(SELECT 1 FROM howdi_connect_profiles wp WHERE wp.user_id=w.user_id AND COALESCE(wp.public_username,'')<>'')`;
  const WORKER_COLS = `w.id wid, w.worker_code, w.city, w.rating, w.completed_jobs, w.starting_price, w.experience_years, w.service_radius_km, w.user_id wuid,
      COALESCE(w.availability_status, w.availability, 'offline') avail, w.availability_updated_at,
      (SELECT ps.name FROM works_worker_services pws JOIN works_services ps ON ps.id=pws.service_id WHERE pws.worker_id=w.id AND pws.is_primary=TRUE AND LOWER(TRIM(pws.status))='approved' AND ps.active=TRUE LIMIT 1) primary_service,
      (SELECT COALESCE(json_agg(json_build_object('code', s.service_code, 'name', s.name) ORDER BY x.is_primary DESC, s.name), '[]'::json) FROM works_worker_services x JOIN works_services s ON s.id=x.service_id WHERE x.worker_id=w.id AND LOWER(TRIM(x.status))='approved' AND s.active=TRUE AND s.customer_visible=TRUE) services,
      (SELECT COUNT(*) FROM works_reviews r WHERE r.worker_id=w.id) reviews,
      ${authorCols('a_u.id', 'a_')}`;
  const WORKER_FROM = `FROM works_workers w JOIN users wu ON wu.id=w.user_id ${authorJoins('w.user_id', 'a_')}`;
  const visibleTo = (v) => `(${WORKER_OK}) AND (w.user_id=${v} OR NOT (${blockedSql(v, 'w.user_id')}))`;
  function presence(r) {
    const a = String(r.avail || 'offline').toLowerCase();
    return a === 'online' || a === 'available' ? 'online' : a === 'busy' || a === 'on_work' || a === 'on work' ? 'busy' : 'offline';
  }
  function workerCard(r, extra = {}) {
    const person = authorDto(r, 'a_'); if (!person) return null;
    const rating = Number(r.rating);
    return {
      ref: r.worker_code, person, service: line(r.primary_service, 60) || null, services: Array.isArray(r.services) ? r.services.map((s) => ({ code: s.code, name: line(s.name, 60) })) : [],
      city: line(r.city, 40) || null, rating: Number.isFinite(rating) && rating > 0 ? Math.round(Math.min(5, rating) * 10) / 10 : null, reviews: Number(r.reviews) || 0,
      jobs: Number(r.completed_jobs) || 0, price_from: r.starting_price != null ? money(r.starting_price) : null, experience_years: r.experience_years != null ? Number(r.experience_years) : null,
      presence: presence(r), verified: true, route: `/works/workers/${r.worker_code}`, ...extra,
    };
  }
  async function workerByRef(ref, vid) {
    const s = String(ref || '');
    const byHandle = /^@?[a-z0-9._]{3,30}$/i.test(s) && s.startsWith('@');
    if (!byHandle && !/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(s)) return null;
    const r = (await pool.query(`SELECT ${WORKER_COLS} ${WORKER_FROM} WHERE ${byHandle ? `EXISTS(SELECT 1 FROM howdi_connect_profiles hp WHERE hp.user_id=w.user_id AND LOWER(hp.public_username)=LOWER($2))` : 'w.worker_code=$2'} AND ${visibleTo('$1::bigint')}`, [vid || 0, byHandle ? s.slice(1) : s])).rows[0];
    return r || null;
  }
  async function myWorker(vid) { return (await pool.query(`SELECT w.*, (${WORKER_OK}) live FROM works_workers w JOIN users wu ON wu.id=w.user_id WHERE w.user_id=$1 ORDER BY w.id DESC LIMIT 1`, [vid])).rows[0] || null; }

  // ------------------------------------------------------------ hours & slots (WRK-004 / WKR-004)
  const DEFAULT_HOURS = [1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, start_min: 9 * 60, end_min: 18 * 60 }));
  async function hoursOf(wid) { const r = (await pool.query(`SELECT weekday, start_min, end_min FROM howdi_v8_works_hours WHERE worker_id=$1 ORDER BY weekday`, [wid])).rows; return r.length ? r.filter((x) => Number(x.end_min) > Number(x.start_min)).map((x) => ({ weekday: Number(x.weekday), start_min: Number(x.start_min), end_min: Number(x.end_min) })) : DEFAULT_HOURS; }
  const IST = 330; // slots are shown and booked in India time
  const istParts = (d) => { const t = new Date(d.getTime() + IST * 60000); return { day: t.toISOString().slice(0, 10), weekday: t.getUTCDay(), min: t.getUTCHours() * 60 + t.getUTCMinutes() }; };
  const fromIst = (day, min) => new Date(Date.parse(`${day}T00:00:00Z`) + (min - IST) * 60000);
  async function slotsFor(wid, days = 7) {
    const hours = await hoursOf(wid); const off = new Set((await pool.query(`SELECT day::text d FROM howdi_v8_works_timeoff WHERE worker_id=$1 AND day>=CURRENT_DATE`, [wid])).rows.map((x) => x.d));
    const busy = (await pool.query(`SELECT starts_at FROM howdi_v8_works_bookings WHERE worker_id=$1 AND state IN ('REQUESTED','ACCEPTED','CONFIRMED','EN_ROUTE','ARRIVED','IN_PROGRESS') AND starts_at>NOW()-interval '2 hours'`, [wid])).rows.map((x) => new Date(x.starts_at).getTime());
    const now = Date.now(); const out = [];
    for (let i = 0; i < days; i++) {
      const day = istParts(new Date(now + i * 86400e3)).day; const wd = new Date(`${day}T00:00:00Z`).getUTCDay();
      const h = hours.find((x) => x.weekday === wd); const slots = [];
      if (h && !off.has(day)) for (let m = h.start_min; m + 60 <= h.end_min; m += 60) {
        const at = fromIst(day, m); const t = at.getTime();
        const state = t < now + 60 * 60000 ? 'past' : busy.some((b) => Math.abs(b - t) < 60 * 60000) ? 'booked' : 'available';
        slots.push({ time: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, starts_at: at.toISOString(), state });
      }
      out.push({ date: day, weekday: wd, off: off.has(day) || !h, slots });
    }
    return { timezone: 'Asia/Kolkata (IST)', days: out };
  }

  // ------------------------------------------------------------ bookings
  async function codeOf(woid) { return (await issue('WBKG', [woid])).get(String(woid)); }
  async function event(woid, actor, ev, note) { await pool.query(`INSERT INTO howdi_v8_works_events(work_order_id,actor,event,note) VALUES($1,$2,$3,$4)`, [woid, actor, ev, note ? line(note, 300) : null]); }
  async function setState(client, woid, state, extra = '', params = []) {
    await client.query(`UPDATE howdi_v8_works_bookings SET state=$2 ${extra} WHERE work_order_id=$1`, [woid, state, ...params]);
    await client.query(`UPDATE works_work_orders SET status=$2, updated_at=NOW() WHERE id=$1`, [woid, LEGACY_STATUS[state]]);
  }
  async function refund(client, b, why) {
    if (b.method !== 'HPAY' || b.pay_state !== 'HELD') return null;
    await wallet(Number(b.customer_user_id), client);
    await client.query(`UPDATE howdi_v8_wallets SET balance=balance+$2, updated_at=NOW() WHERE user_id=$1`, [b.customer_user_id, money(b.amount)]);
    const txn = 'HPW-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'CREDIT',$3,'WORKS_REFUND',$4,$5)`, [txn, b.customer_user_id, money(b.amount), await codeOf(b.work_order_id), line(`Refund · ${why}`, 190)]);
    await client.query(`UPDATE howdi_v8_works_bookings SET pay_state='REFUNDED', refund_txn=$2 WHERE work_order_id=$1`, [b.work_order_id, txn]);
    return txn;
  }
  async function release(client, b) {
    if (b.method !== 'HPAY' || b.pay_state !== 'HELD') { if (b.method === 'LATER') await client.query(`UPDATE howdi_v8_works_bookings SET pay_state='OFFLINE' WHERE work_order_id=$1`, [b.work_order_id]); return null; }
    const w = (await client.query(`SELECT user_id FROM works_workers WHERE id=$1`, [b.worker_id])).rows[0];
    const net = money(Number(b.amount) - Number(b.fee));
    await wallet(Number(w.user_id), client);
    await client.query(`UPDATE howdi_v8_wallets SET balance=balance+$2, updated_at=NOW() WHERE user_id=$1`, [w.user_id, net]);
    const txn = 'HPW-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,counterparty_user_id,reference,note) VALUES($1,$2,'CREDIT',$3,'WORKS_EARNING',$4,$5,'Works job earnings (after HOWDI fee)')`, [txn, w.user_id, net, b.customer_user_id, await codeOf(b.work_order_id)]);
    await client.query(`UPDATE howdi_v8_works_bookings SET pay_state='RELEASED', release_txn=$2 WHERE work_order_id=$1`, [b.work_order_id, txn]);
    return txn;
  }
  async function workerUid(wid) { return Number((await pool.query(`SELECT user_id FROM works_workers WHERE id=$1`, [wid])).rows[0]?.user_id) || null; }
  async function handleOf(uid) { const r = (await pool.query(`SELECT public_username h FROM howdi_connect_profiles WHERE user_id=$1`, [uid])).rows[0]; return r && r.h ? r.h : 'someone'; }

  // time-based transitions happen lazily whenever a booking is read
  async function advance(b) {
    const now = Date.now(); let to = null, why = '';
    if (b.state === 'REQUESTED' && now - new Date(b.requested_at).getTime() > REQUEST_TTL_MIN * 60000) { to = 'EXPIRED'; why = 'The worker didn’t respond in time.'; }
    else if (b.state === 'ACCEPTED' && b.consent_due && now > new Date(b.consent_due).getTime()) { to = 'EXPIRED'; why = 'Consent wasn’t given in time.'; }
    else if (b.state === 'COMPLETED' && now - new Date(b.completed_at).getTime() > AUTO_CONFIRM_H * 3600e3) to = 'CLOSED';
    if (!to) return b;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const row = (await client.query(`SELECT * FROM howdi_v8_works_bookings WHERE work_order_id=$1 FOR UPDATE`, [b.work_order_id])).rows[0];
      if (row.state !== b.state) { await client.query('ROLLBACK'); return row; }
      if (to === 'EXPIRED') { await setState(client, row.work_order_id, 'EXPIRED', `, cancelled_at=NOW(), cancelled_by='system', cancel_reason=$3`, [why]); await refund(client, row, 'booking expired'); if (row.state === 'ACCEPTED') await client.query(`UPDATE howdi_v8_works_consents SET status='EXPIRED', decided_at=NOW() WHERE work_order_id=$1`, [row.work_order_id]); }
      else { await setState(client, row.work_order_id, 'CLOSED', `, closed_at=NOW()`); await release(client, row); await client.query(`UPDATE works_workers SET completed_jobs=COALESCE(completed_jobs,0)+1 WHERE id=$1`, [row.worker_id]); }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    await event(b.work_order_id, 'system', to === 'EXPIRED' ? 'expired' : 'auto_closed', why || 'Closed automatically 48 hours after completion.');
    const code = await codeOf(b.work_order_id);
    if (to === 'EXPIRED') { await notify(Number(b.customer_user_id), 'WORKS_EXPIRED', 'Your Works booking expired', `${why}${b.method === 'HPAY' && b.pay_state === 'HELD' ? ' Your HPay payment was refunded.' : ''}`, `/works/bookings/${code}`, null); const wu = await workerUid(b.worker_id); if (wu && b.state === 'ACCEPTED') await notify(wu, 'WORKS_EXPIRED', 'A job you accepted expired', 'The customer didn’t confirm in time.', `/works/worker/jobs/${code}`, null); }
    return (await pool.query(`SELECT * FROM howdi_v8_works_bookings WHERE work_order_id=$1`, [b.work_order_id])).rows[0];
  }
  async function bookingFor(code, vid) {
    const woid = await resolve(code, 'WBKG'); if (!woid) return null;
    let b = (await pool.query(`SELECT b.*, w.user_id worker_uid FROM howdi_v8_works_bookings b JOIN works_workers w ON w.id=b.worker_id WHERE b.work_order_id=$1`, [woid])).rows[0];
    if (!b) return null;
    const role = Number(b.customer_user_id) === vid ? 'customer' : Number(b.worker_uid) === vid ? 'worker' : null;
    if (!role) return null;
    const wu = b.worker_uid; b = await advance(b); b.worker_uid = wu;
    return { b, role, code };
  }
  const LIVE = ['REQUESTED', 'ACCEPTED', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'];
  const STEPS = ['REQUESTED', 'ACCEPTED', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];
  async function bookingDto(b, role, code, vid, full = true) {
    const service = (await pool.query(`SELECT name FROM works_services WHERE id=$1`, [b.service_id])).rows[0];
    const out = {
      public_key: code, role, state: b.state.toLowerCase(), service: service ? line(service.name, 60) : 'Service', starts_at: iso(b.starts_at), area: line(b.area, 120) || null,
      summary: text(b.summary, 600) || null, amount: money(b.amount), fee: money(b.fee), worker_net: money(Number(b.amount) - Number(b.fee)), currency: 'INR',
      payment: { method: b.method === 'LATER' ? 'after_job' : 'hpay', state: String(b.pay_state).toLowerCase(), sandbox: b.method === 'HPAY' },
      requested_at: iso(b.requested_at), consent_due: b.state === 'ACCEPTED' ? iso(b.consent_due) : null, request_expires: b.state === 'REQUESTED' ? new Date(new Date(b.requested_at).getTime() + REQUEST_TTL_MIN * 60000).toISOString() : null,
      cancel_reason: b.cancel_reason ? line(b.cancel_reason, 300) : null, cancelled_by: b.cancelled_by || null, decline_reason: b.decline_reason ? line(b.decline_reason, 300) : null,
      steps: STEPS.map((s) => ({ key: s.toLowerCase(), done: STEPS.indexOf(s) <= STEPS.indexOf(b.state) && STEPS.includes(b.state) })),
    };
    const wr = (await pool.query(`SELECT ${WORKER_COLS} ${WORKER_FROM} WHERE w.id=$1`, [b.worker_id])).rows[0];
    out.worker = wr ? workerCard(wr) : null;
    if (role === 'customer') {
      const cu = (await pool.query(`SELECT fields, status FROM howdi_v8_works_consents WHERE work_order_id=$1`, [b.work_order_id])).rows[0];
      out.consent = cu ? { status: cu.status.toLowerCase(), fields: cu.fields } : null;
      out.consent_fields = PRIVATE_FIELDS.map((f) => ({ key: f, label: FIELD_LABEL[f], required: f === 'address' }));
      const pv = (await pool.query(`SELECT name, address, landmark, pincode, phone, notes FROM howdi_v8_works_private WHERE work_order_id=$1`, [b.work_order_id])).rows[0];
      // the customer sees their own details (masked phone) so they know what they are sharing
      out.my_details = pv ? { name: pv.name || null, location: pv.address ? `${pv.address}${pv.landmark ? `, ${pv.landmark}` : ''}${pv.pincode ? ` · ${pv.pincode}` : ''}` : null, contact: pv.phone ? `•••••• ${String(pv.phone).slice(-4)}` : null, notes: pv.notes || null } : null;
      // WRK-010: the PIN appears only once the worker has arrived
      if (['ARRIVED', 'IN_PROGRESS'].includes(b.state)) { const p = (await pool.query(`SELECT pin, attempts, locked_until, verified_at FROM howdi_v8_works_pins WHERE work_order_id=$1`, [b.work_order_id])).rows[0]; out.job_pin = p ? { pin: p.verified_at ? null : p.pin, verified: Boolean(p.verified_at), attempts: Number(p.attempts), locked: Boolean(p.locked_until && new Date(p.locked_until) > new Date()) } : null; }
      out.actions = b.state === 'ACCEPTED' ? ['consent', 'decline_consent', 'cancel'] : ['REQUESTED', 'CONFIRMED', 'EN_ROUTE'].includes(b.state) ? (b.state === 'CONFIRMED' || b.state === 'EN_ROUTE' ? ['withdraw', 'cancel'] : ['cancel'])
        : b.state === 'COMPLETED' ? ['confirm', 'issue'] : b.state === 'ARRIVED' || b.state === 'IN_PROGRESS' ? ['issue'] : [];
    } else {
      // WKR-005A / WRK-005C: only consented fields, only from confirmation on; every read is logged
      const cu = (await pool.query(`SELECT fields, status FROM howdi_v8_works_consents WHERE work_order_id=$1`, [b.work_order_id])).rows[0];
      const released = cu && cu.status === 'GIVEN' && ['CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(b.state) ? cu.fields : [];
      out.customer = { label: released.includes('name') ? null : 'HOWDI customer', verified_member: true };
      out.private = { hidden: !released.length, released };
      if (released.length) {
        const pv = (await pool.query(`SELECT name, address, landmark, pincode, phone, notes FROM howdi_v8_works_private WHERE work_order_id=$1`, [b.work_order_id])).rows[0] || {};
        if (released.includes('name')) { out.customer = { name: pv.name || null, handle: await handleOf(Number(b.customer_user_id)), verified_member: true }; }
        if (released.includes('address')) out.private.location = `${pv.address || ''}${pv.landmark ? `, ${pv.landmark}` : ''}${pv.pincode ? ` · ${pv.pincode}` : ''}`;
        if (released.includes('phone')) out.private.contact_number = pv.phone || null;
        if (released.includes('notes')) out.private.notes = pv.notes || null;
        if (full) await pool.query(`INSERT INTO howdi_v8_works_release_log(work_order_id,worker_user_id,fields) VALUES($1,$2,$3::jsonb)`, [b.work_order_id, vid, JSON.stringify(released)]);
      }
      if (b.state === 'ARRIVED') { const p = (await pool.query(`SELECT attempts, locked_until FROM howdi_v8_works_pins WHERE work_order_id=$1`, [b.work_order_id])).rows[0]; out.pin_entry = p ? { tries_left: Math.max(0, 5 - Number(p.attempts)), locked_until: p.locked_until && new Date(p.locked_until) > new Date() ? iso(p.locked_until) : null } : null; }
      out.actions = b.state === 'REQUESTED' ? ['accept', 'decline'] : b.state === 'ACCEPTED' ? ['worker_cancel'] : b.state === 'CONFIRMED' ? ['en_route', 'worker_cancel'] : b.state === 'EN_ROUTE' ? ['arrived', 'worker_cancel'] : b.state === 'ARRIVED' ? ['pin', 'worker_cancel'] : b.state === 'IN_PROGRESS' ? ['complete'] : [];
    }
    if (full) {
      out.timeline = (await pool.query(`SELECT actor, event, note, at FROM howdi_v8_works_events WHERE work_order_id=$1 ORDER BY id`, [b.work_order_id])).rows.map((e) => ({ actor: e.actor, event: e.event, note: e.note, at: iso(e.at) }));
      const rv = (await pool.query(`SELECT rating, review, created_at, worker_response, responded_at FROM works_reviews WHERE work_order_id=$1`, [b.work_order_id])).rows[0];
      out.review = rv ? { rating: Number(rv.rating), text: rv.review || null, at: iso(rv.created_at), response: rv.worker_response || null } : null;
      out.can_review = role === 'customer' && b.state === 'CLOSED' && !rv;
      out.can_respond = role === 'worker' && Boolean(rv) && !rv.worker_response;
      out.chat_open = await chatOpen(b);
      out.receipt = b.hold_txn || b.release_txn || b.refund_txn ? { hold: b.hold_txn, release: role === 'worker' ? b.release_txn : null, refund: role === 'customer' ? b.refund_txn : null } : null;
    }
    return out;
  }
  async function chatOpen(b) {
    const c = (await pool.query(`SELECT status FROM howdi_v8_works_consents WHERE work_order_id=$1`, [b.work_order_id])).rows[0];
    if (!c || c.status !== 'GIVEN') return false;
    if (['CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'].includes(b.state)) return true;
    return b.state === 'CLOSED' && b.closed_at && Date.now() - new Date(b.closed_at).getTime() < 7 * 86400e3;
  }

  // ------------------------------------------------------------ router
  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (!p.startsWith('/api/v8/works/') && p !== '/api/v8/works') return false;
    const v = await viewer(req); const vid = v ? v.id : 0; let m;

    if (p === '/api/v8/works/services' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT s.service_code, s.name, s.icon, (SELECT COUNT(*) FROM works_worker_services x JOIN works_workers w ON w.id=x.worker_id JOIN users wu ON wu.id=w.user_id WHERE x.service_id=s.id AND LOWER(TRIM(x.status))='approved' AND ${WORKER_OK}) workers FROM works_services s WHERE s.active=TRUE AND s.customer_visible=TRUE ORDER BY s.sort_order NULLS LAST, s.name LIMIT 60`)).rows;
      ok(res, { items: rows.map((r) => ({ code: r.service_code, name: line(r.name, 60), workers: Number(r.workers) || 0 })) }); return true;
    }
    if (p === '/api/v8/works/workers' && req.method === 'GET') {
      const svc = String(url.searchParams.get('service') || ''); const q = line(url.searchParams.get('q'), 60); const sort = url.searchParams.get('sort') === 'price' ? 'price' : url.searchParams.get('sort') === 'jobs' ? 'jobs' : 'rating';
      const params = [vid]; const where = [visibleTo('$1::bigint')];
      if (/^[A-Za-z0-9_-]{2,40}$/.test(svc)) { params.push(svc); where.push(`EXISTS(SELECT 1 FROM works_worker_services x JOIN works_services s ON s.id=x.service_id WHERE x.worker_id=w.id AND LOWER(TRIM(x.status))='approved' AND s.service_code=$${params.length})`); }
      if (q) { params.push(`%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`); where.push(`(EXISTS(SELECT 1 FROM works_worker_services x JOIN works_services s ON s.id=x.service_id WHERE x.worker_id=w.id AND LOWER(TRIM(x.status))='approved' AND s.name ILIKE $${params.length}) OR w.city ILIKE $${params.length} OR EXISTS(SELECT 1 FROM howdi_connect_profiles hp WHERE hp.user_id=w.user_id AND hp.public_username ILIKE $${params.length}))`); }
      const order = sort === 'price' ? 'w.starting_price ASC NULLS LAST' : sort === 'jobs' ? 'w.completed_jobs DESC NULLS LAST' : 'w.rating DESC NULLS LAST, w.completed_jobs DESC NULLS LAST';
      const rows = (await pool.query(`SELECT ${WORKER_COLS}, (SELECT 1 FROM howdi_v8_works_saved sv WHERE sv.user_id=$1::bigint AND sv.worker_id=w.id) saved ${WORKER_FROM} WHERE ${where.join(' AND ')} ORDER BY ${order}, w.worker_code LIMIT 40`, params)).rows;
      ok(res, { items: rows.map((r) => workerCard(r, { saved: Boolean(r.saved), is_me: Number(r.wuid) === vid })).filter(Boolean), sort }); return true;
    }
    if ((m = p.match(/^\/api\/v8\/works\/workers\/([^/]{3,64})(?:\/(slots|save|block|report))?$/))) {
      const ref = decodeURIComponent(m[1]); const r = await workerByRef(ref, vid);
      if (!r) { fail(res, 404, 'NOT_FOUND', 'This worker isn’t available.'); return true; }
      if (!m[2] && req.method === 'GET') {
        const reviews = (await pool.query(`SELECT r.rating, r.review, r.created_at, r.worker_response, ${authorCols('a_u.id', 'a_')} FROM works_reviews r ${authorJoins('r.customer_user_id', 'a_')} WHERE r.worker_id=$1 AND NOT (${blockedSql('$2::bigint', 'r.customer_user_id')}) ORDER BY r.created_at DESC LIMIT 10`, [r.wid, vid])).rows;
        const hist = (await pool.query(`SELECT rating, COUNT(*) n FROM works_reviews WHERE worker_id=$1 GROUP BY rating`, [r.wid])).rows;
        const saved = vid ? (await pool.query(`SELECT 1 FROM howdi_v8_works_saved WHERE user_id=$1 AND worker_id=$2`, [vid, r.wid])).rowCount > 0 : false;
        const sl = await slotsFor(r.wid, 3); const next = sl.days.flatMap((d) => d.slots.filter((s) => s.state === 'available')).slice(0, 1)[0];
        ok(res, { worker: workerCard(r, { saved, is_me: Number(r.wuid) === vid, radius_km: r.service_radius_km != null ? Number(r.service_radius_km) : null, next_slot: next ? next.starts_at : null,
          histogram: [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: Number((hist.find((h) => Number(h.rating) === s) || {}).n || 0) })),
          review_list: reviews.map((x) => ({ rating: Number(x.rating), text: x.review ? line(x.review, 600) : null, at: iso(x.created_at), by: authorDto(x, 'a_'), response: x.worker_response ? line(x.worker_response, 600) : null })) }) });
        return true;
      }
      if (m[2] === 'slots' && req.method === 'GET') { ok(res, await slotsFor(r.wid, Math.min(14, Math.max(1, Number(url.searchParams.get('days')) || 7)))); return true; }
      if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to continue.'); return true; }
      if (Number(r.wuid) === vid) { fail(res, 400, 'SELF', 'That’s your own worker profile.'); return true; }
      if (m[2] === 'save' && req.method === 'POST') {
        const del = await pool.query(`DELETE FROM howdi_v8_works_saved WHERE user_id=$1 AND worker_id=$2`, [vid, r.wid]);
        if (!del.rowCount) await pool.query(`INSERT INTO howdi_v8_works_saved(user_id,worker_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [vid, r.wid]);
        ok(res, { saved: !del.rowCount }); return true;
      }
      if (m[2] === 'block' && req.method === 'POST') {
        await pool.query(`INSERT INTO howdi_connect_profile_blocks(blocker_user_id,blocked_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [vid, r.wuid]);
        await pool.query(`DELETE FROM howdi_v8_works_saved WHERE user_id=$1 AND worker_id=$2`, [vid, r.wid]);
        ok(res, { blocked: true, message: 'Blocked. They won’t appear in your Works results and can’t contact you on HOWDI. You can unblock them in Settings → Privacy.' }); return true;
      }
      if (m[2] === 'report' && req.method === 'POST') {
        if (limited(res, `v8-works-report:${vid}`, 10, 60 * 60000)) return true;
        const b = (await getBody(req)) || {}; if (!REPORT_REASONS.includes(String(b.reason))) { fail(res, 400, 'VALIDATION', 'Choose a reason.'); return true; }
        const wo = b.booking ? await resolve(String(b.booking), 'WBKG') : null;
        await pool.query(`INSERT INTO howdi_v8_works_reports(reporter_user_id,worker_id,work_order_id,reason,details) VALUES($1,$2,$3,$4,$5)`, [vid, r.wid, wo, b.reason, text(b.details, 1000) || null]);
        ok(res, { reported: true, message: 'Thanks — HOWDI’s Works safety team will review this within 24 hours. The worker isn’t told who reported them. If you’re in danger, call 112.' }); return true;
      }
    }
    if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to use Works.'); return true; }

    if (p === '/api/v8/works/saved' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT ${WORKER_COLS} ${WORKER_FROM} JOIN howdi_v8_works_saved sv ON sv.worker_id=w.id AND sv.user_id=$1 WHERE ${visibleTo('$1::bigint')} ORDER BY sv.created_at DESC`, [vid])).rows;
      ok(res, { items: rows.map((r) => workerCard(r, { saved: true })).filter(Boolean) }); return true;
    }

    // ---- quote (review, nothing moves) and create
    if ((p === '/api/v8/works/bookings/quote' || p === '/api/v8/works/bookings') && req.method === 'POST') {
      const b = (await getBody(req)) || {};
      if (p === '/api/v8/works/bookings' && /^[A-Za-z0-9_-]{8,64}$/.test(String(b.idempotency_key || ''))) {
        const prior0 = (await pool.query(`SELECT work_order_id FROM howdi_v8_works_bookings WHERE customer_user_id=$1 AND idem_key=$2`, [vid, String(b.idempotency_key)])).rows[0];
        if (prior0) { const code0 = await codeOf(prior0.work_order_id); const bb0 = await bookingFor(code0, vid); ok(res, { booking: await bookingDto(bb0.b, 'customer', code0, vid), replayed: true }); return true; }
      }
      const r = await workerByRef(String(b.worker || ''), vid);
      if (!r) { fail(res, 404, 'NOT_FOUND', 'This worker isn’t available.'); return true; }
      if (Number(r.wuid) === vid) { fail(res, 400, 'SELF', 'You can’t book yourself.'); return true; }
      const svc = (await pool.query(`SELECT s.id, s.name FROM works_worker_services x JOIN works_services s ON s.id=x.service_id WHERE x.worker_id=$1 AND LOWER(TRIM(x.status))='approved' AND s.active=TRUE AND s.service_code=$2`, [r.wid, String(b.service || '')])).rows[0];
      if (!svc) { fail(res, 400, 'VALIDATION', 'Choose one of this worker’s services.'); return true; }
      const at = new Date(String(b.starts_at || '')); const sl = await slotsFor(r.wid, 14);
      const slot = sl.days.flatMap((d) => d.slots).find((s) => s.starts_at === (Number.isFinite(at.getTime()) ? at.toISOString() : ''));
      if (!slot || slot.state !== 'available') { fail(res, 409, 'SLOT_TAKEN', 'That time isn’t available any more. Choose another slot.'); return true; }
      const amount = money(r.starting_price || 0); if (!(amount > 0)) { fail(res, 409, 'NO_PRICE', 'This worker hasn’t set a price yet.'); return true; }
      const fee = money(amount * FEE_RATE); const method = b.method === 'after_job' ? 'LATER' : 'HPAY';
      const area = line(b.area, 120); const summary = text(b.summary, 600);
      if (area.length < 3) { fail(res, 400, 'VALIDATION', 'Add your area or locality (e.g. “Wyra Road, Khammam”).'); return true; }
      if (/\b[6-9]\d{9}\b/.test(`${area} ${summary}`)) { fail(res, 400, 'PRIVATE_IN_PUBLIC', 'Don’t put a phone number in the area or job summary — those are shown before the worker accepts. Add it under private details.'); return true; }
      const pv = b.private || {}; const address = text(pv.address, 300); const phone = String(pv.phone || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      if (address.length < 6) { fail(res, 400, 'VALIDATION', 'Add the exact address. It stays private until you confirm the worker.'); return true; }
      if (phone && !/^[6-9]\d{9}$/.test(phone)) { fail(res, 400, 'VALIDATION', 'Enter a 10-digit mobile number or leave it empty.'); return true; }
      const w = method === 'HPAY' ? await wallet(vid) : null;
      if (p.endsWith('/quote')) {
        ok(res, { review: { worker: workerCard(r), service: line(svc.name, 60), starts_at: slot.starts_at, timezone: sl.timezone, area, amount, fee_note: 'Includes HOWDI service fee', total: amount, method: method === 'LATER' ? 'after_job' : 'hpay',
          balance: w ? money(w.balance) : null, provider_ready: method === 'LATER' || Boolean(w), shared_before_accept: ['Service', 'Area', 'Date and time', 'Price', 'Job summary'], private_until_consent: ['Exact address', 'Phone number', 'Your name', 'Private notes'] } });
        return true;
      }
      const idem = /^[A-Za-z0-9_-]{8,64}$/.test(String(b.idempotency_key || '')) ? String(b.idempotency_key) : null;
      if (!idem) { fail(res, 400, 'VALIDATION', 'Missing booking key. Please try again.'); return true; }
      const prior = (await pool.query(`SELECT work_order_id FROM howdi_v8_works_bookings WHERE customer_user_id=$1 AND idem_key=$2`, [vid, idem])).rows[0];
      if (prior) { const code = await codeOf(prior.work_order_id); const bb = await bookingFor(code, vid); ok(res, { booking: await bookingDto(bb.b, 'customer', code, vid), replayed: true }); return true; }
      if (limited(res, `v8-works-book:${vid}`, 10, 60 * 60000)) return true;
      if (method === 'HPAY') { if (!w) { fail(res, 503, 'PAYMENT_PROVIDER_REQUIRED', 'HPay isn’t connected in this environment. Choose “Pay after the job”.'); return true; } const pin = await checkPin(vid, b.pin); if (pin.error) { fail(res, pin.error[0], pin.error[1], pin.error[2]); return true; } }
      const client = await pool.connect(); let woid;
      try {
        await client.query('BEGIN');
        // one live booking per worker per slot (the lock serialises two customers racing for it)
        await client.query(`SELECT id FROM works_workers WHERE id=$1 FOR UPDATE`, [r.wid]);
        const clash = (await client.query(`SELECT 1 FROM howdi_v8_works_bookings WHERE worker_id=$1 AND state IN ('REQUESTED','ACCEPTED','CONFIRMED','EN_ROUTE','ARRIVED','IN_PROGRESS') AND ABS(EXTRACT(EPOCH FROM (starts_at-$2::timestamptz)))<3600`, [r.wid, slot.starts_at])).rowCount;
        if (clash) { await client.query('ROLLBACK'); fail(res, 409, 'SLOT_TAKEN', 'Someone just booked that time. Choose another slot.'); return true; }
        const wo = (await client.query(`INSERT INTO works_work_orders(customer_user_id,worker_user_id,status,title,service_id,service_name,work_type,city,schedule_date,schedule_time,description,preferred_worker_id,booking_source,active,work_code)
          VALUES($1,$2,'offered',$3,$4,$3,'on_site',$5,($6::timestamptz AT TIME ZONE 'Asia/Kolkata')::date,($6::timestamptz AT TIME ZONE 'Asia/Kolkata')::time,$7,$8,'V8',TRUE,$9) RETURNING id`,
          [vid, r.wuid, line(svc.name, 60), svc.id, area, slot.starts_at, summary || null, r.wid, 'V8-' + crypto.randomBytes(6).toString('hex').toUpperCase()])).rows[0];
        woid = Number(wo.id);
        await client.query(`INSERT INTO howdi_v8_works_bookings(work_order_id,worker_id,customer_user_id,service_id,state,starts_at,area,summary,amount,fee,method,idem_key) VALUES($1,$2,$3,$4,'REQUESTED',$5,$6,$7,$8,$9,$10,$11)`,
          [woid, r.wid, vid, svc.id, slot.starts_at, area, summary || null, amount, fee, method, idem]);
        await client.query(`INSERT INTO howdi_v8_works_private(work_order_id,name,address,landmark,pincode,phone,notes) VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [woid, line(pv.name, 80) || null, address, line(pv.landmark, 120) || null, /^\d{6}$/.test(String(pv.pincode || '')) ? String(pv.pincode) : null, phone || null, text(pv.notes, 600) || null]);
        await client.query(`INSERT INTO works_work_offers(offer_code,work_order_id,worker_id,status,offered_at) VALUES($1,$2,$3,'offered',NOW())`, ['V8OF-' + crypto.randomBytes(6).toString('hex').toUpperCase(), woid, r.wid]);
        if (method === 'HPAY') {
          const code = (await issue('WBKG', [woid])).get(String(woid));
          const up = await client.query(`UPDATE howdi_v8_wallets SET balance=balance-$2, updated_at=NOW() WHERE user_id=$1 AND balance>=$2 RETURNING balance`, [vid, amount]);
          if (!up.rows[0]) { await client.query('ROLLBACK'); fail(res, 402, 'INSUFFICIENT_BALANCE', 'Not enough HPay balance. Nothing was booked or charged.'); return true; }
          const txn = 'HPW-' + crypto.randomBytes(5).toString('hex').toUpperCase();
          await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,counterparty_user_id,reference,note) VALUES($1,$2,'DEBIT',$3,'WORKS_HOLD',$4,$5,$6)`, [txn, vid, amount, r.wuid, code, line(`Held for ${svc.name} — released when you confirm the job is done`, 190)]);
          await client.query(`UPDATE howdi_v8_works_bookings SET pay_state='HELD', hold_txn=$2 WHERE work_order_id=$1`, [woid, txn]);
        }
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      const code = await codeOf(woid);
      await event(woid, 'customer', 'requested', `${line(svc.name, 60)} · ${method === 'HPAY' ? 'HPay held' : 'pay after the job'}`);
      await notify(Number(r.wuid), 'WORKS_JOB_OFFER', `New job request: ${line(svc.name, 60)}`, `${area} · ${new Date(slot.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · ₹${amount}. Respond within ${REQUEST_TTL_MIN} minutes.`, `/works/worker/jobs/${code}`, null);
      const bb = await bookingFor(code, vid);
      ok(res, { booking: await bookingDto(bb.b, 'customer', code, vid) }, 201); return true;
    }

    if (p === '/api/v8/works/bookings' && req.method === 'GET') {
      const tab = ['upcoming', 'completed', 'cancelled'].includes(url.searchParams.get('tab')) ? url.searchParams.get('tab') : 'upcoming';
      const rows = (await pool.query(`SELECT * FROM howdi_v8_works_bookings WHERE customer_user_id=$1 ORDER BY starts_at DESC LIMIT 100`, [vid])).rows;
      const items = [];
      for (let b of rows) { b = await advance(b); const st = b.state; const t = LIVE.includes(st) ? 'upcoming' : st === 'CLOSED' ? 'completed' : 'cancelled'; if (t !== tab) continue; items.push(await bookingDto(b, 'customer', await codeOf(b.work_order_id), vid, false)); }
      if (tab === 'upcoming') items.reverse();
      ok(res, { tab, items }); return true;
    }

    // ---- worker workspace
    if (p.startsWith('/api/v8/works/worker')) {
      const me = await myWorker(vid);
      if (p === '/api/v8/works/worker/me' && req.method === 'GET') {
        if (!me) { const app = (await pool.query(`SELECT status, review_note, updated_at FROM works_worker_applications WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [vid])).rows[0]; ok(res, { worker: null, application: app ? { status: String(app.status).toLowerCase(), note: app.review_note || null, updated_at: iso(app.updated_at) } : null }); return true; }
        const r = (await pool.query(`SELECT ${WORKER_COLS} ${WORKER_FROM} WHERE w.id=$1`, [me.id])).rows[0];
        const earn = await earnings(me);
        const offers = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_works_bookings WHERE worker_id=$1 AND state='REQUESTED' AND requested_at>NOW()-interval '${REQUEST_TTL_MIN} minutes'`, [me.id])).rows[0].n);
        const active = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_v8_works_bookings WHERE worker_id=$1 AND state IN ('ACCEPTED','CONFIRMED','EN_ROUTE','ARRIVED','IN_PROGRESS','COMPLETED')`, [me.id])).rows[0].n);
        ok(res, { worker: { ...(r ? workerCard(r) : {}), live: me.live === true, status: { kyc: String(me.kyc_status || '').toLowerCase(), skill: String(me.skill_status || '').toLowerCase(), account: String(me.account_status || '').toLowerCase() } }, counts: { offers, active }, earnings: earn.summary }); return true;
      }
      if (!me) { fail(res, 403, 'NOT_A_WORKER', 'This is for verified HOWDI workers. Apply from “Become a Worker”.'); return true; }
      if (p === '/api/v8/works/worker/status' && req.method === 'POST') {
        const b = (await getBody(req)) || {}; const st = ['online', 'busy', 'offline'].includes(b.status) ? b.status : null;
        if (!st) { fail(res, 400, 'VALIDATION', 'Choose Online, Busy or Offline.'); return true; }
        if (st === 'online' && me.live !== true) { fail(res, 409, 'NOT_VERIFIED', 'You can go online once your verification is approved.'); return true; }
        await pool.query(`UPDATE works_workers SET availability_status=$2, availability=$2, availability_updated_at=NOW(), updated_at=NOW() WHERE id=$1`, [me.id, st]);
        ok(res, { status: st, message: st === 'online' ? 'You’re online. Customers can book your open slots.' : st === 'busy' ? 'You’re busy. You stay visible but show as busy.' : 'You’re offline. You won’t appear in “available now”.' }); return true;
      }
      if (p === '/api/v8/works/worker/hours') {
        if (req.method === 'GET') { ok(res, { hours: await hoursOf(me.id), timeoff: (await pool.query(`SELECT day::text d FROM howdi_v8_works_timeoff WHERE worker_id=$1 AND day>=CURRENT_DATE ORDER BY day`, [me.id])).rows.map((x) => x.d), timezone: 'Asia/Kolkata (IST)' }); return true; }
        if (req.method === 'PUT') {
          const b = (await getBody(req)) || {}; const hours = (Array.isArray(b.hours) ? b.hours : []).filter((h) => Number.isInteger(h.weekday) && h.weekday >= 0 && h.weekday <= 6 && Number.isInteger(h.start_min) && Number.isInteger(h.end_min) && h.start_min >= 0 && h.end_min <= 1440 && h.end_min - h.start_min >= 60);
          const off = (Array.isArray(b.timeoff) ? b.timeoff : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 60);
          await pool.query(`DELETE FROM howdi_v8_works_hours WHERE worker_id=$1`, [me.id]);
          for (const h of hours) await pool.query(`INSERT INTO howdi_v8_works_hours(worker_id,weekday,start_min,end_min) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [me.id, h.weekday, h.start_min, h.end_min]);
          // days without hours are stored as closed (0–0) so "no hours" never falls back to the defaults
          for (let d = 0; d < 7; d++) await pool.query(`INSERT INTO howdi_v8_works_hours(worker_id,weekday,start_min,end_min) VALUES($1,$2,0,0) ON CONFLICT DO NOTHING`, [me.id, d]);
          await pool.query(`DELETE FROM howdi_v8_works_timeoff WHERE worker_id=$1 AND day>=CURRENT_DATE`, [me.id]);
          for (const d of off) await pool.query(`INSERT INTO howdi_v8_works_timeoff(worker_id,day) VALUES($1,$2) ON CONFLICT DO NOTHING`, [me.id, d]);
          ok(res, { hours: await hoursOf(me.id), timeoff: off, message: hours.length ? 'Working hours saved. Customers see your new slots now.' : 'No working days set — customers can’t book you until you add hours.' }); return true;
        }
      }
      if (p === '/api/v8/works/worker/jobs' && req.method === 'GET') {
        const tab = ['offers', 'active', 'history'].includes(url.searchParams.get('tab')) ? url.searchParams.get('tab') : 'offers';
        const rows = (await pool.query(`SELECT * FROM howdi_v8_works_bookings WHERE worker_id=$1 ORDER BY starts_at ${tab === 'history' ? 'DESC' : 'ASC'} LIMIT 100`, [me.id])).rows;
        const items = [];
        for (let b of rows) { b = await advance(b); const t = b.state === 'REQUESTED' ? 'offers' : ['ACCEPTED', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'].includes(b.state) ? 'active' : 'history'; if (t === tab) items.push(await bookingDto(b, 'worker', await codeOf(b.work_order_id), vid, false)); }
        ok(res, { tab, items }); return true;
      }
      if (p === '/api/v8/works/worker/earnings' && req.method === 'GET') { ok(res, await earnings(me)); return true; }
      if (p === '/api/v8/works/worker/payouts' && req.method === 'POST') {
        const b = (await getBody(req)) || {}; const idem = /^[A-Za-z0-9_-]{8,64}$/.test(String(b.idempotency_key || '')) ? String(b.idempotency_key) : null;
        if (!idem) { fail(res, 400, 'VALIDATION', 'Missing payout key. Please try again.'); return true; }
        const prior = (await pool.query(`SELECT * FROM howdi_v8_works_payouts WHERE worker_id=$1 AND idem_key=$2`, [me.id, idem])).rows[0];
        if (prior) { ok(res, { payout: { amount: money(prior.amount), status: prior.status.toLowerCase(), reference: prior.txn_code }, replayed: true }); return true; }
        const pin = await checkPin(vid, b.pin); if (pin.error) { fail(res, pin.error[0], pin.error[1], pin.error[2]); return true; }
        const e = await earnings(me); const amount = money(b.amount);
        if (!(amount >= 100)) { fail(res, 400, 'VALIDATION', 'Transfers start at ₹100.'); return true; }
        if (amount > e.summary.available) { fail(res, 402, 'INSUFFICIENT_BALANCE', 'That’s more than your available earnings.'); return true; }
        const client = await pool.connect(); let txn;
        try {
          await client.query('BEGIN');
          const up = await client.query(`UPDATE howdi_v8_wallets SET balance=balance-$2, updated_at=NOW() WHERE user_id=$1 AND balance>=$2 RETURNING balance`, [vid, amount]);
          if (!up.rows[0]) { await client.query('ROLLBACK'); fail(res, 402, 'INSUFFICIENT_BALANCE', 'Not enough balance.'); return true; }
          txn = 'HPO-' + crypto.randomBytes(5).toString('hex').toUpperCase();
          await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note,status) VALUES($1,$2,'DEBIT',$3,'WORKS_PAYOUT',$1,'Transfer to bank (Preview/Test)','PROCESSING')`, [txn, vid, amount]);
          await client.query(`INSERT INTO howdi_v8_works_payouts(worker_id,amount,status,txn_code,idem_key,settle_at) VALUES($1,$2,'PROCESSING',$3,$4,NOW()+interval '8 seconds')`, [me.id, amount, txn, idem]);
          await client.query('COMMIT');
        } catch (er) { await client.query('ROLLBACK').catch(() => {}); throw er; } finally { client.release(); }
        ok(res, { payout: { amount, status: 'processing', reference: txn, message: 'Transfer started. It usually reaches your bank within a working day (Preview/Test: a few seconds).' } }, 201); return true;
      }
    }

    // ---- one booking
    if (!(m = p.match(/^\/api\/v8\/works\/bookings\/(BKG-[0-9A-F]{12})(?:\/([a-z/-]+))?$/))) { fail(res, 404, 'NOT_FOUND', 'Not found.'); return true; }
    const bb = await bookingFor(m[1], vid);
    if (!bb) { fail(res, 404, 'NOT_FOUND', 'This booking isn’t available.'); return true; }
    const { b, role, code } = bb; const sub = m[2] || ''; const woid = Number(b.work_order_id);
    const custRoute = `/works/bookings/${code}`, workRoute = `/works/worker/jobs/${code}`;
    const workerU = Number(b.worker_uid); const custU = Number(b.customer_user_id);
    const done = async (st) => { const fresh = await bookingFor(code, vid); ok(res, { booking: await bookingDto(fresh.b, role, code, vid), ...(st || {}) }); };
    const need = (r, states) => { if (role !== r) { fail(res, 403, 'NOT_ALLOWED', r === 'worker' ? 'Only the worker can do this.' : 'Only the customer can do this.'); return false; } if (!states.includes(b.state)) { fail(res, 409, 'INVALID_STATE', `This booking is ${b.state.toLowerCase().replace('_', ' ')}.`); return false; } return true; };
    const tx = async (fn) => { const client = await pool.connect(); try { await client.query('BEGIN'); const row = (await client.query(`SELECT * FROM howdi_v8_works_bookings WHERE work_order_id=$1 FOR UPDATE`, [woid])).rows[0]; if (row.state !== b.state) { await client.query('ROLLBACK'); return false; } await fn(client, row); await client.query('COMMIT'); return true; } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); } };
    const raced = () => fail(res, 409, 'CHANGED', 'This booking just changed. Refresh and try again.');

    if (!sub && req.method === 'GET') { ok(res, { booking: await bookingDto(b, role, code, vid) }); return true; }
    if (sub === 'accept' && req.method === 'POST') {
      if (!need('worker', ['REQUESTED'])) return true;
      const me = await myWorker(vid); if (!me || me.live !== true) { fail(res, 409, 'NOT_VERIFIED', 'Your verification must be approved before you accept jobs.'); return true; }
      if (!(await tx(async (c) => { await setState(c, woid, 'ACCEPTED', `, accepted_at=NOW(), consent_due=NOW()+interval '${CONSENT_TTL_MIN} minutes'`); await c.query(`INSERT INTO howdi_v8_works_consents(work_order_id,status) VALUES($1,'PENDING') ON CONFLICT(work_order_id) DO UPDATE SET status='PENDING', fields='[]'::jsonb, decided_at=NULL`, [woid]); await c.query(`UPDATE works_work_offers SET status='accepted', responded_at=NOW() WHERE work_order_id=$1`, [woid]); }))) { raced(); return true; }
      await event(woid, 'worker', 'accepted');
      await notify(custU, 'WORKS_ACCEPTED', `@${await handleOf(vid)} accepted your request`, `Choose what to share with them within ${CONSENT_TTL_MIN} minutes to confirm the booking.`, custRoute, vid);
      await done(); return true;
    }
    if (sub === 'decline' && req.method === 'POST') {
      if (!need('worker', ['REQUESTED'])) return true;
      const body = (await getBody(req)) || {}; const reason = line(body.reason, 300) || 'Not available';
      if (!(await tx(async (c, row) => { await setState(c, woid, 'DECLINED', `, decline_reason=$3`, [reason]); await c.query(`UPDATE works_work_offers SET status='rejected', responded_at=NOW(), response_reason=$2 WHERE work_order_id=$1`, [woid, reason]); await refund(c, row, 'worker declined'); }))) { raced(); return true; }
      await event(woid, 'worker', 'declined', reason);
      await notify(custU, 'WORKS_DECLINED', `@${await handleOf(vid)} can’t take this job`, `${reason}.${b.method === 'HPAY' ? ' Your HPay payment was refunded.' : ''} Try another worker.`, custRoute, vid);
      await done(); return true;
    }
    if (sub === 'consent' && req.method === 'POST') {
      if (!need('customer', ['ACCEPTED'])) return true;
      const body = (await getBody(req)) || {}; const fields = [...new Set((Array.isArray(body.fields) ? body.fields : []).filter((f) => PRIVATE_FIELDS.includes(f)))];
      if (!fields.includes('address')) { fail(res, 400, 'ADDRESS_REQUIRED', 'The worker needs your exact address to come to you.'); return true; }
      if (!(await tx(async (c) => { await setState(c, woid, 'CONFIRMED', `, confirmed_at=NOW(), consent_due=NULL`); await c.query(`UPDATE howdi_v8_works_consents SET status='GIVEN', fields=$2::jsonb, decided_at=NOW() WHERE work_order_id=$1`, [woid, JSON.stringify(fields)]); }))) { raced(); return true; }
      await event(woid, 'customer', 'consented', `Shared: ${fields.map((f) => FIELD_LABEL[f].toLowerCase()).join(', ')}`);
      await notify(workerU, 'WORKS_CONFIRMED', 'Booking confirmed — details shared', `The customer shared ${fields.map((f) => FIELD_LABEL[f].toLowerCase().replace('your ', '')).join(', ')}. Tap to see the job.`, workRoute, vid);
      await done(); return true;
    }
    if ((sub === 'consent/decline' || sub === 'cancel' || sub === 'consent/withdraw') && req.method === 'POST') {
      const allowed = sub === 'consent/decline' ? ['ACCEPTED'] : sub === 'consent/withdraw' ? ['CONFIRMED', 'EN_ROUTE'] : ['REQUESTED', 'ACCEPTED', 'CONFIRMED', 'EN_ROUTE'];
      if (!need('customer', allowed)) return true;
      const body = (await getBody(req)) || {}; const reason = line(body.reason, 300) || (sub === 'consent/decline' ? 'Customer chose not to share details' : sub === 'consent/withdraw' ? 'Customer withdrew consent' : 'Cancelled by customer');
      if (!(await tx(async (c, row) => { await setState(c, woid, 'CANCELLED', `, cancelled_at=NOW(), cancelled_by='customer', cancel_reason=$3`, [reason]); await c.query(`UPDATE howdi_v8_works_consents SET status=$2::varchar, withdrawn_at=CASE WHEN $2::varchar='WITHDRAWN' THEN NOW() END, decided_at=COALESCE(decided_at,NOW()) WHERE work_order_id=$1`, [woid, sub === 'consent/withdraw' || b.state !== 'ACCEPTED' ? 'WITHDRAWN' : 'DECLINED']); await refund(c, row, 'cancelled before the job started'); }))) { raced(); return true; }
      await event(woid, 'customer', sub === 'consent/withdraw' ? 'consent_withdrawn' : 'cancelled', reason);
      await notify(workerU, 'WORKS_CANCELLED', 'A booking was cancelled', `${reason}.${['CONFIRMED', 'EN_ROUTE'].includes(b.state) ? ' The customer’s details are no longer available to you.' : ''}`, workRoute, vid);
      await done({ message: b.method === 'HPAY' && b.pay_state === 'HELD' ? 'Booking cancelled. Your HPay payment was refunded.' : 'Booking cancelled.' }); return true;
    }
    if (sub === 'worker-cancel' && req.method === 'POST') {
      if (!need('worker', ['ACCEPTED', 'CONFIRMED', 'EN_ROUTE', 'ARRIVED'])) return true;
      const body = (await getBody(req)) || {}; const reason = line(body.reason, 300);
      if (reason.length < 4) { fail(res, 400, 'VALIDATION', 'Tell the customer why you’re cancelling.'); return true; }
      if (!(await tx(async (c, row) => { await setState(c, woid, 'CANCELLED', `, cancelled_at=NOW(), cancelled_by='worker', cancel_reason=$3`, [reason]); await refund(c, row, 'worker cancelled'); await c.query(`UPDATE howdi_v8_works_consents SET status='WITHDRAWN', withdrawn_at=NOW() WHERE work_order_id=$1`, [woid]); }))) { raced(); return true; }
      await event(woid, 'worker', 'cancelled', reason);
      await notify(custU, 'WORKS_CANCELLED', `@${await handleOf(vid)} cancelled your booking`, `${reason}.${b.method === 'HPAY' ? ' Your HPay payment was refunded.' : ''}`, custRoute, vid);
      await done(); return true;
    }
    if (sub === 'stage' && req.method === 'POST') {
      const body = (await getBody(req)) || {}; const to = body.stage === 'en_route' ? 'EN_ROUTE' : body.stage === 'arrived' ? 'ARRIVED' : null;
      if (!to) { fail(res, 400, 'VALIDATION', 'Unknown stage.'); return true; }
      if (!need('worker', to === 'EN_ROUTE' ? ['CONFIRMED'] : ['EN_ROUTE'])) return true;
      if (!(await tx(async (c) => { await setState(c, woid, to, to === 'EN_ROUTE' ? ', en_route_at=NOW()' : ', arrived_at=NOW()'); if (to === 'ARRIVED') await c.query(`INSERT INTO howdi_v8_works_pins(work_order_id,pin) VALUES($1,$2) ON CONFLICT(work_order_id) DO NOTHING`, [woid, String(crypto.randomInt(0, 10000)).padStart(4, '0')]); }))) { raced(); return true; }
      await event(woid, 'worker', to === 'EN_ROUTE' ? 'en_route' : 'arrived');
      await notify(custU, to === 'EN_ROUTE' ? 'WORKS_EN_ROUTE' : 'WORKS_ARRIVED', to === 'EN_ROUTE' ? `@${await handleOf(vid)} is on the way` : `@${await handleOf(vid)} has arrived`, to === 'EN_ROUTE' ? 'Keep your phone handy.' : 'Open the booking to see your Job PIN. Share it only when the worker is in front of you.', custRoute, vid);
      await done(); return true;
    }
    if (sub === 'pin' && req.method === 'POST') {
      if (!need('worker', ['ARRIVED'])) return true;
      const body = (await getBody(req)) || {};
      const pr = (await pool.query(`SELECT * FROM howdi_v8_works_pins WHERE work_order_id=$1`, [woid])).rows[0];
      if (!pr) { fail(res, 409, 'INVALID_STATE', 'Mark “arrived” first.'); return true; }
      if (pr.locked_until && new Date(pr.locked_until) > new Date()) { fail(res, 423, 'PIN_LOCKED', 'Too many wrong PINs. Try again in 15 minutes or contact support.'); return true; }
      const good = /^\d{4}$/.test(String(body.pin || '')) && crypto.timingSafeEqual(Buffer.from(String(body.pin)), Buffer.from(pr.pin));
      if (!good) {
        const n = Number(pr.attempts) + 1; const lock = n >= 5;
        await pool.query(`UPDATE howdi_v8_works_pins SET attempts=$2, locked_until=CASE WHEN $3::boolean THEN NOW()+interval '15 minutes' ELSE locked_until END WHERE work_order_id=$1`, [woid, lock ? 0 : n, lock]);
        await event(woid, 'worker', lock ? 'pin_locked' : 'pin_wrong');
        if (lock) await notify(custU, 'WORKS_PIN_LOCKED', 'Job PIN locked after 5 wrong tries', 'The job can’t start for 15 minutes. If this wasn’t your worker, report it from the booking.', custRoute, vid);
        fail(res, lock ? 423 : 403, lock ? 'PIN_LOCKED' : 'PIN_WRONG', lock ? 'Too many wrong PINs. Locked for 15 minutes — the customer has been told.' : `Wrong PIN. ${5 - n} ${5 - n === 1 ? 'try' : 'tries'} left. Ask the customer to read it from their booking.`); return true;
      }
      if (!(await tx(async (c) => { await setState(c, woid, 'IN_PROGRESS', ', started_at=NOW()'); await c.query(`UPDATE howdi_v8_works_pins SET verified_at=NOW() WHERE work_order_id=$1`, [woid]); }))) { raced(); return true; }
      await event(woid, 'worker', 'pin_verified', 'Job started');
      await notify(custU, 'WORKS_STARTED', 'Your job has started', 'The worker entered your Job PIN.', custRoute, vid);
      await done(); return true;
    }
    if (sub === 'complete' && req.method === 'POST') {
      if (!need('worker', ['IN_PROGRESS'])) return true;
      if (!(await tx(async (c) => { await setState(c, woid, 'COMPLETED', ', completed_at=NOW()'); }))) { raced(); return true; }
      await event(woid, 'worker', 'completed');
      await notify(custU, 'WORKS_COMPLETED', 'Job marked done — please confirm', `Confirm to ${b.method === 'HPAY' ? 'release the HPay payment' : 'close the booking'}, or report a problem. It closes automatically in ${AUTO_CONFIRM_H} hours.`, custRoute, vid);
      await done(); return true;
    }
    if (sub === 'confirm' && req.method === 'POST') {
      if (!need('customer', ['COMPLETED'])) return true;
      if (!(await tx(async (c, row) => { await setState(c, woid, 'CLOSED', ', closed_at=NOW()'); await release(c, row); await c.query(`UPDATE works_workers SET completed_jobs=COALESCE(completed_jobs,0)+1 WHERE id=$1`, [row.worker_id]); }))) { raced(); return true; }
      await event(woid, 'customer', 'confirmed', b.method === 'HPAY' ? 'Payment released to the worker' : 'Paid directly to the worker');
      await notify(workerU, 'WORKS_PAID', b.method === 'HPAY' ? `Payment released: ₹${money(Number(b.amount) - Number(b.fee))}` : 'Customer confirmed the job', b.method === 'HPAY' ? 'It’s in your Works earnings.' : 'Marked as paid directly to you.', workRoute, vid);
      await done(); return true;
    }
    if (sub === 'issue' && req.method === 'POST') {
      if (!need('customer', ['ARRIVED', 'IN_PROGRESS', 'COMPLETED'])) return true;
      const body = (await getBody(req)) || {}; const reason = ['not_done', 'poor_quality', 'damage', 'overcharge', 'safety', 'no_show', 'other'].includes(body.reason) ? body.reason : null;
      if (!reason) { fail(res, 400, 'VALIDATION', 'Choose what went wrong.'); return true; }
      if (!(await tx(async (c) => { await setState(c, woid, 'DISPUTED'); await c.query(`INSERT INTO howdi_v8_works_issues(work_order_id,raised_by,reason,details) VALUES($1,'customer',$2,$3)`, [woid, reason, text(body.details, 1000) || null]); }))) { raced(); return true; }
      await event(woid, 'customer', 'issue', reason.replace('_', ' '));
      await notify(workerU, 'WORKS_ISSUE', 'The customer reported a problem', 'HOWDI support will contact you. Payment is on hold until it’s resolved.', workRoute, vid);
      await done({ message: 'Reported. HOWDI support will contact you within 24 hours. Your payment stays on hold until it’s resolved.' }); return true;
    }
    if (sub === 'review' && req.method === 'POST') {
      if (!need('customer', ['CLOSED'])) return true;
      const body = (await getBody(req)) || {}; const rating = Math.round(Number(body.rating));
      if (!(rating >= 1 && rating <= 5)) { fail(res, 400, 'VALIDATION', 'Choose 1 to 5 stars.'); return true; }
      const ins = await pool.query(`INSERT INTO works_reviews(work_order_id,customer_user_id,worker_id,rating,review) SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS(SELECT 1 FROM works_reviews WHERE work_order_id=$1) RETURNING id`, [woid, vid, b.worker_id, rating, text(body.text, 600) || null]);
      if (!ins.rowCount) { fail(res, 409, 'ALREADY_REVIEWED', 'You already reviewed this job.'); return true; }
      await pool.query(`UPDATE works_workers SET rating=(SELECT ROUND(AVG(rating)::numeric,2) FROM works_reviews WHERE worker_id=$1) WHERE id=$1`, [b.worker_id]);
      await event(woid, 'customer', 'reviewed', `${rating}★`);
      await notify(workerU, 'WORKS_REVIEW', `New ${rating}★ review`, text(body.text, 100) || 'Open the job to respond.', workRoute, vid);
      await done(); return true;
    }
    if (sub === 'review/respond' && req.method === 'POST') {
      if (role !== 'worker') { fail(res, 403, 'NOT_ALLOWED', 'Only the worker can respond.'); return true; }
      const body = (await getBody(req)) || {}; const t = text(body.text, 600);
      if (t.length < 2) { fail(res, 400, 'VALIDATION', 'Write a response.'); return true; }
      const u = await pool.query(`UPDATE works_reviews SET worker_response=$2, responded_at=NOW() WHERE work_order_id=$1 AND worker_response IS NULL RETURNING id`, [woid, t]);
      if (!u.rowCount) { fail(res, 409, 'INVALID_STATE', 'There’s no review to respond to, or you already responded.'); return true; }
      await done(); return true;
    }
    if (sub === 'messages') {
      if (!(await chatOpen(b))) { fail(res, 403, 'CHAT_CLOSED', 'Booking chat opens once the customer confirms and shares details.'); return true; }
      if (req.method === 'GET') {
        const rows = (await pool.query(`SELECT sender_user_id, body, at FROM howdi_v8_works_messages WHERE work_order_id=$1 ORDER BY id DESC LIMIT 100`, [woid])).rows.reverse();
        ok(res, { items: rows.map((x) => ({ mine: Number(x.sender_user_id) === vid, from: Number(x.sender_user_id) === workerU ? 'worker' : 'customer', text: x.body, at: iso(x.at) })) }); return true;
      }
      if (req.method === 'POST') {
        if (limited(res, `v8-works-msg:${vid}`, 40, 60000)) return true;
        const body = (await getBody(req)) || {}; const t = text(body.text, 1000); if (!t) { fail(res, 400, 'VALIDATION', 'Write a message.'); return true; }
        await pool.query(`INSERT INTO howdi_v8_works_messages(work_order_id,sender_user_id,body) VALUES($1,$2,$3)`, [woid, vid, t]);
        await notify(role === 'customer' ? workerU : custU, 'WORKS_MESSAGE', `Message about your ${role === 'customer' ? 'job' : 'booking'}`, line(t, 100), role === 'customer' ? workRoute : custRoute, vid);
        ok(res, { sent: true }, 201); return true;
      }
    }
    fail(res, 404, 'NOT_FOUND', 'Not found.'); return true;
  }

  async function earnings(me) {
    // pending payouts settle lazily (Preview/Test)
    await pool.query(`UPDATE howdi_v8_works_payouts SET status='PAID' WHERE worker_id=$1 AND status='PROCESSING' AND settle_at<=NOW()`, [me.id]);
    await pool.query(`UPDATE howdi_v8_ledger l SET status='COMPLETED' FROM howdi_v8_works_payouts p WHERE p.worker_id=$1 AND p.status='PAID' AND l.txn_code=p.txn_code AND l.status='PROCESSING'`, [me.id]);
    const w = await wallet(Number(me.user_id));
    const pending = Number((await pool.query(`SELECT COALESCE(SUM(amount-fee),0) s FROM howdi_v8_works_bookings WHERE worker_id=$1 AND method='HPAY' AND pay_state='HELD' AND state IN ('CONFIRMED','EN_ROUTE','ARRIVED','IN_PROGRESS','COMPLETED','DISPUTED')`, [me.id])).rows[0].s);
    const today = Number((await pool.query(`SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_ledger WHERE user_id=$1 AND kind='WORKS_EARNING' AND created_at>=date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'`, [me.user_id])).rows[0].s);
    const total = Number((await pool.query(`SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_ledger WHERE user_id=$1 AND kind='WORKS_EARNING'`, [me.user_id])).rows[0].s);
    const offline = Number((await pool.query(`SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_works_bookings WHERE worker_id=$1 AND method='LATER' AND state='CLOSED'`, [me.id])).rows[0].s);
    const rows = (await pool.query(`SELECT txn_code, direction, amount, kind, reference, note, status, created_at FROM howdi_v8_ledger WHERE user_id=$1 AND kind IN ('WORKS_EARNING','WORKS_PAYOUT') ORDER BY created_at DESC LIMIT 40`, [me.user_id])).rows;
    const payouts = (await pool.query(`SELECT amount, status, txn_code, created_at FROM howdi_v8_works_payouts WHERE worker_id=$1 ORDER BY id DESC LIMIT 20`, [me.id])).rows;
    return { sandbox: sandboxEnabled(), summary: { available: w ? money(w.balance) : 0, pending: money(pending), today: money(today), total: money(total), paid_directly: money(offline) },
      entries: rows.map((r) => ({ reference: r.txn_code, kind: r.kind === 'WORKS_EARNING' ? 'earning' : 'payout', direction: r.direction === 'CREDIT' ? 'in' : 'out', amount: money(r.amount), booking: /^BKG-/.test(String(r.reference || '')) ? r.reference : null, note: r.note, status: String(r.status || 'COMPLETED').toLowerCase(), at: iso(r.created_at) })),
      payouts: payouts.map((x) => ({ amount: money(x.amount), status: x.status.toLowerCase(), reference: x.txn_code, at: iso(x.created_at) })) };
  }
  return { ensureSchema, handle, _internal: { myWorker, workerByRef } };
}
module.exports = { createWorksV8 };
