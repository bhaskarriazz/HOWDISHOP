// Run against the customer Vite dev server. See the dock spec for setup commands.
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.HOWDI_TEST_URL || 'http://127.0.0.1:5173';
const output = process.env.HOWDI_TEST_OUTPUT;
const prefsKey = 'howdi.v8.common-home.v1:';
const labels = ['Home', 'Connect', 'Shop', 'Move', 'Work', 'Learn'];
const areas = ['home', 'connect', 'shop', 'move', 'works', 'learn'];
const spark = (page) => page.getByRole('button', { name: /^Spark/ });
const popup = (page) => page.getByRole('dialog', { name: 'Spark quick actions' });
const customize = (page) => page.getByRole('dialog', { name: 'Customize Home' });
async function shot(page, name) { if (output) await page.screenshot({ path: path.join(output, `${name}.png`), animations: 'disabled' }); }
async function checkBounds(locator, width, height) {
  for (const element of await locator.all()) {
    if (!await element.isVisible()) continue;
    const box = await element.boundingBox();
    assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height - 10, JSON.stringify(box));
    assert(box.width >= 44 && box.height >= 44, `Small target: ${JSON.stringify(box)}`);
  }
}
(async () => {
  if (output) await mkdir(output, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  try {
    for (const [width, height] of [[390, 844], [768, 1024], [1440, 900], [320, 740]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: width <= 390, hasTouch: width <= 768 });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      // No live backend is required for this shell regression; preserve the app's error/empty UI.
      await page.route('**/*', async (route) => {
        if (!route.request().url().startsWith(base)) return route.abort();
        return route.continue();
      });
      await page.goto(base);
      await spark(page).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Home overflows viewport');
      const nav = page.locator(width <= 760 ? '.v8-bottombar' : '.v8-rail nav');
      assert.equal(await nav.getByRole('button').count(), 6);
      assert.equal(await page.locator('.v8-rail').isVisible(), width > 760);
      assert.equal(await page.locator('.v8-bottombar').isVisible(), width <= 760);
      await checkBounds(page.locator('.v8-floating-dock button'), width, height);
      assert.equal(await page.locator('.v8-bottombar .v8-avatar-btn').count(), 0);
      const before = page.url();
      await spark(page).click();
      await popup(page).waitFor();
      assert.equal(page.url(), before, 'Opening Spark changed route');
      await checkBounds(popup(page).getByRole('button'), width, height);
      await shot(page, `spark-${width}`);
      await page.keyboard.press('Escape');
      assert.equal(await popup(page).count(), 0);
      assert.equal(await spark(page).evaluate((el) => el === document.activeElement), true);
      await page.keyboard.press('Enter');
      await popup(page).getByRole('button', { name: 'Customize Home' }).focus();
      await page.keyboard.press('Tab');
      assert.equal(await popup(page).count(), 0, 'Tab out did not dismiss Spark');
      await spark(page).click();
      await popup(page).getByRole('button', { name: 'Search HOWDI' }).click();
      assert.equal(await page.getByRole('searchbox', { name: 'Search HOWDI' }).evaluate((el) => el === document.activeElement), true);
      await spark(page).click();
      await page.locator('.v8-header .v8-logo, .v8-rail .v8-logo').filter({ visible: true }).first().click();
      assert.equal(await popup(page).count(), 0, 'Outside pointer did not dismiss Spark');
      await spark(page).click();
      await popup(page).getByRole('button', { name: 'Customize Home' }).click();
      await customize(page).waitFor();
      await customize(page).getByRole('button', { name: 'Cancel', exact: true }).click();
      assert.equal(await spark(page).evaluate((el) => el === document.activeElement), true);
      for (let i = 0; i < labels.length; i++) {
        await nav.getByRole('button', { name: labels[i], exact: true }).click();
        await page.waitForFunction((area) => document.querySelector('.howdi-app').dataset.activePillar === area, areas[i]);
        assert.equal(await nav.locator('[aria-current="page"]').innerText(), labels[i]);
      }
      await nav.getByRole('button', { name: 'Home', exact: true }).click();
      await shot(page, `dock-${width}`);
      if (width === 390) {
        // Real touch events preserve the two-second entry and suppress navigation after a hold.
        const cdp = await context.newCDPSession(page);
        const box = await nav.getByRole('button', { name: 'Move', exact: true }).boundingBox();
        const touch = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
        await page.waitForTimeout(2150);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await customize(page).waitFor();
        assert.equal(await page.locator('.howdi-app').getAttribute('data-active-pillar'), 'home');
        await customize(page).getByRole('button', { name: 'Cancel', exact: true }).click();
        // Canceled gestures must not open customization later.
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await page.waitForTimeout(2100);
        assert.equal(await customize(page).count(), 0);
        // Save actual UI changes, then reload to verify ordering, hiding, favorites and modules.
        await spark(page).click();
        await popup(page).getByRole('button', { name: 'Customize Home' }).click();
        const move = customize(page).locator('.v8-customize-row').filter({ has: page.locator('b', { hasText: /^Move$/ }) }).first();
        await move.getByRole('button', { name: 'Move left' }).click();
        await move.getByRole('button', { name: 'Favorite', exact: true }).click();
        await move.getByRole('button', { name: 'Hide', exact: true }).click();
        const vibe = customize(page).locator('.v8-customize-row').filter({ has: page.locator('b', { hasText: /^Vibe$/ }) });
        await vibe.getByRole('button', { name: 'Pin', exact: true }).click();
        await customize(page).getByRole('button', { name: 'Done', exact: true }).click();
        await page.reload();
        await page.waitForFunction(() => document.querySelectorAll('.v8-bottombar button').length === 5);
        const prefs = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), prefsKey + 'guest');
        assert.deepEqual(prefs.dock, ['home', 'connect', 'move', 'shop', 'works', 'learn']);
        assert.deepEqual(prefs.hiddenDock, ['move']);
        assert.deepEqual(prefs.favoriteDock, ['move']);
        assert.deepEqual(prefs.pinnedModules, ['vibe']);
        await spark(page).click();
        await popup(page).getByRole('button', { name: 'Move', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.howdi-app').dataset.activePillar === 'move');
        assert.equal(await spark(page).getAttribute('data-active-pillar'), 'move');
        await spark(page).click();
        assert.equal(await popup(page).getByRole('button', { name: 'Move', exact: true }).getAttribute('aria-current'), 'page');
        await page.keyboard.press('Escape');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await spark(page).click();
        assert.equal(await popup(page).evaluate((el) => getComputedStyle(el).animationName), 'none');
        await popup(page).getByRole('button', { name: 'Close Spark' }).click();
        await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
        const colors = await spark(page).evaluate((el) => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
        assert.notEqual(colors.color, colors.background);
        await shot(page, 'dock-dark-390');
        // Deep links and browser history remain controlled by App.
        await page.goto(base + '/move');
        await page.waitForFunction(() => document.querySelector('.howdi-app')?.dataset.activePillar === 'move');
        await page.locator('.v8-bottombar').getByRole('button', { name: 'Home', exact: true }).click();
        await page.goBack();
        await page.waitForFunction(() => document.querySelector('.howdi-app')?.dataset.activePillar === 'move');
      }
      console.log(`PASS ${width}x${height}: shell, Spark, six routes, focus and target bounds`);
      await context.close();
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base + '/tests/dock-fixture.html');
    await spark(page).click();
    await popup(page).getByRole('button', { name: 'Customize Home' }).click();
    const shop = customize(page).locator('.v8-customize-row').filter({ has: page.locator('b', { hasText: /^Shop$/ }) });
    await shop.getByRole('button', { name: 'Hide', exact: true }).click();
    await customize(page).getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Switch account' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.v8-bottombar button').length === 6);
    await page.getByRole('button', { name: 'Switch account' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.v8-bottombar button').length === 5);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.v8-bottombar button').length === 5);
    // Unmount while holding: no delayed customization callback may survive.
    await page.locator('.v8-bottombar button').first().dispatchEvent('pointerdown', { isPrimary: true, button: 0, clientX: 30, clientY: 800 });
    await page.getByRole('button', { name: 'Unmount dock' }).click();
    await page.waitForTimeout(2100);
    assert.equal(await customize(page).count(), 0);
    assert.deepEqual(errors, [], 'React/browser runtime errors');
    console.log('PASS persistence, account isolation, hidden routes, long press/cancellation, unmount cleanup, reduced motion and history; no page errors');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
