import { describe, it, expect } from 'vitest';
import {
  ollamaBudgetSourceKey,
  ollamaHealthFailTeachingKey,
  resolveDiscoveredModelValue,
} from './OllamaHealthPanel';
import type { OllamaHealthFailureReason } from '../../services/providers/ollamaHealth';
import type { OllamaBudgetSource } from '../../lib/ollamaContextBudget';
import { translations } from '../../i18n/translations';

describe('resolveDiscoveredModelValue', () => {
  const models = [{ name: 'llama3.1:8b' }, { name: 'mistral' }];

  it('matches exact names', () => {
    expect(resolveDiscoveredModelValue(models, 'llama3.1:8b')).toBe('llama3.1:8b');
  });

  it('matches tag aliases used by isOllamaModelAvailable', () => {
    expect(resolveDiscoveredModelValue(models, 'mistral:7b')).toBe('mistral');
  });

  it('returns empty when no alias matches', () => {
    expect(resolveDiscoveredModelValue(models, 'missing')).toBe('');
  });
});

describe('ollamaHealthFailTeachingKey', () => {
  const reasons: OllamaHealthFailureReason[] = [
    'cors',
    'timeout',
    'unavailable',
    'invalid_endpoint',
    'http',
    'aborted',
    'model_list',
  ];

  it('maps every probe reason to teaching copy that does not dump the raw reason code', () => {
    for (const reason of reasons) {
      const key = ollamaHealthFailTeachingKey(reason);
      const en = translations.en[key];
      const de = translations.de[key];
      expect(en.length, `en:${reason}`).toBeGreaterThan(0);
      expect(de.length, `de:${reason}`).toBeGreaterThan(0);
      expect(de).not.toEqual(en);
      expect(en.toLowerCase()).not.toContain(`({${reason}})`);
      expect(en).not.toMatch(/unavailable \(\{reason\}\)/i);
    }
  });

  it('teaches CORS/loopback vs timeout vs unavailable as distinct failures', () => {
    expect(translations.en[ollamaHealthFailTeachingKey('cors')]).toMatch(/CORS/i);
    expect(translations.en[ollamaHealthFailTeachingKey('cors')]).toMatch(/loopback/i);
    expect(translations.en[ollamaHealthFailTeachingKey('timeout')]).toMatch(/not the same as/i);
    expect(translations.en[ollamaHealthFailTeachingKey('unavailable')]).toMatch(/not running/i);
    expect(translations.de[ollamaHealthFailTeachingKey('timeout')]).toMatch(/nicht dasselbe/i);
  });
});

describe('ollamaBudgetSourceKey', () => {
  const sources: OllamaBudgetSource[] = ['context-length', 'parameter-heuristic', 'default'];

  it('maps every budget source to EN+DE labels', () => {
    for (const source of sources) {
      const key = ollamaBudgetSourceKey(source);
      expect(translations.en[key].length).toBeGreaterThan(0);
      expect(translations.de[key]).not.toEqual(translations.en[key]);
    }
  });
});
