# P0 operational runbook — PR CI (#395) and CodeQL (#397)

**Created:** 2026-11-03  
**Related issues:** [#395](https://github.com/qnbs/AI-Research-Orchestrator/issues/395), [#397](https://github.com/qnbs/AI-Research-Orchestrator/issues/397)  
**Evidence snapshot:** `docs/audits/2026-11-03-phase0-evidence.md`

This document describes **maintainer account actions** that cannot be completed from repository source alone. Do not weaken branch rules or required checks as a workaround.

---

## A. Restore required CI on Dependabot pull requests (#395)

### Verified symptom

- Open Dependabot PR heads (for example `#375`) show third-party App checks (Socket, CodeAnt, Semgrep) but **no** GitHub Actions jobs such as `Typecheck, Lint & Tests`, `Playwright E2E`, or `CodeQL`.
- `gh run list --workflow=deploy.yml --event pull_request` shows **no** runs after **2026-10-05**, while workflows remain **active**.

### Leading hypothesis

GitHub is **not enqueueing** `pull_request` workflow runs for Dependabot-authored PRs until a maintainer approves them, or an org Actions policy blocks bot-initiated runs.

### Maintainer checklist (UI)

1. Open any blocked Dependabot PR (for example `#375`) → **Checks** tab.
2. If you see **“Workflow runs awaiting approval”** or **“Approve and run workflows”**, approve once and confirm these jobs start:
   - `Deploy to GitHub Pages` → `Typecheck, Lint & Tests`, `Production Build`
   - `E2E Tests` → `Playwright E2E`
   - `E2E Cross-Browser Smoke` → Firefox / WebKit / mobile Chrome
   - `A11y Smoke`, `PWA E2E`, `Security`
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
2. Enable **Code scanning** / **CodeQL analysis** for this repository (default setup is compatible with `.github/workflows/security.yml`).
3. Confirm the **CodeQL** job on a fresh `pull_request` or `workflow_dispatch` Security run reaches **Perform CodeQL Analysis** with a successful SARIF upload.
4. Open **Security → Code scanning alerts** and confirm results ingest (empty is OK; upload must succeed).
5. Organization policy: ensure code scanning is not disabled at org level for this repo.

### Workflow permissions (already in repo)

`security.yml` grants the CodeQL job `security-events: write`. No source change replaces enabling the feature in GitHub settings.

### Scheduled Security cadence gap

After 2026-10-19, no new `schedule` Security runs appear in Actions history (expected Mondays 06:00 UTC). After code scanning is enabled, trigger **workflow_dispatch** on **Security** once to validate, then monitor the next Monday run.

---

## C. Acceptance evidence to attach to issues

| Gate | Pass criterion                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------- |
| #395 | Screenshot or `gh pr checks` listing **all** required contexts on a current PR head, with Actions run URLs |
| #397 | Code scanning dashboard shows a run from the latest head; Security job green including upload              |
| #396 | `pnpm audit (high+)` green on CI for the merged lockfile (see remediation PR)                              |
