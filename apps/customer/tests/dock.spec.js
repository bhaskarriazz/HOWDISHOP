import { test, expect } from '@playwright/test';

const dock = (page) => page.locator('.v8-bottombar');
const spark = (page) => dock(page).getByRole('button', { name: /^Spark/ });
const row = (page, name) => page.locator('.v8-customize-row').filter({ has: page.locator('b', { hasText: new RegExp(`^${name}$`) }) });
const prefs = (page) => page.getByLabel('Saved preferences').textContent().then(JSON.parse);
const customize = async (page) => {
  await spark(page).click();
  await page.getByRole('button', { name: 'Customize Home', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => new URL(route.request().url()).origin === 'http://127.0.0.1:5173' ? route.continue() : route.abort());
  await page.goto('/tests/spark.html');
});

test('Spark preserves route; keyboard, focus, outside dismissal and six callbacks work', async ({ page }) => {
  await spark(page).focus();
  await page.keyboard.press('Enter');
  await expect(spark(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('Current route')).toHaveText('home');
  await expect(page.getByRole('button', { name: 'Customize Home', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(spark(page)).toBeFocused();
  await expect(spark(page)).toHaveAttribute('aria-expanded', 'false');
  await spark(page).click();
  await page.getByLabel('Current route').click();
  await expect(spark(page)).toHaveAttribute('aria-expanded', 'false');
  for (const [label, area] of [['Home', 'home'], ['Connect', 'connect'], ['Shop', 'shop'], ['Move', 'move'], ['Work', 'works'], ['Learn', 'learn']]) {
    await dock(page).getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByLabel('Current route')).toHaveText(area);
    await expect(dock(page).locator('[aria-current="page"]')).toHaveText(label);
  }
  await spark(page).click();
  await page.getByRole('button', { name: 'External Shop route' }).click();
  await expect(spark(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(dock(page).locator('[aria-current="page"]')).toHaveText('Shop');
});

test('order, visibility, favorites and Home modules persist per account across reload', async ({ page }) => {
  await customize(page);
  await row(page, 'Shop').getByRole('button', { name: 'Move left' }).click();
  await row(page, 'Connect').getByRole('button', { name: 'Hide', exact: true }).click();
  await row(page, 'Shop').getByRole('button', { name: 'Favorite', exact: true }).click();
  await row(page, 'Community').getByRole('button', { name: 'Hide', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const alice = await prefs(page);
  expect(alice.dock.slice(0, 3)).toEqual(['home', 'shop', 'connect']);
  expect(alice.hiddenDock).toEqual(['connect']);
  expect(alice.favoriteDock).toEqual(['shop']);
  expect(alice.hiddenModules).toContain('community');
  await page.reload();
  expect(await prefs(page)).toEqual(alice);
  await expect(dock(page).locator(':scope > button')).toHaveText(['Home', 'Shop', 'Move', 'Work', 'Learn', 'Spark']);
  await spark(page).click();
  await page.getByRole('group', { name: 'Spark actions' }).getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByLabel('Current route')).toHaveText('connect');
  await expect(spark(page)).toHaveAccessibleName('Spark — current pillar: Connect');
  await page.getByLabel('Account').selectOption('bob');
  expect((await prefs(page)).hiddenDock).toEqual([]);
  await customize(page);
  await row(page, 'Learn').getByRole('button', { name: 'Hide', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByLabel('Account').selectOption('guest');
  expect((await prefs(page)).hiddenDock).toEqual([]);
  await page.getByLabel('Account').selectOption('alice');
  expect(await prefs(page)).toEqual(alice);
  await customize(page);
  await row(page, 'Connect').getByRole('button', { name: 'Show', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await expect(dock(page).getByRole('button', { name: 'Connect', exact: true })).toBeVisible();
});

test('two-second hold opens customization without navigating; canceled and unmounted holds do not fire', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  const box = await dock(page).getByRole('button', { name: 'Shop', exact: true }).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(1999);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.clock.runFor(1);
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Current route')).toHaveText('home');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const shop = dock(page).getByRole('button', { name: 'Shop', exact: true });
  await shop.dispatchEvent('pointerdown', { isPrimary: true, button: 0, clientX: 100, clientY: 100 });
  await shop.dispatchEvent('pointercancel');
  await page.clock.runFor(2100);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await shop.dispatchEvent('pointerdown', { isPrimary: true, button: 0, clientX: 100, clientY: 100 });
  await shop.dispatchEvent('pointermove', { clientX: 120, clientY: 100 });
  await page.clock.runFor(2100);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await shop.dispatchEvent('pointerdown', { isPrimary: true, button: 0 });
  await page.getByRole('button', { name: 'Toggle dock' }).evaluate((el) => el.click());
  await page.clock.runFor(2100);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('mobile geometry, safe area and reduced motion; tablet/desktop keep rail and header', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const nav = dock(page);
  await expect(nav).toBeVisible();
  expect(await nav.locator('img').count()).toBe(0);
  const box = await nav.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(12);
  expect(box.x + box.width).toBeLessThanOrEqual(378);
  expect(box.y + box.height).toBeLessThanOrEqual(832);
  for (const button of await nav.locator(':scope > button').all()) {
    const bounds = await button.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  // Chromium does not expose a physical notch. Override its environment inset via CDP.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 44, left: 0, right: 0, bottom: 34 } });
  const insetBox = await nav.boundingBox();
  expect((await page.locator('.v8-header .v8-logo').boundingBox()).y).toBeGreaterThanOrEqual(44);
  expect(Math.round(box.y - insetBox.y)).toBe(34);
  expect(await page.locator('html').evaluate((el) => getComputedStyle(el).getPropertyValue('--v8-bottom'))).toContain('34px');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await nav.getByRole('button', { name: 'Shop', exact: true }).click();
  await expect(nav.locator('.is-tapped .v8-dock-ico')).toHaveCSS('animation-name', 'none');
  await spark(page).click();
  const panel = await page.getByRole('group', { name: 'Spark actions' }).boundingBox();
  expect(panel.y + panel.height).toBeLessThan(insetBox.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(nav).toBeHidden();
    await expect(page.locator('.v8-rail')).toBeVisible();
    await expect(page.locator('.v8-header')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(spark(page)).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
});

test('touch opens and closes Spark and enters customization', async ({ page }) => {
  await spark(page).tap();
  await expect(spark(page)).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Close Spark', exact: true }).tap();
  await expect(spark(page)).toHaveAttribute('aria-expanded', 'false');
  await spark(page).tap();
  await page.getByRole('button', { name: 'Customize Home', exact: true }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Current route')).toHaveText('home');
});

test('customer App mounts and six real navigation callbacks remain usable with backend unavailable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(dock(page)).toBeVisible();
  for (const label of ['Home', 'Connect', 'Shop', 'Move', 'Work', 'Learn']) {
    await dock(page).getByRole('button', { name: label, exact: true }).click();
    await expect(dock(page).locator('[aria-current="page"]')).toHaveText(label);
  }
  await customize(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(errors).toEqual([]);
});
