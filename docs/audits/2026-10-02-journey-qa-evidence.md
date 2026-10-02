# 2026-10-02 journey QA evidence (Phase-0 gap closure)

**Repository:** `qnbs/AI-Research-Orchestrator`  
**Application head:** `7240bc7` (Wave B on `main`)  
**Master prompt:** §47–§48 (browser QA + viewport matrix)  
**Capture date:** 2026-10-02 (Cursor Cloud Agent, local dev `pnpm run dev` port 3000)

This document closes the Phase-0 baseline gap (“no recorded browser matrix on capture”). It does **not** replace blocking CI E2E; it adds a human/agent evidence plane alongside automation.

## Authoritative automation (blocking CI)

| Workflow                                  | Scope                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/e2e.yml`               | Seven Chromium specs (smoke, agent-flow, dialog-a11y, keyboard-focus **360px**, skip-to-content, journal-hub, provider-flow) |
| `.github/workflows/e2e-cross-browser.yml` | Same seven on Firefox, WebKit, mobile Chrome                                                                                 |
| `.github/workflows/a11y.yml`              | `a11y.spec.ts` axe smoke                                                                                                     |
| `.github/workflows/pwa-e2e.yml`           | Service-worker registration                                                                                                  |

Local spot-check on this branch (Chromium): `smoke.spec.ts` + `skip-to-content.spec.ts` — **6/6 passed** (2026-10-02).

## Manual / agent matrix (2026-10-02)

Environment: `http://localhost:3000/AI-Research-Orchestrator/`, onboarding skipped, heuristic mode (no API key).

| Check                               | Viewport / theme        | Result                                                                                                | Artifact (agent store)                                         |
| ----------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Home launchpad                      | 1280×800                | Pass                                                                                                  | `/opt/cursor/artifacts/journey-qa/viewport-1280x800-home.webp` |
| Literature review + status          | 1280×800                | Pass — heuristic line + retrieval footnote                                                            | `…/orchestrator-with-status-line.webp`                         |
| Settings locale                     | 1280×800, **DE**        | Pass                                                                                                  | `…/settings-german-locale.webp`                                |
| Home theme                          | 1280×800, **dark** + DE | Pass                                                                                                  | `…/dark-theme-home.webp`                                       |
| Console                             | Home                    | Low severity only (CSP connect-src warning, PWA `beforeinstallprompt` dev noise, React DevTools hint) | `…/console-errors-home.webp`                                   |
| 320×568, 360×800, 390×844, 768×1024 | —                       | **Deferred to CI** (keyboard-focus 360px, cross-browser mobile Chrome)                                | —                                                              |

Detailed agent notes: `/opt/cursor/artifacts/journey-qa/journey-qa-report.md`.

## Product-truth spot checks (manual)

- Status line shows **Heuristic engine**, not “broken AI”.
- DE locale renders Settings chrome (`Einstellungen`, `Sprache`, …).
- Demo-data banner present on first run (expected; clear control available).

## Follow-ups (non-blocking)

1. Optional maintainer script for full §48 viewport screenshot grid (Playwright `page.setViewportSize`).
2. Triage CSP `connect-src` warning if it appears on production (verify against `index.html` meta CSP after deploy).
3. PWA install prompt: ensure `register-sw.js` / `beforeinstallprompt` handler matches browser expectations (dev-only console noise today).

## Disposition

| Phase-0 gap                   | Status                                                   |
| ----------------------------- | -------------------------------------------------------- |
| Journey / browser QA evidence | **Recorded** (this doc + agent artifacts + CI inventory) |

Update ledger: `docs/audits/2026-10-02-audit-progress.md`.
