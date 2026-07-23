#!/usr/bin/env node
/**
 * Fails CI if public/workbox-v<version>/*.js has drifted from what the
 * installed workbox-* devDependencies would produce right now - i.e. someone
 * bumped the workbox-* packages (or WORKBOX_VERSION) without re-running
 * `pnpm run workbox:copy` and committing the result. Without this, a routine
 * Dependabot bump to package.json/pnpm-lock.yaml would pass every other gate
 * while the JS actually served under public/workbox-v.../ silently stayed on
 * the old version - the exact "declared version != what's running" problem
 * WS-B (self-hosted Workbox, ADR 0004) set out to close, just relocated from
 * CDN-trust to vendor-drift. Mirrors check-no-cdn-scripts.mjs's role for the
 * CDN-removal invariant.
 *
 * Also checks public/sw.js's own independently-hardcoded WORKBOX_VERSION
 * constant against this module's - sw.js's importScripts() path is built
 * from ITS copy of the constant, so the two silently diverging (e.g. a
 * version bump here without the matching manual edit there) would leave
 * sw.js importScripts()-ing a stale, possibly-deleted directory forever,
 * even though this check's directory diff alone would still pass.
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
  const problems = [];

  const swSource = readFileSync(join(root, 'public', 'sw.js'), 'utf-8');
  const swVersionMatch = swSource.match(/const WORKBOX_VERSION = '([^']+)'/);
  if (!swVersionMatch || swVersionMatch[1] !== WORKBOX_VERSION) {
    problems.push(
      `public/sw.js's WORKBOX_VERSION ('${swVersionMatch?.[1] ?? 'not found'}') does not match ` +
        `scripts/lib/workboxCopy.mjs's WORKBOX_VERSION ('${WORKBOX_VERSION}')`,
    );
  }

  copyWorkboxFiles(root, tmpDir);

  const committedFiles = readdirSync(committedDir).sort();
  const freshFiles = readdirSync(tmpDir).sort();

  if (committedFiles.join(',') !== freshFiles.join(',')) {
    problems.push(
      `file list differs — committed: [${committedFiles.join(', ')}], fresh from node_modules: [${freshFiles.join(', ')}]`,
    );
  }

  for (const file of freshFiles) {
    if (!committedFiles.includes(file)) continue;
    const committed = readFileSync(join(committedDir, file), 'utf-8');
    const fresh = readFileSync(join(tmpDir, file), 'utf-8');
    if (committed !== fresh) problems.push(file);
  }

  if (problems.length > 0) {
    console.error(
      `check-workbox-vendor-drift: public/workbox-v${WORKBOX_VERSION}/ does not match what the installed workbox-* devDependencies produce.`,
    );
    console.error(
      'The workbox-* packages (or WORKBOX_VERSION in scripts/lib/workboxCopy.mjs and public/sw.js) ' +
        'changed without re-running `pnpm run workbox:copy` and committing the result. Mismatched:',
    );
    for (const problem of problems) console.error(`  - ${problem}`);
    // Not process.exit(1): that would skip the finally block below and leak
    // tmpDir on every failure. Setting exitCode and falling through instead
    // lets cleanup run while still failing the process once it exits.
    process.exitCode = 1;
  } else {
    console.log(`check-workbox-vendor-drift: public/workbox-v${WORKBOX_VERSION}/ matches node_modules — OK`);
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
