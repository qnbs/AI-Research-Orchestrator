# ADR 0003: Security Model — Client-Side API Keys

- **Status:** Accepted
- **Date:** 2026-07-16

## Context

The product is a static GitHub Pages PWA with no backend. Users must supply a Gemini API key. Storing keys in repo/env is unsafe and incompatible with multi-user forks.

## Decision

1. User enters key in Settings UI.
2. Key is AES-GCM encrypted with a Web Crypto key stored in IndexedDB vault `APIKeyVault`.
3. Ciphertext stored alongside in the same origin DB.
4. Runtime reads decrypt in memory for Gemini SDK calls only.
5. Document residual XSS risk in `SECURITY.md`; CSP + DOMPurify reduce XSS surface.
6. CI enforces dependency audit, CodeQL, Dependency Review, and secret scanning.

## Consequences

- No server-side key proxy to operate or breach.
- Browser compromise ⇒ key compromise (by design of client-only apps).
- Future hardening options: session timeout clearing in-memory key, optional OS-level credential APIs if available.

## Alternatives Considered

- Backend proxy with server-stored keys: rejected (privacy / zero-knowledge goal).
- Env-only keys for production: rejected for GitHub Pages multi-tenant forks.
