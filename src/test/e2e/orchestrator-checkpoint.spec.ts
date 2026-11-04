/**
 * Orchestrator checkpoint E2E — cancel persists resumable checkpoint (#419).
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { navigateToView, seedFakeGeminiApiKey, skipOnboarding } from './e2eHelpers';
import { mockGeminiHangingSynthesis, mockPubMedRoutes } from './fixtures/networkMocks';

async function openOrchestratorWithInterruptedCheckpoint(
  page: Page,
  topic: string,
): Promise<Locator> {
  await mockPubMedRoutes(page);
  await mockGeminiHangingSynthesis(page);
  await skipOnboarding(page);
  await seedFakeGeminiApiKey(page);
  await navigateToView(page, '#orchestrator');

  await page.locator('#researchTopic').fill(topic);
  await page.locator('button[type="submit"]').first().click();

  await expect(
    page.getByRole('button', { name: /Cancel research|Recherche abbrechen/i }),
  ).toBeVisible({ timeout: 20_000 });

  await expect(
    page.getByRole('heading', { name: /Research Report|Forschungsbericht/i }),
  ).toBeVisible({ timeout: 45_000 });

  await page.getByRole('button', { name: /Cancel research|Recherche abbrechen/i }).click();

  await expect(
    page.getByRole('status').filter({ hasText: /PARTIAL REPORT|TEILBERICHT/ }),
  ).toBeVisible({ timeout: 20_000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('header').waitFor({ state: 'visible', timeout: 20_000 });
  await navigateToView(page, '#orchestrator');

  const banner = page.getByRole('region', {
    name: /Interrupted research|Unterbrochene Recherche/i,
  });
  await expect(banner).toBeVisible({ timeout: 20_000 });
  await expect(banner.getByText(topic, { exact: false })).toBeVisible({ timeout: 10_000 });
  return banner;
}

async function reloadOrchestrator(page: Page) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('header').waitFor({ state: 'visible', timeout: 20_000 });
  await navigateToView(page, '#orchestrator');
}

test.describe('Orchestrator checkpoint resume', () => {
  test('cancel mid-stream persists checkpoint; reload restore stays partial', async ({ page }) => {
    test.setTimeout(120_000);
    const topic = 'COVID cognition checkpoint e2e';
    const banner = await openOrchestratorWithInterruptedCheckpoint(page, topic);

    await banner
      .getByRole('button', { name: /Restore partial|Teilbericht wiederherstellen/i })
      .click();

    await expect(
      page.getByText(/Partial report restored|Teilbericht wiederhergestellt/i),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page.getByRole('status').filter({ hasText: /PARTIAL REPORT|TEILBERICHT/ }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(banner).toHaveCount(0, { timeout: 10_000 });
  });

  test('discard clears checkpoint; reload does not show resume banner', async ({ page }) => {
    test.setTimeout(120_000);
    const topic = 'COVID cognition discard checkpoint e2e';
    const banner = await openOrchestratorWithInterruptedCheckpoint(page, topic);

    await banner.getByRole('button', { name: /^Discard$|^Verwerfen$/i }).click();

    await expect(
      page.getByRole('status').filter({ hasText: /Checkpoint discarded|Checkpoint verworfen/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(banner).toHaveCount(0, { timeout: 10_000 });

    await reloadOrchestrator(page);

    await expect(
      page.getByRole('region', { name: /Interrupted research|Unterbrochene Recherche/i }),
    ).toHaveCount(0, { timeout: 20_000 });
  });
});
