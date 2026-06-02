# Codebase Audit Report

> **Date**: 2026-06-02 (Deep audit v0.2.0)  
> **Overall Rating**: A− (9.0/10)  
> **Auditor**: Cursor Cloud Agent (MASTER PROMPT v2.0)

---

## Executive Summary

The AI Research Orchestrator remains a **production-grade, local-first PWA** with a clear service layer, strict TypeScript, and strong CI. Version **0.2.0** closes critical data-integrity gaps (Knowledge Base delete sync), hardens Gemini JSON parsing, adds feature-level error boundaries, decomposes `ReportDisplay`, documents Redux-as-source-of-truth (ADR-001), and tightens the ESLint gate from 650 → **115** warnings (baseline enforced in CI).

Remaining roadmap: raise logic-layer coverage toward **70%+**, more RTL for KB/Report views, `apiKeyService` crypto tests, and migrate remaining Context-only flows into thunks.

---

## Scorecard

| Dimension     | Rating | Notes                                                                                      |
| ------------- | ------ | ------------------------------------------------------------------------------------------ |
| Architecture  | 5/5    | ADR-001: Redux SoT + thin Context facades; `parseGeminiJson` in `src/lib/`                 |
| TypeScript    | 5/5    | Strict mode; `tsc --noEmit` clean                                                          |
| DevContainer  | 4/5    | Lean image; Playwright optional via env                                                    |
| PWA/Offline   | 5/5    | Workbox, manifest, Dexie offline                                                           |
| Security      | 4/5    | AES-GCM keys, CSP, CSV sanitization; client-side API keys inherent risk                    |
| i18n          | 5/5    | EN+DE, namespace keys                                                                      |
| CI/CD         | 5/5    | typecheck, lint (**0** warnings), coverage thresholds, build; E2E 35 tests                 |
| Tests         | 4/5    | 102 unit + 35 E2E; logic coverage ~65% lines; RTL for Orchestrator; KB slice delete tested |
| Documentation | 5/5    | AUDIT, CHANGELOG, AGENTS, ADR-001, `.cursor/` rules                                        |
| SEO           | 4/5    | canonical, OG, Twitter, schema.org JSON-LD present (`index.html`)                          |
| Accessibility | 4/5    | ARIA/focus; jsx-a11y clean after ESLint zero-warning pass                                  |

---

## Phase 0 Baseline (2026-06-02)

| Check                | Result                                                               |
| -------------------- | -------------------------------------------------------------------- |
| `pnpm install`       | OK (frozen lockfile)                                                 |
| `pnpm typecheck`     | OK                                                                   |
| `pnpm lint`          | **0 warnings**, 0 errors (`--max-warnings 0`; was 194 @ 650 cap)     |
| `pnpm test:coverage` | OK — **~65%+** lines/statements on logic layers (`vitest.config.ts`) |
| `pnpm build`         | OK (large vendor-charts chunk noted)                                 |
| `pnpm test:e2e`      | **35/35 passed** (Chromium)                                          |

**Large files:** `geminiService.ts` ~899, `App.tsx` ~726. Refactored: `ReportDisplay` ~530 LOC + `report-display/*`; `AgentDebugger` ~263 LOC + `agent-debugger/*`.

---

## Fixed in v0.2.0

| Issue                                                     | Severity | Fix                                                                    |
| --------------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| `deleteKbEntries.fulfilled` no-op in Redux                | **P0**   | `entriesAdapter.removeMany` + prune `selectedPmids`                    |
| Heuristic JSON parser (strings with `{`, trailing commas) | **P0**   | `src/lib/parseGeminiJson.ts` string-aware extraction + repairs         |
| Only global `ErrorBoundary`                               | **P0**   | `FeatureErrorBoundary` on Orchestrator, Research, Knowledge Base       |
| `ReportDisplay.tsx` >700 LOC                              | **P0**   | Split into `report-display/*` submodules (~530 LOC main file)          |
| ESLint gate too lax (650)                                 | **P1**   | **`--max-warnings 0`**; `react/no-unescaped-entities` off for i18n JSX |
| `AgentDebugger.tsx` monolith (569 LOC)                    | **P1**   | Split into `agent-debugger/*` (~263 LOC shell)                         |
| Dual state undocumented                                   | **P1**   | `docs/ADR-001-state-management.md` + AGENTS.md pointer                 |
| Coverage below 65% threshold                              | **P0**   | `parseGeminiJson` tests, KB delete reducer test, store typing          |

---

## Prioritized Roadmap (post v0.2.0)

### P0 — None blocking release (closed above)

### P1 — Next sprint

1. **RTL coverage**: `KnowledgeBaseView`, `ReportDisplay` export actions (mock Dexie/Gemini).
2. **apiKeyService tests** with mocked `crypto.subtle` (currently ~4% covered).
3. **Coverage → 70%+** on logic layers (`store/`, `services/`, `hooks/`, `lib/`).

### P2 — Backlog

- Lazy-load Chart.js / jsPDF in export paths only.
- KB pagination for 10k+ articles.
- Prompt-injection hardening review for user topic → Gemini prompts.
- Property-based tests for `parseGeminiJson` edge cases.

---

## Architecture Notes

### What Works Well

- Local-first Dexie + streaming `generateResearchReportStream`.
- Redux entity adapter for KB entries.
- E2E agent-flow spec with mocked Gemini/PubMed.
- Cybernetic Glassmorphism design system.

### State Management (ADR-001)

- **Redux** = persisted domain state (settings, KB, UI, theme, RTK Query).
- **Context** = thin facades for multi-step KB operations (`KnowledgeBaseProvider`).
- **React local state** = ephemeral UI (modals, form drafts).

See `docs/ADR-001-state-management.md`.

---

## Local Verification

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run test:coverage
pnpm run build
pnpm exec playwright install chromium   # once
pnpm run test:e2e
```

---

## References

- `docs/ADR-001-state-management.md`
- `src/lib/parseGeminiJson.ts`
- `src/store/slices/knowledgeBaseSlice.ts` — `deleteKbEntries.fulfilled`
- `src/components/FeatureErrorBoundary.tsx`
- `CHANGELOG.md` — [0.2.0]
