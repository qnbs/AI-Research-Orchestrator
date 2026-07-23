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

export function copyWorkboxFiles(root, outDir) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  for (const pkg of WORKBOX_MODULES) {
    for (const variant of ['prod', 'dev']) {
      const file = `${pkg}.${variant}.js`;
      const src = join(root, 'node_modules', pkg, 'build', file);
      copyStrippingSourceMapComment(src, join(outDir, file));
    }
  }
  // The loader script itself.
  copyStrippingSourceMapComment(
    join(root, 'node_modules', 'workbox-sw', 'build', 'workbox-sw.js'),
    join(outDir, 'workbox-sw.js'),
  );
}
