# Dashboard provenance slice — #409 evidence (2026-11-05)

**Scope:** OA and retrieval-source dashboard charts with accessible table twins — **not** a full scientific-integrity audit (broader #409 body may remain open for non-dashboard items; this slice is closeable per P1 ledger).

**Reference `main`:** **`05e1c93`** (Europe/Berlin).

---

## Implementation

| Area                       | Location                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| OA / source classification | `src/lib/dashboardArticleMetrics.ts` (`classifyDashboardOpenAccess`, `classifyDashboardRetrievalSource`, counters)                  |
| Unit tests                 | `src/lib/dashboardArticleMetrics.test.ts`                                                                                           |
| E2E                        | `src/test/e2e/agent-flow.spec.ts` — **`5b. Dashboard provenance charts`** (demo KB, subtitles, sr-only table row counts vs metrics) |

**Merged feature PR:** **#438** (audit-recovery wave).

---

## Acceptance (this slice)

- Chart subtitles `dashboard.chart.source_sub` / `dashboard.chart.oa_sub` visible on Dashboard with demo KB.
- Accessible tables under `dashboard.a11y.tables` match `countDashboardOpenAccessBuckets` / `countDashboardRetrievalSources` row counts.
- Blocking E2E on `main` includes §5b via `e2e.yml` / cross-browser matrix.

---

## Out of scope (separate issues / future work)

- Corpus-wide integrity revalidation (`docs/audits/2026-08-02-scientific-integrity-revalidation.md` lineage).
- Non-dashboard #409 checklist items not tied to OA/source charts.
