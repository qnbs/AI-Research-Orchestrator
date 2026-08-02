# ADR 0015: Grounded Synthesis Schema

## Status

Accepted — 2026-08-02

## Context

Research reports store narrative synthesis as free-form markdown (`ResearchReport.synthesis`). Inline PMIDs are prompt-instructed in live mode but not atomically validated. Insights (`aiGeneratedInsights`) already carry corpus-bound `supportingArticles`, but the narrative layer lacked a structured, export-validatable representation.

Audit P0-3 identified this gap: hallucinated or uncited claims in synthesis prose cannot be filtered at export time without structured claims.

## Decision

1. Add optional `groundedSynthesis?: GroundedSynthesis` on `ResearchReport`, with `GroundedClaim { text, pmids[] }` entries.
2. Populate claims in two paths:
   - **Heuristic (`nonAi`)**: map `ExtractiveSynthesis.keyFindings` and `NarrativeSection` blocks via `buildGroundedSynthesisFromExtractive` (`mode: extractive-template`).
   - **Live stream**: after synthesis completes, extract corpus-bound PMIDs from markdown blocks via `extractGroundedClaimsFromMarkdown` (`mode: narrative-extracted`).
3. Sanitize claims on export through `sanitizeGroundedSynthesis` (reuses `partitionCorpusCitations`).
4. Validate `groundedSynthesis` shape on KB JSON import (`knowledgeBaseValidation.ts`).

`ResearchReport.synthesis` remains the display source of truth for UI; `groundedSynthesis` is the validation/export layer. No Dexie schema bump required — optional field is persisted inside existing `report` JSON blobs.

## Consequences

- Export and import paths can reject or strip hallucinated synthesis citations.
- Live-mode claim extraction is best-effort (PMID-tagged paragraphs only); full structured synthesis JSON remains a future provider capability.
- Heuristic reports gain richer structured provenance without changing the markdown UX.

## References

- ADR 0012 (corpus citation grounding)
- `src/lib/groundedSynthesis.ts`
- Audit follow-up item P0-3 completion in `docs/audits/2026-08-02-full-scale-audit.md`
