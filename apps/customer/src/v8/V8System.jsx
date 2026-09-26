// HOWDI V8 system layer — SYS-001..005, ACC-001..003, ID-001..003, NAV-005 helpers (boards 12, 15, 30).
// Everything here is presentation + browser state only; no personal data is stored.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { V8Icon } from "./V8Shell";

/* ---------------------------------------------------------------- appearance / accessibility prefs (MY-011, ACC-002)
   Per-viewer conveniences only (theme, text size, motion, contrast, captions) → localStorage, wrapped in try/catch. */
export const V8_PREF_KEY = "howdi.v8.prefs";
export const V8_DEFAULT_PREFS = { theme: "light", textScale: 100, reducedMotion: false, highContrast: false, captions: true, language: "en" };
export function loadV8Prefs() {
  try { return { ...V8_DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem(V8_PREF_KEY) || "{}") || {}) }; } catch { return { ...V8_DEFAULT_PREFS }; }
}
export function saveV8Prefs(p) { try { localStorage.setItem(V8_PREF_KEY, JSON.stringify(p)); } catch { /* private mode: keep in memory */ } }
export function resolveTheme(pref) {
  if (pref === "dark" || pref === "light") return pref;
  try { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch { return "light"; }
}
export function applyV8Prefs(p) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolveTheme(p.theme));
  root.setAttribute("data-contrast", p.highContrast ? "high" : "normal");
  root.setAttribute("data-motion", p.reducedMotion ? "reduced" : "full");
  root.style.setProperty("--v8-text-scale", String(Math.min(1.5, Math.max(0.875, (Number(p.textScale) || 100) / 100))));
  root.setAttribute("lang", p.language || "en");
}

/* ---------------------------------------------------------------- announcer + toasts (ACC-003 status announcements) */
const V8UiContext = createContext(null);
export const useV8Ui = () => useContext(V8UiContext);

export function V8UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [politeMsg, setPoliteMsg] = useState("");
  const [assertMsg, setAssertMsg] = useState("");
  const announce = useCallback((msg, urgent = false) => {
    const set = urgent ? setAssertMsg : setPoliteMsg;
    set(""); window.setTimeout(() => set(String(msg || "")), 30);
  }, []);
  const toast = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    const item = { id, kind: "success", timeout: 4200, ...t };
    setToasts((x) => [...x.slice(-2), item]);
    announce(`${item.title}${item.message ? ". " + item.message : ""}`, item.kind === "error");
    if (item.timeout) window.setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), item.timeout);
    return id;
  }, [announce]);
  const dismiss = useCallback((id) => setToasts((x) => x.filter((y) => y.id !== id)), []);
  const value = useMemo(() => ({ toast, dismiss, announce }), [toast, dismiss, announce]);
  return (
    <V8UiContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" && createPortal(
        <>
          <div className="v8-sr" role="status" aria-live="polite" aria-atomic="true">{politeMsg}</div>
          <div className="v8-sr" role="alert" aria-live="assertive" aria-atomic="true">{assertMsg}</div>
          <div className="v8-toasts" aria-hidden="true">
            {toasts.map((t) => (
              <div key={t.id} className={`v8-toast v8-toast-${t.kind}`}>
                <span className="v8-toast-ico"><V8Icon name={t.kind === "error" ? "alert" : "check"} size={18} stroke={2.4} /></span>
                <span><b>{t.title}</b>{t.message ? <small>{t.message}</small> : null}</span>
                <button type="button" className="v8-toast-x" onClick={() => dismiss(t.id)} tabIndex={-1}><V8Icon name="x" size={16} /></button>
              </div>
            ))}
          </div>
        </>, document.body)}
    </V8UiContext.Provider>
  );
}

/* ---------------------------------------------------------------- dialog with focus trap (ACC-001, SYS-005) */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export function V8Dialog({ open, title, children, onClose, labelledBy, danger, wide, busy }) {
  const ref = useRef(null);
  const lastFocus = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const t = window.setTimeout(() => { const el = ref.current?.querySelector("[data-autofocus]") || ref.current?.querySelector(FOCUSABLE); el?.focus(); }, 0);
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) { e.preventDefault(); onClose?.(); return; }
      if (e.key !== "Tab" || !ref.current) return;
      const f = [...ref.current.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => { window.clearTimeout(t); document.removeEventListener("keydown", onKey, true); try { lastFocus.current?.focus?.(); } catch { /* element gone */ } };
  }, [open, busy]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open || typeof document === "undefined") return null;
  const id = labelledBy || "v8-dialog-title";
  return createPortal(
    <div className="v8-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose?.(); }}>
      <div ref={ref} className={`v8-dialog ${danger ? "v8-dialog-danger" : ""} ${wide ? "v8-dialog-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <button type="button" className="v8-dialog-x" onClick={onClose} aria-label="Close" disabled={busy}><V8Icon name="x" size={18} /></button>
        {title ? <h2 id={id}>{title}</h2> : null}
        {children}
      </div>
    </div>, document.body);
}

/* SYS-005 destructive confirmation — optional type-to-confirm (board 30 "Type DELETE to confirm") */
export function V8Confirm({ open, title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", danger, typeToConfirm, busy, onConfirm, onCancel, icon, children }) {
  const [typed, setTyped] = useState("");
  useEffect(() => { if (open) setTyped(""); }, [open]);
  const blocked = Boolean(typeToConfirm) && typed.trim() !== typeToConfirm;
  return (
    <V8Dialog open={open} onClose={busy ? undefined : onCancel} danger={danger} busy={busy} labelledBy="v8-confirm-title">
      <div className="v8-confirm">
        <span className={`v8-confirm-ico ${danger ? "danger" : ""}`}><V8Icon name={icon || (danger ? "alert" : "check")} size={24} /></span>
        <h2 id="v8-confirm-title">{title}</h2>
        {body ? <p>{body}</p> : null}
        {children}
        {typeToConfirm ? (
          <label className="v8-field">
            <span>Type “{typeToConfirm}” to confirm</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} aria-invalid={typed !== "" && blocked} autoComplete="off" data-autofocus />
            {typed !== "" && blocked ? <small className="v8-field-err" role="alert"><V8Icon name="alert" size={14} />Please type “{typeToConfirm}” to continue.</small> : null}
          </label>
        ) : null}
        <div className="v8-confirm-actions">
          <button type="button" className="v8-btn" onClick={onCancel} disabled={busy} data-autofocus={typeToConfirm ? undefined : true}>{cancelLabel}</button>
          <button type="button" className={`v8-btn ${danger ? "v8-btn-danger" : "v8-btn-primary"}`} onClick={onConfirm} disabled={busy || blocked} aria-busy={busy || undefined}>
            {busy ? <><span className="v8-spinner" aria-hidden="true" />Working…</> : confirmLabel}
          </button>
        </div>
      </div>
    </V8Dialog>
  );
}

/* ---------------------------------------------------------------- SYS-003 offline banner (global) */
export function V8OfflineBanner({ onRetry }) {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const [justBack, setJustBack] = useState(false);
  useEffect(() => {
    const on = () => { setOnline(true); setJustBack(true); window.setTimeout(() => setJustBack(false), 3500); };
    const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (online && !justBack) return null;
  return (
    <div className={`v8-offline ${online ? "back" : ""}`} role={online ? "status" : "alert"}>
      <V8Icon name={online ? "check" : "alert"} size={18} />
      {online ? <span><b>You’re back online.</b> Everything is up to date.</span>
        : <span><b>You’re offline.</b> You can still view what’s loaded. Drafts you write stay on this device until you reconnect.</span>}
      {!online ? <button type="button" className="v8-btn v8-btn-soft" onClick={() => { if (navigator.onLine) setOnline(true); onRetry?.(); }}>Retry</button> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- AUTH-010 / SYS session expired */
export function V8SessionExpired({ open, onSignIn, onCancel }) {
  return (
    <V8Confirm open={open} icon="shield" title="Your session has expired"
      body="Please sign in again to continue. Anything you were writing stays on this page, and you’ll come back here after signing in."
      confirmLabel="Sign in" cancelLabel="Not now" onConfirm={onSignIn} onCancel={onCancel} />
  );
}

/* ---------------------------------------------------------------- ID-001..003 identity badges (board 12) */
export function V8Badges({ verified, premium, size = "md" }) {
  if (!verified && !premium) return null;
  return (
    <span className={`v8-badges v8-badges-${size}`}>
      {verified ? <span className="v8-badge-verified" title="Verified: identity confirmed by HOWDI"><V8Icon name="check" size={size === "sm" ? 12 : 14} stroke={3} />Verified</span> : null}
      {premium ? <span className="v8-badge-premium" title="Premium: subscriber-supported creator"><V8Icon name="crown" size={size === "sm" ? 12 : 14} fill />Premium</span> : null}
    </span>
  );
}
export function V8BadgeExplainer() {
  return (
    <section className="v8-card v8-badge-explainer" aria-labelledby="v8-badge-about">
      <h2 id="v8-badge-about">About these badges</h2>
      <div className="v8-badge-row">
        <span className="v8-badge-dot v"><V8Icon name="check" size={16} stroke={3} /></span>
        <div><b>Verified</b><p>Identity confirmed by HOWDI. It shows the person is real and notable. It never reveals any private ID.</p></div>
      </div>
      <div className="v8-badge-row">
        <span className="v8-badge-dot p"><V8Icon name="crown" size={16} fill /></span>
        <div><b>Premium</b><p>A subscriber-supported creator who offers exclusive content, perks and direct support. Separate from Verified.</p></div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- SYS-004 duplicate-safe async action */
export function useSingleFlight() {
  const [busy, setBusy] = useState(false);
  const inflight = useRef(false);
  const run = useCallback(async (fn) => {
    if (inflight.current) return undefined;
    inflight.current = true; setBusy(true);
    try { return await fn(); } finally { inflight.current = false; setBusy(false); }
  }, []);
  return [busy, run];
}
