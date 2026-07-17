import type { JournalProfile, RankedArticle } from '../../types';
import { extractKeywords } from './keywords';
import { scoreArticleRelevance, classifyArticleType } from './ranking';
import { throwIfAborted } from './utils';

/** Curated educational journal knowledge (ISSN + OA policy guesses). */
const JOURNAL_KB: Record<
  string,
  { issn: string; description: string; oaPolicy: string; focusAreas: string[] }
> = {
  nature: {
    issn: '0028-0836',
    description:
      'Flagship multidisciplinary journal publishing high-impact original research across the natural sciences.',
    oaPolicy: 'Hybrid',
    focusAreas: ['multidisciplinary science', 'biology', 'physics', 'chemistry'],
  },
  science: {
    issn: '0036-8075',
    description: 'AAAS journal covering cutting-edge research across scientific disciplines.',
    oaPolicy: 'Hybrid',
    focusAreas: ['multidisciplinary science', 'policy', 'research articles'],
  },
  'the lancet': {
    issn: '0140-6736',
    description:
      'Leading general medical weekly with clinical trials, reviews, and global health content.',
    oaPolicy: 'Hybrid',
    focusAreas: ['clinical medicine', 'global health', 'public health'],
  },
  nejm: {
    issn: '0028-4793',
    description:
      'The New England Journal of Medicine — premier clinical research and practice updates.',
    oaPolicy: 'Hybrid',
    focusAreas: ['clinical medicine', 'therapeutics', 'epidemiology'],
  },
  'new england journal of medicine': {
    issn: '0028-4793',
    description:
      'The New England Journal of Medicine — premier clinical research and practice updates.',
    oaPolicy: 'Hybrid',
    focusAreas: ['clinical medicine', 'therapeutics', 'epidemiology'],
  },
  'plos one': {
    issn: '1932-6203',
    description:
      'Large multidisciplinary open-access journal emphasizing methodological soundness.',
    oaPolicy: 'Full Open Access',
    focusAreas: ['multidisciplinary', 'open science', 'methods'],
  },
  bmj: {
    issn: '0959-8138',
    description:
      'British Medical Journal — clinical research, evidence synthesis, and health policy.',
    oaPolicy: 'Hybrid',
    focusAreas: ['clinical medicine', 'evidence-based medicine', 'health policy'],
  },
  cell: {
    issn: '0092-8674',
    description:
      'Flagship cell biology journal for mechanistic and molecular life-science research.',
    oaPolicy: 'Hybrid',
    focusAreas: ['cell biology', 'molecular biology', 'genetics'],
  },
};

function normalizeJournalKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Rule-based journal profile using static KB + optional local article titles.
 */
export function generateJournalProfileHeuristic(
  journalName: string,
  articles: Partial<RankedArticle>[] = [],
  signal?: AbortSignal,
): JournalProfile {
  throwIfAborted(signal);
  const key = normalizeJournalKey(journalName);
  const known =
    JOURNAL_KB[key] ??
    Object.entries(JOURNAL_KB).find(([k]) => key.includes(k) || k.includes(key))?.[1];

  const fromArticles = extractKeywords(articles.map((a) => a.title ?? '').join(' '), 6);

  if (known) {
    return {
      name: journalName,
      issn: known.issn,
      description: `${known.description} (Heuristic mode profile.)`,
      oaPolicy: known.oaPolicy,
      focusAreas: [...new Set([...known.focusAreas, ...fromArticles])].slice(0, 8),
    };
  }

  const oaGuess = /plos|bmc|frontiers|elife|open/i.test(journalName)
    ? 'Full Open Access'
    : /nature|science|cell|lancet|nejm|jama/i.test(journalName)
      ? 'Hybrid'
      : 'Subscription';

  return {
    name: journalName,
    issn: 'Unknown',
    description: `Heuristic profile for “${journalName}”. No curated entry found; focus areas inferred from ${
      articles.length
    } local article title(s). Re-run with live Gemini for ISSN verification when online with an API key.`,
    oaPolicy: oaGuess,
    focusAreas: fromArticles.length ? fromArticles : meaningfulFallback(journalName),
  };
}

function meaningfulFallback(name: string): string[] {
  return name
    .split(/[\s:&/-]+/)
    .map((p) => p.toLowerCase())
    .filter((p) => p.length > 3 && !['journal', 'international', 'society', 'research'].includes(p))
    .slice(0, 5);
}

/**
 * Analyze a single article locally (score title↔abstract coherence).
 */
export function analyzeArticleHeuristic(
  article: Pick<RankedArticle, 'pmid' | 'title' | 'summary' | 'authors' | 'journal' | 'pubYear'> &
    Partial<RankedArticle>,
  signal?: AbortSignal,
): RankedArticle {
  throwIfAborted(signal);
  const normalized = {
    ...article,
    isOpenAccess: article.isOpenAccess ?? false,
  };
  const { score, explanation, keywords } = scoreArticleRelevance(normalized, article.title);
  return {
    ...normalized,
    relevanceScore: score,
    relevanceExplanation: explanation,
    keywords,
    articleType: article.articleType ?? classifyArticleType(article.title, article.summary),
    aiSummary: (article.summary || '').slice(0, 400),
    isOpenAccess: normalized.isOpenAccess,
  };
}
