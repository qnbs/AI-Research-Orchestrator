# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Threat Model (Client-Side PWA)

This application is a **local-first, zero-backend PWA**. There is no application server that stores user research data or API keys.

### Assets

- Gemini API key (user-supplied)
- Optional NCBI API key (Settings → AI Configuration, encrypted vault)
- Local research reports, knowledge base, collections (IndexedDB / Dexie)
- Session UI state (Redux)

### Trust Boundaries

1. **Browser process** — fully trusted by the user; XSS or malicious extensions can read IndexedDB and memory.
2. **External APIs** — Google Gemini, NCBI E-utilities, arXiv. Payloads that leave the device include: the user’s research topic/query, PubMed/arXiv article metadata and abstracts, generated report context used for ranking/synthesis/chat, plus the user’s Gemini (and optional NCBI) credentials.
3. **GitHub Pages origin** — static assets only; CSP restricts script sources.

### Mitigations

- API keys encrypted with AES-GCM via Web Crypto before IndexedDB persistence (`apiKeyService`).
- Keys never committed; `.env` is documentation-only (see `.env.example`).
- DOMPurify for rendered Markdown/HTML; prompt fragment sanitization.
- CSP baseline in `index.html`.
- CSV formula-injection sanitization on export.
- AbortSignal + typed `AppError` / circuit breakers for external calls.
- CI: `pnpm audit`, CodeQL, Dependency Review, secret scanning (gitleaks).

### Residual Risks

- Encryption key material lives in the same browser origin as ciphertext — protects casual disk inspection, **not** XSS.
- Broad `connect-src` needed for PubMed/Gemini/CDN; tighten further when self-hosting with known hosts.
- Import-map CDN (`aistudiocdn.com`) requires network egress at runtime.

## Reporting a Vulnerability

Please open a **private** security advisory on GitHub (Security → Advisories → New draft advisory) or email the maintainer listed in the repository profile.

Do **not** open a public issue for undisclosed vulnerabilities.

Include:

- Affected version / commit
- Reproduction steps
- Impact assessment (confidentiality / integrity / availability)
- Any suggested fix

We aim to acknowledge reports within **7 days** and ship fixes as soon as practicable for supported versions.

## API Key Handling Best Practices (Users)

1. Create a dedicated Gemini key with usage quotas / billing alerts.
2. Enter the key only via **Settings → AI Configuration**.
3. Revoke keys that may have been exposed (browser compromise, shared machine).
4. Prefer a personal device; avoid untrusted browser extensions on research machines.
5. For higher PubMed rate limits, enter an NCBI API key under **Settings → AI Configuration** (encrypted like the Gemini key) — never paste keys into prompts or issue trackers.
