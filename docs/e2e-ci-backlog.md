# E2E-in-CI backlog (updated 2026-08-02)

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

Shared helpers live in `src/test/e2e/e2eHelpers.ts`.

**CLI note:** Invoke via `pnpm exec playwright test <files…>` in CI. Do **not** use
`pnpm run test:e2e -- <files>` — the bare `--` forwarded to Playwright causes it to
ignore the file list and run the entire `testDir` (including `a11y.spec.ts`).

## Cross-browser matrix — **non-blocking** (2026-08-02, audit P1-6)

`.github/workflows/e2e-cross-browser.yml` runs the **same seven-spec list** as blocking
Chromium on **Firefox**, **WebKit (Safari)**, and **mobile Chrome (Pixel 5)** in parallel.
The job uses `continue-on-error: true` until each browser meets promotion criteria below.

`playwright.config.ts` exposes the extra projects only when `PLAYWRIGHT_MATRIX=1`
(so the blocking Chromium workflow stays unchanged).

### Promotion criteria (per browser)

1. **10 consecutive workflow runs** where the browser job reports **4 passed / 0 failed**
   smoke tests (read counts from the job log — the green badge alone is not enough).
2. After promotion: expand that browser to the full seven-spec list (same files as
   blocking Chromium) while keeping `continue-on-error: true`.
3. After **10 consecutive full-suite greens** per browser: consider flipping that
   browser to blocking (separate decision — do not bulk-promote all browsers at once).

Track progress in this file when a browser is promoted.

### Streak (updated 2026-08-02)

**Pre-manifest streak (3 smoke tests):** Firefox, WebKit, and mobile Chrome each succeeded on **8** consecutive workflow runs through merge of PR #174 (**3 passed / 0 failed** per browser job log).

**Smoke streak (4 tests, incl. manifest):** **≥10 consecutive** green cross-browser workflow runs on `main` through merge of PR #191 (`6f756fa`), each browser job log reporting **4 passed / 0 failed** (verified on runs `30756417972`–`30761235740`).

**Full-suite expansion (step 2):** landed in PR [#192](https://github.com/qnbs/AI-Research-Orchestrator/pull/192) (`3641108`) — cross-browser workflow runs the seven-spec Chromium parity list (`continue-on-error: true`). Next gate: **10 consecutive** full-suite greens per browser (**54 passed / 0 failed** in job logs; no flaky retries counted) before considering blocking promotion for that browser.

**Full-suite streak (step 3, updated 2026-08-02):** PR #195 (`022475d`, run `30767470525`) — **54 passed / 0 failed, no flaky** on Chromium (`30767470500`), Firefox, WebKit, and mobile Chrome in one cross-browser workflow. Streak reset baseline after flaky demo-KB fixes:

| Browser       | Best recent run (#195 `022475d`) | Streak toward 10× clean (54/0, no flaky) |
| ------------- | -------------------------------- | ---------------------------------------- |
| Firefox       | **54 passed / 0 failed**         | **1/10**                                 |
| mobile Chrome | **54 passed / 0 failed**         | **1/10**                                 |
| WebKit        | **54 passed / 0 failed**         | **1/10**                                 |

Blocking Chromium `e2e.yml`: **54 passed / 0 failed** on #195 `022475d` (`30767470500`).

## Historical note (fixed 2026-07-21)

Two early CI failures were fixed before promotion:

- KB empty-state: `persistenceMiddleware` raced `setLoading` before hydration — exclude `setLoading` from persist triggers.
- Mobile bottom-nav label: test expected "Agent"; UI uses `nav.orchestrator` ("Orchestrator").

## Local vs CI

Do **not** run the full multi-file suite on constrained local hardware (~3.7 GB RAM) — prefer a single spec file or `-g` filter. Authoritative full-suite results come from this workflow.
