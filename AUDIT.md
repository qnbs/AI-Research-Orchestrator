# Codebase Audit Report

> **Date**: 2026-07-16 (Phase 0 full-scale re-audit)
> **Previous**: 2026-05-04 hygiene refresh
> **Overall Rating**: A- (9.0/10) — foundations excellent; Phase 0 closes critical gates
> **Auditor**: Cursor Agent (July 2026 Master Prompt / Phase 0)

---

## Executive Summary

The AI Research Orchestrator remains a high-quality local-first scientific research PWA. The May 2026 hygiene sprint (AbortSignal, CSP, ESLint/Prettier, pnpm 11, coverage gates, CI concurrency) left a strong base. This July 2026 Phase 0 re-audit found **coverage just under the 65% gate (~64.4%)**, incomplete resilience taxonomy, missing security automation (CodeQL / Dependency Review / secret scan), undocumented state SoT, and a **KB delete Redux sync gap**.

Phase 0 delivers: typed `AppError` + circuit breaker + backoff helpers, string-aware Gemini JSON parser, PubMed resilience wiring, KB `removeMany` fix, ADRs, `SECURITY.md`, security workflow, CI job split + coverage artifacts, and raised coverage thresholds (70% lines/statements).

---

## Scorecard (2026-07-16)

| Dimension     | Rating | Notes                                                                                         |
| ------------- | ------ | --------------------------------------------------------------------------------------------- |
| Architecture  | 5/5    | Clear services / Redux / Dexie layering; ADRs document SoT & orchestration                    |
| TypeScript    | 5/5    | Strict mode; typed error taxonomy                                                             |
| Security      | 4.5/5  | AES-GCM keys, CSP, SECURITY.md, CodeQL + Dependency Review + gitleaks; residual XSS threat    |
| Resilience    | 4/5    | Circuit breaker, AppError, abort-aware PubMed retries; partial-save / cost UI still P1        |
| Tests         | 4/5    | Logic-layer gate **70%** lines/statements; gaps remain in exportService / geminiApiSlice / UI |
| CI/CD         | 5/5    | Split quality/build jobs; security.yml scheduled; Pages deploy only on main                   |
| Documentation | 5/5    | AUDIT, CHANGELOG, ADRs, SECURITY, AGENTS, CONTRIBUTING                                        |
| PWA/Offline   | 4.5/5  | Dexie SoT offline; SW strategy documented in ADR 0004                                         |
| SEO           | 4/5    | Canonical/OG/JSON-LD present post-May; expand sitemap as needed                               |
| Accessibility | 4/5    | Strong ARIA baseline; automate axe in Phase 1                                                 |

---

## Threat Model (summary)

See `SECURITY.md` and `docs/adr/0003-security-model-client-side-keys.md`.

| Threat                         | Likelihood | Impact | Mitigation                                   |
| ------------------------------ | ---------- | ------ | -------------------------------------------- |
| XSS steals API key             | Med        | High   | CSP, DOMPurify, no `dangerouslySetInnerHTML` |
| Malicious browser extension    | Med        | High   | User education; dedicated research browser   |
| Dependency supply chain        | Low–Med    | High   | pnpm audit, Dependency Review, Dependabot    |
| NCBI / Gemini abuse via key    | Med        | Med    | User quotas; future cost estimator UI        |
| Stale SW cache of live science | Low        | Med    | Network-first for APIs (ADR 0004)            |

---

## Risk Matrix — Living Backlog

### P0 — Critical (Phase 0)

| ID    | Item                                  | Status     | Notes                                                                  |
| ----- | ------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| P0-1  | Coverage gate failing (~64.4% vs 65%) | **Closed** | Surge tests + resilience libs; threshold → **70%**                     |
| P0-2  | Error taxonomy / abort identity       | **Closed** | `src/lib/errors.ts`, AppError in gemini abort + PubMed                 |
| P0-3  | Circuit breaker for external services | **Closed** | `src/lib/circuitBreaker.ts`; wired in `pubmedUtils`                    |
| P0-4  | KB delete not removing Redux entities | **Closed** | `deleteKbEntries.fulfilled` → `removeMany`                             |
| P0-5  | JSON brace counting ignores strings   | **Closed** | `src/lib/parseGeminiJson.ts` string-aware                              |
| P0-6  | Security automation absent            | **Closed** | `.github/workflows/security.yml` (CodeQL, dep review, gitleaks, audit) |
| P0-7  | ADRs / SECURITY.md / re-audit docs    | **Closed** | `docs/adr/*`, `SECURITY.md`, this file                                 |
| P0-8  | CI feedback / coverage artifact       | **Closed** | Split `quality` / `build` jobs; upload coverage                        |
| P0-14 | English-only repo content policy      | **Closed** | `.cursor/rules/010-english-content.mdc`                                |
| P0-15 | CodeRabbit pre-merge review gate      | **Closed** | `.cursor/rules/011-coderabbit-pr-gate.mdc` + `.coderabbit.yaml`        |
| P0-16 | High+ audit / gitleaks CI failures    | **Closed** | `pnpm audit --fix=update` + workspace overrides; `.gitleaks.toml`      |

### P0 → P1 carry-over (stabilization next)

| ID    | Item                                       | Status      | Target                                 |
| ----- | ------------------------------------------ | ----------- | -------------------------------------- |
| P0-9  | Coverage ≥75% then ≥80% on logic layers    | Open        | ~74% lines; gate 72% — push to 75/80   |
| P0-10 | Partial report save + resume from phase    | **Partial** | Checkpoint save done; resume UI next   |
| P0-11 | Cost/quota estimator UI                    | **Partial** | Pre-flight toast done; dashboard next  |
| P0-12 | Optional NCBI API key in Settings          | **Closed**  | `ai.ncbiApiKey` + PubMed + Settings UI |
| P0-13 | Nested ErrorBoundaries for Orchestrator/KB | Open        | Phase 1                                |

### P1 — High

| ID   | Item                                          | Status |
| ---- | --------------------------------------------- | ------ |
| P1-1 | Bundle budget + visualizer in CI              | Open   |
| P1-2 | Lighthouse CI ≥95                             | Open   |
| P1-3 | Full JSDoc on public services/hooks           | Open   |
| P1-4 | Agent eval harness + structured outputs       | Open   |
| P1-5 | a11y automation (axe)                         | Open   |
| P1-6 | exportService / geminiApiSlice coverage depth | Open   |

### P2 — Medium

| ID   | Item                                              | Status |
| ---- | ------------------------------------------------- | ------ |
| P2-1 | Dual chart libs (Chart.js + Recharts) consolidate | Open   |
| P2-2 | Advanced SW caching for saved reports             | Open   |
| P2-3 | i18n UI foundation beyond EN/DE keys              | Open   |
| P2-4 | Prompt versioning                                 | Open   |
| P2-5 | CSP tighten (`unsafe-inline`, `connect-src`)      | Open   |

### P3 — Vision

Multi-LLM adapter, multimodal figures, local vector RAG, collaborative encrypted sharing, Zotero/Obsidian deep integrations.

---

## Issues Fixed in Prior Audits (retained)

| Issue                                        | Severity | Fix                           |
| -------------------------------------------- | -------- | ----------------------------- |
| vitest in dependencies                       | Medium   | Moved to devDependencies      |
| CI without tests / non-blocking tsc          | High     | Blocking typecheck + coverage |
| AbortController late abort in geminiApiSlice | High     | Fixed mid-stream abort        |
| UIProvider / Redux overlap                   | Medium   | Redux-only `useUI`            |
| CSP / CSV formula injection / PWA icons      | Medium   | v0.1.1 hygiene                |

---

## Architecture Notes

### What Works Well

- Local-first Dexie + PMID-grounded synthesis
- AsyncGenerator multi-phase orchestration
- Cybernetic design system + command palette
- Deep Cursor / AGENTS / CONTRIBUTING integration

### Single Source of Truth (2026-07)

Documented in **ADR 0001**. Summary: Redux for settings/UI/KB/collections/theme/traces; Dexie for durability; PresetContext for presets; install prompt outside Redux; orchestrator stream local to `App.tsx`.

### Resilience Layer (new)

- `src/lib/errors.ts` — `AppError` codes + `toAppError`
- `src/lib/circuitBreaker.ts` — per-service breaker
- `src/lib/resilience.ts` — exponential backoff + cost heuristics
- `src/lib/parseGeminiJson.ts` — string-aware JSON extraction

---

## File-Level Findings (updated)

| File                                     | Issue                                  | Severity | Status    |
| ---------------------------------------- | -------------------------------------- | -------- | --------- |
| `src/store/slices/knowledgeBaseSlice.ts` | Delete fulfilled no-op                 | High     | **Fixed** |
| `src/services/geminiService.ts`          | JSON depth ignore strings              | Medium   | **Fixed** |
| `src/services/pubmedUtils.ts`            | Abort retried; no circuit breaker      | Medium   | **Fixed** |
| `src/components/ErrorBoundary.tsx`       | Misleading “agents notified” copy      | Low      | **Fixed** |
| `src/services/exportService.ts`          | Coverage ~47%; PDF UTF-8               | Medium   | Open      |
| `src/store/slices/geminiApiSlice.ts`     | Coverage ~48%; dual path vs App stream | Medium   | Open      |
| `src/hooks/useFocusTrap.ts`              | Historically unused — now tested       | Low      | Mitigated |
| `index.html` CSP                         | `unsafe-inline` + broad connect-src    | Medium   | Open P2   |

---

## Phase 0 Acceptance

- [x] Re-audit documented
- [x] ADRs 0001–0004 + SECURITY.md
- [x] Resilience libs + PubMed/Gemini wiring
- [x] KB delete sync
- [x] Security workflows
- [x] CI split + coverage artifact
- [x] Coverage thresholds raised to 70%
- [ ] Partial-save / resume UX (deferred P0-10)
- [ ] GitHub Release v0.2.0 (prepare after merge)

---

## DevContainer / Ops

Unchanged lean image notes from May audit remain valid. Prefer `pnpm run test:run` for fast loops; `test:coverage` for gate verification.
