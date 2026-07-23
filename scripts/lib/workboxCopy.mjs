/**
 * Shared copy logic for Workbox's pre-built module files, used by both
 * scripts/copy-workbox.mjs (the real copy) and
 * scripts/check-workbox-vendor-drift.mjs (a dry-run into a temp dir, diffed
 * against what's committed under public/). Keeping the copy logic in one
 * place means the check can never itself drift from what copying actually does.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const WORKBOX_VERSION = '7.0.0';

export const WORKBOX_MODULES = [
  'workbox-core',
  'workbox-routing',
  'workbox-strategies',
  'workbox-cacheable-response',
  'workbox-expiration',
  'workbox-precaching',
];

// Each build file ends with a `//# sourceMappingURL=<name>.js.map` comment;
// the .map itself isn't copied (~600 kB of third-party debug data), so left
// in place that comment 404s under our own origin for anyone debugging with
// devtools open. Strip it.
function copyStrippingSourceMapComment(src, dest) {
  const content = readFileSync(src, 'utf-8').replace(/\n\/\/# sourceMappingURL=.*\n?$/, '\n');
  writeFileSync(dest, content);
}

// public/sw.js hardcodes workbox.setConfig({ debug: false, ... }) - not
// gated on hostname/env - so Workbox's loader (workbox-sw.js) always resolves
// its per-module importScripts() to the `.prod.js` variant. Copying `.dev.js`
// too would be ~216 kB of dead weight: committed, built into dist/, deployed,
// and tracked forever by check-workbox-vendor-drift.mjs for zero functional
// benefit. Only copy `.prod.js` unless debug ever becomes conditional.
export function copyWorkboxFiles(root, outDir) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  for (const pkg of WORKBOX_MODULES) {
    const file = `${pkg}.prod.js`;
    const src = join(root, 'node_modules', pkg, 'build', file);
    copyStrippingSourceMapComment(src, join(outDir, file));
  }
  // The loader script itself.
  copyStrippingSourceMapComment(
    join(root, 'node_modules', 'workbox-sw', 'build', 'workbox-sw.js'),
    join(outDir, 'workbox-sw.js'),
  );
}
