# 2026-10-02 release truth audit (master prompt §11)

**Scope:** Align GitHub Release `v0.4.3`, git tag, `CHANGELOG.md`, and `package.json` without moving the tag.

## Findings

| Surface                  | Expected                                         | Observed (2026-10-02)                                                                                                 | Disposition                                                                         |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Tag `v0.4.3`             | Points at release commit                         | `5ae99748` (`release: v0.4.3 post-audit consolidation (#351)`)                                                        | **Correct** — do not retag                                                          |
| `package.json`           | Semver of last named release                     | `0.4.3`                                                                                                               | **Correct** — `main` may advance without bump until next release                    |
| `CHANGELOG.md` `[0.4.3]` | Matches tag artifact                             | Section matches #351 scope (Waves D–F toolchain/runtime, playbook, Dependabot #344)                                   | **Correct**                                                                         |
| GitHub Release body      | Describes **tag** contents only                  | Body listed post-tag work (Wave G closeout, claude-action #352, heuristic #353/#355) that landed **after** `5ae99748` | **Fixed** — release notes edited to tag-scoped copy + pointer to `[Unreleased]`     |
| Help → About             | `v{packageVersion} ({shortSha})` from build meta | Shows current Pages build SHA, not the tag                                                                            | **By design** (`docs/release-policy.md`) — live demo is always latest `main` deploy |
| `main` after tag         | Documented drift                                 | 9+ commits (Waves A–D, H, G) under `[Unreleased]`                                                                     | **Documented** — next semver cut when promoting `[Unreleased]`                      |

## Tag-scoped GitHub Release text (canonical)

Use this (or equivalent) on the `v0.4.3` GitHub Release:

```markdown
**v0.4.3** — commit [`5ae99748`](https://github.com/qnbs/AI-Research-Orchestrator/commit/5ae99748d9de638d30b75e66f41c3a28fe6cf1eb) (2026-10-01).

Post-audit consolidation: Dependabot #344, Waves D–F (#345–#349), agent playbook (#348), Node 24 CI, Vite 8.3.2, `@google/genai` 2.25.0, OpenAI 7.25.0.

Full notes: [CHANGELOG.md at v0.4.3](https://github.com/qnbs/AI-Research-Orchestrator/blob/v0.4.3/CHANGELOG.md#043---2026-10-01).

**Not in this tag:** Later Composer audit waves on `main` (A–D, H, G closeout) remain in `[Unreleased]` until the next semver release.
```

## Verification commands

```bash
git rev-parse v0.4.3^{commit}
jq -r .version package.json
gh release view v0.4.3 --json body,tagName
git log --oneline v0.4.3..origin/main
```

## v0.4.4 cut (2026-10-02)

| Surface                                    | Value                                                                          | Notes                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------- |
| Tag `v0.4.4`                               | `92ccb8e4657c0eb53931aa0103c64506d0cb067a`                                     | Squash merge **#364**                       |
| `package.json` / `docs/project-facts.json` | `0.4.4`                                                                        | Matches tag                                 |
| GitHub Release                             | [v0.4.4](https://github.com/qnbs/AI-Research-Orchestrator/releases/tag/v0.4.4) | Tag-scoped notes; compare `v0.4.3...v0.4.4` |
| Prior tag                                  | `v0.4.3` → `5ae99748`                                                          | Unchanged                                   |

## v0.4.5 cut (2026-10-03)

| Surface                                    | Value                   | Notes                                               |
| ------------------------------------------ | ----------------------- | --------------------------------------------------- |
| Tag `v0.4.5`                               | _(set on merge commit)_ | Squash merge release PR after **#366** on `main`    |
| `package.json` / `docs/project-facts.json` | `0.4.5`                 | Wave G + §48 viewport tooling                       |
| Prior tag                                  | `v0.4.4` → `92ccb8e`    | Unchanged                                           |
| Compare                                    | `v0.4.4...v0.4.5`       | Patch: Lighthouse production script, a11y, captures |
