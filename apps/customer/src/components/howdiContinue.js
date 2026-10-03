// HOWDI "Continue where you left off" — pure model (no React, no fetching).
// Built only from data the customer app ALREADY loads through existing APIs:
//   Shop orders   → GET /api/orders/me            (loadCustomerOrders)
//   Works         → GET /api/works/customer/bookings (loadCustomerWorksBookings)
//   Learn & Earn  → GET /api/learning/me/home      (loadLearnerHome → next_step)
// Move/rides has no module on this branch, so no ride item is ever produced (nothing is invented).
// Identity rule: items carry NO ids, codes or references — only plain titles and statuses. Opening an
// item is done by the App with the original object it already holds, never by an id shown here.

const ORDER_DONE = new Set(["delivered", "cancelled", "canceled", "refunded", "returned", "failed", "completed", "closed", "rejected"]);
const ORDER_MOVING = new Set(["shipped", "in_transit", "out_for_delivery", "dispatched"]);
const WORKS_ACTIVE = new Set(["accepted", "en_route", "arrived", "in_progress"]);
const WORKS_WAITING = new Set(["offered", "open", "assigned"]);

const clip = (value, max = 60) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Lower number = shown first. 1 needs you now · 2 happening now · 3 waiting on someone · 4 continue · 5 later */
export function buildContinueItems({ orders = [], worksBookings = [], learnerHome = null, orderLabel = (s) => clip(s, 30) } = {}) {
  const items = [];

  worksBookings.forEach((booking, index) => {
    const stage = String(booking?.stage || booking?.status || "").toLowerCase();
    const title = clip(booking?.title || booking?.serviceName || booking?.service_name || booking?.category || "Works booking");
    let entry = null;
    if (stage === "arrived") entry = { priority: 1, status: "Your worker has arrived", action: "Open booking" };
    else if (stage === "completed") entry = { priority: 1, status: "Check the finished job", action: "Review" };
    else if (WORKS_ACTIVE.has(stage)) entry = { priority: 2, status: stage === "in_progress" ? "Job in progress" : stage === "en_route" ? "Worker on the way" : "Worker accepted", action: "Track" };
    else if (WORKS_WAITING.has(stage)) entry = { priority: 3, status: "Waiting for a worker", action: "View" };
    if (entry) items.push({ key: `works:${index}`, kind: "works", source: booking, title, ...entry });
  });

  orders.forEach((order, index) => {
    const status = String(order?.status || "").toLowerCase();
    if (!status || ORDER_DONE.has(status)) return;
    const moving = ORDER_MOVING.has(status);
    items.push({
      key: `order:${index}`, kind: "order", source: order,
      title: clip(order?.title || "Shop order"),
      status: moving ? "On its way" : clip(orderLabel(order?.status), 40) || "Order in progress",
      action: "Track order", priority: moving ? 2 : 4,
    });
  });

  const next = learnerHome?.next_step;
  if (next && next.action) {
    const action = String(next.action).toUpperCase();
    const priority = action === "LIVE" ? 2 : action === "MY_LEARNING" ? 4 : 5;
    items.push({
      key: "learn:next", kind: "learn", source: null,
      title: clip(next.title || "Continue learning"),
      status: clip(next.description || "", 80),
      action: action === "LIVE" ? "Open class" : "Continue", priority,
    });
  }

  // Deterministic: priority, then the order the owning API already returned.
  return items
    .map((item, position) => ({ item, position }))
    .sort((a, b) => a.item.priority - b.item.priority || a.position - b.position)
    .map(({ item }) => item);
}
