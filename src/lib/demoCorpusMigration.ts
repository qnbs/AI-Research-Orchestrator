/**
 * Pure helpers for Dexie v6 demo-corpus quarantine stamping (ADR 0016).
 * Kept side-effect free so upgrade coverage can unit-test transformations.
 */

import type { KnowledgeBaseEntry, RankedArticle, ResearchEntry, ResearchReport } from '../types';
import { isElevatedSynthesisTrust } from './synthesisTrustTerminology';

type DemoStampableArticle = RankedArticle & {
  pmid?: string;
  sourceClass?: string;
  articleId?: unknown;
};

/** Stamp a single article when its key is a synthetic `demo:` identifier. */
export function stampDemoArticleForMigration<T extends DemoStampableArticle>(article: T): T {
  if (typeof article.pmid !== 'string' || !article.pmid.startsWith('demo:')) return article;
  const value = article.pmid.slice('demo:'.length);
  return {
    ...article,
    sourceClass: 'demo-synthetic',
    articleId: { type: 'demo', value },
  };
}

function isDemoArticle(article: { sourceClass?: string; pmid?: string }): boolean {
  return (
    article.sourceClass === 'demo-synthetic' ||
    (typeof article.pmid === 'string' && article.pmid.startsWith('demo:'))
  );
}

/** True when every ranked article is a synthetic demo fixture. */
export function isAllDemoCorpus(
  articles: ReadonlyArray<{ sourceClass?: string; pmid?: string }>,
): boolean {
  return articles.length > 0 && articles.every(isDemoArticle);
}

/** Apply demo corpusClass / retrievalOutcome / trust demotion when the corpus is all-demo. */
export function stampDemoReportProvenance(report: ResearchReport): ResearchReport {
  const ranked = Array.isArray(report.rankedArticles) ? report.rankedArticles : [];
  const stampedRanked = ranked.map((a) => stampDemoArticleForMigration(a));
  let next: ResearchReport = { ...report, rankedArticles: stampedRanked };

  if (!isAllDemoCorpus(stampedRanked)) return next;

  next = {
    ...next,
    corpusClass: 'demo-only',
    retrievalOutcome: 'educational_demo',
  };
  const grounded = next.groundedSynthesis;
  if (grounded && isElevatedSynthesisTrust(grounded.trustLevel)) {
    next = {
      ...next,
      groundedSynthesis: {
        ...grounded,
        trustLevel: 'narrative-draft',
      },
    };
  }
  return next;
}

/** Migrate a knowledge-base research entry for Dexie v6 demo quarantine. */
export function migrateKnowledgeBaseEntryDemoProvenance(
  entry: KnowledgeBaseEntry,
): KnowledgeBaseEntry {
  const articles = Array.isArray(entry.articles)
    ? entry.articles.map((a) => stampDemoArticleForMigration(a))
    : entry.articles;

  if (entry.sourceType !== 'research') {
    return { ...entry, articles };
  }

  const research = entry as ResearchEntry;
  const next: ResearchEntry = {
    ...research,
    articles,
    report: stampDemoReportProvenance(research.report),
  };

  if (research.input && research.id.startsWith('demo-')) {
    next.input = { ...research.input, educationalDemoMode: true };
  }

  return next;
}
