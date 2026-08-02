/**
 * Export-time provenance sanitization for research reports.
 * Reuses corpus-bound citation grounding before PDF/CSV/JSON export.
 */

import type { ResearchReport } from '../types';
import { applyCorpusCitationGrounding } from './citationGrounding';
import { isAllDemoCorpus } from './demoCorpusMigration';
import { sanitizeGroundedSynthesis, sanitizeSynthesisForExport } from './groundedSynthesis';

export interface ExportProvenanceResult {
  report: ResearchReport;
  sanitized: boolean;
  droppedInsights: number;
  droppedRankedArticles: number;
  droppedClaims: number;
  invalidCitations: number;
  uncitedParagraphsRemoved: number;
}

const DEMO_EXPORT_WATERMARK = 'SYNTHETIC EDUCATIONAL DEMO — NOT RETRIEVED LITERATURE.\n\n';

function articleLooksDemo(article: { sourceClass?: string; pmid: string }): boolean {
  return article.sourceClass === 'demo-synthetic' || article.pmid.startsWith('demo:');
}

function isEmptyRetrievalReport(report: ResearchReport): boolean {
  return (
    report.corpusClass === 'empty-retrieval' ||
    report.retrievalOutcome === 'zero_results' ||
    report.retrievalOutcome === 'retrieval_failed' ||
    report.retrievalOutcome === 'offline_without_demo'
  );
}

/** Sanitize report citations against ranked-article corpus before export. */
export const sanitizeReportForExport = (report: ResearchReport): ExportProvenanceResult => {
  const ranked = Array.isArray(report.rankedArticles) ? report.rankedArticles : [];
  const containsDemo = ranked.some(articleLooksDemo);
  const isDemoOnly =
    report.corpusClass === 'demo-only' ||
    report.retrievalOutcome === 'educational_demo' ||
    isAllDemoCorpus(ranked);

  // Empty-retrieval explanations are intentional UX copy, not uncited narrative claims.
  if (isEmptyRetrievalReport(report) && ranked.length === 0) {
    return {
      report: {
        ...report,
        rankedArticles: ranked,
        corpusClass: report.corpusClass ?? 'empty-retrieval',
      },
      sanitized: false,
      droppedInsights: 0,
      droppedRankedArticles: 0,
      droppedClaims: 0,
      invalidCitations: 0,
      uncitedParagraphsRemoved: 0,
    };
  }

  const corpusPmids = ranked.map((a) => a.pmid);
  const grounded = applyCorpusCitationGrounding(corpusPmids, ranked, report.aiGeneratedInsights);

  const claimGrounding = sanitizeGroundedSynthesis(report.groundedSynthesis, corpusPmids);
  let groundedSynthesis = claimGrounding.groundedSynthesis;
  if ((isDemoOnly || containsDemo) && groundedSynthesis?.trustLevel === 'verified') {
    groundedSynthesis = { ...groundedSynthesis, trustLevel: 'narrative-draft' };
  }

  const synthesisSanitized = sanitizeSynthesisForExport(
    report.synthesis,
    groundedSynthesis ?? report.groundedSynthesis,
    corpusPmids,
  );

  let synthesis = synthesisSanitized.synthesis;
  if (containsDemo && !synthesis.startsWith('SYNTHETIC EDUCATIONAL DEMO')) {
    synthesis = `${DEMO_EXPORT_WATERMARK}${synthesis}`;
  }

  const nextCorpusClass = isDemoOnly
    ? 'demo-only'
    : containsDemo
      ? (report.corpusClass ?? 'mixed-retrieved')
      : report.corpusClass;
  const nextRetrievalOutcome = isDemoOnly ? 'educational_demo' : report.retrievalOutcome;

  const sanitized =
    grounded.metrics.invalidCitations > 0 ||
    grounded.metrics.droppedRankedArticles > 0 ||
    grounded.metrics.emptyInsights > 0 ||
    claimGrounding.metrics.droppedClaims > 0 ||
    claimGrounding.metrics.invalidCitations > 0 ||
    synthesisSanitized.uncitedParagraphsRemoved > 0 ||
    synthesis !== report.synthesis ||
    isDemoOnly ||
    containsDemo;

  return {
    report: {
      ...report,
      synthesis,
      rankedArticles: grounded.rankedArticles,
      aiGeneratedInsights: grounded.insights,
      groundedSynthesis,
      corpusClass: nextCorpusClass,
      retrievalOutcome: nextRetrievalOutcome,
    },
    sanitized,
    droppedInsights: grounded.metrics.emptyInsights,
    droppedRankedArticles: grounded.metrics.droppedRankedArticles,
    droppedClaims: claimGrounding.metrics.droppedClaims,
    invalidCitations: grounded.metrics.invalidCitations + claimGrounding.metrics.invalidCitations,
    uncitedParagraphsRemoved: synthesisSanitized.uncitedParagraphsRemoved,
  };
};
