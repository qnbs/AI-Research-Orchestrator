# ADR 0008: Multi-Provider AI Architecture

## Status

Accepted — 2026-07-19

## Context

Since inception the application coupled every AI feature to Google Gemini via `@google/genai`. Gemini provides unique capabilities (Google Search grounding, native JSON schema, thinking budget), but users increasingly ask for provider choice: OpenAI / GPT models, Anthropic Claude, local Ollama endpoints, and OpenRouter-compatible proxies. A hard dependency on one vendor conflicts with the project's local-first, privacy-preserving philosophy and limits users who cannot obtain a Gemini key.

## Decision

1. Introduce a **provider-agnostic transport layer** under `src/services/providers/`.
   - `types.ts`: shared request/response/chat shapes and capability flags.
   - `provider.ts`: `AIProvider` interface and per-provider UI metadata (`AI_PROVIDERS`).
   - `factory.ts`: lazy `import()` per backend so SDKs become async chunks and do not inflate the initial bundle.
2. Keep `geminiService.ts` as the **feature façade**. It still owns prompts, JSON parsing, and heuristic forks; AI calls are routed through `getProviderForSettings(aiSettings)`.
3. Implement adapters for:
   - `gemini` — full capability, Google Search grounding.
   - `openai` — OpenAI SDK with configurable `baseURL` (supports OpenRouter).
   - `anthropic` — Anthropic Messages SDK with `dangerouslyAllowBrowser: true`.
   - `ollama` — plain `fetch` to a local Ollama HTTP API, no API key.
   - `heuristic` — deterministic local adapter exposing the existing heuristic layer behind the same interface.
4. Extend `Settings.ai` with `provider` and `customBaseUrl`. Migration defaults missing `provider` to `'gemini'`.
5. Generalize error taxonomy in `src/lib/errors.ts` to `PROVIDER_*` codes while keeping `GEMINI_*` aliases for backward compatibility.
6. `apiKeyService.ts` moves to per-provider encrypted storage slots; legacy `encrypted-api-key` migrates to the Gemini slot.
7. Capability fallbacks are honest: non-Gemini providers do not have web grounding, so `findRelatedOnline` falls back to the heuristic stub and the UI badge reflects the active provider.
8. `geminiApiSlice` reducer path is **kept** to avoid Redux cache churn; the rename is cosmetic and documented here as a deviation from earlier planning drafts.

## Consequences

- Users can choose their AI backend in Settings → AI Provider.
- SDKs for OpenAI/Anthropic are loaded on demand; initial bundle size is unaffected.
- Web-grounded search remains a Gemini-only capability, clearly labeled.
- Local-first / zero-cost heuristic mode remains intact and is now also selectable as an explicit provider.
- Settings and key vault migrations are tested; existing Gemini users keep working without action.
- CSP `connect-src` is widened to include OpenAI, OpenRouter, Anthropic, and `localhost:11434`.

## Deferred work

The following items are intentionally left for a follow-up iteration so this change can be reviewed and merged promptly:

- `src/test/e2e/provider-flow.spec.ts` — provider switching updates model list + key UI; heuristic-as-provider selection.
- `src/test/e2e/journal-hub.spec.ts` — bottom-nav → suggest → analyze featured journal → rich profile → save to KB → re-open.
- Closing coverage hotspots: `heuristics/chat.ts` and `heuristics/journalProfiling.ts` branches ≥80%, `researchStream.ts` lines ≥70%.
- Settings export/import round-trip test including provider fields + migration.
