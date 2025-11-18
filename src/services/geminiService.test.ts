import { describe, it, expect } from 'vitest';
import { generateAuthorQuery } from './geminiService';

describe('generateAuthorQuery', () => {
  it('should handle a simple two-part name', () => {
    const result = generateAuthorQuery('Eric Lander');
    expect(result).toBe('("Eric Lander"[Author] OR "Lander E"[Author] OR "Lander Eric"[Author])');
  });

  it('should handle a name with a middle initial', () => {
    const result = generateAuthorQuery('Eric S. Lander');
    expect(result).toBe('("Eric S Lander"[Author] OR "Lander ES"[Author] OR "Lander Eric"[Author])');
  });

  it('should handle a name in "Last, First M" format', () => {
    const result = generateAuthorQuery('Lander, Eric S');
    expect(result).toBe('("Eric S Lander"[Author] OR "Lander ES"[Author] OR "Lander Eric"[Author])');
  });

  it('should handle a name with multiple middle names/initials', () => {
    const result = generateAuthorQuery('John Ronald Reuel Tolkien');
    expect(result).toBe('("John Ronald Reuel Tolkien"[Author] OR "Tolkien JRR"[Author] OR "Tolkien John"[Author])');
  });

  it('should handle a single name', () => {
    const result = generateAuthorQuery('Plato');
    expect(result).toBe('"Plato"[Author]');
  });

  it('should handle an empty string', () => {
    const result = generateAuthorQuery(' ');
    expect(result).toBe('""[Author]');
  });
});
