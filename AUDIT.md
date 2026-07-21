# Codebase Audit Report

> **Date**: 2026-07-21 (Post-PR#33 hardening & remediation sprint — v0.3.0)
> **Previous**: 2026-07-19 Multi-provider AI architecture — post v0.2.1
> **Overall Rating**: A (9.4/10) — Security gate closed, branch/dependency backlog cleared, one module explicitly shelved rather than left ambiguous
> **Auditor**: Claude Code CLI

---

## Executive Summary

PR #33 landed the **Non-AI Programmatic Research Engine foundation** (`src/services/nonAi/`) — a no-API-key research pipeline (query building, PubMed/arXiv retrieval, ranking, curation, synthesis; literature retrieval still requires network access, no AI vendor call is made) — but it merged undocumented and unwired: isolated from the provider registry, Settings, UI, and orchestration integration paths, with no CHANGELOG/AUDIT entry, no ADR. This pass closes that ambiguity by explicitly **shelving** it (not integrating), and separately fixes the one gate that was actually failing on `main`: `pnpm audit --audit-level=high` (5 vulnerabilities → 0). It also triages the accumulated branch and Dependabot backlog (all 9 stale branches resolved; 16 of 18 Dependabot PRs now merged/closed, 2 explicitly deferred as a dedicated future migration — see below), and wires the existing E2E specs into CI (non-blocking; it initially surfaced 2 test failures, both since root-caused and fixed via #63 — one was a genuine settings-persistence bug, the other a stale test selector). The coverage-hotspot pass is tracked as deferred work below, not yet done.

Phase 2 audit gates (coverage ≥80%, Recharts-only, bundle/LHCI, prompt registry, CSP) remain closed from v0.2.0; the multi-provider architecture gates from the 2026-07-19 pass remain closed.

---

## Scorecard (2026-07-21)

| Dimension     | Rating | Notes                                                                                                                    |
| ------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| Architecture  | 5/5    | ADRs 0001–0008; nonAi kept isolated, not partially wired                                                                 |
| TypeScript    | 5/5    | Strict mode; no changes this pass                                                                                        |
| Security      | 5/5    | `pnpm audit --audit-level=high` clean (was failing: 5 vulns)                                                             |
| Resilience    | 5/5    | Unchanged from 2026-07-19                                                                                                |
| Tests         | 4.5/5  | 340/340 (added a persistence-middleware regression test); coverage hotspots identified, not yet closed                   |
| CI/CD         | 5/5    | GitHub CodeQL Action version-lock bug found + fixed; E2E now wired (non-blocking), 2 test failures found and fixed (#63) |
| Documentation | 5/5    | CHANGELOG/AUDIT/version parity restored; nonAi status unambiguous                                                        |
| PWA/Offline   | 5/5    | Unchanged                                                                                                                |
| SEO           | —      | Not re-measured this pass                                                                                                |
| Accessibility | —      | Not re-measured this pass                                                                                                |

---

## Closed in this pass

| ID   | Item                                                                                                               | Status     |
| ---- | ------------------------------------------------------------------------------------------------------------------ | ---------- |
| RS-1 | `pnpm audit --audit-level=high`: 5 vulnerabilities to 0 (protobufjs, two brace-expansion lines, uuid)              | **Closed** |
| RS-2 | nonAi engine disposition: explicitly shelved and documented (not integrated this pass)                             | **Closed** |
| RS-3 | CHANGELOG/AUDIT/package.json/git-tag version parity restored (0.3.0)                                               | **Closed** |
| RS-4 | README tech-stack Chart.js to Recharts correction (EN + DE)                                                        | **Closed** |
| RS-5 | 9 stale branches removed, each individually re-verified via two-dot tree-diff                                      | **Closed** |
| RS-6 | Dependabot backlog: 18 branches triaged, 16 merged/closed, 2 deferred                                              | **Closed** |
| RS-7 | GitHub CodeQL Action (`github/codeql-action`) init/autobuild/analyze version-lock bug found and fixed              | **Closed** |
| RS-8 | E2E specs (smoke, agent-flow) wired into CI, non-blocking - 2 test failures surfaced, root-caused, and fixed (#63) | **Closed** |
| RS-9 | Settings-persistence bug: `persistenceMiddleware` clobbered Dexie with pre-hydration defaults on every boot (#63)  | **Closed** |

### Prior phases (still closed)

OFF-1…OFF-7, P0-9…P0-13, P1-1…P1-6, P2-1…P2-5, MP-1…MP-9 — see git history / prior audit notes.

---

## Deferred work (documented for follow-up)

- **nonAi engine integration** (RS-2's flip side): a future integration pass needs coverage raised on `retriever.ts` (4.72% lines), `keywordExtractor.ts` (9.75%), and `index.ts` (26.38%) first, plus an ADR (0009) following the ADR-0008 provider-registry pattern. Until then the low coverage is a known, intentional gap.
- **2 of the 18 triaged Dependabot PRs left open, each with a documented reason** (see `docs/dependabot-disposition.md`'s 2026-07-21 section): `vite` 6→8 and `@vitejs/plugin-react` 5→6 are deferred together as a dedicated future migration (plugin-react 6.x requires Vite 7+, and Vite 8 is a bundler-architecture change — esbuild/Rollup → Rolldown/Oxc — not a routine version bump). The remaining 16 are merged or closed (either directly, consolidated into another PR, or — for 3 that were initially deferred pending human sign-off — merged this session: `eslint-plugin-react-hooks` #62, `@anthropic-ai/sdk` #61, `fake-indexeddb` #60).
- **Coverage hotspots** (unchanged from 2026-07-19): `src/services/providers/gemini.ts` (49.39% lines), `ollama.ts` (57.98%), `openai.ts` (62.64%), `src/store/slices/apiSlice.ts` (63.39% lines / 35.08% branches), `src/services/heuristics/researchStream.ts` (56.14%).
- **E2E specs**: `src/test/e2e/provider-flow.spec.ts` and `src/test/e2e/journal-hub.spec.ts` remain unwritten (the CI job wired this pass only runs the two specs that already existed). The 2 test failures the new CI job initially surfaced (KB empty-state, mobile nav) are now fixed via #63 (see `docs/e2e-ci-backlog.md`) — full scoped suite passes clean.
- **Settings export/import round-trip test** including provider fields and migration.
- **Bundle headroom**: main entry chunk was 285.5 kB gzip / 400 kB budget as of 2026-07-20; not re-measured after this pass's dependency bumps.
- **API key non-extractable hardening**: `apiKeyService.ts`'s `crypto.subtle.generateKey` call is still `extractable: true` - a proposed hardening, not a fix for an active vulnerability.

---

## Residual risks

- Non-Gemini providers do not support live web grounding; `findRelatedOnline` falls back to an honest heuristic stub.
- Anthropic SDK requires `dangerouslyAllowBrowser: true` in a client-only PWA; this is documented in ADR 0008 and README.
- Ollama relies on a local server and CORS configuration; the default `http://localhost:11434` is the common setup.
- Residual CSP `style-src 'unsafe-inline'` for React `style={}` / theme FOUC CSS.
- ESLint warning budget remains elevated from legacy `any` usage (0 errors, 176 warnings, budget 650) — a dedicated no-`any`/zero-warnings policy pass is planned as a follow-up.
- `src/services/nonAi/` exists in the tree, isolated from the provider registry, Settings, UI, and orchestration integration paths (it does import shared types/`AppError` from outside its own directory, which is normal and expected) - a future contributor grepping for AI provider options won't find it in Settings/UI; this document and the CHANGELOG are the intended discovery path.

### P3 — Vision

Multi-LLM adapter (completed), multimodal figures, local vector RAG, collaborative encrypted sharing, Zotero/Obsidian deep integrations.

---

## DevContainer / Ops

Prefer `pnpm run test:run` for fast loops; `test:coverage` for gate verification. Bundle report: `pnpm run analyze`. Budget check: `pnpm run build && pnpm run bundle:budget`. Lighthouse: `pnpm run test:lighthouse`.
