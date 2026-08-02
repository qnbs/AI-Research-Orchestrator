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
});
