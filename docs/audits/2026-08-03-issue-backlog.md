# Issue Backlog — 2026-08-03 (Master Remediation)

**Baseline SHA:** `84fbcdf1f29b93416d2574d78ef988c83399fdad`  
**Tracker:** GitHub Issues (proposed — repository had zero open issues at baseline)

Severity: P0 = stop-the-line · P1 = pre-release hardening · P2 = architecture/docs · P3 = defer with rationale

---

## P0

### ISSUE-P0-CLAIM-001 — Conservative claim evidence matcher

| Field      | Value                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity   | P0                                                                                                                                                    |
| Impact     | False corpus-supported trust from 2-token lexical overlap; irrelevant citations retained on supported claims                                          |
| Evidence   | `src/lib/claimValidation.ts` (pre-fix), master prompt §3.2.A                                                                                          |
| Files      | `src/lib/claimValidation.ts`, `src/lib/claimEvidenceMatcher.ts`, UI/export grounded synthesis                                                         |
| Acceptance | Contradiction/negation fixtures fail support; invalid citations preserved in metrics; evidence spans exact; only supporting PMIDs on supported claims |
| Tests      | `claimEvidenceMatcher.test.ts`, `claimValidation.test.ts`, `check:agent-eval`                                                                         |
| Owner      | scientific-trust                                                                                                                                      |
| Target     | v0.4.2                                                                                                                                                |
| Status     | **In progress** — branch `cursor/audit-p0-scientific-trust-8ad7`                                                                                      |

---

## P1

### ISSUE-P1-OLLAMA-001 — Runtime context budget from model metadata

| Field        | Value                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| Severity     | P1                                                                                     |
| Impact       | Prompt truncation or over-budget requests when parameter count ≠ context window        |
| Evidence     | `src/lib/ollamaContextBudget.ts`                                                       |
| Acceptance   | `/api/show` or equivalent metadata drives budget; parameter count is quality hint only |
| Tests        | `ollamaContextBudget.test.ts`, settings diagnostics                                    |
| Dependencies | ISSUE-P1-OLLAMA-002                                                                    |
| Owner        | local-ai                                                                               |

### ISSUE-P1-OLLAMA-002 — Split connectivity vs model-discovery cache

| Field      | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| Severity   | P1                                                                   |
| Impact     | Degraded `/api/tags` failure cached as success blocks rapid recovery |
| Evidence   | `src/services/providers/ollamaHealth.ts` L270–277, 30s TTL           |
| Acceptance | Separate TTL/state; force refresh; freshness timestamps in UI        |
| Tests      | `ollamaHealth.test.ts`                                               |

### ISSUE-P1-OLLAMA-003 — Generate stream requires protocol `done`

| Field      | Value                                                    |
| ---------- | -------------------------------------------------------- |
| Severity   | P1                                                       |
| Impact     | Incomplete streams treated as complete                   |
| Evidence   | `src/services/providers/ollama.ts` L157 vs chat L203–212 |
| Acceptance | Symmetric protocol completion for generate and chat      |
| Tests      | `ollama.test.ts` with truncated NDJSON fixtures          |

### ISSUE-P1-HEURISTIC-001 — Truthful capability flags and typed operations

| Field      | Value                                                                                 |
| ---------- | ------------------------------------------------------------------------------------- |
| Severity   | P1                                                                                    |
| Impact     | Advertised capabilities exceed heuristic behavior                                     |
| Evidence   | `src/services/providers/heuristic.ts` prompt substring guessing                       |
| Acceptance | `providerCapabilities` matches tests; typed `HeuristicOperation` for production paths |
| Owner      | heuristic-engine                                                                      |

### ISSUE-P1-HEURISTIC-002 — BM25 IDF and score semantics

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Severity   | P1                                                                    |
| Impact     | Ranking may not match BM25 reference; 0–100 scores overclaimed        |
| Evidence   | `src/services/nonAi/utils.ts` IDF; `ranker.ts` weighted normalization |
| Acceptance | Golden fixtures; label scores as relative or calibrated bands         |

### ISSUE-P1-PROVIDER-001 — Shared provider conformance harness

| Field      | Value                                                                     |
| ---------- | ------------------------------------------------------------------------- |
| Severity   | P1                                                                        |
| Impact     | Provider drift undetected across Gemini/OpenAI/Anthropic/Ollama/heuristic |
| Acceptance | Single contract suite with fake HTTP server                               |
| Owner      | providers                                                                 |

### ISSUE-P1-EVAL-001 — Adversarial scientific eval expansion

| Field      | Value                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| Severity   | P1                                                                          |
| Impact     | Eval passes mirror implementation weaknesses                                |
| Evidence   | Master prompt §11; partial coverage in `agentEval.test.ts`                  |
| Acceptance | Negation, numbers, units, German claims, injection, malformed JSON blocking |

### ISSUE-P1-PERSIST-001 — Dexie upgrade transaction tests

| Field      | Value                                                       |
| ---------- | ----------------------------------------------------------- |
| Severity   | P1                                                          |
| Impact     | Migration data loss undetected                              |
| Evidence   | Master prompt §13; transform-only tests today               |
| Acceptance | `fake-indexeddb` open old schema → upgrade → assert records |

### ISSUE-P1-SECURITY-001 — XSS/export hardening regression suite

| Field      | Value                                                             |
| ---------- | ----------------------------------------------------------------- |
| Severity   | P1                                                                |
| Impact     | Markdown/CSV/PDF attack surface                                   |
| Acceptance | Blocking fixtures for script, formula injection, oversized export |

### ISSUE-P1-CI-001 — Live branch ruleset vs documentation

| Field      | Value                                                    |
| ---------- | -------------------------------------------------------- |
| Severity   | P1                                                       |
| Impact     | Governance doc may not match GitHub settings             |
| Acceptance | Verified ruleset snapshot; CODEOWNERS for critical paths |
| Note       | Do not mutate settings without maintainer authorization  |

### ISSUE-P1-TRANSPORT-001 — Ollama bounded response bodies

| Field      | Value                                                           |
| ---------- | --------------------------------------------------------------- |
| Severity   | P1                                                              |
| Impact     | Oversized or idle streams can exhaust browser memory            |
| Evidence   | Master prompt §7.4; `ollama.ts` lacks max body / idle bounds    |
| Acceptance | Connect/total/idle timeouts; max error and non-stream body caps |
| Owner      | local-ai                                                        |

### ISSUE-P1-CLAIM-002 — Mixed supporting/contradicting claim policy

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Severity   | P1                                                                    |
| Impact     | Claims with both supporting and contradicting citations need policy   |
| Acceptance | Explicit state (unverified); snippets only from retained result PMIDs |
| Owner      | scientific-trust                                                      |

---

## P2

### ISSUE-P2-ORCH-001 — Typed execution context and phase extraction

| Field | Value |
| Severity | P2 |
| Files | `geminiService.ts`, `researchOrchestratorAdapter.ts` |
| Acceptance | Single mode resolution; smaller facade; phase unit tests |

### ISSUE-P2-DOCS-001 — Product-truth matrix automation

| Field | Value |
| Severity | P2 |
| Acceptance | `docs/product-truth-matrix.md` linked to code/tests; drift check in CI |

### ISSUE-P2-AGENT-001 — Pipeline naming consolidation

| Field | Value |
| Severity | P2 |
| Acceptance | No “swarm” language unless experimental graph ships behind flag |

---

## P3

### ISSUE-P3-README-001 — Clarify estimated H-index README line

| Field | Value |
| Severity | P3 |
| Evidence | `README.md` L72 — ensure wording matches Author Hub null metrics |
| Acceptance | EN/DE parity; no fabricated bibliometrics implication |

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
