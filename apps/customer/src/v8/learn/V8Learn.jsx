import { initialForSearch } from "../../howdi-for/routes.js";
// HOWDI V8 LEARN & EARN — learner: catalogue → course → join (free, or HPay with PIN) → lessons (preview, progress, practice) →
// certificate (+ public verify) → My learning. Teacher (approved role): My courses (learners, completions, HPay earned),
// create + publish a course, see each learner's progress. Role applications: Teacher / Institute / Startup → HOWDI Admin.
// Routes: /learn/courses · /learn/courses/{CRS} · /learn/lessons/{LSN} · /learn/mine · /learn/certificates/{no}
//         /learn/teach · /learn/teach/{CRS} · /me/apply/(teacher|institute|startup)
import { useCallback, useEffect, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { useV8Ui } from "../V8System";
import { useApi, Sheet, Skel, Tabs, SignInCard, safeImg } from "../connect/common";
import { PinStep, inr, newKey } from "../connect/HPayUtilities";
import "../works/works.css";
import "../shop/shop.css";
import "./learn.css";
import PartnerApplication from "./PartnerApplication";

const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }) : "");
const Bar = ({ v }) => <span className="v8l-bar" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${v}%` }} /></span>;
const Who = ({ c }) => <span className="v8l-by">{c.by_howdi ? "HOWDI Learn" : c.teacher ? `@${c.teacher.public_username}` : ""}{c.teacher?.verified ? <V8Icon name="check" size={12} /> : null}</span>;

export default function V8Learn({ apiBase, getAuthHeaders, user, path, onNavigate, onRequireLogin }) {
  const api = useApi(apiBase, getAuthHeaders); const p = String(path || ""); let m;
  const need = (el) => (user ? el : <SignInCard title="Sign in to continue" message="Your courses, progress and certificates are saved to your HOWDI account." onSignIn={onRequireLogin} />);
  const apply = p.match(/^apply\/(teacher|institute|startup)$/);
  return (
    <div className="v8-page v8s v8l" id="v8-main">
      {!apply ? <nav className="v8s-top" aria-label="Learn & Earn"><button type="button" className="v8-link" onClick={() => onNavigate("courses")}>Courses</button><span /><button type="button" className="v8-btn" onClick={() => onNavigate("mine")}><V8Icon name="learn" size={16} />My learning</button><button type="button" className="v8-btn" onClick={() => onNavigate("teach")}><V8Icon name="star" size={16} />Teach</button><button type="button" className="v8-link" onClick={() => onNavigate("/learn/live")}>Live classes & Passport</button></nav> : null}
      {(m = p.match(/^courses\/(CRS-[0-9A-F]{12})$/)) ? <Course key={m[1]} api={api} code={m[1]} user={user} nav={onNavigate} onRequireLogin={onRequireLogin} />
        : (m = p.match(/^lessons\/(LSN-[0-9A-F]{12})$/)) ? <Lesson key={m[1]} api={api} code={m[1]} user={user} nav={onNavigate} onRequireLogin={onRequireLogin} />
          : (m = p.match(/^certificates\/([A-Z0-9-]{6,80})$/)) ? <Verify api={api} code={m[1]} nav={onNavigate} />
            : p === "mine" ? need(<Mine api={api} nav={onNavigate} />)
              : (m = p.match(/^teach\/(CRS-[0-9A-F]{12})$/)) ? need(<TeachCourse api={api} code={m[1]} nav={onNavigate} />)
                : p === "teach" ? need(<Teach api={api} nav={onNavigate} />)
                  : apply ? need(<RoleApply api={api} role={apply[1]} nav={onNavigate} />)
                    : <Catalog api={api} nav={onNavigate} />}
    </div>
  );
}

function Card({ c, nav }) {
  return (
    <button type="button" className="v8-card v8l-card" onClick={() => nav(`courses/${c.public_key}`)}>
      <span className="v8l-cover">{safeImg(c.image) ? <img src={c.image} alt="" /> : <V8Icon name="learn" size={30} />}<em>{c.free ? "Free" : inr(c.price)}</em></span>
      <b>{c.title}</b>{c.tagline ? <small>{c.tagline}</small> : null}
      <small><Who c={c} /> · {c.level} · {c.lessons} lessons · {c.minutes} min</small>
      {c.enrolled ? <span className="v8l-prog"><Bar v={c.progress} /><small>{c.progress}%</small></span> : <small className="v8c-muted">{c.learners} learner{c.learners === 1 ? "" : "s"}</small>}
    </button>
  );
}

function Catalog({ api, nav }) {
  const [q, setQ] = useState(initialForSearch); const [cat, setCat] = useState(""); const [d, setD] = useState(null);
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/learn/courses?q=${encodeURIComponent(q)}${cat ? `&category=${encodeURIComponent(cat)}` : ""}`); setD(r.ok ? r.json : { error: r.json.message, items: [] }); }, [api, q, cat]);
  useEffect(() => { const t = window.setTimeout(load, 250); return () => window.clearTimeout(t); }, [load]);
  return (<>
    <header className="v8l-hero"><h1>Learn a skill. Earn with it.</h1><p>Short, practical courses from verified HOWDI teachers. Every lesson you finish counts toward a certificate.</p>
      <label className="v8c-field v8l-search"><span className="v8-sr">Search courses</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search crochet, tailoring, cooking…" /></label></header>
    <div className="v8l-chips" role="list">{["", ...(d?.categories || [])].map((c) => <button key={c || "all"} type="button" role="listitem" className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c || "All"}</button>)}</div>
    {!d ? <Skel h={220} r={16} /> : d.error ? <p className="v8c-err">{d.error}</p> : !d.items.length ? <V8State icon="learn" title="No courses yet" message={q || cat ? "Try another search or category." : "Teachers are adding courses. Check back soon."} />
      : <div className="v8l-grid">{d.items.map((c) => <Card key={c.public_key} c={c} nav={nav} />)}</div>}
  </>);
}

function Course({ api, code, user, nav, onRequireLogin }) {
  const ui = useV8Ui(); const [c, setC] = useState(null); const [pay, setPay] = useState(false); const [key] = useState(newKey()); const [err, setErr] = useState("");
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/learn/courses/${code}`); setC(r.ok ? r.json.course : { error: r.json.message }); }, [api, code]);
  useEffect(() => { load(); }, [load]);
  if (!c) return <Skel h={360} r={16} />;
  if (c.error) return <V8State icon="learn" title="Course not found" message={c.error} actionLabel="All courses" onAction={() => nav("courses")} />;
  const join = async (pin) => {
    setErr(""); const r = await api("POST", `/api/v8/learn/courses/${code}/enroll`, { pin, idem_key: key });
    if (!r.ok) { if (["PIN_WRONG", "PIN_LOCKED"].includes(r.json.code)) return { code: r.json.code, message: r.json.message }; setErr(r.json.message); setPay(false); return null; }
    setPay(false); ui?.toast({ title: r.json.paid ? `Joined — ${inr(r.json.paid)} paid with HPay` : "You’ve joined the course" }); await load(); return null;
  };
  const start = () => { if (!user) { onRequireLogin?.(); return; } if (c.free) join(); else setPay(true); };
  return (<>
    <section className="v8-card v8l-course">
      <div className="v8l-cover big">{safeImg(c.image) ? <img src={c.image} alt="" /> : <V8Icon name="learn" size={44} />}</div>
      <div className="v8l-cinfo">
        <small className="v8l-cat">{c.category} · {c.level} · {c.language}</small>
        <h1>{c.title}</h1>{c.tagline ? <p className="v8l-tag">{c.tagline}</p> : null}
        <p>Taught by <Who c={c} /> · {c.lessons} lessons · {c.minutes} min · {c.learners} learner{c.learners === 1 ? "" : "s"}</p>
        {c.certificate ? <p className="v8l-certline"><V8Icon name="star" size={16} /> Completed — certificate <b>{c.certificate.code}</b> <button type="button" className="v8-link" onClick={() => nav(`certificates/${c.certificate.code}`)}>View</button></p>
          : c.enrolled ? <><span className="v8l-prog"><Bar v={c.progress} /><small>{c.done_count} of {c.lessons} lessons · {c.progress}%</small></span><button type="button" className="v8-btn v8-btn-primary" onClick={() => nav(`lessons/${c.next_lesson}`)}>{c.done_count ? "Continue" : "Start first lesson"}</button></>
            : c.is_mine ? <p className="v8c-muted">This is your course. <button type="button" className="v8-link" onClick={() => nav(`teach/${code}`)}>See learners</button></p>
              : <><p className="v8s-price"><b>{c.free ? "Free" : inr(c.price)}</b>{!c.free ? <small className="v8c-muted">HPay · Preview/Test</small> : null}</p><button type="button" className="v8-btn v8-btn-primary" onClick={start}>{c.free ? "Join free" : `Join for ${inr(c.price)}`}</button></>}
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      </div>
    </section>
    {c.description || c.outcomes.length ? <section className="v8-card v8w-block">{c.description ? <p>{c.description}</p> : null}{c.outcomes.length ? <><h3>You’ll learn to</h3><ul className="v8s-perks">{c.outcomes.map((o) => <li key={o}><V8Icon name="check" size={16} />{o}</li>)}</ul></> : null}</section> : null}
    <section className="v8-card v8w-block" aria-label="Lessons"><h3>Lessons</h3>
      {c.modules.map((m) => <ol key={m.title} className="v8l-lessons">{m.lessons.map((l, i) => <li key={l.public_key}><button type="button" disabled={l.locked} onClick={() => nav(`lessons/${l.public_key}`)}>
        <i className={l.done ? "done" : ""}>{l.done ? <V8Icon name="check" size={14} /> : i + 1}</i><span><b>{l.title}</b><small>{l.minutes} min{l.preview && !c.enrolled ? " · free preview" : ""}</small></span>{l.locked ? <V8Icon name="lock" size={16} /> : <V8Icon name="play" size={16} />}</button></li>)}</ol>)}
    </section>
    {pay ? <Sheet open title={`Join “${c.title}”`} onClose={() => setPay(false)}><PinStep api={api} amount={c.price} to={c.teacher ? `@${c.teacher.public_username}` : "HOWDI Learn"} onPay={join} onCancel={() => setPay(false)} label="Pay" /></Sheet> : null}
  </>);
}

function Lesson({ api, code, nav, onRequireLogin }) {
  const ui = useV8Ui(); const [l, setL] = useState(null); const [done, setDone] = useState(null);
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/learn/lessons/${code}`); setL(r.ok ? r.json.lesson : { error: r.json.message, code: r.json.code }); }, [api, code]);
  useEffect(() => { setDone(null); load(); }, [load]);
  if (!l) return <Skel h={360} r={16} />;
  if (l.error) return <V8State icon="lock" title="Lesson locked" message={l.error} actionLabel={l.code === "SIGN_IN_REQUIRED" ? "Sign in" : "Back"} onAction={() => (l.code === "SIGN_IN_REQUIRED" ? onRequireLogin?.() : window.history.back())} />;
  const complete = async () => { const r = await api("POST", `/api/v8/learn/lessons/${code}/complete`); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return; } setDone(r.json); setL((x) => ({ ...x, done: true, progress: r.json.progress })); if (!r.json.completed) ui?.toast({ title: `Lesson done · ${r.json.progress}%` }); };
  return (<>
    <section className="v8-card v8w-block v8l-lesson">
      <button type="button" className="v8-link" onClick={() => nav(`courses/${l.course.public_key}`)}>← {l.course.title}</button>
      <small className="v8c-muted">Lesson {l.number} of {l.of} · {l.minutes} min</small>
      <h1>{l.title}</h1>
      {l.media ? (/youtu/.test(l.media) ? <a className="v8-btn" href={l.media} target="_blank" rel="noreferrer noopener"><V8Icon name="play" size={16} />Watch the video</a> : <video src={l.media} controls playsInline className="v8l-video" />) : null}
      <div className="v8l-body">{String(l.body).split(/\n+/).map((t, i) => <p key={i}>{t}</p>)}</div>
      {l.tip ? <p className="v8l-tip"><V8Icon name="bulb" size={16} /> <b>Tip:</b> {l.tip}</p> : null}
      {l.practice ? <p className="v8l-practice"><V8Icon name="check" size={16} /> <b>Practice:</b> {l.practice}</p> : null}
      {l.can_complete ? <span className="v8l-prog"><Bar v={l.progress} /><small>Course {l.progress}%</small></span> : <p className="v8c-muted">Free preview. Join the course to track progress and earn the certificate.</p>}
    </section>
    {done?.completed ? <section className="v8-card v8w-block v8l-done" role="status"><V8Icon name="star" size={28} /><div><b>Course complete{done.certificate ? " — certificate earned 🎓" : ""}</b>{done.certificate ? <p>Certificate {done.certificate.code} · anyone can verify it.</p> : null}</div>{done.certificate ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => nav(`certificates/${done.certificate.code}`)}>View certificate</button> : null}</section> : null}
    <div className="v8w-row v8l-nav">
      <button type="button" className="v8-btn" disabled={!l.prev} onClick={() => nav(`lessons/${l.prev}`)}>Previous</button>
      {l.can_complete && !l.done ? <button type="button" className="v8-btn v8-btn-primary" onClick={complete}>Mark lesson done</button> : l.done ? <span className="v8m-state ok"><i />Done</span> : null}
      <button type="button" className="v8-btn" disabled={!l.next} onClick={() => nav(`lessons/${l.next}`)}>Next lesson</button>
    </div>
  </>);
}

function Verify({ api, code, nav }) {
  const [c, setC] = useState(null);
  useEffect(() => { api("GET", `/api/v8/learn/certificates/${code}`).then((r) => setC(r.ok ? r.json.certificate : { error: r.json.message })); }, [api, code]);
  if (!c) return <Skel h={260} r={16} />;
  if (c.error) return <V8State icon="alert" title="Certificate not found" message={c.error} actionLabel="Courses" onAction={() => nav("courses")} />;
  return (
    <section className="v8-card v8l-cert" aria-label="Certificate">
      <small>HOWDI LEARN & EARN · CERTIFICATE OF COMPLETION</small>
      <h1>{c.course}</h1>
      <p>awarded to <b>{c.learner ? `@${c.learner.public_username}` : "a HOWDI learner"}</b>{c.learner?.display_name ? ` (${c.learner.display_name})` : ""}</p>
      <p>Issued {day(c.issued_at)} · No. <b>{c.number}</b></p>
      <span className={`v8m-state ${c.status === "valid" ? "ok" : "bad"}`}><i />{c.status === "valid" ? "Valid — verified by HOWDI" : "Revoked"}</span>
      <button type="button" className="v8-btn" onClick={() => { try { navigator.clipboard.writeText(window.location.href); } catch { /* ignore */ } }}>Copy verify link</button>
    </section>
  );
}

function Mine({ api, nav }) {
  const [d, setD] = useState(null); const [tab, setTab] = useState("active");
  useEffect(() => { api("GET", "/api/v8/learn/me").then((r) => setD(r.ok ? r.json : { error: r.json.message })); }, [api]);
  if (!d) return <Skel h={260} r={16} />;
  if (d.error) return <p className="v8c-err">{d.error}</p>;
  const items = tab === "active" ? d.active : d.completed;
  return (<>
    <h1 className="v8l-h">My learning</h1>
    <Tabs tabs={[{ value: "active", label: "In progress", count: d.active.length }, { value: "done", label: "Completed", count: d.completed.length }]} value={tab} onChange={setTab} label="My learning" />
    {!items.length ? <V8State icon="learn" title={tab === "active" ? "No courses in progress" : "No certificates yet"} message={tab === "active" ? "Join a course to start learning." : "Finish every lesson in a course to earn its certificate."} actionLabel="Browse courses" onAction={() => nav("courses")} />
      : <div className="v8l-grid">{items.map((c) => <div key={c.public_key} className="v8l-mine"><Card c={c} nav={nav} />{c.certificate ? <button type="button" className="v8-btn" onClick={() => nav(`certificates/${c.certificate.code}`)}><V8Icon name="star" size={16} />Certificate {c.certificate.code}</button> : null}</div>)}</div>}
  </>);
}

// ------------------------------------------------------------------ teacher side
const blankLesson = () => ({ title: "", body: "", minutes: 10, tip: "", practice: "" });
function Teach({ api, nav }) {
  const ui = useV8Ui(); const [d, setD] = useState(null); const [open, setOpen] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: "", tagline: "", description: "", category: "", level: "beginner", price: 0, outcomes: "", lessons: [blankLesson()] });
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/learn/teach"); setD(r.ok ? r.json : { error: r.json.message, code: r.json.code }); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Skel h={260} r={16} />;
  if (d.code === "TEACHER_ROLE_REQUIRED") return <V8State icon="learn" title="Teach on HOWDI" message="Apply as a Teacher. HOWDI checks your skill and experience, then you can create courses and get paid in HPay." actionLabel="Apply as a teacher" onAction={() => nav("/me/apply/teacher")} />;
  if (d.error) return <p className="v8c-err">{d.error}</p>;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v })); const setL = (i, k, v) => setF((x) => ({ ...x, lessons: x.lessons.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const create = async (publish) => { setBusy(true); setErr(""); const r = await api("POST", "/api/v8/learn/teach/courses", { ...f, price: Number(f.price) || 0, outcomes: f.outcomes.split(/\n+/).filter(Boolean), publish }); setBusy(false); if (!r.ok) { setErr(r.json.message); return; } ui?.toast({ title: publish ? "Course published — learners can join now" : "Draft saved" }); setOpen(false); setF({ title: "", tagline: "", description: "", category: "", level: "beginner", price: 0, outcomes: "", lessons: [blankLesson()] }); load(); };
  const toggle = async (c) => { const r = await api("POST", `/api/v8/learn/teach/courses/${c.public_key}/${c.status === "published" ? "unpublish" : "publish"}`); if (r.ok) { ui?.toast({ title: r.json.status === "published" ? "Published" : "Unpublished — hidden from the catalogue" }); load(); } };
  return (<>
    <header className="v8l-teachhead"><div><h1 className="v8l-h">My courses</h1><p className="v8c-muted">Learners pay you in HPay (Preview/Test). You see each learner by @username only.</p></div><button type="button" className="v8-btn v8-btn-primary" onClick={() => setOpen(true)}><V8Icon name="learn" size={16} />New course</button></header>
    {!d.items.length ? <V8State icon="learn" title="No courses yet" message="Create your first course: a few short lessons with a tip and a practice task each." actionLabel="New course" onAction={() => setOpen(true)} />
      : <div className="v8-card v8w-block">{d.items.map((c) => <article key={c.public_key} className="v8me-order"><header><b>{c.title}</b><span className={`v8m-state ${c.status === "published" ? "ok" : "muted"}`}><i />{c.status === "published" ? "Published" : "Draft"}</span></header>
        <p className="v8c-muted">{c.category} · {c.lessons} lessons · {c.free ? "Free" : inr(c.price)} · {c.learners} learners · {c.completed} completed · earned {inr(c.earned)}</p>
        <div className="v8w-row"><button type="button" className="v8-btn v8-btn-primary" onClick={() => nav(`teach/${c.public_key}`)}>Learners</button><button type="button" className="v8-btn" onClick={() => toggle(c)}>{c.status === "published" ? "Unpublish" : "Publish"}</button>{c.status === "published" ? <button type="button" className="v8-btn" onClick={() => nav(`courses/${c.public_key}`)}>View as learner</button> : null}</div></article>)}</div>}
    {open ? <Sheet open title="New course" onClose={() => setOpen(false)}>
      <div className="v8l-form">
        <label className="v8c-field"><span>Title</span><input value={f.title} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Granny squares in a weekend" /></label>
        <label className="v8c-field"><span>One-line promise</span><input value={f.tagline} maxLength={200} onChange={(e) => set("tagline", e.target.value)} /></label>
        <div className="v8u-two"><label className="v8c-field"><span>Category</span><select value={f.category} onChange={(e) => set("category", e.target.value)}><option value="">Choose…</option>{d.categories.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="v8c-field"><span>Level</span><select value={f.level} onChange={(e) => set("level", e.target.value)}>{d.levels.map((c) => <option key={c}>{c}</option>)}</select></label></div>
        <label className="v8c-field"><span>Price (₹, 0 = free)</span><input inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, "").slice(0, 5))} /></label>
        <label className="v8c-field"><span>What learners will be able to do (one per line)</span><textarea rows={2} value={f.outcomes} onChange={(e) => set("outcomes", e.target.value)} /></label>
        {f.lessons.map((l, i) => <fieldset key={i} className="v8l-lessonf"><legend>Lesson {i + 1}{i === 0 ? " · free preview" : ""}</legend>
          <label className="v8c-field"><span>Lesson title</span><input value={l.title} onChange={(e) => setL(i, "title", e.target.value)} /></label>
          <label className="v8c-field"><span>Lesson text</span><textarea rows={3} value={l.body} onChange={(e) => setL(i, "body", e.target.value)} /></label>
          <div className="v8u-two"><label className="v8c-field"><span>Minutes</span><input inputMode="numeric" value={l.minutes} onChange={(e) => setL(i, "minutes", e.target.value.replace(/\D/g, "").slice(0, 3))} /></label><label className="v8c-field"><span>Tip (optional)</span><input value={l.tip} onChange={(e) => setL(i, "tip", e.target.value)} /></label></div>
          <label className="v8c-field"><span>Practice task (optional)</span><input value={l.practice} onChange={(e) => setL(i, "practice", e.target.value)} /></label>
          {f.lessons.length > 1 ? <button type="button" className="v8-link" onClick={() => set("lessons", f.lessons.filter((_, j) => j !== i))}>Remove lesson</button> : null}</fieldset>)}
        {f.lessons.length < 30 ? <button type="button" className="v8-btn" onClick={() => set("lessons", [...f.lessons, blankLesson()])}>Add lesson</button> : null}
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" disabled={busy} onClick={() => create(false)}>Save draft</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={() => create(true)}>Publish</button></div>
      </div></Sheet> : null}
  </>);
}

function TeachCourse({ api, code, nav }) {
  const [d, setD] = useState(null);
  useEffect(() => { api("GET", `/api/v8/learn/teach/courses/${code}`).then((r) => setD(r.ok ? r.json : { error: r.json.message })); }, [api, code]);
  if (!d) return <Skel h={260} r={16} />;
  if (d.error) return <V8State icon="learn" title="Course not found" message={d.error} actionLabel="My courses" onAction={() => nav("teach")} />;
  return (<>
    <button type="button" className="v8-link" onClick={() => nav("teach")}>← My courses</button>
    <section className="v8-card v8w-block"><h1 className="v8l-h">{d.course.title}</h1><p className="v8c-muted">{d.course.status === "published" ? "Published" : "Draft"} · {d.course.lessons} lessons · {d.learners.length} learners · {d.learners.filter((x) => x.completed).length} completed</p></section>
    <section className="v8-card v8w-block" aria-label="Learners"><h3>Learners</h3>
      {!d.learners.length ? <p className="v8c-muted">No learners yet. You’ll get a notification when someone joins.</p>
        : <ul className="v8l-learners">{d.learners.map((x, i) => <li key={i}><b>@{x.learner?.public_username || "learner"}</b><small>joined {day(x.joined_at)}</small><span className="v8l-prog"><Bar v={x.progress} /><small>{x.progress}%</small></span>{x.completed ? <span className="v8m-state ok"><i />Certificate issued</span> : null}</li>)}</ul>}
    </section>
  </>);
}

// ------------------------------------------------------------------ Teacher / Institute / Startup application
const FORMS = {
  teacher: { title: "Teach on HOWDI", intro: "Tell us what you teach. HOWDI checks every teacher before they can publish courses.", fields: [["skill", "What you teach", "e.g. Crochet"], ["experience_years", "Years of experience", "", "num"], ["languages", "Languages you teach in", "e.g. Telugu, English"], ["sample", "Teaching sample (link or short description)", ""], ["bio", "About you", "", "area"]] },
  institute: { title: "Register your institute or college", intro: "Verified institutes can offer courses and seats to learners. Only the last 4 characters of your registration number are stored.", fields: [["org_name", "Organisation name", ""], ["org_type", "Type", "", "org"], ["city", "City", ""], ["pin_code", "PIN code", "", "num"], ["registration_last4", "Registration no. (last 4)", "e.g. A123"], ["contact_role", "Your role there", "e.g. Principal"], ["seats", "Learner seats (optional)", "", "num"], ["about", "About (optional)", "", "area"]] },
  startup: { title: "Register your startup", intro: "Verified startups can find mentors, interns and first customers on HOWDI.", fields: [["startup_name", "Startup name", ""], ["stage", "Stage", "", "stage"], ["sector", "Sector", "e.g. Handloom marketplace"], ["city", "City", ""], ["website", "Website (https://…)", ""], ["looking_for", "What you’re looking for", "e.g. Mentors and interns"], ["about", "About (optional)", "", "area"]] },
};
const STATUS = { draft: ["muted", "Draft"], submitted: ["warn", "With HOWDI for review"], info_requested: ["bad", "Action needed"], approved: ["ok", "Approved"], rejected: ["bad", "Not approved"] };
function RoleApply({ api, role, nav }) {
  const ui = useV8Ui(); const F = FORMS[role]; const [a, setA] = useState(undefined); const [f, setF] = useState({}); const [decl, setDecl] = useState(false); const [err, setErr] = useState(""); const [meta, setMeta] = useState(null);
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/roles/${role}/application`); if (!r.ok) { setErr(r.json.message); setA(null); return; } setA(r.json.application); setMeta(r.json.form); setF(r.json.application?.fields || {}); setDecl(Boolean(r.json.application?.declaration)); }, [api, role]);
  useEffect(() => { load(); }, [load]);
  if (a === undefined) return <Skel h={300} r={16} />;
  const editable = !a || a.editable;
  const save = async () => { setErr(""); const r = await api("PUT", `/api/v8/roles/${role}/application`, { ...f, declaration: decl }); if (!r.ok) { setErr(r.json.message); return null; } setA(r.json.application); return r.json.application; };
  const submit = async () => { const s = await save(); if (!s) return; const r = await api("POST", `/api/v8/roles/${role}/application/submit`); if (!r.ok) { setErr(r.json.message); return; } setA(r.json.application); ui?.toast({ title: "Sent to HOWDI for review" }); };
  const input = ([k, label, ph, kind]) => (
    <label key={k} className="v8c-field"><span>{label}</span>
      {kind === "area" ? <textarea rows={3} value={f[k] || ""} disabled={!editable} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} placeholder={ph} />
        : kind === "org" ? <select value={f[k] || ""} disabled={!editable} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}><option value="">Choose…</option>{(meta?.org_types || []).map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}</select>
          : kind === "stage" ? <select value={f[k] || ""} disabled={!editable} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}><option value="">Choose…</option>{(meta?.stages || []).map((o) => <option key={o} value={o}>{o}</option>)}</select>
            : <input value={f[k] || ""} disabled={!editable} inputMode={kind === "num" ? "numeric" : undefined} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} placeholder={ph} />}
    </label>);
  const st = a ? STATUS[a.status] : null;
  if (role === "institute" || role === "startup") return <PartnerApplication key={role} role={role} fields={F.fields} values={f} renderInput={input} application={a} status={st} editable={editable} declaration={decl} onDeclaration={setDecl} error={err}
    onSave={async () => { if (await save()) ui?.toast({ title: "Saved" }); }} onSubmit={submit} onBack={() => nav("/me/roles")} formatDate={day} />;
  return (<>
    <button type="button" className="v8-link" onClick={() => nav("/me/roles")}>← My roles</button>
    <section className="v8-card v8w-block v8l-apply">
      <header className="v8l-teachhead"><div><h1 className="v8l-h">{F.title}</h1><p className="v8c-muted">{F.intro}</p></div>{st ? <span className={`v8m-state ${st[0]}`}><i />{st[1]}</span> : null}</header>
      {a?.note ? <p className={`v8me-ret`}><V8Icon name="alert" size={14} /> <b>HOWDI says:</b> {a.note}</p> : null}
      {a?.status === "approved" ? <div className="v8l-done"><V8Icon name="check" size={24} /><div><b>You’re approved as {a.label}.</b><p>This role is now active on your HOWDI account, next to your other roles.</p></div>{role === "teacher" ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => nav("teach")}>Create a course</button> : null}</div> : null}
      {a?.status === "submitted" ? <p className="v8me-hidden"><V8Icon name="timer" size={14} /> Submitted {day(a.submitted_at)}. HOWDI usually reviews within 2 working days. You’ll get a notification.</p> : null}
      <div className="v8l-form">{F.fields.map(input)}
        <label className="v8s-addr"><input type="checkbox" checked={decl} disabled={!editable} onChange={(e) => setDecl(e.target.checked)} />I confirm these details are true and I may be asked for proof.</label></div>
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      {editable ? <div className="v8w-row"><button type="button" className="v8-btn" onClick={async () => { if (await save()) ui?.toast({ title: "Saved" }); }}>Save</button><button type="button" className="v8-btn v8-btn-primary" onClick={submit}>{a?.status === "info_requested" ? "Resubmit" : "Submit for review"}</button></div> : null}
      {a?.history?.length ? <details className="v8w-timeline"><summary>History</summary><ol>{a.history.map((h, i) => <li key={i}><b>{h.action.replace("_", " ")}</b> <small>{h.actor} · {day(h.at)}</small>{h.reason ? <p>{h.reason}</p> : null}</li>)}</ol></details> : null}
    </section>
  </>);
}
