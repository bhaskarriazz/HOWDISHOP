// HOWDI V8 Connect — shared helpers (API client, avatars, time, counts, sheets, report flow).
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon } from "../V8Shell";
import { V8Badges, V8Dialog, useV8Ui } from "../V8System";

export const safeImg = (u) => (typeof u === "string" && /^(https?:\/\/|\/(?!\/)|data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,)/i.test(u) ? u : "");
export const safeVideo = (u) => (typeof u === "string" && /^(https?:\/\/|\/(?!\/)|data:video\/(mp4|webm);base64,)/i.test(u) ? u : "");
export const initial = (s) => String(s || "H").replace(/^@/, "").trim().charAt(0).toUpperCase() || "H";
export const fmt = (n) => { const v = Number(n || 0); if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`; if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}K`; return String(v); };
export const since = (iso) => {
  const t = Date.parse(iso || ""); if (!Number.isFinite(t)) return "";
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return "Just now"; if (m < 60) return `${m}m ago`; const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24); return d < 30 ? `${d}d ago` : new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
export const when = (iso) => {
  const t = Date.parse(iso || ""); if (!Number.isFinite(t)) return "";
  const d = new Date(t); const today = new Date(); const tm = new Date(Date.now() + 86400000);
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Today · ${time}`;
  if (d.toDateString() === tm.toDateString()) return `Tomorrow · ${time}`;
  return `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
};

// One small API client: session headers, JSON, status-aware results. Never throws.
export function useApi(apiBase, getAuthHeaders) {
  const base = String(apiBase || "").replace(/\/+$/, "");
  // getAuthHeaders is re-created on every App render: keep it in a ref so `api` is stable and effects don't loop.
  const hdr = useRef(getAuthHeaders); hdr.current = getAuthHeaders;
  return useCallback(async (method, path, body, { signal } = {}) => {
    let headers = { Accept: "application/json" };
    try { headers = { ...headers, ...(hdr.current ? hdr.current() : {}) }; } catch { /* guest */ }
    if (body !== undefined) headers["Content-Type"] = "application/json";
    try {
      const r = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal });
      let json = null; try { json = await r.json(); } catch { json = null; }
      if (signal && signal.aborted) return { ok: false, status: 0, aborted: true, json: {} };
      if (!json || typeof json !== "object") return { ok: false, status: r.status, json: { message: "Unexpected response. Please try again." } };
      return { ok: r.ok && json.status !== "error", status: r.status, json };
    } catch (e) {
      if ((e && e.name === "AbortError") || (signal && signal.aborted)) return { ok: false, status: 0, aborted: true, json: {} };
      return { ok: false, status: 0, json: { message: typeof navigator !== "undefined" && navigator.onLine === false ? "You’re offline. Check your connection." : "Couldn’t reach HOWDI. Please try again." } };
    }
  }, [base]);
}

export function Ava({ src, name, size = 40, ring }) {
  const img = safeImg(src);
  return (
    <span className={`v8c-ava ${ring ? `ring-${ring}` : ""}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>
      {img ? <img src={img} alt="" loading="lazy" /> : initial(name)}
    </span>
  );
}

export function Who({ author, sub, size = 40, onOpen }) {
  if (!author) return null;
  return (
    <span className="v8c-who">
      <button type="button" className="v8c-who-ava" onClick={() => onOpen?.(author.public_username)} aria-label={`Open @${author.public_username}`}><Ava src={author.avatar_url} name={author.display_name} size={size} /></button>
      <span className="v8c-who-text">
        <span className="v8c-who-line">
          <button type="button" className="v8c-handle" onClick={() => onOpen?.(author.public_username)}>@{author.public_username}</button>
          <V8Badges verified={author.verified} premium={author.premium} size="sm" />
        </span>
        {sub ? <small>{sub}</small> : null}
      </span>
    </span>
  );
}

export function Tabs({ tabs, value, onChange, label, compact }) {
  return (
    <div className={`v8c-tabs ${compact ? "compact" : ""}`} role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} className={value === t.value ? "on" : ""} onClick={() => onChange(t.value)}>
          {t.label}{t.count ? <span className="v8c-tab-count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

// Bottom sheet on phones, centred dialog on desktop (V8Dialog handles focus trap + Esc).
export function Sheet({ open, title, onClose, children, wide }) {
  return <V8Dialog open={open} title={title} onClose={onClose} wide={wide}><div className="v8c-sheet">{children}</div></V8Dialog>;
}

export function Row({ icon, label, sub, onClick, danger, right }) {
  return (
    <button type="button" className={`v8c-row ${danger ? "danger" : ""}`} onClick={onClick}>
      {icon ? <span className="v8c-row-ico"><V8Icon name={icon} size={20} /></span> : null}
      <span className="v8c-row-text"><b>{label}</b>{sub ? <small>{sub}</small> : null}</span>
      {right !== undefined ? right : <V8Icon name="chevr" size={18} />}
    </button>
  );
}

export const REPORT_REASONS = [
  ["spam", "Spam or misleading"], ["harassment", "Bullying or harassment"], ["hate", "Hate speech"], ["violence", "Violence or dangerous acts"],
  ["nudity", "Nudity or sexual content"], ["scam", "Scam or fraud"], ["misinformation", "False information"], ["copyright", "Copyright or rights issue"],
  ["self-harm", "Self-harm or suicide"], ["other", "Something else"],
];

// Report flow: reason → details → sent. `onSubmit(reason, details)` returns an api result.
export function ReportSheet({ open, what = "content", onClose, onSubmit }) {
  const [reason, setReason] = useState(""); const [details, setDetails] = useState(""); const [state, setState] = useState("pick"); const [msg, setMsg] = useState("");
  useEffect(() => { if (open) { setReason(""); setDetails(""); setState("pick"); setMsg(""); } }, [open]);
  const send = async () => {
    setState("sending");
    const r = await onSubmit(reason, details);
    if (r.ok) { setState("done"); setMsg(r.json.message || "Thanks — our safety team will review this."); }
    else { setState("pick"); setMsg(r.json.message || "Couldn’t send the report. Please try again."); }
  };
  return (
    <Sheet open={open} title={state === "done" ? "Report sent" : `Report ${what}`} onClose={onClose}>
      {state === "done" ? (
        <div className="v8c-done"><span className="v8c-done-ico"><V8Icon name="shield" size={26} /></span><p>{msg}</p>
          <p className="v8c-muted">If someone is in immediate danger, contact local emergency services.</p>
          <button type="button" className="v8-btn v8-btn-primary v8-btn-block" onClick={onClose}>Done</button></div>
      ) : (
        <>
          <p className="v8c-muted">Your report is private. Choose the closest reason.</p>
          <div className="v8c-reasons" role="radiogroup" aria-label="Reason">
            {REPORT_REASONS.map(([v, l]) => (
              <label key={v} className={`v8c-reason ${reason === v ? "on" : ""}`}><input type="radio" name="v8c-reason" value={v} checked={reason === v} onChange={() => setReason(v)} /><span>{l}</span></label>
            ))}
          </div>
          <label className="v8c-field"><span>Add details (optional)</span><textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What happened?" /></label>
          {msg ? <p className="v8c-err" role="alert">{msg}</p> : null}
          <button type="button" className="v8-btn v8-btn-primary v8-btn-block" disabled={!reason || state === "sending"} onClick={send}>{state === "sending" ? "Sending…" : "Submit report"}</button>
        </>
      )}
    </Sheet>
  );
}

export function ShareSheet({ open, title, link, onClose, onShared }) {
  const ui = useV8Ui();
  const abs = typeof window !== "undefined" ? `${window.location.origin}${link || ""}` : link;
  const copy = async () => {
    try { await navigator.clipboard.writeText(abs); } catch { /* clipboard blocked: still show the link */ }
    onShared?.("copy"); ui?.toast({ title: "Link copied", message: abs }); onClose();
  };
  const native = async () => {
    try { await navigator.share({ title: title || "HOWDI", url: abs }); onShared?.("external"); onClose(); } catch { /* cancelled */ }
  };
  return (
    <Sheet open={open} title="Share" onClose={onClose}>
      <div className="v8c-share-link"><V8Icon name="link" size={18} /><span>{abs}</span></div>
      <div className="v8c-share-grid">
        <button type="button" onClick={copy}><span><V8Icon name="link" size={22} /></span>Copy link</button>
        <button type="button" onClick={() => { onShared?.("messages"); onClose(); ui?.toast({ title: "Choose a chat to send it to", message: "Opening Messages" }); window.dispatchEvent(new CustomEvent("howdi:v8-open", { detail: { area: "connect", view: "messages" } })); }}><span><V8Icon name="send" size={22} /></span>Messages</button>
        {typeof navigator !== "undefined" && navigator.share ? <button type="button" onClick={native}><span><V8Icon name="share" size={22} /></span>More apps</button> : null}
      </div>
    </Sheet>
  );
}

export function useInView(ref, { threshold = 0.6 } = {}) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting && e.intersectionRatio >= threshold), { threshold: [0, threshold, 1] });
    io.observe(el); return () => io.disconnect();
  }, [ref, threshold]);
  return on;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result || "")); fr.onerror = () => reject(new Error("read")); fr.readAsDataURL(file); });
}

export function useLatest(value) { const r = useRef(value); r.current = value; return r; }

export function Skel({ h = 14, w = "100%", r = 10, style }) { return <div className="v8-skel" style={{ height: h, width: w, borderRadius: r, ...style }} />; }

export function SignInCard({ title = "Sign in to continue", message, onSignIn }) {
  return (
    <div className="v8-state" role="status">
      <span className="v8-state-icon"><V8Icon name="lock" size={24} /></span>
      <b>{title}</b>{message ? <p>{message}</p> : null}
      <button type="button" className="v8-btn v8-btn-primary" onClick={onSignIn}>Sign in</button>
    </div>
  );
}
