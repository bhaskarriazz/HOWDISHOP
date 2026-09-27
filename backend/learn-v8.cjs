'use strict';
// =====================================================================================
// HOWDI V8 — Learn & Earn (learner + teacher, both sides) and role applications for Teacher / Institute / Startup.
// Reuses the legacy learning tables: learning_courses, learning_course_modules, learning_course_lessons,
// learning_lesson_progress, learning_course_entitlements, user_course_enrollments, user_learning_certificates.
//   learner: GET /api/v8/learn/courses · GET /api/v8/learn/courses/{CRS} · POST …/{CRS}/enroll {pin?, idem_key}
//            GET /api/v8/learn/lessons/{LSN} · POST …/{LSN}/complete · GET /api/v8/learn/me · GET /api/v8/learn/certificates/{code} (public verify)
//   teacher: GET /api/v8/learn/teach · POST /api/v8/learn/teach/courses · GET …/courses/{CRS} (learners) · POST …/{CRS}/publish|unpublish
//   roles:   GET|PUT /api/v8/roles/{teacher|institute|startup}/application · POST …/submit
//   admin:   GET /api/admin/v8/roles/applications?role=&status= · GET …/{RAP} · POST …/{RAP}/decide {decision, reason}
// Paid courses use HPay (Preview/Test): the learner pays the teacher with their HPay PIN; enrolment is idempotent per course.
// Only public codes (CRS/LSN/RAP) and @handles leave the server. The session decides who is acting.
// =====================================================================================
const crypto = require('node:crypto');
const CATEGORIES = ['Crochet & Handmade', 'Tailoring & Textiles', 'Cooking', 'Digital skills', 'Business & Selling', 'Languages', 'Wellness'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const ROLE_FORMS = {
  teacher: { code: 'TEACHER', label: 'Teacher', fields: { skill: 80, experience_years: 2, languages: 80, sample: 300, bio: 600 }, required: ['skill', 'experience_years', 'languages', 'bio'], route: '/learn/teach',
    templates: ['Teaching sample doesn’t show the skill clearly', 'Experience details are incomplete', 'This skill isn’t offered on HOWDI Learn yet'] },
  institute: { code: 'INSTITUTE', label: 'Institute / College', fields: { org_name: 120, org_type: 20, city: 60, pin_code: 6, registration_last4: 4, contact_role: 60, seats: 5, about: 600 }, required: ['org_name', 'org_type', 'city', 'pin_code', 'registration_last4', 'contact_role'], route: '/me/apply/institute',
    templates: ['Registration details don’t match the organisation name', 'We couldn’t verify the organisation', 'Contact person isn’t authorised'] },
  startup: { code: 'STARTUP', label: 'Startup', fields: { startup_name: 120, stage: 12, sector: 60, city: 60, website: 200, looking_for: 200, about: 600 }, required: ['startup_name', 'stage', 'sector', 'city', 'looking_for'], route: '/me/apply/startup',
    templates: ['Startup details are incomplete', 'The website or product couldn’t be verified', 'Sector isn’t supported yet'] },
};
const ORG_TYPES = ['college', 'school', 'training_centre', 'ngo'];
const STAGES = ['idea', 'early', 'growth'];

function createLearnV8(deps) {
  const { pool, getBody, notify, auditAdmin, wallet } = deps;
  const H = deps.helpers; const M = deps.messages;
  const { viewer, ok, fail, authorCols, authorJoins, authorDto } = H;
  const { issue, checkPin, transfer, line, text, iso, money } = M;

  async function ensureSchema() {
    await pool.query(`ALTER TABLE learning_courses ADD COLUMN IF NOT EXISTS v8_teacher_user_id BIGINT`);
    await pool.query(`INSERT INTO roles(code,name,description,is_active) VALUES ('INSTITUTE','Institute / College','HOWDI Learn & Earn verified institute',TRUE),('STARTUP','Startup','HOWDI verified startup',TRUE) ON CONFLICT (code) DO NOTHING`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_role_apps(id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, role VARCHAR(12) NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'draft',
      fields JSONB NOT NULL DEFAULT '{}'::jsonb, declaration BOOLEAN NOT NULL DEFAULT FALSE, review_note VARCHAR(600), submitted_at TIMESTAMPTZ, decided_at TIMESTAMPTZ, decided_by VARCHAR(80),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_role_apps_user ON howdi_v8_role_apps(user_id, role, id DESC)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_role_app_events(id BIGSERIAL PRIMARY KEY, app_id BIGINT NOT NULL, actor VARCHAR(10) NOT NULL, admin_username VARCHAR(80), action VARCHAR(20) NOT NULL, reason VARCHAR(600), at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_learn_payments(user_id BIGINT NOT NULL, course_id UUID NOT NULL, amount NUMERIC(12,2) NOT NULL, txn VARCHAR(32), idem_key VARCHAR(64), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id, course_id))`);
  }

  // ---------------------------------------------------------------- codes (UUID keys → string resolve)
  const code = async (type, key) => (await issue(type, [String(key)])).get(String(key));
  const codes = async (type, keys) => issue(type, keys.map(String));
  const PREFIX = { LCRS: 'CRS', LLSN: 'LSN', RAPP: 'RAP' };
  async function key(c, type) {
    if (!new RegExp(`^${PREFIX[type]}-[0-9A-F]{12}$`).test(String(c || ''))) return null;
    const r = (await pool.query(`SELECT entity_key FROM howdi_v8_refs2 WHERE public_code=$1 AND entity_type=$2`, [c, type])).rows[0]; return r ? String(r.entity_key) : null;
  }
  const safeUrl = (u) => (/^\/api\/v8\/media\/[\w./-]+$/.test(String(u || '')) || /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(String(u || '')) ? String(u) : null);
  const isTeacher = async (uid) => Boolean((await pool.query(`SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1 AND r.code='TEACHER' AND ur.role_status='ACTIVE'`, [uid])).rows[0]);

  async function lessonsOf(courseId) {
    return (await pool.query(`SELECT l.id, l.title, l.lesson_type, l.duration_minutes, l.is_preview, m.id module_id, m.title module_title, m.sort_order ms, l.sort_order ls
      FROM learning_course_lessons l JOIN learning_course_modules m ON m.id=l.module_id WHERE m.course_id=$1 AND l.is_active AND m.is_active ORDER BY m.sort_order, m.created_at, l.sort_order, l.created_at`, [courseId])).rows;
  }
  async function stateOf(uid, courseId, total) {
    if (!uid) return { enrolled: false, done: [], progress: 0 };
    const ent = (await pool.query(`SELECT 1 FROM learning_course_entitlements WHERE user_id=$1 AND course_id=$2 AND entitlement_status='ACTIVE'`, [uid, courseId])).rows[0];
    const done = (await pool.query(`SELECT lesson_id FROM learning_lesson_progress WHERE user_id=$1 AND course_id=$2 AND status='COMPLETED'`, [uid, courseId])).rows.map((r) => String(r.lesson_id));
    return { enrolled: Boolean(ent), done, progress: total ? Math.round((100 * done.length) / total) : 0 };
  }
  async function certOf(uid, courseId) {
    const c = (await pool.query(`SELECT certificate_code, issued_at, status FROM user_learning_certificates WHERE user_id=$1 AND course_id=$2`, [uid, courseId])).rows[0];
    return c ? { code: c.certificate_code, issued_at: iso(c.issued_at), status: String(c.status || 'ACTIVE').toLowerCase(), verify_route: `/learn/certificates/${c.certificate_code}` } : null;
  }
  async function teacherDto(uid) {
    if (!uid) return null;
    const r = (await pool.query(`SELECT ${authorCols('bu.id', 't_')} FROM users bu ${authorJoins('bu.id', 't_')} WHERE bu.id=$1`, [uid])).rows[0];
    return r ? authorDto(r, 't_') : null;
  }
  async function courseCard(c, uid) {
    const n = Number((await pool.query(`SELECT COUNT(*) n FROM learning_course_lessons l JOIN learning_course_modules m ON m.id=l.module_id WHERE m.course_id=$1 AND l.is_active AND m.is_active`, [c.id])).rows[0].n);
    const st = await stateOf(uid, c.id, n);
    const learners = Number((await pool.query(`SELECT COUNT(*) n FROM learning_course_entitlements WHERE course_id=$1 AND entitlement_status='ACTIVE'`, [c.id])).rows[0].n);
    return { public_key: await code('LCRS', c.id), title: c.title, tagline: c.tagline || null, category: c.category, level: c.level, language: c.language, minutes: Number(c.duration_minutes) || 0,
      price: money(c.sale_price ?? c.price ?? 0), free: !(Number(c.sale_price ?? c.price) > 0), image: safeUrl(c.thumbnail_url), lessons: n, learners,
      teacher: await teacherDto(c.v8_teacher_user_id), by_howdi: !c.v8_teacher_user_id, enrolled: st.enrolled, progress: st.progress };
  }
  const published = `is_active AND publish_status='PUBLISHED'`;

  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (p.startsWith('/api/admin/v8/roles/')) return admin(req, res, url, p);
    if (!/^\/api\/v8\/(learn|roles)(\/|$)/.test(p)) return false;
    let m;
    // public certificate verification (no sign-in needed; shows @handle only)
    if ((m = p.match(/^\/api\/v8\/learn\/certificates\/([A-Z0-9-]{6,80})$/)) && req.method === 'GET') {
      const c = (await pool.query(`SELECT cert.certificate_code, cert.status, cert.issued_at, c.title, ${authorCols('cert.user_id', 'l_')} FROM user_learning_certificates cert JOIN learning_courses c ON c.id=cert.course_id ${authorJoins('cert.user_id', 'l_')} WHERE cert.certificate_code=$1`, [m[1]])).rows[0];
      if (!c) { fail(res, 404, 'NOT_FOUND', 'No HOWDI certificate has this number.'); return true; }
      ok(res, { certificate: { number: c.certificate_code, course: c.title, learner: authorDto(c, 'l_'), issued_at: iso(c.issued_at), status: String(c.status || 'ACTIVE') === 'ACTIVE' ? 'valid' : 'revoked' } }); return true;
    }
    const v = await viewer(req);
    const uid = v ? v.id : null;
    // ------------------------------------------------ catalogue (browsable signed-out)
    if (p === '/api/v8/learn/courses' && req.method === 'GET') {
      const q = line(url.searchParams.get('q') || '', 60); const cat = url.searchParams.get('category');
      const rows = (await pool.query(`SELECT * FROM learning_courses WHERE ${published} AND ($1='' OR title ILIKE '%'||$1||'%' OR tagline ILIKE '%'||$1||'%') AND ($2::text IS NULL OR category=$2) ORDER BY created_at DESC LIMIT 60`, [q, CATEGORIES.includes(cat) ? cat : null])).rows;
      ok(res, { categories: CATEGORIES, items: await Promise.all(rows.map((c) => courseCard(c, uid))) }); return true;
    }
    if ((m = p.match(/^\/api\/v8\/learn\/courses\/(CRS-[0-9A-F]{12})(?:\/(enroll))?$/))) {
      const cid = await key(m[1], 'LCRS'); const c = cid ? (await pool.query(`SELECT * FROM learning_courses WHERE id=$1`, [cid])).rows[0] : null;
      const mine = c && uid && Number(c.v8_teacher_user_id) === uid;
      if (!c || !(c.is_active && (c.publish_status === 'PUBLISHED' || mine))) { fail(res, 404, 'NOT_FOUND', 'This course isn’t available.'); return true; }
      const ls = await lessonsOf(c.id); const lc = await codes('LLSN', ls.map((l) => l.id));
      if (!m[2] && req.method === 'GET') {
        const st = await stateOf(uid, c.id, ls.length); const mods = [];
        for (const l of ls) {
          let mod = mods.find((x) => x.key === String(l.module_id)); if (!mod) { mod = { key: String(l.module_id), title: l.module_title, lessons: [] }; mods.push(mod); }
          mod.lessons.push({ public_key: lc.get(String(l.id)), title: l.title, type: String(l.lesson_type || 'TEXT').toLowerCase(), minutes: Number(l.duration_minutes) || 0, preview: l.is_preview, done: st.done.includes(String(l.id)), locked: !(st.enrolled || l.is_preview || mine) });
        }
        const next = ls.find((l) => !st.done.includes(String(l.id)));
        ok(res, { course: { ...(await courseCard(c, uid)), description: c.description, outcomes: Array.isArray(c.outcomes) ? c.outcomes.slice(0, 8) : [], materials: Array.isArray(c.materials) ? c.materials.slice(0, 12) : [],
          certificate_enabled: c.certificate_enabled !== false, modules: mods.map(({ key: _k, ...x }) => x), next_lesson: st.enrolled && next ? lc.get(String(next.id)) : null, done_count: st.done.length,
          certificate: uid ? await certOf(uid, c.id) : null, is_mine: Boolean(mine), sign_in_needed: !uid } }); return true;
      }
      if (m[2] === 'enroll' && req.method === 'POST') {
        if (!uid) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to join this course.'); return true; }
        if (mine) { fail(res, 409, 'OWN_COURSE', 'This is your own course.'); return true; }
        const b = await getBody(req).catch(() => ({})); const price = Number(c.sale_price ?? c.price) || 0;
        const has = (await pool.query(`SELECT 1 FROM learning_course_entitlements WHERE user_id=$1 AND course_id=$2 AND entitlement_status='ACTIVE'`, [uid, c.id])).rows[0];
        if (has) { ok(res, { enrolled: true, already: true, next_lesson: ls[0] ? lc.get(String(ls[0].id)) : null }); return true; }
        let txn = null;
        if (price > 0) {
          if (!(await wallet(uid))) { fail(res, 503, 'PAYMENT_PROVIDER_REQUIRED', 'HPay isn’t connected here, so paid courses can’t be joined.'); return true; }
          const pin = await checkPin(uid, b.pin); if (pin.error) { fail(res, pin.error[0], pin.error[1], pin.error[2]); return true; }
        }
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`learn:${uid}:${c.id}`]);
          const again = (await client.query(`SELECT 1 FROM learning_course_entitlements WHERE user_id=$1 AND course_id=$2 AND entitlement_status='ACTIVE'`, [uid, c.id])).rows[0];
          if (!again) {
            if (price > 0) {
              const ref = m[1];
              if (c.v8_teacher_user_id) { const t = await transfer(client, uid, Number(c.v8_teacher_user_id), money(price), `Course: ${c.title}`, ref, 'LEARN_PAYMENT'); if (t.error) { await client.query('ROLLBACK'); fail(res, t.error[0], t.error[1], t.error[2]); return true; } txn = t.txn; }
              else {
                const up = await client.query(`UPDATE howdi_v8_wallets SET balance=balance-$2, updated_at=NOW() WHERE user_id=$1 AND balance>=$2 RETURNING balance`, [uid, money(price)]);
                if (!up.rows[0]) { await client.query('ROLLBACK'); fail(res, 402, 'INSUFFICIENT_BALANCE', 'Not enough HPay balance. Nothing was charged.'); return true; }
                txn = 'HPL-' + crypto.randomBytes(5).toString('hex').toUpperCase();
                await client.query(`INSERT INTO howdi_v8_ledger(txn_code,user_id,direction,amount,kind,reference,note) VALUES($1,$2,'DEBIT',$3,'LEARN_PAYMENT',$4,$5)`, [txn, uid, money(price), ref, line(`Course: ${c.title}`, 190)]);
              }
              await client.query(`INSERT INTO howdi_v8_learn_payments(user_id,course_id,amount,txn,idem_key) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [uid, c.id, money(price), txn, line(b.idem_key || '', 64) || null]);
            }
            await client.query(`INSERT INTO learning_course_entitlements(user_id,course_id,entitlement_status,source) VALUES($1,$2,'ACTIVE',$3) ON CONFLICT(user_id,course_id) DO UPDATE SET entitlement_status='ACTIVE', revoked_at=NULL, updated_at=NOW()`, [uid, c.id, price > 0 ? 'PURCHASE' : 'FREE']);
            await client.query(`INSERT INTO user_course_enrollments(user_id,course_id,progress,status) VALUES($1,$2,0,'ENROLLED') ON CONFLICT(user_id,course_id) DO NOTHING`, [uid, c.id]);
            await client.query(`INSERT INTO user_roles(user_id,role_id,is_primary,role_status,requested_at,decided_at,onboarding_state) SELECT $1,id,FALSE,'ACTIVE',NOW(),NOW(),'COMPLETE' FROM roles WHERE code='LEARNER' ON CONFLICT(user_id,role_id) DO UPDATE SET role_status='ACTIVE'`, [uid]);
          }
          await client.query('COMMIT');
        } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
        if (c.v8_teacher_user_id) { const me = (await pool.query(`SELECT public_username FROM howdi_connect_profiles WHERE user_id=$1`, [uid])).rows[0]; await notify(Number(c.v8_teacher_user_id), 'LEARN_ENROLLED', `New learner in “${line(c.title, 60)}”`, `@${me?.public_username || 'a learner'} joined${price > 0 ? ` and paid ₹${money(price)}` : ''}.`, `/learn/teach/${m[1]}`, null); }
        ok(res, { enrolled: true, paid: price > 0 ? money(price) : 0, receipt: txn, next_lesson: ls[0] ? lc.get(String(ls[0].id)) : null }); return true;
      }
    }
    if ((m = p.match(/^\/api\/v8\/learn\/lessons\/(LSN-[0-9A-F]{12})(?:\/(complete))?$/))) {
      const lid = await key(m[1], 'LLSN');
      const l = lid ? (await pool.query(`SELECT l.*, m.course_id FROM learning_course_lessons l JOIN learning_course_modules m ON m.id=l.module_id WHERE l.id=$1 AND l.is_active`, [lid])).rows[0] : null;
      const c = l ? (await pool.query(`SELECT * FROM learning_courses WHERE id=$1 AND is_active`, [l.course_id])).rows[0] : null;
      if (!c) { fail(res, 404, 'NOT_FOUND', 'This lesson isn’t available.'); return true; }
      const mine = uid && Number(c.v8_teacher_user_id) === uid; const ls = await lessonsOf(c.id); const st = await stateOf(uid, c.id, ls.length);
      if (!(st.enrolled || mine || (l.is_preview && c.publish_status === 'PUBLISHED'))) { fail(res, uid ? 403 : 401, uid ? 'ENROLL_REQUIRED' : 'SIGN_IN_REQUIRED', uid ? 'Join the course to open this lesson.' : 'Sign in and join the course to open this lesson.'); return true; }
      const lc = await codes('LLSN', ls.map((x) => x.id)); const i = ls.findIndex((x) => String(x.id) === String(l.id));
      if (!m[2] && req.method === 'GET') {
        if (st.enrolled) await pool.query(`INSERT INTO learning_lesson_progress(user_id,course_id,lesson_id,status,first_opened_at,last_opened_at) VALUES($1,$2,$3,'IN_PROGRESS',NOW(),NOW()) ON CONFLICT(user_id,lesson_id) DO UPDATE SET last_opened_at=NOW(), updated_at=NOW()`, [uid, c.id, l.id]);
        ok(res, { lesson: { public_key: m[1], title: l.title, type: String(l.lesson_type || 'TEXT').toLowerCase(), minutes: Number(l.duration_minutes) || 0, body: l.content_text || '', media: safeUrl(l.content_url), tip: l.grandma_tip || null, practice: l.practice_task || null,
          number: i + 1, of: ls.length, done: st.done.includes(String(l.id)), can_complete: st.enrolled, course: { public_key: await code('LCRS', c.id), title: c.title },
          prev: i > 0 ? lc.get(String(ls[i - 1].id)) : null, next: i < ls.length - 1 ? lc.get(String(ls[i + 1].id)) : null, progress: st.progress } }); return true;
      }
      if (m[2] === 'complete' && req.method === 'POST') {
        if (!st.enrolled) { fail(res, 403, 'ENROLL_REQUIRED', 'Join the course to track progress.'); return true; }
        await pool.query(`INSERT INTO learning_lesson_progress(user_id,course_id,lesson_id,status,first_opened_at,last_opened_at,completed_at) VALUES($1,$2,$3,'COMPLETED',NOW(),NOW(),NOW()) ON CONFLICT(user_id,lesson_id) DO UPDATE SET status='COMPLETED', completed_at=COALESCE(learning_lesson_progress.completed_at,NOW()), updated_at=NOW()`, [uid, c.id, l.id]);
        const after = await stateOf(uid, c.id, ls.length); let cert = null; let fresh = false;
        const finished = after.done.length >= ls.length && ls.length > 0;
        await pool.query(`UPDATE user_course_enrollments SET progress=$3::int, status=$4::varchar, completed_at=CASE WHEN $4::varchar='COMPLETED' THEN COALESCE(completed_at,NOW()) ELSE completed_at END, updated_at=NOW() WHERE user_id=$1 AND course_id=$2`, [uid, c.id, after.progress, finished ? 'COMPLETED' : 'IN_PROGRESS']);
        if (finished && c.certificate_enabled !== false) {
          const ins = await pool.query(`INSERT INTO user_learning_certificates(user_id,course_id,certificate_code,issued_by) VALUES($1,$2,$3,'HOWDI Learn & Earn') ON CONFLICT(user_id,course_id) DO NOTHING RETURNING id`, [uid, c.id, 'HOWDI-' + crypto.randomBytes(5).toString('hex').toUpperCase()]);
          fresh = Boolean(ins.rows[0]); cert = await certOf(uid, c.id);
          if (fresh) {
            await notify(uid, 'LEARN_CERTIFICATE', `Certificate earned: ${line(c.title, 60)} 🎓`, 'You completed every lesson. Share or verify it any time.', '/learn/mine', null);
            if (c.v8_teacher_user_id) { const me = (await pool.query(`SELECT public_username FROM howdi_connect_profiles WHERE user_id=$1`, [uid])).rows[0]; await notify(Number(c.v8_teacher_user_id), 'LEARN_COMPLETED', `@${me?.public_username || 'A learner'} completed “${line(c.title, 60)}”`, 'A certificate was issued.', `/learn/teach/${await code('LCRS', c.id)}`, null); }
          }
        }
        ok(res, { done: true, progress: after.progress, completed: finished, certificate: cert, certificate_new: fresh, next: i < ls.length - 1 ? lc.get(String(ls[i + 1].id)) : null }); return true;
      }
    }
    if (!uid) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in first.'); return true; }
    if (p === '/api/v8/learn/me' && req.method === 'GET') {
      const rows = (await pool.query(`SELECT c.* FROM learning_course_entitlements e JOIN learning_courses c ON c.id=e.course_id WHERE e.user_id=$1 AND e.entitlement_status='ACTIVE' AND c.is_active ORDER BY e.updated_at DESC LIMIT 60`, [uid])).rows;
      const items = await Promise.all(rows.map(async (c) => ({ ...(await courseCard(c, uid)), certificate: await certOf(uid, c.id) })));
      ok(res, { active: items.filter((x) => !x.certificate), completed: items.filter((x) => x.certificate), teacher: await isTeacher(uid) }); return true;
    }
    // ------------------------------------------------ teacher workspace
    if (p.startsWith('/api/v8/learn/teach')) {
      if (!(await isTeacher(uid))) { fail(res, 403, 'TEACHER_ROLE_REQUIRED', 'Apply as a Teacher first. HOWDI approves each teacher.'); return true; }
      if (p === '/api/v8/learn/teach' && req.method === 'GET') {
        const rows = (await pool.query(`SELECT * FROM learning_courses WHERE v8_teacher_user_id=$1 AND is_active ORDER BY created_at DESC`, [uid])).rows;
        const items = await Promise.all(rows.map(async (c) => ({ ...(await courseCard(c, null)), status: c.publish_status === 'PUBLISHED' ? 'published' : 'draft',
          completed: Number((await pool.query(`SELECT COUNT(*) n FROM user_learning_certificates WHERE course_id=$1`, [c.id])).rows[0].n),
          earned: money((await pool.query(`SELECT COALESCE(SUM(amount),0) s FROM howdi_v8_learn_payments WHERE course_id=$1`, [c.id])).rows[0].s) })));
        ok(res, { items, categories: CATEGORIES, levels: LEVELS }); return true;
      }
      if (p === '/api/v8/learn/teach/courses' && req.method === 'POST') {
        const b = await getBody(req).catch(() => ({}));
        const title = line(b.title, 120); const lessons = (Array.isArray(b.lessons) ? b.lessons : []).slice(0, 30).map((x) => ({ title: line(x?.title, 120), body: text(x?.body, 4000), minutes: Math.max(1, Math.min(240, Number(x?.minutes) || 5)), tip: line(x?.tip, 300) || null, practice: line(x?.practice, 300) || null })).filter((x) => x.title && x.body);
        const price = Math.round(Number(b.price) || 0);
        const bad = [!title && 'title', !CATEGORIES.includes(b.category) && 'category', !LEVELS.includes(b.level) && 'level', !(price >= 0 && price <= 20000) && 'price (₹0–₹20,000)', !lessons.length && 'at least one lesson with text'].filter(Boolean);
        if (bad.length) { fail(res, 400, 'INVALID_COURSE', `Add ${bad.join(', ')}.`); return true; }
        const client = await pool.connect(); let cid;
        try {
          await client.query('BEGIN');
          cid = (await client.query(`INSERT INTO learning_courses(title,description,category,level,duration_minutes,tagline,language,publish_status,price,purchase_mode,v8_teacher_user_id,outcomes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb) RETURNING id`,
            [title, text(b.description, 2000) || null, b.category, b.level, lessons.reduce((s, x) => s + x.minutes, 0), line(b.tagline, 200) || null, line(b.language, 40) || 'English', b.publish ? 'PUBLISHED' : 'DRAFT', price, price > 0 ? 'PAID' : 'FREE', uid,
              JSON.stringify((Array.isArray(b.outcomes) ? b.outcomes : []).map((x) => line(x, 140)).filter(Boolean).slice(0, 6))])).rows[0].id;
          const mid = (await client.query(`INSERT INTO learning_course_modules(course_id,title,sort_order) VALUES($1,'Lessons',0) RETURNING id`, [cid])).rows[0].id;
          for (let k = 0; k < lessons.length; k++) { const x = lessons[k]; await client.query(`INSERT INTO learning_course_lessons(module_id,title,lesson_type,content_text,duration_minutes,grandma_tip,practice_task,sort_order,is_preview) VALUES($1,$2,'TEXT',$3,$4,$5,$6,$7,$8)`, [mid, x.title, x.body, x.minutes, x.tip, x.practice, k, k === 0]); }
          await client.query('COMMIT');
        } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
        ok(res, { course: await courseCard((await pool.query(`SELECT * FROM learning_courses WHERE id=$1`, [cid])).rows[0], null), status: b.publish ? 'published' : 'draft' }, 201); return true;
      }
      if ((m = p.match(/^\/api\/v8\/learn\/teach\/courses\/(CRS-[0-9A-F]{12})(?:\/(publish|unpublish))?$/))) {
        const cid = await key(m[1], 'LCRS'); const c = cid ? (await pool.query(`SELECT * FROM learning_courses WHERE id=$1 AND v8_teacher_user_id=$2 AND is_active`, [cid, uid])).rows[0] : null;
        if (!c) { fail(res, 404, 'NOT_FOUND', 'Not your course.'); return true; }
        if (m[2] && req.method === 'POST') { await pool.query(`UPDATE learning_courses SET publish_status=$2, updated_at=NOW() WHERE id=$1`, [c.id, m[2] === 'publish' ? 'PUBLISHED' : 'DRAFT']); ok(res, { status: m[2] === 'publish' ? 'published' : 'draft' }); return true; }
        if (!m[2] && req.method === 'GET') {
          const n = (await lessonsOf(c.id)).length;
          const rows = (await pool.query(`SELECT e.created_at, (SELECT COUNT(*) FROM learning_lesson_progress lp WHERE lp.user_id=e.user_id AND lp.course_id=e.course_id AND lp.status='COMPLETED') done, cert.certificate_code, ${authorCols('e.user_id', 'l_')}
            FROM learning_course_entitlements e ${authorJoins('e.user_id', 'l_')} LEFT JOIN user_learning_certificates cert ON cert.user_id=e.user_id AND cert.course_id=e.course_id WHERE e.course_id=$1 AND e.entitlement_status='ACTIVE' ORDER BY e.created_at DESC LIMIT 200`, [c.id])).rows;
          ok(res, { course: { ...(await courseCard(c, null)), status: c.publish_status === 'PUBLISHED' ? 'published' : 'draft' }, learners: rows.map((r) => ({ learner: authorDto(r, 'l_'), joined_at: iso(r.created_at), progress: n ? Math.round((100 * Number(r.done)) / n) : 0, completed: Boolean(r.certificate_code) })) }); return true;
        }
      }
      fail(res, 404, 'NOT_FOUND', 'Not found.'); return true;
    }
    // ------------------------------------------------ role applications (teacher / institute / startup)
    if ((m = p.match(/^\/api\/v8\/roles\/(teacher|institute|startup)\/application(?:\/(submit))?$/))) {
      const role = m[1]; const F = ROLE_FORMS[role];
      let a = (await pool.query(`SELECT * FROM howdi_v8_role_apps WHERE user_id=$1 AND role=$2 ORDER BY id DESC LIMIT 1`, [uid, role])).rows[0] || null;
      if (req.method === 'GET' && !m[2]) { ok(res, { application: a ? await appDto(a, false) : null, form: formMeta(role) }); return true; }
      if (req.method === 'PUT' && !m[2]) {
        if (a && !['draft', 'info_requested', 'rejected'].includes(a.status)) { fail(res, 409, 'INVALID_STATE', a.status === 'approved' ? 'You’re already approved.' : 'Your application is with HOWDI now.'); return true; }
        const b = await getBody(req).catch(() => ({})); const f = {};
        for (const [k, max] of Object.entries(F.fields)) if (b[k] !== undefined && b[k] !== null) f[k] = line(String(b[k]), max);
        const err = validate(role, f, false); if (err) { fail(res, 400, 'INVALID_FIELD', err); return true; }
        if (!a || a.status === 'rejected') a = (await pool.query(`INSERT INTO howdi_v8_role_apps(user_id,role,fields,declaration) VALUES($1,$2,$3::jsonb,$4) RETURNING *`, [uid, role, JSON.stringify({ ...(a?.fields || {}), ...f }), b.declaration === true])).rows[0];
        else a = (await pool.query(`UPDATE howdi_v8_role_apps SET fields=fields||$2::jsonb, declaration=$3, updated_at=NOW() WHERE id=$1 RETURNING *`, [a.id, JSON.stringify(f), b.declaration === true])).rows[0];
        ok(res, { application: await appDto(a, false), form: formMeta(role) }); return true;
      }
      if (m[2] === 'submit' && req.method === 'POST') {
        if (!a || !['draft', 'info_requested'].includes(a.status)) { fail(res, 409, 'INVALID_STATE', 'Nothing to submit.'); return true; }
        const miss = missing(role, a); if (miss.length) { fail(res, 400, 'INCOMPLETE', `Add ${miss.join(', ')}.`); return true; }
        await pool.query(`UPDATE howdi_v8_role_apps SET status='submitted', submitted_at=NOW(), review_note=NULL, updated_at=NOW() WHERE id=$1`, [a.id]);
        await pool.query(`INSERT INTO howdi_v8_role_app_events(app_id,actor,action) VALUES($1,'member',$2)`, [a.id, a.status === 'info_requested' ? 'resubmitted' : 'submitted']);
        await pool.query(`INSERT INTO user_roles(user_id,role_id,is_primary,role_status,requested_at,onboarding_state,rejection_reason) SELECT $1,id,FALSE,'PENDING',NOW(),'SUBMITTED',NULL FROM roles WHERE code=$2
          ON CONFLICT(user_id,role_id) DO UPDATE SET role_status=CASE WHEN user_roles.role_status='ACTIVE' THEN 'ACTIVE' ELSE 'PENDING' END, onboarding_state='SUBMITTED', rejection_reason=NULL, requested_at=NOW(), updated_at=NOW()`, [uid, F.code]);
        await notify(uid, 'ROLE_APP_SUBMITTED', `${F.label} application received`, 'HOWDI usually reviews within 2 working days.', `/me/apply/${role}`, null);
        ok(res, { application: await appDto((await pool.query(`SELECT * FROM howdi_v8_role_apps WHERE id=$1`, [a.id])).rows[0], false) }); return true;
      }
    }
    return false;
  }

  function formMeta(role) { return { role, label: ROLE_FORMS[role].label, required: ROLE_FORMS[role].required, org_types: ORG_TYPES, stages: STAGES, categories: CATEGORIES }; }
  function validate(role, f) {
    if (f.pin_code && !/^\d{6}$/.test(f.pin_code)) return 'PIN code must be 6 digits.';
    if (f.registration_last4 && !/^[A-Z0-9]{4}$/i.test(f.registration_last4)) return 'Enter only the last 4 characters of the registration number.';
    if (f.experience_years && !/^\d{1,2}$/.test(f.experience_years)) return 'Experience must be in years (0–99).';
    if (f.seats && !/^\d{1,5}$/.test(f.seats)) return 'Seats must be a number.';
    if (f.org_type && !ORG_TYPES.includes(f.org_type)) return 'Choose an organisation type.';
    if (f.stage && !STAGES.includes(f.stage)) return 'Choose a stage.';
    if (f.website && !/^https:\/\/[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(f.website)) return 'Website must start with https://';
    return null;
  }
  const missing = (role, a) => [...ROLE_FORMS[role].required.filter((k) => !String(a.fields?.[k] || '').trim()).map((k) => k.replace(/_/g, ' ')), ...(a.declaration ? [] : ['declaration'])];
  async function appDto(a, admin) {
    const ev = (await pool.query(`SELECT actor, admin_username, action, reason, at FROM howdi_v8_role_app_events WHERE app_id=$1 ORDER BY id`, [a.id])).rows;
    const d = { public_key: await code('RAPP', a.id), role: a.role, label: ROLE_FORMS[a.role].label, status: a.status, editable: ['draft', 'info_requested', 'rejected'].includes(a.status),
      note: ['info_requested', 'rejected'].includes(a.status) ? a.review_note : null, fields: a.fields || {}, declaration: a.declaration, missing: missing(a.role, a),
      submitted_at: iso(a.submitted_at), decided_at: iso(a.decided_at), open_route: a.status === 'approved' ? ROLE_FORMS[a.role].route : null,
      history: ev.map((e) => ({ actor: e.actor === 'admin' ? (admin ? `admin · ${e.admin_username || ''}` : 'HOWDI') : 'you', action: e.action, reason: e.reason, at: iso(e.at) })) };
    if (admin) {
      const u = (await pool.query(`SELECT bu.full_name, bu.created_at, ${authorCols('bu.id', 'a_')} FROM users bu ${authorJoins('bu.id', 'a_')} WHERE bu.id=$1`, [a.user_id])).rows[0];
      d.applicant = u ? { ...authorDto(u, 'a_'), legal_name: u.full_name, member_since: iso(u.created_at) } : null; d.reject_templates = ROLE_FORMS[a.role].templates;
    }
    return d;
  }

  async function admin(req, res, url, p) {
    const session = req.howdiAdminSession || null; const who = session?.username || 'admin-token'; let m;
    if (p === '/api/admin/v8/roles/applications' && req.method === 'GET') {
      const role = ROLE_FORMS[url.searchParams.get('role')] ? url.searchParams.get('role') : null;
      const status = ['submitted', 'info_requested', 'approved', 'rejected'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : 'submitted';
      const rows = (await pool.query(`SELECT * FROM howdi_v8_role_apps WHERE status=$1 AND ($2::text IS NULL OR role=$2) ORDER BY submitted_at ${status === 'submitted' ? 'ASC' : 'DESC'} NULLS LAST LIMIT 100`, [status, role])).rows;
      const counts = Object.fromEntries((await pool.query(`SELECT status s, COUNT(*) n FROM howdi_v8_role_apps WHERE ($1::text IS NULL OR role=$1) GROUP BY 1`, [role])).rows.map((r) => [r.s, Number(r.n)]));
      await auditAdmin(req, session, 'V8_ROLE_APPS_LIST', { role, status }); ok(res, { status, role, counts, items: await Promise.all(rows.map((a) => appDto(a, true))) }); return true;
    }
    if ((m = p.match(/^\/api\/admin\/v8\/roles\/applications\/(RAP-[0-9A-F]{12})(?:\/(decide))?$/))) {
      const id = await key(m[1], 'RAPP'); const a = id ? (await pool.query(`SELECT * FROM howdi_v8_role_apps WHERE id=$1`, [id])).rows[0] : null;
      if (!a) { fail(res, 404, 'NOT_FOUND', 'Application not found.'); return true; }
      if (!m[2] && req.method === 'GET') { await auditAdmin(req, session, 'V8_ROLE_APP_VIEW', { application: m[1] }); ok(res, { application: await appDto(a, true) }); return true; }
      if (m[2] && req.method === 'POST') {
        const b = await getBody(req).catch(() => ({})); const decision = b.decision; const reason = line(b.reason || '', 600);
        if (!['approve', 'reject', 'request_info'].includes(decision)) { fail(res, 400, 'INVALID_DECISION', 'Choose approve, reject or request info.'); return true; }
        if (decision !== 'approve' && reason.length < 5) { fail(res, 400, 'REASON_REQUIRED', 'Give the applicant a clear reason.'); return true; }
        const F = ROLE_FORMS[a.role]; const uid = Number(a.user_id);
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const lock = (await client.query(`SELECT status FROM howdi_v8_role_apps WHERE id=$1 FOR UPDATE`, [a.id])).rows[0];
          if (lock.status !== 'submitted') { await client.query('ROLLBACK'); fail(res, 409, 'INVALID_STATE', `This application is ${lock.status.replace('_', ' ')}.`); return true; }
          const ns = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'info_requested';
          await client.query(`UPDATE howdi_v8_role_apps SET status=$2, review_note=$3, decided_at=NOW(), decided_by=$4, updated_at=NOW() WHERE id=$1`, [a.id, ns, reason || null, who]);
          await client.query(`INSERT INTO user_roles(user_id,role_id,is_primary,role_status,requested_at,decided_at,onboarding_state,rejection_reason) SELECT $1,id,FALSE,$2,NOW(),NOW(),$3,$4 FROM roles WHERE code=$5
            ON CONFLICT(user_id,role_id) DO UPDATE SET role_status=$2, decided_at=NOW(), onboarding_state=$3, rejection_reason=$4, updated_at=NOW()`,
          [uid, decision === 'approve' ? 'ACTIVE' : decision === 'reject' ? 'REJECTED' : 'PENDING', decision === 'approve' ? 'COMPLETE' : decision === 'reject' ? 'REJECTED' : 'INFO_REQUESTED', decision === 'approve' ? null : reason, F.code]);
          await client.query(`INSERT INTO howdi_v8_role_app_events(app_id,actor,admin_username,action,reason) VALUES($1,'admin',$2,$3,$4)`, [a.id, who, ns, reason || null]);
          await client.query('COMMIT');
        } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
        await auditAdmin(req, session, 'V8_ROLE_APP_DECISION', { application: m[1], role: a.role, decision, reason: reason || null });
        if (decision === 'approve') await notify(uid, 'ROLE_APP_APPROVED', `You’re now a HOWDI ${F.label} 🎉`, a.role === 'teacher' ? 'Create your first course in Learn & Earn.' : 'Your role is active on your HOWDI account.', F.route, null);
        else if (decision === 'reject') await notify(uid, 'ROLE_APP_REJECTED', `Your ${F.label} application wasn’t approved`, `${reason} You can fix this and apply again.`, `/me/apply/${a.role}`, null);
        else await notify(uid, 'ROLE_APP_INFO', `HOWDI needs more information (${F.label})`, reason, `/me/apply/${a.role}`, null);
        ok(res, { application: await appDto((await pool.query(`SELECT * FROM howdi_v8_role_apps WHERE id=$1`, [a.id])).rows[0], true) }); return true;
      }
    }
    return false;
  }

  // role status for /api/v8/me/roles (used by vendor-v8)
  async function roleStatus(uid) {
    const out = {};
    for (const role of Object.keys(ROLE_FORMS)) {
      const a = (await pool.query(`SELECT status, review_note FROM howdi_v8_role_apps WHERE user_id=$1 AND role=$2 ORDER BY id DESC LIMIT 1`, [uid, role])).rows[0];
      if (a) out[ROLE_FORMS[role].code] = { status: { draft: 'draft', submitted: 'pending', info_requested: 'action_needed', rejected: 'rejected', approved: 'active' }[a.status], reason: ['info_requested', 'rejected'].includes(a.status) ? a.review_note : null };
    }
    const learner = (await pool.query(`SELECT 1 FROM learning_course_entitlements WHERE user_id=$1 AND entitlement_status='ACTIVE' LIMIT 1`, [uid])).rows[0];
    if (learner) out.LEARNER = { status: 'active', reason: null };
    return out;
  }
  return { ensureSchema, handle, _internal: { roleStatus, CATEGORIES } };
}
module.exports = { createLearnV8 };
