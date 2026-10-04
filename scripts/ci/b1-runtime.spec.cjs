const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const { viewportAccounts, password } = JSON.parse(fs.readFileSync("artifacts/b1-runtime/accounts.json", "utf8"));
const { Pool } = require("pg");
const sizes = [390, 768, 1440];
const dockCanonical = ["Connect", "Shop", "Spark", "Move", "Work", "Learn"];
const railCanonical = ["Home", "Connect", "Shop", "Move", "Work", "Learn"];
const evidenceRoot = path.resolve("artifacts/b1-runtime/screenshots");
fs.mkdirSync(evidenceRoot, { recursive: true });

async function waitForApiIdle(page, pending) {
  const deadline = Date.now() + 10000;
  let quietSince = null;
  while (Date.now() < deadline) {
    if (pending.size === 0) {
      if (quietSince === null) quietSince = Date.now();
      if (Date.now() - quietSince >= 250) return;
    } else {
      quietSince = null;
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`API requests did not settle before navigation: ${[...pending].map((request) => request.url()).join(", ")}`);
}
async function screenshot(page, width, name) {
  await page.screenshot({ path: path.join(evidenceRoot, `${width}-${name}.png`), fullPage: true });
}
async function login(page, account, pendingApi) {
  const access = page.locator("[data-v8-access]");
  if (!(await access.isVisible().catch(() => false))) {
    await page.getByRole("banner").getByRole("button", { name: "Sign in", exact: true }).click();
  }
  await expect(access).toBeVisible();
  await access.getByRole("button", { name: /Sign in with email/i }).click();
  const dialog = page.getByRole("dialog", { name: /Sign in with email/i });
  await dialog.getByRole("textbox", { name: "Email", exact: true }).fill(account.email);
  await dialog.getByLabel("Password", { exact: true }).fill(password);
  const loginResponse = page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  const signed = await loginResponse;
  expect(signed.status()).toBe(200);
  const identity = await signed.json();
  await expect(page.getByRole("button", { name: new RegExp(`My HOWDI, ${account.name}`) })).toBeVisible({ timeout: 30000 });
  const onboarding = page.locator('[data-v8-access="onboarding"]');
  if (!identity.user?.public_username) {
    await expect(onboarding).toBeVisible();
    // Complete the required display-name field through the real onboarding UI.
    await onboarding.locator("label.v8a-field").filter({ hasText: "Your name" }).locator("input").fill(account.name);
    const handle = account.email.split("@")[0].replace(/[^a-z0-9._]/g, "").slice(0, 30);
    await onboarding.locator("label.v8a-field").filter({ hasText: "Your public @handle" }).locator("input").fill(handle);
    await expect(onboarding.locator(".v8a-handle")).toHaveClass(/ok/, { timeout: 15000 });
    await onboarding.getByRole("checkbox").check();
    await screenshot(page, page.viewportSize().width, `onboarding-${account.email.includes("-a-") ? "a" : "b"}`);
    const profileResponse = page.waitForResponse((response) => response.url().endsWith("/api/v8/onboarding/profile") && response.request().method() === "POST");
    await onboarding.getByRole("button", { name: "Create profile", exact: true }).click();
    const saved = await profileResponse;
    const profile = await saved.json();
    expect(saved.status(), JSON.stringify(profile)).toBe(200);
    expect(profile.profile).toMatchObject({ public_username: handle, display_name: account.name });
    // The onboarding selector disappears during ob-saving/ob-done as well. Wait for
    // the whole access dialog to close after the real onOnboarded callback instead.
    await expect(page.locator("[data-v8-access]")).toBeHidden({ timeout: 30000 });
    fs.appendFileSync(path.resolve("artifacts/b1-runtime/onboarding.log"), `PASS ${account.email}: real UI profile POST 200; profile dialog closed\n`);
  }
  await page.waitForTimeout(1200); // auth/onboarding transition before assertions/screenshots
  if (pendingApi) await waitForApiIdle(page, pendingApi);
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
  // The real logout flow reloads directly into V8Access's welcome screen.
  await expect(page.locator('[data-v8-access="welcome"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".v8-avatar-btn")).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("howdiSessionToken"))).toBeNull();
}
function getPillarButton(page, label) {
  const dock = page.getByRole("navigation", { name: "Quick access" });
  const rail = page.getByRole("navigation", { name: "Main" });
  return dock.isVisible().then((visible) => visible ? dock.getByRole("button", { name: label, exact: true }) : rail.getByRole("button", { name: label, exact: true }));
}

test("Spark is physically centred in the floating dock at 390px", async ({ browser }) => {
  const width = 390;
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto("/");
  const dock = page.getByRole("navigation", { name: "Quick access" });
  await page.screenshot({ path: path.join(evidenceRoot, `${width}-spark-centre-proof.png`), fullPage: true });
  await expect(dock).toBeVisible();
  const spark = dock.getByRole("button", { name: "Spark", exact: true });
  const sparkBox = await spark.boundingBox(), dockBox = await dock.boundingBox();
  expect(Math.abs((sparkBox.x + sparkBox.width / 2) - (dockBox.x + dockBox.width / 2))).toBeLessThanOrEqual(2);
  await page.close();
});

for (const width of sizes) {
  test(`B1 runtime flow at ${width}px`, async ({ browser }) => {
    const accounts = viewportAccounts[String(width)];
    expect(accounts, `independent malformed-preference/onboarding fixtures for ${width}px`).toBeTruthy();
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const consoleErrors = [];
    const requestFailures = [];
    const expectedDenials = [];
    const expectedDenialUrls = new Set();
    const denialConsoleMessages = [];
    let expiredToken = "";
    let phase = "home-and-dock";
    function observe(target) {
    const pendingApi = new Set();
    target.on("request", (request) => { if (request.url().includes("/api/")) pendingApi.add(request); });
    target.on("requestfinished", (request) => pendingApi.delete(request));
    target.on("console", (message) => {
      if (message.type() !== "error") return;
      if (/status of 401 \(Unauthorized\)/.test(message.text())) {
        // Chromium may emit its console message before the response event.
        // Resolve it later against recorded, session-correlated 401 responses.
        denialConsoleMessages.push({ phase, url: message.location().url, text: message.text() });
      } else consoleErrors.push(`[${phase}] ${message.text()}`);
    });
    target.on("pageerror", (error) => consoleErrors.push(`[${phase}] PAGEERROR ${error.message}`));
    target.on("requestfailed", (request) => {
      pendingApi.delete(request);
      requestFailures.push(`[${phase}] ${request.url()} :: ${request.failure()?.errorText || "unknown"}`);
    });
    target.on("response", (response) => {
      const request = response.request();
      const authorization = request.headers().authorization || "";
      const expiredSessionRequest = expiredToken && authorization === `Bearer ${expiredToken}`;
      const signedOutPresenceCleanup = !authorization && request.method() === "POST" && response.url().endsWith("/api/connect/presence/offline");
      const expectedExpiryDenial = phase === "offline-and-session-expiry" && (expiredSessionRequest || signedOutPresenceCleanup);
      const expectedLogoutDenial = response.status() === 401 && (phase === "logout-and-account-switch" || expectedExpiryDenial);
      if (expectedLogoutDenial) {
        expectedDenialUrls.add(`${phase} ${response.url()}`);
        expectedDenials.push(`[${phase}] ${request.method()} ${new URL(response.url()).pathname}: 401 (${authorization ? "expired/revoked token" : "signed-out presence cleanup"})`);
      }
      if (response.status() >= 400 && !expectedLogoutDenial) consoleErrors.push(`[${phase}] HTTP ${response.status()} ${response.url()}`);
    });
    return pendingApi;
    }
    const pendingApi = observe(page);
    const prefix = `http://127.0.0.1:5000`;
    await page.goto("/");
    await expect(page.locator(".howdi-app.v8")).toBeVisible();
    await expect(page.getByRole("button", { name: "HOWDI Home" })).toBeVisible();
    await expect(page.getByRole("button", { name: "HOWDI Home" })).toHaveText("HOWDI");
    await expect(page.locator(".v8-build")).toContainText("B1-CI-");
    await waitForApiIdle(page, pendingApi);
    await screenshot(page, width, "home");

    const dock = page.getByRole("navigation", { name: "Quick access" });
    if (width <= 760) {
      await expect(dock).toBeVisible();
      const labels = await dock.locator("button span").allTextContents();
      expect(labels).toEqual(dockCanonical);
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
      for (const label of railCanonical) await expect(rail.getByRole("button", { name: label, exact: true })).toBeVisible();
      const askHowdi = page.getByRole("button", { name: /Ask HOWDI/i });
      await expect(askHowdi).toBeVisible();
      await askHowdi.click();
      await expect(page).toHaveURL(/\/connect\/ask/);
      await page.getByRole("button", { name: "HOWDI Home" }).first().click();
      await expect(page).toHaveURL(/\/$/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await screenshot(page, width, "default-dock");

    await login(page, accounts.a, pendingApi);
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
    if (width <= 760) await expect(dock.locator("button span")).toHaveText(dockCanonical);
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
    const customizedFreshPending = observe(customizedFreshPage);
    await customizedFreshPage.goto("/");
    await login(customizedFreshPage, accounts.a, customizedFreshPending);
    if (width <= 760) {
      const freshDock = customizedFreshPage.getByRole("navigation", { name: "Quick access" });
      await expect(freshDock.getByRole("button", { name: "JobOpenings", exact: true })).toBeVisible();
      await expect(freshDock.getByRole("button", { name: "Videos", exact: true })).toBeVisible();
    }
    await screenshot(customizedFreshPage, width, "fresh-session-customised");
    await waitForApiIdle(customizedFreshPage, customizedFreshPending);
    await customizedFresh.close();
    if (width <= 760) {
      await waitForApiIdle(page, pendingApi);
      await dock.getByRole("button", { name: "JobOpenings", exact: true }).click();
      await expect(page.locator(".howdi-app.v8")).toHaveAttribute("data-active-pillar", "connect");
      await waitForApiIdle(page, pendingApi);
      await dock.getByRole("button", { name: "Videos", exact: true }).click();
      await expect(page.locator(".howdi-app.v8")).toHaveAttribute("data-active-pillar", "connect");
      await expect(page).toHaveURL(/\/connect\/vibe/);
      await waitForApiIdle(page, pendingApi);
      await dock.getByRole("button", { name: "Jobs", exact: true }).click();
      await expect(page.locator(".howdi-app.v8")).toHaveAttribute("data-active-pillar", "works");
    }
    // Reloading with the Connect feed still in flight created ERR_ABORTED and a
    // genuine console error in the old fixture. Keep the zero-error assertion.
    await waitForApiIdle(page, pendingApi);
    await page.reload();
    await expect(page.getByRole("button", { name: new RegExp(`My HOWDI, ${accounts.a.name}`) })).toBeVisible();
    await page.waitForTimeout(1200);
    if (width <= 760) await expect(dock.getByRole("button", { name: "Videos", exact: true })).toBeVisible();
    await screenshot(page, width, "reopened-restored-dock");

    phase = "customized-account-switch";
    // Switch while A's custom aliases are still saved, then verify B's own defaults and A's reload.
    await waitForApiIdle(page, pendingApi);
    await signOut(page);
    await waitForApiIdle(page, pendingApi);
    await page.keyboard.press("Escape").catch(() => {});
    await login(page, accounts.b, pendingApi);
    await openPersonalise(page);
    const accountBDialog = page.getByRole("dialog", { name: "Customize Home" });
    await expect(accountBDialog.getByLabel("Personal label for Connect")).toHaveValue("");
    await expect(accountBDialog.getByLabel("Replace Shop")).toHaveValue("shop");
    await screenshot(page, width, "account-switch-custom-A-isolation");
    await accountBDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await waitForApiIdle(page, pendingApi);
    await signOut(page);
    await waitForApiIdle(page, pendingApi);
    await page.keyboard.press("Escape").catch(() => {});
    await login(page, accounts.a, pendingApi);
    await openPersonalise(page);
    const restoredADialog = page.getByRole("dialog", { name: "Customize Home" });
    await expect(restoredADialog.getByLabel("Personal label for Connect")).toHaveValue("JobOpenings");
    await expect(restoredADialog.getByLabel("Personal label for Vibe")).toHaveValue("Videos");
    await restoredADialog.getByRole("button", { name: "Cancel", exact: true }).click();

    await openPersonalise(page);
    await page.getByLabel("Personal label for Connect").fill("Cancelled");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    if (width <= 760) await expect(dock.getByRole("button", { name: "JobOpenings", exact: true })).toBeVisible();
    await openPersonalise(page);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await screenshot(page, width, "reset-default");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    if (width <= 760) {
      await expect(dock.locator("button span")).toHaveText(dockCanonical);
      const spark = dock.getByRole("button", { name: "Spark", exact: true });
      const b = await spark.boundingBox(), db = await dock.boundingBox();
      expect(Math.abs((b.x + b.width / 2) - (db.x + db.width / 2))).toBeLessThanOrEqual(2);
    }
    await screenshot(page, width, "spark-centre");

    phase = "canonical-navigation";
    // Exercise all six canonical destinations through the actual responsive navigation.
    for (const label of dockCanonical) {
      if (width > 760 && label === "Spark") {
        await waitForApiIdle(page, pendingApi);
        await page.getByRole("button", { name: /Ask HOWDI/i }).click();
        await expect(page.locator(".howdi-app.v8")).toHaveAttribute("data-active-pillar", "connect");
        await expect(page).toHaveURL(/\/connect\/ask/);
        await waitForApiIdle(page, pendingApi);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        continue;
      }
      const button = await getPillarButton(page, label);
      await waitForApiIdle(page, pendingApi);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await button.click();
      await expect(page.locator(".howdi-app.v8")).toHaveAttribute("data-active-pillar", label === "Work" ? "works" : label === "Spark" ? "connect" : label.toLowerCase());
      if (label === "Spark") await expect(page).toHaveURL(/\/connect\/ask/);
      if (label === "Move") {
        await expect(page.getByRole("heading", { name: /HOWDI\s+MOVE/i })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Move sections" })).toBeVisible();
        await expect(page.getByText("Preview / Test", { exact: true })).toBeVisible();
        await screenshot(page, width, "real-move-screen");
      }
      if (label === "Connect") await expect(page.locator(".howdi-app.v8")).toHaveAttribute("data-active-pillar", "connect");
      await waitForApiIdle(page, pendingApi);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    // Alias text is not the navigation/analytics feature identity.
    await waitForApiIdle(page, pendingApi);
    await page.goto("/");
    if (width <= 760) {
      await expect(dock.getByRole("button", { name: "Connect", exact: true })).toBeVisible();
      await expect(dock.getByRole("button", { name: "Shop", exact: true })).toBeVisible();
    }

    phase = "fresh-session";
    // A truly fresh browser context must retrieve A's server preference after login.
    const fresh = await browser.newContext({ viewport: { width, height: 900 } });
    const freshPage = await fresh.newPage();
    const freshPending = observe(freshPage);
    await freshPage.goto("/");
    await login(freshPage, accounts.a, freshPending);
    if (width <= 760) await expect(freshPage.getByRole("navigation", { name: "Quick access" }).locator("button span")).toHaveText(dockCanonical);
    await screenshot(freshPage, width, "fresh-session-restored");
    await waitForApiIdle(freshPage, freshPending);
    await fresh.close();

    phase = "offline-and-session-expiry";
    // Offline and session expiry messaging remain readable and recovery stays available.
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(page.locator(".v8-offline")).toContainText("You’re offline");
    await screenshot(page, width, "offline");
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await waitForApiIdle(page, pendingApi);
    expiredToken = await page.evaluate(() => localStorage.getItem("howdiSessionToken"));
    const expiryPool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const expired = await expiryPool.query("UPDATE user_sessions SET expires_at=NOW()-INTERVAL '1 minute' WHERE session_token=$1 AND is_active=TRUE", [expiredToken]);
      expect(expired.rowCount).toBe(1);
    } finally { await expiryPool.end(); }
    const deniedStatus = await page.evaluate(async (api) => (await fetch(`${api}/api/preferences/me`, { headers: { Authorization: `Bearer ${localStorage.getItem("howdiSessionToken")}` } })).status, prefix);
    expect(deniedStatus).toBe(401);
    await expect(page.getByRole("dialog", { name: "Your session has expired" })).toBeVisible();
    await expect(page.getByText(/Please sign in again to continue/)).toBeVisible();
    await screenshot(page, width, "session-expired");
    // Recover through the expired-session dialog. Opening My HOWDI with this
    // expired token correctly asks for sign-in again; it cannot be a logout fixture.
    await page.getByRole("dialog", { name: "Your session has expired" }).getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Your session has expired" })).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem("howdiSessionToken"))).toBeNull();
    fs.appendFileSync(path.resolve("artifacts/b1-runtime/session-expiry.log"), `PASS ${width}px: PostgreSQL deadline expired; real preference GET denied 401; expiry dialog shown; Sign in recovery cleared session token\n`);

    phase = "logout-and-account-switch";
    // Expiry recovery clears A; login B has independent defaults. B's real logout
    // and A's new login then prove ordinary logout and account transition cleanup.
    await waitForApiIdle(page, pendingApi);
    await expect(page.getByRole("banner").getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: /Sign in with email|Welcome to HOWDI/i })).toBeVisible();
    if (width <= 760) await expect(dock.locator("button span")).toHaveText(dockCanonical);
    await screenshot(page, width, "logout-cleared");
    await page.keyboard.press("Escape").catch(() => {});
    await login(page, accounts.b, pendingApi);
    if (width <= 760) await expect(dock.locator("button span")).toHaveText(dockCanonical);
    await screenshot(page, width, "account-switch-isolation");
    await waitForApiIdle(page, pendingApi);
    await signOut(page);
    await waitForApiIdle(page, pendingApi);
    await page.keyboard.press("Escape").catch(() => {});
    await login(page, accounts.a, pendingApi);
    if (width <= 760) await expect(dock.locator("button span")).toHaveText(dockCanonical);

    const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: window.innerWidth }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
    for (const message of denialConsoleMessages) {
      if (!expectedDenialUrls.has(`${message.phase} ${message.url}`)) consoleErrors.push(`[${message.phase}] ${message.text}`);
    }
    expect(consoleErrors, `browser console/page errors at ${width}px`).toEqual([]);
    const unexpectedRequestFailures = requestFailures.filter((failure) => !failure.endsWith("net::ERR_ABORTED"));
    expect(unexpectedRequestFailures, `unexpected API request failures at ${width}px`).toEqual([]);
    fs.appendFileSync(path.resolve("artifacts/b1-runtime/expected-auth-denials.log"), `${width}px: ${expectedDenials.join(" | ")}\n`);
    fs.appendFileSync(path.resolve("artifacts/b1-runtime/browser-console.log"), `${width}px: ${consoleErrors.length ? consoleErrors.join(" | ") : "no console errors or uncaught page errors"}; ${requestFailures.length - unexpectedRequestFailures.length} expected request cancellations during route/auth transitions\n`);
    console.log(`PASS ${width}px: responsive shell, canonical/default state, dock customization and recovery, navigation, account isolation. Console errors: ${consoleErrors.length}`);
    await context.close();
  });
}
