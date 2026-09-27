// HOWDI V8 — HPay wallet (balance, add money in Preview/Test, all receipts with filters, links to pay / utilities) and
// profile picture (upload with preview, replace, remove). Routes: /me/wallet · /me/photo
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { useV8Ui } from "../V8System";
import { useApi, Skel, Tabs } from "../connect/common";
import { inr, newKey } from "../connect/HPayUtilities";
import "./me.css";

const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

export function Wallet({ apiBase, getAuthHeaders, onRoute, onBack }) {
  const api = useApi(apiBase, getAuthHeaders); const ui = useV8Ui();
  const [d, setD] = useState(null); const [tab, setTab] = useState("all"); const [amt, setAmt] = useState(""); const [busy, setBusy] = useState(false); const key = useRef(newKey()); const [err, setErr] = useState("");
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/hpay/history"); setD(r.ok ? r.json : { error: r.json.message }); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <div className="v8-page v8me"><Skel h={320} r={16} /></div>;
  if (d.error) return <div className="v8-page v8me"><V8State kind="error" title="Your wallet didn’t load" message={d.error} actionLabel="Retry" onAction={load} /></div>;
  const add = async () => {
    setErr(""); setBusy(true); const r = await api("POST", "/api/v8/hpay/add-money", { amount: Number(amt), idem_key: key.current }); setBusy(false);
    if (!r.ok) { setErr(r.json.message); return; } key.current = newKey(); setAmt(""); ui?.toast({ title: `${inr(r.json.added)} added — balance ${inr(r.json.balance)}` }); load();
  };
  const items = d.items.filter((x) => tab === "all" || x.direction === tab);
  const inSum = d.items.filter((x) => x.direction === "in").reduce((t, x) => t + x.amount, 0); const outSum = d.items.filter((x) => x.direction === "out").reduce((t, x) => t + x.amount, 0);
  return (
    <div className="v8-page v8me" id="v8-main">
      <header className="v8me-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={onBack}><V8Icon name="back" size={20} /></button><h1>HPay wallet</h1></header>
      <section className="v8-card v8me-wallet">
        <small>Available balance{d.sandbox ? " · Preview/Test money" : ""}</small>
        <b className="v8me-bal">{d.balance === null ? "—" : inr(d.balance)}</b>
        <div className="v8me-wstats"><span><V8Icon name="trend" size={14} /> In {inr(inSum)}</span><span>Out {inr(outSum)}</span><small>last {d.items.length} receipts</small></div>
        <div className="v8w-row">
          <button type="button" className="v8-btn" onClick={() => onRoute("/connect/messages")}><V8Icon name="connect" size={16} />Pay someone</button>
          <button type="button" className="v8-btn" onClick={() => onRoute("/shop/orders")}><V8Icon name="box" size={16} />Shop orders</button>
        </div>
      </section>
      <section className="v8-card v8me-block" aria-label="Add money">
        <h3>Add money</h3>
        {d.sandbox ? (<>
          <p className="v8c-muted">Preview/Test only: this adds test money so you can try payments. No bank or card is charged. ₹100–₹5,000 at a time, up to ₹10,000 a day.</p>
          <div className="v8l-chips">{[200, 500, 1000, 2000].map((a) => <button key={a} type="button" className={Number(amt) === a ? "on" : ""} onClick={() => setAmt(String(a))}>{inr(a)}</button>)}</div>
          <div className="v8me-addrow"><label className="v8c-field"><span>Amount (₹)</span><input inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="500" /></label>
            <button type="button" className="v8-btn v8-btn-primary" disabled={busy || !(Number(amt) >= 100)} onClick={add}>{busy ? "Adding…" : `Add ${amt ? inr(amt) : "money"}`}</button></div>
          {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        </>) : <p className="v8c-muted">Adding money needs a payment provider, which isn’t connected yet.</p>}
      </section>
      <section className="v8-card v8me-block" aria-label="Receipts">
        <h3>Receipts</h3>
        <Tabs compact tabs={[{ value: "all", label: "All" }, { value: "in", label: "Money in" }, { value: "out", label: "Money out" }]} value={tab} onChange={setTab} label="Receipts filter" />
        {!items.length ? <p className="v8c-muted">No payments yet.</p> : <ul className="v8me-txns">{items.map((t) => (
          <li key={t.reference}><span className={`v8me-dir ${t.direction}`}><V8Icon name={t.direction === "in" ? "trend" : "refresh"} size={16} /></span>
            <span><b>{t.label}{t.counterpart ? ` · @${t.counterpart.public_username}` : ""}</b><small>{t.note ? `${t.note} · ` : ""}{when(t.created_at)} · {t.reference}</small></span>
            <b className={t.direction === "in" ? "v8me-in" : ""}>{t.direction === "in" ? "+" : "−"}{inr(t.amount)}</b></li>))}</ul>}
      </section>
    </div>
  );
}

export function Photo({ apiBase, getAuthHeaders, onBack }) {
  const api = useApi(apiBase, getAuthHeaders); const ui = useV8Ui();
  const [me, setMe] = useState(null); const [preview, setPreview] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const input = useRef(null);
  useEffect(() => { api("GET", "/api/v8/me/avatar").then((r) => setMe(r.ok ? r.json.me : { error: r.json.message })); }, [api]);
  if (!me) return <div className="v8-page v8me"><Skel h={260} r={16} /></div>;
  const pick = (f) => {
    setErr(""); if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setErr("Use a JPG, PNG or WebP photo."); return; }
    if (f.size > 5 * 1024 * 1024) { setErr("That photo is over 5 MB. Choose a smaller one."); return; }
    const r = new FileReader(); r.onload = () => setPreview(String(r.result)); r.readAsDataURL(f);
  };
  const save = async () => { setBusy(true); setErr(""); const r = await api("POST", "/api/v8/me/avatar", { imageData: preview }); setBusy(false); if (!r.ok) { setErr(r.json.message); return; } setMe((m) => ({ ...m, avatar_url: r.json.avatar_url })); setPreview(""); ui?.toast({ title: "Profile photo updated — it shows everywhere on HOWDI" }); };
  const remove = async () => { const r = await api("DELETE", "/api/v8/me/avatar"); if (r.ok) { setMe((m) => ({ ...m, avatar_url: null })); ui?.toast({ title: "Profile photo removed" }); } };
  const shown = preview || me.avatar_url;
  return (
    <div className="v8-page v8me" id="v8-main">
      <header className="v8me-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={onBack}><V8Icon name="back" size={20} /></button><h1>Profile photo</h1></header>
      <section className="v8-card v8me-photo">
        <span className="v8me-avatar">{shown ? <img src={shown} alt="Your profile photo" /> : <b>{(me.display_name || me.public_username || "?").slice(0, 1).toUpperCase()}</b>}</span>
        <p><b>{me.display_name}</b> · @{me.public_username}</p>
        <p className="v8c-muted">{preview ? "Preview — not saved yet." : "People see this photo on your profile, posts, messages, reviews and orders."}</p>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} aria-label="Choose a photo" />
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        <div className="v8w-row">
          {preview ? <><button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save photo"}</button><button type="button" className="v8-btn" onClick={() => setPreview("")}>Cancel</button></>
            : <><button type="button" className="v8-btn v8-btn-primary" onClick={() => input.current?.click()}><V8Icon name="image" size={16} />{me.avatar_url ? "Change photo" : "Upload photo"}</button>{me.avatar_url ? <button type="button" className="v8-btn" onClick={remove}>Remove</button> : null}</>}
        </div>
        <small className="v8c-muted">JPG, PNG or WebP · up to 5 MB</small>
      </section>
    </div>
  );
}
