/**
 * Discriminated article source identifiers (P1-5).
 * Legacy `pmid` strings remain the canonical map/export key; `articleId` is the typed view.
 */

import type { GroundedClaim, RankedArticle, SourceIdentifier } from '../types';

const ARXIV_PREFIX = 'arxiv:';
const DOI_PREFIX = 'doi:';
const PMCID_PREFIX = 'pmcid:';

/** Normalize PMCID value (strip leading PMC). */
export function normalizePmcidValue(raw: string): string {
  return raw.trim().replace(/^PMC/i, '');
}

/** Parse legacy canonical keys and typed ids into a SourceIdentifier. */
export function parseLegacyArticleKey(key: string): SourceIdentifier {
  const trimmed = key.trim();
  if (!trimmed) {
    return { type: 'pmid', value: '' };
  }
  if (trimmed.startsWith(ARXIV_PREFIX)) {
    return { type: 'arxiv', value: trimmed.slice(ARXIV_PREFIX.length) };
  }
  if (trimmed.startsWith(DOI_PREFIX)) {
    return { type: 'doi', value: trimmed.slice(DOI_PREFIX.length) };
  }
  if (trimmed.startsWith(PMCID_PREFIX)) {
    return { type: 'pmcid', value: normalizePmcidValue(trimmed.slice(PMCID_PREFIX.length)) };
  }
  if (/^\d+$/.test(trimmed)) {
    return { type: 'pmid', value: trimmed };
  }
  return { type: 'pmid', value: trimmed };
}

/** Canonical string key used in maps, exports, and legacy `pmid` fields. */
export function canonicalArticleKey(id: SourceIdentifier): string {
  switch (id.type) {
    case 'pmid':
      return id.value;
    case 'arxiv':
      return `${ARXIV_PREFIX}${id.value}`;
    case 'doi':
      return `${DOI_PREFIX}${id.value}`;
    case 'pmcid':
      return `${PMCID_PREFIX}${normalizePmcidValue(id.value)}`;
  }
}

export function resolveArticleId(article: RankedArticle): SourceIdentifier {
  if (article.articleId) {
    return article.articleId;
  }
  return parseLegacyArticleKey(article.pmid);
}

/** Ensure typed `articleId` and legacy `pmid` canonical key stay aligned. */
export function ensureArticleIdentifiers(article: RankedArticle): RankedArticle {
  const articleId = article.articleId ?? resolveArticleId(article);
  const pmid = canonicalArticleKey(articleId);
  const pmcId =
    article.pmcId ??
    (articleId.type === 'pmcid' ? normalizePmcidValue(articleId.value) : undefined);
  const doi = article.doi ?? (articleId.type === 'doi' ? articleId.value : undefined);
  return {
    ...article,
    articleId,
    pmid,
    pmcId,
    doi,
  };
}

export function isArxivArticle(article: RankedArticle): boolean {
  return resolveArticleId(article).type === 'arxiv';
}

/** Primary external link for an article record. */
export function articleExternalUrl(article: RankedArticle): string {
  const id = resolveArticleId(article);
  if (article.pmcId) {
    return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${normalizePmcidValue(article.pmcId)}/`;
  }
  switch (id.type) {
    case 'arxiv':
      return `https://arxiv.org/abs/${id.value}`;
    case 'doi':
      return `https://doi.org/${encodeURIComponent(id.value)}`;
    case 'pmcid':
      return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${normalizePmcidValue(id.value)}/`;
    case 'pmid':
    default:
      return `https://pubmed.ncbi.nlm.nih.gov/${id.value}/`;
  }
}

export type SourceIdentifierLabelKey =
  | 'article.identifier.pmid'
  | 'article.identifier.arxiv'
  | 'article.identifier.doi'
  | 'article.identifier.pmcid';

export function sourceIdentifierLabelKey(id: SourceIdentifier): SourceIdentifierLabelKey {
  switch (id.type) {
    case 'arxiv':
      return 'article.identifier.arxiv';
    case 'doi':
      return 'article.identifier.doi';
    case 'pmcid':
      return 'article.identifier.pmcid';
    case 'pmid':
    default:
      return 'article.identifier.pmid';
  }
}

export function formatSourceIdentifierValue(id: SourceIdentifier): string {
  if (id.type === 'pmcid') {
    return `PMC${normalizePmcidValue(id.value)}`;
  }
  return id.value;
}

export function corpusKeysFromArticles(articles: readonly RankedArticle[]): Set<string> {
  return new Set(articles.map((a) => canonicalArticleKey(resolveArticleId(a))));
}

export function legacyArticleKeyUrl(key: string): string {
  const id = parseLegacyArticleKey(key);
  switch (id.type) {
    case 'arxiv':
      return `https://arxiv.org/abs/${id.value}`;
    case 'doi':
      return `https://doi.org/${encodeURIComponent(id.value)}`;
    case 'pmcid':
      return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${normalizePmcidValue(id.value)}/`;
    case 'pmid':
    default:
      return `https://pubmed.ncbi.nlm.nih.gov/${id.value}/`;
  }
}

export function formatLegacyArticleKeyLabel(key: string): string {
  const id = parseLegacyArticleKey(key);
  const prefix =
    id.type === 'pmid'
      ? 'PMID'
      : id.type === 'arxiv'
        ? 'arXiv'
        : id.type === 'doi'
          ? 'DOI'
          : 'PMCID';
  return `${prefix}: ${formatSourceIdentifierValue(id)}`;
}

export function ensureGroundedClaim(claim: GroundedClaim): GroundedClaim {
  const articleIds = claim.articleIds ?? claim.pmids.map(parseLegacyArticleKey);
  const pmids =
    claim.pmids.length > 0 ? claim.pmids : articleIds.map((id) => canonicalArticleKey(id));
  return { ...claim, articleIds, pmids };
}
