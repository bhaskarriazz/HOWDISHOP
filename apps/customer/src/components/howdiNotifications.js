// HOWDI unified Notifications Center — pure model (no React, no fetching).
// One centre over the EXISTING notification sources (no parallel system):
//   general  → GET /api/notifications/me            (customer_notifications; mark: POST /api/notifications/:id/read)
//   orders   → GET /api/communications/user/me      (user_notifications, e.g. order updates; mark-all only:
//              POST /api/notifications/read-all — no session-safe per-item route exists, so none is faked)
//   works    → GET /api/works/customer/notifications (mark: PATCH …/:id/read, PATCH …/read-all)
//   connect  → GET /api/connect/notifications        (ID-free target; mark: PATCH …/:id/read, PATCH …/read-all)
// Source ids stay internal (used only for mark-read calls); nothing here renders an id, code or route key.

export const FILTERS = [
  { key: "all", label: "All" }, { key: "connect", label: "Connect" }, { key: "shop", label: "Shop" },
  { key: "works", label: "Works" }, { key: "learn", label: "Learn & Earn" }, { key: "hpay", label: "HPay" }, { key: "system", label: "System" },
];

const clip = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
// Strip anything that looks like an internal reference before display (codes, long numbers, uuids, PINs).
export const safeText = (v, n = 160) => clip(String(v ?? "")
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
  .replace(/\b(?:HOWDI|HPAY|WRK|PAY|ORDER|ORD|REF|TXN)[-_][A-Z0-9-]*\d[A-Z0-9-]*\b/gi, "")
  .replace(/\b(?:PIN|OTP)\s*[:#]?\s*\d{4,6}\b/gi, "")
  .replace(/\b(order|booking|job|ticket|case|id|no\.?|number)\s*#?\s*\d{3,}\b/gi, "$1")
  .replace(/#\s*\d{3,}\b/g, "")
  .replace(/\b\d{5,}\b/g, "")
  .replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1"), n);

/** Category for a general (customer/user) notification from its type, reference type and action path. */
export function categorize(type, referenceType = "", actionPath = "") {
  const t = `${type} ${referenceType} ${actionPath}`.toLowerCase();
  if (/hpay|wallet|payment|refund|payout|settle/.test(t)) return "hpay";
  if (/order|shop|ship|deliver|return|cart|product|vendor|store/.test(t)) return "shop";
  if (/work|booking|worker/.test(t)) return "works";
  if (/learn|course|class|lesson|certificate|teacher|batch/.test(t)) return "learn";
  if (/message|connect|follow|comment|vibe|story|post|community|mention/.test(t)) return "connect";
  return "system";
}

/** Owning destination for a category (canonical, App-resolved). System has none: never a dead end. */
export function targetFor(category, hint = "") {
  const h = String(hint).toLowerCase();
  if (category === "shop") return { area: "shop", view: "orders" };
  if (category === "works") return { area: "works", view: "bookings" };
  if (category === "learn") return { area: "learn", view: /live|class/.test(h) ? "live" : "my-learning" };
  if (category === "hpay") return { area: "hpay", view: "home" };
  if (category === "connect") return { area: "connect", view: "messages" };
  return null;
}

const ts = (v) => { const t = Date.parse(v || ""); return Number.isFinite(t) ? t : 0; };

export function normalizeAll({ general = [], orders = [], works = [], connect = [] } = {}) {
  const out = [];
  for (const n of general) {
    if (n?.id == null) continue;
    const category = categorize(n.notification_type, n.reference_type, n.action_path);
    out.push({ key: `general:${n.id}`, source: "general", sourceId: String(n.id), category, title: safeText(n.title, 90) || "HOWDI update",
      message: safeText(n.message), unread: !n.is_read, at: n.created_at || null, target: targetFor(category, `${n.notification_type} ${n.reference_type}`), canMarkOne: true });
  }
  for (const n of orders) {
    if (n?.id == null) continue;
    const category = categorize(n.notification_type);
    out.push({ key: `orders:${n.id}`, source: "orders", sourceId: String(n.id), category, title: safeText(n.title, 90) || "Order update",
      message: safeText(n.message), unread: !n.is_read, at: n.created_at || null, target: targetFor(category, n.notification_type), canMarkOne: false });
  }
  for (const n of works) {
    if (n?.id == null) continue;
    out.push({ key: `works:${n.id}`, source: "works", sourceId: String(n.id), category: "works", title: safeText(n.title, 90) || "HOWDI Works update",
      message: safeText(n.message), unread: !n.isRead, at: n.createdAt || null, target: { area: "works", view: "bookings" }, canMarkOne: true });
  }
  for (const n of connect) {
    if (n?.id == null) continue;
    const who = n.actor_public_username ? `@${clip(n.actor_public_username, 30)}` : clip(n.actor_name, 40);
    out.push({ key: `connect:${n.id}`, source: "connect", sourceId: String(n.id), category: "connect", title: who || "Connect",
      message: safeText(n.message), unread: !n.is_read, at: n.created_at || null, target: { area: "connect", connectTarget: n.target || null, view: "messages" }, canMarkOne: true, raw: n });
  }
  return out.sort((a, b) => ts(b.at) - ts(a.at) || (a.key < b.key ? -1 : 1));
}

export const filterItems = (items, key) => (key === "all" ? items : items.filter((i) => i.category === key));
export const unreadCount = (items, key = "all") => filterItems(items, key).filter((i) => i.unread).length;
export const markLocal = (items, keys) => { const k = new Set(keys); return items.map((i) => (k.has(i.key) ? { ...i, unread: false } : i)); };
