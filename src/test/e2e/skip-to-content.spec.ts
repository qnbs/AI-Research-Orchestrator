import { test, expect, type Page } from '@playwright/test';

/**
 * WS-F: skip-to-content link focuses `#main-content` without changing the view hash.
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

test.describe('WS-F skip to content', () => {
  test('Tab then Activate focuses main without rewriting the view hash', async ({ page }) => {
    await skipOnboarding(page);

    await page.evaluate(() => {
      window.location.hash = '#orchestrator';
    });
    await page.waitForFunction(() => window.location.hash === '#orchestrator');

    // First Tab should land on the skip link (visually revealed on focus).
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: /skip to main content/i });
    await expect(skip).toBeFocused();

    await page.keyboard.press('Enter');

    const main = page.locator('#main-content');
    await expect(main).toBeFocused();
    await expect(page).toHaveURL(/#orchestrator/);
  });

  test('main landmark is present and programmatically focusable', async ({ page }) => {
    await skipOnboarding(page);
    const main = page.locator('main#main-content');
    await expect(main).toBeVisible();
    await expect(main).toHaveAttribute('tabindex', '-1');
  });
});
