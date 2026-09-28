'use strict';
// =====================================================================================
// HOWDI V8 — HOWDI Move Staff Admin Operations (ADM-RIDE-001, 002, 003, 004, 005)
// Persistent PostgreSQL storage with audited decision lifecycles, zone/class controls,
// document expiry checking, safety cases, and Women Special non-fallback safeguards.
// =====================================================================================
const crypto = require('node:crypto');

function createRidesV8(deps) {
  const { pool, getBody } = deps;
  let schemaReadyPromise = null;
  const ensureReady = () => (schemaReadyPromise ||= ensureSchema());

  const setCors = (res) => {
    if (!res.headersSent) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-howdi-admin-token, x-howdi-worker-id');
    }
  };

  const ok = (res, data, code = 200) => {
    setCors(res);
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, ...data }));
    return true;
  };

  const fail = (res, code, error, details = null) => {
    setCors(res);
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error, details }));
    return true;
  };

  async function ensureSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS howdi_move_zones (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        is_paused BOOLEAN NOT NULL DEFAULT FALSE,
        pause_reason TEXT,
        paused_by VARCHAR(120),
        paused_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS howdi_move_classes (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        is_paused BOOLEAN NOT NULL DEFAULT FALSE,
        pause_reason TEXT,
        paused_by VARCHAR(120),
        paused_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS howdi_move_drivers (
        id VARCHAR(50) PRIMARY KEY,
        user_id BIGINT,
        public_handle VARCHAR(80) NOT NULL,
        full_name VARCHAR(120) NOT NULL,
        gender VARCHAR(20) NOT NULL DEFAULT 'UNSPECIFIED',
        women_special_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
        vehicle_class VARCHAR(50) NOT NULL DEFAULT 'AUTO',
        vehicle_plate VARCHAR(30) NOT NULL,
        zone_id VARCHAR(50) NOT NULL DEFAULT 'KHAMMAM_PILOT',
        application_status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED',
        online_status VARCHAR(30) NOT NULL DEFAULT 'OFFLINE',
        checks JSONB NOT NULL DEFAULT '{}'::jsonb,
        documents JSONB NOT NULL DEFAULT '[]'::jsonb,
        info_request_reason TEXT,
        rejection_reason TEXT,
        decided_by VARCHAR(120),
        decided_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS howdi_move_rides (
        public_ride_code VARCHAR(30) PRIMARY KEY,
        customer_handle VARCHAR(80) NOT NULL,
        pickup_name VARCHAR(180) NOT NULL,
        drop_name VARCHAR(180) NOT NULL,
        vehicle_class VARCHAR(50) NOT NULL DEFAULT 'AUTO',
        zone_id VARCHAR(50) NOT NULL DEFAULT 'KHAMMAM_PILOT',
        women_special BOOLEAN NOT NULL DEFAULT FALSE,
        status VARCHAR(40) NOT NULL DEFAULT 'MATCHING',
        driver_id VARCHAR(50) REFERENCES howdi_move_drivers(id),
        driver_handle VARCHAR(80),
        vehicle_plate VARCHAR(30),
        fare_estimate VARCHAR(50) NOT NULL DEFAULT '₹180–₹215',
        final_fare_inr NUMERIC(10,2) DEFAULT 194.00,
        pickup_pin VARCHAR(10) NOT NULL DEFAULT '4826',
        pin_verified BOOLEAN NOT NULL DEFAULT FALSE,
        offer_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS howdi_move_safety_cases (
        id VARCHAR(50) PRIMARY KEY,
        public_ride_code VARCHAR(30) NOT NULL,
        customer_handle VARCHAR(80) NOT NULL,
        driver_handle VARCHAR(80) NOT NULL,
        vehicle_plate VARCHAR(30),
        case_type VARCHAR(60) NOT NULL,
        severity VARCHAR(30) NOT NULL DEFAULT 'NORMAL',
        status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        payout_hold BOOLEAN NOT NULL DEFAULT FALSE,
        payout_hold_reason TEXT,
        payout_hold_by VARCHAR(120),
        resolution_notes TEXT,
        resolved_by VARCHAR(120),
        resolved_at TIMESTAMPTZ,
        restricted_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS howdi_move_audit_trail (
        id BIGSERIAL PRIMARY KEY,
        staff_handle VARCHAR(120) NOT NULL,
        action VARCHAR(80) NOT NULL,
        target_entity VARCHAR(80) NOT NULL,
        target_id VARCHAR(80) NOT NULL,
        reason TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed default pilot zones and sample data if table is empty
    const zoneCount = (await pool.query(`SELECT COUNT(*)::int AS cnt FROM howdi_move_zones`)).rows[0].cnt;
    if (zoneCount === 0) {
      await pool.query(`
        INSERT INTO howdi_move_zones (id, name, is_paused) VALUES
        ('KHAMMAM_PILOT', 'Khammam Pilot Zone', FALSE),
        ('HYD_CENTRAL', 'Hyderabad Central', FALSE),
        ('BLR_CORE', 'Bengaluru Core', FALSE);

        INSERT INTO howdi_move_classes (id, name, is_paused) VALUES
        ('BIKE', 'Bike (Move Moto)', FALSE),
        ('AUTO', 'Auto (Move Auto)', FALSE),
        ('CAB', 'Cab (Move 4-Wheeler)', FALSE),
        ('WOMEN_SPECIAL', 'Women Special (Verified Female Drivers Only)', FALSE);

        INSERT INTO howdi_move_drivers (id, public_handle, full_name, gender, women_special_opt_in, vehicle_class, vehicle_plate, zone_id, application_status, online_status, checks, documents) VALUES
        ('APP-RD-204', '@kiran', 'R Kiran', 'MALE', FALSE, 'AUTO', 'KA 03 AB 1234', 'KHAMMAM_PILOT', 'SUBMITTED', 'OFFLINE', 
         '{"identity": true, "license": true, "registration": true, "insurance": false, "background": false, "womenSpecial": false, "consent": true, "classApproval": false}',
         '[{"name": "Commercial Driving Licence", "status": "VALID", "expiry": "2029-04-12"}, {"name": "Vehicle Registration (KA 03 AB 1234)", "status": "VALID", "expiry": "2031-01-10"}, {"name": "Passenger Transit Permit", "status": "VALID", "expiry": "2027-08-15"}, {"name": "Vehicle Insurance", "status": "PENDING_VERIFY", "expiry": "2027-03-22"}]'),
        ('APP-RD-205', '@meera', 'Meera Rao', 'FEMALE', TRUE, 'AUTO', 'KA 04 CD 5678', 'KHAMMAM_PILOT', 'SUBMITTED', 'OFFLINE', 
         '{"identity": true, "license": true, "registration": true, "insurance": true, "background": true, "womenSpecial": true, "consent": true, "classApproval": false}',
         '[{"name": "Commercial Driving Licence (3W)", "status": "VALID", "expiry": "2028-11-04"}, {"name": "Vehicle Registration (KA 04 CD 5678)", "status": "VALID", "expiry": "2030-05-19"}, {"name": "Passenger Transit Permit", "status": "VALID", "expiry": "2027-09-10"}, {"name": "Women Special Opt-in Evidence", "status": "VERIFIED", "expiry": "2027-09-28"}]'),
        ('APP-RD-198', '@suresh_b', 'Suresh B', 'MALE', FALSE, 'BIKE', 'TS 09 XY 9988', 'KHAMMAM_PILOT', 'EXPIRING_SOON', 'OFFLINE', 
         '{"identity": true, "license": true, "registration": true, "insurance": false, "background": true, "womenSpecial": false, "consent": true, "classApproval": true}',
         '[{"name": "Driving Licence (2W)", "status": "VALID", "expiry": "2032-02-14"}, {"name": "Two-Wheeler Insurance", "status": "EXPIRING_48H", "expiry": "2026-09-30"}]');

        INSERT INTO howdi_move_rides (public_ride_code, customer_handle, pickup_name, drop_name, vehicle_class, zone_id, women_special, status, driver_id, driver_handle, vehicle_plate, fare_estimate, final_fare_inr, pickup_pin, pin_verified) VALUES
        ('HR-7K4P', '@bhaskar', 'Khammam Railway Station', 'District Hospital, Khammam', 'AUTO', 'KHAMMAM_PILOT', FALSE, 'MATCHING', 'APP-RD-204', '@kiran', 'KA 03 AB 1234', '₹180–₹215', 194.00, '4826', FALSE),
        ('HR-334W', '@priya', 'Collectorate Gate', 'City Bus Station', 'AUTO', 'KHAMMAM_PILOT', TRUE, 'MATCHING', 'APP-RD-205', '@meera', 'KA 04 CD 5678', '₹180–₹215', 194.00, '9912', FALSE);

        INSERT INTO howdi_move_safety_cases (id, public_ride_code, customer_handle, driver_handle, vehicle_plate, case_type, severity, status, payout_hold, payout_hold_reason, restricted_evidence) VALUES
        ('INC-RD-401', 'HR-7K4P', '@bhaskar', '@kiran', 'KA 03 AB 1234', 'PAYOUT_DISPUTE', 'HIGH', 'INVESTIGATING', TRUE, 'Customer reported unexpected detour; driver claims roadblock detour.', '{"telemetry_event": "Deviation 1.8km east at 10:14", "driver_phone_masked": "+91-98****1122", "customer_phone_masked": "+91-99****4433"}'),
        ('INC-RD-402', 'HR-334W', '@priya', '@meera', 'KA 04 CD 5678', 'LOST_ITEM', 'NORMAL', 'OPEN', FALSE, NULL, '{"item_description": "Umbrella left on back seat of auto", "meeting_station": "City Bus Station desk"}');
      `);
    }
  }

  async function logAudit(staffHandle, action, targetEntity, targetId, reason, metadata = {}) {
    try {
      await pool.query(
        `INSERT INTO howdi_move_audit_trail (staff_handle, action, target_entity, target_id, reason, metadata) VALUES ($1, $2, $3, $4, $5, $6)`,
        [staffHandle || '@admin', action, targetEntity, targetId, reason || '', JSON.stringify(metadata)]
      );
    } catch (e) {
      console.error("[Move Audit Error]", e);
    }
  }

  async function handle(req, res, url, adminSession = {}) {
    const pathname = url.pathname;
    const method = req.method;

    if (!pathname.startsWith('/api/admin/v8/move/')) return false;
    await ensureReady();

    const staffHandle = `@${String(adminSession.username || 'staff_admin').replace(/^@/, '')}`;

    // ---------------------------------------------------------------------------------
    // 1. DRIVER VERIFICATION QUEUE (ADM-RIDE-001 & ADM-RIDE-004)
    // ---------------------------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/admin/v8/move/drivers') {
      try {
        const cls = url.searchParams.get('class') || 'ALL';
        let query = `SELECT * FROM howdi_move_drivers`;
        let params = [];
        if (cls !== 'ALL') {
          query += ` WHERE vehicle_class = $1 OR (vehicle_class = 'AUTO' AND women_special_opt_in = TRUE AND $1 = 'WOMEN_SPECIAL')`;
          params.push(cls);
        }
        query += ` ORDER BY created_at DESC`;
        const rows = (await pool.query(query, params)).rows;
        return ok(res, { drivers: rows });
      } catch (err) {
        return fail(res, 500, err.message);
      }
    }

    if (method === 'POST' && pathname.match(/^\/api\/admin\/v8\/move\/drivers\/([^/]+)\/decide$/)) {
      try {
        const driverId = pathname.split('/')[6];
        const body = await getBody(req);
        const { action, reason, target_class, checks } = body;

        if (!action || !['APPROVE', 'REJECT', 'REQUEST_INFO', 'SUSPEND'].includes(action)) {
          return fail(res, 400, 'Invalid decision action');
        }
        if (!reason || reason.trim().length < 4) {
          return fail(res, 400, 'Reason is strictly required for every driver verification decision');
        }

        const driver = (await pool.query(`SELECT * FROM howdi_move_drivers WHERE id = $1`, [driverId])).rows[0];
        if (!driver) return fail(res, 404, 'Driver application not found');

        // Anti-self approval guard
        if (driver.public_handle === staffHandle) {
          return fail(res, 403, 'Anti-Self Approval Violation: Staff cannot adjudicate their own driver application.');
        }

        let newStatus = driver.application_status;
        let onlineStatus = driver.online_status;

        if (action === 'APPROVE') {
          const effectiveChecks = checks && typeof checks === 'object' ? checks : (driver.checks || {});
          const requiredChecks = ['identity','license','registration','insurance','background','consent'];
          const missingChecks = requiredChecks.filter((k) => effectiveChecks[k] !== true);
          if (missingChecks.length) {
            return fail(res, 422, `Cannot approve: required checks incomplete (${missingChecks.join(', ')}).`);
          }
          if ((target_class || driver.vehicle_class) === 'WOMEN_SPECIAL' && (driver.gender !== 'FEMALE' || driver.women_special_opt_in !== true || effectiveChecks.womenSpecial !== true)) {
            return fail(res, 422, 'Cannot approve for Women Special: verified female eligibility and opt-in are required.');
          }
          const docs = Array.isArray(driver.documents) ? driver.documents : [];
          for (const d of docs) {
            if (d.expiry && new Date(d.expiry).getTime() < Date.now()) {
              return fail(res, 422, `Cannot approve: document ${d.name} is expired (${d.expiry}). Expiry lock enforced.`);
            }
            if (d.status && ['EXPIRED','REJECTED','INVALID'].includes(String(d.status).toUpperCase())) {
              return fail(res, 422, `Cannot approve: document ${d.name} is ${d.status}.`);
            }
          }
          newStatus = 'APPROVED';
          onlineStatus = 'AVAILABLE';
        } else if (action === 'REJECT') {
          newStatus = 'REJECTED';
          onlineStatus = 'OFFLINE';
        } else if (action === 'REQUEST_INFO') {
          newStatus = 'INFO_REQUESTED';
          onlineStatus = 'OFFLINE';
        } else if (action === 'SUSPEND') {
          newStatus = 'SUSPENDED';
          onlineStatus = 'OFFLINE';
        }

        await pool.query(
          `UPDATE howdi_move_drivers SET 
            application_status = $1::varchar, 
            online_status = $2::varchar, 
            checks = COALESCE($3::jsonb, checks), 
            vehicle_class = COALESCE($4::varchar, vehicle_class),
            decided_by = $5::varchar,
            decided_at = NOW(),
            info_request_reason = CASE WHEN $1::varchar = 'INFO_REQUESTED'::varchar THEN $6::text ELSE info_request_reason END,
            rejection_reason = CASE WHEN $1::varchar = 'REJECTED'::varchar THEN $6::text ELSE rejection_reason END,
            updated_at = NOW()
           WHERE id = $7::varchar`,
          [newStatus, onlineStatus, checks ? JSON.stringify(checks) : null, target_class || null, staffHandle, reason, driverId]
        );

        await logAudit(staffHandle, `DRIVER_${action}`, 'howdi_move_drivers', driverId, reason, { target_class, newStatus });

        const updated = (await pool.query(`SELECT * FROM howdi_move_drivers WHERE id = $1`, [driverId])).rows[0];
        return ok(res, { driver: updated });
      } catch (err) {
        return fail(res, 500, err.message);
      }
    }

    // ---------------------------------------------------------------------------------
    // 2. DISPATCH & ZONE OPERATIONS (ADM-RIDE-002)
    // ---------------------------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/admin/v8/move/operations') {
      try {
        const zones = (await pool.query(`SELECT * FROM howdi_move_zones ORDER BY id`)).rows;
        const classes = (await pool.query(`SELECT * FROM howdi_move_classes ORDER BY id`)).rows;
        const rides = (await pool.query(`SELECT * FROM howdi_move_rides ORDER BY created_at DESC LIMIT 20`)).rows;
        const metrics = {
          activeRequests: rides.filter(r => r.status === 'MATCHING').length,
          activeOffers: rides.filter(r => r.driver_id && r.status === 'MATCHING').length,
          autoDisabledDrivers: (await pool.query(`SELECT COUNT(*)::int AS cnt FROM howdi_move_drivers WHERE application_status = 'EXPIRING_SOON' OR online_status = 'OFFLINE'`)).rows[0].cnt,
          avgMatchTimeSeconds: 38
        };
        return ok(res, { zones, classes, rides, metrics });
      } catch (err) {
        return fail(res, 500, err.message);
      }
    }

    if (method === 'POST' && pathname === '/api/admin/v8/move/pause-control') {
      try {
        const body = await getBody(req);
        const { target_type, target_id, pause, reason } = body;
        if (!reason || reason.trim().length < 5) {
          return fail(res, 400, 'Mandatory operational reason required for Pause/Resume control');
        }

        if (target_type === 'ZONE') {
          await pool.query(
            `UPDATE howdi_move_zones SET is_paused = $1, pause_reason = $2, paused_by = $3, paused_at = NOW() WHERE id = $4`,
            [!!pause, pause ? reason : null, staffHandle, target_id]
          );
        } else if (target_type === 'CLASS') {
          await pool.query(
            `UPDATE howdi_move_classes SET is_paused = $1, pause_reason = $2, paused_by = $3, paused_at = NOW() WHERE id = $4`,
            [!!pause, pause ? reason : null, staffHandle, target_id]
          );
        } else {
          return fail(res, 400, 'Invalid target_type. Must be ZONE or CLASS');
        }

        await logAudit(staffHandle, `PAUSE_${target_type}_${pause ? 'ON' : 'OFF'}`, target_type, target_id, reason);
        return ok(res, { message: `${target_type} ${target_id} pause status updated to ${pause ? 'PAUSED' : 'ACTIVE'}` });
      } catch (err) {
        return fail(res, 500, err.message);
      }
    }

    // Manual Dispatch Check / Override Guard (Checks Women Special Rule)
    if (method === 'POST' && pathname.match(/^\/api\/admin\/v8\/move\/rides\/([^/]+)\/dispatch$/)) {
      try {
        const rideCode = pathname.split('/')[6];
        const body = await getBody(req);
        const { driver_id, reason } = body;
        if (!reason || String(reason).trim().length < 4) return fail(res, 400, 'Reason is required for manual dispatch.');
        if (!driver_id) return fail(res, 400, 'driver_id is required.');

        const ride = (await pool.query(`SELECT * FROM howdi_move_rides WHERE public_ride_code = $1`, [rideCode])).rows[0];
        if (!ride) return fail(res, 404, 'Ride not found');
        if (ride.status !== 'MATCHING') return fail(res, 409, `Ride ${rideCode} is no longer dispatchable (${ride.status}).`);

        const driver = (await pool.query(`SELECT * FROM howdi_move_drivers WHERE id = $1`, [driver_id])).rows[0];
        if (!driver) return fail(res, 404, 'Driver not found');
        if (driver.application_status !== 'APPROVED') return fail(res, 422, 'Dispatch failed: driver is not approved.');
        if (driver.online_status !== 'AVAILABLE') return fail(res, 422, 'Dispatch failed: driver is not available.');
        if (driver.zone_id !== ride.zone_id) return fail(res, 422, `Dispatch failed: driver is assigned to ${driver.zone_id}, not ${ride.zone_id}.`);
        if (!ride.women_special && driver.vehicle_class !== ride.vehicle_class) return fail(res, 422, `Dispatch failed: driver class ${driver.vehicle_class} does not match ride class ${ride.vehicle_class}.`);
        const dispatchDocs = Array.isArray(driver.documents) ? driver.documents : [];
        for (const d of dispatchDocs) {
          if (d.expiry && new Date(d.expiry).getTime() < Date.now()) return fail(res, 422, `Dispatch failed: ${d.name} expired on ${d.expiry}.`);
          if (d.status && ['EXPIRED','REJECTED','INVALID'].includes(String(d.status).toUpperCase())) return fail(res, 422, `Dispatch failed: ${d.name} is ${d.status}.`);
        }

        // Women Special Hard Rule: NEVER fallback or override to male driver
        if (ride.women_special) {
          if (driver.gender !== 'FEMALE' || !driver.women_special_opt_in) {
            await logAudit(staffHandle, 'WOMEN_SPECIAL_OVERRIDE_REJECTED', 'howdi_move_rides', rideCode, 'Blocked attempt to allocate non-eligible driver to Women Special ride');
            return fail(res, 422, 'Strict Safeguard: Women Special rides can NEVER be allocated to a general or non-eligible driver. Manual override rejected.');
          }
        }

        // Zone / Class pause check
        const zone = (await pool.query(`SELECT is_paused FROM howdi_move_zones WHERE id = $1`, [ride.zone_id])).rows[0];
        if (zone && zone.is_paused) return fail(res, 422, `Dispatch failed: Zone ${ride.zone_id} is currently paused`);
        const classId = ride.women_special ? 'WOMEN_SPECIAL' : ride.vehicle_class;
        const rideClass = (await pool.query(`SELECT is_paused FROM howdi_move_classes WHERE id = $1`, [classId])).rows[0];
        if (rideClass && rideClass.is_paused) return fail(res, 422, `Dispatch failed: Class ${classId} is currently paused`);

        const dispatched = await pool.query(
          `UPDATE howdi_move_rides SET driver_id = $1, driver_handle = $2, vehicle_plate = $3, status = 'ACCEPTED', updated_at = NOW() WHERE public_ride_code = $4 AND status = 'MATCHING'`,
          [driver.id, driver.public_handle, driver.vehicle_plate, rideCode]
        );
        if (!dispatched.rowCount) return fail(res, 409, 'Dispatch conflict: ride state changed. Refresh and retry.');

        await logAudit(staffHandle, 'MANUAL_DISPATCH_APPROVED', 'howdi_move_rides', rideCode, reason || 'Admin manual dispatch');
        return ok(res, { message: `Ride ${rideCode} dispatched to driver ${driver.public_handle}` });
      } catch (err) {
        return fail(res, 500, err.message);
      }
    }

    // ---------------------------------------------------------------------------------
    // 3. SAFETY CASES & RESTRICTED EVIDENCE (ADM-RIDE-003 & ADM-RIDE-005)
    // ---------------------------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/admin/v8/move/cases') {
      try {
        const rows = (await pool.query(`SELECT id, public_ride_code, customer_handle, driver_handle, vehicle_plate, case_type, severity, status, payout_hold, payout_hold_reason, created_at FROM howdi_move_safety_cases ORDER BY created_at DESC`)).rows;
        return ok(res, { cases: rows });
      } catch (err) {
        return fail(res, 500, err.message);
      }
    }

    if (method === 'GET' && pathname.match(/^\/api\/admin\/v8\/move\/cases\/([^/]+)\/evidence$/)) {
      try {
        const caseId = pathname.split('/')[6];
        const row = (await pool.query(`SELECT id, restricted_evidence FROM howdi_move_safety_cases WHERE id = $1`, [caseId])).rows[0];
        if (!row) return fail(res, 404, 'Case not found');

        // Log restricted evidence inspection
        await logAudit(staffHandle, 'RESTRICTED_EVIDENCE_INSPECTED', 'howdi_move_safety_cases', caseId, 'Staff accessed unmasked telemetry/chat evidence');
        return ok(res, { evidence: row.restricted_evidence });
      } catch (err) {
        return fail(res, 500, err.message);
      }
    }

    if (method === 'POST' && pathname.match(/^\/api\/admin\/v8\/move\/cases\/([^/]+)\/hold$/)) {
      try {
        const caseId = pathname.split('/')[6];
        const body = await getBody(req);
        const { hold, reason } = body;
        if (!reason || reason.trim().length < 5) {
          return fail(res, 400, 'Reason required for payout hold/release action');
        }

        await pool.query(
          `UPDATE howdi_move_safety_cases SET payout_hold = $1, payout_hold_reason = $2, payout_hold_by = $3 WHERE id = $4`,
          [!!hold, reason, staffHandle, caseId]
        );

        await logAudit(staffHandle, hold ? 'PAYOUT_HOLD_LOCKED' : 'PAYOUT_HOLD_RELEASED', 'howdi_move_safety_cases', caseId, reason);
        return ok(res, { message: `Payout hold ${hold ? 'applied' : 'released'} for case ${caseId}` });
      } catch (err) {
        return fail(res, 500, err.message);
      }
    }

    if (method === 'POST' && pathname.match(/^\/api\/admin\/v8\/move\/cases\/([^/]+)\/resolve$/)) {
      try {
        const caseId = pathname.split('/')[6];
        const body = await getBody(req);
        const { resolution_notes } = body;
        if (!resolution_notes || resolution_notes.trim().length < 5) {
          return fail(res, 400, 'Resolution notes are required to resolve a safety case');
        }

        await pool.query(
          `UPDATE howdi_move_safety_cases SET status = 'RESOLVED', payout_hold = FALSE, resolution_notes = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3`,
          [resolution_notes, staffHandle, caseId]
        );

        await logAudit(staffHandle, 'SAFETY_CASE_RESOLVED', 'howdi_move_safety_cases', caseId, resolution_notes);
        return ok(res, { message: `Safety case ${caseId} resolved and logged.` });
      } catch (err) {
        return fail(res, 500, err.message);
      }
    }

    // ---------------------------------------------------------------------------------
    // 4. AUDIT TRAIL LOGS
    // ---------------------------------------------------------------------------------
    if (method === 'GET' && pathname === '/api/admin/v8/move/audits') {
      try {
        const rows = (await pool.query(`SELECT * FROM howdi_move_audit_trail ORDER BY created_at DESC LIMIT 50`)).rows;
        return ok(res, { audits: rows });
      } catch (err) {
        return fail(res, 500, err.message);
      }
    }

    return false;
  }

  return { ensureSchema, handle };
}

module.exports = { createRidesV8 };