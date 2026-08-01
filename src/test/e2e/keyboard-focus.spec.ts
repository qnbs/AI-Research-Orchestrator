import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * WS-E keyboard focus walk — Tab moves focus and the focused control gains a
 * focus-specific outline/box-shadow (compare focused vs unfocused styles).
 */

async function skipOnboarding(page: Page) {
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
}

async function focusStyles(locator: Locator) {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      outline: `${cs.outlineStyle}|${cs.outlineWidth}|${cs.outlineColor}`,
      boxShadow: cs.boxShadow,
    };
  });
}

/** Assert the element shows a focus-driven style change vs its unfocused baseline. */
async function expectFocusIndicator(locator: Locator, label: string) {
  await expect(locator).toBeVisible();
  await locator.focus();
  await expect(locator).toBeFocused();

  const focused = await focusStyles(locator);

  // Blur via focusing body, then re-read baseline without :focus-visible
  await locator.evaluate((el) => {
    el.blur();
  });
  const unfocused = await focusStyles(locator);

  const outlineChanged = focused.outline !== unfocused.outline;
  const shadowChanged = focused.boxShadow !== unfocused.boxShadow;
  expect(
    outlineChanged || shadowChanged,
    `${label}: no focus-specific outline/box-shadow change (focused=${focused.outline}/${focused.boxShadow}; unfocused=${unfocused.outline}/${unfocused.boxShadow})`,
  ).toBe(true);
}

test.describe('Keyboard focus visibility (WS-E)', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('header chrome and bottom nav show focus rings', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const settings = page.getByRole('button', { name: /settings/i }).first();
    await expectFocusIndicator(settings, 'settings button');

    await page.setViewportSize({ width: 390, height: 844 });
    const bottomNav = page
      .locator('nav')
      .filter({ has: page.getByRole('button') })
      .last();
    const home = bottomNav.getByRole('button').first();
    await expectFocusIndicator(home, 'bottom nav item');
  });

  test('command palette input shows a focus ring', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.keyboard.press('Control+K');
    const input = page.getByRole('combobox').or(page.locator('[cmdk-input]')).first();
    // Fallback: first textbox in the dialog
    const target =
      (await input.count()) > 0 ? input : page.getByRole('dialog').locator('input').first();
    await expectFocusIndicator(target, 'command palette input');
    await page.keyboard.press('Escape');
  });

  test('orchestrator topic field and research accordion show focus rings', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => {
      window.location.hash = '#/orchestrator';
    });
    const topic = page.getByRole('textbox').first();
    await expectFocusIndicator(topic, 'orchestrator topic input');

    await page.evaluate(() => {
      window.location.hash = '#/research';
    });
    // Research accordion toggle (first button in main if present)
    const accordion = page.locator('main button').first();
    if (await accordion.isVisible().catch(() => false)) {
      await expectFocusIndicator(accordion, 'research accordion');
    }
  });

  test('Tab traversal keeps a focus-specific indicator', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page
      .locator('body')
      .click({ position: { x: 0, y: 0 } })
      .catch(() => undefined);

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      if ((await focused.count()) === 0) break;
      const tag = await focused.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'body' || tag === 'html') continue;
      await expectFocusIndicator(focused, `tab stop ${i + 1} <${tag}>`);
    }
  });
});
