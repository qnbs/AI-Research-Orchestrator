# AI Research Orchestrator — Cursor Cloud Agent / Grok 4.5 Master Prompt

**Document type:** Authoritative post-v0.4.2, post-2026-09-01-wave audit, correction, and perfectionization master prompt  
**Audience:** Cursor Cloud Agent running Grok 4.5 (or equivalent coding agent) inside this repository  
**Language:** English for new or edited repository prose, comments, commits, and default strings; preserve existing German locale values and add EN+DE keys for new UI strings (rule `010`)  
**Created:** 2026-09-02  
**Observed clock:** 2026-09-02 ~18:04 CEST  
**Supersedes for execution planning:**

- `docs/prompts/2026-09-01-cursor-grok-audit-remediation-master-prompt.md`
- `docs/prompts/2026-08-02-cursor-agent-full-remediation-master-prompt.md`

Keep both older prompt files. Do **not** delete them. Add a one-line supersession banner at the top of each pointing here.

**Must be read before any product code:**

1. `AGENTS.md`
2. `CLAUDE.md` (if present)
3. `.github/copilot-instructions.md`
4. `.cursor/index.mdc` and `.cursor/rules/*.mdc`
5. `docs/adr/README.md` (ADR floor **21**; ADR **0010 remains Proposed** on `main`)
6. `docs/ci-branch-governance.md`
7. `docs/project-facts.json`
8. `docs/audit-governance.md`
9. `docs/release-policy.md`
10. `SECURITY.md`
11. `CHANGELOG.md` `[Unreleased]`
12. `docs/audits/2026-09-01-baseline.md`
13. Live GitHub state: `main`, open PRs, Actions, ruleset `mainrules`

If any of those documents contradict this prompt, **live `main` + tests + CI win**. This prompt is a work-order. It is not a license to re-implement landed behavior.

---

## 0. Status block (authoritative as of 2026-09-02 18:04 CEST)

| Field                        | Value                                                                                                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                   | https://github.com/qnbs/AI-Research-Orchestrator                                                                                                                                                         |
| Live demo                    | https://qnbs.github.io/AI-Research-Orchestrator/                                                                                                                                                         |
| Package / product version    | **0.4.2** (named release 2026-08-30, GitHub Release exists; do **not** cut `v0.4.3` unless a user-facing integrity or security fix actually ships)                                                       |
| Default branch HEAD observed | `660cf8c5f186fcd041000248aa2b85c55449d384` — `test(partial): cancel-mid-stream E2E and CSV/insights watermark (#287)` (2026-09-02T01:01:13Z)                                                             |
| Live Pages                   | Onboarding already shows the honest product-truth copy from #288. Confirm deployed SHA vs `660cf8c` in Help → About / `formatReleaseLabel()` before claiming Pages lag.                                  |
| Last merge wave on `main`    | 2026-09-01 → 2026-09-02: #285, #286, #288, #289, #287                                                                                                                                                    |
| Open pull requests           | **#290** `docs+P2: façade split, chart a11y, ADR 0010 deferral` (`size:XXL`, branch `cursor/docs-housekeeping-2026-09-02-7093`, head observed `871eafc` during audit)                                    |
| Open GitHub Issues           | Effectively **0 product issues**. `#290` is the only open issue-like object. Work is tracked in `docs/audits/*`, CHANGELOG, ADRs.                                                                        |
| ADR floor on `main`          | **21** accepted numbered records. **ADR 0010 is still Proposed on `main`**; #290 documents a dated deferral — verify after merge.                                                                        |
| Dexie schema                 | **v7**                                                                                                                                                                                                   |
| Claim matcher                | `CLAIM_EVIDENCE_MATCHER_VERSION = 2.3.0`                                                                                                                                                                 |
| Providers on `main`          | `gemini`, `openai`, `anthropic`, `ollama`, `heuristic`. OpenRouter is **not** a first-class adapter. Zero-cost paths: heuristic and Ollama; OpenRouter remains reachable via `openai` + `customBaseUrl`. |
| TypeScript                   | Dev compiler **~6.0.3** landed in #289. Do not treat TS 6 as open work.                                                                                                                                  |
| Solo maintainer              | `@qnbs`. CODEOWNERS routes critical paths. **Do not enable require-code-owner reviews.**                                                                                                                 |
| Popularity signal            | 2 stars, 0 forks. Treat this as a high-integrity personal research instrument, not a crowded multi-contributor product.                                                                                  |
| Agent authorship pattern     | Nearly every recent merge is `qnbs` + `cursoragent`. Process must prevent agent amnesia, stale-backlog rework, and XXL mixed PRs.                                                                        |

### 0.1 Hard truth this prompt exists to prevent

The 2026-08-02 and 2026-09-01 master prompts are **stale as work orders**.

If you treat them as live tickets you will:

- re-implement landed P0/P1 integrity fixes,
- fight already-merged Dependabot / TypeScript / onboarding / E2E PRs,
- invent defects that no longer exist,
- collide with in-flight **PR #290**.

**Re-verify every ID against live `main` and against PR #290 before writing a single line of product code.**

### 0.2 What changed in the last 72 hours (do not rediscover)

| When       | SHA / PR               | What landed on `main`                                                                                       |
| ---------- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-08-29 | #260 / #262 / ADR 0021 | Cancelled reports persist as `'partial'`, never `'done'`. Banner, chat gate, narrative watermark.           |
| 2026-08-29 | #261                   | `prefers-reduced-motion` for looping Framer Motion.                                                         |
| 2026-08-30 | #264                   | Named release **v0.4.2**.                                                                                   |
| 2026-08-30 | #265                   | CODEOWNERS for critical paths.                                                                              |
| 2026-08-30 | #266                   | Ollama idle 30s / 8 MiB / 5 min wall-clock.                                                                 |
| 2026-08-30 | #267                   | Dexie v2/v4/v6 → production v7 upgrade tests.                                                               |
| 2026-08-30 | #268                   | Typed `HeuristicOperation`; honest capability flags.                                                        |
| 2026-08-30 | #269                   | Adversarial agent-eval fixtures (DE, numeric, injection, JSON).                                             |
| 2026-08-30 | #270                   | Shared fake-HTTP provider conformance harness.                                                              |
| 2026-08-30 | #271                   | Lucene BM25+ IDF; relative 0–100 rank display.                                                              |
| 2026-08-30 | #272                   | CSV formula-injection hardening + 8 MiB download cap.                                                       |
| 2026-09-01 | #285                   | Audit baseline + `browserslist@4.28.8` pin (CVE-2026-73088 / CVE-2026-73089).                               |
| 2026-09-01 | #286                   | Dependabot wave 2 consolidation; unused `lucide-react` **removed**.                                         |
| 2026-09-01 | #288                   | Onboarding / chrome / Help copy aligned with product truth. Live welcome is no longer “Future of Research”. |
| 2026-09-02 | #289                   | TypeScript 6.0.3.                                                                                           |
| 2026-09-02 | #287                   | Playwright cancel-mid-stream E2E; CSV/insights partial watermark; Gemini cancel stays `STREAM_ABORTED`.     |

### 0.3 What is in flight right now

**PR #290** is the current critical path. Observed intent:

1. **NOW-P2-FACADE** — keep `geminiService.ts` as public façade (ADR 0008); extract `aiJson.ts`, `liveResearchReportStream.ts`, `literatureAiTools.ts`; aggregate coverage floors across the four modules.
2. **NOW-P2-CHART-A11Y** — `ChartAccessibleTable` twins for report / author / journal timelines and scientometric scatter/bar charts; `scientometrics.a11y.*` keys; integer Y-axes.
3. **NOW-P2-OPENROUTER** — dated deferral of ADR 0010 (2026-09-02). No first-class OpenRouter adapter in this PR.
4. Housekeeping: `View` derived from `VIEWS` + `isView()`; `isDeveloperToolsEnabled()`; abort taxonomy (`STREAM_ABORTED` not remapped to `PROVIDER_UNAVAILABLE`); root array schemas wrapped as `{items:[…]}`.

**Explicitly not in #290:** OpenRouter implementation, `exportService.ts` file-cap, Sourcery P2-002/004/005, GitHub repo description rewrite, `v0.4.3` tag.

**Merge-gate reality observed during this audit:** blocking CI on the #290 head was reported green (Deploy, E2E, A11y, PWA). CodeRabbit was **rate-limited** (3/hour). AGENTS.md forbids merging on a “Review rate limited” placeholder. Wait the cooldown, re-request, max 3 cycles, escalate after >90 minutes. Do not “fix” rate-limit by inventing extra diffs.

---

## 1. Role and mission

You are simultaneously:

1. Staff architect for a client-only React 19 + TypeScript strict PWA
2. Scientific-integrity engineer (citation grounding, claim evidence, provenance, demo quarantine, partial-report honesty)
3. Security engineer for a zero-app-backend, browser-held-key threat model
4. Provider-transport engineer (Gemini / OpenAI / Anthropic / Ollama / heuristic)
5. QA / evaluation engineer (Vitest floors, agent-eval gate, Playwright matrix)
6. Docs / ADR / changelog / product-truth auditor
7. Release and dependency-governance operator (rule `012`, `docs/release-policy.md`)
8. Process surgeon — this repo’s current failure mode is **stale-audit amnesia + XXL agent PRs + review-bot thrash**, not missing features

**Primary objective:** take live `main` at or after `660cf8c`, treat PR #290 as the in-flight vehicle, close only work that is still real, keep scientific honesty and security invariants, leave the repo merge-ready with green required CI and quiescent review bots, and publish a fresh `docs/audits/2026-09-02-baseline.md`.

**Non-objectives:**

- Do not cut `v0.4.3` unless a user-facing integrity or security fix actually ships after #290.
- Do not implement ADR 0010 OpenRouter as a surprise feature in a hygiene or façade PR.
- Do not enable GitHub “require code owner reviews”.
- Do not lower coverage floors, disable workflows, add `continue-on-error` to required jobs, or ignore high/critical production advisories.
- Do not run the full Playwright suite locally unless the user explicitly asks; prefer targeted specs plus CI.
- Do not reopen landed IDs from the 2026-08-02 / 2026-08-03 / 2026-08-29 / 2026-09-01 documents.
- Do not start a parallel façade-split branch while #290 is open.
- Do not expand scope into “rebuild the product” work (new backends, new providers, multiplayer, vector DB, local WASM LLM).

---

## 2. Product you are working on (do not rediscover from marketing copy)

**AI Research Orchestrator** is a **client-only React 19 PWA** for biomedical literature review.

Pipeline (conceptual agent roles, **not** separate OS processes):

1. Natural-language intent → Boolean / MeSH query formulation
2. Live PubMed (NCBI E-utilities) and optional arXiv retrieval
3. Relevance ranking (provider semantic when live; lexical BM25+ when heuristic)
4. Streaming cited synthesis when the provider supports it

**Local-first, not zero-egress:**

- Reports, history, settings, knowledge base, collections, checkpoints live in IndexedDB via Dexie 4.
- There is **no application server** that stores research.
- In live mode the **browser** still sends prompts and article metadata to the selected AI provider and queries PubMed / arXiv.
- Keys are AES-GCM encrypted at rest in IndexedDB (`apiKeyService.ts`). Encryption does **not** protect against XSS or malware in a live session.

**Honest synthesis labels (ADR 0012, 0015, 0016, 0017, 0018, 0021):**

- `corpus-supported` / `claim-supported` / unverified narrative draft
- Cancelled or restored-unfinished runs are `partial`, never `done`
- Educational demo corpus is quarantined and watermarked; never silently substituted for empty retrieval
- Inference mode is frozen at stream start

**Forbidden product phrases** (enforced by `docs/project-facts.json` + `scripts/check-docs-drift.mjs`):

- “Every AI assertion is inextricably linked to a verified PubMed ID”
- German equivalent of that claim
- “Nothing is ever sent to a server”
- “swarm of specialized AI agents” / “AI agents conduct” as product-copy claims (onboarding already cleaned in #288; **GitHub repository description is still dirty**)

If you add README / Help / onboarding copy, it must survive `pnpm run check:docs-drift`.

**Live demo truth (verified visually 2026-09-02):**

- Welcome title: “Welcome to AI Research Orchestrator”
- Subtitle: “A client-only PWA for biomedical literature reviews.”
- Cards describe PubMed (+ optional arXiv), rank, cited synthesis, live vs heuristic, local KB
- Privacy footer: stored data stays in the browser; live mode still sends prompts and article metadata to the chosen provider and queries PubMed/arXiv
- CTA: “Start Researching”

Do not regress this copy.

---

## 3. What is already done — do not re-implement

Treat the following as **landed on `main`** unless `git log` / file inspection proves otherwise.

### 3.1 Scientific integrity

| ID / PR                                                | Landed behavior                                                                                                                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-A–F wave, matcher 2.3.0                             | Conservative claim-evidence matcher; negation checks all overlapping token occurrences; mixed support+contradict → `unverified`; supporting-only PMIDs on claim-supported results |
| ADR 0016                                               | No silent demo substitution                                                                                                                                                       |
| ADR 0017                                               | Inference mode frozen at stream start                                                                                                                                             |
| ADR 0018                                               | Trust terminology is claim/corpus-supported, not “verified”                                                                                                                       |
| ADR 0021 / #260 / #262                                 | `ReportStatus` includes `partial`; cancel / checkpoint-restore never stamps `done`; banner + narrative watermark; chat gated on `=== 'done'`                                      |
| #287 / NOW-P0-PARTIAL-E2E / NOW-P1-PARTIAL-EXPORT-GAPS | Playwright cancel-mid-stream; CSV/insights first data row watermark; Gemini cancel stays `STREAM_ABORTED` at the façade                                                           |
| ISSUE-P0-CLAIM-001                                     | Resolved                                                                                                                                                                          |

### 3.2 Transport, providers, heuristic

| ID / PR | Landed behavior                                                                            |
| ------- | ------------------------------------------------------------------------------------------ |
| #266    | Ollama NDJSON idle 30s, body 8 MiB, 5-minute wall-clock; timeout vs caller-abort mapping   |
| #268    | `HeuristicOperation` is the only dispatch key; honest capability flags                     |
| #271    | Lucene BM25+ IDF; relative min-max 0–100 display scale                                     |
| #270    | Shared fake-HTTP conformance harness; Stainless `APIUserAbortError` is non-retryable abort |
| #269    | Adversarial agent-eval fixtures are in `check:agent-eval`                                  |

### 3.3 Persistence, export, a11y, governance, copy, deps

| ID / PR     | Landed behavior                                                                  |
| ----------- | -------------------------------------------------------------------------------- |
| #267        | Dexie v2/v4/v6 → v7 upgrade tests; poison-record skip                            |
| #272        | CSV formula-injection hardening; 8 MiB cap; Blob instead of uncapped `data:` URI |
| #261        | `useMotionSafeLoop` + SMIL gating                                                |
| #259 / #285 | `nanoid@3.3.18` pin; LHCI-only `extract-zip` ignore; `browserslist@4.28.8` pin   |
| #263 / #286 | Dependabot consolidations; lucide-react removed                                  |
| #264        | v0.4.2 GitHub Release                                                            |
| #265        | CODEOWNERS path routing only                                                     |
| #288        | Onboarding / product-truth live copy                                             |
| #289        | TypeScript ~6.0.3                                                                |
| #285        | `docs/audits/2026-09-01-baseline.md`                                             |

### 3.4 Explicitly deleted / not present

- `ParticleBackground.tsx` was deleted. Do not recreate it.
- Unused `lucide-react` was removed. Do not re-add it to bump Dependabot.
- Claude Code Review is on-demand (`claude.yml`), not a required CI job.
- DeepSource JavaScript analyzer is disabled; ESLint + `deploy.yml` are authoritative.

---

## 4. What is actually still open (priority order)

Reconfirm each item in Phase 0. If already fixed on a newer HEAD than `660cf8c` or already inside merged #290, mark resolved in the new baseline and skip.

### NOW-P0 — do first if still true

There is **no known remaining production integrity P0 on `main` after #287**.

The only P0-class items left are **process / merge-safety**:

| ID                     | Work                                                                                                                                                                                                                                        | Why it is P0-class                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `NOW-P0-PR-290-MERGE`  | Finish PR #290 correctly. Do not open a competing façade PR. Wait out CodeRabbit rate-limit per AGENTS.md. Keep CI green on the latest head. Merge only when review bots are quiescent or the documented escalation path has been followed. | An XXL PR sitting unmerged is the current source of drift, duplicate work, and agent collision. |
| `NOW-P0-NO-REGRESSION` | After #290 merges, prove façade public API, abort taxonomy, coverage floors, chart a11y, and docs-drift still hold on `main`.                                                                                                               | Refactor PRs are how integrity labels silently break.                                           |
| `NOW-P0-AUDIT-DRIFT`   | Publish `docs/audits/2026-09-02-baseline.md`. Point older baselines at it. Stop listing landed 2026-08/09-01 IDs as Open.                                                                                                                   | Stale audit docs are this repo’s highest-probability agent defect.                              |

If you discover a real integrity regression (cancelled run stamped `done`, silent demo substitution, unverified prose labeled claim-supported, abort remapped to `PROVIDER_UNAVAILABLE`), that immediately outranks everything else. Prove it with a failing test first.

### NOW-P1 — this week, after #290 is merged or explicitly abandoned

| ID                         | Work                                                                                                                                                                                                                                                                                                                                                 | Notes                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `NOW-P1-REPO-DESCRIPTION`  | GitHub repository description still says “swarm of specialized agents…”. README/onboarding no longer do. Update the GitHub repo description and `metadata.json` leftovers if any remain. Historical ID: `ISSUE-P2-AGENT-001`.                                                                                                                        | This is the last public overclaim. It is visible on every GitHub search hit. |
| `NOW-P1-FILE-CAP`          | After the façade split lands, re-measure files against rule `200` (target 200–400, hard max 700). Historical offenders: `geminiService.ts` (was ~1216), `exportService.ts` (~676), `ReportDisplay.tsx` (~685), `Header.tsx`, `InputForm.tsx`, large i18n files. Split only files that still breach or sit inside ~20 lines of the cap.               | Do not split for sport. Characterization tests before move.                  |
| `NOW-P1-SOURCERY-RESIDUAL` | After #290, re-triage `docs/audits/2026-08-06-sourcery-highlevel-backlog.md`. Likely still open unless #290 absorbed them: **BACKLOG-P2-002** sticky offset constants, **BACKLOG-P2-004** LoadingIndicator cancel i18n, **BACKLOG-P2-005** duplicate cancel-button UI. P2-001 / P2-003 / P2-006 were in #290’s intended scope — verify, do not redo. | One small PR. No new architecture.                                           |
| `NOW-P1-PAGES-SHA`         | Confirm GitHub Pages build on `main` after #290. Help → About must show `v0.4.2 (<shortSha>)` consistent with deployed commit.                                                                                                                                                                                                                       | Users audit the live demo, not the PR branch.                                |
| `NOW-P1-CHANGELOG-TRUTH`   | `[Unreleased]` must describe only what is not yet in a named release. After #290 merge, fold the façade / chart a11y / ADR 0010 deferral notes accurately. Do not pretend they shipped if they only exist on the PR branch.                                                                                                                          | Drift gate + humans both read this file.                                     |

### NOW-P2 — scheduled, still real, not this PR unless tiny

| ID                           | Work                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOW-P2-OPENROUTER-DECISION` | ADR 0010 has been Proposed since 2026-07-21. #290 intends a **dated deferral**, not an implementation. After merge, the ADR must not look like an accepted-but-missing feature. Keep it `Deferred — <date>` with an explicit revisit trigger, or keep Proposed only if the deferral has not landed. Do **not** implement OpenRouter in the same breath as file splits. |
| `NOW-P2-HINDEX-COPY`         | Keep estimated H-index / author clustering labeled assistive, corpus-derived, not official (`ISSUE-P3-README-001` if still sloppy anywhere).                                                                                                                                                                                                                           |
| `NOW-P2-I18N-GAPS`           | New strings from #290 (`scientometrics.a11y.*`, error taxonomy, debugger gating) need EN+DE and `i18n:ratchet`. Fix only real missing keys.                                                                                                                                                                                                                            |
| `NOW-P2-EXPORT-SPLIT`        | If `exportService.ts` still near 700 after #290, extract format writers (CSV / RIS / BibTeX / PDF) behind the existing public API. Preserve sanitizer + size cap + partial watermark behavior.                                                                                                                                                                         |
| `NOW-P2-E2E-DEPTH`           | Seven Chromium specs plus cross-browser matrix exist. Do not explode the suite. Add a spec only when a user-visible integrity path is untested (example: heuristic-mode first-run demo quarantine banner; partial report History badge).                                                                                                                               |

### NOW-P3 — later / product strategy, out of scope unless asked

- Multi-device sync, accounts, server-side key proxy
- First-class OpenRouter adapter implementation
- Additional literature sources beyond PubMed / arXiv
- Local WASM / in-browser LLM
- Visual redesign
- Marketing site separate from the PWA
- Cutting `v0.5.0`

These are product decisions for `@qnbs`, not stealth scope.

---

## 5. Critical evaluation the agent must internalize

This is not a greenfield rescue. It is a **mature v0.4.2 instrument with unusually strong governance and a solo-maintainer / agent-loop risk profile**.

### 5.1 What is actually strong

- Honest local-first threat model documented in README + SECURITY + live footer
- Multi-provider architecture with a real heuristic fallback, not a fake “works offline” banner
- Scientific-integrity machinery that most research-GPT wrappers do not have: claim matcher 2.3.0, demo quarantine, partial-report state, provenance stamps, forbidden-phrase drift gate
- CI density appropriate for a biomedical tool: typecheck, lint max-warnings 0, coverage floors, agent-eval, docs-drift, CSP, bundle budget, Playwright chromium + cross-browser, axe, PWA, CodeQL, pnpm audit
- Dexie upgrade tests that actually open old schemas
- Export hardening that treats CSV as an attack surface

### 5.2 What is actually weak or urgent

1. **Process theater vs product motion.** The last two days mixed necessary integrity work with audit-docs recursion. The next failure mode is another 2k-line “master prompt” that reopens closed IDs.
2. **XXL PR #290.** Façade split + a11y + ADR prose + error taxonomy in one PR is exactly what rule “one concern per PR” forbids. Do not make it worse. Land it or split it; do not stack a second XXL on top.
3. **Review-bot deadlock.** CodeRabbit rate-limit is now a merge blocker by policy. Follow the written protocol. Do not generate noise commits to “summon” a review.
4. **Public identity drift.** GitHub description still markets a swarm. The running app does not. Fix the description.
5. **Inherent security ceiling.** Client-held keys + prompt egress to providers cannot be “fixed” by more AES-GCM. Do not claim otherwise. XSS remains game-over for keys.
6. **Scientific ceiling.** The matcher labels claims. It does not make the model truthful. Never reintroduce “every assertion has a verified PMID”.
7. **Heuristic quality gap.** BM25+ and templates are honest, not equivalent to Gemini 2.5 Flash. UI must keep saying so.
8. **File-cap debt.** Rule `200` is real in this repo. After #290, enforce it on leftovers only.
9. **NCBI from the browser.** Every user hits E-utilities from their own IP. Rate-limit UX and optional NCBI key remain product-critical. Do not scrape. Do not add unofficial mirrors.
10. **Solo blast radius.** One maintainer, agent-authored history, 2 stars. Optimize for _not destroying trust invariants_, not for feature velocity.

### 5.3 Product judgment you must not violate

- Prefer a smaller honest tool over a larger theatrical “agent swarm”.
- Prefer merging #290 cleanly over starting new architecture.
- Prefer tests that lock integrity state machines over new charts.
- Prefer deleting stale backlog rows over writing another audit novel.

---

## 6. Execution plan

### Phase 0 — re-establish the live baseline (mandatory first hour)

1. `git fetch origin` and record:
   - `origin/main` SHA
   - open PRs (`gh pr list`)
   - #290 head SHA, CI conclusion, review-bot state
   - latest GitHub Release
   - `package.json` version
2. Do **not** assume this prompt’s SHAs are still HEAD. Replace them if `main` moved.
3. Run the local gate subset in §8. Record pass/fail.
4. Inspect file sizes for rule `200` after considering #290’s split.
5. Write `docs/audits/2026-09-02-baseline.md` with:
   - observed HEAD
   - #290 status
   - ID supersession table (landed vs remaining)
   - Pages SHA check
   - recommended PR sequence
6. Add supersession banners to the 2026-08-02 and 2026-09-01 prompt files.
7. Refresh `docs/audits/2026-08-03-issue-backlog.md` header so it no longer lists landed P0/P1s as Open. Point to the new baseline.

**Stop after Phase 0 if #290 is still open.** Your next action is #290 hygiene, not a new feature branch.

### Phase 1 — land or split PR #290

Allowed actions only:

- Address real review findings that are still valid on the latest head.
- Re-request CodeRabbit after the documented cooldown.
- Fix CI if it goes red.
- If the PR is truly too large to review: split **forward** from the same branch (docs/ADR deferral vs façade vs charts), do not restart from `main` and duplicate the split.
- Update CHANGELOG Unreleased only if the PR does not already do it correctly.

Forbidden:

- Mixing OpenRouter implementation into #290.
- Mixing `exportService` splits into #290.
- Rewriting the GitHub repo description inside the XXL PR unless it is a one-line docs change already present.
- Force-pushing after reviews unless the branch policy requires it and you explain why.

### Phase 2 — post-merge truth PR (small)

Branch idea: `docs/2026-09-02-post-290-baseline`

- Baseline + backlog pointers
- GitHub description / any remaining swarm phrase
- CHANGELOG Unreleased accuracy
- ADR 0010 status sentence matching reality
- Pages SHA note if needed

No product behavior change.

### Phase 3 — residual P1 code PR (small, optional split)

Only after Phase 1 is merged:

- Remaining file-cap splits with characterization tests
- Sourcery P2-002 / P2-004 / P2-005 if still real
- Missing i18n keys from the façade/a11y work

Keep it under a focused diff. Prefer two small PRs over one “finish P2” monster.

### Phase 4 — stop

Do not start OpenRouter. Do not cut `v0.4.3`. Do not expand E2E to vanity coverage. Write the engagement closeout using the template in §10.

---

## 7. Mandatory operating rules

### 7.1 Evidence first

- Name file and function, state current behavior, add or extend a failing test before changing product code.
- Quote IDs (`NOW-*`, `ISSUE-*`, ADR numbers, PR numbers).
- If an ID is already green on `main`, mark it Resolved and move on.

### 7.2 Governance

- No direct pushes to `main`.
- One concern per new PR. #290 is already the exception; do not copy that pattern.
- English-only repo artifacts. Existing German locale values stay; new UI strings need EN + DE via `t()`.
- File target 200–400 lines, hard max 700.
- New persisted fields require Dexie schema bump + migration + tests + CHANGELOG.
- Never commit API keys or secrets. No secrets in `VITE_*`.
- Never use `--no-verify` except for a documented hook failure.
- Never comment out or delete tests to pass CI.
- Resolve automated review comments, including nits and out-of-diff items, or record an explicit won’t-fix with reason.
- Never merge on a CodeRabbit “Review rate limited” placeholder. Wait, re-request, max 3 cycles, escalate after >90 minutes.

### 7.3 Scientific integrity

- A PMID in proximity is not automatic evidence.
- Do not reintroduce grounding overclaims.
- Preserve `generationProvenance` and export watermarks.
- Demo corpus stays quarantined (ADR 0016).
- Partial reports stay `partial` (ADR 0021).
- Chat stays gated on `completionStatus === 'done'`.
- Claim matcher version stays 2.3.0 unless you intentionally ship matcher 2.4.0 with eval fixtures.

### 7.4 Security

- Treat IndexedDB and Redux as inspectable by XSS.
- AES-GCM-at-rest is not XSS-safe. Do not write copy that implies it is.
- Do not retry `AbortError` / `APIUserAbortError`.
- Keep CSV injection sanitizer and 8 MiB download cap.
- Custom endpoints must stay origin-approved and CSP-coherent. No `connect-src *`.
- Do not cache credentialed NCBI URLs in the service worker.
- Wrap untrusted model/title/abstract text before prompt concatenation (`wrapUntrustedTextBlock`).
- Keep `pnpm audit --audit-level=high` green without new global GHSA ignores. The only known accepted ignore is LHCI-only `extract-zip`. Browserslist is pinned, not ignored.

### 7.5 Architecture

- Redux Toolkit is session source of truth; Dexie is persistence; React context is not a second store for the same flags.
- Lazy-load provider SDKs.
- Heuristic mode must never throw `NO_API_KEY`.
- Recharts only (ADR 0005).
- No CDN import map (ADR 0011).
- Honor `prefers-reduced-motion`.
- Public façade for AI remains `geminiService.ts` even after extracts (ADR 0008), unless an ADR changes that.

---

## 8. Test and gate plan

Run locally (or record why a gate must wait for CI):

```bash
pnpm install --frozen-lockfile
pnpm audit --audit-level=high
pnpm run check:audit-ignore-paths
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run i18n:ratchet
pnpm run check:docs-drift
pnpm run check:csp-endpoint-drift
pnpm run check:log-redaction
pnpm run check:conflict-markers
pnpm run test:coverage
pnpm run check:coverage-floors
pnpm run check:agent-eval
pnpm run build
pnpm run bundle:budget
pnpm run check:no-cdn-scripts
pnpm run check:workbox-vendor-drift
pnpm run check:contrast
```

Required GitHub checks before merge (names as in `docs/ci-branch-governance.md`):

- Typecheck, Lint & Tests (`deploy.yml`)
- Production Build
- Playwright E2E (Chromium)
- Cross-browser E2E
- Axe critical/serious smoke
- PWA service-worker registration (workflow-level blocking; not currently in `mainrules` required-status checks)
- CodeQL / Dependency Review / pnpm audit / gitleaks as configured

Scoped extra verification for this engagement:

- Cancel-mid-stream Playwright still passes after façade moves.
- CSV / insights partial watermark still first data row.
- Coverage floors still pass when `geminiService.ts` + extracts are aggregated.
- Chart accessible tables present for the four surfaces #290 claims.
- `check:docs-drift` rejects swarm / verified-PMID / never-sent-to-a-server phrases.
- Help → About release label matches package version + short SHA.

Do not run the full Playwright matrix on a laptop “to be sure” unless asked.

---

## 9. PR hygiene template

Every new PR body must contain:

1. Problem
2. Evidence (file, test, audit ID)
3. Root cause
4. Before / after behavior
5. Non-goals
6. Tests run
7. Rollback
8. CHANGELOG Unreleased note
9. ADR impact (or “none”)

Title format: `fix|feat|refactor|docs|test|chore(scope): imperative summary (#id)`

---

## 10. Engagement closeout template

When you stop, write `docs/audits/2026-09-02-closeout.md` (or append to the baseline) with:

- Final `main` SHA
- PRs opened / merged
- IDs resolved vs deferred
- CI conclusion
- Pages SHA
- Residual risks
- What the next human or agent must **not** redo

---

## 11. Definition of Done

### Per PR

- Local gates in §8 that apply to the change pass
- Required GitHub checks green on the latest head
- Review bots quiescent or escalated per AGENTS.md
- No new `any`
- No `continue-on-error` on required jobs
- No deleted tests
- No silent demo fallback
- No `'done'` on abort
- No forbidden product phrases
- File-cap respected for edited files
- EN+DE for new UI strings
- CHANGELOG Unreleased updated when user-visible or governance-visible

### Whole engagement

- `docs/audits/2026-09-02-baseline.md` exists and matches live `main`
- Older prompts and baselines carry supersession banners
- PR #290 is merged, cleanly split, or explicitly parked with a reason
- GitHub repository description no longer claims a swarm of specialized agents
- Partial-report honesty remains E2E-gated on `main`
- Onboarding / Help / README / SECURITY / live footer stay consistent
- ADR 0010 is not silently implemented and is not silently described as Accepted
- No new ignored production advisories
- File-cap leftovers are either fixed or scheduled with measured line counts
- No `v0.4.3` tag unless a real user-facing integrity/security fix shipped

---

## 12. Forbidden actions (explicit)

- Do not push to `main`.
- Do not open a second façade-split PR while #290 is open.
- Do not re-implement ADR 0021, BM25+, browserslist pin, TS 6, lucide removal, onboarding rewrite, or cancel E2E.
- Do not implement OpenRouter.
- Do not enable require-code-owner reviews.
- Do not cut `v0.4.3` as ceremony.
- Do not recreate `ParticleBackground.tsx` or `lucide-react`.
- Do not add `connect-src *`.
- Do not cache NCBI credentials in the service worker.
- Do not retry aborts.
- Do not lower coverage floors.
- Do not disable workflows.
- Do not ignore high/critical production GHSA items.
- Do not write German comments, German commit messages, or German docs.
- Do not use marketing claims the drift gate forbids.
- Do not treat AES-GCM as protection against XSS.
- Do not scrape PubMed.
- Do not merge on a rate-limited review placeholder.
- Do not expand this engagement into a product rewrite.

---

## 13. Suggested first commands

```bash
git fetch origin
git rev-parse origin/main
gh pr view 290 --json title,state,headRefOid,statusCheckRollup,reviews,url
git log --oneline origin/main -20
wc -l src/services/geminiService.ts src/services/exportService.ts src/components/ReportDisplay.tsx src/components/Header.tsx src/components/InputForm.tsx
rg -n "swarm of specialized|Future of Research|AI agents conduct|inextricably linked|Nothing is ever sent" README.md SECURITY.md metadata.json src/i18n docs || true
```

Then write the 2026-09-02 baseline. Then touch #290. Then stop expanding scope.

---

## 14. One-sentence north star

Ship the smallest honest continuation of v0.4.2: land the in-flight façade/a11y/ADR-deferral work without regressions, kill the last public swarm claim, keep partial reports honest, and leave the next agent a baseline that matches reality.
