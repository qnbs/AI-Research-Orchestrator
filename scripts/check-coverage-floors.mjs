#!/usr/bin/env node
/**
 * Per-module coverage floors for critical paths (audit P1-3).
 * Reads vitest's coverage-summary.json and fails when ratcheted modules regress.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SUMMARY_PATH = path.join(ROOT, 'coverage', 'coverage-summary.json');

/** @typedef {{ lines: number; statements: number; branches: number; functions: number }} FloorPct */

/** @type {Array<{ id: string; pathPattern: RegExp; min: FloorPct; aggregate?: boolean }>} */
const MODULE_FLOORS = [
  {
    id: 'providers',
    pathPattern: /\/src\/services\/providers\//,
    aggregate: true,
    min: { lines: 85, statements: 82, branches: 70, functions: 85 },
  },
  {
    id: 'geminiService',
    pathPattern: /\/src\/services\/geminiService\.ts$/,
    min: { lines: 68, statements: 68, branches: 50, functions: 70 },
  },
  {
    id: 'apiKeyService',
    pathPattern: /\/src\/services\/apiKeyService\.ts$/,
    min: { lines: 91, statements: 86, branches: 82, functions: 80 },
  },
  {
    id: 'claimEvidence',
    pathPattern:
      /\/src\/lib\/claimEvidenceMatcher\.ts$|\/src\/lib\/claimEvidenceConflicts\.ts$|\/src\/lib\/claimValidation\.ts$/,
    aggregate: true,
    min: { lines: 95, statements: 93, branches: 82, functions: 95 },
  },
  {
    id: 'databaseService',
    pathPattern: /\/src\/services\/databaseService\.ts$/,
    min: { lines: 90, statements: 92, branches: 88, functions: 95 },
  },
  {
    id: 'retrieval',
    pathPattern:
      /\/src\/services\/pubmedUtils\.ts$|\/src\/services\/pubmedXmlParser\.ts$|\/src\/services\/arxivUtils\.ts$/,
    aggregate: true,
    min: { lines: 90, statements: 88, branches: 68, functions: 95 },
  },
  {
    id: 'exportProvenance',
    pathPattern: /\/src\/services\/exportService\.ts$|\/src\/lib\/reportExportProvenance\.ts$/,
    aggregate: true,
    min: { lines: 93, statements: 91, branches: 73, functions: 95 },
  },
];

const METRICS = ['lines', 'statements', 'branches', 'functions'];

/** @param {Record<string, unknown>} summary */
function entriesForFloor(summary, floor) {
  return Object.entries(summary).filter(
    ([filePath]) => filePath !== 'total' && floor.pathPattern.test(filePath),
  );
}

/**
 * @param {Array<[string, Record<string, { total: number; covered: number; pct: number }>]>} entries
 * @param {boolean} aggregate
 */
function pctForMetric(entries, metric, aggregate) {
  if (entries.length === 0) return null;

  if (!aggregate) {
    const [, data] = entries[0];
    return data[metric]?.pct ?? null;
  }

  let total = 0;
  let covered = 0;
  for (const [, data] of entries) {
    total += data[metric]?.total ?? 0;
    covered += data[metric]?.covered ?? 0;
  }
  if (total === 0) return 100;
  return (covered / total) * 100;
}

async function main() {
  let raw;
  try {
    raw = await readFile(SUMMARY_PATH, 'utf8');
  } catch {
    console.error(
      'check-coverage-floors FAILED: coverage/coverage-summary.json not found. Run pnpm run test:coverage first.',
    );
    process.exit(1);
  }

  const summary = JSON.parse(raw);
  const errors = [];

  for (const floor of MODULE_FLOORS) {
    const entries = entriesForFloor(summary, floor);
    if (entries.length === 0) {
      errors.push(`${floor.id}: no coverage entries matched ${floor.pathPattern}`);
      continue;
    }

    for (const metric of METRICS) {
      const actual = pctForMetric(entries, metric, floor.aggregate ?? false);
      const min = floor.min[metric];
      if (actual === null || actual + 1e-9 < min) {
        const scope = floor.aggregate ? 'aggregate' : path.basename(entries[0][0]);
        errors.push(
          `${floor.id} (${scope}) ${metric}: ${actual?.toFixed(2) ?? 'n/a'}% < floor ${min}%`,
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error('check-coverage-floors FAILED:\n');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(
    `check-coverage-floors OK (${MODULE_FLOORS.map((f) => f.id).join(', ')}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
