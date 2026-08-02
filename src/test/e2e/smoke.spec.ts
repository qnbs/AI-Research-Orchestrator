import { test, expect } from '@playwright/test';
import { expectNoCriticalAxeViolations } from './a11yHelpers';

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
    await expectNoCriticalAxeViolations(page);
  });

  test('exposes a valid web app manifest', async ({ page }) => {
    await page.goto('/');
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();
    const manifestUrl = new URL(manifestHref!, page.url()).href;
    const response = await page.request.get(manifestUrl);
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest.name).toMatch(/Orchestrat/i);
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.icons?.length).toBeGreaterThan(0);
  });
});
