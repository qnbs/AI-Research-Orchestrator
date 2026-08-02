/**
 * Export-time provenance sanitization for research reports.
 * Reuses corpus-bound citation grounding before PDF/CSV/JSON export.
 */

import type { ResearchReport } from '../types';
import { applyCorpusCitationGrounding } from './citationGrounding';
import { sanitizeGroundedSynthesis } from './groundedSynthesis';

export interface ExportProvenanceResult {
  report: ResearchReport;
  sanitized: boolean;
  droppedInsights: number;
  droppedRankedArticles: number;
  droppedClaims: number;
  invalidCitations: number;
}

/** Sanitize report citations against ranked-article corpus before export. */
export const sanitizeReportForExport = (report: ResearchReport): ExportProvenanceResult => {
  const corpusPmids = report.rankedArticles.map((a) => a.pmid);
  const grounded = applyCorpusCitationGrounding(
    corpusPmids,
    report.rankedArticles,
    report.aiGeneratedInsights,
  );

  const claimGrounding = sanitizeGroundedSynthesis(report.groundedSynthesis, corpusPmids);

  const sanitized =
    grounded.metrics.invalidCitations > 0 ||
    grounded.metrics.droppedRankedArticles > 0 ||
    grounded.metrics.emptyInsights > 0 ||
    claimGrounding.metrics.droppedClaims > 0 ||
    claimGrounding.metrics.invalidCitations > 0;

  return {
    report: {
      ...report,
      rankedArticles: grounded.rankedArticles,
      aiGeneratedInsights: grounded.insights,
      groundedSynthesis: claimGrounding.groundedSynthesis,
    },
    sanitized,
    droppedInsights: grounded.metrics.emptyInsights,
    droppedRankedArticles: grounded.metrics.droppedRankedArticles,
    droppedClaims: claimGrounding.metrics.droppedClaims,
    invalidCitations: grounded.metrics.invalidCitations + claimGrounding.metrics.invalidCitations,
  };
};
