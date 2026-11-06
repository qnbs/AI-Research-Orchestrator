import { describe, it, expect } from 'vitest';
import { computeReportSaveFingerprint } from './reportSaveFingerprint';
import type { ResearchInput, ResearchReport } from '../types';

const minimalInput: ResearchInput = {
  researchTopic: 'topic-a',
  dateRange: 'any',
  articleTypes: [],
  synthesisFocus: 'overview',
  maxArticlesToScan: 10,
  topNToSynthesize: 3,
};

const baseReport: ResearchReport = {
  synthesis: 'hello',
  generatedQueries: [],
  rankedArticles: [
    {
      pmid: '1',
      title: 't',
      authors: 'a',
      journal: 'j',
      pubYear: '2026',
      summary: 's',
      relevanceScore: 1,
      relevanceExplanation: 'r',
      keywords: [],
      isOpenAccess: false,
    },
  ],
  aiGeneratedInsights: [],
  overallKeywords: [],
};

describe('computeReportSaveFingerprint', () => {
  it('returns null when input or report is missing', () => {
    expect(computeReportSaveFingerprint(null, baseReport)).toBeNull();
    expect(computeReportSaveFingerprint(minimalInput, null)).toBeNull();
  });

  it('changes when synthesis text changes (including same-length edits)', () => {
    const a = computeReportSaveFingerprint(minimalInput, baseReport);
    const b = computeReportSaveFingerprint(minimalInput, {
      ...baseReport,
      synthesis: `${baseReport.synthesis}x`,
    });
    const sameLen = computeReportSaveFingerprint(minimalInput, {
      ...baseReport,
      synthesis: 'hallo',
    });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a).not.toBe(b);
    expect(a).not.toBe(sameLen);
  });

  it('changes when custom tags on a ranked article change', () => {
    const a = computeReportSaveFingerprint(minimalInput, baseReport);
    const b = computeReportSaveFingerprint(minimalInput, {
      ...baseReport,
      rankedArticles: baseReport.rankedArticles.map((x) =>
        x.pmid === '1' ? { ...x, customTags: ['a'] } : x,
      ),
    });
    expect(a).not.toBe(b);
  });

  it('changes when research input fields change', () => {
    const a = computeReportSaveFingerprint(minimalInput, baseReport);
    const b = computeReportSaveFingerprint({ ...minimalInput, topNToSynthesize: 2 }, baseReport);
    expect(a).not.toBe(b);
  });

  it('changes when ranked article pmids change', () => {
    const a = computeReportSaveFingerprint(minimalInput, baseReport);
    const b = computeReportSaveFingerprint(minimalInput, {
      ...baseReport,
      rankedArticles: baseReport.rankedArticles.map((x) =>
        x.pmid === '1' ? { ...x, pmid: '2' } : x,
      ),
    });
    expect(a).not.toBe(b);
  });

  it('changes when completion metadata changes', () => {
    const partial = computeReportSaveFingerprint(minimalInput, {
      ...baseReport,
      completionStatus: 'partial',
      cancelledAt: 1,
    });
    const done = computeReportSaveFingerprint(minimalInput, {
      ...baseReport,
      completionStatus: undefined,
      cancelledAt: undefined,
    });
    expect(partial).not.toBe(done);
  });
});
