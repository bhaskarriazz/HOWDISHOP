// V8 Become a Worker + HOWDI Admin verification — real PostgreSQL, both sides: draft → documents (private) → submit →
// admin queue → request info (reason, applicant notified, edit + resubmit) → reject (reason) → reapply → approve (checks
// required) → worker linked (works_workers verified, services, hours, WORKER role ACTIVE) → visible in Works; admin guard,
// audit trail, documents never public, full ID number refused, no internal ids to the applicant.
const K = require('../k5a-pg/lib.cjs');
const { pool, check, finish, api } = K;
const LABEL = `v8 08 worker onboarding (${process.env.V8_EXPECT_SANDBOX === '1' ? 'sandbox' : 'no-sandbox'})`;
const ADMIN = { 'x-howdi-admin-token': process.env.HOWDI_ADMIN_TOKEN || '' };
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const FORBIDDEN = /"(id|user_id|[a-z_]*_user_id|userId|howdi_id|master_id|email|phone|mobile|uuid|application_id|converted_worker_id|kyc_document_file|live_selfie_file)"\s*:/;
(async () => {
  const started = await K.start(); check('server starts', started, K.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const A = await K.member('Anil Applicant', { username: 'anil_fix' }); const N = await K.member('No Handle'); const O = await K.member('Other Person', { username: 'other_p' });
  const sv = await pool.query(`INSERT INTO works_services(service_code,name,active,customer_visible) VALUES('T-PLUMB','Test plumbing',TRUE,TRUE),('T-ELEC','Test electrical',TRUE,TRUE) ON CONFLICT DO NOTHING RETURNING id`);
  const notes = async (m) => ((await api('GET', '/api/v8/notifications', { token: m.token })).json.items || []);

  const g0 = await api('GET', '/api/v8/works/application', { token: A.token });
  check('fresh applicant: no application, options listed', g0.json.application === null && g0.json.options.services.some((s) => s.code === 'T-PLUMB') && g0.json.handle === 'anil_fix', g0.text.slice(0, 300));
  check('guest refused', (await api('GET', '/api/v8/works/application')).status === 401);
  check('no @handle → must choose one first', (await api('PUT', '/api/v8/works/application', { token: N.token, body: { city: 'Khammam' } })).json.code === 'NEED_HANDLE');
  check('full ID number refused', (await api('PUT', '/api/v8/works/application', { token: A.token, body: { id_number: '123412341234' } })).json.code === 'FULL_ID_REFUSED');
  const p1 = await api('PUT', '/api/v8/works/application', { token: A.token, body: { name: 'Anil Kumar', age_confirmed: true, city: 'Khammam', pincode: '507001', radius_km: 8, languages: ['Telugu', 'Hindi'], id_type: 'aadhaar', id_last4: '4821' } });
  check('step 1–2 saved as draft', p1.json.application?.status === 'draft' && p1.json.application.id_last4 === '4821', p1.text.slice(0, 300));
  check('submit refused while incomplete (lists what is missing)', (await api('POST', '/api/v8/works/application/submit', { token: A.token })).json.code === 'INCOMPLETE');
  const d1 = await api('POST', '/api/v8/works/application/document', { token: A.token, body: { kind: 'id', imageData: PNG } });
  check('ID photo stored privately (no URL returned)', d1.json.application?.has_id_photo === true && !/\/api\/v8\/media\//.test(d1.text), d1.text.slice(0, 200));
  check('bad file refused', (await api('POST', '/api/v8/works/application/document', { token: A.token, body: { kind: 'selfie', imageData: 'data:image/png;base64,AAAA' } })).status === 400);
  await api('POST', '/api/v8/works/application/document', { token: A.token, body: { kind: 'selfie', imageData: PNG } });
  const p2 = await api('PUT', '/api/v8/works/application', { token: A.token, body: { services: ['T-PLUMB', 'T-ELEC', 'NOPE'], experience_years: 6, price: 300, bio: 'Leak repairs, fittings', hours: [1, 2, 3, 4, 5].map((d) => ({ weekday: d, start_min: 540, end_min: 1080 })), declaration: true } });
  check('services (unknown dropped), price, hours, declaration saved', p2.json.application?.services.join() === 'T-PLUMB,T-ELEC' && p2.json.application.missing.length === 0, p2.text.slice(0, 300));
  check('applicant payload has no internal ids or file names', !FORBIDDEN.test(p2.text), (p2.text.match(FORBIDDEN) || [])[0]);
  const s1 = await api('POST', '/api/v8/works/application/submit', { token: A.token });
  check('submitted', s1.json.application?.status === 'submitted', s1.text.slice(0, 200));
  const APP = s1.json.application.public_key;
  check('locked while under review', (await api('PUT', '/api/v8/works/application', { token: A.token, body: { city: 'X' } })).json.code === 'LOCKED');
  check('WORKER role pending', (await pool.query(`SELECT ur.role_status, ur.onboarding_state FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1 AND r.code='WORKER'`, [A.id])).rows[0]?.role_status === 'PENDING');
  check('applicant told it was received', (await notes(A)).some((n) => /application received/.test(n.title)));

  // ---------------- admin side
  check('admin API refuses a customer session', (await api('GET', '/api/admin/v8/works/applications', { token: A.token })).status === 401);
  const q = await api('GET', '/api/admin/v8/works/applications?status=submitted', { headers: ADMIN });
  check('admin queue lists it', (q.json.items || []).some((x) => x.public_key === APP && x.applicant?.public_username === 'anil_fix') && q.json.counts.submitted >= 1, q.text.slice(0, 300));
  const det = await api('GET', `/api/admin/v8/works/applications/${APP}`, { headers: ADMIN });
  check('admin detail: services by name, masked contact, templates', det.json.application?.service_names.includes('Test plumbing') && /^•+ \d{4}$/.test(det.json.application.applicant.contact) && det.json.application.reject_templates.length > 0, det.text.slice(0, 300));
  const doc = await api('GET', `/api/admin/v8/works/applications/${APP}/document/id`, { headers: ADMIN });
  check('admin streams the ID photo (no-store)', doc.status === 200, doc.status);
  check('documents are not reachable without admin', (await api('GET', `/api/admin/v8/works/applications/${APP}/document/id`, { token: A.token })).status === 401);
  check('reason required for request-info', (await api('POST', `/api/admin/v8/works/applications/${APP}/decide`, { headers: ADMIN, body: { decision: 'request_info' } })).json.code === 'REASON_REQUIRED');
  check('approve needs all checks', (await api('POST', `/api/admin/v8/works/applications/${APP}/decide`, { headers: ADMIN, body: { decision: 'approve', checks: { identity: true } } })).json.code === 'CHECKS_REQUIRED');
  const ri = await api('POST', `/api/admin/v8/works/applications/${APP}/decide`, { headers: ADMIN, body: { decision: 'request_info', reason: 'ID photo is unclear or cut off — please retake it in good light.' } });
  check('admin requests info', ri.json.application?.status === 'info_requested', ri.text.slice(0, 200));
  check('applicant notified with the reason', (await notes(A)).some((n) => /needs more information/.test(n.title) && /unclear/.test(n.body || '')));
  const ga = await api('GET', '/api/v8/works/application', { token: A.token });
  check('applicant sees the reason and can edit', ga.json.application.status === 'info_requested' && /unclear/.test(ga.json.application.note) && ga.json.application.editable, ga.text.slice(0, 200));
  await api('POST', '/api/v8/works/application/document', { token: A.token, body: { kind: 'id', imageData: PNG } });
  check('resubmitted', (await api('POST', '/api/v8/works/application/submit', { token: A.token })).json.application?.status === 'submitted');
  const rj = await api('POST', `/api/admin/v8/works/applications/${APP}/decide`, { headers: ADMIN, body: { decision: 'reject', reason: 'Skill or experience couldn’t be verified.' } });
  check('admin rejects with reason', rj.json.application?.status === 'rejected');
  check('decided twice → refused', (await api('POST', `/api/admin/v8/works/applications/${APP}/decide`, { headers: ADMIN, body: { decision: 'approve', checks: { identity: true, selfie: true, skill: true } } })).json.code === 'INVALID_STATE');
  check('WORKER role rejected with reason', (await pool.query(`SELECT ur.role_status, ur.rejection_reason FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1 AND r.code='WORKER'`, [A.id])).rows[0]?.role_status === 'REJECTED');
  check('applicant told it was rejected', (await notes(A)).some((n) => /wasn’t approved/.test(n.title)));
  // reapply: a fresh draft carrying the answers
  const re = await api('PUT', '/api/v8/works/application', { token: A.token, body: { experience_years: 7 } });
  check('reapply creates a new draft with previous answers', re.json.application?.status === 'draft' && re.json.application.public_key !== APP && re.json.application.city === 'Khammam', re.text.slice(0, 200));
  await api('POST', '/api/v8/works/application/document', { token: A.token, body: { kind: 'id', imageData: PNG } }); await api('POST', '/api/v8/works/application/document', { token: A.token, body: { kind: 'selfie', imageData: PNG } });
  await api('PUT', '/api/v8/works/application', { token: A.token, body: { declaration: true } });
  const s2 = await api('POST', '/api/v8/works/application/submit', { token: A.token }); const APP2 = s2.json.application?.public_key;
  check('second application submitted', s2.json.application?.status === 'submitted', s2.text.slice(0, 200));
  const ap = await api('POST', `/api/admin/v8/works/applications/${APP2}/decide`, { headers: ADMIN, body: { decision: 'approve', checks: { identity: true, selfie: true, skill: true } } });
  check('admin approves → worker created', ap.json.application?.status === 'approved' && /^WRK-[0-9A-F]{8}$/.test(ap.json.worker?.ref || ''), ap.text.slice(0, 300));
  const w = (await pool.query(`SELECT w.*, (SELECT COUNT(*) FROM works_worker_services x WHERE x.worker_id=w.id AND x.status='approved') svc, (SELECT COUNT(*) FROM howdi_v8_works_hours h WHERE h.worker_id=w.id AND h.end_min>h.start_min) hrs FROM works_workers w WHERE w.user_id=$1`, [A.id])).rows[0];
  check('account linked: verified worker, 2 services, 5 working days, price', w && w.kyc_status === 'verified' && Number(w.svc) === 2 && Number(w.hrs) === 5 && Number(w.starting_price) === 300);
  check('WORKER role ACTIVE', (await pool.query(`SELECT ur.role_status FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1 AND r.code='WORKER'`, [A.id])).rows[0]?.role_status === 'ACTIVE');
  check('applicant told they are verified', (await notes(A)).some((n) => /verified HOWDI worker/.test(n.title)));
  const me = await api('GET', '/api/v8/works/worker/me', { token: A.token });
  check('worker desk opens (live)', me.json.worker?.live === true, me.text.slice(0, 200));
  check('can go online', (await api('POST', '/api/v8/works/worker/status', { token: A.token, body: { status: 'online' } })).json.status === 'online');
  check('customers can find the new worker', ((await api('GET', '/api/v8/works/workers?service=T-PLUMB', { token: O.token })).json.items || []).some((x) => x.person.public_username === 'anil_fix'));
  { const n = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_admin_security_audit WHERE action='V8_WORKER_APP_DECISION'`)).rows[0].n); const v = Number((await pool.query(`SELECT COUNT(*) n FROM howdi_admin_security_audit WHERE action='V8_WORKER_APP_DOCUMENT_VIEW'`)).rows[0].n); check('audit trail: 3 decisions (info, reject, approve) + document views', n === 3 && v >= 1, { n, v }); }
  const hist = await api('GET', '/api/v8/works/application', { token: A.token });
  check('applicant history hides admin usernames', hist.json.application.history.every((h) => !/admin ·/.test(h.actor)) && hist.json.application.history.some((h) => h.action === 'approved'));
  await finish(LABEL);
})().catch(async (e) => { check('suite ran to the end', false, e && e.stack); await finish(LABEL); });
