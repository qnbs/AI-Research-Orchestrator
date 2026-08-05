#!/usr/bin/env node
/**
 * Post-build deployment artifact patching (P1-3).
 * Replaces placeholders in dist/index.html and dist/manifest.json using
 * VITE_BASE_PATH / VITE_SITE_ORIGIN — must run before patch-csp-hashes.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { resolveDeploymentConfig } from './lib/deploymentConfig.mjs';

const distDir = resolve(process.cwd(), 'dist');
// Mirror vite.config.ts's own env resolution exactly (same loadEnv call) so a
// VITE_BASE_PATH set only via .env.production - not process.env - still
// produces the same base path Vite itself built dist/ with. Resolving from
// process.env alone would silently diverge from Vite's actual <base> tag,
// including for the build-time assertion below.
const env = loadEnv('production', process.cwd(), '');
const config = resolveDeploymentConfig({ mode: 'production', env });

function patchFile(relPath, replacements) {
  const filePath = resolve(distDir, relPath);
  let content = readFileSync(filePath, 'utf8');
  for (const [marker, value] of replacements) {
    if (!content.includes(marker)) {
      throw new Error(
        `generate-deployment-artifacts: marker ${marker} missing in dist/${relPath}`,
      );
    }
    content = content.replaceAll(marker, value);
  }
  writeFileSync(filePath, content);
}

patchFile('index.html', [
  ['__DEPLOY_SITE_URL__', config.siteUrl],
  ['__DEPLOY_OG_IMAGE_URL__', config.ogImageUrl],
]);

patchFile('manifest.json', [['__DEPLOY_BASE_PATH__', config.basePath]]);

// Regression guard for the 531885f base-href defect: register-sw.js derives its
// service-worker registration scope from document.querySelector('base[href]'),
// so the built HTML must actually contain the <base> tag Vite's transformIndexHtml
// plugin injects (src/lib/deploymentConfig.ts buildBaseHrefTag). A silently missing
// tag here means SW registration would fail on any non-root deployment.
const builtIndexHtml = readFileSync(resolve(distDir, 'index.html'), 'utf8');
const expectedBaseTag = `<base href="${config.basePath}">`;
if (!builtIndexHtml.includes(expectedBaseTag)) {
  throw new Error(
    `generate-deployment-artifacts: dist/index.html is missing ${expectedBaseTag} - ` +
      'service-worker registration would silently fail on this deployment base path.',
  );
}

console.log(
  `generate-deployment-artifacts: base=${config.basePath} site=${config.siteUrl}`,
);
