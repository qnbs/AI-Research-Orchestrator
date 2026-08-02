# ADR 0013: Custom Endpoint Trust Policy

**Status:** Accepted — 2026-08-02

## Context

OpenAI-compatible and Ollama providers accept custom `baseURL` values. Browser SDKs send API keys to the configured origin. The static CSP `connect-src` allowlist cannot safely enumerate arbitrary runtime hosts in a GitHub Pages PWA.

## Decision

1. Validate custom URLs with `validateCustomEndpointUrl()` (scheme, credentials, loopback HTTP exception).
2. Require the user to approve the parsed **origin** (`approvedEndpointOrigin`) before requests are sent.
3. Block requests to origins not on the CSP allowlist — do not broaden CSP to `*`.
4. Invalidate approval when the URL changes to a different origin.
5. `testConnection(baseURL)` must exercise the configured base URL, not a hard-coded default host.

## Consequences

- Arbitrary third-party endpoints cannot work without self-hosting with a tailored CSP.
- Users see explicit confirmation of where keys and research content are sent.
- Gemini remains on the fixed Google endpoint (no custom base URL).

## References

- `src/lib/endpointPolicy.ts`
- `src/components/settings/AISettingsTab.tsx` (approval UI)
