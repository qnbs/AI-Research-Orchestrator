import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Smoke tests — verify the app loads correctly.
 * These run headless via Chromium (configured in playwright.config.ts).
 */
test.describe('App smoke tests', () => {
  test('home page loads and shows app title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Research Orchestrator/i);
  });

  test('navigation renders without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('has no critical accessibility violations on root', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('#root')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(critical, critical.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
  });
});
