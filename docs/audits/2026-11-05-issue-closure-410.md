# Maintainer issue closure — #410 (DeepSource / audit slice)

Cloud Agent integration **cannot** close GitHub issues (`403`). Use when **`main`** matches the evidence below.

**Reference `main`:** **`05e1c93`** (2026-11-05, Europe/Berlin). Full verification steps: `docs/audits/2026-11-05-deepsource-410-verification.md`.

---

## [#410](https://github.com/qnbs/AI-Research-Orchestrator/issues/410) — P1 DeepSource scanner coverage

Issue body also tracks the broader **WS-15 agent correction lane**; this closure pack covers the **audit-recovery DeepSource acceptance slice** recorded in `docs/audits/2026-11-04-p1-issue-disposition.md`.

**Ready to close (DeepSource slice)** when maintainer accepts:

1. **Merged [#439](https://github.com/qnbs/AI-Research-Orchestrator/pull/439):** removed global `src/**` / `.devcontainer/**` excludes; JavaScript `enabled = false`; Docker + Shell enabled; narrow `.devcontainer/Dockerfile` exclude only.
2. **Repo drift gate:** `docs/project-facts.json` → `deepsourceJavaScriptEnabled: false`; `pnpm run check:docs-drift` passes on `main`.
3. **Dashboard (one-time):** confirm TOML-as-source-of-truth + JavaScript off + Shell/Docker on; optionally confirm `.devcontainer/postCreate.sh` in last Shell analyzed-files list (see verification doc — SKIPPED GitHub status is not enough).

**Out of scope for this close:** re-enabling DeepSource JavaScript; adding repository-wide excludes to silence JS; weakening ESLint/tsc/audit gates.

**Close comment (copy-paste — DeepSource slice):**

> **Nov 2026 audit wave — DeepSource slice: close**
>
> Regression from #436 (global excludes hiding Shell on `.devcontainer/postCreate.sh`) fixed in #439. Current `.deepsource.toml`: JS off, Docker/Shell on, only `.devcontainer/Dockerfile` excluded. Drift gate + docs: `docs/audits/2026-11-05-deepsource-410-verification.md`, `CHANGELOG` [0.4.7].
>
> Maintainer: confirm DeepSource dashboard once (TOML mode, analyzer toggles, optional Shell file list for `postCreate.sh`). Broader WS-15 correction-lane metrics remain living process — not blocked on this close.

---

## Verification (maintainer)

```bash
git fetch origin main && git checkout main && git pull
pnpm run check:docs-drift
grep -E 'name = "shell"|enabled = true' .deepsource.toml
! grep -q 'postCreate' .deepsource.toml
! grep -q '"\.devcontainer/\*\*"' .deepsource.toml
```

Then open DeepSource dashboard per verification doc § “Maintainer dashboard checklist”.
