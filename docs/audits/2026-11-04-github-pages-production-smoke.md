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
- **Repository `main` at probe window:** post-#442 merge (`9a604f2` and contemporaneous Pages deploy from `56edc68` lineage — deploy timestamp aligns with merged main CI, not a stale pre-React-19.3.1 artifact)
- **Published release tag:** still **v0.4.6** (badge/README drift tracked separately in #411)

## Observations

- Console: non-blocking CSP `connect-src` warnings for localhost probes (expected on GitHub Pages; live APIs remain in CSP allow-list).
- No credential-bearing requests observed during anonymous smoke.
- Offline/update rollback paths: **not exercised** in this pass (PWA lifecycle partially covered by blocking `pwa-e2e.yml` on CI); follow-up if product requires installed-client upgrade matrix.

## Artifact index (Cloud Agent run, not committed to git)

Screenshots and full narrative live under `/opt/cursor/artifacts/` for the verifying agent run:

- `pages-smoke-home.png` — main UI after onboarding
- `pages-smoke-network.png` — asset path waterfall
- `pages-smoke-sw.png` — service worker + manifest
- `smoke-test-report.md` — step-by-step checklist

## Disposition

- **#404:** External production boot **verified** for reachability, assets, CSP-non-blocking load, SW registration, and first-run UX. Issue may remain open for optional Lighthouse-on-production / offline-update matrix unless maintainers accept CI + this smoke as sufficient for WS-10 closure.
- **CI correlation:** `main` post-merge workflows (deploy, e2e, cross-browser, a11y, security, PWA) on `9a604f2` are the authoritative build/deploy gate; this document is the missing **live URL** leg of the acceptance tripod.
