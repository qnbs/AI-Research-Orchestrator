#!/usr/bin/env node
/**
 * CSP ↔ endpointPolicy drift gate (audit P0-6).
 * Ensures index.html connect-src origins stay aligned with CSP_ALLOWED_ORIGINS.
 */
import { readFile } from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url).pathname;

async function read(rel) {
  return readFile(`${ROOT}/${rel}`, 'utf8');
}

function extractConnectOrigins(html) {
  const match = /connect-src\s+([^;]+)/i.exec(html);
  if (!match) return [];
  return match[1]
    .split(/\s+/)
    .map((t) => t.replace(/'/g, ''))
    .filter((t) => t.startsWith('http'));
}

function extractPolicyOrigins(ts) {
  const block = /CSP_ALLOWED_ORIGINS\s*=\s*new Set\(\[([\s\S]*?)\]\)/.exec(ts);
  if (!block) return [];
  const origins = [];
  const re = /'([^']+)'/g;
  let m;
  while ((m = re.exec(block[1])) !== null) {
    origins.push(m[1]);
  }
  return origins;
}

async function main() {
  const html = await read('index.html');
  const policy = await read('src/lib/endpointPolicy.ts');
  const htmlOrigins = new Set(extractConnectOrigins(html));
  const codeOrigins = new Set(extractPolicyOrigins(policy));
  const errors = [];

  for (const origin of codeOrigins) {
    if (!htmlOrigins.has(origin)) {
      errors.push(`index.html connect-src missing origin from endpointPolicy: ${origin}`);
    }
  }

  for (const origin of htmlOrigins) {
    if (!codeOrigins.has(origin)) {
      errors.push(`endpointPolicy CSP_ALLOWED_ORIGINS missing origin from index.html: ${origin}`);
    }
  }

  if (errors.length > 0) {
    console.error('check-csp-endpoint-drift FAILED:\n');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log('check-csp-endpoint-drift OK (connect-src aligned with endpointPolicy).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
