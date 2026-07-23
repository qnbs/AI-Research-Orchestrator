#!/usr/bin/env node
/**
 * Fails CI if public/workbox-v<version>/*.js has drifted from what the
 * installed workbox-* devDependencies would produce right now - i.e. someone
 * bumped the workbox-* packages (or WORKBOX_VERSION) without re-running
 * `pnpm run workbox:copy` and committing the result. Without this, a routine
 * Dependabot bump to package.json/pnpm-lock.yaml would pass every other gate
 * while the JS actually served under public/workbox-v.../ silently stayed on
 * the old version - the exact "declared version != what's running" problem
 * WS-B (self-hosted Workbox, ADR 0011) set out to close, just relocated from
 * CDN-trust to vendor-drift. Mirrors check-no-cdn-scripts.mjs's role for the
 * CDN-removal invariant.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WORKBOX_VERSION, copyWorkboxFiles } from './lib/workboxCopy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const committedDir = join(root, 'public', `workbox-v${WORKBOX_VERSION}`);

const tmpDir = mkdtempSync(join(tmpdir(), 'workbox-vendor-check-'));
try {
  copyWorkboxFiles(root, tmpDir);

  const committedFiles = readdirSync(committedDir).sort();
  const freshFiles = readdirSync(tmpDir).sort();
  const mismatches = [];

  if (committedFiles.join(',') !== freshFiles.join(',')) {
    mismatches.push(
      `file list differs — committed: [${committedFiles.join(', ')}], fresh from node_modules: [${freshFiles.join(', ')}]`,
    );
  }

  for (const file of freshFiles) {
    if (!committedFiles.includes(file)) continue;
    const committed = readFileSync(join(committedDir, file), 'utf-8');
    const fresh = readFileSync(join(tmpDir, file), 'utf-8');
    if (committed !== fresh) mismatches.push(file);
  }

  if (mismatches.length > 0) {
    console.error(
      `check-workbox-vendor-drift: public/workbox-v${WORKBOX_VERSION}/ does not match what the installed workbox-* devDependencies produce.`,
    );
    console.error(
      'The workbox-* packages (or WORKBOX_VERSION in scripts/lib/workboxCopy.mjs and public/sw.js) ' +
        'changed without re-running `pnpm run workbox:copy` and committing the result. Mismatched:',
    );
    for (const mismatch of mismatches) console.error(`  - ${mismatch}`);
    process.exit(1);
  }

  console.log(`check-workbox-vendor-drift: public/workbox-v${WORKBOX_VERSION}/ matches node_modules — OK`);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
