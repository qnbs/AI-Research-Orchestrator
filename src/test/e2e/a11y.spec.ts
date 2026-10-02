import { test, expect } from '@playwright/test';
import {
  expectNoCriticalAxeViolations,
  navigateToViewHash,
  skipOnboardingForA11y,
  waitForResearchBriefSummary,
} from './a11yHelpers';
import { mockGeminiUnavailable, mockPubMedRoutes } from './fixtures/networkMocks';

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

test.describe('WS-I orchestrator task-state a11y', () => {
  test.beforeEach(async ({ page }) => {
    await mockPubMedRoutes(page);
    await mockGeminiUnavailable(page);
    await skipOnboardingForA11y(page);
  });

  test('research brief with completed report', async ({ page }) => {
    test.setTimeout(90_000);
    await waitForResearchBriefSummary(page, 'aspirin cardiovascular prevention');
    await page
      .getByRole('heading', { name: /Research Report|Forschungsbericht/i })
      .waitFor({ state: 'visible', timeout: 60_000 });
    await expectNoCriticalAxeViolations(page);
  });

  test('edit criteria form after run completes', async ({ page }) => {
    test.setTimeout(90_000);
    await waitForResearchBriefSummary(page, 'aspirin cardiovascular prevention');
    await page
      .getByRole('heading', { name: /Research Report|Forschungsbericht/i })
      .waitFor({ state: 'visible', timeout: 60_000 });
    await page.getByRole('button', { name: /edit criteria|kriterien bearbeiten/i }).click();
    await expect(page.locator('#researchTopic')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /cancel edit|bearbeitung abbrechen/i }),
    ).toBeVisible();
    await expectNoCriticalAxeViolations(page);
  });

  test('cancel edit returns to brief without axe regressions', async ({ page }) => {
    test.setTimeout(90_000);
    await waitForResearchBriefSummary(page, 'stroke rehabilitation');
    await page
      .getByRole('heading', { name: /Research Report|Forschungsbericht/i })
      .waitFor({ state: 'visible', timeout: 60_000 });
    await page.getByRole('button', { name: /edit criteria|kriterien bearbeiten/i }).click();
    await page.getByRole('button', { name: /cancel edit|bearbeitung abbrechen/i }).click();
    await expect(page.getByTestId('research-brief-summary')).toBeVisible();
    await expect(page.locator('#researchTopic')).toHaveCount(0);
    await expectNoCriticalAxeViolations(page);
  });
});
