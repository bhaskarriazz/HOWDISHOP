// HOWDI V8 Notifications flyout — board 15 "Desktop — Notifications flyout" + "Mobile 3 — Notifications (390px)".
// Reads the unified V8 inbox (/api/v8/notifications): community requests & decisions, moderation outcomes, comments,
// and (as their slices land) payments, bookings and role verification decisions. Mark all as read; tap opens the route.
import { useCallback, useEffect, useRef, useState } from "react";
import { V8Icon, V8State } from "./V8Shell";

const KIND_ICON = { COMMUNITY_REQUEST: "users", COMMUNITY_APPROVED: "check", COMMUNITY_DECLINED: "x", COMMUNITY_ROLE: "shield", COMMUNITY_REMOVED: "ban", COMMUNITY_MUTED: "mute", COMMUNITY_WARNING: "alert", COMMUNITY_REPORT: "flag", REPORT_UPDATE: "shield", ARTICLE_COMMENT: "comment" };
const since = (iso) => { const t = Date.parse(iso || ""); if (!Number.isFinite(t)) return ""; const m = Math.round((Date.now() - t) / 60000); if (m < 1) return "Just now"; if (m < 60) return `${m}m ago`; const h = Math.round(m / 60); if (h < 24) return `${h}h ago`; return `${Math.round(h / 24)}d ago`; };

export function useV8Unread(apiBase, getAuthHeaders, signedIn) {
  const [n, setN] = useState(0);
  const hdr = useRef(getAuthHeaders); hdr.current = getAuthHeaders;
  const load = useCallback(async () => {
    if (!signedIn) { setN(0); return; }
    try { const r = await fetch(`${String(apiBase || "").replace(/\/+$/, "")}/api/v8/notifications`, { headers: { Accept: "application/json", ...(hdr.current ? hdr.current() : {}) }, cache: "no-store" }); const j = await r.json(); if (r.ok) setN(Number(j.unread) || 0); } catch { /* offline */ }
  }, [apiBase, signedIn]);
  useEffect(() => { load(); if (!signedIn) return undefined; const id = window.setInterval(load, 60000); const on = () => load(); window.addEventListener("howdi:v8-notifications", on); return () => { window.clearInterval(id); window.removeEventListener("howdi:v8-notifications", on); }; }, [load, signedIn]);
  return [n, load];
}

export default function V8Notifications({ open, apiBase, getAuthHeaders, onClose, onRoute, legacyCount = 0, onOpenLegacy }) {
  const [d, setD] = useState({ status: "loading", items: [] });
  const hdr = useRef(getAuthHeaders); hdr.current = getAuthHeaders;
  const base = String(apiBase || "").replace(/\/+$/, "");
  const call = useCallback(async (method, path, body) => {
    const r = await fetch(`${base}${path}`, { method, headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(hdr.current ? hdr.current() : {}) }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    return { ok: r.ok, json: await r.json().catch(() => ({})) };
  }, [base]);
  const load = useCallback(async () => {
    setD((x) => ({ ...x, status: "loading" }));
    try { const r = await call("GET", "/api/v8/notifications"); setD(r.ok ? { status: "ready", items: r.json.items || [], unread: r.json.unread || 0 } : { status: "error", items: [] }); } catch { setD({ status: "error", items: [] }); }
  }, [call]);
  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => { if (!open) return undefined; const k = (e) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open, onClose]);
  if (!open) return null;
  const markAll = async () => { await call("POST", "/api/v8/notifications/read").catch(() => {}); setD((x) => ({ ...x, unread: 0, items: x.items.map((i) => ({ ...i, read: true })) })); window.dispatchEvent(new Event("howdi:v8-notifications")); };
  return (
    <>
      <div className="v8n-scrim" onClick={onClose} aria-hidden="true" />
      <section className="v8n" role="dialog" aria-modal="true" aria-label="Notifications">
        <header className="v8n-head">
          <button type="button" className="v8-icon-btn v8n-back" aria-label="Close notifications" onClick={onClose}><V8Icon name="back" size={22} /></button>
          <h2>Notifications</h2>
          <button type="button" className="v8-link" onClick={markAll} disabled={!d.unread}>Mark all as read</button>
        </header>
        <div className="v8n-list">
          {d.status === "loading" ? [0, 1, 2].map((i) => <div key={i} className="v8n-item"><div className="v8-skel" style={{ width: 44, height: 44, borderRadius: 12 }} /><div style={{ flex: 1, display: "grid", gap: 6 }}><div className="v8-skel" style={{ height: 12, width: "70%" }} /><div className="v8-skel" style={{ height: 10, width: "40%" }} /></div></div>) : null}
          {d.status === "error" ? <V8State kind="error" title="Notifications didn’t load" actionLabel="Try again" onAction={load} /> : null}
          {d.status === "ready" && !d.items.length ? <V8State icon="bell" title="You’re all caught up" message="Replies, requests and decisions will appear here." /> : null}
          {d.items.map((n, i) => (
            <button key={i} type="button" className={`v8n-item ${n.read ? "" : "unread"}`} onClick={() => { if (!n.read && n.key) { call("POST", "/api/v8/notifications/read", { key: n.key }).then(() => window.dispatchEvent(new Event("howdi:v8-notifications"))).catch(() => {}); setD((x) => ({ ...x, unread: Math.max(0, (x.unread || 0) - 1), items: x.items.map((i) => (i === n ? { ...i, read: true } : i)) })); } if (n.route) { onRoute(n.route); onClose(); } }}>
              <span className="v8n-ico"><V8Icon name={KIND_ICON[n.kind] || "bell"} size={20} /></span>
              <span className="v8n-text"><b>{n.title}</b><small>{since(n.created_at)}</small>{n.body ? <span>{n.body}</span> : null}</span>
              {!n.read ? <i className="v8n-dot" aria-label="Unread" /> : n.route ? <V8Icon name="chevr" size={18} /> : null}
            </button>
          ))}
        </div>
        {legacyCount || onOpenLegacy ? <footer className="v8n-foot"><button type="button" className="v8-btn v8-btn-soft v8-btn-block" onClick={() => { onClose(); onOpenLegacy?.(); }}>Order &amp; booking updates{legacyCount ? ` (${legacyCount})` : ""}</button></footer> : null}
      </section>
    </>
  );
}
