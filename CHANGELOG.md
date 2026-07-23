# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Self-hosted Workbox, versioned caches, explicit SW update flow** (`public/sw.js`, ADR 0004 amended, WS-B): `scripts/copy-workbox.mjs` (`pnpm run workbox:copy`) copies the built module files from the `workbox-*` npm packages into `public/workbox-v7.0.0/`, replacing `importScripts('https://storage.googleapis.com/workbox-cdn/...')` — this self-hosting, not the CSP, is what actually closes the CDN-trust gap at SW runtime: a meta-tag CSP (as opposed to one delivered via HTTP response headers) does not govern a service worker's own execution context or its `importScripts()` calls, so dropping `storage.googleapis.com` from CSP `worker-src` here is good hygiene (one fewer unnecessarily broad allowance) rather than the enforcement mechanism. Every runtime cache name now carries a `CACHE_VERSION` suffix, pruned on `activate`. The SW no longer calls `skipWaiting()` unconditionally on install (which could hot-swap fetch handlers under an already-open tab still running the old JS bundle); instead `register-sw.js` detects a waiting worker and a new `UpdateAvailableBanner` (via `useServiceWorkerUpdate`) shows an i18n'd (EN+DE) reload prompt, dispatching a `sw-request-reload` intent event only once the user acts, which `register-sw.js` turns into the actual `SKIP_WAITING` postMessage. `CacheableResponsePlugin` tightened from `statuses: [0, 200]` to `[200]` only on the navigation and PubMed-API routes (no longer caches ambiguous opaque cross-origin responses that might be failures); the Google Fonts _webfonts_ route intentionally retains `[0, 200]`, since Workbox's own recipe pairs it with that specific route (`@font-face` fetches can legitimately come back opaque on success in some browsers, unlike `fetch()`-driven navigation/API calls). New `src/test/sw-integrity.test.ts` gate — demonstrated catching all of the above as regressions against the pre-fix `sw.js`/`register-sw.js` before confirming the fix passes. **Caught by this PR's own E2E run**, not just written speculatively: an early version of the update flow reloaded on _every_ `controllerchange` event, including the one `clientsClaim()` fires on a page's very first, uncontrolled→controlled transition — not only on a genuine update. That caused an unwanted reload on every fresh page load, breaking two real Playwright tests whose assertions raced it. Fixed by having `register-sw.js` (not the React layer) own the actual `postMessage`/`controllerchange` handling; a further review round found the first fix still reloaded only the tab that clicked "Reload" (`clientsClaim()` fires `controllerchange` in _every_ open, already-controlled, same-origin tab, not just the initiating one), leaving other open tabs silently taken over by the new worker while still running the old JS bundle — reload-worthiness is now gated on whether _this_ tab already had a controller when it loaded (true for every tab a genuine update can affect, false only for a page's first-ever, controller-less activation), not on which tab clicked the button. Regression assertions in `sw-integrity.test.ts` confirmed failing against each buggy version before passing the fix — the E2E suite re-run on this same PR is the actual confirmation that the original fix resolves the two tests it broke.
- `scripts/check-no-cdn-scripts.mjs` + `pnpm run check:no-cdn-scripts` CI gate (`.github/workflows/deploy.yml`'s build job): fails if `dist/index.html` ever references a JS/CSS host outside an explicit allowlist (`fonts.googleapis.com`/`fonts.gstatic.com`) or reintroduces a `<script type="importmap">` — guards ADR 0011 below as a permanent regression check, not a one-time cleanup.
- CI: automated Claude Code review on every PR (`.github/workflows/claude-code-review.yml`) alongside CodeRabbit, plus an on-demand `@claude` mention assistant (`.github/workflows/claude.yml`), both via `anthropics/claude-code-action@v1`.
- E2E tests (`smoke.spec.ts`, `agent-flow.spec.ts`) now run in CI on every push/PR to `main` via `.github/workflows/e2e.yml`. Non-blocking (`continue-on-error: true`) until proven stable on GitHub's runners — see `docs/e2e-ci-backlog.md` for the promotion trigger and the two specs still deferred (`provider-flow.spec.ts`, `journal-hub.spec.ts`).
- **Non-AI Programmatic Research Engine consolidation** (#67): `src/services/nonAi/` and `src/services/heuristics/` merged into one canonical deterministic engine (ADR 0009), wired into Settings as a first-class no-API-key path — previously shelved/unwired (see the 0.3.0 entry below). Ported in every capability `heuristics/` had that `nonAi/` lacked or did worse: a curated journal knowledge base, 13 missing curated MeSH query-expansion terms, the offline/empty-result demo-corpus fallback, incremental synthesis-chunk streaming, a single-abstract TL;DR function, the report chat-session factory (a hard compile-time dependency `nonAi` had no equivalent for at all), and a more precise bigram author-title fingerprint. `src/services/heuristics/**` deleted in full afterward.
- i18n: new non-React `translateSync()` / `resolveTranslation()` path (`src/i18n/translate.ts`) so plain service modules with no React/hook access (`src/services/nonAi/*`, `src/lib/errors.ts`) can produce localized strings — foundation for an in-progress, full app-wide i18n migration (#69).
- `scripts/check-i18n-ratchet.mjs` + `pnpm run i18n:ratchet` CI step (#69): a regression guard that fails CI if a hardcoded string creeps back into a file already migrated to `t()`/`translateSync()`.
- **SonarQube Cloud CI-based analysis** (`.github/workflows/security.yml` job `sonarcloud`, `sonar-project.properties`): replaces the GitHub App's zero-config Automatic Analysis with an explicit, non-blocking (`continue-on-error: true`) CI scan, coverage import via `lcov` (`vitest.config.ts`), and free-tier-compatible scope tuning (coverage limited to `store`/`services`/`hooks`/`lib`; CPD exclusions for intentionally repetitive i18n/data/script files) so the built-in "Sonar way" gate — the only gate available without a paid plan — stays passable. Verified working end-to-end on a live PR (#75): real `SonarCloud Code Analysis` check, `sonarqubecloud[bot]` "Quality Gate passed" comment, no Automatic Analysis conflict.

### Changed

- `eslint-plugin-react-hooks` upgraded to v7.1.1 (#62).
- **No-`any` / zero-warnings ESLint policy completed** across two PRs (#64, #65): eliminated all `no-explicit-any`, `no-unused-vars`, `no-unescaped-entities`, and `display-name` findings, all `react-hooks/exhaustive-deps` warnings, and all `jsx-a11y` warnings. Lint is now **0 errors / 0 warnings**, down from 176 warnings against the existing 650-warning budget (the budget itself and the `jsx-a11y` severity downgrade block in `eslint.config.js` are not yet tightened to match — tracked as a residual gap in `AUDIT.md`).
- **Migrated to Vite 8 + `@vitejs/plugin-react` 6** (#66) — a bundler-architecture change (esbuild/Rollup → Rolldown/Oxc), handled as a dedicated migration rather than a routine version bump.
- `useTranslation.ts` refactored to delegate its lookup/interpolation logic to the new framework-free `resolveTranslation()` core shared with `translateSync()` (#69) — pure extraction, no behavior or signature change.

### Fixed

- **The SonarCloud CI-analysis switch above broke the entire `security.yml` workflow**, not just the new job, when it landed directly on `main` outside the normal PR process: `if: ${{ secrets.SONAR_TOKEN != '' }}` at job level references the `secrets` context, which is invalid there (only `github`/`inputs`/`needs`/`vars` are — confirmed with `actionlint`). Every run since failed pure workflow validation before any job could even start, silently disabling CodeQL, Dependency Review, `pnpm audit`, and gitleaks on `main` and every PR branched from it. Fixed by moving the presence check into a step, consumed by step-level `if:`. Also fixed `sonar.organization=qnbs`, which was wrong (confirmed via SonarCloud's public API the real key is `qnbs-1`) and would have made every scan fail with "project not found" once the job above could actually run. `actionlint` now passes clean across every workflow file in the repo (#75).
- **Claude Code Review CI job failed on every real PR run** (`.github/workflows/claude-code-review.yml`, #72): `--allowedTools` only auto-approves tools already in Claude's default toolset — tools left off the list still exist but fall through to the interactive permission system, which auto-denies in this headless CI run since there's no human to prompt. The job's `--allowedTools` granted only the comment-posting tools, so every `Read`/`Grep` call the reviewer needed to actually inspect the diffed files was denied (confirmed live: `is_error: true`, `permission_denials_count: 7`). Added `Read,Grep,Glob` to the allowlist. `.github/workflows/claude.yml` (the on-demand `@claude` mention workflow) has the same gap — no `--allowedTools` at all — but is untouched here since it also holds `contents: write` and needs a live-tested allowlist of its own rather than a speculative copy-paste; tracked as a known gap below.
- Settings persistence corruption on boot, plus 2 previously-failing E2E tests (demo-seeded Knowledge Base empty-state assertion; a German/English button-text selector mismatch) (#63).
- **All 11 open GitHub CodeQL code-scanning alerts** (#67): unanchored host/URL substring checks in `public/sw.js`, `geminiService.ts`, and a test mock (e.g. `.includes('ncbi.nlm.nih.gov')` also matching a malicious host containing that substring anywhere); incomplete HTML-tag-stripping and BibTeX-escaping in `exportService.ts`. Confirmed 0 results on the final scan.
- Several real correctness bugs surfaced during the nonAi/heuristics consolidation review loop (#67): a keyword-stemming bug that displayed stemmed fragments ("hyperten", "diabet") as user-facing keyword chips instead of real words; a silently-inert publication-type ranking boost (curation never classified `articleType` for real articles, so `ranker.ts`'s own quality boost never fired); short MeSH/journal-suggestion abbreviations (`ai`, `mi`, `ad`, `pd`, `rct`, ...) matched via plain substring instead of whole-word, so e.g. "pain management" incorrectly triggered AI-journal suggestions and "gut microbiome" incorrectly added the Myocardial Infarction MeSH term; a chat-response priority bug where a weak synthesis-text overlap could outrank a much stronger, more specific grounded answer; missing abort-propagation in two of the engine's retrieval stages (a cancelled run could continue processing instead of stopping immediately); dropped user-selected date-range/article-type query filters and an ignored synthesis article-count limit in the engine's research-report stream.
- `AppError.toUserMessage()` now routes through the new i18n `translateSync()` path instead of a hardcoded English switch (#69) — no visible behavior change yet (the app is still English-only pending the broader migration), but removes the last hardcoded-string blocker on that shared error-display funnel.

### Security

- **API-key vault master key is now non-extractable** (`src/services/apiKeyService.ts`): the AES-GCM master key is generated with `extractable: false` and the `CryptoKey` object itself — never raw exported bytes — is persisted via IndexedDB's structured-clone support. `crypto.subtle.exportKey` is no longer called anywhere in the file, so no JavaScript (including this app's own) can read the raw key material; only `crypto.subtle` can use it. Closes the `extractable: true` gap tracked since 0.3.0. No migration path from the pre-hardening format: if a stored value isn't a `CryptoKey`, the whole vault resets and regenerates on next use (zero production users; a user upgrading from an older build re-enters their provider keys once). See ADR 0003 (amended) and `SECURITY.md`.
- **Fixed a key-generation race found by the new automated Claude Code Review** (#72): `getOrCreateEncryptionKey()` had no synchronization, so concurrent callers within a tab (e.g. `ApiKeySettings.tsx`'s mount-time `Promise.all([hasProviderApiKey(...), getNcbiApiKey()])`) could each independently detect a pre-hardening vault, reset it, and generate a _different_ replacement key — the last write silently orphaning whatever the other call had just encrypted. Now memoized as a single in-flight promise so every concurrent (and later) caller **within that tab** converges on the same key; a narrower cross-tab variant of the same race remains and is tracked as a residual gap in ADR 0003/`SECURITY.md`. The vault-reset path also now surfaces a user-facing notification (previously only a `console.warn`) so an upgrading user knows their provider keys need re-entry instead of finding them silently missing — this notification is buffered if a reset fires before `App.tsx`'s own effect has registered a listener (a real ordering issue: `Header` → `InferenceModeBadge` → `useInferenceMode`'s mount effect can reach the reset path first, since React fires child effects before parent effects), so it isn't silently dropped by component mount order. It's also now durably marked in the same IndexedDB transaction as the clear (not just inferred from what one call happened to observe), so an interruption between the clear and the replacement key being generated/saved (a crash, or a transient `generateKey` failure followed by a successful retry) can't leave the vault already reset with no record that it happened — a later call would otherwise see an empty store indistinguishable from a fresh install and silently skip the notification.
- **Removed the CDN import map** (`index.html`, ADR 0011): `<script type="importmap">` mapped ~13 packages (React, Redux, `@google/genai`, `dexie`, `marked`, `dompurify`, `jspdf`, ...) to `https://aistudiocdn.com/...`, a leftover from this app's AI-Studio-scaffolded origin. Verified empirically before removal that it was already fully vestigial: Vite bundles every one of those packages locally (confirmed zero `aistudiocdn` references in any built JS chunk), so the import map was never actually consulted by the browser — pure attack surface (a CSP-trusted host, a `preconnect`, live network egress capability) with no functional purpose. `aistudiocdn.com` removed from CSP `script-src`/`connect-src`; the now-fully-dead `public/sw.js` "CDN Libraries" cache route removed too (it also referenced `cdn.tailwindcss.com`, equally vestigial — Tailwind is a build-time dependency here, never CDN-loaded). `scripts/patch-csp-hashes.mjs` now hashes only the inline JSON-LD script and fails loudly on any other unrecognized inline `<script>`.

### Docs

- ADR 0009 (Consolidated Non-AI Programmatic Research Engine) accepted; ADR 0010 (First-Class OpenRouter Provider with Free-Model Primacy) proposed (#67).
- **Docs housekeeping** (#68): 6 fully-superseded audit reports deleted (`ARCHITECTURE-REVIEW.md`, `AUDIT-EXECUTIVE-SUMMARY.md`, `CODEBASE-AUDIT-COMPLETE.md`, `E2E-TEST-ANALYSIS.md`, `E2E-TEST-FIXES.md`, `IMPLEMENTATION-QUICKREF.md`); `UI-UX-AUDIT.md` and `HARDCODED-STRINGS-REMAINING.md` re-validated and corrected in place; `I18N-AUDIT.md` flagged stale pending the i18n migration's closing wave; root `AUDIT.md` fully re-derived from current gate output rather than carried forward (corrects the false "nonAi shelved" and "version parity restored" claims from the 0.3.0-era audit).

### Known gaps (tracked, not yet closed — see `AUDIT.md`)

- Version/tag/CHANGELOG drift: `package.json` says `0.3.0`, no matching `v0.3.0` git tag exists. A real version bump, tag, and GitHub release are tracked as separate follow-up work, done only once this `[Unreleased]` section is itself accurate.
- `jsx-a11y` severity downgrade and the 650-warning lint budget in `eslint.config.js` (predate the zero-warnings policy pass, not yet tightened to match it).
- `.github/workflows/claude.yml`'s on-demand `@claude` mention job has no `--allowedTools` at all, so every tool call likely falls through to a denied permission decision in headless mode the same way the review job's did before this pass's fix — not yet live-tested since no `@claude` mention has triggered it this session.
- `src/App.tsx` is 858 lines, well past the project's own 700-line hard max for `src/**/*.{ts,tsx}` files (already 842 lines / pre-existing before #72 added ~16). Needs the same `FeatureView.tsx` + `FeatureViewContext.tsx` + `useFeatureLogic.ts` split already used for the Authors/Journals/Knowledge-Base views — a substantial, standalone refactor out of scope for any single feature/fix PR.

## [0.3.0] - 2026-07-21

### Added

- **Multi-provider AI architecture** (`src/services/providers/`): pluggable adapters for Google Gemini, OpenAI, Anthropic, local Ollama, and the deterministic heuristic layer (ADR 0008).
- `Settings.ai.provider` + `customBaseUrl` with migration defaulting to Gemini.
- Per-provider encrypted API key storage in `apiKeyService.ts` (legacy Gemini key migrates automatically).
- Provider-aware `InferenceMode` resolver and badge label.
- OpenAI-compatible `baseURL` supports OpenRouter endpoints.
- Generalized `PROVIDER_*` error codes in `src/lib/errors.ts` (`GEMINI_*` retained as aliases).
- Unit tests for provider factory and all transport adapters.
- **Non-AI Programmatic Research Engine foundation** (`src/services/nonAi/`): deterministic query building, PubMed/arXiv retrieval, lexical ranking, curation, keyword extraction, author clustering, journal profiling, and template-based synthesis/chat — a no-API-key path (literature retrieval still requires network access; no AI vendor call is made). **Foundation module only**: not wired into the provider registry, Settings, or any UI path as of this release, and explicitly shelved rather than integrated (see `AUDIT.md` for the disposition and what a future integration pass would need).

### Fixed

- `pnpm audit --audit-level=high` now passes clean (5 → 0 vulnerabilities): `protobufjs` bumped to 7.6.5 (closes two advisories), two independent `brace-expansion` version lines patched via scoped overrides, `uuid` bumped to 11.1.1 (`@lhci/cli` dependency chain).
- README's Technology Stack table corrected: `Chart.js` → `Recharts` (EN + DE), matching the ADR 0005 consolidation that had already happened in code.

### Changed

- `geminiService.ts` is now a feature façade over `getProviderForSettings()`; all exported symbols preserved.
- SDK-backed providers are lazy-loaded via dynamic `import()` to keep the initial bundle size unchanged.
- CSP `connect-src` widened for OpenAI, OpenRouter, Anthropic, and `localhost:11434`.
- **UI/UX modernization (Research Instrument):** teal–slate design tokens for dark/light/matrix; status colors (`danger`/`success`/`warning`/`info`); Figtree + Sora + JetBrains Mono typography; FOUC theme sync; reduced neon/purple glow; `prefers-reduced-motion`; shared `UiButton`/`UiBadge`; accessible `Toggle`; theme-aware banners/badges; Matrix in Settings; softer elevation and restrained motion.
- CI: `github/codeql-action` init/autobuild/analyze bumped together to v4.37.1 — the three must move as one unit or CodeQL fails on a config-version mismatch between steps.

## [0.2.1] - 2026-07-17

### Added

- **Heuristic inference layer** (`src/services/heuristics/`): offline / no-API-key path for orchestrator, TL;DR, similar articles, research analysis, author disambiguation & profiles, journal profiles, single-article analysis, and report-grounded chat (ADR 0007).
- `InferenceMode` resolver (`live` | `heuristic`) from API key, `navigator.onLine`, and Settings → **Force Heuristic Mode**.
- `InferenceModeBadge` in the header; i18n tooltips (EN/DE); cost card shows **$0 · Heuristic mode** when applicable.
- First-run **demo Knowledge Base** seed (`demo-` entries) + dismissible `DemoDataBanner`.
- Offline heuristic eval harness (`src/lib/heuristicEval.ts`) and Playwright coverage for no-key orchestrator runs.
- Hook `useInferenceMode()` for UI consumers.
- Offline banner when `navigator.onLine` is false (Dexie-backed reports remain readable; heuristic path continues).
- i18n EN/DE parity unit tests + typed `TranslationKey` on `useTranslation`.
- External `public/register-sw.js` (CSP-friendly SW registration).
- Post-build `scripts/patch-csp-hashes.mjs` so CSP SHA-256 hashes match Vite-emitted `dist/index.html`.

### Changed

- `geminiService` is mode-aware: never throws `NO_API_KEY` when heuristic mode is active; live Gemini remains the high-fidelity path.
- Offline banner copy reframed positively around heuristic capability.
- CSP: drop `script-src 'unsafe-inline'`; pin JSON-LD + importmap via SHA-256 hashes; allow `aistudiocdn.com` / Workbox CDN workers.
- `pnpm run build` runs CSP hash patch after Vite.
- Service worker lives at `public/sw.js` (Vite → `dist/`); base path derived from worker URL (dev `/` vs GH Pages subpath).
- Service worker precache expands to PWA icons + register script; required shell URLs fail install on error (ADR 0004).
- Importmap: remove unused Chart.js CDN entries (Recharts-only).
- Package version **0.2.1**.

### Fixed

- Production SW registration no longer 404s (`sw.js` was outside `public/` and missing from `dist/`).

### Docs

- ADR 0007 (heuristic inference); AUDIT / README / AGENTS updates for progressive enhancement.

## [0.2.0] - 2026-07-16

### Added

- Soft checkpoint **resume UX** (`CheckpointResumeBanner`): restore partial report, re-run from start, or discard (P0-10).
- Settings **cost estimator** card (`CostEstimateCard`) with i18n pre-flight toast copy (P0-11).
- Agent Debugger modular split under `src/components/agentDebugger/`.
- Bundle visualizer (`pnpm run analyze`) + CI **bundle budget** gate (`pnpm run bundle:budget`).
- Playwright a11y: `@axe-core/playwright` critical/serious check on `#root` (P1-5).
- Lighthouse CI (`lighthouserc.json`, `pnpm run test:lighthouse`) — a11y/best-practices/seo ≥95.
- Prompt versioning registry (`src/lib/promptRegistry.ts`) + offline agent eval harness (`src/lib/agentEval.ts`).
- ADRs 0005 (Recharts-only charts) and 0006 (prompt versioning).
- JSDoc on public Dexie helpers, export entrypoints, `useChat`, `useResearchAssistant`, orchestrator stream.
- Resilience layer, research checkpoints, optional NCBI API key, security workflows, CodeRabbit gate (Phase 0 carry-forward into this release).

### Changed

- Chart stack consolidated to **Recharts only** (removed Chart.js / react-chartjs-2).
- Vitest coverage thresholds raised to **80%** lines/statements.
- CSP `connect-src` narrowed to Gemini, NCBI E-utilities, arXiv, and aistudiocdn (plus blob/data).
- Package version **0.2.0**.

### Fixed

- Knowledge Base Redux: `deleteKbEntries.fulfilled` removes entities via `removeMany`.
- PubMed `pubYear` only kept when a valid 4-digit year is present.
- Gitleaks false positive on Gemini-shaped test fixtures.

## [0.1.1] - 2026-05-02

### Added

- ESLint 9 (flat config) + Prettier + Husky + lint-staged; `pnpm run lint` / `pnpm run format`
- Unit tests for PubMed, arXiv, CSV formula sanitization, Redux slices, Dexie settings round-trip, `useTranslation`, `useUI`, install-prompt store
- Vitest coverage thresholds on logic layers (`store/`, `services/`, `hooks/`, `lib/`) — see `vitest.config.ts`
- PWA PNG icons (`public/icons/icon-192.png`, `icon-512.png`) via `pnpm run icons`
- Baseline `Content-Security-Policy` meta in `index.html`
- `.npmrc` with `legacy-peer-deps=true` for consistent installs with the ESLint toolchain

### Changed

- **State management**: Removed `UIProvider`; `useUI` reads/writes Redux only; PWA install prompt uses `installPromptStore` + `useSyncExternalStore`. Settings hydrate via `SettingsHydrator` with merge from `store.getState()`.
- **Gemini streaming**: `generateResearchReportStream(..., signal?)`; `geminiApiSlice` aborts on cache entry removal; orchestrator uses `AbortController` + generation id.
- **CSV export**: `sanitizeCsvFormulaInjection` mitigates spreadsheet formula injection.
- CI runs `pnpm run lint` and `pnpm run test:coverage` before production build.

### Fixed

- `geminiApiSlice`: `AbortController` ran only after `cacheEntryRemoved`, too late to stop in-flight Gemini consumption.

## [0.1.0] - 2026-04-14

### Added

- Multi-agent orchestration pipeline (Query Formulation, Live Retrieval, Semantic Ranking, Synthesis)
- PubMed NCBI E-utilities integration with exponential backoff
- arXiv search as supplementary source
- Google Gemini 2.5 Flash + Gemini 3 Pro integration via `@google/genai` SDK
- Streaming responses via AsyncGenerator for real-time report generation
- Intelligent Knowledge Base with deduplication engine and semantic filtering
- Rapid Research Assistant with TL;DR summaries and similar article discovery
- Scientometric Hubs for Author disambiguation and Journal profiling
- Agent Debugger with live trace visualization and token budget tracking
- Command Palette (`Cmd+K`) for keyboard-driven navigation
- Collections system for organizing research
- PDF, CSV, JSON, RIS, BibTeX export via jsPDF
- API key encryption with Web Crypto AES-GCM stored in IndexedDB
- Cybernetic Glassmorphism design system with Tailwind CSS v4
- Framer Motion animations for agent flows and transitions
- Progressive Web App with Workbox service worker and offline support
- i18n support for English and German
- WCAG 2.2 AA accessibility with ARIA roles and keyboard navigation
- Redux Toolkit state management with RTK Query API endpoints
- Dexie.js IndexedDB local-first data storage
- GitHub Pages deployment via GitHub Actions
- DevContainer support for GitHub Codespaces
- Vitest unit tests + Playwright E2E test infrastructure

[Unreleased]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.2.1...HEAD
[0.3.0]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/qnbs/AI-Research-Orchestrator/releases/tag/v0.1.0
