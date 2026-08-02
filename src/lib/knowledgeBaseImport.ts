/**
 * Knowledge Base import trust boundary (P0-C).
 * External JSON is untrusted — strict validation, corpus re-grounding, and trust downgrade.
 */

import type { KnowledgeBaseEntry, ResearchEntry } from '../types';
import { buildAssessedGroundedSynthesis } from './groundedSynthesis';
import { isKnowledgeBaseEntry } from './knowledgeBaseValidation';
import { sanitizeReportForExport } from './reportExportProvenance';

export const KNOWLEDGE_BASE_IMPORT_ENVELOPE_VERSION = 1;
export const MAX_KB_IMPORT_ENTRIES = 500;

export interface KnowledgeBaseImportQuarantine {
  acceptedCount: number;
  rejectedCount: number;
  legacyEnvelope: boolean;
  trustDowngradedCount: number;
  droppedClaims: number;
  invalidCitations: number;
  uncitedParagraphsRemoved: number;
  rejected: Array<{ index: number; reason: string }>;
}

export interface KnowledgeBaseImportResult {
  accepted: KnowledgeBaseEntry[];
  quarantine: KnowledgeBaseImportQuarantine;
}

export interface EntryImportSanitizationStats {
  trustDowngraded: boolean;
  droppedClaims: number;
  invalidCitations: number;
  uncitedParagraphsRemoved: number;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const emptyQuarantine = (): KnowledgeBaseImportQuarantine => ({
  acceptedCount: 0,
  rejectedCount: 0,
  legacyEnvelope: false,
  trustDowngradedCount: 0,
  droppedClaims: 0,
  invalidCitations: 0,
  uncitedParagraphsRemoved: 0,
  rejected: [],
});

/** Sanitize a single KB entry for persistence after import. */
export const sanitizeKnowledgeBaseEntryForImport = (
  entry: KnowledgeBaseEntry,
): { entry: KnowledgeBaseEntry; stats: EntryImportSanitizationStats } => {
  if (entry.sourceType !== 'research' || !entry.report) {
    return {
      entry,
      stats: {
        trustDowngraded: false,
        droppedClaims: 0,
        invalidCitations: 0,
        uncitedParagraphsRemoved: 0,
      },
    };
  }

  const provenance = sanitizeReportForExport(entry.report);
  let report = provenance.report;
  let trustDowngraded = false;

  if (report.groundedSynthesis?.claims?.length) {
    const reassessed = buildAssessedGroundedSynthesis(
      report.groundedSynthesis.claims,
      report.rankedArticles,
      report.groundedSynthesis.mode,
    );
    if (reassessed) {
      const importedTrust = report.groundedSynthesis.trustLevel;
      report = {
        ...report,
        groundedSynthesis: {
          ...reassessed,
          trustLevel: 'narrative-draft',
          validatedAt: Date.now(),
        },
      };
      trustDowngraded = importedTrust === 'verified' || reassessed.trustLevel === 'verified';
    }
  } else if (report.groundedSynthesis?.trustLevel === 'verified') {
    report = {
      ...report,
      groundedSynthesis: {
        ...report.groundedSynthesis,
        trustLevel: 'narrative-draft',
        validatedAt: Date.now(),
      },
    };
    trustDowngraded = true;
  }

  const sanitizedEntry: ResearchEntry = {
    ...entry,
    articles: report.rankedArticles,
    report,
  };

  return {
    entry: sanitizedEntry,
    stats: {
      trustDowngraded,
      droppedClaims: provenance.droppedClaims,
      invalidCitations: provenance.invalidCitations,
      uncitedParagraphsRemoved: provenance.uncitedParagraphsRemoved,
    },
  };
};

/** Parse uploaded JSON and return sanitized entries plus a quarantine report. */
export const parseAndSanitizeKnowledgeBaseImport = (raw: unknown): KnowledgeBaseImportResult => {
  const quarantine = emptyQuarantine();
  let entriesRaw: unknown;
  let legacyEnvelope = false;

  if (Array.isArray(raw)) {
    entriesRaw = raw;
    legacyEnvelope = true;
  } else if (isPlainObject(raw)) {
    const meta = raw.meta;
    if (isPlainObject(meta) && meta.type === 'knowledge-base-articles') {
      quarantine.rejected.push({
        index: -1,
        reason: 'wrong_export_type:knowledge-base-articles',
      });
      quarantine.rejectedCount = 1;
      return { accepted: [], quarantine };
    }

    if ('data' in raw) {
      entriesRaw = raw.data;
      legacyEnvelope =
        !isPlainObject(meta) ||
        meta.importEnvelopeVersion === undefined ||
        meta.importEnvelopeVersion !== KNOWLEDGE_BASE_IMPORT_ENVELOPE_VERSION;
    } else {
      quarantine.rejected.push({ index: -1, reason: 'invalid_envelope' });
      quarantine.rejectedCount = 1;
      return { accepted: [], quarantine };
    }
  } else {
    quarantine.rejected.push({ index: -1, reason: 'invalid_root' });
    quarantine.rejectedCount = 1;
    return { accepted: [], quarantine };
  }

  if (!Array.isArray(entriesRaw)) {
    quarantine.rejected.push({ index: -1, reason: 'data_not_array' });
    quarantine.rejectedCount = 1;
    return { accepted: [], quarantine };
  }

  if (entriesRaw.length > MAX_KB_IMPORT_ENTRIES) {
    quarantine.rejected.push({
      index: -1,
      reason: `too_many_entries:${entriesRaw.length}`,
    });
    quarantine.rejectedCount = entriesRaw.length;
    return { accepted: [], quarantine };
  }

  quarantine.legacyEnvelope = legacyEnvelope;
  const accepted: KnowledgeBaseEntry[] = [];

  for (let index = 0; index < entriesRaw.length; index += 1) {
    const candidate = entriesRaw[index];
    if (!isKnowledgeBaseEntry(candidate)) {
      quarantine.rejected.push({ index, reason: 'invalid_entry_shape' });
      quarantine.rejectedCount += 1;
      continue;
    }

    const { entry, stats } = sanitizeKnowledgeBaseEntryForImport(candidate);
    accepted.push(entry);
    if (stats.trustDowngraded) quarantine.trustDowngradedCount += 1;
    quarantine.droppedClaims += stats.droppedClaims;
    quarantine.invalidCitations += stats.invalidCitations;
    quarantine.uncitedParagraphsRemoved += stats.uncitedParagraphsRemoved;
  }

  quarantine.acceptedCount = accepted.length;
  return { accepted, quarantine };
};
