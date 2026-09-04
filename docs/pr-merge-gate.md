# PR merge gate (dual gate)

Human modus operandi for landing a pull request on `main`. Complements the
required-check inventory in `docs/ci-branch-governance.md`.

**Authoritative quiescence predicate:** `.cursor/rules/011-coderabbit-pr-gate.mdc`
step 7. This document and `013` / `docs/ci-branch-governance.md` **restate** that
predicate — they do not vary it.

**Correction-loop procedure:** `.cursor/rules/013-pr-review-correction-loop.mdc`.

Machine-readable path: `docs/project-facts.json` → `ci.mergeGatePath`.
`pnpm run check:docs-drift` fails if this file is missing or if agent guides
drop the pointer.

## Dual gate (neither half is enough)

Merge to `main` only when **both** are true on the **same** latest head SHA
(the PR's current head commit, not a separately computed merge-tree hash):

1. **Required blocking CI is green** — inventory and live ruleset contexts in
   `docs/ci-branch-governance.md`. Read job logs for advisory jobs; a green
   badge alone is not proof.
2. **Latest-head review quiescence** — the predicate in `011` step 7, including
   the **arrival wait**. GraphQL `reviewThreads` returning 0 unresolved is
   **necessary but not sufficient**.

Green CI with bots still “Reviewing…” is not mergeable. A clean thread sweep
with a red required check is not mergeable.

## In-scope review sources

Address every actionable item from these when present:

| Source                                        | Trigger / notes                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CodeRabbit** (`coderabbitai`)               | Prefer a real `APPROVED` / `COMMENTED` review on the latest head. A **“Review rate limited”** check is never a completed review **and is not a hard merge blocker** (`011` clause **(d)**). Best-effort `@coderabbitai review`; do not spam while the org quota is exhausted. A `CHANGES_REQUESTED` review on the **latest** head is never waived. |
| **CodeAnt** (`codeant-ai`)                    | Inline suggestions + quality-gate status. Treat **“🔄 Reviewing your PR…”** as in-progress — not quiescence.                                                                                                                                                                                                                                       |
| **Sourcery** (`sourcery-ai`)                  | Real inline `suggestion` / `nitpick` / `suggestion (bug_risk)` reviews. **`bug_risk` is a correctness bug.** Do **not** comment `@sourcery-ai review` while the 250k diff-characters / 7-day budget is exhausted. Auto-posted “Reviewer’s Guide” is **not** a real review and cannot stand in for CodeRabbit.                                      |
| **Copilot** (`copilot-pull-request-reviewer`) | Inline PR review comments. Wait if the review check is still pending on the current head.                                                                                                                                                                                                                                                          |
| **DeepSource** (`deepsource-io`)              | **Mandatory:** first line of a top-level comment exactly `@deepsourcebot review` on open and after every fix push. Team AI Review is on-demand; static analysis alone does not count. Dashboard JavaScript analyzer stays off.                                                                                                                     |
| **CodeScene**                                 | Address actionable quality-gate / review comments when the check runs. Docs-only PRs may skip with no app code.                                                                                                                                                                                                                                    |
| **Socket Security**                           | Actionable alerts when they block merge.                                                                                                                                                                                                                                                                                                           |
| **Cursor Bugbot**                             | When explicitly requested.                                                                                                                                                                                                                                                                                                                         |
| **Greptile / Codex**                          | Address findings when a real review lands. Skip and document in the disposition comment when trial or usage limits return no review.                                                                                                                                                                                                               |
| **Human reviewers**                           | Concrete fix requests stay in scope while open. An active human `CHANGES_REQUESTED` on the current head blocks merge the same as a bot one.                                                                                                                                                                                                        |

## Arrival wait (PR #299 lesson)

Do **not** merge while an in-scope bot still shows an in-progress review on the
**current** head. Confirmed miss on PR #299: required CI and quality gates were
green, GraphQL threads were empty, and the PR was squash-merged; CodeAnt was
still “🔄 Reviewing…” and Greptile had not finished arriving. A P2 (missing
**Impact** on a meeting-note entry) landed after merge.

Arrival wait includes:

- CodeAnt / Greptile / Copilot / CodeScene / CodeRabbit checks still pending or
  labeled “Reviewing” on the current head
- A DeepSource AI Review that was never attempted on this head

A CodeRabbit **“Review rate limited”** placeholder is a **terminal** state, not
“Reviewing”. It does **not** extend the arrival wait and is not a merge block
(clause **(d)**).

Wait until those reviews **arrive or fail**, then dispose every finding. A later
empty or approval-only review does **not** retract an earlier body-only finding
on the same head.

## Quiescence predicate (restated from `011` step 7)

Quiescence holds **if and only if all** of the following are true:

1. **Dual gate — CI half:** required blocking CI is green on the latest head.
2. **Primary CodeRabbit condition** — one of:
   - **(a)** a real, non-`CHANGES_REQUESTED` CodeRabbit review (`APPROVED` or
     `COMMENTED`, with a review body that proves it is not a rate-limit
     placeholder) targets the latest head; **or**
   - **(b)** Sourcery stand-in: CodeRabbit has produced no real review on this
     head, **and** Sourcery has a real, non-rate-limited review on that head
     with everything resolved; **or**
   - **(c)** other-bot stand-in: Sourcery **cannot** stand in (budget exhausted,
     or no real Sourcery review is available), **and** at least one other
     in-scope bot has a real review on the current head with all actionable
     findings resolved, **and** no in-progress late-bot wave remains; **or**
   - **(d)** CodeRabbit is rate-limited **or** has produced no real review on
     this head — documented in the disposition comment. This is standing
     policy (2026-09-03): rate-limit is **not** a hard merge blocker.
     A `CHANGES_REQUESTED` CodeRabbit review on the **latest** head is **never**
     waived by (b), (c), or (d).
3. **`@deepsourcebot review` has been attempted** on the latest head (a recorded
   attempt). Static analysis alone does not satisfy this.
4. **No active human `CHANGES_REQUESTED`** targets the latest head (moot once
   superseded by a later non-requesting human review or explicit approval).
5. **Arrival wait is complete** — no in-scope bot is still in-progress on the
   current head.
6. **No other in-scope bot** has an unresolved item or active `CHANGES_REQUESTED`.
7. **Every GraphQL thread is resolved.**
8. **Every body-only finding** (CodeRabbit “outside diff range” comments, human
   top-level review bodies, or any finding with no thread ID) has a recorded
   disposition of `fixed`, `replied`, or `deferred` in the disposition ledger
   or a PR comment. Every `deferred` disposition carries a documented English
   rationale. A body-only finding with no tracked disposition blocks quiescence
   exactly like an unresolved thread.

A `CHANGES_REQUESTED` review (bot or human) that targets the **latest** head
**never** satisfies quiescence and is **never** waived by (b), (c), or (d).
After fixing, push a **later** head and re-evaluate **(a)/(b)/(c)/(d)** on
that SHA. Thread resolution alone does not moot a latest-head
`CHANGES_REQUESTED`. A non-requesting current-head review is sufficient
(**(a)**) but not required.
A `CHANGES_REQUESTED` review whose `commit_id` is a **superseded** SHA is not a
policy block once its findings are disposed **and** the current-head
CodeRabbit condition **(a)/(b)/(c)/(d)** holds. A newer real current-head
review is sufficient (**(a)**) but not required — **(d)** covers no real
CodeRabbit review on this head. **(d)** never waives an **active latest-head**
`CHANGES_REQUESTED`.

## GitHub `mergeStateStatus` vs policy

Policy quiescence is **latest-head**. GitHub’s `reviewDecision` /
`mergeStateStatus` are **PR-global**. While ruleset
`dismiss_stale_reviews_on_push` is **off** (`mainrules` id `20291814`), a
superseded CodeRabbit `CHANGES_REQUESTED` keeps `reviewDecision:
CHANGES_REQUESTED` and `mergeStateStatus: BLOCKED` even when that review’s
`commit_id` is not the current head (confirmed on PR #301: review `5107396133`
on `27f9ea6` while head was `fabb725`).

That GitHub block is **not** a policy block. Resolve it in this order:

1. Confirm the `CHANGES_REQUESTED` `commit_id` is **not** the current head and
   its findings are disposed.
2. `PUT .../pulls/N/reviews/REVIEW_ID/dismissals` (or GraphQL
   `dismissPullRequestReview`). App/integration tokens often return **403**.
3. If dismiss is 403 and the dual gate otherwise holds: squash-merge with
   `gh pr merge N --squash --admin` and write a disposition comment (this is
   the documented exception — not a casual bypass).
4. Standing maintainer fix: enable **Dismiss stale pull request approvals when
   new commits are pushed** on `mainrules` — see
   `docs/ci-branch-governance.md`. Until then, expect this GitHub/policy split
   on every CodeRabbit `CHANGES_REQUESTED` that is later fixed.

## CodeRabbit rate-limit (best-effort)

A **“Review rate limited”** check is not a completed review **and is not a hard
merge blocker** (clause **(d)**). Do not wait 3 cycles / 90 minutes solely
because CodeRabbit is rate-limited.

1. Best-effort: parse **`Next review available in: N minutes`** if present.
2. Post `@coderabbitai review` when the window has elapsed if you still want a
   real review. Do not spam while the org quota is exhausted.
3. If a real review arrives, fix findings as usual. `CHANGES_REQUESTED` on the
   **latest** head still blocks.
4. If CodeRabbit stays rate-limited or never reviews this head: record **(d)**
   in the disposition comment and continue the rest of the dual gate.

Org-wide fair-use limits can rate-limit **other** open PRs. Do not assume a
second PR’s cooldown is independent.

## Triggers after every fix push

| Comment (first line exact where noted) | When                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `@deepsourcebot review`                | **Always** on open and after every fix push                                                  |
| `@coderabbitai review`                 | Latest head lacks a real CodeRabbit review (missing, stale SHA, or rate-limited placeholder) |
| `@sourcery-ai review`                  | Latest head lacks a Sourcery review **and** the 250k / 7-day budget is **not** exhausted     |

Do not use `git commit --no-verify` or `git push --no-verify` to skip Husky.

## Collection (every pass)

```bash
# Unresolved threads with author
gh api graphql -f query='query { repository(owner:"qnbs", name:"AI-Research-Orchestrator") { pullRequest(number:N) { reviewThreads(first:100) { nodes { id isResolved comments(last:1) { nodes { databaseId author { login } body } } } } } } }'

# Every review body (grep outside-diff / CHANGES_REQUESTED / Reviewing)
gh api repos/qnbs/AI-Research-Orchestrator/pulls/N/reviews --paginate

# Latest CodeRabbit review
gh api repos/qnbs/AI-Research-Orchestrator/pulls/N/reviews --jq '[.[]|select(.user.login=="coderabbitai[bot]")]|sort_by(.submitted_at)|.[-1]'
```

Replace `N` with the PR number. Grep review bodies for `outside diff`
(case-insensitive) on **every** pass — those findings never appear as GraphQL
threads.

## Do not merge on

- Green required CI alone
- A GraphQL thread-only sweep
- Stale bot/human approval from an older SHA
- A CodeRabbit `CHANGES_REQUESTED` review on the **latest** head
- CodeAnt / Greptile / Copilot still “Reviewing” on the current head
- `gh pr merge --admin` except a documented exception (for example a stale
  CodeRabbit `CHANGES_REQUESTED` dismiss that returns 403)
- Husky bypass (`--no-verify`)
- A canceled required check (including `pnpm audit (high+)` aborted by a
  `pull_request` `edited` event). Do not PATCH the PR title or body while
  `security.yml` is in flight — that retriggers PR concurrency and cancels
  the audit (PR #302).

## Related

- `.cursor/rules/011-coderabbit-pr-gate.mdc` — authoritative predicate
- `.cursor/rules/013-pr-review-correction-loop.mdc` — correction loop
- `.cursor/rules/012-dependabot-pr-gate.mdc` — Dependabot (same dual gate)
- `docs/ci-branch-governance.md` — required checks and live ruleset
- `CONTRIBUTING.md` — contributor checklist
- `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md` — agent pointers
- `docs/audits/2026-08-03-post-merge-scientific-integrity-review.md` — PR #213
