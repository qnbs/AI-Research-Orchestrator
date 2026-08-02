import { defineConfig, devices } from '@playwright/test';

/**
 * AI Research Orchestrator — Playwright E2E configuration
 *
 * Runs Chromium-only inside DevContainers / CI (headless, no sandbox).
 * Set PLAYWRIGHT_MATRIX=1 for the non-blocking cross-browser smoke workflow (P1-6).
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
    // All Playwright tests run headless; no sandbox required in Docker
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
    // Capture screenshots on failure
    screenshot: 'only-on-failure',
  },

  // Chromium is the blocking CI default. Set PLAYWRIGHT_MATRIX=1 to enable the
  // non-blocking cross-browser smoke workflow (audit P1-6).
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
            use: { ...devices['Pixel 5'] },
          },
        ]
      : [
          {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
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
