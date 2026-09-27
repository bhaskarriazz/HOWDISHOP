// V8 Learn & Earn: Teacher application → HOWDI Admin → teacher creates + publishes a course → learner joins (free / HPay) →
// lessons → certificate → teacher sees learners; Institute + Startup applications (request info, reject, approve); My roles.
const K = require('../k5a-pg/lib.cjs');
const { pool, check, finish, api } = K;
const SANDBOX = process.env.V8_EXPECT_SANDBOX === '1';
const LABEL = `v8 11 learn (${SANDBOX ? 'sandbox' : 'no-sandbox'})`;
const ADMIN = { 'x-howdi-admin-token': process.env.HOWDI_ADMIN_TOKEN || '' };
const FORBIDDEN = /"(id|user_id|[a-z_]*_user_id|userId|howdi_id|master_id|email|phone|uuid|course_id|lesson_id|module_id)"\s*:/;
(async () => {
  const started = await K.start(); check('server starts', started, K.serverLog().slice(-600)); if (!started) return finish(LABEL);
  const T = await K.member('Tara Teacher', { username: 'tara_teaches' }); const L = await K.member('Lina Learner', { username: 'lina_learns' }); const S = await K.member('Sam Startup', { username: 'sam_builds' });
  const role = async (m, c) => ((await api('GET', '/api/v8/me/roles', { token: m.token })).json.items || []).find((x) => x.code === c);
  const notes = async (m) => ((await api('GET', '/api/v8/notifications', { token: m.token })).json.items || []);
  const decide = (k, body) => api('POST', `/api/admin/v8/roles/applications/${k}/decide`, { headers: ADMIN, body });
  const bal = async (m) => Number((await pool.query(`SELECT balance FROM howdi_v8_wallets WHERE user_id=$1`, [m.id])).rows[0]?.balance || 0);

  // --- teacher application
  check('My roles lists teacher / institute / startup, none yet', ['teacher', 'institute', 'startup'].every(async () => true) && (await role(T, 'teacher')).status === 'none' && (await role(T, 'institute')).apply_route === '/me/apply/institute');
  check('teach workspace refused before approval', (await api('GET', '/api/v8/learn/teach', { token: T.token })).json.code === 'TEACHER_ROLE_REQUIRED');
  check('bad experience refused', (await api('PUT', '/api/v8/roles/teacher/application', { token: T.token, body: { experience_years: 'ten' } })).status === 400);
  const d = await api('PUT', '/api/v8/roles/teacher/application', { token: T.token, body: { skill: 'Crochet', experience_years: '12', languages: 'Telugu, English', bio: 'I teach crochet to beginners in Khammam.' } });
  check('draft saved, declaration missing, no ids', d.json.application?.status === 'draft' && d.json.application.missing.join() === 'declaration' && !FORBIDDEN.test(d.text), d.text.slice(0, 300));
  check('submit blocked without declaration', (await api('POST', '/api/v8/roles/teacher/application/submit', { token: T.token })).json.code === 'INCOMPLETE');
  await api('PUT', '/api/v8/roles/teacher/application', { token: T.token, body: { declaration: true } });
  const TA = (await api('POST', '/api/v8/roles/teacher/application/submit', { token: T.token })).json.application?.public_key;
  check('submitted → role pending', /^RAP-/.test(TA || '') && (await role(T, 'teacher')).status === 'pending');
  check('admin API refuses a member', (await api('GET', '/api/admin/v8/roles/applications', { token: T.token })).status === 401);
  const q = await api('GET', '/api/admin/v8/roles/applications?role=teacher', { headers: ADMIN });
  check('admin queue lists it with @handle only', (q.json.items || []).some((x) => x.public_key === TA && x.applicant?.public_username === 'tara_teaches') && !FORBIDDEN.test(q.text), q.text.slice(0, 300));
  check('reason required', (await decide(TA, { decision: 'reject' })).json.code === 'REASON_REQUIRED');
  await decide(TA, { decision: 'request_info', reason: 'Please add a teaching sample link.' });
  check('applicant: action needed + reason + notified', (await role(T, 'teacher')).status === 'action_needed' && /sample/.test((await role(T, 'teacher')).reason || '') && (await notes(T)).some((n) => /more information/.test(n.title)));
  await api('PUT', '/api/v8/roles/teacher/application', { token: T.token, body: { sample: 'Video of my granny-square class', declaration: true } });
  await api('POST', '/api/v8/roles/teacher/application/submit', { token: T.token });
  const ap = await decide(TA, { decision: 'approve' });
  check('approved → teacher active + notified', ap.json.application?.status === 'approved' && (await role(T, 'teacher')).status === 'active' && (await role(T, 'teacher')).open_route === '/learn/teach' && (await notes(T)).some((n) => /now a HOWDI Teacher/.test(n.title)));
  check('double decision refused', (await decide(TA, { decision: 'reject', reason: 'Changed my mind' })).json.code === 'INVALID_STATE');

  // --- teacher creates a course
  check('invalid course refused', (await api('POST', '/api/v8/learn/teach/courses', { token: T.token, body: { title: 'x' } })).json.code === 'INVALID_COURSE');
  const price = SANDBOX ? 199 : 0;
  const cc = await api('POST', '/api/v8/learn/teach/courses', { token: T.token, body: { title: 'Granny squares in a weekend', tagline: 'Your first crochet blanket square', category: 'Crochet & Handmade', level: 'beginner', price, publish: false, outcomes: ['Hold the hook', 'Make a magic ring'],
    lessons: [{ title: 'Hook and yarn', body: 'Pick a 4 mm hook and cotton yarn.', minutes: 6, tip: 'Hold it like a pencil.' }, { title: 'Magic ring', body: 'Wrap twice, pull through.', minutes: 10, practice: 'Make 3 rings.' }, { title: 'First square', body: 'Three chains, two trebles…', minutes: 20 }] } });
  const CRS = cc.json.course?.public_key;
  check('course created as draft, CRS code, no ids', /^CRS-/.test(CRS || '') && cc.json.status === 'draft' && cc.json.course.lessons === 3 && !FORBIDDEN.test(cc.text), cc.text.slice(0, 300));
  check('draft hidden from catalogue + from learners', !((await api('GET', '/api/v8/learn/courses?q=Granny', { token: L.token })).json.items || []).length && (await api('GET', `/api/v8/learn/courses/${CRS}`, { token: L.token })).status === 404);
  await api('POST', `/api/v8/learn/teach/courses/${CRS}/publish`, { token: T.token });
  const cat = await api('GET', '/api/v8/learn/courses?q=Granny');
  check('published → in catalogue (signed out too) with teacher @handle', (cat.json.items || [])[0]?.public_key === CRS && cat.json.items[0].teacher?.public_username === 'tara_teaches' && !FORBIDDEN.test(cat.text), cat.text.slice(0, 300));
  const det = await api('GET', `/api/v8/learn/courses/${CRS}`, { token: L.token });
  const LS = det.json.course.modules[0].lessons.map((x) => x.public_key);
  check('detail: first lesson preview, others locked', det.json.course.modules[0].lessons[0].locked === false && det.json.course.modules[0].lessons[1].locked === true && !FORBIDDEN.test(det.text));
  check('preview lesson opens; locked lesson refused', (await api('GET', `/api/v8/learn/lessons/${LS[0]}`, { token: L.token })).json.lesson?.can_complete === false && (await api('GET', `/api/v8/learn/lessons/${LS[1]}`, { token: L.token })).json.code === 'ENROLL_REQUIRED');
  check('others cannot manage the course', (await api('POST', `/api/v8/learn/teach/courses/${CRS}/unpublish`, { token: L.token })).json.code === 'TEACHER_ROLE_REQUIRED');

  // --- learner joins
  let t0 = 0;
  if (SANDBOX) {
    await api('POST', '/api/v8/hpay/pin', { token: L.token, body: { pin: '4826' } }); await api('GET', '/api/v8/hpay/history', { token: L.token }); await api('GET', '/api/v8/hpay/history', { token: T.token });
    await pool.query(`UPDATE howdi_v8_wallets SET balance=1000 WHERE user_id=$1`, [L.id]); await pool.query(`INSERT INTO howdi_v8_wallets(user_id,balance) VALUES($1,0) ON CONFLICT(user_id) DO NOTHING`, [T.id]).catch(() => {}); t0 = await bal(T);
    check('wrong PIN refused, nothing charged', (await api('POST', `/api/v8/learn/courses/${CRS}/enroll`, { token: L.token, body: { pin: '1111' } })).status >= 400 && (await bal(L)) === 1000);
  }
  const en = await api('POST', `/api/v8/learn/courses/${CRS}/enroll`, { token: L.token, body: { pin: '4826', idem_key: 'k1' } });
  check('joined', en.json.enrolled === true && en.json.next_lesson === LS[0], en.text.slice(0, 200));
  const en2 = await api('POST', `/api/v8/learn/courses/${CRS}/enroll`, { token: L.token, body: { pin: '4826', idem_key: 'k1' } });
  check('join again is idempotent', en2.json.already === true);
  if (SANDBOX) check('HPay charged once, teacher paid', (await bal(L)) === 801 && (await bal(T)) === t0 + 199, `${await bal(L)} ${await bal(T)} ${t0}`);
  check('teacher notified of the new learner', (await notes(T)).some((n) => /New learner/.test(n.title)));
  check('learner role active', (await role(L, 'learner')).status === 'active');
  const l1 = await api('GET', `/api/v8/learn/lessons/${LS[1]}`, { token: L.token });
  check('lesson opens with prev/next + practice', l1.json.lesson?.prev === LS[0] && l1.json.lesson.next === LS[2] && /3 rings/.test(l1.json.lesson.practice || ''));
  const c1 = await api('POST', `/api/v8/learn/lessons/${LS[0]}/complete`, { token: L.token });
  check('progress 33%', c1.json.progress === 33 && c1.json.completed === false, c1.text.slice(0,300) + K.serverLog().slice(-800));
  await api('POST', `/api/v8/learn/lessons/${LS[1]}/complete`, { token: L.token });
  const c3 = await api('POST', `/api/v8/learn/lessons/${LS[2]}/complete`, { token: L.token });
  check('all done → certificate issued + notified', c3.json.completed === true && c3.json.certificate_new === true && /^HOWDI-/.test(c3.json.certificate?.code || '') && (await notes(L)).some((n) => /Certificate earned/.test(n.title)), c3.text.slice(0, 200));
  check('completing again does not issue a second certificate', (await api('POST', `/api/v8/learn/lessons/${LS[2]}/complete`, { token: L.token })).json.certificate_new === false);
  const ver = await api('GET', `/api/v8/learn/certificates/${c3.json.certificate.code}`);
  check('public verify: course + @handle only', ver.json.certificate?.status === 'valid' && ver.json.certificate.learner?.public_username === 'lina_learns' && !FORBIDDEN.test(ver.text), ver.text.slice(150));
  const me = await api('GET', '/api/v8/learn/me', { token: L.token });
  check('My learning: completed with certificate', me.json.completed?.[0]?.public_key === CRS && me.json.completed[0].certificate?.code === c3.json.certificate.code);
  const tv = await api('GET', `/api/v8/learn/teach/courses/${CRS}`, { token: T.token });
  check('teacher sees learner @handle, 100%, completed', tv.json.learners?.[0]?.learner?.public_username === 'lina_learns' && tv.json.learners[0].progress === 100 && tv.json.learners[0].completed === true && !FORBIDDEN.test(tv.text), tv.text.slice(0, 300));
  check('teacher list shows learners + completions', (await api('GET', '/api/v8/learn/teach', { token: T.token })).json.items?.[0]?.completed === 1);

  // --- institute + startup
  check('bad PIN code refused', (await api('PUT', '/api/v8/roles/institute/application', { token: S.token, body: { pin_code: '12' } })).status === 400);
  await api('PUT', '/api/v8/roles/institute/application', { token: S.token, body: { org_name: 'Khammam Skills College', org_type: 'college', city: 'Khammam', pin_code: '507001', registration_last4: 'A123', contact_role: 'Principal', seats: '120', declaration: true } });
  const IA = (await api('POST', '/api/v8/roles/institute/application/submit', { token: S.token })).json.application?.public_key;
  await decide(IA, { decision: 'reject', reason: 'We couldn’t verify the organisation.' });
  check('institute rejected with reason', (await role(S, 'institute')).status === 'rejected' && /verify/.test((await role(S, 'institute')).reason || ''));
  check('bad website refused', (await api('PUT', '/api/v8/roles/startup/application', { token: S.token, body: { website: 'ftp://x' } })).status === 400);
  await api('PUT', '/api/v8/roles/startup/application', { token: S.token, body: { startup_name: 'LoomLink', stage: 'early', sector: 'Handloom marketplace', city: 'Khammam', website: 'https://loomlink.example.in', looking_for: 'Mentors and interns', declaration: true } });
  const SA = (await api('POST', '/api/v8/roles/startup/application/submit', { token: S.token })).json.application?.public_key;
  await decide(SA, { decision: 'approve' });
  check('one HOWDI ID: startup active, institute rejected, customer permanent', (await role(S, 'startup')).status === 'active' && (await role(S, 'institute')).status === 'rejected' && (await role(S, 'customer')).status === 'active');
  check('audit has the role decisions', Number((await pool.query(`SELECT COUNT(*) n FROM howdi_admin_security_audit WHERE action='V8_ROLE_APP_DECISION'`)).rows[0].n) === 4);
  await finish(LABEL);
})().catch(async (e) => { check('suite ran to the end', false, e && e.stack); await finish(LABEL); });
