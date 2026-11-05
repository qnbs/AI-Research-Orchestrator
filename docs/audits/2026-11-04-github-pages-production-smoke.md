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

| Item                                                                                                        | Status                                                                                |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| External browser/HTTP smoke on **current** Pages deployment                                                 | **Recorded** (≈ `9a604f2`; **`52ab869`**; **`f483e79`**; **`05e1c93`**)               |
| Explicit live-site ↔ **`main` head SHA** attestation (Help → About `formatReleaseLabel()` vs deploy commit) | **Recorded** for **`05e1c93`** — matches **`main`** @ 2026-11-05 ~08:34 Europe/Berlin |
| CI `deploy` job success on latest `main`                                                                    | **Necessary but not sufficient** for #404 acceptance                                  |
| Blocking `pwa-e2e.yml` offline shell                                                                        | **Complements** external smoke; does not replace SHA-tied live URL proof              |

### Probe log (append-only)

Each row must record **HTTP 200**, **base-path asset load**, **first-run → shell**, and **About SHA** for the cited deploy. Do **not** close **#404** on CI green alone or on a row whose About SHA ≠ live Pages at close time.

| Probe (Europe/Berlin) | Deploy SHA    | `deploy.yml` run            | `Last-Modified` (UTC) | HTTP | Base-path assets | First-run shell | About attestation      | Artifacts                                                   |
| --------------------- | ------------- | --------------------------- | --------------------- | ---- | ---------------- | --------------- | ---------------------- | ----------------------------------------------------------- |
| 2026-11-04 afternoon  | ~`9a604f2`    | contemporaneous CI          | ~18:16                | 200  | Pass (doc scope) | Pass            | not recorded           | `pages-smoke-*.png`                                         |
| 2026-11-04 22:59      | **`52ab869`** | **41919411213** @ 21:47:53Z | 21:51:10              | 200  | **Pass**         | **Pass**        | **`v0.4.7 (52ab869)`** | `pages-404-home.png`, `pages-404-about-version.png`         |
| **2026-11-05 00:41**  | **`f483e79`** | **41935140385** @ 23:37:08Z | **23:41:32**          | 200  | **Pass**         | **Pass**        | **`v0.4.7 (f483e79)`** | `pages-404-f483e79-home.png`, `pages-404-f483e79-about.png` |
| **2026-11-05 08:34**  | **`05e1c93`** | **41984538088** @ 07:03:24Z | **07:06:51**          | 200  | **Pass**         | **Pass**        | **`v0.4.7 (05e1c93)`** | `pages-404-05e1c93-home.png`, `pages-404-05e1c93-about.png` |

**Disposition:** **#404** may close when the maintainer cites the **latest probe row whose About SHA matches live Pages and `main`** (currently **`05e1c93`**). If `main` advances again, append a row before closing on the new head.

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
- `pages-404-f483e79-home.png` — post–#452 deploy home (`f483e79`)
- `pages-404-f483e79-about.png` — Help → About **`v0.4.7 (f483e79)`**
- `pages-404-05e1c93-home.png` — post–#457 deploy home (`05e1c93`)
- `pages-404-05e1c93-about.png` — Help → About **`v0.4.7 (05e1c93)`**
- `smoke-test-report.md` — step-by-step checklist (prior runs)

## Disposition

- **#404:** **Ready for maintainer close** when live About matches **`05e1c93`** (probe row 2026-11-05 08:34 Europe/Berlin). Use closure comment in `docs/audits/2026-11-04-issue-closure-404-411.md`; do not close on CI alone.
- **CI correlation:** Every merge to `main` runs blocking quality, E2E (10 specs), cross-browser, a11y, security, and PWA jobs (`docs/ci-branch-governance.md`).
