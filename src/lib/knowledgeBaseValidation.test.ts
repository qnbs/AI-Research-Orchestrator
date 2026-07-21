import { describe, it, expect } from 'vitest';
import { isKnowledgeBaseEntry } from './knowledgeBaseValidation';

const baseFields = { id: '1', title: 'Test', timestamp: 123, articles: [{ pmid: '1' }] };

const validReport = {
  generatedQueries: [],
  rankedArticles: [],
  synthesis: '',
  aiGeneratedInsights: [],
  overallKeywords: [],
};

const validProfile = {
  name: 'x',
  affiliations: [],
  metrics: { hIndex: null, totalCitations: null },
  careerSummary: '',
  coreConcepts: [],
  publications: [],
};

const validJournalProfile = {
  name: 'x',
  issn: '0000-0000',
  description: '',
  oaPolicy: 'Hybrid',
  focusAreas: [],
};

describe('isKnowledgeBaseEntry', () => {
  it('accepts a valid research entry', () => {
    expect(
      isKnowledgeBaseEntry({
        ...baseFields,
        sourceType: 'research',
        input: { researchTopic: 'x' },
        report: validReport,
      }),
    ).toBe(true);
  });

  it('accepts a valid author entry', () => {
    expect(
      isKnowledgeBaseEntry({
        ...baseFields,
        sourceType: 'author',
        input: { authorName: 'x' },
        profile: validProfile,
      }),
    ).toBe(true);
  });

  it('accepts a valid journal entry', () => {
    expect(
      isKnowledgeBaseEntry({
        ...baseFields,
        sourceType: 'journal',
        journalProfile: validJournalProfile,
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
        report: validReport,
      }),
    ).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isKnowledgeBaseEntry(null)).toBe(false);
    expect(isKnowledgeBaseEntry('string')).toBe(false);
    expect(isKnowledgeBaseEntry([])).toBe(false);
  });

  // Regression: a shallow check previously accepted an empty {} for
  // report/profile/journalProfile, which crashed views reading e.g.
  // entry.report.rankedArticles.length with no fallback.
  it('rejects a research entry with a report missing rankedArticles', () => {
    expect(
      isKnowledgeBaseEntry({
        ...baseFields,
        sourceType: 'research',
        input: {},
        report: { ...validReport, rankedArticles: undefined },
      }),
    ).toBe(false);
  });

  it('rejects a research entry with an empty report object', () => {
    expect(
      isKnowledgeBaseEntry({ ...baseFields, sourceType: 'research', input: {}, report: {} }),
    ).toBe(false);
  });

  it('rejects an author entry with a profile missing coreConcepts', () => {
    expect(
      isKnowledgeBaseEntry({
        ...baseFields,
        sourceType: 'author',
        input: {},
        profile: { ...validProfile, coreConcepts: undefined },
      }),
    ).toBe(false);
  });

  it('rejects an author entry with an empty profile object', () => {
    expect(
      isKnowledgeBaseEntry({ ...baseFields, sourceType: 'author', input: {}, profile: {} }),
    ).toBe(false);
  });

  it('rejects a journal entry with a journalProfile missing focusAreas', () => {
    expect(
      isKnowledgeBaseEntry({
        ...baseFields,
        sourceType: 'journal',
        journalProfile: { ...validJournalProfile, focusAreas: undefined },
      }),
    ).toBe(false);
  });

  it('rejects a journal entry with an empty journalProfile object', () => {
    expect(isKnowledgeBaseEntry({ ...baseFields, sourceType: 'journal', journalProfile: {} })).toBe(
      false,
    );
  });
});
