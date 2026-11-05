# #396 minimatch evidence refresh — 2026-11-05

Recorded on **`main` @ `4c75740`** (Europe/Berlin).

## Blocking CI (`security.yml`)

| Command                         | Result                                                |
| ------------------------------- | ----------------------------------------------------- |
| `pnpm audit --audit-level=high` | **exit 0** (2 moderate minimatch dev-only)            |
| CodeQL / gitleaks               | Required on `main` per `docs/ci-branch-governance.md` |

## `pnpm audit` (default severity)

| Severity | Count | Package   | Paths (summary)                                                                                |
| -------- | ----- | --------- | ---------------------------------------------------------------------------------------------- |
| moderate | 2     | minimatch | eslint → `@eslint/config-array`; LHCI / `@sentry/bundler-plugins` / `typescript-estree` chains |

## Installed versions (`pnpm why minimatch`)

| Version    | Role                                                                 |
| ---------- | -------------------------------------------------------------------- |
| **3.1.5**  | Dev: `eslint@9.39.4` → `@eslint/config-array`, legacy `glob@7` paths |
| **10.2.6** | Dev: `typescript-eslint` → `glob@13`, Lighthouse CI tooling          |

Not shipped in production Vite bundle (`pnpm run build` client artifacts).

## Advisory disposition

| ID                                                                       | Notes                                                                                                                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Affects `<11.0.1`; maintainer text references v10.2.6 algorithm. v3.1.5 may be **out of scope** for the described defect — see [advisory-database#10811](https://github.com/github/advisory-database/issues/10811). |
| Override to `minimatch@11` on eslint tree                                | **Rejected** — breaks eslint@9 peer dependency on `minimatch@3` without upstream migration.                                                                                                                         |

## Related merges

- **#441** — `brace-expansion` overrides (5.0.12, 2.1.7, 1.1.21)
- Ledger: `docs/dependabot-disposition.md` § `minimatch@3.1.5 — evidence ledger (#396)`
