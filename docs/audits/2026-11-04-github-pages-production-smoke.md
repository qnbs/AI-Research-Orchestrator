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

| Item                                                                                                        | Status                                                                   |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| External browser/HTTP smoke on **current** Pages deployment                                                 | **Recorded** (afternoon ≈ `9a604f2`; **evening `52ab869`**)              |
| Explicit live-site ↔ **`main` head SHA** attestation (Help → About `formatReleaseLabel()` vs deploy commit) | **Recorded** for **`52ab869`** (2026-11-04 22:59 Europe/Berlin)          |
| CI `deploy` job success on latest `main`                                                                    | **Necessary but not sufficient** for #404 acceptance                     |
| Blocking `pwa-e2e.yml` offline shell                                                                        | **Complements** external smoke; does not replace SHA-tied live URL proof |

### Probe log (append-only)

| Probe (Europe/Berlin) | `main` / Pages deploy SHA | GitHub Actions `deploy.yml`                | `index.html` Last-Modified (UTC) | HTTP | Live attestation                    | Agent artifacts                                     |
| --------------------- | ------------------------- | ------------------------------------------ | -------------------------------- | ---- | ----------------------------------- | --------------------------------------------------- |
| 2026-11-04 afternoon  | ~`9a604f2` lineage        | contemporaneous `main` CI                  | ~2026-11-04 18:16                | 200  | smoke only (no About SHA row)       | `pages-smoke-*.png` (prior run)                     |
| **2026-11-04 22:59**  | **`52ab869`**             | run **41919411213** @ 2026-11-04 21:47:53Z | **2026-11-04 21:51:10**          | 200  | Help → About **`v0.4.7 (52ab869)`** | `pages-404-home.png`, `pages-404-about-version.png` |

**Disposition:** **#404 acceptance criteria met** for deploy **`52ab869`**. Maintainer may close using `docs/audits/2026-11-04-issue-closure-404-411.md`. Append a new row when `main` advances and live About SHA diverges.

## Observations

- Console: non-blocking CSP `connect-src` warnings for localhost probes (expected on GitHub Pages; live APIs remain in CSP allow-list).
- No credential-bearing requests observed during anonymous smoke.
- Offline after first visit: **blocking** `pwa-e2e.yml` → `pwa-registration.spec.ts` (preview subpath + offline `#root` visible).

## Artifact index (Cloud Agent run, not committed to git)

Screenshots and full narrative live under `/opt/cursor/artifacts/` for the verifying agent run:

- `pages-smoke-home.png` — main UI after onboarding (afternoon)
- `pages-smoke-network.png` — asset path waterfall
- `pages-smoke-sw.png` — service worker + manifest
- `pages-404-home.png` — evening probe home (`52ab869`)
- `pages-404-about-version.png` — Help → About **`v0.4.7 (52ab869)`**
- `smoke-test-report.md` — step-by-step checklist

## Disposition

- **#404:** **Ready for maintainer close** — evening external smoke on deploy **`52ab869`** recorded above (About label + deploy run correlation). Do not close on CI alone; use closure comment in `docs/audits/2026-11-04-issue-closure-404-411.md`.
- **CI correlation:** Every merge to `main` runs blocking quality, E2E (10 specs), cross-browser, a11y, security, and PWA jobs (`docs/ci-branch-governance.md`).
