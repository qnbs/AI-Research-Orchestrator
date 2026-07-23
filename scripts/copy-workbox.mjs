#!/usr/bin/env node
/**
 * Copies Workbox's pre-built module files from node_modules into public/,
 * so public/sw.js can self-host them (workbox.setConfig({ modulePathPrefix })
 * instead of importScripts()-ing from storage.googleapis.com. Workbox's own
 * "using local Workbox files" docs describe this exact approach for apps that
 * don't run their service worker through webpack/workbox-cli.
 *
 * Run again (pnpm run workbox:copy) whenever WORKBOX_VERSION below changes -
 * bump it and the six `pnpm add -D workbox-*@<version>` packages together.
 * scripts/check-workbox-vendor-drift.mjs (wired into CI) fails the build if
 * the committed public/workbox-v<version> directory ever falls out of sync
 * with this.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WORKBOX_VERSION, WORKBOX_MODULES, copyWorkboxFiles } from './lib/workboxCopy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public', `workbox-v${WORKBOX_VERSION}`);

copyWorkboxFiles(root, outDir);

console.log(`Copied Workbox ${WORKBOX_VERSION} (${WORKBOX_MODULES.length} modules + loader) to ${outDir}`);
