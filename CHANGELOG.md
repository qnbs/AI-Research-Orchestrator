# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-02

### Added

- `src/lib/parseGeminiJson.ts` — string-aware Gemini JSON extraction, trailing-comma repair, `GeminiJsonParseError`
- `FeatureErrorBoundary` for Orchestrator, Research Assistant, and Knowledge Base views
- `docs/ADR-001-state-management.md` — Redux as source of truth, Context as facade
- Unit tests: `parseGeminiJson`, `knowledgeBaseSlice` delete sync, `OrchestratorView` (RTL)
- Report display submodules under `src/components/report-display/`

### Changed

- **Knowledge Base**: `deleteKbEntries.fulfilled` now removes entries in Redux and prunes selection
- **ReportDisplay**: decomposed into `ReportArticleCard`, `ReportAccordionSection`, utils (~530 LOC main file)
- **ESLint**: `--max-warnings` tightened from 650 → **115**; `react/no-unescaped-entities` off for i18n JSX
- **AUDIT.md**: scorecard updated to A− (9.0/10); Phase 0 baseline documented

### Fixed

- Redux state drift after deleting full KB entries (empty `deleteKbEntries` reducer body)
- JSON parse false positives when `{` appeared inside string values

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
