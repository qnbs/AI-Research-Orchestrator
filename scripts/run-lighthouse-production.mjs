#!/usr/bin/env node
/**
 * Lighthouse against the live GitHub Pages deployment (master prompt Wave F evidence).
 * Does not start a local preview server — uses deploymentConfig site origin + base path.
 */
import { execSync } from 'node:child_process';
import { resolveDeploymentConfig } from './lib/deploymentConfig.mjs';

const { siteOrigin, basePath } = resolveDeploymentConfig({ mode: 'production' });
const url = new URL(basePath, siteOrigin).href;

console.log(`Collecting Lighthouse for production: ${url}`);
execSync(
  `pnpm exec lhci autorun --config=lighthouserc.production.json --collect.url=${JSON.stringify(url)}`,
  { stdio: 'inherit', env: process.env },
);
