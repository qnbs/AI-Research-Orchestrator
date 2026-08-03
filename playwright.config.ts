import { defineConfig, devices } from '@playwright/test';

/** Chromium-only: required in Docker/CI; invalid for Firefox/WebKit launchers. */
const chromiumLaunch = {
  launchOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
};

/**
 * AI Research Orchestrator — Playwright E2E configuration
 *
 * Runs Chromium-only inside DevContainers / CI (headless, no sandbox).
 * Set PLAYWRIGHT_MATRIX=1 for the blocking cross-browser workflow (Firefox/WebKit/mobile).
 * Browser binary is installed by .devcontainer/postCreate.sh.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    // Base URL for local Vite dev server
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    // Trace on first retry, useful for CI debugging
    trace: 'on-first-retry',
    // Capture screenshots on failure
    screenshot: 'only-on-failure',
    // WebKit lets an active service worker bypass Playwright page.route(), so
    // mocked cross-origin probes (e.g. Ollama :11434) hit the real network and
    // fail as CORS/connection-refused. Block SW in E2E; SW behavior is covered
    // by unit tests (sw-integrity / useServiceWorkerUpdate).
    serviceWorkers: 'block',
  },

  // Chromium is the blocking CI default. Set PLAYWRIGHT_MATRIX=1 to enable the
  // blocking cross-browser workflow (Firefox / WebKit / mobile Chrome).
  projects:
    process.env.PLAYWRIGHT_MATRIX === '1'
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
          {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'], ...chromiumLaunch },
          },
        ]
      : [
          {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], ...chromiumLaunch },
          },
        ],

  // Automatically start Vite dev server before tests (only if not already running)
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
