// HOWDI V8 Become a Worker (board V8__09 panel 6 checklist, V8__13 worker onboarding; WKR-001..003, ROL-003) — applicant side.
// Steps save as you go: 1 About you · 2 Identity (ID type + last 4 digits, ID photo, live selfie — private) · 3 Services & price ·
// 4 Hours · 5 Review & submit. Then: Submitted (timeline) · More info needed (HOWDI's reason, edit, resubmit) · Rejected (reason,
// apply again) · Approved (open My work).
import { useCallback, useEffect, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { useV8Ui } from "../V8System";
import { Skel, readFileAsDataUrl } from "../connect/common";
import { when } from "./V8Works";

const STEPS = ["About you", "Identity", "Services & price", "Working hours", "Review & submit"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMin = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };
const MISSING = { name: "Your name", age: "Age confirmation", city: "City", id_details: "ID type and last 4 digits", id_photo: "ID photo", selfie: "Selfie", services: "Services", price: "Starting price", hours: "Working hours", declaration: "Declaration" };
const STEP_OF = { name: 0, age: 0, city: 0, id_details: 1, id_photo: 1, selfie: 1, services: 2, price: 2, hours: 3, declaration: 4 };

export default function BecomeWorker({ api, nav, reloadMe }) {
  const ui = useV8Ui();
  const [d, setD] = useState(null); const [step, setStep] = useState(0); const [f, setF] = useState(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [edit, setEdit] = useState(false);
  const load = useCallback(async () => {
    const r = await api("GET", "/api/v8/works/application"); if (!r.ok) { setD({ error: r.json.message }); return; }
    setD(r.json); const a = r.json.application;
    setF({ name: a?.name || r.json.prefill?.name || "", age_confirmed: a?.age_confirmed || false, city: a?.city || "", pincode: a?.pin_code || "", radius_km: a?.radius_km || 5, languages: a?.languages || [],
      id_type: a?.id_type || "", id_last4: a?.id_last4 || "", services: a?.services || [], experience_years: a?.experience_years ?? "", price: a?.price ?? "", bio: a?.bio || "",
      hours: DAYS.map((_, i) => { const h = (a?.hours || []).find((x) => x.weekday === i); return { weekday: i, on: Boolean(h) || (!a?.hours?.length && i >= 1 && i <= 6), start: hm(h ? h.start_min : 540), end: hm(h ? h.end_min : 1080) }; }), declaration: a?.consent || false });
    if (a?.missing?.length && a.editable) setStep(Math.min(...a.missing.map((k) => STEP_OF[k] ?? 4)));
  }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d || !f) return <Skel h={360} r={16} />;
  if (d.error) return <V8State kind="error" title="Couldn’t load your application" message={d.error} actionLabel="Retry" onAction={load} />;
  if (d.already_worker) return <V8State icon="works" title="You’re already a verified worker" message="Manage your jobs, hours and earnings in My work." actionLabel="Open My work" onAction={() => nav("worker")} />;
  if (!d.handle) return <V8State icon="user" title="Choose your @username first" message="Customers see your @username — never your phone number. Set it in your profile, then come back." />;
  const a = d.application; const status = a?.status || "new";
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const body = () => ({ name: f.name, age_confirmed: f.age_confirmed, city: f.city, pincode: f.pincode, radius_km: Number(f.radius_km), languages: f.languages, id_type: f.id_type || undefined, id_last4: f.id_last4,
    services: f.services, experience_years: f.experience_years === "" ? undefined : Number(f.experience_years), price: f.price === "" ? undefined : Number(f.price), bio: f.bio,
    hours: f.hours.filter((h) => h.on).map((h) => ({ weekday: h.weekday, start_min: toMin(h.start), end_min: toMin(h.end) })), declaration: f.declaration });
  const save = async (next) => {
    setBusy(true); setErr("");
    const r = await api("PUT", "/api/v8/works/application", body()); setBusy(false);
    if (!r.ok) { setErr(r.json.message); return false; }
    setD((x) => ({ ...x, application: r.json.application })); if (next !== undefined) setStep(next); return true;
  };
  const upload = async (kind, file) => {
    if (!file) return; if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) { setErr("Use a JPG, PNG or WebP photo up to 5 MB."); return; }
    setBusy(true); setErr(""); const r = await api("POST", "/api/v8/works/application/document", { kind, imageData: await readFileAsDataUrl(file) }); setBusy(false);
    if (!r.ok) { setErr(r.json.message); return; } setD((x) => ({ ...x, application: r.json.application })); ui?.toast({ title: r.json.message });
  };
  const submit = async () => { if (!(await save())) return; setBusy(true); const r = await api("POST", "/api/v8/works/application/submit"); setBusy(false); if (!r.ok) { setErr(r.json.message); return; } setD((x) => ({ ...x, application: r.json.application })); setEdit(false); ui?.toast({ title: "Application submitted" }); reloadMe?.(); };

  // ---------- status screens
  if (status === "approved") return <V8State icon="check" title="You’re a verified HOWDI worker" message="Go Online to start receiving job requests." actionLabel="Open My work" onAction={() => nav("worker")} />;
  if ((status === "submitted" || ((status === "info_requested" || status === "rejected") && !edit))) return (
    <section className="v8-card v8w-block v8w-become">
      <h2>{status === "submitted" ? "Application with HOWDI" : status === "info_requested" ? "HOWDI needs more information" : "Your application wasn’t approved"}</h2>
      <p className={`v8w-appstate ${status}`}><b>{status === "submitted" ? "Under review" : status === "info_requested" ? "Action needed" : "Not approved"}</b>{a.note ? ` — ${a.note}` : status === "submitted" ? " — usually within 2 working days. We’ll notify you." : ""}</p>
      <ol className="v8w-appsteps">{STEPS.slice(0, 4).map((s, i) => <li key={s} className="done"><V8Icon name="check" size={14} />{s}</li>)}<li className={status === "submitted" ? "now" : status === "rejected" ? "bad" : "now"}><V8Icon name={status === "rejected" ? "x" : "clock"} size={14} />HOWDI review</li></ol>
      <details className="v8w-timeline" open><summary>History</summary><ol>{a.history.map((h, i) => <li key={i}><b>{h.action.replace("_", " ")}</b> <small>{h.actor} · {when(h.at)}</small>{h.reason ? <p>{h.reason}</p> : null}</li>)}</ol></details>
      {status !== "submitted" ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => { setEdit(true); setStep(0); }}>{status === "rejected" ? "Fix and apply again" : "Update my application"}</button> : null}
    </section>
  );

  // ---------- wizard
  const miss = a?.missing || [];
  return (
    <section className="v8-card v8w-block v8w-become">
      <h2>Become a verified HOWDI worker</h2>
      {a?.note && edit ? <p className={`v8w-appstate ${status}`}><b>HOWDI said:</b> {a.note}</p> : null}
      <ol className="v8w-wiz" aria-label="Steps">{STEPS.map((s, i) => <li key={s}><button type="button" aria-current={step === i ? "step" : undefined} className={step === i ? "on" : ""} onClick={() => save(i)}><i>{i + 1}</i>{s}</button></li>)}</ol>
      {step === 0 ? (<div className="v8u-form">
        <label className="v8c-field"><span>Name as on your ID</span><input value={f.name} maxLength={80} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="v8c-check"><input type="checkbox" checked={f.age_confirmed} onChange={(e) => set("age_confirmed", e.target.checked)} /> I’m 18 or older</label>
        <div className="v8u-two"><label className="v8c-field"><span>City</span><input value={f.city} maxLength={60} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Khammam" /></label><label className="v8c-field"><span>PIN code</span><input inputMode="numeric" value={f.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} /></label></div>
        <label className="v8c-field"><span>How far will you travel? {f.radius_km} km</span><input type="range" min={1} max={30} value={f.radius_km} onChange={(e) => set("radius_km", e.target.value)} /></label>
        <fieldset className="v8w-fs"><legend>Languages you speak</legend><div className="v8c-chips">{d.options.languages.map((l) => <button key={l} type="button" className={`v8c-chip ${f.languages.includes(l) ? "on" : ""}`} aria-pressed={f.languages.includes(l)} onClick={() => set("languages", f.languages.includes(l) ? f.languages.filter((x) => x !== l) : [...f.languages, l])}>{l}</button>)}</div></fieldset>
      </div>) : null}
      {step === 1 ? (<div className="v8u-form">
        <p className="v8c-muted"><V8Icon name="lock" size={14} /> Only HOWDI’s verification team sees your ID and selfie. Customers never do. We store only the last 4 digits of your ID number.</p>
        <div className="v8u-two"><label className="v8c-field"><span>ID type</span><select value={f.id_type} onChange={(e) => set("id_type", e.target.value)}><option value="">Choose</option>{d.options.id_types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></label>
          <label className="v8c-field"><span>Last 4 digits of the ID</span><input inputMode="numeric" value={f.id_last4} onChange={(e) => set("id_last4", e.target.value.replace(/\D/g, "").slice(0, 4))} /></label></div>
        <div className="v8w-docs">
          <label className={`v8w-doc ${a?.has_id_photo ? "done" : ""}`}><V8Icon name={a?.has_id_photo ? "check" : "camera"} size={22} /><b>{a?.has_id_photo ? "ID photo added" : "Photo of your ID"}</b><small>Front side, all corners visible</small><input type="file" hidden accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => { upload("id", e.target.files[0]); e.target.value = ""; }} data-testid="wk-id" /><span className="v8-btn">{a?.has_id_photo ? "Replace" : "Add photo"}</span></label>
          <label className={`v8w-doc ${a?.has_selfie ? "done" : ""}`}><V8Icon name={a?.has_selfie ? "check" : "user"} size={22} /><b>{a?.has_selfie ? "Selfie added" : "Live selfie"}</b><small>Face the camera, good light, no sunglasses</small><input type="file" hidden accept="image/jpeg,image/png,image/webp" capture="user" onChange={(e) => { upload("selfie", e.target.files[0]); e.target.value = ""; }} data-testid="wk-selfie" /><span className="v8-btn">{a?.has_selfie ? "Retake" : "Take selfie"}</span></label>
        </div>
      </div>) : null}
      {step === 2 ? (<div className="v8u-form">
        <fieldset className="v8w-fs"><legend>What do you do? (first one is your main service, up to 5)</legend><div className="v8c-chips">{d.options.services.map((s) => { const i = f.services.indexOf(s.code); return <button key={s.code} type="button" className={`v8c-chip ${i >= 0 ? "on" : ""}`} aria-pressed={i >= 0} onClick={() => set("services", i >= 0 ? f.services.filter((x) => x !== s.code) : f.services.length < 5 ? [...f.services, s.code] : f.services)}>{i === 0 ? "★ " : ""}{s.name}</button>; })}</div></fieldset>
        <div className="v8u-two"><label className="v8c-field"><span>Years of experience</span><input inputMode="numeric" value={f.experience_years} onChange={(e) => set("experience_years", e.target.value.replace(/\D/g, "").slice(0, 2))} /></label><label className="v8c-field"><span>Starting price (₹ per visit)</span><input inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, "").slice(0, 5))} /></label></div>
        <label className="v8c-field"><span>About your work (shown on your profile)</span><textarea rows={3} maxLength={600} value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder="What you’re good at, tools you bring…" /></label>
        <p className="v8c-muted">HOWDI keeps a 10% service fee from each HOWDI-paid job.</p>
      </div>) : null}
      {step === 3 ? (<div className="v8u-form v8w-hours">
        <p className="v8c-muted">Customers book 1-hour slots inside these hours (India time). You can change them any time.</p>
        {f.hours.map((h) => <div key={h.weekday} className={`v8w-hrow ${h.on ? "" : "off"}`}><label className="v8w-switch"><input type="checkbox" checked={h.on} onChange={(e) => set("hours", f.hours.map((x) => (x.weekday === h.weekday ? { ...x, on: e.target.checked } : x)))} /><b>{DAYS[h.weekday]}</b></label>
          {h.on ? <><input type="time" aria-label={`${DAYS[h.weekday]} start`} value={h.start} onChange={(e) => set("hours", f.hours.map((x) => (x.weekday === h.weekday ? { ...x, start: e.target.value } : x)))} /><span>to</span><input type="time" aria-label={`${DAYS[h.weekday]} end`} value={h.end} onChange={(e) => set("hours", f.hours.map((x) => (x.weekday === h.weekday ? { ...x, end: e.target.value } : x)))} /></> : <span className="v8c-muted">Day off</span>}</div>)}
      </div>) : null}
      {step === 4 ? (<div className="v8u-form">
        {miss.length ? <div className="v8-banner-error" role="alert"><V8Icon name="alert" size={18} /><span>Still missing: {miss.map((k) => <button key={k} type="button" className="v8-link" onClick={() => setStep(STEP_OF[k] ?? 4)}>{MISSING[k]}</button>)}</span></div> : <p className="v8w-appstate ok"><V8Icon name="check" size={14} /> Everything’s ready to send.</p>}
        <div className="v8c-receipt"><span>Name</span><b>{f.name || "—"}</b><span>City</span><b>{f.city} {f.pincode}</b><span>ID</span><b>{f.id_type ? `${d.options.id_types.find((t) => t.key === f.id_type)?.label} ending ${f.id_last4}` : "—"}</b><span>Documents</span><b>{a?.has_id_photo ? "ID ✓" : "ID —"} · {a?.has_selfie ? "Selfie ✓" : "Selfie —"}</b>
          <span>Services</span><b>{f.services.map((c) => d.options.services.find((s) => s.code === c)?.name).join(", ") || "—"}</b><span>Price</span><b>{f.price ? `₹${f.price}` : "—"}</b><span>Hours</span><b>{f.hours.filter((h) => h.on).map((h) => DAYS[h.weekday]).join(", ") || "—"}</b></div>
        <label className="v8c-check"><input type="checkbox" checked={f.declaration} onChange={(e) => set("declaration", e.target.checked)} /> The details and documents are mine and true. I agree HOWDI may verify them and that customers see my @username, services, price, rating and city — never my ID, phone or address.</label>
      </div>) : null}
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      <div className="v8vc-actions">
        {step > 0 ? <button type="button" className="v8-btn" disabled={busy} onClick={() => save(step - 1)}>Back</button> : <span />}
        {step < 4 ? <button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={() => save(step + 1)}>{busy ? "Saving…" : "Save & continue"}</button>
          : <button type="button" className="v8-btn v8-btn-primary" disabled={busy || !f.declaration} onClick={submit}>{busy ? "Sending…" : status === "info_requested" ? "Resubmit to HOWDI" : "Submit for verification"}</button>}
      </div>
    </section>
  );
}
