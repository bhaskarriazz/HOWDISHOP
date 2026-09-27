// HOWDI V8 — My HOWDI: hub (/me) and settings pages: profile (/me/profile), rewards (/me/rewards), size profile (/me/size),
// family (/me/family), addresses (/me/addresses), delete account + download my data (/me/delete).
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { useV8Ui } from "../V8System";
import { useApi, Skel, Sheet } from "../connect/common";
import { inr, newKey } from "../connect/HPayUtilities";
import "./me.css";

const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }) : "");
function Page({ title, onBack, children }) {
  return <div className="v8-page v8me" id="v8-main"><header className="v8me-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={onBack}><V8Icon name="back" size={20} /></button><h1>{title}</h1></header>{children}</div>;
}

// ------------------------------------------------------------------ hub
const GROUPS = [
  ["Account", [["profile", "user", "My profile", "Name, headline, about"], ["photo", "image", "Profile photo", "Upload or change"], ["roles", "crown", "My roles", "Customer, Vendor, Worker, Teacher…"], ["family", "users", "Family", "Invite family to your HOWDI"]]],
  ["Money", [["wallet", "qr", "HPay wallet", "Balance, add money, receipts"], ["rewards", "gift", "HOWDI Rewards", "Points from your orders"]]],
  ["Shopping", [["/shop/orders", "box", "My orders", "Track, cancel, return"], ["/shop/wishlist", "heart", "Wishlist", "Saved products"], ["addresses", "pin", "Addresses", "Delivery addresses"], ["size", "filter", "My size", "Measurements for a better fit"]]],
  ["Learning", [["/learn/mine", "learn", "My learning", "Courses and certificates"]]],
  ["Settings & privacy", [["privacy", "shield", "Privacy & permissions", "Who can see and contact you"], ["appearance", "bulb", "Appearance", "Theme and text size"], ["delete", "alert", "Delete account & my data", "Download your data, delete your account"]]],
];
export function Hub({ apiBase, getAuthHeaders, onRoute }) {
  const api = useApi(apiBase, getAuthHeaders); const [p, setP] = useState(null); const [rw, setRw] = useState(null); const [w, setW] = useState(null);
  useEffect(() => { api("GET", "/api/v8/me/profile").then((r) => setP(r.ok ? r.json.profile : null)); api("GET", "/api/v8/me/rewards").then((r) => setRw(r.ok ? r.json.summary : null)); api("GET", "/api/v8/hpay/history").then((r) => setW(r.ok ? r.json : null)); }, [api]);
  return (
    <div className="v8-page v8me" id="v8-main">
      <section className="v8-card v8me-hubhead">
        <span className="v8me-avatar sm">{p?.me?.avatar_url ? <img src={p.me.avatar_url} alt="" /> : <b>{(p?.name || "?").slice(0, 1).toUpperCase()}</b>}</span>
        <div><h1>{p?.name || "My HOWDI"}</h1><p className="v8c-muted">{p ? `@${p.me.public_username} · member since ${day(p.member_since)}` : ""}</p>{p?.headline ? <p>{p.headline}</p> : null}</div>
        <button type="button" className="v8-btn" onClick={() => onRoute(p?.public_route || "/me/profile")}>View public profile</button>
      </section>
      <div className="v8me-stats">
        <button type="button" className="v8-card" onClick={() => onRoute("/me/wallet")}><small>HPay balance</small><b>{w?.balance == null ? "—" : inr(w.balance)}</b></button>
        <button type="button" className="v8-card" onClick={() => onRoute("/me/rewards")}><small>Reward points</small><b>{rw ? rw.available : "—"}</b>{rw?.pending ? <small>+{rw.pending} pending</small> : null}</button>
      </div>
      {GROUPS.map(([g, items]) => (
        <section key={g} className="v8-card v8me-block" aria-label={g}><h3>{g}</h3>
          <ul className="v8me-links">{items.map(([to, icon, label, sub]) => <li key={to}><button type="button" onClick={() => onRoute(to.startsWith("/") ? to : `/me/${to}`)}><V8Icon name={icon} size={20} /><span><b>{label}</b><small>{sub}</small></span><V8Icon name="chev" size={16} /></button></li>)}</ul>
        </section>))}
    </div>
  );
}

// ------------------------------------------------------------------ profile
export function Profile({ apiBase, getAuthHeaders, onBack, onRoute }) {
  const api = useApi(apiBase, getAuthHeaders); const ui = useV8Ui(); const [p, setP] = useState(null); const [f, setF] = useState({ name: "", headline: "", about: "" }); const [err, setErr] = useState("");
  useEffect(() => { api("GET", "/api/v8/me/profile").then((r) => { if (r.ok) { setP(r.json.profile); setF({ name: r.json.profile.name, headline: r.json.profile.headline, about: r.json.profile.about }); } }); }, [api]);
  if (!p) return <Page title="My profile" onBack={onBack}><Skel h={260} r={16} /></Page>;
  const save = async () => { setErr(""); const r = await api("PATCH", "/api/v8/me/profile", f); if (!r.ok) { setErr(r.json.message); return; } setP(r.json.profile); ui?.toast({ title: "Profile saved" }); };
  return (
    <Page title="My profile" onBack={onBack}>
      <section className="v8-card v8me-block">
        <div className="v8me-prow"><span className="v8me-avatar sm">{p.me.avatar_url ? <img src={p.me.avatar_url} alt="" /> : <b>{p.name.slice(0, 1)}</b>}</span><div><b>@{p.me.public_username}</b><p className="v8c-muted">Your @username is your public identity on HOWDI.</p></div><button type="button" className="v8-btn" onClick={() => onRoute("/me/photo")}>Change photo</button></div>
        <label className="v8c-field"><span>Name</span><input value={f.name} maxLength={60} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} /></label>
        <label className="v8c-field"><span>Headline</span><input value={f.headline} maxLength={80} onChange={(e) => setF((x) => ({ ...x, headline: e.target.value }))} placeholder="e.g. Handloom lover · Khammam" /></label>
        <label className="v8c-field"><span>About</span><textarea rows={3} maxLength={300} value={f.about} onChange={(e) => setF((x) => ({ ...x, about: e.target.value }))} /><small>{f.about.length}/300</small></label>
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        <div className="v8w-row"><button type="button" className="v8-btn v8-btn-primary" onClick={save}>Save</button><button type="button" className="v8-btn" onClick={() => onRoute(p.public_route)}>View public profile</button></div>
      </section>
    </Page>
  );
}

// ------------------------------------------------------------------ rewards (+ seller funding choice)
export function Rewards({ apiBase, getAuthHeaders, onBack }) {
  const api = useApi(apiBase, getAuthHeaders); const ui = useV8Ui(); const [d, setD] = useState(null); const [seller, setSeller] = useState(null); const [pts, setPts] = useState(""); const key = useRef(newKey()); const [err, setErr] = useState("");
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/me/rewards"); setD(r.ok ? r.json : { error: r.json.message }); const s = await api("GET", "/api/v8/me/rewards/seller-setting"); setSeller(s.ok ? s.json : null); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Page title="HOWDI Rewards" onBack={onBack}><Skel h={260} r={16} /></Page>;
  if (d.error) return <Page title="HOWDI Rewards" onBack={onBack}><V8State kind="error" title="Rewards didn’t load" message={d.error} actionLabel="Retry" onAction={load} /></Page>;
  const redeem = async () => { setErr(""); const r = await api("POST", "/api/v8/me/rewards/redeem", { points: Number(pts), idem_key: key.current }); if (!r.ok) { setErr(r.json.message); return; } key.current = newKey(); setPts(""); ui?.toast({ title: `${r.json.redeemed} points added to HPay as ${inr(r.json.amount)}` }); load(); };
  const setFund = async (v) => { const r = await api("PUT", "/api/v8/me/rewards/seller-setting", { funded_by: v }); if (r.ok) { setSeller(r.json); ui?.toast({ title: v === "seller" ? "You now fund your buyers’ points" : "HOWDI now funds your buyers’ points" }); } };
  const LBL = { earn: "Earned", redeem: "Added to HPay", reverse: "Order returned" };
  return (
    <Page title="HOWDI Rewards" onBack={onBack}>
      <section className="v8-card v8me-wallet v8me-rewards"><small>Points you can use</small><b className="v8me-bal">{d.summary.available}</b>
        <div className="v8me-wstats"><span>= {inr(d.summary.available)} in HPay</span>{d.summary.pending ? <span>{d.summary.pending} pending (return window)</span> : null}{d.summary.expiring_30_days ? <span>{d.summary.expiring_30_days} expire within 30 days</span> : null}</div></section>
      <section className="v8-card v8me-block"><h3>How it works</h3><ul className="v8s-perks"><li><V8Icon name="gift" size={16} />{d.rules.earn}</li><li><V8Icon name="timer" size={16} />{d.rules.validity}</li><li><V8Icon name="qr" size={16} />{d.rules.value} — spend it anywhere on HOWDI</li></ul></section>
      <section className="v8-card v8me-block" aria-label="Use points"><h3>Add points to HPay</h3>
        <div className="v8me-addrow"><label className="v8c-field"><span>Points (min {d.rules.min_redeem})</span><input inputMode="numeric" value={pts} onChange={(e) => setPts(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={String(d.rules.min_redeem)} /></label>
          <button type="button" className="v8-btn v8-btn-primary" disabled={!(Number(pts) >= d.rules.min_redeem) || Number(pts) > d.summary.available} onClick={redeem}>Add {pts ? inr(pts) : ""} to HPay</button></div>
        {d.summary.available < d.rules.min_redeem ? <p className="v8c-muted">You need {d.rules.min_redeem} points to add them to HPay.</p> : null}
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}</section>
      {seller ? <section className="v8-card v8me-block" aria-label="Seller setting"><h3>For your store: who pays for buyers’ points?</h3>
        <div className="v8w-radios" role="radiogroup">{["howdi", "seller"].map((k) => <label key={k} className={seller.funded_by === k ? "on" : ""}><input type="radio" name="fund" checked={seller.funded_by === k} onChange={() => setFund(k)} /><span><b>{k === "howdi" ? "HOWDI pays" : "I pay"}</b><small>{seller.explain[k]}</small></span></label>)}</div></section> : null}
      <section className="v8-card v8me-block"><h3>History</h3>{!d.items.length ? <p className="v8c-muted">No points yet. You earn 10 points for every ₹1,000 on delivered Shop orders.</p>
        : <ul className="v8me-txns">{d.items.map((t, i) => <li key={i}><span className={`v8me-dir ${t.type === "earn" ? "in" : ""}`}><V8Icon name={t.type === "earn" ? "gift" : "refresh"} size={16} /></span><span><b>{LBL[t.type] || t.type} · {t.reference}</b><small>{day(t.at)}{t.type === "earn" ? ` · usable from ${day(t.usable_from)} · expires ${day(t.expires_at)}${t.funded_by === "seller" ? " · funded by the seller" : ""}` : ""}{t.expired ? " · expired" : ""}</small></span><b className={t.type === "earn" ? "v8me-in" : ""}>{t.type === "earn" ? "+" : "−"}{t.points}</b></li>)}</ul>}</section>
    </Page>
  );
}

// ------------------------------------------------------------------ size profile (guided capture)
const MEAS = [
  ["height_cm", "Height", "Stand straight against a wall without shoes. Measure from the floor to the top of your head."],
  ["width_cm", "Width (shoulder)", "Measure across your back from the edge of one shoulder to the other."],
  ["length_cm", "Length", "From the top of your shoulder (near the neck) down to where you want the garment to end."],
  ["chest_cm", "Chest", "Wrap the tape around the fullest part of your chest, under the arms. Keep it level and snug, not tight."],
  ["hand_cm", "Hands (sleeve)", "Arm relaxed: from the shoulder edge down to the wrist bone."],
  ["waist_cm", "Waist", "Around your natural waist, just above the belly button. Breathe out normally."],
];
export function Size({ apiBase, getAuthHeaders, onBack }) {
  const api = useApi(apiBase, getAuthHeaders); const ui = useV8Ui(); const [d, setD] = useState(null); const [f, setF] = useState({}); const [step, setStep] = useState(-1); const [consent, setConsent] = useState(false); const [err, setErr] = useState("");
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/me/size"); if (r.ok) { setD(r.json); setF(r.json.size ? { ...r.json.size } : { fit: "regular" }); setConsent(Boolean(r.json.size)); } }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Page title="My size" onBack={onBack}><Skel h={260} r={16} /></Page>;
  const save = async () => { setErr(""); const r = await api("PUT", "/api/v8/me/size", { ...f, consent }); if (!r.ok) { setErr(r.json.message); return; } setD((x) => ({ ...x, size: r.json.size })); setStep(-1); ui?.toast({ title: "Size saved — share it with a seller at checkout" }); };
  const remove = async () => { const r = await api("DELETE", "/api/v8/me/size"); if (r.ok) { setD((x) => ({ ...x, size: null })); setF({ fit: "regular" }); setConsent(false); ui?.toast({ title: "Measurements deleted" }); } };
  const cur = MEAS[step];
  return (
    <Page title="My size" onBack={onBack}>
      <section className="v8-card v8me-block"><p>Save your measurements once. At checkout you choose whether to share them with that seller; they only see them after accepting your order.</p>
        <p className="v8me-hidden"><V8Icon name="alert" size={14} /> Camera-based AI measuring isn’t available yet — use a soft measuring tape with the guide below.</p></section>
      {step >= 0 ? (
        <section className="v8-card v8me-block v8me-guide" aria-label="Guided measuring">
          <small className="v8c-muted">Step {step + 1} of {MEAS.length}</small>
          <div className="v8me-gbar"><i style={{ width: `${((step + 1) / MEAS.length) * 100}%` }} /></div>
          <h3>{cur[1]}</h3><p>{cur[2]}</p>
          <label className="v8c-field"><span>{cur[1]} (cm)</span><input inputMode="decimal" value={f[cur[0]] ?? ""} onChange={(e) => setF((x) => ({ ...x, [cur[0]]: e.target.value.replace(/[^\d.]/g, "").slice(0, 5) }))} placeholder={`${d.ranges[cur[0]][0]}–${d.ranges[cur[0]][1]}`} autoFocus /></label>
          <div className="v8w-row"><button type="button" className="v8-btn" onClick={() => setStep(step - 1)}>{step === 0 ? "Cancel" : "Back"}</button>{step < MEAS.length - 1 ? <><button type="button" className="v8-btn" onClick={() => setStep(step + 1)}>Skip</button><button type="button" className="v8-btn v8-btn-primary" onClick={() => setStep(step + 1)}>Next</button></> : <button type="button" className="v8-btn v8-btn-primary" onClick={() => setStep(-1)}>Review</button>}</div>
        </section>) : (
        <section className="v8-card v8me-block" aria-label="Measurements">
          <div className="v8me-sizes">{MEAS.map(([k, label]) => <label key={k} className="v8c-field"><span>{label} (cm)</span><input inputMode="decimal" value={f[k] ?? ""} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value.replace(/[^\d.]/g, "").slice(0, 5) }))} placeholder={`${d.ranges[k][0]}–${d.ranges[k][1]}`} /></label>)}</div>
          <div className="v8w-radios" role="radiogroup" aria-label="Preferred fit">{d.fits.map((x) => <label key={x} className={f.fit === x ? "on" : ""}><input type="radio" name="fit" checked={f.fit === x} onChange={() => setF((y) => ({ ...y, fit: x }))} />{x[0].toUpperCase() + x.slice(1)} fit</label>)}</div>
          <label className="v8s-addr"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />Save my measurements on HOWDI. I can delete them any time.</label>
          {err ? <p className="v8c-err" role="alert">{err}</p> : null}
          <div className="v8w-row"><button type="button" className="v8-btn" onClick={() => setStep(0)}><V8Icon name="spark" size={16} />Guided measuring</button><button type="button" className="v8-btn v8-btn-primary" onClick={save}>Save</button>{d.size ? <button type="button" className="v8-btn" onClick={remove}>Delete</button> : null}</div>
          {d.size ? <small className="v8c-muted">Last updated {day(d.size.updated_at)}</small> : null}
        </section>)}
    </Page>
  );
}

// ------------------------------------------------------------------ family
export function Family({ apiBase, getAuthHeaders, onBack }) {
  const api = useApi(apiBase, getAuthHeaders); const ui = useV8Ui(); const [d, setD] = useState(null); const [name, setName] = useState(""); const [inv, setInv] = useState(null); const [err, setErr] = useState("");
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/me/family"); setD(r.ok ? r.json : { error: r.json.message }); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Page title="Family" onBack={onBack}><Skel h={260} r={16} /></Page>;
  const call = async (method, path, body, msg) => { setErr(""); const r = await api(method, path, body); if (!r.ok) { setErr(r.json.message); return false; } setD(r.json); if (msg) ui?.toast({ title: msg }); return true; };
  return (
    <Page title="Family" onBack={onBack}>
      {d.invitations.map((i) => <section key={i.from?.public_username} className="v8-card v8me-block v8me-invite"><b>@{i.from?.public_username} invited you to “{i.family_name}”</b><p className="v8c-muted">As their {i.relation}.</p>
        <div className="v8w-row"><button type="button" className="v8-btn v8-btn-primary" onClick={() => call("POST", "/api/v8/me/family/respond", { from: i.from?.public_username, accept: true }, "You joined the family")}>Accept</button><button type="button" className="v8-btn" onClick={() => call("POST", "/api/v8/me/family/respond", { from: i.from?.public_username, accept: false }, "Invitation declined")}>Decline</button></div></section>)}
      {!d.family ? (
        <section className="v8-card v8me-block"><h3>Create your family group</h3><p className="v8c-muted">Invite up to {d.max - 1} family members by their @username. Everyone keeps their own account, wallet and privacy.</p>
          <label className="v8c-field"><span>Family name</span><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sharma family" /></label>
          <button type="button" className="v8-btn v8-btn-primary" disabled={name.trim().length < 2} onClick={() => call("POST", "/api/v8/me/family", { name }, "Family group created")}>Create</button></section>
      ) : (
        <section className="v8-card v8me-block"><header className="v8l-teachhead"><div><h3>{d.family.name}</h3><p className="v8c-muted">{d.family.members.filter((x) => x.status === "active").length} of {d.max} people</p></div>{d.family.is_owner ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => setInv({ handle: "", relation: "" })}><V8Icon name="users" size={16} />Invite</button> : null}</header>
          <ul className="v8me-fam">{d.family.members.map((x) => <li key={x.person?.public_username}><span className="v8me-avatar xs">{x.person?.avatar_url ? <img src={x.person.avatar_url} alt="" /> : <b>{(x.person?.display_name || "?").slice(0, 1)}</b>}</span><span><b>{x.person?.display_name}{x.me ? " (you)" : ""}</b><small>@{x.person?.public_username} · {x.relation}{x.status === "invited" ? " · invited" : ""}</small></span>
            {d.family.is_owner && !x.me ? <button type="button" className="v8-link" onClick={() => call("POST", "/api/v8/me/family/remove", { handle: x.person?.public_username }, x.status === "invited" ? "Invitation cancelled" : "Removed from the family")}>{x.status === "invited" ? "Cancel" : "Remove"}</button> : null}</li>)}</ul>
          <div className="v8w-row">{d.family.is_owner ? <button type="button" className="v8-btn" onClick={() => { if (window.confirm("Close the family group for everyone?")) call("DELETE", "/api/v8/me/family", null, "Family group closed"); }}>Close group</button> : <button type="button" className="v8-btn" onClick={() => call("POST", "/api/v8/me/family/leave", null, "You left the family")}>Leave family</button>}</div></section>)}
      {err ? <p className="v8c-err" role="alert">{err}</p> : null}
      {inv ? <Sheet open title="Invite a family member" onClose={() => setInv(null)}>
        <label className="v8c-field"><span>Their @username</span><input value={inv.handle} onChange={(e) => setInv((x) => ({ ...x, handle: e.target.value.replace(/\s/g, "") }))} placeholder="@username" /></label>
        <div className="v8w-radios" role="radiogroup" aria-label="Relation">{d.relations.map((r) => <label key={r} className={inv.relation === r ? "on" : ""}><input type="radio" name="rel" checked={inv.relation === r} onChange={() => setInv((x) => ({ ...x, relation: r }))} />{r[0].toUpperCase() + r.slice(1)}</label>)}</div>
        {err ? <p className="v8c-err">{err}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setInv(null)}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={!inv.handle || !inv.relation} onClick={async () => { if (await call("POST", "/api/v8/me/family/invite", { handle: inv.handle.replace(/^@/, ""), relation: inv.relation }, "Invitation sent")) setInv(null); }}>Send invite</button></div>
      </Sheet> : null}
    </Page>
  );
}

// ------------------------------------------------------------------ addresses
export function Addresses({ apiBase, getAuthHeaders, onBack }) {
  const api = useApi(apiBase, getAuthHeaders); const ui = useV8Ui(); const [items, setItems] = useState(null); const [add, setAdd] = useState(false); const [err, setErr] = useState("");
  const [f, setF] = useState({ name: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "Telangana", pin_code: "" });
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/shop/addresses"); setItems(r.ok ? r.json.items : []); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!items) return <Page title="Addresses" onBack={onBack}><Skel h={200} r={16} /></Page>;
  const act = async (method, path, msg) => { const r = await api(method, path); if (r.ok) { setItems(r.json.items); ui?.toast({ title: msg }); } };
  const save = async () => { setErr(""); const r = await api("POST", "/api/v8/shop/addresses", f); if (!r.ok) { setErr(r.json.message); return; } setAdd(false); load(); ui?.toast({ title: "Address saved" }); };
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Page title="Addresses" onBack={onBack}>
      <section className="v8-card v8me-block">
        {!items.length ? <p className="v8c-muted">No saved addresses yet.</p> : items.map((a) => <div key={a.key} className="v8me-addrcard"><span><b>{a.name}{a.is_default ? <em className="v8m-state ok"><i />Default</em> : null}</b><small>{[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}, {a.city}, {a.state} {a.pin_code} · {a.contact}</small></span>
          <span className="v8w-row">{!a.is_default ? <button type="button" className="v8-link" onClick={() => act("POST", `/api/v8/shop/addresses/${a.key}/default`, "Default address updated")}>Make default</button> : null}<button type="button" className="v8-link" onClick={() => act("DELETE", `/api/v8/shop/addresses/${a.key}`, "Address deleted")}>Delete</button></span></div>)}
        <button type="button" className="v8-btn" onClick={() => setAdd(true)}>Add address</button>
      </section>
      {add ? <Sheet open title="New address" onClose={() => setAdd(false)}><div className="v8u-two">
        <label className="v8c-field"><span>Full name</span><input value={f.name} onChange={(e) => set("name", e.target.value)} /></label><label className="v8c-field"><span>Mobile (for the courier)</span><input inputMode="numeric" value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} /></label></div>
        <label className="v8c-field"><span>House / street</span><input value={f.line1} onChange={(e) => set("line1", e.target.value)} /></label>
        <div className="v8u-two"><label className="v8c-field"><span>City</span><input value={f.city} onChange={(e) => set("city", e.target.value)} /></label><label className="v8c-field"><span>PIN code</span><input inputMode="numeric" value={f.pin_code} onChange={(e) => set("pin_code", e.target.value.replace(/\D/g, "").slice(0, 6))} /></label></div>
        {err ? <p className="v8c-err">{err}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setAdd(false)}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" onClick={save}>Save address</button></div></Sheet> : null}
    </Page>
  );
}

// ------------------------------------------------------------------ delete account + download my data
export function DeleteAccount({ apiBase, getAuthHeaders, onBack }) {
  const api = useApi(apiBase, getAuthHeaders); const ui = useV8Ui(); const [d, setD] = useState(null); const [confirm, setConfirm] = useState(""); const [reason, setReason] = useState(""); const [err, setErr] = useState("");
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/me/deletion"); setD(r.ok ? r.json : { error: r.json.message }); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Page title="Delete account & my data" onBack={onBack}><Skel h={260} r={16} /></Page>;
  const download = async () => { const r = await api("GET", "/api/v8/me/export"); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return; } const blob = new Blob([JSON.stringify(r.json.export, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `howdi-my-data-${r.json.export.username}.json`; a.click(); URL.revokeObjectURL(a.href); ui?.toast({ title: "Your data file is downloading" }); };
  const request = async () => { setErr(""); const r = await api("POST", "/api/v8/me/deletion", { confirm, reason }); if (!r.ok) { setErr(r.json.message); return; } ui?.toast({ title: "Deletion scheduled — you can cancel within 30 days" }); load(); };
  const cancel = async () => { const r = await api("DELETE", "/api/v8/me/deletion"); if (r.ok) { ui?.toast({ title: "Deletion cancelled — your account stays" }); load(); } };
  return (
    <Page title="Delete account & my data" onBack={onBack}>
      <section className="v8-card v8me-block"><h3>Download my data</h3><p className="v8c-muted">A file with your profile, orders, reviews, wishlist, HPay receipts, reward points and size profile.</p><button type="button" className="v8-btn" onClick={download}><V8Icon name="box" size={16} />Download my data</button></section>
      {d.deletion.status === "pending" ? (
        <section className="v8-card v8me-block v8me-danger"><h3>Your account will be deleted on {day(d.deletion.scheduled_for)}</h3><p>Until then you can sign in and cancel. After that date your account, @username and data are removed permanently.</p><button type="button" className="v8-btn v8-btn-primary" onClick={cancel}>Cancel deletion</button></section>
      ) : (
        <section className="v8-card v8me-block v8me-danger"><h3>Delete my account</h3>
          <p>Your account is deleted {d.grace_days} days after you ask. You can cancel any time before that by signing in.</p>
          {d.blockers.length ? <div className="v8me-ret"><b>Finish these first:</b><ul>{d.blockers.map((b) => <li key={b}>{b}</li>)}</ul></div> : null}
          {d.warnings.length ? <div className="v8me-hidden"><b>Before you go:</b><ul>{d.warnings.map((b) => <li key={b}>{b}</li>)}</ul></div> : null}
          <label className="v8c-field"><span>Why are you leaving? (optional)</span><input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} /></label>
          <label className="v8c-field"><span>Type @{d.handle} to confirm</span><input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></label>
          {err ? <p className="v8c-err" role="alert">{err}</p> : null}
          <button type="button" className="v8-btn v8-btn-danger" disabled={Boolean(d.blockers.length) || confirm.replace(/^@/, "").toLowerCase() !== d.handle} onClick={request}>Delete my account in {d.grace_days} days</button></section>)}
    </Page>
  );
}
