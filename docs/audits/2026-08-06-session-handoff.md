# Session Handoff — 2026-08-06

Baseline SHA at session start: `c11857327b82669da84adcad6a8e12e7b1eece9e`. Written mid-session,
while blocked purely on a GitHub Actions infrastructure outage (see §6) — everything else is
either merged, pushed-and-CI-pending, or explicitly deferred with a reason. Whoever picks this
up next (a future session, a teammate) should be able to resume from §7 without re-deriving
anything above it.

---

## 1. What this session actually was

Two consecutive `/plan`-mode master prompts, executed back to back:

1. A 29-section UI/UX/accessibility/architecture master prompt → scoped down (via clarifying
   questions) to **6 PRs**: #228-233. All six implemented, all six driven through the standard
   PR-correction-loop (CodeRabbit/CodeAnt/Qodo/Sourcery/DeepSource) to quiescence.
2. A second, larger 24-section "Evidence-First Stabilization" master prompt, framed as a fresh
   planning cycle. Investigated via 3 parallel Explore agents against **13 stated hypotheses
   (H1-H13)** — all 13 confirmed or partially confirmed with file:line evidence (full text is in
   this conversation's history, not reproduced here — the important part is that none of it has
   been _implemented_ yet; see §8). The user chose, via `AskUserQuestion`:
   - **Full 9-workstream maximalist program** (not the scoped subset I recommended).
   - **Proceed with a destructive Dexie schema reset anyway**, despite evidence that the
     current v5-v7 migrations are real, working, ADR-backed (0016/0017/0018) — not "debt" as
     the master prompt's own framing claimed. This is the user's informed, explicit decision;
     documented in the plan file for the record, not to be re-litigated.
   - **Finish the active PR wave (#228-233) before starting the 9 new workstreams.**

The full 9-workstream plan (Phases 1-9, workstreams A-I) is written to
`/home/pc/.claude/plans/claude-code-cli-happy-crayon.md` and was approved via `ExitPlanMode`.
**None of workstreams A-I have started yet** — this session has been entirely occupied by
Phase 0 (finishing the PR wave) plus a P0 bug the user reported mid-flight (see §3).

---

## 2. PR inventory (current as of this doc)

| PR   | Branch                                       | State                                       | What's left                   |
| ---- | -------------------------------------------- | ------------------------------------------- | ----------------------------- |
| #228 | `fix/status-banner-header-offset`            | **Merged** to main                          | —                             |
| #231 | `feat/research-cancel-control`               | **Merged** to main                          | —                             |
| #232 | `feat/chart-accessible-tables`               | **Merged** to main                          | —                             |
| #229 | `feat/nav-naming-cleanup`                    | Open, merge conflict resolved+pushed        | Waiting on CI (blocked by §6) |
| #230 | `feat/settings-sticky-devmode`               | Open, mobile-overlap regression found+fixed | Waiting on CI (blocked by §6) |
| #233 | `feat/reduced-motion-support`                | Open, merge conflict resolved+pushed        | Waiting on CI (blocked by §6) |
| #234 | `fix/cancelled-report-scientific-integrity`  | Open, **new** — not part of original wave   | Waiting on CI (blocked by §6) |
| #235 | `docs/comprehensive-update-and-release-prep` | Open, **new** — this doc lives here         | Waiting on CI (blocked by §6) |

Recommended merge order once CI is trustworthy again: **#230 → #229** (both touch `Header.tsx`,
land consecutively) **→ #233** (touches `LoadingIndicator.tsx`, already conflict-resolved
against the #230/#229 state) **→ #234** (independent, but touches files #229/#230 don't) **→
#235** (docs-only, safe to land anytime, put last only because it documents the others).
After each merge, remaining branches will show `mergeStateStatus: BEHIND` (this repo's ruleset
has `strict_required_status_checks_policy: true`) — update each via
`gh api -X PUT repos/qnbs/AI-Research-Orchestrator/pulls/<N>/update-branch` and wait for fresh
CI before merging the next one.

---

## 3. The P0 bug (#234) — what it was, why it mattered, how it was found

The user reported, mid-session, a detailed bug report (in German) about PR #231 (already
merged): cancelling a running research pipeline with a partial report already collected set
`reportStatus: 'done'` — **identical to a normally completed report**. Verified against the
actual merged code before touching anything (`src/lib/researchStreamFailure.ts`,
line ~102: `setReportStatus(finalReport ? 'done' : 'idle')`). Confirmed via a dedicated Explore
agent that the blast radius was larger than the user's own report described — a **second,
independent instance of the same bug** existed in `handleRestoreCheckpoint`
(`useResearchSession.ts`), unconditionally setting `'done'` on checkpoint restore.

Fix: new `ReportStatus.partial` value + `ResearchReport.completionStatus`/`cancelledAtPhase`/
`cancelledAt` marker, documented in full as **ADR 0021**
(`docs/adr/0021-partial-report-completion-state.md`, also in this session's #235 branch). See
that ADR for the complete design rationale — don't re-derive it here.

**A bot caught a real follow-up bug during review**: CodeAnt flagged that adding `'partial'` to
`OrchestratorView`'s `showReport` gate rendered the full `ChatInterface`, but `useChat`'s
session-creation effect is (deliberately) still gated on `=== 'done'` only — so a partial
report's chat box was fully interactive but silently dropped every message. Fixed by replacing
the chat accordion's content with an explanatory message when `completionStatus === 'partial'`.
This is a good example of why every bot finding on this branch got verified against current
code rather than dismissed or blindly applied — see the general PR-correction-loop convention.

---

## 4. Real regressions found and fixed via CI, not review bots

Two rounds of genuine CI-caught bugs on #230, worth understanding before touching
`SettingsView.tsx`'s sticky action bar again:

1. **First fix attempt** (chrome-height threading via a new `ChromeHeightContext`, exact-pixel
   `top: {chromeHeight}px`): caused 3 new mobile-chrome E2E failures (confirmed via CI run
   history — the run immediately before this change was clean). Root cause: setting sticky
   `top` to an _exact_ measured pixel value is fragile — any measurement smaller than the
   original static assumption (the common no-banner case) makes the bar stick differently with
   no benefit, and sticky positioning directly controls real viewport coordinates (unlike
   `<main>`'s own exact-pixel `padding-top`, which only adds space and has shipped fine).
2. **Second fix** (CSS `max()` floor: `top-[max(9rem,var(--chrome-height,0px))]`, no React
   Context needed — a `--chrome-height` custom property on `<main>` is enough since CSS
   variables inherit): reduced but didn't eliminate the failures. The retry logs showed
   _multiple_ competing fixed/sticky elements (header `z-20`, the sticky bar itself `z-10`,
   bottom nav `z-30`, even a toast notification) all fighting for space on the 390×844
   mobile-chrome E2E viewport.
3. **Actual fix**: `static md:sticky` — the bar simply isn't sticky at all below the `md:`
   breakpoint. The long-scroll convenience it exists for matters far more on desktop's taller
   viewports; removing it from the mobile layout equation entirely eliminates this whole class
   of overlap regardless of exactly which other fixed element a given retry attempt landed
   under. `ChromeHeightContext.tsx` was deleted (dead code after this design settled on a plain
   CSS variable, no React plumbing).

`OrchestratorView`/`ReportDisplay`/`useChat`/etc. were **not** touched by this — this was scoped
entirely to `AppLayout.tsx` (added `--chrome-height` custom property) and `SettingsView.tsx`
(the sticky bar's className).

---

## 5. Merge conflicts resolved this session

Both were genuine (verified via a real local `git merge --no-commit`, not just trusted GitHub's
`mergeable` flag blindly — that flag was accurate both times once checked):

- **#233 vs `main`**: `src/components/LoadingIndicator.tsx`/`.test.tsx` — #231 (already merged)
  and #233 independently touched the same file (cancel-button prop vs. reduced-motion spinner
  rewrite). Trivial import-line-only conflict in the `.tsx`; the `.test.tsx` needed a real
  three-way merge combining both describe blocks (kept the more defensive `beforeEach`/
  `afterEach` scrollIntoView-mock pattern over the alternative `beforeAll`/`afterAll`).
- **#229 vs `main`**: `src/i18n/orchestratorTranslations.ts` — #229 and #231 (already merged)
  each independently _extracted_ this file from the old monolithic `translations.ts` on their
  own branches. Trivial resolution: main's version just has two extra keys
  (`orchestrator.cancel.button` EN+DE) #229's branch predates; kept both.

**Lesson for next time**: when GitHub reports `mergeable: CONFLICTING`, verify with a real
local `git merge --no-commit --no-ff origin/main` (then `git merge --abort` if just checking)
rather than assuming — `git merge-tree <base> <a> <b>` gave a false "no conflict" reading on
this session's older local git version; the direct `git merge` attempt was reliable.

---

## 6. GitHub Actions infrastructure outage (external, not this repo's fault)

Starting mid-session, most CI jobs across **multiple unrelated PRs** (#230, #234) began failing
at the "Set up job" step with `Service Unavailable` / `Failed to resolve action download info` —
before any of this repo's own code, tests, or workflow logic ever ran. Confirmed via
`gh run view --job <id>` on several independent jobs (Playwright E2E, PWA E2E, CodeQL, gitleaks,
Production Build) — identical failure signature every time, at job setup, across totally
different job types. This is unambiguously a GitHub-side outage, not a code regression.

Re-ran affected jobs twice (`gh run rerun <id> --failed`) as the outage seemed to be settling,
but the user confirmed mid-session that GitHub was still actively working on it ("nein github
arbeitet doch noch weiter an der infra leider") — so further aggressive re-running was
deliberately stopped to avoid wasting attempts against a still-degraded service.

**Before trusting any "green" or "red" check on #230/#234 in a future session: re-verify against
a fresh `gh pr checks <N>` rather than assuming the last-seen state is current** — several
checks cycled through fail → cancel → pass across this outage as GitHub's queue processed
retries. Do not re-run jobs reflexively; check the actual failure reason first
(`gh run view --job <id>`, look for `Service Unavailable` vs. a real assertion failure) — this
session's own `#230` sticky-bar regression _was_ a real code failure sitting right alongside
the infra noise on the same PR, and would have been wrongly dismissed as "just infra" without
checking each one individually.

---

## 7. Immediate next steps (resume here)

1. Check `gh pr checks 230/229/233/234/235` fresh. If GitHub's infra has genuinely recovered
   (real pass/fail on every job, no more `Service Unavailable` job-setup failures), re-run
   whatever's still stuck on the old outage (`gh run rerun <id> --failed`).
2. Merge in the order given in §2, updating each branch (`update-branch` API) and waiting for
   fresh CI between merges per this repo's `strict_required_status_checks_policy`.
3. Once #228-235 are all on `main`: this session's Phase 0 is complete. Decide with the user
   whether to (a) begin Workstream A (runtime resilience — H1/H2, `abortUtils.ts`/
   `externalFetch.ts`) per the approved plan, or (b) cut the `v0.4.1` → next-version release
   first (CHANGELOG is ready in #235; version bump not yet chosen or executed — see §9) —
   the approved plan's own ordering puts the release _after_ all stabilization work, not after
   just the PR wave, so don't assume release-first without checking with the user.
4. The 9-workstream plan (§1) is otherwise untouched — Workstreams A-I (runtime resilience,
   structured AI-output validation, scientific claim integrity, the destructive Dexie reset,
   XSS/rendering hardening, context budgets, `geminiService.ts` decomposition, accessibility
   verification, CI/governance/release) have not started. Full detail is in the plan file, not
   duplicated here.

---

## 8. Explicitly deferred (with reasons — don't re-litigate without new evidence)

- **CSV/insights export watermark** (#234's scope): not applied — tabular article/insight data
  has much lower "reads as finished" risk than the synthesis prose export paths, which do carry
  the `PARTIAL REPORT` watermark. Revisit only if a real report of CSV-export confusion surfaces.
- **Playwright E2E test for the cancel-mid-stream banner** (#234's scope): the shared network-
  mock fixtures (`src/test/e2e/fixtures/networkMocks.ts`) have no controllable delay mechanism,
  so a reliable (non-flaky) test needs that infrastructure added first. The state-machine fix
  itself has full unit/integration coverage through the real hook
  (`useResearchSession.test.tsx`) — that's where the actual bug lived.
- **Sourcery "high-level feedback" backlog** (P2/P3 items across #228-233): full list in
  `docs/audits/2026-08-06-sourcery-highlevel-backlog.md` — centralizing `developerMode` gating,
  `validViews` type-deriving, `LoadingIndicator`'s i18n-key genericization, `ChartAccessibleTable`
  typing tightening, etc. None are bugs; all are legitimate but non-blocking follow-ups.
- **Track B** (governance ruleset changes — stale-review dismissal, CODEOWNERS): flagged from an
  earlier session segment, still needs the user's separate explicit approval before any GitHub
  settings mutation. Not touched this session.

---

## 9. Release prep status

- `package.json` is still `0.4.1`. **No version bump has been chosen or executed.** Given the
  scope landing in this wave (a P0 scientific-integrity fix + 5 feature/fix PRs), a `0.5.0`
  minor bump reads more accurate than a patch bump, but this is a recommendation, not a decision
  — confirm with the user before bumping.
- CHANGELOG.md's `[Unreleased]` section already has entries for every PR in this wave (#228-234),
  added in #235 — no further CHANGELOG work needed before cutting a release, just moving the
  `[Unreleased]` heading to a dated version heading at release time.
- **No git tag, no GitHub Release has been created.** Deliberately held off: tagging a release
  now would point at a `main` SHA that's still missing #234's P0 fix and the rest of the wave —
  doing so would ship (or at least tag as "released") a build that still has the cancelled-
  report bug on `main`. Cut the release only after §7 step 2 is complete.

---

## 10. Session-specific process notes (for whoever's driving)

- **Pre-push hook optimization** (`.husky/pre-commit`/`.husky/pre-push`, committed on the #230
  branch's history, not yet on `main`): pre-commit now runs the _full_ `pnpm run lint` (not just
  `lint-staged`) and writes `git write-tree`'s output to `node_modules/.cache/.last-verified-tree`
  on success; pre-push compares `HEAD^{tree}` against that marker and skips the redundant
  typecheck/lint/format re-run when they match (any `--no-verify` commit, or any tree that
  differs, still falls through to the full check). Cut push time from ~1-2 minutes to ~3.5
  seconds for the common commit-then-immediately-push case. This lands on `main` whenever #230
  merges — until then, branches forked before it exists still pay the old double-check cost.
- **Always verify current branch before editing** (`git branch --show-current`) — this session
  had two real mix-ups: an edit meant for #234 landed on #230's branch first (caught before
  commit, discarded, redone on the right branch), and vice versa later. With 5+ branches in
  flight simultaneously, this is an easy, recurring mistake — check first, every time.
- **`gh run rerun <id> --failed` fails loudly and clearly** (`cannot be rerun; This workflow is
already running`) when a rerun is already in flight — safe to call speculatively, no risk of
  double-triggering.
