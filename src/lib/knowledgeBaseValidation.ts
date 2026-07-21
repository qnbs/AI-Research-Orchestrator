import type { KnowledgeBaseEntry } from '../types';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasBaseEntryShape = (item: Record<string, unknown>): boolean =>
  typeof item.id === 'string' &&
  typeof item.title === 'string' &&
  typeof item.timestamp === 'number' &&
  Array.isArray(item.articles) &&
  item.articles.every((a) => isPlainObject(a) && typeof a.pmid === 'string');

/**
 * Validates the shape of a single imported JSON entry against the
 * ResearchEntry | AuthorProfileEntry | JournalEntry union before it's
 * trusted as a real `KnowledgeBaseEntry` (e.g. from a user-uploaded
 * import file). Checks each variant's required top-level fields; does
 * not recursively validate nested report/profile/journalProfile shapes.
 */
export function isKnowledgeBaseEntry(item: unknown): item is KnowledgeBaseEntry {
  if (!isPlainObject(item) || !hasBaseEntryShape(item)) return false;

  switch (item.sourceType) {
    case 'research':
      return isPlainObject(item.input) && isPlainObject(item.report);
    case 'author':
      return isPlainObject(item.input) && isPlainObject(item.profile);
    case 'journal':
      return isPlainObject(item.journalProfile);
    default:
      return false;
  }
}
