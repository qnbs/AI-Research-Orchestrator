import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
const BASE_PATH = '/AI-Research-Orchestrator/';

/**
 * Dedicated PWA registration lane (Track A, ADR 0004 amendment 2026-08-05).
 * Runs as its own blocking workflow job, `.github/workflows/pwa-e2e.yml`
 * ("PWA service-worker registration") - not yet a GitHub ruleset-enforced
 * required check (see docs/ci-branch-governance.md for that separate,
 * still-pending maintainer action), but the job itself fails CI on failure
 * like any other. Kept out of playwright.config.ts deliberately:
 *  - it needs service workers ENABLED (the main config blocks them - see the
 *    comment there - so cross-origin mocks keep working under WebKit);
 *  - it serves a real production `vite preview` build under the GitHub Pages
 *    subpath rather than the dev server at `/`, which is the only way to prove
 *    register-sw.js resolves the correct scope against real deployed output;
 *  - running a full production build on every `pnpm run test:e2e` invocation
 *    would slow down the seven blocking specs for a concern only this lane
 *    needs. Run explicitly via `pnpm run test:e2e:pwa`.
 */
export default defineConfig({
  testDir: './src/test/e2e',
  testMatch: /pwa-registration\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
    serviceWorkers: 'allow',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
      },
    },
  ],

  webServer: {
    command: `pnpm run build && pnpm exec vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      VITE_BASE_PATH: BASE_PATH,
      VITE_SITE_ORIGIN: 'https://qnbs.github.io',
      NODE_ENV: 'production',
    },
  },
});
