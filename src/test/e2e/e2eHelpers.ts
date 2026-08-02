/**
 * Shared Playwright helpers for E2E specs.
 * Prefer getByRole; keep waits justified and short.
 */
import type { Page } from '@playwright/test';
import { DEMO_KB_ENTRY_COUNT, DEMO_KB_UNIQUE_ARTICLE_COUNT } from '../../services/nonAi/sampleData';

export { DEMO_KB_UNIQUE_ARTICLE_COUNT, DEMO_KB_ENTRY_COUNT };

async function waitForKnowledgeBaseStore(page: Page, timeout = 30_000) {
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
      db.close();
      return true;
    },
    { timeout },
  );
}

async function waitForIndexedDbEntryCount(page: Page, minCount: number, timeout = 45_000) {
  await page.waitForFunction(
    async (expectedMin) => {
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
      return count >= expectedMin;
    },
    minCount,
    { timeout },
  );
}

/**
 * Dismiss onboarding if present and wait for a stable app `<header>`.
 *
 * Firefox can lose a fast onboarding click while Redux/settings hydrate, so we
 * always wait for the shell (with a longer timeout) and retry the click once.
 */
async function ensureAppShellReady(page: Page) {
  const startBtn = page.getByRole('button', { name: /start researching/i });
  const header = page.locator('header');

  if (await header.isVisible().catch(() => false)) {
    return;
  }

  await Promise.race([
    startBtn.waitFor({ state: 'visible', timeout: 15_000 }),
    header.waitFor({ state: 'visible', timeout: 15_000 }),
  ]);

  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
    }
    await startBtn.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {
      /* header wait below is authoritative */
    });
  }

  await header.waitFor({ state: 'visible', timeout: 20_000 });
}

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

  await ensureAppShellReady(page);
}

/**
 * Navigate to a view via in-page hash change (no full reload).
 */
export async function navigateToView(page: Page, viewHash: string) {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, viewHash);
  await page.waitForFunction((hash) => window.location.hash === hash, viewHash, {
    timeout: 15_000,
  });
  // Allow lazy Suspense boundaries to resolve
  await page.waitForTimeout(750);
}

/**
 * Navigate to Knowledge Base and wait for the lazy view shell to attach.
 */
export async function navigateToKnowledgeBase(page: Page) {
  await navigateToView(page, '#knowledgeBase');
  await page
    .locator('main.flex-1, div.h-\\[calc\\(100vh-200px\\)\\]')
    .first()
    .waitFor({ state: 'attached', timeout: 30_000 });
}

/**
 * Wait until the Knowledge Base article-count heading shows the expected total.
 */
export async function waitForKbArticleCount(page: Page, count: number) {
  const pattern = new RegExp(`^${count} Articles Found$`, 'i');
  const locator = page
    .getByRole('heading', { level: 2, name: pattern })
    .or(page.getByText(pattern));

  // Poll body text first — survives WebKit heading-role gaps and empty-state races.
  await page.waitForFunction(
    (expected) => {
      const re = new RegExp(`^${expected} Articles Found$`, 'im');
      return re.test(document.body.innerText);
    },
    count,
    { timeout: 90_000 },
  );

  await locator.first().waitFor({ state: 'visible', timeout: 15_000 });
}

/**
 * First-launch KB path: clear demo flags + KB table, reload, skip onboarding, wait for demo seed.
 */
export async function prepareFirstLaunchDemoKb(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await waitForKnowledgeBaseStore(page);

  // Block demo seed while clearing IndexedDB so importKbEntries cannot race the clear transaction.
  await page.evaluate(async () => {
    try {
      localStorage.setItem('aro.demoDataSeeded', '1');
      localStorage.setItem('aro.demoDataDismissed', '1');
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

  await page.evaluate(() => {
    try {
      localStorage.removeItem('aro.demoDataSeeded');
      localStorage.removeItem('aro.demoDataDismissed');
    } catch {
      /* ignore quota / private mode */
    }
  });

  await page.reload({ waitUntil: 'domcontentloaded' });

  const startBtn = page.getByRole('button', { name: /start researching/i });
  const header = page.locator('header');
  if (!(await header.isVisible().catch(() => false))) {
    await Promise.race([
      startBtn.waitFor({ state: 'visible', timeout: 15_000 }),
      header.waitFor({ state: 'visible', timeout: 15_000 }),
    ]);
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      if (await startBtn.isVisible().catch(() => false)) {
        await startBtn.click();
      }
      await startBtn.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {
        /* header wait below is authoritative */
      });
    }
    await header.waitFor({ state: 'visible', timeout: 20_000 });
  }

  await waitForDemoKbSeed(page);

  // Cold mounts can fulfill fetchKnowledgeBase before importKbEntries finishes — reload so
  // Redux hydrates from the persisted demo rows before the KB view assertion runs.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await header.waitFor({ state: 'visible', timeout: 20_000 });
  await waitForIndexedDbEntryCount(page, DEMO_KB_ENTRY_COUNT, 30_000);
}

async function waitForDemoKbSeed(page: Page, timeout = 60_000) {
  await page.waitForFunction(
    async (minEntries) => {
      try {
        if (localStorage.getItem('aro.demoDataSeeded') !== '1') {
          return false;
        }
      } catch {
        return false;
      }

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

      if (count < minEntries) {
        try {
          localStorage.removeItem('aro.demoDataSeeded');
        } catch {
          /* ignore */
        }
        return false;
      }

      return true;
    },
    DEMO_KB_ENTRY_COUNT,
    { timeout },
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
