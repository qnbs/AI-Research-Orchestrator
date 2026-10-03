# 2026-10-02 Composer audit closeout (post v0.4.4)

**Release:** `v0.4.4` on `main` (2026-10-02)  
**Prior tag:** `v0.4.3` → `5ae99748`  
**Master prompt:** `docs/prompts/2026-10-02-cursor-composer-full-scale-audit-perfection-master-prompt.md`

## Shipped on `main` (PRs)

| Wave | PR   | Theme                                                    |
| ---- | ---- | -------------------------------------------------------- |
| H    | #356 | Vite maturity exclude removal + audit handoff docs       |
| A    | #357 | Model catalog + orchestrator loading i18n                |
| B    | #358 | Capability matrix + retrieval status copy                |
| C    | #359 | Journey QA evidence + stroke heuristic fixture           |
| D    | #360 | Orchestrator task-state brief UX                         |
| §11  | #361 | Release truth audit (`v0.4.3` GitHub Release)            |
| E    | #362 | A11y state coverage (axe + keyboard)                     |
| F    | #363 | Heuristic eval expansion (`check:agent-eval` → 45 cases) |
| —    | #364 | Release **v0.4.4** (semver + CHANGELOG)                  |
| G    | #366 | Production Lighthouse + onboarding a11y                  |
| —    | #367 | Release **v0.4.5** (patch + §48 viewport tooling)        |
| H    | #371 | Workbox 7.4.1 + `framer-motion` 13.5 + cache **v2**      |
| —    | #372 | Release **v0.4.6** (#369 + #371)                         |

## Open (maintainer / deferred)

- GitHub ruleset: `dismiss_stale_reviews_on_push`, PWA required check on ruleset (cloud agent **403**).
- GitHub topics PUT (Administration token).
- §48 viewport grid: `pnpm run capture:journey-viewports` (maintainer; see `docs/audits/viewport-captures/README.md`).
- Master prompt Wave F (PWA/performance hardening) — production Lighthouse evidence when prioritized.

## Ledger

- Progress: `docs/audits/2026-10-02-audit-progress.md`
- Release truth: `docs/audits/2026-10-02-release-truth.md`
