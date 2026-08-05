import { test, expect } from '@playwright/test';

/**
 * Proves the production service-worker registration lifecycle against a real
 * `vite preview` build served under the GitHub Pages subpath
 * (/AI-Research-Orchestrator/), the exact deployment target
 * .github/workflows/deploy.yml builds with. This is the regression guard for
 * the 531885f defect (ADR 0004, 2026-08-05 amendment): register-sw.js derives
 * its registration scope from `document.querySelector('base[href]')`, which
 * silently fell back to `/` in production when no build step injected the tag.
 *
 * Run via `pnpm run test:e2e:pwa` (playwright.pwa.config.ts) - deliberately
 * NOT part of the blocking e2e.yml/e2e-cross-browser.yml matrix yet; those
 * configs block service workers entirely (see playwright.config.ts) so
 * cross-origin network mocks keep working under WebKit.
 */
test.describe('PWA service-worker registration on the deployed subpath', () => {
  test('registers with the correct scope and controls the page', async ({ page, baseURL }) => {
    // NOT '/' - an origin-absolute path overrides baseURL's own path
    // (/AI-Research-Orchestrator/) per WHATWG URL resolution, navigating to the
    // server root instead of the deployed subpath and escaping the worker's scope.
    await page.goto('./');
    await page.waitForLoadState('load');

    const registration = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return { scope: reg.scope, hasController: Boolean(navigator.serviceWorker.controller) };
    });

    expect(registration.scope).toBe(new URL('/AI-Research-Orchestrator/', baseURL!).href);

    // A worker becomes the controller once activated on a page it precached -
    // reload once so this page is under its control, matching real first-visit
    // behavior (register-sw.js does not reload on the very first activation).
    await page.reload();
    await page.waitForLoadState('load');
    const hasControllerAfterReload = await page.evaluate(() =>
      Boolean(navigator.serviceWorker.controller),
    );
    expect(hasControllerAfterReload).toBe(true);
  });

  test('serves the cached app shell while offline after the first successful install', async ({
    page,
    context,
  }) => {
    // NOT '/' - an origin-absolute path overrides baseURL's own path
    // (/AI-Research-Orchestrator/) per WHATWG URL resolution, navigating to the
    // server root instead of the deployed subpath and escaping the worker's scope.
    await page.goto('./');
    await page.waitForLoadState('load');
    await page.evaluate(() => navigator.serviceWorker.ready);
    // Let precaching settle before going offline.
    await page.reload();
    await page.waitForLoadState('load');

    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.locator('#root')).toBeVisible({ timeout: 10_000 });
    } finally {
      await context.setOffline(false);
    }
  });
});
