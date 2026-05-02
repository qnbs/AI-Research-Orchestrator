import { describe, it, expect } from 'vitest';
import uiReducer, { setCurrentView, setNotification, setIsCommandPaletteOpen } from './uiSlice';

describe('uiSlice', () => {
  it('setCurrentView updates view', () => {
    const s = uiReducer(undefined, setCurrentView('settings'));
    expect(s.currentView).toBe('settings');
  });

  it('setNotification stores payload', () => {
    const n = { id: 1, message: 'hi', type: 'success' as const };
    const s = uiReducer(undefined, setNotification(n));
    expect(s.notification).toEqual(n);
  });

  it('setIsCommandPaletteOpen toggles flag', () => {
    const s = uiReducer(undefined, setIsCommandPaletteOpen(true));
    expect(s.isCommandPaletteOpen).toBe(true);
  });
});
