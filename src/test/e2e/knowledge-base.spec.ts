/**
 * Knowledge Base E2E — selection + export toolbar on demo corpus (#421).
 */
import { readFile } from 'node:fs/promises';
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

  test('CSV export downloads selected articles with header row', async ({ page }) => {
    const firstSelect = page.getByRole('checkbox', { name: /select article:/i }).first();
    await firstSelect.check();
    await page.getByRole('button', { name: /export as csv|als csv exportieren/i }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Yes, Export|Ja, exportieren/i }).click();
    const download = await downloadPromise;
    const csvPath = await download.path();
    expect(csvPath).toBeTruthy();
    const csv = await readFile(csvPath!, 'utf8');
    expect(csv.split(/\r?\n/)[0]).toMatch(/PMID|Title/i);
    expect(csv.length).toBeGreaterThan(20);
  });

  test('BibTeX export downloads @article entry for selection', async ({ page }) => {
    const firstSelect = page.getByRole('checkbox', { name: /select article:/i }).first();
    const selectLabel = (await firstSelect.getAttribute('aria-label')) ?? '';
    const selectedTitle = selectLabel.replace(/^select article:\s*/i, '').trim();
    expect(selectedTitle.length).toBeGreaterThan(3);
    await firstSelect.check();
    await page.getByRole('button', { name: /export as bibtex|als bibtex exportieren/i }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Yes, Export|Ja, exportieren/i }).click();
    const download = await downloadPromise;
    const body = await readFile((await download.path())!, 'utf8');
    expect(body.match(/@article\{/g)?.length).toBe(1);
    expect(body).toMatch(/@article\{PMID:/);
    expect(body).toMatch(/pmid\s*=\s*\{/);
    expect(body).toContain(selectedTitle.slice(0, 40));
  });

  test('RIS export downloads TY  - JOUR record for selection', async ({ page }) => {
    const firstSelect = page.getByRole('checkbox', { name: /select article:/i }).first();
    const selectLabel = (await firstSelect.getAttribute('aria-label')) ?? '';
    const selectedTitle = selectLabel.replace(/^select article:\s*/i, '').trim();
    expect(selectedTitle.length).toBeGreaterThan(3);
    await firstSelect.check();
    await page.getByRole('button', { name: /export as ris|als ris exportieren/i }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Yes, Export|Ja, exportieren/i }).click();
    const download = await downloadPromise;
    const body = await readFile((await download.path())!, 'utf8');
    expect(body.match(/^TY {2}- JOUR/gm)?.length).toBe(1);
    expect(body).toMatch(/^TY {2}- JOUR/m);
    expect(body).toMatch(/^ER {2}- /m);
    expect(body).toContain(selectedTitle.slice(0, 40));
  });

  test('bulk delete removes selected article after confirm', async ({ page }) => {
    const firstSelect = page.getByRole('checkbox', { name: /select article:/i }).first();
    const selectLabel = (await firstSelect.getAttribute('aria-label')) ?? '';
    const selectedTitle = selectLabel.replace(/^select article:\s*/i, '').trim();
    expect(selectedTitle.length).toBeGreaterThan(3);
    const selectedCheckboxPattern = new RegExp(
      selectedTitle.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    );

    await firstSelect.check();
    await page.getByRole('button', { name: /delete selected|auswahl löschen/i }).click();

    const dialog = page.getByRole('dialog', { name: /delete articles|artikel löschen/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await waitForKbArticleCount(page, DEMO_KB_UNIQUE_ARTICLE_COUNT);
    await expect(page.getByText(/1 selected|1 ausgewählt/i)).toBeVisible();

    await dialog.getByRole('button', { name: /yes, delete|ja, löschen/i }).click();

    await waitForKbArticleCount(page, DEMO_KB_UNIQUE_ARTICLE_COUNT - 1);
    await expect(page.getByText(/1 selected|1 ausgewählt/i)).not.toBeVisible();
    await expect(page.getByRole('checkbox', { name: selectedCheckboxPattern })).toHaveCount(0);
  });

  test('reload clears knowledge base selection state', async ({ page }) => {
    const firstSelect = page.getByRole('checkbox', { name: /select article:/i }).first();
    await firstSelect.check();
    await expect(page.getByText(/1 selected|1 ausgewählt/i)).toBeVisible({ timeout: 10_000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await navigateToKnowledgeBase(page);
    await waitForKbArticleCount(page, DEMO_KB_UNIQUE_ARTICLE_COUNT);

    await expect(page.getByText(/1 selected|1 ausgewählt/i)).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: /delete selected|auswahl löschen/i }),
    ).not.toBeVisible();
  });

  test('CSV export keeps selected membership when filter hides the row', async ({ page }) => {
    const aspirinSelect = page.getByRole('checkbox', {
      name: /select article:.*aspirin/i,
    });
    await expect(aspirinSelect).toBeVisible({ timeout: 30_000 });
    await aspirinSelect.check();

    const search = page.getByPlaceholder(/search articles|artikel suchen/i);
    await search.fill('SGLT2');
    await expect(page.getByText(/1 Article Found|1 Artikel gefunden/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(aspirinSelect).not.toBeVisible();
    await expect(page.getByText(/1 selected|1 ausgewählt/i)).toBeVisible();

    await page.getByRole('button', { name: /export as csv|als csv exportieren/i }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Yes, Export|Ja, exportieren/i }).click();
    const download = await downloadPromise;
    const csv = await readFile((await download.path())!, 'utf8');
    expect(csv.toLowerCase()).toContain('aspirin');
    expect(csv.toLowerCase()).not.toContain('sglt2');
    const dataRows = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
    expect(dataRows.length).toBe(2);
  });
});
