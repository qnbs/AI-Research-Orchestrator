# Audit governance — CI quality gates (P1-7)

Governance notes from the 2026-08-02 full-scale audit follow-up. This document
records **decisions** and **operating procedures** for SonarQube Cloud and
`pnpm audit` so future PRs do not re-litigate the same trade-offs.

## SonarQube Cloud (built-in Sonar way gate)

### Current posture (2026-08-02)

| Aspect              | Setting                                                  | Rationale                                                                                             |
| ------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| CI job              | **Removed** (2026-08-02)                                 | Owner deactivating SonarCloud dashboard; coverage gate remains Vitest `test:coverage` in `deploy.yml` |
| Organization key    | `qnbs-1`                                                 | See `docs/sonarcloud-setup-todo.md`                                                                   |
| Coverage scope      | `src/store`, `src/services`, `src/hooks`, `src/lib` only | Matches Vitest coverage gate; UI/context paths are E2E-tested                                         |
| Custom quality gate | **Not available** on Free                                | Sonar way is read-only                                                                                |

### Sonar way conditions on new code

1. Reliability rating A (0 new bugs)
2. Security rating A (0 new vulnerabilities)
3. Maintainability rating A
4. **All new Security Hotspots reviewed** (manual in Sonar UI)
5. **Coverage on new code ≥ 80%**
6. Duplicated lines on new code ≤ 3%

### Promotion path to blocking (recommended sequence)

1. **Keep non-blocking** until `main` has zero unreviewed Security Hotspots.
2. Add targeted unit tests for any new logic in covered layers before merging
   (same lesson as P1-5 logging migration — touched catch blocks count as new code).
3. Enable gate wait in `security.yml` when ready:

```yaml
with:
  args: >-
    -Dsonar.qualitygate.wait=true
    -Dsonar.qualitygate.timeout=300
```

4. Remove implicit non-blocking behavior only after **three consecutive green**
   `main` runs with `qualitygate.wait=true`.

### Known false positives / external failures

- **DeepSource JavaScript:** use `module_system = "es-modules"` in `.deepsource.toml` and exclude `scripts/**` (Node `.mjs` maintenance). Core gates (typecheck/lint/tests/build) remain authoritative.
- **SonarQube Cloud:** CI job removed 2026-08-02; dashboard deactivation is owner-managed (`docs/sonarcloud-setup-todo.md`).
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

- Sonar setup: `docs/sonarcloud-setup-todo.md`
- E2E promotion: `docs/e2e-ci-backlog.md`
- Dependabot process: `.cursor/rules/012-dependabot-pr-gate.mdc`
- Full audit: `docs/audits/2026-08-02-full-scale-audit.md`
