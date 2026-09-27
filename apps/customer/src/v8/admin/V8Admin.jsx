// HOWDI V8 Admin console — /admin (decision default). Staff sign in with the existing admin login (session token kept in
// sessionStorage for this tab only). First queue: Worker verification (WKR-002 / ROL-003): queue by status → application →
// private documents (streamed with the admin session, shown from memory, never a public URL) → checks → approve / reject /
// request info with a reason → history. Every view and decision is audited server-side.
import { useCallback, useEffect, useState } from "react";
import { V8Icon } from "../V8Shell";
import "./admin.css";

const API = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
const KEY = "howdiAdminToken";
const read = () => { try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; } };
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default function V8Admin() {
  const [token, setToken] = useState(read());
  const call = useCallback(async (method, path, body) => {
    const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", "x-howdi-admin-token": token }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401) { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } setToken(""); }
    let json = {}; try { json = await r.json(); } catch { /* not json */ }
    return { ok: r.ok, status: r.status, json };
  }, [token]);
  if (!token) return <Login onToken={(t) => { try { sessionStorage.setItem(KEY, t); } catch { /* ignore */ } setToken(t); }} />;
  return <Console call={call} token={token} onSignOut={() => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } setToken(""); }} />;
}

function Login({ onToken }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async (e) => { e.preventDefault(); setBusy(true); setErr(""); try { const r = await fetch(`${API}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) }); const j = await r.json(); if (!r.ok || !j.token) setErr(j.message || "Sign-in failed."); else onToken(j.token); } catch { setErr("Can’t reach the HOWDI server."); } setBusy(false); };
  return (
    <main className="v8a-login">
      <form className="v8a-card" onSubmit={go} aria-labelledby="adm-h">
        <span className="v8a-brand">HOWDI <b>Admin</b></span>
        <h1 id="adm-h">Staff sign-in</h1>
        <p className="v8a-muted">For HOWDI staff only. Every action is recorded.</p>
        <label className="v8a-field"><span>Username</span><input autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} required /></label>
        <label className="v8a-field"><span>Password</span><input type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} required /></label>
        {err ? <p className="v8a-err" role="alert">{err}</p> : null}
        <button className="v8a-btn primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}

const QUEUES = [
  { key: "workers", label: "Workers", icon: "works", live: true },
  { key: "vendors", label: "Vendors", icon: "store" }, { key: "teachers", label: "Teachers", icon: "learn" },
  { key: "learners", label: "Learners", icon: "user" }, { key: "institutes", label: "Institutes / Colleges", icon: "users" },
];
function Console({ call, token, onSignOut }) {
  const [q, setQ] = useState("workers");
  return (
    <div className="v8a">
      <aside className="v8a-nav" aria-label="Admin">
        <span className="v8a-brand">HOWDI <b>Admin</b></span>
        <h2>Verification</h2>
        {QUEUES.map((x) => <button key={x.key} type="button" className={q === x.key ? "on" : ""} aria-current={q === x.key ? "page" : undefined} onClick={() => setQ(x.key)}><V8Icon name={x.icon} size={18} />{x.label}{!x.live ? <small>next</small> : null}</button>)}
        <button type="button" className="v8a-out" onClick={onSignOut}><V8Icon name="back" size={16} />Sign out</button>
      </aside>
      <main className="v8a-main">{q === "workers" ? <Workers call={call} token={token} /> : <div className="v8a-card"><h1>{QUEUES.find((x) => x.key === q).label}</h1><p className="v8a-muted">This verification queue is being built next (same approve / reject / request-info journey as Workers).</p></div>}</main>
    </div>
  );
}

const TABS = [["submitted", "To review"], ["info_requested", "More info asked"], ["approved", "Approved"], ["rejected", "Rejected"]];
function Workers({ call, token }) {
  const [status, setStatus] = useState("submitted"); const [d, setD] = useState(null); const [sel, setSel] = useState("");
  const load = useCallback(async () => { const r = await call("GET", `/api/admin/v8/works/applications?status=${status}`); setD(r.ok ? r.json : { error: r.json.message || "Couldn’t load the queue." }); }, [call, status]);
  useEffect(() => { setD(null); load(); }, [load]);
  return (
    <div className="v8a-split">
      <section className="v8a-card v8a-queue" aria-label="Worker applications">
        <h1>Worker verification</h1>
        <div className="v8a-tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={status === k} className={status === k ? "on" : ""} onClick={() => { setStatus(k); setSel(""); }}>{l}{d?.counts?.[k] ? <i>{d.counts[k]}</i> : null}</button>)}</div>
        {!d ? <p className="v8a-muted">Loading…</p> : d.error ? <p className="v8a-err">{d.error} <button className="v8a-link" onClick={load}>Retry</button></p>
          : !d.items.length ? <p className="v8a-empty">Nothing here.</p>
            : <ul className="v8a-list">{d.items.map((x) => <li key={x.public_key}><button type="button" className={sel === x.public_key ? "on" : ""} onClick={() => setSel(x.public_key)}><b>{x.name || "—"}</b><small>@{x.applicant?.public_username} · {x.city || "—"}</small><small>{x.services.join(", ")}</small>{x.waiting_hours != null && status === "submitted" ? <em className={x.waiting_hours > 48 ? "late" : ""}>{x.waiting_hours} h waiting</em> : null}</button></li>)}</ul>}
      </section>
      <section className="v8a-card v8a-detail">{sel ? <Application key={sel} call={call} token={token} code={sel} onDecided={load} /> : <p className="v8a-muted">Choose an application.</p>}</section>
    </div>
  );
}

function Doc({ token, code, kind, label }) {
  const [src, setSrc] = useState(""); const [err, setErr] = useState("");
  useEffect(() => {
    let url = ""; let live = true;
    fetch(`${API}/api/admin/v8/works/applications/${code}/document/${kind}`, { headers: { "x-howdi-admin-token": token } })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("missing")))).then((b) => { url = URL.createObjectURL(b); if (live) setSrc(url); }).catch(() => live && setErr("Not uploaded"));
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [token, code, kind]);
  return <figure className="v8a-doc"><figcaption>{label}</figcaption>{src ? <img src={src} alt={label} /> : <span>{err || "Loading…"}</span>}</figure>;
}

function Application({ call, token, code, onDecided }) {
  const [a, setA] = useState(null); const [checks, setChecks] = useState({ identity: false, selfie: false, skill: false }); const [reason, setReason] = useState(""); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState("");
  const load = useCallback(async () => { const r = await call("GET", `/api/admin/v8/works/applications/${code}`); setA(r.ok ? r.json.application : { error: r.json.message }); }, [call, code]);
  useEffect(() => { load(); }, [load]);
  if (!a) return <p className="v8a-muted">Loading…</p>;
  if (a.error) return <p className="v8a-err">{a.error}</p>;
  const decide = async (decision) => { setBusy(true); setMsg(null); const r = await call("POST", `/api/admin/v8/works/applications/${code}/decide`, { decision, reason, checks }); setBusy(false); setConfirm(""); if (!r.ok) { setMsg({ err: true, text: r.json.message }); return; } setA(r.json.application); setMsg({ text: decision === "approve" ? `Approved — worker ${r.json.worker?.ref} is live and the applicant was notified.` : decision === "reject" ? "Rejected — the applicant was notified with your reason." : "Sent — the applicant can update and resubmit." }); onDecided(); };
  const open = a.status === "submitted";
  return (
    <div className="v8a-app">
      <header><div><h2>{a.name}</h2><p className="v8a-muted">@{a.applicant?.public_username} · member since {when(a.applicant?.member_since)} · contact {a.applicant?.contact || "—"}</p></div><span className={`v8a-status ${a.status}`}>{a.status.replace("_", " ")}</span></header>
      <p className="v8a-muted">Application {a.public_key} · submitted {when(a.submitted_at)}</p>
      <div className="v8a-grid">
        <dl><dt>Age 18+</dt><dd>{a.age_confirmed ? "Confirmed by applicant" : "Not confirmed"}</dd><dt>City / PIN</dt><dd>{a.city} {a.pin_code || ""}</dd><dt>Service radius</dt><dd>{a.radius_km ? `${a.radius_km} km` : "—"}</dd><dt>Languages</dt><dd>{a.languages.join(", ") || "—"}</dd>
          <dt>ID</dt><dd>{a.id_type ? `${{ aadhaar: "Aadhaar", pan: "PAN", voter: "Voter ID", dl: "Driving licence" }[a.id_type]} ending ${a.id_last4}` : "—"}</dd>
          <dt>Services</dt><dd>{a.service_names.join(", ")}</dd><dt>Experience</dt><dd>{a.experience_years != null ? `${a.experience_years} years` : "—"}</dd><dt>Starting price</dt><dd>₹{a.price}</dd><dt>About</dt><dd>{a.bio || "—"}</dd>
          <dt>Hours (IST)</dt><dd>{a.hours.map((h) => `${DAY[h.weekday]} ${hm(h.start_min)}–${hm(h.end_min)}`).join(" · ") || "—"}</dd></dl>
        <div className="v8a-docs"><Doc token={token} code={code} kind="id" label="ID document" /><Doc token={token} code={code} kind="selfie" label="Live selfie" /></div>
      </div>
      {open ? (
        <section className="v8a-decide" aria-label="Decision">
          <h3>Checks</h3>
          {[["identity", "ID is genuine, readable, and the last 4 digits match"], ["selfie", "Selfie matches the ID photo"], ["skill", "Skill / experience is credible for the services"]].map(([k, l]) => <label key={k} className="v8a-check"><input type="checkbox" checked={checks[k]} onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))} />{l}</label>)}
          <h3>Reason <small>(sent to the applicant — required to reject or ask for info)</small></h3>
          <div className="v8a-chips">{a.reject_templates.map((t) => <button key={t} type="button" onClick={() => setReason(t)}>{t}</button>)}</div>
          <textarea rows={3} maxLength={600} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Write it for the applicant: what’s wrong and how to fix it." aria-label="Reason" />
          {msg ? <p className={msg.err ? "v8a-err" : "v8a-ok"} role="status">{msg.text}</p> : null}
          <div className="v8a-actions">
            <button type="button" className="v8a-btn" disabled={busy || reason.trim().length < 5} onClick={() => decide("request_info")}>Ask for more info</button>
            <button type="button" className="v8a-btn danger" disabled={busy || reason.trim().length < 5} onClick={() => setConfirm("reject")}>Reject</button>
            <button type="button" className="v8a-btn primary" disabled={busy || !(checks.identity && checks.selfie && checks.skill)} onClick={() => setConfirm("approve")}>Approve</button>
          </div>
          {confirm ? <div className="v8a-confirm" role="alertdialog" aria-label="Confirm decision"><p>{confirm === "approve" ? `Approve ${a.name}? They become a verified worker and customers can book them.` : `Reject ${a.name}? They’ll see: “${reason}”`}</p><button type="button" className="v8a-btn" onClick={() => setConfirm("")}>Back</button><button type="button" className={`v8a-btn ${confirm === "approve" ? "primary" : "danger"}`} disabled={busy} onClick={() => decide(confirm)}>{confirm === "approve" ? "Yes, approve" : "Yes, reject"}</button></div> : null}
        </section>) : (msg ? <p className="v8a-ok" role="status">{msg.text}</p> : null)}
      {a.note ? <p className="v8a-note"><b>Reason given:</b> {a.note}</p> : null}
      <section><h3>History</h3><ol className="v8a-hist">{a.history.map((h, i) => <li key={i}><b>{h.action.replace("_", " ")}</b> <small>{h.actor} · {when(h.at)}</small>{h.reason ? <p>{h.reason}</p> : null}</li>)}</ol></section>
    </div>
  );
}
