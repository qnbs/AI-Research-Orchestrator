# Cursor Cloud Agent / Grok 4.6 — Full-Scale Audit, Correction & Perfection Master Prompt

**Product:** AI Research Orchestrator (`qnbs/AI-Research-Orchestrator`)  
**Live app:** https://qnbs.github.io/AI-Research-Orchestrator/  
**Repo:** https://github.com/qnbs/AI-Research-Orchestrator  
**Prompt date:** 2026-09-03 (late wave, after 20:32 UTC)  
**Named release on `main`:** `v0.4.2` (do **not** cut `v0.4.3` as ceremony)  
**Audience:** Cursor Cloud Agent running **Grok 4.6** in this repository  
**Language of all commits, PRs, docs, comments, CI text:** English only (rule `010`)  
**UI strings:** English + German keys via `t()`; no FR/ES locales

This prompt is the **authoritative next-wave execution brief**. It supersedes earlier prompt _lists of open work_ for what to do next, but it does **not** erase evidence:

| Document                                                                    | Role                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `docs/audits/2026-09-02-closeout.md`                                        | Integrity stop-the-line (partial reports, watermarks, BM25+ honesty, export caps) |
| `docs/audits/2026-09-03-baseline.md` + `docs/audits/2026-09-03-closeout.md` | UI/UX journey wave — **executed**                                                 |
| `docs/prompts/2026-09-03-cursor-grok-uiux-perfection-master-prompt.md`      | Journey wave prompt — **executed**, do not re-run as if open                      |
| `docs/product-truth-matrix.md`                                              | Allowed vs forbidden product claims                                               |
| `AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules/*.mdc`       | Standing engineering law                                                          |
| `docs/adr/README.md` (0001–0021)                                            | Architecture law                                                                  |
| `docs/ci-branch-governance.md` + `docs/project-facts.json`                  | CI / drift-gated facts                                                            |
| `SECURITY.md`                                                               | Threat model                                                                      |
| `CHANGELOG.md` Unreleased                                                   | What already landed on `main` after v0.4.2 tag                                    |

**External review snapshot that commissioned this prompt** (2026-09-03 late CEST):

- Latest measured `main` SHA at prompt authoring: `0b9c59986d63800c49c73c12121ea01b6a2b55ce`  
  (`fix(ui): Copilot follow-up for More sheet and Ollama model fallback (#297)`).
- Named product version: `0.4.2`. Dexie schema version: **7**. Service-worker cache version: `v1`.
- Open GitHub issues: **none**. Open PRs at authoring: treat live GitHub as source of truth.
- Stars/forks: small public repo; quality bar is production-grade anyway.
- The app is already a serious client-only biomedical literature PWA. This wave is **not** a greenfield rewrite and **not** a second integrity redesign. It is a **full-scale residual audit + targeted perfection** of remaining UX, local-AI, heuristic honesty, a11y, i18n quality, file-size, PWA, and feature depth — after two closed audit waves.

**North star for this wave**

A first-time researcher can open the GitHub Pages demo with **no API key**, understand that heuristic mode is a real deterministic engine (not a broken AI), run a literature review against live PubMed (when online), receive a **honestly labeled** cited synthesis, save it locally, export it, and — if they later attach Gemini / OpenAI / Anthropic / loopback Ollama — get a higher-fidelity live run **without** the product ever claiming swarm-agents, sentence-level PMID proof, or “heuristic = Gemini”.

---

## 0. Non-negotiable operating rules

### 0.1 Evidence over memory

1. `git fetch origin` and inspect **live `origin/main`**. Record SHA, date, and last 15 commit subjects before writing a single line of product code.
2. Live `main` + green CI + tests beat every earlier prompt, audit table, and this document if they disagree.
3. Treat `docs/I18N-AUDIT.md` and any audit older than 2026-09-03 as **suspect until re-verified**. The 2026-09-03 journey wave split `onboardingTranslations.ts` / `journeyTranslations.ts` and rewired chrome. Do not “fix” hardcoded Onboarding/Help strings that already use `t()`.
4. Do not reopen closed ticket IDs. Historical `NOW-*` from 2026-08-02 through 2026-09-03 journey P0/P1 are **closed** unless a regression is proven on live `main`.

### 0.2 Branching, PRs, bots

- Never push to `main`. One concern per PR. Conventional Commits. English PR body.
- Target `main`. Keep diffs reviewable. Split if a PR exceeds ~400 changed lines of product code without a documented reason.
- Resolve **all** review-bot comments (CodeRabbit, CodeAnt, Copilot, DeepSource, Greptile, CodeScene) including nitpicks and out-of-diff items. CI green on **latest head**.
- Always comment `@deepsourcebot review` on open and after every fix push.
- CodeRabbit: a **Review rate limited** placeholder is not a completed review **and is not a hard merge blocker** (`011` clause **(d)**; `docs/pr-merge-gate.md`). Best-effort `@coderabbitai review`; do not wait 3 cycles / 90 minutes solely for rate-limit; do not invent diffs to summon a review. A `CHANGES_REQUESTED` review on the **latest** head is never waived. Record **(d)** in the disposition comment when merging without a real CodeRabbit review on this head.
- Sourcery: if the 7-day review budget is exhausted, **do not** `@sourcery-ai review`. Note it in the PR.
- Always reply and resolve threads. Do not use `--admin` / skip-review as default. GitHub `BLOCKED` from a **superseded** `CHANGES_REQUESTED` (dismiss-stale off) is a ruleset artifact: dismiss if allowed; `--admin` squash is the documented 403 path only.
- Do **not** enable “require code owner reviews” on the `mainrules` ruleset (solo maintainer).
- Process Dependabot PRs individually (rule `012`). Never bulk-close. Record disposition in `docs/dependabot-disposition.md`.

### 0.3 Hard do-nots (copy these into every PR description)

Do **not**:

1. Implement first-class OpenRouter (`NOW-P2-OPENROUTER` / ADR 0010 **Deferred**). OpenRouter stays `openai` + custom base URL.
2. Cut ceremonial `v0.4.3`. Named release remains `v0.4.2` unless the human maintainer explicitly asks for a tagged release after this wave.
3. Re-split `geminiService.ts` or the export façade (`exportService.ts` is the public import; writers already live in `exportPdf.ts` / `exportCsv.ts` / `exportText.ts`).
4. Change claim-matcher **2.3.0** semantics, or treat matcher labels as model truth.
5. Equate heuristic BM25+/templates with live Gemini / GPT / Claude embeddings or “semantic rank”.
6. Mark cancelled or restored runs `'done'`. They stay `'partial'` (ADR **0021**). Keep watermarks and chat gating.
7. Silently substitute the educational demo corpus for failed live retrieval (ADR **0016**).
8. Claim AES-GCM vault storage is XSS protection. Keys in the browser are game-over under XSS.
9. Put secrets in `VITE_*`. Commit no API keys.
10. Reinstall `lucide-react`. Recreate `ParticleBackground.tsx`. Re-add Chart.js. Reintroduce a CDN import map (ADR **0011**).
11. Use `connect-src *`. Custom endpoints follow ADR **0013** origin approval + CSP coherence.
12. Invent an application backend, user accounts, or server-side research store.
13. Scrape NCBI / violate E-utilities rate limits. No ToS workarounds.
14. Add FR/ES locales. Write German commits or German docs (DE UI values in `src/i18n/*` only).
15. Use forbidden product phrases: “swarm of specialized AI agents”, “AI agents conduct the review”, “Future of Research” as product name, “zero-knowledge”, “every AI assertion is inextricably linked to a verified PubMed ID”, “nothing ever leaves the device” (live mode **does** send prompts/metadata to the chosen provider and queries to PubMed/arXiv).
16. Lower `pnpm audit --audit-level=high`. Ignore high/critical production advisories. Disable ESLint jsx-a11y with blanket file ignores.
17. Comment out or delete tests to pass CI. Add `continue-on-error` to blocking workflows.
18. Bump Dexie schema without an explicit version + migration + CHANGELOG note.
19. Do not retry `AbortError`. Do not log secrets, stack traces, or raw provider payloads in production UI.
20. Treat this prompt as permission to rewrite Settings, the provider factory, or the matcher “while you are in there”.

### 0.4 Engineering law (standing)

- TypeScript 6 strict. Functional components + hooks only. No `any` unless unavoidable and justified.
- File size: target 200–400 lines, **hard max 700** (rule `200`). Split _before_ editing a file that would cross the cap.
- Redux Toolkit is the source of truth. Contexts hydrate/compose only. Never duplicate flags.
- Sanitize HTML/Markdown with DOMPurify. No new `dangerouslySetInnerHTML` outside reviewed patterns. Prompt fragments through `lib/promptSanitize.ts`. CSV is formula-injection-safe.
- Charts: Recharts only (ADR 0005). Accessible table twins already exist for the main chart surfaces — extend the pattern if you add a chart; do not invent a second chart library.
- New UI text: EN + DE keys, rendered with `t()`. Structural i18n ratchet must stay green (`pnpm run i18n:ratchet`).
- New persisted fields: Dexie version bump + migration in `databaseService.ts`.
- New external call path: happy path + failure + abort tests (rule `102`).
- Accessibility: WCAG 2.2 AA. `prefers-reduced-motion`. Visible focus. ≥44px touch targets on mobile chrome. No color-only status.
- Bundle budgets: chunk ≤200 kB gzip, entry ≤400 kB, charts ≤180 kB.
- Coverage floors: logic layers 80/80/55/55; never lower a ratchet in `docs/project-facts.json` without evidence.

---

## 1. Phase 0 — Baseline (mandatory, evidence-first, no product rewrite)

Create branch `audit/2026-09-03-late-baseline` **or** write the baseline file on the first implementation branch. Prefer a short docs-only PR if the working tree is dirty.

### 1.1 Capture

```bash
git fetch origin
git rev-parse origin/main
git log origin/main -15 --oneline --decorate
git status
```

Record in `docs/audits/2026-09-03-late-baseline.md`:

- SHA of `origin/main` (do not copy `0b9c599` if `main` has moved).
- Package version, Dexie schema version, SW cache version from live files + `docs/project-facts.json`.
- Whether GitHub Pages commit metadata matches `main`.
- Open PRs / Dependabot PRs / code-scanning alerts (GitHub UI or `gh`).
- File-size table for every `src/**/*.{ts,tsx}` **≥500 lines**. Known hot files at prompt authoring (re-measure):

  | Path (authoring snapshot)                               | Why it matters                            |
  | ------------------------------------------------------- | ----------------------------------------- |
  | `src/components/ReportDisplay.tsx`                      | Near cap (~641 historically)              |
  | `src/components/CollectionsView.tsx`                    | Large view                                |
  | `src/components/ArticleDetailPanel.tsx`                 | Large panel                               |
  | `src/components/Header.tsx`                             | Chrome; already split helpers             |
  | `src/components/InputForm.tsx` + `InputFormOptions.tsx` | Journey wave split — verify current sizes |
  | `src/app/useResearchSession.ts`                         | Session brain                             |
  | `src/i18n/translations.ts` (+ domain modules)           | Ratchet + 700-line rule                   |

- Confirmation that 2026-09-03 journey tickets are **closed on main**, with residual UX debt from that closeout listed as _new_ tickets (section 2).
- A one-page **product-truth** check: grep the live tree for forbidden phrases (use the same list as `docs/project-facts.json` `forbiddenReadmePhrases` plus the matrix in `docs/product-truth-matrix.md`).
- Ollama / heuristic / provider inventory from live code, not from memory:

  Providers on `main` (authoring): `gemini`, `openai`, `anthropic`, `ollama`, `heuristic`.  
  Defaults (authoring `project-facts.json`): Gemini `gemini-2.5-flash`, OpenAI `gpt-5`, Anthropic `claude-sonnet-4-5`, Ollama `llama3.1:8b`, heuristic `local`.

### 1.2 Read before coding (in order)

1. `.github/copilot-instructions.md`
2. `.cursor/index.mdc` and `.cursor/rules/*.mdc`
3. `AGENTS.md`
4. `docs/adr/README.md` then any ADR you will touch (especially 0003, 0008, 0009, 0010, 0012, 0013, 0016, 0018, 0019, 0021)
5. `docs/product-truth-matrix.md`
6. `docs/audits/2026-09-02-closeout.md` and `docs/audits/2026-09-03-closeout.md`
7. `SECURITY.md`, `CHANGELOG.md` Unreleased
8. `docs/ci-branch-governance.md`, `docs/audit-governance.md`, `docs/project-facts.json`

### 1.3 Phase 0 exit

- Baseline file merged or sitting on the first feature branch with SHA recorded.
- No product behavior change in Phase 0 except fixing a **docs-drift CI failure** you yourself introduced.

---

## 2. External critical evaluation (starting hypotheses — verify)

These are hypotheses from the 2026-09-03 late external audit. **Promote to tickets only after Phase 0 proves they are still true on live `main`.**

### 2.1 What is already strong (do not “improve” by rewriting)

- Client-only PWA with no research backend; IndexedDB/Dexie v7; AES-GCM key vault.
- Multi-provider transport (`src/services/providers/`) with lazy SDK chunks and a stable façade (`geminiService.ts`).
- Deterministic non-AI engine (`src/services/nonAi/`) so the app never dead-ends without a key (ADR 0007/0009).
- Inference mode resolution (`live | heuristic`) from key + `navigator.onLine` + Force-Heuristic.
- Partial-report integrity (ADR 0021): `'partial'`, banner, export watermark, chat gated.
- Corpus/claim terminology (ADR 0012/0015/0018): corpus-supported / claim-supported vs unverified narrative draft.
- Demo quarantine (ADR 0016): labeled educational fixtures; no silent swap.
- Ollama first-class loopback path (ADR 0019) with recent #297 hydration/status fixes.
- Export formats JSON/CSV/RIS/BibTeX/PDF with façade split.
- Blocking CI: typecheck, lint zero-warning, coverage floors, bundle budget, CSP hash patch, no-CDN gate, docs-drift, Lighthouse assertions, Playwright Chromium + cross-browser + axe.
- 2026-09-03 journey: onboarding activation, Literature review vs Quick research, Home launchpad, progressive disclosure form, empty-state teaching, header IA, 5-item bottom nav + More sheet, `ProviderStatusLine`.

### 2.2 Product risks that remain standing (not tickets unless regressing)

| Risk                                           | Correct posture                                                 |
| ---------------------------------------------- | --------------------------------------------------------------- |
| XSS vs client-held keys                        | Disclose; harden CSP and sanitize; never claim vault = XSS-safe |
| NCBI traffic from the user’s IP                | Honest Settings copy; backoff; optional NCBI key                |
| Heuristic rank is relative BM25+ display scale | Keep `relevanceScale` honesty; never call it model-semantic     |
| Claim matcher labels claims                    | Do not advertise “verified literature”                          |
| Custom OpenAI-compatible endpoints             | ADR 0013 approval + CSP; no wildcard                            |
| Remote LAN Ollama                              | Not first-class; needs tailored CSP / self-host build           |
| Scientometric H-index / author clusters        | Assistive estimates from _this corpus_, not official metrics    |
| PubMed free full text ≠ every OA definition    | Keep the disclaimer                                             |

### 2.3 Residual UX debt called out by the 2026-09-03 closeout

Promote these if still visible:

| ID                  | Finding                                                                             | Acceptance sketch                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOW-P1-DENSITY-01` | **Shipped in #299** — desktop header is a single row from `md`. Do not reimplement. | Already accepted: primary destinations remain; overflow still works. Next agent starts at `NOW-P1-MOBILE-360`.                                                |
| `NOW-P1-MOBILE-360` | Bottom-nav labels truncate on ~360px viewports                                      | Five items fit without horizontal scroll; full name in `title` + accessible name; no 10px font hacks                                                          |
| `NOW-P1-THEME-QA`   | Light + matrix themes need a **manual** PR visual checklist                         | Checklist in PR template or `CONTRIBUTING.md`; do **not** add a screenshot suite to CI                                                                        |
| `NOW-P2-CMDK-TEACH` | Command palette teaching on mobile is only a More-menu row                          | One extra honest affordance (e.g. Help row or empty-state hint). **No first-run coachmark modal** unless Phase 0 proves onboarding still fails keyboard users |
| `NOW-P2-TOPICS`     | GitHub topic `multi-agent-systems` fights product-truth copy                        | Remove or replace the topic if the maintainer token allows; otherwise document “left in place” in closeout. Not a code blocker                                |

### 2.4 Likely quality gaps (verify; do not assume the stale I18N audit)

| Area                      | Hypothesis                                                                                                                              | How to verify                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| i18n quality              | DE strings exist structurally but some may still be English clones, mixed formality, or “Heuristic” vs “Heuristik” drift                | Diff EN/DE values; sample Onboarding, Help, Settings, status line, empty states in `de` |
| Help / glossary           | Journey labels landed; Help may still say “Orchestrator” in one place and “Literature review” in another                                | Read `HelpView.tsx` + help translation modules against the matrix                       |
| Ollama Settings           | Health `/api/version`, `/api/tags` TTL cache, model-missing / small-model warnings, CORS teaching, “PubMed still uses the network” note | Walk `src/services/providers/ollama.ts` + Settings AI cards                             |
| Heuristic synthesis       | Templates may be generic; German query tokens should already hit adversarial eval — check live quality on a DE topic                    | Run `pnpm run check:agent-eval`; read `src/services/nonAi/`                             |
| Provider capability flags | Streaming / JSON schema / web-grounding must stay capability-gated (ADR 0014). Gemini-only grounding must stay labeled                  | Grep UI for grounding copy; confirm non-Gemini paths do not promise Search grounding    |
| Chart a11y                | Tables exist on main surfaces; any new or leftover chart without `ChartAccessibleTable` is a defect                                     | Grep Recharts usages                                                                    |
| File-size                 | Several views still ≥500 lines                                                                                                          | Measure; split only files you must edit that sit ≥650 or will cross 700                 |
| PWA                       | SW registration-failed banner exists; offline heuristic still needs network for PubMed                                                  | Confirm `OfflineBanner` + Help copy; do not fake offline PubMed                         |
| Focus / More sheet        | #297 fixed setState-in-render / focus restore — watch for regressions                                                                   | Add/keep unit tests; keyboard E2E already blocking                                      |
| Contrast                  | `check:contrast` + `border-border` tokens; light/matrix may still fail on glass overlays                                                | Run `pnpm run check:contrast`; spot-check light and matrix                              |

---

## 3. Ticket catalog for this wave

Use **new IDs**. Do not recycle closed `NOW-P0-JOURNEY-*` IDs.

Priority law: **P0 regressions and integrity > P1 user-visible residual UX > P2 local-AI/heuristic craft > P3 chore**.  
Never start P2 while a proven P0 integrity regression is open.

### 3.1 P0 — Stop-the-line only if Phase 0 finds a regression

| ID                            | Trigger                                                                                                                                  | Action                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `NOW-P0-INTEGRITY-REGRESSION` | Partial run saved as `'done'`, watermark missing, chat unlocked on partial, demo silently used as live, forbidden phrase in product copy | Fix immediately; add/extend a test; do not expand scope |
| `NOW-P0-A11Y-BLOCKER`         | Axe critical/serious on a shipped view, missing skip link, keyboard trap in More sheet, contrast fail on primary CTA                     | Fix; keep `a11y.yml` blocking                           |
| `NOW-P0-CI-RED`               | `main` or your branch red on typecheck/lint/coverage/docs-drift/audit-high                                                               | Fix first                                               |

If Phase 0 finds **no** P0, write that explicitly and skip to P1. Do not invent a P0.

### 3.2 P1 — Residual UX & visual QA (one concern per PR)

| ID                     | Scope                                                                           | Must / must not                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOW-P1-DENSITY-01`    | Desktop header density at 1280px — **shipped in #299**                          | Do not reimplement. Must keep primary destinations. Must not hide Knowledge Base. Must honor reduced-motion                                   |
| `NOW-P1-MOBILE-360`    | 360px bottom nav                                                                | Must keep five items + More. Must not drop accessible names. Must restore focus per #297                                                      |
| `NOW-P1-THEME-QA`      | Light + default + matrix token pass on surfaces touched this wave               | Must use `@theme` tokens (`border-border`, existing surfaces). Must not introduce raw hex except inside the token file. Manual checklist only |
| `NOW-P1-I18N-TRUTH`    | DE parity **quality** on journey + chrome + provider line + empty states        | Must not add locales. Must not rewrite every DE string. Fix clones, broken interpolations, and glossary drift                                 |
| `NOW-P1-HELP-GLOSSARY` | Help / FAQ / glossary vs Literature review / Quick research / heuristic honesty | Must match `docs/product-truth-matrix.md`. Must stay `t()`                                                                                    |

### 3.3 P2 — Local AI, heuristic craft, provider honesty, feature depth

Work these only after P1 user-visible residuals are done or explicitly deferred with evidence.

#### Local AI (Ollama) — ADR 0019, do not invent remote LAN support

| ID                      | Intent                                                                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOW-P2-OLLAMA-DIAG`    | Settings diagnostics complete: health, discovered models, selected-model existence, small-model warning, CORS / blocked-loopback teaching, timeout vs unavailable distinction |
| `NOW-P2-OLLAMA-PRIVACY` | Persistent honest note: local generation does **not** make PubMed/arXiv local; retrieval still leaves the device                                                              |
| `NOW-P2-OLLAMA-BUDGET`  | Prompt-input budget derived from model size hints already in code — verify and tighten warnings; do not silently truncate without UI                                          |
| `NOW-P2-OLLAMA-STATUS`  | `ProviderStatusLine` must ignore foreign cloud default model names after Ollama hydration (#297). Add a regression test if missing                                            |

Heuristic must remain a **separate** backend. Never use heuristic as a silent Ollama fallback.

#### Heuristic / non-AI engine — ADR 0009

| ID                       | Intent                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NOW-P2-HEURISTIC-UX`    | Badge, cost estimator $0, and status line already exist — verify every empty/error state still teaches “heuristic is active”, not “AI is broken”             |
| `NOW-P2-HEURISTIC-QUERY` | Query formulation quality for EN+DE biomedical topics (MeSH-ish Boolean without pretending to be a librarian). Extend unit fixtures, not a new model         |
| `NOW-P2-HEURISTIC-SYNTH` | Template synthesis remains structured markdown with citations only to retrieved IDs. Improve outline/headings if generic, without adding unverifiable claims |
| `NOW-P2-HEURISTIC-RANK`  | Keep relative min-max display scale. If UI copy still says “semantic score” on heuristic ranks, fix copy                                                     |

#### Live providers — ADR 0008 / 0014

| ID                       | Intent                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOW-P2-CAPABILITY-COPY` | Web grounding labeled Gemini-only (or capability-true). Streaming labeled only when the adapter streams. JSON/schema failures fall back without crashing the pipeline       |
| `NOW-P2-ABORT`           | Cancel mid-stream still yields `'partial'` across providers. Do not retry abort. Confirm existing E2E; add a unit path only if a provider adapter is missing abort coverage |
| `NOW-P2-CUSTOM-ENDPOINT` | Custom base URL UX matches ADR 0013: explicit origin approval, no wildcard CSP, dangerous-endpoint warning                                                                  |

#### Feature depth (curate, do not sprawl)

| ID                          | Intent                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOW-P2-KB-EMPTY-DEPTH`     | Empty KB/Dashboard/History already teach next step — add only missing one-click CTA to Literature review if Phase 0 shows a hole                               |
| `NOW-P2-EXPORT-HONESTY`     | Partial watermark + provenance on every format. Do not re-split writers                                                                                        |
| `NOW-P2-SCIENTOMETRIC-COPY` | Author/Journal hubs: “estimated from this corpus”, “not an official H-index”, “free full text ≠ OA” — verify and fix stray overclaim                           |
| `NOW-P2-CMDK-TEACH`         | Mobile command-palette discoverability without a blocking tour                                                                                                 |
| `NOW-P2-PWA-OFFLINE`        | Offline banner + SW-failed banner + Help: what works offline (local KB, heuristic synthesis on _already fetched_ articles) vs what does not (new PubMed fetch) |
| `NOW-P2-TOPICS`             | GitHub topics vs product-truth (optional, non-blocking)                                                                                                        |

### 3.4 P3 — Chore / polish (never block P1)

| ID                     | Intent                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NOW-P3-FILE-SPLIT`    | Split a file you must edit that is ≥650 lines, using existing FeatureView + context + hook patterns                                                                                              |
| `NOW-P3-SOURCERY-P3`   | Only the still-open cosmetic Sourcery P3 items if you already touch that file (`useElementHeight` multi-ref, CollectionIcon viewBox, ChartAccessibleTable typing). Do not tour the repo for them |
| `NOW-P3-I18N-PLURALS`  | Pluralization / number formatting only if you already touch count strings. Do not build a new i18n framework                                                                                     |
| `NOW-P3-LOG-REDACTION` | Keep `check:log-redaction` green if you add logs                                                                                                                                                 |

### 3.5 Explicitly out of scope this wave

- First-class OpenRouter provider UI.
- New cloud providers (Mistral, Groq, Azure, Bedrock) unless a human asks.
- Server-side proxy for keys.
- Multi-user sync / accounts / cloud KB.
- Changing matcher 2.3.0 thresholds.
- Dexie v8 “just in case”.
- New locales.
- Visual screenshot CI.
- Vanity E2E expansion (`NOW-P2-E2E-DEPTH` only for a **new untested user-visible integrity path**).
- Rebranding, particle backgrounds, icon-pack churn.
- Raising Lighthouse performance from warn to fail.
- Rewriting Tailwind v4 tokens from scratch.

---

## 4. Architecture map the agent must respect

```text
src/
  App.tsx                  # thin root
  app/                     # layout, router, session hooks, phase→role mapping
  components/              # views + primitives (settings/, knowledge-base/, authors/,
                           # journals/, agentDebugger/, ui/)
  contexts/                # hydration/composition only
  hooks/
  i18n/                    # translations.ts + domain modules (onboarding, journey, …)
  lib/                     # errors, resilience, circuitBreaker, promptRegistry,
                           # promptSanitize, agentEval, heuristicEval, …
  services/
    geminiService.ts       # PUBLIC façade (do not re-split)
    aiJson.ts
    liveResearchReportStream.ts
    literatureAiTools.ts
    apiKeyService.ts       # AES-GCM vault
    databaseService.ts     # Dexie v7
    inferenceMode.ts / resolveActiveInferenceMode.ts
    exportService.ts       # PUBLIC export façade
    exportPdf.ts / exportCsv.ts / exportText.ts
    providers/             # gemini, openai, anthropic, ollama, heuristic
    nonAi/                 # deterministic engine
    pubmedUtils.ts / arxivUtils.ts
  store/                   # RTK slices + RTK Query
  test/e2e/                # blocking Playwright specs
```

Pipeline roles in the debugger (`getAgentForPhase`) are **conceptual phase names** (QueryGenerator, PubMedFetcher, ArxivFetcher, Ranker, Synthesizer) — not separate OS processes or a swarm. Product copy must not imply otherwise.

Inference freeze: ADR **0017** — mode is frozen at stream start. Do not re-resolve mid-run so a key paste cannot silently flip a heuristic run to live mid-stream.

---

## 5. Implementation standards per PR

### 5.1 Checklist (paste into the PR)

- [ ] Branch from latest `origin/main`
- [ ] One concern; ticket ID in title (`feat(ui): … (NOW-P1-MOBILE-360)`)
- [ ] EN+DE strings via `t()` for every new visible string
- [ ] No file left >700 lines
- [ ] No forbidden product phrases
- [ ] DOMPurify / prompt sanitize preserved
- [ ] Abort + failure tests if a new network path was added
- [ ] `prefers-reduced-motion` honored for any new animation
- [ ] Focus management if a dialog/sheet changed
- [ ] CHANGELOG Unreleased note (English)
- [ ] `docs/product-truth-matrix.md` updated **only if** user-visible claims changed
- [ ] `docs/project-facts.json` updated **only if** drift-gated inventory changed
- [ ] Tests updated; no skipped tests
- [ ] `@deepsourcebot review` posted
- [ ] Local gates listed below are green

### 5.2 Local gates (every PR)

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test:run
pnpm run i18n:ratchet
pnpm run check:docs-drift
```

Before merge on anything that touches services/store/hooks/lib:

```bash
pnpm run test:coverage
pnpm run check:coverage-floors
pnpm run check:agent-eval
```

Before merge on UI chrome / themes:

```bash
pnpm run check:contrast
```

Before merge on CSP / providers / index.html:

```bash
pnpm run build
pnpm run bundle:budget
pnpm run check:no-cdn-scripts
pnpm run check:csp-endpoint-drift
```

Do **not** run the full Playwright suite locally on constrained Cloud Agent RAM. Scope:

```bash
pnpm exec playwright test src/test/e2e/smoke.spec.ts
# plus the single spec that covers the surface you changed
```

Full `pnpm run test:e2e` is CI’s job.

### 5.3 Commit message style

```text
feat(a11y): add 360px-safe names to bottom nav (NOW-P1-MOBILE-360)

fix(ollama): ignore foreign default model on status line (NOW-P2-OLLAMA-STATUS)

docs(audit): 2026-09-03 late baseline SHA …
```

No German. No “WIP”. No generated secrets.

---

## 6. Accessibility & inclusive design bar

This wave’s a11y work is **residual perfection**, not a first installation.

Must remain true:

- Skip-to-content works (`skip-to-content.spec.ts`).
- Dialogs trap focus and restore it (`dialog-a11y.spec.ts`).
- Keyboard paths exist for primary navigation (`keyboard-focus.spec.ts`).
- Axe smoke stays blocking (`a11y.yml`).
- Charts that convey data have a text alternative (`ChartAccessibleTable` or equivalent).
- Live regions announce pipeline phase changes without flooding.
- Error text is tied to inputs (`aria-describedby` / `aria-invalid`).
- Contrast on glass overlays meets WCAG 2.2 AA in **default, light, and matrix**.
- `prefers-reduced-motion: reduce` disables looping Framer Motion (already shipped #261 — do not regress).
- Touch targets on bottom nav and More sheet ≥44px.

When touching a component, honor `eslint-plugin-jsx-a11y`. No file-level disables.

Do not add a new animation library. Do not add `lucide-react` “for a11y icons”. Use existing custom icons.

---

## 7. AI, local AI, and heuristic — design rules for any change

### 7.1 Three honest modes

| Mode                           | When                                                                 | User-facing truth                                                                                   |
| ------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Live                           | Valid key for selected cloud provider + online + Force-Heuristic off | Prompts and article metadata go to that provider. Retrieval hits NCBI/arXiv                         |
| Ollama (live-local generation) | Provider `ollama`, loopback healthy, model present                   | Generation stays on loopback. Retrieval still uses the network. CORS/model failures are diagnosable |
| Heuristic                      | No key, offline, Force-Heuristic, or provider `heuristic`            | Deterministic query / lexical rank / template synthesis. $0. Not a small LLM                        |

Never collapse Ollama into heuristic. Never collapse heuristic into “demo”. Demo is a **labeled fixture set** (ADR 0016).

### 7.2 Grounding language (ADR 0018)

Allowed: corpus-supported, claim-supported, unverified narrative draft, partial report.  
Forbidden as wire or UI values for this app’s synthesis: “verified”, “grounded in every sentence”, “hallucination-free”.

### 7.3 Provider adapters

- Keep lazy `import()` via `getProviderForSettings()`.
- Capability flags stay explicit (ADR 0014): do not revive a single `jsonMode` boolean as the only switch.
- Anthropic browser flag stays reviewed (`dangerouslyAllowBrowser` is already a known constraint — do not spread it).
- OpenAI adapter may use `baseURL` for compatible proxies **after** origin approval.
- Heuristic adapter implements the same interface with deterministic results.

### 7.4 Prompts

- All model prompts go through the versioned registry (ADR 0006) and `promptSanitize.ts`.
- Untrusted article titles/abstracts stay inside delimiter wrappers (`wrapUntrustedTextBlock`). Adversarial fixtures already exist — if you touch prompts, extend `check:agent-eval`, do not weaken it.

---

## 8. Security & privacy bar

Follow `SECURITY.md` + ADR 0003 + ADR 0013.

- Keys only in the encrypted vault (`apiKeyService.ts`). Per-provider slots. No `localStorage` plaintext.
- CSP meta in `index.html`; `scripts/patch-csp-hashes.mjs` after any inline change.
- `connect-src` allowlist: provider APIs, NCBI, arXiv, loopback Ollama origins already documented. No `*`.
- User-approved custom origins only.
- Exports can contain research text — treat download as user-initiated; still sanitize HTML.
- Logging redaction gate stays green.
- Gitleaks + `pnpm audit --audit-level=high` stay blocking.
- Do not add analytics SDKs, third-party fonts beyond the existing approved set, or new remote scripts.

---

## 9. Testing strategy for this wave

### 9.1 Unit / component

Colocated `*.test.ts(x)`. Deterministic. Mock network, crypto, IndexedDB.

Minimum new coverage when you touch:

| Surface           | Tests                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Bottom nav / More | Focus restore, `openedFor` reset, 5 items rendered, overflow destinations reachable       |
| Provider status   | Ollama default model from provider meta; ignore Gemini leftovers; heuristic $0 line       |
| Inference mode    | key × online × force-heuristic matrix                                                     |
| Partial reports   | persist `'partial'`; chat gated; watermark helper                                         |
| i18n              | EN key has non-empty DE; no identical-clone assertion except for proper nouns             |
| Ollama adapter    | existing fake HTTP server contract (200, 429, 5xx, malformed, abort) — extend, don’t fork |

### 9.2 Eval gates

`pnpm run check:agent-eval` must stay green. It includes German stopwords/negation, numeric drift, prompt-injection titles, delimiter framing, malformed JSON. **Do not** relax fixtures to land a prompt tweak.

### 9.3 E2E

Add a Playwright spec **only** if you introduce a new user-visible integrity path that the seven blocking specs cannot see (onboarding → orchestrator already intended to be covered). Prefer extending `provider-flow.spec.ts` or `keyboard-focus.spec.ts` over a new file.

---

## 10. Documentation obligations

Update when behavior or claims change:

- `CHANGELOG.md` Unreleased (Added / Changed / Fixed)
- `docs/product-truth-matrix.md` if a surface’s allowed claim changed
- `docs/project-facts.json` if inventory CI cares about changed
- ADR **only** if you make a new architectural decision. Do not rewrite Accepted ADRs for copy nits. If you ever implemented OpenRouter you would ratify ADR 0010 — you will not.
- `docs/audits/2026-09-03-late-baseline.md` (Phase 0)
- `docs/audits/2026-09-03-late-closeout.md` (end of engagement)

Do **not** create a parallel “self-audit novel” that duplicates CHANGELOG. Governance prefers dated closeouts + git history.

README EN/DE product copy must stay inside the truth matrix. `check:docs-drift` is law.

---

## 11. Suggested PR sequence

Execute in this order unless Phase 0 disproves the premise.

1. **Docs:** `docs/audits/2026-09-03-late-baseline.md` (may ride with PR 2 if tiny).
2. **P0** if any regression exists. Stop the line.
3. `NOW-P1-MOBILE-360` (smallest remaining user-visible win; easy to screenshot).
4. `NOW-P1-DENSITY-01` already shipped in #299 — skip; do not open another header-density PR.
5. `NOW-P1-I18N-TRUTH` + `NOW-P1-HELP-GLOSSARY` (can combine if the diff stays reviewable).
6. `NOW-P1-THEME-QA` as you touch surfaces; otherwise a token-only PR plus manual checklist.
7. `NOW-P2-OLLAMA-STATUS` / `NOW-P2-OLLAMA-DIAG` / `NOW-P2-OLLAMA-PRIVACY` (one PR if they stay in Settings + status line).
8. `NOW-P2-HEURISTIC-UX` + rank/synth copy honesty.
9. `NOW-P2-CAPABILITY-COPY` + `NOW-P2-SCIENTOMETRIC-COPY` + `NOW-P2-PWA-OFFLINE`.
10. `NOW-P2-CMDK-TEACH`, `NOW-P2-TOPICS` (optional).
11. **Closeout docs PR:** `docs/audits/2026-09-03-late-closeout.md` + CHANGELOG reconciliation.

Do not batch 3–9 into one PR.

---

## 12. Closeout template (required at the end)

Write `docs/audits/2026-09-03-late-closeout.md` with:

1. `origin/main` SHA before the wave and after the last merge you produced (if merges happened).
2. Ticket table: ID, PR number, status (`shipped` / `deferred with evidence` / `not started`).
3. File-size table post-wave for files ≥500 lines.
4. Confirmation that 2026-09-02 integrity closeout still holds (partial, watermarks, BM25+ relative scale, demo quarantine, no OpenRouter).
5. Confirmation that 2026-09-03 journey closeout still holds (labels, launchpad, form disclosure, five-item nav).
6. Residual debt left for a future wave (honest, short).
7. Commands you ran and their results (no dumped secrets).
8. Explicit list of do-nots you honored.

If the Cloud Agent session cannot open PRs, still produce the code diffs + the two audit files + CHANGELOG notes so a human can PR them.

---

## 13. Success definition

The wave is successful when **all** of the following are true:

1. A cold visitor on a 360px phone can reach Literature review, run a heuristic topic (or the sample-topic path), and understand they are not in a broken state.
2. A 1280px desktop header communicates primary destinations without looking like an accidental wrap, unless Phase 0 proves the wrap is required for a11y names — in which case document why.
3. Light and matrix themes do not fail contrast on the surfaces you touched.
4. German UI for onboarding, chrome, provider line, and empty states is real German, not leftover English.
5. Help glossary matches Literature review / Quick research / heuristic / live / partial / demo.
6. Ollama Settings can explain “not running”, “CORS”, “model missing”, and “PubMed still uses the network” without mixing in Gemini defaults.
7. Heuristic ranks are not labeled as live-model semantic scores.
8. No partial report can chat or export as finished.
9. No new forbidden phrase exists in README, `index.html`, `metadata.json`, onboarding, Help, or Settings.
10. CI gates listed in §5.2 are green. Coverage floors did not drop. Agent-eval did not weaken.
11. No file exceeds 700 lines. No OpenRouter adapter. No `v0.4.3` tag. No backend.
12. Closeout document exists and is boringly factual.

---

## 14. Agent working protocol (Grok 4.6 / Cursor Cloud)

1. Restate the ticket you are about to implement in one paragraph before editing.
2. Search the tree (`rg`) for existing helpers before adding new ones.
3. Prefer extending a tested module over creating a parallel utility.
4. After edits: run the smallest relevant test file, then the §5.2 fast gates.
5. If a review bot is wrong, reply with evidence and leave the thread open until a human or a later bot cycle agrees — do not silently ignore.
6. If you discover a P0 integrity regression, drop the current P2 and fix the P0.
7. If you are uncertain whether a string is user-facing, put it through `t()` anyway.
8. If a change needs an ADR, stop and write the ADR as a separate docs PR first.
9. Keep long-running dev servers in tmux. Node ≥22, pnpm 11, `pnpm install --frozen-lockfile`.
10. When finished with a ticket, update CHANGELOG Unreleased in the same PR.

---

## 15. Appendix A — Forbidden phrase grep list

Run before closeout (extend if `project-facts.json` grew):

```text
swarm of specialized AI agents
AI agents conduct
Future of Research
zero-knowledge
inextricably linked to a verified PubMed ID
nothing is sent to a server
nothing ever leaves
hallucination-free
official H-index
zero-cost cloud
```

Allowed honest phrases include: client-only PWA, heuristic engine, live provider, corpus-supported, claim-supported, unverified narrative draft, partial report, loopback Ollama, educational demo.

## 16. Appendix B — Journey map (do not regress)

| Journey                    | Expected                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| J1 Cold / no key / desktop | Onboarding or Home launchpad → Literature review → sample or typed topic → heuristic pipeline → labeled synthesis |
| J2 Cold / no key / 360px   | Five-item bottom nav; More sheet; no horizontal chrome scroll                                                     |
| J3 Returning / live key    | Provider status shows live + model; cost estimator not $0                                                         |
| J4 Cancel mid-run          | `'partial'`, banner, watermarked export, chat off                                                                 |
| J5 Empty KB                | Reachable view + CTA into Literature review                                                                       |
| J6 `de` locale             | Same journeys; no raw English chrome on translated surfaces                                                       |

## 17. Appendix C — Review-bot protocol (short)

- DeepSource: `@deepsourcebot review` every push.
- CodeRabbit: prefer a real `APPROVED` / `COMMENTED` review on the latest head. Rate-limit is **(d)** — not a merge block; do not wait 3 cycles / 90 minutes. Latest-head `CHANGES_REQUESTED` still blocks.
- Sourcery: skip if budget exhausted; say so.
- Dependabot: one PR at a time; disposition log.
- Dual gate: required CI green **and** the `011` quiescence predicate (rate-limit section, item 6) on the same head (`docs/pr-merge-gate.md`).

## 18. Appendix D — What “perfection” means here

Perfection is **coherence with the product that already exists**:

- Honest modes.
- Reachable empty states.
- Phone-fit chrome.
- Local AI that diagnoses itself.
- Heuristic that is proud of being deterministic.
- Live AI that does not overclaim grounding.
- Tests that lock those truths.
- Docs that cannot drift.

Perfection is **not**: more providers, more locales, more animation, a backend, a swarm, or a version bump for its own sake.

---

**End of master prompt.**  
Execute Phase 0 now. Promote hypotheses to tickets only with SHA-backed evidence. Ship small PRs. Leave the integrity closeouts intact.
