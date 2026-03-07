import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CyberTheme } from '../../types';
import type { RootState } from '../store';

// ─── Cycle order: Cyber-Dark → Neon-Light → Matrix-Green → Cyber-Dark ─────────
const CYCLE: Record<CyberTheme, CyberTheme> = {
  dark: 'light',
  light: 'matrix',
  matrix: 'dark',
};

interface ThemeState {
  current: CyberTheme;
}

const initialState: ThemeState = {
  current: 'dark',
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<CyberTheme>) => {
      state.current = action.payload;
    },
    cycleTheme: (state) => {
      state.current = CYCLE[state.current] ?? 'dark';
    },
  },
});

export const { setTheme, cycleTheme } = themeSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectCurrentTheme = (state: RootState): CyberTheme => state.theme.current;
export const selectThemeIsDark = (state: RootState) => state.theme.current === 'dark';
export const selectThemeIsMatrix = (state: RootState) => state.theme.current === 'matrix';

export default themeSlice.reducer;
