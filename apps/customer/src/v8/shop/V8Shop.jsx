// HOWDI V8 SHOP — buyer side of the purchase journey: product → bag → checkout (address, HPay held until delivery or cash on
// delivery, review, PIN) → order placed → My orders → order detail (stepper, tracking, timeline, cancel before shipping,
// return within 7 days, return status + refund). The seller side lives in My store → Orders.
// Routes: /shop/products/{PRD} · /shop/bag · /shop/checkout · /shop/orders · /shop/orders/{ORD}
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { useV8Ui } from "../V8System";
import { useApi, Sheet, Skel, Tabs, SignInCard, safeImg } from "../connect/common";
import { PinStep, inr, newKey } from "../connect/HPayUtilities";
import "../works/works.css";
import "./shop.css";

const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const STATE = { placed: ["warn", "Placed — waiting for the seller"], accepted: ["ok", "Accepted"], packed: ["ok", "Packed"], shipped: ["ok", "Shipped"], delivered: ["ok", "Delivered"], cancelled: ["muted", "Cancelled"], rejected: ["bad", "Declined by seller"], returned: ["muted", "Returned & refunded"] };
export const OrderChip = ({ s }) => <span className={`v8m-state ${(STATE[s] || ["muted"])[0]}`}><i />{(STATE[s] || [0, s])[1]}</span>;
export function OrderSteps({ o }) { const L = { placed: "Placed", accepted: "Accepted", packed: "Packed", shipped: "Shipped", delivered: "Delivered" }; return <ol className="v8w-steps" aria-label="Order progress">{o.steps.map((s) => <li key={s.key} className={s.done ? "done" : ""} aria-current={s.key === o.state ? "step" : undefined}><i />{L[s.key]}</li>)}</ol>; }

export default function V8Shop({ apiBase, getAuthHeaders, user, path, onNavigate, onRequireLogin }) {
  const api = useApi(apiBase, getAuthHeaders); const p = String(path || ""); let m;
  const need = (el) => (user ? el : <SignInCard title="Sign in to continue" message="Your bag and orders are saved to your HOWDI account." onSignIn={onRequireLogin} />);
  return (
    <div className="v8-page v8s" id="v8-main">
      <nav className="v8s-top" aria-label="Shop"><button type="button" className="v8-link" onClick={() => onNavigate("home")}>← Shop</button><span /><button type="button" className="v8-btn" onClick={() => onNavigate("wishlist")}><V8Icon name="heart" size={16} />Wishlist</button><button type="button" className="v8-btn" onClick={() => onNavigate("bag")}><V8Icon name="cart" size={16} />Bag</button><button type="button" className="v8-btn" onClick={() => onNavigate("orders")}><V8Icon name="box" size={16} />My orders</button></nav>
      {(m = p.match(/^products\/(PRD-[0-9A-F]{12})$/)) ? <Product key={m[1]} api={api} code={m[1]} user={user} nav={onNavigate} onRequireLogin={onRequireLogin} />
        : p === "bag" ? need(<Bag api={api} nav={onNavigate} />)
        : p === "wishlist" ? need(<Wishlist api={api} nav={onNavigate} />)
          : p === "checkout" ? need(<Checkout api={api} nav={onNavigate} />)
            : (m = p.match(/^orders\/(ORD-[0-9A-F]{12})$/)) ? need(<Order key={m[1]} api={api} code={m[1]} nav={onNavigate} />)
              : need(<Orders api={api} nav={onNavigate} />)}
    </div>
  );
}

function Product({ api, code, user, nav, onRequireLogin }) {
  const ui = useV8Ui(); const [d, setD] = useState(null); const [qty, setQty] = useState(1); const [busy, setBusy] = useState(false);
  useEffect(() => { api("GET", `/api/v8/shop/products/${code}`).then((r) => setD(r.ok ? r.json : { error: r.json.message })); }, [api, code]);
  if (!d) return <Skel h={420} r={16} />;
  if (d.error) return <V8State icon="shop" title="This product isn’t available" message={d.error} actionLabel="Back to Shop" onAction={() => nav("home")} />;
  const pr = d.product;
  const save = async () => { if (!user) { onRequireLogin(); return; } const r = await api(d.saved ? "DELETE" : "POST", "/api/v8/shop/wishlist", { product: code }); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return; } setD((x) => ({ ...x, saved: r.json.saved })); ui?.toast({ title: r.json.saved ? "Saved to your wishlist" : "Removed from your wishlist" }); };
  const add = async (buy) => { if (!user) { onRequireLogin(); return; } setBusy(true); const r = await api("POST", "/api/v8/shop/cart", { product: code, qty }); setBusy(false); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return; } if (buy) nav("checkout"); else ui?.toast({ title: "Added to your bag" }); };
  return (<>
    <section className="v8-card v8s-product">
      <div className="v8s-pimg">{safeImg(pr.image_url) ? <img src={pr.image_url} alt={pr.name} /> : <V8Icon name="image" size={40} />}</div>
      <div className="v8s-pinfo">
        <small className="v8s-store">{pr.store.name} · {pr.store.city}</small>
        <div className="v8s-titlerow"><h1>{pr.name}</h1>{!d.mine ? <button type="button" className={`v8s-heart ${d.saved ? "on" : ""}`} aria-pressed={d.saved} aria-label={d.saved ? "Remove from wishlist" : "Save to wishlist"} onClick={save}><V8Icon name="heart" size={22} fill={d.saved} /></button> : null}</div>
        {pr.rating?.count ? <a className="v8s-rating" href="#reviews"><Stars n={pr.rating.average} /> <b>{pr.rating.average}</b> · {pr.rating.count} review{pr.rating.count === 1 ? "" : "s"}</a> : <small className="v8c-muted">No reviews yet</small>}
        <p className="v8s-price"><b>{inr(pr.price)}</b>{pr.mrp > pr.price ? <><s>{inr(pr.mrp)}</s><em>{Math.round((1 - pr.price / pr.mrp) * 100)}% off</em></> : null}</p>
        <p className={pr.in_stock ? "v8s-stock" : "v8s-stock out"}>{pr.in_stock ? (pr.stock <= 3 ? `Only ${pr.stock} left` : "In stock") : "Out of stock"}</p>
        {pr.description ? <p>{pr.description}</p> : null}
        <ul className="v8s-perks"><li><V8Icon name="box" size={16} />{pr.delivery}</li><li><V8Icon name="refresh" size={16} />{pr.returns}</li><li><V8Icon name="shield" size={16} />Verified HOWDI seller · pay with HPay or cash on delivery</li></ul>
        {d.mine ? <p className="v8c-muted">This is your product.</p> : pr.in_stock ? (<>
          <div className="v8s-qty" role="group" aria-label="Quantity"><button type="button" aria-label="Less" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>−</button><b aria-live="polite">{qty}</b><button type="button" aria-label="More" disabled={qty >= Math.min(20, pr.stock)} onClick={() => setQty(qty + 1)}>+</button></div>
          <div className="v8w-row"><button type="button" className="v8-btn" disabled={busy} onClick={() => add(false)}>Add to bag</button><button type="button" className="v8-btn v8-btn-primary" disabled={busy} onClick={() => add(true)}>Buy now</button></div>
        </>) : null}
      </div>
    </section>
    <Reviews api={api} code={code} user={user} onRequireLogin={onRequireLogin} />
  </>);
}

const Stars = ({ n }) => <span className="v8s-stars" aria-label={`${n} out of 5 stars`}>{[1, 2, 3, 4, 5].map((i) => <V8Icon key={i} name="star" size={14} fill={i <= Math.round(n)} />)}</span>;
function Reviews({ api, code, user, onRequireLogin }) {
  const ui = useV8Ui(); const [d, setD] = useState(null); const [rating, setRating] = useState(0); const [body, setBody] = useState(""); const [edit, setEdit] = useState(false); const [reply, setReply] = useState({});
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/shop/products/${code}/reviews`); setD(r.ok ? r.json : { error: r.json.message }); }, [api, code]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Skel h={160} r={16} />;
  if (d.error) return null;
  const mine = d.items.find((x) => x.mine);
  const submit = async () => { const r = await api("POST", `/api/v8/shop/products/${code}/reviews`, { rating, body }); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return; } ui?.toast({ title: r.json.updated ? "Review updated" : "Thanks — your review is live. The seller was notified." }); setEdit(false); load(); };
  const remove = async () => { const r = await api("DELETE", `/api/v8/shop/products/${code}/reviews`); if (r.ok) { ui?.toast({ title: "Review deleted" }); setRating(0); setBody(""); load(); } };
  const sendReply = async (h) => { const r = await api("POST", `/api/v8/shop/products/${code}/reviews/${h}/reply`, { body: reply[h] }); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return; } ui?.toast({ title: "Reply posted — the buyer was notified" }); setReply((x) => ({ ...x, [h]: undefined })); load(); };
  const form = (d.can_review && (!mine || edit)) ? (
    <div className="v8s-rform"><b>{mine ? "Edit your review" : "Rate this product"}</b>
      <div className="v8s-rpick" role="radiogroup" aria-label="Your rating">{[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} className={i <= rating ? "on" : ""} onClick={() => setRating(i)}><V8Icon name="star" size={26} fill={i <= rating} /></button>)}</div>
      <label className="v8c-field"><span>Your review (optional)</span><textarea rows={3} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Quality, size, colour, packing…" /></label>
      <div className="v8w-row"><button type="button" className="v8-btn v8-btn-primary" disabled={!rating} onClick={submit}>{mine ? "Save" : "Post review"}</button>{edit ? <button type="button" className="v8-btn" onClick={() => setEdit(false)}>Cancel</button> : null}</div></div>) : null;
  return (
    <section className="v8-card v8w-block v8s-reviews" id="reviews" aria-label="Reviews">
      <h2>Ratings & reviews</h2>
      {d.summary.count ? <div className="v8s-rsum"><div><b className="v8s-ravg">{d.summary.average}</b><Stars n={d.summary.average} /><small>{d.summary.count} verified review{d.summary.count === 1 ? "" : "s"}</small></div>
        <ol className="v8s-hist">{d.summary.histogram.map((c, i) => <li key={i}><span>{5 - i}★</span><span className="v8l-bar"><i style={{ width: `${d.summary.count ? (100 * c) / d.summary.count : 0}%` }} /></span><small>{c}</small></li>)}</ol></div> : <p className="v8c-muted">No reviews yet.{d.can_review ? " Be the first to review it." : ""}</p>}
      {form}
      {!d.can_review && !d.is_seller ? <p className="v8c-muted"><V8Icon name="shield" size={14} /> Only buyers who received this product can review it{!d.signed_in ? <> — <button type="button" className="v8-link" onClick={onRequireLogin}>sign in</button></> : null}.</p> : null}
      <ul className="v8s-rlist">{d.items.map((r) => { const h = r.author?.public_username; return (
        <li key={h || r.at}><header><b>@{h || "buyer"}</b><Stars n={r.rating} /><small>{new Date(r.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{r.edited ? " · edited" : ""} · verified purchase</small></header>
          {r.body ? <p>{r.body}</p> : null}
          {r.mine && !edit ? <div className="v8w-row"><button type="button" className="v8-link" onClick={() => { setRating(r.rating); setBody(r.body || ""); setEdit(true); }}>Edit</button><button type="button" className="v8-link" onClick={remove}>Delete</button></div> : null}
          {r.reply ? <div className="v8s-reply"><b>{r.reply.store} (seller)</b><p>{r.reply.body}</p></div>
            : d.is_seller ? (reply[h] !== undefined ? <div className="v8s-reply"><label className="v8c-field"><span>Reply publicly as the seller</span><textarea rows={2} maxLength={600} value={reply[h]} onChange={(e) => setReply((x) => ({ ...x, [h]: e.target.value }))} /></label><div className="v8w-row"><button type="button" className="v8-btn v8-btn-primary" disabled={!String(reply[h]).trim()} onClick={() => sendReply(h)}>Post reply</button><button type="button" className="v8-btn" onClick={() => setReply((x) => ({ ...x, [h]: undefined }))}>Cancel</button></div></div>
              : <button type="button" className="v8-link" onClick={() => setReply((x) => ({ ...x, [h]: "" }))}>Reply</button>) : null}
        </li>); })}</ul>
    </section>
  );
}

function Wishlist({ api, nav }) {
  const ui = useV8Ui(); const [d, setD] = useState(null);
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/shop/wishlist"); setD(r.ok ? r.json : { error: r.json.message }); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Skel h={240} r={16} />;
  if (d.error) return <V8State kind="error" title="Your wishlist didn’t load" message={d.error} actionLabel="Retry" onAction={load} />;
  if (!d.items.length) return <V8State icon="heart" title="Your wishlist is empty" message="Tap the heart on any product to save it here." actionLabel="Browse Shop" onAction={() => nav("home")} />;
  const remove = async (c) => { const r = await api("DELETE", "/api/v8/shop/wishlist", { product: c }); if (r.ok) { ui?.toast({ title: "Removed from your wishlist" }); load(); } };
  const move = async (c) => { const r = await api("POST", "/api/v8/shop/cart", { product: c, qty: 1 }); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return; } await api("DELETE", "/api/v8/shop/wishlist", { product: c }); ui?.toast({ title: "Moved to your bag" }); load(); };
  return (
    <section className="v8-card v8w-block"><h2>Wishlist · {d.items.length}</h2>
      {d.items.map((p) => <div key={p.public_key} className="v8me-prod">{safeImg(p.image_url) ? <img src={p.image_url} alt="" /> : <span className="v8me-prod-ph"><V8Icon name="image" size={20} /></span>}
        <span><button type="button" className="v8-link v8s-wname" onClick={() => nav(`products/${p.public_key}`)}>{p.name}</button><small>{p.store.name} · {inr(p.price)}{!p.in_stock ? " · out of stock" : ""}</small></span>
        <span className="v8me-prod-act"><button type="button" className="v8-btn v8-btn-primary" disabled={!p.in_stock} onClick={() => move(p.public_key)}>Move to bag</button><button type="button" className="v8-btn" onClick={() => remove(p.public_key)}>Remove</button></span></div>)}
    </section>
  );
}

function Bag({ api, nav }) {
  const [c, setC] = useState(null);
  const load = useCallback(async () => { const r = await api("GET", "/api/v8/shop/cart"); setC(r.ok ? r.json.cart : { error: r.json.message }); }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!c) return <Skel h={240} r={16} />;
  if (c.error) return <V8State kind="error" title="Your bag didn’t load" message={c.error} actionLabel="Retry" onAction={load} />;
  if (!c.items.length) return <V8State icon="cart" title="Your bag is empty" message="Find handmade products from verified HOWDI sellers." actionLabel="Browse Shop" onAction={() => nav("home")} />;
  const set = async (it, qty) => { const r = qty ? await api("PATCH", "/api/v8/shop/cart", { product: it.product, qty }) : await api("DELETE", "/api/v8/shop/cart", { product: it.product }); if (r.ok) setC(r.json.cart); };
  return (
    <section className="v8s-bag">
      <div className="v8-card v8w-block"><h2>Your bag</h2>
        {c.items.map((it) => <div key={it.product} className="v8me-prod">{safeImg(it.image_url) ? <img src={it.image_url} alt="" /> : <span className="v8me-prod-ph"><V8Icon name="image" size={20} /></span>}
          <span><b>{it.name}</b><small>{it.store} · {inr(it.price)}</small>{!it.available ? <small className="v8c-err">Not available in this quantity</small> : null}</span>
          <span className="v8me-prod-act"><span className="v8s-qty small"><button type="button" aria-label={`Less ${it.name}`} onClick={() => set(it, it.qty - 1)}>−</button><b>{it.qty}</b><button type="button" aria-label={`More ${it.name}`} disabled={it.qty >= Math.min(20, it.stock)} onClick={() => set(it, it.qty + 1)}>+</button></span></span></div>)}
      </div>
      <div className="v8-card v8w-block"><div className="v8c-receipt"><span>Items</span><b>{inr(c.subtotal)}</b><span>Delivery</span><b>{c.shipping ? inr(c.shipping) : "Free"}</b><span>Total</span><b>{inr(c.total)}</b></div>
        {c.stores > 1 ? <p className="v8c-muted">Items from {c.stores} stores ship as {c.stores} separate orders.</p> : null}
        <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={c.items.some((x) => !x.available)} onClick={() => nav("checkout")}>Checkout</button></div>
    </section>
  );
}

function Checkout({ api, nav }) {
  const ui = useV8Ui();
  const [addrs, setAddrs] = useState(null); const [sel, setSel] = useState(""); const [adding, setAdding] = useState(false); const [f, setF] = useState({ name: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "Telangana", pin_code: "" });
  const [method, setMethod] = useState("hpay"); const [review, setReview] = useState(null); const [step, setStep] = useState("address"); const [err, setErr] = useState(""); const key = useRef(newKey());
  const loadA = useCallback(async () => { const r = await api("GET", "/api/v8/shop/addresses"); const items = r.ok ? r.json.items : []; setAddrs(items); if (items[0]) setSel((s) => s || items[0].key); else setAdding(true); }, [api]);
  useEffect(() => { loadA(); }, [loadA]);
  const saveAddr = async () => { setErr(""); const r = await api("POST", "/api/v8/shop/addresses", f); if (!r.ok) { setErr(r.json.message); return; } setAdding(false); await loadA(); setSel(r.json.saved.key); };
  const toReview = async () => { setErr(""); const r = await api("POST", "/api/v8/shop/checkout/quote", { address: sel, method }); if (!r.ok) { setErr(r.json.message); return; } setReview(r.json.review); setStep("review"); };
  const place = async (pin) => {
    const r = await api("POST", "/api/v8/shop/checkout", { address: sel, method, pin, idempotency_key: key.current });
    if (!r.ok) { if (["PIN_WRONG", "PIN_LOCKED"].includes(r.json.code)) return { code: r.json.code, message: r.json.message }; setErr(r.json.message); setStep("review"); return null; }
    ui?.toast({ title: r.json.orders.length > 1 ? `${r.json.orders.length} orders placed` : "Order placed" }); nav(`orders/${r.json.orders[0].public_key}`); return null;
  };
  if (!addrs) return <Skel h={300} r={16} />;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <section className="v8-card v8w-block v8s-checkout">
      <h2>Checkout</h2>
      {step === "address" ? (<>
        <h3>Deliver to</h3>
        {addrs.map((a) => <label key={a.key} className={`v8s-addr ${sel === a.key ? "on" : ""}`}><input type="radio" name="addr" checked={sel === a.key} onChange={() => setSel(a.key)} /><span><b>{a.name}</b> · {a.contact}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}{a.landmark ? `, ${a.landmark}` : ""}, {a.city}, {a.state} {a.pin_code}</span></label>)}
        {adding ? (<div className="v8u-form v8w-fs"><div className="v8u-two"><label className="v8c-field"><span>Full name</span><input value={f.name} onChange={(e) => set("name", e.target.value)} /></label><label className="v8c-field"><span>Mobile (for the courier)</span><input inputMode="numeric" value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} /></label></div>
          <label className="v8c-field"><span>House / street</span><input value={f.line1} onChange={(e) => set("line1", e.target.value)} /></label>
          <div className="v8u-two"><label className="v8c-field"><span>Area (optional)</span><input value={f.line2} onChange={(e) => set("line2", e.target.value)} /></label><label className="v8c-field"><span>Landmark (optional)</span><input value={f.landmark} onChange={(e) => set("landmark", e.target.value)} /></label></div>
          <div className="v8u-two"><label className="v8c-field"><span>City</span><input value={f.city} onChange={(e) => set("city", e.target.value)} /></label><label className="v8c-field"><span>PIN code</span><input inputMode="numeric" value={f.pin_code} onChange={(e) => set("pin_code", e.target.value.replace(/\D/g, "").slice(0, 6))} /></label></div>
          <label className="v8c-field"><span>State</span><input value={f.state} onChange={(e) => set("state", e.target.value)} /></label>
          <p className="v8c-muted"><V8Icon name="lock" size={14} /> The seller sees this address only after accepting your order.</p>
          <button type="button" className="v8-btn" onClick={saveAddr}>Save address</button></div>) : <button type="button" className="v8-link" onClick={() => setAdding(true)}>+ Add a new address</button>}
        <h3>Pay with</h3>
        <div className="v8c-seg" role="radiogroup" aria-label="Payment"><button type="button" role="radio" aria-checked={method === "hpay"} className={method === "hpay" ? "on" : ""} onClick={() => setMethod("hpay")}><V8Icon name="wallet" size={16} />HPay (held until delivery)</button><button type="button" role="radio" aria-checked={method === "cod"} className={method === "cod" ? "on" : ""} onClick={() => setMethod("cod")}>Cash on delivery</button></div>
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={!sel || adding} onClick={toReview}>Review order</button>
      </>) : null}
      {step === "review" && review ? (<>
        {review.items.map((it) => <div key={it.product} className="v8s-rline"><span>{it.qty} × {it.name}</span><b>{inr(it.line_total)}</b></div>)}
        <div className="v8c-receipt"><span>Items</span><b>{inr(review.subtotal)}</b><span>Delivery</span><b>{review.shipping ? inr(review.shipping) : "Free"}</b><span>Total</span><b>{inr(review.total)}</b><span>Deliver to</span><b>{review.ship_to.name}, {review.ship_to.city} {review.ship_to.pin_code}</b><span>Payment</span><b>{review.method === "hpay" ? "HPay — held until delivery" : "Cash on delivery"}</b>{review.balance != null ? <><span>HPay balance</span><b>{inr(review.balance)}</b></> : null}</div>
        {review.note ? <p className="v8c-muted">{review.note}</p> : null}
        {!review.provider_ready ? <p className="v8c-err">HPay isn’t connected here. Choose cash on delivery.</p> : null}
        {err ? <p className="v8c-err" role="alert">{err}</p> : null}
        <div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setStep("address")}>Back</button><button type="button" className="v8-btn v8-btn-primary" disabled={!review.provider_ready} onClick={() => (review.method === "hpay" ? setStep("pin") : place(undefined))}>{review.method === "hpay" ? `Pay ${inr(review.total)}` : "Place order"}</button></div>
        {review.method === "hpay" ? <small className="v8-pill-test">Preview / Test</small> : null}
      </>) : null}
      {step === "pin" ? <PinStep api={api} amount={review.total} to="your HOWDI Shop order" onPay={place} onCancel={() => setStep("review")} /> : null}
    </section>
  );
}

function Orders({ api, nav }) {
  const [tab, setTab] = useState("active"); const [d, setD] = useState(null);
  useEffect(() => { setD(null); api("GET", `/api/v8/shop/orders?tab=${tab}`).then((r) => setD(r.ok ? r.json.items : { error: r.json.message })); }, [api, tab]);
  return (
    <section className="v8w-list"><h2>My orders</h2>
      <Tabs compact tabs={[{ value: "active", label: "In progress" }, { value: "past", label: "Past" }]} value={tab} onChange={setTab} label="Orders" />
      {!d ? <Skel h={90} r={16} /> : d.error ? <V8State kind="error" title="Orders didn’t load" message={d.error} /> : !d.length ? <V8State icon="box" title={tab === "active" ? "No orders in progress" : "No past orders"} actionLabel="Browse Shop" onAction={() => nav("home")} />
        : d.map((o) => <button key={o.public_key} type="button" className="v8-card v8w-bk" onClick={() => nav(`orders/${o.public_key}`)}>{safeImg(o.items[0]?.image_url) ? <img className="v8s-thumb" src={o.items[0].image_url} alt="" /> : <span className="v8c-row-ico"><V8Icon name="box" size={22} /></span>}<span className="v8w-bk-text"><b>{o.items.map((i) => i.name).join(", ")}</b><small>{o.store.name} · {inr(o.total)} · {when(o.placed_at)}</small><OrderChip s={o.state} /></span><V8Icon name="chevr" size={18} /></button>)}
    </section>
  );
}

const RR = [["damaged", "Arrived damaged"], ["wrong", "Wrong item sent"], ["not_as_described", "Not as described"], ["size", "Size or fit issue"], ["other", "Other"]];
function Order({ api, code, nav }) {
  const ui = useV8Ui(); const [o, setO] = useState(null); const [sheet, setSheet] = useState(""); const [reason, setReason] = useState(""); const [details, setDetails] = useState("");
  const load = useCallback(async () => { const r = await api("GET", `/api/v8/shop/orders/${code}`); setO(r.ok ? r.json.order : { error: r.json.message }); }, [api, code]);
  useEffect(() => { load(); const id = window.setInterval(load, 8000); return () => window.clearInterval(id); }, [load]);
  if (!o) return <Skel h={360} r={16} />;
  if (o.error) return <V8State icon="box" title="Order not found" message={o.error} actionLabel="My orders" onAction={() => nav("orders")} />;
  const act = async (sub, body, msg) => { const r = await api("POST", `/api/v8/shop/orders/${code}/${sub}`, body); setSheet(""); if (!r.ok) { ui?.toast({ kind: "error", title: r.json.message }); return; } setO(r.json.order); ui?.toast({ title: r.json.message || msg }); };
  return (
    <div className="v8w-detail">
      <section className="v8-card v8w-block">
        <header className="v8w-dhead"><button type="button" className="v8-icon-btn" aria-label="Back to my orders" onClick={() => nav("orders")}><V8Icon name="back" size={20} /></button><div><h2>{o.store.name}</h2><small>Order {o.public_key} · {when(o.placed_at)}</small></div><OrderChip s={o.state} /></header>
        {!["cancelled", "rejected", "returned"].includes(o.state) ? <OrderSteps o={o} /> : <p className="v8w-ended">{o.state === "rejected" ? `The seller declined: ${o.reason}.` : o.state === "cancelled" ? `Cancelled: ${o.reason || "by you"}.` : "Returned."}{o.payment.state === "refunded" ? " Your HPay payment was refunded." : ""}</p>}
        {o.tracking ? <p className="v8s-track"><V8Icon name="box" size={16} /> {o.courier} · tracking <b>{o.tracking}</b></p> : null}
      </section>
      <section className="v8-card v8w-block">{o.items.map((i, k) => <div key={k} className="v8me-prod">{safeImg(i.image_url) ? <img src={i.image_url} alt="" /> : <span className="v8me-prod-ph"><V8Icon name="image" size={20} /></span>}<span><b>{i.name}</b><small>{i.qty} × {inr(i.price)}</small></span><b>{inr(i.line_total)}</b></div>)}
        <div className="v8c-receipt"><span>Items</span><b>{inr(o.subtotal)}</b><span>Delivery</span><b>{o.shipping ? inr(o.shipping) : "Free"}</b><span>Total</span><b>{inr(o.total)}</b><span>Payment</span><b>{o.payment.method === "hpay" ? `HPay · ${{ held: "held until delivery", released: "paid to seller", refunded: "refunded" }[o.payment.state] || o.payment.state}` : `Cash on delivery · ${o.payment.state === "collected" ? "paid" : "pay on delivery"}`}</b><span>Deliver to</span><b>{o.delivery.name}, {o.delivery.line}, {o.delivery.city} {o.delivery.pin_code}</b></div></section>
      {o.return ? <section className={`v8-card v8w-block v8w-wait ${o.return.status === "rejected" ? "bad" : ""}`}><V8Icon name="refresh" size={22} /><div><b>Return {o.return.public_key} · {{ requested: "waiting for the seller", approved: "approved", rejected: "not accepted", refunded: "refunded" }[o.return.status] || o.return.status}</b><p>{o.return.reason}{o.return.details ? ` — ${o.return.details}` : ""}</p>{o.return.pickup ? <p>{o.return.pickup}</p> : null}</div></section> : null}
      {o.actions.length ? <section className="v8-card v8w-block">{o.actions.includes("cancel") ? <button type="button" className="v8-btn" onClick={() => setSheet("cancel")}>Cancel order</button> : null}{o.actions.includes("return") ? <button type="button" className="v8-btn v8-btn-primary" onClick={() => setSheet("return")}>Return an item</button> : null}</section> : null}
      <details className="v8-card v8w-block v8w-timeline"><summary>History</summary><ol>{o.timeline.map((e, i) => <li key={i}><b>{e.event.replace(/_/g, " ")}</b> <small>{e.actor} · {when(e.at)}</small>{e.note ? <p>{e.note}</p> : null}</li>)}</ol></details>
      {sheet === "cancel" ? <Sheet open title="Cancel this order?" onClose={() => setSheet("")}><div className="v8w-radios" role="radiogroup" aria-label="Reason">{["Ordered by mistake", "Found a better price", "Delivery is too slow", "Other"].map((r) => <label key={r} className={reason === r ? "on" : ""}><input type="radio" name="cr" checked={reason === r} onChange={() => setReason(r)} />{r}</label>)}</div><p className="v8c-muted">Any HPay payment is refunded right away.</p><div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setSheet("")}>Keep order</button><button type="button" className="v8-btn v8-btn-danger" disabled={!reason} onClick={() => act("cancel", { reason })}>Cancel order</button></div></Sheet> : null}
      {sheet === "return" ? <Sheet open title="Return request" onClose={() => setSheet("")}><div className="v8w-radios" role="radiogroup" aria-label="Reason">{RR.map(([k, l]) => <label key={k} className={reason === k ? "on" : ""}><input type="radio" name="rr" checked={reason === k} onChange={() => setReason(k)} />{l}</label>)}</div><label className="v8c-field"><span>Details (optional)</span><textarea rows={3} maxLength={600} value={details} onChange={(e) => setDetails(e.target.value)} /></label><p className="v8c-muted">The seller reviews it; once approved a pickup is scheduled and you’re refunded when they receive the item.</p><div className="v8vc-actions"><button type="button" className="v8-btn" onClick={() => setSheet("")}>Back</button><button type="button" className="v8-btn v8-btn-primary" disabled={!reason} onClick={() => act("return", { reason, details }, "Return requested")}>Request return</button></div></Sheet> : null}
    </div>
  );
}
