/**
 * Non-destructive Knowledge Base deduplication helpers (P0-B).
 * Historical entry snapshots stay intact; the library view dedupes via selectUniqueArticles.
 */

import type { KnowledgeBaseEntry, RankedArticle } from '../types';
import { canonicalArticleKey, resolveArticleId } from './sourceIdentifier';

export type EntryUpdate = { id: string; changes: Partial<KnowledgeBaseEntry> };

const articleKey = (article: RankedArticle): string =>
  canonicalArticleKey(resolveArticleId(article));

/** Pick the highest-relevance copy as canonical metadata for a duplicate group. */
export const pickCanonicalArticle = (articles: RankedArticle[]): RankedArticle =>
  articles.reduce((best, current) =>
    current.relevanceScore > best.relevanceScore ? current : best,
  );

/** Count PMID groups that appear in more than one entry. */
export const countDuplicateArticleGroups = (entries: readonly KnowledgeBaseEntry[]): number => {
  const byKey = new Map<string, number>();
  for (const entry of entries) {
    for (const article of entry.articles) {
      const key = articleKey(article);
      byKey.set(key, (byKey.get(key) ?? 0) + 1);
    }
  }
  return [...byKey.values()].filter((count) => count > 1).length;
};

/**
 * Harmonize duplicate copies: sync tags and relevance from the canonical winner
 * without removing articles from any historical snapshot.
 */
export const buildHarmonizeDuplicateUpdates = (
  entries: readonly KnowledgeBaseEntry[],
): { updates: EntryUpdate[]; harmonizedCopies: number } => {
  const copiesByKey = new Map<string, Array<{ entryId: string; article: RankedArticle }>>();

  for (const entry of entries) {
    for (const article of entry.articles) {
      const key = articleKey(article);
      const bucket = copiesByKey.get(key) ?? [];
      bucket.push({ entryId: entry.id, article });
      copiesByKey.set(key, bucket);
    }
  }

  const entryChanges = new Map<string, KnowledgeBaseEntry>();
  let harmonizedCopies = 0;

  for (const copies of copiesByKey.values()) {
    if (copies.length <= 1) continue;
    const canonical = pickCanonicalArticle(copies.map((c) => c.article));
    const canonicalTags = canonical.customTags ?? [];

    for (const { entryId, article } of copies) {
      const tagsMatch = JSON.stringify(article.customTags ?? []) === JSON.stringify(canonicalTags);
      const scoreMatch = article.relevanceScore === canonical.relevanceScore;
      if (tagsMatch && scoreMatch) continue;

      harmonizedCopies += 1;
      const entry = entryChanges.get(entryId) ?? entries.find((e) => e.id === entryId)!;
      const currentArticles = entryChanges.get(entryId)?.articles ?? [...entry.articles];

      const updatedArticles = currentArticles.map((a) => {
        if (articleKey(a) !== articleKey(article)) return a;
        return {
          ...a,
          customTags: [...canonicalTags],
          relevanceScore: canonical.relevanceScore,
        };
      });

      const patched: KnowledgeBaseEntry = {
        ...entry,
        articles: updatedArticles,
      };

      if (patched.sourceType === 'research') {
        patched.report = { ...patched.report, rankedArticles: updatedArticles };
      } else if (patched.sourceType === 'author') {
        patched.profile = { ...patched.profile, publications: updatedArticles };
      }

      entryChanges.set(entryId, patched);
    }
  }

  const updates: EntryUpdate[] = [...entryChanges.entries()].map(([id, entry]) => ({
    id,
    changes: {
      articles: entry.articles,
      ...(entry.sourceType === 'research' && { report: entry.report }),
      ...(entry.sourceType === 'author' && { profile: entry.profile }),
    },
  }));

  return { updates, harmonizedCopies };
};

/** Prune only research-sourced articles — author/journal profiles are not relevance-pruned. */
export const selectResearchPrunePmids = (
  articles: readonly { pmid: string; relevanceScore: number; sourceId?: string }[],
  entries: readonly KnowledgeBaseEntry[],
  pruneScore: number,
): string[] => {
  const researchEntryIds = new Set(
    entries.filter((e) => e.sourceType === 'research').map((e) => e.id),
  );
  return articles
    .filter(
      (a) =>
        a.relevanceScore < pruneScore &&
        a.sourceId !== undefined &&
        researchEntryIds.has(a.sourceId),
    )
    .map((a) => a.pmid);
};
