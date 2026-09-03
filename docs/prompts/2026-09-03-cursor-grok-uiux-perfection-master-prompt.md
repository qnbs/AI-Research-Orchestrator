# AI Research Orchestrator — UI/UX User-Journey Perfection Master Prompt

**For:** Cursor Cloud Agent / Grok 4.6 working in this repository  
**Date:** 2026-09-03  
**Engagement type:** Full-scale product audit closeout **plus** a new, first-priority UI/UX / user-journey / visual-system / workflow perfection wave  
**Primary surface:** live app `https://qnbs.github.io/AI-Research-Orchestrator/` and current `main`  
**Output language for all repo work:** English only (rule `010`). Existing German locale values stay; every new UI string is an EN+DE pair rendered through `t()`.

This prompt supersedes older _open-ticket_ lists in `docs/prompts/2026-08-02-*.md`, `docs/prompts/2026-09-01-*.md`, and `docs/prompts/2026-09-02-*.md` for **what to do next**. It does **not** supersede their hard constraints, ADRs, CI gates, scientific-integrity rules, or “already done — do not redo” tables. If any document contradicts this prompt, **live `main` + tests + CI win**.

---

## 0. Authoritative status block (verify on checkout — do not trust stale markdown)

Pin these facts at the start of the engagement. If they have moved, update the baseline document and proceed from _measured_ truth.

| Fact                           | Value as of 2026-09-03 19:10 CEST (audit snapshot)                                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product                        | AI Research Orchestrator — client-only React 19 PWA for biomedical literature review                                                                                                                                        |
| Package version                | `0.4.2`                                                                                                                                                                                                                     |
| Live demo                      | `https://qnbs.github.io/AI-Research-Orchestrator/` (base path `/AI-Research-Orchestrator/`)                                                                                                                                 |
| Default branch                 | `main`                                                                                                                                                                                                                      |
| Latest documented closeout SHA | `b48c4d3686fc164decaff7383fe2db9467f91b41` (#292)                                                                                                                                                                           |
| Latest docs closeout commit    | `a7e6840d734ff4cfe2b204c21061938f38a0d43a` (#293, 2026-09-02 19:30Z)                                                                                                                                                        |
| Repo `pushed_at`               | 2026-09-02T19:22:20Z                                                                                                                                                                                                        |
| GitHub description             | Honest client-only PWA sentence (no swarm claim)                                                                                                                                                                            |
| Homepage URL                   | `https://qnbs.github.io/AI-Research-Orchestrator/`                                                                                                                                                                          |
| Open GitHub issues             | **0**                                                                                                                                                                                                                       |
| Stars / forks                  | 2 / 0                                                                                                                                                                                                                       |
| Dexie schema                   | v7                                                                                                                                                                                                                          |
| Service worker cache           | `v1`                                                                                                                                                                                                                        |
| ADR floor                      | 21 numbered records; newest relevant: ADR 0021 partial-report state                                                                                                                                                         |
| Providers                      | `gemini`, `openai`, `anthropic`, `ollama`, `heuristic` — default live model `gemini-2.5-flash`                                                                                                                              |
| OpenRouter                     | **Deferred** (ADR 0010, 2026-09-02). Do **not** implement.                                                                                                                                                                  |
| Inference modes                | `live` \| `heuristic`                                                                                                                                                                                                       |
| i18n                           | EN + DE only (FR/ES mentioned historically in README config text must not be treated as shipped UI locales unless code proves otherwise)                                                                                    |
| Design system                  | Tailwind CSS v4 `@theme` tokens, “Cybernetic” glassmorphism, Framer Motion 12, custom icons (`lucide-react` **removed**)                                                                                                    |
| Charts                         | Recharts only (ADR 0005)                                                                                                                                                                                                    |
| File-size rule                 | Target 200–400 lines, hard max **700** (rule `200`)                                                                                                                                                                         |
| Previous UI-adjacent closeouts | #229 nav gaps, #228 banner-behind-header, #230 sticky settings + debugger gate, #231 cancel control, #232 / #290 chart a11y, #261 reduced-motion, #288 onboarding product truth, #292 sticky chrome class + cancel labeling |

### 0.1 Hard truth

The August–September 2026 waves closed **scientific integrity, transport, export safety, persistence upgrades, provider conformance, product-copy honesty, and file-cap splits**. The 2026-09-02 closeout (`docs/audits/2026-09-02-closeout.md`) is explicit: _“Next steps require a new human-defined goal.”_

That goal is now defined:

> **Make the product feel finished.** Perfect the first-run and returning-user journeys, information architecture, visual system, empty states, chrome density, mobile navigation, research-start workflow, and the optical coherence of every primary surface — without reopening closed integrity work, without implementing OpenRouter, without cutting a ceremonial `v0.4.3`, and without lying about what the pipeline does.

Do **not** treat older NOW-P0/P1 IDs (`NOW-P1-FILE-CAP`, `NOW-P2-FACADE`, `NOW-P0-PARTIAL`, …) as open work. They are historical.

### 0.2 What actually remains from prior waves (do not inflate)

| ID                                                | Status                | Action in this engagement                                                                                                                                      |
| ------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ISSUE-P2-DOCS-001` product-truth-matrix.md       | Partial               | Create the missing standalone matrix **only if** you touch product copy. Do not make it the sprint.                                                            |
| `NOW-P2-OPENROUTER`                               | Deferred              | Leave deferred. Do not implement.                                                                                                                              |
| `NOW-P2-E2E-DEPTH`                                | Later                 | Add E2E **only** for new user-visible UI journeys you ship (onboarding complete → research form; empty-state CTA; mobile nav). Do not expand the whole matrix. |
| Residual risk: XSS vs client-held keys            | Standing threat model | Do not claim the vault is XSS-safe. Do not “fix XSS” by rewriting the security model in this UI sprint.                                                        |
| Residual risk: claim matcher labels ≠ model truth | Standing              | Do not change matcher semantics while polishing UI. Trust badges must stay honest.                                                                             |
| Residual risk: heuristic ≠ Gemini                 | Standing              | UI must keep labeling heuristic/demo vs live. Never dress BM25+ as semantic AI.                                                                                |
| Residual risk: NCBI queries from user IP          | Standing              | Keep rate-limit UX honest. Optional NCBI key remains in Settings.                                                                                              |

### 0.3 Development of the last days (commit history, interpreted)

Measured from GitHub `main` (qnbs + cursoragent), 2026-08-29 → 2026-09-02. There is **no 2026-09-03 product commit** at audit time.

**Wave shape:** a Cursor-agent stabilization + truth-alignment sprint after v0.4.2, not a UI redesign.

| When (UTC) | SHA (short) | PR   | What it actually did                                                                   |
| ---------- | ----------- | ---- | -------------------------------------------------------------------------------------- |
| 2026-08-29 | `e1212ae`   | #259 | Audit Phase 0 baseline + nanoid pin + issue-backlog refresh                            |
| 2026-08-29 | `44273a2`   | #261 | `prefers-reduced-motion` for looping Framer Motion                                     |
| 2026-08-29 | `5cfd386`   | #260 | Cancelled reports are `'partial'`, never `'done'` (ADR 0021)                           |
| 2026-08-29 | `de222fa`   | #262 | ADR 0021 + README cancel honesty                                                       |
| 2026-08-30 | `791de7b`   | #264 | **Cut v0.4.2**                                                                         |
| 2026-08-30 | `9e619ca`   | #265 | CODEOWNERS                                                                             |
| 2026-08-30 | `d8c0ee1`   | #266 | Ollama stream timeouts                                                                 |
| 2026-08-30 | `a90ba50`   | #267 | Dexie v2/v4/v6 → v7 upgrade tests                                                      |
| 2026-08-30 | `f769afb`   | #268 | Typed heuristic operations + honest capabilities                                       |
| 2026-08-30 | `7900f87`   | #269 | Adversarial agent-eval fixtures                                                        |
| 2026-08-30 | `973814b`   | #270 | Provider fake-HTTP conformance harness                                                 |
| 2026-08-30 | `1e329fd`   | #272 | CSV formula injection + 8 MiB download cap                                             |
| 2026-08-30 | `8a76bda`   | #271 | Lucene BM25+ IDF + relative 0–100 ranks                                                |
| 2026-09-01 | `0f432a6`   | #285 | Audit baseline + `browserslist@4.28.8`                                                 |
| 2026-09-01 | `5df69ff`   | #286 | Dependabot wave; **removed unused `lucide-react`**                                     |
| 2026-09-01 | `f3bbae9`   | #288 | Onboarding/help/input copy aligned to product truth                                    |
| 2026-09-02 | `cebcb5e`   | #289 | TypeScript 5.8.3 → 6.0.3                                                               |
| 2026-09-02 | `660cf8c`   | #287 | Cancel-mid-stream E2E + CSV/insights watermark                                         |
| 2026-09-02 | `01165e8`   | #290 | AI façade split + remaining chart a11y tables + ADR 0010 deferral                      |
| 2026-09-02 | `5c539ec`   | #291 | Docs closeout for #290                                                                 |
| 2026-09-02 | `b48c4d3`   | #292 | Export façade split, Sourcery residuals, honest `index.html` meta, sticky chrome class |
| 2026-09-02 | `a7e6840`   | #293 | Docs post-#292 closeout matching live main                                             |

**Interpretation for this engagement**

1. Engineering quality and honesty rose sharply. User-facing _craft_ did not get a dedicated pass.
2. Copy was de-hyped (#288). Visual hierarchy, IA, and first-run activation were not redesigned.
3. Chrome received mechanical fixes (banner z-index, sticky top, reduced motion, cancel labeling) — not an information-architecture pass.
4. Several product files sit in the danger zone of the 700-line cap: `ReportDisplay.tsx` ~641, `translations.ts` ~660, `AISettingsTab.tsx` ~652, `InputForm.tsx` ~523, `Header.tsx` ~421. UX work that adds lines **must split first**.
5. Agent-authored PRs are large and docs-heavy. This wave must be **smaller, visual, journey-shaped PRs**.
6. Topic `multi-agent-systems` remains on the GitHub repo. It conflicts with product-truth work. Treat as `NOW-P2-TOPICS` only if you are already touching repo metadata; do not make it a blocker.

---

## 1. Role and mission

You are simultaneously:

- Product designer for a dense scientific PWA
- Front-end implementer (React 19, TypeScript strict, Tailwind v4 `@theme`, Framer Motion 12)
- Information architect for a 11-view client app
- Accessibility engineer (WCAG 2.2 AA, existing Playwright a11y + keyboard specs)
- i18n curator (EN+DE parity, `t()` only)
- QA engineer who will not merge on a red gate
- Docs historian who updates audit artifacts without rewriting history

You are **not** a release manager, not an OpenRouter implementer, not a security-model rewriter, and not a second façade-split agent.

### Primary objective

Ship a coherent, calm, high-craft user journey from first pixel to first successful (heuristic or live) research run, then to knowledge-base leverage — while preserving every integrity invariant.

### Success looks like

A new visitor on a 13-inch laptop **and** a 390px phone can:

1. Understand in five seconds that this is a **client-only biomedical literature-review PWA**, not a swarm SaaS.
2. Start a review **without an API key** via heuristic / educational demo, with honest labeling.
3. Find Settings → provider key only when they want live AI — not as a gate.
4. Distinguish **Orchestrator** (full pipeline: query → PubMed/arXiv → rank → cited synthesis) from **Research** (rapid assistant: TL;DR / similar / chat-adjacent tools).
5. Never hit a disabled nav item without an explanation and a CTA to produce the missing prerequisite.
6. Complete primary tasks with visible focus, 44px touch targets, working skip-link, reduced motion, and no contrast regressions.
7. Feel that Home, Header, Bottom nav, empty states, and Settings belong to one design system.

---

## 2. Product you are working on (do not re-narrate incorrectly)

**AI Research Orchestrator** is a **client-only** React Progressive Web App. It couples **PubMed** (NCBI E-utilities) and optional **arXiv** retrieval with a pluggable AI layer (Gemini, OpenAI, Anthropic, local Ollama) or a deterministic **heuristic** engine.

Pipeline (Orchestrator): natural-language topic → Boolean/MeSH-oriented queries → live or demo fetch → relevance ranking (0–100 **display/relative** scale) → streaming cited synthesis.

Honesty rules that UI must visualize, not contradict:

- Synthesis is **corpus-supported / claim-supported** vs **unverified narrative draft** (ADR 0012, 0015, 0018).
- Cancelled or restored runs are `'partial'`, never `'done'` (ADR 0021). Watermarks and gated chat stay.
- Educational demo data is quarantined and labeled (ADR 0016). Never silently substitute demo hits for live retrieval.
- Heuristic mode is a real product path, not a consolation prize. It is also not Gemini.
- Keys live in an AES-GCM IndexedDB vault. Encryption-at-rest is **not** XSS protection (ADR 0003, SECURITY.md).
- No application server stores research. Live mode still sends prompts + article metadata to the chosen provider and queries PubMed/arXiv.

### Forbidden product phrases (gated by `check:docs-drift` only in configured product-copy paths)

Do not reintroduce, including in UI copy, comments, commits, OG tags, or GitHub text:

- “Every AI assertion is inextricably linked to a verified PubMed ID” / German twin
- “Nothing is ever sent to a server” / “never sent to any server” / “zero-knowledge architecture”
- “Future of Research” / “Zukunft der Recherche”
- “AI agents conduct” / “the AI agents conduct” / “Configure the AI agents” / “swarm of specialized” / “Gemini agents”
- “Production_Ready”, “Gemini_Pro”, “Gemini 3 Pro”

Conceptual agent names in the debugger (QueryGenerator, PubMedFetcher, Ranker, Synthesizer) are **phase roles**, not separate SDK processes. Do not market them as a swarm.

---

## 3. What is already done — do not redo

Reproduce none of the following as new tickets.

**Integrity / research correctness:** ADR 0021 partial state; cancel-mid-stream E2E; CSV/insights watermarks; claim-evidence matcher 2.3.0 labeling; corpus grounding labels; demo quarantine.

**Transport:** multi-provider façade (ADR 0008); façade file split (#290); Ollama health probe + timeouts; heuristic typed operations + BM25+; provider conformance harness.

**Persistence:** Dexie v7 + upgrade tests from v2/v4/v6.

**Export:** formula-injection-safe CSV; 8 MiB cap; export module split (`exportService` façade + `exportPdf` / `exportCsv` / `exportText`).

**A11y already shipped:** skip-to-content; dialog/keyboard E2E; chart accessible tables on remaining surfaces; `prefers-reduced-motion` for looping motion; 44px-ish bottom-nav min widths.

**Copy honesty:** onboarding #288; `index.html` meta #292; GitHub description/homepage.

**Governance:** CODEOWNERS; TypeScript 6.0.3; lucide-react removed; browserslist pin; Dependabot consolidations.

**Deleted — do not resurrect:** `ParticleBackground.tsx`, unused `lucide-react`.

If a reviewer or an old audit file asks you to re-split `geminiService.ts` or `exportService.ts`, refuse and cite the 2026-09-02 closeout.

---

## 4. Critical evaluation of the _current_ app (2026-09-03)

### 4.1 What is strong

- Distinct dark “cybernetic glass” identity; brand gradient is recognizable.
- Progressive enhancement is real: the app is usable with zero keys.
- Product-truth pass removed the worst marketing lies from the first screen.
- Chrome engineering is serious (measured `--chrome-height`, sticky settings bar, banner stack).
- Command palette (`⌘K`) exists for power users.
- Trust, partial-report, and inference-mode concepts have UI hooks (`InferenceModeBadge`, demo banner, partial badges).
- Custom icon set is consistent enough to build on.

### 4.2 What is weak — this is the work

The live first screen is a **handsome brochure**, not a **research cockpit**. After “Start Researching”, the architecture dumps the user into a second lobby (`HomeView`) that duplicates navigation, then into two similarly named research surfaces (`research` vs `orchestrator`) whose difference is not taught.

Observed and code-backed findings:

1. **Onboarding is a dead-end marketing card, not a setup journey.**  
   `OnboardingView` is a single screen: logo, title, three step cards, one CTA, privacy footnote. No language control, no theme control, no “try a sample topic”, no “continue without a key (heuristic)”, no “I already have a Gemini/OpenAI/Anthropic/Ollama setup”, no keyboard-first primary action hint. Completing it only flips `settings.hasCompletedOnboarding`. That is too little activation for the complexity behind the door.

2. **HomeView is an unfinished second onboarding.**  
   `grid-cols-1 md:grid-cols-1` is a leftover. Only four destinations (Research, Orchestrator, Authors, Journals). Missing Knowledge Base, Collections, Dashboard, History, Settings, Help. No “recommended next step” based on empty KB. Competes with Header + BottomNav.

3. **Information architecture collision: Research vs Orchestrator.**  
   `research` is the Rapid Research Assistant (query analysis / similar articles). `orchestrator` is the full literature-review pipeline (`InputForm` with date range, article types, scan caps, arXiv, educational demo). First-time users cannot know which door is the product. Header lists Research _before_ Orchestrator. Bottom nav lists Home, Research, Orchestrator, … — seven destinations on a phone.

4. **Header density.**  
   Desktop is two rows: eight pill nav items (Research, Orchestrator, Authors, Journals, Collections, Knowledge Base, Dashboard, History) plus a second row of title + search + quick-add + language + settings + help + theme + inference badge + optional debugger. Horizontal `overflow-x-auto` at `md` is an IA smell. Brand string in the header is “Research Orchestrator” while the product name is “AI Research Orchestrator”.

5. **Mobile chrome is over-subscribed.**  
   `BottomNavBar` has **seven** items with labels. On 360–390px this will scroll or truncate. Dashboard, History, Settings, Help live in a header overflow (“More”). Knowledge Base / Dashboard / History disable when `hasReports` is false — disabled pills with no tooltip-level teaching on mobile.

6. **Disabled destinations are dead ends.**  
   `hasReports === false` disables KB, Dashboard, History. There is no inline reason + CTA (“Run your first review in Orchestrator” or “Load educational demo corpus”). Empty states exist as a component (`EmptyState`) but the nav pattern does not use them.

7. **Orchestrator start form is cognitively heavy.**  
   `InputForm.tsx` (~523 lines) presents topic, date range, article types (RCT / meta-analysis / systematic review / observational), synthesis focus, max scan, top-N, arXiv toggle, educational demo, presets. Power is good; first-run should be **topic + sensible defaults + progressive disclosure**. Advanced controls should collapse.

8. **Zero-config golden path is under-sold.**  
   Heuristic + educational demo is the only path that works on the public GitHub Pages demo without pasting a key. It is not the hero action on onboarding or Home.

9. **Visual system drift.**  
   Mix of `glass-panel`, `bg-surface/30`, `border-white/10` (onboarding hard-codes light-border assumptions), `brand-gradient-text`, hover `scale-105` on the onboarding CTA (motion not obviously routed through `useMotionSafeLoop`). Light and Matrix themes must not be afterthoughts when you change tokens.

10. **Empty and welcome states are generic.**  
    `Welcome.tsx` is a large document icon + two paragraphs. It does not offer sample queries, provider status, or a one-click demo run.

11. **Settings as a prerequisite is invisible.**  
    Live AI requires a vaulted key. First-run UI does not preview provider status (“Heuristic active — add a key in Settings for live synthesis”) except via `InferenceModeBadge` after chrome exists. Onboarding never shows the badge.

12. **File-cap pressure will fight UX work.**  
    Header ~421, InputForm ~523, ReportDisplay ~641, AISettingsTab ~652, translations barrel ~660. Adding journey copy without splitting will fail rule `200`.

13. **Discoverability of ⌘K is desktop-only.**  
    Hint is `hidden lg:inline-block`. Mobile users have no equivalent “search the app” teaching.

14. **Privacy footnote wrapping.**  
    Live screenshot shows the onboarding privacy sentence wrapping mid-phrase onto a second centered line. Tighten copy or give it a max-width and `text-balance`.

15. **Two-row header + stacked banners steal vertical space** on laptops. Research form + results already compete. Every new banner must earn its keep; consider compact density mode later — not in P0, but do not add more persistent chrome.

### 4.3 Product judgment rules

- **Activation over encyclopedia.** The first session should produce _something_ the user can export or save.
- **One primary action per screen.** Secondary actions sit one level down.
- **Teach the difference once**, then keep labels stable.
- **Defaults are an opinion.** Ship strong biomedical-review defaults; do not force configuration.
- **Honest chrome.** Inference mode, demo corpus, partial reports, and provider identity stay visible without shouting.
- **Density is allowed after competence.** Power-user controls (presets, article types, scientometrics, debugger) are not deleted; they are deferred in the journey.
- **Do not add illustration-for-illustration.** Custom icons + type + space beat decorative particles (which were deleted for a reason).

---

## 5. What to do now — prioritized ticket list

**Historical (2026-09-03):** Journey-wave tickets below were executed on `cursor/uiux-first-run-52dc` (PR #294). See `docs/audits/2026-09-03-closeout.md`. Remaining open work is `NOW-P2-TOPICS` (not started) and `NOW-P2-OPENROUTER` (deferred). Do not re-implement Done tickets.

Use these IDs in PR titles, CHANGELOG `[Unreleased]`, and the new audit baseline. Do not invent parallel taxonomies.

### P0 — ship first, user-visible, blocking the “app feels unfinished” verdict

#### `NOW-P0-JOURNEY-01` — First-run activation rewrite

**Files (expected):** `OnboardingView.tsx`, onboarding i18n keys, `useAppLogic` / settings `hasCompletedOnboarding`, possibly a thin `OnboardingView` split if you add steps.

**Behavior:**

- Keep a single beautiful first screen; do **not** build a five-page wizard unless measurement shows one screen cannot hold the actions.
- Primary CTA remains “Start researching” and completes onboarding.
- Add a clearly secondary text button: “Start with a sample topic (heuristic)” that (a) completes onboarding, (b) navigates to **Orchestrator**, (c) prefills a safe educational topic, (d) does **not** silently enable unlabeled demo substitution — if you turn on `educationalDemoMode`, the existing `DemoDataBanner` must appear.
- Show an honest one-line mode preview: “No API key required. Heuristic engine runs the same phases. Add a provider key later in Settings.”
- Put language toggle (EN/DE) on this screen. Theme toggle optional if it fits without clutter.
- Respect `prefers-reduced-motion` on the CTA hover scale (remove raw `hover:scale-105` or gate it).
- Privacy sentence stays, but rewrite for `text-balance` / shorter clause structure. Do not weaken the live-mode disclosure.
- Focus: auto-focus the primary CTA on mount; keep a visible focus ring.

**Non-goals:** collecting an API key on this screen; OAuth; multi-step account myth.

#### `NOW-P0-JOURNEY-02` — Make Orchestrator the obvious primary job

- Default post-onboarding view should be **Orchestrator** (full review), not Home-as-lobby, unless you redesign Home into a genuine dashboard. Pick one:
  - **Preferred:** complete onboarding → `orchestrator` with empty-state coaching.
  - **Acceptable:** keep `home` only if Home becomes a single-CTA command surface (see `NOW-P0-JOURNEY-03`) and not a four-card dump.
- Rename-in-UI if needed for clarity, without breaking view ids:
  - Keep route/view ids `research` and `orchestrator` (E2E selectors, Redux).
  - Visible labels may become **“Review” / “Literature review”** vs **“Quick look” / “Assistant”** — but only with EN+DE keys and Help glossary updates.
  - Do not bikeshed for more than one PR. Prefer **“Literature review”** (orchestrator) and **“Quick research”** (research) if you change labels.
- Header order: Literature review (orchestrator) first, Quick research second.

#### `NOW-P0-JOURNEY-03` — Home as a launchpad or delete it from the critical path

`HomeView` today is unfinished (`md:grid-cols-1`) and redundant.

Choose **one** and implement it fully:

- **Option A (recommended):** Turn Home into a short launchpad: one hero action (“New literature review”), one secondary (“Quick research”), a status strip (inference mode, KB count, last report), and a “How this app works” 3-bullet already used on onboarding. Grid at `md:grid-cols-2`.
- **Option B:** Stop sending users to Home after onboarding; keep Home reachable from nav for a calm overview, but do not block activation.

Do not leave `md:grid-cols-1` in place.

#### `NOW-P0-FORM-01` — Orchestrator form: progressive disclosure

Split `InputForm.tsx` **before** adding UI if the file would approach 700 lines.

- Above the fold: topic textarea, primary submit, inference-mode hint, optional sample-topic chips (3 biomedical examples, i18n).
- Collapsed “Review options” `<details>` or equivalent: date range, article types, synthesis focus, scan caps, arXiv, educational demo, presets.
- Defaults remain those from Settings → defaults. Do not change scientific defaults without a reason.
- Preserve Ctrl/Cmd+Enter submit and existing sessionStorage draft.
- Educational demo toggle must stay impossible to miss when on, via existing banner — do not invent a second banner.

#### `NOW-P0-EMPTY-01` — Empty states that teach and act

Apply `EmptyState` (or a thin extension) to:

- Orchestrator with no report
- Research assistant with no analysis
- Knowledge Base with zero articles
- Dashboard / History when `hasReports === false`
- Collections empty

Each empty state has: short title, one-sentence truth, **one** primary CTA (usually “Start a literature review”), optional secondary (“Open sample demo”). Disabled header/bottom-nav items that require reports should explain _why_ in a tooltip / `aria-disabled` + visually distinct style, and the destination view itself must not be a blank disabled void.

### P1 — chrome, mobile, visual coherence

#### `NOW-P1-CHROME-01` — Header information architecture

- Reduce perceived item count: primary destinations vs overflow.
  Suggested primary (desktop): Literature review, Quick research, Knowledge Base, Authors, Journals.  
  Overflow or secondary: Collections, Dashboard, History, Help.
- Unify brand lockup: visible wordmark = product name from `t('app.name')`.
- Keep inference badge visible.
- Keep ⌘K. On tablet, show a “Search” label, not only an icon.
- Do not remove Settings/Help/language/theme; compact them.
- If `Header.tsx` would exceed ~500 lines after edits, split `HeaderDesktopNav.tsx` / `HeaderMobileMenu.tsx` / `HeaderActions.tsx`.

#### `NOW-P1-CHROME-02` — Mobile navigation that fits a real phone

- Bottom nav: **five** destinations maximum. Recommended: Review (orchestrator), Assistant (research), Library (KB), Explore (Authors **or** a grouped Explore), More.
- “More” must include Journals, Collections, Dashboard, History, Settings, Help — each with enabled/disabled reasoning.
- No horizontal scroll of seven labeled icons.
- Active research ping stays, but only on the Review item.
- Touch targets ≥ 44×44 CSS px; labels may truncate with a tooltip, but do not drop labels entirely.

#### `NOW-P1-VISUAL-01` — Design-token and surface audit

- Walk onboarding, home, orchestrator form, report display, KB, settings, help.
- Replace one-off `border-white/10` (breaks light theme) with `border-border` / tokenized glass borders.
- Ensure text-primary / text-secondary / accent contrast meets WCAG 2.2 AA on background, surface, input-bg, and gradient buttons (`text-brand-text-on-accent` on the CTA).
- Align radius, padding, and shadow steps. Prefer existing `glass-panel` / `glass-input`.
- Matrix and light themes must remain usable after token changes. Screenshot or Story-less manual check in the PR body.
- Do **not** revive particle backgrounds.

#### `NOW-P1-VISUAL-02` — Motion, focus, density

- Gate decorative transforms through the existing reduced-motion helper.
- Standardize focus rings (`focus-ring-aa` / `focus:ring-brand-accent`) on new controls.
- Do not add layout-thrashing page transitions.
- Loading phases already exist — make the Orchestrator generating state feel like the same family as Research’s `LoadingIndicator`.

#### `NOW-P1-SETTINGS-01` — Provider status in the journey

- A compact “AI source” chip or line on Orchestrator and Research: current provider + live/heuristic + “Configure” link to Settings → AI.
- Do not force a modal on every visit.
- If no key and not Ollama: copy must say heuristic is active, not that the app is “broken”.

### P2 — craft, glossary, docs alignment

#### `NOW-P2-IA-COPY` — Help glossary + empty-state vocabulary

Update Help so Research vs Orchestrator naming matches the UI. No forbidden agent-swarm language.

#### `NOW-P2-HOME-CARDS` — If Home stays, add KB + Settings cards and a last-session recap.

#### `NOW-P2-COMMAND-MOBILE` — Teach command palette from the More menu (“Search commands”).

#### `NOW-P2-TRUTH-MATRIX` — Add `docs/product-truth-matrix.md` if you change product copy (`ISSUE-P2-DOCS-001`).

#### `NOW-P2-TOPICS` — Optional: GitHub topic `multi-agent-systems` is in tension with #288. Change only with maintainer intent; do not block UI PRs.

#### `NOW-P2-I18N-SPLIT` — If `translations.ts` would pass ~680 lines, move new onboarding/home keys into an existing domain file (`chromeTranslations` or a new `onboardingTranslations.ts` following the current barrel pattern).

### P3 — explicitly out of scope unless a P0/P1 PR touches the file anyway

- OpenRouter first-class provider
- New locales FR/ES
- Cutting `v0.4.3`
- Scientometric algorithm changes
- Claim matcher 2.4
- Replacing Recharts
- Re-adding lucide-react
- Enabling require-code-owner reviews
- Broad E2E expansion
- Visual regressions from “creative” illustration packs

---

## 6. Target user journeys (implement and keep these working)

### J1 — Cold visitor, no key, desktop

1. Lands on onboarding. Understands client-only + PubMed/arXiv + heuristic fallback in < 10 seconds.
2. Either clicks primary CTA or “sample topic”.
3. Arrives in Orchestrator with chrome visible, inference = heuristic, form focused on topic.
4. Can expand options, but can also submit with defaults.
5. Run starts; cancel is available; if cancelled, status is partial.
6. Report shows trust labels. Save to KB. KB nav enables.

### J2 — Cold visitor, no key, mobile 390px

1. Same onboarding; CTA not obscured by browser chrome.
2. Bottom nav shows ≤5 items; no horizontal scavenger hunt.
3. Form fields usable; submit not hidden under the bottom nav (`pb-24` already exists — verify after nav changes).
4. Sample chips wrap; no overflow into the fold of the CTA.

### J3 — Returning user with a key

1. Skips onboarding (`hasCompletedOnboarding`).
2. Inference badge shows live provider.
3. Command palette can jump to last report / KB / settings.
4. Settings dirty-dot still works.

### J4 — Returning user, empty KB after clearing data

1. Disabled destinations explain themselves.
2. Empty Dashboard/History/KB all point back to Orchestrator.

### J5 — German locale

1. Language toggle on onboarding and in header.
2. No raw English leftover on primary journey screens.
3. `i18n:ratchet` stays green.

### J6 — Reduced motion / keyboard / screen reader

1. Skip link works.
2. Onboarding CTA focused.
3. No infinite animation if `prefers-reduced-motion: reduce`.
4. Chart tables remain present (do not rip out #290).
5. Disabled nav items are `aria-disabled` or removed from tab order with an alternative path.

---

## 7. Execution plan

### Phase 0 — Baseline (mandatory, short, evidence-first)

1. `git fetch origin && git checkout main && git pull --ff-only` (or the repo’s standard contribution branch flow). **Never push to `main`.**
2. Record `git rev-parse HEAD`, `git log -15 --oneline`, package version, and whether Pages still serves `v0.4.2`.
3. Write `docs/audits/2026-09-03-baseline.md` with: measured SHA, confirmation that 2026-09-02 tickets stay closed, and the ticket list from §5 as the new open set.
4. Note file sizes of: `Header.tsx`, `BottomNavBar.tsx`, `OnboardingView.tsx`, `HomeView.tsx`, `InputForm.tsx`, `ReportDisplay.tsx`, `AISettingsTab.tsx`, `translations.ts`.
5. Read, in order: `AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/index.mdc`, `.cursor/rules/300-ui-components.mdc`, `.cursor/rules/200-architecture-limits.mdc`, `.cursor/rules/010-english-content.mdc`, `docs/audits/2026-09-02-closeout.md`, `SECURITY.md` (threat model only), ADR 0018 + 0021.
6. Do **not** run full Playwright locally on constrained hardware. Scope later.

### Phase 1 — P0 journey PRs (one concern per PR)

Suggested PR sequence:

1. `fix(i18n+ui): onboarding activation and reduced-motion CTA` (`NOW-P0-JOURNEY-01`)
2. `feat(ui): default to orchestrator and clarify review vs assistant labels` (`NOW-P0-JOURNEY-02`) — labels + default view only
3. `feat(ui): home launchpad` **or** `fix(nav): skip home on first landing` (`NOW-P0-JOURNEY-03`)
4. `refactor(ui): progressive disclosure for orchestrator input form` (`NOW-P0-FORM-01`) — split the file if needed in this same PR because it is the concern
5. `feat(ui): actionable empty states and disabled-nav teaching` (`NOW-P0-EMPTY-01`)

Each PR: English description, ticket IDs, screenshots (desktop + mobile width), test plan, risk, rollback.

### Phase 2 — P1 chrome + visual

6. Header IA split if needed (`NOW-P1-CHROME-01`)
7. Mobile bottom nav reduction (`NOW-P1-CHROME-02`)
8. Token/contrast pass (`NOW-P1-VISUAL-01`) — may combine with 6 if the diff is still reviewable; prefer separate if CSS blast radius is large
9. Provider status line (`NOW-P1-SETTINGS-01`)

### Phase 3 — P2 + docs truth

10. Help glossary alignment, command-palette mobile entry, product-truth matrix if copy changed
11. Update `CHANGELOG.md` `[Unreleased]`
12. Update `docs/audits/2026-08-03-issue-backlog.md` header to point at the 2026-09-03 wave
13. Write `docs/audits/2026-09-03-closeout.md` when P0+P1 are merged or when the human stops the wave

### Phase 4 — gates

For every PR, locally or in CI:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test:run
pnpm run build
```

When you touch i18n:

```bash
pnpm run i18n:ratchet
# plus any check:docs-drift script already used in CI
```

When you touch coverage-gated layers (`src/store`, `src/services`, `src/hooks`, `src/lib`):

```bash
pnpm run test:coverage
```

Do **not** run the full `pnpm run test:e2e` locally on small machines. Add or extend a focused spec if you change onboarding completion or default view — name it clearly (e.g. extend `smoke.spec.ts` or `agent-flow.spec.ts` with a narrow assertion). CI Playwright jobs stay blocking; do not add `continue-on-error`.

---

## 8. Mandatory operating rules

### 8.1 Evidence first

- Measure file line counts before splitting.
- Do not reopen closed NOW-* IDs.
- If Pages and `main` diverge, record both SHAs.
- Screenshots belong in the PR body (desktop 1280+ and mobile ~390).

### 8.2 Governance

- Never push to `main`.
- One concern per PR. No new XXL “do the whole UX” PR.
- English PR titles and bodies. Conventional-commit style matching the repo (`feat(ui):`, `fix(a11y):`, `refactor(ui):`, `docs(audit):`).
- Resolve review-bot comments (CodeRabbit, CodeAnt, Copilot, DeepSource). Comment `@deepsourcebot review` on open PRs and after fix pushes.
- Never merge on a CodeRabbit “Review rate limited” placeholder. Wait, `@coderabbitai review`, max 3 cycles; escalate after >90 minutes.
- Sourcery budget was exhausted around #291/#292. Do **not** `@sourcery-ai review` unless the budget is known to have reset.
- Do not enable require-code-owner reviews.
- Rule `012` Dependabot consolidations stay out of this UI wave unless a high advisory blocks CI.

### 8.3 Scientific integrity (UI must not lie)

- Do not present heuristic ranks as model-semantic scores. 0–100 remains a **relative display scale**.
- Do not hide demo-corpus banners.
- Do not mark partial reports complete in any new badge you add.
- Do not imply every sentence is PMID-grounded.
- H-index remains corpus-derived / N/A for external index — do not “beautify” it into an official metric.

### 8.4 Security

- No `dangerouslySetInnerHTML` outside reviewed DOMPurify patterns.
- No new `innerHTML` shortcuts.
- Do not log keys or prompt bodies.
- Do not treat the vault as XSS-safe in Help copy.
- Keep CSP assumptions; no CDN import map (ADR 0011).

### 8.5 Architecture / UI engineering

- Functional components + hooks only.
- Visible strings via `t()`; EN+DE together.
- Tailwind v4 `@theme` tokens in `src/index.css`. No revived `tailwind.config.js`.
- Recharts only.
- Custom icons only; do not reinstall `lucide-react`.
- Framer Motion sparingly.
- File target 200–400 lines, hard max 700. Split using existing FeatureView + context + hook patterns.
- New persisted flags (e.g. “dismissed sample hint”) require an explicit Dexie schema version bump and migration in `databaseService.ts`; document defaults and update `CHANGELOG.md` when breaking. Do not persist flags without that migration. Already-versioned settings fields may still be preferred when a new column is unnecessary.
- Keep `hasCompletedOnboarding` semantics. If you add `hasSeenSampleHint`, default false, persist via settings if it must survive reload.

### 8.6 Accessibility bar

- WCAG 2.2 AA.
- Honor jsx-a11y; no blanket eslint-disable.
- Keyboard path for every new control.
- Focus visible.
- `prefers-reduced-motion`.
- Do not rely on color alone (chart tables already exist — keep them).
- Disabled controls need an accessible name and a reason.

---

## 9. Implementation sketches (guidance, not mandatory structure)

### 9.1 Onboarding actions

```tsx
// Conceptual — adapt to existing settings + navigation handlers
<button type="button" onClick={onComplete}>
  {t('onboarding.start')}
</button>
<button
  type="button"
  className="…secondary…"
  onClick={() => onComplete({ nextView: 'orchestrator', prefillTopic: t('onboarding.sampleTopic'), useHeuristic: true })}
>
  {t('onboarding.startSample')}
</button>
```

Wire `onComplete` through the existing `handleCompleteOnboarding` in `useAppLogic`. Extend that handler with an optional payload if needed. Do not invent a second onboarding flag.

Sample topic must be a real-looking biomedical phrase, EN+DE, not a joke and not a copyrighted paper title dump.

### 9.2 Progressive disclosure

Use native `<details>` / `<summary>` for zero-JS semantics, styled to match glass panels, or an existing accordion pattern if one exists. Default closed for first-run; remember open state in `sessionStorage` only (not Dexie).

### 9.3 Disabled nav teaching

Prefer a `Tooltip` on desktop and an `aria-describedby` plus visually adjacent hint on mobile More-menu rows: “Available after you save a review.”

### 9.4 Label change without route change

```ts
// view id stays
currentView === 'orchestrator';
t('nav.orchestrator'); // EN: "Literature review" / DE: equivalent professional term
t('nav.research'); // EN: "Quick research"
```

Update `chromeTranslations` (or current nav key location), Help, command-palette items, empty states, and Home cards in the **same** PR as the label change so the product does not speak two dialects.

---

## 10. Test and gate plan

### Unit / component

- Onboarding: primary click sets completed + default navigation; sample click prefills; language toggle changes strings.
- Home: destinations fire `onNavigate` with expected view ids.
- InputForm: collapsed options still submit defaults; expanding and changing article types still works; Cmd+Enter still works; sessionStorage draft still restores.
- EmptyState CTAs call the provided handler.
- Header/BottomNav: disabled items when `hasReports === false`; enabled after.
- Reduced-motion: onboarding CTA does not require a scale animation to be clickable.

### E2E (narrow)

- Smoke: onboarding complete → main chrome visible → orchestrator or home per your choice.
- Do not delete existing specs: `smoke`, `agent-flow`, `dialog-a11y`, `keyboard-focus`, `skip-to-content`, `journal-hub`, `provider-flow`.
- Axe workflow remains blocking.

### Visual QA checklist (PR body)

- [ ] Desktop 1280 onboarding
- [ ] Desktop orchestrator empty
- [ ] Desktop orchestrator form expanded
- [ ] Mobile 390 onboarding
- [ ] Mobile 390 bottom nav (no 7-item scroll)
- [ ] Light theme spot check
- [ ] Matrix theme spot check
- [ ] German locale spot check of new strings
- [ ] Inference badge visible after onboarding
- [ ] Demo banner visible if sample used educational demo

---

## 11. PR hygiene template

```md
## Summary

<what the user can now do>

## Ticket

`NOW-P0-…` / `NOW-P1-…`

## Screenshots

Desktop | Mobile

## Product truth

- [ ] No forbidden phrases
- [ ] Heuristic / demo / live labeled
- [ ] Partial reports still partial

## Test plan

- commands run
- specs added/updated
- a11y notes

## Risk

<what could regress: default view, i18n ratchet, header overflow, E2E selectors>

## Rollback

Revert this PR.

## Non-goals

Explicitly list what this PR did _not_ do (OpenRouter, release cut, matcher, lucide, …).
```

---

## 12. Engagement closeout template

Write `docs/audits/2026-09-03-closeout.md` with:

- Final `main` SHA(s) merged
- Table of NOW-* tickets: done / deferred / not started
- File-size table after the wave
- Screenshots or pointers
- Residual UX debt (honest)
- Confirmation that 2026-09-02 integrity closeout remains valid
- What the next human-defined goal should **not** repeat

Also add this prompt to `docs/prompts/2026-09-03-cursor-grok-uiux-perfection-master-prompt.md` if you are allowed to commit docs in a docs PR. If the human already placed it there, do not duplicate.

---

## 13. Definition of Done

### Per PR

- CI green on the latest head
- Review bots quiescent or threads resolved
- EN+DE strings present
- No file over 700 product lines
- No forbidden phrase
- No `any` tourism
- No resurrected lucide-react / ParticleBackground
- Changelog `[Unreleased]` note for user-visible changes

### Whole engagement

- J1 and J2 can be performed on the live preview without confusion about which button starts a literature review
- Bottom nav fits a 390px phone without scrolling seven items
- Empty KB/Dashboard/History teach the next step
- Orchestrator form shows topic first, options second
- Onboarding discloses client-only + heuristic path
- Light/dark/matrix do not collapse contrast on the new surfaces
- 2026-09-02 integrity behavior unchanged (partial, watermarks, BM25+ relative scale, export caps)

---

## 14. Forbidden actions (explicit)

Do **not**:

1. Push to `main`
2. Implement OpenRouter / accept ADR 0010
3. Cut `v0.4.3` as ceremony
4. Re-split `geminiService` or export writers “again”
5. Reopen ADR 0021 / partial-report semantics
6. Lower coverage floors or disable workflows
7. Add `continue-on-error` to required jobs
8. Merge on a rate-limited review placeholder
9. Reinstall `lucide-react` or recreate `ParticleBackground.tsx`
10. Enable require-code-owner reviews
11. Write German commits, comments, or docs
12. Hard-code new user-facing English without a DE key
13. Claim AES-GCM prevents XSS
14. Claim heuristic equals Gemini / Claude / GPT
15. Silently use demo data as live PubMed
16. Mark cancelled reports `done`
17. Scrape PubMed or bypass NCBI rate limits
18. Add Chart.js
19. Expand E2E to a new browser matrix
20. Change Dexie schema without a real persisted field and tests
21. Bike-shed brand illustration for an entire PR
22. Treat this prompt as permission to rewrite Settings, Providers, or the matcher
23. Invent a backend
24. Add FR/ES UI locales as a drive-by
25. Mention “swarm of specialized AI agents” anywhere, including comments

---

## 15. Suggested first commands

```bash
git status
git rev-parse HEAD
git log -20 --pretty=format:'%h %ad %s' --date=short
wc -l src/components/Header.tsx \
      src/components/BottomNavBar.tsx \
      src/components/OnboardingView.tsx \
      src/components/HomeView.tsx \
      src/components/InputForm.tsx \
      src/components/ReportDisplay.tsx \
      src/components/settings/AISettingsTab.tsx \
      src/i18n/translations.ts
rg -n "hasCompletedOnboarding|currentView|orchestrator|Start Researching" src --glob '*.tsx' | head
```

Then read the files named in Phase 0. Then open the smallest P0 PR (`NOW-P0-JOURNEY-01`) rather than a grand redesign branch.

---

## 16. Design principles (print this above the editor)

1. **Truth before polish.** A beautiful lie is a regression.
2. **One job on the first screen after onboarding: start a literature review.**
3. **Heuristic is a first-class path on the public demo.**
4. **Progressive disclosure, not fewer capabilities.**
5. **Five mobile destinations, not seven.**
6. **Tokens, not hex souvenirs.**
7. **Empty states are part of navigation.**
8. **Motion is optional; meaning is not.**
9. **Small PRs survive this repo’s review loop; XXL PRs do not.**
10. **Leave the integrity cathedral standing. Landscape the courtyard.**

---

## 17. One-sentence north star

**Turn a truthful, over-chromed research engine into a calm product whose first five minutes produce an honest literature review — on a phone and a laptop, with or without an API key — without touching the invariants that v0.4.2 already earned.**

---

## 18. Appendix A — View map (do not break ids)

| View id         | Role today                        | Journey role after this wave          |
| --------------- | --------------------------------- | ------------------------------------- |
| `home`          | Unfinished lobby                  | Launchpad **or** secondary overview   |
| `orchestrator`  | Full pipeline + `InputForm`       | **Primary job** (“Literature review”) |
| `research`      | Rapid assistant                   | Secondary (“Quick research”)          |
| `knowledgeBase` | Deduped library + facets + charts | Library after first save              |
| `authors`       | Scientometric author hub          | Explore                               |
| `journals`      | Journal hub                       | Explore                               |
| `collections`   | User collections                  | Organize                              |
| `dashboard`     | Aggregated charts                 | After data exists                     |
| `history`       | Run history                       | After data exists                     |
| `settings`      | Provider, defaults, developer     | Always available                      |
| `help`          | Docs / glossary / about + SHA     | Always available                      |

## Appendix B — Near-cap files (split before growing)

Measure again on HEAD. Snapshot from 2026-09-02 closeout:

| File                                        | Lines then | Rule                              |
| ------------------------------------------- | ---------- | --------------------------------- |
| `src/components/ReportDisplay.tsx`          | 641        | Split if you edit heavily         |
| `src/i18n/translations.ts`                  | 660        | Put new keys in domain modules    |
| `src/components/settings/AISettingsTab.tsx` | 652        | Avoid drive-by edits              |
| `src/components/InputForm.tsx`              | 523        | Split as part of `NOW-P0-FORM-01` |
| `src/components/Header.tsx`                 | 421        | Split if chrome PR grows it       |
| `src/services/exportPdf.ts`                 | 425        | Out of scope                      |
| `src/services/geminiService.ts`             | 448        | Out of scope                      |

Test files over 700 lines are exempt.

## Appendix C — Related existing tests to keep green

- `src/components/InputForm.test.tsx`
- `src/components/Header.test.tsx`
- `src/components/LoadingIndicator.test.tsx`
- `src/components/Onboarding` — add if missing; do not skip coverage of the new sample CTA
- E2E: `smoke.spec.ts`, `keyboard-focus.spec.ts`, `skip-to-content.spec.ts`, `dialog-a11y.spec.ts`

## Appendix D — Copy tone

Professional biomedical tool. Short sentences. No hype. No “unleash”, “revolutionize”, “future of”. German must be equally sober (`Literaturrecherche`, not marketing Deutsch). Address the user as a researcher.

---

_End of master prompt. Execute Phase 0, then the smallest P0 PR. Stop when P0+P1 are honest and green, even if P2 remains._
