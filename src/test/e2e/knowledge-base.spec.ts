/**
 * Knowledge Base E2E — selection + export toolbar on demo corpus (#421).
 */
import { test, expect } from '@playwright/test';
import {
  navigateToKnowledgeBase,
  prepareFirstLaunchDemoKb,
  waitForKbArticleCount,
  DEMO_KB_UNIQUE_ARTICLE_COUNT,
} from './e2eHelpers';

test.describe('Knowledge Base selection and export', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(420_000);
    await prepareFirstLaunchDemoKb(page);
    await navigateToKnowledgeBase(page);
    await waitForKbArticleCount(page, DEMO_KB_UNIQUE_ARTICLE_COUNT);
  });

  test('selecting an article exposes bulk export actions', async ({ page }) => {
    const firstSelect = page.getByRole('checkbox', { name: /select article:/i }).first();
    await expect(firstSelect).toBeVisible({ timeout: 30_000 });
    await firstSelect.check();

    await expect(page.getByText(/1 selected|1 ausgewählt/i)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: /export as csv|als csv exportieren/i }),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole('button', { name: /export as csv|als csv exportieren/i }),
    ).toBeEnabled();
  });

  test('select all on page selects multiple articles for export', async ({ page }) => {
    const firstSelect = page.getByRole('checkbox', { name: /select article:/i }).first();
    await firstSelect.check();

    const selectAll = page.getByRole('button', {
      name: /select all on page|alle auf der seite auswählen/i,
    });
    await expect(selectAll).toBeVisible({ timeout: 10_000 });
    await selectAll.click();

    await expect(page.getByText(/[2-9] selected|[2-9] ausgewählt/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole('button', { name: /export as csv|als csv exportieren/i }),
    ).toBeEnabled();
  });
});
