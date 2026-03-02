# Copilot Instructions for AI Research Orchestrator

## Big picture architecture
- This is a frontend-only React 19 + TypeScript PWA (no backend). App bootstraps in `index.tsx` and mounts Redux `Provider` + `App`.
- `src/App.tsx` is the orchestration hub: it owns view switching, report generation lifecycle, lazy-loaded major views, global modals, and cross-feature callbacks.
- Provider stack in `App.tsx` is intentional: `UIProvider` → `SettingsProvider` → `PresetProvider` → `KnowledgeBaseProvider`.
- Navigation is hash-based, not React Router. Use `useUrlSync` (`src/hooks/useUrlSync.ts`) and `View` union in `src/contexts/UIContext.ts`.

## State, data flow, and boundaries
- The app uses a hybrid state model:
  - Redux Toolkit slices for persistent/global app state (`settings`, `ui`, `knowledgeBase`) in `src/store/slices/*`.
  - Contexts as feature facades (`useSettings`, `useUI`, `useKnowledgeBase`, `usePresets`) that expose domain APIs to components.
- Persistence is IndexedDB via Dexie (`src/services/databaseService.ts`), DB name `AIResearchAppDatabase`, schema version 2.
- Settings persistence is centralized in Redux middleware (`src/store/store.ts`): any action with type prefix `settings/` triggers `saveSettings(...)`.
- Knowledge base mutations should go through thunks/context APIs, not direct component-level Dexie writes.

## AI and external integrations
- Gemini and PubMed integration live in `src/services/geminiService.ts`.
- **API Key Security**: User-provided API keys are encrypted with AES-GCM (Web Crypto API) and stored in IndexedDB via `src/services/apiKeyService.ts`. Never use environment variables for API keys.
- `geminiService.ts` uses lazy initialization via `getAI()` which fetches the encrypted key at runtime. All AI functions must `await getAI()` before using the SDK.
- The API key UI is in `src/components/settings/ApiKeySettings.tsx`, integrated into the AI settings tab.
- `generateResearchReportStream(...)` is an async generator; UI consumes it chunk-by-chunk in `App.tsx`.
- Streaming cancellation/race control uses `generationIdRef` in `App.tsx`; preserve this pattern when adding new async flows.
- PubMed access uses NCBI E-utilities plus retry/backoff logic (`fetchWithRetry`); avoid duplicating fetch logic elsewhere.

## Deployment
- **GitHub Pages**: Configured via `.github/workflows/deploy.yml`. Base path is `/AI-Research-Orchestrator/`.
- **SPA Routing**: `404.html` handles redirects for direct URL access on GitHub Pages.
- **PWA**: `manifest.json` and `sw.js` are configured for the subpath deployment.
- Build command: `npm run build` outputs to `dist/`.

## UI and styling conventions
- Major views are lazy-loaded in `App.tsx` for code splitting.
- Theme tokens and Tailwind extension are defined in `index.html` (`--color-*` CSS vars + Tailwind config). Prefer these tokens over hardcoded colors.
- Notification UX is global through `UIContext`/`uiSlice`; success toasts for KB operations are dispatched via listener middleware in `src/store/store.ts`.
- Command palette toggle is standardized as `Ctrl/Cmd + K` in `App.tsx`.

## Developer workflows
- Install: `npm install`
- Dev server: `npm run dev` (Vite on `0.0.0.0:3000`)
- Production build: `npm run build`
- Preview build: `npm run preview`
- Tests: `npm test` (Vitest with jsdom env)
- Deploy: Push to `main` triggers GitHub Actions deployment to GitHub Pages.

## Safe change patterns for agents
- Start from existing domain APIs/hooks before adding new state (`useKnowledgeBase`, `useResearchAssistant`, `useChat`).
- Keep source-type handling exhaustive for `KnowledgeBaseEntry` (`research` | `author` | `journal`) when updating entry logic.
- Reuse shared export helpers in `src/services/exportService.ts` for PDF/CSV/citation outputs.
- When adding user-visible text, wire it through `useTranslation` + `src/i18n/translations.ts` (fallback is English).
