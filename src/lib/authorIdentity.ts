/**
 * Author identity matching and corpus-scoped profile metrics (P0-A).
 * No fabricated bibliometrics — publication counts only from retrieved records.
 */

import type { AuthorCluster, RankedArticle } from '../types';

const NAME_PARTICLES = new Set(['van', 'von', 'de', 'da', 'del', 'der', 'den', 'di', 'la', 'le']);

/** Normalize author names for deterministic identity comparison. */
export const normalizeAuthorNameForMatch = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitNameParts = (normalized: string): string[] =>
  normalized.split(' ').filter((part) => part.length > 0 && !NAME_PARTICLES.has(part));

type ParsedAuthorName = { surname: string; given: string };

/** Parse Western (Given Surname) or PubMed-style (Surname Initial) names. */
const parseAuthorName = (normalized: string): ParsedAuthorName | null => {
  const parts = splitNameParts(normalized);
  if (parts.length === 0) return null;
  if (parts.length === 1) return { surname: parts[0], given: '' };

  const last = parts[parts.length - 1];
  const first = parts[0];

  // PubMed-style: surname first when trailing token looks like an initial cluster.
  if (last.length <= 2 && parts.length >= 2) {
    return { surname: first, given: parts.slice(1).join(' ') };
  }

  return { surname: last, given: parts.slice(0, -1).join(' ') };
};

const givenNamesMatch = (a: string, b: string): boolean => {
  if (!a || !b) return true;
  if (a === b) return true;
  if (a.length === 1 && b.length > 1) return a[0] === b[0];
  if (b.length === 1 && a.length > 1) return b[0] === a[0];
  return false;
};

/**
 * Exact identity check for authorship and co-author exclusion.
 * Supports inverted PubMed names, initials, and hyphenated surnames.
 */
export const isSameAuthorIdentity = (candidate: string, targetName: string): boolean => {
  const cNorm = normalizeAuthorNameForMatch(candidate);
  const tNorm = normalizeAuthorNameForMatch(targetName);
  if (!cNorm || !tNorm) return false;
  if (cNorm === tNorm) return true;

  const cParsed = parseAuthorName(cNorm);
  const tParsed = parseAuthorName(tNorm);
  if (!cParsed || !tParsed) return false;

  if (cParsed.surname !== tParsed.surname) return false;
  return givenNamesMatch(cParsed.given, tParsed.given);
};

export type AuthorshipPosition = 'first' | 'last' | 'middle' | 'single' | 'unresolved';

/** Resolve authorship position for a target author on one publication record. */
export const resolveAuthorshipPosition = (
  authorsField: string | undefined,
  targetName: string,
): AuthorshipPosition => {
  if (!authorsField?.trim()) return 'unresolved';
  const authors = authorsField
    .split(/,|;|\sand\s/i)
    .map((a) => a.trim())
    .filter((a) => a.length > 0 && !/^et\s+al/i.test(a));
  if (authors.length === 0) return 'unresolved';

  const matches = authors.map((name) => isSameAuthorIdentity(name, targetName));
  const matchCount = matches.filter(Boolean).length;
  if (matchCount === 0) return 'unresolved';
  if (matchCount > 1) return 'unresolved';
  if (authors.length === 1) return 'single';

  const idx = matches.findIndex(Boolean);
  if (idx === 0) return 'first';
  if (idx === authors.length - 1) return 'last';
  return 'middle';
};

export const countAuthorshipPositions = (
  articles: readonly Partial<RankedArticle>[],
  targetName: string,
): { first: number; last: number; unresolved: number } => {
  let first = 0;
  let last = 0;
  let unresolved = 0;
  for (const article of articles) {
    const position = resolveAuthorshipPosition(article.authors, targetName);
    if (position === 'first' || position === 'single') first += 1;
    else if (position === 'last') last += 1;
    else unresolved += 1;
  }
  return { first, last, unresolved };
};

/** Publication counts per calendar year from retrieved corpus (not citations). */
export const computePublicationsPerYear = (
  articles: readonly Partial<RankedArticle>[],
): Record<string, number> => {
  const byYear: Record<string, number> = {};
  for (const article of articles) {
    const year = parseInt(article.pubYear ?? '', 10);
    if (!Number.isFinite(year) || year < 1000 || year > 2100) continue;
    const key = String(year);
    byYear[key] = (byYear[key] ?? 0) + 1;
  }
  return byYear;
};

const corpusKeysFromArticles = (articles: readonly Partial<RankedArticle>[]): Set<string> =>
  new Set(articles.map((a) => a.pmid).filter((pmid): pmid is string => Boolean(pmid)));

/** Restrict cluster PMIDs to the retrieval corpus — model output cannot add IDs. */
export const intersectClustersWithCorpus = (
  clusters: AuthorCluster[],
  articles: readonly Partial<RankedArticle>[],
): AuthorCluster[] => {
  const corpusKeys = corpusKeysFromArticles(articles);
  return clusters.map((cluster) => {
    const pmids = cluster.pmids.filter((pmid) => corpusKeys.has(pmid));
    return {
      ...cluster,
      pmids,
      publicationCount: pmids.length,
    };
  });
};

/** Build honest author metrics from corpus records only. */
export const buildAuthorMetricsFromCorpus = (
  articles: readonly Partial<RankedArticle>[],
  targetName: string,
  publicationCount: number,
): {
  hIndex: null;
  totalCitations: null;
  publicationCount: number;
  publicationsPerYear: Record<string, number>;
  publicationsAsFirstAuthor: number;
  publicationsAsLastAuthor: number;
} => {
  const authorship = countAuthorshipPositions(articles, targetName);
  return {
    hIndex: null,
    totalCitations: null,
    publicationCount,
    publicationsPerYear: computePublicationsPerYear(articles),
    publicationsAsFirstAuthor: authorship.first,
    publicationsAsLastAuthor: authorship.last,
  };
};

/** Downgrade legacy profiles that stored fabricated citation timelines or estimates. */
export const sanitizeLegacyAuthorMetrics = (
  metrics: import('../types').AuthorMetrics,
  articles: readonly Partial<RankedArticle>[],
  targetName: string,
): import('../types').AuthorMetrics => {
  const rebuilt = buildAuthorMetricsFromCorpus(articles, targetName, metrics.publicationCount);
  return {
    ...rebuilt,
    citationsPerYear: undefined,
  };
};
