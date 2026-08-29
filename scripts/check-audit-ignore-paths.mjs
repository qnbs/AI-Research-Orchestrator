#!/usr/bin/env node
/**
 * Guard `pnpm.auditConfig.ignoreGhsas` so a global advisory ignore cannot hide
 * the same GHSA on a production dependency path.
 *
 * Each ignored GHSA must be listed in ALLOWED_AUDIT_IGNORES with the package
 * and the only allowed ancestor. Every `pnpm why --json` chain is checked
 * independently: a mixed tree (allowed LHCI path + a separate production path)
 * fails. If that package leaves the tree, remove the ignore — this script
 * fails on a stale exception.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Allow-list for `auditConfig.ignoreGhsas`. Adding a GHSA to the workspace
 * file without a matching entry here fails CI.
 *
 * @type {Record<string, { packageName: string, mustPassThrough: string }>}
 */
const ALLOWED_AUDIT_IGNORES = {
  // Unpatched extract-zip (GHSA-jmr9-qjv8-65gv). Only path: LHCI Chrome unpack.
  'GHSA-jmr9-qjv8-65gv': {
    packageName: 'extract-zip',
    mustPassThrough: '@lhci/cli',
  },
};

/**
 * @param {string} yaml
 * @returns {string[]}
 */
export function parseIgnoreGhsas(yaml) {
  const ids = [];
  let inList = false;
  for (const line of yaml.split('\n')) {
    if (/^\s*ignoreGhsas:\s*$/.test(line)) {
      inList = true;
      continue;
    }
    if (!inList) continue;
    const item = line.match(/^\s+-\s+["']?(GHSA-[A-Za-z0-9-]+)["']?\s*$/);
    if (item) {
      ids.push(item[1]);
      continue;
    }
    if (/^\s*$/.test(line) || /^\s+#/.test(line)) continue;
    break;
  }
  return ids;
}

/**
 * @typedef {{ name: string, depField?: string, deduped?: boolean, dependents?: WhyNode[] }} WhyNode
 * @typedef {{ name: string, depField: string | null, deduped: boolean }} ChainEntry
 */

/**
 * Flatten one `pnpm why --json` node into root→leaf name chains.
 * @param {WhyNode} node
 * @param {ChainEntry[]} prefix
 * @returns {ChainEntry[][]}
 */
export function walkChains(node, prefix = []) {
  const here = prefix.concat({
    name: node.name,
    depField: node.depField ?? null,
    deduped: Boolean(node.deduped),
  });
  const kids = node.dependents ?? [];
  if (kids.length === 0) return [here];
  return kids.flatMap((child) => walkChains(child, here));
}

/**
 * @param {ChainEntry[][]} chains
 * @param {{ packageName: string, mustPassThrough: string, appName: string }} rule
 * @returns {string | null} error message, or null when every chain is allowed
 */
export function assertChains(chains, rule) {
  if (chains.length === 0) {
    return `${rule.packageName} has no dependency chains`;
  }
  for (const chain of chains) {
    const names = chain.map((entry) => entry.name);
    const rendered = names.join(' → ');
    if (!names.includes(rule.mustPassThrough)) {
      return `disallowed path (missing ${rule.mustPassThrough}): ${rendered}`;
    }
    const app = [...chain].reverse().find((entry) => entry.name === rule.appName);
    if (app?.depField && app.depField !== 'devDependencies') {
      return `${rule.packageName} reaches ${rule.appName} via ${app.depField}: ${rendered}`;
    }
  }
  return null;
}

function fail(message) {
  console.error(`check-audit-ignore-paths FAILED:\n  ${message}`);
  process.exit(1);
}

function whyPackageJson(packageName) {
  try {
    const stdout = execFileSync('pnpm', ['why', packageName, '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(stdout || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      throw err;
    }
    const stderr = typeof err === 'object' && err && 'stderr' in err ? String(err.stderr) : '';
    const stdout = typeof err === 'object' && err && 'stdout' in err ? String(err.stdout) : '';
    if (stdout.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(stdout);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        /* fall through */
      }
    }
    fail(`pnpm why ${packageName} --json failed:\n${stdout}\n${stderr}`);
  }
}

function runRegressionFixtures() {
  const rule = {
    packageName: 'extract-zip',
    mustPassThrough: '@lhci/cli',
    appName: 'ai-research-orchestrator',
  };

  const allowed = walkChains({
    name: 'extract-zip',
    dependents: [
      {
        name: '@lhci/cli',
        dependents: [{ name: 'ai-research-orchestrator', depField: 'devDependencies' }],
      },
    ],
  });
  const allowedErr = assertChains(allowed, rule);
  if (allowedErr) fail(`fixture allowed LHCI path failed: ${allowedErr}`);

  const mixed = walkChains({
    name: 'extract-zip',
    dependents: [
      {
        name: '@lhci/cli',
        dependents: [{ name: 'ai-research-orchestrator', depField: 'devDependencies' }],
      },
      {
        name: 'evil-prod',
        dependents: [{ name: 'ai-research-orchestrator', depField: 'dependencies' }],
      },
    ],
  });
  const mixedErr = assertChains(mixed, rule);
  if (!mixedErr) {
    fail('fixture mixed production path should have failed path-by-path validation');
  }
}

function main() {
  runRegressionFixtures();

  const sample = 'auditConfig:\n  ignoreGhsas:\n    - GHSA-jmr9-qjv8-65gv\n';
  const parsedSample = parseIgnoreGhsas(sample);
  if (parsedSample.length !== 1 || parsedSample[0] !== 'GHSA-jmr9-qjv8-65gv') {
    fail(`parser self-check failed: ${JSON.stringify(parsedSample)}`);
  }

  const quotedDouble = parseIgnoreGhsas('auditConfig:\n  ignoreGhsas:\n    - "GHSA-jmr9-qjv8-65gv"\n');
  const quotedSingle = parseIgnoreGhsas("auditConfig:\n  ignoreGhsas:\n    - 'GHSA-jmr9-qjv8-65gv'\n");
  if (quotedDouble[0] !== 'GHSA-jmr9-qjv8-65gv' || quotedSingle[0] !== 'GHSA-jmr9-qjv8-65gv') {
    fail(
      `quoted GHSA parser fixture failed: ${JSON.stringify({ quotedDouble, quotedSingle })}`,
    );
  }

  const workspace = readFileSync(path.join(ROOT, 'pnpm-workspace.yaml'), 'utf8');
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const ignored = parseIgnoreGhsas(workspace);

  for (const ghsa of ignored) {
    const rule = ALLOWED_AUDIT_IGNORES[ghsa];
    if (!rule) {
      fail(
        `${ghsa} is in auditConfig.ignoreGhsas but not in ALLOWED_AUDIT_IGNORES ` +
          `(scripts/check-audit-ignore-paths.mjs). Document the production-safe path or remove the ignore.`,
      );
    }

    if (pkg.dependencies?.[rule.packageName]) {
      fail(
        `${ghsa} ignore covers ${rule.packageName}, which is a production dependency. ` +
          `Remove the ignore or move the package off the production graph.`,
      );
    }

    const whyTree = whyPackageJson(rule.packageName);
    if (whyTree.length === 0) {
      fail(
        `${ghsa} is ignored, but ${rule.packageName} is no longer in the tree. ` +
          `Remove ${ghsa} from auditConfig.ignoreGhsas.`,
      );
    }

    const chains = whyTree.flatMap((node) => walkChains(node));
    const pathError = assertChains(chains, {
      packageName: rule.packageName,
      mustPassThrough: rule.mustPassThrough,
      appName: pkg.name,
    });
    if (pathError) fail(`${ghsa}: ${pathError}`);
  }

  console.log(
    `check-audit-ignore-paths OK (${ignored.length} ignored GHSA(s), every why-chain on a documented non-production path).`,
  );
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main();
}
