# 2026-10-02 audit progress (post Wave G)

**Repository:** `qnbs/AI-Research-Orchestrator`  
**Reference baseline (frozen):** `docs/audits/2026-10-01-full-scale-baseline.md`  
**Master prompt handoff:** `docs/prompts/2026-10-02-cursor-composer-full-scale-audit-perfection-master-prompt.md`

This addendum records disposition of Phase-0 baseline findings verified on current `main` without rewriting the baseline tables.

## Baseline finding disposition (2026-10-02)

| ID                    | Severity  | Status on `main`      | Evidence                                                                                                              |
| --------------------- | --------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| H5                    | P2 drift  | **Resolved**          | `AGENTS.md` overview uses live-provider scoring or heuristic BM25+ (no “semantic ranking” overclaim).                 |
| H3                    | P2 debt   | **Resolved**          | Wave B removed stale `cmdk` manual chunk; palette is `CommandPalette.tsx` (no `cmdk` dep).                            |
| H4                    | P2 debt   | **Resolved**          | Wave B removed unused `dexie-react-hooks` direct dependency.                                                          |
| H6                    | P1 defect | **Resolved**          | Settings import provider-aware preservation landed in #344.                                                           |
| Maturity excludes     | P2        | **Resolved**          | `@google/genai@2.25.0` exclude removed #355; `vite@8.3.2` exclude removed Wave H PR after gate ~2026-10-02 10:15 UTC. |
| PWA ruleset           | P1 drift  | **Open (maintainer)** | Cloud agent 403 on ruleset PUT; workflow job remains blocking.                                                        |
| dismiss_stale_reviews | P1 drift  | **Open (maintainer)** | Same 403; documented in wave closeout.                                                                                |
| GitHub topics         | P2        | **Open (maintainer)** | `docs/project-facts.json` canonical set; PUT needs Administration token.                                              |

## Next justified slices (Composer 2.5 master prompt)

1. Live-site / journey QA evidence (Phase-0 gap: no recorded browser matrix on baseline capture).
2. Expand heuristic eval corpus where product-truth gaps remain (ongoing).
3. Maintainer-only governance items above when PAT available.
