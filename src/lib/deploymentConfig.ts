/**
 * Runtime deployment URL helpers (P1-3).
 * Build-time canonical URLs are injected via scripts/generate-deployment-artifacts.mjs.
 */

export const DEFAULT_GH_PAGES_BASE = '/AI-Research-Orchestrator/';
export const DEFAULT_SITE_ORIGIN = 'https://qnbs.github.io';

/** Normalize to a leading-slash path; root stays `/`, subpaths end with `/`. */
export function normalizeBasePath(raw?: string, fallback = '/'): string {
  const value = String(raw ?? fallback).trim();
  if (!value || value === '/') return '/';
  let path = value.startsWith('/') ? value : `/${value}`;
  if (!path.endsWith('/')) path += '/';
  return path;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

export function buildSiteUrl(siteOrigin: string, basePath: string): string {
  const origin = stripTrailingSlash(siteOrigin);
  const base = normalizeBasePath(basePath);
  const baseNoTrailing = base === '/' ? '' : stripTrailingSlash(base);
  return `${origin}${baseNoTrailing}/`;
}

export function buildAssetUrl(siteOrigin: string, basePath: string, assetPath: string): string {
  const site = buildSiteUrl(siteOrigin, basePath);
  const normalized = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `${stripTrailingSlash(site)}/${normalized}`;
}

/** Resolve public site origin for OG/social metadata (client-visible, not secret). */
export function resolveSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_ORIGIN;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return stripTrailingSlash(fromEnv.trim());
  }
  return DEFAULT_SITE_ORIGIN;
}

export type BaseHrefTag = {
  tag: 'base';
  attrs: { href: string };
  injectTo: 'head-prepend';
};

/**
 * Vite `transformIndexHtml` tag descriptor for the `<base>` element.
 * public/register-sw.js reads `document.querySelector('base[href]')` to derive its
 * service-worker registration scope (ADR 0004) - this must stay the single source of
 * truth for basePath so the two mechanisms can't diverge again (see 531885f regression).
 */
export function buildBaseHrefTag(basePath: string): BaseHrefTag {
  return {
    tag: 'base',
    attrs: { href: normalizeBasePath(basePath) },
    injectTo: 'head-prepend',
  };
}
