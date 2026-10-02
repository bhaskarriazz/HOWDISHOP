// Run: DOCK_PLAYWRIGHT=/path/to/playwright/index.mjs node apps/customer/tests/dock.test.mjs
// Uses an isolated real-browser shell fixture; no backend or account credentials required.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
const { chromium } = await import(process.env.DOCK_PLAYWRIGHT || "playwright");
const server = await createServer({
  root: fileURLToPath(new URL("..", import.meta.url)),
  server: { host: "127.0.0.1", port: 0 },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  const errors = [];
  async function fixture(width = 390, reducedMotion = "no-preference") {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
    await page.goto(`${server.resolvedUrls.local[0]}tests/dock.html`);
    await page.waitForFunction(() => !!window.dockFixture);
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
    return page;
  }
  const button = (page, label = "Connect") => page.locator(".v8-bottombar").getByRole("button", { name: label, exact: true });
  async function press(page, label = "Connect") {
    const box = await button(page, label).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
  }
  async function count(page, id, expected) {
    assert.equal(await page.locator(`#${id}`).textContent(), String(expected), id);
  }

  let page = await fixture();
  const labels = ["Connect", "Shop", "Spark", "Move", "Work", "Learn"];
  assert.deepEqual(await page.locator(".v8-bottombar button").allTextContents(), labels);
  for (const label of labels.filter(label => label !== "Spark")) {
    await button(page, label).click();
    assert.equal(await button(page, label).getAttribute("aria-current"), "page");
  }
  await count(page, "navigations", 5);
  const rect = await page.locator(".v8-bottombar").boundingBox();
  assert.ok(rect.x >= 0 && rect.x + rect.width <= 390 && rect.y + rect.height <= 832);
  assert.equal(await page.locator(".v8-bottombar").count(), 1);
  assert.equal(await page.locator(".v8-bottombar img, .v8-bottombar .v8-avatar-btn").count(), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.evaluate(() => window.dockFixture.setPillars([
    { area: "home", label: "Home" }, { area: "learn", label: "Learn" }, { area: "move", label: "Move" },
  ]));
  await page.waitForFunction(() => document.querySelectorAll(".v8-bottombar button").length === 3);
  assert.deepEqual(await page.locator(".v8-bottombar button").allTextContents(), ["Home", "Learn", "Move"]);
  const lastRect = await button(page, "Move").boundingBox();
  assert.ok(Math.abs(lastRect.x + lastRect.width - (rect.x + rect.width)) < 3, "visible pillars fill the capsule");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { bottom: 34 } });
  const safeRect = await page.locator(".v8-bottombar").boundingBox();
  const contentRect = await page.locator("#content-end").boundingBox();
  assert.ok(844 - safeRect.y - safeRect.height >= 46, "dock clears bottom safe area");
  assert.ok(contentRect.y + contentRect.height <= safeRect.y, "content clears the raised dock");
  await page.close();
  console.log("PASS: mobile quick-access callbacks, active state, personalization inputs, bounds and single dock");

  page = await fixture();
  await press(page);
  await page.clock.runFor(1999);
  await count(page, "customizations", 0);
  await page.clock.runFor(1);
  await count(page, "customizations", 1);
  await page.mouse.up();
  await count(page, "navigations", 0);
  await button(page, "Shop").click();
  await count(page, "navigations", 1);
  await press(page, "Move"); // Focus moving between dock buttons must not cancel the new hold.
  await page.clock.runFor(2000);
  await count(page, "customizations", 2);
  await page.mouse.up();
  await count(page, "navigations", 1);
  await page.close();
  console.log("PASS: two-second hold customizes once, consumes release click, preserves next tap");

  page = await fixture();
  await press(page);
  await page.clock.runFor(2000);
  // Opening a dialog can move focus/pointer away before the release click reaches the dock.
  await page.mouse.move(380, 100);
  await page.mouse.up();
  await button(page, "Connect").focus();
  await page.keyboard.press("Enter");
  await count(page, "navigations", 1);
  assert.equal(await button(page, "Connect").getAttribute("aria-current"), "page");
  await page.close();
  console.log("PASS: keyboard activation survives a hold with no dock release click");

  for (const cancellation of ["unmount", "leave", "cancel", "blur", "drag", "multi-touch", "window blur"]) {
    page = await fixture();
    await press(page);
    if (cancellation === "unmount") {
      await page.evaluate(() => window.dockFixture.setMounted(false));
      await page.waitForFunction(() => !document.querySelector(".v8-bottombar"));
    } else if (cancellation === "leave") await page.mouse.move(380, 100);
    else if (cancellation === "cancel") await button(page).dispatchEvent("pointercancel");
    else if (cancellation === "blur") await page.locator("#outside").focus();
    else if (cancellation === "window blur") await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    else if (cancellation === "drag") {
      const box = await button(page).boundingBox();
      await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2);
    } else await button(page).dispatchEvent("pointerdown", { pointerId: 2, isPrimary: false, button: 0 });
    await page.clock.runFor(2100);
    await count(page, "customizations", 0);
    await page.mouse.up();
    await page.close();
  }
  console.log("PASS: unmount, leave, pointer cancellation, focus/window blur, drag and multi-touch cancel pending customization");

  page = await fixture();
  const box = await button(page).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down({ button: "right" });
  await page.clock.runFor(2100);
  await count(page, "customizations", 0);
  await page.mouse.up({ button: "right" });
  await page.close();
  console.log("PASS: secondary mouse button does not open customization");

  page = await fixture(390, "reduce");
  await button(page).focus();
  await page.keyboard.down("Space");
  assert.equal(await button(page).evaluate((el) => el.matches(":active")), true);
  assert.equal(await button(page).locator("i").evaluate((el) => getComputedStyle(el).animationName), "none");
  await page.keyboard.up("Space");
  await press(page);
  await page.clock.runFor(500); // is-tapped has cleared; pointer :active must still respect the preference.
  assert.equal(await button(page).locator("i").evaluate((el) => getComputedStyle(el).animationName), "none");
  await page.mouse.up();
  await page.close();
  console.log("PASS: keyboard and sustained pointer press respect reduced motion");

  page = await fixture();
  await button(page, "Spark").click();
  const spark = page.getByRole("dialog", { name: "Spark", exact: true });
  await spark.waitFor();
  await count(page, "navigations", 0);
  await page.clock.runFor(1);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Close");
  await page.keyboard.press("Shift+Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Customize Home");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Close");
  await page.keyboard.press("Escape");
  assert.equal(await spark.count(), 0);
  assert.equal(await button(page, "Spark").evaluate(el => el === document.activeElement), true);
  for (const label of ["Vibe", "HPay", "Messages", "Ask HOWDI"]) {
    await button(page, "Spark").click();
    await spark.getByRole("button", { name: label, exact: true }).click();
    assert.equal(await spark.count(), 0);
  }
  await count(page, "navigations", 4);
  console.log("PASS: Spark opens without navigation; Escape, focus trap/restore and action callbacks work");

  await page.locator("#customize").click();
  const custom = page.getByRole("dialog", { name: "Customize Home", exact: true });
  await custom.getByRole("combobox", { name: "Replace Connect", exact: true }).selectOption("vibe");
  await custom.getByRole("combobox", { name: "Replace Shop", exact: true }).selectOption("hpay");
  await custom.getByRole("combobox", { name: "Replace Move", exact: true }).selectOption("messages");
  await custom.getByRole("textbox", { name: "Personal label for Vibe", exact: true }).fill("WWWWWWWWWWWW");
  await custom.getByRole("combobox", { name: "Icon style", exact: true }).selectOption("soft");
  await custom.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => window.dockFixture?.prefs.dock[0] === "vibe");
  assert.deepEqual(await page.locator(".v8-bottombar button").allTextContents(), ["WWWWWWWWWWWW", "HPay", "Spark", "Messages", "Work", "Learn"]);
  assert.ok(await page.locator(".v8-bottombar").evaluate(el => el.classList.contains("v8-dock-style-soft")));
  const softBackground = await button(page, "Messages").locator("i").evaluate(el => getComputedStyle(el).backgroundColor);
  assert.notEqual(softBackground, "rgba(0, 0, 0, 0)");
  for (const [label, area] of [["WWWWWWWWWWWW", "vibe"], ["HPay", "hpay"], ["Messages", "messages"]]) {
    await button(page, label).click();
    assert.equal(await page.locator("#active").textContent(), area, "personal labels preserve canonical identity");
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.evaluate(() => window.dockFixture.setAccount("beta"));
  await page.waitForFunction(() => window.dockFixture.prefs.dock[0] === "connect");
  assert.deepEqual(await page.locator(".v8-bottombar button").allTextContents(), labels);
  await page.evaluate(() => window.dockFixture.setAccount("alpha"));
  await page.waitForFunction(() => window.dockFixture.prefs.dock[0] === "vibe");
  await page.locator("#customize").click();
  await custom.getByRole("button", { name: "Reset", exact: true }).click();
  await custom.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => window.dockFixture?.prefs.dock[0] === "connect");
  assert.deepEqual(await page.locator(".v8-bottombar button").allTextContents(), labels);
  assert.equal(await button(page, "Connect").locator("i").evaluate(el => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)");
  await page.close();
  console.log("PASS: replacement shortcuts, presentation-only labels, Line/Soft style, per-account persistence and reset");

  page = await fixture();
  await page.evaluate(() => {
    localStorage.setItem("howdi.v8.common-home.v1:alpha", JSON.stringify({
      dock: ["home", "learn", "shop", "move", "works", "connect"],
      hiddenDock: ["shop"], favoriteDock: ["learn"],
      hiddenModules: ["vibe"], pinnedModules: ["shop"], moduleOrder: ["news", "shop"],
    }));
  });
  await page.reload();
  await page.waitForFunction(() => window.dockFixture?.prefs.dock[0] === "learn");
  const migrated = await page.evaluate(() => window.dockFixture.prefs);
  assert.deepEqual(migrated.dock, ["learn", "shop", "spark", "move", "works", "connect"]);
  assert.deepEqual(migrated.hiddenDock, ["shop"]);
  assert.deepEqual(migrated.favoriteDock, ["learn"]);
  assert.deepEqual(migrated.hiddenModules, ["vibe"]);
  assert.deepEqual(migrated.pinnedModules, ["shop"]);
  assert.deepEqual(migrated.moduleOrder.slice(0, 2), ["news", "shop"]);
  await page.locator("#customize").click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => !!window.dockFixture);
  assert.deepEqual(await page.evaluate(() => window.dockFixture.prefs.dock), ["connect", "shop", "spark", "move", "works", "learn"]);
  assert.deepEqual(await page.evaluate(() => window.dockFixture.prefs.hiddenModules), []);
  await page.close();
  console.log("PASS: v1 migration preserves account ordering, visibility, favorites and Home modules; reset persists over legacy data");

  for (const width of [768, 1440]) {
    page = await fixture(width);
    assert.equal(await page.locator(".v8-bottombar").isVisible(), false);
    assert.equal(await page.locator(".v8-rail").isVisible(), true);
    for (const label of labels.filter(label => label !== "Spark")) {
      const railButton = page.locator(".v8-rail nav").getByRole("button", { name: label, exact: true });
      await railButton.click();
      assert.equal(await railButton.getAttribute("aria-current"), "page");
    }
    await count(page, "navigations", 5);
    await page.locator("#customize").click();
    assert.ok(await page.getByRole("dialog", { name: "Customize Home", exact: true }).evaluate(el => el.scrollWidth <= el.clientWidth), "customization controls fit tablet/desktop dialog");
    await page.close();
  }
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", error => errors.push(error.message));
  // Guest App routing smoke test: no live backend or third-party requests are needed.
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(server.resolvedUrls.local[0]).origin || url.pathname.startsWith("/api/")) return route.abort();
    return route.continue();
  });
  await page.goto(server.resolvedUrls.local[0]);
  await button(page, "Spark").waitFor();
  const initialPath = new URL(page.url()).pathname;
  await button(page, "Spark").click();
  const appSpark = page.getByRole("dialog", { name: "Spark", exact: true });
  await appSpark.waitFor();
  assert.equal(new URL(page.url()).pathname, initialPath);
  await page.keyboard.press("Escape");
  assert.equal(new URL(page.url()).pathname, initialPath);
  await button(page, "Spark").click();
  await appSpark.getByRole("button", { name: "Customize Home", exact: true }).click();
  const appCustom = page.getByRole("dialog", { name: "Customize Home", exact: true });
  for (const [label, area] of [["Connect", "vibe"], ["Shop", "hpay"], ["Move", "messages"]]) {
    await appCustom.getByRole("combobox", { name: `Replace ${label}`, exact: true }).selectOption(area);
  }
  await appCustom.getByRole("button", { name: "Done", exact: true }).click();
  for (const [label, path] of [["Vibe", "/connect/vibe"], ["Messages", "/connect/messages"], ["HPay", "/hpay"], ["Ask HOWDI", "/connect/ask"]]) {
    await button(page, "Spark").click();
    await appSpark.getByRole("button", { name: label, exact: true }).click();
    await page.waitForURL(url => url.pathname === path);
    if (label !== "Ask HOWDI") assert.equal(await button(page, label).getAttribute("aria-current"), "page");
  }
  await page.close();
  console.log("PASS: production App Spark open/close preserves route and actions use canonical guest routes");
  assert.deepEqual(errors, []);
  console.log("PASS: tablet/desktop rail callbacks and no uncaught shell runtime errors");
} finally {
  await browser?.close();
  await server.close();
}
