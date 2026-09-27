// HOWDI V8 HPay Utilities + QR Pay from Messages — boards V8__18 (mobile panels: recharge, bills, tickets, gift cards) and V8__19
// (QR Code Pay). Register MSG-012..016. Every flow: form → review (nothing paid yet) → HPay PIN → processing → receipt, with
// provider failure (nothing charged + Try again on the same key), pending (auto-checks until it settles), refunded, and the
// other side: recharge requests (Recharge now / Decline · Cancel), gift cards (code + Redeem only for the holder), tickets.
// Preview/Test catalogue — no real operator, biller or event is charged.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { Ava, Sheet, Skel, Tabs, since } from "./common";

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const newKey = () => (globalThis.crypto?.randomUUID?.() || `k${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 48);
const TITLES = { recharge: "Mobile recharge", bill: "Pay a bill", ticket: "Event tickets", giftcard: "Send a gift card" };
const ICONS = { recharge: "phone", bill: "bolt", ticket: "ticket", giftcard: "gift" };

function useCatalog(api) {
  const [cat, setCat] = useState(null);
  const load = useCallback(async () => { setCat(null); const r = await api("GET", "/api/v8/hpay/utilities/catalog"); setCat(r.ok ? r.json : { error: r.json.message || "The catalogue didn’t load." }); }, [api]);
  useEffect(() => { load(); }, [load]);
  return [cat, load];
}

// HPay PIN: set it the first time, then enter it to confirm. onPay(pin) resolves to the API result.
export function PinStep({ api, amount, to, onPay, onCancel, label = "Pay" }) {
  const [state, setState] = useState(null); const [pin, setPin] = useState(""); const [np, setNp] = useState(""); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api("GET", "/api/v8/hpay/pin").then((r) => setState(r.ok ? r.json : { set: false })); }, [api]);
  if (!state) return <Skel h={80} />;
  if (!state.set) return (<>
    <p>Set a 4–6 digit HPay PIN. You’ll enter it to confirm every payment.</p>
    <label className="v8c-field"><span>New HPay PIN</span><input type="password" inputMode="numeric" autoComplete="new-password" value={np} onChange={(e) => setNp(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus /></label>
    {err ? <p className="v8c-err" role="alert">{err.message}</p> : null}
    <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={np.length < 4} onClick={async () => { const r = await api("POST", "/api/v8/hpay/pin", { pin: np }); if (!r.ok) { setErr({ message: r.json.message }); return; } setErr(null); setState({ set: true }); }}>Set PIN</button>
  </>);
  const go = async () => { setBusy(true); setErr(null); const e = await onPay(pin); setBusy(false); if (e) { setErr(e); setPin(""); } };
  return (<>
    <p>Enter your HPay PIN to pay <b>{inr(amount)}</b>{to ? <> for {to}</> : null}.</p>
    <label className="v8c-field"><span>HPay PIN</span><input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus onKeyDown={(e) => { if (e.key === "Enter" && pin.length >= 4) go(); }} /></label>
    {err ? <p className="v8c-err" role="alert">{err.message}</p> : null}
    <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onCancel}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy || pin.length < 4 || err?.code === "PIN_LOCKED"} onClick={go}>{busy ? "Paying…" : `${label} ${inr(amount)}`}</button></div>
  </>);
}

// Receipt / status view for an order, polling while it is pending.
export function OrderResult({ api, order: first, onClose, onRetry, error }) {
  const [o, setO] = useState(first);
  useEffect(() => { setO(first); }, [first]);
  useEffect(() => {
    if (!o || o.status !== "pending") return undefined;
    const id = window.setInterval(async () => { const r = await api("GET", `/api/v8/hpay/utilities/orders/${o.public_key}`); if (r.ok) setO(r.json.order); }, 3000);
    return () => window.clearInterval(id);
  }, [api, o]);
  if (error) return (
    <div className="v8-banner-error" role="alert"><V8Icon name="alert" size={20} /><span><b>{error.code === "INSUFFICIENT_BALANCE" ? "Not enough HPay balance" : error.code === "DAILY_LIMIT" ? "Daily limit reached" : error.code === "PROVIDER_FAILED" ? "The provider didn’t accept it" : "Payment didn’t go through"}</b> {error.message}{/charged/i.test(error.message || "") ? "" : " Nothing was charged."}</span>
      <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Close</button>{onRetry ? <button type="button" className="v8-btn v8-btn-primary" onClick={onRetry}>Try again</button> : null}</div></div>
  );
  if (!o) return null;
  const st = { success: ["ok", "check", "Completed"], redeemed: ["ok", "check", "Redeemed"], pending: ["warn", "clock", "Pending with the provider"], refunded: ["warn", "refresh", "Refunded"], failed: ["bad", "alert", "Failed"], requested: ["warn", "clock", "Waiting for them"], declined: ["bad", "x", "Declined"], cancelled: ["muted", "x", "Cancelled"] }[o.status] || ["muted", "info", o.status];
  return (
    <div className="v8c-done" role="status">
      <span className={`v8c-done-ico ${st[0]}`}>{o.status === "pending" ? <span className="v8c-spin" aria-hidden="true" /> : <V8Icon name={st[1]} size={26} />}</span>
      <p><b>{o.title} · {inr(o.amount)}</b><br /><span className="v8c-muted">{st[2]}{o.status === "pending" ? " — we’ll update this automatically." : ""}</span></p>
      {o.failure ? <p className="v8c-muted">{o.failure}</p> : null}
      <Receipt o={o} />
      {o.code ? <GiftCode code={o.code} /> : null}
      {o.tickets?.length ? <Tickets o={o} /> : null}
      <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={onClose}>Done</button>
    </div>
  );
}
function Receipt({ o }) {
  return (
    <div className="v8c-receipt">
      {o.lines.map((l) => <Fragment key={l.label}><span>{l.label}</span><b>{l.value}</b></Fragment>)}
      <span>Amount</span><b>{inr(o.amount)}</b>
      {o.reference ? <><span>HPay reference</span><b>{o.reference}</b></> : null}
      {o.provider_ref ? <><span>Provider reference</span><b>{o.provider_ref}</b></> : null}
      {o.recipient ? <><span>For</span><b>@{o.recipient.public_username}</b></> : null}
    </div>
  );
}
function GiftCode({ code }) { return <div className="v8u-code"><small>Gift card code</small><b>{code}</b><small className="v8c-muted">Only you can see this code.</small></div>; }
function Tickets({ o }) {
  return <div className="v8u-tickets">{o.tickets.map((t) => <div key={t} className="v8u-ticket"><QRImage text={`HOWDI-TICKET:${t}`} size={112} label={`Ticket ${t}`} /><span><b>{t}</b><small>{o.lines.find((l) => l.label === "Event")?.value}</small><small>{o.lines.find((l) => l.label === "Date")?.value}</small></span></div>)}</div>;
}

// QR rendering (lazy-loaded encoder)
export function QRImage({ text, size = 200, label }) {
  const [src, setSrc] = useState("");
  useEffect(() => { let live = true; import("qrcode").then((Q) => (Q.default || Q).toDataURL(text, { margin: 1, width: size * 2, errorCorrectionLevel: "M" })).then((u) => { if (live) setSrc(u); }).catch(() => {}); return () => { live = false; }; }, [text, size]);
  return src ? <img className="v8u-qr" src={src} width={size} height={size} alt={label || "QR code"} /> : <span className="v8u-qr v8-skel" style={{ width: size, height: size }} />;
}

// ---------------------------------------------------------------- MSG-012..014 order sheet
export function UtilitySheet({ api, kind, code, other, onClose, onDone }) {
  const [cat, reload] = useCatalog(api);
  const [f, setF] = useState({ for: kind === "ticket" ? "me" : "me", qty: 1, share: true });
  const [bill, setBill] = useState(null); const [review, setReview] = useState(null); const [step, setStep] = useState("form");
  const [err, setErr] = useState(null); const [result, setResult] = useState(null); const [busy, setBusy] = useState(false);
  const key = useRef(newKey());
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const asking = kind === "recharge" && f.for === "ask";
  const body = () => {
    if (kind === "recharge") return { type: "recharge", mobile: f.mobile, operator: f.operator, circle: f.circle, plan: f.plan };
    if (kind === "bill") return { type: "bill", biller: f.biller, consumer: f.consumer };
    if (kind === "ticket") return { type: "ticket", event: f.event, date: f.date, tier: f.tier, qty: f.qty, for: code ? f.for : "me" };
    return { type: "giftcard", card: f.card, amount: f.amount, message: f.message, for: code ? "them" : "me" };
  };
  const fetchBill = async () => { setErr(null); setBill(null); setBusy(true); const r = await api("POST", "/api/v8/hpay/bills/fetch", { biller: f.biller, consumer: f.consumer }); setBusy(false); if (!r.ok) { setErr({ message: r.json.message, code: r.json.code }); return; } setBill(r.json.bill); };
  const toReview = async () => {
    setErr(null); setBusy(true);
    const r = await api("POST", "/api/v8/hpay/utilities/quote", body()); setBusy(false);
    if (!r.ok) { setErr({ message: r.json.message }); return; }
    setReview(r.json.review); setStep("review");
  };
  const ask = async () => {
    setBusy(true); setErr(null);
    const r = await api("POST", "/api/v8/hpay/utilities/requests", { conversation: code, ...body() }); setBusy(false);
    if (!r.ok) { setErr({ message: r.json.message }); return; }
    setResult({ order: r.json.order }); setStep("done"); onDone?.();
  };
  const pay = async (pin) => {
    setStep("processing");
    const r = await api("POST", "/api/v8/hpay/utilities/orders", { ...body(), pin, idempotency_key: key.current, conversation: code || undefined, share: code ? f.share : undefined });
    if (!r.ok) {
      if (["PIN_WRONG", "PIN_LOCKED"].includes(r.json.code)) { setStep("pin"); return { code: r.json.code, message: r.json.message }; }
      setResult({ error: { code: r.json.code, message: r.json.message || "Payment didn’t go through." } }); setStep("done"); return null; // key kept: Try again can't double charge
    }
    setResult({ order: r.json.order }); setStep("done"); onDone?.(); return null;
  };
  if (!cat) return <Sheet open title={TITLES[kind]} onClose={onClose}><Skel h={220} /></Sheet>;
  if (cat.error) return <Sheet open title={TITLES[kind]} onClose={onClose}><V8State kind="error" title="Couldn’t load HPay utilities" message={cat.error} actionLabel="Retry" onAction={reload} /></Sheet>;
  const plans = f.operator ? cat.plans[f.operator] || [] : [];
  const ev = cat.events.find((e) => e.key === f.event); const tier = ev?.tiers.find((t) => t.key === f.tier);
  const gc = cat.giftcards.find((g) => g.key === f.card);
  const ready = kind === "recharge" ? /^[6-9]\d{9}$/.test(String(f.mobile || "").replace(/\D/g, "")) && f.operator && f.circle && f.plan
    : kind === "bill" ? Boolean(bill) : kind === "ticket" ? ev && f.date && tier && f.qty >= 1 : gc && f.amount;
  return (
    <Sheet open title={step === "done" && result?.order ? (asking ? "Request sent" : "Receipt") : TITLES[kind]} onClose={onClose}>
      <div className="v8c-sandbox"><b>PREVIEW / TEST</b><span>{cat.notice}</span></div>
      {step === "form" ? (<div className="v8u-form">
        {kind === "recharge" ? (<>
          {code ? <div className="v8c-seg" role="radiogroup" aria-label="Who is this recharge for?">
            <button type="button" role="radio" aria-checked={f.for === "me"} className={f.for === "me" ? "on" : ""} onClick={() => set("for", "me")}>Recharge my number</button>
            <button type="button" role="radio" aria-checked={f.for === "ask"} className={f.for === "ask" ? "on" : ""} onClick={() => set("for", "ask")}>Ask @{other?.public_username} to pay</button>
          </div> : null}
          <label className="v8c-field"><span>Mobile number</span><input inputMode="numeric" autoComplete="tel-national" value={f.mobile || ""} onChange={(e) => set("mobile", e.target.value.replace(/[^\d ]/g, "").slice(0, 12))} placeholder="10-digit number" /></label>
          {asking ? <p className="v8c-muted"><V8Icon name="lock" size={14} /> @{other?.public_username} sees only the last 4 digits. HOWDI never shows your full number.</p> : null}
          <div className="v8u-two">
            <label className="v8c-field"><span>Operator</span><select value={f.operator || ""} onChange={(e) => { set("operator", e.target.value); set("plan", ""); }}><option value="">Choose</option>{cat.operators.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}</select></label>
            <label className="v8c-field"><span>Circle</span><select value={f.circle || ""} onChange={(e) => set("circle", e.target.value)}><option value="">Choose</option>{cat.circles.map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
          {plans.length ? <fieldset className="v8u-plans"><legend>Plans</legend>{plans.map((p) => (
            <button key={p.key} type="button" className={`v8u-plan ${f.plan === p.key ? "on" : ""}`} aria-pressed={f.plan === p.key} onClick={() => set("plan", p.key)}><b>{inr(p.amount)}</b><span>{p.validity} · {p.data}</span><small>{p.calls} · {p.sms}</small></button>))}</fieldset> : f.operator ? null : <p className="v8c-muted">Choose the operator to see plans.</p>}
        </>) : null}
        {kind === "bill" ? (<>
          <label className="v8c-field"><span>Biller</span><select value={f.biller || ""} onChange={(e) => { set("biller", e.target.value); setBill(null); }}><option value="">Choose a biller</option>{cat.billers.map((b) => <option key={b.key} value={b.key}>{b.category} · {b.name}</option>)}</select></label>
          {f.biller ? <label className="v8c-field"><span>{cat.billers.find((b) => b.key === f.biller)?.label}</span><input inputMode="numeric" value={f.consumer || ""} onChange={(e) => { set("consumer", e.target.value.replace(/\D/g, "").slice(0, 13)); setBill(null); }} /></label> : null}
          {f.biller && !bill ? <button type="button" className="v8-btn v8-btn-block" disabled={busy || String(f.consumer || "").length < 6} onClick={fetchBill}>{busy ? "Fetching…" : "Fetch bill"}</button> : null}
          {bill ? <div className="v8c-receipt"><span>Name on bill</span><b>{bill.customer}</b><span>Account</span><b>{bill.account}</b><span>Bill date</span><b>{bill.bill_date}</b><span>Due date</span><b>{bill.due_date}</b><span>Amount due</span><b>{inr(bill.amount)}</b></div> : null}
        </>) : null}
        {kind === "ticket" ? (<>
          <div className="v8u-events">{cat.events.map((e) => <button key={e.key} type="button" className={`v8u-event ${f.event === e.key ? "on" : ""}`} aria-pressed={f.event === e.key} onClick={() => { set("event", e.key); set("date", e.dates[0]); set("tier", e.tiers[0].key); }}><V8Icon name="ticket" size={20} /><span><b>{e.title}</b><small>{e.venue}</small></span></button>)}</div>
          {ev ? (<>
            <div className="v8u-two">
              <label className="v8c-field"><span>Date</span><select value={f.date} onChange={(e) => set("date", e.target.value)}>{ev.dates.map((d) => <option key={d} value={d}>{new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</option>)}</select></label>
              <label className="v8c-field"><span>Tickets</span><select value={f.qty} onChange={(e) => set("qty", Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}</select></label>
            </div>
            <div className="v8c-chips">{ev.tiers.map((t) => <button key={t.key} type="button" className={`v8c-chip ${f.tier === t.key ? "on" : ""}`} aria-pressed={f.tier === t.key} onClick={() => set("tier", t.key)}>{t.label} · {inr(t.price)}</button>)}</div>
            {code ? <div className="v8c-seg" role="radiogroup" aria-label="Who are the tickets for?"><button type="button" role="radio" aria-checked={f.for === "me"} className={f.for === "me" ? "on" : ""} onClick={() => set("for", "me")}>For me</button><button type="button" role="radio" aria-checked={f.for === "them"} className={f.for === "them" ? "on" : ""} onClick={() => set("for", "them")}>Gift to @{other?.public_username}</button></div> : null}
            {tier ? <p className="v8u-total">Total <b>{inr(tier.price * f.qty)}</b></p> : null}
          </>) : null}
        </>) : null}
        {kind === "giftcard" ? (<>
          <div className="v8u-gcs">{cat.giftcards.map((g) => <button key={g.key} type="button" className={`v8u-gc ${f.card === g.key ? "on" : ""}`} aria-pressed={f.card === g.key} onClick={() => { set("card", g.key); set("amount", g.amounts[0]); }}><V8Icon name="gift" size={22} /><b>{g.brand}</b><small>{g.note}</small></button>)}</div>
          {gc ? <div className="v8c-amounts">{gc.amounts.map((a) => <button key={a} type="button" className={f.amount === a ? "on" : ""} onClick={() => set("amount", a)}>{inr(a)}</button>)}</div> : null}
          {gc ? <label className="v8c-field"><span>Message (optional)</span><input maxLength={140} value={f.message || ""} onChange={(e) => set("message", e.target.value)} placeholder={`For @${other?.public_username || "them"}`} /></label> : null}
          {code ? <p className="v8c-muted">Only @{other?.public_username} will see the gift card code.</p> : null}
        </>) : null}
        {code && !asking && kind !== "giftcard" ? <label className="v8c-check"><input type="checkbox" checked={f.share} onChange={(e) => set("share", e.target.checked)} /> Post the receipt in this chat (numbers stay masked)</label> : null}
        {err ? <p className="v8c-err" role="alert">{err.message}</p> : null}
        <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={!ready || busy} onClick={asking ? ask : toReview}>{busy ? "Please wait…" : asking ? `Send request to @${other?.public_username}` : "Review"}</button>
      </div>) : null}
      {step === "review" && review ? (<>
        <div className="v8c-receipt">{Object.entries(review.details).filter(([k, v]) => v && !["card", "note"].includes(k)).map(([k, v]) => <Fragment key={k}><span>{({ number: "Number", operator: "Operator", circle: "Circle", plan: "Plan", biller: "Biller", category: "Type", account: "Account", bill_date: "Bill date", due_date: "Due date", customer: "Name on bill", event: "Event", venue: "Venue", date: "Date", tier: "Ticket", qty: "Quantity", brand: "Gift card", message: "Message" })[k] || k}</span><b>{String(v)}</b></Fragment>)}
          <span>Amount</span><b>{inr(review.amount)}</b><span>Fee</span><b>{inr(0)}</b><span>Total</span><b>{inr(review.total)}</b>{review.balance != null ? <><span>HPay balance</span><b>{inr(review.balance)}</b></> : null}</div>
        <p className="v8msg-warn"><V8Icon name="info" size={16} /> {review.warning}</p>
        {!review.provider_ready ? <p className="v8c-err">HPay isn’t connected in this environment.</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setStep("form")}>Back</button><button type="button" className="v8-btn v8-btn-primary" disabled={!review.provider_ready} onClick={() => setStep("pin")}>Confirm</button></div>
      </>) : null}
      {step === "pin" ? <PinStep api={api} amount={review?.amount} to={TITLES[kind].toLowerCase()} onPay={pay} onCancel={onClose} /> : null}
      {step === "processing" ? <div className="v8c-done" role="status"><span className="v8c-spin" aria-hidden="true" /><p>Processing with the provider… don’t close this screen.</p></div> : null}
      {step === "done" ? <OrderResult api={api} order={result?.order} error={result?.error} onClose={onClose} onRetry={() => setStep("pin")} /> : null}
    </Sheet>
  );
}

// Payer side of a recharge request: review → PIN → receipt
export function PayUtilityRequest({ api, order, onClose, onDone }) {
  const [step, setStep] = useState("review"); const [res, setRes] = useState(null); const key = useRef(newKey());
  const pay = async (pin) => {
    setStep("processing");
    const r = await api("POST", `/api/v8/hpay/utilities/orders/${order.public_key}/pay`, { pin, idempotency_key: key.current });
    if (!r.ok) { if (["PIN_WRONG", "PIN_LOCKED"].includes(r.json.code)) { setStep("pin"); return { code: r.json.code, message: r.json.message }; } setRes({ error: { code: r.json.code, message: r.json.message } }); setStep("done"); return null; }
    setRes({ order: r.json.order }); setStep("done"); onDone?.(); return null;
  };
  return (
    <Sheet open title={`Recharge for @${order.requester?.public_username}`} onClose={onClose}>
      <div className="v8c-sandbox"><b>PREVIEW / TEST</b><span>HPay sandbox — no real money moves.</span></div>
      {step === "review" ? (<><Receipt o={order} /><p className="v8msg-warn"><V8Icon name="info" size={16} /> Please review. Nothing has been paid yet.</p>
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={onClose}>Cancel</button><button type="button" className="v8-btn v8-btn-primary" onClick={() => setStep("pin")}>Recharge now</button></div></>) : null}
      {step === "pin" ? <PinStep api={api} amount={order.amount} to={`@${order.requester?.public_username}’s recharge`} onPay={pay} onCancel={onClose} /> : null}
      {step === "processing" ? <div className="v8c-done" role="status"><span className="v8c-spin" aria-hidden="true" /><p>Processing with the operator…</p></div> : null}
      {step === "done" ? <OrderResult api={api} order={res?.order} error={res?.error} onClose={onClose} onRetry={() => setStep("pin")} /> : null}
    </Sheet>
  );
}

// The utility card in a chat thread (both sides)
export function UtilityCard({ u, onAct }) {
  if (!u) return null;
  const st = { success: ["ok", "Completed"], redeemed: ["ok", "Redeemed"], pending: ["warn", "Pending"], refunded: ["warn", "Refunded"], failed: ["bad", "Failed"], requested: ["warn", "Requested"], declined: ["bad", "Declined"], cancelled: ["muted", "Cancelled"] }[u.status] || ["muted", u.status];
  const done = ["success", "pending"].includes(u.status);
  const head = u.requester ? (u.role === "buyer" ? (done ? `You recharged @${u.requester.public_username}’s number` : `@${u.requester.public_username} asked you for a recharge`)
      : done ? `@${u.buyer?.public_username} recharged your number` : `You asked @${u.buyer?.public_username} for a recharge`)
    : u.type === "giftcard" ? (u.role === "recipient" || (u.role === "buyer" && !u.recipient) ? `Gift card${u.buyer && u.role === "recipient" ? ` from @${u.buyer.public_username}` : ""}` : `Gift card for @${u.recipient?.public_username}`)
      : u.type === "ticket" && u.recipient ? (u.role === "recipient" ? `Tickets from @${u.buyer?.public_username}` : `Tickets for @${u.recipient.public_username}`) : u.title;
  const kind = u.type === "recharge" ? "phone" : u.type === "bill" ? "bolt" : u.type === "ticket" ? "ticket" : "gift";
  return (
    <div className={`v8msg-paycard v8u-card ${u.type}`}>
      <div className="v8msg-paycard-top"><span className="v8msg-paycard-ico"><V8Icon name={kind} size={20} /></span><span><small>HPay · {u.title}</small><b>{inr(u.amount)}</b></span><span className={`v8m-state ${st[0]}`}><i />{st[1]}</span></div>
      <p>{head}</p>
      <div className="v8u-lines">{u.lines.slice(0, 3).map((l) => <small key={l.label}><span>{l.label}</span> {l.value}</small>)}</div>
      {u.code ? <GiftCode code={u.code} /> : null}
      {u.tickets?.length ? <Tickets o={u} /> : null}
      {u.reference ? <small className="v8c-muted">Ref {u.reference}</small> : null}
      {u.actions.length ? <div className="v8msg-paycard-actions">
        {u.actions.includes("pay") ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => onAct("pay", u)}>Recharge now</button> : null}
        {u.actions.includes("decline") ? <button type="button" className="v8-btn" onClick={() => onAct("decline", u)}>Decline</button> : null}
        {u.actions.includes("cancel") ? <button type="button" className="v8-btn" onClick={() => onAct("cancel", u)}>Cancel request</button> : null}
        {u.actions.includes("redeem") ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => onAct("redeem", u)}>Redeem to HPay</button> : null}
      </div> : null}
      <small className="v8-pill-test">Preview / Test</small>
    </div>
  );
}

// ---------------------------------------------------------------- MSG-016 QR Pay: Scan · My QR
export function QRPay({ api, onClose, onDone }) {
  const [tab, setTab] = useState("scan");
  return (
    <Sheet open title="QR Code Pay" onClose={onClose}>
      <div className="v8c-sandbox"><b>PREVIEW / TEST</b><span>HPay sandbox — no real money moves.</span></div>
      <Tabs compact tabs={[{ value: "scan", label: "Scan to pay" }, { value: "mine", label: "Show my QR" }]} value={tab} onChange={setTab} label="QR Pay" />
      {tab === "scan" ? <ScanPay api={api} onClose={onClose} onDone={onDone} /> : <MyQR api={api} />}
    </Sheet>
  );
}
function MyQR({ api }) {
  const [amount, setAmount] = useState(""); const [q, setQ] = useState(null);
  const load = useCallback(async (a) => { setQ(null); const r = await api("GET", `/api/v8/hpay/qr${a ? `?amount=${a}` : ""}`); setQ(r.ok ? r.json : { error: r.json.message }); }, [api]);
  useEffect(() => { load(""); }, [load]);
  return (
    <div className="v8u-myqr">
      {!q ? <Skel h={240} w={240} /> : q.error ? <p className="v8c-err" role="alert">{q.error}</p> : (<>
        <QRImage text={q.payload} size={220} label={`HOWDI Pay QR for @${q.handle}`} />
        <b>@{q.handle}</b>
        <small className="v8c-muted">{q.amount ? `Asks for ${inr(q.amount)}` : "Payer enters the amount"} · shows only your @username</small>
      </>)}
      <div className="v8u-two"><label className="v8c-field"><span>Fixed amount (optional)</span><input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="Any amount" /></label>
        <button type="button" className="v8-btn" onClick={() => load(amount)}>{amount ? "Set amount" : "Clear amount"}</button></div>
      {q && !q.error ? <details className="v8u-code-details"><summary>Show code as text</summary><code>{q.payload}</code></details> : null}
    </div>
  );
}
function ScanPay({ api, onClose, onDone }) {
  const [phase, setPhase] = useState("camera"); // camera · denied · nocam · resolving · amount · review · pin · processing · done · failed
  const [payee, setPayee] = useState(null); const [code, setCode] = useState(""); const [amount, setAmount] = useState(""); const [note, setNote] = useState("");
  const [err, setErr] = useState(null); const [result, setResult] = useState(null); const [paste, setPaste] = useState("");
  const video = useRef(null); const stream = useRef(null); const key = useMemo(() => newKey(), []); const stop = useRef(false);
  const resolveCode = useCallback(async (c) => {
    stop.current = true; stream.current?.getTracks().forEach((t) => t.stop());
    setPhase("resolving"); setErr(null);
    const r = await api("POST", "/api/v8/hpay/qr/resolve", { code: c });
    if (!r.ok) { setErr({ message: r.json.message }); setPhase("camera-error"); return; }
    setCode(c); setPayee(r.json); setAmount(r.json.amount ? String(r.json.amount) : ""); setPhase(r.json.amount ? "review" : "amount");
  }, [api]);
  useEffect(() => {
    if (phase !== "camera") return undefined;
    stop.current = false; let raf = 0;
    (async () => {
      try { stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); }
      catch (e) { setPhase(e && e.name === "NotAllowedError" ? "denied" : "nocam"); return; }
      if (!video.current) return; video.current.srcObject = stream.current; await video.current.play().catch(() => {});
      const jsQR = (await import("jsqr")).default; const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const tick = () => {
        if (stop.current) return;
        const v = video.current;
        if (v && v.videoWidth) { canvas.width = v.videoWidth; canvas.height = v.videoHeight; ctx.drawImage(v, 0, 0); const img = ctx.getImageData(0, 0, canvas.width, canvas.height); const hit = jsQR(img.data, img.width, img.height); if (hit && /^HOWDIPAY:/.test(hit.data)) { resolveCode(hit.data); return; } }
        raf = window.setTimeout(tick, 250);
      };
      tick();
    })();
    return () => { stop.current = true; window.clearTimeout(raf); stream.current?.getTracks().forEach((t) => t.stop()); };
  }, [phase, resolveCode]);
  const fromPhoto = async (file) => {
    if (!file) return; setErr(null);
    const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode().catch(() => {});
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
    const jsQR = (await import("jsqr")).default; const d = ctx.getImageData(0, 0, c.width, c.height); const hit = jsQR(d.data, d.width, d.height); URL.revokeObjectURL(url);
    if (!hit) { setErr({ message: "No QR code found in that photo. Try a clearer photo." }); return; }
    resolveCode(hit.data);
  };
  const pay = async (pin) => {
    setPhase("processing");
    const r = await api("POST", "/api/v8/hpay/qr/pay", { code, amount: Number(amount), note, pin, idempotency_key: key });
    if (!r.ok) { if (["PIN_WRONG", "PIN_LOCKED"].includes(r.json.code)) { setPhase("pin"); return { code: r.json.code, message: r.json.message }; } setErr({ code: r.json.code, message: r.json.message }); setPhase("failed"); return null; }
    setResult(r.json); setPhase("done"); onDone?.(); return null;
  };
  const fallback = (
    <div className="v8u-scan-alt">
      <label className="v8-btn v8-btn-block"><V8Icon name="upload" size={16} />Scan from a photo<input type="file" accept="image/*" hidden onChange={(e) => { fromPhoto(e.target.files[0]); e.target.value = ""; }} data-testid="qr-photo" /></label>
      <details><summary>Enter the code instead</summary><div className="v8u-two"><input className="v8u-paste" value={paste} onChange={(e) => setPaste(e.target.value.trim())} placeholder="HOWDIPAY:1:…" aria-label="HOWDI Pay code" /><button type="button" className="v8-btn" disabled={!paste} onClick={() => resolveCode(paste)}>Continue</button></div></details>
    </div>
  );
  if (["camera", "denied", "nocam", "camera-error"].includes(phase)) return (
    <div className="v8u-scan">
      {phase === "camera" || phase === "camera-error" ? <div className="v8u-viewfinder"><video ref={video} muted playsInline aria-label="Camera preview" /><i aria-hidden="true" /><small>Point at a HOWDI Pay QR code</small></div> : null}
      {phase === "denied" ? <V8State icon="camera" title="Camera access is off" message="Allow camera access in your browser settings to scan, or scan from a photo instead." actionLabel="Try again" onAction={() => setPhase("camera")} /> : null}
      {phase === "nocam" ? <V8State icon="camera" title="No camera found" message="Scan from a photo or enter the code instead." /> : null}
      {err ? <p className="v8c-err" role="alert">{err.message}{phase === "camera-error" ? <> <button type="button" className="v8-link" onClick={() => { setErr(null); setPhase("camera"); }}>Scan again</button></> : null}</p> : null}
      {fallback}
    </div>
  );
  if (phase === "resolving") return <div className="v8c-done" role="status"><span className="v8c-spin" aria-hidden="true" /><p>Checking the QR code…</p></div>;
  const who = payee?.payee;
  return (
    <div className="v8u-scan">
      {who ? <div className="v8msg-new-who"><Ava src={who.avatar_url} name={who.display_name} size={48} /><span><b>{who.display_name}</b><small>@{who.public_username}{who.verified ? " · Verified" : ""}</small></span></div> : null}
      {phase === "amount" ? (<>
        <label className="v8c-field v8msg-amount"><span>Amount (₹)</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").slice(0, 8))} autoFocus /></label>
        <label className="v8c-field"><span>Note (optional)</span><input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} /></label>
        <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={!(Number(amount) > 0)} onClick={() => setPhase("review")}>Review</button>
      </>) : null}
      {phase === "review" ? (<>
        <div className="v8c-receipt"><span>To</span><b>@{who?.public_username}</b><span>Amount</span><b>{inr(amount)}</b><span>Fee</span><b>{inr(0)}</b>{payee?.balance != null ? <><span>HPay balance</span><b>{inr(payee.balance)}</b></> : null}{payee?.amount ? <><span>Amount set by</span><b>their QR code</b></> : null}</div>
        <p className="v8msg-warn"><V8Icon name="info" size={16} /> {payee?.warning} Nothing has been paid yet.</p>
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setPhase(payee?.amount ? "camera" : "amount")}>Back</button><button type="button" className="v8-btn v8-btn-primary" disabled={!payee?.provider_ready} onClick={() => setPhase("pin")}>Confirm</button></div>
      </>) : null}
      {phase === "pin" ? <PinStep api={api} amount={Number(amount)} to={`@${who?.public_username}`} onPay={pay} onCancel={onClose} /> : null}
      {phase === "processing" ? <div className="v8c-done" role="status"><span className="v8c-spin" aria-hidden="true" /><p>Processing… don’t close this screen.</p></div> : null}
      {phase === "failed" ? <OrderResult error={err} onClose={onClose} onRetry={() => setPhase("pin")} /> : null}
      {phase === "done" && result ? (
        <div className="v8c-done"><span className="v8c-done-ico ok"><V8Icon name="check" size={26} /></span><p><b>{inr(result.payment.amount)} paid to @{who?.public_username}</b></p>
          <div className="v8c-receipt"><span>Reference</span><b>{result.payment.reference}</b><span>Status</span><b>Completed</b>{result.balance != null ? <><span>New balance</span><b>{inr(result.balance)}</b></> : null}</div>
          <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={onClose}>Done</button></div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- receipts / history
export function HPayHistory({ api, onClose }) {
  const [d, setD] = useState(null);
  const load = useCallback(async () => { setD(null); const r = await api("GET", "/api/v8/hpay/history"); setD(r.ok ? r.json : { error: r.json.message }); }, [api]);
  useEffect(() => { load(); }, [load]);
  return (
    <Sheet open title="HPay activity" onClose={onClose}>
      <div className="v8c-sandbox"><b>PREVIEW / TEST</b><span>Sandbox balance and receipts.</span></div>
      {!d ? [0, 1, 2].map((i) => <Skel key={i} h={52} />) : d.error ? <V8State kind="error" title="Activity didn’t load" message={d.error} actionLabel="Retry" onAction={load} /> : (<>
        {d.balance != null ? <p className="v8u-balance">Balance <b>{inr(d.balance)}</b></p> : <p className="v8c-muted">HPay isn’t connected in this environment.</p>}
        {!d.items.length ? <V8State icon="wallet" title="No HPay activity yet" message="Payments, recharges, bills and QR payments appear here with their references." /> : (
          <ul className="v8u-history">{d.items.map((i) => (
            <li key={`${i.reference}-${i.direction}`}><span className={`v8u-dir ${i.direction}`}><V8Icon name={i.direction === "in" ? "plus" : "send"} size={16} /></span>
              <span><b>{i.label}{i.counterpart ? ` · @${i.counterpart.public_username}` : ""}</b><small>{i.note ? `${i.note} · ` : ""}{i.reference} · {since(i.created_at)}</small></span>
              <b className={i.direction}>{i.direction === "in" ? "+" : "−"}{inr(i.amount)}</b></li>))}</ul>
        )}
      </>)}
    </Sheet>
  );
}
export { TITLES as UTILITY_TITLES, ICONS as UTILITY_ICONS };
