import { describe, it, expect } from 'vitest';
import { generateAuthorQuery } from './geminiService';

describe('generateAuthorQuery', () => {
  it('handles names with initials correctly', () => {
    const query = generateAuthorQuery('Lander ES');
    expect(query).toContain('"Lander ES"[Author]');
  });
});
