#!/usr/bin/env node
/**
 * Post-build deployment artifact patching (P1-3).
 * Replaces placeholders in dist/index.html and dist/manifest.json using
 * VITE_BASE_PATH / VITE_SITE_ORIGIN — must run before patch-csp-hashes.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveDeploymentConfig } from './lib/deploymentConfig.mjs';

const distDir = resolve(process.cwd(), 'dist');
const config = resolveDeploymentConfig({ mode: 'production' });

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

console.log(
  `generate-deployment-artifacts: base=${config.basePath} site=${config.siteUrl}`,
);
