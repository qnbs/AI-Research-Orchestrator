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

  it('uses Literature review / Literaturrecherche as the orchestrator view title', () => {
    expect(translations.en['orchestrator.title']).toBe('Literature review');
    expect(translations.de['orchestrator.title']).toBe('Literaturrecherche');
  });

  it('aligns DE submit and glossary destination names', () => {
    expect(translations.de['orchestrator.start']).toBe('Recherche starten');
    expect(translations.de['orchestrator.start']).toBe(translations.de['inputForm.submit']);
    expect(translations.en['settings.kb.presets.empty']).not.toMatch(/Orchestrator form/);
    expect(translations.de['settings.kb.presets.empty']).not.toMatch(/Orchestrator/);
    expect(translations.en['settings.cost.desc']).not.toMatch(/orchestrator run/i);
    expect(translations.de['settings.cost.desc']).not.toMatch(/Orchestrator-Lauf/);
  });

  it('documents heuristic, live, partial, and demo in the Help glossary', () => {
    const keys = [
      'help.glossary.heuristic.title',
      'help.glossary.live.title',
      'help.glossary.partial.title',
      'help.glossary.demo.title',
    ] as const satisfies readonly TranslationKey[];
    for (const key of keys) {
      expect(translations.en[key].length).toBeGreaterThan(0);
      expect(translations.de[key].length).toBeGreaterThan(0);
      expect(translations.de[key]).not.toEqual(translations.en[key]);
    }
    expect(translations.en['help.glossary.heuristic.desc']).toMatch(/not a live model/i);
    expect(translations.de['help.glossary.heuristic.desc']).toMatch(/kein Live-Modell/);
  });
});
