#!/usr/bin/env node
/**
 * Fails when tracked files contain unresolved git merge conflict markers.
 * Rebase/amend flows can commit conflict text without running lint-staged.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MARKERS = [/^<<<<<<< /m, /^>>>>>>> /m, /^=======$/m];

const BINARY_EXT =
  /\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|eot|mp4|zip|gz|br|wasm)$/i;

const files = execSync('git ls-files', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const offenders = [];

for (const file of files) {
  if (file.startsWith('node_modules/') || BINARY_EXT.test(file)) continue;
  try {
    const text = readFileSync(file, 'utf8');
    if (MARKERS.some((re) => re.test(text))) offenders.push(file);
  } catch {
    /* unreadable — skip */
  }
}

if (offenders.length > 0) {
  console.error('check-no-conflict-markers: unresolved merge conflict markers in:');
  for (const f of offenders) console.error(`  - ${f}`);
  process.exit(1);
}
