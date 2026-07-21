import type { KnowledgeBaseEntry } from '../types';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasBaseEntryShape = (item: Record<string, unknown>): boolean =>
  typeof item.id === 'string' &&
  typeof item.title === 'string' &&
  typeof item.timestamp === 'number' &&
  Array.isArray(item.articles) &&
  item.articles.every((a) => isPlainObject(a) && typeof a.pmid === 'string');

// Downstream views read these fields directly with no `?.`/`|| []` guard
// (e.g. OrchestratorDashboard's `entry.report.rankedArticles.length`), so an
// import passing a report/profile/journalProfile with the right top-level
// shape but a missing required field would crash the UI after being saved.
const isValidReport = (report: unknown): boolean =>
  isPlainObject(report) &&
  Array.isArray(report.rankedArticles) &&
  Array.isArray(report.generatedQueries) &&
  typeof report.synthesis === 'string' &&
  Array.isArray(report.aiGeneratedInsights) &&
  Array.isArray(report.overallKeywords);

const isValidProfile = (profile: unknown): boolean =>
  isPlainObject(profile) &&
  typeof profile.name === 'string' &&
  Array.isArray(profile.affiliations) &&
  isPlainObject(profile.metrics) &&
  typeof profile.careerSummary === 'string' &&
  Array.isArray(profile.coreConcepts) &&
  Array.isArray(profile.publications);

const isValidJournalProfile = (journalProfile: unknown): boolean =>
  isPlainObject(journalProfile) &&
  typeof journalProfile.name === 'string' &&
  typeof journalProfile.issn === 'string' &&
  typeof journalProfile.description === 'string' &&
  typeof journalProfile.oaPolicy === 'string' &&
  Array.isArray(journalProfile.focusAreas);

/**
 * Validates the shape of a single imported JSON entry against the
 * ResearchEntry | AuthorProfileEntry | JournalEntry union before it's
 * trusted as a real `KnowledgeBaseEntry` (e.g. from a user-uploaded
 * import file). Checks each variant's required fields, including the
 * nested report/profile/journalProfile fields read without a guard
 * downstream — not a full recursive schema validation of every article.
 */
export function isKnowledgeBaseEntry(item: unknown): item is KnowledgeBaseEntry {
  if (!isPlainObject(item) || !hasBaseEntryShape(item)) return false;

  switch (item.sourceType) {
    case 'research':
      return isPlainObject(item.input) && isValidReport(item.report);
    case 'author':
      return isPlainObject(item.input) && isValidProfile(item.profile);
    case 'journal':
      return isValidJournalProfile(item.journalProfile);
    default:
      return false;
  }
}
