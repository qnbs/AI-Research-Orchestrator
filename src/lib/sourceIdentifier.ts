/**
 * Discriminated article source identifiers (P1-5).
 * Legacy `pmid` strings remain the canonical map/export key; `articleId` is the typed view.
 */

import type { GroundedClaim, RankedArticle, SourceIdentifier } from '../types';

const ARXIV_PREFIX = 'arxiv:';
const DOI_PREFIX = 'doi:';
const PMCID_PREFIX = 'pmcid:';
const DEMO_PREFIX = 'demo:';

const SOURCE_IDENTIFIER_TYPES: ReadonlySet<SourceIdentifier['type']> = new Set([
  'pmid',
  'pmcid',
  'doi',
  'arxiv',
  'demo',
]);

/** Runtime guard for persisted or imported identifier objects. */
export const isSourceIdentifier = (value: unknown): value is SourceIdentifier =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  'value' in value &&
  SOURCE_IDENTIFIER_TYPES.has((value as SourceIdentifier).type) &&
  typeof (value as SourceIdentifier).value === 'string';

/** Normalize PMCID value (strip leading PMC). */
export const normalizePmcidValue = (raw: string): string => raw.trim().replace(/^PMC/i, '');

/** Parse legacy canonical keys and typed ids into a SourceIdentifier. */
export const parseLegacyArticleKey = (key: string | unknown): SourceIdentifier => {
  if (typeof key !== 'string') {
    return { type: 'pmid', value: '' };
  }
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
  if (trimmed.startsWith(DEMO_PREFIX)) {
    return { type: 'demo', value: trimmed.slice(DEMO_PREFIX.length) };
  }
  if (/^\d+$/.test(trimmed)) {
    return { type: 'pmid', value: trimmed };
  }
  return { type: 'pmid', value: trimmed };
};

/** Canonical string key used in maps, exports, and legacy `pmid` fields. */
export const canonicalArticleKey = (id: SourceIdentifier): string => {
  switch (id.type) {
    case 'pmid':
      return id.value;
    case 'arxiv':
      return `${ARXIV_PREFIX}${id.value}`;
    case 'doi':
      return `${DOI_PREFIX}${id.value}`;
    case 'pmcid':
      return `${PMCID_PREFIX}${normalizePmcidValue(id.value)}`;
    case 'demo':
      return `${DEMO_PREFIX}${id.value}`;
    default: {
      const fallback = id as SourceIdentifier;
      return fallback.value;
    }
  }
};

/** Resolve the typed identifier for a ranked article record. */
export const resolveArticleId = (article: RankedArticle): SourceIdentifier => {
  const fromPmid = parseLegacyArticleKey(article.pmid);
  if (isSourceIdentifier(article.articleId)) {
    if (canonicalArticleKey(article.articleId) === canonicalArticleKey(fromPmid)) {
      return article.articleId;
    }
    return fromPmid;
  }
  return fromPmid;
};

/** Find a corpus article by its canonical legacy key. */
export const findArticleByCorpusKey = (
  articles: readonly RankedArticle[],
  corpusKey: string,
): RankedArticle | undefined =>
  articles.find((a) => canonicalArticleKey(resolveArticleId(a)) === corpusKey);

/** Ensure typed `articleId` and legacy `pmid` canonical key stay aligned. */
export const ensureArticleIdentifiers = (article: RankedArticle): RankedArticle => {
  const articleId = resolveArticleId(article);
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
};

/** Whether the article's primary identifier is arXiv. */
export const isArxivArticle = (article: RankedArticle): boolean =>
  resolveArticleId(article).type === 'arxiv';

/** External URL for a typed source identifier. */
export const sourceIdentifierExternalUrl = (id: SourceIdentifier): string => {
  switch (id.type) {
    case 'arxiv':
      return `https://arxiv.org/abs/${id.value}`;
    case 'doi':
      return `https://doi.org/${encodeURI(id.value)}`;
    case 'pmcid':
      return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${normalizePmcidValue(id.value)}/`;
    case 'pmid':
      return `https://pubmed.ncbi.nlm.nih.gov/${id.value}/`;
    case 'demo':
      // Synthetic fixtures must never resolve to PubMed/arXiv URLs.
      return '';
    default: {
      const fallback = id as SourceIdentifier;
      return `https://pubmed.ncbi.nlm.nih.gov/${fallback.value}/`;
    }
  }
};

/** Primary external link for an article record (matches resolved primary identifier). */
export const articleExternalUrl = (article: RankedArticle): string =>
  sourceIdentifierExternalUrl(resolveArticleId(article));

export type SourceIdentifierLabelKey =
  | 'article.identifier.pmid'
  | 'article.identifier.arxiv'
  | 'article.identifier.doi'
  | 'article.identifier.pmcid'
  | 'article.identifier.demo';

/** i18n key for the identifier type label in UI. */
export const sourceIdentifierLabelKey = (id: SourceIdentifier): SourceIdentifierLabelKey => {
  switch (id.type) {
    case 'arxiv':
      return 'article.identifier.arxiv';
    case 'doi':
      return 'article.identifier.doi';
    case 'pmcid':
      return 'article.identifier.pmcid';
    case 'demo':
      return 'article.identifier.demo';
    case 'pmid':
      return 'article.identifier.pmid';
    default:
      return 'article.identifier.pmid';
  }
};

export type SourceIdentifierCopyLabelKey =
  | 'report.copyType.pmid'
  | 'report.copyType.arxiv'
  | 'report.copyType.doi'
  | 'report.copyType.pmcid'
  | 'report.copyType.demo';

/** i18n key for copy-to-clipboard toast labels. */
export const sourceIdentifierCopyLabelKey = (
  id: SourceIdentifier,
): SourceIdentifierCopyLabelKey => {
  switch (id.type) {
    case 'arxiv':
      return 'report.copyType.arxiv';
    case 'doi':
      return 'report.copyType.doi';
    case 'pmcid':
      return 'report.copyType.pmcid';
    case 'demo':
      return 'report.copyType.demo';
    case 'pmid':
      return 'report.copyType.pmid';
    default:
      return 'report.copyType.pmid';
  }
};

/** Display value for an identifier (PMCID values include the PMC prefix). */
export const formatSourceIdentifierValue = (id: SourceIdentifier): string => {
  if (id.type === 'pmcid') {
    return `PMC${normalizePmcidValue(id.value)}`;
  }
  return id.value;
};

/** Collect canonical corpus keys from ranked articles. */
export const corpusKeysFromArticles = (articles: readonly RankedArticle[]): Set<string> =>
  new Set(articles.map((a) => canonicalArticleKey(resolveArticleId(a))));

/** External URL for a legacy canonical key string. */
export const legacyArticleKeyUrl = (key: string): string =>
  sourceIdentifierExternalUrl(parseLegacyArticleKey(key));

/** English label for exports/PDF where i18n is unavailable. */
export const formatLegacyArticleKeyLabel = (key: string): string => {
  const id = parseLegacyArticleKey(key);
  const prefix =
    id.type === 'pmid'
      ? 'PMID'
      : id.type === 'arxiv'
        ? 'arXiv'
        : id.type === 'doi'
          ? 'DOI'
          : id.type === 'demo'
            ? 'Demo ID'
            : 'PMCID';
  return `${prefix}: ${formatSourceIdentifierValue(id)}`;
};

/** Normalize grounded-claim identifier fields for persistence. */
export const ensureGroundedClaim = (claim: GroundedClaim): GroundedClaim => {
  const validIds = claim.articleIds?.filter(isSourceIdentifier) ?? [];
  const rawIds = validIds.length > 0 ? validIds : claim.pmids.map((p) => parseLegacyArticleKey(p));
  const articleIds = rawIds.map((id) => parseLegacyArticleKey(canonicalArticleKey(id)));
  const pmids = articleIds.map((id) => canonicalArticleKey(id));
  return { ...claim, articleIds, pmids };
};
