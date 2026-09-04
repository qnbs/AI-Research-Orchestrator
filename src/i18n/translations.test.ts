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
    expect(translations.en['settings.kb.presets.empty']).toContain('Literature review');
    expect(translations.de['settings.kb.presets.empty']).toContain('Literaturrecherche');
    expect(translations.en['settings.cost.desc']).toContain('literature-review');
    expect(translations.de['settings.cost.desc']).toContain('Literaturrecherche');
    expect(translations.de['settings.kb.presets.empty']).not.toMatch(/Orchestrator/);
    expect(translations.de['settings.cost.desc']).not.toMatch(/Orchestrator-Lauf/);
  });

  it('documents heuristic, live, partial, and demo in the Help glossary', () => {
    const keys = [
      'help.glossary.heuristic.title',
      'help.glossary.live.title',
      'help.glossary.partial.title',
      'help.glossary.demo.title',
      'help.glossary.offline.title',
      'help.glossary.web_grounding.title',
    ] as const satisfies readonly TranslationKey[];
    for (const key of keys) {
      expect(translations.en[key].length).toBeGreaterThan(0);
      expect(translations.de[key].length).toBeGreaterThan(0);
      expect(translations.de[key]).not.toEqual(translations.en[key]);
    }
    expect(translations.en['help.glossary.heuristic.desc']).toMatch(/not a live model/i);
    expect(translations.en['help.glossary.heuristic.desc']).toMatch(/not a broken AI/i);
    expect(translations.en['inputForm.hint.heuristic']).toMatch(/not a live model/i);
    expect(translations.en['inputForm.hint.heuristic']).not.toMatch(/broken/i);
    expect(translations.de['inputForm.hint.heuristic']).toMatch(/kein Live-Modell/);
    expect(translations.de['inputForm.hint.heuristic']).not.toMatch(/kaputt/i);
    expect(translations.en['provider.status.heuristic']).toMatch(/no API key required/i);
    expect(translations.de['provider.status.heuristic']).toMatch(/kein API-Schlüssel/);
    expect(translations.en['settings.cost.heuristic_zero']).toMatch(/\$0/);
    expect(translations.de['settings.cost.heuristic_zero']).toMatch(/0 \$/);
    expect(translations.de['help.glossary.heuristic.desc']).toMatch(/kein Live-Modell/);
    expect(translations.de['help.glossary.heuristic.keywords']).toMatch(/kein schlüssel/i);
    expect(translations.de['help.glossary.heuristic.keywords']).not.toEqual(
      translations.en['help.glossary.heuristic.keywords'],
    );
    expect(translations.en['help.glossary.offline.desc']).toMatch(/already fetched/i);
    expect(translations.en['help.glossary.offline.desc']).toMatch(/PubMed/);
    expect(translations.de['help.glossary.offline.desc']).toMatch(/bereits abgerufen/);
    expect(translations.en['help.glossary.web_grounding.desc']).toMatch(/Gemini/i);
    expect(translations.en['help.glossary.web_grounding.desc']).toMatch(/Google Search/i);
    expect(translations.en['inference.badge.live']).toContain('{provider}');
    expect(translations.de['inference.badge.live']).toContain('{provider}');
    expect(translations.en['inference.tooltip.live']).toContain('{provider}');
    expect(translations.de['inference.tooltip.live']).toContain('{provider}');
    expect(translations.en['offline.banner']).not.toMatch(/Gemini/);
    expect(translations.de['offline.banner']).not.toMatch(/Gemini/);
    expect(translations.en['home.how.4']).toMatch(/Search commands/i);
    expect(translations.en['home.how.4']).toMatch(/command-palette walkthrough/i);
    expect(translations.en['home.how.4']).not.toMatch(/no first-run tour/);
    expect(translations.de['home.how.4']).toMatch(/Befehle suchen/);
    expect(translations.de['home.how.4']).toMatch(/Befehlspaletten-Tour/);
    expect(translations.en['authors.profile.metrics.h_index_hint']).toMatch(/not an official/i);
    expect(translations.de['authors.profile.metrics.h_index_hint']).toMatch(
      /ohne einen externen Zitationsindex/,
    );
    expect(translations.en['journals.profile.metrics.oa_rate_hint']).toMatch(/free full text/i);
  });

  it('teaches Ollama loopback vs CORS/timeout and persistent retrieval privacy', () => {
    expect(translations.en['settings.ai.base_url_desc']).not.toMatch(/different Ollama host/i);
    expect(translations.en['settings.ai.base_url_desc.ollama']).toMatch(/localhost:11434/);
    expect(translations.en['settings.ai.base_url_desc.ollama']).toMatch(/Remote LAN Ollama/i);
    expect(translations.de['settings.ai.base_url_desc.ollama']).toMatch(/Loopback/);
    expect(translations.en['provider.status.ollama_privacy']).toMatch(/PubMed/);
    expect(translations.de['provider.status.ollama_privacy']).toMatch(/PubMed/);
    expect(translations.en['provider.status.ollama_privacy_remote']).toMatch(
      /configured Ollama endpoint/i,
    );
    expect(translations.en['provider.status.ollama_privacy_remote']).not.toMatch(
      /stays on this machine/i,
    );
    expect(translations.de['provider.status.ollama_privacy_remote']).toMatch(/Ollama-Endpunkt/);
    expect(translations.de['provider.status.ollama_privacy_remote']).not.toMatch(
      /bleibt auf diesem Rechner/,
    );
    expect(translations.de['provider.status.ollama_privacy_remote']).not.toEqual(
      translations.en['provider.status.ollama_privacy_remote'],
    );
    expect(translations.en['settings.ai.ollama.budget_info']).toMatch(/not fit/i);
    expect(translations.de['settings.ai.ollama.budget_info']).not.toEqual(
      translations.en['settings.ai.ollama.budget_info'],
    );
  });
});
