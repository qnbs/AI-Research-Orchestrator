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

function extractHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null; // relative URL, data:, etc. - not an external host
  }
}

const violations = [];

if (/<script[^>]*\btype=["']importmap["']/i.test(html)) {
  violations.push(
    'Found a <script type="importmap"> - CDN import maps were removed (ADR 0011); ' +
      'all JS dependencies must be bundled by Vite instead.',
  );
}

for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
  const host = extractHost(match[1]);
  if (host && !ALLOWED_HOSTS.has(host)) {
    violations.push(`<script src="${match[1]}"> references a disallowed host: ${host}`);
  }
}

// Only <link> rels that make the browser actually fetch something belong
// here — rel="canonical" (and similar purely-referential rels like
// "alternate") point at this app's own production URL for SEO and are never
// fetched, so they're not part of this CDN surface at all.
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

for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
  const relMatch = match[0].match(/\brel=["']([^"']+)["']/i);
  const rel = relMatch?.[1]?.toLowerCase();
  if (!rel || !FETCHED_LINK_RELS.has(rel)) continue;

  const hrefMatch = match[0].match(/\bhref=["']([^"']+)["']/i);
  if (!hrefMatch) continue;

  const host = extractHost(hrefMatch[1]);
  if (host && !ALLOWED_HOSTS.has(host)) {
    violations.push(
      `<link rel="${rel}" href="${hrefMatch[1]}"> references a disallowed host: ${host}`,
    );
  }
}

if (violations.length > 0) {
  console.error('check-no-cdn-scripts FAILED:');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`check-no-cdn-scripts OK (allowlist: ${[...ALLOWED_HOSTS].join(', ')}).`);
