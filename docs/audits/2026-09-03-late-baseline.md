# Baseline — 2026-09-03 late residual-audit wave

**Document type:** Phase 0 evidence (late master prompt §1). Docs-only.  
**Measured `origin/main`:** `0df1b71ec562f78534694f3b48ffab9d7e0b345e`  
**Subject:** `docs(policy): GitHub BLOCKED vs latest-head quiescence (#302)`  
**Committer date:** 2026-09-04T01:10:56Z  
**Measured at:** 2026-09-04T06:35:20Z  
**Package:** `0.4.2` (do **not** cut `v0.4.3`)  
**Dexie schema:** v7 · **SW cache:** `v1` · **ADR floor:** 21  
**Open GitHub issues:** 0 · **Open PRs:** #300 (`cursor/docs-notes-impact-52dc`) · **Dependabot PRs:** 0  
**Stars / forks:** 2 / 0  
**Repo `pushed_at`:** 2026-09-04T01:10:57Z  
**Homepage:** `https://qnbs.github.io/AI-Research-Orchestrator/`  
**Pages source:** `main` `/` · latest Pages deployment SHA **`0df1b71`** (matches `origin/main`)  
**Repo description:** honest client-only PWA sentence (no swarm claim).  
**Live GitHub topic `multi-agent-systems`:** still present (`NOW-P2-TOPICS`; App PUT 403). Canonical names: `docs/project-facts.json` `githubTopics`.

Live `main` + tests + CI win over any earlier prompt SHA, including the authoring snapshot `0b9c599`. The 2026-09-02 integrity closeout and the 2026-09-03 journey closeout remain stop-the-line / executed.

**Merge-gate note (prompt §0.2 vs live law):** `011` clause **(d)** on this SHA (CodeRabbit rate-limit is not a hard merge blocker) supersedes the late prompt’s “wait 3 cycles / 90 minutes” text. Dual gate: `docs/pr-merge-gate.md`. Sourcery 250k / 7-day budget was exhausted as of 2026-09-03; do not `@sourcery-ai review` until it resets.

---

## Last 15 commits on `origin/main`

```
0df1b71 docs(policy): GitHub BLOCKED vs latest-head quiescence (#302)
08788e2 docs+ci: dual merge gate, CodeRabbit (d), and Codecov (#301)
49e3be5 feat(ui): compact desktop header to a single row (#299)
51ed71f chore(meta): NOW-P2-TOPICS list and sample-topic E2E (#298)
0b9c599 fix(ui): Copilot follow-up for More sheet and Ollama model fallback (#297)
45df008 chore(deps): adopt DOMPurify 3.4.13 (Dependabot #295) (#296)
0b2330a feat(ui): first-run journey and chrome IA (NOW-P0/P1) (#294)
a7e6840 docs: post-#292 closeout matching live main b48c4d3 (#293)
b48c4d3 fix: export façade split, Sourcery residuals, honest index.html meta (#292)
5c539ec docs: #290 closeout and post-merge baseline truth (#291)
01165e8 docs+P2: façade split, chart a11y, ADR 0010 deferral (#290)
660cf8c test(partial): cancel-mid-stream E2E and CSV/insights watermark (#287)
cebcb5e chore(deps): bump TypeScript from 5.8.3 to 6.0.3 (#289)
f3bbae9 fix(i18n): align onboarding copy with product truth (#288)
5df69ff chore(deps): consolidate 2026-08-31 Dependabot wave (#286)
```

Authoring snapshot `0b9c599` is **four** product/docs merges behind live `main` (#298 header-adjacent E2E/topics, #299 header density, #301 dual-gate + Codecov, #302 GitHub vs policy + `security.yml` `edited` ignore).

---

## What this wave is (and is not)

The 2026-09-03 journey closeout listed residual UX debt. This wave is a **residual audit + targeted perfection**, not a second integrity redesign and not a re-run of the journey P0/P1 IDs.

**Do not redo:** ADR 0021 / partial reports, façade splits, export writers, OpenRouter, `v0.4.3`, lucide-react, ParticleBackground, matcher 2.3.0, Dexie v7, claim/demo/heuristic honesty, CodeRabbit 3/90 as a merge block.

**Do not treat closed NOW-\* IDs as open** (journey `NOW-P0-JOURNEY-*`, `NOW-P1-CHROME-*`, `NOW-P1-DENSITY-01` as an unimplemented ticket — it **shipped in #299**).

---

## Inventory (live files + `docs/project-facts.json`)

| Fact                                | Value                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Providers                           | `gemini`, `openai`, `anthropic`, `ollama`, `heuristic`                                                            |
| Default id                          | `gemini`                                                                                                          |
| Default models                      | Gemini `gemini-2.5-flash`, OpenAI `gpt-5`, Anthropic `claude-sonnet-4-5`, Ollama `llama3.1:8b`, heuristic `local` |
| Codecov                             | advisory (`ci.codecovAdvisory: true`)                                                                             |
| `dismissStaleReviewsOnPushExpected` | `true`                                                                                                            |
| `dismissStaleReviewsOnPushLive`     | `false` (`mainrules` 20291814)                                                                                    |

`ProviderStatusLine` already ignores foreign cloud default model names after Ollama hydration (#297). Heuristic rank uses `relevanceScale: 'relative'`. Demo corpus is explicit-opt-in (ADR 0016). Cancelled/restored runs stay `'partial'` (ADR 0021) in `useResearchSession.ts`.

---

## File sizes on `0df1b71` (`src/**/*.{ts,tsx}` ≥500 lines)

| File                                                           | Lines | Note                                                |
| -------------------------------------------------------------- | ----- | --------------------------------------------------- |
| `src/services/geminiService.test.ts`                           | 1186  | Test file; split only if edited                     |
| `src/services/exportService.test.ts`                           | 928   | Test file                                           |
| `src/lib/claimEvidenceMatcher.ts`                              | 646   | Do not change 2.3.0 semantics                       |
| `src/components/settings/AISettingsTab.tsx`                    | 645   | Avoid drive-by edits                                |
| `src/components/ReportDisplay.tsx`                             | 641   | Near cap; split if this wave must edit it           |
| `src/services/providers/ollama.test.ts`                        | 626   | Extend, don’t fork                                  |
| `src/i18n/translations.ts`                                     | 613   | New keys go in domain modules                       |
| `src/components/CollectionsView.tsx`                           | 612   | Large view                                          |
| `src/components/knowledge-base/KnowledgeBaseSubComponents.tsx` | 580   |                                                     |
| `src/types.ts`                                                 | 570   |                                                     |
| `src/test/e2e/agent-flow.spec.ts`                              | 562   | Asserts body does **not** contain forbidden phrases |
| `src/components/journals/JournalsSubComponents.tsx`            | 527   |                                                     |
| `src/i18n/settingsTranslations.ts`                             | 526   |                                                     |
| `src/components/ArticleDetailPanel.tsx`                        | 500   | At the ≥500 floor                                   |

Hot files from the late prompt (re-measured):

| Path                     | Lines |
| ------------------------ | ----: |
| `ReportDisplay.tsx`      |   641 |
| `CollectionsView.tsx`    |   612 |
| `ArticleDetailPanel.tsx` |   500 |
| `Header.tsx`             |   440 |
| `InputForm.tsx`          |   398 |
| `InputFormOptions.tsx`   |   298 |
| `useResearchSession.ts`  |   483 |
| `translations.ts`        |   613 |
| `BottomNavBar.tsx`       |   279 |
| `OnboardingView.tsx`     |   148 |
| `HomeView.tsx`           |   113 |

No product file exceeds the 700-line cap. `Header.tsx` dropped from the journey-closeout 447 to **440** after #299.

---

## Journey tickets — closed on `main`

All `NOW-P0-JOURNEY-*` / `NOW-P1-CHROME-*` / form / empty-state IDs in `docs/audits/2026-09-03-closeout.md` stay **Done**. `NOW-P1-DENSITY-01` (desktop single row from `md`) shipped as #299 (`49e3be5`). `NOW-P2-OLLAMA-STATUS` foreign-default ignore shipped in #297. `NOW-P2-TOPICS` canonical list shipped in facts (#298); live PUT still needs Administration.

---

## Product-truth grep (`0df1b71`)

`docs/project-facts.json` `productCopyPaths` (i18n modules + `metadata.json` + `index.html`): **zero** hits for `forbiddenProductCopyPhrases` / `forbiddenReadmePhrases`.

Hits elsewhere are:

- `src/test/e2e/agent-flow.spec.ts` — **negative** assertions (`not.toContainText`).
- `docs/project-facts.json` — the gated lists themselves.
- `docs/product-truth-matrix.md`, historical audits, and master prompts — documentation of forbidden claims.
- Stale `docs/I18N-AUDIT.md` still mentions “Future of Research”; treat as **suspect** (late prompt §0.1.3). Do not “fix” onboarding strings that already use `t()`.

---

## P0 on this SHA — none found

| ID                            | Result                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NOW-P0-INTEGRITY-REGRESSION` | **Not found.** `'partial'` on cancel/restore; demo is explicit; no silent corpus swap in `nonAi/`. Happy-path `setReportStatus('done')` remains for completed runs only. |
| `NOW-P0-A11Y-BLOCKER`         | **Not found** in this Phase 0 pass (blocking axe/E2E remain on `main`).                                                                                                  |
| `NOW-P0-CI-RED`               | **Not found** at measurement; `origin/main` is `0df1b71` with Pages deploy for that SHA.                                                                                 |

Do **not** invent a P0. Skip to P1.

---

## Hypotheses promoted to this wave’s tickets

Promote only with evidence. Closed journey IDs are not reused.

| ID                     | Evidence on `0df1b71`                                                                                                                                                                           | Disposition                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `NOW-P1-MOBILE-360`    | `BottomNavBar.tsx` still `max-w-[4.5rem] truncate` on labels; 2026-09-03 closeout residual.                                                                                                     | **Open — first P1**                              |
| `NOW-P1-DENSITY-01`    | Header is `hidden md:flex` single row; #299.                                                                                                                                                    | **Shipped — do not reimplement**                 |
| `NOW-P1-THEME-QA`      | No light/matrix visual checklist in `CONTRIBUTING.md` or the PR template.                                                                                                                       | **Open** (docs/checklist only; no screenshot CI) |
| `NOW-P1-I18N-TRUTH`    | Structural DE keys exist (`onboardingTranslations.ts`, `journeyTranslations.ts`, chrome). Quality (clones / heuristic terminology) **not** proven in this Phase 0 pass — sample in the i18n PR. | **Open — verify then fix**                       |
| `NOW-P1-HELP-GLOSSARY` | Journey closeout marked Help glossary Done; re-read vs matrix in the Help PR.                                                                                                                   | **Open — verify then fix**                       |
| `NOW-P2-TOPICS`        | Live topics still include `multi-agent-systems`.                                                                                                                                                | **Documented; not a code blocker**               |
| `NOW-P2-OLLAMA-STATUS` | Foreign-default ignore already in `ProviderStatusLine.tsx`.                                                                                                                                     | **Shipped #297 — add tests only if missing**     |
| `NOW-P2-CMDK-TEACH`    | Closeout: More-menu row only.                                                                                                                                                                   | **Open P2 after P1**                             |

P2 local-AI / heuristic / capability / PWA tickets stay in the late prompt catalog. Do not start them while P1 user-visible residuals are open.

---

## Code-scanning / Dependabot

- Dependabot: **no** open PRs.
- Dependabot vulnerability alerts GraphQL: **none** open.
- Code-scanning REST list: **403** for this App token (not a product defect).

---

## Execution prompt

`docs/prompts/2026-09-03-late-cursor-grok-audit-perfection-master-prompt.md`

The 2026-09-03 **journey** prompt (`docs/prompts/2026-09-03-cursor-grok-uiux-perfection-master-prompt.md`) is **executed**. Do not re-run it as if open.

---

## Phase 0 exit

- This file records SHA `0df1b71`. No product behavior change.
- Next product PR: `NOW-P1-MOBILE-360` (header density already on `main`).
- Closeout at end of engagement: `docs/audits/2026-09-03-late-closeout.md`.
