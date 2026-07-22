#!/usr/bin/env node
/**
 * Fails CI if dist/index.html references a CDN host outside an explicit
 * allowlist, or reintroduces an import map. Guards the WS-A decision
 * (ADR 0011) to bundle every JS dependency locally instead of loading it
 * from a CDN at runtime.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ALLOWED_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

const distHtml = resolve(process.cwd(), 'dist/index.html');

let html;
try {
  html = readFileSync(distHtml, 'utf8');
} catch {
  console.error('check-no-cdn-scripts: dist/index.html not found — run build first');
  process.exit(1);
}

/** Reads an HTML attribute's value from a tag's source text, quoted or not. */
function getAttr(tagHtml, attrName) {
  const re = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');
  const m = tagHtml.match(re);
  if (!m) return undefined;
  return m[1] ?? m[2] ?? m[3];
}

/**
 * Resolves an attribute value to an external hostname, or null if it isn't
 * one (relative path, data:/blob: URI, or unparseable). Protocol-relative
 * URLs ("//host/path") are real external references despite looking
 * relative, so they're normalized to https: before parsing rather than
 * discarded as unparseable.
 */
function extractHost(url) {
  const normalized = url.startsWith('//') ? `https:${url}` : url;
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.hostname : null;
}

const violations = [];

// Only <link> rels that make the browser actually fetch something belong
// here — rel="canonical" (and similar purely-referential rels like
// "alternate") point at this app's own production URL for SEO and are never
// fetched, so they're not part of this CDN surface at all. A `rel` attribute
// can carry multiple whitespace-separated tokens (e.g. "alternate
// stylesheet"), so every token is checked individually.
const FETCHED_LINK_RELS = new Set([
  'stylesheet',
  'preconnect',
  'preload',
  'prefetch',
  'dns-prefetch',
  'modulepreload',
  'icon',
  'apple-touch-icon',
  'manifest',
]);

for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
  const tag = match[0];
  const type = getAttr(tag, 'type');
  if (type?.toLowerCase() === 'importmap') {
    violations.push(
      'Found a <script type="importmap"> - CDN import maps were removed (ADR 0011); ' +
        'all JS dependencies must be bundled by Vite instead.',
    );
    continue;
  }
  const src = getAttr(tag, 'src');
  if (!src) continue;
  const host = extractHost(src);
  if (host && !ALLOWED_HOSTS.has(host)) {
    violations.push(`<script src="${src}"> references a disallowed host: ${host}`);
  }
}

for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
  const tag = match[0];
  const relTokens = (getAttr(tag, 'rel') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!relTokens.some((token) => FETCHED_LINK_RELS.has(token))) continue;

  const href = getAttr(tag, 'href');
  if (!href) continue;

  const host = extractHost(href);
  if (host && !ALLOWED_HOSTS.has(host)) {
    violations.push(
      `<link rel="${relTokens.join(' ')}" href="${href}"> references a disallowed host: ${host}`,
    );
  }
}

if (violations.length > 0) {
  console.error('check-no-cdn-scripts FAILED:');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`check-no-cdn-scripts OK (allowlist: ${[...ALLOWED_HOSTS].join(', ')}).`);
