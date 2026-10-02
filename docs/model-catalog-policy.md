# AI provider model catalog policy

**Verified:** 2026-10-02 (Composer 2.5 full-scale audit, master prompt §7)

## Goals

- Curated **recommended** model IDs in Settings must not include vendor-retired or known-shutdown models.
- **Defaults** stay cost-aware (`gemini-2.5-flash`, `claude-sonnet-4-5`, `gpt-5`) until a deliberate product change.
- Users may still enter **free-text** model IDs for OpenAI, Anthropic, and Ollama (`settingsModelValidation` allows any non-empty string except Gemini/heuristic curation rules).

## Source of truth

- Catalog entries and the retired-ID blocklist live in `src/services/providers/modelCatalog.ts`.
- `AI_PROVIDERS` in `provider.ts` reads suggested lists and defaults from that module.
- Regression tests in `modelCatalog.test.ts` fail if a retired ID re-enters suggestions or defaults.

## Verification cadence

Re-check vendor retirement notices and model families when bumping provider SDKs or cutting a release. Update `MODEL_CATALOG_VERIFIED_AT` and the blocklist with a short note in `CHANGELOG.md`.

## Out of scope

- Runtime model-list discovery (optional future work; must not block Settings boot).
- Automatic default bumps to newest flagship models without adapter/cost review.
