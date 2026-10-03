# 2026-10-03 production Lighthouse (Wave F / PWA evidence)

**URL:** `https://qnbs.github.io/AI-Research-Orchestrator/`  
**Tool:** `@lhci/cli` desktop preset, single run (2026-10-03, Cursor Cloud Agent)  
**Command:** `pnpm run test:lighthouse:production` (see `lighthouserc.production.json`)

## Category scores

| Category       | Score | CI gate (`lighthouserc.json` preview) |
| -------------- | ----- | ------------------------------------- |
| Performance    | 0.87  | warn ≥ 0.85                           |
| Accessibility  | 0.98  | error ≥ 0.95                          |
| Best practices | 0.96  | error ≥ 0.95                          |
| SEO            | 1.00  | error ≥ 0.95                          |

**Core metrics (production):** FCP 1.0 s, LCP 1.0 s, TBT 250 ms, CLS 0.003.

## Actionable findings (onboarding/header PR)

| Audit                         | Disposition                                                                |
| ----------------------------- | -------------------------------------------------------------------------- |
| `heading-order` (onboarding)  | **Fixed** — step cards use `<h2>` under page `<h1>`                        |
| `label-content-name-mismatch` | **Fixed** — language toggle `aria-label` includes visible `{current}` code |
| `errors-in-console`           | **Deferred** — dev-only noise on first load; track in journey QA           |
| `unused-javascript`           | **Deferred** — bundle budget gate; no regression in this slice             |
| GitHub Pages cache TTL        | **Deferred** — platform headers; SW handles repeat visits (ADR 0004)       |

## Maintainer (403 on this agent token)

- Ruleset `mainrules`: enable `dismiss_stale_reviews_on_push` and add required context `PWA service-worker registration` — see `docs/ci-branch-governance.md` PUT recipe.
- Repository topic `semantic-search` not present on GitHub (12/13 canonical topics live); PUT requires Administration write.
