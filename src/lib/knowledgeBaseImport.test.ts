import { describe, expect, it } from 'vitest';
import type { ResearchEntry } from '../types';
import {
  KNOWLEDGE_BASE_IMPORT_ENVELOPE_VERSION,
  parseAndSanitizeKnowledgeBaseImport,
  sanitizeKnowledgeBaseEntryForImport,
} from './knowledgeBaseImport';

const baseResearchEntry = (): ResearchEntry => ({
  id: 'r1',
  timestamp: 1,
  title: 'Forged import',
  sourceType: 'research',
  articles: [
    {
      pmid: '100',
      title: 'Real article on aspirin prevention',
      authors: 'Smith J',
      journal: 'Demo',
      pubYear: '2024',
      summary: 'Aspirin reduces cardiovascular events in prevention trials.',
      relevanceScore: 80,
      relevanceExplanation: '',
      keywords: [],
      isOpenAccess: false,
    },
  ],
  input: {
    researchTopic: 'aspirin',
    dateRange: 'any',
    articleTypes: [],
    synthesisFocus: 'overview',
    maxArticlesToScan: 10,
    topNToSynthesize: 5,
  },
  report: {
    generatedQueries: [],
    rankedArticles: [
      {
        pmid: '100',
        title: 'Real article on aspirin prevention',
        authors: 'Smith J',
        journal: 'Demo',
        pubYear: '2024',
        summary: 'Aspirin reduces cardiovascular events in prevention trials.',
        relevanceScore: 80,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: false,
      },
    ],
    synthesis: 'Aspirin helps prevention (PMID: 100).',
    aiGeneratedInsights: [],
    overallKeywords: [],
    groundedSynthesis: {
      mode: 'narrative-extracted',
      trustLevel: 'verified',
      claims: [
        {
          text: 'Aspirin helps prevention',
          pmids: ['100'],
          validationState: 'verified',
        },
      ],
    },
  },
});

describe('sanitizeKnowledgeBaseEntryForImport', () => {
  it('downgrades forged verified trust to narrative-draft', () => {
    const { entry, stats } = sanitizeKnowledgeBaseEntryForImport(baseResearchEntry());
    expect(entry.sourceType).toBe('research');
    if (entry.sourceType === 'research') {
      expect(entry.report.groundedSynthesis?.trustLevel).toBe('narrative-draft');
      expect(entry.report.groundedSynthesis?.validatedAt).toBeTypeOf('number');
    }
    expect(stats.trustDowngraded).toBe(true);
  });

  it('strips invalid claim PMIDs during import sanitization', () => {
    const entry = baseResearchEntry();
    entry.report.groundedSynthesis!.claims.push({
      text: 'Fake claim',
      pmids: ['999'],
    });
    const { entry: sanitized } = sanitizeKnowledgeBaseEntryForImport(entry);
    if (sanitized.sourceType === 'research') {
      const pmids = sanitized.report.groundedSynthesis?.claims.flatMap((c) => c.pmids) ?? [];
      expect(pmids).not.toContain('999');
    }
  });
});

describe('parseAndSanitizeKnowledgeBaseImport', () => {
  it('accepts versioned envelope and downgrades trust', () => {
    const entry = baseResearchEntry();
    const raw = {
      meta: {
        importEnvelopeVersion: KNOWLEDGE_BASE_IMPORT_ENVELOPE_VERSION,
        type: 'history',
        count: 1,
      },
      data: [entry],
    };
    const { accepted, quarantine } = parseAndSanitizeKnowledgeBaseImport(raw);
    expect(accepted.length).toBe(1);
    expect(quarantine.trustDowngradedCount).toBe(1);
    if (accepted[0].sourceType === 'research') {
      expect(accepted[0].report.groundedSynthesis?.trustLevel).toBe('narrative-draft');
    }
  });

  it('rejects knowledge-base-articles export shape', () => {
    const raw = {
      meta: { type: 'knowledge-base-articles', count: 1 },
      data: [{ pmid: '1', title: 'x' }],
    };
    const { accepted, quarantine } = parseAndSanitizeKnowledgeBaseImport(raw);
    expect(accepted).toHaveLength(0);
    expect(quarantine.rejected[0]?.reason).toContain('wrong_export_type');
  });

  it('accepts legacy raw arrays with sanitization', () => {
    const { accepted, quarantine } = parseAndSanitizeKnowledgeBaseImport([baseResearchEntry()]);
    expect(accepted.length).toBe(1);
    expect(quarantine.legacyEnvelope).toBe(true);
  });

  it('rejects invalid entry shapes in batch', () => {
    const { accepted, quarantine } = parseAndSanitizeKnowledgeBaseImport([
      { id: 'bad', title: 'x' },
    ]);
    expect(accepted).toHaveLength(0);
    expect(quarantine.rejectedCount).toBe(1);
  });
});
