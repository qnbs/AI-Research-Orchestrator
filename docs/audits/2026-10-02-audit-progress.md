# 2026-10-02 audit progress (post Wave G)

**Repository:** `qnbs/AI-Research-Orchestrator`  
**Reference baseline (frozen):** `docs/audits/2026-10-01-full-scale-baseline.md`  
**Master prompt handoff:** `docs/prompts/2026-10-02-cursor-composer-full-scale-audit-perfection-master-prompt.md`

This addendum records disposition of Phase-0 baseline findings verified on current `main` without rewriting the baseline tables.

## Baseline finding disposition (2026-10-02)

| ID                    | Severity  | Status on `main`      | Evidence                                                                                                                 |
| --------------------- | --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| H5                    | P2 drift  | **Resolved**          | `AGENTS.md` overview uses live-provider scoring or heuristic BM25+ (no “semantic ranking” overclaim).                    |
| H3                    | P2 debt   | **Resolved**          | Wave B removed stale `cmdk` manual chunk; palette is `CommandPalette.tsx` (no `cmdk` dep).                               |
| H4                    | P2 debt   | **Resolved**          | Wave B removed unused `dexie-react-hooks` direct dependency.                                                             |
| H6                    | P1 defect | **Resolved**          | Settings import provider-aware preservation landed in #344.                                                              |
| Maturity excludes     | P2        | **Resolved**          | `@google/genai@2.25.0` exclude removed #355; `vite@8.3.2` exclude removed **#356** after gate ~2026-10-02 **10:18 UTC**. |
| PWA ruleset           | P1 drift  | **Open (maintainer)** | Cloud agent 403 on ruleset PUT; workflow job remains blocking.                                                           |
| dismiss_stale_reviews | P1 drift  | **Open (maintainer)** | Same 403; documented in wave closeout.                                                                                   |
| GitHub topics         | P2        | **Open (maintainer)** | `docs/project-facts.json` canonical set; PUT needs Administration token.                                                 |

## Next justified slices (Composer 2.5 master prompt)

1. **Wave A (#357)** — model catalog + orchestrator loading i18n — **merged** (`6caa00c`).
2. **Wave B (#358)** — capability matrix + retrieval status copy — **merged** (`7240bc7`).
3. **Wave C (#359)** — journey QA evidence — **merged** (`0067383`).
4. **Wave D (#360)** — orchestrator task-state brief + compose hiding — **merged** (`e7a6c64`).
5. **§11 release/truth** — GitHub Release `v0.4.3` body aligned to tag `5ae99748`; audit `docs/audits/2026-10-02-release-truth.md`.
6. **Wave E (#362)** — a11y state coverage — **merging**.
7. Heuristic eval corpus expansion (`check:agent-eval`) — ongoing.
8. Maintainer-only governance (ruleset, topics).
