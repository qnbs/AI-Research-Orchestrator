You are an expert full-stack React 19 + TypeScript architect specialized in agentic AI research tools using PubMed + Gemini.

**Cursor entry point:** repo root `AGENTS.md`, **`.cursor/index.mdc`** (always-on manifest), and **`.cursor/rules/`** (modular `.mdc` rules — see `000-cursor-rules.mdc`).

## Tech Stack (current, installed)

| Category        | Technology                                             | Version           |
| --------------- | ------------------------------------------------------ | ----------------- |
| Framework       | React                                                  | 19                |
| Language        | TypeScript                                             | 5.8 (strict mode) |
| Build           | Vite                                                   | 6                 |
| State / APIs    | Redux Toolkit + RTK Query (`researchApi`, `geminiApi`) | 2                 |
| Local DB        | Dexie.js + dexie-react-hooks                           | 4                 |
| AI              | @google/genai (Gemini 2.5 Flash + Gemini 3 Pro)        | latest            |
| Styling         | Tailwind CSS v4 + @tailwindcss/postcss                 | 4.2               |
| Animation       | Framer Motion                                          | 12                |
| Icons           | lucide-react                                           | latest            |
| Charts          | Chart.js + react-chartjs-2, Recharts                   | latest            |
| Virtualization  | @tanstack/react-virtual                                | 3                 |
| Command Palette | cmdk                                                   | 1                 |
| PDF Export      | jsPDF + marked                                         | latest            |
| Sanitization    | DOMPurify                                              | 3                 |
| Testing         | Vitest + @testing-library/react + Playwright           | latest            |

## Project Rules (ALWAYS follow)

### Architecture

- **Local-first**: All user data in IndexedDB via Dexie.js — zero backend dependency
- **API-key-in-browser**: Gemini key encrypted with Web Crypto AES-GCM, stored in IndexedDB (apiKeyService.ts)
- **Direct API calls**: Browser → Google Gemini API + NCBI PubMed E-utilities (no proxy)
- **PWA**: Service worker (sw.js) with Workbox caching strategies, offline fallback, GitHub Pages deployment

### State Management

- **Redux Toolkit** for global app state (settings, UI, knowledgeBase, agentDebug, collections, theme slices)
- **RTK Query** for API endpoints (apiSlice.ts, geminiApiSlice.ts)
- **Hooks**: `useSettings` / `useUI` read from Redux; PWA `beforeinstallprompt` uses `lib/installPromptStore` + `useSyncExternalStore` (not in Redux)
- **Context API**: `SettingsProvider` only hydrates IndexedDB → Redux once; `KnowledgeBaseContext` / `PresetContext` compose Dexie + Redux actions—no parallel copies of `settings`/`ui`
- **Never duplicate** the same flags in Context and Redux

### Code Style

- TypeScript strict mode — no `any` unless absolutely necessary
- Functional components only with hooks
- File structure: `src/components/`, `src/services/`, `src/store/slices/`, `src/hooks/`, `src/contexts/`, `src/i18n/`
- Sub-feature folders: `components/authors/`, `components/journals/`, `components/settings/`, `components/knowledge-base/`, `components/ui/`, `components/icons/`
- Custom hooks for complex logic extraction (useAuthorsViewLogic, useSettingsViewLogic, etc.)
- Context + SubComponents pattern for large views (e.g., AuthorsViewContext + AuthorsSubComponents)

### UI/UX

- **Tailwind CSS** with Cybernetic Glassmorphism design system (backdrop-blur, neon accents, ambient animations)
- **Framer Motion** for agent flows and transitions
- **WCAG 2.2 AA**: ARIA roles, keyboard navigation, focus management, Cmd+K palette
- **i18n**: English + German via src/i18n/translations.ts, use `t()` hook for all user-facing strings
- **Responsive**: Mobile-first with bottom nav bar, desktop header with two-line layout

### API Patterns

- PubMed NCBI E-utilities with exponential backoff (pubmedUtils.ts)
- arXiv search as supplementary source (arxivUtils.ts)
- Gemini streaming responses via AsyncGenerator (geminiService.ts)
- DOMPurify for all HTML sanitization

### Testing

- Vitest for unit tests (src/services/_.test.ts, src/store/slices/_.test.ts)
- Playwright for E2E (src/test/e2e/)
- Test setup in src/test/setup.ts with IndexedDB + crypto mocks

### Safety Rules

- **Never** break existing agent pipeline or Knowledge Base
- **Never** commit API keys or secrets
- **Always** run `pnpm run typecheck` before committing
- **Always** maintain i18n parity (EN + DE) for new user-facing strings

### New Feature Checklist

When adding a new feature, ensure:

1. Redux slice (if stateful) or RTK Query endpoint (if API)
2. Dexie schema update (if persistent data)
3. i18n keys in both EN and DE
4. Framer Motion animation for transitions
5. ARIA attributes and keyboard support
6. Unit test stub at minimum

## Project Structure

```
src/
 App.tsx                  # Main app with lazy-loaded views
 types.ts                 # Shared TypeScript interfaces
 index.css                # Tailwind imports + custom CSS
 components/              # UI components
   ├── icons/               # 60+ icon components
   ├── ui/                  # Reusable UI primitives
   ├── settings/            # Settings sub-components
   ├── knowledge-base/      # KB sub-components
   ├── authors/             # Author hub sub-components
   └── journals/            # Journal hub sub-components
 contexts/                # React Context providers
 hooks/                   # Custom React hooks
 i18n/                    # Translation files
 services/                # API + business logic
 store/                   # Redux store + slices
   └── slices/              # Individual Redux slices
 test/                    # Test setup + E2E specs
```

## Goal

Make this the most powerful, beautiful and production-ready AI Research Orchestrator — with visual agent debugging, multi-DB support and stunning Cybernetic UI.
