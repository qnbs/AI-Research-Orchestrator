import { describe, it, expect } from 'vitest';
import { validatePubMedQuery } from './pubmedQueryValidator';

describe('validatePubMedQuery', () => {
  it('accepts a well-formed query', () => {
    const result = validatePubMedQuery(
      '(("aspirin"[MeSH Terms] OR "aspirin"[Title/Abstract]) AND "Review"[Publication Type])',
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects adjacent boolean operators', () => {
    const result = validatePubMedQuery('("aspirin"[MeSH Terms] OR OR "heart"[MeSH Terms])');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('adjacent boolean operators');
  });

  it('rejects empty quoted MeSH tags', () => {
    const result = validatePubMedQuery('""[MeSH Terms]');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('empty quoted field term');
  });

  it('rejects unbalanced parentheses', () => {
    const result = validatePubMedQuery('(("aspirin"[MeSH Terms])');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('unbalanced parentheses');
  });
});
