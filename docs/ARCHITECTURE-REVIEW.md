# AI Research Orchestrator - Architecture Review

**Date:** 2026-07-18  
**Reviewer:** GitHub Copilot  
**Version:** 0.2.1

---

## Executive Summary

This document consolidates findings from a comprehensive codebase audit covering:
- High-level architecture overview
- Scientometric Hub feature gaps (Authors vs Journals)
- AI inference layer analysis
- Security and code quality assessment
- Testing coverage evaluation
- Multi-provider refactoring recommendations

**Overall Health Score: 6.75/10**

The codebase has solid foundations but requires significant architectural changes for multi-provider support and Journal Hub feature parity.

---

## 1. High-Level Architecture Overview

### 1.1 Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 19 |
| Language | TypeScript | 5.8 (strict mode) |
| Build | Vite | 6 |
| State/API | Redux Toolkit + RTK Query | 2 |
| Local DB | Dexie.js + dexie-react-hooks | 4 |
| AI Provider | @google/genai (Gemini) | latest |
| Styling | Tailwind CSS v4 | 4.2 |
| Animation | Framer Motion | 12 |
| Charts | Chart.js + react-chartjs-2, Recharts | latest |

### 1.2 Architecture Patterns

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                         │
│  React 19 Components + Context Providers + Redux Store       │
├─────────────────────────────────────────────────────────────┤
│                    State Management                         │
│  Redux Slices: settings, ui, knowledgeBase, agentDebug,       │
│  collections, theme                                          │
│  RTK Query: researchApi (PubMed/arXiv), geminiApi (AI)       │
├─────────────────────────────────────────────────────────────┤
│                    Persistence Layer                          │
│  IndexedDB via Dexie.js (APIKeyVault, AIResearchAppDatabase) │
├─────────────────────────────────────────────────────────────┤
│                    AI Inference Layer                         │
│  geminiService.ts (live) ↔ researchOrchestratorAdapter.ts     │
│  ↔ heuristics/ (offline fallback)                           │
├─────────────────────────────────────────────────────────────┤
│                    External APIs                              │
│  Google Gemini API, NCBI PubMed E-utilities, arXiv API         │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Key Design Decisions

- **Local-first:** All user data in IndexedDB; zero backend dependency
- **Progressive enhancement:** Live Gemini with heuristic fallback
- **Agentic pipeline:** Multi-phase orchestration (query → search → rank → synthesize)
- **Single provider:** Currently Gemini-only with planned multi-provider support

---

## 2. Scientometric Hub Gap Analysis

### 2.1 Feature Parity Matrix

| Feature | AuthorsView | JournalsView | Gap |
|---------|-------------|--------------|-----|
| Landing page with dual-mode input | ✅ Search + Suggest tabs | ❌ Single search input | Missing "Suggest Journals" mode |
| Featured content grid | ✅ Categorized with icons, pagination | ✅ Flat list (no categories) | Missing categorization |
| Disambiguation flow | ✅ Multi-cluster author disambiguation | ❌ No journal disambiguation | Missing entirely |
| Profile analysis | ✅ Career summary, metrics, co-authors, concepts | ✅ Basic journal profile | Less rich than author profile |
| Multi-phase loading UI | ✅ Detailed phase indicators with substeps | ❌ Simple loading state | Missing detailed progress |
| Analytics charts | ✅ Citation timeline, co-author network | ✅ Topic pie + timeline bar | Different chart types |
| Knowledge Base integration | ✅ Full save/load flow | ✅ Save to KB | Missing "Load Journal Profile" flow |

### 2.2 Missing Heuristic Functions

| Function | Status | Notes |
|----------|--------|-------|
| `suggestJournalsHeuristic` | ❌ Missing | Authors have `suggestAuthorsHeuristic` |
| `disambiguateJournalHeuristic` | ❌ Missing | No journal clustering logic |
| Journal KB expansion | ⚠️ Partial | Missing eLife, Nature Communications in heuristic KB |

### 2.3 Missing UI Components

| Component | Needed For | Status |
|-----------|------------|--------|
| `LandingView` with dual-mode | Search journal + Suggest journals tabs | ❌ Missing |
| `SuggestJournalsView` | Display AI-suggested journals by field | ❌ Missing |
| `DisambiguationView` | Handle journal name variants | ❌ Missing |
| `JournalProfileView` (rich) | Similar to AuthorProfileView | ⚠️ Partial |
| `FeaturedJournalsView` with categories | Categorized featured journals | ❌ Missing |
| `JournalAccordion` components | Expandable sections | ❌ Missing |

---

## 3. AI Inference Layer Analysis

### 3.1 Current Design Strengths

| Aspect | Finding |
|--------|---------|
| Heuristic separation | ✅ Clean via `researchOrchestratorAdapter.ts` |
| Streaming pattern | ✅ AsyncGenerator with abort support |
| Error taxonomy | ✅ `AppError` with typed codes |
| Key security | ✅ AES-GCM 256-bit encryption |
| Retry logic | ✅ Exponential backoff with jitter |
| Type safety | ✅ Strict TypeScript, JSON schema validation |

### 3.2 Current Design Weaknesses

| Aspect | Issue |
|--------|-------|
| Hardcoded provider | ❌ Direct `GoogleGenAI` imports throughout |
| Provider-specific errors | ⚠️ `getGeminiError` only handles Gemini |
| Cost estimation | ⚠️ Gemini-only pricing logic |
| Key storage | ⚠️ Single key storage doesn't scale |
| Model selection | ⚠️ Typed as `'gemini-2.5-flash'` literal |
| Streaming format | ⚠️ Assumes `chunk.text` format |
| Grounding | ⚠️ Gemini's `googleSearch` tool directly used |

### 3.3 Coverage by File

| File | Lines | Branches | Functions | Status |
|------|-------|----------|-----------|--------|
| `geminiService.ts` | 71.2% | 48.4% | 85% | ⚠️ Low branch coverage |
| `geminiApiSlice.ts` | 84% | 55.6% | 100% | ✅ Good |
| `heuristics/chat.ts` | 59.3% | 31.2% | 50% | 🔴 Critical gap |
| `heuristics/journalProfiling.ts` | 68.8% | 25% | 50% | 🔴 Critical gap |
| `heuristics/researchStream.ts` | 56.1% | 60% | 100% | ⚠️ Low line coverage |

---

## 4. Security Assessment

### 4.1 CSP Implementation

**Score: 6/10**

| Directive | Status | Notes |
|-----------|--------|-------|
| script-src | ✅ SHA-256 hashes | No `unsafe-inline` |
| style-src | ⚠️ `'unsafe-inline'` | Required for React inline styles |
| connect-src | ✅ Restricted | Gemini, PubMed, arXiv, CDN only |
| worker-src | ✅ Configured | Workbox from Google storage |

**Recommendation:** Hash critical inline styles or use nonce-based approach.

### 4.2 API Key Security

**Score: 8/10**

| Aspect | Finding |
|--------|---------|
| Encryption | ✅ AES-GCM 256-bit |
| Storage isolation | ✅ Separate IndexedDB database |
| Key derivation | ⚠️ Raw random key (not PBKDF2) |
| Provider support | ❌ Single key only |

**Recommendation:** Add provider-key mapping for multi-provider support.

### 4.3 Error Handling

**Score: 7/10**

| Issue | Risk |
|-------|------|
| Provider-specific error codes | Medium - Will need refactoring |
| Some `any` types in Gemini config | Medium - Type safety gaps |
| Monolithic `geminiService.ts` | High - Hard to maintain |

---

## 5. Testing Coverage Assessment

### 5.1 Overall Coverage

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Lines | 81.4% | 80% | ✅ Pass |
| Statements | 81.4% | 80% | ✅ Pass |
| Functions | 80.5% | 80% | ✅ Pass |
| Branches | 72.9% | 55% | ✅ Pass |

### 5.2 Failing E2E Tests

1. `agent-flow-5-Knowledge-Bas...-message-when-no-data-saved-chromium`
2. `agent-flow-7-Settings-...-rmat-shows-error-after-save-chromium`

### 5.3 Missing E2E Coverage

- ❌ Heuristic/offline mode tests
- ❌ Journal hub flow tests
- ❌ Author disambiguation tests
- ❌ Chat interface tests
- ❌ Knowledge base save/load tests
- ❌ Export functionality tests

---

## 6. Multi-Provider Refactoring Recommendations

### 6.1 Provider Interface Design

```typescript
// src/services/providers/provider.ts
export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'heuristic';

export interface ProviderConfig {
  apiKey?: string;
  model: string;
  baseUrl?: string; // For Ollama/self-hosted
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  usage?: { inputTokens: number; outputTokens: number };
  finishReason?: string;
}

export interface AIStreamChunk {
  text?: string;
  done?: boolean;
}

export interface Provider {
  generateContent(config: ProviderConfig, prompt: string, system?: string): Promise<AIResponse>;
  generateContentStream(config: ProviderConfig, prompt: string, system?: string): AsyncGenerator<AIStreamChunk>;
  createChat?(config: ProviderConfig, context: string): Promise<ChatSession>;
  estimateCost?(params: { inputTokens: number; outputTokens: number; model: string }): number;
  mapError?(error: unknown): AppError;
}
```

### 6.2 Provider-Specific Considerations

| Provider | Streaming Format | Error Mapping | Cost Estimation | Notes |
|---------|------------------|---------------|-----------------|-------|
| Gemini | `chunk.text` | `finishReason`, status codes | $0.30/1M input, $2.50/1M output | Has `thinkingConfig` |
| OpenAI | `chunk.choices[0]?.delta?.content` | `error.type`, `error.code` | $0.10/1M input, $2.00/1M output | Tool use support |
| Anthropic | `chunk.delta?.text` | `error.type` | $0.15/1M input, $0.75/1M output | Tool use support |
| Ollama | `chunk.message?.content` | HTTP status | $0 (local) | No API key required |
| Heuristic | N/A | N/A | $0 | Deterministic |

### 6.3 Breaking Changes

| Change | Impact | Migration |
|--------|--------|-----------|
| `Settings['ai'].model` type | High | Add `provider` field, keep backward compat |
| `apiKeyService.ts` functions | Medium | Add provider parameter |
| `geminiService.ts` structure | High | Refactor to use provider abstraction |
| Error codes | Medium | Rename `GEMINI_*` to `PROVIDER_*` |

---

## 7. Implementation Plan

### Phase 0: Preparation (1-2 days)
- Fix failing E2E tests
- Create feature branch
- Document coverage gaps

### Phase 1: Journal Hub Restoration (3-4 days)
- Add featured journals categorization
- Implement `suggestJournals` function
- Add journal disambiguation flow
- Create rich journal profile view

### Phase 2: Provider Abstraction (4-5 days)
- Create provider interface and factory
- Refactor Gemini to adapter pattern
- Add multi-provider settings

### Phase 3: Additional Providers (5-7 days)
- Implement OpenAI, Anthropic, Ollama adapters
- Create heuristic provider wrapper

### Phase 4: Security Updates (2-3 days)
- Multi-provider key storage
- Generalize error codes

### Phase 5: Integration & Testing (3-4 days)
- Update all AI calls to use providers
- Comprehensive testing
- Documentation updates

---

## 8. Key Files Reference

### New Files to Create:
- `src/services/providers/provider.ts`
- `src/services/providers/factory.ts`
- `src/services/providers/gemini.ts`
- `src/services/providers/openai.ts`
- `src/services/providers/anthropic.ts`
- `src/services/providers/ollama.ts`
- `src/services/providers/heuristic.ts`
- `src/test/e2e/provider-flow.spec.ts`
- `src/test/e2e/journal-hub.spec.ts`
- `docs/adr/0008-multi-provider-architecture.md`

### Files to Heavily Modify:
- `src/types.ts` - Add provider field
- `src/services/geminiService.ts` - Refactor to providers
- `src/services/apiKeyService.ts` - Multi-provider keys
- `src/services/researchOrchestratorAdapter.ts` - Provider routing
- `src/lib/errors.ts` - Rename error codes
- `src/lib/resilience.ts` - Generalize cost estimation
- `src/store/slices/settingsSlice.ts` - Provider defaults
- `src/components/JournalsView.tsx` - Add suggest tab
- `src/components/settings/SettingsView.tsx` - Provider selectors

---

## 9. Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Settings migration | High | Test with existing user data, maintain backward compat |
| E2E test flakiness | Medium | Use proper waits, not timeouts |
| Bundle size increase | Medium | Monitor with `pnpm run bundle:budget` |
| CSP changes | Low | Verify with Lighthouse after changes |
| Provider API changes | Medium | Abstract behind interface |

---

## 10. Recommendations Summary

### Immediate Actions:
1. ✅ Fix 2 failing E2E tests
2. ✅ Expand journal heuristic KB (eLife, Nature Communications, etc.)
3. ✅ Add `suggestJournals` heuristic function

### Short-term Goals:
1. ✅ Create provider abstraction layer
2. ✅ Implement journal hub feature parity
3. ✅ Improve heuristic test coverage (especially chat.ts)

### Long-term Vision:
1. ✅ Full multi-provider support (Gemini, OpenAI, Anthropic, Ollama)
2. ✅ Provider-specific heuristic implementations
3. ✅ Enhanced journal analytics and visualization

---

## Appendix A: Coverage Gaps Detail

### Heuristic Chat (chat.ts) - 31.2% branch coverage
- PMID lookup edge cases
- Insight matching logic
- Article matching thresholds
- Keyword query handling

### Journal Profiling (journalProfiling.ts) - 25% branch coverage
- Unknown journal handling
- OA policy guessing logic
- Focus area inference
- ISSN lookup failures

### Research Stream (researchStream.ts) - 56.1% line coverage
- Abort during stream
- PubMed failure fallback
- arXiv integration
- Demo corpus selection

---

## Appendix B: E2E Test Failures

### Test 1: Knowledge Base Empty State
- **Expected:** "no data saved" message
- **Actual:** KB shows demo data
- **Fix:** Adjust test or demo seeding logic

### Test 2: Settings API Key Error
- **Expected:** Error after invalid key save
- **Actual:** Unknown behavior
- **Fix:** Verify error handling path

---

*End of Architecture Review Document*