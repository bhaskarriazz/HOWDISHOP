const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const { accounts, password } = JSON.parse(fs.readFileSync("artifacts/b1-runtime/accounts.json", "utf8"));
const sizes = [390, 768, 1440];
const canonical = ["Connect", "Shop", "Spark", "Move", "Work", "Learn"];
const evidenceRoot = path.resolve("artifacts/b1-runtime/screenshots");
fs.mkdirSync(evidenceRoot, { recursive: true });

async function screenshot(page, width, name) {
  await page.screenshot({ path: path.join(evidenceRoot, `${width}-${name}.png`), fullPage: true });
}
async function login(page, account) {
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await loginFromOpenDialog(page, account);
}
async function loginFromOpenDialog(page, account) {
  await page.getByRole("button", { name: /Sign in with email/i }).click();
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page.getByRole("button", { name: new RegExp(`My HOWDI, ${account.name}`) })).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(1200); // auth transition and preference GET settle before assertions/screenshots
}
async function openPersonalise(page) {
  const homeButton = page.getByRole("button", { name: "HOWDI Home" }).first();
  if (await homeButton.isVisible().catch(() => false)) await homeButton.click();
  const entry = page.getByRole("button", { name: "Customize Home" });
  if (await entry.isVisible().catch(() => false)) await entry.click();
  else {
    const dock = page.getByRole("navigation", { name: "Quick access" });
    await dock.dispatchEvent("pointerdown", { pointerId: 7, pointerType: "mouse", button: 0, buttons: 1 });
    await page.waitForTimeout(2200);
    await dock.dispatchEvent("pointerup", { pointerId: 7, pointerType: "mouse", button: 0, buttons: 0 });
  }
  await expect(page.getByRole("dialog", { name: "Customize Home" })).toBeVisible();
}
async function signOut(page) {
  await page.getByRole("button", { name: /^My HOWDI/ }).click();
  await page.getByRole("button", { name: "Sign out →" }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible({ timeout: 30000 });
}
function getPillarButton(page, label) {
  const dock = page.getByRole("navigation", { name: "Quick access" });
  const rail = page.getByRole("navigation", { name: "Main" });
  return dock.isVisible().then((visible) => visible ? dock.getByRole("button", { name: label, exact: true }) : rail.getByRole("button", { name: label, exact: true }));
}

for (const width of sizes) {
  test(`Spark follows approved navigation at ${width}px`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto("/");
    const origin = page.url();
    const dock = page.getByRole("navigation", { name: "Quick access" });
    if (width <= 760) {
      await expect(dock).toBeVisible();
      const spark = dock.getByRole("button", { name: "Spark", exact: true });
      const sparkBox = await spark.boundingBox(), dockBox = await dock.boundingBox();
      expect(Math.abs((sparkBox.x + sparkBox.width / 2) - (dockBox.x + dockBox.width / 2))).toBeLessThanOrEqual(2);
    } else {
      // Approved tablet/desktop shell hides the floating dock; Spark stays reachable through Ask HOWDI.
      await expect(dock).toBeHidden();
      await expect(page.getByRole("button", { name: "Ask HOWDI", exact: true })).toBeVisible();
      const rail = page.getByRole("navigation", { name: "Main" });
      for (const label of ["Home", ...canonical.filter((x) => x !== "Spark")]) await expect(rail.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
    if (width <= 760) await dock.getByRole("button", { name: "Spark", exact: true }).click();
    else await page.getByRole("button", { name: "Ask HOWDI", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Spark" })).toBeVisible();
    await expect(page).toHaveURL(origin);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Spark" })).toBeHidden();
    await expect(page).toHaveURL(origin);
    await page.screenshot({ path: path.join(evidenceRoot, `${width}-spark-centre-proof.png`), fullPage: true });
    await page.close();
  });

  test(`B1 runtime flow at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    const prefix = `http://127.0.0.1:5000`;
    await page.goto("/");
    await expect(page.locator(".howdi-app.v8")).toBeVisible();
    await expect(page.getByRole("button", { name: "HOWDI Home" })).toBeVisible();
    await expect(page.getByRole("button", { name: "HOWDI Home" })).toHaveText("HOWDI");
    const homeBrand = page.getByRole("button", { name: "HOWDI Home" }).last();
    const brandBox = await homeBrand.boundingBox();
    const homeBox = await page.locator('[data-v8-page="home"] .v8-page-inner').boundingBox();
    expect(brandBox.x + brandBox.width).toBeGreaterThan(homeBox.x + homeBox.width * 0.9);
    await expect(page.locator(".v8-build")).toContainText("B1-CI-");
    await screenshot(page, width, "home");

    const dock = page.getByRole("navigation", { name: "Quick access" });
    if (width <= 760) {
      await expect(dock).toBeVisible();
      const labels = await dock.locator("button span").allTextContents();
      expect(labels).toEqual(canonical);
      const spark = dock.getByRole("button", { name: "Spark", exact: true });
      const sparkBox = await spark.boundingBox();
      const dockBox = await dock.boundingBox();
      expect(Math.abs((sparkBox.x + sparkBox.width / 2) - (dockBox.x + dockBox.width / 2))).toBeLessThanOrEqual(2);
      expect(900 - (dockBox.y + dockBox.height)).toBeGreaterThanOrEqual(12);
      expect(await page.locator(".v8-bottombar").evaluate((element) => getComputedStyle(element).position)).toBe("fixed");
      expect(await page.locator(".v8-bottombar").evaluate((element) => getComputedStyle(element).bottom)).toBe("12px");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } else {
      // V8 deliberately switches from the floating bottom dock to the desktop rail above 760px.
      await expect(dock).toBeHidden();
      const rail = page.getByRole("navigation", { name: "Main" });
      for (const label of ["Home", ...canonical.filter((x) => x !== "Spark")]) await expect(rail.getByRole("button", { name: label, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await screenshot(page, width, "default-dock");

    const sparkOrigin = page.url();
    if (width <= 760) await dock.getByRole("button", { name: "Spark", exact: true }).click();
    else await page.getByRole("button", { name: "Ask HOWDI", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Spark" })).toBeVisible();
    await expect(page).toHaveURL(sparkOrigin);
    await expect(page.getByRole("heading", { name: "Ask HOWDI" })).toBeVisible();
    const sparkQuestion = page.getByRole("textbox", { name: "Your question" });
    await expect(sparkQuestion).toBeVisible();
    const sparkSearchResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/search" && url.searchParams.get("q") === "plumber";
    });
    await sparkQuestion.fill("Find a plumber for me tomorrow");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    expect((await sparkSearchResponse).ok()).toBe(true);
    await expect(page.getByRole("heading", { name: "Finding people, products, services and classes" })).toBeHidden();
    const sparkResults = page.getByRole("region", { name: "Spark results" });
    if (await sparkResults.isVisible()) {
      await sparkResults.getByRole("button", { name: "Prepare", exact: true }).first().click();
      const prepared = page.getByRole("region", { name: "Prepared action" });
      await expect(prepared).toBeVisible();
      await screenshot(page, width, "spark-prepared");
      await prepared.getByRole("button", { name: /^Review in / }).click();
      await expect(page.getByRole("dialog", { name: "Spark" })).toBeHidden();
      const handoff = page.getByRole("status", { name: "Spark prepared request" });
      await expect(handoff).toBeVisible();
      await expect(handoff).toContainText("Find a plumber for me tomorrow");
    }
    if (await page.getByRole("dialog", { name: "Spark" }).isVisible()) {
      await page.getByRole("button", { name: "Close", exact: true }).click();
    }
    await screenshot(page, width, "spark");
    await page.getByRole("button", { name: "HOWDI Home" }).first().click();
    await expect(page.locator('[data-v8-page="home"]')).toBeVisible();

    await getPillarButton(page, "Shop").then((button) => button.click());
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.locator('[data-v8-page="shop"]')).toBeVisible();
    await page.getByRole("button", { name: "HOWDI Home" }).first().click();
    await expect(page.locator('[data-v8-page="home"]')).toBeVisible();

    await login(page, accounts.a);
    await screenshot(page, width, "home-user-a");
    if (width <= 760) {
      await expect(dock.locator("button span")).toHaveText(["Connect", "Learn", "Spark", "Shop", "Move", "Work"]);
      expect(await dock.locator("button span").evaluateAll((nodes) => new Set(nodes.map((n) => n.textContent)).size)).toBe(6);
    }
    await openPersonalise(page);
    const malformedDialog = page.getByRole("dialog", { name: "Customize Home" });
    await expect(malformedDialog.getByLabel("Personal label for Spark")).toBeDisabled();
    await expect(malformedDialog.getByLabel("Personal label for Spark")).toHaveValue("");
    await expect(malformedDialog.getByLabel("Personal label for Connect")).toHaveValue("");
    await screenshot(page, width, "malformed-recovery");
    await malformedDialog.getByRole("button", { name: "Reset", exact: true }).click();
    await malformedDialog.getByRole("button", { name: "Done", exact: true }).click();
    await page.waitForTimeout(800);
    if (width <= 760) await expect(dock.locator("button span")).toHaveText(canonical);
    await openPersonalise(page);
    const dialog = page.getByRole("dialog", { name: "Customize Home" });
    await screenshot(page, width, "personalise");
    await expect(dialog.getByText("Spark stays fixed in the centre.")).toBeVisible();
    await expect(dialog.getByLabel("Personal label for Spark")).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Move Spark left" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Move Spark right" })).toBeDisabled();
    await expect(dialog.getByLabel("Replace Shop")).toHaveValue("shop");
    await dialog.getByLabel("Personal label for Connect").fill("JobOpenings");
    await dialog.getByLabel("Personal label for Work").fill("Jobs");
    await dialog.getByLabel("Personal label for Learn").fill("Classes");
    await dialog.getByLabel("Replace Shop").selectOption("vibe");
    await dialog.getByLabel("Personal label for Vibe").fill("Videos");
    await screenshot(page, width, "preview");
    // Slot values and presentation aliases are visible in the draft; canonical target keys stay in the select values.
    await expect(dialog.getByLabel("Replace Connect")).toHaveValue("connect");
    await expect(dialog.getByLabel("Replace Vibe")).toHaveValue("vibe");
    await expect(dialog.getByLabel("Personal label for Vibe")).toHaveValue("Videos");
    const savedResponse = page.waitForResponse((response) => response.url().includes("/api/preferences/me") && response.request().method() === "PUT");
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    expect((await savedResponse).ok()).toBe(true);
    await expect(page.getByRole("dialog", { name: "Customize Home" })).toBeHidden();
    if (width <= 760) {
      await expect(dock.getByRole("button", { name: "JobOpenings", exact: true })).toBeVisible();
      await expect(dock.getByRole("button", { name: "Videos", exact: true })).toBeVisible();
      const longAlias = dock.getByRole("button", { name: "JobOpenings", exact: true }).locator("span");
      const textWidth = await longAlias.evaluate((node) => { const range = document.createRange(); range.selectNodeContents(node); return range.getBoundingClientRect().width; });
      expect(textWidth).toBeLessThanOrEqual(await longAlias.evaluate((node) => node.clientWidth) + 1);
      const customSpark = dock.getByRole("button", { name: "Spark", exact: true });
      const customBox = await customSpark.boundingBox(), customDockBox = await dock.boundingBox();
      expect(Math.abs((customBox.x + customBox.width / 2) - (customDockBox.x + customDockBox.width / 2))).toBeLessThanOrEqual(2);
    }
    await screenshot(page, width, "saved-customised-dock");
    const customizedFresh = await browser.newContext({ viewport: { width, height: 900 } });
    const customizedFreshPage = await customizedFresh.newPage();
    await customizedFreshPage.goto("/");
    await login(customizedFreshPage, accounts.a);
    if (width <= 760) {
      const freshDock = customizedFreshPage.getByRole("navigation", { name: "Quick access" });
      await expect(freshDock.getByRole("button", { name: "JobOpenings", exact: true })).toBeVisible();
      await expect(freshDock.getByRole("button", { name: "Videos", exact: true })).toBeVisible();
    }
    await screenshot(customizedFreshPage, width, "fresh-session-customised");
    await customizedFresh.close();
    if (width <= 760) {
      await dock.getByRole("button", { name: "JobOpenings", exact: true }).click();
      await expect(page.locator(".howdi-app.v8")).toHaveAttribute("data-active-pillar", "connect");
      await dock.getByRole("button", { name: "Videos", exact: true }).click();
      await expect(page.locator(".howdi-app.v8")).toHaveAttribute("data-active-pillar", "connect");
      await expect(page).toHaveURL(/\/connect\/vibe/);
      await dock.getByRole("button", { name: "Jobs", exact: true }).click();
      await expect(page.locator(".howdi-app.v8")).toHaveAttribute("data-active-pillar", "works");
    }
    await page.reload();
    await expect(page.getByRole("button", { name: new RegExp(`My HOWDI, ${accounts.a.name}`) })).toBeVisible();
    await page.waitForTimeout(1200);
    if (width <= 760) await expect(dock.getByRole("button", { name: "Videos", exact: true })).toBeVisible();
    await screenshot(page, width, "reopened-restored-dock");

    await openPersonalise(page);
    await page.getByLabel("Personal label for Connect").fill("Cancelled");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    if (width <= 760) await expect(dock.getByRole("button", { name: "JobOpenings", exact: true })).toBeVisible();
    await openPersonalise(page);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await screenshot(page, width, "reset-default");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    if (width <= 760) {
      await expect(dock.locator("button span")).toHaveText(canonical);
      const spark = dock.getByRole("button", { name: "Spark", exact: true });
      const b = await spark.boundingBox(), db = await dock.boundingBox();
      expect(Math.abs((b.x + b.width / 2) - (db.x + db.width / 2))).toBeLessThanOrEqual(2);
    }
    await screenshot(page, width, "spark-centre");

    // Exercise all six canonical destinations through the actual responsive navigation.
    for (const label of canonical) {
      if (width > 760 && label === "Spark") {
        const beforeSpark = page.url();
        await page.getByRole("button", { name: "Ask HOWDI", exact: true }).click();
        await expect(page.getByRole("dialog", { name: "Spark" })).toBeVisible();
        await expect(page).toHaveURL(beforeSpark);
        await page.getByRole("button", { name: "Close", exact: true }).click();
        continue;
      }
      const beforePillar = page.url();
      const button = await getPillarButton(page, label);
      await button.click();
      if (label === "Spark") {
        await expect(page.getByRole("dialog", { name: "Spark" })).toBeVisible();
        await expect(page).toHaveURL(beforePillar);
        await page.getByRole("button", { name: "Close", exact: true }).click();
        continue;
      }
      await expect(page.locator(".howdi-app.v8")).toHaveAttribute("data-active-pillar", label === "Work" ? "works" : label === "Spark" ? "connect" : label.toLowerCase());
      if (label === "Move") {
        await expect(page.getByRole("heading", { name: /HOWDI\s+MOVE/i })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Move sections" })).toBeVisible();
        await screenshot(page, width, "real-move-screen");
      }
      if (label === "Connect") await expect(page.locator(".howdi-app.v8")).toHaveAttribute("data-active-pillar", "connect");
    }
    // Alias text is not the navigation/analytics feature identity.
    await page.goto("/");
    if (width <= 760) {
      await expect(dock.getByRole("button", { name: "Connect", exact: true })).toBeVisible();
      await expect(dock.getByRole("button", { name: "Shop", exact: true })).toBeVisible();
    }

    // A truly fresh browser context must retrieve A's server preference after login.
    const fresh = await browser.newContext({ viewport: { width, height: 900 } });
    const freshPage = await fresh.newPage();
    await freshPage.goto("/");
    await login(freshPage, accounts.a);
    if (width <= 760) await expect(freshPage.getByRole("navigation", { name: "Quick access" }).locator("button span")).toHaveText(canonical);
    await screenshot(freshPage, width, "fresh-session-restored");
    await fresh.close();

    // Offline and session expiry messaging remain readable and recovery stays available.
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(page.getByRole("alert")).toContainText("You’re offline");
    await screenshot(page, width, "offline");
    await page.evaluate(() => { window.dispatchEvent(new Event("online")); window.dispatchEvent(new Event("howdi:v8-session-expired")); });
    await expect(page.getByRole("dialog", { name: "Your session has expired" })).toBeVisible();
    await expect(page.getByText(/Please sign in again to continue/)).toBeVisible();
    await screenshot(page, width, "session-expired");
    // Signing in from an expired session clears A in memory before B loads; the old request
    // must be hidden immediately, without relying on a page reload or passive-effect timing.
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("status", { name: "Spark prepared request" })).toBeHidden();
    await loginFromOpenDialog(page, accounts.b);
    await expect(page.getByRole("status", { name: "Spark prepared request" })).toBeHidden();
    if (width <= 760) await expect(dock.locator("button span")).toHaveText(canonical);
    await screenshot(page, width, "account-switch-isolation");

    // Logout clears B; A can sign in again and reload only A's own server preference.
    await signOut(page);
    await expect(page.getByRole("status", { name: "Spark prepared request" })).toBeHidden();
    await expect(page.getByRole("dialog", { name: /Sign in with email|Welcome to HOWDI/i })).toBeVisible();
    if (width <= 760) await expect(dock.locator("button span")).toHaveText(canonical);
    await screenshot(page, width, "logout-cleared");
    await page.keyboard.press("Escape").catch(() => {});
    await login(page, accounts.a);
    await expect(page.getByRole("status", { name: "Spark prepared request" })).toBeHidden();
    if (width <= 760) await expect(dock.locator("button span")).toHaveText(canonical);

    const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: window.innerWidth }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
    expect(consoleErrors, `browser console/page errors at ${width}px`).toEqual([]);
    fs.appendFileSync(path.resolve("artifacts/b1-runtime/browser-console.log"), `${width}px: ${consoleErrors.length ? consoleErrors.join(" | ") : "no console errors or uncaught page errors"}\n`);
    console.log(`PASS ${width}px: responsive shell, canonical/default state, dock customization and recovery, navigation, account isolation. Console errors: ${consoleErrors.length}`);
    await context.close();
  });
}
