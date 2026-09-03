/**
 * Project-facts drift checks extracted from check-docs-drift.mjs so
 * checkProjectFacts / main stay under CodeScene “Bumpy Road” limits
 * (≤2 logical blocks per function, no nest depth ≥2).
 */
import { readdir } from 'node:fs/promises';

/** @param {string} value */
export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} text @param {RegExp} pattern @param {string} message @param {string[]} errors */
export function assertMatch(text, pattern, message, errors) {
  if (!pattern.test(text)) errors.push(message);
}

/** @param {string} text @param {RegExp} pattern @param {string} message @param {string[]} errors */
export function assertNoMatch(text, pattern, message, errors) {
  if (pattern.test(text)) errors.push(message);
}

export function extractE2eSpecPathsFromWorkflow(workflowYaml) {
  const specs = [];
  const re = /src\/test\/e2e\/[a-z0-9-]+\.spec\.ts/g;
  let m;
  while ((m = re.exec(workflowYaml)) !== null) {
    specs.push(m[0]);
  }
  return [...new Set(specs)];
}

function lineIndent(line) {
  return line.match(/^ */)?.[0].length ?? 0;
}

function enterJobIfHeader(line, indent, key, state) {
  if (state.inJob || indent === 0 || !line.trim().startsWith(`${key}:`)) return false;
  state.inJob = true;
  state.jobIndent = indent;
  return true;
}

function jobBlockEnded(trimmed, indent, state) {
  return Boolean(state.inJob && trimmed && indent <= state.jobIndent);
}

function scanInsideJob(line, trimmed, indent, state) {
  if (jobBlockEnded(trimmed, indent, state)) return 'break';
  if (/continue-on-error:\s*true/.test(line)) return 'found';
  return 'continue';
}

function scanJobContinueOnError(line, key, state) {
  const trimmed = line.trim();
  const indent = lineIndent(line);
  if (enterJobIfHeader(line, indent, key, state)) return 'continue';
  if (!state.inJob) return 'continue';
  return scanInsideJob(line, trimmed, indent, state);
}

function applyContinueScanAction(action) {
  if (action === 'found') return true;
  if (action === 'break') return false;
  return null;
}

function scanWorkflowLinesForContinueOnError(lines, key, state) {
  for (const rawLine of lines) {
    const result = applyContinueScanAction(
      scanJobContinueOnError(rawLine.replace(/\t/g, '  '), key, state),
    );
    if (result !== null) return result;
  }
  return false;
}

export function workflowJobHasContinueOnError(workflowYaml, jobName) {
  const key = String(jobName).replace(/:$/, '');
  return scanWorkflowLinesForContinueOnError(workflowYaml.split(/\r?\n/), key, {
    inJob: false,
    jobIndent: 0,
  });
}

function isBlankOrComment(trimmed) {
  return !trimmed || trimmed.startsWith('#');
}

function startConcurrencyBlock(trimmed, indent, state) {
  if (!/^concurrency:\s*(#.*)?$/.test(trimmed)) return;
  state.inConcurrency = true;
  state.concurrencyIndent = indent;
}

function applyBeforeConcurrency(trimmed, indent, state) {
  if (state.inConcurrency) return false;
  startConcurrencyBlock(trimmed, indent, state);
  return true;
}

function readCancelAssignment(trimmed) {
  const withoutComment = trimmed.replace(/\s+#.*$/, '');
  const match = /^cancel-in-progress:\s*(.+)$/.exec(withoutComment);
  return match ? match[1].trim() : null;
}

function applyInsideConcurrency(trimmed, indent, state) {
  if (indent <= state.concurrencyIndent) return 'break';
  const value = readCancelAssignment(trimmed);
  if (value !== null) state.cancelValue = value;
  return 'continue';
}

function applyConcurrencyLine(line, state) {
  const trimmed = line.trim();
  if (isBlankOrComment(trimmed)) return 'continue';
  const indent = lineIndent(line);
  if (applyBeforeConcurrency(trimmed, indent, state)) return 'continue';
  return applyInsideConcurrency(trimmed, indent, state);
}

function scanCancelInProgressLines(lines, state) {
  for (const rawLine of lines) {
    const action = applyConcurrencyLine(rawLine.replace(/\t/g, '  '), state);
    if (action === 'break') return;
  }
}

/**
 * Read top-level `concurrency.cancel-in-progress` (ignores `#` comments and
 * job-level keys). Returns the raw scalar/expression string, or null.
 * @param {string} workflowYaml
 */
export function extractTopLevelCancelInProgress(workflowYaml) {
  const state = { inConcurrency: false, concurrencyIndent: 0, cancelValue: null };
  scanCancelInProgressLines(workflowYaml.split(/\r?\n/), state);
  return state.cancelValue;
}

/** @param {string | null} value */
export function isPullRequestOnlyCancelExpression(value) {
  if (!value) return false;
  return /^\$\{\{\s*github\.event_name\s*==\s*'pull_request'\s*\}\}$/.test(value);
}

/** @param {string | null} value */
export function isUnconditionalCancelTrue(value) {
  if (!value) return false;
  if (value === 'true') return true;
  return /^\$\{\{\s*true\s*\}\}$/.test(value);
}

export function assertMergeGateDocument(mergeGate, path, errors) {
  const required = [
    [/dual gate/i, `${path} must document the dual merge gate`],
    [/latest head/i, `${path} must require checks on the latest head`],
    [/arrival wait/i, `${path} must document the arrival wait`],
    [/body-only|outside diff/i, `${path} must cover body-only / outside-diff findings`],
    [/disposition/i, `${path} must require a disposition ledger`],
  ];
  for (const [pattern, message] of required) {
    assertMatch(mergeGate, pattern, message, errors);
  }
}

/** @param {{ label: string, text: string }[]} files */
export function assertMergeGatePointers(files, configuredPath, errors) {
  const re = new RegExp(escapeRegExp(configuredPath));
  for (const { label, text } of files) {
    assertMatch(text, re, `${label} should reference ${configuredPath}`, errors);
  }
}

function assertForbiddenPhrases(text, phrases, label, errors) {
  for (const phrase of phrases ?? []) {
    if (text.includes(phrase)) {
      errors.push(`${label} contains forbidden overstated claim: "${phrase}"`);
    }
  }
}

function assertStaleAgentPhrases(agents, phrases, errors) {
  for (const phrase of phrases ?? []) {
    if (agents.includes(phrase)) {
      errors.push(`AGENTS.md contains stale CI phrase: "${phrase}"`);
    }
  }
}

async function assertProductCopyPhrases(facts, errors, read, skipProductCopy) {
  if (skipProductCopy) return;
  for (const file of facts.productCopyPaths ?? []) {
    const text = await read(file);
    assertForbiddenPhrases(text, facts.forbiddenProductCopyPhrases, file, errors);
  }
}

function assertExpectedSpecsListed(workflowPath, listed, expected, errors) {
  for (const spec of expected) {
    if (!listed.includes(spec)) {
      errors.push(`${workflowPath} missing CI spec: ${spec}`);
    }
  }
}

function assertNoExtraSpecs(workflowPath, listed, expected, errors) {
  for (const spec of listed) {
    if (!expected.includes(spec)) {
      errors.push(`${workflowPath} lists ${spec} but docs/project-facts.json ciSpecPaths omits it`);
    }
  }
}

function assertBlockingContinueOnError(workflowPath, blocking, hasContinue, errors) {
  if (blocking && hasContinue) {
    errors.push(`${workflowPath} job must not use continue-on-error (blocking E2E)`);
  }
}

function assertAdvisoryContinueOnError(workflowPath, blocking, hasContinue, errors) {
  if (!blocking && !hasContinue) {
    errors.push(`${workflowPath} expected continue-on-error for advisory E2E`);
  }
}

function assertCrossBrowserAdvisoryFlag(workflowPath, advisory, hasContinue, errors) {
  if (advisory && !hasContinue) {
    errors.push(`${workflowPath} should be advisory (continue-on-error: true)`);
  }
}

function assertCrossBrowserBlockingFlag(workflowPath, advisory, hasContinue, errors) {
  if (!advisory && hasContinue) {
    errors.push(
      `${workflowPath} must not use continue-on-error (blocking cross-browser E2E)`,
    );
  }
}

async function assertE2eMainWorkflow(facts, errors, read) {
  const path = facts.e2e?.mainWorkflowPath;
  if (!path) return;
  const yaml = await read(path);
  const expected = facts.e2e.ciSpecPaths ?? [];
  const listed = extractE2eSpecPathsFromWorkflow(yaml);
  assertExpectedSpecsListed(path, listed, expected, errors);
  assertNoExtraSpecs(path, listed, expected, errors);
  const blocking = facts.e2e.mainJobBlocking === true;
  const hasContinue = workflowJobHasContinueOnError(yaml, 'e2e');
  assertBlockingContinueOnError(path, blocking, hasContinue, errors);
  assertAdvisoryContinueOnError(path, blocking, hasContinue, errors);
}

async function assertE2eCrossBrowserWorkflow(facts, errors, read) {
  const path = facts.e2e?.crossBrowserWorkflowPath;
  if (!path) return;
  const yaml = await read(path);
  const expected = facts.e2e.ciSpecPaths ?? [];
  const listed = extractE2eSpecPathsFromWorkflow(yaml);
  assertExpectedSpecsListed(path, listed, expected, errors);
  assertNoExtraSpecs(path, listed, expected, errors);
  const advisory = facts.e2e.crossBrowserAdvisory === true;
  const hasContinue = /continue-on-error:\s*true/.test(yaml);
  assertCrossBrowserAdvisoryFlag(path, advisory, hasContinue, errors);
  assertCrossBrowserBlockingFlag(path, advisory, hasContinue, errors);
}

function assertE2eSpecsInAgents(agents, facts, errors) {
  for (const spec of facts.e2e?.ciSpecPaths ?? []) {
    if (!agents.includes(spec.replace('src/test/e2e/', ''))) {
      errors.push(`AGENTS.md should reference E2E spec inventory (${spec})`);
    }
  }
}

async function assertClaudeReviewRemoved(facts, errors, readOptional) {
  if (facts.ci?.claudeCodeReviewWorkflow !== false) return;
  const claudeReview = await readOptional('.github/workflows/claude-code-review.yml');
  if (claudeReview) {
    errors.push('claude-code-review.yml must be removed (disabled in project-facts.json)');
  }
}

async function assertBranchGovernanceDoc(facts, errors, readOptional) {
  if (!facts.ci?.branchGovernancePath) return;
  const gov = await readOptional(facts.ci.branchGovernancePath);
  if (!gov) {
    errors.push(`Missing branch governance doc: ${facts.ci.branchGovernancePath}`);
  }
}

async function collectMergeGatePointerFiles(agents, read) {
  return [
    { label: 'AGENTS.md', text: agents },
    { label: 'CONTRIBUTING.md', text: await read('CONTRIBUTING.md') },
    { label: '.cursor/index.mdc', text: await read('.cursor/index.mdc') },
    { label: 'CLAUDE.md', text: await read('CLAUDE.md') },
    { label: '011-coderabbit-pr-gate.mdc', text: await read('.cursor/rules/011-coderabbit-pr-gate.mdc') },
    {
      label: '013-pr-review-correction-loop.mdc',
      text: await read('.cursor/rules/013-pr-review-correction-loop.mdc'),
    },
    { label: 'copilot-instructions.md', text: await read('.github/copilot-instructions.md') },
  ];
}

async function assertMergeGateFacts(facts, agents, errors, io) {
  if (!facts.ci?.mergeGatePath) {
    errors.push('docs/project-facts.json ci.mergeGatePath is required');
    return;
  }
  const configuredPath = facts.ci.mergeGatePath;
  const mergeGate = await io.readOptional(configuredPath);
  if (!mergeGate) {
    errors.push(`Missing merge-gate doc: ${configuredPath}`);
    return;
  }
  assertMergeGateDocument(mergeGate, configuredPath, errors);
  const files = await collectMergeGatePointerFiles(agents, io.read);
  assertMergeGatePointers(files, configuredPath, errors);
}

function assertGuardedCancelExpression(wf, cancelValue, errors) {
  if (isPullRequestOnlyCancelExpression(cancelValue)) return;
  errors.push(
    `${wf} top-level concurrency.cancel-in-progress must be \${{ github.event_name == 'pull_request' }} (found: ${cancelValue ?? 'missing'})`,
  );
}

function assertGuardedNotUnconditional(wf, cancelValue, errors) {
  if (!isUnconditionalCancelTrue(cancelValue)) return;
  errors.push(`${wf} must not use unconditional cancel-in-progress: true (would cancel main runs)`);
}

async function assertOneGuardedWorkflow(wf, errors, readOptional) {
  const yaml = await readOptional(wf);
  if (!yaml) {
    errors.push(`Missing concurrency-guarded workflow: ${wf}`);
    return;
  }
  const cancelValue = extractTopLevelCancelInProgress(yaml);
  assertGuardedCancelExpression(wf, cancelValue, errors);
  assertGuardedNotUnconditional(wf, cancelValue, errors);
}

async function assertGuardedWorkflowList(guarded, errors, readOptional) {
  for (const wf of guarded) {
    await assertOneGuardedWorkflow(wf, errors, readOptional);
  }
}

function assertUnguardedCancelValue(rel, cancelValue, errors) {
  if (!isUnconditionalCancelTrue(cancelValue)) return;
  errors.push(
    `${rel} has unconditional cancel-in-progress: true — add to ci.concurrencyGuardedWorkflows or use PR-only cancel`,
  );
}

async function assertOneUnguardedWorkflow(rel, guarded, errors, readOptional) {
  if (Array.isArray(guarded) && guarded.includes(rel)) return;
  const yaml = await readOptional(rel);
  if (!yaml) return;
  assertUnguardedCancelValue(rel, extractTopLevelCancelInProgress(yaml), errors);
}

async function assertUnguardedWorkflowCancels(guarded, errors, readOptional, root) {
  const workflowFiles = (await readdir(`${root}/.github/workflows`)).filter((f) =>
    /\.ya?ml$/i.test(f),
  );
  for (const file of workflowFiles) {
    await assertOneUnguardedWorkflow(`.github/workflows/${file}`, guarded, errors, readOptional);
  }
}

async function assertConcurrencyGuards(facts, errors, readOptional, root) {
  if (facts.ci?.cancelInProgressOnPullRequestOnly !== true) return;
  const guarded = facts.ci.concurrencyGuardedWorkflows;
  if (!Array.isArray(guarded) || guarded.length === 0) {
    errors.push(
      'docs/project-facts.json ci.concurrencyGuardedWorkflows must list workflows when cancelInProgressOnPullRequestOnly is true',
    );
    return;
  }
  await assertGuardedWorkflowList(guarded, errors, readOptional);
  await assertUnguardedWorkflowCancels(guarded, errors, readOptional, root);
}

function assertDeepsourceJsEnabled(deepsource, errors) {
  if (!/name\s*=\s*["']javascript["'][\s\S]*enabled\s*=\s*true/.test(deepsource)) {
    errors.push('.deepsource.toml must enable javascript analyzer');
  }
}

function assertDeepsourceJsAbsent(deepsource, errors) {
  if (/name\s*=\s*["']javascript["']/.test(deepsource)) {
    errors.push(
      '.deepsource.toml must not declare a javascript analyzer block — disable in DeepSource dashboard (docs/deepsource-dashboard-off.md)',
    );
  }
}

function assertDeepsourceAnalyzer(deepsource, facts, errors) {
  if (facts.staticAnalysis?.deepsourceJavaScriptEnabled) {
    assertDeepsourceJsEnabled(deepsource, errors);
    return;
  }
  if (facts.staticAnalysis?.deepsourceJavaScriptEnabled === false) {
    assertDeepsourceJsAbsent(deepsource, errors);
  }
}

function assertOneCoverageThreshold(ctx, metric, value) {
  const re = new RegExp(`${metric}:\\s*${value}`);
  if (!re.test(ctx.vitestConfig)) {
    ctx.errors.push(`vitest.config.ts thresholds.${metric} must be ${value} (project-facts.json)`);
  }
  const proseRe = new RegExp(`${value}%\\s*${metric}|${metric}[^\\n]*${value}%`, 'i');
  if (!proseRe.test(ctx.agents)) {
    ctx.errors.push(`AGENTS.md must document coverage threshold ${metric} ${value}%`);
  }
}

function assertCoverageThresholds(vitestConfig, agents, facts, errors) {
  const ctx = { vitestConfig, agents, errors };
  for (const [metric, value] of Object.entries(facts.coverageThresholds ?? {})) {
    assertOneCoverageThreshold(ctx, metric, value);
  }
}

function assertOneCoverageFloor(ctx, moduleId, pair) {
  const [metric, value] = pair;
  const re = new RegExp(`id:\\s*'${moduleId}'[\\s\\S]*?${metric}:\\s*${value}`);
  if (!re.test(ctx.coverageFloors)) {
    ctx.errors.push(`check-coverage-floors.mjs floor ${moduleId}.${metric} must be ${value}`);
  }
}

function assertModuleFloors(moduleId, min, coverageFloors, errors) {
  const ctx = { coverageFloors, errors };
  for (const pair of Object.entries(min)) {
    assertOneCoverageFloor(ctx, moduleId, pair);
  }
}

function assertCoverageFloors(coverageFloors, facts, errors) {
  for (const [moduleId, min] of Object.entries(facts.coverageModuleFloors ?? {})) {
    assertModuleFloors(moduleId, min, coverageFloors, errors);
  }
}

function assertAdrCount(numbered, minAdr, errors) {
  if (numbered.length < minAdr) {
    errors.push(`docs/adr has ${numbered.length} numbered ADRs; expected >= ${minAdr}`);
  }
}

function assertAdrIndexEntries(adrIndex, indexPath, numbered, errors) {
  for (const file of numbered) {
    const num = file.slice(0, 4);
    if (!adrIndex.includes(`[${num}]`) && !adrIndex.includes(`(${num})`)) {
      errors.push(`${indexPath} missing index entry for ${file}`);
    }
  }
}

async function assertAdrFacts(facts, errors, read, root) {
  const adrFiles = await readdir(`${root}/docs/adr`);
  const numbered = adrFiles.filter((f) => /^\d{4}-.*\.md$/.test(f));
  assertAdrCount(numbered, facts.adr?.minNumberedRecords ?? 0, errors);
  if (!facts.adr?.indexPath) return;
  const adrIndex = await read(facts.adr.indexPath);
  assertAdrIndexEntries(adrIndex, facts.adr.indexPath, numbered, errors);
}

function assertProviderMentions(agents, facts, errors) {
  for (const providerId of facts.providers?.ids ?? []) {
    assertMatch(
      agents,
      new RegExp(`\\b${escapeRegExp(providerId)}\\b`, 'i'),
      `AGENTS.md must mention provider "${providerId}"`,
      errors,
    );
  }
}

function assertDefaultModel(agents, facts, errors) {
  const defaultModel = facts.providers?.defaultModels?.[facts.providers?.defaultId];
  if (!defaultModel) return;
  assertMatch(
    agents,
    new RegExp(escapeRegExp(defaultModel)),
    `AGENTS.md should reference default model ${defaultModel}`,
    errors,
  );
}

function assertDeploymentDocs(readme, facts, errors) {
  if (!facts.deployment?.defaultBasePath) return;
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

function sourceIdentifierPattern(id) {
  if (id === 'pmid') return /\bPMID\b/i;
  if (id === 'pmc') return /\bPMC\b/i;
  return new RegExp(`\\b${escapeRegExp(id)}\\b`, 'i');
}

function assertSourceIdentifiers(agents, facts, errors) {
  for (const id of facts.sourceIdentifiers ?? []) {
    assertMatch(agents, sourceIdentifierPattern(id), `AGENTS.md should mention source identifier "${id}"`, errors);
  }
}

/**
 * @param {string[]} errors
 * @param {Record<string, unknown>} facts
 * @param {{ read: (p: string) => Promise<string>, readOptional: (p: string) => Promise<string | null>, ROOT: string, skipProductCopy: boolean }} io
 */
export async function runProjectFactsChecks(errors, facts, io) {
  const { read, readOptional, ROOT, skipProductCopy } = io;
  const readme = await read('README.md');
  const agents = await read('AGENTS.md');
  const deepsource = await read('.deepsource.toml');
  const vitestConfig = await read('vitest.config.ts');
  const coverageFloors = await read('scripts/check-coverage-floors.mjs');

  assertForbiddenPhrases(readme, facts.forbiddenReadmePhrases, 'README.md', errors);
  assertStaleAgentPhrases(agents, facts.forbiddenAgentsPhrases, errors);
  await assertProductCopyPhrases(facts, errors, read, skipProductCopy);
  await assertE2eMainWorkflow(facts, errors, read);
  await assertE2eCrossBrowserWorkflow(facts, errors, read);
  assertE2eSpecsInAgents(agents, facts, errors);
  await assertClaudeReviewRemoved(facts, errors, readOptional);
  await assertBranchGovernanceDoc(facts, errors, readOptional);
  await assertMergeGateFacts(facts, agents, errors, { read, readOptional });
  await assertConcurrencyGuards(facts, errors, readOptional, ROOT);
  assertDeepsourceAnalyzer(deepsource, facts, errors);
  assertCoverageThresholds(vitestConfig, agents, facts, errors);
  assertCoverageFloors(coverageFloors, facts, errors);
  await assertAdrFacts(facts, errors, read, ROOT);
  assertProviderMentions(agents, facts, errors);
  assertDefaultModel(agents, facts, errors);
  assertDeploymentDocs(readme, facts, errors);
  assertSourceIdentifiers(agents, facts, errors);
}

export function assertFactsAppVersion(facts, appVersion, errors) {
  if (!facts.appVersion || facts.appVersion === appVersion) return;
  errors.push(`docs/project-facts.json appVersion ${facts.appVersion} != package.json ${appVersion}`);
}

export function assertPnpmMajorMention(agents, pnpmVersion, errors) {
  if (!pnpmVersion) return;
  assertMatch(
    agents,
    new RegExp(`pnpm ${pnpmVersion.split('.')[0]}\\b`),
    `AGENTS.md should reference pnpm ${pnpmVersion.split('.')[0]}`,
    errors,
  );
}

export function failIfErrors(errors, label) {
  if (errors.length === 0) return false;
  console.error(`${label} FAILED:\n`);
  for (const err of errors) console.error(`  - ${err}`);
  return true;
}
