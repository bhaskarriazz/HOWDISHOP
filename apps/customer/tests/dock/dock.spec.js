import { test, expect } from '@playwright/test';

const dock = page => page.locator('.v8-bottombar');
const spark = page => page.getByRole('button', { name: 'Spark actions', exact: true });
const panel = page => page.getByRole('group', { name: 'Spark actions' });
const row = (page, name) => page.locator('.v8-customize-row').filter({ has: page.locator('b', { hasText: new RegExp(`^${name}$`) }) }).first();

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:5173' ? route.continue() : route.abort());
  await page.goto('/tests/dock/index.html');
});

test('390px: all six callbacks, selected pillar, one dock and usable targets', async ({ page }) => {
  await expect(dock(page).getByRole('button')).toHaveCount(6);
  for (const [label, area] of [['Home', 'home'], ['Connect', 'connect'], ['Shop', 'shop'], ['Move', 'move'], ['Work', 'works'], ['Learn', 'learn']]) {
    const button = dock(page).getByRole('button', { name: label, exact: true });
    const box = await button.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await button.click();
    await expect(page.getByTestId('active')).toHaveText(area);
    await expect(button).toHaveAttribute('aria-current', 'page');
    await expect(dock(page).locator('[aria-current]')).toHaveCount(1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.v8-floating-dock')).toHaveCount(1);
  await expect(dock(page).locator('img, .v8-avatar-btn')).toHaveCount(0);
});

test('Spark opens without navigation; closes by Escape, outside click and explicit close', async ({ page }) => {
  await spark(page).focus();
  await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(spark(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('active')).toHaveText('home');
  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect(spark(page)).toBeFocused();
  await spark(page).click();
  await page.getByRole('heading').click();
  await expect(panel(page)).toBeHidden();
  await spark(page).click();
  await page.getByRole('button', { name: 'Close Spark' }).click();
  await expect(spark(page)).toBeFocused();
  await spark(page).click();
  await page.getByRole('button', { name: 'External navigation' }).click();
  await expect(panel(page)).toBeHidden();
  await expect(dock(page).getByRole('button', { name: 'Move', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('customization persists order, visibility, favorites and home modules per account', async ({ page }) => {
  await spark(page).click();
  await panel(page).getByRole('button', { name: 'Customize Home', exact: true }).click();
  await row(page, 'Shop').getByRole('button', { name: 'Move left' }).click();
  await row(page, 'Shop').getByRole('button', { name: 'Favorite', exact: true }).click();
  await row(page, 'Learn').getByRole('button', { name: 'Hide', exact: true }).click();
  await row(page, 'Community').getByRole('button', { name: 'Pin', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const saved = await page.getByTestId('prefs').textContent();
  await page.reload();
  await expect(page.getByTestId('prefs')).toHaveText(saved);
  await expect(dock(page).getByRole('button')).toHaveText(['Home', 'Shop', 'Connect', 'Move', 'Work']);
  await spark(page).click();
  await panel(page).getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(page.getByTestId('active')).toHaveText('learn');
  await expect(panel(page)).toBeHidden();
  await spark(page).click();
  await expect(panel(page).getByRole('button', { name: 'Learn', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Escape');
  await page.getByLabel('Account').selectOption('bob');
  await expect(dock(page).getByRole('button')).toHaveText(['Home', 'Connect', 'Shop', 'Move', 'Work', 'Learn']);
  expect(JSON.parse(await page.getByTestId('prefs').textContent()).favoriteDock).toEqual([]);
  await page.getByLabel('Account').selectOption('alice');
  await expect(page.getByTestId('prefs')).toHaveText(saved);
  await spark(page).click();
  await panel(page).getByRole('button', { name: 'Customize Home', exact: true }).click();
  await row(page, 'Learn').getByRole('button', { name: 'Show', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dock(page).getByRole('button', { name: 'Learn', exact: true })).toBeVisible();
});

test('two-second hold customizes without navigating; canceled and unmounted holds do not fire', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  const button = dock(page).getByRole('button', { name: 'Shop', exact: true });
  await button.hover();
  await page.mouse.down();
  await page.clock.fastForward(1999);
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.clock.fastForward(1);
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('active')).toHaveText('home');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await button.hover();
  await page.mouse.down();
  await page.mouse.move(1, 1);
  await page.clock.fastForward(2100);
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toBeHidden();
  await button.hover();
  await page.mouse.down();
  await page.getByRole('button', { name: 'Unmount dock' }).evaluate(el => el.click());
  await page.clock.fastForward(2100);
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toBeHidden();
});

for (const width of [768, 1440]) {
  test(`${width}px preserves the desktop rail and closes Spark on resize`, async ({ page }) => {
    await spark(page).click();
    await page.setViewportSize({ width, height: 900 });
    await expect(panel(page)).toBeHidden();
    await expect(page.locator('.v8-floating-dock')).toBeHidden();
    await expect(page.locator('.v8-rail')).toBeVisible();
    await page.locator('.v8-rail').getByRole('button', { name: 'Move', exact: true }).click();
    await expect(page.getByTestId('active')).toHaveText('move');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('reduced motion covers held/pressed states and safe area reserves content space', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await dock(page).getByRole('button', { name: 'Shop', exact: true }).hover();
  await page.mouse.down();
  const icon = dock(page).getByRole('button', { name: 'Shop', exact: true }).locator('i');
  expect(await icon.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  expect(await icon.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => document.documentElement.dataset.motion = 'reduced');
  await dock(page).getByRole('button', { name: 'Shop', exact: true }).click();
  expect(await icon.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  // Desktop Chromium reports zero inset. Inject 34px into the actual styles to
  // exercise the same declarations with a notched-device inset.
  await page.evaluate(async () => {
    const css = await (await fetch('/src/v8/v8.css?direct')).text();
    const style = document.createElement('style');
    style.textContent = css.replace(/env\(safe-area-inset-bottom(?:,\s*0px)?\)/g, '34px');
    document.head.append(style);
  });
  const box = await page.locator('.v8-floating-dock').boundingBox();
  expect(844 - box.y - box.height).toBeGreaterThanOrEqual(46);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--v8-bottom').trim())).toBe('calc(84px + 34px)');
});

test('touch opens Spark and customization', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:5173' ? route.continue() : route.abort());
  await page.goto('http://127.0.0.1:5173/tests/dock/index.html');
  await spark(page).tap();
  await expect(panel(page)).toBeVisible();
  await panel(page).getByRole('button', { name: 'Customize Home', exact: true }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await context.close();
});

test('full app guest shell boots and Spark uses the App customization callback', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(dock(page)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('390-dock.png') });
  await spark(page).click();
  await expect(panel(page)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('390-spark.png') });
  await panel(page).getByRole('button', { name: 'Customize Home', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Customize Home' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  for (const label of ['Connect', 'Shop', 'Move', 'Work', 'Learn', 'Home']) {
    const button = dock(page).getByRole('button', { name: label, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-current', 'page');
  }
  for (const width of [768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.v8-rail')).toBeVisible();
    await expect(page.locator('.v8-floating-dock')).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath(`${width}-shell.png`) });
  }
});
