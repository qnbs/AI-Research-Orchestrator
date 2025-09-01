
import { describe, it, expect } from 'vitest';
import { generateAuthorQuery } from './geminiService';

describe('generateAuthorQuery', () => {
  it('should handle a simple first and last name', () => {
    const query = generateAuthorQuery('Jennifer Doudna');
    expect(query).toBe('("Jennifer Doudna"[Author] OR "Doudna J"[Author] OR "Doudna Jennifer"[Author])');
  });

  it('should handle a name with a middle initial and period', () => {
    const query = generateAuthorQuery('Eric S. Lander');
    expect(query).toBe('("Eric S Lander"[Author] OR "Lander ES"[Author] OR "Lander Eric"[Author])');
  });

  it('should handle a name with a middle initial and no period', () => {
    const query = generateAuthorQuery('Eric S Lander');
    expect(query).toBe('("Eric S Lander"[Author] OR "Lander ES"[Author] OR "Lander Eric"[Author])');
  });

  it('should handle a name in "Last, First M." format', () => {
    const query = generateAuthorQuery('Lander, Eric S.');
    expect(query).toBe('("Eric S Lander"[Author] OR "Lander ES"[Author] OR "Lander Eric"[Author])');
  });
  
  it('should handle a name with multiple middle names', () => {
      const query = generateAuthorQuery('George M Church');
      expect(query).toBe('("George M Church"[Author] OR "Church GM"[Author] OR "Church George"[Author])');
  });

  it('should handle a single name', () => {
    const query = generateAuthorQuery('Venter');
    expect(query).toBe('"Venter"[Author]');
  });

  it('should handle an empty string gracefully', () => {
    const query = generateAuthorQuery('');
    expect(query).toBe('""[Author]');
  });
  
  it('should handle extra whitespace', () => {
    const query = generateAuthorQuery('  Jennifer   Doudna  ');
    expect(query).toBe('("Jennifer Doudna"[Author] OR "Doudna J"[Author] OR "Doudna Jennifer"[Author])');
  });

  it('should handle comma-separated name with no middle initial', () => {
    const query = generateAuthorQuery('Doudna, Jennifer');
    expect(query).toBe('("Jennifer Doudna"[Author] OR "Doudna J"[Author] OR "Doudna Jennifer"[Author])');
  });
});
