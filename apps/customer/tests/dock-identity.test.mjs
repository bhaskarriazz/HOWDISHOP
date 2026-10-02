// K5-NG47 real-app regression: Spark centre, stable feature identity, persistence, canonical rail.
// Run after `npm run build` in apps/customer:
//   DOCK_PLAYWRIGHT=/path/to/playwright/index.mjs node apps/customer/tests/dock-identity.test.mjs
// Serves the built customer app via `vite preview`; no backend or credentials required.
import { fileURLToPath } from "node:url";
import { preview } from "vite";
const { chromium } = await import(process.env.DOCK_PLAYWRIGHT || "playwright");
const server = await preview({ root: fileURLToPath(new URL("..", import.meta.url)), preview: { host: "127.0.0.1", port: 0 } });
const URL0 = server.resolvedUrls.local[0];
const b = await chromium.launch({ args: ["--no-sandbox"] });
const results = [];
const ok = (name, cond, extra = "") => { results.push(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); };
async function open(width = 390, opts = {}) {
  const ctx = opts.ctx || await b.newContext({ viewport: { width, height: 844 }, reducedMotion: opts.reducedMotion || "no-preference" });
  const p = await ctx.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push(e.message));
  await p.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
  await p.goto(URL0, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500);
  return p;
}
const dock = (p) => p.locator(".v8-bottombar > button");
const dockBtn = (p, name) => p.locator(".v8-bottombar").getByRole("button", { name, exact: true });
const labels = (p) => dock(p).allTextContents();

// ---- 390 core ----
let p = await open(390);
ok("default dock order", JSON.stringify(await labels(p)) === JSON.stringify(["Connect","Shop","Spark","Move","Work","Learn"]), (await labels(p)).join(" · "));
ok("Spark is slot 3", (await dock(p).nth(2).getAttribute("class"))?.includes("is-spark"));
const boxes = await Promise.all([0,1,2,3,4,5].map(i => dock(p).nth(i).boundingBox()));
const widths = boxes.map(x => Math.round(x.width));
const sparkMid = boxes[2].x + boxes[2].width / 2;
ok("Spark on true screen centre", Math.abs(sparkMid - 195) <= 2, `spark mid ${sparkMid.toFixed(1)} · widths ${widths.join(",")}`);
ok("slot widths symmetric per side", widths[0] === widths[1] && widths[3] === widths[4] && widths[4] === widths[5]);
const bar = await p.locator(".v8-bottombar").boundingBox();
ok("dock inside 390 viewport", bar.x >= 0 && bar.x + bar.width <= 390 && bar.y + bar.height <= 844, JSON.stringify(bar));
ok("single mobile dock", await p.locator(".v8-bottombar").count() === 1);
ok("no Ask HOWDI duplicate visible on mobile", !(await p.locator(".v8-ask").isVisible()));
await dockBtn(p, "Spark").click(); await p.waitForTimeout(400);
ok("Spark opens /connect/ask", new URL(p.url()).pathname === "/connect/ask", p.url());
ok("Spark marked current on Ask", await dockBtn(p, "Spark").getAttribute("aria-current") === "page");
ok("Connect not current while on Ask", await dockBtn(p, "Connect").getAttribute("aria-current") === null);
await p.locator(".v8-header .v8-logo").click(); await p.waitForTimeout(400);
ok("HOWDI logo opens Home", new URL(p.url()).pathname === "/" , p.url());
for (const [name, path] of [["Shop","/shop"],["Move","/move"],["Work","/works"],["Learn","/learn"],["Connect","/connect"]]) {
  await dockBtn(p, name).click(); await p.waitForTimeout(350);
  ok(`${name} navigates`, new URL(p.url()).pathname.startsWith(path) && await dockBtn(p, name).getAttribute("aria-current") === "page", p.url());
}
// long press ~2s: opens customize, release must not navigate
await p.locator(".v8-header .v8-logo").click(); await p.waitForTimeout(300);
const before = p.url(); const sb = await dockBtn(p, "Shop").boundingBox();
await p.mouse.move(sb.x + sb.width/2, sb.y + sb.height/2); await p.mouse.down(); await p.waitForTimeout(1500);
ok("no customize before ~2s", !(await p.getByRole("dialog").isVisible().catch(() => false)));
await p.waitForTimeout(700);
ok("customize opens at ~2s", await p.getByRole("dialog", { name: /Customize Home/ }).isVisible());
await p.mouse.up(); await p.waitForTimeout(300);
ok("release after hold does not navigate", p.url() === before, p.url());
// replace Work -> Vibe, label Videos; Learn label Classes
const dlg = p.getByRole("dialog", { name: /Customize Home/ });
await dlg.getByLabel("Replace Work").selectOption("vibe");
await dlg.getByLabel("Personal label for Vibe").fill("Videos");
await dlg.getByLabel("Personal label for Learn").fill("Classes");
await dlg.getByLabel("Personal label for Shop").fill("Handmade ABC"); // 12 chars
await dlg.getByLabel("Move Shop right").click(); // skips Spark
await dlg.getByRole("button", { name: "Done" }).click(); await p.waitForTimeout(300);
ok("replaced + labelled dock", JSON.stringify(await labels(p)) === JSON.stringify(["Connect","Move","Spark","Handmade ABC","Videos","Classes"]), (await labels(p)).join(" · "));
ok("Spark still slot 3 after reorder", (await dock(p).nth(2).textContent()) === "Spark");
const lb = await Promise.all([0,1,2,3,4,5].map(i => dock(p).nth(i).locator("span").evaluate(el => el.scrollWidth > el.clientWidth ? "trunc" : "fit")));
const sp = await Promise.all([0,1,2,3,4,5].map(i => dock(p).nth(i).locator("span").boundingBox()));
ok("labels never overlap neighbours", sp.every((r, i) => i === 5 || r.x + r.width <= sp[i + 1].x + 1), lb.join(","));
await dockBtn(p, "Videos").click(); await p.waitForTimeout(400);
ok("Videos → canonical /connect/vibe", new URL(p.url()).pathname === "/connect/vibe", p.url());
ok("Videos current on Vibe", await dockBtn(p, "Videos").getAttribute("aria-current") === "page");
await dockBtn(p, "Classes").click(); await p.waitForTimeout(400);
ok("Classes → canonical /learn", new URL(p.url()).pathname.startsWith("/learn"), p.url());
await p.reload(); await p.waitForTimeout(1500);
ok("persists after refresh", JSON.stringify(await labels(p)) === JSON.stringify(["Connect","Move","Spark","Handmade ABC","Videos","Classes"]), (await labels(p)).join(" · "));
// Work still reachable via deep link
await p.goto(URL0 + "works", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1200);
ok("Work deep link still works when not in dock", new URL(p.url()).pathname.startsWith("/works") && (await p.locator(".v8-page, main").first().isVisible()), p.url());
// HPay + Messages replacements
await p.getByRole("button", { name: "Customize Home" }).first().click().catch(async () => { const h = await dockBtn(p,"Connect").boundingBox(); await p.mouse.move(h.x+5,h.y+5); await p.mouse.down(); await p.waitForTimeout(2100); await p.mouse.up(); });
await p.waitForTimeout(300);
const d2 = p.getByRole("dialog", { name: /Customize Home/ });
if (await d2.isVisible()) {
  await d2.getByLabel("Replace Move").selectOption("hpay"); await d2.getByLabel("Replace Connect").selectOption("messages");
  await d2.getByRole("button", { name: "Done" }).click(); await p.waitForTimeout(300);
  ok("HPay/Messages replacements render", JSON.stringify(await labels(p)) === JSON.stringify(["Messages","HPay","Spark","Handmade ABC","Videos","Classes"]), (await labels(p)).join(" · "));
  await dockBtn(p, "HPay").click(); await p.waitForTimeout(500);
  ok("HPay opens HPay utility", await dockBtn(p, "HPay").getAttribute("aria-current") === "page", p.url());
  await dockBtn(p, "Messages").click(); await p.waitForTimeout(500);
  ok("Messages opens Messages", await dockBtn(p, "Messages").getAttribute("aria-current") === "page", p.url());
  await p.keyboard.press("Escape").catch(()=>{});
  await p.goto(URL0, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1200);
  // reset
  const c = await dockBtn(p,"Spark").boundingBox(); await p.mouse.move(c.x+c.width/2,c.y+c.height/2); await p.mouse.down(); await p.waitForTimeout(2100); await p.mouse.up();
  const d3 = p.getByRole("dialog", { name: /Customize Home/ }); await d3.getByRole("button", { name: "Reset" }).click(); await d3.getByRole("button", { name: "Done" }).click(); await p.waitForTimeout(300);
  ok("reset restores default dock", JSON.stringify(await labels(p)) === JSON.stringify(["Connect","Shop","Spark","Move","Work","Learn"]), (await labels(p)).join(" · "));
  ok("Spark has no replace control", await p.getByLabel("Replace Spark").count() === 0);
} else ok("customize reopen", false);
ok("no page errors (390)", p.errs.length === 0, p.errs.join("|"));

// ---- account isolation (another account's stored dock never shown to guest) ----
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => { localStorage.setItem("howdi.v8.common-home.v2:someone_else", JSON.stringify({ dock: ["hpay","vibe","spark","messages","shop","learn"], dockLabels: { hpay: "Pay" } })); localStorage.setItem("howdi.v8.common-home.v2:guest", JSON.stringify({ dock: ["learn","shop","spark","move","works","connect"], hiddenDock: ["works"] })); });
const p2 = await open(390, { ctx });
ok("guest sees only guest dock; legacy hidden slot kept (6 slots)", JSON.stringify(await labels(p2)) === JSON.stringify(["Learn","Shop","Spark","Move","Work","Connect"]), (await labels(p2)).join(" · "));

// ---- reduced motion / soft style ----
const p3 = await open(390, { reducedMotion: "reduce" });
const anim = await dockBtn(p3, "Spark").locator(".v8-dock-ico").evaluate(el => getComputedStyle(el).transitionDuration);
ok("reduced-motion: dock transitions off", anim === "0s", anim);

// ---- tablet / desktop ----
for (const w of [768, 1440]) {
  const q = await open(w);
  ok(`${w}: dock hidden`, !(await q.locator(".v8-bottombar").isVisible()));
  const rail = await q.locator(".v8-rail nav button").allTextContents();
  ok(`${w}: canonical rail`, JSON.stringify(rail) === JSON.stringify(["Home","Connect","Shop","Move","Work","Learn"]), rail.join(" · "));
  ok(`${w}: no horizontal overflow`, await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await q.locator(".v8-rail nav").getByRole("button", { name: "Work" }).click(); await q.waitForTimeout(400);
  ok(`${w}: rail Work navigates + current`, new URL(q.url()).pathname.startsWith("/works") && await q.locator(".v8-rail nav").getByRole("button", { name: "Work" }).getAttribute("aria-current") === "page", q.url());
  ok(`${w}: Ask HOWDI visible in header (desktop only)`, w === 1440 ? await q.locator(".v8-ask").isVisible() : true);
}
// rail stays canonical even when dock personalised (desktop)
const ctx4 = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx4.addInitScript(() => localStorage.setItem("howdi.v8.common-home.v2:guest", JSON.stringify({ dock: ["connect","shop","spark","move","vibe","learn"], dockLabels: { learn: "Classes" } })));
const p4 = await open(1440, { ctx: ctx4 });
ok("1440: personalised dock does not alter rail", JSON.stringify(await p4.locator(".v8-rail nav button").allTextContents()) === JSON.stringify(["Home","Connect","Shop","Move","Work","Learn"]));
console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
await b.close();
await server.close();
process.exit(failed ? 1 : 0);
