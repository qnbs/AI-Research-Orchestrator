# ADR 0017: Immutable Execution Provenance

- **Status:** Accepted — 2026-08-02
- **Date:** 2026-08-02
- **Related:** ADR 0007 / 0009 (inference mode), P1-6 release metadata in `appReleaseInfo.ts`

## Context

Research reports already stamp `generationProvenance` (app version, commit SHA, schema/cache versions, inference mode). Mode was resolved **twice**: once in `researchOrchestratorAdapter` to choose live vs heuristic, and again in `useResearchSession` at completion for the stamp.

If the browser went online (or an API key became available) mid-run, the completion resolve could rewrite provenance to `live` for a run that actually executed the heuristic path — a scientific-integrity and audit failure.

## Decision

1. Introduce `ResearchExecutionContext`: `executionId`, `startedAt`, `inferenceMode`, `inferenceReason`, `providerId`, `model`, optional `endpointOrigin`, release fields, `promptRegistryVersion`, and append-only `transitions[]`.
2. Resolve inference **once** at stream start in `generateResearchReportStreamWithMode` and yield `{ phase: 'execution-provenance', executionContext }` before pipeline work.
3. `useResearchSession` captures that frozen context and stamps it via `stampReportWithProvenance({ executionContext })` — **no** second `resolveActiveInferenceMode` at completion.
4. Mid-run provider/mode switches are not silently applied. Prefer clean restart; if a transition is ever required, append an `InferenceTransition` rather than mutating the frozen mode fields.

## Consequences

- Report provenance always matches the backend that produced the report.
- UI inference badges may still reflect current connectivity; they must not overwrite historical provenance.
- Exports/history can cite `executionId` + `inferenceReason` for audit trails.

## References

- `src/lib/researchExecutionContext.ts`
- `src/services/researchOrchestratorAdapter.ts`
- `src/app/useResearchSession.ts`
