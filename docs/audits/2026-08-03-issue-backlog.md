# Issue Backlog — 2026-08-03 (Master Remediation)

> **Status refresh:** 2026-09-01. Live `main` is `8a76bda` (`v0.4.2`). **Authoritative Phase 0 evidence is `docs/audits/2026-09-01-baseline.md`.** This file keeps original IDs; do not treat August “Open” rows as a live work order. GitHub Issues remain at zero — markdown IDs are the tracker.

**Landed since the 2026-08-29 refresh (do not re-open):** `NOW-P0-PARTIAL` / ADR 0021 (#260), `NOW-P1-MOTION` (#261), `NOW-P1-DOCS-WAVE` (#262), `NOW-P1-DEP-STALL` (#263), `NOW-P1-RELEASE` (#264), `NOW-P1-CODEOWNERS` (#265), Ollama bounds (#266), Dexie upgrade tests (#267), heuristic ops (#268), eval adversarial (#269), provider harness (#270), BM25+ (#271), CSV/export hardening (#272).

**Still real (see 2026-09-01 baseline):** P2 façade/file-cap/OpenRouter/chart-a11y. `NOW-P0-PARTIAL-E2E` and `NOW-P1-PARTIAL-EXPORT-GAPS` close in this PR. `NOW-P2-LUCIDE` landed in #286; `NOW-P1-LIVE-COPY` in #288; `NOW-P1-DEP-WAVE-2` in #286 / #289.

**New P0 this baseline:** `NOW-P0-AUDIT-BROWSERSLIST` — CVE-2026-73088 / CVE-2026-73089 on `browserslist@4.28.6`. Pin latest patched `4.28.8` (security floor 4.28.7). Same pattern as #259 nanoid. Not a GHSA ignore.

**Baseline SHA (original):** `84fbcdf1f29b93416d2574d78ef988c83399fdad`  
**Revalidated SHA (2026-08-29):** `b02af1bebb97f44eda6450ba980d5ceed5a1abb0`  
**Revalidated SHA (2026-09-01):** `8a76bda7bbe221d21cb9d5924d8d81cee162fa48`  
**Tracker:** Markdown IDs (GitHub Issues still empty as of 2026-09-01)

Severity: P0 = stop-the-line · P1 = pre-release hardening · P2 = architecture/docs · P3 = defer with rationale

---

## P0

### ISSUE-P0-CLAIM-001 — Conservative claim evidence matcher

| Field      | Value                                                                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P0                                                                                                                                                                                                   |
| Impact     | False corpus-supported trust from 2-token lexical overlap; irrelevant citations retained on supported claims                                                                                         |
| Evidence   | `src/lib/claimValidation.ts` (pre-fix), master prompt §3.2.A                                                                                                                                         |
| Files      | `src/lib/claimValidation.ts`, `src/lib/claimEvidenceMatcher.ts`, UI/export grounded synthesis                                                                                                        |
| Acceptance | Contradiction/negation fixtures fail support; invalid citations preserved in metrics; evidence spans exact; only supporting PMIDs on supported claims                                                |
| Tests      | `claimEvidenceMatcher.test.ts`, `claimValidation.test.ts`, `check:agent-eval`                                                                                                                        |
| Owner      | scientific-trust                                                                                                                                                                                     |
| Target     | v0.4.2                                                                                                                                                                                               |
| Status     | **Resolved** (PR #213 + PR #215) — `CLAIM_EVIDENCE_MATCHER_VERSION` `2.3.0` on `main`. Negation checks all overlapping occurrences; mixed support/contradict is `unverified` (`ISSUE-P1-CLAIM-002`). |

---

## P1

### ISSUE-P1-OLLAMA-001 — Runtime context budget from model metadata

| Field        | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity     | P1                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Impact       | Prompt truncation or over-budget requests when parameter count ≠ context window                                                                                                                                                                                                                                                                                                                                                                                  |
| Evidence     | `src/lib/ollamaContextBudget.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Acceptance   | `/api/show` or equivalent metadata drives budget; parameter count is quality hint only                                                                                                                                                                                                                                                                                                                                                                           |
| Tests        | `ollamaContextBudget.test.ts`, settings diagnostics                                                                                                                                                                                                                                                                                                                                                                                                              |
| Dependencies | ISSUE-P1-OLLAMA-002                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Owner        | local-ai                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Status       | **Resolved** (PR #214 + PR #224) — #214 added `probeOllamaModelMetadata`/`/api/show` support but only wired it into the Settings diagnostics panel; the live research pipeline still fell back to the parameter-count heuristic whenever Settings had never been opened. PR #224 (2026-08-06) added the missing probe call in `generateLiveResearchReportStream`, closing the gap; acceptance criterion now holds on the ordinary usage path, not just Settings. |

### ISSUE-P1-OLLAMA-002 — Split connectivity vs model-discovery cache

| Field      | Value                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P1                                                                                                                                                                    |
| Impact     | Degraded `/api/tags` failure cached as success blocks rapid recovery                                                                                                  |
| Evidence   | `src/services/providers/ollamaHealth.ts` L270–277, 30s TTL                                                                                                            |
| Acceptance | Separate TTL/state; force refresh; freshness timestamps in UI                                                                                                         |
| Tests      | `ollamaHealth.test.ts`                                                                                                                                                |
| Status     | **Resolved** (PR #214) — separate connectivity TTL (`OLLAMA_CONNECTIVITY_CACHE_TTL_MS` 30s) vs discovery success/failure TTLs (`OLLAMA_DISCOVERY_FAILURE_TTL_MS` 5s). |

### ISSUE-P1-OLLAMA-003 — Generate stream requires protocol `done`

| Field      | Value                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P1                                                                                                                                                             |
| Impact     | Incomplete streams treated as complete                                                                                                                         |
| Evidence   | `src/services/providers/ollama.ts` L157 vs chat L203–212                                                                                                       |
| Acceptance | Symmetric protocol completion for generate and chat                                                                                                            |
| Tests      | `ollama.test.ts` with truncated NDJSON fixtures                                                                                                                |
| Status     | **Resolved** (PR #214) — generate stream requires protocol `done: true` (`src/services/providers/ollama.ts`); incomplete streams throw `PROVIDER_UNAVAILABLE`. |

### ISSUE-P1-HEURISTIC-001 — Truthful capability flags and typed operations

| Field      | Value                                                                                                                                                                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P1                                                                                                                                                                                                                                                                          |
| Impact     | Advertised capabilities exceed heuristic behavior                                                                                                                                                                                                                           |
| Evidence   | `src/services/providers/heuristic.ts` prompt substring guessing                                                                                                                                                                                                             |
| Acceptance | `providerCapabilities` matches tests; typed `HeuristicOperation` for production paths                                                                                                                                                                                       |
| Owner      | heuristic-engine                                                                                                                                                                                                                                                            |
| Status     | **Resolved** (2026-08-30) — `HeuristicOperation` on `AIContentRequest`; adapter dispatch is typed (no prompt-substring guessing). `heuristicProviderCapabilities()` is shared by the adapter and `AI_PROVIDERS.heuristic` (`jsonMode`/`webGrounding` false; abort honored). |

### ISSUE-P1-HEURISTIC-002 — BM25 IDF and score semantics

| Field      | Value                                                                                                                                                                                                                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P1                                                                                                                                                                                                                                                                                                                            |
| Impact     | Ranking may not match BM25 reference; 0–100 scores overclaimed                                                                                                                                                                                                                                                                |
| Evidence   | `src/services/nonAi/utils.ts` IDF; `ranker.ts` weighted normalization                                                                                                                                                                                                                                                         |
| Acceptance | Golden fixtures; label scores as relative or calibrated bands                                                                                                                                                                                                                                                                 |
| Status     | **Resolved** (2026-08-30) — Lucene BM25+ IDF (`ln(1+(N−df+0.5)/(df+0.5))`, always ≥ 0) shared by `inverseDocumentFrequency` and the ranker; golden IDF/Okapi fixtures; `relevanceScore` is min-max relative rank within the result set; chat/Help/KB bands stop treating 0–100 as a calibrated probability or a 0–1 fraction. |

### ISSUE-P1-PROVIDER-001 — Shared provider conformance harness

| Field      | Value                                                                                                                                                                                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P1                                                                                                                                                                                                                                                                                           |
| Impact     | Provider drift undetected across Gemini/OpenAI/Anthropic/Ollama/heuristic                                                                                                                                                                                                                    |
| Acceptance | Single contract suite with fake HTTP server                                                                                                                                                                                                                                                  |
| Owner      | providers                                                                                                                                                                                                                                                                                    |
| Status     | **Resolved** (2026-08-30) — `providerConformance.test.ts` drives Ollama/OpenAI/Anthropic `generateContent` against `conformance/fakeProviderHttpServer.ts` (200, 429, 5xx, malformed, caller abort). Heuristic is a no-network control. SDK `APIUserAbortError` maps as non-retryable abort. |

### ISSUE-P1-EVAL-001 — Adversarial scientific eval expansion

| Field      | Value                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P1                                                                                                                                                                                                                                                                                                                                                                               |
| Impact     | Eval passes mirror implementation weaknesses                                                                                                                                                                                                                                                                                                                                     |
| Evidence   | Master prompt §11; partial coverage in `agentEval.test.ts`                                                                                                                                                                                                                                                                                                                       |
| Acceptance | Negation, numbers, units, German claims, injection, malformed JSON blocking                                                                                                                                                                                                                                                                                                      |
| Status     | **Resolved** (2026-08-30) — `agentEval.adversarial.test.ts` in `check:agent-eval`: German support/stopwords/`nicht`/`keine` negation, umlaut/compound/inflection, mixed support+contradict, same-unit numeric and dose drift plus grouped-thousands/tolerance, prompt-injection titles plus `wrapUntrustedTextBlock` delimiter framing, malformed JSON parser + schema blocking. |

### ISSUE-P1-PERSIST-001 — Dexie upgrade transaction tests

| Field      | Value                                                                                                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Severity   | P1                                                                                                                                                                                                                                                                             |
| Impact     | Migration data loss undetected                                                                                                                                                                                                                                                 |
| Evidence   | Master prompt §13; transform-only tests today                                                                                                                                                                                                                                  |
| Acceptance | `fake-indexeddb` open old schema → upgrade → assert records                                                                                                                                                                                                                    |
| Status     | **Resolved** (2026-08-30) — `databaseService.upgrade.test.ts` opens v2/v4/v6 with `fake-indexeddb`, then the production v7 singleton upgrades; records are asserted (hydration, demo stamp, trust rename, checkpoints, poison skip). Coverage floors ratcheted to 90/92/88/95. |

### ISSUE-P1-SECURITY-001 — XSS/export hardening regression suite

| Field      | Value                                                                                                                                                                                                                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P1                                                                                                                                                                                                                                                                                                                               |
| Impact     | Markdown/CSV/PDF attack surface                                                                                                                                                                                                                                                                                                  |
| Acceptance | Blocking fixtures for script, formula injection, oversized export                                                                                                                                                                                                                                                                |
| Status     | **Resolved** (2026-08-30) — #223 closed the `innerHTML` entity-decode XSS path (`RETURN_DOM_FRAGMENT`). Formula-injection now covers whitespace/BOM, Unicode lookalikes, pipe-DDE, and `<script>` cells; CSV/JSON/citation/PDF downloads abort above 8 MiB (`VALIDATION` / `errors.code.exportTooLarge`) with blocking fixtures. |

### ISSUE-P1-CI-001 — Live branch ruleset vs documentation

| Field      | Value                                                                                                                                                                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P1                                                                                                                                                                                                                                                              |
| Impact     | Governance doc may not match GitHub settings                                                                                                                                                                                                                    |
| Acceptance | Verified ruleset snapshot; CODEOWNERS for critical paths                                                                                                                                                                                                        |
| Note       | Do not mutate settings without maintainer authorization                                                                                                                                                                                                         |
| Status     | **Resolved** (2026-08-30, #265) — `.github/CODEOWNERS` routes critical paths to `@qnbs`. The `mainrules` ruleset still does **not** require Code Owner reviews (solo-maintainer; do not flip). Dismiss-stale-approvals-on-new-commits remains maintainer-gated. |

### ISSUE-P1-TRANSPORT-001 — Bounded Ollama response bodies

| Field      | Value                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P1                                                                                                                                                             |
| Impact     | Oversized or idle streams can exhaust browser memory                                                                                                           |
| Evidence   | Master prompt §7.4; `ollama.ts` lacks max body / idle bounds                                                                                                   |
| Acceptance | Connect/total/idle timeouts; max error and non-stream body caps                                                                                                |
| Owner      | local-ai                                                                                                                                                       |
| Status     | **Resolved** — generate/chat idle 30s, 8 MiB stream cap, 5-minute total, capped error/non-stream bodies; `combineAbortSignals` honors already-aborted callers. |

### ISSUE-P1-CLAIM-002 — Mixed supporting/contradicting claim policy

| Field      | Value                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P1                                                                                                                                                                    |
| Impact     | Claims with both supporting and contradicting citations need policy                                                                                                   |
| Acceptance | Explicit state (unverified); snippets only from retained result PMIDs                                                                                                 |
| Owner      | scientific-trust                                                                                                                                                      |
| Status     | **Resolved** on `main` — mixed supporting+contradicting citations set `validationState: 'unverified'` (`claimValidation.ts`). Keep eval ratchet; do not lower floors. |

---

## New items (2026-08-29) — historical, statuses as of 2026-09-01

These IDs came from the post-sprint prompt. Evidence: `docs/audits/2026-08-29-baseline.md` (historical) and `docs/audits/2026-09-01-baseline.md` (live).

| ID                   | Sev | Status                         | Evidence                                                                                                |
| -------------------- | --- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `NOW-P0-PARTIAL`     | P0  | **Resolved** (#260 / ADR 0021) | Cancel/restore stamps `reportStatus: 'partial'`, never `'done'`. Residual E2E: `NOW-P0-PARTIAL-E2E`.    |
| `NOW-P0-AUDIT`       | P0  | **Resolved** (#259)            | `nanoid@3.3.18` pin + LHCI-only `extract-zip` ignore + `check:audit-ignore-paths` on `main`.            |
| `NOW-P1-MOTION`      | P1  | **Resolved** (#261)            | `useMotionSafeLoop` + SMIL gating. `ParticleBackground.tsx` stays deleted.                              |
| `NOW-P1-DOCS-WAVE`   | P1  | **Resolved** (#262)            | ADR 0021 + CHANGELOG + agent docs on `main`.                                                            |
| `NOW-P1-DEP-STALL`   | P1  | **Resolved** (#263)            | Mid-August Dependabot wave consolidated. New wave: `NOW-P1-DEP-WAVE-2` (#274–#284).                     |
| `NOW-P1-RELEASE`     | P1  | **Resolved** (#264)            | GitHub Releases `v0.4.1` (historical) and `v0.4.2` (Latest). Package version `0.4.2`.                   |
| `NOW-P1-SW-NCBI-KEY` | P1  | **Resolved** on `main`         | `public/sw.js` `NetworkOnly` for credentialed NCBI + activate purge; `sw-integrity.test.ts`             |
| `NOW-P1-CODEOWNERS`  | P1  | **Resolved** (#265)            | `.github/CODEOWNERS` routing only; ruleset Code Owner reviews stay Off. Folded docs from unmerged #273. |
| `NOW-P2-FACADE`      | P2  | **Open**                       | `geminiService.ts` still 1216 lines / 46 KB (rule `200` hard max 700).                                  |

## New items (2026-09-01)

Live queue. Evidence: `docs/audits/2026-09-01-baseline.md`.

| ID                           | Sev | Status                     | Evidence                                                                                         |
| ---------------------------- | --- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| `NOW-P0-AUDIT-DRIFT`         | P0  | **This PR**                | August docs listed landed P0/P1s as Open. Closed by the 2026-09-01 baseline + this header.       |
| `NOW-P0-AUDIT-BROWSERSLIST`  | P0  | **This PR**                | Pin `browserslist@4.28.8` for CVE-2026-73088 / CVE-2026-73089 (floor 4.28.7). Not a GHSA ignore. |
| `NOW-P0-PARTIAL-E2E`         | P0  | **This PR**                | Playwright cancel-mid-stream: hanging Gemini synthesis SSE → banner, chat gated, CSV watermark.  |
| `NOW-P1-DEP-WAVE-2`          | P1  | **Resolved** (#286 / #289) | Dependabot #275–#283 included; #274 TS 6 landed as #289; #284 lucide removed unused.             |
| `NOW-P1-PARTIAL-EXPORT-GAPS` | P1  | **This PR**                | Report CSV + insights CSV prepend the narrative `PARTIAL REPORT` line when `'partial'`.          |
| `NOW-P1-LIVE-COPY`           | P1  | **Resolved** (#288)        | Onboarding/chrome/Help/input-form product-truth pass; GitHub repo description stays P2.          |
| `NOW-P2-OPENROUTER`          | P2  | **Open**                   | ADR 0010 still Proposed (2026-07-21). Accept, reject, or dated deferral.                         |
| `NOW-P2-LUCIDE`              | P2  | **Resolved** (#286)        | Unused `lucide-react` removed rather than bumped.                                                |

---

## P2

### ISSUE-P2-ORCH-001 — Typed execution context and phase extraction

| Field | Value |
| Severity | P2 |
| Files | `geminiService.ts`, `researchOrchestratorAdapter.ts` |
| Acceptance | Single mode resolution; smaller facade; phase unit tests |
| Status | **Open** (2026-09-01) — typed `phaseId` landed (#206 / ADR 0020); facade still 1216 lines. |

### ISSUE-P2-DOCS-001 — Product-truth matrix automation

| Field | Value |
| Severity | P2 |
| Acceptance | `docs/product-truth-matrix.md` linked to code/tests; drift check in CI |
| Status | **Partial** — `forbiddenReadmePhrases` + `forbiddenProductCopyPhrases` + `check:docs-drift` exist; no standalone product-truth matrix file. |

### ISSUE-P2-AGENT-001 — Pipeline naming consolidation

| Field | Value |
| Severity | P2 |
| Acceptance | No “swarm” language unless experimental graph ships behind flag |
| Status | **Partial** — product-truth pass (#211) forbids swarm claims; GitHub repo description may still say “swarm” (do not “fix” copy by overclaiming). |

---

## P3

### ISSUE-P3-README-001 — Clarify estimated H-index README line

| Field | Value |
| Severity | P3 |
| Evidence | `README.md` L72 — ensure wording matches Author Hub null metrics |
| Acceptance | EN/DE parity; no fabricated bibliometrics implication |
| Status | **Open** — confirm README estimated-H-index wording still matches Author Hub null metrics after #229 brand pass. |

---

## Dependency graph (high risk)

```text
ISSUE-P0-CLAIM-001
  → ISSUE-P1-EVAL-001
ISSUE-P1-OLLAMA-002
  → ISSUE-P1-OLLAMA-001
ISSUE-P1-PROVIDER-001
  → ISSUE-P1-OLLAMA-003, ISSUE-P1-HEURISTIC-001
```

## Rollback notes

- Claim matcher: revert `claimEvidenceMatcher.ts` and restore prior `claimValidation.ts`; re-run `check:agent-eval`.
- Ollama transport: revert provider adapter only; health cache isolated in `ollamaHealth.ts`.
