#!/usr/bin/env node
/**
 * CI bundle budget gate (P1-1).
 * Fails when gzipped JS assets exceed configured ceilings after `pnpm run build`.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { createGzip } from 'node:zlib';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';

/** Soft ceilings (gzip kB). Tuned after Phase-2 chart consolidation (Recharts-only). */
const BUDGETS = {
  maxChunkGzipKb: 200,
  maxEntryGzipKb: 400,
  maxVendorChartsGzipKb: 180,
};

const root = path.resolve(process.cwd(), 'dist');

async function gzipSize(buf) {
  const chunks = [];
  const gz = createGzip({ level: 9 });
  await pipeline(
    Readable.from(buf),
    gz,
    async function* (source) {
      for await (const chunk of source) chunks.push(chunk);
    },
  );
  return Buffer.concat(chunks).length;
}

async function collectJsFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await collectJsFiles(full, rel)));
    } else if (e.name.endsWith('.js')) {
      files.push({ rel, full });
    }
  }
  return files;
}

function kb(bytes) {
  return (bytes / 1024).toFixed(1);
}

async function main() {
  let files;
  try {
    files = await collectJsFiles(root);
  } catch {
    console.error('dist/ missing — run `pnpm run build` first.');
    process.exit(1);
  }

  const violations = [];
  const rows = [];

  for (const { rel, full } of files) {
    const rawBuf = await readFile(full);
    const gz = await gzipSize(rawBuf);
    const st = await stat(full);
    rows.push({ rel, raw: st.size, gz });

    const gzKb = gz / 1024;
    if (rel.startsWith('chunks/') && gzKb > BUDGETS.maxChunkGzipKb) {
      violations.push(`${rel}: gzip ${kb(gz)} kB > ${BUDGETS.maxChunkGzipKb} kB chunk budget`);
    }
    if (rel.startsWith('js/') && gzKb > BUDGETS.maxEntryGzipKb) {
      violations.push(`${rel}: gzip ${kb(gz)} kB > ${BUDGETS.maxEntryGzipKb} kB entry budget`);
    }
    if (rel.includes('vendor-charts') && gzKb > BUDGETS.maxVendorChartsGzipKb) {
      violations.push(
        `${rel}: gzip ${kb(gz)} kB > ${BUDGETS.maxVendorChartsGzipKb} kB vendor-charts budget`,
      );
    }
  }

  rows.sort((a, b) => b.gz - a.gz);
  console.log('Bundle budget report (top 15 by gzip):');
  for (const r of rows.slice(0, 15)) {
    console.log(`  ${kb(r.gz).padStart(7)} kB gz | ${kb(r.raw).padStart(7)} kB raw | ${r.rel}`);
  }

  if (violations.length) {
    console.error('\nBundle budget FAILED:');
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log('\nBundle budget OK.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
