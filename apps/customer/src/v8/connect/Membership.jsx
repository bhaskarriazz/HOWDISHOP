// HOWDI V8 creator memberships — PRIOR__14 panels 2 (paid offer), 3 (complete your subscription with HPay), 4 (locked
// subscriber-only content), 6 (manage subscription) and V8__27 panel 3. Money is INR; until a payment provider is connected
// every charge uses the clearly labelled Preview/Test HPay sandbox balance.
import { useCallback, useEffect, useMemo, useState } from "react";
import { V8Icon, V8State } from "../V8Shell";
import { V8Badges, V8Confirm, useV8Ui } from "../V8System";
import { Ava, Sheet, Skel, fmt, Row } from "./common";

export const inr = (n) => { const v = Number(n || 0); return `₹${v.toLocaleString("en-IN", Number.isInteger(v) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; };
const day = (iso) => { const t = Date.parse(iso || ""); return Number.isFinite(t) ? new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""; };
const newKey = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Paid offer card for a creator (profile / creator hub). Loads /api/v8/creators/@h/memberships.
export function MembershipOffer({ api, handle, signedIn, onRequireLogin, onNav, compact }) {
  const [d, setD] = useState({ status: "loading" }); const [join, setJoin] = useState(null);
  const load = useCallback(async () => {
    setD({ status: "loading" });
    const r = await api("GET", `/api/v8/creators/@${handle}/memberships`);
    setD(r.ok ? { ...r.json, status: "ready" } : { status: r.status === 404 ? "none" : "error" });
  }, [api, handle]);
  useEffect(() => { if (handle) load(); }, [handle, load]);
  if (d.status === "loading") return <div className="v8-card v8m-offer"><Skel h={18} w="50%" /><Skel h={60} /></div>;
  if (d.status === "none") return null;
  if (d.status === "error") return <div className="v8-card v8m-offer"><V8State kind="error" title="Membership didn’t load" actionLabel="Try again" onAction={load} /></div>;
  if (!d.tiers.length) return null;
  const name = d.creator?.author?.display_name || `@${handle}`;
  return (
    <section className={`v8-card v8m-offer ${compact ? "compact" : ""}`} aria-label={`Join ${name}’s membership`}>
      {d.tiers.map((t) => (
        <div key={t.key} className="v8m-tier">
          <header><span className="v8m-crown"><V8Icon name="crown" size={20} fill /></span><div><h3>Join {name}’s {t.name}</h3>{t.description ? <p>{t.description}</p> : null}</div></header>
          <p className="v8m-price"><b>{inr(t.monthly)}</b> / month <small>or {inr(t.yearly)} / year</small></p>
          <ul className="v8m-benefits">{t.benefits.map((b) => <li key={b}><V8Icon name="check" size={16} />{b}</li>)}</ul>
          {d.is_me ? <p className="v8c-muted">This is your tier — {t.members} member{t.members === 1 ? "" : "s"}.</p>
            : d.membership ? (
              <div className="v8m-member"><span className="v8m-state ok"><V8Icon name="check" size={16} />{d.membership.state === "cancelling" ? `Access until ${day(d.membership.access_until)}` : d.membership.state === "payment_failed" ? "Payment failed" : "You’re a member"}</span>
                <button type="button" className="v8-btn v8-btn-soft" onClick={() => onNav?.("memberships")}>Manage</button></div>
            ) : <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={() => (signedIn ? setJoin(t) : onRequireLogin())}><V8Icon name="wallet" size={18} />Subscribe with HPay</button>}
        </div>
      ))}
      {!d.is_me ? <div className="v8m-cancel-note"><V8Icon name="info" size={18} /><span><b>Cancel anytime</b><small>Manage your membership in My memberships. No lock-in, no hidden fees.</small></span></div> : null}
      <JoinSheet open={Boolean(join)} tier={join} creator={d.creator} api={api} onClose={() => setJoin(null)} onJoined={() => { setJoin(null); load(); }} onNav={onNav} />
    </section>
  );
}

// Join flow: choose billing → confirm with HPay (consent) → processing → receipt; insufficient balance / failure / retry.
export function JoinSheet({ open, tier, creator, api, onClose, onJoined, onNav }) {
  const ui = useV8Ui();
  const [cycle, setCycle] = useState("monthly"); const [q, setQ] = useState(null); const [agree, setAgree] = useState([false, false, false]);
  const [state, setState] = useState("quote"); const [err, setErr] = useState(null); const [receipt, setReceipt] = useState(null);
  const key = useMemo(() => (open ? newKey() : ""), [open, tier?.key, cycle]); // one idempotency key per attempt
  useEffect(() => {
    if (!open || !tier) return;
    setState("quote"); setErr(null); setReceipt(null); setAgree([false, false, false]); setQ(null);
    api("POST", `/api/v8/memberships/${tier.key}/quote`, { cycle }).then((r) => setQ(r.ok ? r.json : { error: r.json.message || "Couldn’t load the price." }));
  }, [open, tier, cycle, api]);
  if (!open || !tier) return null;
  const pay = async () => {
    setState("paying"); setErr(null);
    const r = await api("POST", `/api/v8/memberships/${tier.key}/subscribe`, { cycle, consent: true, idempotency_key: key });
    if (r.ok) { setReceipt(r.json); setState("done"); ui?.toast({ title: `Welcome to ${tier.name}`, message: `Receipt ${r.json.receipt.reference}` }); window.dispatchEvent(new Event("howdi:v8-notifications")); return; }
    setErr({ code: r.json.code || (r.status === 0 ? "OFFLINE" : "FAILED"), message: r.json.message || "Payment didn’t go through. Nothing was charged." }); setState("error");
  };
  const who = creator?.author;
  // the page behind reloads (unlocking members-only content) only after the receipt is dismissed
  const close = () => { if (state === "done") window.setTimeout(() => window.dispatchEvent(new Event("howdi:v8-membership")), 0); onClose(); };
  return (
    <Sheet open={open} title={state === "done" ? "You’re a member" : "Complete your subscription"} onClose={close}>
      {state === "done" && receipt ? (
        <div className="v8m-receipt">
          <span className="v8c-done-ico ok"><V8Icon name="check" size={28} /></span>
          <h3>{receipt.membership.tier} is active</h3>
          <dl><div><dt>Amount</dt><dd>{inr(receipt.receipt.amount)} / {receipt.membership.cycle === "yearly" ? "year" : "month"}</dd></div><div><dt>Paid with</dt><dd>{receipt.receipt.method}</dd></div>
            <div><dt>Reference</dt><dd>{receipt.receipt.reference}</dd></div><div><dt>Renews on</dt><dd>{day(receipt.membership.renews_on)}</dd></div><div><dt>HPay balance</dt><dd>{inr(receipt.receipt.balance_after)}</dd></div></dl>
          <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={() => { onJoined?.(); window.setTimeout(() => window.dispatchEvent(new Event("howdi:v8-membership")), 0); }}>See members-only content</button>
          <button type="button" className="v8-btn v8-btn-block" onClick={() => { close(); onNav?.("memberships"); }}>Manage membership</button>
        </div>
      ) : (
        <div className="v8m-join">
          {who ? <div className="v8m-join-who"><Ava src={who.avatar_url} name={who.display_name} size={52} /><span><b>{who.display_name}</b><small>@{who.public_username} <V8Badges verified={who.verified} premium={who.premium} size="sm" /></small><small>{tier.name}</small></span></div> : null}
          <div className="v8m-cycle" role="radiogroup" aria-label="Billing">
            {[["monthly", `${inr(tier.monthly)} / month`, "Billed monthly. Cancel anytime."], ["yearly", `${inr(tier.yearly)} / year`, `Save ${inr(tier.monthly * 12 - tier.yearly)} a year`]].map(([v, l, s]) => (
              <label key={v} className={`v8m-cycle-opt ${cycle === v ? "on" : ""}`}><input type="radio" name="v8m-cycle" checked={cycle === v} onChange={() => setCycle(v)} /><span><b>{l}</b><small>{s}</small></span></label>
            ))}
          </div>
          <h4 className="v8m-h">Pay with HPay <V8Icon name="lock" size={14} /></h4>
          {!q ? <Skel h={64} /> : q.error ? <p className="v8c-err" role="alert">{q.error}</p> : (
            <>
              <div className="v8m-method on"><span className="v8m-hpay">HPay</span><span><b>HPay balance</b><small>{q.wallet ? `${inr(q.wallet.balance)} available` : "Not connected"}</small></span><span className="v8-pill-test">Preview / Test</span></div>
              <p className="v8c-muted small">Preview/Test sandbox balance — no real money moves. Card and UPI arrive when a payment provider is connected.</p>
              <fieldset className="v8m-consent"><legend>By subscribing, you agree to:</legend>
                {q.consent.map((c, i) => <label key={c}><input type="checkbox" checked={agree[i]} onChange={() => setAgree((a) => a.map((x, j) => (j === i ? !x : x)))} /><span>{c}</span></label>)}
              </fieldset>
              {state === "error" && err ? (
                <div className="v8-banner-error" role="alert"><V8Icon name="alert" size={20} /><span><b>{err.code === "INSUFFICIENT_BALANCE" ? "Not enough HPay balance" : err.code === "OFFLINE" ? "You’re offline" : "Payment didn’t go through"}</b> {err.message}</span></div>
              ) : null}
              <button type="button" className="v8-btn v8-btn-primary v8-btn-block v8m-confirm" disabled={!q.provider_ready || !agree.every(Boolean) || state === "paying"} onClick={pay}>
                {state === "paying" ? "Processing payment…" : state === "error" ? "Try again" : <>Confirm subscription<small>{inr(q.amount)} / {cycle === "yearly" ? "year" : "month"}</small></>}
              </button>
              {!q.provider_ready ? <p className="v8c-err">Payments aren’t connected on this server yet. Nothing will be charged.</p> : null}
              <p className="v8m-secure"><V8Icon name="lock" size={14} />Payments are processed by HPay. HOWDI keeps a 10% platform fee; the rest goes to the creator.</p>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

// "This content is for members" — PRIOR__14 panel 4.
export function LockedCard({ post, onJoin }) {
  return (
    <div className="v8m-locked">
      <span className="v8m-lock"><V8Icon name="lock" size={26} /></span>
      <b>This content is for {post.tier || "members"} members</b>
      {post.teaser ? <p>{post.teaser}</p> : null}
      <button type="button" className="v8-btn v8-btn-primary" onClick={onJoin}>Subscribe to unlock</button>
    </div>
  );
}

// My memberships (manage) — PRIOR__14 panel 6.
export function MyMemberships({ api, user, onRequireLogin, onOpenProfile, onNav }) {
  const ui = useV8Ui();
  const [d, setD] = useState({ status: "loading", items: [] }); const [confirm, setConfirm] = useState(null); const [busy, setBusy] = useState("");
  const load = useCallback(async () => { setD((x) => ({ ...x, status: "loading" })); const r = await api("GET", "/api/v8/me/memberships"); setD(r.ok ? { ...r.json, status: "ready" } : { status: "error", items: [] }); }, [api]);
  useEffect(() => { if (user) load(); }, [user, load]);
  if (!user) return <div className="v8-card"><V8State icon="lock" title="Sign in to manage memberships" actionLabel="Sign in" onAction={onRequireLogin} /></div>;
  const act = async (m, action) => {
    setBusy(m.key + action);
    const r = await api("POST", `/api/v8/subscriptions/${m.key}/${action}`);
    setBusy(""); setConfirm(null);
    if (r.ok) { ui?.toast({ title: action === "cancel" ? "Membership cancelled" : action === "resume" ? "Membership resumed" : "Payment successful", message: action === "cancel" ? `You keep access until ${day(m.access_until)}.` : "" }); load(); }
    else ui?.toast({ kind: "error", title: "Couldn’t update", message: r.json.message || "Please try again." });
  };
  return (
    <div className="v8m-manage">
      <header className="v8c-page-head"><button type="button" className="v8-icon-btn" aria-label="Back" onClick={() => onNav("")}><V8Icon name="back" size={22} /></button><div><h1>My memberships</h1><p>Renew, cancel and see what’s included.</p></div></header>
      {d.wallet ? <div className="v8-card v8m-wallet"><span className="v8m-hpay">HPay</span><span><b>{inr(d.wallet.balance)}</b><small>HPay balance · Preview/Test sandbox</small></span></div> : null}
      {d.status === "loading" ? <div className="v8-card"><Skel h={90} /></div> : null}
      {d.status === "error" ? <V8State kind="error" title="Memberships didn’t load" actionLabel="Try again" onAction={load} /> : null}
      {d.status === "ready" && !d.items.length ? <div className="v8-card"><V8State icon="crown" title="No memberships yet" message="Join a creator’s membership for exclusive tutorials, patterns and live sessions." actionLabel="Explore creators" onAction={() => onNav("explore")} /></div> : null}
      {d.items.map((m) => (
        <article key={m.key} className="v8-card v8m-sub">
          <header>{m.creator ? <button type="button" className="v8m-sub-who" onClick={() => onOpenProfile(m.creator.public_username)}><Ava src={m.creator.avatar_url} name={m.creator.display_name} size={52} /><span><b>{m.creator.display_name}</b><small>@{m.creator.public_username}</small><small>{m.tier}</small></span></button> : null}</header>
          <p className={`v8m-state ${m.state === "active" ? "ok" : m.state === "payment_failed" ? "bad" : "warn"}`}><i />{{ active: "Active", cancelling: "Cancels at period end", payment_failed: "Payment failed — access paused", ended: "Ended" }[m.state] || m.state}</p>
          <p className="v8m-price"><b>{inr(m.amount)}</b> / {m.cycle === "yearly" ? "year" : "month"}</p>
          <p className="v8c-muted">{m.state === "active" ? `Next payment: ${day(m.renews_on)}` : m.state === "cancelling" ? `Access until ${day(m.access_until)}` : m.state === "ended" ? `Ended ${day(m.access_until)}` : "Add HPay balance and retry to restore access."}{m.payment_reference ? ` · Last receipt ${m.payment_reference}` : ""}</p>
          <div className="v8m-actions">
            {m.state === "payment_failed" ? <button type="button" className="v8-btn v8-btn-primary" disabled={Boolean(busy)} onClick={() => act(m, "retry")}>{busy === m.key + "retry" ? "Retrying…" : "Retry payment"}</button> : null}
            {m.state === "cancelling" ? <button type="button" className="v8-btn v8-btn-primary" disabled={Boolean(busy)} onClick={() => act(m, "resume")}>Keep my membership</button> : null}
            {m.state === "active" || m.state === "payment_failed" ? <button type="button" className="v8-btn v8m-cancel" onClick={() => setConfirm(m)}>Cancel subscription</button> : null}
          </div>
          <h4 className="v8m-h">Membership benefits</h4>
          <ul className="v8m-benefits">{m.benefits.map((b) => <li key={b}><V8Icon name="check" size={16} />{b}</li>)}</ul>
          {m.creator ? (<>
            <h4 className="v8m-h">Creator safety & support</h4>
            <Row icon="flag" label="Report this creator" onClick={() => onOpenProfile(m.creator.public_username)} />
            <Row icon="shield" label="Community Guidelines" onClick={() => window.dispatchEvent(new CustomEvent("howdi:v8-open", { detail: { area: "settings", view: "privacy" } }))} />
          </>) : null}
        </article>
      ))}
      <V8Confirm open={Boolean(confirm)} danger title="Cancel this membership?" body={confirm ? `You’ll keep access to ${confirm.tier} until ${day(confirm.access_until)}. You won’t be charged again.` : ""} confirmLabel="Cancel membership" cancelLabel="Keep it"
        onCancel={() => setConfirm(null)} onConfirm={() => act(confirm, "cancel")} />
    </div>
  );
}

export { fmt };
