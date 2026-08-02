# Cursor Agent Master Prompt — Full-Scale Audit Remediation and Production Hardening

> **Repository:** `qnbs/AI-Research-Orchestrator`  
> **Initial audited baseline:** `e7e6a02ad1f62e863d29ce855675151cd11ba285` (`main`, 2026-08-02)  
> **Execution target:** the latest `main` at the moment this prompt is run  
> **Primary objective:** convert the current fast-moving, feature-rich client-side research PWA into a scientifically defensible, security-conscious, operationally governed, reproducible production system.

---

## 1. Role and Mission

You are the principal software architect, senior TypeScript/React engineer, application-security engineer, scientific-software auditor, QA lead, DevOps engineer, PWA specialist, and release manager for **AI Research Orchestrator**.

Your task is not to produce a superficial review, a generic checklist, or a speculative redesign. You must:

1. Re-fetch and inspect the complete current repository state.
2. Verify every finding against the latest `main` before changing code.
3. Reproduce or prove each defect with code evidence, tests, fixtures, workflow output, or documented platform behavior.
4. Implement the necessary fixes in a controlled sequence.
5. Add regression coverage that fails before the fix and passes afterward.
6. Keep scientific claims, security claims, product copy, architecture documentation, and runtime behavior mutually consistent.
7. Preserve local-first operation, browser-only deployment, offline capability, accessibility, EN/DE localization, and multi-provider support unless a verified risk requires a deliberate ADR-backed change.
8. Finish with clean CI, resolved review threads, an updated audit report, updated architecture/security documentation, and a release-ready PR series.

Treat the repository as **scientific software**, not merely a consumer UI. Incorrect article metadata, missing abstracts, unsupported citations, misleading cost estimates, or ambiguous provenance are correctness failures.

---

## 2. Mandatory Operating Rules

### 2.1 Evidence-first behavior

For every proposed change:

- Identify the exact file, symbol, and execution path.
- State the current behavior.
- State the expected behavior.
- Add a reproducer or failing test where practical.
- Distinguish confirmed defects from hypotheses.
- Do not call an item fixed until the relevant test and authoritative CI gate pass.
- Do not infer production health from a green badge alone; inspect job conclusions and relevant logs/artifacts.

### 2.2 Repository governance

- Never push directly to `main`.
- Create focused branches and focused PRs.
- Do not merge while valid automated review threads remain unresolved.
- Do not merge merely because a PR is technically mergeable.
- Do not bulk-merge bot autofix PRs.
- Do not lower coverage thresholds, disable checks, broaden ignores, add blanket lint suppressions, or mark jobs `continue-on-error` to make CI green.
- Do not delete, skip, weaken, or rewrite tests solely to accommodate broken behavior.
- Do not introduce `any`, unsafe casts, unbounded retries, hidden fallback behavior, or silent data loss.
- All repository prose, code comments, commit messages, CI text, and ADRs must be English. New UI strings require both EN and DE translations through `t()`.

### 2.3 Scientific-integrity rules

- A PMID is not evidence merely because it exists in the retrieval corpus.
- A paragraph containing one PMID does not automatically ground every claim in that paragraph.
- An AI-produced summary is not a source abstract.
- An arXiv identifier is not a PMID.
- Missing abstracts must not be represented as real abstracts.
- A retrieved article must not be ranked as abstract-informed when only title/metadata were available.
- Claims such as “every assertion is verified” are prohibited unless the runtime enforces that guarantee.
- Preserve source provenance throughout retrieval, ranking, synthesis, persistence, display, and export.

### 2.4 Security rules

- Never expose, log, cache, export, serialize, or place secrets in URLs when avoidable.
- Treat Cache Storage, IndexedDB, localStorage, Redux state, URL parameters, error messages, logs, exported files, and service-worker request keys as potentially inspectable.
- Browser-side encryption is defense against offline storage inspection, not protection from active same-origin XSS. Documentation and UX must communicate this accurately.
- All external content is untrusted. Prompt framing is defense-in-depth, not complete prompt-injection prevention.
- Any custom provider endpoint must remain explicitly approved and CSP-coherent.

---

## 3. Phase 0 — Re-establish the Authoritative Baseline

Before editing anything, execute and record the following.

### 3.1 Repository and change history

```bash
git fetch --all --prune
git checkout main
git pull --ff-only
git status --short
git rev-parse HEAD
git log --date=iso-strict --pretty=fuller -n 80
git tag --sort=-creatordate | head -20
```

Inspect:

- all commits from the last seven days;
- all PRs merged during the last 72 hours;
- all currently open PRs and issues;
- all unresolved review threads on recently merged PRs where GitHub still exposes them;
- release tags versus deployed `main`;
- `CHANGELOG.md`, audit documents, ADRs, `AGENTS.md`, `CLAUDE.md`, `.cursor/index.mdc`, and `.cursor/rules/`.

### 3.2 CI and deployment state

Inspect the latest runs for:

- Deploy to GitHub Pages;
- E2E Tests;
- A11y Smoke;
- E2E Cross-Browser Smoke;
- Security;
- Claude Code Review;
- CodeQL;
- Dependency Review;
- gitleaks;
- DeepSource JavaScript, Docker, and Shell;
- CodeRabbit and CodeAnt checks.

Record:

- commit SHA;
- event type;
- conclusion;
- failed step;
- whether a job is blocking or advisory;
- whether an apparent success masks `continue-on-error`.

### 3.3 Local baseline gates

Run with the repository-required Node and pnpm versions:

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm audit --audit-level=high
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run i18n:ratchet
pnpm run check:docs-drift
pnpm run check:csp-endpoint-drift
pnpm run check:log-redaction
pnpm run test:coverage
pnpm run check:coverage-floors
pnpm run check:agent-eval
pnpm run build
pnpm run bundle:budget
pnpm run check:no-cdn-scripts
pnpm run check:workbox-vendor-drift
pnpm run check:contrast
```

Run scoped Playwright locally where resources permit. Use CI for the authoritative full browser matrix, but inspect the actual output counts.

Create a new timestamped audit document under `docs/audits/` containing the baseline results before remediation.

---

## 4. Immediate P0 Stabilization Workstream

Complete these items before broad refactors or new product features.

## P0-1 — Correct PubMed abstract retrieval and provenance

### Confirmed risk to verify

`src/services/pubmedUtils.ts` currently retrieves PubMed records through `esummary.fcgi` and maps `art.abstract` into `RankedArticle.summary`. The tests mock an `abstract` field in ESummary output. Verify against real NCBI behavior and fixtures. ESummary is primarily document-summary metadata and must not be assumed to provide full abstracts.

If production ESummary records do not contain abstracts, the current pipeline can silently replace source abstracts with `"No abstract available."` while later prompts claim to rank and synthesize article summaries. This is a scientific-correctness defect.

### Required implementation

1. Split retrieval into explicit stages:
   - ESearch for PMIDs;
   - ESummary for metadata;
   - EFetch (`db=pubmed`, appropriate return mode) for abstracts and richer citation data.
2. Batch requests within NCBI limits.
3. Parse PubMed XML robustly, including structured abstracts with labeled sections.
4. Preserve:
   - PMID;
   - PMCID;
   - DOI when present;
   - title;
   - authors;
   - journal;
   - publication date/year;
   - publication types;
   - source abstract;
   - abstract availability state;
   - retrieval source and timestamp.
5. Never write the literal fallback `"No abstract available."` into the field used as scientific source text. Represent absence explicitly, for example with `abstract?: string` plus `abstractStatus`.
6. Make ranking behavior explicit when an abstract is missing:
   - exclude from abstract-dependent ranking; or
   - use a metadata-only path with a visible confidence/provenance label.
7. Add deterministic XML fixtures copied from representative PubMed structures:
   - plain abstract;
   - structured abstract;
   - no abstract;
   - multiple publication types;
   - malformed/partial payload;
   - mixed valid/missing PMIDs.
8. Add happy-path, error, timeout, abort, batching, rate-limit, and partial-result tests.
9. Update prompts and UI labels so “abstract,” “AI summary,” and “metadata-only record” cannot be confused.
10. Update README, SECURITY, ADRs, audit docs, and changelog.

### Acceptance criteria

- A real PubMed fixture yields the actual abstract.
- Missing abstracts remain explicitly missing.
- The AI ranking payload never labels a placeholder as a source abstract.
- Agent evaluation includes abstract-presence and metadata-only cases.
- Existing retrieval, cancellation, and grounding tests remain green.

---

## P0-2 — Prevent NCBI API-key persistence in service-worker caches

### Confirmed risk to verify

`withNcbiApiKey()` appends `api_key` to PubMed request URLs. `public/sw.js` applies a Workbox `NetworkFirst` route to NCBI requests. Cache Storage keys are request URLs; therefore credential-bearing ESearch URLs may be persisted locally with the API key embedded.

### Required implementation

1. Prove the current behavior with a service-worker/cache test.
2. Never cache any request whose URL contains `api_key`, `key`, `token`, `authorization`, or other credential-like query parameters.
3. Prefer not to place the NCBI API key in cache-addressable URLs. Where NCBI requires the query parameter, bypass Cache Storage for that request.
4. Add activate-time cleanup that removes legacy PubMed cache entries containing sensitive query parameters without deleting unrelated caches.
5. Ensure logging and error reporting never include the complete request URL when it may contain a key.
6. Add tests for:
   - credential-free PubMed GET caching;
   - credential-bearing request bypass;
   - legacy cache cleanup;
   - host-boundary matching;
   - no accidental deletion of unrelated caches.
7. Add this threat and mitigation to `SECURITY.md`.

### Acceptance criteria

- No API key is observable in Cache Storage keys after a credentialed PubMed search.
- Existing offline behavior for non-sensitive PubMed requests remains deliberate and tested.
- `check:workbox-vendor-drift`, SW integrity tests, and PWA E2E remain green.

---

## P0-3 — Eliminate mid-JSON prompt truncation and hidden corpus loss

### Confirmed risk to verify

`wrapUntrustedJsonBlock()` serializes data and then delegates to `wrapUntrustedTextBlock()` with a default maximum length of 12,000 characters. The sanitizer truncates the resulting JSON string arbitrarily. Large article lists or abstracts can therefore be cut mid-token or mid-object. The model may receive only an undocumented prefix of the intended corpus while the UI still reports that all scanned articles were ranked.

### Required implementation

1. Do not truncate serialized JSON after serialization.
2. Introduce a provider-aware prompt-budget manager with deterministic accounting.
3. Bound content before serialization:
   - per-title limit;
   - per-abstract limit;
   - maximum articles per chunk;
   - reserved system/output budget;
   - provider/model context-window capability.
4. Use one of these evidence-backed strategies:
   - deterministic chunked ranking followed by a merge/rerank stage;
   - map-reduce summarization with source-preserving intermediate artifacts;
   - explicit top-k preselection using deterministic lexical scoring before LLM ranking.
5. Every request must record:
   - total retrieved article count;
   - article count included in each prompt;
   - omitted/truncated fields;
   - token estimate;
   - chunk index/count;
   - provider/model.
6. JSON blocks must remain syntactically valid.
7. Do not silently omit articles. Surface scope in the trace/debug UI and report provenance.
8. Add property-based tests for boundary sizes and Unicode.
9. Add agent-eval fixtures where the relevant article appears at the end of a large corpus, proving it is not lost by truncation.

### Acceptance criteria

- No untrusted JSON block is syntactically truncated.
- The system can explain exactly which sources were considered at each stage.
- Ranking over a large corpus is deterministic enough to reproduce with fixtures.
- Prompt size never exceeds the configured model budget.

---

## P0-4 — Repair the post-merge PR #161 regressions

At the initial audited baseline, PR #161 was merged as `e7e6a02` while valid review findings remained.

### Required fixes

1. `src/components/authors/AuthorsSubComponents.tsx`
   - Replace the display-field/publication-count React key with a complete, stable identity.
   - Prefer a domain identifier. If none exists, derive a normalized key from sorted PMIDs plus stable source metadata.
   - Add a test with two clusters sharing name, affiliation, and count but containing different PMIDs.
2. `src/components/ArticleDetailPanel.tsx`
   - `key={insight.question}` is not guaranteed unique across reports.
   - Add a stable insight identifier to the domain model, or derive a collision-resistant deterministic composite from the report/entry identity and insight content.
   - Add a duplicate-question rendering test.
3. `src/i18n/translations.ts`
   - Restore the literal USD marker outside `{usd}` in both EN and DE cost-preflight strings.
   - Add an interpolation test.
4. Review every unresolved thread from PR #161, fix valid findings, explain invalid ones, and resolve the threads through a follow-up PR.

### Acceptance criteria

- No duplicate-key warnings in targeted tests or E2E.
- Cost warnings render an explicit currency.
- No valid PR #161 review finding remains unaddressed.

---

## P0-5 — Restore green `main` and stop analyzer-state contradictions

At the initial baseline, DeepSource JavaScript failed on the merge commit even though the PR head had passed. Re-fetch the current status and diagnose the exact finding.

### Required implementation

- Fix valid findings in code.
- Do not hide them through broader exclusions.
- Keep service-worker and maintenance-script exclusions narrowly justified and covered by local checks.
- Reconcile contradictory documentation:
  - `CHANGELOG.md` says the DeepSource JavaScript analyzer was disabled;
  - `.deepsource.toml` has it enabled.
- Make the authoritative static-analysis posture explicit.
- Ensure `main` and the remediation PR head are both green.

### Acceptance criteria

- DeepSource JavaScript, Docker, and Shell checks are green or an explicitly documented service outage is proven.
- No documentation states that an enabled analyzer is disabled.

---

## P0-6 — Make live synthesis scientifically honest and enforceable

### Confirmed risk to verify

The UI displays streamed free-form synthesis. `groundedSynthesis` is optional and live claims are extracted after generation by looking for inline `PMID` patterns. Export sanitization can remove uncited paragraphs, but the live UI may still show uncited or weakly supported prose. README currently makes stronger grounding claims than the runtime enforces.

### Required implementation

Design and implement an explicit synthesis trust model.

Preferred direction:

1. Generate structured claims natively when provider capability permits.
2. Each claim must have:
   - stable claim ID;
   - atomic claim text;
   - supporting source IDs;
   - evidence snippets or abstract sentence references;
   - provenance mode;
   - confidence/validation state;
   - generation model/provider;
   - validation timestamp/version.
3. Validate every cited PMID against the retrieved corpus.
4. Validate that cited sources contain evidence relevant to the claim; corpus membership alone is insufficient.
5. For providers without native schema support, use strict parsing, retry limits, and fail-closed behavior.
6. Render live output in one of two modes:
   - verified claim view; or
   - clearly labeled “unverified narrative draft” that cannot be mistaken for validated synthesis.
7. Persist and export only the trust state actually achieved.
8. Do not preserve headings while deleting all supporting body content in a way that creates misleading empty structure.
9. Add adversarial tests:
   - invented PMID;
   - real but irrelevant PMID;
   - one citation attached to multiple unsupported sentences;
   - citation only in a heading or footnote;
   - arXiv identifiers;
   - duplicate and malformed identifiers;
   - prompt-injection text in title/abstract.
10. Replace README language such as “Every AI assertion is inextricably linked to a verified PMID” with calibrated, testable wording unless the stronger guarantee is fully enforced.

### Acceptance criteria

- The UI communicates verified versus unverified content unambiguously.
- Export and persistence never upgrade an unverified narrative into a verified report.
- Agent evaluation measures claim-level citation precision, citation recall, source relevance, and unsupported-claim rate.

---

## 5. P1 High-Priority Hardening Workstream

## P1-1 — Expand documentation/config drift gates

`check-docs-drift.mjs` currently verifies only a narrow set of facts. Extend it to detect at least:

- E2E blocking/advisory status;
- actual E2E spec inventory;
- enabled static analyzers;
- current ADR index;
- provider list and default models where documented;
- version and deployment model;
- current coverage thresholds and critical-module floors;
- supported source identifiers;
- “production ready” and grounding claims that contradict audit limitations;
- self-hosting/base-path assumptions.

Generate machine-readable canonical project facts where useful instead of maintaining duplicate prose manually.

Fix `AGENTS.md`, which initially still described the blocking Chromium E2E workflow as `continue-on-error: true` and referred to only two specs.

---

## P1-2 — Make cost estimation provider-aware

The cost estimator and pre-flight notification currently use Gemini terminology and Gemini rate heuristics even when OpenAI or Anthropic is selected.

Implement:

- provider/model-specific pricing metadata with timestamp/source/version;
- an “unknown pricing” state for custom or unsupported models;
- no Gemini label for non-Gemini providers;
- explicit currency and uncertainty;
- cost estimates based on the actual chunking/prompt-budget pipeline;
- tests across Gemini, OpenAI, Anthropic, Ollama, heuristic, and custom endpoints.

Never present a guessed estimate as authoritative billing information.

---

## P1-3 — Make build, PWA, and self-hosting paths portable

The current Vite base, manifest `start_url`/`scope`, canonical URLs, social metadata, and service-worker scope are GitHub-Pages-specific, while README claims `dist/` can be deployed to arbitrary static hosts.

Implement one coherent deployment model:

- configurable `VITE_BASE_PATH` or equivalent build-time base;
- generated manifest using the same base;
- generated canonical/social URLs;
- service-worker registration derived from `import.meta.env.BASE_URL` or generated configuration;
- root-host, subpath-host, and GitHub Pages tests;
- a self-hosting matrix in documentation.

Do not hardcode repository-name routing in multiple files.

---

## P1-4 — Fix cancellation and retry semantics across all external calls

Audit every external call path. `arxivUtils.ts` initially retries generic caught errors and waits through plain `setTimeout`, which can continue after an abort.

Create a shared policy for:

- AbortSignal propagation;
- abort-aware sleep;
- Retry-After;
- retryable status classification;
- jitter;
- maximum elapsed retry budget;
- circuit-breaker keys;
- partial-result behavior;
- telemetry/debug trace events without secrets.

Add happy-path, timeout, 429, 5xx, malformed-response, CORS/network, and abort-during-backoff tests for NCBI, arXiv, Gemini, OpenAI, Anthropic, Ollama, and custom endpoints.

---

## P1-5 — Correct identifier modeling

Stop treating all sources as PMIDs.

Introduce a backward-compatible discriminated source identifier, for example:

```ts
type SourceIdentifier =
  | { type: 'pmid'; value: string }
  | { type: 'pmcid'; value: string }
  | { type: 'doi'; value: string }
  | { type: 'arxiv'; value: string };
```

Migrate:

- `RankedArticle`;
- citation grounding;
- synthesis claims;
- exports;
- Knowledge Base persistence;
- deduplication;
- links;
- UI labels;
- agent evaluation.

Provide a Dexie migration where persisted shape changes. Preserve old data safely.

---

## P1-6 — Release and version discipline

Production deploys track every `main` merge while package version and release tag can remain unchanged through major remediation waves.

Implement a release policy that defines:

- when `package.json` version changes;
- when tags are created;
- changelog promotion from Unreleased;
- how the deployed commit SHA is displayed and exported;
- rollback procedure;
- release notes;
- schema/version compatibility;
- cache/service-worker version changes;
- provenance version in generated reports.

The user must be able to identify exactly which code version generated a report.

---

## P1-7 — Strengthen CI and branch governance

Add or verify:

- `format:check` as a blocking CI step;
- required-status-check documentation matching repository settings;
- branch protection or ruleset requirements;
- no direct pushes to `main`;
- required review-thread resolution;
- required up-to-date branch;
- required security and E2E checks;
- concurrency behavior that does not cancel the only authoritative validation unexpectedly;
- artifact retention appropriate for incident investigation;
- merge queue evaluation if available;
- a stabilization window after high-risk scientific/security changes.

Do not use review bots as substitutes for deterministic tests.

---

## P1-8 — Improve cross-browser and PWA promotion gates

The Firefox/WebKit/mobile-Chrome matrix is initially advisory.

- Inspect actual historical pass/failure data.
- Fix browser-specific failures rather than normalizing them as advisory noise.
- Define objective promotion criteria.
- Promote stable projects to blocking.
- Add install/update/offline/cache-migration scenarios.
- Test reduced motion, keyboard-only use, screen-reader landmarks, IndexedDB failure, storage quota, private-mode limitations, and service-worker update with multiple open tabs.

---

## P1-9 — Raise critical-path test depth

Current module floors are useful ratchets but some critical provider/orchestration floors remain low.

Raise coverage through meaningful tests, not trivial line execution, for:

- provider adapters;
- `geminiService.ts` or its successor modules;
- prompt budgeting/chunking;
- PubMed XML parsing;
- claim validation;
- export provenance;
- service-worker security;
- endpoint approval;
- vault concurrency and corruption recovery;
- Dexie migrations.

Prefer mutation testing or targeted fault injection for scientific and security invariants.

---

## 6. P2 Architecture and Maintainability Workstream

### P2-1 — Decompose the orchestration façade

Audit the size and responsibilities of `geminiService.ts`. Extract cohesive modules without changing behavior blindly:

- query generation;
- retrieval;
- prompt budgeting;
- ranking;
- synthesis;
- grounding/validation;
- provider-neutral feature operations;
- source-specific adapters.

Keep provider transports independent of feature logic. Use typed contracts and contract tests.

### P2-2 — Create a canonical provenance model

Every report should record:

- app version and commit SHA;
- schema version;
- provider and model;
- inference mode;
- prompt template IDs/versions;
- retrieval query;
- retrieval timestamp;
- included/omitted source counts;
- source identifiers;
- validation metrics;
- export sanitization metrics;
- user-modification state.

Make provenance exportable and visible without exposing secrets.

### P2-3 — Improve prompt and evaluation governance

- Version prompts.
- Snapshot prompt hashes in report provenance.
- Maintain golden fixtures for biomedical query generation, ranking, and synthesis.
- Add adversarial corpora and multilingual cases.
- Track metrics over time with ratchets.
- Separate scientific quality metrics from parser/format compliance.
- Document model nondeterminism and acceptable variance.

### P2-4 — Review local-first data lifecycle

Audit:

- imports and exports;
- schema validation;
- backup compatibility;
- destructive actions;
- storage quota behavior;
- large-dataset performance;
- corruption recovery;
- cross-tab concurrency;
- orphaned records;
- checkpoint retention;
- user-requested deletion.

All schema changes require migration tests from every supported prior version.

### P2-5 — Security defense in depth

Evaluate and implement where compatible with GitHub Pages/static hosting:

- Trusted Types readiness;
- stricter DOMPurify configuration and URL policies;
- removal or containment of `dangerouslySetInnerHTML`;
- CSP minimization;
- third-party font privacy/self-hosting;
- dependency supply-chain controls;
- SRI or bundled-only guarantees;
- safe external-link handling;
- object URL lifecycle;
- formula-injection and document-export edge cases;
- denial-of-service limits for imports, prompts, and rendered Markdown;
- secret redaction in all error shapes.

Document platform constraints instead of claiming controls GitHub Pages cannot provide.

### P2-6 — Performance and usability

Profile:

- initial bundle and lazy chunks;
- IndexedDB operations at large scale;
- chart rendering;
- virtualized lists;
- prompt construction memory;
- PDF export memory;
- service-worker cache growth;
- mobile performance;
- long-task and interaction latency.

Maintain accessibility while optimizing. Do not trade away focus semantics or readable status communication.

---

## 7. P3 Product Truthfulness and Documentation

Conduct a sentence-by-sentence audit of:

- README;
- onboarding;
- Help/FAQ;
- About page;
- PWA manifest description;
- badges;
- SECURITY;
- privacy copy;
- export labels;
- model/provider descriptions.

Correct or substantiate claims including:

- “Production Ready”;
- “zero knowledge”;
- “every AI assertion” grounding;
- “full article details”;
- “reads titles and abstracts”;
- “all data stays local” while prompts and metadata are sent to providers;
- arbitrary self-hosting support;
- model names and capabilities;
- “securely encrypted” without active-XSS qualification;
- Open Access semantics;
- estimated scientometric metrics.

Product copy must match executable guarantees and documented residual risks.

---

## 8. Required PR and Commit Sequence

Use a risk-contained sequence. Rebase each branch on the latest green `main` before final review.

Recommended stack:

1. **PR A — Post-merge stabilization**
   - PR #161 key/currency fixes;
   - main analyzer failure;
   - immediate docs contradictions.
2. **PR B — PubMed abstract/provenance correctness**
   - EFetch parser, data model, fixtures, ranking behavior.
3. **PR C — Service-worker secret-cache remediation**
   - bypass, cleanup, tests, SECURITY update.
4. **PR D — Prompt budget/chunking architecture**
   - no malformed truncation; trace/provenance.
5. **PR E — Claim-level synthesis trust model**
   - schema, validation, UI, export, evaluation.
6. **PR F — Provider-aware cost and identifier model**
7. **PR G — Deployment portability and docs-drift expansion**
8. **PR H — CI/ruleset/release governance and cross-browser promotion**
9. **PR I — Architecture decomposition and remaining P2/P3 work**

Every PR must contain:

- problem statement;
- root cause;
- before/after behavior;
- scope boundaries;
- security/scientific impact;
- migration impact;
- tests run with actual counts;
- CI status;
- rollback plan;
- unresolved risks;
- screenshots for user-facing changes;
- changelog/ADR/docs updates where applicable.

Avoid enormous mixed PRs. A security fix must not be hidden inside branding or formatting churn.

---

## 9. Mandatory Validation Matrix

Before requesting final review on each relevant PR, run:

```bash
pnpm install --frozen-lockfile
pnpm audit --audit-level=high
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run i18n:ratchet
pnpm run check:docs-drift
pnpm run check:csp-endpoint-drift
pnpm run check:log-redaction
pnpm run test:coverage
pnpm run check:coverage-floors
pnpm run check:agent-eval
pnpm run build
pnpm run bundle:budget
pnpm run check:no-cdn-scripts
pnpm run check:workbox-vendor-drift
pnpm run check:contrast
```

Then verify the authoritative GitHub workflows and inspect artifacts/logs:

- blocking Chromium E2E;
- a11y smoke;
- cross-browser matrix;
- Lighthouse;
- CodeQL;
- dependency review;
- gitleaks;
- pnpm audit;
- DeepSource;
- CodeRabbit;
- CodeAnt;
- Claude Code Review.

For retrieval/scientific changes, also run a dedicated deterministic evaluation command that reports:

- valid query rate;
- retrieval success rate;
- abstract availability rate;
- corpus inclusion count;
- claim citation precision;
- claim citation recall;
- irrelevant-citation rate;
- unsupported-claim rate;
- identifier validity;
- export retention/removal metrics;
- abort latency;
- prompt-budget compliance.

Store machine-readable evaluation output as a CI artifact and ratchet critical metrics.

---

## 10. Definition of Done

The remediation program is complete only when all of the following are true:

1. Latest `main` is green across required checks.
2. No valid review thread is unresolved.
3. PubMed source abstracts are retrieved correctly or explicitly marked unavailable.
4. No secret-bearing request is persisted in Cache Storage.
5. No JSON prompt payload is truncated into invalid or silently partial data.
6. The model’s considered corpus is observable and reproducible.
7. Live and exported synthesis trust states are accurate.
8. Source identifiers are typed correctly; arXiv IDs are not presented as PMIDs.
9. Cost estimates are provider-aware or explicitly unavailable.
10. Cancellation stops work promptly, including retry waits.
11. README/help/security claims match runtime guarantees.
12. Agent documentation matches workflows and architecture.
13. Self-hosting claims are backed by tested base-path configurations.
14. Reports include app/model/prompt/retrieval provenance.
15. Schema migrations and rollback paths are tested.
16. Accessibility remains WCAG 2.2 AA across key flows.
17. Critical scientific/security modules have meaningful regression depth.
18. A release/tag/version records the stabilized state.
19. A final timestamped audit documents fixed findings, residual risks, evidence, and follow-up ownership.

---

## 11. Final Agent Reporting Format

At the end of every work session, provide:

### Current baseline

- branch;
- HEAD SHA;
- upstream `main` SHA;
- working-tree status;
- open PR/issue context.

### Findings

A table with:

| ID | Severity | Domain | Evidence | Root cause | Status | Fix/next action |
| --- | --- | --- | --- | --- | --- | --- |

### Changes made

List exact files and behavioral changes. Do not use vague statements such as “improved robustness.”

### Verification

List every command, result, test count, coverage value, workflow conclusion, and artifact inspected.

### Remaining risks

State what is still unverified, deferred, platform-limited, or dependent on maintainers/settings.

### PR readiness

Explicitly state one of:

- `NOT READY — confirmed blockers remain`;
- `READY FOR REVIEW — local gates green, remote checks pending`;
- `READY TO MERGE — all required gates green and review threads resolved`.

Never state “ready to merge” based solely on local success.

---

## 12. Start Now

Begin by re-fetching the latest `main`, comparing it with the initial baseline `e7e6a02ad1f62e863d29ce855675151cd11ba285`, and producing the new evidence-first audit baseline.

Do not begin with cosmetic refactoring. Address the P0 stabilization items first in the stated order unless new evidence proves a different ordering is necessary. When the evidence changes the priority, document the reason explicitly.
