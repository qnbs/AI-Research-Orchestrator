import { describe, it, expect, afterEach } from 'vitest';
import { store } from '../store/store';
import { updateSettings, resetSettings } from '../store/slices/settingsSlice';
import { resolveTranslation, getCurrentLang, translateSync } from './translate';

describe('resolveTranslation', () => {
  it('resolves a key in the requested language', () => {
    expect(resolveTranslation('en', 'nav.home')).toBeTruthy();
  });

  it('falls back to English for a key missing in the requested language', () => {
    expect(resolveTranslation('de', '___missing___')).toBe('___missing___');
  });

  it('interpolates {var} placeholders', () => {
    const text = resolveTranslation('en', 'apikey.status.configured', { provider: 'Gemini' });
    expect(text).toContain('Gemini');
    expect(text).not.toContain('{provider}');
  });

  it('does not treat prototype properties as translation keys', () => {
    expect(resolveTranslation('en', 'toString')).toBe('toString');
  });
});

describe('getCurrentLang / translateSync (real app store)', () => {
  afterEach(() => {
    store.dispatch(resetSettings());
  });

  it('reads the language live from the real Redux store singleton', () => {
    store.dispatch(updateSettings({ appLanguage: 'de' }));
    expect(getCurrentLang()).toBe('de');

    store.dispatch(updateSettings({ appLanguage: 'en' }));
    expect(getCurrentLang()).toBe('en');
  });

  it('translateSync agrees with resolveTranslation for the current store language', () => {
    store.dispatch(updateSettings({ appLanguage: 'de' }));
    expect(translateSync('nav.home')).toBe(resolveTranslation('de', 'nav.home'));
  });
});
