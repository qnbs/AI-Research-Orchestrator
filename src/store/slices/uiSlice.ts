
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { View, BeforeInstallPromptEvent } from '../../contexts/UIContext';

interface NotificationState {
    id: number;
    message: string;
    type: 'success' | 'error';
}

interface UiState {
    currentView: View;
    notification: NotificationState | null;
    isSettingsDirty: boolean;
    pendingNavigation: View | null;
    isCommandPaletteOpen: boolean;
    // We can't store complex objects like Events in Redux easily without serialization warnings,
    // but for this specific prompt event, we might treat it as a non-serializable value or keep it out of Redux.
    // For strict Redux compliance, we'll omit the event object itself and just track status, 
    // but sticking to practical utility, we will handle install state here.
    isPwaInstalled: boolean;
}

const initialState: UiState = {
    currentView: 'home',
    notification: null,
    isSettingsDirty: false,
    pendingNavigation: null,
    isCommandPaletteOpen: false,
    isPwaInstalled: false,
};

export const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setCurrentView: (state, action: PayloadAction<View>) => {
            state.currentView = action.payload;
        },
        setNotification: (state, action: PayloadAction<NotificationState | null>) => {
            state.notification = action.payload;
        },
        setIsSettingsDirty: (state, action: PayloadAction<boolean>) => {
            state.isSettingsDirty = action.payload;
        },
        setPendingNavigation: (state, action: PayloadAction<View | null>) => {
            state.pendingNavigation = action.payload;
        },
        setIsCommandPaletteOpen: (state, action: PayloadAction<boolean>) => {
            state.isCommandPaletteOpen = action.payload;
        },
        setIsPwaInstalled: (state, action: PayloadAction<boolean>) => {
            state.isPwaInstalled = action.payload;
        }
    },
});

export const { 
    setCurrentView, 
    setNotification, 
    setIsSettingsDirty, 
    setPendingNavigation, 
    setIsCommandPaletteOpen,
    setIsPwaInstalled 
} = uiSlice.actions;

export default uiSlice.reducer;
