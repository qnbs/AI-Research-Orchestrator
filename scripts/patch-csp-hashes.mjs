#!/usr/bin/env node
/**
 * Recalculate the CSP SHA-256 hash for the inline JSON-LD script in
 * dist/index.html. Vite may rewrite whitespace in index.html during build;
 * the source hash then mismatches and CSP audits fail.
 *
 * Fails loudly if any OTHER inline <script> (no src attribute) is found:
 * this repo's CSP has no 'unsafe-inline' for scripts, so a second inline
 * script means either this file needs updating to hash it too, or an
 * unreviewed inline script was introduced and should be removed instead.
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

// Every <script> tag without a src attribute is inline and subject to CSP
// hashing; a script with src is external and not covered by this mechanism.
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

const ldScripts = inlineScripts.filter((m) => /type=["']application\/ld\+json["']/i.test(m[0]));
if (ldScripts.length !== 1) {
  throw new Error(
    `patch-csp-hashes: expected exactly 1 inline JSON-LD script, found ${ldScripts.length}`,
  );
}
const unexpected = inlineScripts.filter((m) => !ldScripts.includes(m));
if (unexpected.length > 0) {
  throw new Error(
    `patch-csp-hashes: found ${unexpected.length} unrecognized inline <script> tag(s) beyond ` +
      `the JSON-LD block — hash them explicitly here (or externalize them) before they can ship. ` +
      `First: ${unexpected[0][0].slice(0, 120)}...`,
  );
}

const hashLd = sha256Base64(ldScripts[0][1]);

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
  return `script-src ${cleaned} '${hashLd}'`;
});

html = html.replace(cspRe, `$1${csp}$3`);
writeFileSync(distHtml, html);
console.log(`patch-csp-hashes: JSON-LD ${hashLd}`);
console.log('patch-csp-hashes: updated dist/index.html CSP');
