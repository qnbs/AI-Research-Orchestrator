# SonarCloud Setup — TODO for a Future Session

**Status as of 2026-07-22: SonarCloud is already connected to this repo, but not
configured.** It's running in **Automatic Analysis** mode (SonarCloud's zero-config
GitHub-App onboarding — no `sonar-project.properties`, no CI workflow step, nothing in
this repo's tree drives it), and its default "Sonar way" Quality Gate is now failing PRs
on metrics that were never deliberately tuned for this project. Per instruction, **do not
try to fix the current failure by changing code to satisfy an unconfigured gate** — the
fix is proper setup, not code contortion. This document is the analysis + action plan for
that setup, to be picked up and executed in a dedicated future session.

## What's happening right now (verified, not assumed)

- No `sonar-project.properties` file exists in the repo, and no `.github/workflows/*.yml`
  file has a Sonar step. `gh api .../check-runs` for the current PR confirms the check is
  still real and running, just via the GitHub App's automatic mode, not our own CI.
- The PR #69 failure was: **"7.2% Duplication on New Code (required ≤ 3%)"** — a single
  failed condition on SonarCloud's built-in default gate. Likely sources of the flagged
  duplication in that diff: `scripts/check-i18n-ratchet.mjs` deliberately mirrors
  `scripts/check-bundle-budget.mjs`'s structure (intentional, for consistency with an
  existing repo convention), and the new `en`/`de` translation key blocks in
  `translations.ts` are structurally parallel by design (same keys, different string
  values) — exactly the shape `src/i18n/translations.ts` has always had, at any size.
  Neither is a real quality problem; both are false positives against a generic default
  gate that was never tuned for this codebase's actual conventions.
- This repo is a **public** GitHub repository (confirmed via `gh repo view`), which
  matters directly for SonarCloud's free-tier terms (see below).
- `src/` alone is ~38,500 lines (TS/TSX only, not counting config/docs) as of this
  writing — re-measure at execution time, don't reuse this number without checking, since
  it will have grown across the in-progress i18n migration and other work.

## Open question worth resolving before investing further: does Sonar add real value here?

This repo's PR CI **already** runs `CodeAnt - Quality Gates`, `CodeAnt - SAST`,
`CodeAnt - SCA`, `CodeAnt - SCR`, and `CodeAnt - Test Coverage` on every PR, alongside
CodeQL (security-extended queries), CodeRabbit, and Greptile. There is real thematic
overlap between "CodeAnt - Quality Gates"/"CodeAnt - Test Coverage" and what SonarCloud
provides. Before spending a session wiring Sonar up properly, the future session should
explicitly answer: **what does SonarCloud add that CodeAnt doesn't already cover?**
Candidates worth checking (don't assume — read CodeAnt's actual current output on a
recent PR and compare against what Sonar's dashboard would show):

- Long-term code-quality/technical-debt trend tracking across the project's history
  (Sonar's dashboards are stronger here than most single-PR-scoped bots).
- A mature, well-known "Security Hotspots" review workflow (distinct from CodeQL's
  alert model — Hotspots require a human accept/fix decision per finding, not just a
  pass/fail).
- Cognitive complexity metrics per function/file (a metric CodeAnt may not surface).
- If the answer is "mostly redundant with CodeAnt," the honest options are: (a) configure
  Sonar properly anyway for the metrics it uniquely does well, accepting some overlap,
  (b) disable/remove the Sonar GitHub App integration entirely and rely on CodeAnt +
  CodeQL, or (c) keep Sonar but make it explicitly advisory/non-blocking (see below).
  Make this decision deliberately, don't just default to "keep everything."

## Recommended target end state (if the answer above is "yes, keep it")

1. **Switch from Automatic Analysis to CI-based Analysis.** Automatic Analysis cannot
   import real test coverage, cannot use a tuned Quality Profile, and has limited
   exclusion-pattern control — it treats this repo like a generic, unknown JS/TS project.
   CI-based analysis (an explicit workflow step) is required to fix all of that.
2. **Add a `sonar-project.properties`** (or equivalent `-D` args on the scan action) with,
   at minimum:
   - `sonar.projectKey` / `sonar.organization` (from the SonarCloud project settings —
     these already exist since the project is connected; just need to be read off the
     dashboard, not invented).
   - `sonar.sources=src` and `sonar.tests` pointed at the colocated `*.test.ts(x)` pattern,
     matching this repo's actual layout (no separate `test/` root except `src/test/e2e/`).
   - `sonar.exclusions` / `sonar.coverage.exclusions` for `dist/**`, `coverage/**`,
     `node_modules/**`, generated PWA icons, and — deliberately — `scripts/*.mjs` if the
     mirrored-shape duplication between the check-\*.mjs scripts should be explicitly
     accepted rather than re-triggering the same false positive.
3. **Import real coverage.** `vitest.config.ts`'s `coverage.reporter` currently only
   includes `['text', 'json', 'html', 'json-summary']` — **no `lcov`**. Add `'lcov'` to
   that array (Sonar's generic JS/TS coverage import reads an `lcov.info` file via
   `sonar.javascript.lcov.reportPaths`), then point the Sonar scan step at the coverage
   run's output directory. Without this, Sonar's "Coverage on New Code" metric is always
   blank/unknown, regardless of this repo's real, gated 85%/78%/84% (lines/branches/
   functions) coverage.
4. **Tune or replace the Quality Gate.** Don't leave the default "Sonar way" gate active
   as-is — either adjust its duplication threshold (or the specific conditions it
   checks) for this project's known, intentional patterns, or create a custom gate.
   Keep bug/vulnerability/security-hotspot conditions strict; loosen only what's
   demonstrably a false-positive source for this codebase's actual conventions.
5. **Decide blocking vs. advisory, and use the existing promotion-trigger pattern.**
   This repo already has a precedent for exactly this situation:
   `.github/workflows/e2e.yml`'s Playwright job runs `continue-on-error: true` until
   proven stable, with the promotion trigger documented in `docs/e2e-ci-backlog.md`.
   Do the same for Sonar: non-blocking (not a required check in branch protection) until
   the custom Quality Gate has run clean across several real PRs, then promote to
   required. Don't make it required on day one of a freshly-tuned gate.
6. **SHA-pin the scan action**, per this repo's existing convention for every action in
   `security.yml`/`deploy.yml` (e.g. `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
   # v7`). Use `SonarSource/sonarqube-scan-action` (or whichever action SonarCloud's own
   current onboarding docs recommend at execution time — **re-check this, the
   recommended action name/repo has changed before**), pinned to a full commit SHA with
   a version comment.
7. **New secret**: CI-based analysis needs a `SONAR_TOKEN` repository secret (Automatic
   Analysis needs none, since the GitHub App handles auth itself). Adding a secret is an
   admin action only the user can do — flag it clearly as a manual prerequisite step,
   don't assume it can be scripted.
8. **Placement**: add as its own job in `.github/workflows/security.yml` (alongside
   CodeQL/dependency-review/pnpm-audit/gitleaks — the existing thematic grouping for
   "scanning" jobs), rather than a new top-level workflow file, unless the future session
   finds a concrete reason to split it out (e.g. needing a different trigger/permissions
   set than the rest of that file).

## Free-tier terms — re-verify before committing to a plan

SonarCloud's free ("Sonar") plan has historically been fully-featured and unlimited for
public/open-source repositories (this repo qualifies, confirmed public) — including
branch analysis, PR decoration, and all core analyzers. Private repos have historically
had a lines-of-code cap on the free tier. **Do not trust these specifics without
re-checking SonarCloud's current pricing/limits page at execution time** — plan terms,
product naming ("SonarCloud" vs "SonarQube Cloud" — the dashboard URLs seen in this PR's
check output already show `sonarcloud.io` while the product may be rebranding), and free-
tier boundaries are exactly the kind of thing that changes between when this note was
written and when it's acted on.

## Action plan for the future session (in order)

1. Answer the "does this add real value over CodeAnt" question above with concrete
   evidence (read both tools' actual output on a real recent PR), and decide keep/drop/
   advisory before doing any configuration work.
2. If keeping: log into the SonarCloud dashboard for this project, note the exact
   `projectKey`/`organization` values, and check what Quality Profile/Gate is currently
   assigned.
3. Add `'lcov'` to `vitest.config.ts`'s coverage reporters; confirm `coverage/lcov.info`
   is produced by `pnpm run test:coverage`.
4. Write `sonar-project.properties` (or workflow-level equivalent args) with the
   exclusions and coverage path above.
5. Add the SHA-pinned scan action as a new job in `security.yml`, gated on the
   `SONAR_TOKEN` secret existing (the user adds this secret manually first).
6. Tune the Quality Gate (custom gate or edited default) to eliminate the specific false
   positives already observed (duplication on intentionally-parallel i18n/script code),
   while keeping bug/vulnerability/hotspot conditions strict.
7. Run it non-blocking across a handful of real PRs; once clean and trusted, add it to
   required status checks in branch protection, mirroring the E2E promotion-trigger
   pattern in `docs/e2e-ci-backlog.md`.
8. Update this document (or replace it with a short "done, see security.yml" note) once
   complete — don't leave it as stale TODO once the work is finished.
