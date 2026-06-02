import type {
  AuthorProfileEntry,
  JournalEntry,
  KnowledgeBaseEntry,
  RankedArticle,
  ResearchEntry,
} from '../types';

/** Build Redux/Dexie partial update when article lists change on a KB entry. */
export function kbEntryChangesWithArticles(
  entry: KnowledgeBaseEntry,
  newArticles: RankedArticle[],
): Partial<KnowledgeBaseEntry> {
  const base = { articles: newArticles };
  if (entry.sourceType === 'research') {
    return {
      ...base,
      report: { ...entry.report, rankedArticles: newArticles },
    } satisfies Partial<ResearchEntry>;
  }
  if (entry.sourceType === 'author') {
    return {
      ...base,
      profile: { ...entry.profile, publications: newArticles },
    } satisfies Partial<AuthorProfileEntry>;
  }
  return base;
}

/** Partial update for renaming a KB entry title (and linked input/profile fields). */
export function kbEntryTitleChanges(
  entry: KnowledgeBaseEntry,
  newTitle: string,
): Partial<KnowledgeBaseEntry> {
  if (entry.sourceType === 'research') {
    return {
      title: newTitle,
      input: { ...entry.input, researchTopic: newTitle },
    };
  }
  if (entry.sourceType === 'author') {
    return {
      title: newTitle,
      input: { ...entry.input, authorName: newTitle },
    };
  }
  if (entry.sourceType === 'journal') {
    return {
      title: newTitle,
      journalProfile: { ...entry.journalProfile, name: newTitle },
    } satisfies Partial<JournalEntry>;
  }
  return { title: newTitle };
}
