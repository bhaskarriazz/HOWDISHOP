// HOWDI V8 — My roles (ROL-001: one HOWDI account, each role approved separately), Vendor application (ROL-002: business →
// location & tax → payout → review; statuses submitted / more info needed / rejected / approved) and the vendor workspace
// (store status, products: add, edit, photo, publish to Shop, unpublish). Member side; HOWDI Admin reviews in /admin.
import { useCallback, useEffect, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { useV8Ui } from "../V8System";
import { useApi, Sheet, Skel, Tabs, readFileAsDataUrl, safeImg } from "../connect/common";
import { OrderChip, OrderSteps } from "../shop/V8Shop";
import { inr } from "../connect/HPayUtilities";
import "../works/works.css";
import "./me.css";

const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const CHIP = { active: ["ok", "Active"], pending: ["warn", "Under review"], action_needed: ["warn", "Action needed"], rejected: ["bad", "Not approved"], draft: ["muted", "Draft"], none: ["muted", "Not started"] };

export default function V8Roles({ apiBase, getAuthHeaders, view, onRoute, onBack }) {
  const api = useApi(apiBase, getAuthHeaders);
  return (
    <div className="v8-page v8me" id="v8-main">
      <header className="v8me-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={onBack}><V8Icon name="back" size={20} /></button><h1>{view === "roles" ? "My roles" : view === "vendor" ? "Sell on HOWDI Shop" : "My store"}</h1></header>
      {view === "roles" ? <Roles api={api} onRoute={onRoute} /> : view === "vendor" ? <VendorApply api={api} onRoute={onRoute} /> : <VendorStore api={api} onRoute={onRoute} />}
    </div>
  );
}

function Roles({ api, onRoute }) {
  const [d, setD] = useState(null);
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/me/roles"); setD(r.ok ? r.json : { error: r.json.message }); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Skel h={300} r={16} />;
  if (d.error) return <V8State kind="error" title="Roles didn’t load" message={d.error} actionLabel="Retry" onAction={load} />;
  return (
    <section className="v8me-roles">
      <p className="v8c-muted">{d.note}</p>
      {d.items.map((r) => { const c = CHIP[r.status] || CHIP.none; return (
        <article key={r.code} className="v8-card v8me-role">
          <span className={`v8me-role-ico ${r.code}`}><V8Icon name={{ customer: "user", creator: "star", vendor: "store", worker: "works", learner: "learn", teacher: "learn" }[r.code]} size={22} /></span>
          <div><b>{r.label}{r.permanent ? <small> · always on</small> : null}</b><p>{r.about}</p>{r.reason ? <p className="v8me-reason">HOWDI: {r.reason}</p> : null}</div>
          <div className="v8me-role-side"><span className={`v8m-state ${c[0]}`}><i />{c[1]}</span>
            {r.open_route && !r.permanent ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => onRoute(r.open_route)}>Open workspace</button> : null}
            {r.apply_route ? <button type="button" className="v8-btn" onClick={() => onRoute(r.apply_route)}>{r.status === "none" ? "Apply" : r.status === "rejected" ? "Apply again" : r.status === "action_needed" ? "Update application" : "View application"}</button> : null}</div>
        </article>); })}
    </section>
  );
}

const STEPS = ["Business", "Location & tax", "Payout", "Review"];
function VendorApply({ api, onRoute }) {
  const ui = useV8Ui();
  const [d, setD] = useState(null); const [f, setF] = useState(null); const [step, setStep] = useState(0); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [edit, setEdit] = useState(false);
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/vendor/application"); if (!r.ok) { setD({ error: r.json.message }); return; } setD(r.json); const a = r.json.application || {};
    setF({ business_name: a.business_name || "", business_type: a.business_type || "", category: a.category || "", description: a.description || "", city: a.city || "", pincode: a.pin_code || "", pickup: a.pickup || "", pan_last4: a.pan_last4 || "", gstin: a.gstin || "", bank_last4: a.bank_last4 || "", ifsc: a.ifsc || "", declaration: a.declaration || false }); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d || !f) return <Skel h={360} r={16} />;
  if (d.error) return <V8State kind="error" title="Couldn’t load your application" message={d.error} actionLabel="Retry" onAction={load} />;
  if (d.already_vendor) return <V8State icon="store" title="Your store is approved" message="Add products and publish them to HOWDI Shop." actionLabel="Open my store" onAction={() => onRoute("/me/vendor/store")} />;
  if (!d.handle) return <V8State icon="user" title="Choose your @username first" message="Buyers see your store and @username — never your phone number." />;
  const a = d.application; const status = a?.status || "new"; const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async (next) => { setBusy(true); setErr(""); const r = await api("PUT", "/api/v8/vendor/application", f); setBusy(false); if (!r.ok) { setErr(r.json.message); return false; } setD((x) => ({ ...x, application: r.json.application })); if (next !== undefined) setStep(next); return true; };
  const upload = async (file) => { if (!file) return; if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) { setErr("Use a JPG, PNG or WebP photo up to 5 MB."); return; } setBusy(true); const r = await api("POST", "/api/v8/vendor/application/document", { imageData: await readFileAsDataUrl(file) }); setBusy(false); if (!r.ok) { setErr(r.json.message); return; } setD((x) => ({ ...x, application: r.json.application })); ui?.toast({ title: r.json.message }); };
  const submit = async () => { if (!(await save())) return; setBusy(true); const r = await api("POST", "/api/v8/vendor/application/submit"); setBusy(false); if (!r.ok) { setErr(r.json.message); return; } setD((x) => ({ ...x, application: r.json.application })); setEdit(false); ui?.toast({ title: "Application submitted" }); };
  if (status === "submitted" || ((status === "info_requested" || status === "rejected") && !edit)) return (
    <section className="v8-card v8me-block">
      <h2>{status === "submitted" ? "Application with HOWDI" : status === "info_requested" ? "HOWDI needs more information" : "Your store wasn’t approved"}</h2>
      <p className={`v8w-appstate ${status}`}><b>{status === "submitted" ? "Under review" : status === "info_requested" ? "Action needed" : "Not approved"}</b>{a.note ? ` — ${a.note}` : " — usually within 2 working days. We’ll notify you."}</p>
      <ol className="v8w-timeline-list">{a.history.map((h, i) => <li key={i}><b>{h.action.replace("_", " ")}</b> <small>{h.actor} · {when(h.at)}</small>{h.reason ? <p>{h.reason}</p> : null}</li>)}</ol>
      {status !== "submitted" ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => { setEdit(true); setStep(0); }}>{status === "rejected" ? "Fix and apply again" : "Update my application"}</button> : null}
    </section>
  );
  return (
    <section className="v8-card v8me-block">
      <h2>Open your store on HOWDI Shop</h2>
      {a?.note && edit ? <p className={`v8w-appstate ${status}`}><b>HOWDI said:</b> {a.note}</p> : null}
      <ol className="v8w-wiz">{STEPS.map((s, i) => <li key={s}><button type="button" aria-current={step === i ? "step" : undefined} className={step === i ? "on" : ""} onClick={() => save(i)}><i>{i + 1}</i>{s}</button></li>)}</ol>
      {step === 0 ? (<div className="v8u-form">
        <label className="v8c-field"><span>Store / business name</span><input value={f.business_name} maxLength={120} onChange={(e) => set("business_name", e.target.value)} /></label>
        <label className="v8c-field"><span>Business type</span><select value={f.business_type} onChange={(e) => set("business_type", e.target.value)}><option value="">Choose</option>{d.options.business_types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></label>
        <label className="v8c-field"><span>Main category</span><select value={f.category} onChange={(e) => set("category", e.target.value)}><option value="">Choose</option>{d.options.categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="v8c-field"><span>What do you sell? (shown on your store)</span><textarea rows={3} maxLength={600} value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
      </div>) : null}
      {step === 1 ? (<div className="v8u-form">
        <div className="v8u-two"><label className="v8c-field"><span>City</span><input value={f.city} maxLength={60} onChange={(e) => set("city", e.target.value)} /></label><label className="v8c-field"><span>PIN code</span><input inputMode="numeric" value={f.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} /></label></div>
        <label className="v8c-field"><span>Pickup address (private — for couriers only)</span><textarea rows={2} maxLength={300} value={f.pickup} onChange={(e) => set("pickup", e.target.value)} /></label>
        <div className="v8u-two"><label className="v8c-field"><span>PAN — its 4 digits (ABCDE1234F)</span><input inputMode="numeric" value={f.pan_last4} onChange={(e) => set("pan_last4", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="e.g. 1234" /></label><label className="v8c-field"><span>GSTIN (optional)</span><input value={f.gstin} maxLength={15} onChange={(e) => set("gstin", e.target.value.toUpperCase())} /></label></div>
        <label className={`v8w-doc ${a?.has_id_proof ? "done" : ""}`}><V8Icon name={a?.has_id_proof ? "check" : "camera"} size={22} /><b>{a?.has_id_proof ? "ID proof added" : "Photo of your ID or PAN card"}</b><small>Private — only HOWDI’s verification team sees it</small><input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { upload(e.target.files[0]); e.target.value = ""; }} data-testid="vd-id" /><span className="v8-btn">{a?.has_id_proof ? "Replace" : "Add photo"}</span></label>
      </div>) : null}
      {step === 2 ? (<div className="v8u-form">
        <p className="v8c-muted"><V8Icon name="lock" size={14} /> We store only the last 4 digits of your account. Payouts are Preview/Test until HOWDI connects a payout provider.</p>
        <div className="v8u-two"><label className="v8c-field"><span>Bank account — last 4 digits</span><input inputMode="numeric" value={f.bank_last4} onChange={(e) => set("bank_last4", e.target.value.replace(/\D/g, "").slice(0, 4))} /></label><label className="v8c-field"><span>IFSC</span><input value={f.ifsc} maxLength={11} onChange={(e) => set("ifsc", e.target.value.toUpperCase())} placeholder="SBIN0001234" /></label></div>
      </div>) : null}
      {step === 3 ? (<div className="v8u-form">
        {a?.missing?.filter((x) => x !== "declaration").length ? <div className="v8-banner-error" role="alert"><V8Icon name="alert" size={18} /><span>Still missing: {a.missing.filter((x) => x !== "declaration").join(", ")}</span></div> : null}
        <div className="v8c-receipt"><span>Store</span><b>{f.business_name || "—"}</b><span>Type · category</span><b>{d.options.business_types.find((t) => t.key === f.business_type)?.label || "—"} · {f.category || "—"}</b><span>City</span><b>{f.city} {f.pincode}</b><span>PAN</span><b>{f.pan_last4 ? `•••• ${f.pan_last4}` : "—"}</b><span>GSTIN</span><b>{f.gstin || "Not registered"}</b><span>ID proof</span><b>{a?.has_id_proof ? "Added ✓" : "—"}</b><span>Bank</span><b>{f.bank_last4 ? `•••• ${f.bank_last4} · ${f.ifsc}` : "—"}</b></div>
        <label className="v8c-check"><input type="checkbox" checked={f.declaration} onChange={(e) => set("declaration", e.target.checked)} /> The details are mine and true. I’ll follow HOWDI Shop seller rules. Buyers see my store name, @username, city and products — never my PAN, bank or pickup address.</label>
      </div>) : null}
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      <div className="v8vc-actions">{step > 0 ? <button type="button" className="v8-btn" disabled={busy} onClick={() => save(step - 1)}>Back</button> : <span />}
        {step < 3 ? <button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={() => save(step + 1)}>Save & continue</button> : <button type="button" className="v8-btn v8-btn-primary" disabled={busy || !f.declaration} onClick={submit}>{status === "info_requested" ? "Resubmit to HOWDI" : "Submit for verification"}</button>}</div>
    </section>
  );
}

function VendorStore({ api, onRoute }) {
  const ui = useV8Ui();
  const [s, setS] = useState(null); const [items, setItems] = useState(null); const [form, setForm] = useState(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const [a, b] = await Promise.all([api("GET", "/api/v8/vendor/store"), api("GET", "/api/v8/vendor/products")]); setS(a.ok ? a.json : { error: a.json.message, code: a.json.code }); setItems(b.ok ? b.json.items : []); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!s) return <Skel h={300} r={16} />;
  if (s.error) return <V8State icon="store" title={s.code === "NOT_A_VENDOR" ? "Your store isn’t approved yet" : "Store didn’t load"} message={s.error} actionLabel={s.code === "NOT_A_VENDOR" ? "Go to my application" : "Retry"} onAction={s.code === "NOT_A_VENDOR" ? () => onRoute("/me/vendor") : load} />;
  const save = async () => {
    setBusy(true); setErr("");
    const body = { name: form.name, price: Number(form.price), mrp: form.mrp === "" ? undefined : Number(form.mrp), stock: Number(form.stock || 0), category: form.category, description: form.description, imageData: form.imageData || undefined };
    const r = form.key ? await api("PATCH", `/api/v8/vendor/products/${form.key}`, body) : await api("POST", "/api/v8/vendor/products", body);
    setBusy(false); if (!r.ok) { setErr(r.json.message); return; } setForm(null); ui?.toast({ title: form.key ? "Product saved" : "Product added as a draft" }); load();
  };
  const toggle = async (p) => { const r = await api("POST", `/api/v8/vendor/products/${p.public_key}/${p.status === "published" ? "unpublish" : "publish"}`); ui?.toast(r.ok ? { title: r.json.message } : { kind: "error", title: r.json.message }); load(); };
  const st = s.store;
  return (
    <section className="v8me-store">
      <div className="v8-card v8me-storehead"><span className="v8me-role-ico vendor"><V8Icon name="store" size={24} /></span><div><h2>{st.name}</h2><p className="v8c-muted">{st.category} · {st.city} · @{st.handle} · Verified vendor</p></div><span className={`v8m-state ${st.status === "online" ? "ok" : "muted"}`}><i />Store {st.status}</span></div>
      <div className="v8w-tiles"><div className="v8-card v8w-tile"><small>Live in Shop</small><b>{s.counts.published}</b></div><div className="v8-card v8w-tile"><small>Drafts</small><b>{s.counts.drafts}</b></div><div className="v8-card v8w-tile"><small>Out of stock</small><b>{s.counts.out_of_stock}</b></div></div>
      <div className="v8w-row"><button type="button" className="v8-btn v8-btn-primary" onClick={() => setForm({ name: "", price: "", mrp: "", stock: "1", category: st.category, description: "" })}><V8Icon name="plus" size={16} />Add product</button></div>
      <section className="v8-card v8me-block"><h3>Products</h3>
        {!items ? <Skel h={80} /> : !items.length ? <p className="v8c-muted">No products yet. Add one — it starts as a draft; publish it when it has a photo.</p> : items.map((p) => (
          <div key={p.public_key} className="v8me-prod">{safeImg(p.images[0]) ? <img src={p.images[0]} alt="" /> : <span className="v8me-prod-ph"><V8Icon name="image" size={20} /></span>}
            <span><b>{p.name}</b><small>{inr(p.price)}{p.mrp > p.price ? ` · MRP ${inr(p.mrp)}` : ""} · {p.stock} in stock</small><span className={`v8m-state ${p.status === "published" ? "ok" : "muted"}`}><i />{p.status === "published" ? "Live in Shop" : "Draft"}</span></span>
            <span className="v8me-prod-act"><button type="button" className="v8-btn" onClick={() => setForm({ key: p.public_key, name: p.name, price: String(p.price), mrp: String(p.mrp), stock: String(p.stock), category: p.category, description: p.description || "", preview: p.images[0] })}>Edit</button><button type="button" className={`v8-btn ${p.status === "published" ? "" : "v8-btn-primary"}`} onClick={() => toggle(p)}>{p.status === "published" ? "Unpublish" : "Publish"}</button></span></div>))}
      </section>
      <VendorOrders api={api} />
      {form ? (
        <Sheet open title={form.key ? "Edit product" : "Add product"} onClose={() => setForm(null)}>
          <div className="v8u-form">
            <label className="v8w-doc">{safeImg(form.imageData || form.preview) ? <img className="v8me-prev" src={form.imageData || form.preview} alt="" /> : <V8Icon name="camera" size={22} />}<b>{form.imageData || form.preview ? "Change photo" : "Add a photo"}</b><small>JPG, PNG or WebP, up to 5 MB</small><input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={async (e) => { const fl = e.target.files[0]; if (fl) { const du = await readFileAsDataUrl(fl); setForm((x) => ({ ...x, imageData: du })); } e.target.value = ""; }} data-testid="vp-photo" /></label>
            <label className="v8c-field"><span>Product name</span><input value={form.name} maxLength={120} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} /></label>
            <div className="v8u-two"><label className="v8c-field"><span>Price (₹)</span><input inputMode="decimal" value={form.price} onChange={(e) => setForm((x) => ({ ...x, price: e.target.value.replace(/[^0-9.]/g, "") }))} /></label><label className="v8c-field"><span>MRP (₹, optional)</span><input inputMode="decimal" value={form.mrp} onChange={(e) => setForm((x) => ({ ...x, mrp: e.target.value.replace(/[^0-9.]/g, "") }))} /></label></div>
            <label className="v8c-field"><span>Stock</span><input inputMode="numeric" value={form.stock} onChange={(e) => setForm((x) => ({ ...x, stock: e.target.value.replace(/\D/g, "") }))} /></label>
            <label className="v8c-field"><span>Description</span><textarea rows={3} maxLength={600} value={form.description} onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} /></label>
            {err ? <p className="v8c-err" role="alert">{err}</p> : null}
            <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setForm(null)}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy || !form.name || !form.price} onClick={save}>{busy ? "Saving…" : "Save"}</button></div>
          </div>
        </Sheet>) : null}
    </section>
  );
}

// Seller side of the Shop journey: New → accept / decline (reason) → pack → ship (courier + tracking) → deliver; returns:
// approve (pickup) / reject (reason) → received (refund). The buyer's address appears only after accepting.
const RWHEN = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
function VendorOrders({ api }) {
  const ui = useV8Ui(); const [tab, setTab] = useState("new"); const [d, setD] = useState(null); const [sheet, setSheet] = useState(null); const [x, setX] = useState({ reason: "", courier: "", tracking: "" });
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/vendor/orders?tab=${tab}`); setD(r.ok ? r.json : { error: r.json.message }); }, [api, tab]);
  useEffect(() => { load(); const id = window.setInterval(load, 8000); return () => window.clearInterval(id); }, [load]);
  const act = async (o, a, body) => { const r = await api("POST", a.startsWith("return:") ? `/api/v8/vendor/returns/${o.return.public_key}/${a.slice(7)}` : `/api/v8/vendor/orders/${o.public_key}/${a}`, body); setSheet(null); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return; } ui?.toast({ title: "Updated — the buyer was notified" }); load(); };
  const LBL = { accept: "Accept order", pack: "Mark packed", ship: "Ship", deliver: "Mark delivered" };
  return (
    <section className="v8-card v8me-block" aria-label="Orders">
      <h3>Orders</h3>
      <Tabs compact tabs={[{ value: "new", label: "New", count: d?.counts?.new }, { value: "active", label: "To ship", count: d?.counts?.active }, { value: "returns", label: "Returns", count: d?.counts?.returns }, { value: "done", label: "Done" }]} value={tab} onChange={setTab} label="Order tabs" />
      {!d ? <Skel h={90} /> : d.error ? <p className="v8c-err">{d.error}</p> : !d.items.length ? <p className="v8c-muted">{tab === "new" ? "No new orders. You’ll get a notification when someone buys." : "Nothing here."}</p> : d.items.map((o) => (
        <article key={o.public_key} className="v8me-order">
          <header><b>{o.public_key}</b><OrderChip s={o.state} /></header>
          {o.items.map((i, k) => <p key={k}>{i.qty} × {i.name} · {inr(i.line_total)}</p>)}
          <p className="v8c-muted">{RWHEN(o.placed_at)} · total {inr(o.total)} · you receive {inr(o.net)} (8% HOWDI commission) · {o.payment.method === "hpay" ? `HPay ${o.payment.state}` : `Cash on delivery${o.payment.state === "collected" ? " · collected" : ""}`}</p>
          {o.delivery.hidden ? <p className="v8me-hidden"><V8Icon name="lock" size={14} /> Ships to {o.delivery.city}. The buyer’s address appears when you accept.</p> : <p className="v8me-addr"><b>Ship to:</b> {o.delivery.name}, {o.delivery.line}, {o.delivery.city}, {o.delivery.state} {o.delivery.pin_code} · {o.delivery.contact}</p>}
          {o.tracking ? <p className="v8c-muted">{o.courier} · {o.tracking}</p> : null}
          {!["cancelled", "rejected", "returned"].includes(o.state) ? <OrderSteps o={o} /> : o.reason ? <p className="v8c-muted">Reason: {o.reason}</p> : null}
          {o.return ? <p className="v8me-ret"><V8Icon name="refresh" size={14} /> Return {o.return.public_key}: {o.return.reason}{o.return.details ? ` — ${o.return.details}` : ""} · <b>{o.return.status}</b></p> : null}
          <div className="v8w-row">
            {o.actions.map((a) => a === "reject" ? <button key={a} type="button" className="v8-btn" onClick={() => { setX({ reason: "" }); setSheet({ o, a: "reject" }); }}>Decline</button>
              : a === "ship" ? <button key={a} type="button" className="v8-btn v8-btn-primary" onClick={() => { setX({ courier: "", tracking: "" }); setSheet({ o, a: "ship" }); }}>Ship</button>
                : <button key={a} type="button" className="v8-btn v8-btn-primary" onClick={() => act(o, a)}>{LBL[a]}</button>)}
            {(o.return?.actions || []).map((a) => a === "reject" ? <button key={a} type="button" className="v8-btn" onClick={() => { setX({ reason: "" }); setSheet({ o, a: "return:reject" }); }}>Reject return</button>
              : <button key={a} type="button" className="v8-btn v8-btn-primary" onClick={() => act(o, `return:${a}`)}>{a === "approve" ? "Approve return (schedule pickup)" : "Item received — refund buyer"}</button>)}
          </div>
        </article>))}
      {sheet ? <Sheet open title={sheet.a === "ship" ? "Ship order" : sheet.a === "reject" ? "Decline order" : "Reject return"} onClose={() => setSheet(null)}>
        {sheet.a === "ship" ? (<div className="v8u-two"><label className="v8c-field"><span>Courier</span><input value={x.courier} onChange={(e) => setX((y) => ({ ...y, courier: e.target.value }))} placeholder="e.g. India Post" /></label><label className="v8c-field"><span>Tracking number</span><input value={x.tracking} onChange={(e) => setX((y) => ({ ...y, tracking: e.target.value }))} /></label></div>)
          : <label className="v8c-field"><span>Reason (the buyer sees this)</span><input value={x.reason} onChange={(e) => setX((y) => ({ ...y, reason: e.target.value }))} /></label>}
        <p className="v8c-muted">{sheet.a === "reject" ? "The buyer is refunded in full and the stock goes back." : sheet.a === "ship" ? "The buyer gets the tracking number." : "The buyer can contact HOWDI support."}</p>
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setSheet(null)}>Back</button><button type="button" className="v8-btn v8-btn-primary" disabled={sheet.a === "ship" ? !(x.courier && x.tracking) : x.reason.trim().length < 4} onClick={() => act(sheet.o, sheet.a, sheet.a === "ship" ? { courier: x.courier, tracking: x.tracking } : { reason: x.reason })}>Confirm</button></div>
      </Sheet> : null}
    </section>
  );
}
