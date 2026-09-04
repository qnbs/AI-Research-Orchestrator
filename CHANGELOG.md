# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Codecov:** `deploy.yml` uploads Vitest `lcov` (Coverage) and `junit.xml` (Test Analytics). Production Build sets `CODECOV_TOKEN` for `@codecov/vite-plugin` Bundle Analysis (never `VITE_*`). Repo config is `codecov.yml`; notes in `docs/codecov.md`. Codecov GitHub checks stay advisory until a `main` baseline exists.
- **Sample-topic onboarding E2E:** `agent-flow` covers the secondary first-run CTA → Orchestrator with the EN `onboarding.sampleTopic` prefill (J1). Shared helper `completeOnboardingWithSampleTopic` retries the click the same way as `skipOnboarding`.

### Changed

- **360px bottom nav (`NOW-P1-MOBILE-360`):** Five mobile items use short visible labels (Review / Assistant / Library / Explore / More) with full destination names in `aria-label` and `title`. Muted Library still exposes Knowledge Base as the accessible name plus the requires-report hint. Drops the 10px font hack and label truncate; the row uses `text-xs` and `overflow-x-hidden`. Playwright covers 360px no-horizontal-scroll plus the five accessible names.
- **PR `edited` no longer retriggers `security.yml`:** `pull_request` types are `opened` / `synchronize` / `reopened`. Bot and agent PR-body updates were canceling the in-flight `pnpm audit (high+)` via PR concurrency (PR #302).
- **GitHub vs policy merge block:** `docs/pr-merge-gate.md` documents that `reviewDecision: CHANGES_REQUESTED` / `mergeStateStatus: BLOCKED` from a superseded CodeRabbit review is a ruleset artifact while `dismiss_stale_reviews_on_push` is off (`mainrules` 20291814). Policy still uses latest-head (`011` **(a)/(b)/(c)/(d)**). Dismiss if allowed; `--admin` squash is the documented 403 path (PR #301). Maintainer enable is a full-ruleset `PUT` in `docs/ci-branch-governance.md` (partial PUTs wipe other rules; read back `true` before flipping the live fact). The 403 is this repo’s App/Actions installation, not a blanket API restriction. Enable with a fine-grained PAT or App installation that has Administration: write (there is no classic `admin:repo` scope). `check:docs-drift` requires both `mergeStateStatus` and `dismiss_stale`.
- **PR merge gate (dual gate):** Canonical modus operandi is `docs/pr-merge-gate.md`. Merge to `main` requires all required CI checks to be green **and** review quiescence on the same head, including the **arrival wait** (PR #299: do not merge while CodeAnt/Greptile/Copilot are still “Reviewing”). A CodeRabbit **Review rate limited** check is **not** a hard merge blocker (`011` clause **(d)**). Stand-ins remain Sourcery **(b)** or another in-scope bot **(c)** when Sourcery cannot stand in. A `CHANGES_REQUESTED` review on the latest head is never waived. Agent guides (`011`/`013`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`) and `check:docs-drift` (`ci.mergeGatePath`) point at that doc.
- **pnpm audit owner:** required `pnpm audit --audit-level=high` is the `security.yml` job only. `deploy.yml` keeps `check:audit-ignore-paths` and no longer re-runs the registry advisory bulk (that duplicate timed out independently of the required audit job). `security.yml` still retries the audit up to three times on transient error 23.
- **pnpm audit retry:** `security.yml` retries `pnpm audit --audit-level=high` up to three times so an npm advisory-bulk timeout (error 23) does not fail the required check.
- **Docs-drift merge-gate checks:** `check:docs-drift` now requires arrival wait, latest-head, body-only, and disposition language in `docs/pr-merge-gate.md`. `workflowJobHasContinueOnError` matches the `jobs.e2e` **job-level** `continue-on-error` only (step-level flags are ignored; self-test covers that). `--csp-endpoint` is CSP-only and no longer runs the full docs-drift suite. Fact inventory lives in `scripts/lib/docsDriftFacts.mjs` so `checkProjectFacts` / `main` stay under CodeScene “Bumpy Road” limits.
- **Cursor rules English + stack truth:** Remaining `.mdc` bodies (`000`, `001`, `100`, `101`, `200`, `300`, `800`, `850`) are English. `100` is the multi-provider façade (not Gemini-only / not TanStack Query). `101` pins Dexie v7 + ADR 0016/0018/0021. `300` uses split `*Translations.ts` and forbids `lucide-react` / Chart.js. `000` catalogs the numbered rules. `010` records the 2026-09-03 rule-language migration.
- **Desktop header density:** Literature review chrome is a single row from `md` up (brand + inference + primary nav + tools). The view title stays an `sr-only` `h1`. Search/Quick Add labels appear from `xl`. Mobile header is unchanged.
- **GitHub topics (`NOW-P2-TOPICS`):** Intended topic set drops `multi-agent-systems` (no real multi-agent graph; sequential pipeline). Canonical names live in `docs/project-facts.json` `githubTopics`. Applying the PUT requires a token with Administration (the GitHub App integration returns 403). Until a maintainer applies the payload, the live repo may still list that topic.
- **Audit docs (2026-09-03 closeout):** Live `main` after #294/#296/#297 is `0b9c599`. Ticket table marks the journey wave Done; `NOW-P2-OPENROUTER` stays deferred.
- **DOMPurify 3.4.13 (Dependabot #295):** Patch `^3.4.12` → `^3.4.13`. Upstream fixes hook removal during `IN_PLACE` sanitization, a hook clone-guard bypass, and `ownerDocument` clobbering during `IN_PLACE`. App call sites stay `sanitize` / `RETURN_DOM_FRAGMENT` (no `IN_PLACE`, no custom hooks).
- **First-run journey (`NOW-P0-JOURNEY-01` / `02` / `03`):** Onboarding keeps “Start Researching”, adds a heuristic sample-topic path, language/theme controls, and an honest no-key preview. Completing onboarding lands on Literature review (`orchestrator`). Visible labels: **Literature review** vs **Quick research**. Home is a two-column launchpad (hero review + quick look + status strip), not a four-card lobby.
- **Orchestrator form (`NOW-P0-FORM-01`):** Topic, sample chips, and submit stay above the fold. Date range, article types, sources, scan caps, and demo sit in a collapsed “Review options” `<details>`; preset controls remain in the form header (open state in `sessionStorage` only).
- **Empty states and chrome (`NOW-P0-EMPTY-01`, `NOW-P1-CHROME-01` / `02`):** KB / Dashboard / History remain reachable when empty and teach the next step. Header primary nav is Literature review, Quick research, Knowledge Base, Authors, Journals; overflow holds Collections / Dashboard / History. Mobile bottom nav is five items (Review, Assistant/Quick research, Library, Explore, More). Brand lockup uses `t('app.name')`.
- **Provider status (`NOW-P1-SETTINGS-01`):** Orchestrator and Quick research show a compact heuristic/live line with a Settings link. Heuristic is labeled as active, not broken.
- **Export façade (`NOW-P1-FILE-CAP` / `NOW-P2-EXPORT-SPLIT`):** `exportService.ts` stays the public import. PDF writers live in `exportPdf.ts`, CSV in `exportCsv.ts`, HTML-strip helpers in `exportText.ts`. Coverage floors aggregate those files with `reportExportProvenance`.
- **Sourcery residuals (`NOW-P1-SOURCERY-RESIDUAL`):** Settings/KB sidebars share `STICKY_BELOW_CHROME_CLASS` (`md:sticky`, chrome-height-aware `top`). Orchestrator generate-phase cancel uses `LoadingIndicator`’s caller-labeled control; the standalone cancel stays for streaming after the indicator unmounts.
- **index.html product truth:** Meta/OG descriptions no longer say “Gemini agents”. `check:docs-drift` gates `index.html`.
- **Audit docs truth (2026-09-02):** Live `main` after #290/#291/#292 is `b48c4d3`. The 2026-09-02 prompt is **executed** (closeout `docs/audits/2026-09-02-closeout.md`). Evidence record is `docs/audits/2026-09-02-baseline.md` (addenda) plus that closeout. ADR 0010 dated deferral, façade split, and remaining chart a11y **shipped in #290**. Export split / Sourcery 002/004/005 **shipped in #292**. Heuristic + Ollama remain the zero-cost paths; OpenRouter stays `openai` + custom base URL. GitHub description + homepage URL no longer overclaim a swarm (`NOW-P1-REPO-DESCRIPTION` resolved).
- **Onboarding product-truth (`NOW-P1-LIVE-COPY`):** Welcome highlight is `AI Research Orchestrator` (not “Future of Research”). Step copy describes the client-only pipeline (PubMed retrieval, optional arXiv, then rank and cited synthesis) and live vs heuristic inference. Empty-state / Help / input-form strings no longer claim that “AI agents conduct” the review. Privacy footer unchanged. `metadata.json` drops “swarm of specialized AI agents”. `check:docs-drift` gates those phrases in product-copy files.
- **TypeScript 6 (`NOW-P1-TS6` / #289):** Dev compiler `~6.0.3`. Workspace `peerDependencyRules.allowedVersions.typescript` updated from `5.8.3`. `tsconfig.json` already had `strict: true` and explicit ES2022/`bundler` settings, so no compiler-option ADR. `typescript-eslint` 8.69 peer range is `>=4.8.4 <6.1.0`. Not TypeScript 7.
- **Audit docs truth (2026-09-01):** `docs/audits/2026-09-01-baseline.md` pins Phase 0 live `main` at `8a76bda` (`v0.4.2`). The 2026-08-03 backlog header no longer lists landed P0/P1s as Open. `ISSUE-P1-CI-001` is **Resolved** (CODEOWNERS #265). Execution prompt is `docs/prompts/2026-09-01-cursor-grok-audit-remediation-master-prompt.md`. Unmerged docs PR #273 is folded there.
- **Dependabot wave 2 (2026-08-31, `NOW-P1-DEP-WAVE-2`):** Same-major/patch npm bumps (`dexie` 4.4.5, `typescript-eslint` ^8.68, `sharp` 0.35.4, `@axe-core/playwright` 4.13.0, `@vitejs/plugin-react` 6.1.1, `@eslint/js` 9.39.5, `rollup-plugin-visualizer` 7.1.1) plus `jsdom` 30 / `@types/jsdom` 30 (dev-only major, unit tests green) and `anthropics/claude-code-action` 1.0.210 (commit SHA `a874e9e`). Unused `lucide-react` **removed** instead of bumping #284. TypeScript 6 (#274) landed as #289.

### Added

- **AI façade split (`NOW-P2-FACADE`):** `geminiService.ts` remains the public ADR 0008 façade. JSON helpers live in `aiJson.ts`, the live orchestrator in `liveResearchReportStream.ts`, author/journal tools in `literatureAiTools.ts`. `check:coverage-floors` aggregates those four files at the existing geminiService ratchet.
- **Chart accessible tables (`NOW-P2-CHART-A11Y`):** Report publication timeline, author profile timeline, journal activity timeline, and scientometric scatter/bar charts each have a screen-reader `ChartAccessibleTable`. Scientometric Hub uses dedicated `scientometrics.a11y.*` keys (BACKLOG-P2-006).
- **CODEOWNERS (`NOW-P1-CODEOWNERS`):** `.github/CODEOWNERS` routes critical paths (`src/services`, `src/lib`, workflows, `public/sw.js`, security/governance docs) to `@qnbs`. The `mainrules` ruleset still does **not** require Code Owner reviews (solo-maintainer; do not flip that setting here).
- **Dexie upgrade transaction tests (ISSUE-P1-PERSIST-001):** `fake-indexeddb` opens schema v2 / v4 / v6, then the production v7 instance upgrades in-place. Assertions cover `articleId` hydration, demo quarantine stamps, ADR 0018 trust terminology, checkpoint reports, sibling-table survival, and poison-record skip (one bad row must not drop the rest). `databaseService` coverage floors ratchet to 90/92/88/95.
- **Adversarial agent-eval fixtures (ISSUE-P1-EVAL-001):** `check:agent-eval` now includes German support/stopwords/negation, umlaut/compound/inflection overlap, `keine` negation, mixed support+contradict citations, same-unit numeric and dose drift plus grouped-thousands/`28%` vs `30%` tolerance, prompt-injection titles, `wrapUntrustedTextBlock` delimiter framing, and malformed JSON blocking so matcher 2.3.0 regressions fail the eval gate.
- **Provider conformance harness (ISSUE-P1-PROVIDER-001):** Shared contract suite drives Ollama, OpenAI, and Anthropic `generateContent` against a local fake HTTP server (HTTP 200, 429, 5xx, malformed body, caller abort). Heuristic stays a no-network control. SDK `APIUserAbortError` is treated as a non-retryable abort, same as `AbortError`.
- **Typed heuristic operations (ISSUE-P1-HEURISTIC-001):** `HeuristicOperation` (`tldr` / `related-online` / `analysis` / `synthesis` / `fallback`) is the only dispatch key on the heuristic adapter. Prompt substrings no longer select a path. Capabilities match the local engine: no JSON schema, no live web grounding, abort honored; `AI_PROVIDERS.heuristic` and `createHeuristicProvider()` share `heuristicProviderCapabilities()`.
- **Heuristic BM25+ IDF and relative ranks (ISSUE-P1-HEURISTIC-002):** `inverseDocumentFrequency` uses Lucene BM25+ `ln(1+(N−df+0.5)/(df+0.5))` so a term in every document no longer yields a negative IDF. Ranker min-maxes the mixed raw score within the current result set. Chat, Help glossary, and KB bands label 0–100 as a display/relative scale (bands at 85/70/50, not 0–1 fractions).

### Fixed

- **Copilot follow-up after #294:** Bottom-nav More stays mounted. The sheet is open only while `openedFor === currentView`; a destination change clears `openedFor` so returning to that view does not reopen it. If the sheet unmounts under keyboard focus, focus returns to the More trigger. Ollama status ignores leftover cloud-provider default models. Hydration uses the selected provider’s `defaultModel` when the stored model is foreign.
- **PR #294 review a11y:** Overflow/More disclosures expose `aria-expanded` / `aria-controls` and close on Escape. Muted KB/Dashboard/History controls keep `title` and add a visually hidden `aria-describedby` hint. Cmd/Ctrl+Enter submits through the form so an empty topic cannot start a run. Workload `topN` errors stay visible (and `role="alert"`) when Review options are collapsed. Empty-state and provider-status links use the dirty-settings navigation guard. Bottom-nav More closes on Escape, outside click, view change, and primary destinations. Whitespace-only topics show a required-topic alert and cannot start a run. Restored form state without `articleTypes` no longer crashes Review options.
- **PDF without TOC still exports the report body:** Synthesis, insights, ranked articles, and queries render even when “Include Table of Contents” is off. Footers use the page index; the first content page gets a header when cover/TOC are off; long article titles wrap before `textWithLink`.
- **CSV quotes carriage returns:** Fields containing a carriage return (`\r`) are quoted so a sanitized `=…` cell that also includes CR cannot split the record and expose a formula.
- **Façade JSON abort/parse (`#290`):** `generateJson` maps caller abort to `STREAM_ABORTED` (no `safeLogError`) and parses outside the provider `mapError` catch so `GEMINI_PARSE_FAILURE` is not remapped. Array-root schemas wrap as `{items:[…]}` for json_object-mode providers (CodeAnt). Empty PubMed / empty query generation throw `AppError` instead of bare `Error`. Literature tools rethrow the original error (no second `mapError`).
- **Partial CSV/insights watermark (`NOW-P1-PARTIAL-EXPORT-GAPS`):** Report CSV and insights CSV insert the same `PARTIAL REPORT — RESEARCH DID NOT FINISH` provenance line used on narrative export as the **first data row after headers** when `completionStatus === 'partial'` (padded to the export column count so importers keep the configured schema). Spreadsheet downloads of a cancelled run are no longer silent. Playwright cancel-mid-stream coverage hangs Gemini synthesis SSE after ranking (`NOW-P0-PARTIAL-E2E`). Live Gemini cancel during synthesis now stays `STREAM_ABORTED` at the `geminiService` façade so the session stamps `'partial'` instead of mapping the abort to `PROVIDER_UNAVAILABLE`.
- **`browserslist` CVEs (`NOW-P0-AUDIT-BROWSERSLIST`):** Workspace override pins `browserslist@4.28.8` (latest patched; security floor is 4.28.7). Covers [CVE-2026-73088](https://github.com/advisories/GHSA-73wf-gq98-2v4g) (`normalizeStats` crash / prototype write, High) and [CVE-2026-73089](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) (unbounded query/parse caches; GitHub Moderate, `pnpm audit` High). Confirmed in 4.28.8 source (`CACHE_MAX_ENTRIES = 500`, `hasOwnProperty` + `Object.create(null)`). Paths are dev-only (`autoprefixer`, `eslint-plugin-react-hooks` → `@babel/core`). Pin, not a GHSA ignore. No newer 4.29+/5.x release exists.

- **CSV/export hardening (ISSUE-P1-SECURITY-001):** Formula-injection sanitizer now treats leading whitespace/BOM, Unicode lookalikes (fullwidth `=`/`+`/`−`/`@`), pipe-DDE, and HTML-risk `<` as spreadsheet-dangerous (tab prefix; apostrophe + `&lt;` for cells that start with `<`). UTF-8 CSV/JSON/citation downloads and PDF downloads are blocked above 8 MiB after `arraybuffer` size validation. JSON history/KB export uses a Blob download (same cap) instead of an uncapped `data:` URI.
- **Ollama stream/body bounds (ISSUE-P1-TRANSPORT-001):** Generate/chat NDJSON streams abort after 30s idle or 8 MiB accumulated body, with a 5-minute wall-clock cap. Non-stream generate uses the same 5-minute wall-clock (not a 15s headers-only budget). Error/non-stream bodies are size-capped incrementally via `body.getReader()` (`text()` / `json()` fallbacks for test doubles); oversized-body error messages keep a 256-character excerpt. HTTP status mapping stays authoritative when an error body is oversized; caller abort while reading an error body stays `STREAM_ABORTED`. Wall-clock timeout is retryable `PROVIDER_UNAVAILABLE`; caller abort stays non-retryable `STREAM_ABORTED`. `combineAbortSignals` returns a disposer that clears the timer (including the timeout-only path), honors an already-aborted caller signal, and stamps `TimeoutError` as the timeout reason. `fetchWithExternalPolicy` keeps the combined signal attached until the caller consumes the body.
- **Provider abort mapping (ISSUE-P1-PROVIDER-001):** OpenAI, Anthropic, and Gemini `mapError` treat Stainless `APIUserAbortError` as a caller abort via `isAbortLikeError` — never retryable — matching DOM `AbortError`. The HTTP conformance harness failed OpenAI/Anthropic abort until this mapping landed.

## [0.4.2] - 2026-08-30

> Post-sprint stabilization: cancelled reports never persist as `done` (ADR 0021 / #260), reduced-motion looping animations (#261), Dependabot consolidation (#263), ADR floor 21 (#262), and the audit-gate pin (#259), plus the Aug 2–29 Unreleased wave on `main`.

### Fixed

- **Cancelled reports never marked `done` (P0 scientific integrity, ADR 0021, #260):** Cancelling a running pipeline (or restoring a checkpoint) with a collected body previously fell through to `reportStatus: 'done'` — identical to a finished run, skipping provenance, claim extraction, and grounded-synthesis assessment. Unified `ReportStatus` now includes `'partial'`; `ResearchReport.completionStatus` / `cancelledAtPhase` / `cancelledAt` survive save, export, and reopen. `useChat` stays gated on `=== 'done'`; `ReportDisplay` shows a non-dismissible banner; exports prepend `PARTIAL REPORT — RESEARCH DID NOT FINISH`. Chat defaults off; save is unavailable while streaming; green corpus-supported chrome is suppressed for `'partial'`; `setReportStatus('partial')` is stamped in the same tick as the report object (before checkpoint persist).
- **Sticky settings action bar mobile overlap (#230 post-merge):** Sticky settings chrome is desktop-only (`md:`) with a `max()` floor so a third fixed element (bottom nav) cannot overlap page content on narrow viewports.
- **Status banners rendering behind the fixed header (#228):** `useElementHeight` measures real chrome height and drives `<main>` padding instead of a static Tailwind breakpoint guess.
- **Navigation gaps and canonical product naming (#229):** Closed keyboard/mobile nav-overflow gaps; unified the product name across UI copy, `manifest.json`, and README; extracted `orchestratorTranslations.ts` / `helpTranslations.ts`.
- **Supply-chain audit gate (#259):** Pin `nanoid@3.3.18` (GHSA-2v37-7h3g-55p8). Ignore unfixable `extract-zip` GHSA-jmr9-qjv8-65gv only on the `@lhci/cli` devDependency path; `scripts/check-audit-ignore-paths.mjs` walks `pnpm why --json` chains and parses quoted YAML GHSA scalars so a global ignore cannot cover production.
- **Claim evidence matcher (post-merge, `CLAIM_EVIDENCE_MATCHER_VERSION` `2.3.0`):** Negation conflict checks all overlapping token occurrences (not only the first), closing a second-occurrence negation gap found in post-merge review of PR #213.
- **Claim evidence matcher (P1 claim integrity):** Conservative deterministic matcher (`claimEvidenceMatcher.ts`) replaces 2-token lexical overlap — stop-word filtering, negation/direction conflict detection, exact evidence spans, `invalidCitations` preserved in metrics, supporting-only PMIDs on claim-supported results. Matcher version stamped on validated claims.
- **Ollama runtime (P1 Local AI):** Split connectivity vs model-discovery caches (5s failure TTL for rapid recovery); generate streams require protocol `done: true` like chat; prompt budgets prefer `/api/show` context length over parameter-count heuristics (`ollamaModelMetadata.ts`).
- **Cross-browser WebKit Ollama health E2E:** Block service workers in Playwright (`serviceWorkers: 'block'`) so WebKit cannot bypass `page.route` for Ollama mocks; CORS-aware fulfills + `127.0.0.1` loopback + forced refresh (`ollamaMocks.ts`). Previously WebKit reported `cors`/`connection refused` while Chromium/Firefox passed, and `continue-on-error` hid the failure on PR checks.
- **E2E Firefox onboarding flake:** `skipOnboarding` always waits for a stable `<header>` after Start Researching (retry click + longer timeout); `agent-flow` uses the shared helper; heuristic suite waits for the orchestrator form before assertions.
- **Synthetic demo quarantine (P0):** Non-AI research no longer silently substitutes the educational demo corpus on empty/failed/offline retrieval. Explicit Educational Demo mode always routes through the Non-AI engine and stamps heuristic provenance (never a live provider); reports stamp `sourceClass` / `corpusClass`, use Demo ID labels, refuse `verified` trust, and watermark exports (ADR 0016, Dexie v6 via tested `demoCorpusMigration` helpers). Empty-retrieval synthesis is preserved on export and via `synthesisChunk` (no mid-stream double-seed). Mixed corpora stay `mixed-retrieved`; provider-partial failures stamp `retrievalOutcome: partial_failure`.
- **Immutable execution provenance (P0 / ADR 0017):** Research runs freeze `ResearchExecutionContext` once at stream start (`executionId`, inference mode/reason, provider, model, release + prompt registry versions). Completion no longer re-calls `resolveActiveInferenceMode`, so mid-run online/key flips cannot rewrite heuristic runs as live.
- **Abort/timeout contract (P0):** `findRelatedOnline`, `generateTldrSummary`, and `startChatWithReport` forward `AbortSignal` into live provider calls; Gemini/Ollama `testConnection` use a 15s timeout like OpenAI/Anthropic; `useChat` and `ArticleDetailPanel` abort in-flight work on cleanup/supersede and suppress abort noise.
- **Stateful cross-provider chat (P0):** OpenAI, Anthropic, and Ollama chat sessions now accumulate completed user/assistant turns so multi-turn report chat keeps context (Gemini already did via the SDK). Ollama chat also forwards the system prompt as a `system` message.
- **Synthesis trust terminology (P0 / ADR 0018):** Renamed overclaiming `verified` wire values to `claim-supported` / `corpus-supported`. Readers accept legacy `verified`; Dexie v7 rewrites persisted report JSON; UI/README/import copy match lexical corpus-support (not a bibliographic audit).

### Changed

- **Dependabot consolidation (2026-08-29):** Same-major npm bumps (`marked`, `recharts`, `@tanstack/react-virtual`, `terser`, `globals`, `lint-staged`, `@types/react`, `@types/node`, `@playwright/test`) plus Actions pins (`pnpm/action-setup` 6.0.10, `github/codeql-action` 4.37.9 as a unit, `anthropics/claude-code-action` 1.0.206). Unused `lucide-react` bump (#248) skipped.
- **Docs / ADR floor 21:** Agent entrypoints (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/index.mdc`) and `docs/project-facts.json` `adr.minNumberedRecords` track ADR [0021](docs/adr/0021-partial-report-completion-state.md); README EN/DE document cancel + `'partial'` honesty.
- **Docs / metadata accuracy (PR11):** Synced agent entrypoints (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/index.mdc`) to multi-provider + ADR 0001–0020 + blocking cross-browser + DeepSource AI Review + PR-only concurrency; README EN/DE CI sections; `package.json` description; DeepSource setup AI Review gate; audit/prompt supersession banners; Help dead `HELP_VERSION` removed (About uses `formatReleaseLabel()`); ADR floor 20 in `project-facts.json`.
- **CI concurrency (PR11):** Deploy, E2E, cross-browser, a11y, and security cancel in-progress runs on `pull_request` only — never cancel an in-flight `main` validation or Pages deploy.
- **Product truthfulness docs (PR10):** Calibrated README (EN/DE), Help/About, onboarding, and PWA manifest claims — local-first storage vs provider egress, corpus-supported vs unverified narrative draft, estimated scientometrics, encryption XSS caveat. Extended `forbiddenReadmePhrases` drift gate. Badges: Local-First PWA / Multi-Provider (removed Production_Ready / Gemini_Pro overclaims).
- **E2E Cross-Browser Smoke is blocking:** removed `continue-on-error` from `.github/workflows/e2e-cross-browser.yml`; `docs/project-facts.json` `crossBrowserAdvisory: false`.
- **E2E network fixtures (PR8):** PubMed / Gemini / arXiv Playwright mocks live in `src/test/e2e/fixtures/`; agent-flow and journal-hub import the shared helpers instead of inlined route handlers.
- **DeepSource AI Review (mandatory):** PR gates require commenting `@deepsourcebot review` on every PR open and after fix pushes — team AI Review is on-demand; static analysis alone is not a completed review.

### Added

- **Cancel/Stop control for running research (#231):** Visible Cancel while the pipeline is `generating` / `streaming`; abort persists a resumable checkpoint of whatever was collected.
- **Accessible data-table fallback for color-only-encoded charts (#232):** Shared `ChartAccessibleTable` gives pie/treemap charts a screen-reader-only tabular equivalent (Dashboard bar charts already had one).
- **Sticky settings action bar + developer-mode gating for Agent Debugger (#230):** Settings title/Save/Cancel stay visible while scrolling a long tab (desktop); Agent Debugger is gated behind `developerMode`.
- **Partial report completion state (ADR 0021, #260):** `'partial'` is a first-class `ReportStatus`; cancelled/restored runs are never `'done'`.
- **`prefers-reduced-motion` for looping Framer Motion (#261):** `useMotionSafeLoop` collapses `repeat: Infinity` to the last keyframe when reduced motion is requested; `LoadingIndicator` SMIL spinner is gated the same way. Looping animate/transition objects are module-level constants so debugger pulses do not restart on every trace event.
- **CI / branch governance doc (PR11 / P1-7):** `docs/ci-branch-governance.md` — required checks, advisory bots, concurrency policy, artifact retention, stabilization window, merge-queue note; drift-gated via `docs/project-facts.json`.
- **Typed pipeline events (P1 / ADR 0020):** Research streams emit stable `phaseId` values; Agent Debugger and Orchestrator timeline map from IDs (not English substring heuristics / i18n string equality).
- **Ollama first-class Local AI (P1 / ADR 0019):** Health probe (`/api/version` + `/api/tags`) with TTL cache and Settings diagnostics; bounded NDJSON stream parser; CSP/`endpointPolicy` loopback parity for `127.0.0.1` and `[::1]`; model-missing / small-model warnings; privacy copy that PubMed/arXiv still use the network.
- **P1-9 test depth (providers / Dexie / orchestration):** Expanded unit coverage for Gemini/OpenAI/Anthropic/Ollama adapters (error mapping, abort, chat sessions, `testConnection`, capability flags, schema conversion, grounding sources), `databaseService` settings sanitization + checkpoint ordering, and `generateResearchReportStream` prompt-budget stage yields. Ratcheted `check:coverage-floors` / `docs/project-facts.json` for providers (≈85/82/70/85) and `geminiService` (≈68/68/50/70).
- **Agent Debugger prompt-budget regression:** `EventRow` unit tests cover ranking/synthesis summary chrome, omitted-PMID expansion, and synthesis field-truncation details.
- **Agent eval claim metrics (PR9):** `ClaimTrustMetrics` exposes `citationRecall` + `sourceRelevance`; `agentEval` thresholds for precision/recall/relevance/unsupported rate (empty/absent claims fail metric floors — no vacuous pass); `mustRankPmids` / `minRankedArticles`; large-corpus tail fixture runs through ranking prompt-budget selection so a relevant PMID at the end of a large corpus must survive truncation and grounding.

## [0.4.1] - 2026-08-02

> P0 scientific integrity closeout (P0-A–F), prompt-budget debugger UI, and P1 backlog through cross-browser full-suite E2E expansion (#183–#192).

### Added

- **P1-9 orchestration routing tests:** `resolveActiveInferenceMode.test.ts` and `researchOrchestratorAdapter.test.ts` cover live vs heuristic delegation.
- **P1 closeout audit:** `docs/audits/2026-08-02-p1-closeout.md` records P1 disposition at the #193 merge commit.

### Changed

- **Cross-browser E2E (P1-8):** Firefox/WebKit/mobile-Chrome workflow runs the full seven-spec parity list (still `continue-on-error`); mobile-chrome navigation E2E fixes; inference badge on mobile header.
- **Dependabot disposition:** Vitest 4.1.10 on `main` — tracking PR #10 closed.
- **Prompt budget UI (P0-3):** Agent Debugger `EventRow` surfaces trace `metadata.promptBudget` (included/omitted corpus, est. tokens, stage, selection mode).
- **Journal metadata integrity (P0-F):** no LLM-estimated impact factor; OA PubMed filter uses `free full text[filter]` + PMC post-filter; metrics `source: computed` from corpus.
- **Quality gates:** `check:conflict-markers` blocks unresolved merge markers in CI, pre-commit, and `check:fast`; pre-commit also runs full `format:check` (closes rebase/amend bypass).
- **P0 closeout audit:** `docs/audits/2026-08-02-p0-closeout.md` records P0-A–F disposition at `3a73707`.
- **Claim validation integrity (P0-E):** evidence corpus excludes `aiSummary`; trust banner clarifies corpus-supported vs verified audit; Unicode tokenization for non-English claims.
- **KB dedup follow-up (P0-B):** research-only prune deletes from research entries only; harmonization preserves `report.rankedArticles`; prune count matches research-only predicate; per-entry prune preserves high-scoring PMID copies in other reports; i18n notifications; `bulkUpdateKbEntries` unwrap + transaction rollback on missing ids.
- **Execution provenance (P0-D):** research reports stamp `inferenceMode` from `resolveActiveInferenceMode` at completion, not from settings provider alone.
- **KB import trust boundary (P0-C):** versioned import envelope, strict validation, corpus re-sanitization, forced `narrative-draft` trust on import, quarantine reporting in Settings UI.
- **KB snapshot safety (P0-B):** merge-duplicates harmonizes metadata without removing articles from historical entries; prune-by-relevance targets research reports only; Dexie transaction for bulk KB updates.
- **Author Hub integrity (P0-A):** corpus-bound metrics only — no `Math.random()` citation timelines or LLM-estimated h-index; `authorIdentity` matching; publications-per-year chart; abort/stale-request safety in author search flow.

### Added

- **Release and version discipline (P1-6):** `docs/release-policy.md`, build-time `appVersion` + `buildCommitSha`, `ResearchReport.generationProvenance`, Help/About + JSON/PDF export release labels, `appReleaseInfo` module.
- **PWA manifest smoke (P1-8):** `smoke.spec.ts` validates manifest link, JSON shape, and required icon entries.

### Changed

- **CI format gate (P1-7):** `pnpm run format:check` is blocking in `deploy.yml`; documented in `docs/audit-governance.md`.
- **Local git hooks (P1-7):** Husky pre-commit runs `typecheck`; pre-push runs `check:fast` — avoids TS errors reaching CI when commits bypass review.
- **Export provenance tests (P1-9):** JSON export release `meta` and PDF cover `generationProvenance` label coverage in `exportService.test.ts`.
- **Cross-browser E2E tracking (P1-8):** `docs/e2e-ci-backlog.md` records pre-manifest streak and resets current 4-test streak after manifest failure.
- **DeepSource JavaScript analyzer disabled (dashboard):** root cause in `docs/deepsource-javascript-ci.md`; TOML has no JS block; ESLint + `deploy.yml` authoritative; `scripts/build-meta.mjs` at scripts root.
- **Portable deployment base path (P1-3):** `VITE_BASE_PATH` + `VITE_SITE_ORIGIN` drive Vite `base`, generated manifest/canonical/OG URLs, and service-worker scope via `<base href>`; self-hosting matrix in README.
- **External fetch retry policy (P1-4):** `fetchWithExternalPolicy` centralizes abort-aware backoff, Retry-After, jitter, and elapsed budget for PubMed, arXiv, and RTK Query fetches.
- **Provider-aware cost estimator (P1-2):** `providerPricing` + `researchCostEstimate` use prompt-budget token sizing, per-provider list-price heuristics, unknown-pricing state (no guessed USD), and updated Settings/orchestrator UI strings.
- **Docs drift gate (P1-1):** `docs/project-facts.json` + expanded `check:docs-drift` (E2E inventory, coverage floors, ADR index, providers, forbidden README claims).

### Removed

- **Claude Code Review CI:** deleted `.github/workflows/claude-code-review.yml` (failing `review` job without `ANTHROPIC_API_KEY`; CodeRabbit + deploy gates remain). On-demand `@claude` via `claude.yml` unchanged.
- **SonarQube Cloud:** deleted `sonar-project.properties`, `docs/sonarcloud-setup-todo.md`, and all active CI/docs references (dashboard removed by owner).

### Added

- **Synthesis trust model (P0-6):** claim-level corpus + evidence validation, `trustLevel` on `groundedSynthesis`, live UI banner for unverified narrative drafts, adversarial claim tests, agent-eval unsupported-claim rate metric.
- **Brand identity (🔬 microscope mark):** unified PWA icon set (`app-icon.svg`, maskable PNGs, favicons, apple-touch-icon), `AppLogo` / `AppBrandMark` microscope SVG with optional emoji badge, branded boot splash, loading spinners, PWA settings preview, manifest shortcuts/categories, and theme metadata (`#070b12`).

### Changed

- **Prompt budget (P0-3):** lexical pre-filter + per-field bounding before JSON serialization; `wrapUntrustedJsonBlock` no longer truncates mid-JSON; Agent Debugger trace metadata records included/omitted corpus counts.
- **Deployment pruning:** `prune-deployments.yml` plus a post-deploy job in `deploy.yml` keep only the latest 3 GitHub deployment records per environment (inactive-then-delete API flow).

- **Audit P0/P1 completion:** mandatory custom-endpoint approval, CSP drift gate (`check:csp-endpoint-drift`), untrusted-data framing on all live AI prompts, capability-aware `generateJson`, export/history synthesis sanitization, PubMed query validation in orchestrator, `check:agent-eval` CI gate with `liveOrchestratorEval` fixtures.

- **Logging redaction audit (P1-5):** `safeLogError` / `safeLogWarn` with secret-pattern redaction; CI `check:log-redaction` blocks raw `console.*` in application source.

- **Audit governance (P1-7):** `docs/audit-governance.md` — `pnpm audit` moderate-severity procedure and CI gate map.

- **Cross-browser E2E smoke matrix (P1-6):** non-blocking `.github/workflows/e2e-cross-browser.yml` for Firefox, WebKit, and mobile Chrome (`smoke.spec.ts` only); `PLAYWRIGHT_MATRIX=1` enables extra Playwright projects.

- **Critical-path coverage floors (P1-3):** `check:coverage-floors` CI gate ratchets `providers/`, `geminiService.ts`, and `apiKeyService.ts` at current baselines.

- **Grounded synthesis schema (P0-3 completion):** optional `ResearchReport.groundedSynthesis` with `GroundedClaim[]`; heuristic population from extractive templates, live narrative PMID extraction, export sanitization, and KB import validation. ADR [0015](docs/adr/0015-grounded-synthesis-schema.md).

- **Audit follow-up:** `check:docs-drift` CI gate; export-time citation sanitization (`reportExportProvenance.ts`); agent doc corrections (Vite 8, `nonAi/` path, calibrated grounding claim).

### Added (audit remediation 2026-08-02) corpus-bound citation grounding (`citationGrounding.ts`), PubMed query structural validator, untrusted-data prompt framing, custom endpoint trust policy with origin approval, finer provider structured-output capability flags, and regression/property tests across MeSH dictionary entries.

- ADRs [0012](docs/adr/0012-corpus-citation-grounding.md), [0013](docs/adr/0013-custom-endpoint-trust-policy.md), [0014](docs/adr/0014-provider-structured-output-capabilities.md).
- Audit report: `docs/audits/2026-08-02-full-scale-audit.md`.

### Changed

- `SECURITY.md` updated for 0.4.x support, multi-provider assets, data-flow table, and calibrated residual risks.
- `openAccessOnly` heuristic query option now applies PubMed `free full text[filter]` (documented limitation vs. all OA definitions).
- `agentEval` citation grounding now measures corpus validity/completeness on `aiGeneratedInsights`, not substring presence in serialized output.

### Fixed

- **P0 MeSH query builder:** `formatMeshClause` prevents empty MeSH fragments when resolving by canonical heading (e.g. aspirin + cardiovascular topics).
- **P0 synthesis abort:** `AbortSignal` propagated to `generateContentStream` for the synthesis phase.
- **P0 custom endpoints:** connection tests use the configured `baseURL`; requests require CSP-permitted, user-approved origins.
- **P0 citation grounding:** hallucinated PMIDs filtered from `supportingArticles` and ranked articles before report yield.

### Added (prior sprint)

- **WS-E focus visibility:** `.focus-ring-aa` utility (`src/index.css`), ESLint rule `local/no-bare-outline-none`, and Playwright keyboard-walk smoke (`keyboard-focus.spec.ts`).
- **WS-F skip link + touch targets:** `SkipToContentLink` (hash-router-safe focus to `#main-content`), `.touch-target-aa` (44×44) on header/chrome controls and bottom nav, Playwright `skip-to-content.spec.ts`.
- **WS-G dialog a11y:** `useFocusTrap` Escape dismiss + optional body scroll lock; wired into ConfirmationModal, QuickAddModal, Settings shared Modal, and InputForm preset dialog; Playwright `dialog-a11y.spec.ts`.
- **WS-H2 command palette i18n:** EN+DE command titles, type labels, placeholder/empty/hints via `commandPaletteTranslations.ts`; palette uses `useFocusTrap` Escape + scroll lock.
- **WS-I a11y CI gate:** blocking `.github/workflows/a11y.yml` runs `pnpm run test:a11y` (axe critical/serious on home, orchestrator, settings, help, history, command palette).

### Changed

- **vitest** / **@vitest/coverage-v8** `^3.2.7` → `^4.1.10` (Vitest 4 migration; Node ≥20 / Vite ≥6 already satisfied).
- **openai** `^6.48.0` → `^7.2.0` (upstream 7.x requires Node ≥22 only; adapter API unchanged). Closes Dependabot #98 retarget.
- ESLint warning budget tightened to `--max-warnings 0`; `jsx-a11y` recommended rules run as errors (#115).
- `.github/workflows/claude.yml` live-capable `--allowedTools` allowlist for on-demand `@claude` (#115).

### Fixed

- **Cross-tab API-key vault race mitigated via Web Locks** (`apiKeyService`, #116).
- **i18n:** Knowledge Base / report export modals and notifications use EN+DE `t()` keys (`kb.export.*`); ratchet covers `useKnowledgeBaseLogic` + `useKbExports` (#117).
- **i18n chrome shell:** Header aria-labels/theme menu, Welcome, OrchestratorDashboard, ConfirmationModal, and FeatureErrorBoundary use EN+DE keys via `chromeTranslations.ts` + ratchet.
- **i18n modal chrome (WS-H1):** QuickAddModal, History quick-view/list chrome, InputForm preset dialog, and Settings shared Modal close label use EN+DE via `modalTranslations.ts` + ratchet.
- **i18n InputForm body:** orchestrator research parameters form + header EN+DE via `inputFormTranslations.ts` + ratchet (PubMed article-type filter values stay English in state).
- **i18n ResearchView:** Rapid Research Assistant chrome EN+DE via `researchViewTranslations.ts` + ratchet (phase ID constant shared with `useResearchAssistant`).
- **i18n ReportDisplay:** report chrome, article cards, chat, and relevance score EN+DE via `reportTranslations.ts` + ratchet (`ReportArticleCard` extracted under the 700-line cap).
- **i18n Settings General tab:** EN+DE via `settingsTranslations.ts`; `GeneralSettingsTab` extracted from `SettingsSubComponents`; Settings shell tab names / About / FAQ piggybacked; ratchet covers `GeneralSettingsTab`.
- **i18n Settings remaining tabs + shell:** AI / Knowledge Base / Export / Data tabs, SettingsView confirm/prune modals, and `useSettingsViewLogic` toasts EN+DE via `settingsTranslations.ts`; tabs extracted to dedicated files; ratchet covers all Settings migrated surfaces (CSV column ids and AI persona enum values stay English in state).
- **i18n Authors / Journals hubs + Agent Debugger + Collections:** EN+DE via `authorTranslations.ts`, `journalTranslations.ts` (chart titles), `debuggerTranslations.ts`, and `collections.*` keys; `AuthorProfileView` extracted under the 700-line cap; ratchet covers migrated hub/debugger/collections surfaces (agent IDs, journal category map keys, and API status enums stay English in state).
- **i18n Knowledge Base / Article detail / Dashboard / Scientometric Hub:** EN+DE via `kbChromeTranslations.ts` and `dashboardTranslations.ts`; Dashboard split (`DashboardSubComponents`); ratchet covers KB, ArticleDetailPanel, Dashboard, and ScientometricHub.
- **i18n residual chrome + enum chips:** Tooltip, Notification, LoadingIndicator, PipelineStep, and KnowledgeBaseItem shared chrome now use EN+DE `chrome.*` keys; author/journal featured category chips, journal match types, and journal open-access policy chips render localized labels while keeping English enum/category values in state.
- **WS-E:** restored visible keyboard focus rings on 12 interactive sites that used bare `focus:outline-none` (nav, accordions, command palette, search inputs, dashboard actions).
- **E2E CI promotion:** Playwright job is blocking after 10 consecutive clean runs (51 passed each); added `journal-hub.spec.ts` + `provider-flow.spec.ts` and shared `e2eHelpers.ts`.
- **Claude Code Review:** job marked `continue-on-error: true` so intermittent OAuth/`is_error:true` infra failures do not fail PR checks while reviews still post when auth works.
- **Vitest 4:** `vitest` + `@vitest/coverage-v8` bumped to `^4.1.10`; constructor-style SDK mocks and SW integrity event-listener harness updated for Vitest 4 spy/`new` semantics.
- **Claude Code Review `allowed_bots`:** allow actor `cursor` so Cloud Agent–opened PRs get a real review instead of aborting with “non-human actor”.

### Known gaps (tracked, not yet closed)

- **Cross-browser E2E (P1-8 step 3):** full seven-spec matrix runs advisory on Firefox/WebKit/mobile Chrome — track 10× **54 passed / 0 failed** streak per browser in `docs/e2e-ci-backlog.md` (WebKit flaky on first post-#192 run).
- **P1-9 test depth:** orchestration routing tests added; `providers/`, `databaseService.ts`, and `geminiService.ts` remain candidates for deeper coverage.
- Broader i18n migration (#69) — no known residual chrome backlog outside future audit findings.
- Opportunistic Dependabot minors — process per `docs/dependabot-disposition.md` when new PRs open.

## [0.4.0] - 2026-08-01

> Promotes the previously unreleased work that already landed on `main` prior to the 2026-08-01 Master Sprint PRs. Aligns `package.json` with a real `v0.4.0` tag (no `v0.3.0` tag ever existed).

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

- **`src/App.tsx` decomposed below the 700-line hard max (#78 / #74):** pure structural split into `src/app/useAppLogic.ts` (state/effects/handlers), `src/app/AppLayout.tsx` (chrome + view routing), plus small helpers (`getAgentForPhase`, spinners, lazy view map). Behavior preserved — vault-reset listener registration/cleanup, Redux dispatch stability, banners, and phase→agent mapping unchanged.
- **Dependabot majors (#98 / #101 / #104):** `openai` 4→6 (with `max_completion_tokens` for gpt-5/o-series), `dexie-react-hooks` 1→4 (unused import hygiene), `marked` 13→18 (parse + DOMPurify path verified).
- `eslint-plugin-react-hooks` upgraded to v7.1.1 (#62).
- **No-`any` / zero-warnings ESLint policy completed** across two PRs (#64, #65): eliminated all `no-explicit-any`, `no-unused-vars`, `no-unescaped-entities`, and `display-name` findings, all `react-hooks/exhaustive-deps` warnings, and all `jsx-a11y` warnings. Lint is now **0 errors / 0 warnings**, down from 176 warnings against the previous 650-warning budget.
- ESLint gate tightened to match the zero-warnings policy: `--max-warnings 0` (package.json + lint-staged); removed the temporary `jsx-a11y` error→warn severity downgrade so recommended a11y rules (plus explicit interactive-element rules) run as errors.
- `.github/workflows/claude.yml` (on-demand `@claude`): added a live-capable `--allowedTools` allowlist (Read/Grep/Glob/Edit/Write + scoped gh/git/pnpm Bash) and synced `anthropics/claude-code-action` SHA with the review workflow / Dependabot #108.
- **Migrated to Vite 8 + `@vitejs/plugin-react` 6** (#66) — a bundler-architecture change (esbuild/Rollup → Rolldown/Oxc), handled as a dedicated migration rather than a routine version bump.
- `useTranslation.ts` refactored to delegate its lookup/interpolation logic to the new framework-free `resolveTranslation()` core shared with `translateSync()` (#69) — pure extraction, no behavior or signature change.

### Fixed

- **Tailwind v4 theme wiring (#95):** custom color/font/animation utilities (`bg-surface`, `text-text-primary`, `border-border`, `animate-fadeIn`, `placeholder-text-secondary`, …) compiled to **zero CSS** after the v4 migration because neither `@config` nor a native `@theme` block loaded the legacy `tailwind.config.js` theme extension. Added idiomatic `@theme reference inline` (pass-through to existing theme-switched CSS variables) plus a static `@theme` block for animations/blur/easing in `src/index.css`, restored class-based `dark:` via `@custom-variant`, and deleted the now-redundant `tailwind.config.js`. Hand-authored design-system classes (`.glass-panel`, `.glass-input`, `.panel-card`, …) remain the primary styling path; pairings that previously relied on dead utilities (e.g. `glass-panel bg-surface/30`, `border-border` on sole-utility inputs) now apply as originally authored.
- **`brace-expansion` GHSA-mh99-v99m-4gvg** (high): pnpm overrides in `pnpm-workspace.yaml` bumped across all three major lines in the tree (`1.1.16→1.1.18`, `2.1.2→2.1.4`, `5.0.7→5.0.9`) so `pnpm audit --audit-level=high` stays clean.
- **WS-D follow-ups (#96):** unquote CSS generic keyword `ui-monospace` in `--font-mono` (both `src/index.css` and `index.html` FOUC bootstrap) so the OS UI-monospace stack is used; extend `scripts/check-contrast.mjs` to assert `--color-border` vs `--color-input-bg` (3:1) for every theme.
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

### Known gaps (tracked, not yet closed)

- (None remaining for the 0.4.0 cut — post-release follow-ups live under `[Unreleased]`.)

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

[Unreleased]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.4.2...HEAD
[0.4.2]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.2.1...v0.4.0
[0.3.0]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/qnbs/AI-Research-Orchestrator/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/qnbs/AI-Research-Orchestrator/releases/tag/v0.1.0
