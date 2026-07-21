# E2E-in-CI backlog (2026-07-21)

`.github/workflows/e2e.yml` runs the two existing Playwright specs (`src/test/e2e/smoke.spec.ts`, `src/test/e2e/agent-flow.spec.ts`) on every push/PR to `main`. It is **non-blocking** (`continue-on-error: true`).

## Known failing tests (found on the very first CI run, PR #59)

Two tests in `agent-flow.spec.ts` fail **consistently** — all 3 attempts (initial + 2 retries), both locally and on GitHub's hosted runner, not intermittently:

- `5. Knowledge Base View › KB shows empty-state message when no data saved` (`agent-flow.spec.ts:327`) — times out waiting for `header` to become visible after `page.reload()`, following a manual IndexedDB clear that bypasses Dexie's normal lifecycle. Needs investigation into whether the app's Redux re-hydration hangs/errors when the `knowledgeBaseEntries` table is cleared outside Dexie, or whether the test's manual-clear approach itself is the problem (see the test's own comment: "localStorage flags alone are not enough — demo entries were already persisted during app bootstrap").
- `8. Mobile UX — Bottom Nav & Pipeline › tapping Agent navigates to orchestrator form` (`agent-flow.spec.ts:469`) — times out waiting for the "Agent" bottom-nav button, then for `#researchTopic` to appear after clicking it.

These are real, reproducible failures to fix, not flakiness from a slow/shared machine — that was an initial hypothesis from a local run on a resource-constrained dev VM, disproven by the same 2 tests failing deterministically on GitHub's own runner in PR #59. No root-cause fix attempted yet; tracked here since the job is non-blocking and the sprint that added E2E-to-CI didn't scope debugging existing spec failures.

## Promotion trigger

Flip `continue-on-error` to `false` once the two known failures above are fixed **and** the job has run clean for **2 consecutive weeks** of normal PR activity, or **10 consecutive green runs**, whichever comes first. Because the job has `continue-on-error: true`, the workflow's own pass/fail badge does **not** reflect real test outcomes - a run with failed Playwright tests still shows as a successful workflow. "Green" here means **zero failed tests in the Playwright output itself** (check the run's own summary or the uploaded `playwright-report` artifact), not the workflow conclusion. Whoever does the flip should also remove this backlog note's promotion section and fold a one-line mention into `AUDIT.md`'s next dated entry.

## Deferred specs

Two specs are referenced in earlier audit notes as deferred and remain unwritten — the CI job does not (cannot) run them yet:

- `src/test/e2e/provider-flow.spec.ts` — exercise the multi-provider selection flow (Settings -> provider dropdown -> Gemini/OpenAI/Anthropic/Ollama/Heuristic -> a research run against each, mocked).
- `src/test/e2e/journal-hub.spec.ts` — Journal Hub elevation coverage (profile generation, disambiguation, impact metrics UI).

No target date is set for writing these; whoever picks this up should follow the existing spec patterns in `agent-flow.spec.ts` (stable `getByRole` selectors, mocked network via the patterns already established there).
