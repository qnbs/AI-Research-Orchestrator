# Full-Scale Audit Report — 2026-08-02

## Metadata

| Field                     | Value                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| Audited commit (baseline) | `72e385edae14727cadad9e03db6b5b0b8635d153`                                                            |
| Remediation branch        | `cursor/full-scale-audit-remediation-0b69`                                                            |
| Auditor                   | Cursor Cloud Agent (Composer 2.5)                                                                     |
| Methodology               | Evidence-first verification against HEAD; baseline gates before edits; P0 fixes with regression tests |

## Repository state at audit start

- **HEAD:** `72e385e` on `main` (clean working tree)
- **Latest tag:** `v0.4.0` (2026-08-01)
- **Deploy model:** GitHub Pages from `main` on every merge (not tag-gated)
- **Node / pnpm:** v22.14.0 / 11.13.1
- **Open PRs:** none at audit start

## Baseline quality gates (pre-change, commit `72e385e`)

| Gate                             | Result |
| -------------------------------- | ------ |
| `pnpm run typecheck`             | PASS   |
| `pnpm run lint`                  | PASS   |
| `pnpm install --frozen-lockfile` | PASS   |

## Remediation verification gates (post-change)

| Gate                                  | Result                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm run typecheck`                  | PASS                                                                                 |
| `pnpm run lint`                       | PASS                                                                                 |
| `pnpm run i18n:ratchet`               | PASS (64 files)                                                                      |
| `pnpm run test:coverage`              | PASS — 595 tests; statements 80.67%, lines 82.74%, branches 70.11%, functions 80.33% |
| `pnpm run build`                      | PASS                                                                                 |
| `pnpm run bundle:budget`              | PASS                                                                                 |
| `pnpm run check:no-cdn-scripts`       | PASS                                                                                 |
| `pnpm run check:workbox-vendor-drift` | PASS                                                                                 |
| `pnpm run check:contrast`             | PASS                                                                                 |
| `pnpm run test:e2e`                   | **Not run locally** (resource policy — CI authoritative)                             |
| `pnpm run test:a11y`                  | **Not run locally** (CI authoritative)                                               |
| `pnpm run test:lighthouse`            | **Not run locally**                                                                  |
| `pnpm audit --audit-level=high`       | PASS (no known vulnerabilities)                                                      |

## Remediation matrix

| ID   | Severity | Domain               | Finding                                                                                   | Status       | Fix                                                                                                            | Tests                                                                         |
| ---- | -------- | -------------------- | ----------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| P0-1 | P0       | PubMed queries       | `meshFieldTag(heading)` re-lookup failed for canonical headings → empty clauses / `OR OR` | **Fixed**    | `formatMeshClause`, dedupe, `validatePubMedQuery`                                                              | `queryBuilder.test.ts`, `meshDictionary.test.ts`, property over dictionary    |
| P0-2 | P0       | Filters              | `openAccessOnly` explanation-only                                                         | **Fixed**    | `free full text[filter]` + aligned explanation                                                                 | `queryBuilder.test.ts`                                                        |
| P0-3 | P0       | Scientific integrity | Weak citation grounding / substring eval                                                  | **Fixed**    | `applyCorpusCitationGrounding`, `groundedSynthesis`, export synthesis sanitization, `agentEval` dimensions     | `citationGrounding.test.ts`, `groundedSynthesis.test.ts`, `agentEval.test.ts` |
| P0-4 | P0       | Prompt injection     | `sanitizePromptFragment` only strips controls                                             | **Fixed**    | `untrustedDataFraming` on all live prompts + chat; delimiter escape                                            | `untrustedDataFraming.test.ts`                                                |
| P0-5 | P0       | Cancellation         | Synthesis stream omitted `AbortSignal`                                                    | **Fixed**    | `signal` on `generateContentStream`                                                                            | `geminiService.test.ts`                                                       |
| P0-6 | P0       | Endpoints            | CSP / approval / testConnection mismatch                                                  | **Fixed**    | Mandatory `approvedEndpointOrigin`, save gate, `check:csp-endpoint-drift`                                      | `endpointPolicy.test.ts`                                                      |
| P0-7 | P0       | Providers            | Single `jsonMode` boolean                                                                 | **Fixed**    | Capability-aware `generateJson`, schema-in-prompt fallback                                                     | `providerCapabilities.test.ts`, `geminiService.test.ts`                       |
| P1-1 | P1       | Docs                 | `SECURITY.md` stale (0.1–0.2 only, Gemini-only assets)                                    | **Fixed**    | Updated `SECURITY.md`                                                                                          | Manual review                                                                 |
| P1-2 | P1       | Agent docs           | Version/path drift                                                                        | **Deferred** | ADRs + audit; canonical manifest still `AGENTS.md`                                                             | Follow-up                                                                     |
| P1-3 | P1       | Coverage             | Critical-path thresholds                                                                  | **Fixed**    | `check:coverage-floors` ratchet for providers/, geminiService, apiKeyService                                   | `scripts/check-coverage-floors.mjs`                                           |
| P1-4 | P1       | Retrieval validation | Offline harness for query/corpus grounding                                                | **Fixed**    | `check:agent-eval`, `liveOrchestratorEval`, PubMed query gate in orchestrator                                  | `liveOrchestratorEval.test.ts`, `agentEval.test.ts`                           |
| P1-5 | P1       | Logging              | Raw console logging in application source                                                 | **Fixed**    | `safeLog`, `check:log-redaction`                                                                               | `scripts/check-log-redaction.mjs`                                             |
| P1-6 | P1       | PWA / E2E            | Cross-browser smoke matrix                                                                | **Fixed**    | `.github/workflows/e2e-cross-browser.yml` (Firefox, WebKit, mobile Chrome)                                     | `smoke.spec.ts` in matrix job                                                 |
| P1-7 | P1       | CI governance        | `pnpm audit` / coverage gate documentation                                                | **Fixed**    | `docs/audit-governance.md`                                                                                     | Manual review                                                                 |
| P1-8 | P1       | Static analysis      | DeepSource / Sonar posture for client-only PWA                                            | **Fixed**    | Sonar removed; DeepSource Docker/Shell advisory; `docs/deepsource-setup.md`; ESLint + deploy.yml authoritative | `.deepsource.toml`, `docs/deepsource-setup.md`                                |

## Deep-review answers (verified scope)

1. **Key to unapproved origin?** Mitigated: `resolveApprovedBaseUrl` requires matching `approvedEndpointOrigin` for custom URLs.
2. **Custom base URL under CSP?** Only if origin is on static allowlist; otherwise blocked with explicit error.
3. **Connection test wrong host?** Fixed for OpenAI/Anthropic (`getClient(baseURL)`); Gemini uses fixed Google endpoint.
4. **Abstract prompt injection?** Partially mitigated via delimiters + system rule; not solved.
5. **Invented PMID as similar article?** Not fully audited in this PR; corpus filter applies to orchestrator ranking path.
6. **`supportingArticles` outside corpus?** Filtered in live orchestrator path before report yield.
7. **Every material claim validated?** **No** — synthesis prose not atomically claim-validated yet.
8. **AI summary vs abstract?** Labelled in system prompt and synthesis prompt; UI distinction deferred.
9. **Cancellation stops provider request?** Synthesis phase now passes `abortSignal` to Gemini SDK.
10. **Stale service worker vs schema?** Not verified in this PR.
    11–30. See residual risks / follow-up issues.

## Residual risks

- Narrative synthesis may still contain uncited prose until export sanitization runs; live UI still shows full model output.
- Client-side prompt injection cannot be fully eliminated (defense-in-depth only).
- Custom endpoints outside CSP allowlist require self-hosted deployment.
- `free full text[filter]` ≠ all open-access definitions.

## Follow-up issues (recommended)

1. **P0-3 completion:** structured `GroundedSynthesis` + export synthesis sanitization — **landed**.
2. **P1-3:** per-directory coverage floors — **landed** (`check:coverage-floors`).
3. **P1-4:** retrieval validation offline harness — **landed** (`check:agent-eval`, `liveOrchestratorEval`).
4. **P1-5:** logging redaction — **landed** (`safeLog`, `check:log-redaction`).
5. **P1-6:** cross-browser E2E matrix — **landed** (`e2e-cross-browser.yml`).
6. **P1-7:** governance docs — **landed** (`docs/audit-governance.md`).
7. **P1-8:** static-analysis posture — **landed** (Sonar removed; `docs/deepsource-setup.md`; DeepSource JS advisory).
8. **P1-2:** automated docs/config drift — **deferred** (partial via `check:docs-drift`; ADR follow-up for full agent-doc manifest sync).

## Commands for maintainer re-verification

```bash
git checkout cursor/p0-p1-audit-completion-0b69
pnpm install --frozen-lockfile
pnpm run typecheck && pnpm run lint && pnpm run i18n:ratchet
pnpm run check:docs-drift && pnpm run check:csp-endpoint-drift && pnpm run check:agent-eval
pnpm run test:coverage && pnpm run build && pnpm run bundle:budget
pnpm run check:no-cdn-scripts && pnpm run check:workbox-vendor-drift && pnpm run check:contrast
pnpm audit --audit-level=high
# E2E / a11y / lighthouse: read CI workflow outputs on the PR
```
