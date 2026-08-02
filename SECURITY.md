# Security Policy

## Supported Versions

| Version | Supported                                |
| ------- | ---------------------------------------- |
| 0.4.x   | :white_check_mark:                       |
| 0.2.x   | :white_check_mark: (security fixes only) |
| 0.1.x   | :x:                                      |
| < 0.1   | :x:                                      |

Production deploys track `main` on GitHub Pages; the live commit SHA is embedded in the built bundle metadata when available.

## Threat Model (Client-Side PWA)

This application is a **local-first, zero-backend PWA**. There is no application server that stores user research data or API keys.

### Assets

- Provider API keys (Gemini `AIza…`, OpenAI `sk-…`, Anthropic `sk-ant-…`) — encrypted vault
- Optional NCBI API key (Settings → AI Configuration, encrypted vault)
- Custom provider base URLs and user-approved endpoint origins
- LLM prompts containing research topics, article metadata, abstracts, and report context
- Local research reports, knowledge base, collections, presets, checkpoints (IndexedDB / Dexie)
- Exported JSON/CSV/RIS/BibTeX/PDF artifacts
- Session UI state (Redux)

### Data Flows (what leaves the device)

| Destination         | Data sent                                    | Credential            |
| ------------------- | -------------------------------------------- | --------------------- |
| Google Gemini       | Prompts, article metadata, synthesis context | Gemini API key        |
| OpenAI / OpenRouter | Same                                         | OpenAI-format API key |
| Anthropic           | Same                                         | Anthropic API key     |
| Ollama (loopback)   | Same                                         | None (local)          |
| NCBI E-utilities    | PubMed queries, PMID lookups                 | Optional NCBI key     |
| arXiv               | Search queries                               | None                  |

Custom endpoints require explicit user approval of the destination **origin** and must match the static CSP `connect-src` allowlist unless the app is self-hosted with a tailored CSP.

### Trust Boundaries

1. **Browser process** — fully trusted by the user; XSS or malicious extensions can read IndexedDB and memory. Vault encryption mitigates **offline** key theft, not active in-session XSS.
2. **External APIs** — treat all responses as untrusted; article metadata may contain prompt-injection payloads.
3. **GitHub Pages origin** — static assets only; CSP restricts script sources.

### Mitigations

- API keys encrypted with AES-GCM via Web Crypto before IndexedDB persistence (`apiKeyService`). Master key is **non-extractable** (`CryptoKey`).
- Keys never committed; `.env` is documentation-only.
- DOMPurify for rendered Markdown/HTML; untrusted prompt data wrapped in explicit delimiters (`untrustedDataFraming.ts`).
- Corpus-bound citation validation before persisting ranked insights (`citationGrounding.ts`).
- Custom endpoint URL validation + origin approval + CSP coherence (`endpointPolicy.ts`).
- PubMed query structural validation before execution (`pubmedQueryValidator.ts`).
- CSV formula-injection sanitization on export.
- `AbortSignal` propagated to provider network requests.
- CI: `pnpm audit`, CodeQL, Dependency Review, secret scanning (gitleaks).

### Residual Risks

- Client-side prompt injection cannot be eliminated by string sanitization alone; output validation and corpus checks reduce but do not remove hallucination risk.
- Encryption does not protect against active XSS in the same session.
- Static CSP cannot safely enumerate arbitrary runtime custom hosts; unsupported origins are blocked by design.
- `free full text[filter]` is not identical to all definitions of “open access”.
- AI-generated `aiSummary` fields are derived interpretations, not source abstracts.

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

1. Create dedicated provider keys with usage quotas / billing alerts.
2. Enter keys only via **Settings → AI Configuration**.
3. Approve custom endpoint origins explicitly before use.
4. Revoke keys that may have been exposed (browser compromise, shared machine).
5. Prefer a personal device; avoid untrusted browser extensions on research machines.
6. For higher PubMed rate limits, enter an NCBI API key under **Settings → AI Configuration** (encrypted like provider keys).
