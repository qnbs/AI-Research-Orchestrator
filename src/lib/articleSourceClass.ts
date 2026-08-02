/**
 * Article / report corpus source classification (P0 synthetic-demo quarantine).
 * Distinguishes retrieved literature from educational fixtures and placeholders.
 */

import type { ArticleSourceClass, RankedArticle, ReportCorpusClass } from '../types';

const isDemoKey = (pmid: string): boolean => pmid.startsWith('demo:');

/** Infer source class from identifier shape when explicit stamp is missing. */
export function inferArticleSourceClass(
  article: Pick<RankedArticle, 'pmid' | 'sourceClass'>,
): ArticleSourceClass {
  if (article.sourceClass) return article.sourceClass;
  if (isDemoKey(article.pmid)) return 'demo-synthetic';
  if (article.pmid.startsWith('arxiv:')) return 'arxiv-retrieved';
  if (article.pmid.startsWith('doi:') || article.pmid.startsWith('pmcid:')) return 'user-imported';
  return 'pubmed-retrieved';
}

export function isDemoSyntheticArticle(
  article: Pick<RankedArticle, 'pmid' | 'sourceClass'>,
): boolean {
  return inferArticleSourceClass(article) === 'demo-synthetic';
}

export function corpusContainsDemo(
  articles: readonly Pick<RankedArticle, 'pmid' | 'sourceClass'>[],
): boolean {
  return articles.some(isDemoSyntheticArticle);
}

export function resolveReportCorpusClass(
  articles: readonly Pick<RankedArticle, 'pmid' | 'sourceClass'>[],
  explicit?: ReportCorpusClass,
): ReportCorpusClass {
  if (explicit) return explicit;
  if (articles.length === 0) return 'empty-retrieval';
  const classes = new Set(articles.map(inferArticleSourceClass));
  if (classes.size === 1 && classes.has('demo-synthetic')) return 'demo-only';
  if (classes.size === 1 && classes.has('offline-placeholder')) return 'placeholder-only';
  if (classes.has('demo-synthetic') || classes.has('offline-placeholder')) return 'mixed-retrieved';
  return 'retrieved';
}

/** Stamp demo-synthetic class + typed demo id onto a RankedArticle. */
export function stampDemoArticle(article: RankedArticle): RankedArticle {
  const value = article.pmid.startsWith('demo:')
    ? article.pmid.slice('demo:'.length)
    : article.pmid;
  return {
    ...article,
    sourceClass: 'demo-synthetic',
    articleId: { type: 'demo', value },
    pmid: article.pmid.startsWith('demo:') ? article.pmid : `demo:${article.pmid}`,
  };
}

export function stampArticlesSourceClass(
  articles: readonly RankedArticle[],
  sourceClass: ArticleSourceClass,
): RankedArticle[] {
  return articles.map((a) => ({ ...a, sourceClass: a.sourceClass ?? sourceClass }));
}
