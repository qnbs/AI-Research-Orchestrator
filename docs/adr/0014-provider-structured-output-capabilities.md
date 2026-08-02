# ADR 0014: Provider Structured Output Capabilities

**Status:** Accepted — 2026-08-02

## Context

A single `jsonMode: boolean` capability hid materially different guarantees: Gemini enforces `responseSchema`; OpenAI requests `json_object` without schema; Anthropic relies on prompt discipline.

## Decision

Extend `ProviderCapabilities` with:

- `structuredOutput.jsonObjectMode`
- `structuredOutput.nativeJsonSchema`
- `structuredOutput.streamingStructuredOutput`
- `supportsAbort`
- `supportsCustomBaseUrl`

Retain `jsonMode` as a backward-compatible alias of `jsonObjectMode`.

Add provider contract tests documenting differences.

## Consequences

- Facade code can branch on real guarantees before expensive orchestration steps.
- Runtime schema validation at every boundary remains incremental work (not fully solved here).

## References

- `src/services/providers/types.ts` (`providerCapabilities()`)
- `src/services/providers/providerCapabilities.test.ts`
