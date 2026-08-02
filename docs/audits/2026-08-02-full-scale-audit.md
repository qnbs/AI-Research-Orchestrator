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

| ID        | Severity | Domain               | Finding                                                                                   | Status       | Fix                                                                          | Tests                                                                      |
| --------- | -------- | -------------------- | ----------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| P0-1      | P0       | PubMed queries       | `meshFieldTag(heading)` re-lookup failed for canonical headings → empty clauses / `OR OR` | **Fixed**    | `formatMeshClause`, dedupe, `validatePubMedQuery`                            | `queryBuilder.test.ts`, `meshDictionary.test.ts`, property over dictionary |
| P0-2      | P0       | Filters              | `openAccessOnly` explanation-only                                                         | **Fixed**    | `free full text[filter]` + aligned explanation                               | `queryBuilder.test.ts`                                                     |
| P0-3      | P0       | Scientific integrity | Weak citation grounding / substring eval                                                  | **Partial**  | `applyCorpusCitationGrounding`, improved `agentEval`                         | `citationGrounding.test.ts`, `agentEval.test.ts`                           |
| P0-4      | P0       | Prompt injection     | `sanitizePromptFragment` only strips controls                                             | **Partial**  | `untrustedDataFraming.ts`, system rule, delimited article blocks             | `untrustedDataFraming.test.ts`                                             |
| P0-5      | P0       | Cancellation         | Synthesis stream omitted `AbortSignal`                                                    | **Fixed**    | `signal` on `generateContentStream`                                          | `geminiService.test.ts`                                                    |
| P0-6      | P0       | Endpoints            | CSP / approval / testConnection mismatch                                                  | **Partial**  | `endpointPolicy.ts`, approval UI, `testConnection(baseURL)`                  | `endpointPolicy.test.ts`                                                   |
| P0-7      | P0       | Providers            | Single `jsonMode` boolean                                                                 | **Partial**  | `structuredOutput` capability flags + contract tests                         | `providerCapabilities.test.ts`                                             |
| P1-1      | P1       | Docs                 | `SECURITY.md` stale (0.1–0.2 only, Gemini-only assets)                                    | **Fixed**    | Updated `SECURITY.md`                                                        | Manual review                                                              |
| P1-2      | P1       | Agent docs           | Version/path drift                                                                        | **Deferred** | ADRs + audit; canonical manifest still `AGENTS.md`                           | Follow-up                                                                  |
| P1-3      | P1       | Coverage             | Critical-path thresholds                                                                  | **Fixed**    | `check:coverage-floors` ratchet for providers/, geminiService, apiKeyService | `scripts/check-coverage-floors.mjs`                                        |
| P1-4–P1-8 | P1       | Various              | Retrieval validation, logging, PWA matrix, CI, governance                                 | **Partial**  | P1-3/P1-5 landed; P1-6/P1-7 open                                             | —                                                                          |

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

- Narrative synthesis may still contain uncited or hallucinated claims.
- No atomic `GroundedClaim` schema persisted yet.
- Custom endpoints outside CSP allowlist require self-hosted deployment.
- `free full text[filter]` ≠ all open-access definitions.
- Full E2E / cross-browser / mobile matrix not expanded in this PR.
- Client-side prompt injection cannot be fully eliminated.

## Follow-up issues (recommended)

1. **P0-3 completion:** structured `GroundedSynthesis` schema + export/persistence validation.
2. **P1-3:** per-directory coverage floors for `providers/`, `geminiService.ts`, `apiKeyService.ts` — **landed** (`check:coverage-floors`).
3. **P1-5:** logging redaction — **landed** (`safeLog`, `check:log-redaction`).
4. **P1-6:** Firefox/WebKit/mobile Playwright matrix with promotion criteria.
5. **P1-7:** SonarQube blocking gate evaluation; moderate `pnpm audit` governance doc.
6. **P1-2:** automated docs/config drift check — **landed** (`check:docs-drift`).

## Commands for maintainer re-verification

```bash
git checkout cursor/full-scale-audit-remediation-0b69
pnpm install --frozen-lockfile
pnpm run typecheck && pnpm run lint && pnpm run i18n:ratchet
pnpm run test:coverage && pnpm run build && pnpm run bundle:budget
pnpm run check:no-cdn-scripts && pnpm run check:workbox-vendor-drift && pnpm run check:contrast
pnpm audit --audit-level=high
# E2E / a11y / lighthouse: read CI workflow outputs on the PR
```
