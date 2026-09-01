# AI Research Orchestrator — Cursor Cloud Agent / Grok 4.5 Master Prompt

**Document type:** Authoritative post-v0.4.2 audit, correction, and perfectionization master prompt  
**Audience:** Cursor Cloud Agent running Grok 4.5 (or equivalent coding agent) in this repository  
**Language:** English only for all repo artifacts this prompt produces  
**Created:** 2026-09-01  
**Supersedes for execution planning:** `docs/prompts/2026-08-02-cursor-agent-full-remediation-master-prompt.md` (keep that file; do not delete; add a one-line supersession banner pointing here)  
**Must be read with:** `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/index.mdc`, `.cursor/rules/*.mdc`, `docs/adr/README.md`, `docs/ci-branch-governance.md`, `docs/project-facts.json`, `docs/audit-governance.md`, `docs/release-policy.md`, `SECURITY.md`, `CHANGELOG.md`

---

## 0. Status block (authoritative as of 2026-09-01)

| Field                             | Value                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Repository                        | https://github.com/qnbs/AI-Research-Orchestrator                                                                              |
| Live demo                         | https://qnbs.github.io/AI-Research-Orchestrator/                                                                              |
| Package / product version         | **0.4.2** (named release cut 2026-08-30, GitHub Release exists)                                                               |
| Default branch HEAD observed      | `8a76bda7bbe221d21cb9d5924d8d81cee162fa48` — `fix(heuristic): Lucene BM25+ IDF and relative rank scores (#271)`               |
| Last human/agent merge wave       | 2026-08-29 → 2026-08-30 (PRs #259–#272)                                                                                       |
| Last observed activity after HEAD | Dependabot PRs #274–#284 opened 2026-08-31; human docs PR **#273 still open**                                                 |
| Open GitHub Issues                | **0** (work is tracked in `docs/audits/*`, CHANGELOG, ADRs — not Issues)                                                      |
| ADR floor                         | **21** (`docs/adr/0021-partial-report-completion-state.md` accepted)                                                          |
| Dexie schema                      | **v7**                                                                                                                        |
| Claim matcher                     | `CLAIM_EVIDENCE_MATCHER_VERSION = 2.3.0`                                                                                      |
| Providers on `main`               | `gemini`, `openai`, `anthropic`, `ollama`, `heuristic` — **OpenRouter is still ADR 0010 Proposed, not a first-class adapter** |
| Solo maintainer                   | `@qnbs` — CODEOWNERS routes critical paths; **do not enable require-code-owner reviews**                                      |

### 0.1 Hard truth this prompt exists to prevent

The 2026-08-02 master prompt and the 2026-08-03 / 2026-08-29 audit backlog **are now stale in several P0/P1 rows**. If you treat those documents as live work orders you will re-implement landed fixes, fight already-merged PRs, and invent defects that no longer exist.

**Re-verify every ID against `main` before writing a single line of product code.**

---

## 1. Role and mission

You are simultaneously:

1. Staff architect for a client-only React 19 + TypeScript strict PWA
2. Scientific-integrity engineer (citation grounding, claim evidence, provenance, demo quarantine)
3. Security engineer for a zero-app-backend, browser-held-key threat model
4. Provider-transport engineer (Gemini / OpenAI / Anthropic / Ollama / heuristic)
5. QA / evaluation engineer (Vitest floors, agent-eval gate, Playwright matrix)
6. Docs / ADR / changelog / product-truth auditor
7. Release and dependency-governance operator (rule `012`, `docs/release-policy.md`)

**Primary objective:** take the _current_ `main` at or after `8a76bda`, produce a fresh evidence-first audit baseline dated today, close only work that is still real, keep scientific honesty and security invariants, and leave the repo merge-ready with green required CI and quiescent review bots.

**Non-objectives:**

- Do not cut `v0.4.3` unless a user-facing integrity or security fix actually ships.
- Do not implement ADR 0010 OpenRouter as a surprise feature in the same PR as hygiene.
- Do not enable GitHub “require code owner reviews”.
- Do not lower coverage floors, disable workflows, add `continue-on-error` to required jobs, or ignore high/critical production advisories.
- Do not run the full Playwright suite locally unless the user explicitly asks; prefer targeted specs plus CI.

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

**Honest synthesis labels (ADR 0012, 0015, 0018, 0021):**

- `corpus-supported` / `claim-supported` / unverified narrative draft
- Cancelled or restored-unfinished runs are `partial`, never `done`
- Educational demo corpus is quarantined and watermarked; never silently substituted for empty retrieval (ADR 0016)

**Forbidden product phrases** (enforced by `docs/project-facts.json` + `scripts/check-docs-drift.mjs`):

- “Every AI assertion is inextricably linked to a verified PubMed ID”
- German equivalent of that claim
- “Nothing is ever sent to a server”

If you add README / Help / onboarding copy, it must survive `pnpm run check:docs-drift`.

---

## 3. What is already done — do not re-implement

Treat the following as **landed on `main`** unless `git log` / file inspection proves otherwise.

### 3.1 Scientific integrity (historical P0 closeout + Aug 29–30)

| ID / PR                    | Landed behavior                                                                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-A–F wave, matcher 2.3.0 | Conservative claim-evidence matcher; negation checks **all** overlapping token occurrences; mixed support+contradict → `unverified`; supporting-only PMIDs on claim-supported results                                                                       |
| ADR 0016                   | No silent demo substitution                                                                                                                                                                                                                                 |
| ADR 0017                   | Inference mode frozen at stream start                                                                                                                                                                                                                       |
| ADR 0018                   | Trust terminology is claim/corpus-supported, not “verified”                                                                                                                                                                                                 |
| ADR 0021 / #260 / #262     | `ReportStatus` includes `partial`; cancel / checkpoint-restore never stamps `done`; banner + export watermark `PARTIAL REPORT — RESEARCH DID NOT FINISH`; chat gated on `=== 'done'`; save hidden while streaming; green trust chrome suppressed on partial |
| ISSUE-P0-CLAIM-001         | Resolved — do not mark In progress                                                                                                                                                                                                                          |

### 3.2 Transport, providers, heuristic (Aug 30)

| ID / PR                       | Landed behavior                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| #266 / ISSUE-P1-TRANSPORT-001 | Ollama NDJSON idle 30s, body 8 MiB, 5-minute wall-clock; incremental error-body cap; timeout vs caller-abort mapping |
| #268 / ISSUE-P1-HEURISTIC-001 | `HeuristicOperation` is the only dispatch key; honest capability flags (no JSON schema, no web grounding)            |
| #271 / ISSUE-P1-HEURISTIC-002 | Lucene BM25+ IDF; relative min-max 0–100 display scale; ARIA relative-rank wording **only** for heuristic scores     |
| #270 / ISSUE-P1-PROVIDER-001  | Shared fake-HTTP conformance harness; Stainless `APIUserAbortError` is non-retryable abort                           |
| #269 / ISSUE-P1-EVAL-001      | Adversarial agent-eval fixtures (German, numeric/dose, injection, malformed JSON) are in `check:agent-eval`          |

### 3.3 Persistence, export, a11y, governance

| ID / PR                      | Landed behavior                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| #267 / ISSUE-P1-PERSIST-001  | Dexie v2/v4/v6 → production v7 upgrade tests; poison-record skip; coverage floors ratcheted                                                  |
| #272 / ISSUE-P1-SECURITY-001 | CSV formula-injection hardening (BOM, Unicode lookalikes, pipe-DDE, HTML-risk `<`); 8 MiB download cap; Blob instead of uncapped `data:` URI |
| #261                         | `useMotionSafeLoop` + SMIL gating for looping motion; module-level keyframe constants                                                        |
| #259                         | `nanoid@3.3.18` pin; LHCI-only `extract-zip` GHSA ignore; `scripts/check-audit-ignore-paths.mjs`                                             |
| #263                         | Dependabot consolidation of the mid-August wave                                                                                              |
| #264                         | Named release **v0.4.2** + GitHub Release                                                                                                    |
| #265                         | `.github/CODEOWNERS` path routing only                                                                                                       |
| NCBI SW cache                | Credentialed NCBI requests are NetworkOnly; do not re-open this as a defect                                                                  |
| #228 / #229 / #230           | Header offset measurement, nav/product-name, sticky settings desktop-only                                                                    |

### 3.4 Explicitly deleted / not present

- `ParticleBackground.tsx` was deleted. Do not recreate it.
- Claude Code Review is **on-demand** (`claude.yml`), not a required CI job.
- DeepSource JavaScript analyzer is disabled; ESLint + `deploy.yml` are authoritative.

---

## 4. What is actually still open (priority order)

Reconfirm each item in Phase 0. If already fixed on a newer HEAD than `8a76bda`, mark resolved in the new baseline and skip.

### NOW-P0 — do first if still true

| ID                   | Work                                                                                                                                                                                                                                                  | Why it is P0                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `NOW-P0-AUDIT-DRIFT` | `docs/audits/2026-08-03-issue-backlog.md` and `docs/audits/2026-08-29-baseline.md` still describe `NOW-P0-PARTIAL`, `NOW-P1-MOTION`, `NOW-P1-DEP-STALL` (old 15-PR list), and “no GitHub Release for v0.4.1” as if they were live. That is now false. | Agents following stale docs will reopen integrity bugs that are already fixed. |
| `NOW-P0-PARTIAL-E2E` | #260 deferred a Playwright cancel-mid-stream test because network-mock fixtures had no controllable delay. Unit/hook coverage exists; **production cancel honesty is not E2E-gated**.                                                                 | Integrity defect class that already escaped to `main` once.                    |

There is **no known remaining “stamp cancelled reports as done” code path** on `8a76bda`. Do not “fix” ADR 0021 again. Prove the state machine with tests, then add the missing E2E.

### NOW-P1 — this week

| ID                           | Work                                                                                                                           | Notes                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOW-P1-PR-273`              | Finish or recreate the docs-only closeout that PR #273 started (`ISSUE-P1-CI-001` / CODEOWNERS landed).                        | Merge if CI + reviews are quiescent; otherwise fold the same docs delta into the new baseline PR.                                                     |
| `NOW-P1-DEP-WAVE-2`          | Rule `012`: **one** Dependabot consolidation PR for the 2026-08-31 wave (`#274`–`#284`), not eleven merges.                    | See §4.1 disposition.                                                                                                                                 |
| `NOW-P1-PARTIAL-EXPORT-GAPS` | #260 deferred CSV / insights watermarking for `partial` reports (narrative paths are watermarked).                             | Decide: watermark tabular exports too, or document the residual risk in SECURITY + Help + CHANGELOG Unreleased as accepted. Do not leave it implicit. |
| `NOW-P1-LIVE-COPY`           | Live onboarding still says “Welcome to the Future of Research” and “have AI agents conduct…”. README/SECURITY are more honest. | Product-truth pass: keep the visual design; stop overclaiming agency and verification. EN+DE via `t()`.                                               |
| `NOW-P1-BASELINE-DOC`        | Write `docs/audits/2026-09-01-baseline.md` from live evidence.                                                                 | Required artifact of Phase 0.                                                                                                                         |

### NOW-P2 — after P1, still real

| ID                  | Work                                                                                                                                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOW-P2-FACADE`     | `src/services/geminiService.ts` is still the oversized orchestration façade (~46 KB / 1200+ lines, rule `200` hard max 700). Extract typed phase helpers **without** changing pipeline semantics. Historical ID: `ISSUE-P2-ORCH-001`.                                            |
| `NOW-P2-FILE-CAP`   | Other files over or near the 700-line cap: `exportService.ts`, `Header.tsx`, `ReportDisplay.tsx`, `InputForm.tsx`, `helpTranslations.ts`, `settingsTranslations.ts`, `translations.ts`. Split by existing feature patterns (`FeatureView` + context + hook, or i18n extraction). |
| `NOW-P2-OPENROUTER` | ADR 0010 remains **Proposed** since 2026-07-21. Either accept and implement as a dedicated PR series, or reject/supersede with a dated ADR. Do not leave Proposed forever.                                                                                                       |
| `NOW-P2-CHART-A11Y` | Bar / scatter accessible-table coverage is still incomplete after #232.                                                                                                                                                                                                          |
| `NOW-P2-SOURCERY`   | `docs/audits/2026-08-06-sourcery-highlevel-backlog.md` P2 items BACKLOG-P2-001…006 (developerMode helper, sticky offsets, `validViews` derived from `View`, cancel-button i18n/duplication, scientometric a11y keys).                                                            |
| `NOW-P2-LUCIDE`     | `lucide-react` is declared (`^1.14.0`) and was previously classified **unused**. Dependabot #248 was skipped; #284 tries 1.35.0. Prefer **remove the unused dependency** over bumping it.                                                                                        |

### NOW-P3 — honesty / polish

| ID                    | Work                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ISSUE-P3-README-001` | Estimated H-index line must stay assistive, not official.                                                                        |
| `ISSUE-P2-AGENT-001`  | GitHub repo description still says “swarm of specialized agents”. Align with ADR 0002 / 0020 (phase roles, not a process swarm). |
| Dead Help version     | Already removed; About uses `formatReleaseLabel()`. Do not resurrect `HELP_VERSION`.                                             |

### 4.1 Dependabot wave 2 — required disposition (rule `012`)

Open as of 2026-08-31 (re-list from GitHub; counts drift):

| PR   | Package                                           | Disposition                                                                                                                                                             |
| ---- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #274 | `typescript` 5.8.3 → **6.0.3**                    | **Do not merge in the hygiene PR.** TS 6 is a major language bump. Track as a dedicated ADR + separate PR after `pnpm run typecheck` and full CI on a dedicated branch. |
| #275 | `dexie` 4.4.4 → 4.4.5                             | Include if same-major and upgrade tests (#267) still pass. Dexie touches schema-critical code — extra caution, run `databaseService.upgrade.test.ts`.                   |
| #276 | `typescript-eslint` 8.65 → 8.68                   | Include if lint stays zero-warning.                                                                                                                                     |
| #277 | `sharp` 0.35.3 → 0.35.4                           | DevDependency (icons). Include if `pnpm run icons` still works.                                                                                                         |
| #278 | `@axe-core/playwright` 4.12.1 → 4.13.0            | Include; watch a11y workflow.                                                                                                                                           |
| #279 | `anthropics/claude-code-action` 1.0.206 → 1.0.210 | Pin Actions by SHA as in #263.                                                                                                                                          |
| #280 | `jsdom` + types                                   | Include if unit tests stay green.                                                                                                                                       |
| #281 | `@vitejs/plugin-react` 6.0.3 → 6.1.1              | Include if build + CSP hash patch still work.                                                                                                                           |
| #282 | `@eslint/js` 9.39.4 → 9.39.5                      | Include.                                                                                                                                                                |
| #283 | `rollup-plugin-visualizer` 7.0.1 → 7.1.1          | Dev-only. Include.                                                                                                                                                      |
| #284 | `lucide-react` 1.24.0 → 1.35.0                    | **Skip bump. Remove unused package** if still unused. Record in `docs/dependabot-disposition.md`.                                                                       |

Close the individual Dependabot PRs from the consolidation PR body (same pattern as #263). Do not merge them one-by-one.

---

## 5. Mandatory operating rules

Copy these as non-negotiable. Violating any of them is an automatic “not done”.

### 5.1 Evidence first

- Name exact file + symbol + line range.
- State current behavior vs expected behavior.
- Add a failing test or a deterministic repro **before** the fix when the defect is behavioral.
- Distinguish **confirmed** vs **hypothesis**.
- A change is not “fixed” until the new test plus the relevant local gates pass on the same commit.

### 5.2 Governance

- Never push to `main`. Feature branches + focused PRs only.
- One concern per PR. Do not mix TS 6, OpenRouter, and CSV watermarks.
- Never merge with unresolved review-bot threads (CodeRabbit, CodeAnt, Copilot, DeepSource, Sourcery, Amazon Q). Rule `011` + `013`.
- After opening a PR and after every fix-up push: comment `@deepsourcebot review`.
- For CodeRabbit: never merge on a “rate limited” placeholder. Wait the cooldown, then `@coderabbitai review`. Max 3 cycles; escalate after >90 minutes of waits.
- Do not trust review approvals older than the current HEAD.
- English for all new docs, comments, JSDoc, commit messages, CI text, ADRs.
- UI strings: EN + DE keys, rendered only through `t()`.
- File size: target 200–400 lines, hard max 700 (rule `200`). If you must exceed it, split in the same PR that grew the file.
- New persisted fields require a Dexie schema bump + migration + CHANGELOG note.

### 5.3 Scientific integrity

- A PMID in a sentence is not automatic evidence.
- Do not reintroduce paragraph-level “everything in this block is grounded” claims.
- `aiSummary` is not the source abstract.
- arXiv is not a PMID.
- Missing abstracts must be explicit in ranking / synthesis inputs.
- Do not rank on title/metadata alone when an abstract exists and was fetched.
- Do not write absolute marketing claims that the runtime does not enforce.
- Preserve `generationProvenance` (app version, commit SHA, Dexie schema, SW cache, inference mode, provider, model).
- Demo corpus stays quarantined (`demo-` prefix, watermark, ADR 0016).
- Partial reports stay `partial` across save / export / reopen / History (ADR 0021).

### 5.4 Security

- Never commit keys. Never put secrets in `VITE_*`.
- Treat Cache Storage, IndexedDB, localStorage, Redux, URL params, logs, error messages, exported files, and service-worker cache keys as inspectable.
- AES-GCM at rest ≠ XSS-safe.
- Do not log raw keys, NCBI keys, or full prompt bodies in production.
- CSV must remain formula-injection-safe (`src/lib/exportSafety.ts`).
- Custom provider base URLs must stay origin-approved and CSP-coherent (ADR 0013). No `connect-src *`.
- Do not cache credentialed NCBI URLs in the service worker.
- Untrusted retrieved text is framed with `wrapUntrustedTextBlock` before it enters a prompt.
- Never retry `AbortError` / `APIUserAbortError` / caller cancel.

### 5.5 Architecture limits

- Redux is the source of truth. Contexts hydrate/compose. Do not duplicate the same flag in both.
- Provider SDKs stay lazy-loaded via `getProviderForSettings()`.
- Heuristic mode must never throw `NO_API_KEY` into an empty UI.
- Charts stay on Recharts only (ADR 0005).
- No CDN import map / no `aistudiocdn.com` (ADR 0011). `pnpm run check:no-cdn-scripts` must stay green.
- Honor `prefers-reduced-motion` for any new looping animation via `useMotionSafeLoop` (and omit SMIL when reduced).

---

## 6. Phase 0 — re-establish the live baseline (mandatory first hour)

Do this before product code.

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git rev-parse HEAD
git log --oneline --decorate -30
git tag --list 'v0.4*'
gh release list
gh pr list --state open --limit 40
gh pr list --state merged --limit 30
```

Read, in order:

1. `AGENTS.md`
2. `.github/copilot-instructions.md`
3. `.cursor/index.mdc` and `.cursor/rules/000-cursor-rules.mdc`
4. `docs/adr/README.md` + ADR 0018 + 0021
5. `CHANGELOG.md` `[Unreleased]` and `[0.4.2]`
6. `docs/audits/2026-08-29-baseline.md` (as historical, not as a work order)
7. `docs/audits/2026-08-03-issue-backlog.md` (same)
8. `docs/dependabot-disposition.md`
9. `docs/ci-branch-governance.md`
10. `docs/project-facts.json`
11. `package.json` version + scripts

Inspect current CI on HEAD (`deploy.yml`, `e2e.yml`, `e2e-cross-browser.yml`, `a11y.yml`, `pwa-e2e.yml`, `security.yml`). Record run IDs, conclusions, and whether failures are blocking.

Local gates (Node ≥22, pnpm 11):

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

Write **`docs/audits/2026-09-01-baseline.md`** containing:

- Exact HEAD SHA and compare-base (`8a76bda` if still current)
- Live vs repo version (`formatReleaseLabel()` / About)
- Open PR inventory with human vs Dependabot split
- CI conclusions
- Local gate table
- ID-by-ID supersession of the 2026-08-29 NOW list
- Confirmed remaining work only
- Contradictions (stale backlog vs main, marketing vs runtime, ADR 0010 still Proposed, unused lucide-react, file-cap breaches)

Also refresh `docs/audits/2026-08-03-issue-backlog.md` **in place** with a dated status block at the top: landed IDs, remaining IDs, pointer to the new baseline. Do not pretend the August 3 document is still the live queue.

Add a supersession banner to `docs/prompts/2026-08-02-cursor-agent-full-remediation-master-prompt.md`:

> Superseded for execution by `docs/prompts/2026-09-01-cursor-grok-audit-remediation-master-prompt.md`. Keep for history.

Commit the prompt file you are executing into `docs/prompts/` as part of the baseline PR if it is not already in the repo.

---

## 7. Workstreams after Phase 0

### Workstream A — Documentation truth (smallest PR, land first)

Scope:

- New 2026-09-01 baseline
- Backlog status refresh
- PR #273 content if still unmerged
- CHANGELOG `[Unreleased]` hygiene (CODEOWNERS / Dexie tests / eval / harness / heuristic / export / Ollama bounds already listed — do not duplicate)
- `docs/project-facts.json` if version / ADR floor / provider list drifted
- Repo description / README swarm wording if you touch README in this PR

Out of scope: runtime code.

### Workstream B — Dependabot consolidation (rule 012)

Scope: one PR, same-major safe bumps + Actions SHA pins + lucide-react removal-or-skip + disposition doc.

Out of scope: TypeScript 6.

Acceptance:

- `pnpm install --frozen-lockfile` after lockfile update
- All Phase 0 local gates green
- `docs/dependabot-disposition.md` updated with the 2026-08-31 wave
- Individual Dependabot PRs referenced and closable

### Workstream C — Partial-report residual risk

1. Add Playwright coverage for cancel-mid-stream → banner + `reportStatus === 'partial'` + chat disabled + export watermark. Extend `src/test/e2e/fixtures/networkMocks.ts` with a controllable delay / hanging stream so the test can click Cancel during synthesis.
2. Either watermark CSV/insights for partial reports **or** document accepted residual risk in SECURITY.md + Help + CHANGELOG.
3. Confirm History list / quick-view already show the partial badge (landed with #262). Add E2E only if missing.

### Workstream D — Live product-truth / onboarding copy

- Soften “Future of Research” / “AI agents conduct” to match README: client-only PWA, conceptual pipeline roles, live mode sends data to the chosen provider.
- Keep the existing privacy footer (it is already honest).
- EN+DE, no forbidden phrases, `check:docs-drift` green.
- Do not redesign the glassmorphism onboarding unless contrast fails `check:contrast`.

### Workstream E — Façade and file-cap (only after A–C)

Split `geminiService.ts` along already-typed seams:

- query formulation
- retrieval
- ranking
- synthesis stream
- error / checkpoint mapping

Public `generateResearchReportStream` contract and `phaseId` events (ADR 0020) must stay stable. Add characterization tests before moving code.

Then split the next-worst file-cap offenders using existing Authors / Journals / Knowledge Base patterns.

### Workstream F — ADR 0010 decision (dedicated)

Either:

- **Accept** and implement first-class OpenRouter (adapter, free-model primacy, Settings UX, cost card $0 for free models, tests, CSP unchanged), **or**
- **Reject / supersede** with a short ADR explaining that OpenAI + custom base URL remains the supported path.

Do not silently keep “Proposed” for another month.

### Workstream G — TypeScript 6 (optional, isolated)

Only if the maintainer wants it. Separate branch, ADR if compiler options change, no mixed scope.

---

## 8. Required PR sequence

| PR  | Branch sketch                                   | Scope                                                   |
| --- | ----------------------------------------------- | ------------------------------------------------------- |
| A   | `docs/2026-09-01-audit-baseline`                | Workstream A                                            |
| B   | `chore/dependabot-2026-08-31`                   | Workstream B                                            |
| C   | `test/partial-report-e2e`                       | Workstream C                                            |
| D   | `fix/onboarding-product-truth`                  | Workstream D                                            |
| E   | `refactor/gemini-service-facade`                | Workstream E (may split into E1 façade / E2 i18n files) |
| F   | `feat/openrouter` **or** `docs/adr-0010-reject` | Workstream F                                            |
| G   | `chore/typescript-6`                            | Only if requested                                       |

Each PR body must include: problem, evidence, root cause, before/after, explicit non-goals, tests, rollback, CHANGELOG note, ADR note if architecture changed.

---

## 9. Validation matrix (Definition of Done per PR)

A PR is merge-ready only when:

1. `pnpm run typecheck` pass
2. `pnpm run lint` zero warnings
3. `pnpm run format:check` pass
4. `pnpm run test:coverage` pass
5. `pnpm run check:coverage-floors` pass (do not lower floors; ratchet up if you added critical-path tests)
6. `pnpm run check:agent-eval` pass
7. `pnpm run check:docs-drift` pass
8. `pnpm run i18n:ratchet` pass
9. `pnpm run check:csp-endpoint-drift` pass
10. `pnpm run check:log-redaction` pass
11. `pnpm run check:audit-ignore-paths` pass
12. `pnpm audit --audit-level=high` pass
13. `pnpm run build` + `bundle:budget` + `check:no-cdn-scripts` + `check:workbox-vendor-drift` + `check:contrast` pass
14. Required GitHub checks green on the latest HEAD: Deploy, E2E Chromium, E2E cross-browser, PWA E2E, A11y, Security
15. Review bots quiescent on that same HEAD
16. No new `any`, no new `continue-on-error`, no deleted tests, no silent demo fallback, no `reportStatus: 'done'` on abort paths

Do **not** run `pnpm run test:e2e` on the Cloud Agent machine unless asked; push and read CI logs.

---

## 10. Definition of Done for the whole engagement

The engagement is complete when:

1. `docs/audits/2026-09-01-baseline.md` exists and matches live `main`.
2. August backlog documents no longer list landed P0s as Open.
3. Dependabot wave 2 is either consolidated or explicitly deferred with disposition (TS 6 isolated).
4. Partial-report honesty is E2E-covered **or** the gap is documented as accepted with a dated ticket ID in the new baseline.
5. Onboarding / Help / README do not contradict ADR 0018 / 0021 / SECURITY.md.
6. No high production advisory is ignored except the already-guarded LHCI `extract-zip` path.
7. File-cap and façade work is either landed or scheduled in the baseline as P2 with owners/IDs — not silently forgotten.
8. ADR 0010 is Accepted or Rejected, not Proposed-indefinite, **or** the baseline records a dated deferral with a trigger (“revisit when free-model UX becomes a product goal”).
9. CHANGELOG `[Unreleased]` only contains work that is on the branch being described.
10. Final agent report uses the template in §11.

---

## 11. Final agent report template

```markdown
# Engagement report — AI Research Orchestrator

## Baseline

- Date:
- Upstream main SHA:
- Working branch:
- package.json version:
- Live demo SHA (if readable from About / formatReleaseLabel):

## Findings

| ID | Severity | Domain | Evidence (file:symbol) | Root cause | Status | Next |

## Changes

- Files:
- Behavioral deltas:
- Tests added:
- Docs / ADR / CHANGELOG:

## Verification

- Local gates (command → result):
- CI run IDs and conclusions:
- Review-bot status:

## Remaining risks

- Accepted residual:
- Deferred P2/P3:

## PR readiness

NOT READY | READY FOR REVIEW | READY TO MERGE
```

---

## 12. Anti-patterns that already burned this repo

Do not repeat them.

1. **Stale-approval merge.** #233 / #234 sat 22 days; the 2026-08-29 baseline called this out. Approvals die when HEAD moves.
2. **Counting Dependabot wrong.** The August prompt said 18 PRs; 15 were Dependabot and 3 were human. Count from `gh pr list`, not from memory.
3. **Re-fixing landed P0s.** `NOW-P0-PARTIAL` is the textbook case. Read `src/lib/researchStreamFailure.ts` and `src/app/useResearchSession.ts` before touching them.
4. **Silent demo fallback.** Forbidden by ADR 0016.
5. **Calling heuristic 0–100 a calibrated probability.** It is a **relative display scale**. Live provider scores must not inherit “relative rank” ARIA.
6. **Retrying caller abort.** `isAbortLikeError` must treat DOM `AbortError` and Stainless `APIUserAbortError` as terminal.
7. **Uncapped `data:` URI exports.** Already replaced; do not bring them back.
8. **Global GHSA ignores.** Only LHCI `extract-zip`, and only while `check:audit-ignore-paths` agrees.
9. **Mixing a named release with drive-by refactors.** Release policy: version bump only for a named user-facing cut.
10. **German comments or commit messages.** Rule `010`.

---

## 13. Live app observations to verify, not assume

Observed 2026-09-01 on https://qnbs.github.io/AI-Research-Orchestrator/ :

- Onboarding card renders: “Welcome to the Future of Research”, three feature tiles, primary CTA “Start Researching”.
- Footer already discloses: research data stays in the browser; live mode sends prompts and article metadata to the chosen AI provider and queries PubMed/arXiv.
- First-run experience is gated on that welcome surface (likely `OnboardingView` / `Welcome`).
- Visual system: dark cybernetic glassmorphism, cyan accent, works at desktop width.

Verify in Settings after dismissing onboarding:

- Provider list matches `docs/project-facts.json` (`gemini` default `gemini-2.5-flash`, `openai` `gpt-5`, `anthropic` `claude-sonnet-4-5`, `ollama` `llama3.1:8b`, `heuristic` `local`).
- Force-heuristic toggle and InferenceMode badge exist.
- Ollama health panel exists (ADR 0019).
- Help → About shows `v0.4.2` plus short SHA via `formatReleaseLabel()`.

If About on Pages still shows 0.4.1, the Pages deploy lagged HEAD — record the deploy SHA vs `main` SHA as a finding (`NOW-P1-PAGES-LAG`).

---

## 14. Stack cheat-sheet (do not “upgrade the world”)

- React 19, TypeScript strict, Vite 8, Tailwind CSS v4, Framer Motion, Redux Toolkit + RTK Query, Dexie 4, Recharts, Playwright, Vitest, pnpm 11, Node ≥22
- i18n: namespaced EN/DE modules under `src/i18n/`
- PWA: `public/sw.js` + Workbox vendor copy gated by `check:workbox-vendor-drift`
- CSP hashes patched at build by `scripts/patch-csp-hashes.mjs`

---

## 15. Start now

1. Fetch and pin the true HEAD.
2. Write `docs/audits/2026-09-01-baseline.md` from evidence, not from August documents.
3. Open PR A (docs truth).
4. Only then touch runtime.
5. Prefer the smallest integrity-preserving change that makes the next agent’s Phase 0 boring.

If evidence contradicts this prompt, **evidence wins**. Update the 2026-09-01 baseline and continue. Do not invent work to match a paragraph written before `8a76bda`.
