/**
 * Maintainer §48 viewport screenshot grid (master prompt).
 * Excluded from blocking CI — run via `pnpm run capture:journey-viewports`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { skipOnboarding } from '../e2eHelpers';

/** Master prompt §48 minimum matrix (home shell after onboarding). */
const VIEWPORTS: { width: number; height: number; label: string }[] = [
  { width: 320, height: 568, label: '320x568' },
  { width: 360, height: 800, label: '360x800' },
  { width: 390, height: 844, label: '390x844' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1024, height: 768, label: '1024x768' },
  { width: 1280, height: 800, label: '1280x800' },
  { width: 1440, height: 900, label: '1440x900' },
];

const OUT_DIR =
  process.env.JOURNEY_VIEWPORT_OUT_DIR ??
  path.join(process.cwd(), 'docs/audits/viewport-captures/latest');

test.describe('Maintainer viewport grid', () => {
  test('home launchpad across §48 viewports', async ({ page }) => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    await skipOnboarding(page);
    const header = page.locator('header');
    await header.waitFor({ state: 'visible' });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await header.waitFor({ state: 'visible' });
      await page.screenshot({
        path: path.join(OUT_DIR, `home-${vp.label}.png`),
        fullPage: false,
      });
    }
  });
});
