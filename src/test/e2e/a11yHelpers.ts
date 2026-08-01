import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Skip onboarding and suppress demo-seed side effects so a11y smoke stays deterministic.
 */
export const skipOnboardingForA11y = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => {
    try {
      localStorage.setItem('aro.demoDataDismissed', '1');
      localStorage.setItem('aro.demoDataSeeded', '1');
    } catch {
      /* ignore quota / private mode */
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

/** In-page hash navigation without full reload (matches production hash router). */
export const navigateToViewHash = async (page: Page, viewHash: string): Promise<void> => {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, viewHash);
  // Lazy Suspense views need a beat to mount before axe scans the tree.
  await page.waitForTimeout(1_500);
};

/**
 * Fail on critical/serious axe findings inside `#root` (WCAG 2 A/AA tags only).
 * Moderate/minor noise is intentionally ignored — see meeting notes / P1-5.
 */
export const expectNoCriticalAxeViolations = async (page: Page): Promise<void> => {
  await expect(page.locator('#root')).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const critical = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(critical, critical.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
};
