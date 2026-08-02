/**
 * Export-time provenance sanitization for research reports.
 * Reuses corpus-bound citation grounding before PDF/CSV/JSON export.
 */

import type { ResearchReport } from '../types';
import { applyCorpusCitationGrounding } from './citationGrounding';

export interface ExportProvenanceResult {
  report: ResearchReport;
  sanitized: boolean;
  droppedInsights: number;
  droppedRankedArticles: number;
  invalidCitations: number;
}

/** Sanitize report citations against ranked-article corpus before export. */
export function sanitizeReportForExport(report: ResearchReport): ExportProvenanceResult {
  const corpusPmids = report.rankedArticles.map((a) => a.pmid);
  const grounded = applyCorpusCitationGrounding(
    corpusPmids,
    report.rankedArticles,
    report.aiGeneratedInsights,
  );

  const sanitized =
    grounded.metrics.invalidCitations > 0 ||
    grounded.metrics.droppedRankedArticles > 0 ||
    grounded.metrics.emptyInsights > 0;

  return {
    report: {
      ...report,
      rankedArticles: grounded.rankedArticles,
      aiGeneratedInsights: grounded.insights,
    },
    sanitized,
    droppedInsights: grounded.metrics.emptyInsights,
    droppedRankedArticles: grounded.metrics.droppedRankedArticles,
    invalidCitations: grounded.metrics.invalidCitations,
  };
}
