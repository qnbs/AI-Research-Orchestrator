# ADR 0003: Security Model — Client-Side API Keys

- **Status:** Accepted
- **Date:** 2026-07-16
- **Amended:** 2026-07-22 (non-extractable master key, WS-C hardening pass)

## Context

The product is a static GitHub Pages PWA with no backend. Users must supply a Gemini API key. Storing keys in repo/env is unsafe and incompatible with multi-user forks.

## Decision

1. User enters keys in Settings → AI Configuration.
2. **Gemini key validation before encrypt:** accept only keys matching `AIza` + 35 alphanumerics (39 chars total via `validateApiKeyFormat`). Reject malformed input without storing or encrypting.
3. Gemini (and optional NCBI) keys are AES-GCM encrypted with a Web Crypto master key stored in IndexedDB vault `APIKeyVault`.
4. **The master key is generated non-extractable** (`crypto.subtle.generateKey(..., extractable: false, ...)`) and the `CryptoKey` object itself — never raw key bytes — is persisted via IndexedDB's structured-clone support (`apiKeyService.ts`'s `getOrCreateEncryptionKey`). `crypto.subtle.exportKey` is never called anywhere in this file; raw key material never exists in a form any JavaScript, including this app's own, can read. Only `crypto.subtle` can use the key to encrypt/decrypt.
5. Ciphertext stored alongside in the same origin DB (separate storage keys per credential).
6. Runtime decrypts in memory for Gemini SDK / NCBI E-utilities calls only.
7. Document residual XSS risk in `SECURITY.md`; CSP + DOMPurify reduce XSS surface.
8. CI enforces dependency audit, CodeQL, Dependency Review, and secret scanning.
9. **No migration path from the pre-hardening (extractable, raw-bytes) vault format.** If `getOrCreateEncryptionKey` finds a stored value that isn't a `CryptoKey` instance, it discards the entire vault and regenerates a fresh non-extractable key (`console.warn`, no recovery attempt). Confirmed acceptable because this app has zero production users; a real user base would need an explicit migration instead of a reset.

## Consequences

- No server-side key proxy to operate or breach.
- **A live, in-session XSS payload can still call this app's own `encryptApiKey`/`decryptApiKey` functions** while it runs (it shares the JS execution context), so this change does not fully eliminate "browser compromise ⇒ key compromise" for an actively-running attack. What it does close: a compromised script (or a future bug) that reads and exfiltrates the raw key material for **offline** reuse, or that persists it somewhere outside `crypto.subtle`'s control, can no longer do so — the raw bytes are never exposed to any JS-readable value in the first place.
- The pre-hardening vault reset (point 9) means any user who already stored provider keys on an older build loses them silently on first load after upgrading and must re-enter them. Acceptable pre-launch; would need a real migration path post-launch.
- Future hardening options: session timeout clearing in-memory decrypted key, optional OS-level credential APIs if available.

## Alternatives Considered

- Backend proxy with server-stored keys: rejected (privacy / zero-knowledge goal).
- Env-only keys for production: rejected for GitHub Pages multi-tenant forks.
