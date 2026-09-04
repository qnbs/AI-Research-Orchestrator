# Closeout — 2026-09-03 late residual-audit wave (provisional handover)

**Document type:** Engagement closeout (late master prompt §12). Docs-only.  
**Named release:** **v0.4.2**. Do **not** cut `v0.4.3`.  
**Package:** `0.4.2` · **Dexie:** v7 · **SW cache:** `v1` · **ADR floor:** 21  
**Phase 0 measured `main`:** `0df1b71ec562f78534694f3b48ffab9d7e0b345e` (#302) — `docs/audits/2026-09-03-late-baseline.md`  
**Live `main` at this closeout:** `61fda02952de1169456d692694ebbc68b3b45f36` — `fix(i18n): honest live-badge, offline, scientometric, and command-palette copy (#311)`  
**Integrity closeout still valid:** `docs/audits/2026-09-02-closeout.md` (`b48c4d3`)  
**Journey closeout still valid:** `docs/audits/2026-09-03-closeout.md` (`0b9c599`, labels/launchpad/form/five-item nav; later PRs refined chrome)

This wave did **not** reopen façade splits, OpenRouter, matcher 2.3.0 semantics, Dexie, ParticleBackground, lucide-react, Chart.js, or a `v0.4.3` cut.

**Product tickets for this wave are on `main`.** Merge-gate SOP: `docs/audits/2026-09-04-coderabbit-github-block.md` (#310). Do **not** stall later PRs on CodeRabbit quota (`011` **(d)**). A latest-head `CHANGES_REQUESTED` is never waived.

---

## What landed on `main` this wave

| PR   | Merge SHA | What                                                                                                                                                                           |
| ---- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #297 | `0b9c599` | More-sheet focus + Ollama foreign-default ignore (pre-wave / journey follow-up)                                                                                                |
| #298 | `51ed71f` | `NOW-P2-TOPICS` canonical list + sample-topic E2E                                                                                                                              |
| #299 | `49e3be5` | Desktop header single row (`NOW-P1-DENSITY-01` **shipped**)                                                                                                                    |
| #301 | `08788e2` | Dual merge gate, CodeRabbit **(d)**, Codecov                                                                                                                                   |
| #302 | `0df1b71` | GitHub `BLOCKED` vs latest-head; `security.yml` PR types                                                                                                                       |
| #304 | `10cc6aa` | `NOW-P1-MOBILE-360` 360px bottom nav                                                                                                                                           |
| #303 | `cb34882` | Phase 0 late baseline docs                                                                                                                                                     |
| #300 | `b24948b` | Notes Impact                                                                                                                                                                   |
| #305 | `2cf9497` | `NOW-P1-THEME-QA`                                                                                                                                                              |
| #306 | `ae4db85` | Late prompt §0.2 aligned to `011` **(d)**                                                                                                                                      |
| #307 | `07e6854` | `NOW-P1-I18N-TRUTH` + `NOW-P1-HELP-GLOSSARY`                                                                                                                                   |
| #308 | `598f860` | `NOW-P2-OLLAMA-DIAG` / `PRIVACY` / `BUDGET`                                                                                                                                    |
| #309 | `7be11a0` | `NOW-P2-HEURISTIC-UX` / `RANK` / `QUERY` / `SYNTH` — BM25+ copy, DE MeSH, extractive Background, PDF ATX strip. Merged `--admin` under **(d)** (stale CR `CHANGES_REQUESTED`). |
| #310 | `cee4f9c` | CodeRabbit GitHub-block SOP + PWA wait list + `--admin` only when every latest-head CR is gone. Merged while `CLEAN` + **(d)**.                                                |
| #311 | `61fda02` | `NOW-P2-CAPABILITY-COPY` / `SCIENTOMETRIC-COPY` / `PWA-OFFLINE` / `CMDK-TEACH`. CR latest-head findings fixed; merged `--admin` under **(d)** (`codecov/patch` advisory).      |

---

## Ticket table

| ID                          | Status                      | Evidence                                                                                      |
| --------------------------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| `NOW-P1-MOBILE-360`         | Shipped                     | #304                                                                                          |
| `NOW-P1-DENSITY-01`         | Shipped (pre-wave)          | #299 — do not reopen                                                                          |
| `NOW-P1-I18N-TRUTH`         | Shipped                     | #307                                                                                          |
| `NOW-P1-HELP-GLOSSARY`      | Shipped                     | #307                                                                                          |
| `NOW-P1-THEME-QA`           | Shipped                     | #305 checklist + `check:contrast` trigger                                                     |
| `NOW-P2-TOPICS`             | Documented; PUT needs admin | `docs/project-facts.json` `githubTopics`. Live PUT 403. Do not re-add `multi-agent-systems`.  |
| `NOW-P2-OLLAMA-DIAG`        | Shipped                     | #308                                                                                          |
| `NOW-P2-OLLAMA-PRIVACY`     | Shipped                     | #308                                                                                          |
| `NOW-P2-OLLAMA-BUDGET`      | Shipped                     | #308                                                                                          |
| `NOW-P2-HEURISTIC-UX`       | Shipped                     | #309                                                                                          |
| `NOW-P2-HEURISTIC-RANK`     | Shipped                     | #309 — BM25+ lexical / relative 0–100; no “semantic ranking”                                  |
| `NOW-P2-HEURISTIC-QUERY`    | Shipped                     | #309 — phrase MeSH + DE lay synonyms                                                          |
| `NOW-P2-HEURISTIC-SYNTH`    | Shipped                     | #309 — extractive Background; source-honest PubMed/arXiv labels                               |
| `NOW-P2-CAPABILITY-COPY`    | Shipped                     | #311 — live badge `{provider}` / `providerChromeLabel`                                        |
| `NOW-P2-SCIENTOMETRIC-COPY` | Shipped                     | #311 — H-index not official; OA rate ≠ DOAJ                                                   |
| `NOW-P2-PWA-OFFLINE`        | Shipped                     | #311 — already-fetched vs new fetch; Help `offline` + `web_grounding`                         |
| `NOW-P2-CMDK-TEACH`         | Shipped                     | #311 — More → Search commands; not “no first-run onboarding”                                  |
| `NOW-P2-ABORT`              | Already held — verified     | Provider abort → `STREAM_ABORTED`; E2E cancel-mid-stream stamps `'partial'`                   |
| `NOW-P2-CUSTOM-ENDPOINT`    | Already held — verified     | ADR 0013: `endpointPolicy.ts` + origin approval UI (`BaseUrlValidationAlerts`)                |
| `NOW-P2-KB-EMPTY-DEPTH`     | Already held — verified     | KB / Dashboard / History empty states have Literature-review CTAs                             |
| `NOW-P2-EXPORT-HONESTY`     | Already held — verified     | `PARTIAL REPORT` watermark on narrative + CSV first data row; do not re-split writers         |
| `NOW-P2-OPENROUTER`         | Deferred                    | ADR 0010. Stays `openai` + custom base URL                                                    |
| `NOW-P3-FILE-SPLIT`         | Not started (cap holds)     | No product file ≥700. Largest product: `AISettingsTab.tsx` 649, `claimEvidenceMatcher.ts` 646 |
| CodeRabbit GitHub-block SOP | Shipped                     | #310                                                                                          |

---

## File sizes on live `main` `61fda02` (`src/**/*.{ts,tsx}` ≥500)

| File                                                           | Lines | Note                                |
| -------------------------------------------------------------- | ----: | ----------------------------------- |
| `src/services/geminiService.test.ts`                           |  1186 | Test file                           |
| `src/services/exportService.test.ts`                           |   935 | Test file                           |
| `src/components/settings/AISettingsTab.tsx`                    |   649 | Avoid drive-by edits                |
| `src/lib/claimEvidenceMatcher.ts`                              |   646 | Do not change 2.3.0 semantics       |
| `src/components/ReportDisplay.tsx`                             |   641 |                                     |
| `src/services/providers/ollama.test.ts`                        |   626 | Test file                           |
| `src/components/CollectionsView.tsx`                           |   612 |                                     |
| `src/i18n/translations.ts`                                     |   611 | Split already done for most domains |
| `src/test/e2e/agent-flow.spec.ts`                              |   591 | E2E                                 |
| `src/components/knowledge-base/KnowledgeBaseSubComponents.tsx` |   580 |                                     |
| `src/types.ts`                                                 |   570 |                                     |
| `src/i18n/settingsTranslations.ts`                             |   568 |                                     |
| `src/i18n/helpTranslations.ts`                                 |   531 | Grows slightly on #311              |
| `src/components/journals/JournalsSubComponents.tsx`            |   527 |                                     |
| `src/components/ArticleDetailPanel.tsx`                        |   500 | At the 500 reporting floor          |

All **product** files stay under the 700-line cap. Do not cosmetic-split for Sourcery P3.

---

## Integrity confirmations

**2026-09-02 still holds:** cancelled/restored runs are `'partial'` (ADR 0021); export watermarks; heuristic BM25+ **relative** 0–100; demo corpus quarantined (ADR 0016); no OpenRouter adapter; `geminiService.ts` remains the ADR 0008 façade.

**2026-09-03 journey still holds:** Literature review / Quick research labels; Home launchpad; Review options disclosure; five-item bottom nav + More; heuristic is taught as active, not broken.

**#309 addition:** adapter copy must not say “semantic ranking”; non-demo Background is an extractive template; PDF `cleanText` strips ATX `##`.

---

## Merge process (handover — read this first)

1. **Do not treat CodeRabbit rate-limit as a merge wall.** `011` clause **(d)**. Report: `docs/audits/2026-09-04-coderabbit-github-block.md` (#310).
2. A `CHANGES_REQUESTED` on the **latest** head is never waived. A superseded one plus GitHub `BLOCKED` is a ruleset artifact (`dismiss_stale_reviews_on_push: false` on `mainrules` 20291814). Dismiss 403 → `gh pr merge N --squash --admin --delete-branch` after required CI (including **PWA service-worker registration**) and thread/body-only disposition.
3. Always `@deepsourcebot review` (first line exact) on open and after every fix push.
4. Do **not** `@sourcery-ai review` while the 250k / 7-day budget is exhausted (as of 2026-09-03).
5. Do **not** PATCH PR title/body while long `security.yml` jobs run (types are `opened`/`synchronize`/`reopened` — `edited` is ignored, but other workflows may still churn).
6. Do **not** enable CODEOWNERS required reviews.

---

## Residual debt (honest, short)

- Maintainer: GitHub topics PUT (drop `multi-agent-systems`).
- Maintainer: enable **Dismiss stale pull request approvals when new commits are pushed** on `mainrules` (full-ruleset PUT in `docs/ci-branch-governance.md`); then set `ci.dismissStaleReviewsOnPushLive` to `true`.
- Maintainer: raise CodeRabbit included-review allowance **or** accept **(d)** as steady state.
- Maintainer: add `PWA service-worker registration` as a GitHub-enforced required-status context (already workflow-blocking).
- Sourcery budget reset — then it can stand in again as `011` **(b)**.
- Unreleased CHANGELOG is long; do **not** cut `v0.4.3` to “clean” it.

---

## Commands run this closeout slice

- `gh pr merge 309 --squash --admin --delete-branch` → `7be11a0`
- `gh pr merge 310 --squash --admin --delete-branch` → `cee4f9c`
- Scoped Vitest on i18n / inferenceMode / HomeView / OfflineBanner (green)
- `pnpm run i18n:ratchet` (65 files clean) on the capability branch
- Manual DE UI: Home how.4, Help glossary Offline + Web-Grounding, Force-Heuristic copy, heuristic badge (screenshots under `/opt/cursor/artifacts/capability-*.webp`)
- Heuristic honesty E2E video already captured: `/opt/cursor/artifacts/heuristic-honesty-extractive-report.mp4`

---

## Do-nots honored

- No OpenRouter. No `v0.4.3`. No backend. No Dexie bump. No matcher 2.3.0 change. No lucide-react / Chart.js / ParticleBackground. No `connect-src *`. No CODEOWNERS required reviews. No `git commit --no-verify`. No stalling the wave on CodeRabbit quota.
