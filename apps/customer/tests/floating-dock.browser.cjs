// Run: DOCK_PLAYWRIGHT=/path/to/playwright node --test apps/customer/tests/floating-dock.browser.cjs
// Installs no test dependency in the application; follows the backend browser-test convention.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.DOCK_PLAYWRIGHT || 'playwright');

test('adaptive floating dock browser regression', async (t) => {
  const { createServer } = await import('vite');
  const server = await createServer({ root: path.resolve(__dirname, '..'), server: { port: 0, host: '127.0.0.1' } });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.DOCK_CHROMIUM || undefined, args: ['--no-sandbox'] });
  t.after(async () => { await browser.close(); await server.close(); });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const spark = page.getByRole('button', { name: /^Spark actions/ });
  const panel = page.getByRole('region', { name: 'Spark actions' });
  const dock = page.locator('.v8-bottombar');
  const current = page.getByLabel('Current pillar', { exact: true });
  const customize = async () => {
    await spark.click();
    await panel.getByRole('button', { name: 'Customize Home' }).click();
    await page.getByRole('dialog', { name: 'Customize Home' }).waitFor();
  };
  const row = (name) => page.locator('.v8-customize-row').filter({ has: page.locator('b', { hasText: new RegExp(`^${name}$`) }) });
  const shot = async (name) => {
    if (!process.env.DOCK_SHOTS) return;
    await fs.mkdir(process.env.DOCK_SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(process.env.DOCK_SHOTS, `${name}.png`) });
  };
  await page.goto(`${base}/tests/fixtures/floating-dock.html`);
  await spark.waitFor();

  await t.test('390px: all six callbacks, touch targets, selection and Spark focus', async () => {
    assert.equal(await dock.getByRole('button').count(), 6);
    for (const [label, area] of [['Home', 'home'], ['Connect', 'connect'], ['Shop', 'shop'], ['Move', 'move'], ['Work', 'works'], ['Learn', 'learn']]) {
      const button = dock.getByRole('button', { name: label, exact: true });
      const box = await button.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, `${label} touch target: ${JSON.stringify(box)}`);
      await button.tap();
      assert.equal(await current.textContent(), area);
      assert.equal(await button.getAttribute('aria-current'), 'page');
    }
    await spark.tap();
    assert.equal(await current.textContent(), 'learn', 'opening Spark does not navigate');
    assert.equal(await spark.getAttribute('aria-expanded'), 'true');
    assert.ok(await panel.getByRole('button', { name: 'Search HOWDI' }).evaluate((el) => el === document.activeElement));
    await shot('390-spark-open');
    await page.keyboard.press('Escape');
    assert.equal(await panel.count(), 0);
    assert.ok(await spark.evaluate((el) => el === document.activeElement));
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    assert.ok(await page.getByRole('searchbox').evaluate((el) => el === document.activeElement));
    await spark.click();
    await page.getByRole('heading', { name: 'Dock verification' }).click();
    assert.equal(await panel.count(), 0, 'outside pointer dismisses Spark');
    await spark.click();
    await spark.click();
    assert.equal(await panel.count(), 0, 'Spark toggles closed');
    await spark.click();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(await panel.count(), 0, 'tabbing out dismisses the nonmodal panel');
    await shot('390-dock');
  });

  await t.test('preferences persist across reloads and remain account scoped; hidden pillars reachable', async () => {
    await customize();
    await row('Learn').getByRole('button', { name: 'Move left' }).click();
    await row('Shop').getByRole('button', { name: 'Favorite', exact: true }).click();
    await row('Shop').getByRole('button', { name: 'Hide', exact: true }).click();
    await row('Community').getByRole('button', { name: 'Hide', exact: true }).click();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.reload();
    await spark.waitFor();
    assert.deepEqual(await dock.getByRole('button').allTextContents(), ['Home', 'Connect', 'Move', 'Learn', 'Work']);
    await spark.click();
    await panel.getByRole('button', { name: 'Shop', exact: true }).click();
    assert.equal(await current.textContent(), 'shop');
    assert.match(await spark.getAttribute('aria-label'), /current pillar: Shop/);
    await spark.click();
    assert.equal(await panel.getByRole('button', { name: 'Shop', exact: true }).getAttribute('aria-current'), 'page');
    await page.keyboard.press('Escape');
    await customize();
    assert.equal(await row('Shop').getByRole('button', { name: 'Unfavorite' }).count(), 1);
    assert.equal(await row('Community').getByRole('button', { name: 'Show', exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Switch account' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.v8-bottombar button').length === 6);
    await page.getByRole('button', { name: 'Switch account' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.v8-bottombar button').length === 5);
    await customize();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
  });

  await t.test('2s hold opens Customize without navigation; drag, cancel and unmount clear timer', async () => {
    const button = dock.getByRole('button', { name: 'Home', exact: true });
    const box = await button.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.getByRole('dialog', { name: 'Customize Home' }).waitFor();
    await page.mouse.up();
    await button.dispatchEvent('click', { detail: 1 });
    assert.equal(await current.textContent(), 'shop');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    for (const event of ['pointermove', 'pointercancel']) {
      await button.dispatchEvent('pointerdown', { isPrimary: true, button: 0, clientX: 10, clientY: 10 });
      await button.dispatchEvent(event, { clientX: 30, clientY: 10 });
      await page.waitForTimeout(2100);
      assert.equal(await page.getByRole('dialog').count(), 0, event);
    }
    await button.dispatchEvent('pointerdown', { isPrimary: true, button: 0 });
    await page.getByRole('button', { name: 'Unmount dock' }).evaluate((el) => el.click());
    await page.waitForTimeout(2100);
    assert.equal(await page.getByRole('dialog').count(), 0, 'unmount');
    await page.reload();
  });

  await t.test('320px, 390px, tablet and desktop bounds; desktop rail retained', async () => {
    for (const [width, height] of [[320, 700], [390, 844], [768, 1024], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await spark.waitFor();
      assert.equal(await dock.isVisible(), width <= 760);
      assert.equal(await page.locator('.v8-rail').isVisible(), width > 760);
      const control = await spark.boundingBox();
      assert.ok(control.x >= 0 && control.x + control.width <= width && control.y + control.height <= height - 12);
      if (width <= 760) {
        for (const button of await dock.getByRole('button').all()) {
          const box = await button.boundingBox();
          assert.ok(box.width >= 44 && box.height >= 44);
        }
      } else {
        await page.locator('.v8-rail').getByRole('button', { name: 'Move', exact: true }).click();
        assert.equal(await current.textContent(), 'move');
      }
      await spark.click();
      const bounds = await panel.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= control.y);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
      await shot(`${width}-layout`);
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await spark.click();
    assert.equal(await panel.evaluate((el) => getComputedStyle(el).animationName), 'none');
    await page.getByRole('button', { name: 'External Learn navigation' }).evaluate((el) => el.click());
    await panel.waitFor({ state: 'detached' });
  });
  await t.test('all hidden destinations fit a short narrow viewport', async () => {
    await page.setViewportSize({ width: 320, height: 400 });
    await customize();
    for (const name of ['Connect', 'Shop', 'Move', 'Work', 'Learn']) {
      await row(name).first().getByRole('button', { name: 'Hide', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await spark.click();
    assert.equal(await panel.getByRole('button').count(), 7);
    const bounds = await panel.boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height < 400);
    await panel.getByRole('button', { name: 'Learn', exact: true }).click();
    assert.equal(await current.textContent(), 'learn');
  });
  assert.deepEqual(errors, [], 'no React runtime errors');
});
