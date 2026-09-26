// K5A Home ↔ K5B Search parity (K5B verification observation 2): a course whose active, approved teacher has blocked the
// viewer (or whom the viewer blocked, or who is no longer active) must be hidden from that viewer's Home "Learn for You".
const L = require('../k5b-pg/lib.cjs');
const { check, finish } = L;
const LABEL = 'k5a 08 teacher-block parity';
const learnTitles = (r) => ((r.json?.sections?.learnRecommendations?.items) || []).map((x) => x.title);

(async () => {
  const started = await L.start(); check('server starts on a fresh database', started, L.serverLog().slice(-600));
  if (!started) return finish(LABEL);
  const viewer = await L.member('Parity Viewer', { username: 'parity_viewer' });
  const other = await L.member('Parity Other', { username: 'parity_other' });
  const t1 = await L.member('Teacher Blocker', { username: 'teacher_blocker' });
  const t2 = await L.member('Teacher Blocked', { username: 'teacher_blocked' });
  const t3 = await L.member('Teacher Gone', { username: 'teacher_gone', accountStatus: 'SUSPENDED' });
  const c1 = await L.course('Parity crochet one'); await L.teachCourse(t1, c1);
  const c2 = await L.course('Parity crochet two'); await L.teachCourse(t2, c2);
  const c3 = await L.course('Parity crochet three'); await L.teachCourse(t3, c3);
  const c4 = await L.course('Parity crochet open');
  await L.block(t1, viewer); await L.block(viewer, t2);
  const home = (m) => L.api('GET', '/api/connect/home?sections=learnRecommendations', { token: m && m.token });
  const vh = await home(viewer); const vt = learnTitles(vh);
  check('viewer Home hides the course of a teacher who blocked them', vh.status === 200 && !vt.includes('Parity crochet one'), vt);
  check('viewer Home hides the course of a teacher they blocked', !vt.includes('Parity crochet two'), vt);
  check('everyone’s Home hides a course whose teacher is no longer active', !vt.includes('Parity crochet three'), vt);
  check('an unrelated course is still shown', vt.includes('Parity crochet open'), vt);
  const ot = learnTitles(await home(other));
  check('another member still sees the blockers’ courses (block is per viewer)', ot.includes('Parity crochet one') && ot.includes('Parity crochet two') && !ot.includes('Parity crochet three'), ot);
  const gt = learnTitles(await home(null));
  check('guest Home: only the inactive teacher’s course is hidden', gt.includes('Parity crochet one') && gt.includes('Parity crochet two') && !gt.includes('Parity crochet three'), gt);
  const s = await L.s('parity crochet', 'types=course', { token: viewer.token });
  const st = (s.json?.results || []).map((x) => x.title).sort();
  check('K5B Search and K5A Home now agree for this viewer', JSON.stringify(st) === JSON.stringify([...vt].filter((x) => x.startsWith('Parity')).sort()), { search: st, home: vt });
  finish(LABEL);
})().catch((e) => { console.error(e); process.exit(1); });
