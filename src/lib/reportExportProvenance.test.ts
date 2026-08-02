import { describe, it, expect } from 'vitest';
import { sanitizeReportForExport } from './reportExportProvenance';
import type { ResearchReport } from '../types';

const baseReport = (): ResearchReport => ({
  generatedQueries: [],
  synthesis: 'text',
  rankedArticles: [
    {
      pmid: '1',
      title: 'A',
      authors: '',
      journal: '',
      pubYear: '2020',
      summary: '',
      relevanceScore: 1,
      relevanceExplanation: '',
      keywords: [],
      isOpenAccess: false,
    },
  ],
  aiGeneratedInsights: [{ question: 'Q?', answer: 'A.', supportingArticles: ['1', '99'] }],
  overallKeywords: [],
});

describe('sanitizeReportForExport', () => {
  it('removes hallucinated PMIDs before export', () => {
    const result = sanitizeReportForExport(baseReport());
    expect(result.sanitized).toBe(true);
    expect(result.invalidCitations).toBe(1);
    expect(result.report.aiGeneratedInsights[0].supportingArticles).toEqual(['1']);
  });

  it('returns unsanitized when all citations are valid', () => {
    const report = baseReport();
    report.aiGeneratedInsights = [{ question: 'Q?', answer: 'A.', supportingArticles: ['1'] }];
    const result = sanitizeReportForExport(report);
    expect(result.sanitized).toBe(false);
  });

  it('drops insights with no valid supporting articles', () => {
    const report = baseReport();
    report.aiGeneratedInsights = [{ question: 'Q?', answer: 'A.', supportingArticles: ['99'] }];
    const result = sanitizeReportForExport(report);
    expect(result.sanitized).toBe(true);
    expect(result.droppedInsights).toBe(1);
    expect(result.report.aiGeneratedInsights).toEqual([]);
  });

  it('sanitizes grounded synthesis claims against corpus', () => {
    const report = baseReport();
    report.groundedSynthesis = {
      mode: 'narrative-extracted',
      claims: [
        { text: 'Valid claim', pmids: ['1', '99'] },
        { text: 'Invalid claim', pmids: ['88'] },
      ],
    };
    const result = sanitizeReportForExport(report);
    expect(result.sanitized).toBe(true);
    expect(result.droppedClaims).toBe(1);
    expect(result.report.groundedSynthesis?.claims).toEqual([
      { text: 'Valid claim', pmids: ['1'] },
    ]);
  });

  it('strips uncited synthesis paragraphs on export', () => {
    const report = baseReport();
    report.aiGeneratedInsights = [{ question: 'Q?', answer: 'A.', supportingArticles: ['1'] }];
    report.synthesis =
      'Cited finding (PMID: 1).\n\nUncited speculation without any PMID reference.';
    const result = sanitizeReportForExport(report);
    expect(result.sanitized).toBe(true);
    expect(result.uncitedParagraphsRemoved).toBe(1);
    expect(result.report.synthesis).toContain('PMID: 1');
    expect(result.report.synthesis).not.toContain('Uncited speculation');
  });
});
