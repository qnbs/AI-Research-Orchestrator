# AI Research Orchestrator — Full-Scale Deep Audit, Remediation, Modernization & Product Perfection Master Prompt

**Target agent:** Cursor Cloud Agent with **Composer 2.5**  
**Repository:** `qnbs/AI-Research-Orchestrator`  
**Production:** `https://qnbs.github.io/AI-Research-Orchestrator/`  
**Baseline date for this handoff:** 2026-10-02  
**Mission type:** autonomous, long-horizon, evidence-first audit + implementation + verification + PR/review/CI convergence  
**Repository language:** English for code, docs, comments, commits, PRs, and agent artifacts, except existing German locale values and required EN/DE product-copy parity  
**Primary product priority:** UI/UX, end-to-end user journey, workflow clarity, visual coherence, accessibility, and task completion  
**Equal engineering rigor:** AI providers, Local AI/Ollama, deterministic heuristic inference, retrieval, scientific integrity, security, persistence, import/export, PWA/offline, performance, tests, CI/CD, governance, release discipline, documentation, and developer experience

---

# 0. EXECUTIVE DIRECTIVE

Perform a **fresh, full-scale, critical audit of the current application and repository**, then **execute the audit findings autonomously** in the safest high-value order until the repository reaches a materially better, verified, production-ready state.

This is **not** a request for another passive report.

This is **not** permission to produce a giant unreviewable redesign.

This is an authorization to:

- inspect the current repository and current deployed application;
- use terminal, web, browser, console, network inspection, screenshots, and computer-use tools;
- implement code and documentation changes;
- create focused branches/commits/PRs;
- run and interpret tests;
- respond to review findings;
- push correction waves;
- wait/poll for CI where appropriate;
- continue with independent work while external checks run;
- converge PRs according to repository policy;
- merge through the normal, non-bypass path when the repository's dual merge gate is genuinely satisfied and the session's permissions support it;
- perform post-merge verification and housekeeping;
- move directly into the next justified audit/remediation slice without repeatedly asking the user whether to continue.

The objective is **completion**, not conversational checkpoints.

---

# 1. AUTONOMY CONTRACT — DO NOT KEEP STOPPING FOR CONFIRMATION

The user explicitly wants sustained autonomous execution.

## 1.1 Standing authorization

Treat this prompt as standing authorization for all ordinary, reversible, repository-scoped work necessary to complete the mission, including:

- read-only investigation;
- local edits;
- tests;
- formatting;
- builds;
- screenshots;
- browser QA;
- documentation updates;
- focused refactors;
- adding regression tests;
- creating branches;
- creating commits through normal hooks;
- pushing branches;
- opening PRs;
- updating PR descriptions;
- replying to review comments;
- resolving review threads after valid disposition;
- requesting/re-requesting ordinary review bots according to repo policy;
- polling GitHub Actions;
- reading CI logs;
- performing one consolidated correction wave when practical;
- performing normal, policy-compliant merge operations after the exact latest head satisfies both CI and review-quiescence requirements;
- post-merge production verification;
- cleanup of stale superseded branches/PRs where repository policy and available permissions permit.

**Do not ask "Should I continue?", "Would you like me to implement this?", "May I open the PR?", "Should I run the tests?", or equivalent routine questions.**

If the work is authorized by this mission, perform it.

## 1.2 Keep working while external systems are pending

Do not sit idle merely because one CI run, reviewer, deploy, or rate-limit window is pending.

When safe and consistent with the repo's anti-stacking rules:

- inspect logs already available;
- prepare the next independent analysis;
- update evidence;
- run local focused checks;
- review related code;
- prepare but do not prematurely push conflicting follow-up work;
- collect all reviewer findings before making a correction wave;
- perform documentation or housekeeping that cannot invalidate the PR head;
- poll the external condition later.

Do not create risky stacks against an unstable `main` if repository policy advises a green-main checkpoint after high-risk work.

## 1.3 Stop only for a real blocker

Pause and ask the user only when **all** reasonable autonomous work is exhausted and one of these is true:

1. a required secret/credential is unavailable and cannot be substituted safely;
2. an external service requires an interactive human login/approval that the agent cannot perform;
3. a destructive or irreversible action has no standing authorization and materially changes user data, billing, or public production state;
4. required permissions are absent and there is no legitimate non-bypass route;
5. two authoritative repository policies genuinely conflict and no safe interpretation exists;
6. the choice would create a material product/business commitment not inferable from repository intent;
7. a legal/licensing issue requires a maintainer decision.

Even then:

- complete all non-blocked work first;
- prepare the concrete proposed action;
- collect exact evidence;
- make the user approve a reviewable final decision, not a vague plan.

## 1.4 No policy bypasses for convenience

Autonomy is **not** authorization to weaken quality.

Do not:

- push directly to `main` if project policy forbids it;
- use `--no-verify`;
- disable tests;
- lower coverage;
- add `continue-on-error` to a required job;
- delete failing tests merely to get green;
- suppress valid lint/a11y errors;
- use an admin/protection bypass merely to save time;
- force-push shared protected branches;
- merge while a latest-head `CHANGES_REQUESTED` review remains active;
- merge while required CI is red or stale;
- invent credentials;
- silently broaden CSP;
- silently expose user research to new external services.

---

# 2. THIS REPOSITORY IS MATURE — DO NOT REPEAT CLOSED AUDITS

The repository already contains substantial stabilization and audit work.

Before making changes, understand what has already shipped.

Relevant historical facts include:

- React 19 / TypeScript strict client-only PWA;
- Redux Toolkit + RTK Query;
- Dexie/IndexedDB local persistence;
- provider abstraction for Gemini, OpenAI, Anthropic, Ollama, and heuristic mode;
- lazy-loaded provider SDKs;
- deterministic non-AI fallback;
- PubMed and optional arXiv retrieval;
- corpus-bound scientific-integrity work;
- explicit `partial` status for cancelled/restored runs;
- demo-corpus quarantine;
- provider conformance testing;
- adversarial agent-eval fixtures;
- BM25+ relative ranking semantics;
- API-key vault hardening;
- custom-endpoint approval policy;
- export safety;
- migration tests;
- blocking E2E, cross-browser, axe, security, and PWA workflows;
- a major UI/UX user-journey wave completed in early September 2026;
- a dependency/toolchain/audit wave completed on 2026-10-01;
- release `v0.4.3`.

Historical prompts are **not open-ticket lists**.

Use:

- current `main`;
- current deployment;
- current tests;
- current CI;
- current GitHub control plane;
- current upstream provider documentation;

as truth.

If an older prompt says something is open but the code/closeout shows it shipped, do **not** redo it.

---

# 3. PHASE 0 — RE-ESTABLISH CURRENT TRUTH BEFORE EDITING

Do this immediately.

## 3.1 Git baseline

```bash
git status --short
git fetch origin --prune
git rev-parse HEAD
git rev-parse origin/main
git branch -vv
git log -40 --date=iso-strict --pretty=format:'%H%x09%ad%x09%s'
git tag --sort=-creatordate | head -30
git describe --tags --always --dirty
```

If local HEAD differs from current `origin/main`, do not audit stale code as current truth.

Create a clean working branch/worktree according to repo policy.

## 3.2 Toolchain baseline

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm list --depth=0
```

Record:

- Node;
- pnpm;
- package version;
- dependency resolution;
- lockfile state.

Do not perform opportunistic upgrades before the audit establishes need and risk.

## 3.3 GitHub control plane

Fetch current:

- open issues;
- open PRs;
- recent merged PRs;
- latest release;
- tags;
- rulesets;
- required status contexts;
- current Actions on latest `main`;
- deployments / GitHub Pages state where accessible.

Compare live values against:

- `docs/project-facts.json`;
- `docs/ci-branch-governance.md`;
- `docs/pr-merge-gate.md`;
- `CHANGELOG.md`;
- `docs/release-policy.md`.

Classify every difference as:

- expected drift;
- stale documentation;
- governance defect;
- historical artifact;
- real code defect;
- no action.

## 3.4 Production deployment baseline

Use the **real deployed GitHub Pages application**.

At minimum verify:

- HTTP availability;
- base path;
- app boot;
- console;
- network errors;
- service-worker registration;
- current release label / build SHA;
- first-run onboarding;
- returning-user route;
- basic Orchestrator path;
- mobile layout.

Do not rely solely on local dev.

## 3.5 Write a fresh audit artifact

Create a dated audit file under `docs/audits/`, for example:

```text
docs/audits/2026-10-02-full-scale-product-and-engineering-audit.md
```

Include:

- measured HEAD;
- production evidence;
- control-plane evidence;
- top findings;
- classifications;
- risk;
- proposed PR sequence;
- explicit "already fixed — do not redo" table;
- known unknowns.

Keep it updated as findings are resolved.

---

# 4. REQUIRED READING

Read before changing behavior:

1. `AGENTS.md`
2. `.github/copilot-instructions.md`
3. `.cursor/index.mdc`
4. all `.cursor/rules/*.mdc`
5. `SECURITY.md`
6. `CHANGELOG.md`
7. `docs/project-facts.json`
8. `docs/product-truth-matrix.md`
9. `docs/pr-merge-gate.md`
10. `docs/ci-branch-governance.md`
11. `docs/agent-execution-playbook.md`
12. `docs/release-policy.md`
13. `docs/adr/README.md`
14. ADRs relevant to any code you touch
15. `docs/audits/2026-09-03-closeout.md`
16. `docs/audits/2026-10-01-full-scale-baseline.md`
17. `docs/audits/2026-10-01-wave-closeout.md`

Also inspect recent commit/PR history directly.

---

# 5. CURRENT SNAPSHOT FROM THIS HANDOFF — VERIFY, DO NOT BLINDLY TRUST

At prompt creation, the observed repository state was approximately:

- latest `main` SHA observed: `d8da84b9dd8fa4a6a88af60fa05d1c814960cafc`;
- package version: `0.4.3`;
- current-main deploy succeeded;
- current-main Chromium E2E succeeded;
- Firefox E2E succeeded;
- WebKit E2E succeeded;
- mobile Chrome E2E succeeded;
- axe critical/serious smoke succeeded;
- PWA service-worker registration succeeded;
- CodeQL succeeded;
- `pnpm audit (high+)` succeeded;
- gitleaks succeeded;
- production build succeeded;
- GitHub Pages deployment succeeded;
- no open GitHub issues were observed;
- draft PRs #342 and #343 were still open even though closeout documentation indicated their changes were superseded by a landed consolidation;
- release `v0.4.3` existed;
- `v0.4.3` annotated tag pointed to `5ae99748d9de638d30b75e66f41c3a28fe6cf1eb`;
- `main` contained later commits after that tag.

Re-fetch all of this.

---

# 6. CURRENT HIGH-PRIORITY HYPOTHESES

These are the first things to prove or falsify.

Do not turn them into tickets blindly.

---

# 7. P1 — PROVIDER MODEL CATALOG DRIFT

This is a user-facing correctness issue.

At prompt creation, `src/services/providers/provider.ts` still contained curated suggestions approximately like:

### Gemini

- `gemini-2.5-flash`
- `gemini-3-pro-preview`
- `gemini-2.5-pro`
- `gemini-2.0-flash`

Current official Google material at prompt creation indicated:

- `gemini-3-pro-preview` had shut down;
- `gemini-2.0-flash` had shut down;
- current Gemini 3.x Flash models were available;
- Google recommended newer Flash families for new projects.

A settings UI should not curate a known dead model.

### Anthropic

The repository still suggested values approximately like:

- `claude-sonnet-4-5`
- `claude-opus-4-1`
- `claude-haiku-4-5`

Current official Anthropic platform material at prompt creation indicated:

- Claude Opus 4.1 was retired;
- Claude Sonnet 4 was retired; Claude Sonnet 4.5 remained active;
- newer Sonnet/Opus families were available.

Again, a curated UI must not suggest retired IDs.

### OpenAI

The repository default/suggestions were still centered around older GPT-5/4.1/o-series identifiers.

Current official OpenAI API material at prompt creation documented newer GPT-6-family models.

**Do not blindly switch defaults to the newest/most expensive model.**

First verify:

- current provider adapter protocol;
- Chat Completions vs Responses compatibility;
- browser SDK behavior;
- JSON/structured-output behavior;
- streaming;
- reasoning parameters;
- cost;
- availability;
- free-text model support;
- user expectations.

## 7.1 Required design outcome

Replace "hardcoded forever" thinking with a small **model-catalog policy**.

A robust implementation may include:

```ts
interface ModelCatalogEntry {
  id: string;
  tier: 'recommended' | 'compatible' | 'legacy';
  status: 'active' | 'deprecated';
  verifiedAt: string;
  note?: string;
}
```

Exact schema is not prescribed.

Requirements:

- no known shutdown/retired model in recommended suggestions;
- defaults must be intentionally selected;
- free-text model IDs remain possible;
- curated catalog must have provenance/verification date;
- add tests preventing known-retired IDs from being reintroduced accidentally;
- where worthwhile, investigate provider model-list APIs;
- runtime discovery must be optional, cached, abortable, failure-tolerant, and must not become a settings boot dependency;
- Ollama model discovery should use its local tags endpoint rather than a stale global list where practical.

Document the policy.

---

# 8. P1 — INFERENCE/CAPABILITY STATE IS TOO COARSE FOR REMOTE AI + LOCAL AI + RETRIEVAL

Current architecture resolves broadly to:

```ts
type InferenceMode = 'live' | 'heuristic';
```

This was elegant for early Gemini-vs-local fallback behavior.

The product now has more dimensions:

- remote Gemini/OpenAI/Anthropic;
- local Ollama;
- deterministic heuristic engine;
- PubMed network retrieval;
- optional arXiv retrieval;
- already-local reports;
- local KB;
- custom endpoints.

`navigator.onLine` is not enough to describe these capabilities.

## 8.1 Prove the state matrix

Test at least:

| Selected inference | Internet | Provider reachable | Local report/corpus | Expected                                                         |
| ------------------ | -------: | -----------------: | ------------------: | ---------------------------------------------------------------- |
| Remote API         |      yes |                yes |              either | remote AI path                                                   |
| Remote API         |       no |                 no |                 yes | no remote AI; local functions remain                             |
| Ollama             |      yes |                yes |              either | local AI + online retrieval                                      |
| Ollama             |       no |                yes |                 yes | local AI may analyze local content; online retrieval unavailable |
| Ollama             |       no |                 no |                 yes | heuristic/local deterministic functions may remain               |
| Heuristic          |      yes |                n/a |              either | deterministic local inference + online retrieval if reachable    |
| Heuristic          |       no |                n/a |                 yes | deterministic local analysis, no external retrieval              |

Also test captive/partial connectivity.

## 8.2 Desired direction

Introduce a coherent capability model only as far as evidence requires.

Conceptually:

```ts
type ProviderReadiness = 'remote-ai-ready' | 'local-ai-ready' | 'heuristic-ready' | 'unavailable';

interface RetrievalReadiness {
  pubmed: 'reachable' | 'offline' | 'unknown';
  arxiv: 'reachable' | 'offline' | 'disabled' | 'unknown';
}

interface ResearchCapabilities {
  providerReadiness: ProviderReadiness;
  retrieval: RetrievalReadiness;
  canRunFullReview: boolean;
  canAnalyzeLocalContent: boolean;
  reason: string;
}
```

Do **not** build a giant state machine if a smaller primitive fixes the real mismatch.

Acceptance:

- provider badge;
- cost estimate;
- Orchestrator;
- Quick Research;
- report chat;
- local report analysis;
- Ollama health;
- offline messaging;

must tell a consistent story.

Never call local Ollama "offline mode" when PubMed/arXiv still require network access.

---

# 9. P1 — ORCHESTRATOR LOADING COPY IS NOT FULLY I18N/TRUTH-SAFE

Audit `src/components/OrchestratorView.tsx`.

At prompt creation, a `LEGACY_PHASE_DETAILS` block contained visible raw English.

The loading footer was also raw English.

Some strings used "AI" generically even when heuristic mode could be active.

Required remediation:

- every visible progress string through `t()`;
- EN+DE parity;
- no misleading "AI is..." during deterministic mode;
- use "research pipeline", "ranking", "selected provider", or mode-specific copy;
- preserve phase granularity;
- no "multi-agent swarm" language;
- keep debugger agent names conceptual;
- add tests for mode-appropriate progress copy.

---

# 10. P1 — NEXT UI/UX PASS SHOULD TARGET TASK-STATE COMPOSITION, NOT REDO SEPTEMBER

The September wave already addressed:

- onboarding activation;
- post-onboarding route;
- Home launchpad;
- progressive form disclosure;
- actionable empty states;
- desktop header;
- five-item mobile navigation;
- visual token cleanup;
- inference/provider status;
- Help naming;
- command palette entry;
- i18n splitting.

Do not redo those tickets.

## 10.1 Audit the Orchestrator as an explicit task-state flow

States:

1. Compose
2. Running
3. Streaming
4. Partial/cancelled
5. Complete unsaved
6. Complete saved
7. Error/recovery
8. Resume checkpoint

At prompt creation, the full `InputForm` remained mounted above all later states.

Investigate whether this causes:

- form-first hierarchy during report reading;
- unnecessary scroll;
- unclear "current brief" vs "edit new brief";
- confusing state during streaming;
- accidental input changes during a run.

### Desired UX

Consider:

- compact "Research brief" summary after submission;
- collapse/expand criteria;
- clear "Edit criteria";
- clear "New literature review";
- report becomes primary after generation;
- state transitions preserve focus and scroll;
- cancellation remains obvious;
- checkpoint restore remains obvious;
- no data/provenance hidden.

Do not make a huge redesign before testing the current behavior.

---

# 11. P1 — RELEASE/TRUTH RECONCILIATION

Audit:

- `v0.4.3` tag commit;
- current GitHub Release text;
- `CHANGELOG.md`;
- `package.json`;
- Help → About;
- build SHA;
- report provenance;
- JSON export metadata.

At prompt creation, `main` contained commits after the v0.4.3 tag, while the GitHub Release text referenced some later wave work.

Determine whether release notes describe changes absent from the tagged artifact.

If yes, fix release truth.

Prefer:

- edit release notes to accurately describe the tag;

unless actual user-facing fixes require a proper subsequent patch release.

Never move an existing semantic release tag to a new commit.

Evaluate signed-tag policy separately; do not impose it casually.

---

# 12. P1 — GITHUB RULESET DRIFT

At prompt creation, `mainrules` had:

```text
dismiss_stale_reviews_on_push = false
```

while repo docs expected true.

The required status list did not include:

```text
PWA service-worker registration
```

even though that workflow was green and described as blocking policy.

Re-fetch before mutation.

If permitted:

- preserve entire ruleset;
- set dismiss-stale to expected value;
- add the exact PWA check context;
- do not alter unrelated review counts or bypass actors;
- read back live config;
- update project-facts.

If 403:

- leave live protection intact;
- document exact maintainer action;
- continue the rest of the mission.

---

# 13. P1 — STALE SUPERSEDED PR HYGIENE

Re-check #342 and #343.

If their unique changes are fully present on `main`:

- post disposition;
- close as superseded;
- do not merge;
- ensure no review-only finding is lost.

Audit all other open PRs similarly.

---

# 14. P1 — ACCESSIBILITY COVERAGE SHOULD BECOME STATE-ORIENTED

Current automation is already substantial.

Do not replace it.

Expand high-value state coverage where missing.

Representative states:

- onboarding;
- Orchestrator compose;
- running;
- streaming;
- completed report;
- partial report;
- KB with content;
- Quick Research output;
- Authors;
- Journals;
- Collections;
- Dashboard with data;
- History with data;
- Settings tabs;
- command palette;
- modal/dialog;
- mobile More sheet.

Use seeded deterministic state.

Gate axe critical/serious.

Add keyboard/focus assertions around changed flows.

---

# 15. UI/UX FULL AUDIT

UI/UX is the first product priority.

Use browser/computer use, not code inspection alone.

For each primary surface:

- desktop screenshots;
- mobile screenshots;
- keyboard pass;
- console/network pass;
- light/dark/matrix spot checks where relevant;
- English/German spot checks.

## 15.1 Design target

The product should feel:

- calm;
- scientific;
- precise;
- modern;
- instrument-like;
- trustworthy;
- information-dense without clutter;
- polished without decorative excess.

Avoid:

- gratuitous neon;
- gratuitous glass;
- decorative animations;
- particle backgrounds;
- fake data-viz;
- giant hero marketing in task flows;
- low-contrast gray-on-gray;
- tiny touch targets;
- modal proliferation.

---

# 16. FIRST-RUN JOURNEY

Audit:

- comprehension in first 5–10 seconds;
- privacy truth;
- heuristic capability;
- external data-flow disclosure;
- primary CTA;
- sample topic;
- language;
- theme;
- focus;
- viewport fit;
- reduced motion;
- 200% zoom;
- 320/360/390px.

Do not re-hype copy previously made honest.

---

# 17. RETURNING-USER JOURNEY

Audit:

- landing destination;
- active provider state;
- last report;
- recent activity;
- KB status;
- settings dirty state;
- SW update state;
- command palette;
- quick path to new review.

---

# 18. INFORMATION ARCHITECTURE

Verify every view has a clear role:

- Home
- Literature review / Orchestrator
- Quick Research
- Knowledge Base
- Authors
- Journals
- Collections
- Dashboard
- History
- Settings
- Help

Questions:

- Do labels match Help?
- Does desktop nav match mobile?
- Is More curated?
- Are prerequisites explained?
- Are disabled/empty states useful?
- Do cross-links preserve context?
- Can users get back to their report?

---

# 19. RESEARCH INPUT UX

Audit:

- topic;
- presets;
- sample topics;
- date range;
- article types;
- max scan;
- top N;
- focus;
- arXiv;
- demo mode;
- validation;
- Cmd/Ctrl+Enter;
- draft restore;
- reset;
- prefill from previous report.

Keep progressive disclosure.

Do not remove legitimate control for the sake of minimalism.

---

# 20. RUNNING/STREAMING UX

Always make visible:

- mode/provider;
- retrieval source;
- phase;
- progress semantics;
- cancellation;
- whether demo corpus is involved;
- what happens after cancel;
- partial-report behavior.

Do not show fake percentages.

Do not imply independent agents are running unless they truly are.

---

# 21. REPORT UX

Audit:

- header hierarchy;
- research brief;
- completion/trust/demo banners;
- synthesis readability;
- claims;
- citations;
- identifiers;
- article ranking;
- chart;
- export;
- save;
- chat;
- new search;
- mobile;
- keyboard;
- long content.

Question whether all current accordion defaults are optimal.

Preserve source/trust visibility.

---

# 22. KNOWLEDGE BASE / COLLECTIONS / DASHBOARD / HISTORY

Audit:

- search;
- facets;
- tags;
- selection;
- bulk actions;
- dedup;
- filters;
- charts;
- tables;
- empty states;
- export;
- destructive actions;
- article detail;
- author/journal cross-links;
- collections;
- history restore.

Use virtualization where existing architecture supports it.

---

# 23. AUTHOR / JOURNAL HUBS

Audit:

- disambiguation;
- confidence;
- data provenance;
- corpus-derived metrics;
- no fake global metrics;
- search error recovery;
- linked articles;
- "start review" handoff;
- a11y of charts and tables.

---

# 24. SETTINGS UX

Audit every tab.

Particular focus:

- provider selection;
- model selection;
- model status;
- API key state;
- custom endpoint trust;
- Ollama health;
- inference-mode explanation;
- cost estimate;
- default research parameters;
- imports/exports;
- reset actions.

Settings should explain consequences before a user saves.

---

# 25. DESIGN SYSTEM AUDIT

Audit consistency of:

- typography;
- spacing;
- surface;
- border;
- shadows;
- status colors;
- inputs;
- buttons;
- toggles;
- selects;
- tabs;
- cards;
- banners;
- tooltips;
- menus;
- modals;
- charts;
- focus.

Keep Tailwind v4 token discipline.

No new `tailwind.config.js`.

No arbitrary repeated raw hex when a token exists.

---

# 26. AI PROVIDER ARCHITECTURE AUDIT

Review:

- `provider.ts`;
- `factory.ts`;
- Gemini adapter;
- OpenAI adapter;
- Anthropic adapter;
- Ollama adapter;
- heuristic adapter;
- `aiJson.ts`;
- `geminiService.ts`;
- `liveResearchReportStream.ts`;
- `literatureAiTools.ts`.

Verify:

- dynamic provider imports;
- cache reset;
- capability truth;
- error mapping;
- abort;
- timeouts;
- retry;
- rate limits;
- body caps;
- JSON parsing;
- structured output.

Views must not import vendor SDKs.

Keep the façade invariant from ADR 0008.

---

# 27. PROVIDER CAPABILITY MATRIX

For every provider, test:

| Capability      | Gemini | OpenAI | Anthropic | Ollama | Heuristic |
| --------------- | ------ | ------ | --------- | ------ | --------- |
| streaming       | verify | verify | verify    | verify | verify    |
| JSON object     | verify | verify | verify    | verify | false     |
| native schema   | verify | verify | verify    | verify | false     |
| web grounding   | verify | verify | verify    | verify | false     |
| chat            | verify | verify | verify    | verify | verify    |
| abort           | verify | verify | verify    | verify | verify    |
| custom base URL | verify | verify | verify    | verify | false     |
| key required    | verify | verify | verify    | false  | false     |

Do not infer from marketing docs.

Test adapter behavior.

---

# 28. LOCAL AI / OLLAMA

Local AI is a first-class path.

Test:

- localhost;
- 127.0.0.1;
- IPv6 loopback;
- health;
- tags;
- missing model;
- model pull guidance;
- server unavailable;
- CORS;
- malformed response;
- giant response;
- timeout;
- idle timeout;
- abort;
- chat;
- structured output.

UI must say:

- inference can be local;
- PubMed/arXiv are still external;
- custom endpoints may not be local;
- HTTP is only safe/permitted for loopback;
- CORS matters.

---

# 29. HEURISTIC ENGINE

Audit deterministic query, rank, synthesis, TL;DR, related-article, chat, author, and journal paths.

## Ranking truth

Preserve:

- BM25+;
- lexical not semantic;
- relative 0–100 display scale;
- stable ordering;
- deterministic behavior.

## Synthesis

Test:

- empty corpus;
- weak match;
- missing abstract;
- mixed source identifiers;
- German;
- long topic;
- partial retrieval.

Do not decorate heuristic output as generative AI.

---

# 30. SCIENTIFIC INTEGRITY

Never sacrifice epistemic honesty for polish.

Audit:

- source identifiers;
- corpus membership;
- grounded claims;
- citations;
- evidence;
- unsupported claims;
- trust levels;
- partial status;
- demo status;
- empty-retrieval state;
- generation provenance;
- exports.

Do not claim:

- "verified truth";
- "every sentence is grounded";
- heuristic is semantic AI;
- h-index is globally authoritative if it is corpus-derived.

---

# 31. AGENT / HEURISTIC EVALUATION

Maintain offline deterministic CI evals.

Add only high-signal cases.

Test:

- EN medical terms;
- DE lay terms;
- negation;
- numbers;
- units;
- dose drift;
- percentages;
- citation precision;
- recall;
- irrelevant citation;
- unsupported claims;
- prompt-injection strings;
- malformed JSON;
- rank order;
- tail relevance;
- ties;
- no result;
- empty claims.

Do not require paid LLM calls for blocking CI.

Optional live evals must be opt-in, bounded, documented.

---

# 32. RETRIEVAL — PUBMED / ARXIV

Audit:

- query generation;
- structural validation;
- ESearch;
- EFetch;
- ESummary;
- pagination;
- truncation;
- rate limit;
- API key;
- retry;
- `Retry-After`;
- abort;
- malformed response;
- missing abstracts;
- duplicate identifiers;
- PMCID;
- DOI;
- arXiv;
- merge/dedup;
- partial failure;
- zero results.

No scraping workaround.

---

# 33. SECURITY

Use `SECURITY.md` as baseline.

## API-key vault

Verify:

- AES-GCM;
- random 96-bit IV;
- non-extractable CryptoKey;
- transaction durability;
- multi-tab locking;
- legacy reset;
- provider slots;
- NCBI slot;
- redaction.

Important truth:

Encryption-at-rest does not make active same-origin XSS harmless.

Keep copy conservative.

Evaluate a session-only "do not persist this key" option only if it can be implemented cleanly.

## CSP

Audit:

- script hashes;
- `style-src`;
- image sources;
- font sources;
- connect sources;
- custom endpoints;
- service worker;
- JSON-LD.

Do not broaden to `*`.

## Rendering

Audit:

- DOMPurify;
- `marked`;
- `dangerouslySetInnerHTML`;
- Markdown;
- clipboard;
- exports.

---

# 34. PERSISTENCE / DEXIE

Audit:

- schema v7;
- migrations;
- settings;
- reports;
- KB;
- collections;
- presets;
- checkpoints;
- tags;
- poison records;
- multi-tab;
- transaction behavior;
- clear/reset;
- import/export.

New persisted state requires explicit schema discipline.

Do not store temporary UI state in Dexie.

---

# 35. IMPORT / EXPORT

Verify round trips for:

- full JSON;
- settings JSON;
- CSV;
- insights CSV;
- RIS;
- BibTeX;
- PDF.

Test:

- Unicode;
- German;
- long strings;
- partial watermark;
- demo watermark;
- formula injection;
- oversized imports;
- corrupt imports;
- legacy exports.

---

# 36. PWA / OFFLINE

Use production build and real base path.

Test:

- SW registration;
- scope;
- first install;
- controlled page;
- update;
- waiting worker;
- activation;
- reload;
- failure banner;
- offline shell;
- runtime caches;
- old cache cleanup;
- NCBI credential exclusion;
- 404 fallback;
- manifest;
- icons;
- standalone mode.

Test deployed Pages as well.

---

# 37. ACCESSIBILITY — WCAG 2.2 AA

Audit:

- landmarks;
- headings;
- names;
- labels;
- descriptions;
- errors;
- status/live region;
- dialogs;
- focus;
- skip;
- keyboard;
- menus;
- tabs;
- accordions;
- charts;
- tables;
- color;
- non-text contrast;
- zoom;
- reflow;
- target size;
- reduced motion;
- language.

Prefer native semantics.

No blanket eslint a11y disables.

---

# 38. PERFORMANCE

Run:

```bash
pnpm run build
pnpm run bundle:budget
pnpm run analyze
pnpm run test:lighthouse
```

Inspect chunks.

Provider SDKs must remain lazy.

Profile:

- onboarding;
- form;
- streaming;
- report with many articles;
- large KB;
- charts;
- settings.

Look for:

- rerenders;
- DOM bloat;
- slow lists;
- layout shift;
- hydration;
- sticky-jank;
- chart recalculation.

Consider mobile Lighthouse as advisory first.

---

# 39. ARCHITECTURE

Audit:

- file size;
- component ownership;
- hooks;
- selectors;
- services;
- contexts;
- Redux;
- facades;
- duplicated state;
- dead code;
- dead dependencies;
- stale config;
- circular imports.

Product files target 200–400 lines, hard max 700 per repo policy.

Do not refactor stable code with no measured benefit.

---

# 40. FEATURE COMPLETENESS MATRIX

Build a matrix for every meaningful feature:

| Feature | Works | Failure UX | Mobile | Keyboard | EN/DE | Persistence | Tests | Docs truthful |
| ------- | ----- | ---------- | ------ | -------- | ----- | ----------- | ----- | ------------- |

Include:

- Orchestrator;
- Quick Research;
- Gemini;
- OpenAI;
- Anthropic;
- Ollama;
- heuristic;
- PubMed;
- arXiv;
- streaming;
- cancel;
- checkpoint resume;
- report chat;
- TL;DR;
- related;
- online findings;
- authors;
- journals;
- collections;
- KB;
- dashboard;
- history;
- quick add;
- command palette;
- presets;
- settings;
- imports;
- exports;
- PWA;
- themes;
- i18n;
- Agent Debugger.

Use this to uncover "UI exists but path is incomplete" gaps.

---

# 41. INTERNATIONALIZATION

Run the repository's i18n ratchet.

Search visible string literals.

Priority:

- phase/progress;
- errors;
- aria labels;
- tooltips;
- health state;
- settings;
- export dialogs;
- mobile menus.

EN + DE parity.

Do not add new UI locales casually.

---

# 42. ERROR / RECOVERY UX

Test user-facing recovery for:

- no key;
- invalid key;
- revoked key;
- 401;
- 403;
- 429;
- 5xx;
- timeout;
- abort;
- malformed JSON;
- custom endpoint unapproved;
- CSP block;
- Ollama unavailable;
- model missing;
- PubMed rate limit;
- PubMed failure;
- arXiv failure;
- IndexedDB failure;
- vault reset;
- export failure;
- SW failure.

Every error should communicate:

- what failed;
- what remains safe;
- what the user can do;
- whether retry is useful;
- whether fallback is active.

---

# 43. TEST STRATEGY

## Unit/integration

Prioritize correctness branches, not vanity coverage.

## E2E

Use focused local specs.

Use GitHub CI as authoritative for full matrix.

Do not run a huge local browser matrix repeatedly unless Cloud capacity makes it sensible and repo policy allows it.

## Visual regression

Consider a small deterministic set:

- onboarding;
- Orchestrator compose;
- report header;
- AI settings;
- mobile nav.

Advisory before blocking unless baseline proves stable.

---

# 44. CI/CD AND GOVERNANCE

Audit workflows for:

- pinned actions;
- Node version;
- pnpm;
- caching;
- concurrency;
- cancellation;
- artifact retention;
- Pages;
- security;
- cross-browser;
- PWA;
- Lighthouse;
- Codecov;
- review bots.

Do not duplicate the same expensive check unnecessarily.

Keep required check names stable unless ruleset is updated atomically.

---

# 45. REVIEW BOT / PR CORRECTION LOOP

Follow repo rules exactly.

Important operating preference:

**Collect findings before pushing. Prefer one correction wave over a cascade of tiny bot-chasing commits.**

For each PR:

1. push;
2. let blocking CI run;
3. trigger required on-demand reviewers according to repo rules;
4. wait for reviewer arrival/quiescence;
5. collect inline threads **and full review bodies**;
6. classify every finding;
7. fix valid findings;
8. reply/defer with rationale;
9. resolve threads;
10. push a consolidated fix;
11. rerun reviewers required by policy;
12. re-evaluate exact latest head;
13. merge only when dual gate holds.

Do not treat "no unresolved threads" as proof that no body-only finding exists.

Do not treat a rate-limit placeholder as an approval.

Do not wait forever merely because a non-blocking reviewer is rate-limited if repo policy explicitly allows a documented terminal path.

---

# 46. PR SIZE / WORK SLICING

Do **not** implement this entire master prompt in one PR.

Suggested sequence after Phase 0, subject to evidence:

### Wave A — immediate product correctness

- model catalog currentness;
- phase-copy i18n/truth;
- capability-state defect if reproduced.

### Wave B — core workflow UX

- Orchestrator running/report state composition;
- report hierarchy improvements;
- narrow tests/screenshots.

### Wave C — Local AI / offline semantics

- Ollama capability/readiness;
- stored-content local AI;
- health/model discovery.

### Wave D — accessibility state coverage

- axe + keyboard high-value states.

### Wave E — scientific/heuristic eval depth

- only gaps confirmed by audit.

### Wave F — PWA/performance hardening

- production evidence-driven.

### Wave G — governance/release/control-plane

- stale PR closure;
- ruleset drift if authorized;
- release-truth correction.

### Wave H — lower-risk maintenance

- stale docs/dead config;
- dependency hygiene;
- optional refactors.

Reorder if a higher-severity bug appears.

---

# 47. BROWSER / COMPUTER-USE QA IS MANDATORY FOR USER-FACING CHANGES

Cursor Cloud Agents can interact with the app in a browser.

Use that capability.

For every user-facing PR produce artifact evidence:

- before screenshot when useful;
- after screenshot desktop;
- after screenshot mobile;
- console check;
- network check when relevant;
- short notes on keyboard;
- theme/locale spot check;
- if appropriate a short video.

Do not claim UI quality based only on JSX inspection.

---

# 48. VIEWPORT MATRIX

At minimum spot-check:

- 320 × 568
- 360 × 800
- 390 × 844
- 768 × 1024
- 1024 × 768
- 1280 × 800
- 1440 × 900

Also:

- 200% browser zoom;
- reduced motion;
- keyboard-only.

Use judgment; not every PR needs every viewport, but major chrome/flow changes do.

---

# 49. THEME MATRIX

Where changed UI uses color/surface tokens, check:

- dark;
- light;
- matrix.

Do not let Matrix-specific styling degrade normal themes.

---

# 50. NO FALSE "AI" LANGUAGE

Product truth rules:

- heuristic is deterministic;
- BM25+ is lexical;
- demo is demo;
- local Ollama is local model inference;
- PubMed/arXiv retrieval is external network;
- conceptual pipeline roles are not independent agents;
- AI summaries are not source abstracts;
- corpus support is not global truth verification.

Every new badge, tooltip, phase string, Help paragraph, README line, and PR description must preserve these distinctions.

---

# 51. DEPENDENCY STRATEGY

Do not perform "latest everything" as a reflex.

For each upgrade:

- why;
- security/correctness benefit;
- migration surface;
- official migration notes;
- bundle effect;
- test effect;
- rollback.

Provider SDKs deserve special scrutiny because browser bundles, transport behavior, and structured-output APIs can change.

Major upgrades go in isolated PRs.

---

# 52. OPENAI PROVIDER MODERNIZATION

Audit current OpenAI adapter.

Investigate, but do not assume, migration from current API style to newer recommended API patterns.

Questions:

- Is current Chat Completions API still appropriate for all supported models?
- Would Responses API materially improve structured output, reasoning, abort, or model compatibility?
- Can a migration preserve OpenAI-compatible custom endpoints such as OpenRouter?
- Would it break compatibility with arbitrary base URLs?

If architectural consequences are significant, write an ADR and stage migration.

Do not silently convert the OpenAI provider into an OpenAI-only implementation that breaks OpenAI-compatible endpoints.

---

# 53. ANTHROPIC PROVIDER MODERNIZATION

Verify current SDK, browser support, model IDs, token limits, abort, streaming, and JSON strategy.

Remove retired model suggestions.

Do not claim schema enforcement where only prompt-level JSON exists.

---

# 54. GEMINI PROVIDER MODERNIZATION

Verify current GenerateContent compatibility and current stable model default.

Remove shutdown IDs.

Check current thinking-budget assumptions against selected model generation.

Keep Gemini web-grounding semantics explicit.

Do not assume every new Gemini model supports identical tool/output features.

---

# 55. COST ESTIMATION

Audit CostEstimateCard.

Do not display stale provider/model pricing as authoritative unless pricing data has a source/date and a maintenance strategy.

Prefer:

- clear estimates;
- approximate labeling;
- model-specific only when verified;
- graceful "unknown" for free-text models.

Ollama/heuristic may be API-cost zero but not necessarily compute/energy zero.

Use precise wording.

---

# 56. PRIVACY / DATA FLOW UX

The app is local-first, not "nothing leaves your device."

Audit all user-visible privacy statements.

Make clear:

- IndexedDB stores local app state;
- selected provider receives prompts/context in live mode;
- PubMed/arXiv receive search requests;
- Ollama loopback can keep model inference local;
- custom endpoints receive whatever the configured path sends;
- API-key encryption protects at rest, not active XSS.

Keep wording concise.

---

# 57. OBSERVABILITY / AGENT DEBUGGER

Audit Agent Debugger and traces.

Verify:

- conceptual role labels;
- phase IDs;
- timestamps;
- no secrets;
- no raw prompts if unsafe;
- usefulness for diagnosing failures;
- clear distinction between logical phase and real process.

Consider exportable diagnostic metadata only if privacy-safe.

---

# 58. SERVICE WORKER CREDENTIAL SAFETY

Explicitly regression-test that URLs containing credential-like parameters are not cached.

Keep activate-time cleanup for legacy unsafe cache entries.

Test edge-case capitalization/parameter ordering if logic is string-based.

---

# 59. DATA LOSS / RESET SAFETY

Audit destructive controls:

- clear KB;
- reset settings;
- import replacement;
- clear vault;
- collections delete.

Requirements:

- appropriate confirmation;
- clear scope;
- no ambiguous "Reset";
- focus management;
- completion feedback;
- no accidental cross-domain deletion.

---

# 60. COMMAND PALETTE

Audit:

- search quality;
- keyboard;
- mobile access;
- disabled items;
- current view;
- dynamic routes;
- language;
- focus return;
- screen reader.

Do not re-add `cmdk` unless there is a real reason and an ADR-level decision.

---

# 61. DOCUMENTATION TRUTH

After each product PR, update only relevant docs.

Do not rewrite historical closeouts.

Current docs must match:

- provider defaults;
- supported models;
- capabilities;
- inference semantics;
- PWA;
- ruleset;
- release.

Add dated provenance for fast-aging facts.

---

# 62. RELEASE DISCIPLINE

Do not bump semver for every PR.

Follow `docs/release-policy.md`.

Before a named release:

- changelog;
- version;
- tag;
- release notes;
- production;
- build meta;
- provenance;
- rollback.

Release notes must describe tagged code.

---

# 63. SECURITY/SCIENTIFIC REVIEW PRIORITY

If a reviewer finds:

- secret leak;
- XSS;
- endpoint trust bypass;
- query/corpus mismatch;
- citation fabrication;
- partial report promoted to complete;
- demo/live contamination;
- abort failure causing wrong report completion;
- persistence corruption;

treat as high priority.

Do not defer these for visual polish.

---

# 64. DEFINITION OF "IMPROVE"

Do not create changes merely because they are different.

A change should improve one or more of:

- task completion;
- correctness;
- truthfulness;
- accessibility;
- recoverability;
- performance;
- security;
- maintainability;
- testability;
- clarity;
- scientific integrity.

If not, leave the code alone.

---

# 65. VALIDATION COMMANDS

Use repository scripts as source of truth.

Typical fast gate:

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test:run
```

When relevant:

```bash
pnpm run test:coverage
pnpm run check:coverage-floors
pnpm run check:agent-eval
pnpm run i18n:ratchet
pnpm run check:docs-drift
pnpm run check:csp-endpoint-drift
pnpm run check:log-redaction
pnpm run check:no-cdn-scripts
pnpm run build
pnpm run bundle:budget
pnpm run test:lighthouse
```

Use focused Playwright locally/cloud-side.

Final full browser matrix remains CI-authoritative unless the Cloud environment can run it safely.

---

# 66. TEST FAILURE POLICY

Never:

- skip a test without a documented real reason;
- loosen an assertion to hide a regression;
- retry-flake until green and call it fixed;
- mock away the behavior under test;
- change expected product truth to match broken behavior.

Diagnose root cause.

If a test is truly invalid, prove why and replace it with a better one.

---

# 67. SCREENSHOT / ARTIFACT POLICY

PRs changing UI should contain enough evidence for review.

Prefer:

- concise desktop before/after;
- concise mobile before/after;
- browser log status;
- exact test commands;
- no enormous artifact spam.

---

# 68. COMMIT POLICY

Use focused conventional-style messages.

Avoid 15 tiny "fix review" commits when one correction wave is possible.

Do not rewrite public merged history.

Hooks must run.

---

# 69. REVIEW DISPOSITION LEDGER

For non-trivial PRs maintain a simple disposition table in a PR comment or working note:

| Source | Finding | Valid? | Action | Commit |
| ------ | ------- | -----: | ------ | ------ |

Include body-only findings.

Do not declare quiescence until all items are disposed.

---

# 70. POST-MERGE GATE

After each important merge:

1. fetch `main`;
2. confirm merge commit/head;
3. verify required main CI;
4. verify Pages deploy;
5. open production;
6. smoke changed path;
7. inspect console;
8. perform branch/worktree cleanup where safe;
9. close/supersede related stale PRs/issues;
10. update audit closeout evidence.

Then continue autonomously to the next justified slice.

---

# 71. DO-NOT LIST

Do not:

1. redo September's already-closed UI tickets as if open;
2. add OpenRouter as a new first-class provider without revisiting ADR 0010;
3. call heuristic ranking semantic;
4. market conceptual phases as a multi-agent swarm;
5. add Chart.js;
6. re-add lucide-react casually;
7. add a backend merely to simplify client code;
8. add telemetry without explicit product decision and privacy design;
9. weaken CSP;
10. weaken sanitizer;
11. weaken coverage;
12. disable blocking workflows;
13. push secrets;
14. cache credential-bearing URLs;
15. mark partial reports complete;
16. silently use demo data as live retrieval;
17. scrape PubMed;
18. invent citation evidence;
19. replace source abstracts with AI summaries without labeling;
20. add persistent flags without migration discipline;
21. replace Redux with another global state library;
22. duplicate Redux state in Context;
23. refactor stable façades without need;
24. perform a giant dependency mega-upgrade;
25. create giant unreviewable UI PRs;
26. hardcode new English UI text;
27. forget German parity;
28. stop every few minutes asking whether to continue.

---

# 72. WHAT "DONE" MEANS FOR THIS ENGAGEMENT

This engagement is not done merely because one PR merged.

It is done when:

## Product

- primary first-run and returning-user journeys are coherent;
- Orchestrator task-state UX is materially improved where evidence supported it;
- model/provider UI no longer recommends known retired/shutdown models;
- Local AI semantics are honest;
- heuristic semantics are honest;
- critical feature paths have usable recovery.

## Accessibility

- representative states have automated coverage;
- changed flows are keyboard-usable;
- axe critical/serious is clean;
- mobile and zoom remain functional.

## AI / research

- provider capabilities match runtime;
- model catalog is maintainable;
- current Local AI behavior is validated;
- heuristic evals cover meaningful residual risks;
- scientific trust invariants remain intact.

## Engineering

- unit/integration gates green;
- coverage gates green;
- build green;
- bundle budget green;
- focused E2E green;
- final PR heads have required CI;
- review quiescence is real.

## PWA/security

- service worker still works;
- CSP endpoint contract still works;
- secrets stay redacted;
- no new high advisory;
- production smoke passes.

## Governance

- stale PRs are disposed;
- ruleset drift is fixed if permissions permit or documented precisely if not;
- release truth is reconciled.

## Documentation

- current docs reflect current behavior;
- audit closeout records exact merged SHAs and residual debt.

---

# 73. CLOSEOUT ARTIFACT

At the end create:

```text
docs/audits/2026-10-02-full-scale-audit-closeout.md
```

or the actual current date.

Include:

- starting SHA;
- final main SHA;
- every merged PR;
- every finding;
- status;
- production evidence;
- remaining blockers;
- ruleset state;
- release state;
- provider/model catalog state;
- test/CI state;
- screenshots/artifact pointers;
- residual risks;
- explicit "next goal should not repeat" section.

No ceremonial "all perfect" claim.

Be precise about what remains.

---

# 74. PRIORITIZATION ALGORITHM

When deciding what to do next, use this order:

1. P0 security/data loss/scientific-integrity/production outage
2. P1 user-facing correctness
3. P1 workflow blocker
4. P1 accessibility blocker
5. P1 Local AI / provider correctness
6. P1 persistence/export correctness
7. P1 governance gap affecting merge safety
8. major UI/UX friction in primary journey
9. performance problems with measured impact
10. maintainability debt blocking future work
11. dependency modernization with material benefit
12. documentation drift
13. nice-to-have visual polish

Do not allow minor polish to preempt correctness.

---

# 75. DECISION RULE FOR REFACTOR VS FIX

Prefer a targeted fix when:

- one component is wrong;
- no cross-cutting state invariant changes;
- tests can lock behavior.

Prefer a refactor when:

- multiple views disagree on the same capability state;
- duplicated logic already caused drift;
- current abstraction cannot express real product behavior;
- adding another conditional would deepen inconsistency.

Document why.

---

# 76. PRODUCT NORTH STAR

> **AI Research Orchestrator should feel like a trustworthy scientific research instrument: fast to understand, honest about inference and evidence, useful with or without cloud AI, excellent with Local AI, resilient when external systems fail, accessible on desktop and mobile, and technically disciplined enough that every visible claim can be traced back to actual runtime behavior.**

---

# 77. EXECUTION NORTH STAR

> **Do the work. Verify it. Review it. Converge it. Merge it through the proper gate. Verify production. Continue to the next justified finding. Do not repeatedly stop to ask permission for routine authorized steps.**

---

# 78. FIRST CONCRETE ACTIONS

Start now.

1. Establish current HEAD and live deployment.
2. Read repo policies.
3. Inspect current open PRs/issues and ruleset.
4. Run fast baseline gates.
5. Browser-audit production.
6. Revalidate current model catalogs against official provider docs.
7. Reproduce or falsify P1 capability-state concerns.
8. Audit raw Orchestrator phase copy.
9. Write the fresh audit baseline.
10. Open the **smallest highest-value P1 PR**.
11. Continue autonomously through review/CI/merge/post-merge verification.
12. Move to the next verified priority without waiting for another user prompt.

---

# 79. FINAL REMINDER

This prompt grants broad execution latitude but **not** license to bypass repository safety.

Be aggressive about:

- truth;
- evidence;
- completion;
- autonomous follow-through;
- user experience;
- scientific integrity;
- test quality;
- accessibility;
- provider correctness;
- Local AI quality;
- maintainability.

Be conservative about:

- destructive actions;
- secrets;
- branch protection;
- data migrations;
- release identity;
- external data flow;
- security policy;
- unsupported scientific claims.

Keep moving until the mission is actually complete or a genuine external blocker makes further progress impossible.

**Begin with Phase 0. Do not wait for another confirmation.**
