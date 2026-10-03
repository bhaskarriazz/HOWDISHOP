// HOWDI unified Notifications Center (Batch 2) — browser regression on the built customer app.
//   npm run build && PLAYWRIGHT=/path/to/playwright/index.mjs node apps/customer/tests/howdi-notifications.browser.mjs
// Mocks ONLY the existing notification sources (+ session/profile). Each mock keeps read state so mark-read
// requests change what the next load returns. Mocks plant codes/PINs/refs/ids that must never be displayed.
import { fileURLToPath } from "node:url";
import { preview } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
const SHOTS = process.env.SHELL_SHOTS || "";
const server = await preview({ root: fileURLToPath(new URL("..", import.meta.url)), preview: { host: "127.0.0.1", port: 0 } });
const BASE = server.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const results = []; const ok = (w, n, c, x = "") => results.push(`${c ? "PASS" : "FAIL"}  [${w}] ${n}${x ? `  — ${x}` : ""}`);
const USER = { full_name: "Lakshmi Devi", public_username: "lakshmi" };
const TRAPS = /REF-883421|4182|HOWDI-WORK-991|7319|HPAY-WRK|reference_id/;
const mins = (m) => new Date(Date.now() - m * 60000).toISOString();

function seed() {
  return {
    general: [
      { id: 101, notification_type: "PAYMENT", reference_type: "refund", title: "Refund processed", message: "Refund REF-883421 for order 4182 is complete.", is_read: false, created_at: mins(20) },
      { id: 102, notification_type: "LEARN", reference_type: "live_class", title: "Live class reminder", message: "Crochet basics starts at 6 pm", is_read: false, created_at: mins(40) },
      { id: 103, notification_type: "SYSTEM", title: "Welcome to HOWDI", message: "Your account is ready", is_read: false, created_at: mins(3000) },
    ],
    orders: [{ id: 7, notification_type: "orders", icon: "📦", title: "Order shipped", message: "Your crochet tote is on its way", is_read: false, created_at: mins(60) }],
    works: [{ id: "55", type: "worker_accepted", icon: "🛠️", title: "Worker accepted your booking", message: "Suresh accepted HOWDI-WORK-991. PIN 7319", workCode: "HOWDI-WORK-991", isRead: false, createdAt: mins(5) }],
    connect: [{ id: "9", notification_type: "MESSAGE", message: "sent you a message", is_read: false, created_at: mins(90), actor_public_username: "ravi_auto", actor_name: "Ravi", target: null }],
  };
}
async function open(width) {
  const db = seed(); const writes = [];
  const ctx = await browser.newContext({ viewport: { width, height: 900 } }); const page = await ctx.newPage(); const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.addInitScript((u) => { if (!sessionStorage.getItem("s")) { localStorage.setItem("howdiUser", JSON.stringify(u)); localStorage.setItem("howdiSessionToken", "t"); sessionStorage.setItem("s", "1"); } }, USER);
  await page.route(/fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
  await page.route(/^http:\/\/localhost:5000\//, (route) => {
    const req = route.request(); const p = new URL(req.url()).pathname; const m = req.method();
    const json = (b, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(b) });
    if (m !== "GET") writes.push(`${m} ${p}`);
    let x;
    if (p === "/api/profile/me") return json({ status: "success", user: USER, profile: USER });
    if (p === "/api/notifications/me") return json({ status: "success", notifications: db.general, unread_count: db.general.filter((n) => !n.is_read).length });
    if ((x = p.match(/^\/api\/notifications\/(\d+)\/read$/)) && m === "POST") { const n = db.general.find((g) => String(g.id) === x[1]); if (n) n.is_read = true; return json({ status: "success" }); }
    if (p === "/api/notifications/read-all" && m === "POST") { db.orders.forEach((n) => { n.is_read = true; }); return json({ status: "success" }); }
    if (p === "/api/communications/user/me") return json({ status: "success", messages: [], notifications: db.orders });
    if (p === "/api/works/customer/notifications") return json({ status: "success", notifications: db.works, unreadCount: db.works.filter((n) => !n.isRead).length });
    if ((x = p.match(/^\/api\/works\/customer\/notifications\/(\d+)\/read$/))) { const n = db.works.find((w) => w.id === x[1]); if (n) n.isRead = true; return json({ status: "success" }); }
    if (p === "/api/works/customer/notifications/read-all") { db.works.forEach((n) => { n.isRead = true; }); return json({ status: "success" }); }
    if (p.startsWith("/api/connect/notifications")) {
      if (p.endsWith("/read-all")) { db.connect.forEach((n) => { n.is_read = true; }); return json({ status: "success", unread_count: 0 }); }
      if ((x = p.match(/\/(\d+)\/read$/))) { const n = db.connect.find((c) => c.id === x[1]); if (n) n.is_read = true; return json({ status: "success" }); }
      return json({ status: "success", notifications: db.connect, unread_count: db.connect.filter((n) => !n.is_read).length });
    }
    if (p === "/api/orders/me") return json({ status: "success", orders: [] });
    if (p === "/api/works/customer/bookings") return json({ bookings: [] });
    if (p === "/api/works/customer/history") return json({ history: [] });
    return json({ status: "error", message: "not mocked" }, 404);
  });
  await page.goto(`${BASE}/`); await page.locator(".howdi-dock-v2").waitFor({ timeout: 20000 });
  return { ctx, page, errs, writes, db };
}
const bell = (page) => page.locator("[data-howdi-bell]");
const badge = async (page) => Number((await bell(page).locator("em").textContent({ timeout: 1500 }).catch(() => "0")) || 0);
const activeKey = (page) => page.locator(".howdi-dock-v2 .is-active").getAttribute("data-destination", { timeout: 1500 }).catch(() => null);
const openCentre = async (page) => { await bell(page).click(); await page.locator("[data-howdi-notifications]").waitFor(); await page.waitForTimeout(500); };
const item = (page, title) => page.locator("[data-howdi-notifications] .howdi-nc-item", { hasText: title }).locator(".howdi-nc-open");

for (const width of (process.env.WIDTHS || "390,768,1440").split(",").map(Number)) {
  let { ctx, page, errs, writes } = await open(width);
  await page.waitForTimeout(1200);
  ok(width, "bell badge counts unread across all four existing sources", (await badge(page)) === 6, String(await badge(page)));
  await openCentre(page);
  const filters = await page.locator("[data-howdi-notifications] [data-filter]").allTextContents();
  ok(width, "bell opens the centre with the 7 root-map filters", ["All", "Connect", "Shop", "Works", "Learn & Earn", "HPay", "System"].every((f, i) => filters[i].startsWith(f)), filters.join("|"));
  ok(width, "newest first across sources", (await page.locator("[data-howdi-notifications] .howdi-nc-item").first().getAttribute("data-category")) === "works");
  ok(width, "no ids, codes, PINs or payment refs shown", !TRAPS.test(await page.locator("[data-howdi-notifications]").innerText()));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/notifications-${width}.png` });
  for (const [f, n] of [["shop", 1], ["works", 1], ["learn", 1], ["hpay", 1], ["connect", 1], ["system", 1]]) {
    await page.locator(`[data-filter="${f}"]`).click();
    ok(width, `filter ${f} shows only its items`, (await page.locator("[data-howdi-notifications] .howdi-nc-item").count()) === n && (await page.locator(`[data-howdi-notifications] .howdi-nc-item:not([data-category="${f}"])`).count()) === 0);
  }
  await page.locator('[data-filter="all"]').click();
  // deep links
  await item(page, "Worker accepted").click(); await page.waitForTimeout(600);
  ok(width, "worker accepted → Works (panel closed, marked read)", (await activeKey(page)) === "work" && (await page.locator("[data-howdi-notifications]").count()) === 0 && writes.includes("PATCH /api/works/customer/notifications/55/read"));
  ok(width, "unread badge drops after opening", (await badge(page)) === 5, String(await badge(page)));
  await openCentre(page); await item(page, "Live class reminder").click(); await page.waitForTimeout(600);
  ok(width, "live class reminder → Learn", (await activeKey(page)) === "learn" && writes.includes("POST /api/notifications/102/read"));
  await openCentre(page); await item(page, "Refund processed").click(); await page.waitForTimeout(600);
  ok(width, "refund update → HPay", (await page.locator(".howdi-global-hpay.active").count()) === 1);
  await openCentre(page); await item(page, "@ravi_auto").click(); await page.waitForTimeout(600);
  ok(width, "new message → Connect Messages", (await activeKey(page)) === "connect" && writes.includes("PATCH /api/connect/notifications/9/read"));
  await openCentre(page); await item(page, "Order shipped").click(); await page.waitForTimeout(800);
  ok(width, "order shipped → My Orders", await page.evaluate(() => document.body.innerText.includes("Your orders, all in one place")));
  await openCentre(page); await item(page, "Welcome to HOWDI").click(); await page.waitForTimeout(500);
  ok(width, "system notice: read in place, never a dead-end loop", (await page.locator("[data-howdi-notifications]").count()) === 1 && writes.includes("POST /api/notifications/103/read"));
  ok(width, "no ‘View all notifications’ loop link remains", (await page.getByText("View all notifications").count()) === 0);
  // mark all read: order notice is still unread (no session-safe per-item route exists)
  ok(width, "order notice stays unread until Mark all (no fake per-item persistence)", (await badge(page)) === 1, String(await badge(page)));
  await page.locator(".howdi-nc-markall").click(); await page.waitForTimeout(900);
  ok(width, "Mark all read clears the badge and uses only session routes", (await badge(page)) === 0 && writes.includes("POST /api/notifications/read-all") && !writes.some((w) => /\/api\/notifications\/\d+\/read-all/.test(w)));
  ok(width, "no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  await ctx.close();

  // mark one (✓) without navigating
  ({ ctx, page, writes } = await open(width)); await page.waitForTimeout(1200); await openCentre(page);
  const before = await badge(page);
  await page.locator('[data-howdi-notifications] .howdi-nc-item[data-category="hpay"] .howdi-nc-read').click(); await page.waitForTimeout(500);
  ok(width, "mark one read (✓) keeps the centre open and lowers the count", (await page.locator("[data-howdi-notifications]").count()) === 1 && (await badge(page)) === before - 1 && writes.includes("POST /api/notifications/101/read"));
  ok(width, "orders notice has no ✓ (no per-item route)", (await page.locator('[data-howdi-notifications] .howdi-nc-item[data-key^="orders:"] .howdi-nc-read').count()) === 0);
  await ctx.close();
}
await browser.close(); await server.close();
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(results.join("\n")); console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
