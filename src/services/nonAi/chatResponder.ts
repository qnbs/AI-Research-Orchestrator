/**
 * Chat responder for the Non-AI Programmatic Research Engine.
 * Answers questions grounded in the supplied report using template matching.
 * Replaced with `services/heuristics/chat.ts`'s versions during the
 * nonAi/heuristics consolidation (ADR 0009) - these match the real
 * `geminiService.ts` call-site names/signatures, and `createHeuristicChatSession`
 * (the actual chat-session factory `startChatWithReport` needs) had no nonAi
 * equivalent at all.
 */

import type { OnlineFindings, ResearchAnalysis, ResearchReport } from '../../types';
import type { ReportChatSession } from './types';
import { HEURISTIC_BADGE } from './types';
import { extractKeywordsFromText } from './keywordExtractor';
import { generateHeuristicTldr, extractKeySentences } from './synthesizer';
import { tokenize, jaccardSimilarity } from './utils';

/**
 * Research-assistant style analysis without a live AI provider.
 */
export function generateResearchAnalysisHeuristic(query: string): ResearchAnalysis {
  const tldr = generateHeuristicTldr(query);
  const keys = extractKeySentences(query, 4);
  const keywords = extractKeywordsFromText(query, 6);
  return {
    summary: `${HEURISTIC_BADGE}: ${tldr}`,
    keyFindings: keys.length
      ? keys.map((s, i) => `${i + 1}. ${s}`)
      : keywords.map((k) => `Topic signal: ${k}`),
    synthesizedTopic: keywords.slice(0, 5).join(' ') || query.slice(0, 120),
  };
}

/**
 * Offline "related online" stub — honest about lacking live web search.
 */
export function findRelatedOnlineHeuristic(topic: string): OnlineFindings {
  return {
    summary: `${HEURISTIC_BADGE}: Live web / news grounding requires a live provider with search grounding. Offline tip: search your Knowledge Base and PubMed (when online) for "${topic.slice(0, 80)}".`,
    sources: [],
  };
}

/**
 * Template chat grounded strictly in the supplied report.
 */
export function answerFromReport(report: ResearchReport, question: string): string {
  const q = question.trim();
  if (!q) {
    return `${HEURISTIC_BADGE}: Please ask a question about the current report.`;
  }

  const qTokens = tokenize(q, 'en');
  const lower = q.toLowerCase();

  if (/^(hi|hello|hey|thanks|thank you)\b/.test(lower)) {
    return `${HEURISTIC_BADGE}: Hello — I can answer questions using only this report's synthesis, ranked articles, and insights.`;
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

  const synthesisHit = jaccardSimilarity(qTokens, tokenize(report.synthesis ?? '', 'en'));
  const wantsSummary = /summary|tldr|overview|synthesis|conclude|conclusion/.test(lower);
  const wantsKeywords = /keyword|theme|topic/.test(lower);
  const requestedPmid = q.match(/\b(?:pmid[:\s#]*)?(\d{5,9}|demo:[a-z0-9:-]+)\b/i)?.[1];

  if (requestedPmid) {
    const hit = (report.rankedArticles ?? []).find(
      (a) => a.pmid.toLowerCase() === requestedPmid.toLowerCase(),
    );
    if (hit) {
      return `${HEURISTIC_BADGE}\n\n**${hit.title}** (PMID ${hit.pmid}, score ${hit.relevanceScore}/100)\n\n${(hit.aiSummary || hit.summary || '').slice(0, 700)}`;
    }
    return `${HEURISTIC_BADGE}: PMID ${requestedPmid} is not in this report's ranked articles. Ask for the top list or a PMID shown in the panel.`;
  }

  const wantsList = /list|articles|papers|top\b/.test(lower) && !/pmid/i.test(lower);

  if (wantsKeywords && report.overallKeywords?.length) {
    return `${HEURISTIC_BADGE}\n\nOverall keywords: ${report.overallKeywords
      .map((k) => `${k.keyword} (${k.frequency})`)
      .join(', ')}.`;
  }

  if (wantsList && report.rankedArticles?.length) {
    return `${HEURISTIC_BADGE}\n\nTop ranked articles:\n${report.rankedArticles
      .slice(0, 8)
      .map((a, i) => `${i + 1}. ${a.pmid} — ${a.title} (${a.relevanceScore})`)
      .join('\n')}`;
  }

  if (wantsSummary || synthesisHit >= 0.08) {
    const synth = (report.synthesis ?? '').slice(0, 1200);
    return `${HEURISTIC_BADGE}\n\nFrom the report synthesis:\n\n${synth || 'No synthesis text available.'}`;
  }

  if (bestInsight && bestInsight.score >= 0.06) {
    return `${HEURISTIC_BADGE}\n\n${bestInsight.text}`;
  }

  if (bestArticle && bestArticle.score >= 0.05) {
    return `${HEURISTIC_BADGE}\n\nClosest article in this report:\n\n${bestArticle.text}`;
  }

  // Refuse inventing external knowledge
  const tokens = tokenize(q, 'en');
  return `${HEURISTIC_BADGE}: I could not ground "${q.slice(0, 120)}" in this report's synthesis or ranked articles${
    tokens.length ? ` (tokens: ${tokens.slice(0, 5).join(', ')})` : ''
  }. Ask about the synthesis, keywords, a PMID, or an insight from the panel — I will not invent external literature.`;
}

/**
 * Chat adapter with a Gemini-compatible `sendMessageStream` for `useChat`.
 */
export function createHeuristicChatSession(report: ResearchReport): ReportChatSession {
  return {
    async sendMessageStream({ message }) {
      const answer = answerFromReport(report, message);
      return (async function* () {
        const size = 40;
        for (let i = 0; i < answer.length; i += size) {
          yield { text: answer.slice(i, i + size) };
          await Promise.resolve();
        }
      })();
    },
  };
}
