/**
 * Synthesizer for the Non-AI Programmatic Research Engine.
 * Extractive TL;DR and template-based narrative generation.
 */

import type { RankedArticle, ResearchReport } from '../../types';
import type { ExtractiveSynthesis, NarrativeSection } from './types';
import { tokenize, jaccardSimilarity } from './utils';

/**
 * Generate extractive TL;DR from top articles.
 * Uses sentence centrality and query overlap heuristics.
 */
export function generateExtractiveTldr(
  articles: RankedArticle[],
  query: string,
  maxSentences: number = 5,
): ExtractiveSynthesis {
  const queryTokens = tokenize(query, 'en');
  const sentences: Array<{
    pmid: string;
    sentence: string;
    score: number;
  }> = [];

  // Extract sentences from abstracts
  for (const article of articles.slice(0, 10)) {
    if (!article.summary) continue;

    const articleSentences = article.summary
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 300);

    for (const sentence of articleSentences) {
      const sentenceTokens = tokenize(sentence, 'en');
      const overlap = jaccardSimilarity(queryTokens, sentenceTokens);
      const positionScore = sentence.length > 50 ? 1 : 0.5; // Prefer longer sentences

      sentences.push({
        pmid: article.pmid,
        sentence,
        score: overlap * 0.7 + positionScore * 0.3,
      });
    }
  }

  // Sort by score and take top sentences
  const topSentences = sentences.sort((a, b) => b.score - a.score).slice(0, maxSentences);

  const tldr = topSentences.map((s) => s.sentence).join(' ');

  return {
    tldr,
    keyFindings: topSentences,
    synthesisMode: 'extractive-template',
  };
}

/**
 * Generate narrative sections using templates.
 */
export function generateNarrativeSections(
  articles: RankedArticle[],
  query: string,
): NarrativeSection[] {
  const sections: NarrativeSection[] = [];

  // Background section
  const backgroundPmids = articles.slice(0, 3).map((a) => a.pmid);
  sections.push({
    title: 'Background',
    content:
      `This report synthesizes literature on "${query}" using PubMed and arXiv sources. ` +
      `The search identified ${articles.length} relevant articles published between ` +
      `${getYearRange(articles)}.`,
    pmids: backgroundPmids,
  });

  // Key Findings section
  const findingsPmids = articles.slice(0, 5).map((a) => a.pmid);
  const findingsContent = articles
    .slice(0, 5)
    .map((a) => `• ${a.title} (${a.pubYear}) [PMID: ${a.pmid}]`)
    .join('\n');
  sections.push({
    title: 'Key Findings',
    content: findingsContent,
    pmids: findingsPmids,
  });

  // Methods Overview section
  const methodsPmids = articles
    .filter(
      (a) =>
        (a.articleType?.toLowerCase().includes('randomized') ?? false) ||
        (a.articleType?.toLowerCase().includes('trial') ?? false) ||
        (a.articleType?.toLowerCase().includes('systematic') ?? false) ||
        (a.articleType?.toLowerCase().includes('meta-analysis') ?? false),
    )
    .slice(0, 3)
    .map((a) => a.pmid);
  sections.push({
    title: 'Methods Overview',
    content:
      methodsPmids.length > 0
        ? `Clinical trials and systematic reviews identified in the corpus include ` +
          `${methodsPmids.length} studies with rigorous methodology.`
        : `The corpus includes observational and experimental studies.`,
    pmids: methodsPmids,
  });

  // Conclusion section
  const conclusionPmids = articles.slice(0, 2).map((a) => a.pmid);
  sections.push({
    title: 'Conclusion',
    content:
      `The evidence base for "${query}" continues to evolve. ` +
      `Further research is needed to address gaps identified in this synthesis.`,
    pmids: conclusionPmids,
  });

  return sections;
}

/**
 * Get year range from articles.
 */
function getYearRange(articles: RankedArticle[]): string {
  const years = articles.map((a) => parseInt(a.pubYear, 10)).filter((y) => !isNaN(y));

  if (years.length === 0) return 'unknown years';

  const min = Math.min(...years);
  const max = Math.max(...years);

  return min === max ? String(min) : `${min}–${max}`;
}

/**
 * Generate a complete research report from curated articles.
 */
export function generateResearchReport(articles: RankedArticle[], query: string): ResearchReport {
  const synthesis = generateExtractiveTldr(articles, query);
  const sections = generateNarrativeSections(articles, query);

  // Build synthesis markdown
  const synthesisMarkdown = [
    `## TL;DR`,
    ``,
    synthesis.tldr,
    ``,
    ...sections.map((s) => s.content),
  ].join('\n');

  // Generate overall keywords
  const keywordCounts = new Map<string, number>();
  for (const article of articles) {
    for (const kw of article.keywords ?? []) {
      keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1);
    }
  }
  const overallKeywords = Array.from(keywordCounts.entries())
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // Generate insights
  const aiGeneratedInsights = generateInsights(articles, query);

  return {
    generatedQueries: [{ query, explanation: 'Non-AI MeSH-based query construction' }],
    rankedArticles: articles,
    synthesis: synthesisMarkdown,
    aiGeneratedInsights,
    overallKeywords,
  };
}

/**
 * Generate heuristic insights from articles.
 */
function generateInsights(
  articles: RankedArticle[],
  query: string,
): { question: string; answer: string; supportingArticles: string[] }[] {
  const insights: { question: string; answer: string; supportingArticles: string[] }[] = [];

  // Insight 1: Most cited/high-scoring articles
  const topArticles = articles.slice(0, 3);
  if (topArticles.length > 0) {
    insights.push({
      question: `What are the highest-scoring articles for "${query}"?`,
      answer: topArticles.map((a) => `${a.title} (PMID: ${a.pmid})`).join('; '),
      supportingArticles: topArticles.map((a) => a.pmid),
    });
  }

  // Insight 2: Open access availability
  const oaArticles = articles.filter((a) => a.isOpenAccess);
  const oaPercentage =
    articles.length > 0 ? Math.round((oaArticles.length / articles.length) * 100) : 0;
  insights.push({
    question: 'What proportion of articles are open access?',
    answer: `${oaArticles.length} of ${articles.length} articles (${oaPercentage}%) are open access.`,
    supportingArticles: oaArticles.slice(0, 5).map((a) => a.pmid),
  });

  // Insight 3: Publication types
  const typeCounts = new Map<string, number>();
  for (const a of articles) {
    const type = a.articleType ?? 'Unknown';
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }
  const types = [...typeCounts.entries()].map(([t, c]) => `${t} (${c})`).join(', ');
  insights.push({
    question: 'What study designs are represented?',
    answer: types || 'No study types identified.',
    supportingArticles: articles.slice(0, 3).map((a) => a.pmid),
  });

  return insights;
}
