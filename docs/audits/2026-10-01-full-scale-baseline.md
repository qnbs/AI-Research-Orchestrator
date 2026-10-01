# 2026-10-01 Full-scale audit baseline

**Repository:** `qnbs/AI-Research-Orchestrator`  
**Baseline captured:** 2026-10-01 (UTC)  
**Local `main` / `origin/main` SHA:** `019043872a13ec060a38a6c22abbb4025f3c27e0`  
**Named package version:** `0.4.2`  
**Audit charter:** Full-scale deep audit master prompt (2026-10-01 upload)

This document is the Phase-0 truth snapshot before implementation PRs. Facts were re-fetched from git, GitHub API, npm registry, and live GitHub Pages unless noted.

---

## 1. Git / repository inventory

| Item           | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| HEAD           | `019043872a13ec060a38a6c22abbb4025f3c27e0`                      |
| Default branch | `main`                                                          |
| Working tree   | Clean at capture                                                |
| Recent tip     | `docs(audit): 2026-09-03 late-wave provisional closeout (#312)` |

### Scale (approximate)

| Metric                                    |   Count |
| ----------------------------------------- | ------: |
| `src/**/*.ts` + `*.tsx` files             |     469 |
| Colocated `*.test.ts(x)` files            |     134 |
| Production source lines (`src`, non-test) | ~47,868 |
| Files ≥500 lines (production `src`)       |      13 |
| Files ≥650 lines (production `src`)       |       0 |
| Files ≥700 lines (production `src`)       |       0 |

**Largest production files (lines):** `AISettingsTab.tsx` (649), `claimEvidenceMatcher.ts` (646), `ReportDisplay.tsx` (641), `CollectionsView.tsx` (612), `translations.ts` (611), …

**Largest test files:** `geminiService.test.ts` (1186), `exportService.test.ts` (935).

### Direct dependency inventory (declared → resolved at capture)

| Package               | Declared  | Resolved (pnpm) | npm latest (2026-10-01)  |
| --------------------- | --------- | --------------- | ------------------------ |
| react / react-dom     | ^19.2.8   | 19.2.8          | 19.3.0                   |
| vite                  | 8.1.5     | 8.1.5           | 8.3.2                    |
| typescript            | ~6.0.3    | 6.0.x           | 7.0.2                    |
| vitest                | ^4.1.10   | 4.1.10          | 5.0.3                    |
| @playwright/test      | ^1.62.1   | 1.62.1          | 1.63.0                   |
| dompurify             | ^3.4.13   | 3.4.13          | 3.4.16                   |
| @google/genai         | ^2.13.0   | 2.13.0          | 2.25.0                   |
| openai                | ^7.2.0    | 7.2.0           | 7.25.0                   |
| @anthropic-ai/sdk     | ^0.112.3  | 0.112.3         | 0.131.0                  |
| @reduxjs/toolkit      | ^2.12.0   | 2.12.0          | 2.13.0                   |
| dexie                 | ^4.4.5    | 4.4.5           | 4.4.6                    |
| framer-motion         | ^12.38.0  | 12.42.2         | 13.5.0                   |
| tailwindcss           | ^4.3.3    | 4.3.3           | 4.3.3                    |
| @tailwindcss/postcss  | ^4.2.4    | 4.3.2           | 4.3.3                    |
| pnpm (packageManager) | 11.13.1   | —               | 12.x line active         |
| Node engines          | >=22.12.0 | CI 22           | Node 24 LTS / 26 Current |

**Dexie schema:** 7 (`docs/project-facts.json`). **SW cache version:** `v1`.

---

## 2. Deployed application evidence

| Check                                        | Result                                                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| URL                                          | https://qnbs.github.io/AI-Research-Orchestrator/                                                      |
| HTTP                                         | **200**                                                                                               |
| `<base href>`                                | `/AI-Research-Orchestrator/` present in live HTML                                                     |
| CSP meta                                     | Present (hash-based script-src)                                                                       |
| Deployed commit SHA in HTML                  | **Not embedded** in fetched shell — cannot prove Pages SHA ≠ bootstrap SHA without Actions/deploy API |
| Full browser matrix / offline / SW lifecycle | **Not run in this Phase-0 pass** — scheduled for Wave G / live-site suite                             |

**Limitation:** Phase-0 used HTTP + HTML snippet only; no recorded Playwright live-site run yet.

---

## 3. GitHub control plane

### Open PRs (18 Dependabot, 0 feature at capture)

Actions/CodeQL (#337–#340), claude-code-action (#338), codecov-action major (#334), pnpm/action-setup (#331), Vitest 5 mocker (#326), DOMPurify (#325), Framer 13 (#324), autoprefixer (#323), jest-dom (#322), GenAI (#321), OpenAI (#319), testing-library/react (#318), tailwind postcss (#317), globals (#316), @types/node (#315), deploy-pages (#314).

**Open issues:** none listed.

### Ruleset `mainrules` (id 20291814) — live API 2026-10-01

| Setting                                | Live value |
| -------------------------------------- | ---------- |
| `enforcement`                          | active     |
| `dismiss_stale_reviews_on_push`        | **false**  |
| `strict_required_status_checks_policy` | true       |
| `required_review_thread_resolution`    | true       |

**Ruleset-required contexts (11):**  
`Typecheck, Lint & Tests`, `Production Build`, `Playwright E2E`, `Cross-browser (firefox)`, `Cross-browser (mobile-chrome)`, `Cross-browser (webkit)`, `Axe critical/serious smoke`, `CodeQL`, `Dependency Review`, `pnpm audit (high+)`, `Secret scan (gitleaks)`.

**Not in ruleset but workflow-blocking (documented):**  
`PWA service-worker registration` (`pwa-e2e.yml` job name) — **CONFIRMED_DRIFT** vs `docs/project-facts.json` / `docs/ci-branch-governance.md` / README process policy.

**Drift:** `docs/project-facts.json` → `ci.dismissStaleReviewsOnPushExpected: true`, `dismissStaleReviewsOnPushLive: false` — **CONFIRMED_DRIFT** (governance debt, not product code).

---

## 4. Provider / model / capability inventory

From `docs/project-facts.json` + `src/services/providers/provider.ts` (aligned at bootstrap SHA):

| Provider  | Default model     | Transport                        |
| --------- | ----------------- | -------------------------------- |
| gemini    | gemini-2.5-flash  | @google/genai (lazy)             |
| openai    | gpt-5             | openai SDK                       |
| anthropic | claude-sonnet-4-5 | @anthropic-ai/sdk (browser flag) |
| ollama    | llama3.1:8b       | fetch                            |
| heuristic | local             | deterministic engine             |

Capability metadata exists on `AI_PROVIDERS` (streaming, JSON modes, grounding, chat, abort, custom base URL, etc.). Web grounding remains Gemini-specific in product contract.

---

## 5. Dead dependency / stale config candidates

| ID  | Finding                          | Classification                     | Evidence                                                                                                                                               |
| --- | -------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H3  | `cmdk`                           | **CONFIRMED_MAINTAINABILITY_DEBT** | No `cmdk` in `package.json`; no `src` imports; `vite.config.ts` manual chunk key `cmdk`; docs still claim cmdk palette                                 |
| H4  | `dexie-react-hooks`              | **CONFIRMED_MAINTAINABILITY_DEBT** | Declared `^4.4.0`; **zero** `src` imports / `useLiveQuery`; Dexie via `databaseService.ts` only; disposition doc notes hygiene merge                   |
| H5  | “Semantic ranking” in agent docs | **CONFIRMED_DRIFT**                | `AGENTS.md` overview still says “semantic ranking (0–100)”; product-truth matrix + #309 shipped BM25+ honesty for heuristic                            |
| H6  | Settings import model coercion   | **CONFIRMED_DEFECT** (P1)          | `useSettingsViewLogic.ts` resets any `ai.model` not in `{gemini-2.5-flash, gemini-3-pro-preview}` to Gemini default **without checking `ai.provider`** |

**Command palette:** custom implementation in `CommandPalette.tsx` (not cmdk).

---

## 6. PWA / security / a11y / scientific-integrity state (bootstrap)

| Area                 | State                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| PWA                  | Workbox vendored; dedicated `pwa-e2e.yml` blocking at workflow level; ruleset gap documented since 2026-08                                  |
| Security             | CodeQL + gitleaks + audit high+ required; AES-GCM vault; CSP strict script-src; DOMPurify 3.4.13 (open Dependabot #325 behind npm 3.4.16)   |
| A11y                 | Blocking axe smoke + seven Chromium/cross-browser specs including dialog-a11y, keyboard-focus, skip-to-content                              |
| Scientific integrity | Claim/evidence matcher, adversarial agent evals, partial-report ADR 0021, corpus-supported vocabulary enforced in recent waves (#309, #311) |

No new P0 security defects identified in Phase-0 static pass.

---

## 7. Test / coverage inventory

- **Unit/integration:** Vitest, 134 test files; coverage floors in `docs/project-facts.json` (80/80/55/55 global; module floors for providers, vault, DB, retrieval, etc.).
- **E2E:** Seven blocking Chromium specs + separate `a11y.spec.ts`; PWA lane via `playwright.pwa.config.ts`.
- **Agent/heuristic eval:** `pnpm run check:agent-eval` (agentEval, adversarial, heuristicEval, liveOrchestratorEval).
- **Gap:** No dedicated test for settings JSON import model preservation (supports H6).

---

## 8. Top 20 findings (ranked)

|   # | P   | Classification                     | Summary                                                                        |
| --: | --- | ---------------------------------- | ------------------------------------------------------------------------------ |
|   1 | P1  | CONFIRMED_DEFECT                   | Settings import coerces non-Gemini models to `gemini-2.5-flash`                |
|   2 | P1  | CONFIRMED_DRIFT                    | PWA job blocking in repo policy but absent from ruleset required checks        |
|   3 | P1  | CONFIRMED_DRIFT                    | `dismiss_stale_reviews_on_push: false` vs documented expected true             |
|   4 | P2  | CONFIRMED_DRIFT                    | `AGENTS.md` “semantic ranking” overclaim vs product-truth                      |
|   5 | P2  | CONFIRMED_MAINTAINABILITY_DEBT     | Stale `cmdk` chunk + stack docs                                                |
|   6 | P2  | CONFIRMED_MAINTAINABILITY_DEBT     | Unused direct dep `dexie-react-hooks`                                          |
|   7 | P2  | UPGRADE_READY                      | DOMPurify 3.4.13 → 3.4.16 (security-sensitive patch line)                      |
|   8 | P2  | UPGRADE_REQUIRES_MIGRATION         | 18 stale Dependabot PRs; consolidate by risk wave                              |
|   9 | P2  | UPGRADE_READY                      | Provider SDKs materially behind npm (GenAI, OpenAI, Anthropic)                 |
|  10 | P2  | CONFIRMED_PERFORMANCE_OPPORTUNITY  | Provider SDK lazy chunks OK; verify after each bump                            |
|  11 | P3  | UPGRADE_REQUIRES_MIGRATION         | TypeScript 7 / Vitest 5 / pnpm 12 / Motion 13 — isolated experiments           |
|  12 | P3  | EXPERIMENT_REQUIRED                | Node 24 LTS as next baseline; Node 26 advisory                                 |
|  13 | P3  | CONFIRMED_MAINTAINABILITY_DEBT     | `AISettingsTab.tsx` at 649 lines (under 700 cap, watch)                        |
|  14 | P3  | NO_ACTION                          | No production file ≥700 lines                                                  |
|  15 | P2  | CONFIRMED_SCIENTIFIC_INTEGRITY_GAP | Model/pricing catalogs age without provenance metadata (H9)                    |
|  16 | P3  | EXPERIMENT_REQUIRED                | OpenAI Responses API vs Chat Completions — ADR before migrate                  |
|  17 | P3  | CONFIRMED_SECURITY_HARDENING       | CSP `style-src unsafe-inline`, broad `img-src https:` — narrow only with proof |
|  18 | P3  | EXPERIMENT_REQUIRED                | Google Fonts self-host vs CSP/privacy tradeoff                                 |
|  19 | P2  | CONFIRMED_MAINTAINABILITY_DEBT     | Heuristic eval corpus expandable (Wave F)                                      |
|  20 | P3  | MAINTAINER_DECISION_REQUIRED       | Add PWA + dismiss-stale to ruleset (API PUT needs admin token)                 |

---

## 9. Proposed PR sequence (from charter §27, adjusted)

| Wave    | PR focus                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------- |
| **A0**  | This baseline (docs only)                                                                         |
| **A**   | Settings import provider-aware validation + tests; AGENTS/Cursor/Copilot semantic-ranking doc fix |
| **B**   | Remove cmdk chunk/docs; remove dexie-react-hooks + doc drift                                      |
| **C**   | D0 security patch (DOMPurify) + sanitizer tests                                                   |
| **C+**  | Provider SDK bumps (one PR per vendor)                                                            |
| **D–I** | As master prompt §27 (toolchain majors, research quality, governance maintainer actions)          |

---

## 10. Explicit do-not list (this engagement)

- No ruleset mutation without maintainer authorization.
- No bulk-close Dependabot without tested consolidation + disposition comments.
- No “semantic” label on heuristic BM25+ ranking.
- No backend / telemetry without ADR + stop condition review.
- No admin merge as default path.
- No weakening CSP, coverage floors, or sanitizer strictness for convenience.

---

## 11. Maintainer-decision queue

1. Add **`PWA service-worker registration`** to `mainrules` `required_status_checks`.
2. Enable **`dismiss_stale_reviews_on_push`** on `mainrules` (full rules array PUT — documented in `docs/ci-branch-governance.md`).
3. Node 24 LTS promotion vs Node 22 compatibility lane.
4. OpenAI Responses API migration (after ADR).
5. GitHub topics cleanup (`semantic-search`, `systematic-review` accuracy) if desired.

---

## 12. Hypothesis disposition (§42 seeds)

| Hypothesis                                | Verdict                                      |
| ----------------------------------------- | -------------------------------------------- |
| H1 PWA not ruleset-required               | **Confirmed**                                |
| H2 dismiss stale off                      | **Confirmed**                                |
| H3 cmdk stale                             | **Confirmed**                                |
| H4 dexie-react-hooks unused               | **Confirmed**                                |
| H5 semantic ranking in agent docs         | **Confirmed**                                |
| H6 settings import coercion               | **Confirmed defect**                         |
| H7 Dependabot targets stale intermediates | **Confirmed** (npm newer than open PRs)      |
| H8 DOMPurify PR behind patch line         | **Confirmed** (#325 → 3.4.14; latest 3.4.16) |
| H9–H20                                    | Open / deferred to later waves (see §8)      |

---

## 13. Commands run (Phase 0)

```bash
git fetch origin main --prune
git rev-parse HEAD && git rev-parse origin/main
gh pr list --state open
gh issue list --state open
gh api repos/qnbs/AI-Research-Orchestrator/rulesets/20291814
curl -sI https://qnbs.github.io/AI-Research-Orchestrator/
pnpm list --depth=0
npm view <packages> version  # see §1 table
find/wc -l src  # file size distribution
rg cmdk dexie-react-hooks semantic\ ranking  # drift probes
```

---

## 14. Known unknowns

- Exact GitHub Pages deploy SHA for live site (not in HTML shell).
- Full live-site / offline / multi-tab SW suite not executed in Phase-0.
- Ruleset PUT feasibility from current automation tokens (historically 403).
- Socket / Greptile / trial bot availability on next PR heads.

---

_Next step:_ Wave A remediation PRs (settings import P1, agent doc truth, dependency hygiene).
