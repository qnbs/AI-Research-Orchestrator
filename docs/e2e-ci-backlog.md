# E2E-in-CI backlog (updated 2026-08-03)

`.github/workflows/e2e.yml` runs Playwright on every push/PR to `main`.

## Promotion status — **blocking** (2026-08-01)

`continue-on-error` was flipped to **`false`** after verifying **10 consecutive CI runs** with **51 passed / 0 failed** Playwright tests each (workflow success alone is not enough — counts were read from job logs). Criteria from the original note: _10 consecutive green runs or 2 weeks_, whichever first.

Suite files (a11y.spec.ts stays on the dedicated `a11y.yml` job):

- `src/test/e2e/smoke.spec.ts`
- `src/test/e2e/agent-flow.spec.ts`
- `src/test/e2e/dialog-a11y.spec.ts`
- `src/test/e2e/keyboard-focus.spec.ts`
- `src/test/e2e/skip-to-content.spec.ts`
- `src/test/e2e/journal-hub.spec.ts`
- `src/test/e2e/provider-flow.spec.ts`

Shared helpers live in `src/test/e2e/e2eHelpers.ts`. Network fixtures:

- `src/test/e2e/ollamaMocks.ts` — Ollama health (CORS + loopback-scoped routes; WebKit needs `serviceWorkers: 'block'`)
- `src/test/e2e/fixtures/networkMocks.ts` — PubMed / Gemini / arXiv hostname-scoped mocks
- `src/test/e2e/fixtures/pubmedArticle.ts` — deterministic ESearch/EFetch payloads

**CLI note:** Invoke via `pnpm exec playwright test <files…>` in CI. Do **not** use
`pnpm run test:e2e -- <files>` — the bare `--` forwarded to Playwright causes it to
ignore the file list and run the entire `testDir` (including `a11y.spec.ts`).

## Cross-browser matrix — **blocking** (promoted 2026-08-03)

`.github/workflows/e2e-cross-browser.yml` runs the **same seven-spec list** as blocking
Chromium on **Firefox**, **WebKit (Safari)**, and **mobile Chrome (Pixel 5)** in parallel.
`continue-on-error` was removed so a failed matrix leg fails the workflow check (PR and `main`
parity). `fail-fast: false` keeps all browsers reporting.

`playwright.config.ts` exposes the extra projects only when `PLAYWRIGHT_MATRIX=1`
(so the blocking Chromium workflow stays unchanged).

`docs/project-facts.json` → `e2e.crossBrowserAdvisory: false`.

### Incident — WebKit Ollama health masked by advisory gate (2026-08-03)

- **Symptom:** `main` run [`30786120773`](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/30786120773) after #206 merge showed Cross-browser WebKit red while the overall workflow stayed green.
- **Failure:** `[webkit] provider-flow.spec.ts` — “Ollama health panel lists discovered models when available” timed out waiting for `ollama-health-ok`. Screenshot: `Ollama unavailable (cors)`.
- **Why PR looked green:** same WebKit failure already on PR head run `30785956863`, but `continue-on-error: true` made the check conclusion `success`. Chromium blocking E2E did not exercise WebKit CORS.
- **Root cause:** On WebKit, an active service worker bypasses Playwright `page.route()`, so mocked Ollama probes (`localhost`/`127.0.0.1:11434`) hit the real network (`Connection refused`) and surface as `cors` in the health panel. Chromium/Firefox still honored the route. Approve alone does not re-probe after a failed first attempt.
- **Fix:** `serviceWorkers: 'block'` in `playwright.config.ts`; CORS-aware mocks + `127.0.0.1` loopback + forced refresh (`ollamaMocks.ts`); promote cross-browser workflow to blocking.

### Historical promotion criteria (completed)

1. **10 consecutive** smoke greens per browser (4-test smoke including manifest) — met through #191.
2. Full seven-spec expansion — landed in [#192](https://github.com/qnbs/AI-Research-Orchestrator/pull/192).
3. Blocking promotion — **2026-08-03** after the advisory-mask incident (WebKit/mobile had already reached 10/10 full-suite clean; Firefox streak was rebuilding but must not hide real failures).

### Streak archive (pre-promotion, 2026-08-02)

| Browser       | Latest clean run (pre-Ollama)        | Streak note                                                   |
| ------------- | ------------------------------------ | ------------------------------------------------------------- |
| Firefox       | **54/0** (`f719553` / `30770674248`) | Reset after `e92dd0f` flaky; rebuild interrupted by Ollama UI |
| mobile Chrome | **54/0** (`f719553` / `30770674248`) | **10/10** before Ollama health tests                          |
| WebKit        | **54/0** (`f719553` / `30770674248`) | **10/10** before Ollama health tests; then CORS regression    |

Post-#205 suite size is **56** tests per browser when all pass (added Ollama health cases).

## Historical note (fixed 2026-07-21)

Two early CI failures were fixed before Chromium promotion:

- KB empty-state: `persistenceMiddleware` raced `setLoading` before hydration — exclude `setLoading` from persist triggers.
- Mobile bottom-nav label: test expected "Agent"; UI uses `nav.orchestrator` ("Orchestrator").
