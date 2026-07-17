import type { OverallKeyword, RankedArticle } from '../../types';
import type { HeuristicArticleInput } from './types';
import {
  cosineBag,
  jaccard,
  meaningfulTokens,
  stemmedTokens,
  tokenSet,
  throwIfAborted,
} from './utils';
import { extractKeywords } from './keywords';

/**
 * Score a single article against a research topic (0–100).
 * Weighted: title overlap, abstract TF cosine, recency, open-access preference.
 */
export function scoreArticleRelevance(
  article: HeuristicArticleInput,
  topic: string,
): { score: number; explanation: string; keywords: string[] } {
  const topicTokens = stemmedTokens(topic);
  const topicSet = tokenSet(topic);
  const titleSet = tokenSet(article.title);
  const abstractTokens = stemmedTokens(article.summary);
  const abstractSet = tokenSet(article.summary);

  const titleOverlap = jaccard(topicSet, titleSet);
  const abstractCosine = cosineBag(topicTokens, abstractTokens);
  const abstractOverlap = jaccard(topicSet, abstractSet);

  const year = parseInt(article.pubYear, 10);
  const currentYear = new Date().getFullYear();
  let recency = 0.5;
  if (Number.isFinite(year)) {
    const age = Math.max(0, currentYear - year);
    recency = Math.max(0, 1 - age / 15);
  }

  const oaBoost = article.isOpenAccess ? 1 : 0.85;

  const raw =
    0.35 * titleOverlap +
    0.3 * abstractCosine +
    0.2 * abstractOverlap +
    0.1 * recency +
    (0.05 * (oaBoost - 0.85)) / 0.15;

  const score = Math.max(1, Math.min(100, Math.round(raw * 100)));

  const keywords = extractKeywords(`${article.title}. ${article.summary}`, 5);
  const matched = [...topicSet].filter((t) => titleSet.has(t) || abstractSet.has(t)).slice(0, 4);

  const explanation = [
    `Heuristic relevance ${score}/100`,
    matched.length ? `shared terms: ${matched.join(', ')}` : 'limited lexical overlap with topic',
    Number.isFinite(year) ? `pubYear ${year}` : null,
    article.isOpenAccess ? 'open access preferred' : null,
  ]
    .filter(Boolean)
    .join('; ');

  return { score, explanation, keywords };
}

/**
 * Rank articles by heuristic relevance; attach scores, explanations, keywords, aiSummary.
 */
export function rankArticles(
  articles: HeuristicArticleInput[],
  topic: string,
  topN: number,
  signal?: AbortSignal,
): RankedArticle[] {
  throwIfAborted(signal);
  const scored = articles.map((a) => {
    const { score, explanation, keywords } = scoreArticleRelevance(a, topic);
    const aiSummary = buildExtractiveSummary(a.summary, a.title);
    return {
      pmid: a.pmid,
      pmcId: a.pmcId,
      title: a.title,
      authors: a.authors,
      journal: a.journal,
      pubYear: a.pubYear,
      summary: a.summary,
      relevanceScore: score,
      relevanceExplanation: explanation,
      keywords: a.keywords?.length ? a.keywords : keywords,
      isOpenAccess: a.isOpenAccess,
      articleType: a.articleType ?? classifyArticleType(a.title, a.summary),
      aiSummary,
    } satisfies RankedArticle;
  });

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore || a.pmid.localeCompare(b.pmid));
  return scored.slice(0, Math.max(1, topN));
}

/** Simple publication-type classifier from title/abstract cues. */
export function classifyArticleType(title: string, summary: string): string {
  const blob = `${title} ${summary}`.toLowerCase();
  if (/meta-?analysis|meta analysis/.test(blob)) return 'Meta-Analysis';
  if (/systematic review/.test(blob)) return 'Systematic Review';
  if (/randomized|randomised|rct\b|placebo-controlled/.test(blob))
    return 'Randomized Controlled Trial';
  if (/cohort|case-control|observational|cross-sectional/.test(blob)) return 'Observational Study';
  if (/review\b/.test(blob)) return 'Review';
  return 'Other';
}

function buildExtractiveSummary(abstract: string, title: string): string {
  const sentences = abstract
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) {
    return `Heuristic summary of “${title}”: abstract unavailable; relevance based on title tokens only.`;
  }
  const first = sentences[0];
  const last = sentences.length > 1 ? sentences[sentences.length - 1] : '';
  const mid = sentences.length > 2 ? sentences[Math.floor(sentences.length / 2)] : '';
  return [first, mid, last].filter(Boolean).join(' ').slice(0, 600);
}

/**
 * Aggregate keyword frequencies across ranked articles.
 */
export function aggregateKeywords(articles: RankedArticle[], limit = 10): OverallKeyword[] {
  const freq = new Map<string, number>();
  for (const a of articles) {
    for (const kw of a.keywords ?? []) {
      const key = kw.toLowerCase();
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([keyword, frequency]) => ({ keyword, frequency }));
}

/**
 * Template insights grounded in top-ranked articles.
 */
export function generateInsights(
  articles: RankedArticle[],
  topic: string,
): { question: string; answer: string; supportingArticles: string[] }[] {
  const top = articles.slice(0, Math.min(5, articles.length));
  const pmids = top.map((a) => a.pmid);
  const journals = [...new Set(top.map((a) => a.journal).filter(Boolean))].slice(0, 3);
  const years = top.map((a) => parseInt(a.pubYear, 10)).filter(Number.isFinite);
  const yearSpan =
    years.length > 0 ? `${Math.min(...years)}–${Math.max(...years)}` : 'recent years';

  const insights = [
    {
      question: `What evidence base addresses “${topic}”?`,
      answer: `Heuristic mode identified ${articles.length} ranked records. The strongest matches (${top
        .slice(0, 3)
        .map((a) => a.pmid)
        .join(
          ', ',
        )}) share lexical overlap with the topic across title and abstract. Publication window: ${yearSpan}.`,
      supportingArticles: pmids.slice(0, 3),
    },
    {
      question: 'Which study designs appear most often?',
      answer: (() => {
        const counts = new Map<string, number>();
        for (const a of top) {
          const t = a.articleType ?? 'Other';
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
        const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
        return `Among top-ranked articles, designs include: ${
          ranked.map(([k, v]) => `${k} (${v})`).join('; ') || 'unclassified'
        }. Prefer systematic reviews and RCTs when available for clinical questions.`;
      })(),
      supportingArticles: pmids,
    },
    {
      question: 'Where are the literature gaps?',
      answer: `Heuristic synthesis notes limited multi-source triangulation (local ranking only). Journals represented: ${
        journals.join(', ') || 'n/a'
      }. Consider expanding date range, synonyms, or MeSH terms for a fuller live Gemini pass when an API key is available.`,
      supportingArticles: pmids.slice(0, 2),
    },
  ];

  if (top[0]) {
    insights.push({
      question: `Why is “${top[0].title.slice(0, 80)}” highly ranked?`,
      answer: top[0].relevanceExplanation,
      supportingArticles: [top[0].pmid],
    });
  }

  return insights;
}

/** Re-export token helper for tests. */
export { meaningfulTokens };
