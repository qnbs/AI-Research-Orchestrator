# P1 audit wave disposition — 2026-11-04 (Europe/Berlin)

Canonical **`main`** head at documentation time: **`5576ab6`** (post-#443 Pages smoke + README badge). Subsequent PRs may supersede SHAs — verify `git log -1` before closing issues.

## Issue ledger

| Issue                                                               | WS    | Disposition                                                                                                    | Evidence on `main`                                                                     |
| ------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [#404](https://github.com/qnbs/AI-Research-Orchestrator/issues/404) | WS-10 | **Substantially met** — live URL smoke + CI deploy; optional follow-up: installed-client offline/update matrix | `docs/audits/2026-11-04-github-pages-production-smoke.md`, blocking `deploy`/`pwa-e2e` |
| [#411](https://github.com/qnbs/AI-Research-Orchestrator/issues/411) | —     | **Close** — README badge matches `package.json` **0.4.6**                                                      | #443                                                                                   |
| [#408](https://github.com/qnbs/AI-Research-Orchestrator/issues/408) | —     | **Acceptance slice done** — Dexie + portable export + `collections.spec.ts` (#442)                             | CHANGELOG [Unreleased]                                                                 |
| [#409](https://github.com/qnbs/AI-Research-Orchestrator/issues/409) | —     | **Partial** — dashboard provenance/OA (#438); schema/OA limits documented in PR                                | Do not close as “complete semantic audit”                                              |
| [#410](https://github.com/qnbs/AI-Research-Orchestrator/issues/410) | —     | **TOML fixed** (#439); dashboard Shell file-level coverage not independently verified                          | `.deepsource.toml`                                                                     |
| [#419](https://github.com/qnbs/AI-Research-Orchestrator/issues/419) | WS-24 | **In progress** — matrix doc (#444), unit supersession (#444), checkpoint E2E (pending merge)                  | `docs/audits/2026-11-04-orchestrator-state-invariants.md`                              |
| [#421](https://github.com/qnbs/AI-Research-Orchestrator/issues/421) | WS-26 | **In progress** — selection toolbar E2E (#445), CSV download E2E (pending merge)                               | `knowledge-base.spec.ts`                                                               |
| [#396](https://github.com/qnbs/AI-Research-Orchestrator/issues/396) | —     | **brace-expansion fixed** (#441); **minimatch deferred**                                                       | `docs/dependabot-disposition.md`                                                       |

## Bot / merge policy

All merges follow dual gate (`docs/pr-merge-gate.md`): required CI green on head + review quiescence; CodeRabbit rate-limit **(d)** documented when applicable.
