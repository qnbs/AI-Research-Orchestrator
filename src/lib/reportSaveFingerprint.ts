import type { ResearchInput, ResearchReport } from '../types';

function rankedArticleTagSignature(report: ResearchReport): string {
  return (report.rankedArticles ?? [])
    .map((a) => {
      const tags = [...(a.customTags ?? [])].sort().join(',');
      return `${a.pmid}:${tags}`;
    })
    .sort()
    .join('|');
}

/**
 * Stable digest for “which report snapshot was persisted” — used so a late-finishing
 * save cannot mark a newer in-memory report as saved (CodeRabbit F-02 follow-up).
 * Includes full `ResearchInput`, full synthesis (not only length — catches same-length edits),
 * and per-article tag sets (custom tags are user mutations).
 */
export function computeReportSaveFingerprint(
  input: ResearchInput | null,
  report: ResearchReport | null,
): string | null {
  if (!input || !report) return null;
  return JSON.stringify({
    input,
    synthesis: report.synthesis,
    rankedPmids: (report.rankedArticles ?? []).map((a) => a.pmid),
    tags: rankedArticleTagSignature(report),
    completion: report.completionStatus ?? null,
    cancelledAt: report.cancelledAt ?? null,
  });
}
