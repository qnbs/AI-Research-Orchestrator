# ADR 0020: Typed Pipeline Events

**Status:** Accepted — 2026-08-03

## Context

Research streams yielded free-text `phase` strings. Agent Debugger mapping used English substring heuristics (`getAgentForPhase`), which mis-routed Non-AI “PubMed and arXiv” retrieval to `ArxivFetcher` and broke the loading timeline under DE locale (string equality against i18n labels). ADR 0002 still pointed at `App.tsx` for phase→agent mapping.

## Decision

1. Introduce stable `PipelinePhaseId` values and a shared `ResearchStreamEvent` contract (`phaseId` + display `phase`) in `src/types/pipelineEvents.ts`.
2. Drive agent mapping and Orchestrator timeline index from `phaseId` (`PIPELINE_PHASE_AGENT`, `PIPELINE_TIMELINE_INDEX`).
3. Keep English `phase` labels for debugger messages and legacy `phaseDetails` chrome; do not use them for control flow.
4. Live (`geminiService`), Non-AI, and the mode adapter all emit typed events via `makePipelineEvent`.

## Consequences

- Combined PubMed+arXiv retrieval maps to `PubMedFetcher`.
- Loading timeline advances under any UI locale.
- ADR 0002’s mapping location is superseded: `src/app/getAgentForPhase.ts` + typed IDs.
- Future i18n can key off `phaseId` without changing producers.

## References

- `src/types/pipelineEvents.ts`
- `src/app/getAgentForPhase.ts`
- `src/app/useResearchSession.ts`
- ADR 0002 (orchestration), ADR 0017 (provenance bootstrap event)
