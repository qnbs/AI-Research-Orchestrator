# Post-merge Scientific Integrity Review — PR #213

**Date:** 2026-08-03  
**Executor:** Cursor Cloud Agent (`cursor/post-merge-integrity-governance-8ad7`)  
**Trigger:** Governance finding — latest-head bot review not documented on final PR head before merge.

## Exact production tree

| Field                           | Value                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Merge commit on `main`          | `bec83e65bcb406cdce53a9a9989623e9afcb5e00`                                                                               |
| PR #213 final head              | `a943b76c1aa58d2ee4649697e51dbfaebbe77251`                                                                               |
| Tree identity                   | **Match** — `git rev-parse bec83e6^{tree}` = `git rev-parse a943b76^{tree}` = `e7f0c6064a9f3340eac364d8b4d175574b113371` |
| Matcher version (pre-follow-up) | `2.1.0` (`CLAIM_EVIDENCE_MATCHER_VERSION`)                                                                               |
| Core files                      | `src/lib/claimEvidenceMatcher.ts`, `src/lib/claimValidation.ts`                                                          |

## Governance gap (acknowledged)

| Item                                    | Observed                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Last CodeRabbit **APPROVED** review SHA | `f5b747ae684ffe71f0f331128b9b39baa1bd3975` (2026-08-03 13:12 UTC)                                                        |
| Functional commits after that approval  | `8146f04`, `2387cdc`, `a943b76` (field overlap, direction scoping, qualifying-field guard)                               |
| CodeRabbit on `a943b76`                 | **Review rate-limited** placeholders only — no non-stale review body on final head                                       |
| PR merge condition (documented)         | Latest head green + threads resolved + **real review on latest head**                                                    |
| Outcome                                 | Merge proceeded with `mergeStateStatus: CLEAN`, 0 unresolved threads, green blocking CI — **process gate not satisfied** |

**Risk class:** High — matcher output drives `claim-supported` / `corpus-supported` trust labels.

## `main` CI on merge commit `bec83e6` (2026-08-03)

| Workflow                | Run (approx.) | Result                          |
| ----------------------- | ------------- | ------------------------------- |
| Deploy to GitHub Pages  | 30822685995   | success                         |
| E2E Tests (Chromium)    | 30822686606   | success                         |
| A11y Smoke              | 30822686814   | success                         |
| E2E Cross-Browser Smoke | 30822687089   | success (completed after merge) |
| Security                | 30822688847   | success                         |

Deterministic gates on the merged SHA are green. This **does not** replace a latest-head automated or independent functional sign-off on `a943b76`.

## Post-merge adversarial re-verification

Executed locally on `main` at `bec83e6` (2026-08-03):

```bash
pnpm exec vitest run src/lib/claimEvidenceMatcher.test.ts src/lib/claimValidation.test.ts src/lib/agentEval.test.ts
pnpm run check:agent-eval
```

**Result:** 68 matcher/validation tests + 27 agent-eval tests — all passed.

### Scenario matrix (`2.1.0` on `bec83e6`)

| Scenario                                                 | Expected               | Result on `bec83e6` | Notes                                                                    |
| -------------------------------------------------------- | ---------------------- | ------------------- | ------------------------------------------------------------------------ |
| Title keyword overlap, abstract supports claim direction | `supports`             | **Pass**            | `supports claim when abstract aligns despite title-only keyword overlap` |
| Title contradicts direction, abstract supports           | `insufficient`         | **Pass**            | Internal field disagreement — not elevated to `supports`                 |
| Abstract contradicts, title generic overlap only         | `contradicts`          | **Pass**            | Weak title does not block abstract contradiction                         |
| Multi-outcome abstract (CV reduced, bleeding increased)  | `supports` on CV claim | **Pass**            | Direction scoped to matched span                                         |
| Negation on inflected overlap (`prevent` / `prevented`)  | `contradicts`          | **Pass**            | Stemmed token indices                                                    |
| Negation at **second** overlapping token occurrence      | `contradicts`          | **Fail on `2.1.0`** | First-index-only lookup missed later `not` — fixed in follow-up `2.3.0`  |
| Affirming “not only …” phrasing                          | `supports`             | **Pass**            | `hasNegationNear` skips `not only`                                       |
| Mixed supporting + contradicting PMIDs                   | `unverified`           | **Pass**            | `validateClaimAgainstCorpus`                                             |
| Invalid citations + no lexical support                   | `rejected`             | **Pass**            | Invalid citation guard                                                   |
| Population / numeric / unit mismatch                     | N/A                    | **Out of scope**    | Lexical matcher — not validated (residual risk)                          |

## Follow-up corrective change (branch `cursor/post-merge-integrity-governance-8ad7`)

| Change                                          | Purpose                                                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `findAllStemmedTokenIndices` + negation pairing | Close second-occurrence negation gap                                                                                                     |
| `CLAIM_EVIDENCE_MATCHER_VERSION` → `2.3.0`      | Provenance stamp for post-merge fix (intervening `2.2.0` came from unrelated numeric/population conflict work merged in the same window) |
| Additional adversarial tests                    | Title/abstract conflict, multi-outcome, late negation                                                                                    |
| This audit + `docs/ci-branch-governance.md`     | Document gap and enforce latest-head review technically where possible                                                                   |

## Residual risks (still open)

1. **Population, counts, units** — no dedicated validation; lexical overlap only.
2. **Cross-sentence direction leakage** — mitigated by per-field spans, not eliminated for all abstract structures.
3. **Bot review rate limits** — can block CodeRabbit on latest head while CI is green; merge policy must treat rate-limited placeholders as **non-quiescence** (rules `011` / `013`).

## Recommended ruleset changes (GitHub `mainrules`)

Status on `main` ruleset **20291814** (re-verified 2026-08-06 directly against
`gh api repos/qnbs/AI-Research-Orchestrator/rulesets/20291814` — see
`docs/ci-branch-governance.md` for the full live table):

1. ~~**Require conversation resolution** — currently Off; was blocking merge hygiene on #213.~~ **Done** — `required_review_thread_resolution` is `true` as of the ruleset's `updated_at` (2026-08-03T14:07:58+02:00).
2. **Dismiss stale pull request approvals when new commits are pushed** — invalidates approvals on superseded SHAs. **Still open.**
3. ~~**Require branches to be up to date before merging** — pairs with strict status checks.~~ **Done** — `strict_required_status_checks_policy` is `true` as of the same `updated_at`.
4. **Optional:** add a required check for CodeRabbit only when GitHub exposes a stable non-placeholder context (today: process gate in rules `011`/`013` + human/agent disposition). **Still open.**

## Merge hold (standing until this review lands)

- **No further high-risk merges** (scientific integrity, crypto, SW, PubMed/arXiv core) until:
  1. This audit is merged to `main`.
  2. `bec83e6` deploy SHA is observed on GitHub Pages.
  3. Follow-up `2.3.0` negation fix PR completes its own correction loop.

PR **#214** (Ollama runtime) remains **on hold** per stabilization window in `docs/ci-branch-governance.md`.
