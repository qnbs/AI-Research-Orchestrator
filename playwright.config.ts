import { defineConfig, devices } from '@playwright/test';

/**
 * AI Research Orchestrator — Playwright E2E configuration
 *
 * Runs Chromium-only inside DevContainers / CI (headless, no sandbox).
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
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

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

  // Only Chromium in the container — add more browsers in local dev as needed
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Automatically start Vite dev server before tests (only if not already running)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
