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

  it('wires inputForm.* keys in both locales', () => {
    const samples = [
      'inputForm.header.title',
      'inputForm.topic.label',
      'inputForm.submit',
      'inputForm.sources.arxiv_hint',
    ] as const satisfies readonly TranslationKey[];
    for (const key of samples) {
      expect(translations.en[key].length).toBeGreaterThan(0);
      expect(translations.de[key].length).toBeGreaterThan(0);
      expect(translations.de[key]).not.toEqual(translations.en[key]);
    }
  });

  it('uses distinct German short labels for mobile chrome', () => {
    expect(translations.en['nav.orchestrator.short']).toBe('Review');
    expect(translations.de['nav.orchestrator.short']).toBe('Recherche');
    expect(translations.en['nav.research.short']).toBe('Assistant');
    expect(translations.de['nav.research.short']).toBe('Assistent');
    expect(translations.de['nav.orchestrator.short']).not.toEqual(
      translations.en['nav.orchestrator.short'],
    );
    expect(translations.de['nav.research.short']).not.toEqual(
      translations.en['nav.research.short'],
    );
  });
});
