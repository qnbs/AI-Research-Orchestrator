# DeepSource #410 — repository verification (2026-11-05, Europe/Berlin)

Evidence for the **P1 audit DeepSource slice** on [#410](https://github.com/qnbs/AI-Research-Orchestrator/issues/410): restore intentional JavaScript-off policy without globally suppressing Docker/Shell on application and devcontainer shell sources.

**Reference `main`:** verify at close time with `git rev-parse origin/main` (snapshot when this doc landed: **`05e1c93`**).

---

## Problem (regression #436)

Merged [#436](https://github.com/qnbs/AI-Research-Orchestrator/pull/436) added repository-wide `exclude_patterns` (including `.devcontainer/**`, `src/**`, `**/*.ts`) while keeping Docker/Shell **enabled**. DeepSource applies top-level `exclude_patterns` to **every** analyzer, so Shell no longer saw `.devcontainer/postCreate.sh` even though [#423](https://github.com/qnbs/AI-Research-Orchestrator/pull/423) / disposition docs claimed it did.

---

## Fix merged (#439)

[#439](https://github.com/qnbs/AI-Research-Orchestrator/pull/439) narrowed excludes and kept:

| Analyzer   | TOML              |
| ---------- | ----------------- |
| JavaScript | `enabled = false` |
| Docker     | `enabled = true`  |
| Shell      | `enabled = true`  |

**Devcontainer:** only `.devcontainer/Dockerfile` is excluded (Dockerfile lint noise). **`.devcontainer/postCreate.sh` is not listed** in `exclude_patterns`.

Authoritative file: `.deepsource.toml` at repo root.

---

## Automated checks (repo — no dashboard login)

These run on every PR touching facts or TOML:

```bash
pnpm run check:docs-drift   # asserts project-facts.json deepsourceJavaScriptEnabled: false + TOML javascript block with enabled = false
```

**Manual grep (maintainer or agent):**

```bash
# postCreate must NOT appear in exclude_patterns
grep -n postCreate .deepsource.toml && echo UNEXPECTED || echo OK-not-excluded
grep -E '^\s*"\.devcontainer/\*\*"' .deepsource.toml && echo BAD-global-devcontainer || echo OK-no-global-devcontainer
grep -E '^\s*"src/\*\*"' .deepsource.toml && echo BAD-global-src || echo OK-no-global-src
```

**Intentional non-source excludes (accepted scope):** `scripts/**`, `public/**`, `dist/**`, `coverage/**`, `eslint-local-rules/**` — maintenance scripts and generated/vendor assets; TS/TSX quality remains **ESLint + tsc** in `deploy.yml` (`docs/deepsource-javascript-ci.md`).

---

## What GitHub status alone does not prove

Issue #410 notes **`DeepSource: Analysis — SKIPPED`** on some `main` heads when no analysis run executes. Green app CI + correct TOML **do not** replace dashboard confirmation that Shell actually analyzed `postCreate.sh` on a recent commit.

**Maintainer dashboard checklist** ([project settings](https://app.deepsource.com/gh/qnbs/AI-Research-Orchestrator)):

1. **Settings → Preferences:** **Use `.deepsource.toml` configuration** enabled.
2. **Settings → Code Review → Analyzers:** JavaScript **off** (matches TOML); Docker + Shell **on**.
3. **Latest successful analysis:** open **Analyzed files** (or equivalent) and confirm `.devcontainer/postCreate.sh` appears under Shell **or** document an explicit alternative control (e.g. dedicated ShellCheck job — **not** present in blocking CI today).

If analysis stays SKIPPED, trigger a run (push to `main` or re-analyze) before claiming file-level Shell coverage in external comms.

---

## Related docs

- `docs/deepsource-dashboard-off.md` — dashboard toggle + TOML-as-source-of-truth
- `docs/deepsource-disposition.md` — GitHub check vs global excludes table
- `docs/deepsource-javascript-ci.md` — do not re-add `src/**` / `.devcontainer/**` when JS is off
- `CHANGELOG.md` [0.4.7] — #410 DeepSource bullet

---

## Disposition

| Item                                        | Status                                                               |
| ------------------------------------------- | -------------------------------------------------------------------- |
| TOML regression fixed (#439)                | **Verified in git** on reference `main`                              |
| Drift gate aligned                          | **Verified** (`deepsourceJavaScriptEnabled: false`)                  |
| Shell scanned `postCreate.sh` on DeepSource | **Maintainer dashboard** — not independently verified by Cloud Agent |
