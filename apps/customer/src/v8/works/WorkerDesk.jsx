// HOWDI V8 Worker workspace — board V8__20 (worker dashboard: status, today's earnings, pending settlement, rating, job offers,
// active jobs, availability) and V8__33 worker side (details hidden until consent, arrival, Job PIN entry). Register WKR-003A,
// WKR-004..008, WKR-011. Lives inside the Works pillar (not Connect).
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Confirm, useV8Ui } from "../V8System";
import { Sheet, Skel, Tabs } from "../connect/common";
import { PinStep, inr, newKey } from "../connect/HPayUtilities";
import { BookingRow, BookingChat, StateChip, Stepper, when } from "./V8Works";

export default function WorkerDesk({ api, me, sub, nav, reloadMe }) {
  if (!me) return <Skel h={240} r={16} />;
  if (!me.worker) return <V8State icon="works" title="You’re not a HOWDI worker yet" message="Apply to offer your services. HOWDI verifies your identity and skills first." actionLabel="Become a worker" onAction={() => nav("become")} />;
  const m = String(sub || "").replace(/^\//, "");
  let x;
  if ((x = m.match(/^jobs\/(BKG-[0-9A-F]{12})$/))) return <WorkerJob key={x[1]} api={api} code={x[1]} nav={nav} />;
  if (m === "hours") return <Hours api={api} nav={nav} />;
  if (m === "earnings") return <Earnings api={api} nav={nav} />;
  return <Dashboard api={api} me={me} nav={nav} reloadMe={reloadMe} />;
}

function Dashboard({ api, me, nav, reloadMe }) {
  const ui = useV8Ui();
  const [tab, setTab] = useState(me.counts?.offers ? "offers" : "active"); const [d, setD] = useState({ status: "loading", items: [] });
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/works/worker/jobs?tab=${tab}`); setD(r.ok ? { status: "ready", items: r.json.items || [] } : { status: "error", items: [], message: r.json.message }); }, [api, tab]);
  useEffect(() => { setD((z) => ({ ...z, status: "loading" })); load(); const id = window.setInterval(load, 8000); return () => window.clearInterval(id); }, [load]);
  const w = me.worker; const e = me.earnings || {};
  const setStatus = async (s) => { const r = await api("POST", "/api/v8/works/worker/status", { status: s }); ui?.toast(r.ok ? { title: r.json.message } : { kind: "error", title: r.json.message }); if (r.ok) reloadMe(); };
  return (
    <div className="v8w-desk">
      <section className="v8-card v8w-desk-top">
        <div><h2>Hi @{w.person.public_username}</h2><p className="v8c-muted">{w.service} · {w.city}{w.live ? " · Verified" : " · Verification pending"}</p></div>
        <div className="v8c-seg v8w-status" role="radiogroup" aria-label="Availability status">{[["online", "Online"], ["busy", "Busy"], ["offline", "Offline"]].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={w.presence === k} className={`${w.presence === k ? "on" : ""} ${k}`} onClick={() => setStatus(k)}><i />{l}</button>)}</div>
      </section>
      <div className="v8w-tiles">
        <button type="button" className="v8-card v8w-tile" onClick={() => nav("worker/earnings")}><small>Today’s earnings</small><b>{inr(e.today)}</b></button>
        <button type="button" className="v8-card v8w-tile" onClick={() => nav("worker/earnings")}><small>Pending settlement</small><b>{inr(e.pending)}</b></button>
        <button type="button" className="v8-card v8w-tile" onClick={() => nav("worker/earnings")}><small>Available to transfer</small><b>{inr(e.available)}</b></button>
        <div className="v8-card v8w-tile"><small>Rating</small><b>{w.rating ? `★ ${w.rating.toFixed(1)}` : "New"}</b><small>{w.reviews} reviews · {w.jobs} jobs</small></div>
      </div>
      <div className="v8w-row"><button type="button" className="v8-btn" onClick={() => nav("worker/hours")}><V8Icon name="calendar" size={16} />Working hours</button><button type="button" className="v8-btn" onClick={() => nav("worker/earnings")}><V8Icon name="wallet" size={16} />Earnings & transfers</button><button type="button" className="v8-btn" onClick={() => nav(`workers/${w.ref}`)}><V8Icon name="eye" size={16} />See my public profile</button></div>
      <Tabs compact tabs={[{ value: "offers", label: "Job offers", count: me.counts?.offers }, { value: "active", label: "Active jobs", count: me.counts?.active }, { value: "history", label: "History" }]} value={tab} onChange={setTab} label="Jobs" />
      {d.status === "loading" ? <Skel h={96} r={16} /> : null}
      {d.status === "error" ? <V8State kind="error" title="Jobs didn’t load" message={d.message} actionLabel="Retry" onAction={load} /> : null}
      {d.status === "ready" && !d.items.length ? <V8State icon="works" title={tab === "offers" ? "No job offers right now" : tab === "active" ? "No active jobs" : "No past jobs yet"} message={tab === "offers" ? (w.presence === "online" ? "New requests appear here. You have 30 minutes to reply to each." : "Go Online so customers can book your open slots.") : ""} /> : null}
      {d.items.map((b) => <BookingRow key={b.public_key} b={b} worker onOpen={() => nav(`worker/jobs/${b.public_key}`)} />)}
    </div>
  );
}

function WorkerJob({ api, code, nav }) {
  const ui = useV8Ui();
  const [d, setD] = useState({ status: "loading" }); const [sheet, setSheet] = useState(""); const [pin, setPin] = useState(""); const [pinErr, setPinErr] = useState(null); const [reason, setReason] = useState(""); const [resp, setResp] = useState("");
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/works/bookings/${code}`); setD(r.ok ? { status: "ready", b: r.json.booking } : { status: r.status === 404 ? "gone" : "error", message: r.json.message }); }, [api, code]);
  useEffect(() => { load(); const id = window.setInterval(load, 6000); return () => window.clearInterval(id); }, [load]);
  if (d.status === "loading") return <Skel h={320} r={16} />;
  if (d.status === "gone") return <V8State icon="works" title="Job not found" actionLabel="Back to my work" onAction={() => nav("worker")} />;
  if (d.status === "error") return <V8State kind="error" title="Couldn’t load this job" message={d.message} actionLabel="Retry" onAction={load} />;
  const b = d.b;
  const post = async (sub, body, msg) => { const r = await api("POST", `/api/v8/works/bookings/${code}/${sub}`, body); if (!r.ok) { if (sub === "pin") { setPinErr(r.json); setPin(""); load(); return false; } ui?.toast({ kind: "error", title: r.json.message }); load(); return false; } setD({ status: "ready", b: r.json.booking }); if (msg) ui?.toast({ title: msg }); return true; };
  return (
    <div className="v8w-detail">
      <section className="v8-card v8w-block">
        <header className="v8w-dhead"><button type="button" className="v8-icon-btn" aria-label="Back to my work" onClick={() => nav("worker")}><V8Icon name="back" size={20} /></button><div><h2>{b.service}</h2><small>Job {b.public_key}</small></div><StateChip state={b.state} worker /></header>
        <div className="v8c-receipt"><span>When</span><b>{when(b.starts_at)}</b><span>Area</span><b>{b.area}</b><span>Job</span><b>{b.summary || "—"}</b><span>You earn</span><b>{inr(b.worker_net)} <small className="v8c-muted">({inr(b.amount)} − HOWDI fee {inr(b.fee)})</small></b><span>Payment</span><b>{b.payment.method === "hpay" ? `HPay · ${b.payment.state}` : "Customer pays you after the job"}</b></div>
        {!["declined", "expired", "cancelled"].includes(b.state) ? <Stepper b={b} /> : <p className="v8w-ended">{b.cancel_reason || b.decline_reason || "This job ended."}</p>}
      </section>
      <section className={`v8-card v8w-block v8w-private ${b.private?.hidden ? "hidden" : ""}`}>
        <h3><V8Icon name="lock" size={16} /> Customer details</h3>
        {b.private?.hidden ? <p>{b.state === "requested" ? "Private details are hidden. After you accept, the customer chooses what to share with you." : b.state === "accepted" ? "Waiting for the customer to confirm and share their details." : "Not available."}</p> : (<div className="v8c-receipt">
          {b.customer?.name || b.customer?.handle ? <><span>Customer</span><b>{b.customer.name || ""}{b.customer.handle ? ` @${b.customer.handle}` : ""}</b></> : <><span>Customer</span><b>HOWDI customer</b></>}
          {b.private.location ? <><span>Address</span><b>{b.private.location}</b></> : null}
          {b.private.contact_number ? <><span>Phone</span><b><a href={`tel:${b.private.contact_number}`}>{b.private.contact_number}</a></b></> : null}
          {b.private.notes ? <><span>Notes</span><b>{b.private.notes}</b></> : null}
        </div>)}
        {!b.private?.hidden ? <small className="v8c-muted">Shared by the customer for this booking only. HOWDI logs each time these details are opened.</small> : null}
      </section>
      {b.state === "requested" ? <section className="v8-card v8w-block"><h3>New request</h3><p>Reply within 30 minutes or it expires.</p><div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setSheet("decline")}>Decline</button><button type="button" className="v8-btn v8-btn-primary" onClick={() => post("accept", {}, "Accepted — waiting for the customer to confirm")}>Accept job</button></div></section> : null}
      {b.state === "confirmed" ? <section className="v8-card v8w-block"><button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={() => post("stage", { stage: "en_route" }, "Customer told you’re on the way")}>I’m on the way</button></section> : null}
      {b.state === "en_route" ? <section className="v8-card v8w-block"><button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={() => post("stage", { stage: "arrived" }, "Customer told you’ve arrived")}>I’ve arrived</button></section> : null}
      {b.state === "arrived" ? (
        <section className="v8-card v8w-block v8w-pinentry"><h3>Enter the customer’s Job PIN</h3><p>Ask the customer to read the 4-digit PIN from their booking. The job starts when it matches.</p>
          {b.pin_entry?.locked_until ? <p className="v8c-err" role="alert">Locked after 5 wrong tries until {when(b.pin_entry.locked_until)}. The customer has been told.</p> : (<>
            <label className="v8c-field"><span>Job PIN</span><input inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinErr(null); }} className="v8w-pin-input" /></label>
            {pinErr ? <p className="v8c-err" role="alert">{pinErr.message}</p> : <small className="v8c-muted">{b.pin_entry?.tries_left ?? 5} tries left</small>}
            <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={pin.length !== 4} onClick={() => post("pin", { pin }, "PIN verified — job started")}>Start job</button>
          </>)}</section>) : null}
      {b.state === "in_progress" ? <section className="v8-card v8w-block"><p>Job in progress. Mark it done when you’ve finished — the customer confirms to release payment.</p><button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={() => setSheet("complete")}>Mark job as done</button></section> : null}
      {b.state === "completed" ? <section className="v8-card v8w-block v8w-wait"><V8Icon name="clock" size={22} /><div><b>Waiting for the customer to confirm</b><p>{b.payment.method === "hpay" ? `${inr(b.worker_net)} is released to you when they confirm, or automatically after 48 hours.` : "They’ll confirm once they’ve paid you."}</p></div></section> : null}
      {b.state === "closed" ? (
        <section className="v8-card v8w-block v8w-done"><span className="v8c-done-ico ok"><V8Icon name="check" size={26} /></span><div><h3>Job closed</h3><p>{b.payment.state === "released" ? `${inr(b.worker_net)} added to your earnings${b.receipt?.release ? ` · Ref ${b.receipt.release}` : ""}.` : "Paid directly by the customer."}</p>
          {b.review ? <div className="v8w-myreview"><b>{"★".repeat(b.review.rating)}</b>{b.review.text ? ` “${b.review.text}”` : ""}{b.review.response ? <p><small>Your reply: {b.review.response}</small></p> : null}</div> : <p className="v8c-muted">No review yet.</p>}
          {b.can_respond ? <div className="v8w-chat-row"><input value={resp} maxLength={600} onChange={(e) => setResp(e.target.value)} placeholder="Reply to the review (shown on your profile)" aria-label="Reply to the review" /><button type="button" className="v8-btn v8-btn-primary" disabled={resp.trim().length < 2} onClick={() => post("review/respond", { text: resp }, "Reply posted")}>Reply</button></div> : null}</div></section>) : null}
      {b.state === "disputed" ? <section className="v8-card v8w-block v8w-wait bad"><V8Icon name="alert" size={22} /><div><b>The customer reported a problem</b><p>HOWDI support will contact you. Payment is on hold until it’s resolved.</p></div></section> : null}
      {b.chat_open ? <BookingChat api={api} code={code} /> : null}
      {b.actions.includes("worker_cancel") ? <button type="button" className="v8-link v8w-cancel" onClick={() => setSheet("cancel")}>Can’t make it? Cancel this job</button> : null}
      <Sheet open={sheet === "decline" || sheet === "cancel"} title={sheet === "decline" ? "Decline this request" : "Cancel this job"} onClose={() => setSheet("")}>
        <label className="v8c-field"><span>Reason (the customer sees this)</span><input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder={sheet === "decline" ? "e.g. Fully booked that day" : "e.g. Vehicle broke down"} /></label>
        <p className="v8c-muted">{sheet === "cancel" ? "Frequent cancellations lower your ranking. The customer is refunded in full." : "The customer is refunded and can book someone else."}</p>
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setSheet("")}>Back</button><button type="button" className="v8-btn v8-btn-danger" disabled={sheet === "cancel" && reason.trim().length < 4} onClick={async () => { const ok = await post(sheet === "decline" ? "decline" : "worker-cancel", { reason }, sheet === "decline" ? "Declined" : "Job cancelled"); if (ok) setSheet(""); }}>{sheet === "decline" ? "Decline" : "Cancel job"}</button></div>
      </Sheet>
      <V8Confirm open={sheet === "complete"} title="Mark the job as done?" body="The customer will be asked to confirm. Payment is released when they do." confirmLabel="Mark as done" onCancel={() => setSheet("")} onConfirm={() => { setSheet(""); post("complete", {}, "Marked as done"); }} />
    </div>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMin = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };
function Hours({ api, nav }) {
  const ui = useV8Ui();
  const [d, setD] = useState(null); const [err, setErr] = useState(""); const [off, setOff] = useState("");
  useEffect(() => { api("GET", "/api/v8/works/worker/hours").then((r) => { if (!r.ok) { setD({ error: r.json.message }); return; } const on = Object.fromEntries(r.json.hours.map((h) => [h.weekday, h])); setD({ days: DAYS.map((_, i) => ({ weekday: i, on: Boolean(on[i]), start: hm(on[i]?.start_min ?? 540), end: hm(on[i]?.end_min ?? 1080) })), timeoff: r.json.timeoff, tz: r.json.timezone }); }); }, [api]);
  if (!d) return <Skel h={300} r={16} />;
  if (d.error) return <V8State kind="error" title="Couldn’t load your hours" message={d.error} />;
  const set = (i, k, v) => setD((x) => ({ ...x, days: x.days.map((y) => (y.weekday === i ? { ...y, [k]: v } : y)) }));
  const save = async () => {
    const hours = d.days.filter((x) => x.on).map((x) => ({ weekday: x.weekday, start_min: toMin(x.start), end_min: toMin(x.end) }));
    if (hours.some((h) => h.end_min - h.start_min < 60)) { setErr("Each working day needs at least one hour."); return; }
    const r = await api("PUT", "/api/v8/works/worker/hours", { hours, timeoff: d.timeoff }); if (!r.ok) { setErr(r.json.message); return; } setErr(""); ui?.toast({ title: r.json.message });
  };
  return (
    <section className="v8-card v8w-block v8w-hours">
      <header className="v8w-dhead"><button type="button" className="v8-icon-btn" aria-label="Back to my work" onClick={() => nav("worker")}><V8Icon name="back" size={20} /></button><div><h2>Working hours</h2><small>{d.tz}. Customers can book 1-hour slots inside these hours.</small></div></header>
      {d.days.map((x) => (
        <div key={x.weekday} className={`v8w-hrow ${x.on ? "" : "off"}`}>
          <label className="v8w-switch"><input type="checkbox" checked={x.on} onChange={(e) => set(x.weekday, "on", e.target.checked)} /><b>{DAYS[x.weekday]}</b></label>
          {x.on ? <><input type="time" aria-label={`${DAYS[x.weekday]} start`} value={x.start} step={1800} onChange={(e) => set(x.weekday, "start", e.target.value)} /><span>to</span><input type="time" aria-label={`${DAYS[x.weekday]} end`} value={x.end} step={1800} onChange={(e) => set(x.weekday, "end", e.target.value)} /></> : <span className="v8c-muted">Day off</span>}
        </div>))}
      <h3 className="v8c-sheet-h">Days off</h3>
      <div className="v8c-chips">{d.timeoff.map((t) => <button key={t} type="button" className="v8c-chip on" onClick={() => setD((x) => ({ ...x, timeoff: x.timeoff.filter((y) => y !== t) }))} aria-label={`Remove ${t}`}>{t} <V8Icon name="x" size={12} /></button>)}</div>
      <div className="v8u-two"><label className="v8c-field"><span>Add a day off</span><input type="date" value={off} onChange={(e) => setOff(e.target.value)} /></label><button type="button" className="v8-btn" disabled={!off} onClick={() => { setD((x) => ({ ...x, timeoff: [...new Set([...x.timeoff, off])].sort() })); setOff(""); }}>Add</button></div>
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={save}>Save hours</button>
    </section>
  );
}

function Earnings({ api, nav }) {
  const ui = useV8Ui();
  const [d, setD] = useState(null); const [out, setOut] = useState(false); const [amount, setAmount] = useState(""); const [step, setStep] = useState("amount"); const [done, setDone] = useState(null); const key = useRef(newKey());
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/works/worker/earnings"); setD(r.ok ? r.json : { error: r.json.message }); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Skel h={300} r={16} />;
  if (d.error) return <V8State kind="error" title="Earnings didn’t load" message={d.error} actionLabel="Retry" onAction={load} />;
  const s = d.summary;
  const transfer = async (pin) => { const r = await api("POST", "/api/v8/works/worker/payouts", { amount: Number(amount), pin, idempotency_key: key.current }); if (!r.ok) { if (["PIN_WRONG", "PIN_LOCKED"].includes(r.json.code)) return { code: r.json.code, message: r.json.message }; ui?.toast({ kind: "error", title: r.json.message }); setStep("amount"); return null; } setDone(r.json.payout); key.current = newKey(); load(); return null; };
  return (
    <section className="v8w-earn">
      <header className="v8w-dhead"><button type="button" className="v8-icon-btn" aria-label="Back to my work" onClick={() => nav("worker")}><V8Icon name="back" size={20} /></button><div><h2>Earnings</h2><small>{d.sandbox ? "Preview / Test — no real money moves" : "HPay isn’t connected here"}</small></div></header>
      <div className="v8w-tiles"><div className="v8-card v8w-tile"><small>Available</small><b>{inr(s.available)}</b></div><div className="v8-card v8w-tile"><small>Pending settlement</small><b>{inr(s.pending)}</b><small>Released when customers confirm</small></div><div className="v8-card v8w-tile"><small>Today</small><b>{inr(s.today)}</b></div><div className="v8-card v8w-tile"><small>Paid to you directly</small><b>{inr(s.paid_directly)}</b></div></div>
      <button type="button" className="v8-btn v8-btn-primary" disabled={!d.sandbox || s.available < 100} onClick={() => { setOut(true); setStep("amount"); setDone(null); }}>Transfer to bank</button>
      <section className="v8-card v8w-block"><h3>Activity</h3>{!d.entries.length ? <p className="v8c-muted">Your job earnings and transfers show here.</p> : <ul className="v8u-history">{d.entries.map((x) => <li key={x.reference + x.kind}><span className={`v8u-dir ${x.direction}`}><V8Icon name={x.direction === "in" ? "plus" : "send"} size={16} /></span><span><b>{x.kind === "earning" ? `Job ${x.booking || ""}` : "Transfer to bank"}</b><small>{x.reference} · {when(x.at)}{x.status !== "completed" ? ` · ${x.status}` : ""}</small></span><b className={x.direction}>{x.direction === "in" ? "+" : "−"}{inr(x.amount)}</b></li>)}</ul>}</section>
      {out ? (
        <Sheet open title={done ? "Transfer started" : "Transfer to bank"} onClose={() => setOut(false)}>
          <div className="v8c-sandbox"><b>PREVIEW / TEST</b><span>No real bank transfer happens.</span></div>
          {done ? (<div className="v8c-done"><span className="v8c-done-ico ok"><V8Icon name="check" size={26} /></span><p><b>{inr(done.amount)}</b> · {done.status}</p><p className="v8c-muted">{done.message || ""} Ref {done.reference}</p><button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={() => setOut(false)}>Done</button></div>)
            : step === "amount" ? (<><label className="v8c-field v8msg-amount"><span>Amount (₹)</span><input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 7))} autoFocus /></label><p className="v8c-muted">Available {inr(s.available)} · minimum ₹100</p>
              <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={!(Number(amount) >= 100 && Number(amount) <= s.available)} onClick={() => setStep("pin")}>Continue</button></>)
              : <PinStep api={api} amount={Number(amount)} to="your bank account" label="Transfer" onPay={transfer} onCancel={() => setOut(false)} />}
        </Sheet>) : null}
    </section>
  );
}
