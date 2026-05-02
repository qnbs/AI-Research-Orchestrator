import { describe, it, expect } from 'vitest';
import settingsReducer, {
  setSettings,
  updateSettings,
  resetSettings,
  defaultSettings,
} from './settingsSlice';

describe('settingsSlice', () => {
  it('setSettings replaces state', () => {
    const next = { ...defaultSettings, appLanguage: 'de' as const };
    const s = settingsReducer(undefined, setSettings(next));
    expect(s.data.appLanguage).toBe('de');
    expect(s.isLoading).toBe(false);
  });

  it('updateSettings deep-merges nested objects', () => {
    const s0 = settingsReducer(undefined, setSettings(defaultSettings));
    const s1 = settingsReducer(
      s0,
      updateSettings({ ai: { ...defaultSettings.ai, temperature: 0.9 } }),
    );
    expect(s1.data.ai.temperature).toBe(0.9);
    expect(s1.data.ai.model).toBe(defaultSettings.ai.model);
  });

  it('resetSettings restores defaults', () => {
    const s0 = settingsReducer(undefined, updateSettings({ theme: 'matrix' }));
    const s1 = settingsReducer(s0, resetSettings());
    expect(s1.data.theme).toBe(defaultSettings.theme);
  });
});
