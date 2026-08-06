/**
 * Export-time provenance sanitization for research reports.
 * Reuses corpus-bound citation grounding before PDF/CSV/JSON export.
 */

import type { ResearchReport } from '../types';
import { corpusContainsDemo, isDemoSyntheticArticle } from './articleSourceClass';
import { applyCorpusCitationGrounding } from './citationGrounding';
import { isAllDemoCorpus } from './demoCorpusMigration';
import { sanitizeGroundedSynthesis, sanitizeSynthesisForExport } from './groundedSynthesis';
import { isElevatedSynthesisTrust } from './synthesisTrustTerminology';

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
const PARTIAL_EXPORT_WATERMARK =
  'PARTIAL REPORT — RESEARCH DID NOT FINISH. Results are incomplete and have not been fully verified.\n\n';

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
  const containsDemo = corpusContainsDemo(ranked);
  const isDemoOnly =
    report.corpusClass === 'demo-only' ||
    report.retrievalOutcome === 'educational_demo' ||
    (ranked.length > 0 && ranked.every(isDemoSyntheticArticle)) ||
    isAllDemoCorpus(ranked);

  const isPartial = report.completionStatus === 'partial';
  // Exact-prefix match against the full watermark text (not just its opening
  // words) - a narrative that happens to start with "PARTIAL REPORT" for
  // unrelated reasons must still get watermarked.
  const withPartialWatermark = (synthesis: string): string =>
    isPartial && !synthesis.startsWith(PARTIAL_EXPORT_WATERMARK)
      ? `${PARTIAL_EXPORT_WATERMARK}${synthesis}`
      : synthesis;

  // Empty-retrieval explanations are intentional UX copy, not uncited narrative claims.
  if (isEmptyRetrievalReport(report) && ranked.length === 0) {
    return {
      report: {
        ...report,
        rankedArticles: ranked,
        corpusClass: report.corpusClass ?? 'empty-retrieval',
        synthesis: withPartialWatermark(report.synthesis),
      },
      sanitized: isPartial,
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
  if (
    groundedSynthesis &&
    (isDemoOnly || containsDemo) &&
    isElevatedSynthesisTrust(groundedSynthesis.trustLevel)
  ) {
    groundedSynthesis = { ...groundedSynthesis, trustLevel: 'narrative-draft' };
  }

  const synthesisSanitized = sanitizeSynthesisForExport(
    report.synthesis,
    groundedSynthesis ?? report.groundedSynthesis,
    corpusPmids,
  );

  // Check both watermarks against the same pre-watermark base text - checking
  // "needs partial watermark" only after conditionally prepending the demo
  // watermark would shift what startsWith('PARTIAL REPORT...') sees on a
  // demo+partial re-export round-trip, defeating that idempotency check and
  // doubling the partial watermark.
  const baseSynthesis = synthesisSanitized.synthesis;
  const needsDemoWatermark =
    containsDemo && !baseSynthesis.startsWith('SYNTHETIC EDUCATIONAL DEMO');
  const needsPartialWatermark = isPartial && !baseSynthesis.startsWith(PARTIAL_EXPORT_WATERMARK);

  let synthesis = baseSynthesis;
  if (needsDemoWatermark) {
    synthesis = `${DEMO_EXPORT_WATERMARK}${synthesis}`;
  }
  if (needsPartialWatermark) {
    synthesis = `${PARTIAL_EXPORT_WATERMARK}${synthesis}`;
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
    containsDemo ||
    isPartial;

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
