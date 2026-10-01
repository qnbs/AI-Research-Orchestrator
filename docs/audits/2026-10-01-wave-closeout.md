# 2026-10-01 audit wave closeout

**Repository:** `qnbs/AI-Research-Orchestrator`  
**Live `main` after Waves D–F:** see merge commits for #344–#348 and follow-up PRs #349+  
**Phase-0 baseline (frozen):** `docs/audits/2026-10-01-full-scale-baseline.md` at SHA `0190438…`

This document records what landed after the Phase-0 snapshot. It does **not** rewrite the baseline inventory tables (historical capture stays at Node CI 22, pre-consolidation deps).

## Landed (2026-10-01)

| Wave | PR   | Summary                                                               |
| ---- | ---- | --------------------------------------------------------------------- |
| D0   | #344 | Dependabot #314–#340 consolidation, settings import, Wave B/C hygiene |
| D    | #345 | Vite 8.3.2 override + lockfile alignment                              |
| D    | #346 | GitHub Actions Node **24** LTS; docs `engines` ≥22.12.0               |
| E    | #347 | `@google/genai` 2.25.0 + SDK transport tests                          |
| Docs | #348 | `docs/agent-execution-playbook.md` (dual gate + evidence planes)      |
| F    | #349 | `openai` 7.25.0 patch (when merged)                                   |

## Superseded agent / Dependabot PRs

Close with disposition pointing at #344 / this closeout:

- #341 baseline (content on `main` via #344)
- #342 settings import (merged via #344)
- #343 dead deps (merged via #344)
- Open Dependabot #314–#340 (table in `docs/dependabot-disposition.md` §2026-10-01)

## Maintainer-only (403 from Cloud Agent token, 2026-10-01)

GitHub API `PUT repos/qnbs/AI-Research-Orchestrator/rulesets/20291814` returned **403 Resource not accessible by integration** for:

1. Add **`PWA service-worker registration`** to `mainrules` required status checks.
2. Set **`dismiss_stale_reviews_on_push: true`** on the pull-request rule.

Recipe: `docs/ci-branch-governance.md` (full `rules` array required). After readback succeeds, set `docs/project-facts.json` → `ci.dismissStaleReviewsOnPushLive` to `true`.

Workflow-level blocking for PWA remains authoritative until the ruleset context is added.

## Remaining P2/P3 from baseline (not this closeout)

- Remove `vite@8.3.2` / `@google/genai@2.25.0` maturity excludes when age gate satisfied.
- Heuristic eval corpus expansion (Wave F backlog in baseline §11).
- GitHub repo topics PUT (Administration token).
- Named **`v0.4.3`** tag after release PR merges (`docs/release-policy.md`).
