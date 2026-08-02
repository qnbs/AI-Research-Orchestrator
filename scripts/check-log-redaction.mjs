#!/usr/bin/env node
/**
 * Logging redaction gate — blocks raw console.* in application source (audit P1-5).
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = path.join(ROOT, 'src');

/** Files allowed to call console directly. */
const ALLOWLIST = new Set([
  path.join(SRC, 'lib', 'safeLog.ts'),
  path.join(SRC, 'test', 'setup.ts'),
]);

const CONSOLE_CALL = /\bconsole\.(log|error|warn|info|debug)\s*\(/;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'test' && dir === SRC) {
        // allow src/test/setup.ts only via allowlist; skip e2e + other test helpers
        const setup = path.join(full, 'setup.ts');
        files.push(setup);
        continue;
      }
      files.push(...(await walk(full)));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const files = await walk(SRC);
  const errors = [];

  for (const file of files) {
    if (ALLOWLIST.has(file)) continue;
    const content = await readFile(file, 'utf8');
    if (!CONSOLE_CALL.test(content)) continue;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (CONSOLE_CALL.test(lines[i]) && !lines[i].includes('safeLog')) {
        errors.push(`${path.relative(ROOT, file)}:${i + 1}: raw console call — use safeLogError/safeLogWarn`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('check-log-redaction FAILED:\n');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log('check-log-redaction OK (no raw console.* in application source).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
