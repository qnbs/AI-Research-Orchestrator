# Maintainer issue closure — #409 (dashboard provenance slice)

Cloud Agent integration **cannot** close GitHub issues (`403`). Use when **`main`** matches the evidence below.

**Reference `main`:** **`05e1c93`** (2026-11-05, Europe/Berlin). Evidence: `docs/audits/2026-11-05-dashboard-provenance-409.md`.

---

## [#409](https://github.com/qnbs/AI-Research-Orchestrator/issues/409) — Dashboard OA / source provenance

**Ready to close (dashboard slice only)** when maintainer accepts:

1. **#438** on `main` — metrics module + E2E §5b.
2. Blocking CI green on the same lineage (`agent-flow.spec.ts` in Chromium + cross-browser jobs).

**Close comment (copy-paste):**

> **Nov 2026 audit wave — dashboard slice: close**
>
> OA and retrieval-source dashboard charts with accessible table twins landed (#438). Classification in `dashboardArticleMetrics.ts`; blocking E2E `5b. Dashboard provenance charts` on `main`. Evidence: `docs/audits/2026-11-05-dashboard-provenance-409.md`.
>
> Remaining non-dashboard #409 scope (if any) should be re-opened or tracked separately — this close is intentionally bounded to the chart/provenance slice.

---

## Verification (maintainer)

```bash
git fetch origin main && git checkout main && git pull
pnpm exec vitest run src/lib/dashboardArticleMetrics.test.ts
# Full §5b: read e2e.yml job log for agent-flow.spec.ts on latest main push
```
