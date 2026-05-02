# Codebase Audit Report

> **Date**: 2026-05-02 (updated)
> **Overall Rating**: B+ (8.5/10)
> **Auditor**: Automated Copilot Audit

---

## Executive Summary

The AI Research Orchestrator is a well-architected, production-ready Progressive Web App with a clean separation of concerns, strong TypeScript usage, and a professional DevContainer/CI/CD setup. The main areas for improvement remain moderate automated test coverage, optional ESLint/Prettier checked into the repo (IDE extensions are assumed), and occasional Redux/Context overlap worth documenting explicitly.

---

## Scorecard

| Dimension     | Rating | Notes                                                                                 |
| ------------- | ------ | ------------------------------------------------------------------------------------- |
| Architecture  | 5/5    | Clean layering: services, contexts, hooks, Redux, components                          |
| TypeScript    | 5/5    | Strict mode, ES2022 target, comprehensive type definitions                            |
| DevContainer  | 4/5    | Lean image, good DX; Playwright pre-warm was redundant (now fixed)                    |
| PWA/Offline   | 5/5    | Workbox service worker, manifest, offline IndexedDB fallback                          |
| Security      | 4/5    | Web Crypto API key encryption; browser-side API calls inherent risk                   |
| i18n          | 5/5    | EN+DE complete, 100+ keys, namespace-based pattern                                    |
| CI/CD         | 5/5    | GitHub Actions v4; typecheck + Vitest + build; PR verification + Pages only on `main` |
| Tests         | 2/5    | Low line coverage; 3 unit test files + 2 E2E specs                                    |
| Documentation | 5/5    | README (EN+DE), CHANGELOG, AUDIT, CONTRIBUTING, AGENTS, Cursor rules                  |
| SEO           | 3/5    | Basics present; missing Open Graph, schema.org, canonical URL                         |
| Accessibility | 4/5    | Strong ARIA, focus management; minor contrast gaps in light mode                      |

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

| Change                      | Notes                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CI pull requests            | Workflow runs build + tests on PRs to `main`; Pages upload/deploy only when `github.ref == refs/heads/main` and event is not `pull_request`                                                |
| Cursor / onboarding         | Added `AGENTS.md`, `.cursor/rules/ai-research-orchestrator.mdc`, `.vscode/extensions.json`, `CONTRIBUTING.md`                                                                              |
| Version alignment           | `package.json` / README badge track semver (`0.1.1` as of this maintenance)                                                                                                                |
| AUDIT correction            | `AuthorProfile` is defined in `types.ts`; earlier “missing type” note removed below                                                                                                        |
| Production hygiene (v0.1.1) | ESLint 9 + Prettier + Husky; scoped coverage thresholds; AbortSignal for report streams; Redux-only `useUI` + install prompt store; CSV formula sanitization; CSP meta; PNG manifest icons |

---

## Prioritized Improvement Roadmap

### P0 — Critical (address soon)

#### 1. Expand Test Coverage (target: 40%+)

**Current state**: 2 unit test files (`apiKeyService.test.ts`, `geminiService.test.ts`), 2 E2E specs.

**Recommended additions**:

- `src/services/pubmedUtils.test.ts` — Test `fetchWithBackoff()`, `searchPubMed()`, XML parsing
- `src/services/databaseService.test.ts` — Test Dexie CRUD operations with mock IndexedDB
- `src/store/slices/settingsSlice.test.ts` — Test deep merge logic, default state
- `src/store/slices/collectionsSlice.test.ts` — Test async thunks
- `src/hooks/useTranslation.test.ts` — Test key resolution, fallback behavior
- Component tests with `@testing-library/react` for critical views

**Effort**: 2-3 days

#### 2. Add ESLint + Prettier Configuration

**Current state**: Extensions installed in DevContainer but no config files exist in repo.

**Recommended**:

```bash
npm init @eslint/config@latest
```

Create `.eslintrc.cjs` with:

- `@typescript-eslint/recommended`
- `plugin:react-hooks/recommended`
- `plugin:jsx-a11y/recommended`

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100
}
```

Add `npm run lint` to CI/CD pipeline and package.json scripts.

**Effort**: 1-2 hours

### P1 — Important (next sprint)

#### 3. Fix AbortController Leaks in geminiApiSlice

**File**: `src/store/slices/geminiApiSlice.ts`

**Problem**: Streaming endpoints create AbortController but don't properly abort in-flight requests when `cacheEntryRemoved` fires during active streaming.

**Fix**: Ensure the abort signal is passed to the Gemini SDK call and that the stream loop checks `controller.signal.aborted` before processing each chunk.

**Effort**: 1-2 hours

#### 4. Consolidate Redux + Context State Management

**Problem**: `SettingsContext` and `UIContext` both read from Redux and re-expose the same state. This creates potential for state divergence and unnecessary re-renders.

**Recommendation**: Either:

- Remove Context wrappers and use Redux hooks (`useAppSelector`) directly in components
- Or keep Context as the ONLY consumer of Redux, but document the pattern clearly

**Effort**: 4-6 hours

#### 5. Add Request Cancellation to Report Generation

**File**: `src/App.tsx`, `src/services/geminiService.ts`

**Problem**: Generation ID prevents rendering stale results but doesn't cancel in-flight Gemini API calls. Previous requests continue consuming API quota.

**Fix**: Pass `AbortSignal` to `generateResearchReportStream()` and abort in the async generator when signal fires.

**Effort**: 2-3 hours

### P2 — Nice to Have (backlog)

#### 6. SEO Improvements

- Add `<link rel="canonical">` to `index.html`
- Add Open Graph meta tags (`og:title`, `og:description`, `og:image`)
- Add Twitter Card meta tags
- Add schema.org `SoftwareApplication` JSON-LD markup
- Expand `sitemap.xml` with all routes

**Effort**: 1-2 hours

#### 7. PWA Icon Completion

**File**: `manifest.json`

**Problem**: Missing `icons` array with proper PNG variants (192x192, 512x512).

**Fix**: Generate icon PNGs from the existing SVG and add to manifest.

**Effort**: 30 minutes

#### 8. Performance Optimizations

- Memoize expensive selectors in `knowledgeBaseSlice.ts` (`selectFilteredArticles`, `selectUniqueArticles`)
- Add pagination to article lists for 10k+ entries
- Lazy-load Chart.js and jsPDF (only when export/charts are used)
- Audit `useCallback` dependency arrays in `App.tsx`

**Effort**: 4-6 hours

#### 9. Security Hardening

- Add Content Security Policy (CSP) meta tag to `index.html`
- Add CSV formula injection protection in `exportService.ts` (prefix cells starting with `=`, `+`, `-`, `@` with a tab character)
- Consider API key session timeout (clear decrypted key from memory after inactivity)

**Effort**: 2-3 hours

#### 10. Documentation Expansion

- Create `CONTRIBUTING.md` with development workflow, PR template, coding standards
- Add inline JSDoc to public service functions (`geminiService.ts`, `pubmedUtils.ts`)
- Create `/docs` folder with architecture decision records (ADRs)

**Effort**: 2-3 hours

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

| File                                     | Issue                                                                       | Severity |
| ---------------------------------------- | --------------------------------------------------------------------------- | -------- |
| `src/services/geminiService.ts`          | `extractAndParseJson()` uses brace counting without handling string escapes | Medium   |
| `src/services/exportService.ts`          | CSV export doesn't protect against formula injection                        | Low      |
| `src/services/exportService.ts`          | PDF export doesn't explicitly set UTF-8 encoding                            | Low      |
| `src/services/pubmedUtils.ts`            | `pubYear` extraction via substring has no validation                        | Low      |
| `src/store/slices/apiSlice.ts`           | RTK Query endpoints partially implemented, no cache invalidation            | Medium   |
| `src/store/slices/knowledgeBaseSlice.ts` | Delete logic incomplete for async thunks                                    | Medium   |
| `src/hooks/useFocusTrap.ts`              | Defined but never imported anywhere                                         | Low      |
| `src/hooks/useHaptic.ts`                 | Imported in App.tsx but never used                                          | Low      |
| `src/App.tsx`                            | Some `useCallback` dependency arrays may be incomplete                      | Low      |
| `manifest.json`                          | Missing `icons` array for full PWA installability                           | Low      |
| `index.html`                             | Missing canonical URL, Open Graph, Twitter Card meta tags                   | Low      |
