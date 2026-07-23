# E2E-in-CI backlog (2026-07-21)

`.github/workflows/e2e.yml` runs the two existing Playwright specs (`src/test/e2e/smoke.spec.ts`, `src/test/e2e/agent-flow.spec.ts`) on every push/PR to `main`. It is **non-blocking** (`continue-on-error: true`).

## Known failing tests (found on the very first CI run, PR #59) — fixed 2026-07-21

Both were root-caused and fixed, plus the full scoped suite (`smoke.spec.ts` + `agent-flow.spec.ts`, 38 tests) now passes clean:

- `5. Knowledge Base View › KB shows empty-state message when no data saved` (`agent-flow.spec.ts:327`) — **real app bug**, not a test artifact: `src/store/store.ts`'s `persistenceMiddleware` fired on `settings/setLoading` (dispatched on every app boot, before IndexedDB hydration completes) and eagerly re-saved the still-default, not-yet-hydrated Redux state to Dexie's `settings` table. This overwrote the real persisted row (including `hasCompletedOnboarding`) moments before the hydration read that was supposed to restore it, so the hydration read consumed its own just-corrupted write. Fixed by excluding `setLoading` from the middleware's persistence trigger; regression-covered by `src/store/store.test.ts`. Separately, this test's full reload+rehydrate cycle needs more than the suite's default 30s budget on this hardware — bumped to `test.setTimeout(60_000)` for this one test.
- `8. Mobile UX — Bottom Nav & Pipeline › tapping Agent navigates to orchestrator form` (`agent-flow.spec.ts:469`) — **stale test**, not an app bug: the bottom-nav item that maps to the orchestrator view is labeled "Orchestrator" (via the `nav.orchestrator` i18n key), not "Agent" — no button anywhere in the app is named "Agent". Renamed the test and its selector to match; renamed the test itself to `tapping Orchestrator navigates to orchestrator form`.

## Promotion trigger

Both known failures are now fixed. Flip `continue-on-error` to `false` once the job has run clean for **2 consecutive weeks** of normal PR activity, or **10 consecutive green runs**, whichever comes first. Because the job has `continue-on-error: true`, the workflow's own pass/fail badge does **not** reflect real test outcomes - a run with failed Playwright tests still shows as a successful workflow. "Green" here means **zero failed tests in the Playwright output itself** (check the run's own summary or the uploaded `playwright-report` artifact), not the workflow conclusion. Whoever does the flip should also remove this backlog note's promotion section and fold a one-line mention into `CHANGELOG.md`'s next `[Unreleased]` entry.

## Deferred specs

Two specs are referenced in earlier audit notes as deferred and remain unwritten — the CI job does not (cannot) run them yet:

- `src/test/e2e/provider-flow.spec.ts` — exercise the multi-provider selection flow (Settings -> provider dropdown -> Gemini/OpenAI/Anthropic/Ollama/Heuristic -> a research run against each, mocked).
- `src/test/e2e/journal-hub.spec.ts` — Journal Hub elevation coverage (profile generation, disambiguation, impact metrics UI).

No target date is set for writing these; whoever picks this up should follow the existing spec patterns in `agent-flow.spec.ts` (stable `getByRole` selectors, mocked network via the patterns already established there).
