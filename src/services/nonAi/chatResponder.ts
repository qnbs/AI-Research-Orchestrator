/**
 * Chat responder for the Non-AI Programmatic Research Engine.
 * Answers questions grounded in the supplied report using template matching.
 */

import type { ResearchReport, ResearchAnalysis, OnlineFindings } from '../../types';
import { tokenize, jaccardSimilarity } from './utils';

/**
 * Generate research analysis without AI.
 */
export function generateResearchAnalysis(
  query: string,
  articles: { title: string; summary: string; keywords?: string[] }[],
): ResearchAnalysis {
  const tldr = generateExtractiveTldr(query, articles);
  const keywords = extractKeywordsFromArticles(articles, 6);

  return {
    summary: `Non-AI Analysis: ${tldr}`,
    keyFindings: keywords.map((k) => `Topic signal: ${k}`),
    synthesizedTopic: keywords.slice(0, 5).join(' ') || query.slice(0, 120),
  };
}

/**
 * Generate extractive TL;DR.
 */
function generateExtractiveTldr(
  query: string,
  articles: { title: string; summary: string; keywords?: string[] }[],
): string {
  const queryTokens = tokenize(query, 'en');
  const sentences: Array<{ sentence: string; score: number }> = [];

  for (const article of articles.slice(0, 5)) {
    if (!article.summary) continue;
    const articleSentences = article.summary
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20 && s.length < 300);

    for (const sentence of articleSentences) {
      const sentenceTokens = tokenize(sentence, 'en');
      const overlap = jaccardSimilarity(queryTokens, sentenceTokens);
      if (overlap > 0.1) {
        sentences.push({ sentence, score: overlap });
      }
    }
  }

  return sentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.sentence)
    .join(' ');
}

/**
 * Extract keywords from articles.
 */
function extractKeywordsFromArticles(
  articles: { title: string; summary: string; keywords?: string[] }[],
  limit: number = 8,
): string[] {
  const keywordCounts = new Map<string, number>();

  for (const article of articles) {
    const text = `${article.title} ${article.summary} ${(article.keywords ?? []).join(' ')}`;
    const tokens = tokenize(text, 'en');
    for (const token of tokens) {
      keywordCounts.set(token, (keywordCounts.get(token) ?? 0) + 1);
    }
  }

  return [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

/**
 * Offline "related online" stub — honest about lacking live web search.
 */
export function findRelatedOnline(topic: string): OnlineFindings {
  return {
    summary: `Non-AI mode: Live web / news grounding requires Gemini with Google Search. Offline tip: search your Knowledge Base and PubMed (when online) for "${topic.slice(0, 80)}".`,
    sources: [],
  };
}

/**
 * Answer a question using only the report content.
 */
export function answerFromReport(report: ResearchReport, question: string): string {
  const q = question.trim();
  if (!q) {
    return 'Non-AI mode: Please ask a question about the current report.';
  }

  const qTokens = tokenize(q, 'en');
  const lower = q.toLowerCase();

  if (/^(hi|hello|hey|thanks|thank you)\b/.test(lower)) {
    return "Non-AI mode: Hello — I can answer questions using only this report's synthesis, ranked articles, and insights.";
  }

  // Match insights
  let bestInsight: { score: number; text: string } | null = null;
  for (const insight of report.aiGeneratedInsights ?? []) {
    const blob = `${insight.question} ${insight.answer}`;
    const score = jaccardSimilarity(qTokens, tokenize(blob, 'en'));
    if (!bestInsight || score > bestInsight.score) {
      bestInsight = {
        score,
        text: `**${insight.question}**\n\n${insight.answer}\n\nSupporting PMIDs: ${(insight.supportingArticles ?? []).join(', ') || 'n/a'}`,
      };
    }
  }

  // Match articles
  let bestArticle: { score: number; text: string } | null = null;
  for (const a of report.rankedArticles ?? []) {
    const blob = `${a.title} ${a.summary} ${a.aiSummary ?? ''} ${(a.keywords ?? []).join(' ')}`;
    const score = jaccardSimilarity(qTokens, tokenize(blob, 'en'));
    if (!bestArticle || score > bestArticle.score) {
      bestArticle = {
        score,
        text: `**${a.title}** (PMID ${a.pmid}, score ${a.relevanceScore}/100)\n\n${(a.aiSummary || a.summary || '').slice(0, 500)}`,
      };
    }
  }

  const wantsSummary = /summary|tldr|overview|synthesis|conclude|conclusion/.test(lower);
  const wantsKeywords = /keyword|theme|topic/.test(lower);
  const requestedPmid = q.match(/\b(?:pmid[:\s#]*)?(\d{5,9}|demo:[a-z0-9:-]+)\b/i)?.[1];

  if (requestedPmid) {
    const hit = (report.rankedArticles ?? []).find(
      (a) => a.pmid.toLowerCase() === requestedPmid.toLowerCase(),
    );
    if (hit) {
      return `**${hit.title}** (PMID ${hit.pmid}, score ${hit.relevanceScore}/100)\n\n${(hit.aiSummary || hit.summary || '').slice(0, 700)}`;
    }
    return `Non-AI mode: PMID ${requestedPmid} is not in this report's ranked articles. Ask for the top list or a PMID shown in the panel.`;
  }

  const wantsList = /list|articles|papers|top\b/.test(lower) && !/pmid/i.test(lower);

  if (wantsKeywords && report.overallKeywords?.length) {
    return `Overall keywords: ${report.overallKeywords
      .map((k) => `${k.keyword} (${k.frequency})`)
      .join(', ')}.`;
  }

  if (wantsList && report.rankedArticles?.length) {
    return `Top ranked articles:\n${report.rankedArticles
      .slice(0, 10)
      .map((a, i) => `${i + 1}. ${a.title} (PMID ${a.pmid})`)
      .join('\n')}`;
  }

  if (wantsSummary && report.synthesis) {
    return report.synthesis.slice(0, 800);
  }

  // Return best match
  if (bestInsight && bestInsight.score > 0.1) {
    return bestInsight.text;
  }
  if (bestArticle && bestArticle.score > 0.05) {
    return bestArticle.text;
  }

  return 'Non-AI mode: I could not find a confident match in this report. Try asking about the top articles, keywords, or a specific PMID.';
}
