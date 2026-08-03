/**
 * Dexie v7 report transform for ADR 0018 trust terminology.
 * Kept pure so upgrade coverage can unit-test without opening a versioned Dexie.
 */

import type { ResearchReport } from '../types';
import { stampDemoReportProvenance } from './demoCorpusMigration';
import { migrateGroundedSynthesisTrustTerminology } from './synthesisTrustTerminology';

/**
 * Rename legacy trust wire values, then re-apply demo demotion so skipped v6
 * stamps cannot retain elevated trust on demo corpora.
 */
export function migrateReportTrustTerminologyV7(report: ResearchReport): ResearchReport {
  const renamed: ResearchReport = {
    ...report,
    groundedSynthesis: migrateGroundedSynthesisTrustTerminology(report.groundedSynthesis),
  };
  return stampDemoReportProvenance(renamed);
}
