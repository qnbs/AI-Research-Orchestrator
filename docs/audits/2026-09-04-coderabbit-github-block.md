# CodeRabbit GitHub-block vs policy — 2026-09-04

**Document type:** Maintainer + agent operating note (not a product-behavior change).  
**Status:** Standing workaround until the GitHub ruleset and/or CodeRabbit quota actually change.  
**Related:** `docs/pr-merge-gate.md`, `.cursor/rules/011-coderabbit-pr-gate.mdc` clause **(d)**, `docs/ci-branch-governance.md` (`dismiss_stale_reviews_on_push`).  
**Evidence PRs:** #301, #308, #309 (and earlier #213 / #290 / #291).

This is **not** permission to skip required CI, ignore a `CHANGES_REQUESTED` review on the **latest** head, or leave unresolved GraphQL threads.

---

## What “the CodeRabbit quirk” is

Two independent mechanisms stack. Agents treat them as one merge wall.

### 1. Org-wide CodeRabbit quota (product)

Team allowance observed on this repo in September 2026: **about 1 included review per hour**. A green CodeRabbit check that only says **“Review rate limited”** is a **terminal** placeholder. It is **not** “Reviewing…”. It is **not** a completed review. Policy already says it is **not a hard merge blocker** (`011` **(d)**).

Re-posting `@coderabbitai review` while the quota is exhausted does not summon a real review. Waiting 3 cycles / 90 minutes solely for rate-limit was **retired** as a merge instruction (late prompt §0.2 aligned in #306). Do not invent dummy diffs to reset the bot.

Sourcery cannot stand in: the 250k / 7-day review budget is exhausted (as of 2026-09-03). Do **not** `@sourcery-ai review`. Auto “Reviewer’s Guide” is not a real review.

### 2. GitHub `BLOCKED` from a **superseded** `CHANGES_REQUESTED` (ruleset)

CodeRabbit often lands a real `CHANGES_REQUESTED` on the **first** head (findings are then fixed on a later commit). `mainrules` (id `20291814`) still has **`dismiss_stale_reviews_on_push: false`**. GitHub’s `reviewDecision` / `mergeStateStatus` are **PR-global**, so they stay `CHANGES_REQUESTED` / `BLOCKED` even when that review’s `commit_id` is no longer the head.

Policy quiescence is **latest-head**. A superseded `CHANGES_REQUESTED` is **not** a policy block once its findings are disposed and **(a)/(b)/(c)/(d)** is evaluated on the current SHA. **(d)** covers “no real CodeRabbit review on this head” (including rate-limit). **(d) never waives an active latest-head `CHANGES_REQUESTED`.**

Dismissing the stale review via `PUT .../reviews/ID/dismissals` returns **403** on this repo’s App / Actions installation (confirmed #301, #308). That is this installation’s permissions, not a blanket GitHub restriction.

---

## What agents must do (until the ruleset flips)

1. **Fix** every actionable finding on the review that landed (threads + body-only / outside-diff). Reply and resolve threads. Record dispositions.
2. **Push** the fix commit. Re-post `@deepsourcebot review` (first line exact). Best-effort `@coderabbitai review` once — do not loop on rate-limit.
3. **Wait only for required blocking CI** on the latest head (`deploy.yml` Typecheck/Lint/Tests + Production Build, Chromium E2E, cross-browser, axe, PWA service-worker registration (`pwa-e2e.yml`), CodeQL, Dependency Review, `pnpm audit (high+)`, gitleaks) **and** the arrival wait for bots still **Reviewing** (not rate-limited). `pwa-e2e.yml` is a blocking workflow even when it is not yet a `mainrules` required-status context — do not `--admin` before it is green.
4. If CodeRabbit is rate-limited **or** has no real review on this head, **and every** `CHANGES_REQUESTED` (bot or human) `commit_id` is **superseded** — **no** active latest-head change request remains: GitHub `BLOCKED` is a **ruleset artifact**. Try dismiss; on **403**, squash-merge with `gh pr merge N --squash --admin --delete-branch` and write **(d)** in the disposition comment. This is the documented exception in `docs/pr-merge-gate.md`, not a casual bypass. **(d) never waives a `CHANGES_REQUESTED` whose `commit_id` is the current head.**
5. **Do not stall the remaining audit wave** on CodeRabbit. Continue the next concern PR. Dual-gate CI still applies.

---

## How to actually remove the GitHub half (maintainer)

Enable **Dismiss stale pull request approvals when new commits are pushed** on `mainrules`. Exact PUT (full `rules` array — a partial PUT wipes other rules) lives in `docs/ci-branch-governance.md`. Needs **Administration: write** (fine-grained PAT or an App installation that has that permission). This repo’s current integration token **cannot** do it (403).

After readback is `true`, set `docs/project-facts.json` `ci.dismissStaleReviewsOnPushLive` to `true` in the same follow-up. Do **not** enable CODEOWNERS reviews.

That flip makes a later-head push drop the stale CodeRabbit `CHANGES_REQUESTED`, so `mergeStateStatus` can become `CLEAN` without `--admin`.

---

## How to actually remove the quota half

Not solvable in-repo. Options for the human maintainer:

- Raise the CodeRabbit org/team included-review allowance (currently ~1/hour under fair use).
- Accept **(d)** as the steady state for this solo-dev repo and stop treating the placeholder as a human pause.
- Do not buy a review by opening extra PRs or force-pushing empty commits.

---

## Observed pattern (2026-09)

| PR   | Head after fixes      | CodeRabbit on latest head                                                                        | GitHub `mergeStateStatus` | Merge path                    |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------ | ------------------------- | ----------------------------- |
| #301 | later than CR SHA     | rate-limited placeholder                                                                         | `BLOCKED`                 | `--admin` squash; 403 dismiss |
| #308 | `0cdd284`             | rate-limited; CR `CHANGES_REQUESTED` on superseded SHAs                                          | `BLOCKED`                 | `--admin` squash              |
| #309 | `c5bcc3f` → `7be11a0` | `CHANGES_REQUESTED` on superseded `5926a4c`; latest-head **Review rate limited**; findings fixed | `BLOCKED`                 | `--admin` squash 2026-09-04   |

---

## Out of scope

- Lowering required CI.
- Waiving a **latest-head** `CHANGES_REQUESTED` without a fix push.
- Enabling `require_code_owner_review`.
- `@sourcery-ai review` while the 7-day budget is exhausted.
