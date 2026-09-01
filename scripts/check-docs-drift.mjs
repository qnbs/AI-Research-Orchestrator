#!/usr/bin/env node
/**
 * Docs/config drift gate — keeps agent instructions aligned with package.json,
 * workflows, and docs/project-facts.json (P1-1).
 */
import { readFile, readdir } from 'node:fs/promises';

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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} text @param {RegExp} pattern */
function assertMatch(text, pattern, message, errors) {
  if (!pattern.test(text)) errors.push(message);
}

/** @param {string} text @param {RegExp} pattern */
function assertNoMatch(text, pattern, message, errors) {
  if (pattern.test(text)) errors.push(message);
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

function extractE2eSpecPathsFromWorkflow(workflowYaml) {
  const specs = [];
  const re = /src\/test\/e2e\/[a-z0-9-]+\.spec\.ts/g;
  let m;
  while ((m = re.exec(workflowYaml)) !== null) {
    specs.push(m[0]);
  }
  return [...new Set(specs)];
}

function workflowJobHasContinueOnError(workflowYaml, jobName) {
  const jobBlock = new RegExp(
    `${escapeRegExp(jobName)}:[\\s\\S]*?(?=^\\S|\\z)`,
    'm',
  ).exec(workflowYaml);
  if (!jobBlock) return false;
  return /continue-on-error:\s*true/.test(jobBlock[0]);
}

/**
 * Read top-level `concurrency.cancel-in-progress` (ignores `#` comments and
 * job-level keys). Returns the raw scalar/expression string, or null.
 * @param {string} workflowYaml
 */
function extractTopLevelCancelInProgress(workflowYaml) {
  const lines = workflowYaml.split(/\r?\n/);
  let inConcurrency = false;
  let concurrencyIndent = 0;
  /** @type {string | null} */
  let cancelValue = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.match(/^ */)?.[0].length ?? 0;

    if (!inConcurrency) {
      if (/^concurrency:\s*(#.*)?$/.test(trimmed)) {
        inConcurrency = true;
        concurrencyIndent = indent;
      }
      continue;
    }

    if (indent <= concurrencyIndent) {
      break;
    }

    const withoutComment = trimmed.replace(/\s+#.*$/, '');
    const match = /^cancel-in-progress:\s*(.+)$/.exec(withoutComment);
    if (match) {
      cancelValue = match[1].trim();
    }
  }

  return cancelValue;
}

/** @param {string | null} value */
function isPullRequestOnlyCancelExpression(value) {
  if (!value) return false;
  return /^\$\{\{\s*github\.event_name\s*==\s*'pull_request'\s*\}\}$/.test(value);
}

/** @param {string | null} value */
function isUnconditionalCancelTrue(value) {
  if (!value) return false;
  if (value === 'true') return true;
  return /^\$\{\{\s*true\s*\}\}$/.test(value);
}

/** @param {string[]} errors @param {Record<string, unknown>} facts */
async function checkProjectFacts(errors, facts) {
  const readme = await read('README.md');
  const agents = await read('AGENTS.md');
  const deepsource = await read('.deepsource.toml');
  const vitestConfig = await read('vitest.config.ts');
  const coverageFloors = await read('scripts/check-coverage-floors.mjs');

  for (const phrase of facts.forbiddenReadmePhrases ?? []) {
    if (readme.includes(phrase)) {
      errors.push(`README.md contains forbidden overstated claim: "${phrase}"`);
    }
  }

  for (const phrase of facts.forbiddenAgentsPhrases ?? []) {
    if (agents.includes(phrase)) {
      errors.push(`AGENTS.md contains stale CI phrase: "${phrase}"`);
    }
  }

  const productCopyPaths = facts.productCopyPaths ?? [];
  for (const file of productCopyPaths) {
    const text = await read(file);
    for (const phrase of facts.forbiddenProductCopyPhrases ?? []) {
      if (text.includes(phrase)) {
        errors.push(`${file} contains forbidden overstated claim: "${phrase}"`);
      }
    }
  }

  if (facts.e2e?.mainWorkflowPath) {
    const e2eYaml = await read(facts.e2e.mainWorkflowPath);
    const listed = extractE2eSpecPathsFromWorkflow(e2eYaml);
    const expected = facts.e2e.ciSpecPaths ?? [];
    for (const spec of expected) {
      if (!listed.includes(spec)) {
        errors.push(`${facts.e2e.mainWorkflowPath} missing CI spec: ${spec}`);
      }
    }
    for (const spec of listed) {
      if (!expected.includes(spec)) {
        errors.push(
          `${facts.e2e.mainWorkflowPath} lists ${spec} but docs/project-facts.json ciSpecPaths omits it`,
        );
      }
    }
    const blocking = facts.e2e.mainJobBlocking === true;
    const hasContinue = workflowJobHasContinueOnError(e2eYaml, 'e2e:');
    if (blocking && hasContinue) {
      errors.push(`${facts.e2e.mainWorkflowPath} job must not use continue-on-error (blocking E2E)`);
    }
    if (!blocking && !hasContinue) {
      errors.push(`${facts.e2e.mainWorkflowPath} expected continue-on-error for advisory E2E`);
    }
  }

  if (facts.e2e?.crossBrowserWorkflowPath) {
    const crossYaml = await read(facts.e2e.crossBrowserWorkflowPath);
    const listed = extractE2eSpecPathsFromWorkflow(crossYaml);
    const expected = facts.e2e.ciSpecPaths ?? [];
    for (const spec of expected) {
      if (!listed.includes(spec)) {
        errors.push(`${facts.e2e.crossBrowserWorkflowPath} missing CI spec: ${spec}`);
      }
    }
    for (const spec of listed) {
      if (!expected.includes(spec)) {
        errors.push(
          `${facts.e2e.crossBrowserWorkflowPath} lists ${spec} but docs/project-facts.json ciSpecPaths omits it`,
        );
      }
    }
    const advisory = facts.e2e.crossBrowserAdvisory === true;
    const hasContinue = /continue-on-error:\s*true/.test(crossYaml);
    if (advisory && !hasContinue) {
      errors.push(`${facts.e2e.crossBrowserWorkflowPath} should be advisory (continue-on-error: true)`);
    }
    if (!advisory && hasContinue) {
      errors.push(
        `${facts.e2e.crossBrowserWorkflowPath} must not use continue-on-error (blocking cross-browser E2E)`,
      );
    }
  }

  for (const spec of facts.e2e?.ciSpecPaths ?? []) {
    if (!agents.includes(spec.replace('src/test/e2e/', ''))) {
      errors.push(`AGENTS.md should reference E2E spec inventory (${spec})`);
    }
  }

  if (facts.ci?.claudeCodeReviewWorkflow === false) {
    const claudeReview = await readOptional('.github/workflows/claude-code-review.yml');
    if (claudeReview) {
      errors.push('claude-code-review.yml must be removed (disabled in project-facts.json)');
    }
  }

  if (facts.ci?.branchGovernancePath) {
    const gov = await readOptional(facts.ci.branchGovernancePath);
    if (!gov) {
      errors.push(`Missing branch governance doc: ${facts.ci.branchGovernancePath}`);
    }
  }

  if (facts.ci?.cancelInProgressOnPullRequestOnly === true) {
    const guarded = facts.ci.concurrencyGuardedWorkflows;
    if (!Array.isArray(guarded) || guarded.length === 0) {
      errors.push(
        'docs/project-facts.json ci.concurrencyGuardedWorkflows must list workflows when cancelInProgressOnPullRequestOnly is true',
      );
    } else {
      for (const wf of guarded) {
        const yaml = await readOptional(wf);
        if (!yaml) {
          errors.push(`Missing concurrency-guarded workflow: ${wf}`);
          continue;
        }
        const cancelValue = extractTopLevelCancelInProgress(yaml);
        if (!isPullRequestOnlyCancelExpression(cancelValue)) {
          errors.push(
            `${wf} top-level concurrency.cancel-in-progress must be \${{ github.event_name == 'pull_request' }} (found: ${cancelValue ?? 'missing'})`,
          );
        }
        if (isUnconditionalCancelTrue(cancelValue)) {
          errors.push(`${wf} must not use unconditional cancel-in-progress: true (would cancel main runs)`);
        }
      }
    }

    // Catch unlisted workflows that still cancel main runs unconditionally.
    const workflowFiles = (await readdir(`${ROOT}/.github/workflows`)).filter((f) =>
      /\.ya?ml$/i.test(f),
    );
    for (const file of workflowFiles) {
      const rel = `.github/workflows/${file}`;
      if (Array.isArray(guarded) && guarded.includes(rel)) continue;
      const yaml = await readOptional(rel);
      if (!yaml) continue;
      const cancelValue = extractTopLevelCancelInProgress(yaml);
      if (isUnconditionalCancelTrue(cancelValue)) {
        errors.push(
          `${rel} has unconditional cancel-in-progress: true — add to ci.concurrencyGuardedWorkflows or use PR-only cancel`,
        );
      }
    }
  }

  if (facts.staticAnalysis?.deepsourceJavaScriptEnabled) {
    if (!/name\s*=\s*["']javascript["'][\s\S]*enabled\s*=\s*true/.test(deepsource)) {
      errors.push('.deepsource.toml must enable javascript analyzer');
    }
  } else if (facts.staticAnalysis?.deepsourceJavaScriptEnabled === false) {
    if (/name\s*=\s*["']javascript["']/.test(deepsource)) {
      errors.push(
        '.deepsource.toml must not declare a javascript analyzer block — disable in DeepSource dashboard (docs/deepsource-dashboard-off.md)',
      );
    }
  }

  const thresholds = facts.coverageThresholds ?? {};
  for (const [metric, value] of Object.entries(thresholds)) {
    const re = new RegExp(`${metric}:\\s*${value}`);
    if (!re.test(vitestConfig)) {
      errors.push(`vitest.config.ts thresholds.${metric} must be ${value} (project-facts.json)`);
    }
    const proseRe = new RegExp(`${value}%\\s*${metric}|${metric}[^\\n]*${value}%`, 'i');
    if (!proseRe.test(agents)) {
      errors.push(`AGENTS.md must document coverage threshold ${metric} ${value}%`);
    }
  }

  for (const [moduleId, min] of Object.entries(facts.coverageModuleFloors ?? {})) {
    for (const [metric, value] of Object.entries(min)) {
      const re = new RegExp(`id:\\s*'${moduleId}'[\\s\\S]*?${metric}:\\s*${value}`);
      if (!re.test(coverageFloors)) {
        errors.push(`check-coverage-floors.mjs floor ${moduleId}.${metric} must be ${value}`);
      }
    }
  }

  const adrFiles = await readdir(`${ROOT}/docs/adr`);
  const numbered = adrFiles.filter((f) => /^\d{4}-.*\.md$/.test(f));
  const minAdr = facts.adr?.minNumberedRecords ?? 0;
  if (numbered.length < minAdr) {
    errors.push(`docs/adr has ${numbered.length} numbered ADRs; expected >= ${minAdr}`);
  }
  if (facts.adr?.indexPath) {
    const adrIndex = await read(facts.adr.indexPath);
    for (const file of numbered) {
      const num = file.slice(0, 4);
      if (!adrIndex.includes(`[${num}]`) && !adrIndex.includes(`(${num})`)) {
        errors.push(`${facts.adr.indexPath} missing index entry for ${file}`);
      }
    }
  }

  for (const providerId of facts.providers?.ids ?? []) {
    assertMatch(
      agents,
      new RegExp(`\\b${escapeRegExp(providerId)}\\b`, 'i'),
      `AGENTS.md must mention provider "${providerId}"`,
      errors,
    );
  }

  const defaultModel = facts.providers?.defaultModels?.[facts.providers?.defaultId];
  if (defaultModel) {
    assertMatch(
      agents,
      new RegExp(escapeRegExp(defaultModel)),
      `AGENTS.md should reference default model ${defaultModel}`,
      errors,
    );
  }

  if (facts.deployment?.defaultBasePath) {
    assertMatch(
      readme,
      new RegExp(escapeRegExp(facts.deployment.defaultBasePath)),
      `README.md must document default base path ${facts.deployment.defaultBasePath}`,
      errors,
    );
    assertMatch(
      readme,
      /VITE_BASE_PATH/,
      'README.md must document VITE_BASE_PATH for self-hosting',
      errors,
    );
  }

  for (const id of facts.sourceIdentifiers ?? []) {
    const re =
      id === 'pmid'
        ? /\bPMID\b/i
        : id === 'pmc'
          ? /\bPMC\b/i
          : new RegExp(`\\b${escapeRegExp(id)}\\b`, 'i');
    assertMatch(agents, re, `AGENTS.md should mention source identifier "${id}"`, errors);
  }
}

async function main() {
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

  const errors = [];

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

  if (pnpmVersion) {
    assertMatch(
      agents,
      new RegExp(`pnpm ${pnpmVersion.split('.')[0]}\\b`),
      `AGENTS.md should reference pnpm ${pnpmVersion.split('.')[0]}`,
      errors,
    );
  }

  if (facts.appVersion && facts.appVersion !== appVersion) {
    errors.push(`docs/project-facts.json appVersion ${facts.appVersion} != package.json ${appVersion}`);
  }

  await checkProjectFacts(errors, facts);

  if (process.argv.includes('--csp-endpoint')) {
    await checkCspEndpointDrift(errors);
  }

  if (errors.length > 0) {
    const label = process.argv.includes('--csp-endpoint')
      ? 'check-csp-endpoint-drift'
      : 'check-docs-drift';
    console.error(`${label} FAILED:\n`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  if (process.argv.includes('--csp-endpoint')) {
    console.log('check-csp-endpoint-drift OK (connect-src aligned with endpointPolicy).');
    return;
  }

  console.log(
    `check-docs-drift OK (v${appVersion}, Vite ${viteMajor}, pnpm ${pnpmVersion || 'n/a'}, facts v${facts.adr?.minNumberedRecords ?? '?'})`,
  );
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
    const got = extractTopLevelCancelInProgress(fixture.yaml);
    if (got !== fixture.expect) {
      throw new Error(`concurrency self-test "${fixture.name}": expected ${fixture.expect}, got ${got}`);
    }
    if (fixture.prOnly && !isPullRequestOnlyCancelExpression(got)) {
      throw new Error(`concurrency self-test "${fixture.name}": expected PR-only`);
    }
    if (fixture.unconditional && !isUnconditionalCancelTrue(got)) {
      throw new Error(`concurrency self-test "${fixture.name}": expected unconditional true`);
    }
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
