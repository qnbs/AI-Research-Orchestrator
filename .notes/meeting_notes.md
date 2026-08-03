# 2026-08-01 — Autonomous continuation (post v0.4.0)

## Landed

- **#119** openai 6→7.2 (Dependabot #98 closed as superseded).
- **#120** HelpView i18n Wave 8 (EN+DE `help.*`, catalog split under 700 lines, FAQ accuracy fixes).
- **#118** WS-E focus rings: `.focus-ring-aa`, ESLint guard, Playwright keyboard-focus.
- **#122** WS-F skip-to-content + `#main-content` landmark + 44×44 touch targets (merged).
- **#123** Chrome i18n shell: Header/Welcome/OrchestratorDashboard/ConfirmationModal/FeatureErrorBoundary → `chromeTranslations.ts` + ratchet.
- **#124** WS-G dialog a11y: Escape + scroll lock via `useFocusTrap` (merged).
- **#125** WS-H1: QuickAdd / History / preset modal EN+DE via `modalTranslations.ts` + ratchet (merged).
- **#126** WS-H2: CommandPalette EN+DE via `commandPaletteTranslations.ts` + ratchet (merged).
- **#127** WS-I: blocking axe critical/serious smoke (`a11y.yml` + `a11y.spec.ts`) (merged).
- **#128** InputForm body/header EN+DE via `inputFormTranslations.ts` + ratchet (merged).
- **ResearchView i18n (this branch):** Rapid Research Assistant EN+DE via `researchViewTranslations.ts` + ratchet.
  - **Why:** Research tab was still English-only after chrome/modal/CommandPalette/InputForm waves.
  - **Impact:** EN+DE assistant chrome; LoadingIndicator shows translated phase labels; protocol phase ID stays English.
- **ReportDisplay i18n (this branch):** report chrome + `ReportArticleCard` + ChatInterface + RelevanceScoreDisplay EN+DE via `reportTranslations.ts` + ratchet.
  - **Why:** Report view was still English-only after ResearchView wave; file over 700 lines before ArticleCard extract.
  - **Impact:** EN+DE report UI; accordion panels get `inert` when closed; export confirm still uses `kb.export.*`.
- **Settings General i18n (this branch):** General tab EN+DE via `settingsTranslations.ts`; extracted `GeneralSettingsTab.tsx`; SettingsView shell tab/nav chrome piggybacked; ratchet covers General tab only.
  - **Why:** Settings was still English-only after ReportDisplay wave; General was the first SettingsSubComponents tab slice.
  - **Impact:** Language / Appearance / PWA / Notifications / Performance fully localized; shell KB/Export/Data tab labels + About/FAQ localized.
- **Settings remaining i18n (this branch):** AI / KB / Export / Data tabs + confirm/prune modals + toasts EN+DE via `settingsTranslations.ts`; extracted dedicated tab files; ratchet covers Settings surfaces.
  - **Why:** Close residual Settings English-only backlog after General wave.
  - **Impact:** Full Settings UI localized; CSV column / persona / article-type protocol values stay English in state; import errors no longer leak raw exception text.
- **Authors / Journals / Agent Debugger / Collections i18n (this branch):** hub chrome + debugger panel/toggle/rows + Collections view EN+DE; `authorTranslations.ts` / `debuggerTranslations.ts` extracted; `AuthorProfileView` split under 700-line cap; ratchet extended.
  - **Why:** Next residual English-only surfaces after Settings.
  - **Impact:** Authors/Journals hubs, Agent Debugger chrome, and Collections fully localized; protocol agent IDs / journal category keys stay English in state.
- **KB / Article detail / Dashboard / Scientometric i18n (follow-up branch):** EN+DE via `kbChromeTranslations.ts` + `dashboardTranslations.ts`; Dashboard chart primitives extracted; ratchet covers KB + dashboard surfaces.
  - **Why:** Continue residual English-only chrome after hubs/debugger/collections.
  - **Impact:** Knowledge Base filters/list/delete, ArticleDetailPanel discovery tools, Dashboard charts, and ScientometricHub tabs localized.
- **Residual chrome / enum-chip i18n (this branch):** shared tooltip/notification/loading/pipeline/KB-item chrome plus author/journal featured categories, match types, and OA policy chips use EN+DE labels.
  - **Why:** Close the remaining chrome and enum-label i18n backlog after #133/#134.
  - **Impact:** English enum/category values stay in state and JSON data; UI labels render through `t()` with raw fallback for unknown values.

## Still open

- No known residual chrome or enum-label i18n backlog; continue auditing any newly introduced surfaces with the ratchet.

## 2026-08-01 — E2E promotion + deferred specs

- **Why:** 10 consecutive CI runs logged `51 passed` with zero failures; promotion criteria in `docs/e2e-ci-backlog.md` met. Deferred Journal Hub + provider-selection specs were still unwritten.
- **What:** Flip E2E `continue-on-error` to false; add `journal-hub.spec.ts` / `provider-flow.spec.ts` + `e2eHelpers.ts`; Claude Code Review advisory-only; refresh backlog docs.
- **Impact:** E2E becomes a required check; new specs cover Journal Hub landing/featured/suggest and Settings AI provider cycling (including heuristic). Merged as #136.

## 2026-08-01 — Vitest 4 upgrade

- **Why:** Last remaining Dependabot-class major after Vite 8 / openai 7.
- **What:** Bump `vitest` + `@vitest/coverage-v8` to `^4.1.10`; fix constructor mocks (OpenAI/Anthropic/Gemini/jsPDF) to use `function`/`class`; rewrite SW integrity window listener harness for Vitest 4 spy reuse + jsdom location brand issues.
- **Impact:** 564 unit tests green; coverage gate still ≥80/80/55/55. Merged as #137.

## 2026-08-01 — Claude Code Review allowed_bots

- **Why:** Review job aborted on Cursor Cloud Agent PRs with `Workflow initiated by non-human actor: cursor (type: Bot)`.
- **What:** Set `allowed_bots: cursor` on `.github/workflows/claude-code-review.yml` (explicit list, not `*`). Keep `continue-on-error: true` for residual OAuth hiccups.
- **Impact:** Cursor-opened PRs can receive Claude reviews; job stays advisory.

## Process

- DeepSource JS often flags ESM/`eslint-local-rules` and nesting nitpicks; core gates (typecheck/lint/tests/build) remain authoritative. Claude Code "review" ~10s failures remain transient infra.
- Skip links in this app **must** `preventDefault` and focus `#main-content` manually — bare `href="#main-content"` fights `useUrlSync` hash view routing.
- WS-G→WS-I reconstructed from WCAG dialog / i18n backlog order when `PROMPT-ARO-HARDENING-UIUX` is missing.

---

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

---

# 2026-07-17 — v0.2.1 merge + standing merge gate

## Decisions

- Offline heuristic inference layer (PR #29) merged to `main` after CodeRabbit + CodeAnt correction loops cleared (0 unresolved threads, reviewDecision APPROVED).
- **Standing rule:** When automated review correction loops are complete on a feature PR, squash-merge to `main` and continue — do not wait for an extra merge confirmation.
- Tag / GitHub Release **v0.2.1** cut from merge tip.

## Impact

- Heuristic inference available in production build; ADR 0007 accepted.

---

# 2026-07-19 — Multi-provider AI architecture

## Decisions

- Implement provider-agnostic transport layer under `src/services/providers/` with lazy-loaded adapters for Gemini, OpenAI, Anthropic, Ollama, and heuristic.
- Keep `geminiService.ts` as the feature façade; route AI calls through `getProviderForSettings()`.
- Extend `Settings.ai` with `provider` and `customBaseUrl`; default missing values to Gemini.
- Move `apiKeyService.ts` to per-provider encrypted storage slots; migrate legacy `encrypted-api-key` to Gemini slot.
- Generalize errors to `PROVIDER_*` codes while keeping `GEMINI_*` aliases for backward compatibility.
- Widen CSP `connect-src` for OpenAI, OpenRouter, Anthropic, and `localhost:11434`.
- **Deferred:** E2E specs for provider-flow and journal-hub; coverage hotspots (`heuristics/chat.ts`, `heuristics/journalProfiling.ts`, `researchStream.ts`); settings export/import round-trip test. Documented in ADR 0008 and AUDIT for follow-up.

## Impact

- ADR 0008 accepted; README, AGENTS, CHANGELOG, AUDIT updated.
- User-facing: Settings → AI Provider selects backend; OpenRouter/Ollama supported; heuristic remains zero-cost fallback.

---

# 2026-07-22/23 — Session handoff: `PROMPT-ARO-HARDENING-UIUX` sprint, mid-flight

**Pausing here for the week** (user logging off, usage limit ahead). This entry is the continuation point for next session.

## Sprint status (workstream sequence: WS-C → WS-A → WS-B → WS-D → WS-E → WS-F → WS-G → WS-H1 → WS-H2 → WS-I)

- **WS-C, WS-A, WS-B, WS-D: done and merged.**
- **WS-E (2026-08-01):** focus rings restored on bare `focus:outline-none` sites; `.focus-ring-aa` utility; ESLint `local/no-bare-outline-none`; Playwright `keyboard-focus.spec.ts`.
- **WS-F (2026-08-01):** skip-to-content + main landmark + 44×44 touch targets (reconstructed — full original prompt not in-repo).
- **WS-G (2026-08-01):** dialog a11y — Escape + scroll lock via `useFocusTrap` options; Confirmation/QuickAdd/Settings/Preset modals.
- **WS-H1 (2026-08-01 / #125):** QuickAdd / History / preset modal EN+DE via `modalTranslations.ts` + ratchet.
- **WS-H2 (2026-08-01 / #126):** CommandPalette EN+DE via `commandPaletteTranslations.ts` + ratchet.
- **WS-I (2026-08-01):** blocking axe critical/serious smoke (`a11y.yml` + `a11y.spec.ts`). Hardening sequence C→I complete for reconstructed scope; residual form/report i18n remains.
- Full original WS-H→WS-I prompt still not in-repo — proceed from meeting-note summaries / prior session compaction unless user re-shares `PROMPT-ARO-HARDENING-UIUX`.

## Merged this session (chronological)

- **2026-08-01 — PR #109 (#95 Tailwind v4 `@theme`).** Native `@theme reference inline` + `@theme` blocks in `src/index.css`; legacy `tailwind.config.js` deleted. Custom utilities (`bg-surface`, `text-text-primary`, `border-border`, `animate-fadeIn`, …) now emit real CSS.
- **2026-08-01 — PR #111 (#96 WS-D follow-ups).** Unquoted `ui-monospace` in `--font-mono`; contrast gate asserts border vs input-bg.
- **2026-08-01 — #78 / #74 (App.tsx decomposition) on branch `cursor/app-tsx-decomposition-aa80`.** `src/App.tsx` reduced from 869 → ~20 lines (providers only). Split into `src/app/useAppLogic.ts` (composer) + domain hooks (`useResearchSession`, `useAppChromeEffects`, `useKbExports`), `AppLayout` / `AppViewRouter` (chrome + routing), plus `getAgentForPhase` / spinners / lazyViews. Vault-reset listener semantics preserved; review pass also fixed empty-stream guard, checkpoint delete error handling, stream abort on history open, spinner a11y, and modal/export i18n.
- **PR #75** — CI workflow validation fix (invalid `secrets.*` in job-level `if:`) on `security.yml`. _(Superseded: external static-analysis integration removed 2026-08-02.)_
- **PR #76** (WS-A) — removed vestigial CDN import map (ADR 0011), new `check-no-cdn-scripts.mjs` gate.
- **PR #77** (WS-B) — self-hosted Workbox (no more CDN `importScripts()`), versioned runtime caches, explicit update flow. Went through **4 review-correction waves** before merging; found and fixed real bugs along the way, notably: reload logic that only reloaded the tab that clicked "Reload" (other open tabs got silently taken over by the new SW while running old JS — fixed by gating reload on "was this tab already controlled at load," not "did this tab click the button"), a cache-prune predicate that would have deleted unrelated same-prefixed caches, a CodeQL missing-origin-check finding, and a self-inflicted syntax error in `copy-workbox.mjs` (a `*/` inside a comment string closed the block comment early — never caught by CI since that script isn't wired into any pipeline).
- **14 Dependabot PRs** (#79–#92) — all triaged and merged. Found two "must move together" bugs Dependabot's per-package PRs don't know about: **react + react-dom** must share the exact same version (one PR bumped only `react`, breaking every test); **codeql-action's `init`/`autobuild`/`analyze`** must all three be pinned to the same version (3 separate Dependabot PRs each bumped only one, breaking CodeQL). Both fixed by consolidating onto one PR and closing the redundant others.
- **PR #93** — deleted `AUDIT.md` and `docs/UI-UX-AUDIT.md`: both rated the codebase unrealistically well (AUDIT.md: "9.5/10, near-uniform 5/5" despite its own listed unfixed security gap; UI-UX-AUDIT.md explicitly claimed "WCAG 2.2 AA compliance" that was empirically false). `docs/I18N-AUDIT.md` was **not** touched — it already self-flags as stale honestly and isn't part of this problem.
- **PR #94** (WS-D) — WCAG 2.2 AA contrast fixes: `--color-border` and `--focus-ring` failed the 3:1 non-text-contrast minimum in **all three themes**; paper-light's 4 semantic badge colors failed 4.5:1 text-contrast. Fixed via a two-layer opaque focus ring, darker/higher-opacity border tokens, darkened paper-light semantic colors, a new `--color-border-subtle` (for genuinely decorative uses WCAG exempts) and `--color-text-placeholder` (85% mix, clears 4.5:1 — an earlier 70%/3:1 draft was corrected on review, since placeholder text gets the same 4.5:1 as any other text, no special exception). New `scripts/check-contrast.mjs` CI gate parses real token values out of `src/index.css` and also asserts FOUC-bootstrap parity with `index.html`.

## Also fixed outside the PR-by-PR flow

- **External static-analysis noise on `main` (2026-08-01):** resolved at the time via CI versioning; integration fully removed 2026-08-02.

## Tracked follow-ups (GitHub issues)

- #95 / #96 closed. #74 / #78 implemented via #110 (close on GitHub if still open).
- Dependabot #98 retargeted to openai 6→7 after #113 landed 4→6 — adopt or document deferral.

## Process notes for next session

- One workstream = one PR; full gate sweep (`typecheck`/`lint`/`build`/relevant gates) before every push; review-correction loop (GraphQL `reviewThreads` **and** paginated review-body text) to quiescence before merge — this discipline held for all of WS-D and caught real bugs each time, don't shortcut it once back to normal budget.
- A "review" (Claude Code Review) job failing in ~10s with `is_error:true`/zero cost/no tool calls is a transient infra hiccup, not a real finding — confirmed repeatedly this session by retrying (`gh run rerun <id> --failed`) and getting a real, several-minutes-long review back. Don't skip retrying it once, but also don't chase it past 2 retries on a pure mechanical dependency-bump PR.
- Local dev machine is RAM-constrained (~3.7GB); `pnpm run test:coverage` and the full Playwright E2E suite are both cloud-first (read CI's result, don't reproduce locally) per this session's own established policy in `CLAUDE.md`.

## 2026-08-02 — P0 Synthetic Demo Quarantine

- Confirmed silent demo fallback in nonAi stream on empty/fail/offline.
- ADR 0016: explicit `educationalDemoMode` only; Dexie v6 stamps demo sourceClass.
- Next: immutable execution provenance (PR2), abort contracts (PR3), stateful chat (PR4).

## 2026-08-03 — Integrity wave #200–#204 merged; PR6 Ollama Local AI

- Merged: #200 demo quarantine, #201 immutable provenance, #202 abort/timeout, #203 stateful chat, #204 claim/corpus-supported terminology.
- Next in remediation plan: PR6 Ollama first-class Local AI → PR7 typed pipeline events → PR8 E2E fixtures → PR9 eval → PR10 docs → PR11 CI governance.

## 2026-08-03 — PR6 merged (#205); PR7 typed pipeline events

- Merged #205 Ollama first-class Local AI (ADR 0019).
- PR7: ADR 0020 typed `phaseId` stream events; fix PubMed+arXiv → PubMedFetcher; timeline by ID for DE locale.

## 2026-08-03 — Main cross-browser WebKit red (Ollama CORS) + gate promotion

- **Why:** After #206 merge, `main` run `30786120773` WebKit failed `provider-flow` Ollama healthy path (`cors`); PR looked green because `e2e-cross-browser.yml` used `continue-on-error: true`.
- **What:** `serviceWorkers: 'block'` in Playwright (WebKit SW bypassed `page.route`); CORS-aware Ollama mocks + `127.0.0.1` refresh; remove `continue-on-error`; `crossBrowserAdvisory: false`; update backlog/AGENTS/rules/drift check.
- **Impact:** Cross-browser failures fail the PR/`main` check — same visibility as Chromium E2E. Merged as **#207**.

## 2026-08-03 — PR8 E2E shared network fixtures

- **Why:** Agent-flow / Journal Hub duplicated PubMed/Gemini/arXiv mocks; consolidate after #207 Ollama helpers.
- **What:** `src/test/e2e/fixtures/{networkMocks,pubmedArticle}.ts`; refactor agent-flow + journal-hub to import shared mocks.
- **Next:** PR9 eval → PR10 docs → PR11 CI governance.
