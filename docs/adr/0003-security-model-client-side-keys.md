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
4. **The master key is generated non-extractable** (`crypto.subtle.generateKey(..., extractable: false, ...)`) and the `CryptoKey` object itself — never raw key bytes — is persisted via IndexedDB's structured-clone support (`apiKeyService.ts`'s `getOrCreateEncryptionKey`). `crypto.subtle.exportKey` is never called anywhere in `apiKeyService.ts`; raw key material never exists in a form any JavaScript, including this app's own, can read. Only `crypto.subtle` can use the key to encrypt/decrypt.
5. Ciphertext stored alongside in the same origin DB (separate storage keys per credential).
6. Runtime decrypts in memory for Gemini SDK / NCBI E-utilities calls only.
7. Document residual XSS risk in `SECURITY.md`; CSP + DOMPurify reduce XSS surface.
8. CI enforces dependency audit, CodeQL, Dependency Review, and secret scanning.
9. **No migration path from the pre-hardening (extractable, raw-bytes) vault format.** If `getOrCreateEncryptionKey` finds a stored value that isn't a `CryptoKey` instance, it discards the entire vault and regenerates a fresh non-extractable key (`console.warn`, no recovery attempt). Confirmed acceptable because this app has zero production users; a real user base would need an explicit migration instead of a reset.

## Consequences

- No server-side key proxy to operate or breach.
- **A live, in-session XSS payload can still call this app's own `encryptApiKey`/`decryptApiKey` functions** while it runs (it shares the JS execution context), so this change does not fully eliminate "browser compromise ⇒ key compromise" for an actively-running attack. What it does close: a compromised script (or a future bug) that reads and exfiltrates the raw key material for **offline** reuse, or that persists it somewhere outside `crypto.subtle`'s control, can no longer do so — the raw bytes are never exposed to any JS-readable value in the first place.
- The pre-hardening vault reset (point 9) means any user who already stored provider keys on an older build loses them on first load after upgrading and must re-enter them — surfaced to the user via a notification (`setVaultResetListener`), not silent. Acceptable pre-launch; would need a real migration path post-launch.
- **Persisting a `CryptoKey` object in IndexedDB relies on the browser's structured-clone algorithm supporting it** — solid in evergreen Chrome/Firefox for years and in Safari since v14, but narrower than the old raw-`Uint8Array` storage's universal support. There is no fallback or feature detection: if `saveToKeyStore` ever throws on an unsupported engine, every subsequent encrypt/decrypt call fails. Not expected to matter in practice given this app's supported-browser baseline, but noted as a real (if narrow) compatibility surface.
- **The in-flight key-resolution cache only serializes callers within one JS module instance — i.e. one browser tab.** It closes the race for concurrent calls within a tab (the one actually observed and reported), but two tabs of this PWA open simultaneously against a fresh or pre-hardening vault each have their own cache and can still independently detect the missing/legacy key and race to generate/save a different one, with the last write silently orphaning whatever the other tab just encrypted — the same failure mode, just narrowed from "any concurrent call" to "any concurrent call from a different tab." Not closed here (would need a cross-tab lock, e.g. the Web Locks API); tracked as a residual gap rather than overstating the guarantee.
- **A concurrent read racing a vault reset can log a `console.error` decrypt failure instead of a clean "key missing" path.** `getEncryptedSecret` reads its ciphertext before awaiting `decryptApiKey`/`getOrCreateEncryptionKey()`; if a pre-hardening vault triggers a reset while that read is in flight (e.g. `ApiKeySettings.tsx`'s mount-time `Promise.all`), the decrypt runs against ciphertext encrypted under the just-discarded key and throws, which the caller's catch logs and swallows as `null`. The observable outcome for the user is identical to the intended reset (keys are gone, re-entry required) — this only affects console noise during a normal upgrade, not correctness.
- Future hardening options: session timeout clearing in-memory decrypted key, cross-tab locking via `navigator.locks`, optional OS-level credential APIs if available.

## Alternatives Considered

- Backend proxy with server-stored keys: rejected (privacy / zero-knowledge goal).
- Env-only keys for production: rejected for GitHub Pages multi-tenant forks.
