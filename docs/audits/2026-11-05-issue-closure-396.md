# Maintainer issue closure — #396 (minimatch / security audit)

Cloud Agent integration **cannot** close GitHub issues (`403`). Use when **`main`** matches the evidence below.

**Reference `main`:** **`4c75740`** (2026-11-05, Europe/Berlin). **Blocking gate:** `pnpm audit --audit-level=high` in `security.yml`.

---

## [#396](https://github.com/qnbs/AI-Research-Orchestrator/issues/396) — Security / audit remediation

**Ready to close** when maintainer accepts:

1. **Resolved on `main`:** `brace-expansion` workspace overrides (**#441** / GHSA-q2hr-2g5m-vwhr) — see `docs/dependabot-disposition.md`.
2. **Deferred with ledger:** `minimatch@3.1.5` on **eslint@9 dev tree only** (GHSA-g3hv-75wg-m249 advisory range vs v3.1.5 applicability disputed); `minimatch@10.2.6` on typescript-eslint/LHCI dev paths. **No production browser bundle exposure.**
3. **CI:** `pnpm audit --audit-level=high` **exit 0** on `main` (moderate dev-only findings may remain on default `pnpm audit`).

**Do not** force `pnpm.overrides` `minimatch@3` → `11` without eslint/typescript-eslint compatibility proof.

**Close comment (copy-paste):**

> **Nov 2026 audit wave — disposition: close**
>
> High-severity audit gate green on `main`. `brace-expansion` remediated via overrides (#441). `minimatch` documented **deferred** (dev-only eslint/LHCI chains; advisory-range clarification tracked in `docs/dependabot-disposition.md` § minimatch evidence ledger). Revisit when eslint ecosystem ships compatible patched `minimatch@3` or advisory-database clarifies v3.1.5.

---

## Verification (maintainer)

```bash
git fetch origin main && git checkout main && git pull
pnpm audit --audit-level=high   # expect exit 0
pnpm audit                      # may list 2 moderate minimatch (dev paths)
pnpm why minimatch
```

Evidence refresh: `docs/audits/2026-11-05-minimatch-396-evidence.md`.
