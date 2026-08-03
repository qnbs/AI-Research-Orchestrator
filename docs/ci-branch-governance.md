# CI and branch governance (P1-7 / PR11)

Authoritative inventory of blocking gates, concurrency, artifacts, and maintainer
branch-protection expectations. Complements `docs/audit-governance.md`,
`docs/release-policy.md`, and `docs/e2e-ci-backlog.md`.

Machine-readable flags live in `docs/project-facts.json` (`ci.branchGovernancePath`,
`ci.cancelInProgressOnPullRequestOnly`, `e2e.crossBrowserAdvisory`) and are
enforced by `pnpm run check:docs-drift`.

## Blocking checks (must be green on latest head before merge)

Documented names match GitHub check titles. Settings → Branches / Rulesets
should require these (or their workflow job equivalents) for `main`:

| Check                                            | Workflow                      | Notes                                                               |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------- |
| Typecheck, Lint & Tests                          | `deploy.yml`                  | Includes `format:check`, coverage gate, coverage floors, docs-drift |
| Production Build                                 | `deploy.yml`                  | Bundle + CSP hash patch + `bundle:budget`                           |
| Playwright E2E                                   | `e2e.yml`                     | Chromium blocking suite                                             |
| Cross-browser (firefox / webkit / mobile-chrome) | `e2e-cross-browser.yml`       | Blocking since 2026-08-03 (`crossBrowserAdvisory: false`)           |
| Axe critical/serious smoke                       | `a11y.yml`                    | Separate a11y smoke                                                 |
| CodeQL                                           | `security.yml`                | `security-extended`                                                 |
| Dependency Review                                | `security.yml`                | PRs                                                                 |
| pnpm audit (high+)                               | `deploy.yml` + `security.yml` | High/critical only                                                  |
| Secret scan (gitleaks)                           | `security.yml`                |                                                                     |

Review bots are **not** substitutes for the deterministic gates above.

### Required but not always GitHub “required checks”

| Gate                             | Enforcement                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| Automated review correction loop | Rules `011` / `013` — CodeRabbit + DeepSource AI Review (`@deepsourcebot review`) + resolve threads |
| Up-to-date with `main`           | Prefer ruleset “Require branches to be up to date”; agents rebase before merge                      |
| No direct pushes to `main`       | Ruleset / branch protection — PRs only                                                              |
| Conversation resolution          | Ruleset “Require conversation resolution before merging”                                            |

## Advisory / non-blocking

| Check                                 | Notes                                                         |
| ------------------------------------- | ------------------------------------------------------------- |
| DeepSource: Docker / Shell            | Advisory                                                      |
| DeepSource JavaScript                 | Off in dashboard; no `javascript` block in `.deepsource.toml` |
| Claude Code                           | On-demand `@claude` only (`claude.yml`)                       |
| Socket / Semgrep / CodeAnt / Greptile | Address when actionable; do not substitute for unit/E2E gates |

## Concurrency

| Workflow                                       | Group                                      | Cancel in progress                                                                              |
| ---------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Deploy / E2E / cross-browser / a11y / security | `${{ github.workflow }}-${{ github.ref }}` | **PRs only** (`pull_request`) — never cancel an in-flight `main` push validation/deploy mid-run |
| Prune deployments                              | dedicated                                  | `false`                                                                                         |

Rationale: canceling the only authoritative `main` quality + Pages deploy leaves
`main` without a completed gate run after a burst of merges.

## Artifacts

| Artifact                                        | Retention              | Purpose                        |
| ----------------------------------------------- | ---------------------- | ------------------------------ |
| Coverage (`deploy.yml`)                         | 14 days                | Incident / threshold debugging |
| Playwright reports (e2e + cross-browser + a11y) | 14 days                | Failure triage                 |
| Pages deploy artifact                           | GitHub Pages retention | Production bundle              |

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

- `docs/project-facts.json` — machine-readable e2e/CI flags for `check:docs-drift`
- `.cursor/rules/011-coderabbit-pr-gate.mdc` / `013-pr-review-correction-loop.mdc`
- `CONTRIBUTING.md` — contributor merge checklist
