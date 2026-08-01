import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { View } from '../../types/ui';

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
}

const initialState: UiState = {
  currentView: 'home',
  notification: null,
  isSettingsDirty: false,
  pendingNavigation: null,
  isCommandPaletteOpen: false,
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
  },
});

export const {
  setCurrentView,
  setNotification,
  setIsSettingsDirty,
  setPendingNavigation,
  setIsCommandPaletteOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
