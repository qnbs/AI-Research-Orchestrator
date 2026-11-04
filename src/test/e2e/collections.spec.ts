/**
 * Collections E2E — Dexie persistence across reload and portable metadata export (#408).
 */
import { test, expect } from '@playwright/test';
import { navigateToView, skipOnboarding } from './e2eHelpers';

const COLLECTION_NAME = 'E2E Durable Collection';

async function goToCollections(page: import('@playwright/test').Page) {
  await navigateToView(page, '#collections');
  await expect(
    page.getByRole('heading', { name: /research collections|forschungssammlungen/i }),
  ).toBeVisible({ timeout: 15_000 });
}

async function createCollectionViaUi(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: /new collection|neue sammlung/i }).click();
  await page.locator('#col-name').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('#col-name').fill(name);
  await page.getByRole('button', { name: /^(create|erstellen)$/i }).click();
  await expect(page.getByRole('heading', { level: 3, name })).toBeVisible({ timeout: 15_000 });
}

function collectionCard(page: import('@playwright/test').Page, name: string) {
  return page.locator('.neon-card').filter({ has: page.getByRole('heading', { level: 3, name }) });
}

test.describe('Collections', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
    await goToCollections(page);
  });

  test('create survives reload and portable export is metadata-only JSON', async ({ page }) => {
    await createCollectionViaUi(page, COLLECTION_NAME);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('header').waitFor({ state: 'visible', timeout: 20_000 });
    await goToCollections(page);
    await expect(collectionCard(page, COLLECTION_NAME)).toBeVisible({ timeout: 15_000 });

    const card = collectionCard(page, COLLECTION_NAME);
    await card
      .getByRole('button', { name: /export collection metadata|sammlungsmetadaten exportieren/i })
      .click();

    await expect(
      page.getByText(
        /Collections stay in this browser only|Sammlungen bleiben nur in diesem Browser/i,
      ),
    ).toBeVisible({ timeout: 10_000 });

    const exportPre = page.locator('pre').filter({ hasText: '"schemaVersion"' }).first();
    await expect(exportPre).toBeVisible({ timeout: 10_000 });
    const raw = await exportPre.innerText();
    const parsed = JSON.parse(raw) as {
      schemaVersion: number;
      exportedAt: string;
      collection: Record<string, unknown>;
    };

    expect(parsed.schemaVersion).toBe(1);
    expect(typeof parsed.exportedAt).toBe('string');
    expect(parsed.collection.name).toBe(COLLECTION_NAME);
    expect(parsed.collection.entryIds).toEqual([]);
    expect(parsed.collection.articlePmids).toEqual([]);

    const allowedKeys = new Set([
      'name',
      'description',
      'color',
      'icon',
      'tags',
      'entryIds',
      'articlePmids',
    ]);
    for (const key of Object.keys(parsed.collection)) {
      expect(allowedKeys.has(key), `unexpected export field: ${key}`).toBe(true);
    }
    expect(raw).not.toMatch(/"abstract"|"fullText"|"reportBody"/i);
  });

  test('delete removes collection after confirm', async ({ page }) => {
    await createCollectionViaUi(page, COLLECTION_NAME);

    const card = collectionCard(page, COLLECTION_NAME);
    await card.getByRole('button', { name: /delete collection|sammlung löschen/i }).click();

    const dialog = page.getByRole('dialog', { name: /delete collection|sammlung löschen/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole('button', { name: /^(delete|löschen)$/i }).click();

    await expect(collectionCard(page, COLLECTION_NAME)).toHaveCount(0, { timeout: 15_000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('header').waitFor({ state: 'visible', timeout: 20_000 });
    await goToCollections(page);
    await expect(page.getByRole('heading', { level: 3, name: COLLECTION_NAME })).toHaveCount(0);
  });
});
