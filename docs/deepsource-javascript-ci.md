# DeepSource JavaScript CI — root cause and disposition

## Symptom

The **DeepSource: JavaScript** GitHub check was often **red** on pull requests and `main`, even when `pnpm run typecheck`, `pnpm run lint`, and `deploy.yml` were green.

Docker and Shell analyzers typically pass.

## Root causes (confirmed 2026-08-02, remediation 2026-11-04)

### 1. ESM TypeScript false positives (JS-0125 / antipattern)

DeepSource’s JavaScript analyzer treats many `export function` declarations in `.ts` files as **global-scope pollution**, even with:

- `dialect = "typescript"`
- `module_system = "es-modules"`

The application uses standard ESM exports across `src/` (hooks, services, lib). Converting every export to `export const` arrows only reduces noise on touched files; the baseline still contains hundreds of `export function` hits.

**Authoritative gate:** ESLint 9 with `--max-warnings 0`.

### 2. Node `.mjs` parse errors under `scripts/lib/`

Files like `scripts/lib/buildMeta.mjs` were analyzed despite `scripts/**` excludes in `.deepsource.toml` — DeepSource still reported:

`Parsing error: 'import' and 'export' may appear only with 'sourceType: module'`

**Fix applied:** shared build helpers live at `scripts/build-meta.mjs` (top-level `scripts/`, excluded). Avoid new `scripts/lib/**/*.mjs` unless the JS analyzer is re-enabled with verified excludes.

### 3. Cyclomatic complexity antipattern (medium risk)

Rules such as `parseLegacyArticleKey` / `isKnowledgeBaseEntry` at complexity 6–8 are reported as **medium** antipattern issues. `cyclomatic_complexity_threshold = "critical"` does not suppress these PR-level antipattern comments or quality-gate failures when medium categories are enabled in the DeepSource dashboard.

**Authoritative gate:** ESLint complexity rules + unit tests.

### 4. Quality gate vs. advisory docs

`docs/project-facts.json` marks JavaScript as **advisory for merge blocking** in this repo’s policy, but the DeepSource GitHub App still posts a **FAILURE** status when open issues match dashboard quality-gate filters (often minor antipattern + documentation + medium complexity).

Ignore rules for specific issue types are configured in the **DeepSource dashboard**, not in `.deepsource.toml`.

### 5. Dashboard analyzer left on while TOML omitted JS (2026-11-04)

Org/dashboard **JavaScript** stayed enabled even though git policy assumed “no TOML block = off”. DeepSource then analyzed `src/**` and failed quality gates on every push.

**Repo fix (2026-11-04):**

1. `.deepsource.toml` declares `[[analyzers]] name = "javascript"` with **`enabled = false`** (drift-gated via `check:docs-drift`).
2. **Do not** add repository-wide `.devcontainer/**`, `src/**`, or `**/*.ts` excludes when JS is off — global `exclude_patterns` apply to Docker and Shell too (#436/#410). Narrow excludes (e.g. `.devcontainer/Dockerfile` only) preserve Shell coverage of `.devcontainer/postCreate.sh`.
3. If the dashboard JavaScript analyzer were re-enabled without `enabled = false`, belt-and-suspenders TS excludes would be needed again — prefer keeping dashboard + TOML off (`docs/deepsource-dashboard-off.md`).

## Disposition (current)

| Analyzer   | `.deepsource.toml`                              | DeepSource dashboard           | GitHub check              |
| ---------- | ----------------------------------------------- | ------------------------------ | ------------------------- |
| JavaScript | **`enabled = false`** (no app TS in DeepSource) | Should match TOML (toggle off) | Should pass or disappear  |
| Docker     | `enabled = true`                                | Follows TOML                   | Advisory                  |
| Shell      | `enabled = true`                                | Follows TOML                   | Advisory                  |
| ESLint     | —                                               | —                              | Blocking (`deploy.yml`)   |
| Typecheck  | —                                               | —                              | Blocking (`tsc --noEmit`) |

Re-enable JavaScript only after:

1. Dashboard quality gate is limited to **critical/security** (or secrets detection only), **or**
2. Repository-wide ignore rules are set for JS-0125 ESM exports and medium complexity antipatterns, **and**
3. A full PR proves the check stays green without churning hundreds of files.

## PR review expectations

When the JavaScript analyzer is disabled and TS paths are excluded, inline **DeepSource JavaScript** PR comments should not appear. If failures persist after a config change, verify `.deepsource.toml` is saved in the DeepSource dashboard (**Settings → Preferences → TOML config**) and re-run analysis on the latest head.

See also: `docs/deepsource-setup.md`, `docs/deepsource-disposition.md`, `docs/audit-governance.md`.
