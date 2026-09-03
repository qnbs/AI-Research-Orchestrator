#!/usr/bin/env node
/**
 * Docs/config drift gate — keeps agent instructions aligned with package.json,
 * workflows, and docs/project-facts.json (P1-1).
 */
import { readFile } from 'node:fs/promises';
import {
  assertFactsAppVersion,
  assertMatch,
  assertNoMatch,
  assertPnpmMajorMention,
  escapeRegExp,
  extractTopLevelCancelInProgress,
  failIfErrors,
  isPullRequestOnlyCancelExpression,
  isUnconditionalCancelTrue,
  runProjectFactsChecks,
  workflowJobHasContinueOnError,
} from './lib/docsDriftFacts.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

async function read(relPath) {
  return readFile(`${ROOT}/${relPath}`, 'utf8');
}

async function readOptional(relPath) {
  try {
    return await read(relPath);
  } catch {
    return null;
  }
}

function majorOf(version) {
  const match = /^(\d+)/.exec(version ?? '');
  return match ? match[1] : null;
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

/** @param {string[]} errors */
async function checkCspEndpointDrift(errors) {
  const html = await read('index.html');
  const policy = await read('src/lib/endpointPolicy.ts');
  const htmlOrigins = new Set(extractConnectOrigins(html));
  const codeOrigins = new Set(extractPolicyOrigins(policy));

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
}

function exitCspEndpoint(errors) {
  if (failIfErrors(errors, 'check-csp-endpoint-drift')) process.exit(1);
  console.log('check-csp-endpoint-drift OK (connect-src aligned with endpointPolicy).');
}

async function runCspEndpointOnly() {
  const errors = [];
  await checkCspEndpointDrift(errors);
  exitCspEndpoint(errors);
}

function assertAgentGuideVersions(agents, claude, indexMdc, security, appVersion, viteMajor, viteSpec, errors) {
  assertMatch(
    agents,
    new RegExp(`v${escapeRegExp(appVersion)}(?![0-9A-Za-z.+-])`),
    `AGENTS.md must mention app version v${appVersion}`,
    errors,
  );
  assertMatch(
    agents,
    new RegExp(`Vite ${viteMajor}\\b`),
    `AGENTS.md must reference Vite ${viteMajor} (package.json has vite@${viteSpec})`,
    errors,
  );
  assertNoMatch(
    agents,
    /src\/services\/heuristics\//,
    'AGENTS.md must not reference deleted src/services/heuristics/',
    errors,
  );
  assertNoMatch(
    claude,
    /src\/services\/heuristics\//,
    'CLAUDE.md must not reference deleted src/services/heuristics/',
    errors,
  );
  assertMatch(
    claude,
    /src\/services\/nonAi\//,
    'CLAUDE.md must reference consolidated src/services/nonAi/',
    errors,
  );
  assertNoMatch(
    claude,
    /claude-code-review\.yml/,
    'CLAUDE.md must not reference removed claude-code-review workflow',
    errors,
  );
  assertMatch(
    indexMdc,
    new RegExp(`Vite ${viteMajor}\\b`),
    `.cursor/index.mdc must reference Vite ${viteMajor}`,
    errors,
  );
  assertNoMatch(
    indexMdc,
    /src\/services\/heuristics\//,
    '.cursor/index.mdc must not reference deleted heuristics path',
    errors,
  );
  assertMatch(
    indexMdc,
    /src\/services\/nonAi\//,
    '.cursor/index.mdc must reference src/services/nonAi/',
    errors,
  );
  assertMatch(security, /0\.4\.x/, 'SECURITY.md must list 0.4.x as supported', errors);
}

async function runDocsDrift() {
  const errors = [];
  const pkg = JSON.parse(await read('package.json'));
  const agents = await read('AGENTS.md');
  const claude = await read('CLAUDE.md');
  const indexMdc = await read('.cursor/index.mdc');
  const security = await read('SECURITY.md');
  const facts = JSON.parse(await read('docs/project-facts.json'));

  const viteSpec = pkg.devDependencies?.vite ?? pkg.dependencies?.vite;
  const viteMajor = majorOf(viteSpec);
  const pnpmVersion = String(pkg.packageManager ?? '').replace(/^pnpm@/, '');
  const appVersion = pkg.version;

  assertAgentGuideVersions(agents, claude, indexMdc, security, appVersion, viteMajor, viteSpec, errors);
  assertPnpmMajorMention(agents, pnpmVersion, errors);
  assertFactsAppVersion(facts, appVersion, errors);

  await runProjectFactsChecks(errors, facts, {
    read,
    readOptional,
    ROOT,
    skipProductCopy: false,
  });

  if (failIfErrors(errors, 'check-docs-drift')) process.exit(1);
  console.log(
    `check-docs-drift OK (v${appVersion}, Vite ${viteMajor}, pnpm ${pnpmVersion || 'n/a'}, facts v${facts.adr?.minNumberedRecords ?? '?'})`,
  );
}

async function main() {
  if (process.argv.includes('--csp-endpoint')) {
    await runCspEndpointOnly();
    return;
  }
  await runDocsDrift();
}

function assertConcurrencyFixture(fixture) {
  const got = extractTopLevelCancelInProgress(fixture.yaml);
  if (got !== fixture.expect) {
    throw new Error(
      `concurrency self-test "${fixture.name}": expected ${fixture.expect}, got ${got}`,
    );
  }
  if (fixture.prOnly && !isPullRequestOnlyCancelExpression(got)) {
    throw new Error(`concurrency self-test "${fixture.name}": expected PR-only`);
  }
}

function assertConcurrencyFixtureFlag(fixture) {
  const got = extractTopLevelCancelInProgress(fixture.yaml);
  if (fixture.unconditional && !isUnconditionalCancelTrue(got)) {
    throw new Error(`concurrency self-test "${fixture.name}": expected unconditional true`);
  }
}

function runConcurrencyParserSelfTest() {
  /** @type {{ name: string; yaml: string; expect: string | null; prOnly?: boolean; unconditional?: boolean }[]} */
  const fixtures = [
    {
      name: 'pr-only expression',
      yaml: `name: X\nconcurrency:\n  group: g\n  cancel-in-progress: \${{ github.event_name == 'pull_request' }}\njobs:\n  a:\n    runs-on: ubuntu-latest\n`,
      expect: "${{ github.event_name == 'pull_request' }}",
      prOnly: true,
    },
    {
      name: 'comment must not satisfy check',
      yaml: `name: X\n# cancel-in-progress: \${{ github.event_name == 'pull_request' }}\nconcurrency:\n  group: g\n  cancel-in-progress: true\n`,
      expect: 'true',
      unconditional: true,
    },
    {
      name: 'quoted text in run step ignored',
      yaml: `name: X\nconcurrency:\n  cancel-in-progress: \${{ github.event_name == 'pull_request' }}\njobs:\n  a:\n    steps:\n      - run: echo "cancel-in-progress: true"\n`,
      expect: "${{ github.event_name == 'pull_request' }}",
      prOnly: true,
    },
    {
      name: 'expression true rejected',
      yaml: `concurrency:\n  cancel-in-progress: \${{ true }}\n`,
      expect: '${{ true }}',
      unconditional: true,
    },
  ];

  for (const fixture of fixtures) {
    assertConcurrencyFixture(fixture);
    assertConcurrencyFixtureFlag(fixture);
  }
  const e2eBlocking = `jobs:\n  e2e:\n    name: Playwright E2E\n    steps:\n      - run: echo ok\n`;
  const e2eAdvisory = `jobs:\n  e2e:\n    name: Playwright E2E\n    continue-on-error: true\n    steps:\n      - run: echo ok\n`;
  if (workflowJobHasContinueOnError(e2eBlocking, 'e2e:')) {
    throw new Error('e2e continue-on-error self-test: blocking job must not match');
  }
  if (!workflowJobHasContinueOnError(e2eAdvisory, 'e2e:')) {
    throw new Error('e2e continue-on-error self-test: advisory job must match');
  }

  console.log('check-docs-drift concurrency parser self-test OK');
}

if (process.argv.includes('--self-test')) {
  try {
    runConcurrencyParserSelfTest();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
} else {
  try {
    runConcurrencyParserSelfTest();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
