# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `AGENTS.md` and `.cursor/rules/` for Cursor and other AI-assisted workflows
- `CONTRIBUTING.md` with local QA commands and CI expectations
- `.vscode/extensions.json` recommended extensions for VS Code / Cursor
- GitHub Actions: verify on pull requests to `main`; Pages upload/deploy only on `main` (not on PRs)
- CHANGELOG.md following keepachangelog standard
- AUDIT.md with codebase audit findings and prioritized improvement roadmap

### Changed

- `package.json` version set to `0.1.0` to match documented semver; README version badge aligned
- README: Tests & CI, Cursor setup, troubleshooting for CI failures; GitHub Actions section clarified (PR vs deploy)
- Updated `.github/copilot-instructions.md` (stack; pointer to `AGENTS.md` / `.cursor/rules/`)
- Removed redundant Playwright CLI pre-warm from Dockerfile (postCreate.sh handles installation)
- Made Playwright browser installation optional in postCreate.sh via `SKIP_PLAYWRIGHT=true`

### Fixed

- Moved `vitest` from `dependencies` to `devDependencies` to reduce production bundle
- Fixed 142 markdown lint errors in README.md (MD030, MD022, MD031, MD032)
- Made CI/CD pipeline type checking blocking (was `continue-on-error: true`)
- Added unit test step to CI/CD pipeline before build

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

[Unreleased]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/qnbs/AI-Research-Orchestrator/releases/tag/v0.1.0
