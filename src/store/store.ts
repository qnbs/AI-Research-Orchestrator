
import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import settingsReducer, { setSettings, updateSettings } from './slices/settingsSlice';
import uiReducer, { setNotification } from './slices/uiSlice';
import knowledgeBaseReducer, { addKbEntry, importKbEntries, deleteKbEntries, clearKb, updateKbEntry } from './slices/knowledgeBaseSlice';
import agentDebugReducer from './slices/agentDebugSlice';
import collectionsReducer from './slices/collectionsSlice';
import themeReducer, { setTheme, cycleTheme } from './slices/themeSlice';
import { researchApi } from './slices/apiSlice';
import { saveSettings } from '../services/databaseService';

// --- Listener Middleware ---
// Reacts to actions to trigger side effects (logging, notifications, etc.)
const listenerMiddleware = createListenerMiddleware();

// Example: Show notification when an entry is added
listenerMiddleware.startListening({
    matcher: isAnyOf(addKbEntry.fulfilled, importKbEntries.fulfilled),
    effect: (action, listenerApi) => {
        listenerApi.dispatch(setNotification({ 
            id: Date.now(), 
            message: 'Knowledge Base updated successfully.', 
            type: 'success' 
        }));
    },
});

listenerMiddleware.startListening({
    actionCreator: deleteKbEntries.fulfilled,
    effect: (action, listenerApi) => {
        listenerApi.dispatch(setNotification({ 
            id: Date.now(), 
            message: 'Items deleted from Knowledge Base.', 
            type: 'success' 
        }));
    }
});

// ── Theme sync: DB load → themeSlice ──────────────────────────────────────────
// When settings are restored from IndexedDB, prime themeSlice so Redux
// is the single source of truth for the current theme.
listenerMiddleware.startListening({
    actionCreator: setSettings,
    effect: (action, listenerApi) => {
        listenerApi.dispatch(setTheme(action.payload.theme));
    },
});

// ── Theme sync: themeSlice → settingsSlice (for persistence) ─────────────────
// When the header (or any component) dispatches setTheme/cycleTheme, mirror
// the change into settingsSlice so the persistenceMiddleware saves it to DB.
listenerMiddleware.startListening({
    matcher: isAnyOf(setTheme, cycleTheme),
    effect: (action, listenerApi) => {
        const state = listenerApi.getState() as { theme: { current: import('../types').CyberTheme } };
        listenerApi.dispatch(updateSettings({ theme: state.theme.current }));
        // Apply theme class to document immediately (no React re-render needed)
        if (typeof document !== 'undefined') {
            const cls = document.documentElement.classList;
            cls.remove('dark', 'light', 'matrix');
            cls.add(state.theme.current);
        }
    },
});

// --- Persistence Middleware ---
// Manually handling settings persistence to IndexedDB on change
const persistenceMiddleware = (store: any) => (next: any) => (action: any) => {
    const result = next(action);
    if (action.type.startsWith('settings/')) {
        const state = store.getState();
        saveSettings(state.settings.data).catch(err => console.error("Failed to persist settings:", err));
    }
    return result;
};

export const store = configureStore({
    reducer: {
        settings: settingsReducer,
        ui: uiReducer,
        knowledgeBase: knowledgeBaseReducer,
        agentDebug: agentDebugReducer,
        collections: collectionsReducer,
        theme: themeReducer,
        [researchApi.reducerPath]: researchApi.reducer,
    },
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware()
            .prepend(listenerMiddleware.middleware)
            .concat(persistenceMiddleware)
            .concat(researchApi.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
