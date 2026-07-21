import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/databaseService', () => ({
  saveSettings: vi.fn().mockResolvedValue('appSettings'),
}));

describe('persistenceMiddleware', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('does not persist on setLoading (would clobber Dexie with pre-hydration defaults)', async () => {
    const { saveSettings } = await import('../services/databaseService');
    const { store } = await import('./store');
    const { setLoading } = await import('./slices/settingsSlice');

    store.dispatch(setLoading(true));
    store.dispatch(setLoading(false));

    expect(saveSettings).not.toHaveBeenCalled();
  });

  it('persists on updateSettings and setSettings', async () => {
    const { saveSettings } = await import('../services/databaseService');
    const { store } = await import('./store');
    const { updateSettings, setSettings, defaultSettings } = await import('./slices/settingsSlice');

    store.dispatch(updateSettings({ theme: 'matrix' }));
    expect(saveSettings).toHaveBeenCalled();

    // setSettings cascades through the theme-sync listener middleware
    // (setSettings -> setTheme -> updateSettings), so it triggers persistence
    // more than once — assert it fires again, not an exact fragile count.
    const callsAfterUpdate = vi.mocked(saveSettings).mock.calls.length;
    store.dispatch(setSettings(defaultSettings));
    expect(vi.mocked(saveSettings).mock.calls.length).toBeGreaterThan(callsAfterUpdate);
  });
});
