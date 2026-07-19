# Implementation Quick Reference

**For:** Kimi Code CLI or other agents  
**Date:** 2026-07-18

---

## 🔴 P0 - Immediate Actions (Do First)

### Fix Failing E2E Tests

```bash
# Check current failures
cat test-results/.last-run.json

# Files to investigate:
# - src/test/e2e/agent-flow.spec.ts (lines 200-400)
# - src/components/KnowledgeBaseView.tsx
# - src/components/settings/SettingsView.tsx
```

### Expand Journal Heuristic KB

**File:** `src/services/heuristics/journalProfiling.ts`

- Add: eLife, Nature Communications, Cell Reports, Scientific Reports, BMJ Open
- Current KB has only 7 journals, featuredJournals.json has 6 different ones

### Add Missing Heuristic Functions

**File:** `src/services/heuristics/journalProfiling.ts`

```typescript
// Add these functions:
export function suggestJournalsHeuristic(
  fieldOfStudy: string,
): { name: string; description: string }[];
export function disambiguateJournalHeuristic(
  journalName: string,
  articles: Partial<RankedArticle>[],
): JournalCluster[];
```

---

## 🟠 P1 - Journal Hub Restoration (3-4 days)

### 1. Featured Journals Categorization

**Files:**

- `src/data/featuredJournals.json` - Add categories
- `src/components/journals/JournalsSubComponents.tsx` - Create `FeaturedJournalsView`

### 2. Suggest Journals UI

**Files:**

- `src/components/journals/JournalsSubComponents.tsx` - Add `SuggestJournalsView`
- `src/components/journals/useJournalsViewLogic.ts` - Add suggestion state

### 3. Journal Disambiguation

**Files:**

- `src/services/heuristics/journalProfiling.ts` - Add disambiguation logic
- `src/components/journals/JournalsSubComponents.tsx` - Add `DisambiguationView`

---

## 🟡 P2 - Provider Abstraction (4-5 days)

### Create Provider Interface

**File:** `src/services/providers/provider.ts`

```typescript
export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'heuristic';
export interface Provider {
  /* ... */
}
```

### Refactor Gemini

**Files:**

- `src/services/providers/gemini.ts` - Extract current logic
- `src/services/geminiService.ts` - Keep as facade

### Update Settings

**File:** `src/types.ts`

```typescript
// Change from:
model: 'gemini-2.5-flash';
// To:
provider: AIProvider;
model: string;
```

---

## 🟢 P3 - Additional Providers (5-7 days)

### OpenAI Provider

**File:** `src/services/providers/openai.ts`

- Use `openai` npm package
- Handle streaming: `chunk.choices[0]?.delta?.content`

### Anthropic Provider

**File:** `src/services/providers/anthropic.ts`

- Use `@anthropic-ai/sdk`
- Handle tool use for grounding

### Ollama Provider

**File:** `src/services/providers/ollama.ts`

- Direct fetch to `/api/generate`
- No API key required

---

## Key Commands

```bash
# Development
pnpm run dev              # Start dev server
pnpm run typecheck        # TypeScript check
pnpm run lint             # ESLint
pnpm run test:run         # Fast unit tests
pnpm run test:coverage    # Tests with coverage
pnpm run test:e2e         # E2E tests
pnpm run build            # Production build
pnpm run bundle:budget    # Check bundle sizes
```

---

## Coverage Targets

| File                             | Current      | Target | Priority |
| -------------------------------- | ------------ | ------ | -------- |
| `heuristics/chat.ts`             | 31% branches | 80%    | 🔴       |
| `heuristics/journalProfiling.ts` | 25% branches | 80%    | 🔴       |
| `geminiService.ts`               | 48% branches | 75%    | 🟠       |
| `researchStream.ts`              | 56% lines    | 80%    | 🟠       |

---

## Breaking Changes to Watch

1. **Settings type change** - Will require migration
2. **Error codes** - `GEMINI_*` → `PROVIDER_*`
3. **API key storage** - Single → multi-provider
4. **geminiApiSlice** - Will be renamed to `aiApiSlice`

---

## Testing Strategy

### Unit Tests First

- Provider adapters with mocked responses
- Heuristic edge cases
- Error mapping paths

### E2E Tests Second

- Provider switching in UI
- Heuristic mode functionality
- Journal hub full flow
- Author disambiguation flow

---

## Documentation to Update

- `README.md` - Multi-provider setup
- `AGENTS.md` - Tech stack updates
- `docs/adr/0008-multi-provider-architecture.md` - New ADR
