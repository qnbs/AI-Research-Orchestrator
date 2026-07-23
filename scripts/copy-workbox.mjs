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
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WORKBOX_VERSION = '7.0.0';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public', `workbox-v${WORKBOX_VERSION}`);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const MODULES = [
  'workbox-core',
  'workbox-routing',
  'workbox-strategies',
  'workbox-cacheable-response',
  'workbox-expiration',
  'workbox-precaching',
];

// .js only, no .map: these are Workbox's own third-party source maps, not
// required for the service worker to function, and add ~600 kB for a debug
// aid few will ever use against library internals rather than app code.
for (const pkg of MODULES) {
  for (const variant of ['prod', 'dev']) {
    const file = `${pkg}.${variant}.js`;
    const src = join(root, 'node_modules', pkg, 'build', file);
    copyFileSync(src, join(outDir, file));
  }
}
// The loader script itself.
copyFileSync(
  join(root, 'node_modules', 'workbox-sw', 'build', 'workbox-sw.js'),
  join(outDir, 'workbox-sw.js'),
);

console.log(`Copied Workbox ${WORKBOX_VERSION} (${MODULES.length} modules + loader) to ${outDir}`);
