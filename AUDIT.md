# Codebase Audit Report

> **Date**: 2026-07-22 (Post-PR#67 nonAi/heuristics consolidation, CodeQL remediation & review-correction loop — v0.3.0, unreleased)
> **Previous**: 2026-07-21 Post-PR#33 hardening & remediation sprint
> **Overall Rating**: A (9.5/10) — nonAi engine now fully integrated (was shelved), all CodeQL alerts closed, lint policy complete; version-tag/CHANGELOG drift and API-key hardening remain genuinely open
> **Auditor**: Claude Code CLI

---

## Executive Summary

Since the 2026-07-21 pass, four PRs landed: **#64/#65** (a no-`any`/zero-warnings ESLint policy pass — lint is now 0 errors / 0 warnings, down from the 176 warnings the prior audit cited), **#66** (Vite 6→8 + `@vitejs/plugin-react` 5→6 migration — the "dedicated future migration" the prior audit explicitly deferred), and **#67**, the largest of the four: a full consolidation of the two overlapping deterministic (non-AI) code paths — `src/services/nonAi/` (previously shelved/unwired per the prior audit's RS-2) and `src/services/heuristics/` (now deleted in full) — into one canonical engine (ADR 0009, accepted), wired into Settings as a first-class no-API-key path. PR #67 also closed **every open GitHub CodeQL code-scanning alert** (11 alerts: unanchored host/URL substring checks, incomplete HTML-tag-stripping and BibTeX-escaping) and ran a full CodeRabbit/Greptile review-correction loop to quiescence, recovering and fixing 13 additional findings that a GitHub server error had prevented from posting as normal inline review comments.

**This closes the prior audit's single biggest open item (RS-2/the nonAi-integration deferral) outright** — the engine is no longer "isolated, not wired": it's reachable from the provider registry, Settings UI, orchestration, and the Knowledge Base/Journals/Authors views, with 97.99%/85.03%/94.31% (lines/branches/functions) test coverage.

**What did not get closed this pass, and is now flagged as genuinely open** (see Residual risks): the prior audit's own RS-3 ("version parity restored") was **false when written** — no `v0.3.0` git tag exists today (`git tag -l` → only `v0.2.0`, `v0.2.1`), `package.json` says `0.3.0`, and `CHANGELOG.md`'s `[Unreleased]` section doesn't mention any of PRs #64–#67. API-key `extractable: true` hardening (flagged as deferred in the prior audit) is still not done. The jsx-a11y severity downgrade and the 650-warning lint budget (both flagged as follow-up items in the prior audit) are also both still in place, now stale given lint is already 0/0.

---

## Scorecard (2026-07-22)

| Dimension     | Rating | Notes                                                                                                                                                                   |
| ------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture  | 5/5    | ADRs 0001–0010; nonAi/heuristics duplication resolved into one engine, cleanly wired                                                                                    |
| TypeScript    | 5/5    | Strict mode; `tsc --noEmit --listFiles` confirms full, uncached, whole-repo checking (no `composite`/`incremental`)                                                     |
| Security      | 4.5/5  | All 11 open CodeQL alerts closed this pass; `pnpm audit --audit-level=high` clean; API-key `extractable: true` hardening still outstanding                              |
| Resilience    | 5/5    | Unchanged — circuit breakers, typed `AppError`, backoff-with-`Retry-After` all in place                                                                                 |
| Tests         | 5/5    | 63 test files / 498 tests passing; logic-layer coverage 85.32%/78.33%/84.22% (lines/branches/functions), clears the 80/55/55 gate; E2E 38/38 passing on CI              |
| CI/CD         | 5/5    | CodeQL, CodeRabbit, Greptile, CodeAnt (Quality Gates/SAST/SCA/SCR/Test Coverage), Dependency Review, gitleaks, Socket Security all green on latest `main`               |
| Documentation | 3.5/5  | This pass + a docs-housekeeping sweep retired 6 fully-superseded audit docs and corrected 3 more; version-tag/CHANGELOG parity is genuinely broken (see Residual risks) |
| PWA/Offline   | 5/5    | Unchanged                                                                                                                                                               |
| SEO           | —      | Not re-measured this pass                                                                                                                                               |
| Accessibility | —      | Not re-measured this pass; jsx-a11y severities remain downgraded to `warn` in `eslint.config.js` (see below)                                                            |

---

## Closed in this pass

| ID    | Item                                                                                                                                                                                                                                                                                                                                                                        | Status     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RS-10 | nonAi/heuristics consolidated into one deterministic engine (ADR 0009, accepted), fully wired (registry, Settings, orchestration, KB/Journals/Authors views)                                                                                                                                                                                                                | **Closed** |
| RS-11 | `src/services/heuristics/**` deleted in full (17 source + 2 test files) after every unique capability confirmed ported                                                                                                                                                                                                                                                      | **Closed** |
| RS-12 | 2 real pre-existing bugs found and fixed during the consolidation: keyword-stemming bug (stemmed fragments shown as user-facing keywords), silently-inert publication-type ranking boost                                                                                                                                                                                    | **Closed** |
| RS-13 | All 11 open GitHub CodeQL code-scanning alerts closed (unanchored host/URL substring checks in `sw.js`/`geminiService.ts`/test mocks; incomplete HTML-tag-stripping and BibTeX-escaping in `exportService.ts`) — confirmed 0 results on the final scan                                                                                                                      | **Closed** |
| RS-14 | Full CodeRabbit/Greptile review-correction loop to quiescence on PR #67, including recovering 13 findings a GitHub server error had prevented from posting as inline comments (found by reading the raw review body text directly)                                                                                                                                          | **Closed** |
| RS-15 | Vite 6→8 + `@vitejs/plugin-react` 5→6 migration (PR #66) — the dedicated future migration the 2026-07-21 audit explicitly deferred                                                                                                                                                                                                                                          | **Closed** |
| RS-16 | No-`any`/zero-warnings ESLint policy pass (PRs #64/#65) — lint is 0 errors / 0 warnings, down from 176 warnings                                                                                                                                                                                                                                                             | **Closed** |
| RS-17 | Docs housekeeping: 6 fully-superseded audit docs deleted (`ARCHITECTURE-REVIEW.md`, `AUDIT-EXECUTIVE-SUMMARY.md`, `CODEBASE-AUDIT-COMPLETE.md`, `E2E-TEST-ANALYSIS.md`, `E2E-TEST-FIXES.md`, `IMPLEMENTATION-QUICKREF.md`); `UI-UX-AUDIT.md` and `HARDCODED-STRINGS-REMAINING.md` re-validated and corrected in place; `I18N-AUDIT.md` flagged stale pending a full rewrite | **Closed** |

### Prior phases (still closed)

OFF-1…OFF-7, P0-9…P0-13, P1-1…P1-6, P2-1…P2-5, MP-1…MP-9, RS-1…RS-9 — see git history / prior audit notes (this file's own git blame covers RS-1 through RS-9 from the 2026-07-21 pass).

---

## Deferred work (documented for follow-up)

- **API key non-extractable hardening**: `apiKeyService.ts`'s `crypto.subtle.generateKey` call is still `extractable: true` (line 43) — flagged as a proposed hardening in the 2026-07-21 audit, still not implemented. The raw key bytes are persisted via `exportKey('raw', key)` into the same IndexedDB store as encrypted secrets; any IndexedDB access (e.g. XSS) can read the master key directly.
- **Version/tag/CHANGELOG parity**: `package.json` says `0.3.0`; no `v0.3.0` git tag exists; `CHANGELOG.md`'s `[Unreleased]` section does not mention PRs #64, #65, #66, or #67. This needs a real version bump (recommend `0.4.0`, since #67 alone is user-facing-feature-sized), a matching git tag, and a GitHub release, done _after_ the CHANGELOG is brought current — not before.
- **jsx-a11y severity downgrade + lint warning budget**: `eslint.config.js`'s `Object.fromEntries(...)` block (lines 41-46) still downgrades jsx-a11y's recommended rule severities from `error` to `warn`, and `package.json`'s `--max-warnings 650` budget is unchanged — both predate the zero-warnings policy pass (#64/#65) and should be tightened now that the codebase is provably at 0 warnings without them.
- **i18n**: `src/services/nonAi/**` and a large fraction of the rest of the app (error messages, loading-phase text, several modals, `HelpView.tsx`, broad aria-label/title/placeholder chrome) are hardcoded English with no `t()` calls — ~500 strings total, scoped in a dedicated multi-wave migration plan (in progress as of this writing).
- **Coverage hotspots** (unchanged from 2026-07-21, re-measured): `src/services/providers/gemini.ts` (49.39% lines), `ollama.ts` (57.98%), `openai.ts` (62.64%), `anthropic.ts` (65.4%), `heuristic.ts` (70.23% — note this file's actual `generateContent`/`generateContentStream`/`createChatSession` methods are confirmed unreachable dead code in the live app, per ADR-0009's Context section, which may explain the low coverage more than it indicates risk), `src/store/slices/apiSlice.ts` (63.09% lines / 35.08% branches).
- **E2E specs**: `src/test/e2e/provider-flow.spec.ts` and `src/test/e2e/journal-hub.spec.ts` remain unwritten — the CI job still only runs `smoke.spec.ts` and `agent-flow.spec.ts` (38 tests total, 38/38 passing on the latest `main` run).
- **Settings export/import round-trip test** including provider fields and migration (unchanged from prior audit).
- **CSP `style-src 'unsafe-inline'`**: still present for React `style={}` / theme FOUC CSS, documented as intentional (unchanged from prior audit).

---

## Residual risks

- Non-Gemini providers do not support live web grounding; `findRelatedOnline` falls back to an honest heuristic stub.
- Anthropic SDK requires `dangerouslyAllowBrowser: true` in a client-only PWA; documented in ADR 0008 and README.
- Ollama relies on a local server and CORS configuration; the default `http://localhost:11434` is the common setup.
- Residual CSP `style-src 'unsafe-inline'` for React `style={}` / theme FOUC CSS.
- `providers/heuristic.ts` (the registered `AIProvider` adapter) is itself unreachable dead code in the live app: `geminiService.ts`'s `shouldUseHeuristic()` early-exits to call deterministic functions directly at every real call site before the provider registry is ever consulted. Documented as an accepted fact in ADR-0009 rather than fixed, since fixing it would trade type-safe direct calls for fragile prompt-sniffing in the generic adapter path.
- `apiKeyService.ts`'s master encryption key is still generated as `extractable: true` (see Deferred work).
- ESLint's jsx-a11y severities remain downgraded to `warn` and the 650-warning budget is unchanged, despite the codebase now being provably at 0 warnings (see Deferred work).

### P3 — Vision

Multi-LLM adapter (completed), multimodal figures, local vector RAG, collaborative encrypted sharing, Zotero/Obsidian deep integrations.

---

## DevContainer / Ops

Prefer `pnpm run test:run` for fast loops; `test:coverage` for gate verification. Bundle report: `pnpm run analyze`. Budget check: `pnpm run build && pnpm run bundle:budget`. Lighthouse: `pnpm run test:lighthouse`.

**Bundle size** (measured this pass): entry `js/index-*.js` 202.0 kB gzip (400 kB budget), largest vendor chunk `vendor-charts` 119.8 kB gzip (180 kB budget) — both comfortably under budget; `pnpm run bundle:budget` passes clean.
