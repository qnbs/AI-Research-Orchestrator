# 2026-07-16 — Phase 0 audit execution

## Decisions

- Raise coverage gate to 70% (not jump straight to 80%) to keep CI green while closing P0 gaps; 75/80 tracked as P0-9.
- State SoT documented in ADR 0001 (Redux + Dexie; PresetContext exception; local App stream state).
- Security automation in separate `security.yml` to avoid blocking Pages deploy on CodeQL latency.
- pnpm audit remains `--audit-level=high` in deploy path; moderate tightening deferred with manual review (avoid surprise CI red).
- **English-only** for new repo content (docs, comments, commits, default strings) — `.cursor/rules/010-english-content.mdc`.

## Impact

- New libs under `src/lib/` are in Vitest coverage include and lift aggregate %.
- KB deletes now sync Redux entities (data-integrity fix).

---

# 2026-07-16 — Phase 1 audit continuation (post PR #25 merge)

## Decisions

- Soft resume only (restore partial report / re-run / discard) — no Gemini phase-skip (matches ADR orchestration constraints).
- Cost dashboard lives in Settings → AI (`CostEstimateCard`); pre-flight toast stays i18n-aware.
- AgentDebugger split into `agentDebugger/` modules; keep thin `AgentDebugger.tsx` re-export for lazy import stability.
- Bundle visualizer is opt-in (`ANALYZE=1` / `pnpm run analyze`), not a hard CI gate yet (P1-1 partial).
- axe smoke checks critical/serious only on `#root` to avoid flaky moderate noise.

## Impact

- P0-10 / P0-11 / P0-13 closed in AUDIT; P1-5 closed; P1-1/P1-6 partial.

---

# 2026-07-16 — Phase 2 audit completion (v0.2.0)

## Decisions

- Coverage gate → **80%**; deepen export PDF paths + useChat streaming + slice reducers.
- Consolidate charts on **Recharts** (ADR 0005); drop Chart.js.
- CI hard gates: `bundle:budget` + Lighthouse CI (a11y/BP/SEO ≥95; performance warn).
- Prompt catalog versioning (ADR 0006) + offline `agentEval` harness.
- CSP `connect-src` allowlist for Gemini/NCBI/arXiv/CDN; leave `unsafe-inline` for JSON-LD for now (P2-5 partial).

## Impact

- package **0.2.0**; remaining open: advanced SW cache (P2-2), deeper i18n (P2-3), full CSP nonce (P2-5 rest), GitHub Release after merge.
- Next: Lighthouse CI, JSDoc pass, chart consolidation, CSP tighten, Release v0.2.0.
