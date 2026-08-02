# Audit governance — CI quality gates (P1-7)

Governance notes from the 2026-08-02 full-scale audit follow-up. This document
records **decisions** and **operating procedures** for repository quality and
security gates so future PRs do not re-litigate the same trade-offs.

## Coverage and static analysis posture

| Gate                                     | Where                                  | Blocking? | Notes                                                                               |
| ---------------------------------------- | -------------------------------------- | --------- | ----------------------------------------------------------------------------------- |
| Typecheck / lint / unit tests + coverage | `deploy.yml`                           | **Yes**   | `pnpm run test:coverage` — 80% lines/statements on `store`/`services`/`hooks`/`lib` |
| Critical-path coverage floors            | `deploy.yml` → `check:coverage-floors` | **Yes**   | Ratchet on `providers/`, `geminiService.ts`, `apiKeyService.ts`                     |
| CodeQL                                   | `security.yml`                         | **Yes**   | `security-extended` query set                                                       |
| DeepSource (Docker/Shell)                | GitHub App check                       | Advisory  | JavaScript analyzer disabled — ESLint + CI gates cover TS/TSX                       |
| CodeAnt / Semgrep / gitleaks             | GitHub App checks                      | Mixed     | See workflow outputs per PR                                                         |

**Coverage scope:** Vitest gates logic layers (`src/store`, `src/services`, `src/hooks`, `src/lib`). UI views are covered by Playwright E2E instead.

### Known false positives / external failures

- **DeepSource JavaScript:** analyzer **disabled** in `.deepsource.toml` (persistent ESM/TS false positives). Docker/Shell remain advisory; ESLint + deploy.yml gates are authoritative.
- **Claude Code Review** workflow may fail on infrastructure — re-run or ignore if no actionable inline threads.

## `pnpm audit` governance

### Current posture

| Context                           | Command                         | Threshold     | Blocking?                         |
| --------------------------------- | ------------------------------- | ------------- | --------------------------------- |
| CI (`deploy.yml`, `security.yml`) | `pnpm audit --audit-level=high` | high+         | **Yes**                           |
| Weekly schedule (`security.yml`)  | same                            | high+         | Alert only (workflow still fails) |
| Maintainer local                  | `pnpm audit` (no flag)          | informational | No                                |

### Moderate-severity advisories

Moderate findings are **tracked but not CI-blocking** because:

- Client-only PWA: no server-side attack surface for many transitive dev-tool advisories.
- High/critical issues in runtime dependencies are still gated at `--audit-level=high`.

**Procedure when moderates appear:**

1. Run `pnpm audit` locally and capture the advisory IDs.
2. If the vulnerable package is in **production** `dependencies` (not dev-only),
   open a Dependabot consolidation PR or manual bump within one sprint.
3. Record disposition in `docs/dependabot-disposition.md` (rule `012`).
4. Do **not** lower the CI threshold to `moderate` without a security review —
   it would block merges on dev-tool noise.

### Exceptions

- Emergency merge with known moderate in a **devDependency** only: document in PR
  body + `dependabot-disposition.md`; fix in follow-up PR.
- Never ignore **high** or **critical** in production paths.

## Cross-references

- E2E promotion: `docs/e2e-ci-backlog.md`
- DeepSource dashboard: `docs/deepsource-setup.md`
- Dependabot process: `.cursor/rules/012-dependabot-pr-gate.mdc`
- Full audit: `docs/audits/2026-08-02-full-scale-audit.md`
