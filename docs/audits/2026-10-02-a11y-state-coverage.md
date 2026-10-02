# 2026-10-02 a11y state coverage (master prompt Wave D / E)

**Scope:** Extend blocking axe smoke and keyboard focus coverage to Orchestrator **task-state** surfaces shipped in #360 (research brief, edit criteria, cancel edit).

## Added automation

| Spec                                  | New coverage                                                                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/test/e2e/a11y.spec.ts`           | Axe (critical/serious) on research brief with completed report; edit-criteria form; cancel-edit return to brief                                                                                 |
| `src/test/e2e/a11yHelpers.ts`         | `waitForResearchBriefSummary()` — navigates, submits, waits for `[data-testid="research-brief-summary"]` (callers must register `mockPubMedRoutes` + `mockGeminiUnavailable` before navigation) |
| `src/test/e2e/keyboard-focus.spec.ts` | Focus rings on **Edit criteria** and **New search** in research brief (post-run, 1280px)                                                                                                        |

Mocks: `mockPubMedRoutes` + `mockGeminiUnavailable` (deterministic heuristic pipeline, no live Gemini).

## CI

Runs in existing blocking workflows:

- `.github/workflows/a11y.yml` — `a11y.spec.ts`
- `.github/workflows/e2e.yml` — includes `keyboard-focus.spec.ts`

## Disposition

| Gap                                                   | Status                              |
| ----------------------------------------------------- | ----------------------------------- |
| High-value Orchestrator states missing from axe smoke | **Closed** (this wave)              |
| Full §48 viewport screenshot grid                     | Still **deferred** (journey QA doc) |

Update ledger: `docs/audits/2026-10-02-audit-progress.md`.
