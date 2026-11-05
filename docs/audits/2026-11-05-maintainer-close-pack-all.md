# Maintainer close pack — Nov 2026 audit wave (all ready issues)

Cloud Agent integration **cannot** close GitHub issues or Dependabot PRs (`403`). Use this index after **`main`** matches the cited SHAs and open PRs in the wave are merged.

**Live Pages + `main` reference (2026-11-05 ~08:34 Europe/Berlin):** **`05e1c93`** — Help → About **`v0.4.7 (05e1c93)`**. Probe: `docs/audits/2026-11-04-github-pages-production-smoke.md` (row **41984538088**).

---

## Close now (evidence complete)

| Issue                                                               | Topic                                               | Closure doc                                              |
| ------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| [#404](https://github.com/qnbs/AI-Research-Orchestrator/issues/404) | WS-10 Pages / PWA smoke                             | `docs/audits/2026-11-04-issue-closure-404-411.md` § #404 |
| [#411](https://github.com/qnbs/AI-Research-Orchestrator/issues/411) | Version / docs drift                                | same file § #411                                         |
| [#396](https://github.com/qnbs/AI-Research-Orchestrator/issues/396) | Security audit / minimatch                          | `docs/audits/2026-11-05-issue-closure-396.md`            |
| [#409](https://github.com/qnbs/AI-Research-Orchestrator/issues/409) | Dashboard provenance slice                          | `docs/audits/2026-11-05-issue-closure-409.md`            |
| [#410](https://github.com/qnbs/AI-Research-Orchestrator/issues/410) | DeepSource slice (WS-15 lane stays open separately) | `docs/audits/2026-11-05-issue-closure-410.md`            |
| [#419](https://github.com/qnbs/AI-Research-Orchestrator/issues/419) | Orchestrator invariants slice                       | `docs/audits/2026-11-04-issue-closure-419-421.md` § #419 |
| [#421](https://github.com/qnbs/AI-Research-Orchestrator/issues/421) | Knowledge Base E2E slice                            | same file § #421                                         |

## Dependabot / PR hygiene

| Item                                     | Action                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Dependabot **#383** (Claude action)      | **Close** — superseded by merged **#398** (D5c, `0359cd0`); see `docs/dependabot-disposition.md` |
| Superseded agent PRs **#458** / **#459** | Close when the consolidated wave PR merges the same commits                                      |

## Explicitly deferred (do not fold into #419 close without ack)

| Issue                                                               | Reason                                                     |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| [#403](https://github.com/qnbs/AI-Research-Orchestrator/issues/403) | Provider mid-run switch — out of orchestrator matrix slice |
| [#406](https://github.com/qnbs/AI-Research-Orchestrator/issues/406) | IndexedDB upgrade during stream / fuzz — out of slice      |

Ledger: `docs/audits/2026-11-04-orchestrator-state-invariants.md` § out-of-scope.

---

## Verification (one maintainer pass)

```bash
git fetch origin main && git checkout main && git pull
git rev-parse --short HEAD    # expect 05e1c93 or later
git describe --tags --abbrev=0   # v0.4.7
pnpm run check:docs-drift
pnpm audit --audit-level=high    # exit 0
```

**Pages (#404):** open https://qnbs.github.io/AI-Research-Orchestrator/ → Help → About must match **`git rev-parse --short HEAD`**.

**DeepSource (#410):** optional dashboard checklist in `docs/audits/2026-11-05-deepsource-410-verification.md`.

---

## Suggested batch close order

1. **#404** + **#411** (release / production truth)
2. **#396** (security gate)
3. **#419** + **#421** (test slices; cite #403/#406 deferred)
4. **#409** (dashboard slice)
5. **#410** (DeepSource config slice)
6. **#383** (Dependabot duplicate)

P1 ledger: `docs/audits/2026-11-04-p1-issue-disposition.md`.
