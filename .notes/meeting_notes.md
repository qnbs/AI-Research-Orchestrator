# 2026-08-01 — Autonomous continuation (post v0.4.0)

## Landed

- **#119** openai 6→7.2 (Dependabot #98 closed as superseded).
- **#120** HelpView i18n Wave 8 (EN+DE `help.*`, catalog split under 700 lines, FAQ accuracy fixes).
- **#118** WS-E focus rings: `.focus-ring-aa`, ESLint guard, Playwright keyboard-focus.
- **#122** WS-F skip-to-content + `#main-content` landmark + 44×44 touch targets (merged).
- **#123** Chrome i18n shell: Header/Welcome/OrchestratorDashboard/ConfirmationModal/FeatureErrorBoundary → `chromeTranslations.ts` + ratchet.
- **#124** WS-G dialog a11y: Escape + scroll lock via `useFocusTrap` (merged).
- **WS-H1 (this branch / #125):** QuickAdd / History / preset modal EN+DE via `modalTranslations.ts` + ratchet.

## Still open

- Issues **#74 / #78** closed on GitHub.
- UIUX **WS-H1 onward** — next reconstructed candidate: modal/chrome i18n (QuickAddModal, InputForm preset, Settings Modal close labels) or form-label association pass.
- Larger i18n backlog still outside ratchet: CommandPalette, InputForm, SettingsSubComponents, ReportDisplay, ResearchView, etc.

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
- **WS-G (2026-08-01):** dialog a11y — Escape + scroll lock via `useFocusTrap` options; Confirmation/QuickAdd/Settings/Preset modals. Next: **WS-H1** (modal/chrome i18n wave) then WS-H2/WS-I.
- Full original WS-H→WS-I prompt still not in-repo — proceed from meeting-note summaries / prior session compaction unless user re-shares `PROMPT-ARO-HARDENING-UIUX`.

## Merged this session (chronological)

- **2026-08-01 — PR #109 (#95 Tailwind v4 `@theme`).** Native `@theme reference inline` + `@theme` blocks in `src/index.css`; legacy `tailwind.config.js` deleted. Custom utilities (`bg-surface`, `text-text-primary`, `border-border`, `animate-fadeIn`, …) now emit real CSS.
- **2026-08-01 — PR #111 (#96 WS-D follow-ups).** Unquoted `ui-monospace` in `--font-mono`; contrast gate asserts border vs input-bg.
- **2026-08-01 — #78 / #74 (App.tsx decomposition) on branch `cursor/app-tsx-decomposition-aa80`.** `src/App.tsx` reduced from 869 → ~20 lines (providers only). Split into `src/app/useAppLogic.ts` (composer) + domain hooks (`useResearchSession`, `useAppChromeEffects`, `useKbExports`), `AppLayout` / `AppViewRouter` (chrome + routing), plus `getAgentForPhase` / spinners / lazyViews. Vault-reset listener semantics preserved; review pass also fixed empty-stream guard, checkpoint delete error handling, stream abort on history open, spinner a11y, and modal/export i18n.
- **PR #75** — SonarCloud CI workflow validation fix (invalid `secrets.*` in job-level `if:`) + wrong `sonar.organization` key.
- **PR #76** (WS-A) — removed vestigial CDN import map (ADR 0011), new `check-no-cdn-scripts.mjs` gate.
- **PR #77** (WS-B) — self-hosted Workbox (no more CDN `importScripts()`), versioned runtime caches, explicit update flow. Went through **4 review-correction waves** before merging; found and fixed real bugs along the way, notably: reload logic that only reloaded the tab that clicked "Reload" (other open tabs got silently taken over by the new SW while running old JS — fixed by gating reload on "was this tab already controlled at load," not "did this tab click the button"), a cache-prune predicate that would have deleted unrelated same-prefixed caches, a CodeQL missing-origin-check finding, and a self-inflicted syntax error in `copy-workbox.mjs` (a `*/` inside a comment string closed the block comment early — never caught by CI since that script isn't wired into any pipeline).
- **14 Dependabot PRs** (#79–#92) — all triaged and merged. Found two "must move together" bugs Dependabot's per-package PRs don't know about: **react + react-dom** must share the exact same version (one PR bumped only `react`, breaking every test); **codeql-action's `init`/`autobuild`/`analyze`** must all three be pinned to the same version (3 separate Dependabot PRs each bumped only one, breaking CodeQL). Both fixed by consolidating onto one PR and closing the redundant others.
- **PR #93** — deleted `AUDIT.md` and `docs/UI-UX-AUDIT.md`: both rated the codebase unrealistically well (AUDIT.md: "9.5/10, near-uniform 5/5" despite its own listed unfixed security gap; UI-UX-AUDIT.md explicitly claimed "WCAG 2.2 AA compliance" that was empirically false). `docs/I18N-AUDIT.md` was **not** touched — it already self-flags as stale honestly and isn't part of this problem.
- **PR #94** (WS-D) — WCAG 2.2 AA contrast fixes: `--color-border` and `--focus-ring` failed the 3:1 non-text-contrast minimum in **all three themes**; paper-light's 4 semantic badge colors failed 4.5:1 text-contrast. Fixed via a two-layer opaque focus ring, darker/higher-opacity border tokens, darkened paper-light semantic colors, a new `--color-border-subtle` (for genuinely decorative uses WCAG exempts) and `--color-text-placeholder` (85% mix, clears 4.5:1 — an earlier 70%/3:1 draft was corrected on review, since placeholder text gets the same 4.5:1 as any other text, no special exception). New `scripts/check-contrast.mjs` CI gate parses real token values out of `src/index.css` and also asserts FOUC-bootstrap parity with `index.html`.

## Also fixed outside the PR-by-PR flow

- **SonarCloud kept showing red on `main`** even though nothing broke: root cause was that `sonar.projectVersion` was never set on any scan, so its "new code = since previous version" period had no real previous version to diff against, and was resurfacing pre-existing bugs (in files untouched for days) as "new." Fixed in `security.yml` by versioning every scan with `${{ github.sha }}`. This job is still `continue-on-error: true` (advisory phase, not yet promoted to blocking) so it was never actually breaking CI, just noisy/misleading.

## Tracked follow-ups (GitHub issues)

- #95 / #96 closed. #74 / #78 implemented via #110 (close on GitHub if still open).
- Dependabot #98 retargeted to openai 6→7 after #113 landed 4→6 — adopt or document deferral.

## Process notes for next session

- One workstream = one PR; full gate sweep (`typecheck`/`lint`/`build`/relevant gates) before every push; review-correction loop (GraphQL `reviewThreads` **and** paginated review-body text) to quiescence before merge — this discipline held for all of WS-D and caught real bugs each time, don't shortcut it once back to normal budget.
- A "review" (Claude Code Review) job failing in ~10s with `is_error:true`/zero cost/no tool calls is a transient infra hiccup, not a real finding — confirmed repeatedly this session by retrying (`gh run rerun <id> --failed`) and getting a real, several-minutes-long review back. Don't skip retrying it once, but also don't chase it past 2 retries on a pure mechanical dependency-bump PR.
- Local dev machine is RAM-constrained (~3.7GB); `pnpm run test:coverage` and the full Playwright E2E suite are both cloud-first (read CI's result, don't reproduce locally) per this session's own established policy in `CLAUDE.md`.
