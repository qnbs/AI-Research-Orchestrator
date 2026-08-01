/**
 * Shared Playwright helpers for E2E specs.
 * Prefer getByRole; keep waits justified and short.
 */
import type { Page } from '@playwright/test';

/**
 * Navigate to the app and skip the onboarding screen if it is shown.
 */
export async function skipOnboarding(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Keep KB empty for empty-state assertions (demo seed is for real first-run UX).
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

/**
 * Navigate to a view via in-page hash change (no full reload).
 */
export async function navigateToView(page: Page, viewHash: string) {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, viewHash);
  // Allow lazy Suspense boundaries to resolve
  await page.waitForTimeout(1_500);
}
