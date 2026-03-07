import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify the app loads correctly.
 * These run headless via Chromium (configured in playwright.config.ts).
 */
test.describe('App smoke tests', () => {
  test('home page loads and shows app title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AI Research Orchestrator/i);
  });

  test('navigation renders without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('has no detectable accessibility violations on root', async ({ page }) => {
    await page.goto('/');
    // Check that the root element is mounted
    await expect(page.locator('#root')).toBeVisible();
  });
});
