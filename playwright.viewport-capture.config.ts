import { defineConfig, devices } from '@playwright/test';

/** Maintainer-only §48 viewport grid — not part of blocking CI (`pnpm run capture:journey-viewports`). */
const chromiumLaunch = {
  launchOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
};

export default defineConfig({
  testDir: './src/test/e2e/maintainer',
  testMatch: '**/*.capture.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...chromiumLaunch },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
