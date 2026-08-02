# ADR 0012: Corpus-Bound Citation Grounding

**Status:** Accepted — 2026-08-02

## Context

Research reports present AI-generated insights with `supportingArticles` PMIDs and ranked articles. Models can hallucinate identifiers not present in the retrieval corpus. Prior eval checks only searched for PMID substrings anywhere in serialized output.

## Decision

1. After ranking analysis, run `applyCorpusCitationGrounding()` against the retrieved PMID set.
2. Drop ranked articles and insight citations outside the corpus.
3. Drop insights with no valid supporting articles after sanitization.
4. Treat `aiSummary` as derived data in prompts and exports — never as the source abstract.
5. Measure citation quality with validity/completeness metrics in `agentEval`.

## Consequences

- Reports may contain fewer insights when the model cites invalid PMIDs (fail-safe).
- Full structured `GroundedClaim` schema deferred; corpus filtering is the first enforcement layer.
- Synthesis prose is not yet atomically claim-validated — residual hallucination risk remains in narrative text.

## References

- `src/lib/citationGrounding.ts`
- `src/services/geminiService.ts` (post-ranking grounding pass)
