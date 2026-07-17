# ADR 0006: Prompt versioning registry

## Status

Accepted (2026-07-16 Phase 2)

## Context

Gemini system instructions lived as inline strings in `geminiService.ts` with no stable identifiers. Offline evals and AUDIT trails could not pin behavior across releases.

## Decision

Introduce `src/lib/promptRegistry.ts` with:

- `PROMPT_CATALOG_VERSION` (date-stamped catalog)
- `PromptId` constants per feature surface
- `promptTag(id)` embedded at the start of system preambles

`getPreamble` and report chat context include the tag. Offline scoring lives in `src/lib/agentEval.ts`.

## Consequences

- Prompt changes bump `PROMPT_CATALOG_VERSION` or add new `PromptId`s.
- Eval harness can assert citation grounding / schema without live Gemini calls.
- Tags are low-noise for models; they are primarily for humans and harnesses.
