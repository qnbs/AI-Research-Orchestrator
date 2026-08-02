# Scientific integrity revalidation — baseline evidence

> **Status:** P0-A–F **closed** on `main` at `3a73707` — see [`2026-08-02-p0-closeout.md`](./2026-08-02-p0-closeout.md) for merged PR map, verification, and release recommendation. This file retains the pre-fix evidence at baseline `716696e`.

**Prepared:** 2026-08-02 (post-merge reconciliation)  
**Baseline SHA:** `716696eba424109dc4da412ecd6b7bd959df395a` (`main`)  
**Prior audit baseline referenced in master prompt:** `cd2e03c` — superseded by PR #175 merge  
**Executor:** Cursor Agent (fresh-state reconciliation per master remediation spec §1)

## Reconciliation summary

| Item                               | Status                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| PR #175 merged                     | Yes — `716696e` (2026-08-02T15:33:45Z)                                                                                  |
| Commits after `cd2e03c`            | Husky `pre-commit`/`pre-push`, `format:check` CI, export provenance tests, PWA manifest smoke, e2e backlog streak reset |
| `pnpm run check:fast` on `716696e` | PASS (typecheck, lint, format:check)                                                                                    |
| DeepSource JavaScript              | Off in dashboard; no `javascript` block in TOML                                                                         |

## Post-`cd2e03c` landed changes (PR #175)

- `.github/workflows/deploy.yml` — blocking `pnpm run format:check`
- `.husky/pre-commit` — `lint-staged && typecheck` (`set -eu`)
- `.husky/pre-push` — `check:fast` (`set -eu`)
- `src/services/exportService.test.ts` — JSON export `meta`, PDF cover provenance
- `src/test/e2e/smoke.spec.ts` — manifest validation (4th smoke test)
- `docs/e2e-ci-backlog.md` — 4-test promotion criteria; current streak reset to 0
- Prettier normalization on 8 files

These changes do **not** address P0-A–F scientific-integrity blockers below.

---

## P0 finding matrix

| ID   | Severity        | Status        | Evidence (baseline `716696e`)                                                                                                                                    | Planned PR |
| ---- | --------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| P0-A | Release blocker | **Confirmed** | `useAuthorsViewLogic.ts` L127–135 `Math.random()` citation timeline; L121–122 LLM `estimatedMetrics`; fuzzy surname authorship L141–156                          | PR 1       |
| P0-B | Release blocker | **Confirmed** | `KnowledgeBaseContext.tsx` `onMergeDuplicates` L274–336 removes articles from entries; can delete entries; no Dexie transaction; report coherence not recomputed | PR 2       |
| P0-C | Release blocker | **Confirmed** | `isKnowledgeBaseEntry` shallow validation; no `trustLevel` recompute; import trusts structure only (`useSettingsViewLogic.ts` L229)                              | PR 3       |
| P0-D | Release blocker | **Confirmed** | `useResearchSession.ts` L260 stamps `inferenceMode` from `aiSettings.provider`, not `resolveActiveInferenceMode` / actual stream path                            | PR 4       |
| P0-E | Release blocker | **Confirmed** | `claimValidation.ts` L54 includes `aiSummary` in evidence corpus; L33–39 English-centric tokenization; `verified` trust from 2-token overlap                     | PR 5       |
| P0-F | Release blocker | **Confirmed** | `journalService.ts` L31 `open access[filter]`; `geminiService.ts` L1012–1037 LLM `estimatedImpactFactor`; `isOpenAccess` boolean in article model                | PR 6       |

---

## Finding P0-A — Author Hub fabricated bibliometrics

- **Status:** confirmed
- **Baseline SHA:** `716696e`
- **Evidence:**
  - `src/components/authors/useAuthorsViewLogic.ts` lines 127–135: `Math.floor(Math.random() * (age * 5) + 5)` builds `citationsPerYear`
  - lines 121–122, 171–172: `generateAuthorProfileAnalysis` → `estimatedMetrics.hIndex` / `totalCitations` from LLM prompt (“estimate from titles/dates/journals” in `geminiService.ts` ~767+)
  - `AuthorProfileView.tsx` renders citation timeline and h-index
  - `authorClusterer.ts` heuristic path returns `null` metrics (good) but live path still estimates
- **Root cause:** No citation index integration; UI filled with synthetic/estimated values
- **User impact:** Users see citation charts and h-index as factual
- **Scientific impact:** Fabricated bibliometrics; violates master spec §2.2
- **Tests:** None blocking for random citations or out-of-corpus PMIDs in Author Hub E2E
- **Residual risk:** High until PR 1 lands
- **Rollback:** Revert Author Hub metrics UI to unavailable state

---

## Finding P0-B — KB merge duplicates destroys snapshots

- **Status:** confirmed
- **Baseline SHA:** `716696e`
- **Evidence:**
  - `KnowledgeBaseContext.tsx` `onMergeDuplicates` (L274–336): global PMID dedup removes articles from individual entries; deletes entries when all articles removed; picks winner by `relevanceScore`; updates `report.rankedArticles` / `profile.publications` without claim/synthesis revalidation
  - `onPruneByScore` (L368+): prunes across `uniqueArticles` including author/journal articles with score 0
  - No `db.transaction` wrapping multi-entry updates
- **Root cause:** Single global article map treats library index and historical snapshots as one mutable pool
- **User impact:** Saved reports can lose articles, claims become invalid silently
- **Data integrity impact:** Historical snapshot corruption
- **Tests:** No `knowledge-base-integrity.spec.ts`; no transaction rollback tests
- **Residual risk:** Critical until PR 2
- **Rollback:** Disable merge-duplicates UI until safe index exists

---

## Finding P0-C — Import trust boundary weak

- **Status:** confirmed
- **Baseline SHA:** `716696e`
- **Evidence:**
  - `isKnowledgeBaseEntry` checks top-level shapes; `isValidGroundedSynthesis` does not inspect or reset `trustLevel`
  - Import path: `useSettingsViewLogic.ts` L229 `dataToImport.every(isKnowledgeBaseEntry)` then `importKbEntries` → Dexie with no revalidation
  - Forged `groundedSynthesis.trustLevel: 'verified'` can pass if claims array shape valid
- **Root cause:** Permissive runtime guards; no import envelope versioning; no quarantine report
- **User impact:** Imported JSON can show verified banner without corpus re-check
- **Trust impact:** Trust boundary violation
- **Tests:** `knowledgeBaseValidation.test.ts` — shape cases only, no adversarial verified forgery
- **Residual risk:** High until PR 3
- **Rollback:** Disable KB import or force downgrade on all imports (hotfix)

---

## Finding P0-D — Provenance misstates live vs heuristic

- **Status:** confirmed
- **Baseline SHA:** `716696e`
- **Evidence:**
  - `useResearchSession.ts` L257–263: `stampReportWithProvenance({ inferenceMode: aiSettings.provider === 'heuristic' ? 'heuristic' : 'live', ... })`
  - `researchOrchestratorAdapter.ts` uses `resolveActiveInferenceMode` / `shouldUseHeuristic` at runtime — can run heuristic while provider is `gemini`
  - No `fallbackOccurred` / `resolvedProviderId` on provenance type today
- **Root cause:** Provenance stamped from settings, not execution result
- **User impact:** Reports labeled “live” when heuristic pipeline ran
- **Provenance impact:** Audit trail unreliable
- **Tests:** No `fallback-provenance.spec.ts`
- **Residual risk:** High until PR 4
- **Rollback:** Stamp `heuristic` when `shouldUseHeuristic` true at completion time (minimal hotfix)

---

## Finding P0-E — Circular AI evidence in claim validation

- **Status:** confirmed (partial mitigation from P0-6 exists but insufficient)
- **Baseline SHA:** `716696e`
- **Evidence:**
  - `claimValidation.ts` L54: `corpusText` includes `article.aiSummary`
  - L33–39: ASCII-only tokenization; `MIN_EVIDENCE_TOKENS = 2`
  - `groundedSynthesis.ts` / P0-6 UI banner for narrative — but `verified` still assigned when overlap threshold met
- **Root cause:** Evidence corpus includes model-generated fields; weak lexical gate named “verified”
- **Scientific impact:** Circular verification; non-English claims under-tested
- **Tests:** `claimValidation.test.ts` — does not assert aiSummary exclusion
- **Residual risk:** High until PR 5
- **Rollback:** Remove aiSummary from corpus (hotfix); downgrade trust labels in UI

---

## Finding P0-F — Journal metadata / OA semantics

- **Status:** confirmed
- **Baseline SHA:** `716696e`
- **Evidence:**
  - `journalService.ts` L30–31: `open access[filter]` when `onlyOa` — not equivalent to PMC OA subset / license
  - `geminiService.ts` L1012–1037: LLM returns `estimatedImpactFactor`; stored as `metrics.impactFactor` with `source: 'ai-estimated'`
  - Article `isOpenAccess` boolean used for OA rate without license model
- **Root cause:** LLM as source of record for ISSN/JIF/OA; simplified OA boolean
- **User impact:** Misleading journal metrics and OA labeling
- **Scientific impact:** Unverifiable JIF displayed; OA conflated with PMC/full-text filters
- **Tests:** Limited `journalService.test.ts`; no filter semantics tests
- **Residual risk:** High until PR 6
- **Rollback:** Hide impact factor and OA rate until authoritative sources wired

---

## Ordered PR plan (from master spec §5)

| PR  | Scope                                        | Depends on                   |
| --- | -------------------------------------------- | ---------------------------- |
| 1   | P0-A Author Hub truthfulness                 | Baseline recorded (this doc) |
| 2   | P0-B KB snapshot safety                      | —                            |
| 3   | P0-C Import trust boundary                   | —                            |
| 4   | P0-D Execution provenance                    | —                            |
| 5   | P0-E Claim-evidence integrity                | Overlaps P0-6; extends       |
| 6   | P0-F Journal metadata / OA                   | —                            |
| 7+  | P1 identifiers, cancellation, coverage, docs | After P0 complete            |

**Next action:** Branch `cursor/p0-a-author-hub-integrity-5bc0` from `716696e` — PR 1 only after test strategy stub committed.

---

## Commands run (baseline)

```text
git checkout main && git pull --ff-only  → 716696e
pnpm run check:fast                      → PASS
rg Math.random (authors)                 → useAuthorsViewLogic.ts L134
```

## Review / CI posture at baseline

- Husky hooks active (typecheck on commit, check:fast on push)
- No open PRs for scientific-integrity workstreams yet
- E2E blocking: 54 tests (incl. manifest smoke); cross-browser advisory streak 0/10 for 4-test smoke

---

## Residual epistemic limitations (honest product boundary)

Until P0 work lands, the product **must not** claim:

- citation counts or h-index as factual in Author Hub;
- verified synthesis from narrative LLM output alone;
- imported KB entries as validated without re-run;
- live provider execution when heuristic fallback occurred;
- journal Impact Factor or OA license without authoritative provenance.

See master remediation spec §7 for formal acceptance criteria.
