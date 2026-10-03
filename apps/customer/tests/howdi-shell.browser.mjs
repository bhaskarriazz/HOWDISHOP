// HOWDI dock v2 + shell (Batch 1) — browser regression against the built customer app.
//   npm run build && PLAYWRIGHT=/path/to/playwright/index.mjs node apps/customer/tests/howdi-shell.browser.mjs
// Mocks only the existing APIs the shell reads: /api/profile/me, /api/orders/me, /api/works/customer/bookings,
// /api/works/customer/history, /api/learning/me/home. Mocks include raw ids, codes and PINs that must never show.
import { fileURLToPath } from "node:url";
import { preview } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
const SHOTS = process.env.SHELL_SHOTS || "";
const server = await preview({ root: fileURLToPath(new URL("..", import.meta.url)), preview: { host: "127.0.0.1", port: 0 } });
const BASE = server.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const results = []; const ok = (w, n, c, x = "") => results.push(`${c ? "PASS" : "FAIL"}  [${w}] ${n}${x ? `  — ${x}` : ""}`);
const USER = { full_name: "Lakshmi Devi", public_username: "lakshmi" };
const TRAPS = /4182|HOWDI-WORK-991|7319|9848012345|reference_id|\b812\b/;

async function open(width, { signedIn = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } }); const page = await ctx.newPage(); const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  if (signedIn) await page.addInitScript((u) => { if (!sessionStorage.getItem("s")) { localStorage.setItem("howdiUser", JSON.stringify(u)); localStorage.setItem("howdiSessionToken", "t"); sessionStorage.setItem("s", "1"); } }, USER);
  await page.route(/fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
  await page.route(/^http:\/\/localhost:5000\//, (route) => {
    const p = new URL(route.request().url()).pathname;
    const json = (b, s = 200) => route.fulfill({ status: s, contentType: "application/json", body: JSON.stringify(b) });
    if (p === "/api/profile/me") return signedIn ? json({ status: "success", user: USER, profile: USER }) : json({ status: "error" }, 401);
    if (p === "/api/orders/me") return json({ status: "success", orders: [{ id: 4182, order_number: "HOW-77", status: "shipped", title: "Crochet tote", delivery_phone: "9848012345", items: [] }] });
    if (p === "/api/works/customer/bookings") return json({ bookings: [{ workCode: "HOWDI-WORK-991", stage: "arrived", title: "Plumbing", jobPin: "7319" }] });
    if (p === "/api/works/customer/history") return json({ history: [] });
    if (p === "/api/learning/me/home") return json({ status: "success", next_step: { action: "LIVE", title: "Crochet basics live class", description: "Next class · today 6 pm", reference_id: 812 }, summary: {}, courses: [] });
    return json({ status: "error", message: "not mocked" }, 404);
  });
  await page.goto(`${BASE}/`); await page.locator(".howdi-dock-v2").waitFor({ timeout: 20000 });
  return { ctx, page, errs };
}
// The HOWDI logo the member can see: header logo on mobile/tablet, rail logo on desktop.
const logo = async (page) => { for (const sel of [".brand", ".howdi-master-sidebar-head"]) { const l = page.locator(sel).first(); if (await l.isVisible().catch(() => false)) return l; } throw new Error("no visible HOWDI logo"); };
const dockBtn = (page, key) => page.locator(`.howdi-dock-v2 [data-destination="${key}"]`);
const activeKey = (page) => page.locator(".howdi-dock-v2 .is-active").getAttribute("data-destination").catch(() => null);

for (const width of (process.env.WIDTHS || "390,768,1024,1280,1440").split(",").map(Number)) {
  const { ctx, page, errs } = await open(width);
  const labels = await page.locator(".howdi-dock-v2 .howdi-dock-v2-label").allTextContents();
  ok(width, "default dock Connect · Shop · Spark · Move · Work · Learn (no Home)", labels.join("|") === "Connect|Shop|Spark|Move|Work|Learn", labels.join("|"));
  const geo = await page.evaluate(() => {
    const r = (el) => el && getComputedStyle(el).display !== "none" ? el.getBoundingClientRect() : null;
    const dock = r(document.querySelector(".howdi-dock-v2")), spark = r(document.querySelector('.howdi-dock-v2 [data-destination="spark"]'));
    const side = r(document.querySelector(".howdi-master-sidebar")), edit = r(document.querySelector(".howdi-dock-v2-edit"));
    return { dock: dock && { l: dock.left, r: dock.right }, sparkMid: spark && (spark.left + spark.right) / 2, side: side && side.width > 0 ? { r: side.right } : null, edit: edit && { l: edit.left, r: edit.right }, vw: innerWidth };
  });
  ok(width, "dock fully on screen (no clipping)", geo.dock.l >= 0 && geo.dock.r <= geo.vw && (!geo.edit || (geo.edit.l >= 0 && geo.edit.r <= geo.vw)), JSON.stringify(geo));
  ok(width, "Spark sits at the dock’s centre", Math.abs(geo.sparkMid - (geo.dock.l + geo.dock.r) / 2) <= 3, JSON.stringify(geo));
  if (geo.side) ok(width, "dock (and its ⋯ button) clear of the sidebar", geo.dock.l >= geo.side.r && (!geo.edit || geo.edit.l >= geo.side.r), JSON.stringify(geo));
  ok(width, "Spark fixed in slot 3", (await page.locator(".howdi-dock-v2 .howdi-dock-v2-item").nth(2).getAttribute("data-destination")) === "spark");
  // Logo = Connect Home; dock highlights Connect
  await (await logo(page)).click(); await page.waitForTimeout(400);
  ok(width, "a visible HOWDI logo exists and is a button", (await (await logo(page)).evaluate((n) => n.tagName)) === "BUTTON");
  ok(width, "HOWDI logo opens Connect Home and dock shows Connect active", (await page.locator(".hc-home-shell").count()) >= 1 && (await activeKey(page)) === "connect", `shells=${await page.locator(".hc-home-shell").count()} active=${await activeKey(page)}`);
  // Continue where you left off
  await page.locator("[data-howdi-continue]").waitFor({ timeout: 8000 });
  const rows = await page.locator("[data-howdi-continue] .howdi-continue-row").evaluateAll((a) => a.map((b) => b.dataset.kind));
  ok(width, "Continue shows Works (arrived) → Shop (shipped) → Learn (live) from existing APIs", rows.join(",") === "works,order,learn", rows.join(","));
  ok(width, "Continue is the first block on Connect Home", await page.evaluate(() => { const c = document.querySelector("[data-howdi-continue]"); return c && c.parentElement.firstElementChild === c; }));
  ok(width, "Continue exposes no ids, codes, PINs or phones", !TRAPS.test(await page.locator("[data-howdi-continue]").innerText()));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-${width}.png` });
  // Dock wiring through the App's own navigation
  for (const [key, area] of [["shop", "shop"], ["work", "work"], ["learn", "learn"]]) {
    await dockBtn(page, key).click(); await page.waitForTimeout(500);
    ok(width, `dock ${key} opens via App navigation and is active`, (await activeKey(page)) === area, String(await activeKey(page)));
  }
  // Rename never changes destination
  await page.locator(".howdi-dock-v2-edit").click();
  await page.getByLabel("Rename Work").fill("Jobs"); await page.locator(".howdi-dock-v2-done").click();
  await dockBtn(page, "connect").click(); await page.waitForTimeout(300);
  await dockBtn(page, "work").click(); await page.waitForTimeout(500);
  ok(width, "renamed ‘Jobs’ still opens Works", (await dockBtn(page, "work").textContent()).includes("Jobs") && (await activeKey(page)) === "work");
  // Move: no module on this build → honest notice, no navigation
  await dockBtn(page, "move").click();
  ok(width, "Move shows ‘isn’t available yet’ honestly", (await page.locator(".howdi-dock-v2-notice").textContent()).includes("isn’t available on HOWDI yet"));
  // Spark: panel, Ask HOWDI focuses existing search
  await dockBtn(page, "spark").click(); await page.locator(".howdi-spark-v2").waitFor();
  await page.getByRole("button", { name: "Find a service" }).click(); await page.waitForTimeout(400);
  ok(width, "Spark ‘Find a service’ routes to Works", (await activeKey(page)) === "work");
  // Long-press 2s opens customize; release does not navigate
  await dockBtn(page, "connect").click(); await page.waitForTimeout(300);
  const box = await dockBtn(page, "shop").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(2200); await page.mouse.up(); await page.waitForTimeout(300);
  ok(width, "2s hold opens customize and release does not navigate", (await page.locator(".howdi-dock-v2-editor").count()) === 1 && (await activeKey(page)) === "connect");
  await page.locator(".howdi-dock-v2-done").click();
  // Continue item opens the owning screen
  await (await logo(page)).click(); await page.locator("[data-howdi-continue]").waitFor();
  await page.locator('[data-howdi-continue] [data-kind="works"]').click(); await page.waitForTimeout(500);
  ok(width, "Continue › Works booking opens Works", (await activeKey(page)) === "work");
  await (await logo(page)).click(); await page.locator("[data-howdi-continue]").waitFor();
  await page.locator('[data-howdi-continue] [data-kind="order"]').click(); await page.waitForTimeout(700);
  ok(width, "Continue › Shop order opens My Orders", await page.evaluate(() => document.body.innerText.includes("Your orders, all in one place")));
  // Global items preserved
  ok(width, "HPay, Notifications and Search still present", (await page.getByRole("button", { name: "Open HPay" }).count()) === 1 && (await page.getByRole("button", { name: "Notifications" }).count()) >= 1 && (await page.locator("header input").count()) >= 1);
  // HPay via header → dock has no HPay pinned → nothing wrongly active
  await page.getByRole("button", { name: "Open HPay" }).click(); await page.waitForTimeout(400);
  ok(width, "HPay open: no dock pillar falsely active", (await activeKey(page)) === null);
  // My Spaces
  await (await logo(page)).click(); await page.waitForTimeout(300);
  const trig = page.locator(".howdi-space-trigger");
  ok(width, "My Spaces entry present for signed-in member", (await trig.count()) === 1);
  if (await trig.isVisible()) {
    await trig.click(); const panel = await page.locator(".howdi-space-panel").innerText();
    ok(width, "Spaces panel text stays inside the panel", await page.locator(".howdi-space-panel").evaluate((p) => [...p.querySelectorAll("p,b,small")].every((n) => n.getBoundingClientRect().right <= p.getBoundingClientRect().right + 1)));
    ok(width, "Spaces: Personal active; School/College/Workplace planned; Business opens Shop", /Personal[\s\S]*Active/.test(panel) && (panel.match(/Planned/g) || []).length === 3 && panel.includes("Business / Store"));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/spaces-${width}.png` });
    await page.locator(".howdi-space-row", { hasText: "Business / Store" }).click(); await page.waitForTimeout(500);
    ok(width, "Business / Store opens the existing Shop seller area", (await activeKey(page)) === "shop");
  }
  // Exactly one permanent bottom nav on mobile; desktop sidebar untouched
  const legacyMobileNav = await page.locator(".howdi-mobile-nav").evaluate((n) => getComputedStyle(n).display).catch(() => "absent");
  if (width <= 900) ok(width, "only one mobile bottom nav (legacy bar hidden while dock is on)", legacyMobileNav === "none", legacyMobileNav);
  else ok(width, "desktop/tablet sidebar navigation not regressed", (await page.locator(".howdi-master-sidebar").count()) === 1);
  ok(width, "no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  await ctx.close();
}
{ // signed out: no Continue, no Spaces, dock still works
  const { ctx, page } = await open(390, { signedIn: false });
  ok(390, "signed out: no Continue card and no Spaces entry", (await page.locator("[data-howdi-continue]").count()) === 0 && (await page.locator(".howdi-space-trigger").count()) === 0);
  await ctx.close();
}
await browser.close(); await server.close();
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(results.join("\n")); console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
