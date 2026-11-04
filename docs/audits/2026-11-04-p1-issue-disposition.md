# P1 audit wave disposition — 2026-11-04 (Europe/Berlin)

Canonical release: **`v0.4.7`** (2026-11-04) — audit-recovery wave after **v0.4.6**. Verify `git describe --tags` on `main` before closing issues.

## Issue ledger

| Issue                                                               | WS    | Disposition                                                                                                                           | Evidence                                          |
| ------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [#404](https://github.com/qnbs/AI-Research-Orchestrator/issues/404) | WS-10 | **Ready to close (maintainer)** — smoke doc + blocking PWA/CI; agent cannot `gh issue close`                                          | `docs/audits/2026-11-04-issue-closure-404-411.md` |
| [#411](https://github.com/qnbs/AI-Research-Orchestrator/issues/411) | —     | **Ready to close (maintainer)** — **0.4.7** inventory + `check:docs-drift`                                                            | `docs/audits/2026-11-04-issue-closure-404-411.md` |
| [#408](https://github.com/qnbs/AI-Research-Orchestrator/issues/408) | —     | **Acceptance slice done** — Dexie + portable export + `collections.spec.ts`                                                           | **v0.4.7** CHANGELOG                              |
| [#409](https://github.com/qnbs/AI-Research-Orchestrator/issues/409) | —     | **Partial** — dashboard provenance/OA (#438); do not close as full semantic audit                                                     | PR #438 notes                                     |
| [#410](https://github.com/qnbs/AI-Research-Orchestrator/issues/410) | —     | **TOML fixed** (#439); dashboard Shell file-level coverage not independently verified                                                 | `.deepsource.toml`                                |
| [#419](https://github.com/qnbs/AI-Research-Orchestrator/issues/419) | WS-24 | **In progress** — matrix + unit supersession + checkpoint restore/discard E2E; cancel/CSV in `agent-flow` §11                         | **v0.4.7**                                        |
| [#421](https://github.com/qnbs/AI-Research-Orchestrator/issues/421) | WS-26 | **In progress** — export/delete/reload/filter E2E (**#448–#449**, reload+filter membership); cross-page pagination fixture still open | **v0.4.7**                                        |
| [#396](https://github.com/qnbs/AI-Research-Orchestrator/issues/396) | —     | **brace-expansion fixed** (#441); **minimatch deferred**                                                                              | `docs/dependabot-disposition.md`                  |

## Release notes

User-facing summary: **`CHANGELOG.md` [0.4.7]**. Tag **`v0.4.7`** after merge per `docs/release-policy.md`.

## Bot / merge policy

Dual gate (`docs/pr-merge-gate.md`) on every PR; CodeRabbit rate-limit **(d)** when documented.
