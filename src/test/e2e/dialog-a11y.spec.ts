import { test, expect, type Page } from '@playwright/test';

/**
 * WS-G: dialog pattern — Escape dismisses Quick Add; body scroll is locked.
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

test.describe('WS-G dialog a11y', () => {
  test('Escape closes Quick Add dialog and restores body scroll', async ({ page }) => {
    await skipOnboarding(page);

    await page
      .getByRole('button', { name: /quick add/i })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const overflowWhileOpen = await page.evaluate(() => document.body.style.overflow);
    expect(overflowWhileOpen).toBe('hidden');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    const overflowAfterClose = await page.evaluate(() => document.body.style.overflow);
    expect(overflowAfterClose).not.toBe('hidden');
  });
});
