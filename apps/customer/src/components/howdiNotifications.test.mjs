import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAll, filterItems, unreadCount, markLocal, categorize, targetFor, safeText, FILTERS } from "./howdiNotifications.js";

const general = [
  { id: 101, notification_type: "PAYMENT", title: "Refund processed", message: "Refund REF-883421 for order 4182 is complete.", is_read: false, created_at: "2026-10-03T09:00:00Z", reference_type: "refund" },
  { id: 102, notification_type: "LEARN", title: "Live class reminder", message: "Crochet basics starts at 6 pm", is_read: false, created_at: "2026-10-03T08:00:00Z", reference_type: "live_class" },
  { id: 103, notification_type: "SYSTEM", title: "Welcome to HOWDI", message: "Your account is ready", is_read: true, created_at: "2026-10-01T08:00:00Z" },
];
const orders = [{ id: 7, notification_type: "orders", title: "Order shipped", message: "Your crochet tote is on its way", is_read: false, created_at: "2026-10-03T07:00:00Z" }];
const works = [{ id: "55", type: "worker_accepted", title: "Worker accepted your booking", message: "Suresh accepted HOWDI-WORK-991. PIN 7319", workCode: "HOWDI-WORK-991", isRead: false, createdAt: "2026-10-03T10:00:00Z" }];
const connect = [{ id: "9", notification_type: "MESSAGE", message: "sent you a message", is_read: false, created_at: "2026-10-03T06:00:00Z", actor_public_username: "ravi_auto", target: { kind: "PROFILE", username: "ravi_auto" } }];

test("seven root-map filters", () => assert.deepEqual(FILTERS.map((f) => f.label), ["All", "Connect", "Shop", "Works", "Learn & Earn", "HPay", "System"]));

test("all four existing sources are unified, newest first, categorised", () => {
  const items = normalizeAll({ general, orders, works, connect });
  assert.deepEqual(items.map((i) => [i.source, i.category]), [["works", "works"], ["general", "hpay"], ["general", "learn"], ["orders", "shop"], ["connect", "connect"], ["general", "system"]]);
});

test("every non-system item deep-links to its owning destination; system never loops to Notifications", () => {
  const items = normalizeAll({ general, orders, works, connect });
  const by = Object.fromEntries(items.map((i) => [i.title, i.target]));
  assert.deepEqual(by["Worker accepted your booking"], { area: "works", view: "bookings" });
  assert.deepEqual(by["Order shipped"], { area: "shop", view: "orders" });
  assert.deepEqual(by["Live class reminder"], { area: "learn", view: "live" });
  assert.deepEqual(by["Refund processed"], { area: "hpay", view: "home" });
  assert.equal(by["@ravi_auto"].area, "connect"); assert.deepEqual(by["@ravi_auto"].connectTarget, { kind: "PROFILE", username: "ravi_auto" });
  assert.equal(by["Welcome to HOWDI"], null);
  for (const i of items) if (i.target) assert.notEqual(i.target.area, "notifications");
});

test("display text never shows codes, PINs, payment refs or numeric ids", () => {
  const items = normalizeAll({ general, orders, works, connect });
  const shown = JSON.stringify(items.map(({ title, message }) => ({ title, message })));
  for (const leak of ["REF-883421", "4182", "HOWDI-WORK-991", "7319", "PIN"]) assert.equal(shown.includes(leak), false, leak);
  assert.equal(safeText("Paid HPAY-WRK-00000042 and TXN_99887"), "Paid and");
});

test("filters and unread counts", () => {
  const items = normalizeAll({ general, orders, works, connect });
  assert.equal(unreadCount(items), 5);
  assert.equal(filterItems(items, "shop").length, 1); assert.equal(unreadCount(items, "system"), 0);
  const after = markLocal(items, ["works:55"]);
  assert.equal(unreadCount(after), 4); assert.equal(unreadCount(after, "works"), 0);
});

test("only sources with a real per-item read route allow mark-one", () => {
  const items = normalizeAll({ general, orders, works, connect });
  assert.deepEqual([...new Set(items.filter((i) => !i.canMarkOne).map((i) => i.source))], ["orders"]);
});

test("categorize/targetFor basics", () => {
  assert.equal(categorize("ORDER_SHIPPED"), "shop"); assert.equal(categorize("WALLET_CREDIT"), "hpay");
  assert.equal(categorize("COURSE_COMPLETED"), "learn"); assert.equal(categorize("SECURITY_ALERT"), "system");
  assert.equal(targetFor("system"), null);
});
