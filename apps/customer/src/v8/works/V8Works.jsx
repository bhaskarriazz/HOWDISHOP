// HOWDI V8 WORKS — boards V8__09 (Find a Worker, profile, availability, booking, payment, confirmed, completed, safety),
// V8__33 (consent before details are shared, Arrival & Job PIN, manage booking) and V8__20 (worker dashboard, see WorkerDesk).
// Routes (inside the Works pillar): "" / find · workers/{ref} · bookings · bookings/{BKG} · saved · safety · worker…
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, V8Confirm, useV8Ui } from "../V8System";
import { useApi, Ava, Sheet, Skel, Tabs, SignInCard, since } from "../connect/common";
import { PinStep, inr, newKey } from "../connect/HPayUtilities";
import "./works.css";

const WorkerDesk = lazy(() => import("./WorkerDesk"));
const BecomeWorker = lazy(() => import("./BecomeWorker"));
export const when = (iso) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""; };
export const STATE_LABEL = { requested: ["warn", "Waiting for the worker"], accepted: ["warn", "Accepted — confirm details"], confirmed: ["ok", "Confirmed"], en_route: ["ok", "On the way"], arrived: ["ok", "Arrived"], in_progress: ["ok", "Job in progress"], completed: ["warn", "Done — please confirm"], closed: ["ok", "Completed"], declined: ["bad", "Declined"], expired: ["muted", "Expired"], cancelled: ["muted", "Cancelled"], disputed: ["bad", "Issue reported"] };
export function StateChip({ state, worker }) {
  const s = worker ? ({ requested: ["warn", "New request"], accepted: ["warn", "Waiting for customer consent"], completed: ["warn", "Waiting for customer to confirm"] }[state] || STATE_LABEL[state]) : STATE_LABEL[state];
  return <span className={`v8m-state ${s ? s[0] : "muted"}`}><i />{s ? s[1] : state}</span>;
}
export function Stepper({ b }) {
  const labels = { requested: "Requested", accepted: "Accepted", confirmed: "Confirmed", en_route: "On the way", arrived: "Arrived", in_progress: "Job PIN · started", completed: "Done", closed: "Closed" };
  return <ol className="v8w-steps" aria-label="Booking progress">{b.steps.map((s) => <li key={s.key} className={s.done ? "done" : ""} aria-current={s.key === b.state ? "step" : undefined}><i />{labels[s.key]}</li>)}</ol>;
}
const Countdown = ({ to, label }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const left = Math.max(0, Date.parse(to) - now); const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  return <span className="v8w-count" role="timer" aria-live="off">{label} {m}:{String(s).padStart(2, "0")}</span>;
};

function parse(path) {
  const p = String(path || "").replace(/^\/+|\/+$/g, "");
  if (!p || p === "find" || p === "home") return { view: "find" };
  let m;
  if ((m = p.match(/^workers\/(@?[A-Za-z0-9._-]{3,64})$/))) return { view: "worker", ref: m[1] };
  if ((m = p.match(/^bookings\/(BKG-[0-9A-F]{12})$/))) return { view: "booking", code: m[1] };
  if (p === "bookings") return { view: "bookings" };
  if (p === "saved") return { view: "saved" };
  if (p === "safety") return { view: "safety" };
  if (p === "become") return { view: "become" };
  if (p.startsWith("worker")) return { view: "desk", sub: p.slice(7) };
  return { view: "find" };
}

export default function V8Works({ apiBase, getAuthHeaders, user, path, onNavigate, onRequireLogin, onOpenProfile, onOpenClassic }) {
  const api = useApi(apiBase, getAuthHeaders);
  const r = parse(path); const nav = useCallback((p) => onNavigate(p), [onNavigate]);
  const [me, setMe] = useState(null);
  useEffect(() => { if (!user) { setMe(null); return; } api("GET", "/api/v8/works/worker/me").then((x) => setMe(x.ok ? x.json : null)); }, [api, user]);
  const isWorker = Boolean(me?.worker);
  const tabs = [{ value: "find", label: "Find a worker" }, { value: "bookings", label: "My bookings" }, { value: "saved", label: "Saved" }, { value: "safety", label: "Safety" }, isWorker ? { value: "desk", label: "My work", count: me?.counts?.offers || undefined } : { value: "become", label: "Become a worker" }];
  const tabValue = ["worker", "booking"].includes(r.view) ? (r.view === "booking" ? "bookings" : "find") : r.view;
  const need = (el) => (user ? el : <SignInCard title="Sign in to use Works" message="Book verified local workers, track your bookings, and manage your work." onSignIn={onRequireLogin} />);
  return (
    <div className="v8-page v8w" id="v8-main">
      <header className="v8w-head">
        <div><span className="v8w-kicker">HOWDI Works</span><h1>{r.view === "desk" ? "My work" : "Find verified local workers"}</h1></div>
        <button type="button" className="v8-link" onClick={onOpenClassic}>Classic Works</button>
      </header>
      <Tabs tabs={tabs} value={tabValue} onChange={(v) => nav(v === "desk" ? "worker" : v)} label="Works" />
      {r.view === "find" ? <Find api={api} user={user} nav={nav} onRequireLogin={onRequireLogin} /> : null}
      {r.view === "worker" ? <WorkerProfile key={r.ref} api={api} user={user} refId={r.ref} nav={nav} onRequireLogin={onRequireLogin} onOpenProfile={onOpenProfile} /> : null}
      {r.view === "bookings" ? need(<MyBookings api={api} nav={nav} />) : null}
      {r.view === "booking" ? need(<BookingDetail key={r.code} api={api} code={r.code} nav={nav} />) : null}
      {r.view === "saved" ? need(<Saved api={api} nav={nav} />) : null}
      {r.view === "safety" ? <Safety nav={nav} /> : null}
      {r.view === "become" ? need(<Suspense fallback={<Skel h={300} />}><BecomeWorker api={api} nav={nav} reloadMe={() => api("GET", "/api/v8/works/worker/me").then((x) => setMe(x.ok ? x.json : null))} /></Suspense>) : null}
      {r.view === "desk" ? need(<Suspense fallback={<Skel h={200} />}><WorkerDesk api={api} me={me} sub={r.sub} nav={nav} reloadMe={() => api("GET", "/api/v8/works/worker/me").then((x) => setMe(x.ok ? x.json : null))} /></Suspense>) : null}
    </div>
  );
}

// ---------------------------------------------------------------- WRK-001 / 002 Find a worker
export function WorkerCard({ w, onOpen, onSave }) {
  return (
    <article className="v8-card v8w-card">
      <button type="button" className="v8w-card-main" onClick={() => onOpen(w)} aria-label={`${w.person.display_name}, ${w.service || "worker"}`}>
        <Ava src={w.person.avatar_url} name={w.person.display_name} size={56} />
        <span className="v8w-card-text">
          <b>{w.person.display_name} <V8Badges verified premium={w.person.premium} size="sm" /></b>
          <small>@{w.person.public_username}</small>
          <span className="v8w-card-svc">{w.service}{w.city ? ` · ${w.city}` : ""}</span>
          <span className="v8w-card-meta">{w.rating ? <><V8Icon name="star" size={14} /> {w.rating.toFixed(1)} ({w.reviews})</> : <em>New</em>} · {w.jobs} jobs</span>
        </span>
      </button>
      <div className="v8w-card-side">
        <span className={`v8w-presence ${w.presence}`}><i />{w.presence === "online" ? "Available" : w.presence === "busy" ? "Busy" : "Offline"}</span>
        {w.price_from != null ? <span className="v8w-price">from <b>{inr(w.price_from)}</b></span> : null}
        {onSave && !w.is_me ? <button type="button" className={`v8-icon-btn ${w.saved ? "on" : ""}`} aria-pressed={Boolean(w.saved)} aria-label={w.saved ? "Remove from saved" : "Save worker"} onClick={() => onSave(w)}><V8Icon name="bookmark" size={18} /></button> : null}
      </div>
    </article>
  );
}
function Find({ api, user, nav, onRequireLogin }) {
  const [services, setServices] = useState([]); const [svc, setSvc] = useState(""); const [q, setQ] = useState(""); const [sort, setSort] = useState("rating");
  const [d, setD] = useState({ status: "loading", items: [] });
  useEffect(() => { api("GET", "/api/v8/works/services").then((r) => r.ok && setServices(r.json.items || [])); }, [api]);
  const load = useCallback(async () => { setD((x) => ({ ...x, status: "loading" })); const r = await api("GET", `/api/v8/works/workers?sort=${sort}${svc ? `&service=${svc}` : ""}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`); setD(r.ok ? { status: "ready", items: r.json.items || [] } : { status: "error", items: [], message: r.json.message }); }, [api, svc, q, sort]);
  useEffect(() => { const t = window.setTimeout(load, q ? 300 : 0); return () => window.clearTimeout(t); }, [load, q]);
  const save = async (w) => { if (!user) { onRequireLogin(); return; } const r = await api("POST", `/api/v8/works/workers/${w.ref}/save`); if (r.ok) setD((x) => ({ ...x, items: x.items.map((y) => (y.ref === w.ref ? { ...y, saved: r.json.saved } : y)) })); };
  return (
    <section className="v8w-find">
      <div className="v8-card v8w-search">
        <label className="v8w-q"><V8Icon name="search" size={18} /><span className="v8-sr">What service do you need?</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What service do you need? e.g. plumber, tailor" /></label>
        <label className="v8w-sel"><span className="v8-sr">Sort</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="rating">Top rated</option><option value="jobs">Most jobs</option><option value="price">Lowest price</option></select></label>
      </div>
      <div className="v8c-chips v8w-svcs" role="group" aria-label="Services"><button type="button" className={`v8c-chip ${!svc ? "on" : ""}`} aria-pressed={!svc} onClick={() => setSvc("")}>All</button>{services.map((s) => <button key={s.code} type="button" className={`v8c-chip ${svc === s.code ? "on" : ""}`} aria-pressed={svc === s.code} onClick={() => setSvc(s.code)}>{s.name}{s.workers ? <small> {s.workers}</small> : null}</button>)}</div>
      <h2 className="v8w-h2">Verified workers near you</h2>
      {d.status === "loading" ? <div className="v8w-grid">{[0, 1, 2, 3].map((i) => <Skel key={i} h={110} r={16} />)}</div> : null}
      {d.status === "error" ? <V8State kind="error" title="Workers didn’t load" message={d.message} actionLabel="Retry" onAction={load} /> : null}
      {d.status === "ready" && !d.items.length ? <V8State icon="works" title={q || svc ? "No workers match" : "No verified workers yet"} message={q || svc ? "Try another service or clear the search." : "Verified workers appear here once HOWDI approves them."} actionLabel={q || svc ? "Clear filters" : undefined} onAction={() => { setQ(""); setSvc(""); }} /> : null}
      <div className="v8w-grid">{d.items.map((w) => <WorkerCard key={w.ref} w={w} onOpen={() => nav(`workers/${w.ref}`)} onSave={save} />)}</div>
      <p className="v8w-note"><V8Icon name="shield" size={16} /> Every worker here passed HOWDI identity and skill checks. Your address and phone stay private until you confirm a worker.</p>
    </section>
  );
}

// ---------------------------------------------------------------- WRK-003 profile + WRK-004 availability + WRK-005/006 booking
function WorkerProfile({ api, user, refId, nav, onRequireLogin, onOpenProfile }) {
  const ui = useV8Ui();
  const [d, setD] = useState({ status: "loading" }); const [book, setBook] = useState(false); const [sheet, setSheet] = useState("");
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/works/workers/${encodeURIComponent(refId)}`); setD(r.ok ? { status: "ready", ...r.json.worker } : { status: r.status === 404 ? "gone" : "error", message: r.json.message }); }, [api, refId]);
  useEffect(() => { load(); }, [load]);
  if (d.status === "loading") return <div className="v8w-profile"><Skel h={200} r={16} /><Skel h={300} r={16} /></div>;
  if (d.status === "gone") return <V8State icon="works" title="This worker isn’t available" message="They may be offline for a while, no longer verified, or blocked." actionLabel="Find another worker" onAction={() => nav("find")} />;
  if (d.status === "error") return <V8State kind="error" title="Couldn’t load this worker" message={d.message} actionLabel="Retry" onAction={load} />;
  const w = d; const max = Math.max(1, ...w.histogram.map((h) => h.count));
  const act = async (what) => { if (!user) { onRequireLogin(); return; } const r = await api("POST", `/api/v8/works/workers/${w.ref}/${what}`); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return; } if (what === "save") { setD((x) => ({ ...x, saved: r.json.saved })); ui?.toast({ title: r.json.saved ? "Saved" : "Removed from saved" }); } if (what === "block") { ui?.toast({ title: "Blocked" }); nav("find"); } };
  return (
    <div className="v8w-profile">
      <section className="v8-card v8w-hero">
        <Ava src={w.person.avatar_url} name={w.person.display_name} size={88} />
        <div className="v8w-hero-text">
          <h2>{w.person.display_name} <V8Badges verified premium={w.person.premium} /></h2>
          <button type="button" className="v8-link" onClick={() => onOpenProfile(w.person.public_username)}>@{w.person.public_username}</button>
          <p>{w.service}{w.city ? ` · ${w.city}` : ""}{w.radius_km ? ` · serves within ${w.radius_km} km` : ""}</p>
          <p className="v8w-card-meta">{w.rating ? <><V8Icon name="star" size={15} /> <b>{w.rating.toFixed(1)}</b> ({w.reviews} reviews)</> : "New on HOWDI"} · {w.jobs} jobs{w.experience_years ? ` · ${w.experience_years} yrs experience` : ""}</p>
          <span className={`v8w-presence ${w.presence}`}><i />{w.presence === "online" ? "Available now" : w.presence === "busy" ? "Busy right now" : "Offline"}{w.next_slot ? ` · next open slot ${when(w.next_slot)}` : ""}</span>
        </div>
        <div className="v8w-hero-actions">
          {w.price_from != null ? <span className="v8w-price big">from <b>{inr(w.price_from)}</b></span> : null}
          {!w.is_me ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => (user ? setBook(true) : onRequireLogin())}>Book now</button> : <span className="v8c-muted">This is you</span>}
          {!w.is_me ? <div className="v8w-row"><button type="button" className={`v8-btn ${w.saved ? "on" : ""}`} aria-pressed={Boolean(w.saved)} onClick={() => act("save")}><V8Icon name="bookmark" size={16} />{w.saved ? "Saved" : "Save"}</button><button type="button" className="v8-icon-btn" aria-label="More" onClick={() => setSheet("more")}><V8Icon name="more" size={18} /></button></div> : null}
        </div>
      </section>
      <section className="v8-card v8w-block"><h3>Services</h3><div className="v8c-chips">{w.services.map((s) => <span key={s.code} className="v8c-chip static">{s.name}</span>)}</div>
        <p className="v8w-note"><V8Icon name="shield" size={16} /> Identity and skills verified by HOWDI. Pay through HPay: your money is held until you confirm the job is done.</p></section>
      <section className="v8-card v8w-block"><h3>Ratings & reviews</h3>
        <div className="v8w-hist">{w.histogram.map((h) => <div key={h.stars}><span>{h.stars}★</span><i style={{ width: `${(h.count / max) * 100}%` }} /><small>{h.count}</small></div>)}</div>
        {!w.review_list.length ? <p className="v8c-muted">No reviews yet.</p> : w.review_list.map((r, i) => (
          <div key={i} className="v8w-review"><Ava src={r.by?.avatar_url} name={r.by?.display_name} size={32} /><span><b>{"★".repeat(r.rating)}<span className="v8c-muted">{"★".repeat(5 - r.rating)}</span></b> <small>@{r.by?.public_username} · {since(r.at)}</small>{r.text ? <p>{r.text}</p> : null}{r.response ? <p className="v8w-resp"><b>Response from @{w.person.public_username}:</b> {r.response}</p> : null}</span></div>))}
      </section>
      {book ? <BookFlow api={api} w={w} onClose={() => setBook(false)} onBooked={(code) => { setBook(false); nav(`bookings/${code}`); }} /> : null}
      <Sheet open={sheet === "more"} title={`@${w.person.public_username}`} onClose={() => setSheet("")}>
        <button type="button" className="v8c-row" onClick={() => setSheet("report")}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report this worker</b><small>Safety, fraud, overcharging…</small></span></button>
        <button type="button" className="v8c-row danger" onClick={() => setSheet("block")}><span className="v8c-row-ico danger"><V8Icon name="ban" size={20} /></span><span className="v8c-row-text"><b>Block @{w.person.public_username}</b><small>They won’t appear in Works or contact you on HOWDI</small></span></button>
      </Sheet>
      {sheet === "report" ? <ReportWorker api={api} w={w} onClose={() => setSheet("")} /> : null}
      <V8Confirm open={sheet === "block"} danger title={`Block @${w.person.public_username}?`} body="They won’t appear in your Works results and can’t message or book with you. You can unblock them in Settings → Privacy." confirmLabel="Block" onCancel={() => setSheet("")} onConfirm={() => { setSheet(""); act("block"); }} />
    </div>
  );
}
const REASONS = [["safety", "I felt unsafe"], ["harassment", "Harassment or abuse"], ["no_show", "Didn’t turn up"], ["fraud", "Fraud or scam"], ["poor_work", "Poor or unfinished work"], ["overcharging", "Asked for extra money"], ["other", "Something else"]];
export function ReportWorker({ api, w, booking, onClose }) {
  const [reason, setReason] = useState(""); const [details, setDetails] = useState(""); const [done, setDone] = useState(null); const [err, setErr] = useState("");
  const send = async () => { const r = await api("POST", `/api/v8/works/workers/${w.ref}/report`, { reason, details, booking }); if (!r.ok) { setErr(r.json.message); return; } setDone(r.json.message); };
  return (
    <Sheet open title={done ? "Report sent" : `Report @${w.person.public_username}`} onClose={onClose}>
      {done ? (<div className="v8c-done"><span className="v8c-done-ico ok"><V8Icon name="check" size={26} /></span><p>{done}</p><button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={onClose}>Done</button></div>) : (<>
        <div className="v8w-radios" role="radiogroup" aria-label="Reason">{REASONS.map(([k, l]) => <label key={k} className={reason === k ? "on" : ""}><input type="radio" name="wr" checked={reason === k} onChange={() => setReason(k)} />{l}</label>)}</div>
        <label className="v8c-field"><span>What happened? (optional)</span><textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} /></label>
        <p className="v8c-muted">If you’re in danger right now, call 112.</p>
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={!reason} onClick={send}>Send report</button></div>
      </>)}
    </Sheet>
  );
}

function BookFlow({ api, w, onClose, onBooked }) {
  const [step, setStep] = useState("slot"); const [slots, setSlots] = useState(null); const [day, setDay] = useState(0); const [slot, setSlot] = useState(null);
  const [f, setF] = useState({ service: w.services[0]?.code || "", area: "", summary: "", name: "", address: "", landmark: "", pincode: "", phone: "", notes: "", method: "hpay" });
  const [review, setReview] = useState(null); const [err, setErr] = useState(null); const key = useRef(newKey());
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => { api("GET", `/api/v8/works/workers/${w.ref}/slots?days=7`).then((r) => { if (r.ok) { setSlots(r.json); const i = r.json.days.findIndex((d) => d.slots.some((s) => s.state === "available")); setDay(Math.max(0, i)); } else setSlots({ error: r.json.message }); }); }, [api, w.ref]);
  const body = () => ({ worker: w.ref, service: f.service, starts_at: slot?.starts_at, area: f.area, summary: f.summary, method: f.method === "later" ? "after_job" : "hpay", private: { name: f.name, address: f.address, landmark: f.landmark, pincode: f.pincode, phone: f.phone, notes: f.notes } });
  const toReview = async () => { setErr(null); const r = await api("POST", "/api/v8/works/bookings/quote", body()); if (!r.ok) { setErr({ message: r.json.message }); if (r.json.code === "SLOT_TAKEN") setStep("slot"); return; } setReview(r.json.review); setStep("review"); };
  const create = async (pin) => {
    const r = await api("POST", "/api/v8/works/bookings", { ...body(), pin, idempotency_key: key.current });
    if (!r.ok) { if (["PIN_WRONG", "PIN_LOCKED"].includes(r.json.code)) return { code: r.json.code, message: r.json.message }; setErr({ message: r.json.message, code: r.json.code }); setStep(r.json.code === "SLOT_TAKEN" ? "slot" : "review"); return null; }
    onBooked(r.json.booking.public_key); return null;
  };
  const d = slots && !slots.error ? slots.days[day] : null;
  return (
    <Sheet open wide title={step === "slot" ? "Choose a time" : step === "details" ? "Booking details" : step === "review" ? "Review & pay" : "Confirm with HPay PIN"} onClose={onClose}>
      <div className="v8w-bookhead"><Ava src={w.person.avatar_url} name={w.person.display_name} size={40} /><span><b>{w.person.display_name}</b><small>@{w.person.public_username} · {w.service}</small></span></div>
      {step === "slot" ? (<>
        {!slots ? <Skel h={160} /> : slots.error ? <p className="v8c-err">{slots.error}</p> : (<>
          <div className="v8w-days" role="tablist" aria-label="Day">{slots.days.map((x, i) => <button key={x.date} type="button" role="tab" aria-selected={day === i} className={day === i ? "on" : ""} onClick={() => setDay(i)}><small>{new Date(`${x.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" })}</small><b>{new Date(`${x.date}T00:00:00`).getDate()}</b></button>)}</div>
          {d.off || !d.slots.length ? <p className="v8c-muted">Not working this day.</p> : <div className="v8w-slots">{d.slots.map((s) => <button key={s.starts_at} type="button" disabled={s.state !== "available"} className={`${slot?.starts_at === s.starts_at ? "on" : ""} ${s.state}`} aria-pressed={slot?.starts_at === s.starts_at} onClick={() => setSlot(s)}>{s.time}{s.state === "booked" ? <small>Booked</small> : null}</button>)}</div>}
          <p className="v8c-muted">Times are in {slots.timezone}. Greyed-out times are booked or too soon.</p>
        </>)}
        {err ? <p className="v8c-err" role="alert">{err.message}</p> : null}
        <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={!slot} onClick={() => { setErr(null); setStep("details"); }}>Continue</button>
      </>) : null}
      {step === "details" ? (<div className="v8u-form">
        {w.services.length > 1 ? <label className="v8c-field"><span>Service</span><select value={f.service} onChange={(e) => set("service", e.target.value)}>{w.services.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select></label> : null}
        <fieldset className="v8w-fs"><legend><V8Icon name="eye" size={14} /> Shown to the worker before they accept</legend>
          <label className="v8c-field"><span>Area / locality</span><input value={f.area} maxLength={120} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Wyra Road, Khammam" /></label>
          <label className="v8c-field"><span>What do you need done?</span><textarea rows={2} maxLength={600} value={f.summary} onChange={(e) => set("summary", e.target.value)} placeholder="e.g. Kitchen tap leaking" /></label>
          <small className="v8c-muted">Don’t add your address or phone here.</small></fieldset>
        <fieldset className="v8w-fs private"><legend><V8Icon name="lock" size={14} /> Private — shared only after you confirm the worker</legend>
          <label className="v8c-field"><span>Exact address</span><textarea rows={2} maxLength={300} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="House / flat, street" /></label>
          <div className="v8u-two"><label className="v8c-field"><span>Landmark (optional)</span><input value={f.landmark} maxLength={120} onChange={(e) => set("landmark", e.target.value)} /></label><label className="v8c-field"><span>PIN code (optional)</span><input inputMode="numeric" value={f.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} /></label></div>
          <div className="v8u-two"><label className="v8c-field"><span>Name for the worker (optional)</span><input value={f.name} maxLength={80} onChange={(e) => set("name", e.target.value)} /></label><label className="v8c-field"><span>Phone (optional)</span><input inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/[^\d ]/g, "").slice(0, 12))} /></label></div>
          <label className="v8c-field"><span>Private notes (optional)</span><input value={f.notes} maxLength={600} onChange={(e) => set("notes", e.target.value)} placeholder="Gate code, parking…" /></label>
        </fieldset>
        <fieldset className="v8w-fs"><legend>Payment</legend>
          <div className="v8c-seg" role="radiogroup" aria-label="Payment"><button type="button" role="radio" aria-checked={f.method === "hpay"} className={f.method === "hpay" ? "on" : ""} onClick={() => set("method", "hpay")}><V8Icon name="wallet" size={16} />HPay (held until done)</button><button type="button" role="radio" aria-checked={f.method === "later"} className={f.method === "later" ? "on" : ""} onClick={() => set("method", "later")}>Pay after the job</button></div></fieldset>
        {err ? <p className="v8c-err" role="alert">{err.message}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setStep("slot")}>Back</button><button type="button" className="v8-btn v8-btn-primary" disabled={f.area.trim().length < 3 || f.address.trim().length < 6} onClick={toReview}>Review</button></div>
      </div>) : null}
      {step === "review" && review ? (<>
        <div className="v8c-receipt"><span>Worker</span><b>@{review.worker.person.public_username}</b><span>Service</span><b>{review.service}</b><span>When</span><b>{when(review.starts_at)}</b><span>Area</span><b>{review.area}</b><span>Price</span><b>{inr(review.amount)}</b><span>Payment</span><b>{review.method === "hpay" ? "HPay — held until you confirm" : "Pay the worker after the job"}</b>{review.balance != null && review.method === "hpay" ? <><span>HPay balance</span><b>{inr(review.balance)}</b></> : null}</div>
        <div className="v8w-share"><div><b><V8Icon name="eye" size={14} /> Worker sees now</b><small>{review.shared_before_accept.join(" · ")}</small></div><div><b><V8Icon name="lock" size={14} /> Private until you confirm</b><small>{review.private_until_consent.join(" · ")}</small></div></div>
        {!review.provider_ready ? <p className="v8c-err">HPay isn’t connected here. Choose “Pay after the job”.</p> : null}
        {err ? <p className="v8c-err" role="alert">{err.message}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setStep("details")}>Back</button><button type="button" className="v8-btn v8-btn-primary" disabled={!review.provider_ready} onClick={() => (review.method === "hpay" ? setStep("pin") : create(undefined))}>{review.method === "hpay" ? `Pay ${inr(review.amount)} & send request` : "Send request"}</button></div>
        {review.method === "hpay" ? <small className="v8-pill-test">Preview / Test</small> : null}
      </>) : null}
      {step === "pin" ? <PinStep api={api} amount={review.amount} to={`${review.service} with @${review.worker.person.public_username}`} onPay={create} onCancel={() => setStep("review")} label="Pay" /> : null}
    </Sheet>
  );
}

// ---------------------------------------------------------------- WRK-008 My bookings
function MyBookings({ api, nav }) {
  const [tab, setTab] = useState("upcoming"); const [d, setD] = useState({ status: "loading", items: [] });
  const load = useCallback(async () => { setD((x) => ({ ...x, status: "loading" })); const r = await api("GET", `/api/v8/works/bookings?tab=${tab}`); setD(r.ok ? { status: "ready", items: r.json.items || [] } : { status: "error", items: [], message: r.json.message }); }, [api, tab]);
  useEffect(() => { load(); }, [load]);
  return (
    <section className="v8w-list">
      <Tabs compact tabs={[{ value: "upcoming", label: "Upcoming" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }]} value={tab} onChange={setTab} label="Bookings" />
      {d.status === "loading" ? [0, 1].map((i) => <Skel key={i} h={96} r={16} />) : null}
      {d.status === "error" ? <V8State kind="error" title="Bookings didn’t load" message={d.message} actionLabel="Retry" onAction={load} /> : null}
      {d.status === "ready" && !d.items.length ? <V8State icon="calendar" title={tab === "upcoming" ? "No upcoming bookings" : tab === "completed" ? "No completed jobs yet" : "Nothing cancelled"} message={tab === "upcoming" ? "Book a verified worker and track it here." : ""} actionLabel={tab === "upcoming" ? "Find a worker" : undefined} onAction={() => nav("find")} /> : null}
      {d.items.map((b) => <BookingRow key={b.public_key} b={b} onOpen={() => nav(`bookings/${b.public_key}`)} />)}
    </section>
  );
}
export function BookingRow({ b, onOpen, worker }) {
  const who = worker ? null : b.worker;
  return (
    <button type="button" className="v8-card v8w-bk" onClick={onOpen}>
      {who ? <Ava src={who.person.avatar_url} name={who.person.display_name} size={48} /> : <span className="v8c-row-ico"><V8Icon name="works" size={22} /></span>}
      <span className="v8w-bk-text"><b>{b.service}{who ? ` · @${who.person.public_username}` : ` · ${b.area}`}</b><small>{when(b.starts_at)} · {inr(worker ? b.worker_net : b.amount)}</small><StateChip state={b.state} worker={worker} /></span>
      <V8Icon name="chevr" size={18} />
    </button>
  );
}

// ---------------------------------------------------------------- WRK-005B/C consent · WRK-007/009/010/011 booking detail (customer)
function BookingDetail({ api, code, nav }) {
  const ui = useV8Ui();
  const [d, setD] = useState({ status: "loading" }); const [sheet, setSheet] = useState(""); const [fields, setFields] = useState(["address"]); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/works/bookings/${code}`); setD(r.ok ? { status: "ready", b: r.json.booking } : { status: r.status === 404 ? "gone" : "error", message: r.json.message }); }, [api, code]);
  useEffect(() => { load(); const id = window.setInterval(load, 6000); return () => window.clearInterval(id); }, [load]);
  if (d.status === "loading") return <Skel h={320} r={16} />;
  if (d.status === "gone") return <V8State icon="calendar" title="Booking not found" actionLabel="My bookings" onAction={() => nav("bookings")} />;
  if (d.status === "error") return <V8State kind="error" title="Couldn’t load this booking" message={d.message} actionLabel="Retry" onAction={load} />;
  const b = d.b; const w = b.worker;
  const post = async (sub, body, msg) => { setBusy(true); const r = await api("POST", `/api/v8/works/bookings/${code}/${sub}`, body); setBusy(false); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); load(); return false; } setD({ status: "ready", b: r.json.booking }); if (msg || r.json.message) ui?.toast({ title: r.json.message || msg }); return true; };
  return (
    <div className="v8w-detail">
      <section className="v8-card v8w-block">
        <header className="v8w-dhead"><button type="button" className="v8-icon-btn" aria-label="Back to bookings" onClick={() => nav("bookings")}><V8Icon name="back" size={20} /></button><div><h2>{b.service}</h2><small>Booking {b.public_key}</small></div><StateChip state={b.state} /></header>
        {w ? <button type="button" className="v8w-bookhead link" onClick={() => nav(`workers/${w.ref}`)}><Ava src={w.person.avatar_url} name={w.person.display_name} size={44} /><span><b>{w.person.display_name} <V8Badges verified size="sm" /></b><small>@{w.person.public_username}{w.rating ? ` · ★ ${w.rating.toFixed(1)}` : ""}</small></span></button> : null}
        <div className="v8c-receipt"><span>When</span><b>{when(b.starts_at)}</b><span>Area</span><b>{b.area}</b><span>Price</span><b>{inr(b.amount)}</b><span>Payment</span><b>{b.payment.method === "hpay" ? `HPay · ${{ held: "held", released: "released to worker", refunded: "refunded", none: "—" }[b.payment.state] || b.payment.state}` : "Pay after the job"}</b></div>
        {!["declined", "expired", "cancelled"].includes(b.state) ? <Stepper b={b} /> : <p className="v8w-ended">{b.state === "declined" ? `The worker declined: ${b.decline_reason || "not available"}.` : b.cancel_reason || "This booking ended."}{b.payment.state === "refunded" ? " Your HPay payment was refunded." : ""}</p>}
      </section>

      {b.state === "requested" ? <section className="v8-card v8w-block v8w-wait"><V8Icon name="clock" size={22} /><div><b>Request sent to @{w?.person.public_username}</b><p>They see the service, area, time and price — not your address, phone or name.</p>{b.request_expires ? <Countdown to={b.request_expires} label="Waiting for a reply ·" /> : null}</div></section> : null}

      {b.state === "accepted" ? (
        <section className="v8-card v8w-block v8w-consent" aria-labelledby="consent-h">
          <h3 id="consent-h">@{w?.person.public_username} accepted — choose what to share</h3>
          <p>Nothing private has been shared yet. The worker gets only what you tick, and only for this booking.</p>
          <table className="v8w-ctable"><thead><tr><th>Detail</th><th>Your details</th><th>Share</th></tr></thead><tbody>
            {b.consent_fields.map((cf) => { const val = b.my_details?.[{ address: "location", phone: "contact" }[cf.key] || cf.key]; return (
              <tr key={cf.key}><td>{cf.label}{cf.required ? <small> · needed for a home visit</small> : null}</td><td>{val || <span className="v8c-muted">Not added</span>}</td>
                <td><label className="v8w-switch"><input type="checkbox" disabled={cf.required || !val} checked={fields.includes(cf.key)} onChange={(e) => setFields((x) => (e.target.checked ? [...x, cf.key] : x.filter((y) => y !== cf.key)))} /><span className="v8-sr">Share {cf.label}</span></label></td></tr>); })}
          </tbody></table>
          {b.consent_due ? <Countdown to={b.consent_due} label="Confirm within" /> : null}
          <div className="v8vc-actions"><button type="button" className="v8-btn" disabled={busy} onClick={() => setSheet("decline")}>Don’t share · cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={() => post("consent", { fields }, "Booking confirmed")}>Share & confirm booking</button></div>
          <small className="v8c-muted">You can withdraw consent before the job starts — that cancels the booking and the worker loses access.</small>
        </section>) : null}

      {["confirmed", "en_route", "arrived", "in_progress", "completed", "closed", "disputed"].includes(b.state) && b.consent ? (
        <section className="v8-card v8w-block"><h3><V8Icon name="lock" size={16} /> Shared with the worker</h3>
          <p>{b.consent.fields.length ? b.consent.fields.map((f) => b.consent_fields.find((x) => x.key === f)?.label).join(" · ") : "Nothing"}{b.consent.status === "withdrawn" ? " — withdrawn" : ""}</p>
          {["confirmed", "en_route"].includes(b.state) ? <button type="button" className="v8-link" onClick={() => setSheet("withdraw")}>Withdraw consent</button> : null}</section>) : null}

      {b.state === "arrived" && b.job_pin ? (
        <section className="v8-card v8w-block v8w-pin" aria-live="polite"><h3>@{w?.person.public_username} has arrived</h3>
          {b.job_pin.locked ? <p className="v8c-err">The PIN was entered wrong 5 times and is locked for 15 minutes. If this isn’t your worker, report it now.</p> : (<>
            <p>Check it’s the person in the photo, then read out this Job PIN. Never share it before they’re in front of you.</p>
            <div className="v8w-pin-digits" aria-label={`Job PIN ${b.job_pin.pin.split("").join(" ")}`}>{b.job_pin.pin.split("").map((c, i) => <span key={i}>{c}</span>)}</div>
            {b.job_pin.attempts ? <small className="v8c-muted">{b.job_pin.attempts} wrong {b.job_pin.attempts === 1 ? "try" : "tries"} so far.</small> : null}
          </>)}</section>) : null}

      {b.state === "completed" ? (
        <section className="v8-card v8w-block"><h3>Is the job done?</h3><p>{b.payment.method === "hpay" ? `Confirming releases ${inr(b.amount)} to @${w?.person.public_username}.` : "Confirm once you’ve paid the worker."} If something’s wrong, report it — {b.payment.method === "hpay" ? "your payment stays on hold." : "HOWDI support will help."} This closes automatically in 48 hours.</p>
          <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setSheet("issue")}>Report a problem</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={() => post("confirm", {}, "Thanks! Job closed.")}>Yes, it’s done</button></div></section>) : null}

      {b.state === "closed" ? (
        <section className="v8-card v8w-block v8w-done"><span className="v8c-done-ico ok"><V8Icon name="check" size={26} /></span><div><h3>Job completed</h3><p>{b.payment.method === "hpay" ? `${inr(b.amount)} paid via HPay${b.receipt?.hold ? ` · Ref ${b.receipt.hold}` : ""}.` : "Paid directly to the worker."}</p>
          <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => nav(`workers/${w?.ref}`)}>Book again</button>{b.can_review ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => setSheet("review")}>Rate @{w?.person.public_username}</button> : null}</div>
          {b.review ? <p className="v8w-myreview">Your review: {"★".repeat(b.review.rating)}{b.review.text ? ` — ${b.review.text}` : ""}{b.review.response ? <><br /><small>Reply: {b.review.response}</small></> : null}</p> : null}</div></section>) : null}

      {b.state === "disputed" ? <section className="v8-card v8w-block v8w-wait bad"><V8Icon name="alert" size={22} /><div><b>Problem reported</b><p>HOWDI support will contact you within 24 hours.{b.payment.method === "hpay" ? " Your payment stays on hold until it’s resolved." : ""}</p></div></section> : null}

      {b.chat_open ? <BookingChat api={api} code={code} /> : null}

      <section className="v8-card v8w-block"><h3>Manage booking</h3>
        {b.actions.includes("cancel") ? <button type="button" className="v8c-row" onClick={() => setSheet("cancel")}><span className="v8c-row-ico"><V8Icon name="x" size={20} /></span><span className="v8c-row-text"><b>Cancel booking</b><small>{b.payment.state === "held" ? "Full HPay refund before the worker arrives" : "Free before the worker arrives"}</small></span></button> : null}
        {b.actions.includes("issue") ? <button type="button" className="v8c-row" onClick={() => setSheet("issue")}><span className="v8c-row-ico danger"><V8Icon name="alert" size={20} /></span><span className="v8c-row-text"><b>Report a problem with this job</b></span></button> : null}
        {w ? <button type="button" className="v8c-row" onClick={() => setSheet("report")}><span className="v8c-row-ico danger"><V8Icon name="flag" size={20} /></span><span className="v8c-row-text"><b>Report the worker</b><small>Goes to the HOWDI Works safety team</small></span></button> : null}
        <details className="v8w-timeline"><summary>History</summary><ol>{b.timeline.map((e, i) => <li key={i}><b>{e.event.replace(/_/g, " ")}</b> <small>{e.actor} · {when(e.at)}</small>{e.note ? <p>{e.note}</p> : null}</li>)}</ol></details>
      </section>

      <V8Confirm open={sheet === "cancel"} danger title="Cancel this booking?" body={`@${w?.person.public_username} will be told.${b.payment.state === "held" ? " Your HPay payment is refunded right away." : ""}`} confirmLabel="Cancel booking" onCancel={() => setSheet("")} onConfirm={() => { setSheet(""); post("cancel", {}); }} />
      <V8Confirm open={sheet === "decline"} danger title="Don’t share your details?" body="The booking will be cancelled and the worker won’t see anything private. Any HPay payment is refunded." confirmLabel="Cancel booking" onCancel={() => setSheet("")} onConfirm={() => { setSheet(""); post("consent/decline", {}); }} />
      <V8Confirm open={sheet === "withdraw"} danger title="Withdraw consent?" body="The worker immediately loses access to your details and the booking is cancelled. Any HPay payment is refunded." confirmLabel="Withdraw & cancel" onCancel={() => setSheet("")} onConfirm={() => { setSheet(""); post("consent/withdraw", {}); }} />
      {sheet === "issue" ? <IssueSheet onClose={() => setSheet("")} onSend={(reason, details) => { setSheet(""); post("issue", { reason, details }); }} /> : null}
      {sheet === "review" ? <ReviewSheet w={w} onClose={() => setSheet("")} onSend={(rating, text) => { setSheet(""); post("review", { rating, text }, "Thanks for your review"); }} /> : null}
      {sheet === "report" && w ? <ReportWorker api={api} w={w} booking={code} onClose={() => setSheet("")} /> : null}
    </div>
  );
}
function IssueSheet({ onClose, onSend }) {
  const [reason, setReason] = useState(""); const [details, setDetails] = useState("");
  const R = [["not_done", "The job isn’t finished"], ["poor_quality", "Poor quality"], ["damage", "Something was damaged"], ["overcharge", "Asked for more money"], ["safety", "I felt unsafe"], ["no_show", "The worker didn’t come"], ["other", "Something else"]];
  return (
    <Sheet open title="Report a problem" onClose={onClose}>
      <div className="v8w-radios" role="radiogroup" aria-label="What went wrong">{R.map(([k, l]) => <label key={k} className={reason === k ? "on" : ""}><input type="radio" name="wi" checked={reason === k} onChange={() => setReason(k)} />{l}</label>)}</div>
      <label className="v8c-field"><span>Details (optional)</span><textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} /></label>
      <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={!reason} onClick={() => onSend(reason, details)}>Report</button></div>
    </Sheet>
  );
}
function ReviewSheet({ w, onClose, onSend }) {
  const [rating, setRating] = useState(0); const [text, setText] = useState("");
  return (
    <Sheet open title={`Rate @${w?.person.public_username}`} onClose={onClose}>
      <div className="v8w-stars" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} className={n <= rating ? "on" : ""} onClick={() => setRating(n)}>★</button>)}</div>
      <label className="v8c-field"><span>Tell others about the job (optional)</span><textarea rows={3} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} /></label>
      <p className="v8c-muted">Your review shows with your @username on their profile. They can reply once.</p>
      <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Later</button><button type="button" className="v8-btn v8-btn-primary" disabled={!rating} onClick={() => onSend(rating, text)}>Post review</button></div>
    </Sheet>
  );
}
export function BookingChat({ api, code }) {
  const [items, setItems] = useState([]); const [t, setT] = useState(""); const [err, setErr] = useState("");
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/works/bookings/${code}/messages`); if (r.ok) setItems(r.json.items || []); }, [api, code]);
  useEffect(() => { load(); const id = window.setInterval(load, 5000); return () => window.clearInterval(id); }, [load]);
  const send = async () => { if (!t.trim()) return; const r = await api("POST", `/api/v8/works/bookings/${code}/messages`, { text: t }); if (!r.ok) { setErr(r.json.message); return; } setErr(""); setT(""); load(); };
  return (
    <section className="v8-card v8w-block v8w-chat"><h3>Booking chat</h3>
      <div className="v8w-chat-log" role="log" aria-live="polite">{!items.length ? <p className="v8c-muted">Messages about this booking. Keep payments inside HOWDI.</p> : items.map((m, i) => <p key={i} className={m.mine ? "mine" : ""}>{m.text}<small>{when(m.at)}</small></p>)}</div>
      <div className="v8w-chat-row"><input value={t} maxLength={1000} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Message…" aria-label="Message" /><button type="button" className="v8-btn v8-btn-primary" disabled={!t.trim()} onClick={send}>Send</button></div>
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
    </section>
  );
}

// ---------------------------------------------------------------- WRK-012 saved · WRK-013 safety · WKR-001 become
function Saved({ api, nav }) {
  const [d, setD] = useState(null);
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/works/saved"); setD(r.ok ? r.json.items : { error: r.json.message }); }, [api]);
  useEffect(() => { load(); }, [load]);
  const unsave = async (w) => { const r = await api("POST", `/api/v8/works/workers/${w.ref}/save`); if (r.ok) load(); };
  if (!d) return <Skel h={110} r={16} />;
  if (d.error) return <V8State kind="error" title="Saved workers didn’t load" message={d.error} actionLabel="Retry" onAction={load} />;
  if (!d.length) return <V8State icon="bookmark" title="No saved workers" message="Tap Save on a worker to find them quickly next time — on any device." actionLabel="Find a worker" onAction={() => nav("find")} />;
  return <div className="v8w-grid">{d.map((w) => <WorkerCard key={w.ref} w={w} onOpen={() => nav(`workers/${w.ref}`)} onSave={unsave} />)}</div>;
}
function Safety({ nav }) {
  const T = ({ icon, title, body }) => <div className="v8-card v8w-tip"><V8Icon name={icon} size={22} /><span><b>{title}</b><p>{body}</p></span></div>;
  return (
    <section className="v8w-safety">
      <T icon="shield" title="Verified workers only" body="Everyone you can book passed HOWDI identity and skill checks." />
      <T icon="lock" title="Your details stay private" body="The worker sees your address, phone or name only after they accept and you choose to share. You can withdraw before the job starts." />
      <T icon="key" title="Job PIN at the door" body="Your PIN appears only when the worker arrives. Check their photo first — they enter your PIN to start. 5 wrong tries lock it." />
      <T icon="wallet" title="Pay through HPay" body="Your money is held and released only when you confirm the job is done. Report a problem and it stays on hold." />
      <T icon="flag" title="Report or block" body="From any worker profile or booking: report safety concerns, fraud or overcharging. Block to hide them everywhere on HOWDI." />
      <div className="v8-card v8w-tip danger"><V8Icon name="alert" size={22} /><span><b>In an emergency call 112</b><p>HOWDI safety tools don’t replace emergency services.</p></span></div>
      <button type="button" className="v8-btn" onClick={() => nav("bookings")}>Go to my bookings</button>
    </section>
  );
}
