import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * WS-E keyboard focus walk — focused controls gain a focus-specific
 * outline/box-shadow vs their unfocused baseline.
 */

const skipOnboarding = async (page: Page) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => {
    try {
      localStorage.setItem('aro.demoDataDismissed', '1');
      localStorage.setItem('aro.demoDataSeeded', '1');
    } catch {
      /* ignore */
    }
  });

  const startBtn = page.getByRole('button', { name: /start researching/i });
  const header = page.locator('header');
  await Promise.race([
    startBtn.waitFor({ state: 'visible', timeout: 15_000 }),
    header.waitFor({ state: 'visible', timeout: 15_000 }),
  ]);
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await header.waitFor({ state: 'visible', timeout: 10_000 });
  }
};

const focusStyles = (locator: Locator) =>
  locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      outline: `${cs.outlineStyle}|${cs.outlineWidth}|${cs.outlineColor}`,
      boxShadow: cs.boxShadow,
    };
  });

/** Assert a focus-driven style change vs unfocused baseline. */
const expectFocusIndicator = async (locator: Locator, label: string) => {
  await expect(locator).toBeVisible();
  await locator.focus();
  await expect(locator).toBeFocused();
  const focused = await focusStyles(locator);
  await locator.evaluate((el) => el.blur());
  const unfocused = await focusStyles(locator);
  const changed =
    focused.outline !== unfocused.outline || focused.boxShadow !== unfocused.boxShadow;
  expect(
    changed,
    `${label}: no focus-specific outline/box-shadow change (focused=${focused.outline}/${focused.boxShadow}; unfocused=${unfocused.outline}/${unfocused.boxShadow})`,
  ).toBe(true);
};

/** Capture styles produced by Tab (keyboard :focus-visible path). */
const expectTabFocusIndicator = async (page: Page, label: string) => {
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible({ timeout: 5000 });
  const tag = await focused.evaluate((el) => el.tagName.toLowerCase());
  if (tag === 'body' || tag === 'html') return;
  const onStyles = await focusStyles(focused);
  await focused.evaluate((el) => el.blur());
  const offStyles = await focusStyles(focused);
  const changed =
    onStyles.outline !== offStyles.outline || onStyles.boxShadow !== offStyles.boxShadow;
  expect(changed, `${label} <${tag}>: Tab focus produced no style delta`).toBe(true);
};

test.describe('Keyboard focus visibility (WS-E)', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('header settings and bottom nav show focus rings', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const settings = page.getByRole('button', { name: /settings/i }).first();
    await expectFocusIndicator(settings, 'settings button');

    await page.setViewportSize({ width: 390, height: 844 });
    const home = page.locator('nav.fixed button, nav[class*="fixed"] button').first();
    // Bottom nav is md:hidden fixed — ensure a nav button exists
    const bottomNavBtn = page
      .locator('nav')
      .filter({ hasText: /home|start|orchestrator/i })
      .getByRole('button')
      .first();
    const target = (await bottomNavBtn.count()) > 0 ? bottomNavBtn : home;
    await expectFocusIndicator(target, 'bottom nav item');
  });

  test('command palette input shows a focus ring', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.keyboard.press('Control+KeyK');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const input = dialog.locator('input').first();
    await expectFocusIndicator(input, 'command palette input');
    await page.keyboard.press('Escape');
  });

  test('orchestrator topic field shows a focus ring', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => {
      window.location.hash = '#/orchestrator';
    });
    const topic = page.getByRole('textbox').first();
    await expect(topic).toBeVisible({ timeout: 10_000 });
    await expectFocusIndicator(topic, 'orchestrator topic input');
  });

  test('Tab traversal keeps a focus-specific indicator', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Seed keyboard modality so :focus-visible matches on subsequent Tabs.
    await page
      .locator('body')
      .click({ position: { x: 1, y: 1 } })
      .catch(() => undefined);
    await page.keyboard.press('Tab');
    for (let i = 0; i < 5; i++) {
      await expectTabFocusIndicator(page, `tab stop ${i + 1}`);
    }
  });
});
