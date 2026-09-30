'use strict';
// =====================================================================================
// HOWDI V8 — Become a Worker + HOWDI Admin verification (board V8__09 panel 6 "Become a Worker", V8__13 "Worker onboarding";
// register WKR-001, WKR-002, WKR-003, ROL-003). Both sides of the journey:
//   applicant: eligibility → identity (ID type + last 4 digits, ID photo, live selfie) → services & pricing → hours →
//              review & submit; sees Submitted / More info needed (with HOWDI's reason) / Approved / Rejected (reason), can
//              fix and resubmit; notified at every decision.
//   HOWDI Admin: queue by status → application detail (documents streamed privately, never a public URL) → checks →
//              approve / reject / request info, each with a reason; every decision is audited (howdi_admin_security_audit)
//              and kept in the application history. Approval links the account: works_workers row (verified), services,
//              hours, WORKER role ACTIVE in user_roles — the worker desk opens in Works.
//
//   GET|PUT /api/v8/works/application · POST /api/v8/works/application/document {kind: id|selfie, imageData} · POST …/submit
//   GET  /api/admin/v8/works/applications?status= · GET /api/admin/v8/works/applications/{WAP}
//   GET  /api/admin/v8/works/applications/{WAP}/document/{id|selfie} · POST /api/admin/v8/works/applications/{WAP}/decide
// The global admin guard (server.js v8AdminGuard) authenticates every /api/admin/* request before this module runs.
// =====================================================================================
const crypto = require('node:crypto');
const ID_TYPES = { aadhaar: 'Aadhaar', pan: 'PAN card', voter: 'Voter ID', dl: 'Driving licence' };
const LANGS = ['Telugu', 'Hindi', 'English', 'Urdu', 'Tamil', 'Kannada', 'Marathi'];
const STATUS = ['draft', 'submitted', 'info_requested', 'approved', 'rejected'];
const REJECT_TEMPLATES = ['ID photo is unclear or cut off', 'Selfie doesn’t match the ID photo', 'ID number doesn’t match the document', 'Skill or experience couldn’t be verified', 'Under 18 or outside our service area'];

function createWorksV8Onboarding(deps) {
  const { pool, getBody, notify, auditAdmin } = deps;
  const H = deps.helpers; const M = deps.messages;
  const { viewer, limited, ok, fail, savePrivate, readPrivate, deletePrivate, authorCols, authorJoins, authorDto } = H;
  const { issue, resolve, line, text, iso, money } = M;

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_worker_app_meta(application_id BIGINT PRIMARY KEY, services JSONB NOT NULL DEFAULT '[]'::jsonb, hours JSONB NOT NULL DEFAULT '[]'::jsonb,
      bio VARCHAR(600), dob_confirmed BOOLEAN NOT NULL DEFAULT FALSE, checks JSONB NOT NULL DEFAULT '{}'::jsonb, submitted_at TIMESTAMPTZ, decided_at TIMESTAMPTZ, decided_by VARCHAR(80))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_worker_app_events(id BIGSERIAL PRIMARY KEY, application_id BIGINT NOT NULL, actor VARCHAR(10) NOT NULL, admin_username VARCHAR(80), action VARCHAR(20) NOT NULL, reason VARCHAR(600), at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  }
  const codeOf = async (id) => (await issue('WAPP', [id])).get(String(id));
  const ev = (id, actor, action, reason, admin) => pool.query(`INSERT INTO howdi_v8_worker_app_events(application_id,actor,admin_username,action,reason) VALUES($1,$2,$3,$4,$5)`, [id, actor, admin || null, action, reason ? line(reason, 600) : null]);
  async function services() { return (await pool.query(`SELECT service_code, name FROM works_services WHERE active=TRUE AND customer_visible=TRUE ORDER BY name`)).rows.map((s) => ({ code: s.service_code, name: line(s.name, 60) })); }
  async function latest(uid) { return (await pool.query(`SELECT a.*, m.services, m.hours, m.bio, m.dob_confirmed, m.checks, m.submitted_at, m.decided_at FROM works_worker_applications a LEFT JOIN howdi_v8_worker_app_meta m ON m.application_id=a.id WHERE a.user_id=$1 ORDER BY a.id DESC LIMIT 1`, [uid])).rows[0] || null; }
  const st = (a) => (STATUS.includes(String(a.status || '').toLowerCase()) ? String(a.status).toLowerCase() : 'submitted');
  async function events(id, admin) { return (await pool.query(`SELECT actor, admin_username, action, reason, at FROM howdi_v8_worker_app_events WHERE application_id=$1 ORDER BY id`, [id])).rows.map((e) => ({ actor: e.actor === 'admin' ? (admin ? `admin · ${e.admin_username || ''}` : 'HOWDI') : 'you', action: e.action, reason: e.reason, at: iso(e.at) })); }
  function missing(a) {
    const out = [];
    if (!a.full_name) out.push('name'); if (!a.dob_confirmed) out.push('age'); if (!a.city) out.push('city');
    if (!a.kyc_document_type || !/^\d{4}$/.test(String(a.kyc_id_last4 || ''))) out.push('id_details'); if (!a.kyc_document_file) out.push('id_photo'); if (!a.live_selfie_file) out.push('selfie');
    if (!Array.isArray(a.services) || !a.services.length) out.push('services'); if (!(Number(a.expected_starting_price) > 0)) out.push('price');
    if (!Array.isArray(a.hours) || !a.hours.length) out.push('hours'); if (!a.consent || !a.declaration) out.push('declaration');
    return out;
  }
  async function appDto(a, forAdmin) {
    const s = st(a);
    const dto = {
      public_key: await codeOf(a.id), status: s, editable: ['draft', 'info_requested', 'rejected'].includes(s),
      note: ['info_requested', 'rejected'].includes(s) ? a.review_note || null : null,
      name: a.full_name || null, age_confirmed: a.dob_confirmed === true, city: a.city || null, pin_code: a.pincode || null, radius_km: a.service_radius_km != null ? Number(a.service_radius_km) : null,
      languages: Array.isArray(a.languages) ? a.languages : [], experience_years: a.experience_years != null ? Number(a.experience_years) : null,
      id_type: a.kyc_document_type || null, id_last4: a.kyc_id_last4 || null, has_id_photo: Boolean(a.kyc_document_file), has_selfie: Boolean(a.live_selfie_file),
      services: Array.isArray(a.services) ? a.services : [], price: a.expected_starting_price != null ? money(a.expected_starting_price) : null, bio: a.bio || null,
      hours: Array.isArray(a.hours) ? a.hours : [], consent: a.consent === true && a.declaration === true,
      missing: missing(a), submitted_at: iso(a.submitted_at), decided_at: iso(a.decided_at), updated_at: iso(a.updated_at),
      history: await events(a.id, forAdmin),
    };
    if (forAdmin) {
      const u = (await pool.query(`SELECT u.phone, u.created_at, ${authorCols('a_u.id', 'a_')} FROM users u ${authorJoins('u.id', 'a_')} WHERE u.id=$1`, [a.user_id])).rows[0];
      dto.applicant = u ? { ...authorDto(u, 'a_'), member_since: iso(u.created_at), contact: u.phone ? `•••••• ${String(u.phone).slice(-4)}` : null } : null;
      dto.checks = a.checks || {}; dto.reject_templates = REJECT_TEMPLATES;
      const svcNames = Object.fromEntries((await services()).map((x) => [x.code, x.name]));
      dto.service_names = dto.services.map((c) => svcNames[c] || c);
    }
    return dto;
  }

  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (p.startsWith('/api/admin/v8/works/')) return admin(req, res, url, p);
    if (!p.startsWith('/api/v8/works/application')) return false;
    const v = await viewer(req);
    if (!v) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to apply.'); return true; }
    const vid = v.id;
    const handleRow = (await pool.query(`SELECT public_username FROM howdi_connect_profiles WHERE user_id=$1`, [vid])).rows[0];
    let a = await latest(vid);

    if (p === '/api/v8/works/application' && req.method === 'GET') {
      const worker = (await pool.query(`SELECT 1 FROM works_workers WHERE user_id=$1 AND LOWER(TRIM(kyc_status))='verified' AND LOWER(TRIM(account_status))='active'`, [vid])).rowCount > 0;
      const u = (await pool.query(`SELECT full_name FROM users WHERE id=$1`, [vid])).rows[0];
      ok(res, { application: a ? await appDto(a, false) : null, already_worker: worker, handle: handleRow?.public_username || null, prefill: { name: u?.full_name || null },
        options: { services: await services(), id_types: Object.entries(ID_TYPES).map(([key, label]) => ({ key, label })), languages: LANGS } }); return true;
    }
    if (!handleRow?.public_username) { fail(res, 409, 'NEED_HANDLE', 'Choose your @username first — customers see it instead of your phone number.'); return true; }
    const editable = !a || ['draft', 'info_requested', 'rejected'].includes(st(a));
    const ensureDraft = async () => {
      if (a && ['draft', 'info_requested'].includes(st(a))) return a;
      // a rejected application starts a fresh draft carrying the same answers (history stays with the old one)
      const prev = a;
      const row = (await pool.query(`INSERT INTO works_worker_applications(application_code,full_name,phone,city,pincode,claimed_skill,experience_years,service_radius_km,expected_starting_price,consent,declaration,status,user_id,kyc_document_type,kyc_id_last4,languages)
        SELECT $1, COALESCE($3, u.full_name, ''), COALESCE(u.phone, ''), COALESCE($4, ''), $5, COALESCE($6, ''), $7, $8, $9, FALSE, FALSE, 'draft', u.id, $10, $11, $12::jsonb FROM users u WHERE u.id=$2 RETURNING id`,
        ['WAPV8-' + crypto.randomBytes(5).toString('hex').toUpperCase(), vid, prev?.full_name || null, prev?.city || null, prev?.pincode || null, prev?.claimed_skill || null, prev?.experience_years ?? null, prev?.service_radius_km ?? null, prev?.expected_starting_price ?? null, prev?.kyc_document_type || null, prev?.kyc_id_last4 || null, JSON.stringify(prev?.languages || [])])).rows[0];
      await pool.query(`INSERT INTO howdi_v8_worker_app_meta(application_id,services,hours,bio,dob_confirmed) VALUES($1,$2::jsonb,$3::jsonb,$4,$5)`, [row.id, JSON.stringify(prev?.services || []), JSON.stringify(prev?.hours || []), prev?.bio || null, prev?.dob_confirmed === true]);
      if (prev) await ev(row.id, 'applicant', 'reapplied', `After: ${prev.review_note || 'rejection'}`);
      a = await latest(vid); return a;
    };

    if (p === '/api/v8/works/application' && req.method === 'PUT') {
      if (!editable) { fail(res, 409, 'LOCKED', st(a) === 'approved' ? 'You’re already an approved worker.' : 'Your application is with HOWDI for review. You can edit it if HOWDI asks for more information.'); return true; }
      if (limited(res, `v8-wapp:${vid}`, 60, 10 * 60000)) return true;
      const b = (await getBody(req)) || {};
      const svcCodes = new Set((await services()).map((x) => x.code));
      const sv = Array.isArray(b.services) ? [...new Set(b.services.filter((c) => svcCodes.has(c)))].slice(0, 5) : undefined;
      const hours = Array.isArray(b.hours) ? b.hours.filter((h) => Number.isInteger(h.weekday) && h.weekday >= 0 && h.weekday <= 6 && Number.isInteger(h.start_min) && Number.isInteger(h.end_min) && h.end_min - h.start_min >= 60 && h.start_min >= 0 && h.end_min <= 1440).slice(0, 7) : undefined;
      const price = b.price !== undefined ? Math.round(Number(b.price)) : undefined;
      if (price !== undefined && !(price >= 50 && price <= 20000)) { fail(res, 400, 'VALIDATION', 'Starting price should be ₹50 to ₹20,000.'); return true; }
      const last4 = b.id_last4 !== undefined ? String(b.id_last4 || '').replace(/\D/g, '') : undefined;
      if (last4 !== undefined && last4 && !/^\d{4}$/.test(last4)) { fail(res, 400, 'VALIDATION', 'Enter only the last 4 digits of your ID.'); return true; }
      if (b.id_number) { fail(res, 400, 'FULL_ID_REFUSED', 'Don’t send your full ID number — only the last 4 digits.'); return true; }
      await ensureDraft();
      await pool.query(`UPDATE works_worker_applications SET full_name=COALESCE($2,full_name), city=COALESCE($3,city), pincode=COALESCE($4,pincode), service_radius_km=COALESCE($5,service_radius_km),
          experience_years=COALESCE($6,experience_years), expected_starting_price=COALESCE($7,expected_starting_price), kyc_document_type=COALESCE($8,kyc_document_type), kyc_id_last4=COALESCE($9,kyc_id_last4),
          languages=COALESCE($10::jsonb,languages), claimed_skill=COALESCE($11,claimed_skill), consent=COALESCE($12,consent), declaration=COALESCE($12,declaration), updated_at=NOW() WHERE id=$1`,
        [a.id, b.name !== undefined ? line(b.name, 80) || null : null, b.city !== undefined ? line(b.city, 60) || null : null, /^\d{6}$/.test(String(b.pincode || '')) ? String(b.pincode) : null,
          b.radius_km !== undefined ? Math.min(50, Math.max(1, Math.round(Number(b.radius_km) || 5))) : null, b.experience_years !== undefined ? Math.min(60, Math.max(0, Math.round(Number(b.experience_years) || 0))) : null,
          price === undefined ? null : price, ID_TYPES[b.id_type] ? b.id_type : null, last4 || null, Array.isArray(b.languages) ? JSON.stringify(b.languages.filter((l) => LANGS.includes(l)).slice(0, 6)) : null,
          sv && sv.length ? sv[0] : null, typeof b.declaration === 'boolean' ? b.declaration : null]);
      await pool.query(`UPDATE howdi_v8_worker_app_meta SET services=COALESCE($2::jsonb,services), hours=COALESCE($3::jsonb,hours), bio=COALESCE($4,bio), dob_confirmed=COALESCE($5,dob_confirmed) WHERE application_id=$1`,
        [a.id, sv ? JSON.stringify(sv) : null, hours ? JSON.stringify(hours) : null, b.bio !== undefined ? text(b.bio, 600) : null, typeof b.age_confirmed === 'boolean' ? b.age_confirmed : null]);
      ok(res, { application: await appDto(await latest(vid), false) }); return true;
    }
    if (p === '/api/v8/works/application/document' && req.method === 'POST') {
      if (!editable) { fail(res, 409, 'LOCKED', 'Your application is with HOWDI for review.'); return true; }
      if (limited(res, `v8-wapp-doc:${vid}`, 20, 10 * 60000)) return true;
      const b = (await getBody(req)) || {}; const kind = b.kind === 'selfie' ? 'selfie' : b.kind === 'id' ? 'id' : null;
      if (!kind) { fail(res, 400, 'VALIDATION', 'Choose the ID photo or the selfie.'); return true; }
      let f; try { f = savePrivate(b.imageData, { videos: false, maxImage: 5 * 1024 * 1024 }); } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message); return true; }
      await ensureDraft();
      const col = kind === 'id' ? 'kyc_document_file' : 'live_selfie_file';
      const old = a[col];
      await pool.query(`UPDATE works_worker_applications SET ${col}=$2, updated_at=NOW() WHERE id=$1`, [a.id, f.file]);
      if (old && old !== f.file) deletePrivate(old);
      ok(res, { application: await appDto(await latest(vid), false), message: kind === 'id' ? 'ID photo saved privately. Only HOWDI’s verification team can see it.' : 'Selfie saved privately.' }); return true;
    }
    if (p === '/api/v8/works/application/submit' && req.method === 'POST') {
      if (!a || !['draft', 'info_requested'].includes(st(a))) { fail(res, 409, 'INVALID_STATE', st(a || {}) === 'rejected' ? 'Update your application before resubmitting.' : 'Nothing to submit.'); return true; }
      const miss = missing(a); if (miss.length) { fail(res, 400, 'INCOMPLETE', `Please complete: ${miss.join(', ').replace(/_/g, ' ')}.`); return true; }
      const was = st(a);
      await pool.query(`UPDATE works_worker_applications SET status='submitted', updated_at=NOW() WHERE id=$1`, [a.id]);
      await pool.query(`UPDATE howdi_v8_worker_app_meta SET submitted_at=NOW() WHERE application_id=$1`, [a.id]);
      await pool.query(`INSERT INTO user_roles(user_id,role_id,is_primary,role_status,requested_at,onboarding_state,rejection_reason) SELECT $1,id,FALSE,'PENDING',NOW(),'SUBMITTED',NULL FROM roles WHERE code='WORKER'
        ON CONFLICT(user_id,role_id) DO UPDATE SET role_status=CASE WHEN user_roles.role_status='ACTIVE' THEN 'ACTIVE' ELSE 'PENDING' END, onboarding_state=CASE WHEN user_roles.role_status='ACTIVE' THEN 'COMPLETE' ELSE 'SUBMITTED' END, rejection_reason=NULL, requested_at=NOW(), updated_at=NOW()`, [vid]);
      await ev(a.id, 'applicant', was === 'info_requested' ? 'resubmitted' : 'submitted');
      await notify(vid, 'WORKER_APP_SUBMITTED', 'Worker application received', 'HOWDI usually reviews applications within 2 working days. We’ll notify you here.', '/works/become', null);
      ok(res, { application: await appDto(await latest(vid), false) }); return true;
    }
    fail(res, 404, 'NOT_FOUND', 'Not found.'); return true;
  }

  // ------------------------------------------------------------ HOWDI Admin (already authenticated by the global admin guard)
  async function admin(req, res, url, p) {
    const session = req.howdiAdminSession || null; const who = session?.username || 'admin-token';
    let m;
    if (p === '/api/admin/v8/works/applications' && req.method === 'GET') {
      const status = ['submitted', 'info_requested', 'approved', 'rejected'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : 'submitted';
      const rows = (await pool.query(`SELECT a.*, m.services, m.hours, m.bio, m.dob_confirmed, m.checks, m.submitted_at, m.decided_at FROM works_worker_applications a JOIN howdi_v8_worker_app_meta m ON m.application_id=a.id WHERE LOWER(a.status)=$1 ORDER BY COALESCE(m.submitted_at,a.updated_at) ${status === 'submitted' ? 'ASC' : 'DESC'} LIMIT 100`, [status])).rows;
      const counts = Object.fromEntries((await pool.query(`SELECT LOWER(a.status) s, COUNT(*) n FROM works_worker_applications a JOIN howdi_v8_worker_app_meta m ON m.application_id=a.id GROUP BY 1`)).rows.map((r) => [r.s, Number(r.n)]));
      const items = []; for (const a of rows) { const d = await appDto(a, true); items.push({ public_key: d.public_key, status: d.status, name: d.name, applicant: d.applicant, city: d.city, services: d.service_names, submitted_at: d.submitted_at, waiting_hours: d.submitted_at ? Math.round((Date.now() - Date.parse(d.submitted_at)) / 3600e3) : null }); }
      await auditAdmin(req, session, 'V8_WORKER_APPS_LIST', { status });
      ok(res, { status, counts, items }); return true;
    }
    if ((m = p.match(/^\/api\/admin\/v8\/works\/applications\/(WAP-[0-9A-F]{12})(?:\/(document\/(id|selfie)|decide))?$/))) {
      const id = await resolve(m[1], 'WAPP');
      const a = id ? (await pool.query(`SELECT a.*, m.services, m.hours, m.bio, m.dob_confirmed, m.checks, m.submitted_at, m.decided_at FROM works_worker_applications a JOIN howdi_v8_worker_app_meta m ON m.application_id=a.id WHERE a.id=$1`, [id])).rows[0] : null;
      if (!a) { fail(res, 404, 'NOT_FOUND', 'Application not found.'); return true; }
      if (!m[2] && req.method === 'GET') { await auditAdmin(req, session, 'V8_WORKER_APP_VIEW', { application: m[1] }); ok(res, { application: await appDto(a, true) }); return true; }
      if (m[3] && req.method === 'GET') {
        const f = readPrivate(m[3] === 'id' ? a.kyc_document_file : a.live_selfie_file);
        if (!f) { fail(res, 404, 'NOT_FOUND', 'Document not found.'); return true; }
        await auditAdmin(req, session, 'V8_WORKER_APP_DOCUMENT_VIEW', { application: m[1], document: m[3] });
        res.writeHead(200, { 'Content-Type': f.mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline', 'Cross-Origin-Resource-Policy': 'same-origin' });
        res.end(f.buf); return true;
      }
      if (m[2] === 'decide' && req.method === 'POST') {
        const b = (await getBody(req)) || {}; const decision = ['approve', 'reject', 'request_info'].includes(b.decision) ? b.decision : null;
        const reason = line(b.reason, 600);
        if (!decision) { fail(res, 400, 'VALIDATION', 'Choose approve, reject or request info.'); return true; }
        if (decision !== 'approve' && reason.length < 5) { fail(res, 400, 'REASON_REQUIRED', 'Give the applicant a clear reason.'); return true; }
        if (!['submitted'].includes(st(a))) { fail(res, 409, 'INVALID_STATE', `This application is ${st(a).replace('_', ' ')}.`); return true; }
        const checks = { identity: b.checks?.identity === true, selfie: b.checks?.selfie === true, skill: b.checks?.skill === true };
        if (decision === 'approve' && !(checks.identity && checks.selfie && checks.skill)) { fail(res, 400, 'CHECKS_REQUIRED', 'Tick identity, selfie match and skill checks before approving.'); return true; }
        const uid = Number(a.user_id); let workerCode = null;
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const lock = (await client.query(`SELECT status FROM works_worker_applications WHERE id=$1 FOR UPDATE`, [a.id])).rows[0];
          if (String(lock.status).toLowerCase() !== 'submitted') { await client.query('ROLLBACK'); fail(res, 409, 'CHANGED', 'Another admin just decided this application.'); return true; }
          const newStatus = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'info_requested';
          await client.query(`UPDATE works_worker_applications SET status=$2, review_note=$3, updated_at=NOW() WHERE id=$1`, [a.id, newStatus, decision === 'approve' ? (reason || null) : reason]);
          await client.query(`UPDATE howdi_v8_worker_app_meta SET checks=$2::jsonb, decided_at=NOW(), decided_by=$3 WHERE application_id=$1`, [a.id, JSON.stringify(checks), who]);
          if (decision === 'approve') {
            // link the account: one verified works_workers row, services, hours, WORKER role
            let w = (await client.query(`SELECT id, worker_code FROM works_workers WHERE user_id=$1 ORDER BY id DESC LIMIT 1`, [uid])).rows[0];
            const u = (await client.query(`SELECT phone FROM users WHERE id=$1`, [uid])).rows[0];
            if (!w) w = (await client.query(`INSERT INTO works_workers(worker_code,full_name,phone,user_id,city,pincode,experience_years,service_radius_km,starting_price,kyc_status,skill_status,account_status,active,availability_status,availability)
              VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'verified','verified','active',TRUE,'offline','offline') RETURNING id, worker_code`,
              ['WRK-' + crypto.randomBytes(4).toString('hex').toUpperCase(), a.full_name, u?.phone || 'not-shared', uid, a.city, a.pincode, a.experience_years, a.service_radius_km, a.expected_starting_price])).rows[0];
            else await client.query(`UPDATE works_workers SET full_name=$2, city=$3, pincode=$4, experience_years=$5, service_radius_km=$6, starting_price=$7, kyc_status='verified', skill_status='verified', account_status='active', active=TRUE, updated_at=NOW() WHERE id=$1`, [w.id, a.full_name, a.city, a.pincode, a.experience_years, a.service_radius_km, a.expected_starting_price]);
            workerCode = w.worker_code;
            await client.query(`UPDATE works_worker_applications SET converted_worker_id=$2 WHERE id=$1`, [a.id, w.id]);
            for (const [i, code] of (a.services || []).entries()) {
              const s = (await client.query(`SELECT id FROM works_services WHERE service_code=$1`, [code])).rows[0]; if (!s) continue;
              await client.query(`INSERT INTO works_worker_services(worker_id,service_id,status,is_primary) VALUES($1,$2,'approved',$3) ON CONFLICT DO NOTHING`, [w.id, s.id, i === 0]);
              await client.query(`UPDATE works_worker_services SET status='approved', is_primary=$3 WHERE worker_id=$1 AND service_id=$2`, [w.id, s.id, i === 0]);
            }
            await client.query(`DELETE FROM howdi_v8_works_hours WHERE worker_id=$1`, [w.id]);
            for (let d = 0; d < 7; d++) { const h = (a.hours || []).find((x) => x.weekday === d); await client.query(`INSERT INTO howdi_v8_works_hours(worker_id,weekday,start_min,end_min) VALUES($1,$2,$3,$4)`, [w.id, d, h ? h.start_min : 0, h ? h.end_min : 0]); }
            await client.query(`INSERT INTO user_roles(user_id,role_id,is_primary,role_status,requested_at,decided_at,onboarding_state,rejection_reason) SELECT $1,id,FALSE,'ACTIVE',NOW(),NOW(),'COMPLETE',NULL FROM roles WHERE code='WORKER'
              ON CONFLICT(user_id,role_id) DO UPDATE SET role_status='ACTIVE', decided_at=NOW(), onboarding_state='COMPLETE', rejection_reason=NULL, updated_at=NOW()`, [uid]);
          } else {
            await client.query(`INSERT INTO user_roles(user_id,role_id,is_primary,role_status,requested_at,decided_at,onboarding_state,rejection_reason) SELECT $1,id,FALSE,$2,NOW(),NOW(),$3,$4 FROM roles WHERE code='WORKER'
              ON CONFLICT(user_id,role_id) DO UPDATE SET role_status=CASE WHEN user_roles.role_status='ACTIVE' THEN 'ACTIVE' ELSE $2 END, decided_at=NOW(), onboarding_state=$3, rejection_reason=$4, updated_at=NOW()`, [uid, decision === 'reject' ? 'REJECTED' : 'PENDING', decision === 'reject' ? 'REJECTED' : 'INFO_REQUESTED', reason]);
          }
          await client.query(`INSERT INTO howdi_v8_worker_app_events(application_id,actor,admin_username,action,reason) VALUES($1,'admin',$2,$3,$4)`, [a.id, who, decision === 'request_info' ? 'info_requested' : decision === 'approve' ? 'approved' : 'rejected', reason || null]);
          await client.query('COMMIT');
        } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
        await auditAdmin(req, session, 'V8_WORKER_APP_DECISION', { application: m[1], decision, checks, reason: reason || null });
        if (decision === 'approve') await notify(uid, 'WORKER_APP_APPROVED', 'You’re a verified HOWDI worker 🎉', 'Go Online in Works → My work to start getting job requests.', '/works/worker', null);
        else if (decision === 'reject') await notify(uid, 'WORKER_APP_REJECTED', 'Your worker application wasn’t approved', `${reason} You can fix this and apply again.`, '/works/become', null);
        else await notify(uid, 'WORKER_APP_INFO', 'HOWDI needs more information', reason, '/works/become', null);
        const fresh = (await pool.query(`SELECT a.*, m.services, m.hours, m.bio, m.dob_confirmed, m.checks, m.submitted_at, m.decided_at FROM works_worker_applications a JOIN howdi_v8_worker_app_meta m ON m.application_id=a.id WHERE a.id=$1`, [a.id])).rows[0];
        ok(res, { application: await appDto(fresh, true), worker: workerCode ? { ref: workerCode } : null }); return true;
      }
    }
    return false;
  }
  return { ensureSchema, handle };
}
module.exports = { createWorksV8Onboarding };
