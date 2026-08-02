/**
 * Non-destructive Knowledge Base deduplication helpers (P0-B).
 * Historical entry snapshots stay intact; the library view dedupes via selectUniqueArticles.
 */

import type { KnowledgeBaseEntry, RankedArticle } from '../types';
import { canonicalArticleKey, resolveArticleId } from './sourceIdentifier';

export type EntryUpdate = { id: string; changes: Partial<KnowledgeBaseEntry> };

const articleKey = (article: RankedArticle): string =>
  canonicalArticleKey(resolveArticleId(article));

const tagsEqual = (a: string[] | undefined, b: string[] | undefined): boolean => {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
};

/** Pick the highest-relevance copy as canonical metadata for a duplicate group. */
export const pickCanonicalArticle = (articles: RankedArticle[]): RankedArticle =>
  articles.reduce((best, current) =>
    current.relevanceScore > best.relevanceScore ? current : best,
  );

/** Count PMID groups that appear in more than one entry (not intra-entry duplicates). */
export const countDuplicateArticleGroups = (entries: readonly KnowledgeBaseEntry[]): number => {
  const entryIdsByKey = new Map<string, Set<string>>();
  for (const entry of entries) {
    const seenInEntry = new Set<string>();
    for (const article of entry.articles) {
      const key = articleKey(article);
      if (seenInEntry.has(key)) continue;
      seenInEntry.add(key);
      const bucket = entryIdsByKey.get(key) ?? new Set<string>();
      bucket.add(entry.id);
      entryIdsByKey.set(key, bucket);
    }
  }
  return [...entryIdsByKey.values()].filter((ids) => ids.size > 1).length;
};

/**
 * Harmonize duplicate copies: sync tags and relevance from the canonical winner
 * without removing articles from any historical snapshot.
 * Research `report.rankedArticles` stays unchanged; only library-level `articles` updates.
 */
export const buildHarmonizeDuplicateUpdates = (
  entries: readonly KnowledgeBaseEntry[],
): { updates: EntryUpdate[]; harmonizedCopies: number } => {
  const entryById = new Map(entries.map((e) => [e.id, e]));
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
      const tagsMatch = tagsEqual(article.customTags, canonicalTags);
      const scoreMatch = article.relevanceScore === canonical.relevanceScore;
      if (tagsMatch && scoreMatch) continue;

      harmonizedCopies += 1;
      const entry = entryChanges.get(entryId) ?? entryById.get(entryId)!;
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

      if (patched.sourceType === 'author') {
        patched.profile = { ...patched.profile, publications: updatedArticles };
      }

      entryChanges.set(entryId, patched);
    }
  }

  const updates: EntryUpdate[] = [...entryChanges.entries()].map(([id, entry]) => ({
    id,
    changes: {
      articles: entry.articles,
      ...(entry.sourceType === 'author' && { profile: entry.profile }),
    },
  }));

  return { updates, harmonizedCopies };
};

/** Count research articles below pruneScore across all research entries. */
export const countResearchPruneCandidates = (
  entries: readonly KnowledgeBaseEntry[],
  pruneScore: number,
): number => selectResearchPrunePmids(entries, pruneScore).length;

/** Prune only research-sourced articles — author/journal profiles are not relevance-pruned. */
export const selectResearchPrunePmids = (
  entries: readonly KnowledgeBaseEntry[],
  pruneScore: number,
): string[] => {
  const pmids: string[] = [];
  for (const entry of entries) {
    if (entry.sourceType !== 'research') continue;
    for (const article of entry.articles) {
      if (article.relevanceScore < pruneScore) {
        pmids.push(article.pmid);
      }
    }
  }
  return pmids;
};
