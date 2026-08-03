import { describe, it, expect } from 'vitest';
import { resolveDiscoveredModelValue } from './OllamaHealthPanel';

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
