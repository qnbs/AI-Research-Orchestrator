#!/usr/bin/env node
/**
 * Recalculate CSP SHA-256 hashes for inline JSON-LD + importmap in dist/index.html.
 * Vite may rewrite whitespace in index.html during build; source hashes then mismatch
 * and Lighthouse best-practices / CSP audits fail.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distHtml = resolve(process.cwd(), 'dist/index.html');

let html;
try {
  html = readFileSync(distHtml, 'utf8');
} catch (err) {
  console.error('patch-csp-hashes: dist/index.html not found — run build first');
  process.exit(1);
}

function sha256Base64(body) {
  return `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`;
}

const ldMatch = html.match(
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
);
const imapMatch = html.match(/<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
if (!ldMatch) throw new Error('patch-csp-hashes: missing JSON-LD script');
if (!imapMatch) throw new Error('patch-csp-hashes: missing importmap script');

const hashLd = sha256Base64(ldMatch[1]);
const hashImap = sha256Base64(imapMatch[1]);

// content="..." uses double quotes; values contain single-quoted CSP tokens
const cspRe =
  /(<meta\b[^>]*\bhttp-equiv=["']Content-Security-Policy["'][^>]*\bcontent=")([^"]*)(")/i;
const cspMatch = html.match(cspRe);
if (!cspMatch) throw new Error('patch-csp-hashes: CSP meta not found');

let csp = cspMatch[2];
if (!/script-src\s/.test(csp)) {
  throw new Error('patch-csp-hashes: script-src directive missing');
}
csp = csp.replace(/script-src\s+([^;]+)/, (_all, sources) => {
  const cleaned = sources
    .replace(/'sha256-[^']+'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (/\bunsafe-inline\b/.test(cleaned)) {
    throw new Error(
      "patch-csp-hashes: script-src must not contain 'unsafe-inline' — refusing to write dist/index.html",
    );
  }
  return `script-src ${cleaned} '${hashLd}' '${hashImap}'`;
});

html = html.replace(cspRe, `$1${csp}$3`);
writeFileSync(distHtml, html);
console.log(`patch-csp-hashes: JSON-LD ${hashLd}`);
console.log(`patch-csp-hashes: importmap ${hashImap}`);
console.log('patch-csp-hashes: updated dist/index.html CSP');
