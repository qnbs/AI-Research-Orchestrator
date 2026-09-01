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
/** Single-line partial watermark (CSV prefix + narrative body share this text). */
export const PARTIAL_EXPORT_WATERMARK_LINE =
  'PARTIAL REPORT — RESEARCH DID NOT FINISH. Results are incomplete and have not been fully verified.';
const PARTIAL_EXPORT_WATERMARK = `${PARTIAL_EXPORT_WATERMARK_LINE}\n\n`;

/** Quoted first CSV row so spreadsheet exports of a cancelled run are not silent. */
export function csvPartialProvenancePrefix(partial: boolean): string {
  if (!partial) return '';
  return `"${PARTIAL_EXPORT_WATERMARK_LINE.replace(/"/g, '""')}"\n`;
}

/** Strip either export watermark from the start, in any order, so re-export is idempotent. */
function stripLeadingExportWatermarks(synthesis: string): string {
  let text = synthesis;
  let changed = true;
  while (changed) {
    changed = false;
    if (text.startsWith(PARTIAL_EXPORT_WATERMARK)) {
      text = text.slice(PARTIAL_EXPORT_WATERMARK.length);
      changed = true;
    }
    if (text.startsWith(DEMO_EXPORT_WATERMARK)) {
      text = text.slice(DEMO_EXPORT_WATERMARK.length);
      changed = true;
    }
  }
  return text;
}

/** Canonical prefix order: partial outermost, then demo. */
function applyExportWatermarks(
  synthesis: string,
  opts: { demo: boolean; partial: boolean },
): string {
  const body = stripLeadingExportWatermarks(synthesis);
  let next = body;
  if (opts.demo) next = `${DEMO_EXPORT_WATERMARK}${next}`;
  if (opts.partial) next = `${PARTIAL_EXPORT_WATERMARK}${next}`;
  return next;
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
  const containsDemo = corpusContainsDemo(ranked);
  const isDemoOnly =
    report.corpusClass === 'demo-only' ||
    report.retrievalOutcome === 'educational_demo' ||
    (ranked.length > 0 && ranked.every(isDemoSyntheticArticle)) ||
    isAllDemoCorpus(ranked);

  const isPartial = report.completionStatus === 'partial';
  const withPartialWatermark = (synthesis: string): string =>
    applyExportWatermarks(synthesis, { demo: false, partial: isPartial });

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

  // A cancelled run can have a visible narrative with no extractable PMID
  // claims yet. The claim sanitizer would then return '' and the export would
  // be watermark-only — dropping the collected body this change exists to
  // preserve. Keep the original (already-watermark-stripped) text and label it.
  let uncitedParagraphsRemoved = synthesisSanitized.uncitedParagraphsRemoved;
  let baseSynthesis = synthesisSanitized.synthesis;
  if (isPartial && !baseSynthesis.trim() && report.synthesis.trim()) {
    baseSynthesis = stripLeadingExportWatermarks(report.synthesis);
    uncitedParagraphsRemoved = 0;
  }

  const synthesis = applyExportWatermarks(baseSynthesis, {
    demo: containsDemo,
    partial: isPartial,
  });

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
    uncitedParagraphsRemoved,
  };
};
