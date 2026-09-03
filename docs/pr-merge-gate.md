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

| Source                                        | Trigger / notes                                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CodeRabbit** (`coderabbitai`)               | Real `APPROVED` / `COMMENTED` review on the latest head. A check that only says **“Review rate limited”** is never a completed review. Wait `N+buffer`, then `@coderabbitai review`. Bounded loop: 3 wait/re-trigger cycles, or a single wait exceeding 90 minutes.                                           |
| **CodeAnt** (`codeant-ai`)                    | Inline suggestions + quality-gate status. Treat **“🔄 Reviewing your PR…”** as in-progress — not quiescence.                                                                                                                                                                                                  |
| **Sourcery** (`sourcery-ai`)                  | Real inline `suggestion` / `nitpick` / `suggestion (bug_risk)` reviews. **`bug_risk` is a correctness bug.** Do **not** comment `@sourcery-ai review` while the 250k diff-characters / 7-day budget is exhausted. Auto-posted “Reviewer’s Guide” is **not** a real review and cannot stand in for CodeRabbit. |
| **Copilot** (`copilot-pull-request-reviewer`) | Inline PR review comments. Wait if the review check is still pending on the current head.                                                                                                                                                                                                                     |
| **DeepSource** (`deepsource-io`)              | **Mandatory:** first line of a top-level comment exactly `@deepsourcebot review` on open and after every fix push. Team AI Review is on-demand; static analysis alone does not count. Dashboard JavaScript analyzer stays off.                                                                                |
| **CodeScene**                                 | Address actionable quality-gate / review comments when the check runs. Docs-only PRs may skip with no app code.                                                                                                                                                                                               |
| **Socket Security**                           | Actionable alerts when they block merge.                                                                                                                                                                                                                                                                      |
| **Cursor Bugbot**                             | When explicitly requested.                                                                                                                                                                                                                                                                                    |
| **Greptile / Codex**                          | Address findings when a real review lands. Skip and document in the disposition comment when trial or usage limits return no review.                                                                                                                                                                          |
| **Human reviewers**                           | Concrete fix requests stay in scope while open. An active human `CHANGES_REQUESTED` on the current head blocks merge the same as a bot one.                                                                                                                                                                   |

## Arrival wait (PR #299 lesson)

Do **not** merge while an in-scope bot still shows an in-progress review on the
**current** head. Confirmed miss on PR #299: required CI and quality gates were
green, GraphQL threads were empty, and the PR was squash-merged; CodeAnt was
still “🔄 Reviewing…” and Greptile had not finished arriving. A P2 (missing
**Impact** on a meeting-note entry) landed after merge.

Arrival wait includes:

- CodeAnt / Greptile / Copilot / CodeScene / CodeRabbit checks still pending or
  labeled “Reviewing” on the current head
- A CodeRabbit **“Review rate limited”** placeholder (never a completed review)
- A DeepSource AI Review that was never attempted on this head

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
   - **(b)** the optional-CodeRabbit fallback: CodeRabbit has produced no real
     review after **either** 3 failed wait/re-trigger cycles **or** a single
     wait exceeding 90 minutes, **and** Sourcery has a real, non-rate-limited
     review on that head with everything resolved; **or**
   - **(c)** the 2026-09-03 CodeRabbit-skip (standing policy): the same 3-cycle /
     90-minute threshold as (b) has already been met, **and** Sourcery
     **cannot** stand in (budget exhausted, or no real Sourcery review is
     available), **and** at least one other in-scope bot has a real review on
     the current head with all actionable findings resolved, **and** no
     in-progress late-bot wave remains. A documented CodeRabbit UI hang does
     **not** skip that threshold.
     A `CHANGES_REQUESTED` CodeRabbit review on the **latest** head is **never**
     waived by (b) or (c).
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

A `CHANGES_REQUESTED` review (bot or human) **never** satisfies quiescence by
itself. After fixing its findings, wait for a non-requesting review on a
**later** head. Thread resolution alone does not moot `CHANGES_REQUESTED`.

## CodeRabbit rate-limit loop

1. Parse **`Next review available in: N minutes`** (or similar).
2. Wait at least `N` minutes plus a 2–5 minute buffer.
3. Re-poll issue comments and `pulls/N/reviews` for `coderabbitai[bot]` on the
   **current** head SHA.
4. Post a clean top-level `@coderabbitai review`.
5. Repeat up to **3** wait/re-trigger cycles on the same head. Document each
   attempt in a PR comment.
6. After 3 failed cycles, or a single wait exceeding 90 minutes, with no real
   CodeRabbit review yet on this head: apply predicate clause **(b)** or **(c)**
   and write a disposition comment (timestamps, cycles, who is standing in).

Org-wide fair-use limits can rate-limit **other** open PRs. Budget the wait;
do not assume a second PR’s cooldown is independent.

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
- A CodeRabbit “Review rate limited” check
- CodeAnt / Greptile / Copilot still “Reviewing” on the current head
- `gh pr merge --admin` except a documented exception (for example a stale
  CodeRabbit `CHANGES_REQUESTED` dismiss that returns 403)
- Husky bypass (`--no-verify`)

## Related

- `.cursor/rules/011-coderabbit-pr-gate.mdc` — authoritative predicate
- `.cursor/rules/013-pr-review-correction-loop.mdc` — correction loop
- `.cursor/rules/012-dependabot-pr-gate.mdc` — Dependabot (same dual gate)
- `docs/ci-branch-governance.md` — required checks and live ruleset
- `CONTRIBUTING.md` — contributor checklist
- `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md` — agent pointers
- `docs/audits/2026-08-03-post-merge-scientific-integrity-review.md` — PR #213
