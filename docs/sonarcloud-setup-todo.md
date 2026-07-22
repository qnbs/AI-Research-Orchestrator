# SonarQube Cloud Setup

> **Status (2026-07-22):** Repo-side CI-based analysis is wired. Remaining work is
> dashboard-only (secret, disable Automatic Analysis, custom Quality Gate).

## What landed in the repo

| File | Purpose |
| ---- | ------- |
| `sonar-project.properties` | Project key, sources/tests, lcov path, CPD exclusions for intentional i18n/script parallelism |
| `vitest.config.ts` | `lcov` reporter added so `coverage/lcov.info` is produced |
| `.github/workflows/security.yml` → `sonarcloud` job | Install → `test:coverage` → SHA-pinned scan action; non-blocking; skipped until `SONAR_TOKEN` exists |

The scan action is pinned to `SonarSource/sonarqube-scan-action@22918119…` (v8.2.1).

## Manual steps (you must do these)

### 1. Create and store `SONAR_TOKEN`

1. Open [SonarQube Cloud](https://sonarcloud.io) → **My Account** → **Security**.
2. Generate a token (name e.g. `github-actions-ai-research-orchestrator`).
3. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - Name: `SONAR_TOKEN`
   - Value: the token

Until this secret exists, the `sonarcloud` job is skipped (`if: secrets.SONAR_TOKEN != ''`).

### 2. Verify `sonar.organization` / `sonar.projectKey`

Open the project in SonarQube Cloud → **Project Information** (or the URL
`…/project/overview?id=…`). Confirm:

- Organization key matches `sonar.organization=qnbs` in `sonar-project.properties`
- Project key matches `sonar.projectKey=qnbs_AI-Research-Orchestrator`

If the bound GitHub-App project uses different keys, edit `sonar-project.properties`
before the first real scan.

### 3. Disable Automatic Analysis

Automatic Analysis and CI-based analysis must not run in parallel (duplicate/conflicting
results).

1. SonarQube Cloud → this project → **Administration** → **Analysis Method** (or **Background Tasks** / project settings, depending on current UI).
2. Turn **Automatic Analysis** **off**.
3. Confirm analysis is expected from CI only.

### 4. Configure a custom Quality Gate

Do **not** leave the default “Sonar way” gate as the only gate — it failed this project
on **7.2% Duplication on New Code (required ≤ 3%)** because of intentional patterns:

- Parallel `en`/`de` blocks in `src/i18n/translations.ts`
- Mirrored structure of `scripts/check-*.mjs`

Repo-side mitigations already in place: `sonar.cpd.exclusions` for those paths. Still
tune the gate so residual structural similarity does not block real work.

**Recommended custom gate** (name e.g. `AI-Research-Orchestrator`):

| Condition | On | Operator | Value | Rationale |
| --------- | -- | -------- | ----- | --------- |
| Bugs | New Code | is | 0 | Keep strict |
| Vulnerabilities | New Code | is | 0 | Keep strict |
| Security Hotspots Reviewed | New Code | is | 100% | Human review required |
| Reliability Rating | New Code | is better than | A | Keep strict |
| Security Rating | New Code | is better than | A | Keep strict |
| Maintainability Rating | New Code | is better than | A | Keep strict |
| Coverage on New Code | New Code | is greater than | 50% | Logic-layer coverage is gated at 80% by Vitest; Sonar only sees reported lcov scope |
| Duplicated Lines (%) on New Code | New Code | is less than | 10% | Raised from Sonar way’s 3% after CPD exclusions; still catches careless copy-paste |

**How to create and assign:**

1. SonarQube Cloud → **Quality Gates** → **Create**.
2. Add the conditions above (adjust labels to match current UI wording).
3. Open this project → **Project Settings** → **Quality Gate** → select the custom gate.
4. Optionally set it as default for the organization only if every other project should share it.

Keep **bug / vulnerability / hotspot** conditions strict. Only loosen duplication (and
optionally coverage threshold) for this codebase’s known conventions.

### 5. First successful CI run

1. Push any commit to `main` or open a PR after the secret exists and Automatic Analysis is off.
2. Open the **Security** workflow run → job **SonarQube Cloud**.
3. Confirm the scanner uploaded results and the project dashboard shows a fresh analysis
   with coverage numbers (not blank).
4. Open the PR decoration / Quality Gate status and confirm it matches the custom gate.

### 6. Promotion to blocking (later)

Same pattern as `docs/e2e-ci-backlog.md`:

1. Leave `continue-on-error: true` and **no** `sonar.qualitygate.wait` until the gate has
   been clean on several real PRs (recommend: **2 weeks** of normal activity or
   **10 consecutive green scans**, whichever comes first).
2. Then in `.github/workflows/security.yml`:
   - Set `continue-on-error: false` on the `sonarcloud` job
   - Add to the scan step:
     ```yaml
     with:
       args: >-
         -Dsonar.qualitygate.wait=true
         -Dsonar.qualitygate.timeout=300
     ```
3. Optionally add **SonarQube Cloud** as a required status check in branch protection.
4. Replace this document with a short “configured; see security.yml + sonar-project.properties”
   note, or delete it.

## Value vs CodeAnt / CodeQL

This repo already runs CodeAnt Quality Gates/SAST/SCA/SCR/Coverage, CodeQL
(security-extended), CodeRabbit, and Greptile. SonarQube Cloud is kept for:

- Long-term quality / technical-debt trends
- Security Hotspots workflow (human accept/fix)
- Cognitive complexity and maintainability ratings per file

If after a few weeks the dashboard adds little beyond CodeAnt, disable the job and the
GitHub App rather than maintaining both.

## Troubleshooting

| Symptom | Check |
| ------- | ----- |
| Job skipped | `SONAR_TOKEN` secret missing |
| “Project not found” | `sonar.organization` / `sonar.projectKey` vs dashboard |
| Coverage always 0% | `coverage/lcov.info` exists after `pnpm run test:coverage`; path matches `sonar.javascript.lcov.reportPaths` |
| Duplication still fails gate | Custom gate threshold; `sonar.cpd.exclusions`; Automatic Analysis still on |
| Duplicate analyses | Automatic Analysis not fully disabled |
