# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Offline banner when `navigator.onLine` is false (Dexie-backed reports remain readable).
- i18n EN/DE parity unit tests + typed `TranslationKey` on `useTranslation`.
- External `public/register-sw.js` (CSP-friendly SW registration).
- Post-build `scripts/patch-csp-hashes.mjs` so CSP SHA-256 hashes match Vite-emitted `dist/index.html`.

### Changed

- CSP: drop `script-src 'unsafe-inline'`; pin JSON-LD + importmap via SHA-256 hashes; allow `aistudiocdn.com` / Workbox CDN workers.
- `pnpm run build` runs CSP hash patch after Vite.
- Service worker precache expands to PWA icons + register script (ADR 0004).
- Importmap: remove unused Chart.js CDN entries (Recharts-only).

### Fixed

- (none yet)

## [0.2.0] - 2026-07-16

### Added

- Soft checkpoint **resume UX** (`CheckpointResumeBanner`): restore partial report, re-run from start, or discard (P0-10).
- Settings **cost estimator** card (`CostEstimateCard`) with i18n pre-flight toast copy (P0-11).
- Agent Debugger modular split under `src/components/agentDebugger/`.
- Bundle visualizer (`pnpm run analyze`) + CI **bundle budget** gate (`pnpm run bundle:budget`).
- Playwright a11y: `@axe-core/playwright` critical/serious check on `#root` (P1-5).
- Lighthouse CI (`lighthouserc.json`, `pnpm run test:lighthouse`) — a11y/best-practices/seo ≥95.
- Prompt versioning registry (`src/lib/promptRegistry.ts`) + offline agent eval harness (`src/lib/agentEval.ts`).
- ADRs 0005 (Recharts-only charts) and 0006 (prompt versioning).
- JSDoc on public Dexie helpers, export entrypoints, `useChat`, `useResearchAssistant`, orchestrator stream.
- Resilience layer, research checkpoints, optional NCBI API key, security workflows, CodeRabbit gate (Phase 0 carry-forward into this release).

### Changed

- Chart stack consolidated to **Recharts only** (removed Chart.js / react-chartjs-2).
- Vitest coverage thresholds raised to **80%** lines/statements.
- CSP `connect-src` narrowed to Gemini, NCBI E-utilities, arXiv, and aistudiocdn (plus blob/data).
- Package version **0.2.0**.

### Fixed

- Knowledge Base Redux: `deleteKbEntries.fulfilled` removes entities via `removeMany`.
- PubMed `pubYear` only kept when a valid 4-digit year is present.
- Gitleaks false positive on Gemini-shaped test fixtures.

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

[Unreleased]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/qnbs/AI-Research-Orchestrator/releases/tag/v0.1.0
