# UI/UX Audit — AI Research Orchestrator

> **Re-validated 2026-07-22** against `main` (post PR #64–#67). Sections 1–4 and 9–10
> (design system, accessibility, responsive design, component architecture, visual
> hierarchy, security/privacy UI) are living documentation and remain accurate — kept
> as-is. Sections 5–8 described gaps and failures that have since been closed; they are
> updated in place below rather than left stale, with a short "already done" record kept
> for historical context instead of silently deleting the section.

## Executive Summary

The AI Research Orchestrator implements a sophisticated "Cybernetic Glassmorphism" design system with excellent attention to accessibility, responsive design, and visual hierarchy. The codebase demonstrates mature UI architecture with proper separation of concerns, consistent theming, and WCAG 2.2 AA compliance.

---

## 1. Design System Analysis

### 1.1 Theme Architecture

**Three distinct themes implemented:**

| Theme                  | Purpose                | Key Characteristics                                                                               |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| **Ink Dark** (default) | Primary dark mode      | Teal/slate palette, deep backgrounds (`#070b12`), glass panels with `backdrop-filter: blur(24px)` |
| **Paper Light**        | Light mode alternative | Light backgrounds (`#eef3f7`), higher contrast text (`#0f172a`), softer shadows                   |
| **Matrix Green**       | Cyberpunk aesthetic    | Matrix-green accents (`#34d399`), scanline effects, terminal-inspired visuals                     |

**CSS Custom Properties:**

- Consistent token system: `--color-background`, `--color-surface`, `--color-border`, `--color-text-primary/secondary`
- Semantic color tokens: `--color-danger`, `--color-success`, `--color-warning`, `--color-info`
- Shadow system: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glow`
- Typography: `--font-sans`, `--font-display`, `--font-mono`
- Focus ring: `--focus-ring` with proper color-mix for accessibility

### 1.2 Glassmorphism Implementation

**Depth Levels (`.glass-1` through `.glass-4`):**

- `glass-1`: 4px blur (subtle elevation)
- `glass-2`: 12px blur (standard panels)
- `glass-3`: 24px blur (deep panels)
- `glass-4`: 40px blur (modal/overlay surfaces)

**Component Applications:**

- `.agent-card`: 24px blur with left accent border, status-based coloring
- `.kb-item`: 20px blur with relevance indicator bar
- `.glass-elevated`: 40px blur for deep elevation
- `.panel-card`: 16px blur for settings panels

### 1.3 Animation System

**Key Animations:**

- `neonFlicker`: Subtle opacity flicker for live indicators
- `pulseGlow`: Expanding glow effect for focus states
- `pipelineFlow`: Horizontal progress bar animation
- `pipelineNodePulse`: Pulsing node indicator during agent phases
- `agentCardPulse`: Card elevation animation during running state
- `fadeIn/slideIn*`: View transition animations

**Reduced Motion Support:**

- `.no-animations *` utility class disables all animations
- Respects `prefers-reduced-motion` media query

---

## 2. Accessibility Compliance (WCAG 2.2 AA)

### 2.1 ARIA Implementation

**Proper ARIA patterns observed:**

- `role="list"` and `role="listitem"` for pipeline steps
- `aria-label` for navigation regions
- `aria-expanded` and `aria-controls` for accordion components
- `role="tab"` and `role="tabpanel"` for settings navigation
- `aria-live` regions for status updates
- `aria-hidden="true"` for decorative elements

### 2.2 Keyboard Navigation

**Implemented patterns:**

- Focus trap for modals (`useFocusTrap` hook)
- Tab navigation through settings tabs
- Keyboard shortcuts: `Ctrl+K` for command palette
- Focus-visible styles with `--focus-ring` token

### 2.3 Screen Reader Support

- `.sr-only` utility class for screen-reader-only text
- Semantic heading hierarchy (h1 → h2 → h3)
- Descriptive button labels and icon alternatives
- Status announcements for agent pipeline phases

---

## 3. Responsive Design

### 3.1 Breakpoint Strategy

**Mobile-first approach:**

- Mobile: Bottom navigation bar (`BottomNavBar.tsx`)
- Desktop (≥768px): Sidebar filters in Knowledge Base
- Desktop (≥1024px): Full header navigation

### 3.2 Component Responsiveness

**Knowledge Base View:**

- Sidebar hidden on mobile (`hidden md:block`)
- Flexible article list with `flex-1 min-w-0`
- Responsive grid for filters and charts

**Settings View:**

- Tab list on left (`md:col-span-1`)
- Tab panels on right (`md:col-span-3`)
- Stacked layout on mobile

---

## 4. Component Architecture

### 4.1 Context + SubComponents Pattern

**AuthorsView:**

```
AuthorsView.tsx
├── AuthorsViewContext.tsx (context provider)
├── useAuthorsViewLogic.ts (business logic hook)
└── AuthorsSubComponents.tsx
    ├── LandingView
    ├── FeaturedAuthorsView
    ├── DisambiguationView
    └── AuthorProfileView
```

**JournalsView:**

```
JournalsView.tsx
├── JournalsViewContext.tsx
├── useJournalsViewLogic.ts
└── JournalsSubComponents.tsx
    ├── ArticleListItem
    ├── AnalysisCharts
    └── FeaturedJournalsGrid
```

**KnowledgeBaseView:**

```
KnowledgeBaseView.tsx
├── KnowledgeBaseViewContext.tsx
├── useKnowledgeBaseLogic.ts
└── KnowledgeBaseSubComponents.tsx
    ├── SidebarFilters
    ├── HeaderControls
    ├── BulkActionsToolbar
    ├── ArticleList
    └── Pagination
```

### 4.2 Reusable UI Primitives

Located in `src/components/ui/` and `src/components/`:

- `EmptyState.tsx`: Consistent empty state with icon, title, message, action
- `LoadingIndicator.tsx`: Multi-phase loading with progress visualization
- `ConfirmationModal.tsx`: Reusable modal with focus trap
- `Toggle.tsx`: Accessible toggle switch
- `SettingCard.tsx`: Consistent settings card layout

---

## 5. Scientometric Hubs Comparison

### 5.1 Authors Hub (Complete)

| Feature               | Status | Implementation                              |
| --------------------- | ------ | ------------------------------------------- |
| Search by author name | ✅     | `handleSearch` in `useAuthorsViewLogic.ts`  |
| Author disambiguation | ✅     | `disambiguateAuthor` → `DisambiguationView` |
| Featured authors      | ✅     | RTK Query `useGetFeaturedAuthorsQuery`      |
| Author suggestions    | ✅     | `suggestAuthors` in `geminiService.ts`      |
| Profile analysis      | ✅     | `generateAuthorProfileAnalysis`             |
| Career timeline       | ✅     | Computed from article publication years     |
| Citation metrics      | ✅     | Estimated from publication age              |

### 5.2 Journals Hub (Complete, one gap remains)

**2026-07-22 update:** the four items originally flagged here as missing/incomplete
are done — re-verified directly against current `geminiService.ts`/`journalProfiler.ts`.

| Feature                  | Status | Implementation                                                                                                                    |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Search by journal name   | ✅     | `handleAnalyzeJournal` in `useJournalsViewLogic.ts`                                                                               |
| Journal profile analysis | ✅     | `generateJournalProfileAnalysis` (Gemini + heuristic fallback)                                                                    |
| Featured journals grid   | ✅     | RTK Query `useGetFeaturedJournalsQuery`                                                                                           |
| Suggest journals         | ✅     | `suggestJournalsHeuristic` (`geminiService.ts:39,1011`), curated `FIELD_JOURNALS` KB                                              |
| Journal disambiguation   | ✅     | `disambiguateJournalHeuristic` (`geminiService.ts:38,958`) → `JournalDisambiguationView`                                          |
| Rich profile view        | ✅     | `JournalProfileView.tsx` with metrics grid                                                                                        |
| Impact factor display    | ✅     | `JournalProfileView.tsx:71`, sourced from `journalData.ts`'s curated KB                                                           |
| **Open access timeline** | ❌     | Still not implemented — only a generic "Activity Timeline" chart and a static OA-policy label exist, no OA-history-over-time view |

---

## 6. Internationalization (i18n) Audit

**2026-07-22 update:** this section originally scored coverage as a point-in-time
percentage. That framing is now obsolete — `src/i18n/translations.test.ts` **hard-gates
exact EN/DE key-set parity** (every `en` key has a `de` counterpart and vice versa) and
rejects empty values in either locale, as a normal part of the test suite. Coverage is no
longer a percentage to audit periodically; it's a CI invariant. See that test file for the
authoritative, always-current state, and see `docs/adr/` / the i18n migration plan for the
namespace conventions new keys should follow.

### 6.1 Hardcoded strings (still real, re-verified)

**`HelpView.tsx`** — still fully hardcoded, zero `t()` calls, confirmed directly against
current source. All guide topics, FAQ items, glossary entries, and the About section are
plain English strings. Tracked in `docs/HARDCODED-STRINGS-REMAINING.md` and scoped as its
own dedicated migration PR (the i18n migration plan's Wave 8) given its size (~800 lines).

**`OnboardingView.tsx`** — **done**. Every string this section originally flagged here now
goes through `t()` (12 call sites confirmed).

**`SettingsView.tsx`** — the "About & Features" / "FAQ & Shortcuts" button labels are
**still hardcoded** (confirmed at their current line numbers). Folded into the i18n
migration plan's broader UI-chrome sweep rather than tracked here individually.

---

## 7. E2E Test Failures Analysis

**2026-07-22 update:** both failures this section described are **resolved**. They were
fixed in PR #63 (2026-07-21, "fix: settings persistence corruption on boot + 2 known-failing
E2E tests") — the current `src/test/e2e/agent-flow.spec.ts` explicitly clears IndexedDB and
reloads before asserting the Knowledge Base empty state, and uses a `/^(save|speichern)$/i`
regex for the API-key save button, so it passes in either language. Removed the original
root-cause/fix-required writeup below since it no longer describes anything actionable —
see `docs/e2e-ci-backlog.md` for the current, live E2E tracking document instead.

---

## 8. Recommendations

**2026-07-22 update:** re-scored against current `main`. Items already shipped since this
audit was written are struck from the list; only genuinely open items remain.

### 8.1 Open

1. **Extract `HelpView.tsx`'s hardcoded strings** — scoped as the i18n migration plan's
   Wave 8 (own PR, given size).
2. **Add an open-access-over-time journal timeline** — the one remaining Journals Hub gap
   from §5.2.
3. **Broader hardcoded-string sweep** — `SettingsSubComponents.tsx`, modal titles, and
   ~220 aria-label/title/placeholder/JSX-text instances across the rest of the app,
   scoped in the i18n migration plan's later waves.

### 8.2 Already done (kept for historical context, not actionable)

- ~~Fix E2E tests~~ — done in PR #63.
- ~~Extract OnboardingView.tsx strings~~ — done.
- ~~Add Journal Hub features (`suggestJournals`, `disambiguateJournal`, impact factor,
  rich profile view)~~ — all done, see §5.2.
- ~~Complete German translations~~ — done, now CI-enforced (§6).

### 8.3 Low Priority (unchanged, still just nice-to-have)

1. **Add theme transition animations** - Smooth theme switching
2. **Implement reduced motion toggle** - User preference for animations
3. **Add more glass depth levels** - Additional blur variants for nested modals

---

## 9. Visual Hierarchy Assessment

### 9.1 Typography Scale

- Display headings: `text-4xl` with `brand-gradient-text`
- Section headings: `text-2xl` to `text-3xl`
- Body text: `text-base` to `text-lg`
- Secondary text: `text-sm` with `text-text-secondary`

### 9.2 Color Contrast

All themes maintain WCAG AA contrast ratios:

- Text on surface: ≥4.5:1
- Accent on surface: ≥3:1
- Focus indicators: Visible with `--focus-ring`

### 9.3 Spacing System

Consistent use of Tailwind spacing:

- Container padding: `px-4 sm:px-6 lg:px-8`
- Section gaps: `space-y-6` to `space-y-12`
- Component padding: `p-4` to `p-8`

---

## 10. Security & Privacy UI

### 10.1 API Key Handling

- Encrypted storage with Web Crypto AES-GCM
- Masked input with reveal toggle
- Security notice banner in settings
- No key exposure in DOM or logs

### 10.2 Privacy Indicators

- Demo data banner with clear/dismiss option
- Heuristic mode badge showing local-only operation
- Offline banner when network unavailable
- Clear privacy messaging in onboarding

---

_Audit completed 2026-07-18: Comprehensive analysis of design system, accessibility, component architecture, and identified gaps. Re-validated and corrected 2026-07-22._
