import type { ResearchInput, ResearchReport } from '../types';

/**
 * Stable digest for “which report snapshot was persisted” — used so a late-finishing
 * save cannot mark a newer in-memory report as saved (CodeRabbit F-02 follow-up).
 */
export function computeReportSaveFingerprint(
  input: ResearchInput | null,
  report: ResearchReport | null,
): string | null {
  if (!input || !report) return null;
  return JSON.stringify({
    topic: input.researchTopic,
    synthesisLen: report.synthesis.length,
    rankedIds: (report.rankedArticles ?? []).map((a) => a.pmid),
    completion: report.completionStatus ?? null,
    cancelledAt: report.cancelledAt ?? null,
  });
}
