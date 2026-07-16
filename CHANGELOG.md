# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Resilience layer: typed `AppError` taxonomy (`src/lib/errors.ts`), per-service circuit breaker (`circuitBreaker.ts`), exponential backoff + Gemini cost heuristics (`resilience.ts`).
- Research checkpoints (Dexie `researchCheckpoints`) for partial save on abort/error; pre-flight cost estimate toast in orchestrator.
- Optional NCBI API key in Settings (`ai.ncbiApiKey`) passed to PubMed E-utilities.
- String-aware Gemini JSON parser (`src/lib/parseGeminiJson.ts`) with unit tests.
- `SECURITY.md` with threat model, disclosure process, and key-handling guidance.
- Architecture Decision Records: `docs/adr/0001`–`0004` (state, orchestration, security model, PWA offline).
- GitHub Actions `security.yml`: CodeQL, Dependency Review (PRs), scheduled pnpm audit, gitleaks (`.gitleaks.toml`).
- `.coderabbit.yaml` (auto-review drafts) + Cursor rules `010-english-content`, `011-coderabbit-pr-gate`.
- CI coverage artifact upload; quality vs build job split in `deploy.yml`.
- Expanded unit tests (ErrorBoundary, checkpoints, settings hook, PubMed NCBI key, exports).

### Changed

- Vitest coverage thresholds raised to **72%** lines/statements (measured ~74%) and **55%** branches/functions.
- Dependency hardening via `pnpm audit --fix=update` + workspace overrides (`vite`, `undici`, `ws`, `protobufjs`); `pnpm.overrides` moved to `pnpm-workspace.yaml` (pnpm 11).
- `parseGeminiResponseJson` in `geminiService` delegates to the new parser and maps failures to `AppError`.
- Abort in orchestrator throws `AppError` (`STREAM_ABORTED`); missing API key throws `AppError` (`NO_API_KEY`).
- PubMed fetches use circuit breaker, abort-aware retries, and typed rate-limit / network errors.
- ErrorBoundary copy no longer claims agents were notified; clarifies local data preservation.
- ApiKeySettings UI copy in English; July 2026 full re-audit in `AUDIT.md`.
- Default `AppError` user messages are English (UI i18n remains for localized product copy).

### Fixed

- Knowledge Base Redux: `deleteKbEntries.fulfilled` now removes entities via `removeMany` (previously a no-op).
- PubMed `pubYear` only kept when a valid 4-digit year is present.
- Gitleaks false positive on Gemini-shaped test fixtures (allowlist + constructed fixture string).

## [0.1.1] - 2026-05-02

### Added

- ESLint 9 (flat config) + Prettier + Husky + lint-staged; `pnpm run lint` / `pnpm run format`
- Unit tests for PubMed, arXiv, CSV formula sanitization, Redux slices, Dexie settings round-trip, `useTranslation`, `useUI`, install-prompt store
- Vitest coverage thresholds on logic layers (`store/`, `services/`, `hooks/`, `lib/`) — see `vitest.config.ts`
- PWA PNG icons (`public/icons/icon-192.png`, `icon-512.png`) via `pnpm run icons`
- Baseline `Content-Security-Policy` meta in `index.html`
- `.npmrc` with `legacy-peer-deps=true` for consistent installs with the ESLint toolchain

### Changed

- **State management**: Removed `UIProvider`; `useUI` reads/writes Redux only; PWA install prompt uses `installPromptStore` + `useSyncExternalStore`. Settings hydrate via `SettingsHydrator` with merge from `store.getState()`.
- **Gemini streaming**: `generateResearchReportStream(..., signal?)`; `geminiApiSlice` aborts on cache entry removal; orchestrator uses `AbortController` + generation id.
- **CSV export**: `sanitizeCsvFormulaInjection` mitigates spreadsheet formula injection.
- CI runs `pnpm run lint` and `pnpm run test:coverage` before production build.

### Fixed

- `geminiApiSlice`: `AbortController` ran only after `cacheEntryRemoved`, too late to stop in-flight Gemini consumption.

## [0.1.0] - 2026-04-14

### Added

- Multi-agent orchestration pipeline (Query Formulation, Live Retrieval, Semantic Ranking, Synthesis)
- PubMed NCBI E-utilities integration with exponential backoff
- arXiv search as supplementary source
- Google Gemini 2.5 Flash + Gemini 3 Pro integration via `@google/genai` SDK
- Streaming responses via AsyncGenerator for real-time report generation
- Intelligent Knowledge Base with deduplication engine and semantic filtering
- Rapid Research Assistant with TL;DR summaries and similar article discovery
- Scientometric Hubs for Author disambiguation and Journal profiling
- Agent Debugger with live trace visualization and token budget tracking
- Command Palette (`Cmd+K`) for keyboard-driven navigation
- Collections system for organizing research
- PDF, CSV, JSON, RIS, BibTeX export via jsPDF
- API key encryption with Web Crypto AES-GCM stored in IndexedDB
- Cybernetic Glassmorphism design system with Tailwind CSS v4
- Framer Motion animations for agent flows and transitions
- Progressive Web App with Workbox service worker and offline support
- i18n support for English and German
- WCAG 2.2 AA accessibility with ARIA roles and keyboard navigation
- Redux Toolkit state management with RTK Query API endpoints
- Dexie.js IndexedDB local-first data storage
- GitHub Pages deployment via GitHub Actions
- DevContainer support for GitHub Codespaces
- Vitest unit tests + Playwright E2E test infrastructure

[Unreleased]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/qnbs/AI-Research-Orchestrator/releases/tag/v0.1.0
