# Complete Codebase Audit — AI Research Orchestrator

## Executive Summary

This document consolidates all audit findings across architecture, AI inference layer, Scientometric Hubs, state management, testing, security, and UI/UX design.

---

## 1. Architecture Review

### 1.1 Tech Stack Verification

| Category | Technology | Version | Status |
|----------|------------|---------|--------|
| Framework | React | 19 | ✅ Current |
| Language | TypeScript | 5.8 | ✅ Strict mode |
| Build | Vite | 6 | ✅ Current |
| State/APIs | Redux Toolkit + RTK Query | 2 | ✅ Implemented |
| Local DB | Dexie.js + dexie-react-hooks | 4 | ✅ Working |
| AI | @google/genai | latest | ✅ Single provider |
| Styling | Tailwind CSS v4 | 4.2 | ✅ Cybernetic Glassmorphism |
| Animation | Framer Motion | 12 | ✅ Agent flows |
| Icons | lucide-react | latest | ✅ Consistent |
| Charts | Chart.js + Recharts | latest | ✅ Used in dashboards |
| Virtualization | @tanstack/react-virtual | 3 | ✅ KB article list |
| Command Palette | cmdk | 1 | ✅ Ctrl+K support |
| PDF Export | jsPDF + marked | latest | ✅ Working |
| Sanitization | DOMPurify | 3 | ✅ All HTML sanitized |
| Testing | Vitest + Playwright | latest | ⚠️ 2 E2E failures |

### 1.2 State Management Architecture

**Redux Slices:**
- `agentDebugSlice.ts` — Agent pipeline tracing
- `collectionsSlice.ts` — Research collections
- `settingsSlice.ts` — User preferences
- `uiSlice.ts` — UI state (view, notifications)
- `apiSlice.ts` — RTK Query endpoints

**Context Providers:**
- `SettingsContext` — Hydrates IndexedDB → Redux once
- `KnowledgeBaseContext` — Composes Dexie + Redux actions
- `PresetContext` — Research presets
- `UIContext` — View navigation and notifications

**Hooks Pattern:**
- `useSettings`, `useUI` — Read from Redux
- `useKnowledgeBase` — Dexie + Redux composition
- `useAuthorsViewLogic`, `useJournalsViewLogic` — Complex view logic extraction

---

## 2. AI Inference Layer Analysis

### 2.1 Live Inference (Gemini)

**Primary Service:** `src/services/geminiService.ts` (~1000 lines)

**Key Functions:**
- `generateResearchReportStream` — Main orchestrator pipeline
- `disambiguateAuthor` — Author disambiguation with AI
- `generateAuthorProfileAnalysis` — Career analysis
- `suggestAuthors` — Author recommendations
- `generateJournalProfileAnalysis` — Journal profiling
- `findSimilarArticles` — Related article search

**Provider Lock-in Issue:**
- All AI calls hardcoded to `@google/genai`
- No abstraction layer for multi-provider support
- Future work: Create `AIProvider` interface with Gemini implementation

### 2.2 Heuristic Inference (Offline)

**Directory:** `src/services/heuristics/`

| File | Purpose | Coverage |
|------|---------|----------|
| `chat.ts` | Report-based Q&A | 31% branches |
| `journalProfiling.ts` | Journal profile generation | 25% branches |
| `ranking.ts` | Article ranking algorithms | Good |
| `summarization.ts` | Text summarization | Good |
| `keywords.ts` | Keyword extraction | Good |
| `authorDisambiguation.ts` | Author clustering | Good |
| `types.ts` | Shared types | N/A |
| `utils.ts` | Utility functions | Good |

**Heuristic Features:**
- Full orchestrator pipeline works offline
- Author disambiguation works offline
- Journal profiling works offline (limited KB)
- Chat works offline (report-grounded)

---

## 3. Scientometric Hubs Feature Gap Analysis

### 3.1 Authors Hub — Complete Implementation

**Features Implemented:**
1. ✅ Author search by name
2. ✅ Author disambiguation (multiple profiles)
3. ✅ Featured authors grid (RTK Query)
4. ✅ Author suggestions by field
5. ✅ Profile analysis (career summary, metrics)
6. ✅ Publication timeline
7. ✅ Citation metrics estimation
8. ✅ First/last author analysis

### 3.2 Journals Hub — Missing Features

**Features Implemented:**
1. ✅ Journal search by name
2. ✅ Journal profile analysis (basic)
3. ✅ Featured journals grid (RTK Query)
4. ✅ Article listing within journal
5. ✅ Topic/timeline analytics

**Features Missing:**
1. ❌ **Suggest journals** — No `suggestJournals` function
2. ❌ **Journal disambiguation** — No `disambiguateJournal` function
3. ❌ **Impact factor display** — Not integrated
4. ❌ **Open access timeline** — Not implemented
5. ❌ **Rich profile view** — No detailed metrics like author profile

**Recommendation:** Mirror Authors Hub pattern for Journals Hub to achieve feature parity.

---

## 4. Testing Coverage Audit

### 4.1 Unit Tests

**Coverage Thresholds:** `vitest.config.ts` — 80% lines/statements

**Test Files:**
- `src/services/*.test.ts` — Service logic tests
- `src/store/slices/*.test.ts` — Redux slice tests
- `src/components/*.test.tsx` — Component tests

### 4.2 E2E Tests — 2 Failures Identified

#### Failure 1: "KB shows empty-state message when no data saved"

**Location:** `src/test/e2e/agent-flow.spec.ts` line 268

**Root Cause:**
- Test sets `aro.demoDataSeeded = '1'` which seeds demo data
- Demo data creates 5 sample articles in Knowledge Base
- Test expects empty state but finds "5 Articles Found"

**Current Test Code:**
```typescript
await page.evaluate(() => {
  try {
    localStorage.setItem('aro.demoDataDismissed', '1');
    localStorage.setItem('aro.demoDataSeeded', '1');  // ← Seeds demo data
  } catch { /* ignore */ }
});
await expect(
  page.getByText(/empty|no articles|save reports|start research/i).first(),
).toBeVisible({ timeout: 10_000 });
```

**Fix Options:**
1. Remove `aro.demoDataSeeded = '1'` to test true empty state
2. Update assertion to check for demo data presence: "5 Articles Found"
3. Add separate test for demo-seeded state

#### Failure 2: "invalid key format shows error after save"

**Location:** `src/test/e2e/agent-flow.spec.ts` line 406

**Root Cause:**
- Test looks for German button text "Speichern"
- UI shows English "Save" button
- Button text mismatch causes assertion failure

**Current Test Code:**
```typescript
await page
  .getByRole('button', { name: /speichern/i })  // ← German text
  .first()
  .click();
```

**Fix Options:**
1. Use English button text: `name: /save/i`
2. Use i18n-aware selector with regex for both languages
3. Wait for button by role and click without text match

---

## 5. Security Audit

### 5.1 API Key Handling

**Implementation:** `src/services/apiKeyService.ts`

- AES-GCM encryption via Web Crypto API
- IndexedDB storage (never in localStorage)
- Key format validation (39 chars, "AIza" prefix)
- No key exposure in DOM or network requests

### 5.2 CSP Configuration

**Issue:** `index.html` uses `'unsafe-inline'` in style-src

**Recommendation:** Use nonce-based CSP or hash-based approach for inline styles

### 5.3 Data Privacy

- All data stored locally in IndexedDB
- No backend server for user data
- Demo data clearly marked and dismissible
- Heuristic mode works fully offline

---

## 6. Internationalization Audit

### 6.1 Translation Coverage

**File:** `src/i18n/translations.ts`

| Language | Keys | Coverage |
|----------|------|----------|
| English | ~120 | 100% |
| German | ~120 | ~60% |

### 6.2 Hardcoded Strings — Critical Issues

#### HelpView.tsx
- All guide topics hardcoded (~60 strings)
- All FAQ items hardcoded
- All glossary entries hardcoded
- About section hardcoded

#### OnboardingView.tsx
- Step card titles and descriptions hardcoded (~15 strings)
- Welcome message hardcoded

#### ApiKeySettings.tsx (Partially Fixed)
- ✅ "Save" button now uses `t('apikey.save')`
- ✅ "Saving..." now uses `t('apikey.saving')`
- ✅ "Remove" now uses `t('apikey.remove')`
- ✅ "Reveal" now uses `t('apikey.reveal')`
- ❌ Security notice text still hardcoded
- ❌ "How to get a Gemini API key" instructions still hardcoded

---

## 7. UI/UX Design System

### 7.1 Theme Architecture

**Three Themes:**
1. **Ink Dark** (default) — Teal/slate dark mode
2. **Paper Light** — Light mode alternative
3. **Matrix Green** — Cyberpunk aesthetic

**CSS Variables:**
- `--color-background`, `--color-surface`, `--color-border`
- `--color-text-primary`, `--color-text-secondary`
- `--color-brand-accent`, `--color-brand-primary`
- `--shadow-sm/md/lg/glow`
- `--aurora-1/2/3` for ambient background

### 7.2 Glassmorphism Depth Levels

| Class | Blur | Use Case |
|-------|------|----------|
| `.glass-1` | 4px | Subtle elevation |
| `.glass-2` | 12px | Standard panels |
| `.glass-3` | 24px | Deep panels |
| `.glass-4` | 40px | Modals/overlays |

### 7.3 Accessibility Compliance

**WCAG 2.2 AA Features:**
- ARIA roles for pipeline, tabs, accordions
- Focus trap for modals
- Keyboard navigation (Tab, Ctrl+K)
- Screen reader support (.sr-only class)
- Reduced motion support

---

## 8. Changes Made During Audit

### 8.1 Translation Keys Added

Added to `src/i18n/translations.ts`:
- `apikey.save`, `apikey.saving`, `apikey.remove`
- `apikey.reveal`, `apikey.hide`, `apikey.enter`
- `apikey.update`, `apikey.no_key`, `apikey.has_key`
- `apikey.placeholder`, `apikey.required`, `apikey.invalid`
- `apikey.saved`, `apikey.removed`, `apikey.save_failed`
- `apikey.get_failed`, `apikey.ncbi.*` (all NCBI-related)
- `apikey.security.*` (security notice text)

### 8.2 ApiKeySettings Component Updated

Changed hardcoded strings to use `t()` function:
- Error messages now use translation keys
- Success messages now use translation keys
- Button text now uses translation keys

**Remaining Hardcoded Strings:**
- Security notice paragraph text
- "How to get a Gemini API key" instructions
- "Gemini API key configured" status text
- "Your key is stored securely..." description

---

## 9. Recommended Action Items

### 9.1 Immediate (High Priority)

1. **Fix E2E tests** — Update assertions for demo data and button text
2. **Complete i18n in ApiKeySettings** — Extract remaining hardcoded strings
3. **Extract HelpView content** — Move to translations.ts
4. **Extract OnboardingView content** — Move to translations.ts

### 9.2 Short-term (Medium Priority)

1. **Add Journal Hub features** — Implement suggest/disambiguate
2. **Complete German translations** — Expand DE coverage
3. **Improve heuristic test coverage** — Add tests for chat.ts, journalProfiling.ts
4. **Fix CSP** — Remove unsafe-inline from style-src

### 9.3 Long-term (Low Priority)

1. **Multi-provider AI abstraction** — Create AIProvider interface
2. **Theme transition animations** — Smooth theme switching
3. **Reduced motion toggle** — User preference setting
4. **Impact factor integration** — Journal metrics API

---

## 10. File References

| Component | File Path |
|-----------|-----------|
| Main App | `src/App.tsx` |
| Design System | `src/index.css` |
| Translations | `src/i18n/translations.ts` |
| Gemini Service | `src/services/geminiService.ts` |
| Heuristics | `src/services/heuristics/` |
| Authors View | `src/components/AuthorsView.tsx` |
| Journals View | `src/components/JournalsView.tsx` |
| Knowledge Base | `src/components/KnowledgeBaseView.tsx` |
| Settings | `src/components/SettingsView.tsx` |
| Help View | `src/components/HelpView.tsx` |
| Onboarding | `src/components/OnboardingView.tsx` |
| E2E Tests | `src/test/e2e/agent-flow.spec.ts` |

---

*Audit completed: 2026-07-18*