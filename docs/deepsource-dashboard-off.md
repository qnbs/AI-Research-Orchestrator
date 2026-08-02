# Turning off DeepSource JavaScript (repo owner)

The **`DeepSource: JavaScript`** GitHub status is controlled by the **DeepSource dashboard**, not only by `.deepsource.toml`. Setting `enabled = false` in TOML **does not** stop the check if the dashboard still has the analyzer active (confirmed on sibling repo `Nexus-HEMS-Dash` PR #301).

## Required dashboard steps (~2 minutes)

1. Open [DeepSource → AI-Research-Orchestrator](https://app.deepsource.com/gh/qnbs/AI-Research-Orchestrator).
2. Go to **Settings → Code Review → Analyzers**.
3. Find **JavaScript** and **toggle it off**.
4. (Optional) Under **Quality Gates → Issue Reporting**, limit failure categories to **critical / security** only if re-enabling later.

After toggling off, the next PR push should stop posting `DeepSource: JavaScript` **FAILURE** (check may disappear or turn green).

## What we changed in git

- Removed the `[[analyzers]] name = "javascript"` block from `.deepsource.toml` (Docker + Shell only).
- Documented root causes in `docs/deepsource-javascript-ci.md`.
- `docs/project-facts.json`: `deepsourceJavaScriptEnabled: false`.
- `check:docs-drift` enforces no enabled JavaScript analyzer in TOML.

## Authoritative gates (unchanged)

- `pnpm run typecheck`
- `pnpm run lint` (ESLint 9, zero warnings)
- `pnpm run test:coverage` + `deploy.yml` build/bundle gates

Do **not** re-enable JavaScript in the dashboard until quality gates are narrowed or repository-wide ignore rules are set (see `docs/deepsource-javascript-ci.md`).
