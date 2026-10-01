# Agent execution playbook (AI Research Orchestrator)

Operational guide for cloud agents and maintainers. It adapts release-engineering
patterns from the [qnbs dev.to series](https://dev.to/qnbs) to this repo’s
**client-only PWA**, **GitHub Actions** gates, and **dual merge gate**
(`docs/pr-merge-gate.md`, rules `011`/`013`).

Machine-readable pointer: `docs/project-facts.json` → `ci.agentExecutionPlaybookPath`.
`pnpm run check:docs-drift` fails if agent guides drop that pointer.

## Principles (fail closed)

1. **Merge is a control-flow decision, not a mood.** Land on `main` only when the
   **dual gate** holds on the **same** latest head SHA: required blocking CI green
   **and** review quiescence (including arrival wait). Neither half substitutes
   for the other ([release protocol must fail closed](https://dev.to/qnbs/a-release-protocol-must-fail-closed-too-5h65)).
2. **Separate evidence planes.** A green PR check proves the **PR head** passed CI;
   `main` deploy proves the **merged** tree; GitHub Pages proves the **published**
   bundle. Do not treat “PR green” as “production verified” until `main` gates and
   deploy complete ([prepared is not published](https://dev.to/qnbs/release-state-machines-prepared-is-not-published-2l3m)).
3. **Test the artifact you mean.** For toolchain bumps, trust **`Production Build`**
   on the PR head (Vite `dist/` + CSP hash patch). E2E runs against the **dev
   server**, not `dist/` — authoritative for UX regressions, not a substitute for
   reading the production build job when the change is build-only
   ([test the artifact you built](https://dev.to/qnbs/test-the-artifact-you-built-not-an-equivalent-rebuild-18f8)).
4. **LLM review is advisory; deterministic gates are blocking.** CodeRabbit,
   Sourcery, Copilot, and DeepSource AI Review catch real issues — but merge
   policy treats **required workflows** (deploy, e2e, a11y, pwa-e2e, security)
   as hard stops. AI reviewers must reach **quiescence**, not “we got tired”
   ([when AI reviewers become a CI problem](https://dev.to/qnbs/when-ai-reviewers-become-a-ci-problem-1a00)).

## Evidence planes in this repo

| Plane                       | What it proves                                 | Primary signal                                                                  |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| **PR head**                 | Diff + lockfile + tests on commit SHA          | Required checks on PR (`docs/ci-branch-governance.md`)                          |
| **Production build job**    | `pnpm run build`, bundle budget, Lighthouse CI | `deploy.yml` → Production Build                                                 |
| **Browser UX (dev server)** | Seven blocking Playwright specs + axe + PWA SW | `e2e.yml`, `e2e-cross-browser.yml`, `a11y.yml`, `pwa-e2e.yml`                   |
| **`main` after merge**      | Ruleset + deploy/upload to Pages               | Push to `main` workflows (never cancel in-flight `main` validation)             |
| **Live site**               | First boot on GitHub Pages base path           | Manual smoke on `https://qnbs.github.io/AI-Research-Orchestrator/` after deploy |

After a dependency or Node bump, read **job logs** on the PR head — not badge color
alone for advisory jobs (Codecov, CodeScene docs-only skips).

## Standard agent loop (one PR)

1. **Scope:** One logical change set per PR; English titles/bodies (rule `010`).
2. **Implement:** Minimal diff; run locally `typecheck`, `lint`, scoped
   `pnpm exec vitest run <touched>.test.ts` — not full E2E or full coverage on
   constrained agents (see `AGENTS.md` Testing).
3. **Push** without `--no-verify`.
4. **Trigger reviews:** Top-level comment first line exactly `@deepsourcebot review`
   on open and after every fix push. `@coderabbitai review` when the latest head
   lacks a real CodeRabbit review (best-effort; rate limit is clause **(d)**). Do
   **not** `@sourcery-ai review` while the 250k / 7-day budget is exhausted.
5. **Wait:** All **blocking** CI green on head; **arrival wait** until no in-scope
   bot is still “Reviewing” on that SHA.
6. **Collect:** GraphQL unresolved `reviewThreads` **plus** every review **body**
   on the head (grep `outside diff`). Track body-only items in a disposition
   ledger (`fixed` / `replied` / `deferred`).
7. **Correct:** Fix or reply; resolve threads; push if needed → repeat 4–6.
8. **Merge:** Squash to `main` only when step 5–7 satisfy `011` step 7. If
   `mergeStateStatus: BLOCKED` from a **superseded** `CHANGES_REQUESTED` while
   policy quiescence holds, document and use admin squash-merge per
   `docs/pr-merge-gate.md`.
9. **Post-merge:** `git fetch origin main`; rebase stacked PRs; update
   `docs/dependabot-disposition.md` when closing superseded Dependabot PRs.

## Wave / consolidation strategy (Dependabot + audit)

- Process **each** Dependabot PR or document consolidation (rule `012`).
- Prefer **tested consolidation PRs** (#344 pattern) then close originals with
  disposition comments (integration token may not comment — maintainer manual OK).
- Order toolchain before runtime bumps when lockfile/overrides interact (e.g. Vite
  override alignment before GenAI minor).

## Local vs CI authority

| Task                 | Local (agent VM)     | CI authority              |
| -------------------- | -------------------- | ------------------------- |
| Typecheck / lint     | Yes, before push     | `deploy.yml`              |
| Unit tests           | Scoped files         | `test:coverage` gate      |
| Full E2E             | **Avoid** (RAM)      | `e2e.yml` + cross-browser |
| `pnpm audit (high+)` | Optional             | `security.yml`            |
| Production build     | When debugging build | Production Build job      |

## Disposition comment template (batch bot fixes)

```markdown
## PR disposition (head `<sha>`)

| Source        | Finding | Action                        |
| ------------- | ------- | ----------------------------- |
| CodeRabbit    | …       | fixed in `<commit>`           |
| DeepSource AI | …       | fixed / N/A (JS analyzer off) |

CodeRabbit: (a) real APPROVED on head / (d) rate-limited documented.
DeepSource: `@deepsourcebot review` attempted on this head.
Arrival wait: complete.
```

## Related docs

- `docs/pr-merge-gate.md` — human dual gate
- `docs/ci-branch-governance.md` — required checks inventory
- `.cursor/rules/011-coderabbit-pr-gate.mdc` — authoritative quiescence predicate
- `.cursor/rules/013-pr-review-correction-loop.mdc` — correction loop commands
- `docs/dependabot-disposition.md` — Dependabot outcomes
