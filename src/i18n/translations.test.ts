import { describe, it, expect } from 'vitest';
import { translations, type TranslationKey } from './translations';

describe('i18n translations parity', () => {
  it('EN and DE expose the same key set', () => {
    const enKeys = Object.keys(translations.en).sort();
    const deKeys = Object.keys(translations.de).sort();
    expect(deKeys).toEqual(enKeys);
  });

  it('TranslationKey matches EN keys', () => {
    const sample: TranslationKey = 'nav.home';
    expect(translations.en[sample]).toBeTruthy();
    expect(translations.de[sample]).toBeTruthy();
  });

  it('has no empty EN or DE values', () => {
    for (const [key, value] of Object.entries(translations.en)) {
      expect(value.trim().length, `en:${key}`).toBeGreaterThan(0);
    }
    for (const [key, value] of Object.entries(translations.de)) {
      expect(value.trim().length, `de:${key}`).toBeGreaterThan(0);
    }
  });
});
