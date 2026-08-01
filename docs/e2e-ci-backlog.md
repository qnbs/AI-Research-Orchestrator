# E2E-in-CI backlog (updated 2026-08-01)

`.github/workflows/e2e.yml` runs Playwright on every push/PR to `main`.

## Promotion status — **blocking** (2026-08-01)

`continue-on-error` was flipped to **`false`** after verifying **10 consecutive CI runs** with **51 passed / 0 failed** Playwright tests each (workflow success alone is not enough — counts were read from job logs). Criteria from the original note: _10 consecutive green runs or 2 weeks_, whichever first.

Suite now also includes the previously deferred specs:

- `src/test/e2e/smoke.spec.ts`
- `src/test/e2e/agent-flow.spec.ts`
- `src/test/e2e/journal-hub.spec.ts`
- `src/test/e2e/provider-flow.spec.ts`

Shared helpers live in `src/test/e2e/e2eHelpers.ts`.

## Historical note (fixed 2026-07-21)

Two early CI failures were fixed before promotion:

- KB empty-state: `persistenceMiddleware` raced `setLoading` before hydration — exclude `setLoading` from persist triggers.
- Mobile bottom-nav label: test expected "Agent"; UI uses `nav.orchestrator` ("Orchestrator").

## Local vs CI

Do **not** run the full multi-file suite on constrained local hardware (~3.7 GB RAM) — prefer a single spec file or `-g` filter. Authoritative full-suite results come from this workflow.
