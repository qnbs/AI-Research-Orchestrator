# Approve GitHub Actions on pull requests (maintainer)

Short guide for **PR #407** and any PR where jobs such as `Typecheck, Lint & Tests` or `Playwright E2E` never start.

German parallel (maintainer convenience): `docs/audits/2026-11-03-workflow-freigabe-anleitung-de.md`.

## Prerequisites

- **Maintainer** or **Admin** on `qnbs/AI-Research-Orchestrator`.
- Signed in to GitHub.

## Step 1: Open the pull request

1. https://github.com/qnbs/AI-Research-Orchestrator/pull/407
2. Open the **Checks** tab below the merge box.

## Step 2: Approve workflow runs (when shown)

Look for a yellow banner or button:

- **Workflow runs awaiting approval from a maintainer**, or
- **Approve and run workflows**

Click **Approve and run workflows** and confirm. Within 1–2 minutes you should see runs including:

- **Deploy to GitHub Pages** → `Typecheck, Lint & Tests`, `Production Build`
- **E2E Tests** → `Playwright E2E`
- **Security** → `CodeQL`, `pnpm audit (high+)`, …

## Step 3: When no approve button appears

Repository or organization policy is usually blocking enqueue (not broken YAML):

1. **Settings → Actions → General**
2. Under fork/outside-collaborator workflow approval: review whether **Dependabot** and **agent** PRs require approval. Org policy may override repo settings.
3. **Workflow permissions:** keep the repository default **`GITHUB_TOKEN` read-only**. Grant write scopes only in job `permissions` blocks where required (for example `security-events: write` on the CodeQL job in `security.yml`). Do **not** enable blanket **Read and write permissions** for all workflows unless org policy explicitly requires it and you accept the broader blast radius.

Also check **Organization settings → Actions** (budget, disabled Actions, allowed actions).

## Step 4: Code scanning (#397)

Independent of Step 2:

1. **Settings → Code security and analysis**
2. Enable **code scanning** / upload entitlement for this repository. Prefer **Advanced setup** or upload-only enablement that keeps `.github/workflows/security.yml` — do **not** enable GitHub **Default setup** if it replaces the existing workflow-driven CodeQL job.
3. Wait for a **Security** workflow run or trigger **Actions → Security → Run workflow**.

Without this step, CodeQL fails with _Code scanning is not enabled for this repository_.

## Step 5: Re-trigger after settings changes

GitHub does **not** automatically re-run workflows for old PR commits after a settings change. Either:

1. **Checks → Re-run all jobs** when available, or
2. Push a new commit (empty commit is enough), or
3. Close and reopen the PR (rare).

PR #407 was successfully re-triggered on 2026-11-03 with commit `13d8c3f` after the settings fix.

## Verify success

- **Checks** on the PR: all **ruleset** contexts and **workflow-level** gates in `docs/ci-branch-governance.md` run green (30–60+ minutes), including **`PWA service-worker registration`** from `pwa-e2e.yml` (workflow-level blocking; not yet in ruleset — issue #399).
- **Actions** shows new runs on branch `cursor/p0-audit-recovery-nov2026-33e3`.

Technical runbook: `docs/audits/2026-11-03-p0-operational-runbook.md`.
