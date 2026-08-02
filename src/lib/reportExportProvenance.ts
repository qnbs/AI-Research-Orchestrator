/**
 * Export-time provenance sanitization for research reports.
 * Reuses corpus-bound citation grounding before PDF/CSV/JSON export.
 */

import type { ResearchReport } from '../types';
import { applyCorpusCitationGrounding } from './citationGrounding';
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

/** Sanitize report citations against ranked-article corpus before export. */
export const sanitizeReportForExport = (report: ResearchReport): ExportProvenanceResult => {
  const isDemo =
    report.corpusClass === 'demo-only' ||
    report.retrievalOutcome === 'educational_demo' ||
    report.rankedArticles.some(
      (a) => a.sourceClass === 'demo-synthetic' || a.pmid.startsWith('demo:'),
    );

  const corpusPmids = report.rankedArticles.map((a) => a.pmid);
  const grounded = applyCorpusCitationGrounding(
    corpusPmids,
    report.rankedArticles,
    report.aiGeneratedInsights,
  );

  const claimGrounding = sanitizeGroundedSynthesis(report.groundedSynthesis, corpusPmids);
  let groundedSynthesis = claimGrounding.groundedSynthesis;
  if (isDemo && groundedSynthesis?.trustLevel === 'verified') {
    groundedSynthesis = { ...groundedSynthesis, trustLevel: 'narrative-draft' };
  }

  const synthesisSanitized = sanitizeSynthesisForExport(
    report.synthesis,
    groundedSynthesis ?? report.groundedSynthesis,
    corpusPmids,
  );

  let synthesis = synthesisSanitized.synthesis;
  if (isDemo && !synthesis.startsWith('SYNTHETIC EDUCATIONAL DEMO')) {
    synthesis = `${DEMO_EXPORT_WATERMARK}${synthesis}`;
  }

  const sanitized =
    grounded.metrics.invalidCitations > 0 ||
    grounded.metrics.droppedRankedArticles > 0 ||
    grounded.metrics.emptyInsights > 0 ||
    claimGrounding.metrics.droppedClaims > 0 ||
    claimGrounding.metrics.invalidCitations > 0 ||
    synthesisSanitized.uncitedParagraphsRemoved > 0 ||
    synthesis !== report.synthesis ||
    isDemo;

  return {
    report: {
      ...report,
      synthesis,
      rankedArticles: grounded.rankedArticles,
      aiGeneratedInsights: grounded.insights,
      groundedSynthesis,
      corpusClass: isDemo ? 'demo-only' : report.corpusClass,
      retrievalOutcome: isDemo ? 'educational_demo' : report.retrievalOutcome,
    },
    sanitized,
    droppedInsights: grounded.metrics.emptyInsights,
    droppedRankedArticles: grounded.metrics.droppedRankedArticles,
    droppedClaims: claimGrounding.metrics.droppedClaims,
    invalidCitations: grounded.metrics.invalidCitations + claimGrounding.metrics.invalidCitations,
    uncitedParagraphsRemoved: synthesisSanitized.uncitedParagraphsRemoved,
  };
};
