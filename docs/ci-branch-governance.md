# CI and branch governance (P1-7 / PR11)

Authoritative inventory of blocking gates, concurrency, artifacts, and maintainer
branch-protection expectations. Complements `docs/pr-merge-gate.md` (dual merge
gate / review quiescence), `docs/audit-governance.md`, `docs/release-policy.md`,
and `docs/e2e-ci-backlog.md`.

Machine-readable flags live in `docs/project-facts.json` (`ci.branchGovernancePath`,
`ci.mergeGatePath`, `ci.cancelInProgressOnPullRequestOnly`,
`e2e.crossBrowserAdvisory`) and are enforced by `pnpm run check:docs-drift`.

## Blocking checks (must be green on latest head before merge)

Documented names match GitHub check titles. Settings → Branches / Rulesets
should require these (or their workflow job equivalents) for `main`:

| Check                                            | Workflow                | Notes                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Typecheck, Lint & Tests                          | `deploy.yml`            | Includes `format:check`, coverage gate, coverage floors, docs-drift                                                                                                                                                                                                                                                            |
| Production Build                                 | `deploy.yml`            | Bundle + CSP hash patch + `bundle:budget`                                                                                                                                                                                                                                                                                      |
| Playwright E2E                                   | `e2e.yml`               | Chromium blocking suite                                                                                                                                                                                                                                                                                                        |
| Cross-browser (firefox / webkit / mobile-chrome) | `e2e-cross-browser.yml` | Blocking since 2026-08-03 (`crossBrowserAdvisory: false`)                                                                                                                                                                                                                                                                      |
| Axe critical/serious smoke                       | `a11y.yml`              | Separate a11y smoke                                                                                                                                                                                                                                                                                                            |
| CodeQL                                           | `security.yml`          | `security-extended`                                                                                                                                                                                                                                                                                                            |
| Dependency Review                                | `security.yml`          | PRs                                                                                                                                                                                                                                                                                                                            |
| pnpm audit (high+)                               | `security.yml`          | High/critical only (required check). `deploy.yml` does **not** re-run `pnpm audit` — a duplicate registry-bulk timeout was failing Typecheck/Lint/Tests independently of this job. `check:audit-ignore-paths` still runs in `deploy.yml` and fails if a documented GHSA ignore appears outside its allowed non-production path |
| Secret scan (gitleaks)                           | `security.yml`          |                                                                                                                                                                                                                                                                                                                                |
| PWA service-worker registration                  | `pwa-e2e.yml`           | Blocking from creation (2026-08-05) — regression guard for the 531885f base-href defect (ADR 0004); real production build + `vite preview`, service workers enabled, unlike `e2e.yml`/`e2e-cross-browser.yml`                                                                                                                  |

Review bots are **not** substitutes for the deterministic gates above. Green
required CI is also **not** a substitute for review quiescence — merge needs
the **dual gate** in `docs/pr-merge-gate.md` / `.cursor/rules/011-coderabbit-pr-gate.mdc`
step 7.

`pwa-e2e.yml`'s job (`PWA service-worker registration`) is not yet in the GitHub
ruleset's required-status-checks list below — workflow-level blocking (no
`continue-on-error`, red on failure) is in place now, but adding it as a
GitHub-_enforced_ merge blocker needs a separate ruleset update (maintainer
action: add a `required_status_checks` entry for this context) — independent
of the conversation-resolution / strict-up-to-date items below, which are
already enabled.

### Live ruleset (2026-08-06)

Repository ruleset **`mainrules`** (`id` 20291814) targets `~DEFAULT_BRANCH`,
enforcement **active**. Re-verified directly against the GitHub API
(`gh api repos/qnbs/AI-Research-Orchestrator/rulesets/20291814`) rather than
trusting this doc's prior text — `required_review_thread_resolution` and
`strict_required_status_checks_policy` were already `true` as of the
ruleset's `updated_at` (2026-08-03T14:07:58+02:00), predating that prior text:

| Rule                                                                            | Status                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Block deletions / non-fast-forward                                              | On                                                                                                                                                                                                                                                               |
| Require pull request                                                            | On (`required_approving_review_count: 0` — solo-maintainer friendly)                                                                                                                                                                                             |
| Required status checks (11 contexts below)                                      | On — names match workflow job titles                                                                                                                                                                                                                             |
| Code scanning (CodeQL errors / high+)                                           | On                                                                                                                                                                                                                                                               |
| Code quality (errors)                                                           | On                                                                                                                                                                                                                                                               |
| Require conversation resolution (`required_review_thread_resolution`)           | **On**                                                                                                                                                                                                                                                           |
| Require branch up to date before merge (`strict_required_status_checks_policy`) | **On**                                                                                                                                                                                                                                                           |
| Dismiss stale reviews on push (`dismiss_stale_reviews_on_push`)                 | **Off** (live, re-read 2026-09-03). **Expected: On.** Off leaves GitHub `reviewDecision: CHANGES_REQUESTED` / `mergeStateStatus: BLOCKED` after a superseded bot review (PR #213, #301). Enable — command below. Solo `required_approving_review_count` stays 0. |
| Require review from Code Owners                                                 | **Off** — `.github/CODEOWNERS` exists for routing; do not enable without a maintainer decision (solo-maintainer; `required_approving_review_count` stays 0)                                                                                                      |

Required check contexts currently configured:

`Typecheck, Lint & Tests`, `Production Build`, `Playwright E2E`,
`Cross-browser (firefox)`, `Cross-browser (webkit)`, `Cross-browser (mobile-chrome)`,
`Axe critical/serious smoke`, `CodeQL`, `Dependency Review`, `pnpm audit (high+)`,
`Secret scan (gitleaks)`.

Enable `dismiss_stale_reviews_on_push` with a **fine-grained PAT** or a
GitHub App **installation** token that has repository **Administration:
write**. There is no classic `admin:repo` scope. The installation and Actions
tokens used on this repo returned **403** on both ruleset PUT and PR-review
dismiss (PR #301) — that is this installation, not a blanket API restriction.
`GET` the live ruleset, flip only that pull-request parameter, then `PUT` the
writable fields including the **full** `rules` array. A partial `rules` array
wipes every other rule. Do **not** send `id` / `_links` / timestamps.

```bash
# Administration: write required (fine-grained PAT or App installation).
# This repo's App/Actions installation returned 403; use a PAT or an
# installation that has Administration: write.
RULESET_ID=20291814
REPO=qnbs/AI-Research-Orchestrator
RAW=$(mktemp)
PUT=$(mktemp)
trap 'rm -f "$RAW" "$PUT"' EXIT

gh api "repos/${REPO}/rulesets/${RULESET_ID}" > "$RAW"
jq -r '.rules[]|select(.type=="pull_request").parameters.dismiss_stale_reviews_on_push' "$RAW"
# live 2026-09-03: false. Expected after enable: true.

jq '
  {
    name, target, enforcement, conditions,
    rules: [
      .rules[]
      | if .type == "pull_request" then
          .parameters.dismiss_stale_reviews_on_push = true
        else .
        end
    ]
  } + (if .bypass_actors then {bypass_actors} else {} end)
' "$RAW" > "$PUT"

# Dry-run: dismiss_stale true, require_code_owner_review still false
jq '.rules[]|select(.type=="pull_request").parameters' "$PUT"

gh api --method PUT "repos/${REPO}/rulesets/${RULESET_ID}" --input "$PUT"

# Read back before flipping the live fact
gh api "repos/${REPO}/rulesets/${RULESET_ID}" \
  --jq '.rules[]|select(.type=="pull_request").parameters.dismiss_stale_reviews_on_push'
# must print: true
```

After the readback is `true`, set `docs/project-facts.json`
`ci.dismissStaleReviewsOnPushLive` to `true` in the same follow-up PR. Do
**not** enable `require_code_owner_review`.

### Process gates (not GitHub-required checks)

Human modus operandi: `docs/pr-merge-gate.md`. Authoritative predicate:
`.cursor/rules/011-coderabbit-pr-gate.mdc` step 7 — this section restates it,
it does not vary it. **“Latest head” / “current head”** is the PR’s current
head SHA, not a separately computed merge-tree hash.

| Gate                              | Enforcement                                                                                                                                                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dual merge gate                   | Required CI **and** review quiescence on the same head. Neither half suffices.                                                                                                                                                         |
| Automated review correction loop  | Rules `011` / `013` — CodeRabbit + CodeAnt + Sourcery (budget permitting) + DeepSource AI Review (`@deepsourcebot review`) + Copilot / CodeScene / Greptile when present + resolve threads                                             |
| Arrival wait                      | Do not merge while an in-scope bot is still in-progress on the current head (CodeAnt “🔄 Reviewing…”, pending Greptile / Copilot / CodeScene / CodeRabbit). Thread count 0 is not enough if a bot has not finished arriving (PR #299). |
| Dismiss stale bot/human approvals | Enable ruleset **Dismiss stale pull request approvals when new commits are pushed** so post-approval commits cannot merge on superseded review SHAs                                                                                    |
| Human/agent rebase before merge   | Prefer enabling ruleset “Require branches to be up to date”; until then rebase onto latest `main`                                                                                                                                      |

### Latest-head review quiescence (restated from `011` step 7)

Holds **if and only if all** of the following are true:

1. **Dual gate — CI half:** required blocking CI is green on the latest head.
2. **Primary CodeRabbit condition** — one of:
   - **(a)** a real, non-`CHANGES_REQUESTED` CodeRabbit review (`APPROVED` or
     `COMMENTED`, with a review body that proves it is not a rate-limit
     placeholder) targets the **latest head**; **or**
   - **(b)** Sourcery stand-in: CodeRabbit has produced no real review on this
     head, **and** Sourcery has a real, non-rate-limited review on that head
     with everything resolved; **or**
   - **(c)** other-bot stand-in: Sourcery cannot stand in (budget exhausted, or
     no real Sourcery review is available), **and** at least one other
     in-scope bot has a real review on the current head with everything
     resolved, **and** no in-progress late-bot wave remains; **or**
   - **(d)** CodeRabbit is rate-limited **or** has produced no real review on
     this head — documented in the disposition comment. Rate-limit is **not**
     a hard merge blocker (standing policy 2026-09-03).
     A `CHANGES_REQUESTED` CodeRabbit review on the **latest** head is never
     waived by (b), (c), or (d).
3. **`@deepsourcebot review` has been attempted** on the latest head — a
   recorded attempt; static analysis alone does not satisfy this.
4. **No active human `CHANGES_REQUESTED`** targets the latest head (moot once
   superseded by a later non-requesting human review or explicit approval).
5. **Arrival wait is complete** — no in-scope bot is still in-progress on the
   current head.
6. **No other in-scope bot** has an unresolved item or active `CHANGES_REQUESTED`.
7. **Every GraphQL thread is resolved.**
8. **Every body-only finding** (including “outside diff range” comments and
   human top-level review bodies) has a recorded disposition of `fixed`,
   `replied`, or `deferred` with a documented English rationale for every
   `deferred` finding.

Rate-limit placeholders never count as approvals on their own **and are not
merge blockers** (clause **(d)**); see
`docs/audits/2026-08-03-post-merge-scientific-integrity-review.md` (PR #213).
Do **not** comment `@sourcery-ai review` while the 250k / 7-day budget is
exhausted. Auto “Reviewer’s Guide” is not a real review.

## Advisory / non-blocking

| Check                                 | Notes                                                                                                                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DeepSource: Docker / Shell            | Advisory                                                                                                                                                                                           |
| DeepSource JavaScript                 | Off in dashboard; no `javascript` block in `.deepsource.toml`                                                                                                                                      |
| Claude Code                           | On-demand `@claude` only (`claude.yml`)                                                                                                                                                            |
| Socket / Semgrep / CodeAnt / Greptile | Address when actionable; do not substitute for unit/E2E gates                                                                                                                                      |
| Codecov (coverage / tests / bundles)  | Advisory — `docs/codecov.md`. Do not add to `mainrules` required checks until a `main` baseline exists. Blocking coverage remains `test:coverage` + floors; blocking size remains `bundle:budget`. |

## Concurrency

| Workflow                                                 | Group                                      | Cancel in progress                                                                              |
| -------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Deploy / E2E / cross-browser / a11y / security / pwa-e2e | `${{ github.workflow }}-${{ github.ref }}` | **PRs only** (`pull_request`) — never cancel an in-flight `main` push validation/deploy mid-run |
| Prune deployments                                        | dedicated                                  | `false`                                                                                         |

Rationale: canceling the only authoritative `main` quality + Pages deploy leaves
`main` without a completed gate run after a burst of merges.

### Canceled ≠ test failure

GitHub marks jobs **canceled** when concurrency aborts them **or** when
`timeout-minutes` fires. Example: `main` tip `2d8d4f9` WebKit canceled at the
30-minute job budget while `playwright install --with-deps` crawled apt mirrors
(run `30807274942`) — Firefox/mobile-chrome on the same matrix were green.
Treat canceled required checks on tip as **incomplete validation**; re-run the
workflow (push or `workflow_dispatch`) after hardening, do not blame the suite.

`security.yml` `pull_request` types are `opened` / `synchronize` / `reopened`
only. A title or body **`edited`** event must not retrigger it — bot and agent
PR-description updates were canceling the in-flight `pnpm audit (high+)` via
PR concurrency (PR #302, `fb0166b` run `33819179270`, `7cf694f` run
`33821109191`). Other PR-concurrency workflows may still restart on `edited`;
do not PATCH the PR description while those required jobs are in flight.

## Artifacts

| Artifact                                                  | Retention              | Purpose                        |
| --------------------------------------------------------- | ---------------------- | ------------------------------ |
| Coverage (`deploy.yml`)                                   | 14 days                | Incident / threshold debugging |
| Playwright reports (e2e + cross-browser + a11y + pwa-e2e) | 14 days                | Failure triage                 |
| Pages deploy artifact                                     | GitHub Pages retention | Production bundle              |

## Stabilization window (high-risk changes)

After merges that touch scientific integrity, crypto/key storage, service worker,
or PubMed/arXiv parsing:

1. Prefer a quiet period of **at least one green `main` deploy** before stacking
   unrelated large features.
2. Watch blocking E2E + cross-browser on that deploy SHA.
3. Record residual risk in the PR disposition / meeting notes.

## Merge queue

Not enabled. Evaluate if PR throughput causes frequent rebase races; until then
agents rebase onto latest `main` before merge (as in the #209 → #210 → #211 wave).

## Related

- `docs/pr-merge-gate.md` — dual-gate modus operandi (human)
- `docs/project-facts.json` — machine-readable e2e/CI flags for `check:docs-drift`
- `.cursor/rules/011-coderabbit-pr-gate.mdc` / `013-pr-review-correction-loop.mdc`
- `CONTRIBUTING.md` — contributor merge checklist
