# P0 operational runbook — PR CI (#395) and CodeQL (#397)

**Created:** 2026-11-03  
**Related issues:** [#395](https://github.com/qnbs/AI-Research-Orchestrator/issues/395), [#397](https://github.com/qnbs/AI-Research-Orchestrator/issues/397)  
**Evidence snapshot:** `docs/audits/2026-11-03-phase0-evidence.md`

This document describes **maintainer account actions** that cannot be completed from repository source alone. Do not weaken branch rules or required checks as a workaround.

---

## A. Restore required CI on Dependabot pull requests (#395)

### Verified symptom

- Open Dependabot PR heads (for example `#375`) show third-party App checks (Socket, CodeAnt, Semgrep) but **no** GitHub Actions jobs such as `Typecheck, Lint & Tests`, `Playwright E2E`, or `CodeQL`.
- **Maintainer/agent PR `#407` (2026-11-03):** after Actions re-enable + empty push `13d8c3f`, full `github-actions` suites ran on head `2a857de` (see follow-up in phase-0 evidence).
- `gh run list --workflow=deploy.yml --event pull_request` shows **no** runs after **2026-10-05**, while workflows remain **active**.

### Confirmed root cause (2026-11-03, maintainer)

The repository maintainer **confirmed that GitHub Actions / workflow execution had been disabled in repository settings** and was **re-enabled** after this gap was reported. That explains missing `pull_request` workflow runs after 2026-10-05 without YAML changes. PR [#407](https://github.com/qnbs/AI-Research-Orchestrator/pull/407) re-trigger (`13d8c3f`) then ran full Deploy / Security / E2E / a11y / PWA workflows on head `2a857de`.

**Separate operational gap:** re-enabling Actions does **not** retroactively enqueue runs on stale Dependabot PR heads (`#375`, `#393`, …). Those heads still show App checks only until **Re-run**, Dependabot rebase, or consolidation supersedes them.

### Contingency diagnostics (only if runs still missing after Actions are enabled)

- **Workflow approval:** “Approve and run workflows” on a blocked PR.
- **Outside-collaborator / first-time contributor** approval policies (Dependabot often treated as outside collaborator).
- Org Actions budget or disablement.

### Maintainer checklist (UI)

1. Open any blocked Dependabot PR (for example `#375`) → **Checks** tab.
2. If you see **“Workflow runs awaiting approval”** or **“Approve and run workflows”**, approve once and confirm the **expected jobs start across the relevant workflows** (required **job contexts** from `docs/ci-branch-governance.md`, not one monolithic “Security” job):
   - **`security.yml`:** `CodeQL`, `Dependency Review`, `pnpm audit (high+)`, `Secret scan (gitleaks)`
   - **`deploy.yml`:** `Typecheck, Lint & Tests`, `Production Build`
   - **`e2e.yml`:** `Playwright E2E`
   - **`e2e-cross-browser.yml`:** Firefox / WebKit / mobile Chrome
   - **`a11y.yml`:** Axe critical/serious smoke
   - **`pwa-e2e.yml`:** `PWA service-worker registration`
3. Repository **Settings → Actions → General**:
   - Under **Fork pull request workflows**, review **“Require approval for first-time contributors”** vs **all outside collaborators**. Dependabot is often treated as an outside collaborator.
   - Prefer **allowing workflow runs for trusted bot PRs** without disabling required checks on `main`.
4. Organization **Settings → Actions** (if applicable): confirm Actions are enabled and spending limits are not blocking new runs.
5. **Contrast test:** open or refresh a maintainer/agent PR (for example the P0 recovery branch). If Actions run there but not on Dependabot, the gap is bot-approval policy—not broken YAML.

### Engineering workaround (until policy is fixed)

- Land dependency and security fixes via **consolidation PRs** from maintainer or agent branches (document `Replaces #…` for superseded Dependabot PRs).
- Do **not** merge Dependabot PRs while required contexts are missing.

---

## B. Enable CodeQL result upload (#397)

### Verified symptom

Scheduled Security run [39209557969](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/39209557969) (2026-10-19): CodeQL **analysis completed**, but upload failed with:

> Code scanning is not enabled for this repository

Repository visibility is **public**; this is **not** explained by private-repo limitations alone.

### Maintainer checklist (UI)

1. **Settings → Code security and analysis** (or **Security** → **Set up code scanning**).
2. Enable **code scanning upload entitlement** for this repository. **Do not** enable GitHub **Default setup** if it would replace or duplicate the existing `.github/workflows/security.yml` CodeQL job — use **Advanced setup** / feature enablement that keeps the workflow-driven analysis, or enable upload only so the existing `github/codeql-action/*` steps can publish SARIF.
3. Confirm the **CodeQL** job on a fresh `pull_request` Security run reaches **Perform CodeQL Analysis** with a successful SARIF upload (verified on PR #407 head `2a857de`: [run 41722216361](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/41722216361)).
4. Open **Security → Code scanning alerts** and confirm results ingest (empty is OK; upload must succeed).
5. Organization policy: ensure code scanning is not disabled at org level for this repo.

### Workflow permissions (already in repo)

`security.yml` grants the CodeQL job `security-events: write`. No source change replaces enabling the feature in GitHub settings.

### Scheduled Security cadence gap

After 2026-10-19, no new `schedule` Security runs appear in Actions history (expected Mondays 06:00 UTC). After code scanning is enabled, trigger **workflow_dispatch** on **Security** once to validate, then monitor the next Monday run.

---

## C. Acceptance evidence to attach to issues

Distinguish **GitHub ruleset-required contexts** (branch protection ruleset `mainrules`) from **workflow-level blocking gates** documented in `docs/ci-branch-governance.md`. Both must be green on the remediation PR head before merge; only the ruleset contexts block the merge button if missing from the ruleset list.

| Gate | Pass criterion                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #395 | **Historical** (`2a857de`, first post–Actions-re-enable): Deploy + Security + E2E + axe + PWA — [Deploy 41722216617](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/41722216617), [Security 41722216361](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/41722216361). Cross-browser WebKit was still pending on that snapshot. **Current acceptance:** full matrix green on latest PR #407 head (e.g. `ce729a4` — [cross-browser 41732520365](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/41732520365) incl. WebKit) before merge. |
| #397 | CodeQL upload green on [Security 41722216361](https://github.com/qnbs/AI-Research-Orchestrator/actions/runs/41722216361) (`2a857de`)                                                                                                                                                                                                                                                          |
| #396 | `pnpm audit (high+)` green on same Security run; lockfile remediation in PR #407                                                                                                                                                                                                                                                                                                              |
