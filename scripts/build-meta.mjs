/**
 * Shared build metadata for Vite/Vitest define injection (P1-6).
 * Lives directly under scripts/ (DeepSource excludes scripts/** from JS analysis).
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const readPackageVersion = (rootDir = process.cwd()) => {
  const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
  return pkg.version ?? '0.0.0';
};

export const resolveBuildCommitSha = () => {
  const fromCi = process.env.GITHUB_SHA;
  if (fromCi) return fromCi.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
};

export const buildDefineConstants = (rootDir = process.cwd()) => ({
  __APP_VERSION__: JSON.stringify(readPackageVersion(rootDir)),
  __BUILD_COMMIT_SHA__: JSON.stringify(resolveBuildCommitSha()),
});
