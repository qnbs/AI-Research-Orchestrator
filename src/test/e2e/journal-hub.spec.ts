/**
 * Journal Hub E2E — landing chrome, featured section, analyze form.
 * Network: featured journals JSON is bundled/fetched locally; PubMed mocked only when needed.
 */
import { test, expect } from '@playwright/test';
import { navigateToView, skipOnboarding } from './e2eHelpers';
import { mockPubMedRoutes } from './fixtures/networkMocks';
import { JOURNAL_HUB_PUBMED_ARTICLE } from './fixtures/pubmedArticle';

test.describe('Journal Hub', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await navigateToView(page, '#journals');
  });

  test('landing shows Journal Hub title and analyze controls', async ({ page }) => {
    // Header banner also shows the view title — scope to main content to avoid strict-mode clash.
    const main = page.locator('#main-content');
    await expect(main.getByRole('heading', { name: /journal hub|journal-hub/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      main.getByRole('button', { name: /analyze journal|journal analysieren/i }),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      main.getByRole('textbox', {
        name: /journal name to analyze|zu analysierender journalname/i,
      }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('featured journals section renders category chrome', async ({ page }) => {
    // Featured block title (EN or DE)
    await expect(
      page.getByRole('heading', { name: /featured journals|empfohlene journals/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('suggest mode toggle is available', async ({ page }) => {
    const suggestTab = page.getByRole('button', {
      name: /suggest journals|journals vorschlagen/i,
    });
    await expect(suggestTab).toBeVisible({ timeout: 10_000 });
    await suggestTab.click();
    await expect(
      page.getByRole('textbox', {
        name: /field of study for journal suggestions|fachgebiet für journal-vorschläge/i,
      }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('analyze form accepts a journal query', async ({ page }) => {
    await mockPubMedRoutes(page, JOURNAL_HUB_PUBMED_ARTICLE);
    const input = page.getByRole('textbox', {
      name: /journal name to analyze|zu analysierender journalname/i,
    });
    await input.fill('Nature Medicine');
    await expect(input).toHaveValue('Nature Medicine');
  });
});
