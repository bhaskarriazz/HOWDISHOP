'use strict';
// =====================================================================================
// HOWDI V8 — Learn Experience (P8): Today's Next Step + Project Journey (LRN-PROG-001), Materials Checklist (LRN-MAT-001),
// Show My Work + teacher feedback/retry (LRN-WORK-001). Ready to Sell (LRN-SELL-001) uses the existing vendor draft API
// from the client; this module only reports whether the learner's work was accepted.
//   learner: GET /api/v8/learn/next-step
//            GET|PUT /api/v8/learn/courses/{CRS}/materials          (checklist of the course's own materials list)
//            GET|POST /api/v8/learn/courses/{CRS}/work              (entitled learner: own submissions / submit photo or clip)
//            GET /api/v8/learn/work/{EVD}/media                     (owner learner or the course's teacher only)
//   teacher: GET /api/v8/learn/teach/courses/{CRS}/work · POST /api/v8/learn/teach/work/{EVD}/review {decision, feedback}
// Server is the authority for progress, milestones and evidence status. Evidence media is stored outside the public media
// folder and only streamed through an authorised call. Only public codes (CRS/LSN/EVD) and @handles leave the server.
// =====================================================================================
const taxonomy = require('./learn-taxonomy-v8.cjs');
const MAX_ATTEMPTS = 3;
// Show My Work lifecycle (one row per share): submitted → accepted | revision. A revision allows a new share (next attempt) until
// MAX_ATTEMPTS; nothing follows acceptance. Every transition is written to howdi_v8_learn_work_events in the same transaction
// (who acted, as learner or teacher, and what), so decisions stay auditable after the row changes.
const WORK_STATUSES = ['submitted', 'revision', 'accepted'];

function createLearnJourneyV8(deps) {
  const { pool, getBody, notify, H, M, key, code, lessonsOf, stateOf, certOf, courseCard } = deps;
  const { ok, fail } = H; const { line, text, iso } = M;

  async function ensureSchema() {
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_learn_materials(user_id BIGINT NOT NULL, course_id UUID NOT NULL, item VARCHAR(120) NOT NULL, owned BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id, course_id, item))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_learn_work(id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, course_id UUID NOT NULL, attempt INT NOT NULL,
      media_file VARCHAR(64) NOT NULL, media_type VARCHAR(8) NOT NULL, note VARCHAR(600), status VARCHAR(12) NOT NULL DEFAULT 'submitted', feedback VARCHAR(1000),
      reviewed_by BIGINT, reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id, course_id, attempt))`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_learn_work_course ON howdi_v8_learn_work(course_id, status, created_at DESC)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS howdi_v8_learn_work_events(id BIGSERIAL PRIMARY KEY, work_id BIGINT NOT NULL, actor_user_id BIGINT NOT NULL, actor VARCHAR(8) NOT NULL,
      action VARCHAR(12) NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE INDEX IF NOT EXISTS howdi_v8_learn_work_events_work ON howdi_v8_learn_work_events(work_id, id)`);
  }

  const entitled = async (uid, courseId) => Boolean((await pool.query(`SELECT 1 FROM learning_course_entitlements WHERE user_id=$1 AND course_id=$2 AND entitlement_status='ACTIVE'`, [uid, courseId])).rows[0]);
  const materialsOf = (c) => (Array.isArray(c.materials) ? c.materials.filter((x) => typeof x === 'string' && x.trim()).map((x) => line(x, 120)).slice(0, 12) : []);
  const handleOf = async (uid) => (await pool.query(`SELECT public_username FROM howdi_connect_profiles WHERE user_id=$1`, [uid])).rows[0]?.public_username || null;

  async function workDto(w, { forTeacher = false } = {}) {
    const evd = await code('LEVD', w.id);
    const d = { public_key: evd, attempt: Number(w.attempt), status: WORK_STATUSES.includes(w.status) ? w.status : 'submitted', media_type: w.media_type === 'video' ? 'video' : 'image',
      media_route: `/api/v8/learn/work/${evd}/media`, note: w.note || null, feedback: w.feedback || null, submitted_at: iso(w.created_at), reviewed_at: iso(w.reviewed_at) };
    if (forTeacher) d.learner = { public_username: await handleOf(w.user_id) };
    return d;
  }
  async function workState(uid, c) {
    const rows = (await pool.query(`SELECT * FROM howdi_v8_learn_work WHERE user_id=$1 AND course_id=$2 ORDER BY attempt DESC`, [uid, c.id])).rows;
    const latest = rows[0] || null; const accepted = rows.some((r) => r.status === 'accepted');
    const canSubmit = !accepted && rows.length < MAX_ATTEMPTS && (!latest || latest.status === 'revision');
    return { rows, latest, accepted, canSubmit, attemptsLeft: accepted ? 0 : Math.max(0, MAX_ATTEMPTS - rows.length) };
  }
  async function materialsState(uid, c) {
    const items = materialsOf(c);
    const owned = new Set((await pool.query(`SELECT item FROM howdi_v8_learn_materials WHERE user_id=$1 AND course_id=$2 AND owned`, [uid, c.id])).rows.map((r) => r.item));
    return { items: items.map((name) => ({ name, owned: owned.has(name) })), ready: items.every((n) => owned.has(n)) };
  }

  // Project rule from learn-taxonomy-v8.cjs: the teacher's explicit answer decides; courses created before the question keep the
  // affirmative-evidence rule (project_required = TRUE or an active practice task). NULL / missing is never proof of a project.
  async function hasProject(c) {
    const needPractice = !c.v8_project_declared_at && c.project_required !== true;
    const practice = needPractice ? Boolean((await pool.query(`SELECT 1 FROM learning_course_lessons l JOIN learning_course_modules m ON m.id=l.module_id
      WHERE m.course_id=$1 AND l.is_active AND m.is_active AND COALESCE(TRIM(l.practice_task),'')<>'' LIMIT 1`, [c.id])).rows[0]) : false;
    return taxonomy.projectOf(c, practice).has;
  }
  const event = (db, workId, actorId, actor, action) => db.query(`INSERT INTO howdi_v8_learn_work_events(work_id, actor_user_id, actor, action) VALUES($1,$2,$3,$4)`, [workId, actorId, actor, action]);

  // Project Journey: every milestone is derived from verified server records (entitlement, lesson progress, evidence, certificate).
  async function journeyFor(uid, c) {
    const ls = await lessonsOf(c.id); const st = await stateOf(uid, c.id, ls.length); const cert = await certOf(uid, c.id);
    const mats = await materialsState(uid, c); const work = await workState(uid, c);
    const project = await hasProject(c); const certOn = c.certificate_enabled !== false;
    const half = Math.ceil(ls.length / 2);
    const m = [
      { key: 'joined', label: 'Joined the course', done: st.enrolled },
      ...(mats.items.length ? [{ key: 'materials', label: 'Materials ready', done: mats.ready, detail: `${mats.items.filter((x) => x.owned).length} of ${mats.items.length} ticked` }] : []),
      { key: 'first_lesson', label: 'First lesson done', done: st.done.length >= 1 },
      ...(ls.length > 2 ? [{ key: 'halfway', label: 'Halfway through the lessons', done: st.done.length >= half }] : []),
      { key: 'lessons', label: 'All lessons done', done: ls.length > 0 && st.done.length >= ls.length, detail: `${st.done.length} of ${ls.length} lessons` },
      ...(project ? [
        { key: 'shared', label: 'Shared your work', done: work.rows.length > 0 },
        { key: 'feedback', label: 'Teacher accepted your work', done: work.accepted, detail: work.latest ? { submitted: 'Waiting for your teacher', revision: 'Teacher asked for a revision', accepted: 'Accepted' }[work.latest.status] : null },
      ] : []),
      ...(certOn ? [{ key: 'certificate', label: 'Certificate earned', done: Boolean(cert) }] : []),
    ];
    const lc = ls.length ? await (async () => { const next = ls.find((l) => !st.done.includes(String(l.id))); return next ? { next, code: await code('LLSN', next.id) } : null; })() : null;
    // Today's next step: the first unfinished milestone becomes one concrete action.
    const firstOpen = m.find((x) => !x.done);
    let step = null;
    if (!firstOpen) step = { kind: 'done', title: 'Course complete', detail: cert ? `Certificate ${cert.code}` : 'Every step is done.' };
    else if (firstOpen.key === 'materials') step = { kind: 'materials', title: 'Get your materials ready', detail: firstOpen.detail };
    else if (['first_lesson', 'halfway', 'lessons'].includes(firstOpen.key) && lc) {
      const nl = lc.next; step = { kind: 'lesson', title: nl.title, detail: `${Number(nl.duration_minutes) || 0} min lesson`, lesson: lc.code };
    } else if (firstOpen.key === 'shared' || (firstOpen.key === 'feedback' && work.latest?.status === 'revision')) {
      step = work.latest?.status === 'revision'
        ? { kind: 'revise', title: 'Improve and share your work again', detail: `Teacher feedback is waiting · ${work.attemptsLeft} attempt${work.attemptsLeft === 1 ? '' : 's'} left` }
        : { kind: 'share', title: 'Share a photo or short clip of your project', detail: 'Your teacher will review it.' };
    } else if (firstOpen.key === 'feedback') step = { kind: 'wait', title: 'Your teacher is reviewing your work', detail: `Shared ${iso(work.latest?.created_at)?.slice(0, 10) || ''}`.trim() };
    else if (firstOpen.key === 'certificate') step = { kind: 'certificate', title: 'Finish the remaining lessons to earn your certificate', detail: null };
    return { milestones: m, step, progress: st.progress, done_count: st.done.length, lessons: ls.length };
  }

  async function handle(req, res, p, uid) {
    let m;
    if (p === '/api/v8/learn/next-step' && req.method === 'GET') {
      if (!uid) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in to see your next step.'); return true; }
      const rows = (await pool.query(`SELECT c.*, GREATEST(e.updated_at, COALESCE((SELECT MAX(lp.updated_at) FROM learning_lesson_progress lp WHERE lp.user_id=e.user_id AND lp.course_id=c.id), e.updated_at)) activity
        FROM learning_course_entitlements e JOIN learning_courses c ON c.id=e.course_id WHERE e.user_id=$1 AND e.entitlement_status='ACTIVE' AND c.is_active ORDER BY activity DESC NULLS LAST LIMIT 6`, [uid])).rows;
      const items = [];
      for (const c of rows) { const j = await journeyFor(uid, c); items.push({ course: await courseCard(c, uid), ...j }); }
      // Today's step should be something the learner can do now; waiting on a teacher is shown but not chosen first.
      const focus = items.find((x) => ['lesson', 'materials', 'share', 'revise'].includes(x.step?.kind)) || items.find((x) => x.step?.kind !== 'done') || items[0] || null;
      ok(res, { focus, others: items.filter((x) => x !== focus).slice(0, 5) }); return true;
    }
    if ((m = p.match(/^\/api\/v8\/learn\/courses\/(CRS-[0-9A-F]{12})\/(materials|work|journey)$/))) {
      if (!uid) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in first.'); return true; }
      const cid = await key(m[1], 'LCRS'); const c = cid ? (await pool.query(`SELECT * FROM learning_courses WHERE id=$1 AND is_active`, [cid])).rows[0] : null;
      const mine = c && Number(c.v8_teacher_user_id) === uid;
      if (!c || !(c.publish_status === 'PUBLISHED' || mine)) { fail(res, 404, 'NOT_FOUND', 'This course isn’t available.'); return true; }
      if (m[2] === 'journey' && req.method === 'GET') {
        if (!(await entitled(uid, c.id))) { fail(res, 403, 'NOT_ENROLLED', 'Join the course to see your journey.'); return true; }
        ok(res, await journeyFor(uid, c)); return true;
      }
      if (m[2] === 'materials') {
        if (req.method === 'GET') { const s = await materialsState(uid, c); ok(res, { ...s, estimate: Number(c.v8_materials_cost) > 0 ? Number(c.v8_materials_cost) : null }); return true; }
        if (req.method === 'PUT') {
          const b = await getBody(req).catch(() => ({})); const allowed = materialsOf(c);
          const owned = new Set((Array.isArray(b.owned) ? b.owned : []).map((x) => line(x, 120)).filter((x) => allowed.includes(x)));
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            await client.query(`DELETE FROM howdi_v8_learn_materials WHERE user_id=$1 AND course_id=$2`, [uid, c.id]);
            if (owned.size) await client.query(`INSERT INTO howdi_v8_learn_materials(user_id, course_id, item) SELECT $1, $2, x FROM unnest($3::text[]) x`, [uid, c.id, [...owned]]);
            await client.query('COMMIT');
          } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
          const s = await materialsState(uid, c); ok(res, { ...s, estimate: Number(c.v8_materials_cost) > 0 ? Number(c.v8_materials_cost) : null }); return true;
        }
      }
      if (m[2] === 'work') {
        if (!(await entitled(uid, c.id))) { fail(res, 403, 'NOT_ENROLLED', 'Join the course to share your work.'); return true; }
        if (!(await hasProject(c))) { fail(res, 409, 'NO_PROJECT', 'This course doesn’t include a project.'); return true; }
        if (req.method === 'GET') {
          const s = await workState(uid, c); const items = []; for (const r of s.rows) items.push(await workDto(r));
          ok(res, { items, can_submit: s.canSubmit, accepted: s.accepted, attempts_left: s.attemptsLeft, max_attempts: MAX_ATTEMPTS }); return true;
        }
        if (req.method === 'POST') {
          if (H.limited && H.limited(res, `v8-learn-work:${uid}`, 12, 3600000)) return true;
          const s = await workState(uid, c);
          if (!s.canSubmit) { fail(res, 409, s.accepted ? 'ALREADY_ACCEPTED' : s.latest?.status === 'submitted' ? 'AWAITING_REVIEW' : 'NO_ATTEMPTS_LEFT', s.accepted ? 'Your work is already accepted.' : s.latest?.status === 'submitted' ? 'Your teacher is still reviewing your last share.' : 'No attempts left for this course.'); return true; }
          const b = await getBody(req).catch(() => ({}));
          let saved; try { saved = H.savePrivate(b.mediaData, { maxImage: 5 * 1024 * 1024, maxVideo: 20 * 1024 * 1024 }); } catch (e) { fail(res, 400, e.code || 'MEDIA_INVALID', e.message || 'Add a photo or a short clip.'); return true; }
          // Row + audit event commit together. A concurrent share for the same attempt loses on UNIQUE(user, course, attempt):
          // it is refused like any second pending share and its stored file is removed, so no orphan evidence is kept.
          const client = await pool.connect(); let row;
          try {
            await client.query('BEGIN');
            row = (await client.query(`INSERT INTO howdi_v8_learn_work(user_id, course_id, attempt, media_file, media_type, note) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
              [uid, c.id, s.rows.length + 1, saved.file, saved.type === 'video' ? 'video' : 'image', line(b.note, 600) || null])).rows[0];
            await event(client, row.id, uid, 'learner', 'submitted');
            await client.query('COMMIT');
          } catch (e) {
            await client.query('ROLLBACK').catch(() => {}); if (H.deletePrivate) H.deletePrivate(saved.file);
            if (e && e.code === '23505') { fail(res, 409, 'AWAITING_REVIEW', 'Your teacher is still reviewing your last share.'); return true; }
            throw e;
          } finally { client.release(); }
          if (c.v8_teacher_user_id) await notify(Number(c.v8_teacher_user_id), 'LEARN_WORK_SHARED', `@${(await handleOf(uid)) || 'learner'} shared work for “${line(c.title, 50)}”`, 'Review it and leave feedback.', `/learn/teach/${m[1]}`, uid);
          ok(res, { item: await workDto(row) }, 201); return true;
        }
      }
    }
    if ((m = p.match(/^\/api\/v8\/learn\/work\/(EVD-[0-9A-F]{12})\/media$/)) && req.method === 'GET') {
      if (!uid) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in first.'); return true; }
      const wid = await key(m[1], 'LEVD');
      const w = wid ? (await pool.query(`SELECT w.*, c.v8_teacher_user_id FROM howdi_v8_learn_work w JOIN learning_courses c ON c.id=w.course_id WHERE w.id=$1`, [wid])).rows[0] : null;
      // Only the learner who shared it or that course's teacher; everyone else sees "not found".
      if (!w || !(Number(w.user_id) === uid || Number(w.v8_teacher_user_id) === uid)) { fail(res, 404, 'NOT_FOUND', 'Not found.'); return true; }
      const f = H.readPrivate(w.media_file); if (!f) { fail(res, 404, 'NOT_FOUND', 'Not found.'); return true; }
      // Same pattern as V8 private message media: an authorised JSON read (never a public URL), not cached.
      res.setHeader('Cache-Control', 'private, no-store');
      ok(res, { media: { type: w.media_type === 'video' ? 'video' : 'image', data: `data:${f.mime};base64,${f.buf.toString('base64')}` } }); return true;
    }
    if ((m = p.match(/^\/api\/v8\/learn\/teach\/courses\/(CRS-[0-9A-F]{12})\/work$/)) && req.method === 'GET') {
      if (!uid) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in first.'); return true; }
      const cid = await key(m[1], 'LCRS'); const c = cid ? (await pool.query(`SELECT * FROM learning_courses WHERE id=$1 AND v8_teacher_user_id=$2 AND is_active`, [cid, uid])).rows[0] : null;
      if (!c) { fail(res, 404, 'NOT_FOUND', 'Course not found.'); return true; }
      const rows = (await pool.query(`SELECT * FROM howdi_v8_learn_work WHERE course_id=$1 ORDER BY CASE status WHEN 'submitted' THEN 0 ELSE 1 END, created_at DESC LIMIT 100`, [c.id])).rows;
      const items = []; for (const r of rows) items.push(await workDto(r, { forTeacher: true }));
      ok(res, { items }); return true;
    }
    if ((m = p.match(/^\/api\/v8\/learn\/teach\/work\/(EVD-[0-9A-F]{12})\/review$/)) && req.method === 'POST') {
      if (!uid) { fail(res, 401, 'SIGN_IN_REQUIRED', 'Sign in first.'); return true; }
      const wid = await key(m[1], 'LEVD');
      const w = wid ? (await pool.query(`SELECT w.*, c.title, c.v8_teacher_user_id FROM howdi_v8_learn_work w JOIN learning_courses c ON c.id=w.course_id WHERE w.id=$1 AND c.is_active`, [wid])).rows[0] : null;
      if (!w || Number(w.v8_teacher_user_id) !== uid) { fail(res, 404, 'NOT_FOUND', 'Not found.'); return true; }
      if (w.status !== 'submitted') { fail(res, 409, 'ALREADY_REVIEWED', 'This share was already reviewed.'); return true; }
      // A learner who left the course (refund/removal) is no longer reviewed; their own share stays readable to them.
      if (!(await entitled(Number(w.user_id), w.course_id))) { fail(res, 409, 'NOT_ENROLLED', 'This learner is no longer in the course.'); return true; }
      const b = await getBody(req).catch(() => ({})); const decision = b.decision === 'accept' ? 'accepted' : b.decision === 'revise' ? 'revision' : null;
      const feedback = text(b.feedback, 1000);
      if (!decision) { fail(res, 400, 'INVALID_DECISION', 'Choose accept or ask for a revision.'); return true; }
      if (decision === 'revision' && !feedback) { fail(res, 400, 'FEEDBACK_REQUIRED', 'Tell the learner what to improve.'); return true; }
      const client = await pool.connect(); let r;
      try {
        await client.query('BEGIN');
        r = (await client.query(`UPDATE howdi_v8_learn_work SET status=$2, feedback=$3, reviewed_by=$4, reviewed_at=NOW() WHERE id=$1 AND status='submitted' RETURNING *`, [w.id, decision, feedback || null, uid])).rows[0];
        if (r) await event(client, r.id, uid, 'teacher', decision);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      if (!r) { fail(res, 409, 'ALREADY_REVIEWED', 'This share was already reviewed.'); return true; }
      const crs = await code('LCRS', w.course_id);
      await notify(Number(w.user_id), decision === 'accepted' ? 'LEARN_WORK_ACCEPTED' : 'LEARN_WORK_REVISION', decision === 'accepted' ? `Your work for “${line(w.title, 50)}” was accepted` : `Feedback on your work for “${line(w.title, 50)}”`,
        decision === 'accepted' ? 'Well done. You can prepare a Shop draft when you are ready.' : 'Your teacher suggested improvements. You can share again.', `/learn/courses/${crs}`, uid);
      ok(res, { item: await workDto(r, { forTeacher: true }) }); return true;
    }
    return false;
  }
  return { ensureSchema, handle, _internal: { journeyFor, workState, materialsState, MAX_ATTEMPTS } };
}
module.exports = { createLearnJourneyV8, MAX_ATTEMPTS };
