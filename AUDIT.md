# Codebase Audit Report

> **Date**: 2026-05-04 (documentation & Cursor rules refresh)
> **Overall Rating**: B+ (8.5/10)
> **Auditor**: Automated Copilot Audit

---

## Executive Summary

The AI Research Orchestrator is a well-architected, production-ready Progressive Web App with a clean separation of concerns, strong TypeScript usage, and a professional DevContainer/CI/CD setup. The main areas for improvement remain moderate automated test coverage, optional ESLint/Prettier checked into the repo (IDE extensions are assumed), and occasional Redux/Context overlap worth documenting explicitly.

---

## Scorecard

| Dimension     | Rating | Notes                                                                                                              |
| ------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| Architecture  | 5/5    | Clean layering: services, contexts, hooks, Redux, components                                                       |
| TypeScript    | 5/5    | Strict mode, ES2022 target, comprehensive type definitions                                                         |
| DevContainer  | 4/5    | Lean image, good DX; Playwright pre-warm was redundant (now fixed)                                                 |
| PWA/Offline   | 5/5    | Workbox service worker, manifest, offline IndexedDB fallback                                                       |
| Security      | 4/5    | Web Crypto API key encryption; browser-side API calls inherent risk                                                |
| i18n          | 5/5    | EN+DE complete, 100+ keys, namespace-based pattern                                                                 |
| CI/CD         | 5/5    | GitHub Actions v4; typecheck, ESLint, Vitest+coverage (Schwellen `vitest.config.ts`), build; Pages nur auf `main`  |
| Tests         | 3/5    | Vitest + thresholds on logic layers; mehrere Service-/Slice-/Hook-Tests + E2E — Zeilen-Coverage weiter ausbaufähig |
| Documentation | 5/5    | README (EN+DE), CHANGELOG, AUDIT, CONTRIBUTING, AGENTS; Cursor `.cursor/index.mdc` + `.cursor/rules/*.mdc`         |
| SEO           | 3/5    | Basics present; missing Open Graph, schema.org, canonical URL                                                      |
| Accessibility | 4/5    | Strong ARIA, focus management; minor contrast gaps in light mode                                                   |

---

## Issues Fixed in This Audit

| Issue                                                   | Severity | Fix Applied                            |
| ------------------------------------------------------- | -------- | -------------------------------------- |
| `vitest` in `dependencies` instead of `devDependencies` | Medium   | Moved to devDependencies               |
| 142 markdown lint errors in README.md                   | Medium   | Rewrote with correct formatting        |
| CI/CD: No test step before deploy                       | High     | Added `vitest run` step                |
| CI/CD: TypeScript check was non-blocking                | Medium   | Removed `continue-on-error: true`      |
| `copilot-instructions.md` outdated                      | Medium   | Rewrote with current stack/conventions |
| Dockerfile: Redundant Playwright CLI pre-warm           | Low      | Removed `RUN npx playwright@latest`    |
| postCreate.sh: Mandatory Playwright install             | Low      | Made optional via `SKIP_PLAYWRIGHT`    |
| Missing CHANGELOG.md                                    | Low      | Created with keepachangelog format     |

---

## Maintenance (2026-05-02)

| Change                           | Notes                                                                                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI pull requests                 | Workflow runs build + tests on PRs to `main`; Pages upload/deploy only when `github.ref == refs/heads/main` and event is not `pull_request`                                                                                         |
| Cursor / onboarding              | `AGENTS.md`, `.vscode/extensions.json`, `CONTRIBUTING.md`; Always-On `.cursor/index.mdc`, modulare `.cursor/rules/` (`000` Meta, `001` Security, `100`/`101` APIs & Dexie, `200` Architektur, `300` UI, `800` Tests, `850` PRD/MCP) |
| Version alignment                | `package.json` / README badge track semver (`0.1.1` as of this maintenance)                                                                                                                                                         |
| AUDIT correction                 | `AuthorProfile` is defined in `types.ts`; earlier “missing type” note removed below                                                                                                                                                 |
| Docs / CI alignment (2026-05-04) | GitHub Actions Typecheck = `npm run typecheck`; README/AGENTS/CONTRIBUTING/copilot referenzieren `.cursor/index.mdc`; `package.json` `engines.node`; CHANGELOG [Unreleased] ergänzt                                                 |
| Production hygiene (v0.1.1)      | ESLint 9 + Prettier + Husky; scoped coverage thresholds; AbortSignal for report streams; Redux-only `useUI` + install prompt store; CSV formula sanitization; CSP meta; PNG manifest icons                                          |

---

## Prioritized Improvement Roadmap

### P0 — Critical (address soon)

#### 1. Expand Test Coverage (target: 40%+ line coverage on logic layers)

**Current state (2026-05-04)**: Vitest mit Coverage-Schwellen (`vitest.config.ts`) auf `store/`, `services/`, `hooks/`, `lib/`; zahlreiche Unit-Tests (u. a. PubMed, arXiv, Dexie-Roundtrip, Slices, Hooks) sowie Playwright E2E unter `src/test/e2e/`.

**Next steps**:

- Kritische Views zusätzlich mit `@testing-library/react` absichern (Orchestrator, Knowledge Base).
- Coverage-Schwellen schrittweise anheben, wenn neue Tests stabil sind.

**Effort**: fortlaufend

#### 2. ESLint + Prettier + CI lint gate — **Done** (v0.1.1+)

**State**: Flat Config `eslint.config.js`, Prettier, Husky/lint-staged; `npm run lint` in CI (`deploy.yml`). Empfohlene VS Code Extensions in `.vscode/extensions.json`.

### P1 — Important (next sprint)

#### 3. AbortController / Streaming — **Largely addressed** (v0.1.1 CHANGELOG)

Streaming akzeptiert `AbortSignal`; `geminiApiSlice` invalidiert bei Bedarf — weiter beobachten bei Langläufern und Edge-Cases.

#### 4. Redux + Context State Management

**Problem**: Überlappung dokumentieren oder weiter verschlanken (`SettingsProvider`, KB-Contexts).

**Recommendation**: Nur ein Muster als „Source of Truth“ pro Flag; Dokumentation in `copilot-instructions.md` / `AGENTS.md` ist angeglichen — bei Refactor UX und Hydration sichern.

**Effort**: bei geplanter UX-Änderung einplanen

### P2 — Nice to Have (backlog)

#### 6. SEO Improvements

- Add `<link rel="canonical">` to `index.html`
- Add Open Graph meta tags (`og:title`, `og:description`, `og:image`)
- Add Twitter Card meta tags
- Add schema.org `SoftwareApplication` JSON-LD markup
- Expand `sitemap.xml` with all routes

**Effort**: 1-2 hours

#### 7. PWA Icon Completion — **Done** (PNG icons + SVG in `manifest.json`)

Weitere Optimierung: Maskable-Safe-Zones und zusätzliche Auflösungen nur bei Bedarf.

#### 8. Performance Optimizations

- Memoize expensive selectors in `knowledgeBaseSlice.ts` (`selectFilteredArticles`, `selectUniqueArticles`)
- Add pagination to article lists for 10k+ entries
- Lazy-load Chart.js and jsPDF (only when export/charts are used)
- Audit `useCallback` dependency arrays in `App.tsx`

**Effort**: 4-6 hours

#### 9. Security Hardening — **Partially done** (v0.1.1)

- CSP-Baseline und CSV-Formel-Injektionsschutz sind umgesetzt (siehe CHANGELOG v0.1.1).
- Optional: API-Key-Session-Timeout / Arbeitsspeicher-Härtung weiter evaluieren.

**Effort**: optional / backlog

#### 10. Documentation Expansion — **Partially done**

- `CONTRIBUTING.md`, `AGENTS.md`, Cursor-Regeln und README sind vorhanden und mit CI abgestimmt.
- Optional: JSDoc auf öffentliche Service-APIs, `/docs` mit ADRs bei größeren Releases.

**Effort**: bei Bedarf

---

## Architecture Notes

### What Works Well

- **Local-first with Dexie.js**: Excellent choice for offline-first PWA. IndexedDB provides durable, structured storage without backend dependency.
- **Streaming via AsyncGenerator**: The `generateResearchReportStream()` pattern provides excellent UX with real-time token streaming.
- **Multi-agent pipeline**: Clean decomposition of research workflow into formulation → retrieval → ranking → synthesis stages.
- **Redux Toolkit**: Well-structured slices with clear separation of concerns. Entity adapters used correctly for collections.
- **Cybernetic Glassmorphism**: Distinctive, cohesive design system that differentiates the product.

### What Needs Attention

- **Dual state management**: Redux + Context for the same data is a source of confusion and potential bugs. Pick one pattern.
- **Large components**: `ReportDisplay.tsx` (~550 lines) and `AgentDebugger.tsx` (~550 lines) should be decomposed into sub-components.
- **Error boundaries**: Only one global `ErrorBoundary`. Critical views (Orchestrator, Research) should have their own boundaries.

---

## DevContainer Optimization Notes

### Image Size Analysis

| Component                       | Approximate Size | Status                                |
| ------------------------------- | ---------------- | ------------------------------------- |
| node:22-bookworm-slim base      | ~230 MB          | Optimal                               |
| Playwright Chromium system libs | ~50 MB           | Kept (Docker cache benefit)           |
| xvfb                            | ~10 MB           | Kept (required for headless Chromium) |
| GitHub CLI                      | ~15 MB           | Kept (useful for PR workflows)        |
| **Total**                       | **~305 MB**      | Lean                                  |

### Changes Made

1. **Removed Playwright CLI pre-warm** from Dockerfile — the `RUN npx --yes playwright@latest --version` line was downloading the Playwright CLI globally, but `postCreate.sh` reinstalls the project-pinned version anyway. This saves ~30s on image build.

2. **Made Playwright browser install optional** in `postCreate.sh` — set `SKIP_PLAYWRIGHT=true` environment variable to skip Chromium download. Saves ~60s on container creation for development workflows that don't need E2E testing.

3. **Kept Playwright system libraries** in Dockerfile — these are small (~50MB), cached in the Docker layer, and required when Playwright IS used. Removing them would require `npx playwright install-deps` at runtime, which is slower and less reliable.

---

## File-Level Findings

| File                                     | Issue                                                                              | Severity |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | -------- |
| `src/services/geminiService.ts`          | `extractAndParseJson()` uses brace counting without handling string escapes        | Medium   |
| `src/services/exportService.ts`          | CSV formula injection mitigated (`sanitizeCsvFormulaInjection`); weiter beobachten | Low      |
| `src/services/exportService.ts`          | PDF export doesn't explicitly set UTF-8 encoding                                   | Low      |
| `src/services/pubmedUtils.ts`            | `pubYear` extraction via substring has no validation                               | Low      |
| `src/store/slices/apiSlice.ts`           | RTK Query endpoints partially implemented, no cache invalidation                   | Medium   |
| `src/store/slices/knowledgeBaseSlice.ts` | Delete logic incomplete for async thunks                                           | Medium   |
| `src/hooks/useFocusTrap.ts`              | Defined but never imported anywhere                                                | Low      |
| `src/hooks/useHaptic.ts`                 | Imported in App.tsx but never used                                                 | Low      |
| `src/App.tsx`                            | Some `useCallback` dependency arrays may be incomplete                             | Low      |
| `manifest.json`                          | PNG/SVG icons present; SEO/social meta still optional                              | Low      |
| `index.html`                             | Missing canonical URL, Open Graph, Twitter Card meta tags                          | Low      |
