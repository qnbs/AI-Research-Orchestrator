# SonarQube Cloud Setup (Free Tier)

> **Status (2026-07-22):** Repo-side CI analysis is configured and optimized for the
> **free tier**. Custom Quality Gates are **not available** on Free (Team/Enterprise
> only). Everything is aligned to the built-in read-only **Sonar way** gate.
>
> **This pass fixed two bugs in the initial CI-analysis setup and verified the
> result end-to-end against a live PR run — not assumed:**
>
> - `security.yml`'s `sonarcloud` job used `if: ${{ secrets.SONAR_TOKEN != '' }}` at
>   job level — `secrets.*` is not a valid context there (only `github`/`inputs`/
>   `needs`/`vars` are; confirmed with `actionlint`). This broke **the entire
>   `security.yml` workflow's validation**, silently disabling CodeQL, Dependency
>   Review, `pnpm audit`, and gitleaks on `main` and every PR since the bad commit
>   landed — not just the new Sonar job. Fixed by moving the presence check into a
>   step (`env:` + `$GITHUB_OUTPUT`), consumed by step-level `if: steps.*.outputs.*`.
> - `sonar.organization=qnbs` was wrong — confirmed via
>   `sonarcloud.io/api/components/show?component=qnbs_AI-Research-Orchestrator`
>   that the real bound organization key is **`qnbs-1`**, not `qnbs`. Would have
>   made every scan fail with "project/organization not found". Fixed.
> - **CI-based analysis is confirmed working end-to-end**, verified live on the PR
>   that shipped both fixes: `SonarQube Cloud Scan` step logged `ANALYSIS
SUCCESSFUL` / `EXECUTION SUCCESS`, the `SonarCloud Code Analysis` GitHub check
>   posted a real result tied to that commit, and `sonarqubecloud[bot]` commented
>   "Quality Gate passed" on the PR — no "Automatic Analysis is enabled" conflict
>   appeared anywhere in the scan log. A stale `components/show` timestamp earlier
>   in this same pass had suggested Automatic Analysis might still be on; this
>   later, more direct evidence (an actual successful CI-submitted analysis)
>   supersedes it — Automatic Analysis is evidently already off, or SonarCloud
>   accepted the CI submission regardless. Re-check Project → Administration →
>   Analysis Method only if a future scan ever does hit that conflict.

## Free-tier constraint (important)

On SonarQube Cloud **Free**:

- Only built-in gates: **Sonar way** (default, read-only) and **Sonar way for agentic AI**
- **Custom quality gates require Team or Enterprise** — do not plan around them
- Optimize **analysis scope** (`sonar-project.properties`) so Sonar way stays passable

### Sonar way conditions (new code / PRs)

1. No new bugs (Reliability rating A)
2. No new vulnerabilities (Security rating A)
3. Maintainability rating A on new code
4. All new Security Hotspots **reviewed** (manual step in the Sonar UI)
5. Coverage on new code **≥ 80%**
6. Duplicated lines on new code **≤ 3%**

## What is already in the repo

| File                            | Free-tier optimization                                                                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sonar-project.properties`      | Coverage limited to Vitest logic layers (store/services/hooks/lib) so UI-only PRs are not scored as 0% coverage; CPD exclusions for translations, static/demo data, icons, scripts |
| `vitest.config.ts`              | `lcov` reporter → `coverage/lcov.info`                                                                                                                                             |
| `security.yml` job `sonarcloud` | CI scan, **non-blocking**, runs only if `SONAR_TOKEN` is set; no `qualitygate.wait` yet                                                                                            |

## What you still do in the UI (required)

### A. `SONAR_TOKEN` secret

1. [sonarcloud.io](https://sonarcloud.io) → My Account → Security → Generate token
2. GitHub → Repo → Settings → Secrets → Actions → `SONAR_TOKEN`

### B. Disable Automatic Analysis (only if a future scan hits a conflict)

Project → Administration → Analysis Method → **Automatic Analysis = Off**

Not currently needed — a real, PR-scoped CI-based scan completed successfully with
no "Automatic Analysis is enabled" conflict (see status note above). Keep this step
as a reference in case a future scan ever does report that conflict; it can only be
toggled in the SonarCloud dashboard, not from a repo file or the `gh`/GitHub API.

### C. Work with Sonar way (no custom gate on Free)

- You **cannot** create a custom gate on Free.
- After each analysis, open **Security Hotspots** and mark new ones as **Safe** / **Fixed** (Sonar way requires 100% reviewed).
- Prefer changes inside `src/store`, `src/services`, `src/hooks`, `src/lib` (covered + included in coverage metric).
- Avoid large copy-paste outside CPD exclusions; keep new-code duplication ≤ 3%.

Optional: try built-in **Sonar way for agentic AI** if it fits this agentic app better — still read-only, but conditions may differ. Compare both on the dashboard; Free still does not allow editing.

### D. Optional: make the CI job enforce the gate (still Free-compatible)

After scans look correct and hotspots are reviewed on main:

In `.github/workflows/security.yml` Sonar step:

```yaml
with:
  args: >-
    -Dsonar.qualitygate.wait=true
    -Dsonar.qualitygate.timeout=300
```

And set `continue-on-error: false` on the job.  
No paid plan required — this only waits for the built-in Sonar way result.

## Troubleshooting

| Symptom                 | What to do                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Job skipped             | Add `SONAR_TOKEN` repository secret                                                                     |
| Project not found       | Fix `sonar.organization` / `sonar.projectKey` to match the dashboard                                    |
| Coverage 0% on new code | Ensure `pnpm run test:coverage` writes `coverage/lcov.info`; keep new logic in store/services/hooks/lib |
| Duplication > 3%        | Rely on `sonar.cpd.exclusions`; avoid duplicating UI patterns outside exclusions                        |
| Gate fails on Hotspots  | Review new hotspots in the Sonar UI (required by Sonar way on Free)                                     |
| Double analysis         | Disable Automatic Analysis                                                                              |
