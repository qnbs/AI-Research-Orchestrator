# Remediation Sprint Session — 2026-08-02 (evening)

## Metadata

| Field                     | Value                                                                           |
| ------------------------- | ------------------------------------------------------------------------------- |
| Session start `main` HEAD | `8ab0a26` (merge #195)                                                          |
| Auditor baseline prompt   | Post-v0.4.1 full-scale remediation (audit cut-off assumed `efd9406`)            |
| Package version           | `0.4.1`                                                                         |
| Open PRs produced         | #196 (docs), #197 (P1-9 tests), #198 (EventRow tests), #199 (Firefox E2E flake) |

## Executive status

Workstream A (E2E WebKit KB demo) was **already landed** as #195 before this session. This session:

1. Finished audit/docs follow-through for #195 (#196)
2. Expanded P1-9 unit depth (#197)
3. Added Agent Debugger `EventRow` prompt-budget regression tests (#198)
4. Recorded a second clean post-merge cross-browser full-suite run on `main`

## Workstream outcomes

### A — Cross-browser E2E

| Item                    | Evidence                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| #195 merged             | `8ab0a26` on `main`                                                                               |
| Clean baseline          | run `30767470525` / `022475d` — **54/0, no flaky** all browsers                                   |
| Firefox flaky (non-KB)  | `f6cdaed` / `30767766848` — Firefox **53 + 1 flaky** (`networkidle` a11y)                         |
| Post-merge clean        | `8ab0a26` / `30768002841` — **54/0, no flaky** Firefox, WebKit, mobile Chrome                     |
| Streak (job logs)       | WebKit/mobile Chrome **9/10**; Firefox **3/10** after #196 CB `30769381735` (post-#199 harden)    |
| Firefox flake follow-up | #199 landed harden + `ensureAppShellReady` DRY; **54/0 no flaky** on Firefox/WebKit/mobile Chrome |
| Blocking promotion      | **Not** flipped — advisory until 10× criterion + maintainer approval                              |

Tracked in `docs/e2e-ci-backlog.md` and `docs/audits/2026-08-02-p1-closeout.md` via #196.

### Multi-bot review gate (session PRs)

| PR   | Unresolved threads | Notes                                                                                                       |
| ---- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| #196 | **0**              | Greptile P2 fixed/resolved; CR APPROVED earlier, rate-limited on latest; CodeAnt/DeepSource/Bugbot/CI green |
| #197 | **0**              | CodeRabbit APPROVED on `9202f50`; CodeAnt/DeepSource/Bugbot green; Greptile no review (re-requested)        |
| #198 | **0**              | CodeRabbit still rate-limited (re-requested); CodeAnt/DeepSource/Bugbot green; CI green                     |
| #199 | **0**              | CodeRabbit still rate-limited (re-requested); CodeAnt/DeepSource/Bugbot green; CB **54/0** on `0cea8ef`     |

### B — P1-9 test depth (#197)

Expanded deterministic unit tests for:

- Gemini / OpenAI / Anthropic / Ollama adapters (error mapping, abort, chat, `testConnection`, capabilities, schema, grounding, NDJSON)
- `databaseService` (NCBI key stripping, newest-first ordering, checkpoint limit)
- `generateResearchReportStream` prompt-budget stage yields

CI on `8c9b2c5` (pre-floor-ratchet commit):

| Gate                                | Result                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `check:fast` / Typecheck Lint Tests | PASS                                                                               |
| Coverage (logic layers)             | statements **86.88%**, lines **88.64%**, branches **76.96%**, functions **86.24%** |
| providers aggregate                 | statements **~90%**, lines **~94%**, branches **~82%**, functions **~94%**         |
| `geminiService.ts`                  | statements **~71%**, branches **~53%**                                             |
| `check:coverage-floors`             | PASS → floors ratcheted in `977e3ba`                                               |
| Playwright E2E Chromium             | **54 passed / 0 failed**                                                           |

CodeRabbit findings on #197 addressed in `9202f50` (hoisted mocks, exact checkpoint timestamps, abort contract assertions).

### C — Debugger observability (#198)

`EventRow.test.tsx` covers ranking/synthesis prompt-budget summary chrome, omitted-PMID expansion, and synthesis field truncation. No production code changes.

### D — Docs / hygiene

- #196: Release SHA vs Closeout SHA clarification; streak table update
- CHANGELOG `[Unreleased]` entries on #197 / #198
- This session note

## Residual risks / next priorities

1. **Cross-browser streak** — continue toward 10/10; watch Firefox `networkidle` a11y flake separately from KB demo.
2. **Merge #196–#199** after review quiescence on latest commits (CR Fair Usage may delay #198/#199).
3. **geminiService.ts file size** — still over the 700-line hard max (pre-existing); split in a dedicated PR.
4. **Narrative synthesis epistemic limits** — unchanged (ADR 0012 / 0015); do not claim fully verified live UI synthesis.
5. **Dependabot** — process opportunistic minors per rule 012 when new PRs open.

## Commands for re-verification

```bash
pnpm install --frozen-lockfile
pnpm run check:fast
pnpm run check:docs-drift
pnpm exec vitest run src/services/providers src/services/databaseService.test.ts src/services/geminiService.test.ts src/components/agentDebugger/EventRow.test.tsx
# Authoritative coverage + E2E: read deploy.yml / e2e.yml on PRs #197 and #198
```
