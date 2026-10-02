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
  const button = (page, label = "Home") => page.locator(".v8-bottombar").getByRole("button", { name: label, exact: true });
  async function press(page, label = "Home") {
    const box = await button(page, label).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
  }
  async function count(page, id, expected) {
    assert.equal(await page.locator(`#${id}`).textContent(), String(expected), id);
  }

  let page = await fixture();
  const labels = ["Home", "Connect", "Shop", "Move", "Work", "Learn"];
  assert.deepEqual(await page.locator(".v8-bottombar button").allTextContents(), labels);
  for (const label of labels) {
    await button(page, label).click();
    assert.equal(await button(page, label).getAttribute("aria-current"), "page");
  }
  await count(page, "navigations", 6);
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
  await page.close();
  console.log("PASS: mobile six-pillar callbacks, active state, personalization inputs, bounds and single dock");

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

  for (const cancellation of ["unmount", "leave", "cancel", "blur"]) {
    page = await fixture();
    await press(page);
    if (cancellation === "unmount") {
      await page.evaluate(() => window.dockFixture.setMounted(false));
      await page.waitForFunction(() => !document.querySelector(".v8-bottombar"));
    } else if (cancellation === "leave") await page.mouse.move(380, 100);
    else if (cancellation === "cancel") await button(page).dispatchEvent("pointercancel");
    else await page.locator("#outside").focus();
    await page.clock.runFor(2100);
    await count(page, "customizations", 0);
    await page.mouse.up();
    await page.close();
  }
  console.log("PASS: unmount, leave, pointer cancellation and blur cancel pending customization");

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

  for (const width of [768, 1440]) {
    page = await fixture(width);
    assert.equal(await page.locator(".v8-bottombar").isVisible(), false);
    assert.equal(await page.locator(".v8-rail").isVisible(), true);
    for (const label of labels) {
      const railButton = page.locator(".v8-rail nav").getByRole("button", { name: label, exact: true });
      await railButton.click();
      assert.equal(await railButton.getAttribute("aria-current"), "page");
    }
    await count(page, "navigations", 6);
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log("PASS: tablet/desktop rail callbacks and no uncaught shell runtime errors");
} finally {
  await browser?.close();
  await server.close();
}
