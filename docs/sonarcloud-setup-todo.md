# SonarQube Cloud Setup (Free Tier)

> **Status (2026-07-22):** Repo-side CI analysis is configured and optimized for the
> **free tier**. Custom Quality Gates are **not available** on Free (Team/Enterprise
> only). Everything is aligned to the built-in read-only **Sonar way** gate.

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

| File | Free-tier optimization |
| ---- | ---------------------- |
| `sonar-project.properties` | Coverage limited to Vitest logic layers (store/services/hooks/lib) so UI-only PRs are not scored as 0% coverage; CPD exclusions for translations, static/demo data, icons, scripts |
| `vitest.config.ts` | `lcov` reporter → `coverage/lcov.info` |
| `security.yml` job `sonarcloud` | CI scan, **non-blocking**, runs only if `SONAR_TOKEN` is set; no `qualitygate.wait` yet |

## What you still do in the UI (required)

### A. `SONAR_TOKEN` secret

1. [sonarcloud.io](https://sonarcloud.io) → My Account → Security → Generate token
2. GitHub → Repo → Settings → Secrets → Actions → `SONAR_TOKEN`

### B. Disable Automatic Analysis

Project → Administration → Analysis Method → **Automatic Analysis = Off**  
(CI job would otherwise fight zero-config scans.)

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

| Symptom | What to do |
| ------- | ---------- |
| Job skipped | Add `SONAR_TOKEN` repository secret |
| Project not found | Fix `sonar.organization` / `sonar.projectKey` to match the dashboard |
| Coverage 0% on new code | Ensure `pnpm run test:coverage` writes `coverage/lcov.info`; keep new logic in store/services/hooks/lib |
| Duplication > 3% | Rely on `sonar.cpd.exclusions`; avoid duplicating UI patterns outside exclusions |
| Gate fails on Hotspots | Review new hotspots in the Sonar UI (required by Sonar way on Free) |
| Double analysis | Disable Automatic Analysis |
