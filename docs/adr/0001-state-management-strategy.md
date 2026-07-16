# ADR 0001: State Management Strategy

- **Status:** Accepted
- **Date:** 2026-07-16
- **Deciders:** Project maintainers / Phase 0 audit

## Context

The app historically mixed Redux Toolkit with React Context providers (`SettingsProvider`, `KnowledgeBaseContext`, `UIProvider`, `PresetContext`). Overlap caused confusion about the single source of truth and risked stale UI after IndexedDB hydration.

## Decision

| Domain                                         | Source of Truth                               | Persistence                                                         |
| ---------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| Settings                                       | Redux `settingsSlice`                         | Dexie via `SettingsHydrator` / `useSettings` (hydrate once → Redux) |
| UI / navigation / notifications                | Redux `uiSlice`                               | Ephemeral (session)                                                 |
| Knowledge Base entities + filters              | Redux `knowledgeBaseSlice` (entity adapter)   | Dexie thunks (`fetch`/`add`/`delete`/`update`)                      |
| Collections                                    | Redux `collectionsSlice`                      | Dexie                                                               |
| Theme                                          | Redux `themeSlice`                            | Local preference via existing slice                                 |
| Agent debug traces                             | Redux `agentDebugSlice`                       | Ephemeral                                                           |
| Research presets                               | `PresetContext` + Dexie                       | Context-local (not Redux) — intentional for lighter UX              |
| PWA install prompt event                       | `installPromptStore` + `useSyncExternalStore` | Non-serializable browser event — must stay outside Redux            |
| Live orchestrator run (status, streaming text) | Local React state in `App.tsx`                | Ephemeral; optional future: Dexie partial-save                      |

`KnowledgeBaseContext` remains a **facade** over Redux for compatibility; new code should prefer Redux hooks (`useAppSelector` / thunks).

`UIProvider` is removed; `useUI` is Redux-only.

## Consequences

- Clear hydration order: Dexie → Redux on boot; writes go Redux thunk → Dexie.
- Orchestrator streaming stays local to avoid flooding Redux with token updates.
- Presets may migrate to Redux later if cross-view sharing is needed (document in a new ADR).
- Tests must cover thunk pending/fulfilled/rejected paths and delete sync.

## Alternatives Considered

- **redux-persist:** Rejected for now — Dexie already owns durable domain data; duplicating persistence layers adds migration risk.
- **Context-only:** Rejected — large collections need normalized entity adapters and DevTools.
