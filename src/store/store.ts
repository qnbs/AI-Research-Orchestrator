
import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import settingsReducer, { setSettings } from './slices/settingsSlice';
import uiReducer, { setNotification } from './slices/uiSlice';
import knowledgeBaseReducer, { addKbEntry, importKbEntries, deleteKbEntries, clearKb, updateKbEntry } from './slices/knowledgeBaseSlice';
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
    },
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware()
            .prepend(listenerMiddleware.middleware)
            .concat(persistenceMiddleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
