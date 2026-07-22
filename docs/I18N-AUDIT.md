# i18n (Internationalization) Audit

**Date:** 2026-07-18  
**Reviewer:** GitHub Copilot  
**Version:** 0.2.1

> **⚠️ Known stale, 2026-07-22.** This audit's headline "German Parity 6/10 /
> incomplete" score is no longer true: `src/i18n/translations.test.ts` now hard-gates
> exact EN/DE key-set parity (every key in one locale has a counterpart in the other)
> and rejects empty translation values, as a normal part of the test suite — coverage
> is a CI invariant now, not a percentage to track here. The "Hardcoded Strings 4/10 —
> HelpView" line is still accurate (re-verified, `HelpView.tsx` has zero `t()` calls).
> This document will be **fully rewritten** as the closing step of the in-progress i18n
> migration effort (see the migration plan's final wave), once the new
> `src/i18n/translate.ts` non-React translate path and the full namespace/key inventory
> it introduces are in place — rewriting it now would just need rewriting again in a
> few weeks. Until then, treat only the "Hardcoded Strings" line below as current.

---

## Executive Summary

| Aspect               | Score | Notes                                      |
| -------------------- | ----- | ------------------------------------------ |
| Translation Coverage | 7/10  | Good core coverage, some hardcoded strings |
| Architecture         | 8/10  | Clean hook-based approach with fallback    |
| Type Safety          | 9/10  | Strong typing with `TranslationKey`        |
| German Parity        | 6/10  | Incomplete German translations             |
| Hardcoded Strings    | 4/10  | Significant hardcoded English in HelpView  |
| Test Coverage        | 6/10  | Basic hook tests only                      |

**Overall i18n Health Score: 6.6/10**

---

## 1. Current Architecture

### 1.1 File Structure

```
src/
├── i18n/
│   └── translations.ts          # All translations (EN + DE)
├── hooks/
│   └── useTranslation.ts        # Translation hook
└── components/
    ├── CheckpointResumeBanner.tsx # Uses t()
    ├── Header.tsx               # Uses t()
    ├── HomeView.tsx             # Uses t()
    ├── InferenceModeBadge.tsx   # Uses t()
    ├── OrchestratorView.tsx     # Uses t()
    ├── SettingsView.tsx         # Uses t()
    └── journals/
        └── JournalsSubComponents.tsx # Uses t()
```

### 1.2 Translation Hook Implementation

```typescript
// src/hooks/useTranslation.ts
export const useTranslation = () => {
  const { settings } = useSettings();
  const lang = settings.appLanguage;

  const t = useCallback(
    (key: TranslationKey | (string & {})): string => {
      const currentLangTranslations = translations[lang];
      const fallbackTranslations = translations['en'];

      if (
        currentLangTranslations &&
        Object.prototype.hasOwnProperty.call(currentLangTranslations, key)
      ) {
        return currentLangTranslations[key as TranslationKey];
      }

      if (fallbackTranslations && Object.prototype.hasOwnProperty.call(fallbackTranslations, key)) {
        return fallbackTranslations[key as TranslationKey];
      }

      return key; // Returns key if not found
    },
    [lang],
  );

  return { t, lang };
};
```

**Strengths:**

- ✅ Automatic fallback to English
- ✅ Memoized for performance
- ✅ Type-safe with `TranslationKey`

**Weaknesses:**

- ❌ No warning for missing translations
- ❌ No pluralization support
- ❌ No interpolation beyond simple `${}` in some strings

---

## 2. Translation Coverage Analysis

### 2.1 Total Translation Keys

| Language | Keys Count | Coverage          |
| -------- | ---------- | ----------------- |
| English  | ~120 keys  | 100% (source)     |
| German   | ~120 keys  | ~60% (incomplete) |

### 2.2 Key Categories

| Category          | EN Keys | DE Keys | Status           |
| ----------------- | ------- | ------- | ---------------- |
| Navigation        | 12      | 12      | ✅ Complete      |
| Home View         | 6       | 6       | ✅ Complete      |
| Settings          | 25      | 25      | ✅ Complete      |
| Orchestrator      | 10      | 10      | ✅ Complete      |
| Scientometrics    | 5       | 5       | ✅ Complete      |
| Checkpoints       | 12      | 12      | ✅ Complete      |
| Cost Estimator    | 10      | 10      | ✅ Complete      |
| Charts            | 4       | 4       | ✅ Complete      |
| Offline/Heuristic | 10      | 10      | ✅ Complete      |
| **Help View**     | **0**   | **0**   | 🔴 **Hardcoded** |
| **Onboarding**    | **0**   | **0**   | 🔴 **Hardcoded** |

---

## 3. Hardcoded Strings Analysis

### 3.1 OnboardingView.tsx (100% hardcoded)

**File:** `src/components/OnboardingView.tsx`

| Location | String                                                          | Should Be Translated |
| -------- | --------------------------------------------------------------- | -------------------- |
| Line 24  | "Welcome to the Future of Research"                             | ✅                   |
| Line 25  | "Your intelligent assistant for scientific literature reviews." | ✅                   |
| Line 31  | "Define Your Topic"                                             | ✅                   |
| Line 32  | "Enter any research query..."                                   | ✅                   |
| Line 33  | "The AI researches, filters..."                                 | ✅                   |
| Line 34  | "Leverage Your Knowledge"                                       | ✅                   |
| Line 35  | "Build a personal, de-duplicated..."                            | ✅                   |
| Line 39  | "Start Researching"                                             | ✅                   |
| Line 40  | "Your data remains private..."                                  | ✅                   |

**Total hardcoded strings: ~15**

### 3.2 HelpView.tsx (100% hardcoded)

**File:** `src/components/HelpView.tsx`

| Section        | Hardcoded Strings |
| -------------- | ----------------- |
| Guide Topics   | ~50 strings       |
| FAQ Items      | ~20 strings       |
| Glossary Items | ~15 strings       |
| About Section  | ~10 strings       |

**Total hardcoded strings: ~95**

### 3.3 Other Components

| File                         | Hardcoded Strings |
| ---------------------------- | ----------------- |
| `CheckpointResumeBanner.tsx` | 0 (uses t())      |
| `Header.tsx`                 | 0 (uses t())      |
| `HomeView.tsx`               | 0 (uses t())      |
| `InferenceModeBadge.tsx`     | 0 (uses t())      |
| `OrchestratorView.tsx`       | 0 (uses t())      |
| `SettingsView.tsx`           | 0 (uses t())      |
| `JournalsSubComponents.tsx`  | 0 (uses t())      |

---

## 4. German Translation Quality

### 4.1 Well-Translated Sections

- Navigation labels
- Settings UI
- Orchestrator phases
- Scientometrics labels
- Checkpoint messages

### 4.2 Incomplete German Translations

Many German translations are missing or incomplete:

| Key                       | English              | German                        | Issue              |
| ------------------------- | -------------------- | ----------------------------- | ------------------ |
| `home.card.research.desc` | "Perform a quick..." | "Führen Sie eine schnelle..." | ✅ Good            |
| `settings.cost.title`     | "Estimated run cost" | "Geschätzte Laufkosten"       | ✅ Good            |
| `inference.badge.live`    | "Live · Gemini"      | "Live · Gemini"               | ⚠️ Same as English |
| `inference.badge.force`   | "Heuristic · Forced" | "Heuristik · Erzwungen"       | ✅ Good            |

### 4.3 German Translation Issues

1. **Mixed terminology:** "Heuristik" vs "Heuristic" in some places
2. **Missing compound nouns:** Some technical terms not properly translated
3. **Formal/informal inconsistency:** Mix of formal and informal address

---

## 5. Missing Translation Keys

### 5.1 Journal Hub Specific

| Missing Key                   | Context                   |
| ----------------------------- | ------------------------- |
| `journals.search_placeholder` | Search input placeholder  |
| `journals.analyze`            | Analyze button text       |
| `journals.no_articles`        | No articles found message |
| `journals.focus_areas`        | Focus areas label         |
| `journals.open_access`        | Open access label         |

### 5.2 Author Hub Specific

| Missing Key                    | Context                   |
| ------------------------------ | ------------------------- |
| `authors.search_placeholder`   | Search input placeholder  |
| `authors.suggest_placeholder`  | Suggest field placeholder |
| `authors.analyze`              | Analyze button text       |
| `authors.suggest`              | Suggest button text       |
| `authors.disambiguation_title` | Disambiguation heading    |

### 5.3 General Missing Keys

| Missing Key      | Context        |
| ---------------- | -------------- |
| `common.loading` | Loading states |
| `common.error`   | Error messages |
| `common.retry`   | Retry button   |
| `common.cancel`  | Cancel button  |
| `common.save`    | Save button    |

---

## 6. Test Coverage

### 6.1 Current Tests

**File:** `src/hooks/useTranslation.test.tsx`

```typescript
describe('useTranslation', () => {
  it('resolves key for current language', () => {
    // Tests EN resolution
  });

  it('falls back to English for unknown keys', () => {
    // Tests fallback behavior
  });

  it('does not treat prototype properties as translation keys', () => {
    // Tests edge case
  });
});
```

**Coverage:** Basic functionality only

### 6.2 Missing Tests

- ❌ No test for German translation resolution
- ❌ No test for missing key handling
- ❌ No test for dynamic interpolation
- ❌ No snapshot tests for translated UI

---

## 7. Recommendations

### 7.1 Immediate Actions (P0)

1. **Extract HelpView strings** - Move all hardcoded strings to translations
2. **Extract OnboardingView strings** - Move all hardcoded strings to translations
3. **Add missing Journal Hub keys** - For feature parity

### 7.2 Short-term Actions (P1)

4. **Complete German translations** - Fill in missing German strings
5. **Add i18n warning in dev** - Log missing keys during development
6. **Add pluralization support** - For article counts, etc.

### 7.3 Long-term Actions (P2)

7. **Add interpolation support** - For dynamic values
8. **Add date/time localization** - For timestamps
9. **Add number formatting** - For metrics, counts
10. **Consider external translation service** - For professional translations

---

## 8. Implementation Plan

### Phase 1: Extract Hardcoded Strings (2-3 days)

```typescript
// Add to translations.ts
en: {
  'onboarding.welcome': 'Welcome to the Future of Research',
  'onboarding.subtitle': 'Your intelligent assistant...',
  'onboarding.step1_title': 'Define Your Topic',
  // ... all onboarding strings
  'help.guide.workflow_title': 'Understanding the Core Workflows',
  // ... all help strings
}
```

### Phase 2: Complete German Translations (2-3 days)

- Translate all extracted strings
- Review terminology consistency
- Fix formal/informal usage

### Phase 3: Add Missing Keys (1 day)

- Journal Hub specific keys
- Author Hub specific keys
- Common UI strings

### Phase 4: Improve Testing (1 day)

- Add German language tests
- Add missing key warning tests
- Add snapshot tests

---

## 9. Key Files to Modify

| File                                                | Changes                            |
| --------------------------------------------------- | ---------------------------------- |
| `src/i18n/translations.ts`                          | Add ~120 new keys, complete German |
| `src/components/OnboardingView.tsx`                 | Replace hardcoded strings with t() |
| `src/components/HelpView.tsx`                       | Replace hardcoded strings with t() |
| `src/components/journals/JournalsSubComponents.tsx` | Add missing keys                   |
| `src/components/authors/AuthorsSubComponents.tsx`   | Add missing keys                   |
| `src/hooks/useTranslation.test.tsx`                 | Add comprehensive tests            |

---

## 10. Risk Assessment

| Risk                           | Level  | Mitigation                      |
| ------------------------------ | ------ | ------------------------------- |
| Breaking existing translations | Low    | Keep existing keys unchanged    |
| German translation quality     | Medium | Professional review recommended |
| Bundle size increase           | Low    | ~5KB additional strings         |
| Test coverage gaps             | Medium | Add tests before merge          |

---

## Appendix A: Translation Key Inventory

### Current Keys (English)

```
app.name
nav.home, nav.research, nav.orchestrator, nav.authors, nav.journals
nav.knowledgeBase, nav.dashboard, nav.history, nav.settings, nav.help
nav.search_placeholder, nav.quick_add
home.welcome, home.card.research.title/desc
home.card.orchestrator.title/desc, home.card.authors.title/desc
home.card.journals.title/desc
settings.title, settings.subtitle, settings.general, settings.ai
settings.appearance, settings.language, settings.language.desc
settings.theme, settings.theme.light/dark/matrix
settings.font.label, settings.font.figtree/sora/ibm_plex/jetbrains/legacy_inter
settings.save, settings.cancel
orchestrator.title, orchestrator.start, orchestrator.initializing
orchestrator.save_report, orchestrator.new_search, orchestrator.export
orchestrator.phase1-7, orchestrator.cost_preflight
nav.collections, collections.title/subtitle/new/empty.title/empty.desc
collections.create/edit/delete.confirm/share/copied
debugger.title, debugger.live, debugger.tokens, debugger.cost
debugger.clear, debugger.empty
theme.cyber_dark, theme.neon_light, theme.matrix_green, theme.switch_to
arxiv.source, arxiv.categories, arxiv.pdf
scientometrics.title, scientometrics.authors/timeline/journals/keywords
checkpoint.resume.title/desc, checkpoint.restore/rerun/discard
checkpoint.reason.abort/error/manual, checkpoint.articles/has_synthesis
checkpoint.restored, checkpoint.discarded
settings.cost.title/desc/estimate/tier/input_tokens/output_tokens
settings.cost.based_on, settings.cost.scan/top_n, settings.cost.warn/disclaimer
charts.citations, charts.no_citation_timeline/no_topic_data/no_publication_years
offline.banner, inference.tooltip.live/force/offline/no_key
inference.demo.banner/dismiss, settings.cost.heuristic_zero
settings.inference.title/force/current/forced_preview/derived/force_desc
inference.badge.live/force/offline/no_key/heuristic
```

### Missing Keys (to add)

```
onboarding.welcome, onboarding.subtitle
onboarding.step1_title/desc, onboarding.step2_title/desc
onboarding.step3_title/desc, onboarding.start_button
onboarding.privacy_note
help.guide.workflow_title/content
help.guide.orchestrator_title/content
help.guide.research_title/content
help.guide.author_title/content
help.guide.knowledge_title/content
help.guide.export_title/content
help.guide.navigation_title/content
help.faq.privacy_title/content
help.faq.trust_title/content
help.faq.pubmed_title/content
help.faq.cost_title/content
help.faq.missing_title/content
help.faq.shortcuts_title/content
help.glossary.persona_title/content
help.glossary.disambiguation_title/content
help.glossary.bibtex_title/content
help.glossary.pmid_title/content
help.glossary.heuristic_title/content
help.about.title, help.about.version
help.about.principles_title
help.about.privacy_title/content
help.about.disclaimer_title/content
journals.search_placeholder, journals.analyze_button
journals.no_articles, journals.focus_areas_label
authors.search_placeholder, authors.suggest_placeholder
authors.analyze_button, authors.suggest_button
authors.disambiguation_title, authors.disambiguation_desc
common.loading, common.error, common.retry, common.cancel, common.save
```

---

_End of i18n Audit Document_
