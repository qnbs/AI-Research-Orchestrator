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
- **Post–v0.4.7 `main` (2026-11-04 evening, Europe/Berlin):** `69834a3` — same Pages URL and pipeline; additional changes are test/docs-only (#448–#450); no separate production smoke re-run required for closure **#404** (CI deploy + PWA E2E remain authoritative between smoke probes).
- **Published release tag:** **v0.4.7** (2026-11-04 audit-recovery wave; supersedes v0.4.6 badge-only drift)

## Observations

- Console: non-blocking CSP `connect-src` warnings for localhost probes (expected on GitHub Pages; live APIs remain in CSP allow-list).
- No credential-bearing requests observed during anonymous smoke.
- Offline after first visit: **blocking** `pwa-e2e.yml` → `pwa-registration.spec.ts` (preview subpath + offline `#root` visible).
- **#404:** External production boot **verified** for reachability, assets, CSP-non-blocking load, SW registration, and first-run UX. **Recommend close** with optional follow-up for production Lighthouse-on-live-URL only.

## Artifact index (Cloud Agent run, not committed to git)

Screenshots and full narrative live under `/opt/cursor/artifacts/` for the verifying agent run:

- `pages-smoke-home.png` — main UI after onboarding
- `pages-smoke-network.png` — asset path waterfall
- `pages-smoke-sw.png` — service worker + manifest
- `smoke-test-report.md` — step-by-step checklist

## Disposition

- **#404:** **Recommend close** — live URL smoke (this doc) + CI deploy + blocking PWA offline shell test. Optional follow-up: production Lighthouse with recorded deploy SHA.
- **CI correlation:** Every merge to `main` runs blocking quality, E2E (10 specs), cross-browser, a11y, security, and PWA jobs (`docs/ci-branch-governance.md`).
