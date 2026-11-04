# GitHub Pages production smoke — 2026-11-04

Evidence for **[#404](https://github.com/qnbs/AI-Research-Orchestrator/issues/404)** (WS-10): independent HTTP/browser verification of the live deployment, separate from CI deploy job success.

## Scope

| Check                                                    | Result   |
| -------------------------------------------------------- | -------- |
| Public URL reachable (HTTP 200, HTML)                    | **Pass** |
| SPA base path `/AI-Research-Orchestrator/`               | **Pass** |
| Bundled JS/CSS under `/AI-Research-Orchestrator/assets/` | **Pass** |
| Service worker active (`sw.js`, Workbox)                 | **Pass** |
| Web app manifest / installable PWA                       | **Pass** |
| First-run onboarding dismiss → orchestrator shell        | **Pass** |

## Environment

- **URL:** https://qnbs.github.io/AI-Research-Orchestrator/
- **Probe time:** 2026-11-04 (Europe/Berlin afternoon); `Last-Modified` response header **2026-11-04 ~18:16 UTC** on `index.html`
- **Repository `main` at external probe:** post-#442 merge (`9a604f2` lineage — Pages deploy timestamp aligned with contemporaneous `main` CI, not a stale pre-React-19.3.1 artifact)
- **Published release tag:** **v0.4.7** (2026-11-04 audit-recovery wave; supersedes v0.4.6 badge-only drift)

## Deployed SHA correlation (#404 — required before issue close)

| Item                                                                                                                             | Status                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| External browser/HTTP smoke on **current** Pages deployment                                                                      | **Recorded once** (this doc, afternoon probe ≈ `9a604f2` window)         |
| Explicit live-site ↔ **`main` head SHA** attestation (e.g. `__APP_VERSION__` / build meta vs `git rev-parse` on deployed commit) | **Not recorded** for post–v0.4.7 heads such as `69834a3` / later         |
| CI `deploy` job success on latest `main`                                                                                         | **Necessary but not sufficient** for #404 acceptance                     |
| Blocking `pwa-e2e.yml` offline shell                                                                                             | **Complements** external smoke; does not replace SHA-tied live URL proof |

**Disposition:** Keep **#404 open** until a maintainer re-runs authorized external smoke (or equivalent recorded HTTP + first-boot check) and appends **deployed commit SHA**, probe timestamp, and artifact index to this file. Do not close #404 on CI green alone.

## Observations

- Console: non-blocking CSP `connect-src` warnings for localhost probes (expected on GitHub Pages; live APIs remain in CSP allow-list).
- No credential-bearing requests observed during anonymous smoke.
- Offline after first visit: **blocking** `pwa-e2e.yml` → `pwa-registration.spec.ts` (preview subpath + offline `#root` visible).

## Artifact index (Cloud Agent run, not committed to git)

Screenshots and full narrative live under `/opt/cursor/artifacts/` for the verifying agent run:

- `pages-smoke-home.png` — main UI after onboarding
- `pages-smoke-network.png` — asset path waterfall
- `pages-smoke-sw.png` — service worker + manifest
- `smoke-test-report.md` — step-by-step checklist

## Disposition

- **#404:** **Remain open** until current-SHA external smoke is appended above. Optional follow-up: Lighthouse on live URL with recorded deploy SHA.
- **CI correlation:** Every merge to `main` runs blocking quality, E2E (10 specs), cross-browser, a11y, security, and PWA jobs (`docs/ci-branch-governance.md`).
