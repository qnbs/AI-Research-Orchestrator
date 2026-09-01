import { describe, it, expect } from 'vitest';
import { sanitizeReportForExport, csvPartialProvenancePrefix } from './reportExportProvenance';
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
    report.synthesis = 'Supported finding (PMID: 1).';
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

  it('clears synthesis when no corpus citations remain', () => {
    const report = baseReport();
    report.aiGeneratedInsights = [{ question: 'Q?', answer: 'A.', supportingArticles: ['1'] }];
    report.synthesis = 'Pure speculation with no PMID references at all.';
    const result = sanitizeReportForExport(report);
    expect(result.sanitized).toBe(true);
    expect(result.report.synthesis).toBe('');
    expect(result.uncitedParagraphsRemoved).toBe(1);
  });

  it('preserves empty-retrieval explanatory synthesis on export', () => {
    const report: ResearchReport = {
      generatedQueries: [],
      rankedArticles: [],
      synthesis:
        'No PubMed/arXiv articles matched "topic". This is a genuine zero-result retrieval.',
      aiGeneratedInsights: [],
      overallKeywords: [],
      corpusClass: 'empty-retrieval',
      retrievalOutcome: 'zero_results',
    };
    const result = sanitizeReportForExport(report);
    expect(result.sanitized).toBe(false);
    expect(result.report.synthesis).toContain('zero-result');
  });

  it('watermarks a cancelled/partial report on export instead of exporting it as if complete', () => {
    const report = baseReport();
    report.aiGeneratedInsights = [{ question: 'Q?', answer: 'A.', supportingArticles: ['1'] }];
    report.synthesis = 'Cited finding (PMID: 1).';
    report.completionStatus = 'partial';
    report.cancelledAtPhase = 'Phase 4: Ranking articles...';
    report.cancelledAt = 42;
    const result = sanitizeReportForExport(report);
    expect(result.sanitized).toBe(true);
    expect(result.report.synthesis).toMatch(/^PARTIAL REPORT — RESEARCH DID NOT FINISH/);
    // Cancellation provenance must survive export, not just the watermark text.
    expect(result.report.completionStatus).toBe('partial');
    expect(result.report.cancelledAtPhase).toBe('Phase 4: Ranking articles...');
    expect(result.report.cancelledAt).toBe(42);
  });

  it('watermarks a partial report even when it hit before any articles were ranked (empty-retrieval early return)', () => {
    const report: ResearchReport = {
      generatedQueries: [],
      rankedArticles: [],
      synthesis: '',
      aiGeneratedInsights: [],
      overallKeywords: [],
      completionStatus: 'partial',
      cancelledAtPhase: 'Phase 1: Generating queries...',
      cancelledAt: 7,
    };
    const result = sanitizeReportForExport(report);
    expect(result.sanitized).toBe(true);
    expect(result.report.synthesis).toMatch(/^PARTIAL REPORT — RESEARCH DID NOT FINISH/);
    expect(result.report.completionStatus).toBe('partial');
    expect(result.report.cancelledAtPhase).toBe('Phase 1: Generating queries...');
    expect(result.report.cancelledAt).toBe(7);
  });

  it('does not double-watermark a demo+partial report on a re-export round trip', () => {
    // Guards against a real bug: checking for the partial watermark *after*
    // conditionally prepending the demo watermark shifted what
    // startsWith('PARTIAL REPORT...') saw, defeating that idempotency check.
    const report = baseReport();
    report.rankedArticles = [
      { ...report.rankedArticles[0], pmid: 'demo:1', sourceClass: 'demo-synthetic' },
    ];
    report.aiGeneratedInsights = [];
    report.completionStatus = 'partial';
    report.synthesis =
      'PARTIAL REPORT — RESEARCH DID NOT FINISH. Results are incomplete and have not been fully verified.\n\nSYNTHETIC EDUCATIONAL DEMO — NOT RETRIEVED LITERATURE.\n\nOriginal narrative.';
    const result = sanitizeReportForExport(report);
    expect(result.report.synthesis.match(/PARTIAL REPORT — RESEARCH DID NOT FINISH/g)).toHaveLength(
      1,
    );
    expect(result.report.synthesis.match(/SYNTHETIC EDUCATIONAL DEMO/g)).toHaveLength(1);
  });

  it('does not double-watermark when a prior export stored demo before partial', () => {
    const report = baseReport();
    report.rankedArticles = [
      { ...report.rankedArticles[0], pmid: 'demo:1', sourceClass: 'demo-synthetic' },
    ];
    report.aiGeneratedInsights = [];
    report.completionStatus = 'partial';
    report.synthesis =
      'SYNTHETIC EDUCATIONAL DEMO — NOT RETRIEVED LITERATURE.\n\nPARTIAL REPORT — RESEARCH DID NOT FINISH. Results are incomplete and have not been fully verified.\n\nOriginal narrative.';
    const result = sanitizeReportForExport(report);
    expect(result.report.synthesis.match(/PARTIAL REPORT — RESEARCH DID NOT FINISH/g)).toHaveLength(
      1,
    );
    expect(result.report.synthesis.match(/SYNTHETIC EDUCATIONAL DEMO/g)).toHaveLength(1);
    expect(result.report.synthesis).toMatch(/^PARTIAL REPORT — RESEARCH DID NOT FINISH/);
  });

  it('preserves an uncited partial narrative instead of exporting only the watermark', () => {
    const report = baseReport();
    report.aiGeneratedInsights = [];
    report.completionStatus = 'partial';
    report.synthesis = 'Streaming draft with no PMID citations yet.';
    const result = sanitizeReportForExport(report);
    expect(result.report.synthesis).toMatch(/^PARTIAL REPORT — RESEARCH DID NOT FINISH/);
    expect(result.report.synthesis).toContain('Streaming draft with no PMID citations yet.');
    expect(result.uncitedParagraphsRemoved).toBe(0);
  });

  it('does not relabel mixed corpora as demo-only on export', () => {
    const report = baseReport();
    report.rankedArticles = [
      {
        ...report.rankedArticles[0],
        pmid: '123',
        sourceClass: 'pubmed-retrieved',
      },
      {
        ...report.rankedArticles[0],
        pmid: 'demo:x',
        sourceClass: 'demo-synthetic',
      },
    ];
    report.corpusClass = 'mixed-retrieved';
    report.retrievalOutcome = 'ok';
    report.synthesis = 'Cited (PMID: 123).';
    report.aiGeneratedInsights = [{ question: 'Q?', answer: 'A.', supportingArticles: ['123'] }];
    const result = sanitizeReportForExport(report);
    expect(result.report.corpusClass).toBe('mixed-retrieved');
    expect(result.report.retrievalOutcome).toBe('ok');
    expect(result.report.synthesis).toMatch(/SYNTHETIC EDUCATIONAL DEMO/);
  });
});

describe('csvPartialProvenancePrefix', () => {
  it('returns an empty prefix for finished reports', () => {
    expect(csvPartialProvenancePrefix(false)).toBe('');
  });

  it('quotes the canonical partial watermark as a CSV first row', () => {
    const prefix = csvPartialProvenancePrefix(true);
    expect(prefix.startsWith('"PARTIAL REPORT — RESEARCH DID NOT FINISH')).toBe(true);
    expect(prefix.endsWith('"\n')).toBe(true);
    expect(prefix).not.toContain('\n\n');
  });
});
