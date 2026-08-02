/**
 * Shared deployment base-path + canonical URL resolution (P1-3).
 * Used by vite.config.ts, generate-deployment-artifacts.mjs, and Lighthouse runner.
 */

export const DEFAULT_GH_PAGES_BASE = '/AI-Research-Orchestrator/';
export const DEFAULT_SITE_ORIGIN = 'https://qnbs.github.io';

/** Normalize to a leading-slash path; root stays `/`, subpaths end with `/`. */
export function normalizeBasePath(raw, fallback = '/') {
  const value = String(raw ?? fallback).trim();
  if (!value || value === '/') return '/';
  let path = value.startsWith('/') ? value : `/${value}`;
  if (!path.endsWith('/')) path += '/';
  return path;
}

function stripTrailingSlash(value) {
  return value.replace(/\/$/, '');
}

/** Build absolute site URL (trailing slash) from origin + base path. */
export function buildSiteUrl(siteOrigin, basePath) {
  const origin = stripTrailingSlash(siteOrigin);
  const base = normalizeBasePath(basePath);
  const baseNoTrailing = base === '/' ? '' : stripTrailingSlash(base);
  return `${origin}${baseNoTrailing}/`;
}

/** Build absolute asset URL under the deployed base path. */
export function buildAssetUrl(siteOrigin, basePath, assetPath) {
  const site = buildSiteUrl(siteOrigin, basePath);
  const normalized = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `${stripTrailingSlash(site)}/${normalized}`;
}

/**
 * @param {{ mode?: string; env?: Record<string, string | undefined> }} options
 */
export function resolveDeploymentConfig(options = {}) {
  const env = options.env ?? process.env;
  const mode = options.mode ?? env.NODE_ENV ?? 'development';
  const isProduction = mode === 'production';

  const basePath = isProduction
    ? normalizeBasePath(env.VITE_BASE_PATH, DEFAULT_GH_PAGES_BASE)
    : '/';

  const siteOrigin = stripTrailingSlash(env.VITE_SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN);
  const siteUrl = buildSiteUrl(siteOrigin, basePath);
  const ogImageUrl = buildAssetUrl(siteOrigin, basePath, 'icons/icon-512.png');
  const previewUrl = `http://127.0.0.1:4173${basePath}`;

  return { basePath, siteOrigin, siteUrl, ogImageUrl, previewUrl };
}
