# Baseline Report — 2026-08-03 (Master Remediation Workstream 0)

**Prepared:** 2026-08-03  
**Executor:** Cursor Cloud Agent (`cursor/audit-p0-scientific-trust-8ad7`)

## Starting SHA verification

| Field                                   | Value                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| Observed audit baseline (master prompt) | `84fbcdf1f29b93416d2574d78ef988c83399fdad`                                          |
| Actual `origin/main` at start           | `84fbcdf1f29b93416d2574d78ef988c83399fdad`                                          |
| Match                                   | **Yes — baseline SHA is current `main`**                                            |
| Commit title                            | `docs(ci): branch governance, WebKit install harden, README accuracy (PR11) (#212)` |

## Repository inventory

| Item           | Value                                             |
| -------------- | ------------------------------------------------- |
| Open PRs       | 0                                                 |
| Open issues    | 0                                                 |
| `package.json` | `0.4.1`                                           |
| Latest git tag | `v0.4.1` (matches `package.json`)                 |
| Deploy model   | GitHub Pages from `main` on merge (not tag-gated) |
| Node / pnpm    | Per `package.json` (Node ≥22, pnpm 11)            |

## `main` workflow evidence (commit `84fbcdf`)

| Workflow                | Run ID      | Result  | Notes  |
| ----------------------- | ----------- | ------- | ------ |
| Deploy to GitHub Pages  | 30811964412 | success | ~3m52s |
| E2E Tests (Chromium)    | 30811964709 | success | ~3m36s |
| E2E Cross-Browser Smoke | 30811964387 | success | ~7m19s |
| A11y Smoke              | 30811964371 | success | ~1m14s |
| Security                | 30811964404 | success | ~1m35s |

Production URL: `https://qnbs.github.io/AI-Research-Orchestrator/`  
**Observed deployed SHA:** `84fbcdf` (production bundle embeds `buildCommitSha: "84fbcdf"`; deploy run 30811964412 success).

## Confirmed residual risks (revalidated against `84fbcdf`)

| Theme                                     | Status                                                                     | Evidence                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A. Weak lexical claim support             | **Confirmed** — addressed in PR `cursor/audit-p0-scientific-trust-8ad7`    | `claimValidation.ts` 2-token overlap; arbitrary 160-char snippets       |
| B. Agent swarm vs pipeline wording        | **Partially addressed** (#211 product truth); no real multi-agent graph    | `geminiService.ts` sequential phases                                    |
| C. Ollama budget from parameter count     | **Confirmed**                                                              | `ollamaContextBudget.ts` `parseParameterBillions`                       |
| D. Ollama degraded discovery cache        | **Confirmed**                                                              | `ollamaHealth.ts` `ok: true` + `modelsDiscovered: false` cached 30s TTL |
| E. Generate stream without `done` marker  | **Confirmed**                                                              | `ollama.ts` L157 yields `done: true` after EOF                          |
| F. Heuristic capability / prompt guessing | **Confirmed**                                                              | `heuristic.ts` substring intent inference                               |
| G. Heuristic BM25 / synthesis calibration | **Open**                                                                   | `nonAi/utils.ts` IDF formula; synthesis boilerplate                     |
| H. Provider conformance suite             | **Partial**                                                                | per-provider tests exist; no shared harness                             |
| I. Eval adversarial depth                 | **Partial**                                                                | `agentEval` + tail fixture (#210); gaps remain                          |
| J. Dexie transaction migrations           | **Partial**                                                                | transform tests; not full upgrade transactions                          |
| K. Documentation drift                    | **Mostly addressed** (#211); README still mentions estimated H-index-style | `README.md` L72                                                         |
| L. Branch governance enforcement          | **Documented** (#212); live ruleset not mutated by agent                   | `docs/ci-branch-governance.md`                                          |
| M. Issue backlog                          | **Created**                                                                | `docs/audits/2026-08-03-issue-backlog.md`                               |

## Preserved improvements (do not regress)

- Educational Demo quarantine (#200)
- Immutable execution provenance (#201)
- AbortSignal propagation (#202)
- Multi-turn chat history commit (#203)
- Claim/corpus-supported terminology (#204)
- Ollama health / NDJSON / CSP (#205)
- Typed pipeline phaseId (#206)
- Cross-browser blocking E2E (#207)
- Shared E2E network fixtures (#208)
- DeepSource `@deepsourcebot review` mandate (#209)
- Claim-level eval + tail fixture (#210)
- Product truth calibration (#211)
- CI branch governance (#212)

## Local validation (PR #213 agent run, pre-push)

| Command                                                                                     | Result          |
| ------------------------------------------------------------------------------------------- | --------------- |
| `pnpm run typecheck`                                                                        | PASS            |
| `pnpm run lint`                                                                             | PASS            |
| `pnpm exec vitest run src/lib/claimEvidenceMatcher.test.ts src/lib/claimValidation.test.ts` | PASS            |
| `pnpm run check:agent-eval`                                                                 | PASS (27 tests) |

Full `test:coverage`, E2E, cross-browser, and a11y: **CI authoritative** on PR head (blocking workflows on `deploy.yml`, `e2e.yml`, `e2e-cross-browser.yml`, `a11y.yml`).

## Stop-the-line

No P0 build or deployment failure on `84fbcdf`. Feature remediation proceeds on scoped branches with serialized high-risk merges per master prompt §16.
