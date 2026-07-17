# Codebase Audit Report

> **Date**: 2026-07-17 (UI/UX Research Instrument modernization — post v0.2.1)
> **Previous**: 2026-07-17 Heuristic inference / offline completeness — v0.2.1
> **Overall Rating**: A+ (9.7/10) — Design system token discipline + light-first parity
> **Auditor**: Cursor Agent (UI/UX modernization)

---

## Executive Summary

**UI/UX pass** evolves the prior cyber-neon look into a **Research Instrument** system: teal–slate brand, expressive Figtree/Sora type, semantic status tokens, FOUC sync, reduced glow/pill noise, and `prefers-reduced-motion`. Offline heuristic layer from v0.2.1 remains intact.

Phase 2 audit gates (coverage ≥80%, Recharts-only, bundle/LHCI, prompt registry, CSP) remain closed from v0.2.0.

---

## Scorecard (2026-07-17)

| Dimension     | Rating | Notes                                                               |
| ------------- | ------ | ------------------------------------------------------------------- |
| Architecture  | 5/5    | ADRs 0001–0007; InferenceMode SoT; heuristics package               |
| TypeScript    | 5/5    | Strict mode; typed error taxonomy                                   |
| Security      | 4.5/5  | Narrower CSP; residual `style-src 'unsafe-inline'` for React styles |
| Resilience    | 5/5    | Soft resume + cost card + circuit breaker + heuristic fallback      |
| Tests         | 5/5    | Gate **80%**; heuristic unit + eval harness + no-key E2E            |
| CI/CD         | 5/5    | Bundle budget + LHCI on build job                                   |
| Documentation | 5/5    | AUDIT, CHANGELOG, ADR 0007, README                                  |
| PWA/Offline   | 5/5    | Shell + Dexie + full heuristic AI path                              |
| SEO           | 4.5/5  | LHCI SEO ≥95                                                        |
| Accessibility | 5/5    | axe smoke + LHCI a11y ≥95; mode badges ARIA-labeled                 |

---

## Closed in v0.2.1 (Offline mandate)

| ID    | Item                                             | Status     |
| ----- | ------------------------------------------------ | ---------- |
| OFF-1 | InferenceMode (`live` \| `heuristic`) + Settings | **Closed** |
| OFF-2 | Heuristics package (query/rank/synth/…/chat)     | **Closed** |
| OFF-3 | Mode-aware `geminiService` façade                | **Closed** |
| OFF-4 | UI badges, cost $0, positive messaging           | **Closed** |
| OFF-5 | First-run demo KB seed + dismiss banner          | **Closed** |
| OFF-6 | Heuristic eval harness + Playwright no-key run   | **Closed** |
| OFF-7 | ADR 0007                                         | **Closed** |

### Prior Phase 2 (still closed)

P0-9…P0-13, P1-1…P1-6, P2-1…P2-5 — see git history / v0.2.0 notes.

---

## Residual risks

- Heuristic ranking is lexical (TF/Jaccard), not semantic — educational quality, not a substitute for Gemini nuance.
- Offline research uses curated demo corpus when PubMed is unreachable.
- Residual CSP `style-src 'unsafe-inline'` for React `style={}` / theme FOUC CSS.
- ESLint warning budget remains elevated from legacy `any` usage (0 errors).

### P3 — Vision

Multi-LLM adapter, multimodal figures, local vector RAG, collaborative encrypted sharing, Zotero/Obsidian deep integrations.

---

## DevContainer / Ops

Prefer `pnpm run test:run` for fast loops; `test:coverage` for gate verification. Bundle report: `pnpm run analyze`. Budget check: `pnpm run build && pnpm run bundle:budget`. Lighthouse: `pnpm run test:lighthouse`.
