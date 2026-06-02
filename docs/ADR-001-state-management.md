# ADR-001: State Management — Redux as Source of Truth

**Status:** Accepted (v0.2.0)  
**Date:** 2026-06-02

## Context

The app used Redux Toolkit slices alongside React Context providers (`SettingsContext`, `KnowledgeBaseContext`, `PresetContext`, `UIContext`) for overlapping concerns. This created hydration ambiguity and made deletes/updates harder to reason about (e.g. `deleteKbEntries.fulfilled` not updating Redux).

## Decision

1. **Redux Toolkit** is the **source of truth** for persisted domain state:

   - Settings (`settingsSlice` + IndexedDB via listener middleware)
   - Knowledge base entries (`knowledgeBaseSlice` + Dexie thunks)
   - UI chrome (`uiSlice`, `themeSlice`)
   - Collections, agent debug, RTK Query caches (`apiSlice`, `geminiApiSlice`)

2. **Context providers** remain as **thin facades** where they add ergonomic APIs:

   - `KnowledgeBaseProvider`: orchestrates multi-step KB operations (merge, prune, tag updates) and dispatches Redux thunks
   - `SettingsProvider`: wraps `SettingsHydrator` only
   - `PresetProvider`: local preset list (candidates for future `presetsSlice`)
   - `UIContext`: **deprecated for new code** — use `useUI` hook backed by `uiSlice` only

3. **Transient/ephemeral state** stays in React (`useState` / `useRef`) inside views or `use*Logic` hooks (form drafts, modal open, export menus).

## Consequences

- All Dexie mutations must complete in thunks and update the entity adapter in `extraReducers`.
- New features should not duplicate KB/settings in Context state.
- `fetchKnowledgeBase()` after complex Context operations remains acceptable until those flows move into thunks.

## References

- `src/store/store.ts` — listener + persistence middleware
- `src/contexts/KnowledgeBaseContext.tsx` — facade pattern
- `AGENTS.md` — agent onboarding summary
