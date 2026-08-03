import { describe, it, expect } from 'vitest';
import type { ResearchReport } from '../types';
import { migrateReportTrustTerminologyV7 } from './synthesisTrustMigrationV7';

describe('migrateReportTrustTerminologyV7', () => {
  it('renames legacy verified trust and demotes demo reports', () => {
    const legacyReport = {
      generatedQueries: [],
      rankedArticles: [
        {
          pmid: 'demo:aspirin-1',
          title: 'Demo aspirin',
          authors: 'A',
          journal: 'J',
          pubYear: '2020',
          summary: 'Aspirin reduces events',
          relevanceScore: 80,
          relevanceExplanation: '',
          keywords: [],
          isOpenAccess: false,
        },
      ],
      synthesis: 'demo',
      aiGeneratedInsights: [],
      overallKeywords: [],
      groundedSynthesis: {
        mode: 'extractive-template',
        trustLevel: 'verified',
        claims: [
          {
            text: 'Aspirin reduces events',
            pmids: ['demo:aspirin-1'],
            validationState: 'verified',
          },
        ],
      },
    } as unknown as ResearchReport;

    const migrated = migrateReportTrustTerminologyV7(legacyReport);
    expect(migrated.corpusClass).toBe('demo-only');
    expect(migrated.groundedSynthesis?.trustLevel).toBe('narrative-draft');
    expect(migrated.groundedSynthesis?.claims[0]?.validationState).toBe('claim-supported');
    expect(migrated.rankedArticles[0]?.sourceClass).toBe('demo-synthetic');
  });

  it('renames elevated live reports without demotion', () => {
    const liveReport = {
      generatedQueries: [],
      rankedArticles: [
        {
          pmid: '100',
          title: 'Live aspirin',
          authors: 'A',
          journal: 'J',
          pubYear: '2020',
          summary: 'Aspirin reduces events',
          relevanceScore: 80,
          relevanceExplanation: '',
          keywords: [],
          isOpenAccess: false,
        },
      ],
      synthesis: 'live',
      aiGeneratedInsights: [],
      overallKeywords: [],
      groundedSynthesis: {
        mode: 'extractive-template',
        trustLevel: 'verified',
        claims: [{ text: 'Aspirin reduces events', pmids: ['100'], validationState: 'verified' }],
      },
    } as unknown as ResearchReport;

    const migrated = migrateReportTrustTerminologyV7(liveReport);
    expect(migrated.corpusClass).not.toBe('demo-only');
    expect(migrated.groundedSynthesis?.trustLevel).toBe('corpus-supported');
    expect(migrated.groundedSynthesis?.claims[0]?.validationState).toBe('claim-supported');
  });
});
