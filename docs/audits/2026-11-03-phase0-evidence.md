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

| Observation                                                                      | Status                    | Evidence                                                                        |
| -------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------- |
| Last `Deploy to GitHub Pages` `pull_request` run                                 | **VERIFIED HISTORICAL**   | 2026-10-05 on `dependabot/github_actions/anthropics/claude-code-action-1.0.240` |
| No `pull_request` deploy/e2e/security runs after 2026-10-05 (until settings fix) | **VERIFIED CURRENT**      | `gh run list --workflow=deploy.yml` pagination                                  |
| Sample PR `#375` head `3f75b8c…` check-runs                                      | **VERIFIED CURRENT**      | Socket, GitGuardian, Semgrep, CodeAnt — **no** `github-actions` check suite     |
| Sample PR `#375` GitHub Actions check suites                                     | **VERIFIED CURRENT**      | Empty array for `app.slug==github-actions`                                      |
| Workflow YAML on `main` unchanged since 2026-10-04                               | **VERIFIED CURRENT**      | `git log origin/main --since=2026-10-04 -- .github/` empty                      |
| Repo Actions permissions API                                                     | **BLOCKED BY PERMISSION** | `GET .../actions/permissions` → 403 for this token                              |

### Root-cause matrix (falsifiable)

| Hypothesis                                                                                                                                                                          | Likelihood                   | How to falsify                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **H1:** Pull request workflows await maintainer “Approve and run workflows” or org policy blocks enqueue for **all** PR authors (confirmed on agent PR `#407`, not Dependabot-only) | **HYPOTHESIS (leading)**     | Approve workflows on `#407`; confirm `github-actions` check suites and deploy/e2e jobs start                                    |
| **H2:** Org/repo Actions budget or policy disabled `pull_request` for bot authors after 2026-10-05                                                                                  | **HYPOTHESIS**               | Org billing/settings audit; compare with a maintainer-branch PR (see remediation PR on `cursor/p0-audit-recovery-nov2026-33e3`) |
| **H3:** Broken workflow registration                                                                                                                                                | **DISPROVEN (current)**      | `gh workflow list` — all workflows **active**; Oct 3–5 PR runs succeeded                                                        |
| **H4:** Required checks misnamed                                                                                                                                                    | **DISPROVEN as primary gap** | Missing jobs precede any naming mismatch                                                                                        |

**Remediation strategy:** Consolidation PRs from trusted branches (not Dependabot-authored) until H1/H2 resolved; document maintainer settings in `docs/audits/2026-11-03-p0-operational-runbook.md` and `docs/audits/2026-11-03-workflow-approval-guide.md`.

---

## Follow-up update — PR #407 workflow re-trigger (after maintainer settings)

**Updated:** 2026-11-03T21:15:00Z (Europe/Berlin: 2026-11-03 22:15) — **after** the initial snapshot above.

| Item                                                       | Status               | Evidence                                                                     |
| ---------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------- |
| Maintainer Actions / code-scanning settings adjusted       | **VERIFIED CURRENT** | Maintainer report; CodeQL upload green on Security run                       |
| Empty push `13d8c3f` re-triggered `pull_request` workflows | **VERIFIED CURRENT** | Deploy / Security / E2E / cross-browser / axe / PWA on head `a157da1`        |
| Dependabot PR disposition for `#375`–`#393`                | **VERIFIED CURRENT** | `docs/dependabot-disposition.md` § 2026-11-03 — superseded/deferred via #407 |

---

## P0 #396 — Scheduled security / audit

| Observation                                    | Status                  | Evidence                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Last scheduled Security success                | **VERIFIED HISTORICAL** | 2026-10-05 (`pnpm audit` + CodeQL upload OK on that run family)                                                                                                                                                                                                                               |
| Scheduled failures                             | **VERIFIED HISTORICAL** | [run 39209557969](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/39209557969) (2026-10-19): `pnpm audit (high+)` fail; CodeQL SARIF upload fail                                                                                                                                |
| Missing scheduled runs 2026-10-26 / 2026-11-02 | **VERIFIED CURRENT**    | No `schedule` Security runs in `gh run list` after 2026-10-19 until settings fix                                                                                                                                                                                                              |
| Local audit on baseline lockfile (pre-fix)     | **VERIFIED CURRENT**    | `pnpm audit --audit-level=high` exit **1** on `main` lockfile (Oct baseline)                                                                                                                                                                                                                  |
| Local audit after remediation branch           | **VERIFIED CURRENT**    | exit **0** at high+ after overrides + `@lhci/cli@0.16.0` + `dompurify@3.4.17`                                                                                                                                                                                                                 |
| **PR #407 CI** (`a157da1`)                     | **VERIFIED CURRENT**    | [Security](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/41720263417) `pnpm audit (high+)` + **CodeQL upload** green; [Deploy](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/41720263369) quality + build; E2E / cross-browser / axe / PWA green on same head |

---

## P0 #397 — CodeQL upload

| Observation                      | Status                  | Evidence                                                                                                                     |
| -------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| CodeQL analysis executes         | **VERIFIED HISTORICAL** | Oct 19 log: TS/JS scan completed before upload step                                                                          |
| SARIF upload error               | **VERIFIED HISTORICAL** | `Code scanning is not enabled for this repository`                                                                           |
| Fix via application source alone | **DISPROVEN**           | Entitlement/settings prerequisite — see runbook                                                                              |
| **Restored on PR #407 head**     | **VERIFIED CURRENT**    | CodeQL job green on [run 41720263417](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/41720263417) (`a157da1`) |

---

## Ruleset drift (P1 #399, noted)

**VERIFIED CURRENT:** Ruleset `20291814` enforces 11 contexts; **`PWA service-worker registration`** is a **workflow-level** blocking gate (`pwa-e2e.yml`, see `docs/ci-branch-governance.md`) but is **not** listed in the ruleset required-status-checks list (tracked as P1 #399).

---

## Next actions (execution order)

1. Land P0 remediation PR (security lockfile + runbooks + prompt archive).
2. Confirm **full** required CI on maintainer/agent PR head (validates #395 contrast with Dependabot).
3. Maintainer: enable Code scanning + approve Dependabot workflow runs (runbook).
4. Resume Dependabot convergence (#398) via consolidation, not blind merge of blocked bot PRs.
