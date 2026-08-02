/**
 * Shared Playwright helpers for E2E specs.
 * Prefer getByRole; keep waits justified and short.
 */
import type { Page } from '@playwright/test';

/**
 * Navigate to the app and skip the onboarding screen if it is shown.
 */
export async function skipOnboarding(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Keep KB empty for empty-state assertions (demo seed is for real first-run UX).
  await page.evaluate(() => {
    try {
      localStorage.setItem('aro.demoDataDismissed', '1');
      localStorage.setItem('aro.demoDataSeeded', '1');
    } catch {
      /* ignore */
    }
  });

  const startBtn = page.getByRole('button', { name: /start researching/i });
  const header = page.locator('header');

  await Promise.race([
    startBtn.waitFor({ state: 'visible', timeout: 15_000 }),
    header.waitFor({ state: 'visible', timeout: 15_000 }),
  ]);

  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await header.waitFor({ state: 'visible', timeout: 10_000 });
  }
}

/**
 * Navigate to a view via in-page hash change (no full reload).
 */
export async function navigateToView(page: Page, viewHash: string) {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, viewHash);
  // Allow lazy Suspense boundaries to resolve
  await page.waitForTimeout(1_500);
}

/**
 * First-launch KB path: clear demo flags + KB table, reload, skip onboarding, wait for demo seed.
 */
export async function prepareFirstLaunchDemoKb(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(async () => {
    try {
      localStorage.removeItem('aro.demoDataSeeded');
      localStorage.removeItem('aro.demoDataDismissed');
    } catch {
      /* ignore quota / private mode */
    }

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('AIResearchAppDatabase');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'));
    });
    if (!db.objectStoreNames.contains('knowledgeBaseEntries')) {
      db.close();
      throw new Error('knowledgeBaseEntries store missing');
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('knowledgeBaseEntries', 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('indexedDB transaction failed'));
      tx.objectStore('knowledgeBaseEntries').clear();
    });
    db.close();
  });

  await page.reload({ waitUntil: 'domcontentloaded' });

  const startBtn = page.getByRole('button', { name: /start researching/i });
  const header = page.locator('header');
  await Promise.race([
    startBtn.waitFor({ state: 'visible', timeout: 15_000 }),
    header.waitFor({ state: 'visible', timeout: 15_000 }),
  ]);
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await header.waitFor({ state: 'visible', timeout: 10_000 });
  }

  await page.waitForFunction(
    async () => {
      const db = await new Promise<IDBDatabase | null>((resolve) => {
        const req = indexedDB.open('AIResearchAppDatabase');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (!db?.objectStoreNames.contains('knowledgeBaseEntries')) {
        db?.close();
        return false;
      }
      const count = await new Promise<number>((resolve, reject) => {
        const tx = db.transaction('knowledgeBaseEntries', 'readonly');
        const req = tx.objectStore('knowledgeBaseEntries').count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('indexedDB count failed'));
      });
      db.close();
      return count >= 4;
    },
    { timeout: 45_000 },
  );
}

/** Open Settings from header chrome (desktop icons or mobile overflow menu). */
export async function openSettingsFromChrome(page: Page) {
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 768) {
    await page.getByRole('button', { name: /more options/i }).click();
    await page.getByRole('button', { name: /^settings$/i }).click();
  } else {
    await page
      .getByRole('button', { name: /settings/i })
      .first()
      .click();
  }
}

/** Open Help from header chrome (desktop icons or mobile overflow menu). */
export async function openHelpFromChrome(page: Page) {
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 768) {
    await page.getByRole('button', { name: /more options/i }).click();
    await page.getByRole('button', { name: /help/i }).click();
  } else {
    await page.getByRole('button', { name: /help/i }).first().click();
  }
}
