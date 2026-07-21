import { describe, it, expect } from 'vitest';
import { isKnowledgeBaseEntry } from './knowledgeBaseValidation';

const baseFields = { id: '1', title: 'Test', timestamp: 123, articles: [{ pmid: '1' }] };

describe('isKnowledgeBaseEntry', () => {
  it('accepts a valid research entry', () => {
    expect(
      isKnowledgeBaseEntry({
        ...baseFields,
        sourceType: 'research',
        input: { researchTopic: 'x' },
        report: { synthesis: '' },
      }),
    ).toBe(true);
  });

  it('accepts a valid author entry', () => {
    expect(
      isKnowledgeBaseEntry({
        ...baseFields,
        sourceType: 'author',
        input: { authorName: 'x' },
        profile: { name: 'x' },
      }),
    ).toBe(true);
  });

  it('accepts a valid journal entry', () => {
    expect(
      isKnowledgeBaseEntry({
        ...baseFields,
        sourceType: 'journal',
        journalProfile: { name: 'x' },
      }),
    ).toBe(true);
  });

  it('rejects an entry missing the variant-specific field', () => {
    expect(isKnowledgeBaseEntry({ ...baseFields, sourceType: 'research' })).toBe(false);
  });

  it('rejects an unknown sourceType', () => {
    expect(isKnowledgeBaseEntry({ ...baseFields, sourceType: 'bogus' })).toBe(false);
  });

  it('rejects malformed base fields', () => {
    expect(isKnowledgeBaseEntry({ ...baseFields, id: 42, sourceType: 'research' })).toBe(false);
  });

  it('rejects an article missing pmid', () => {
    expect(
      isKnowledgeBaseEntry({
        ...baseFields,
        articles: [{}],
        sourceType: 'research',
        input: {},
        report: {},
      }),
    ).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isKnowledgeBaseEntry(null)).toBe(false);
    expect(isKnowledgeBaseEntry('string')).toBe(false);
    expect(isKnowledgeBaseEntry([])).toBe(false);
  });
});
