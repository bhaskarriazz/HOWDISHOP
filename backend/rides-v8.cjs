'use strict';
// Proposed Phase 0 extension. Never enables production passenger transport.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const CLASSES = ['Auto', 'Cab'];
const CHECKS = ['identity_age', 'licence_class', 'registration', 'permit', 'insurance', 'safety', 'background', 'zone', 'accessibility'];
const PILOT_CHECKS = ['operating_permission', 'permit', 'insurance', 'safety', 'support'];
const FIELDS = { customer: ['public_handle', 'precise_pickup', 'destination', 'accessibility_need', 'trip_status'], driver: ['public_handle', 'approved_vehicle_plate', 'trip_status'] };
const code = (prefix) => `${prefix}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
const clean = (v, max = 300) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const error = (status, code, message) => Object.assign(new Error(message), { status, code });
function requireThat(test, status, code, message) { if (!test) throw error(status, code, message); }
function validAt(a, zone, cls, at = Date.now(), need = 'none') {
  return !!a && a.state === 'approved' && a.zone === zone && a.vehicle_class === cls &&
    ['licence_until', 'permit_until', 'insurance_until'].every(k => Date.parse(a.details[k]) > at) &&
    (need === 'none' || a.details.accessibility === need);
}
function quote(body, zone, now = Date.now()) {
  requireThat(CLASSES.includes(body.vehicle_class) && body.zone === zone, 400, 'PILOT_ONLY', 'Choose Auto or Cab in the preview pilot area.');
  const mode = body.mode || 'scheduled';
  requireThat(['instant','scheduled'].includes(mode),400,'MODE_INVALID','Choose Book now or Schedule.');
  const pickup = clean(body.pickup), destination = clean(body.destination), at = mode === 'instant' ? now : Date.parse(body.scheduled_at);
  requireThat(pickup.length >= 4 && destination.length >= 4 && pickup !== destination, 400, 'ADDRESS_REQUIRED', 'Enter distinct pickup and destination meeting points.');
  requireThat(mode === 'instant' || (at >= now + 30 * 60000 && at <= now + 7 * 86400000), 400, 'SCHEDULE_INVALID', 'Schedule between 30 minutes and 7 days ahead.');
  requireThat(['cash', 'hpay_test'].includes(body.payment), 400, 'PAYMENT_INVALID', 'Choose cash or HPay Test.');
  requireThat(['none', 'step_free'].includes(body.accessibility), 400, 'ACCESSIBILITY_INVALID', 'Choose a supported accessibility need.');
  const base = body.vehicle_class === 'Auto' ? 4000 : 8000, scheduled = mode === 'scheduled' ? 1000 : 0, service = 500;
  return { mode, pickup, destination, scheduled_at: new Date(at).toISOString(), zone, vehicle_class: body.vehicle_class,
    accessibility: body.accessibility, payment: body.payment, fare: { base, scheduled, service, total: base + scheduled + service, currency: 'INR', unit: 'paise', basis: 'Fixed preview pilot fare; no GPS distance pricing' },
    cancellation: 'Preview: cancellation is free. No-show or disputed fee requires staff review; no automatic fee.', expires_at: new Date(now + (mode === 'instant' ? 2 : 10) * 60000).toISOString() };
}
function createRidesV8({ pool, getBody, helpers, sandboxEnabled }) {
  const { viewer, ok, fail } = helpers;
  const zone = clean(process.env.HOWDI_RIDES_PILOT_ZONE || 'Bengaluru preview', 80);
  let previewDb = false;
  const enabled = () => process.env.HOWDI_RIDES_PREVIEW === '1' && process.env.NODE_ENV !== 'production' && sandboxEnabled() && previewDb;
  async function ensureSchema() {
    previewDb = /_preview$/.test((await pool.query('SELECT current_database() AS name')).rows[0].name);
    if (process.env.HOWDI_RIDES_PREVIEW === '1' && previewDb && process.env.NODE_ENV !== 'production')
      await pool.query(fs.readFileSync(path.join(__dirname, 'rides-v8.sql'), 'utf8'));
  }
  async function tx(fn) { const db = await pool.connect(); try { await db.query('BEGIN'); const out = await fn(db); await db.query('COMMIT'); return out; } catch (e) { await db.query('ROLLBACK'); throw e; } finally { db.release(); } }
  const one = async (db, sql, args = []) => (await db.query(sql, args)).rows[0];
  const handleOf = async (db, uid) => (await one(db, 'SELECT public_username FROM howdi_connect_profiles WHERE user_id=$1', [uid]))?.public_username;
  async function event(db, ref, actor, action, detail = {}) { await db.query('INSERT INTO howdi_ride_events(ref,actor,action,detail) VALUES($1,$2,$3,$4)', [ref, actor, action, JSON.stringify(detail)]); }
  async function notice(db, uid, ref, message) { if (uid) await db.query('INSERT INTO howdi_ride_notices(user_id,ref,message) VALUES($1,$2,$3)', [uid, ref, message]); }
  async function both(db, r, message) { await notice(db, r.customer_id, r.code, message); if (r.driver_id) await notice(db, r.driver_id, r.code, message); }
  async function driverOperational(db, userId) {
    const user = await one(db, "SELECT is_active,account_status FROM users WHERE id=$1", [userId]);
    return !!user && user.is_active !== false && !['SUSPENDED', 'RESTRICTED', 'DISABLED', 'BANNED'].includes(String(user.account_status || '').toUpperCase());
  }
  async function blockedBetween(db, firstUserId, secondUserId) {
    if (!firstUserId || !secondUserId) return false;
    return !!(await one(db, `SELECT 1 FROM howdi_connect_profile_blocks
      WHERE (blocker_user_id=$1 AND blocked_user_id=$2) OR (blocker_user_id=$2 AND blocked_user_id=$1) LIMIT 1`, [firstUserId, secondUserId]));
  }
  async function allowed(db, a, cls, at, need, customerId = null) {
    const gate = await one(db, 'SELECT paused,preview_checks FROM howdi_ride_zones WHERE zone=$1 AND vehicle_class=$2 FOR SHARE', [zone, cls]);
    return gate && !gate.paused && await driverOperational(db, a?.user_id) && !(await blockedBetween(db, a?.user_id, customerId)) && PILOT_CHECKS.every(k => gate.preview_checks[k] === true) && validAt(a, zone, cls, Date.now(), need) && validAt(a, zone, cls, at, need);
  }
  async function matchInstant(db, r) {
    if (r.state !== 'requested' || r.quote.mode !== 'instant' || Date.parse(r.match_until) <= Date.now()) return;
    if (await one(db,"SELECT 1 FROM howdi_ride_offers WHERE ride_code=$1 AND state='pending'",[r.code])) return;
    const candidates = (await db.query(`SELECT a.* FROM howdi_ride_applications a WHERE a.available=TRUE AND a.vehicle_class=$1 AND a.user_id<>$2
      AND ($3::bigint IS NULL OR a.user_id=$3) AND NOT EXISTS(SELECT 1 FROM howdi_ride_offers o WHERE o.ride_code=$4 AND o.driver_id=a.user_id)
      AND NOT EXISTS(SELECT 1 FROM howdi_ride_offers o WHERE o.driver_id=a.user_id AND o.state='pending')
      AND NOT EXISTS(SELECT 1 FROM howdi_rides x WHERE x.driver_id=a.user_id AND (x.state='in_trip' OR (x.state='accepted' AND ABS(EXTRACT(EPOCH FROM ((x.quote->>'scheduled_at')::timestamptz-NOW())))<7200)))
      ORDER BY a.created_at,a.code`,[r.quote.vehicle_class,r.customer_id,r.offered_to,r.code])).rows;
    for (const a of candidates) if (await allowed(db,a,r.quote.vehicle_class,Date.now(),r.quote.accessibility,r.customer_id)) {
      const expires = new Date(Math.min(Date.now()+90000,Date.parse(r.match_until)));
      await db.query('INSERT INTO howdi_ride_offers(code,ride_code,driver_id,expires_at) VALUES($1,$2,$3,$4)',[code('RO'),r.code,a.user_id,expires]);
      await db.query('UPDATE howdi_rides SET offer_expires_at=$2 WHERE code=$1',[r.code,expires]);
      await event(db,r.code,'system','instant_offer_created',{vehicle_class:r.quote.vehicle_class});
      await notice(db,a.user_id,r.code,'Book now preview offer. Accept or decline within 90 seconds. Precise pickup stays private.'); return;
    }
  }
  async function reconcile(db) {
    const expired = (await db.query("UPDATE howdi_ride_offers SET state='expired',responded_at=NOW() WHERE state='pending' AND expires_at<=NOW() RETURNING *")).rows;
    for(const o of expired) { await event(db,o.ride_code,'system','offer_expired'); await notice(db,o.driver_id,o.ride_code,'Preview offer expired. It cannot be accepted.'); }
    const ended = (await db.query("UPDATE howdi_rides SET state='expired' WHERE state='requested' AND COALESCE(match_until,(quote->>'scheduled_at')::timestamptz)<=NOW() RETURNING *")).rows;
    for(const r of ended) { await db.query("UPDATE howdi_ride_offers SET state='expired',responded_at=NOW() WHERE ride_code=$1 AND state='pending'",[r.code]); await event(db,r.code,'system','request_expired');await both(db,r,'Ride request timed out without a driver. No charge. Choose a new request explicitly.'); }
    for(const r of (await db.query("SELECT * FROM howdi_rides WHERE state='requested' AND quote->>'mode'='instant' ORDER BY created_at LIMIT 100")).rows) await matchInstant(db,r);
  }
  async function applicationDto(db, a) { return { code: a.code, handle: await handleOf(db, a.user_id), vehicle_class: a.vehicle_class, zone: a.zone, state: a.state, details: a.details, reason: a.reason, available: a.available, eligible_now: validAt(a, zone, a.vehicle_class), checks: a.checks, document_kinds: (await db.query('SELECT kind FROM howdi_ride_documents WHERE application_code=$1 ORDER BY kind', [a.code])).rows.map(d => d.kind) }; }
  async function rideDto(db, r, uid, staff = false) {
    const isCustomer = String(uid) === String(r.customer_id), disclosed = r.customer_consent && r.driver_consent;
    const a = r.driver_id ? await one(db, 'SELECT * FROM howdi_ride_applications WHERE user_id=$1 AND vehicle_class=$2', [r.driver_id, r.quote.vehicle_class]) : null;
    const { pickup, destination, ...safeQuote } = r.quote;
    const ledger = (await db.query('SELECT kind,amount,payment,reference,created_at FROM howdi_ride_ledger WHERE ride_code=$1 ORDER BY created_at', [r.code])).rows;
    let matching = null;
    if (r.state === 'requested' && r.quote.mode === 'instant') {
      const offer = await one(db,"SELECT expires_at FROM howdi_ride_offers WHERE ride_code=$1 AND state='pending'",[r.code]);
      matching = offer ? 'waiting_for_acceptance' : 'no_eligible_driver'; r.offer_expires_at = offer?.expires_at || null;
    } else if (r.state === 'requested') {
      matching = 'no_eligible_driver';
      const candidates = (await db.query("SELECT a.* FROM howdi_ride_applications a WHERE available=TRUE AND vehicle_class=$1 AND user_id<>$2 AND NOT EXISTS(SELECT 1 FROM howdi_ride_declines d WHERE d.ride_code=$3 AND d.user_id=a.user_id)", [r.quote.vehicle_class, r.customer_id, r.code])).rows;
      for (const candidate of candidates) if ((!r.offered_to || String(r.offered_to) === String(candidate.user_id)) && await allowed(db, candidate, r.quote.vehicle_class, Date.parse(r.quote.scheduled_at), r.quote.accessibility, r.customer_id)) { matching = 'waiting_for_acceptance'; break; }
    }
    return { code: r.code, state: r.state, matching, quote: safeQuote, customer: await handleOf(db, r.customer_id), driver: r.driver_id ? await handleOf(db, r.driver_id) : null,
      side: isCustomer ? 'customer' : 'driver', consent_fields: FIELDS[isCustomer ? 'customer' : 'driver'], customer_consent: r.customer_consent, driver_consent: r.driver_consent,
      ...(isCustomer || disclosed || staff ? { pickup, destination } : {}), ...(disclosed || staff ? { plate: a?.details.plate } : {}),
      ...(isCustomer && disclosed && r.state === 'accepted' ? { pin: r.pin, pin_expires_at: r.pin_expires_at } : {}),
      reason: r.reason, payment_state: r.payment_state, payout_state: r.payout_state, ledger, offer_expires_at: r.offer_expires_at, support_path: `/move/${r.code}`, preview: true };
  }
  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, ''), admin = p.startsWith('/api/admin/v8/rides');
    if (!(p === '/api/v8/rides' || p.startsWith('/api/v8/rides/') || admin)) return false;
    if (!enabled()) { fail(res, 404, 'PREVIEW_DISABLED', 'Rides preview is unavailable.'); return true; }
    try {
      const v = await viewer(req), staff = req.howdiAdminSession;
      if (admin) requireThat(staff?.username, 401, 'STAFF_SESSION_REQUIRED', 'Sign in with a staff session. Shared admin tokens are not accepted for Rides.');
      else requireThat(v, 401, 'SIGN_IN_REQUIRED', 'Sign in to use Rides.');
      const b = ['POST', 'PUT'].includes(req.method) ? await getBody(req) || {} : {};
      const uid = v?.id;
      const result = await tx(async db => {
        // Serialize all preview mutations: one pilot, small volume. Lock covers assignment, expiry and consent races.
        await db.query('SELECT pg_advisory_xact_lock(6845991)');
        if (!admin) requireThat(await handleOf(db, uid), 409, 'NEED_HANDLE', 'Choose your public @handle first.');
        const now = Date.now();
        await reconcile(db);
        if (p === '/api/v8/rides/config' && req.method === 'GET') {
          const gates = (await db.query('SELECT vehicle_class,paused,preview_checks FROM howdi_ride_zones WHERE zone=$1',[zone])).rows;
          return { zone, classes: CLASSES, preview: true, production_gate: 'CLOSED', fields: FIELDS, modes: ['Bike','Auto','Cab','Women Special'].map(name=>{const gate=gates.find(g=>g.vehicle_class===name);const open=CLASSES.includes(name)&&gate&&!gate.paused&&PILOT_CHECKS.every(k=>gate.preview_checks[k]);return {name,enabled:!!open,reason:open?'Preview pilot enabled; no production permission':name==='Women Special'?'Eligibility, privacy and operating gates closed. No fallback.':name==='Bike'?'Bike operating and safety gates closed.':'Pilot checks incomplete or class paused.'};}) };
        }
        if (p === '/api/v8/rides/quote' && req.method === 'POST') {
          const q = quote(b, zone), key = code('RQ');
          const gate = await one(db,'SELECT * FROM howdi_ride_zones WHERE zone=$1 AND vehicle_class=$2',[zone,q.vehicle_class]);
          requireThat(gate&&!gate.paused&&PILOT_CHECKS.every(k=>gate.preview_checks[k]),409,'CLASS_GATE_CLOSED','This class is not enabled for the preview pilot. Choose another class explicitly.');
          await db.query('INSERT INTO howdi_ride_quotes(code,user_id,quote) VALUES($1,$2,$3)', [key, uid, JSON.stringify(q)]); return { code: key, ...q };
        }
        if (p === '/api/v8/rides/bookings' && req.method === 'POST') {
          requireThat(/^[A-Za-z0-9_-]{16,100}$/.test(b.request_key || ''), 400, 'KEY_REQUIRED', 'A retry-safe request key is required.');
          const old = await one(db, 'SELECT * FROM howdi_rides WHERE customer_id=$1 AND request_key=$2 FOR UPDATE', [uid, b.request_key]);
          if (old) { requireThat(old.quote_code === b.quote_code, 409, 'KEY_CONFLICT', 'This retry key belongs to a different quote.'); return { ride: await rideDto(db, old, uid), duplicate: true }; }
          const qr = await one(db, 'SELECT * FROM howdi_ride_quotes WHERE code=$1 AND user_id=$2', [b.quote_code, uid]);
          requireThat(qr && Date.parse(qr.quote.expires_at) > now, 409, 'QUOTE_EXPIRED', 'Quote expired. Review a new estimate.');
          const prior = await one(db, 'SELECT * FROM howdi_rides WHERE quote_code=$1', [b.quote_code]);
          if (prior) return { ride: await rideDto(db, prior, uid), duplicate: true };
          const gate = await one(db,'SELECT * FROM howdi_ride_zones WHERE zone=$1 AND vehicle_class=$2',[zone,qr.quote.vehicle_class]);
          requireThat(gate&&!gate.paused&&PILOT_CHECKS.every(k=>gate.preview_checks[k]),409,'CLASS_GATE_CLOSED','Class paused or pilot approval missing. No booking created.');
          const instant = qr.quote.mode === 'instant', requestedQuote = {...qr.quote,...(instant?{scheduled_at:new Date().toISOString()}: {})};
          const r = await one(db, `INSERT INTO howdi_rides(code,customer_id,request_key,quote_code,quote,match_until) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [code('HR'), uid, b.request_key, qr.code, JSON.stringify(requestedQuote), instant?new Date(now+5*60000):new Date(qr.quote.scheduled_at)]);
          await event(db, r.code, 'customer', 'requested'); await both(db, r, `${instant?'Book now':'Scheduled ride'} requested — Preview/Test only.`); await matchInstant(db,r);
          return { ride: await rideDto(db, r, uid) };
        }
        if (p === '/api/v8/rides/application' && req.method === 'PUT') {
          requireThat(CLASSES.includes(b.vehicle_class), 400, 'CLASS_REQUIRED', 'Choose Auto or Cab.');
          const a = await one(db, 'SELECT * FROM howdi_ride_applications WHERE user_id=$1 AND vehicle_class=$2 FOR UPDATE', [uid, b.vehicle_class]);
          requireThat(!a || ['draft', 'info_requested', 'rejected', 'expired'].includes(a.state), 409, 'APPLICATION_LOCKED', 'Application is locked during review or approval.');
          const details = { plate: clean(b.plate, 20), licence_until: clean(b.licence_until, 40), permit_until: clean(b.permit_until, 40), insurance_until: clean(b.insurance_until, 40), accessibility: b.accessibility === 'step_free' ? 'step_free' : 'none', age_confirmed: b.age_confirmed === true, declaration: b.declaration === true };
          const row = await one(db, `INSERT INTO howdi_ride_applications(code,user_id,vehicle_class,zone,details) VALUES($1,$2,$3,$4,$5)
            ON CONFLICT(user_id,vehicle_class) DO UPDATE SET details=$5,state='draft',available=FALSE,checks='{}',reason='' RETURNING *`, [a?.code || code('RA'), uid, b.vehicle_class, zone, JSON.stringify(details)]);
          await event(db, row.code, 'applicant', 'draft_saved'); return { application: await applicationDto(db, row) };
        }
        let m;
        if ((m = p.match(/^\/api\/v8\/rides\/applications\/(RA-[A-F0-9]+)\/(document|submit|availability)$/)) && req.method === 'POST') {
          const a = await one(db, 'SELECT * FROM howdi_ride_applications WHERE code=$1 AND user_id=$2 FOR UPDATE', [m[1], uid]);
          requireThat(a, 404, 'NOT_FOUND', 'Application not found.');
          if (m[2] === 'document') {
            requireThat(['draft', 'info_requested', 'rejected', 'expired'].includes(a.state), 409, 'APPLICATION_LOCKED', 'Documents are locked during review.');
            requireThat(['identity', 'licence', 'registration', 'permit', 'insurance', 'safety'].includes(b.kind) && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(b.image || '') && b.image.length <= 1500000, 400, 'DOCUMENT_INVALID', 'Upload a PNG/JPEG document up to 1 MB.');
            await db.query('INSERT INTO howdi_ride_documents(application_code,kind,image) VALUES($1,$2,$3) ON CONFLICT(application_code,kind) DO UPDATE SET image=$3', [a.code, b.kind, b.image]);
            await event(db, a.code, 'applicant', 'document_saved', { kind: b.kind }); return { saved: true };
          }
          if (m[2] === 'submit') {
            requireThat(['draft', 'info_requested', 'rejected', 'expired'].includes(a.state), 409, 'APPLICATION_LOCKED', 'Application already submitted.');
            const docs = (await db.query('SELECT kind FROM howdi_ride_documents WHERE application_code=$1', [a.code])).rows;
            requireThat(docs.length === 6 && a.details.age_confirmed && a.details.declaration && /^[A-Z0-9 -]{5,20}$/i.test(a.details.plate) && validAt({ ...a, state: 'approved' }, zone, a.vehicle_class), 400, 'EVIDENCE_REQUIRED', 'Provide all six documents, valid expiry dates, plate, age and declaration.');
            await db.query("UPDATE howdi_ride_applications SET state='submitted',available=FALSE WHERE code=$1", [a.code]);
            await notice(db, uid, a.code, 'Driver application submitted for staff review.'); await event(db, a.code, 'applicant', 'submitted', { from: a.state, to: 'submitted' }); return { state: 'submitted' };
          }
          requireThat(b.available === false || await allowed(db, a, a.vehicle_class, now, 'none'), 409, 'INELIGIBLE', 'Approval, account, zone and documents must be valid.');
          const available = b.available === true;
          await db.query('UPDATE howdi_ride_applications SET available=$2 WHERE code=$1', [a.code, available]); await event(db, a.code, 'applicant', 'availability_changed', { from: a.available, to: available }); return { available };
        }
        if (p === '/api/v8/rides' && req.method === 'GET') {
          const applications = (await db.query('SELECT * FROM howdi_ride_applications WHERE user_id=$1', [uid])).rows;
          const rides = (await db.query('SELECT * FROM howdi_rides WHERE customer_id=$1 OR driver_id=$1 ORDER BY created_at DESC LIMIT 100', [uid])).rows;
          const offers = [];
          for (const r of (await db.query("SELECT * FROM howdi_rides WHERE state='requested' AND COALESCE(match_until,(quote->>'scheduled_at')::timestamptz) > NOW() AND customer_id<>$1 ORDER BY created_at LIMIT 100", [uid])).rows) {
            if(r.quote.mode==='instant' && !(await one(db,"SELECT 1 FROM howdi_ride_offers WHERE ride_code=$1 AND driver_id=$2 AND state='pending' AND expires_at>NOW()",[r.code,uid]))) continue;
            const a = applications.find(a => a.vehicle_class === r.quote.vehicle_class && a.available);
            if ((!r.offered_to || String(r.offered_to) === String(uid)) && a && await allowed(db, a, r.quote.vehicle_class, Date.parse(r.quote.scheduled_at), r.quote.accessibility, r.customer_id) && !(await one(db, 'SELECT 1 FROM howdi_ride_declines WHERE ride_code=$1 AND user_id=$2', [r.code, uid]))) offers.push(await rideDto(db, r, uid));
          }
          return { applications: await Promise.all(applications.map(a => applicationDto(db, a))), rides: await Promise.all(rides.map(r => rideDto(db, r, uid))), offers, notices: (await db.query('SELECT ref,message,created_at FROM howdi_ride_notices WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30', [uid])).rows };
        }
        if ((m = p.match(/^\/api\/v8\/rides\/(HR-[A-F0-9]+)(?:\/(accept|decline|consent|start|complete|cash|pay|cancel|late|no-show|support|rating))?$/))) {
          const r = await one(db, 'SELECT * FROM howdi_rides WHERE code=$1 FOR UPDATE', [m[1]]);
          requireThat(r, 404, 'NOT_FOUND', 'Ride not found.');
          const action = m[2], isCustomer = String(uid) === String(r.customer_id), isDriver = String(uid) === String(r.driver_id);
          if (['accept', 'decline'].includes(action)) {
            requireThat(req.method === 'POST' && !isCustomer && r.state === 'requested' && Date.parse(r.match_until || r.quote.scheduled_at) > now, 409, 'OFFER_EXPIRED', 'This offer is unavailable or expired.');
            if(r.quote.mode==='instant') requireThat(await one(db,"SELECT 1 FROM howdi_ride_offers WHERE ride_code=$1 AND driver_id=$2 AND state='pending' AND expires_at>NOW()",[r.code,uid]),409,'OFFER_EXPIRED','This timed offer is no longer available to you.');
            requireThat(!r.offered_to || String(r.offered_to) === String(uid), 403, 'OFFER_SCOPED', 'This scheduled offer was assigned to another driver.');
            const a = await one(db, 'SELECT * FROM howdi_ride_applications WHERE user_id=$1 AND vehicle_class=$2 FOR UPDATE', [uid, r.quote.vehicle_class]);
            requireThat(a?.available && await allowed(db, a, r.quote.vehicle_class, Date.parse(r.quote.scheduled_at), r.quote.accessibility, r.customer_id), 403, 'INELIGIBLE', 'Driver is not eligible for this account, zone, class, accessibility need or date.');
            if (action === 'decline') { await db.query('INSERT INTO howdi_ride_declines(ride_code,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [r.code, uid]); await db.query("UPDATE howdi_ride_offers SET state='declined',responded_at=NOW() WHERE ride_code=$1 AND driver_id=$2 AND state='pending'",[r.code,uid]); await event(db, r.code, 'driver', 'declined'); await notice(db,r.customer_id,r.code,'Driver declined. Matching may try another eligible driver in the same selected class.'); await matchInstant(db,r); return { declined: true }; }
            requireThat(!(await one(db, "SELECT 1 FROM howdi_rides WHERE driver_id=$1 AND (state='in_trip' OR (state='accepted' AND ABS(EXTRACT(EPOCH FROM ((quote->>'scheduled_at')::timestamptz-$2::timestamptz)))<7200))", [uid, r.quote.scheduled_at])), 409, 'SLOT_UNAVAILABLE', 'Another trip is active or overlaps this two-hour preview slot.');
            r.driver_id = uid; r.state = 'accepted';
            await db.query("UPDATE howdi_ride_offers SET state='accepted',responded_at=NOW() WHERE ride_code=$1 AND driver_id=$2 AND state='pending'",[r.code,uid]);
            await db.query("UPDATE howdi_rides SET driver_id=$2,state='accepted' WHERE code=$1", [r.code, uid]); await event(db, r.code, 'driver', 'accepted', { from: 'requested', to: 'accepted' }); await both(db, r, 'Driver accepted. Review field disclosure before pickup details are shared.');
            return { ride: await rideDto(db, r, uid) };
          }
          requireThat(isCustomer || isDriver, 404, 'NOT_FOUND', 'Ride not found.');
          if (req.method === 'GET' && !action) return { ride: await rideDto(db, r, uid) };
          requireThat(req.method === 'POST' && action, 405, 'METHOD_NOT_ALLOWED', 'Unsupported ride action.');
          const side = isCustomer ? 'customer' : 'driver';
          if (action === 'consent') {
            requireThat(r.state === 'accepted' && JSON.stringify(b.fields) === JSON.stringify(FIELDS[side]), 400, 'DISCLOSURE_REQUIRED', 'Confirm the exact listed fields.');
            if (!r[`${side}_consent`]) { r[`${side}_consent`] = true; await db.query(`UPDATE howdi_rides SET ${side}_consent=TRUE WHERE code=$1`, [r.code]); await event(db, r.code, side, 'consent', { fields: FIELDS[side], version: 'phase0-v1' }); }
            if (r.customer_consent && r.driver_consent && !r.pin) { r.pin = String(crypto.randomInt(1000, 10000)); r.pin_expires_at = new Date(r.quote.mode==='instant'?Date.now()+15*60000:Date.parse(r.quote.scheduled_at) + 60 * 60000); await db.query('UPDATE howdi_rides SET pin=$2,pin_expires_at=$3 WHERE code=$1', [r.code, r.pin, r.pin_expires_at]); await both(db, r, 'Both sides confirmed disclosure. Pickup details are now available in the ride.'); }
          } else if (action === 'start') {
            requireThat(isDriver && r.state === 'accepted' && r.customer_consent && r.driver_consent, 409, 'OUT_OF_ORDER', 'Both sides must consent before the driver starts.');
            const a = await one(db, 'SELECT * FROM howdi_ride_applications WHERE user_id=$1 AND vehicle_class=$2 FOR UPDATE', [uid, r.quote.vehicle_class]);
            requireThat(await allowed(db, a, r.quote.vehicle_class, now, r.quote.accessibility), 403, 'INELIGIBLE', 'Driver eligibility expired or service is paused.');
            requireThat(now >= Date.parse(r.quote.scheduled_at) - 15 * 60000, 409, 'TOO_EARLY', 'Pickup starts within 15 minutes of the scheduled time.');
            requireThat(now < Date.parse(r.pin_expires_at), 409, 'PIN_EXPIRED', 'Pickup PIN expired. Contact support.');
            requireThat(r.pin_attempts < 5, 429, 'PIN_RATE_LIMIT', 'PIN attempt limit reached. Contact support.');
            if (typeof b.pin !== 'string' || !/^\d{4}$/.test(b.pin) || b.pin !== r.pin) { await db.query('UPDATE howdi_rides SET pin_attempts=pin_attempts+1 WHERE code=$1', [r.code]); await event(db, r.code, 'driver', 'pin_failed'); return { error: { status: 400, code: 'PIN_WRONG', message: 'Incorrect PIN. Check with the customer in person.' } }; }
            r.state = 'in_trip'; await db.query("UPDATE howdi_rides SET state='in_trip',pin=NULL WHERE code=$1", [r.code]); await event(db, r.code, side, 'started', { from: 'accepted', to: 'in_trip' }); await both(db, r, 'Trip started. No live location is collected in this preview.');
          } else if (action === 'complete') {
            requireThat(isDriver && ['in_trip', 'completed'].includes(r.state), 409, 'OUT_OF_ORDER', 'Only the assigned driver can complete a started ride.');
            if (r.state !== 'completed') { r.state = 'completed'; await db.query("UPDATE howdi_rides SET state='completed' WHERE code=$1", [r.code]); await event(db, r.code, side, 'completed', { from: 'in_trip', to: 'completed' }); await both(db, r, 'Trip completed. Preview payment and receipt are ready.'); }
          } else if (action === 'cash' || action === 'pay') {
            requireThat(r.state === 'completed' && (action === 'cash' ? isDriver && r.quote.payment === 'cash' : isCustomer && r.quote.payment === 'hpay_test'), 409, 'PAYMENT_METHOD', 'Use the chosen payment method after completion.');
            requireThat(action !== 'pay' || b.test_outcome === undefined || b.test_outcome === 'fail', 400, 'PAYMENT_OUTCOME_CLIENT_CONTROLLED', 'A client cannot declare a successful payment outcome.');
            if (r.payment_state !== 'paid' && r.payment_state !== 'refunded') {
              if (action === 'pay' && b.test_outcome === 'fail') { const from = r.payment_state; r.payment_state = 'failed'; await db.query("UPDATE howdi_rides SET payment_state='failed' WHERE code=$1", [r.code]); await event(db, r.code, side, 'test_payment_failed', { from, to: 'failed', method: r.quote.payment }); return { ride: await rideDto(db, r, uid) }; }
              await db.query('INSERT INTO howdi_ride_ledger(ride_code,kind,amount,payment,reference) VALUES($1,$2,$3,$4,$5) ON CONFLICT(ride_code,kind) DO NOTHING', [r.code, 'collection', r.quote.fare.total, r.quote.payment, code(r.quote.payment === 'cash' ? 'CASH' : 'HPTEST')]);
              const from = r.payment_state; r.payment_state = 'paid'; await db.query("UPDATE howdi_rides SET payment_state='paid' WHERE code=$1", [r.code]); await event(db, r.code, side, 'payment_recorded', { from, to: 'paid', method: r.quote.payment }); await both(db, r, r.quote.payment === 'cash' ? 'Driver recorded test cash received. View receipt or dispute collection.' : 'HPay Test payment recorded; no real money moved.');
            }
          } else if (action === 'cancel') {
            requireThat(['requested', 'accepted', 'cancelled'].includes(r.state) && clean(b.reason) && b.confirm === true, 409, 'CANCEL_CONFIRM_REQUIRED', 'Confirm free cancellation with a reason.');
            if (r.state !== 'cancelled') { const from = r.state; r.state = 'cancelled'; r.reason = clean(b.reason); const pending=(await db.query("UPDATE howdi_ride_offers SET state='cancelled',responded_at=NOW() WHERE ride_code=$1 AND state='pending' RETURNING driver_id",[r.code])).rows;for(const o of pending)await notice(db,o.driver_id,r.code,'Customer cancelled this preview request. The offer is closed.'); await db.query("UPDATE howdi_rides SET state='cancelled',reason=$2,pin=NULL WHERE code=$1", [r.code, r.reason]); await event(db, r.code, side, 'cancelled', { from, to: 'cancelled', reason: r.reason }); await both(db, r, `${side === 'driver' ? 'Driver' : 'Customer'} cancelled. No fee charged. Rebook explicitly if needed.`); }
          } else if (['support', 'late', 'no-show'].includes(action)) {
            const kind = action === 'support' ? b.kind : action;
            requireThat(['support', 'lost_item', 'incident', 'refund', 'fee_review', 'appeal', 'late', 'no-show', 'cash_dispute'].includes(kind) && clean(b.reason), 400, 'REASON_REQUIRED', 'Choose a case type and give a reason.');
            if (action === 'no-show') requireThat(isDriver && r.state === 'accepted' && now >= Date.parse(r.quote.scheduled_at) + 15 * 60000, 409, 'TOO_EARLY', 'No-show review opens 15 minutes after pickup time.');
            if (action === 'late') requireThat(isDriver && r.state === 'accepted', 409, 'OUT_OF_ORDER', 'Only the assigned driver can report lateness before pickup.');
            const c = code('RC'); await db.query('INSERT INTO howdi_ride_cases(code,ride_code,user_id,kind,reason) VALUES($1,$2,$3,$4,$5)', [c, r.code, uid, kind, clean(b.reason)]);
            await event(db, r.code, side, 'case_opened', { kind, case: c }); await notice(db, uid, r.code, `Case ${c} opened for staff review; no automatic fee or emergency dispatch.`); if (action === 'late') await both(db, r, 'Driver reported late arrival. Open the ride for support or free cancellation.'); return { case: c };
          } else if (action === 'rating') {
            requireThat(r.state === 'completed' && Number.isInteger(b.stars) && b.stars >= 1 && b.stars <= 5, 400, 'RATING_INVALID', 'Rate a completed ride from 1 to 5.');
            await db.query('INSERT INTO howdi_ride_ratings(ride_code,user_id,stars) VALUES($1,$2,$3) ON CONFLICT(ride_code,user_id) DO UPDATE SET stars=$3', [r.code, uid, b.stars]); return { saved: true };
          }
          return { ride: await rideDto(db, r, uid) };
        }
        if (admin) {
          const actor = `staff:${staff.username}`;
          if ((m = p.match(/^\/api\/admin\/v8\/rides\/(HR-[A-F0-9]+)\/assign$/)) && req.method === 'POST') {
            const r = await one(db, 'SELECT * FROM howdi_rides WHERE code=$1 FOR UPDATE', [m[1]]);
            requireThat(r?.state === 'requested' && clean(b.reason), 409, 'ASSIGNMENT_INVALID', 'Choose a waiting booking and give an assignment reason.');
            const a = await one(db, 'SELECT a.* FROM howdi_ride_applications a JOIN howdi_connect_profiles p ON p.user_id=a.user_id WHERE p.public_username=$1 AND a.vehicle_class=$2 FOR UPDATE OF a', [clean(b.handle).replace(/^@/, ''), r.quote.vehicle_class]);
            requireThat(a?.available && String(a.user_id) !== String(r.customer_id) && await allowed(db, a, r.quote.vehicle_class, Date.parse(r.quote.scheduled_at), r.quote.accessibility, r.customer_id), 403, 'INELIGIBLE', 'Driver must be available and eligible for this scheduled trip.');
            requireThat(!(await one(db,"SELECT 1 FROM howdi_rides WHERE driver_id=$1 AND (state='in_trip' OR (state='accepted' AND ABS(EXTRACT(EPOCH FROM ((quote->>'scheduled_at')::timestamptz-$2::timestamptz)))<7200))",[a.user_id,r.quote.scheduled_at])),409,'SLOT_UNAVAILABLE','Driver already has an active or overlapping trip.');
            if (r.quote.mode === 'instant') {
              const existing = await one(db,'SELECT * FROM howdi_ride_offers WHERE ride_code=$1 AND driver_id=$2',[r.code,a.user_id]);
              requireThat(!existing || existing.state==='pending',409,'OFFER_EXPIRED','A declined or expired offer cannot be reassigned to this driver.');
              requireThat(!(await one(db,"SELECT 1 FROM howdi_ride_offers WHERE driver_id=$1 AND ride_code<>$2 AND state='pending'",[a.user_id,r.code])),409,'SLOT_UNAVAILABLE','Driver is reviewing another timed offer.');
              if (!existing) {
                const cancelled=(await db.query("UPDATE howdi_ride_offers SET state='cancelled',responded_at=NOW() WHERE ride_code=$1 AND state='pending' RETURNING driver_id",[r.code])).rows;
                for(const o of cancelled) await notice(db,o.driver_id,r.code,'Staff reassigned this offer. It is no longer available.');
                r.offered_to=a.user_id;
                await matchInstant(db,r);
              }
            }
            await db.query('UPDATE howdi_rides SET offered_to=$2 WHERE code=$1', [r.code, a.user_id]);
            await event(db, r.code, actor, 'offer_assigned', { from: r.offered_to ? 'assigned' : 'unassigned', to: 'assigned', reason: clean(b.reason) }); await notice(db, a.user_id, r.code, 'Staff offered you a preview trip. Accept or decline from Rider desk.'); await notice(db, r.customer_id, r.code, 'Staff assisted with an offer. Awaiting driver acceptance.'); return { saved: true };
          }
          if (p === '/api/admin/v8/rides' && req.method === 'GET') {
            // Expired approval never remains available; offer/start checks also enforce expiry independently.
            const expired = (await db.query("UPDATE howdi_ride_applications SET state='expired',available=FALSE WHERE state='approved' AND LEAST((details->>'licence_until')::timestamptz,(details->>'permit_until')::timestamptz,(details->>'insurance_until')::timestamptz)<=NOW() RETURNING *")).rows;
            for (const a of expired) { await event(db, a.code, 'system', 'expired'); await notice(db, a.user_id, a.code, 'Driver documents expired. Availability disabled; resubmit for review.'); }
            const apps = (await db.query('SELECT * FROM howdi_ride_applications ORDER BY created_at DESC LIMIT 100')).rows;
            const rides = (await db.query('SELECT * FROM howdi_rides ORDER BY created_at DESC LIMIT 100')).rows;
            await event(db, 'ADMIN', actor, 'queue_viewed');
            const audit = (await db.query('SELECT ref,actor,action,detail,created_at FROM howdi_ride_events ORDER BY created_at DESC LIMIT 100')).rows;
            return { applications: await Promise.all(apps.map(a => applicationDto(db, a))), rides: await Promise.all(rides.map(r => rideDto(db, r, null, true))), offers: (await db.query('SELECT o.code,o.ride_code,o.state,o.expires_at,p.public_username AS driver FROM howdi_ride_offers o JOIN howdi_connect_profiles p ON p.user_id=o.driver_id ORDER BY o.created_at DESC LIMIT 100')).rows, cases: (await db.query('SELECT code,ride_code,kind,reason,state,resolution FROM howdi_ride_cases ORDER BY created_at DESC LIMIT 100')).rows, zones: (await db.query('SELECT zone,vehicle_class,paused,reason,preview_checks FROM howdi_ride_zones')).rows, audit, checks: CHECKS, pilot_checks: PILOT_CHECKS, zone, rbac: { mode: 'staff_session_only', gap: 'Move capability roles are not configured server-side.' } };
          }
          if ((m = p.match(/^\/api\/admin\/v8\/rides\/applications\/(RA-[A-F0-9]+)(?:\/(decide|documents|restrict))?$/))) {
            const a = await one(db, 'SELECT * FROM howdi_ride_applications WHERE code=$1 FOR UPDATE', [m[1]]); requireThat(a, 404, 'NOT_FOUND', 'Application not found.');
            if (req.method === 'GET' && m[2] === 'documents') { await event(db, a.code, actor, 'evidence_viewed'); return { documents: (await db.query('SELECT kind,image FROM howdi_ride_documents WHERE application_code=$1', [a.code])).rows }; }
            if (req.method === 'POST' && m[2] === 'restrict') {
              requireThat(a.state === 'approved' && clean(b.reason), 409, 'RESTRICTION_INVALID', 'Only an approved driver can be restricted, with a reason.');
              await db.query("UPDATE howdi_ride_applications SET state='restricted',available=FALSE,reason=$2 WHERE code=$1", [a.code, clean(b.reason)]);
              await event(db, a.code, actor, 'restricted', { from: 'approved', to: 'restricted', reason: clean(b.reason) }); await notice(db, a.user_id, a.code, `Driver restricted from Move preview: ${clean(b.reason)}. Contact support for review.`); return { state: 'restricted' };
            }
            requireThat(req.method === 'POST' && m[2] === 'decide' && a.state === 'submitted', 409, 'OUT_OF_ORDER', 'Only submitted applications can be decided.');
            const staffIdentity = await one(db, 'SELECT user_id FROM howdi_ride_staff_identity WHERE username=$1', [staff.username]);
            requireThat(staffIdentity, 403, 'STAFF_IDENTITY_REQUIRED', 'A trusted operator must link this staff login to its HOWDI account before verification decisions.');
            requireThat(String(staffIdentity.user_id) !== String(a.user_id) && String(uid) !== String(a.user_id), 403, 'SELF_APPROVAL', 'Staff cannot decide their own application.');
            requireThat(clean(b.reason) && ['approved', 'rejected', 'info_requested'].includes(b.decision), 400, 'REASON_REQUIRED', 'Choose a decision and give its reason.');
            if (b.decision === 'approved') requireThat(CHECKS.every(k => b.checks?.[k] === true) && validAt({ ...a, state: 'approved' }, zone, a.vehicle_class) && await one(db, "SELECT 1 FROM howdi_ride_events WHERE ref=$1 AND actor=$2 AND action='evidence_viewed'", [a.code, actor]), 400, 'CHECKS_REQUIRED', 'Open private evidence, complete every class-specific check and verify valid documents.');
            await db.query('UPDATE howdi_ride_applications SET state=$2,reason=$3,checks=$4,available=FALSE WHERE code=$1', [a.code, b.decision, clean(b.reason), JSON.stringify(Object.fromEntries(CHECKS.map(k => [k, b.checks?.[k] === true])))]);
            await event(db, a.code, actor, b.decision, { from: a.state, to: b.decision, reason: clean(b.reason), checks: CHECKS.filter(k => b.checks?.[k] === true) }); await notice(db, a.user_id, a.code, `Driver application ${b.decision}: ${clean(b.reason)}`); return { state: b.decision };
          }
          if (p === '/api/admin/v8/rides/zone' && req.method === 'POST') {
            requireThat(CLASSES.includes(b.vehicle_class) && clean(b.reason) && typeof b.paused === 'boolean', 400, 'REASON_REQUIRED', 'Choose a class, pause state and reason.');
            const previous = await one(db,'SELECT preview_checks FROM howdi_ride_zones WHERE zone=$1 AND vehicle_class=$2',[zone,b.vehicle_class]);
            const checks = b.preview_checks || previous?.preview_checks || {};
            requireThat(b.paused || PILOT_CHECKS.every(k=>checks[k]===true),400,'PILOT_CHECKS_REQUIRED','Review all five preview operating gates before enabling this class. Production remains closed.');
            await db.query('INSERT INTO howdi_ride_zones(zone,vehicle_class,paused,reason,preview_checks) VALUES($1,$2,$3,$4,$5) ON CONFLICT(zone,vehicle_class) DO UPDATE SET paused=$3,reason=$4,preview_checks=$5', [zone, b.vehicle_class, b.paused, clean(b.reason), JSON.stringify(Object.fromEntries(PILOT_CHECKS.map(k=>[k,checks[k]===true])))]); await event(db, zone, actor, b.paused ? 'paused' : 'resumed', { vehicle_class: b.vehicle_class, reason: clean(b.reason), checks:PILOT_CHECKS.filter(k=>checks[k]===true) }); return { saved: true };
          }
          if ((m = p.match(/^\/api\/admin\/v8\/rides\/(HR-[A-F0-9]+)\/payout$/)) && req.method === 'POST') {
            const r = await one(db, 'SELECT * FROM howdi_rides WHERE code=$1 FOR UPDATE', [m[1]]);
            requireThat(r && r.state === 'completed' && clean(b.reason) && ['held', 'released'].includes(b.state), 400, 'PAYOUT_INVALID', 'Completed ride, payout state and reason required.');
            if (b.state === 'released') requireThat(r.payment_state === 'paid' && r.payout_state === 'held' && r.held_by !== staff.username, 409, 'DUAL_REVIEW_REQUIRED', 'A different staff reviewer must release a reconciled held payout.');
            await db.query('UPDATE howdi_rides SET payout_state=$2,held_by=CASE WHEN $2=\'held\' THEN $3 ELSE held_by END WHERE code=$1', [r.code, b.state, staff.username]); await event(db, r.code, actor, `payout_${b.state}`, { from: r.payout_state, to: b.state, reason: clean(b.reason) }); await both(db, r, `Preview payout ${b.state}: ${clean(b.reason)}. Appeal through ride support.`); return { saved: true };
          }
          if ((m = p.match(/^\/api\/admin\/v8\/rides\/cases\/(RC-[A-F0-9]+)$/)) && req.method === 'POST') {
            const c = await one(db, 'SELECT * FROM howdi_ride_cases WHERE code=$1 FOR UPDATE', [m[1]]); requireThat(c && clean(b.reason), 400, 'REASON_REQUIRED', 'Case and resolution reason required.');
            requireThat(c.state === 'open', 409, 'CASE_CLOSED', 'This case is already resolved.');
            const r = await one(db, 'SELECT * FROM howdi_rides WHERE code=$1 FOR UPDATE', [c.ride_code]);
            if (b.refund === true) {
              requireThat(r.payment_state === 'paid', 409, 'NOT_PAID', 'Only a recorded payment can be refunded.');
              await db.query('INSERT INTO howdi_ride_ledger(ride_code,kind,amount,payment,reference) VALUES($1,\'refund\',$2,$3,$4) ON CONFLICT DO NOTHING', [r.code, -r.quote.fare.total, r.quote.payment, code('RFTEST')]); await db.query("UPDATE howdi_rides SET payment_state='refunded',payout_state='held' WHERE code=$1", [r.code]);
            }
            await db.query("UPDATE howdi_ride_cases SET state='resolved',resolution=$2 WHERE code=$1", [c.code, clean(b.reason)]); await event(db, r.code, actor, 'case_resolved', { case: c.code, from: c.state, to: 'resolved', reason: clean(b.reason), refund: b.refund === true }); await both(db, r, `Case ${c.code} resolved: ${clean(b.reason)}. You may appeal in support.`); return { saved: true };
          }
        }
        throw error(404, 'NOT_FOUND', 'Rides route not found.');
      });
      // Existing shared privacy filter handles plain JSON; normalize PostgreSQL Date values first.
      if (result.error) fail(res, result.error.status, result.error.code, result.error.message); else ok(res, JSON.parse(JSON.stringify(result)));
    } catch (e) { if (e.status) fail(res, e.status, e.code, e.message); else throw e; }
    return true;
  }
  return { ensureSchema, handle, enabled };
}
module.exports = { createRidesV8, validAt, quote, FIELDS, CHECKS, PILOT_CHECKS };
