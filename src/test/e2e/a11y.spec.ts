import { test, expect } from '@playwright/test';
import {
  expectNoCriticalAxeViolations,
  navigateToViewHash,
  skipOnboardingForA11y,
} from './a11yHelpers';

/**
 * WS-I: blocking a11y smoke — critical/serious axe on key chrome views.
 * Runs as its own CI workflow (`.github/workflows/a11y.yml`); keep the suite small
 * so it stays a reliable gate while the full E2E job remains non-blocking.
 */
test.describe('WS-I a11y smoke (critical/serious)', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboardingForA11y(page);
  });

  test('home / post-onboarding shell', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expectNoCriticalAxeViolations(page);
  });

  test('orchestrator view', async ({ page }) => {
    await navigateToViewHash(page, '#orchestrator');
    await expect(page.locator('#main-content')).toBeVisible();
    await expectNoCriticalAxeViolations(page);
  });

  test('settings view', async ({ page }) => {
    await navigateToViewHash(page, '#settings');
    await expect(page.locator('#main-content')).toBeVisible();
    await expectNoCriticalAxeViolations(page);
  });

  test('help view', async ({ page }) => {
    await navigateToViewHash(page, '#help');
    await expect(page.locator('#main-content')).toBeVisible();
    await expectNoCriticalAxeViolations(page);
  });

  test('history empty state', async ({ page }) => {
    await navigateToViewHash(page, '#history');
    await expect(page.locator('#main-content')).toBeVisible();
    await expectNoCriticalAxeViolations(page);
  });

  test('command palette dialog', async ({ page }) => {
    await page
      .getByRole('button', { name: /open command palette|befehlspalette/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoCriticalAxeViolations(page);
  });
});
