#!/usr/bin/env node
/**
 * Capture §48 viewport screenshots (maintainer / audit evidence — not CI).
 * Requires Playwright Chromium (`pnpm exec playwright install chromium`).
 */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const outDir =
  process.env.JOURNEY_VIEWPORT_OUT_DIR ??
  path.join(process.cwd(), 'docs/audits/viewport-captures/latest');

mkdirSync(outDir, { recursive: true });
console.log(`Writing viewport captures to: ${outDir}`);

execSync('pnpm exec playwright test --config=playwright.viewport-capture.config.ts', {
  stdio: 'inherit',
  env: { ...process.env, JOURNEY_VIEWPORT_OUT_DIR: outDir },
});
