# ADR 0010: First-Class OpenRouter Provider with Free-Model Primacy

## Status

Proposed — 2026-07-21

> Ratify to `Accepted — <date>` during implementation. Adding a provider follows the established pattern (ADR-0008) and is not a blocking architectural fork; this ADR records intent and the free-model design so the work is reviewable.

## Context

OpenRouter is currently a **second-class path**: it is not an `AIProviderId`. A user reaches it only by selecting the `openai` provider and manually setting `customBaseUrl = https://openrouter.ai/api/v1` (ADR-0008 §3, "openai — OpenAI SDK with configurable baseURL (supports OpenRouter)"). The generic base-URL help text advertises this. Consequences:

- OpenRouter's most compelling feature — **free models** (`:free` suffix, e.g. free reasoning models) that give a genuine zero-cost cloud research path — is invisible and unreachable without insider knowledge.
- Cost display, model suggestions, error taxonomy, circuit-breaker tuning, and the inference badge all treat the endpoint as generic OpenAI, so free-tier rate limits and `$0` pricing are not surfaced.
- The endpoint string is a manual, error-prone configuration step.

The CSP in `index.html` already permits `https://openrouter.ai`. The product is pre-1.0 with **no existing users**, so there is no legacy `openai`+OpenRouter configuration to migrate — the hack is simply removed rather than converted.

`qnbs/WorldScript-Studio` demonstrates a first-class OpenRouter provider with free-model primacy; its UX and resilience values are used as a benchmark, adapted to this repo's stricter provider-agnostic architecture and verified against current OpenRouter reality.

## Decision

1. **Add `'openrouter'` to `AIProviderId`.** The `openai` provider is left untouched and continues to serve real OpenAI and genuine OpenAI-compatible proxies via `customBaseUrl`.
2. **Dedicated adapter** `src/services/providers/openrouter.ts`, reusing the OpenAI SDK internally with a **hard-coded** `baseURL = 'https://openrouter.ai/api/v1'`, its own `openrouter` encrypted key slot, OpenRouter attribution headers (`HTTP-Referer`, `X-Title`), and a client cache keyed by API key + headers. Registered in `factory.ts` like the other backends. `ProviderMeta`: `label: 'OpenRouter'`, `supportsBaseUrl: false`, `requiresApiKey: true`, capability flags mirroring OpenAI (streaming, JSON mode, chat), key hint linking to `https://openrouter.ai/keys`.
3. **Free-model primacy.**
   - `isFreeModel(model): boolean` (recognises the `:free` suffix plus an explicit catalogue flag).
   - `defaultModel` is a **verified-live** free reasoning model (confirmed against OpenRouter at implementation time — model ids are deprecated over time, so the default is validated, not assumed).
   - Model suggestions are ordered **free-first**; the picker shows a visible "Free" indicator.
   - `CostEstimateCard` detects free models and displays `$0 · Free tier`.
4. **Resilience.** Reuse `lib/circuitBreaker.ts` with a free-tier-tuned configuration (benchmark: open after ~4 consecutive 429s, half-open after ~5 minutes; free tier ≈ 20 req/min, ≈ 50 req/day — current limits verified at implementation). OpenRouter error bodies are mapped into the existing `lib/errors.ts` taxonomy (`PROVIDER_RATE_LIMIT` / `PROVIDER_QUOTA` / `PROVIDER_AUTH`). Streaming and `AbortSignal` behave identically to the OpenAI adapter.
5. **Settings UX.** The provider dropdown gains "OpenRouter". When selected, the base-URL field is hidden/locked (the user never types the endpoint), the model field pre-fills the default free model with the Free indicator and lists free models first, the key input uses the OpenRouter format hint + link, and the help text states the free-tier limits. The OpenRouter framing is removed from the generic `customBaseUrl` help, which remains only for real OpenAI-compatible proxies. The inference-mode badge/resolver labels OpenRouter correctly.
6. **No migration.** Legacy `openai`+OpenRouter-baseURL configurations are **not** detected or converted (no users); the hack framing is deleted.
7. **Zero-cost onboarding.** Empty-state / onboarding copy actively recommends the zero-cost paths, ranked: **1) Heuristic / programmatic engine (offline, ADR-0009) · 2) Ollama (local) · 3) OpenRouter free models (cloud, $0) · 4) Gemini / OpenAI / Anthropic (paid)**.

## Consequences

- **Supersedes ADR-0008 §3** for OpenRouter: it is a first-class provider, no longer an `openai` + base-URL configuration.
- Free models become the easiest and most attractive path in the app; a free OpenRouter key powers a complete research run at zero monetary cost.
- The `openrouter` key slot inherits the hardened, non-extractable key storage; no key leaves the browser except in the direct HTTPS request to OpenRouter.
- The curated model catalogue is **static** (no live fetch), which is more reliable but requires occasional manual refresh as OpenRouter's free line-up changes.
- No CSP change is required (`https://openrouter.ai` already permitted).
- Existing Gemini / OpenAI / Anthropic / Ollama / heuristic paths are unaffected.

## Deferred work

- Dynamic fetch of the live OpenRouter model catalogue.
- Credit-balance / spend tracking beyond `CostEstimateCard`.
- Multi-key rotation and in-request multi-provider fallback chains.
