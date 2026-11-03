# Phase-0 evidence snapshot — 2026-11-03 audit recovery

**Captured:** 2026-11-03T21:05:00Z (Europe/Berlin: 2026-11-03 22:05)  
**Repository:** `qnbs/AI-Research-Orchestrator`  
**Main SHA (verified current):** `e45847b4cc75d7cd3b867a4f2278968410941177`  
**Last release:** `v0.4.6` (2026-10-03)  
**Portfolio:** [#394](https://github.com/qnbs/AI-Research-Orchestrator/issues/394)

Evidence labels used below: **VERIFIED CURRENT**, **VERIFIED HISTORICAL**, **HYPOTHESIS**, **UNKNOWN**, **BLOCKED BY PERMISSION**.

---

## Repository and release posture

| Item                               | Status               | Evidence                                                        |
| ---------------------------------- | -------------------- | --------------------------------------------------------------- |
| `origin/main` SHA                  | **VERIFIED CURRENT** | `git rev-parse origin/main` → `e45847b4…`                       |
| Commits after 2026-10-03 on `main` | **VERIFIED CURRENT** | None in fetched history                                         |
| Open PRs                           | **VERIFIED CURRENT** | 18 Dependabot PRs `#375`–`#393`, all `mergeStateStatus=BLOCKED` |
| GitHub visibility                  | **VERIFIED CURRENT** | Public (`gh repo view --json visibility`)                       |
| GitHub Pages enabled               | **VERIFIED CURRENT** | `has_pages: true` via API                                       |
| Live Pages HTTP / deployed SHA     | **UNKNOWN**          | Not independently browser-verified in this pass                 |

---

## P0 #395 — PR CI gap

| Observation                                                 | Status                                                                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Last `Deploy to GitHub Pages` `pull_request` run            | **VERIFIED HISTORICAL** — 2026-10-05 on `dependabot/github_actions/anthropics/claude-code-action-1.0.240` |
| No `pull_request` deploy/e2e/security runs after 2026-10-05 | **VERIFIED CURRENT**                                                                                      | `gh run list --workflow=deploy.yml` pagination                              |
| Sample PR `#375` head `3f75b8c…` check-runs                 | **VERIFIED CURRENT**                                                                                      | Socket, GitGuardian, Semgrep, CodeAnt — **no** `github-actions` check suite |
| Sample PR `#375` GitHub Actions check suites                | **VERIFIED CURRENT**                                                                                      | Empty array for `app.slug==github-actions`                                  |
| Workflow YAML on `main` unchanged since 2026-10-04          | **VERIFIED CURRENT**                                                                                      | `git log origin/main --since=2026-10-04 -- .github/` empty                  |
| Repo Actions permissions API                                | **BLOCKED BY PERMISSION**                                                                                 | `GET .../actions/permissions` → 403 for this token                          |

### Root-cause matrix (falsifiable)

| Hypothesis                                                                                                                                                                          | Likelihood                   | How to falsify                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **H1:** Pull request workflows await maintainer “Approve and run workflows” or org policy blocks enqueue for **all** PR authors (confirmed on agent PR `#407`, not Dependabot-only) | **HYPOTHESIS (leading)**     | Approve workflows on `#407`; confirm `github-actions` check suites and deploy/e2e jobs start                                    |
| **H2:** Org/repo Actions budget or policy disabled `pull_request` for bot authors after 2026-10-05                                                                                  | **HYPOTHESIS**               | Org billing/settings audit; compare with a maintainer-branch PR (see remediation PR on `cursor/p0-audit-recovery-nov2026-33e3`) |
| **H3:** Broken workflow registration                                                                                                                                                | **DISPROVEN (current)**      | `gh workflow list` — all workflows **active**; Oct 3–5 PR runs succeeded                                                        |
| **H4:** Required checks misnamed                                                                                                                                                    | **DISPROVEN as primary gap** | Missing jobs precede any naming mismatch                                                                                        |

**Remediation strategy:** Consolidation PRs from trusted branches (not Dependabot-authored) until H1/H2 resolved; document maintainer settings in `docs/audits/2026-11-03-p0-operational-runbook.md`. After maintainer Actions settings update (2026-11-03 ~22:15 CET), an empty push to PR `#407` (`13d8c3f`) **re-triggered** full `pull_request` workflows (Deploy, Security, E2E, a11y, PWA).

---

## P0 #396 — Scheduled security / audit

| Observation                                    | Status                                                                                                                                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Last scheduled Security success                | **VERIFIED HISTORICAL** — 2026-10-05 (`pnpm audit` + CodeQL upload OK on that run family)                                                                                                |
| Scheduled failures                             | **VERIFIED HISTORICAL** — [run 39209557969](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/39209557969) (2026-10-19): `pnpm audit (high+)` fail; CodeQL SARIF upload fail |
| Missing scheduled runs 2026-10-26 / 2026-11-02 | **VERIFIED CURRENT**                                                                                                                                                                     | No `schedule` Security runs in `gh run list` after 2026-10-19                                                                                           |
| Local audit on baseline lockfile (pre-fix)     | **VERIFIED CURRENT**                                                                                                                                                                     | `pnpm audit --audit-level=high` exit **1** — critical `proxy-addr`, high `source-map-js`, `compression`, critical/high `dompurify`, high `undici`, etc. |
| Local audit after remediation branch           | **VERIFIED CURRENT** (branch)                                                                                                                                                            | exit **0** at high+ after overrides + `@lhci/cli@0.16.0` + `dompurify@3.4.17`                                                                           |

---

## P0 #397 — CodeQL upload

| Observation                      | Status                  |
| -------------------------------- | ----------------------- |
| CodeQL analysis executes         | **VERIFIED HISTORICAL** | Oct 19 log: TS/JS scan completed before upload step |
| SARIF upload error               | **VERIFIED HISTORICAL** | `Code scanning is not enabled for this repository`  |
| Fix via application source alone | **DISPROVEN**           | Entitlement/settings prerequisite — see runbook     |

---

## Ruleset drift (P1 #399, noted)

**VERIFIED CURRENT:** Ruleset `20291814` enforces 11 contexts; **`PWA service-worker registration`** documented as blocking in `docs/ci-branch-governance.md` but not listed in ruleset required checks (unchanged from November audit).

---

## Next actions (execution order)

1. Land P0 remediation PR (security lockfile + runbooks + prompt archive).
2. Confirm **full** required CI on maintainer/agent PR head (validates #395 contrast with Dependabot).
3. Maintainer: enable Code scanning + approve Dependabot workflow runs (runbook).
4. Resume Dependabot convergence (#398) via consolidation, not blind merge of blocked bot PRs.
