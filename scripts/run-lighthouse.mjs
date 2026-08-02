#!/usr/bin/env node
/**
 * Run Lighthouse CI against the preview URL derived from VITE_BASE_PATH (P1-3).
 */
import { execSync } from 'node:child_process';
import { resolveDeploymentConfig } from './lib/deploymentConfig.mjs';

const { previewUrl } = resolveDeploymentConfig({ mode: 'production' });
execSync(`pnpm exec lhci autorun --collect.url=${previewUrl}`, {
  stdio: 'inherit',
  env: process.env,
});
