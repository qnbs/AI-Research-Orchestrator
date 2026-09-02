import type {
  ResearchInput,
  ResearchReport,
  Settings,
  RankedArticle,
  SimilarArticle,
  OnlineFindings,
  WebContent,
  ResearchAnalysis,
} from '../types';
import { getNcbiApiKey } from './apiKeyService';
import { getProviderForSettings, resetProviderInstances } from './providers/factory';
import type { AIJsonSchema } from './providers/types';
import { searchPubMedForIds, fetchArticleDetails } from './pubmedUtils';
import { sanitizePromptFragment } from '../lib/promptSanitize';
import { resolveApprovedBaseUrl } from '../lib/endpointPolicy';
import {
  withUntrustedDataSystemRule,
  wrapUntrustedJsonBlock,
  wrapUntrustedTextBlock,
} from '../lib/untrustedDataFraming';
import { AppError, toAppError, isAbortError, throwIfAborted } from '../lib/errors';
import { PromptId, promptTag } from '../lib/promptRegistry';
import {
  findSimilarArticlesHeuristic,
  findRelatedOnlineHeuristic,
  generateHeuristicTldr,
  generateResearchAnalysisHeuristic,
  analyzeArticleHeuristic,
  createHeuristicChatSession,
  DEMO_CORPUS,
  resolveHeuristicArticleByPmid,
  type ReportChatSession,
} from './nonAi';
import {
  generateResearchReportStreamWithMode,
  shouldUseHeuristic,
} from './researchOrchestratorAdapter';
import { safeLogError } from '../lib/safeLog';
import { generateJson, getPreamble } from './aiJson';
import { generateLiveResearchReportStream } from './liveResearchReportStream';

export { parseGeminiResponseJson } from './aiJson';
export {
  generateAuthorQuery,
  disambiguateAuthor,
  generateAuthorProfileAnalysis,
  suggestAuthors,
  generateJournalProfileAnalysis,
  disambiguateJournal,
  suggestJournals,
} from './literatureAiTools';

/**
 * Resets cached provider instances (call when API key / provider settings change).
 * Kept for backward compatibility with existing tests.
 */
export function resetAIInstance(): void {
  resetProviderInstances();
}

/**
 * Multi-phase PubMed/arXiv literature orchestrator (AsyncGenerator).
 * Yields progress `phase` strings, optional `synthesisChunk` tokens, and a final `report`.
 * Abort via `signal` throws `AppError` with code `STREAM_ABORTED`.
 * Live vs heuristic switching lives in `researchOrchestratorAdapter` (ADR 0007).
 */
export async function* generateResearchReportStream(
  input: ResearchInput,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
) {
  yield* generateResearchReportStreamWithMode(
    input,
    aiSettings,
    generateLiveResearchReportStream,
    signal,
  );
}

export async function findSimilarArticles(
  article: { title: string; summary: string },
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<SimilarArticle[]> {
  if (await shouldUseHeuristic(aiSettings)) {
    throwIfAborted(signal);
    return findSimilarArticlesHeuristic(article, DEMO_CORPUS, 5, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const ncbiApiKey = (await getNcbiApiKey()) ?? undefined;
  try {
    const similarSchema: AIJsonSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pmid: { type: 'string' },
          title: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['pmid', 'title', 'reason'],
      },
    };
    const results = await generateJson<SimilarArticle[]>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.SIMILAR_ARTICLES),
        temperature: 0.3,
        jsonSchema: similarSchema,
        prompt: `Based on the following article, find 3-5 similar articles on PubMed. For each, provide the PMID, title, and a brief reason for its relevance. Only return PMIDs that exist on PubMed.
            ${wrapUntrustedJsonBlock('source_article', { title: article.title, summary: article.summary })}`,
      },
      signal,
    );
    throwIfAborted(signal);
    const pmids = results.map((r) => r.pmid).filter(Boolean);
    if (pmids.length === 0) return [];
    const details = await fetchArticleDetails(pmids, signal, ncbiApiKey);
    const valid = new Set(details.map((d) => d.pmid));
    return results.filter((r) => valid.has(r.pmid));
  } catch (error) {
    if (signal?.aborted) {
      throw new AppError({
        code: 'STREAM_ABORTED',
        message: 'Aborted',
        retryable: false,
        cause: error,
      });
    }
    if (error instanceof AppError) throw error;
    safeLogError('Error finding similar articles:', error);
    throw provider.mapError(error);
  }
}

export async function findRelatedOnline(
  topic: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<OnlineFindings> {
  if (await shouldUseHeuristic(aiSettings)) {
    throwIfAborted(signal);
    return findRelatedOnlineHeuristic(topic);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const topicSafe = sanitizePromptFragment(topic);
  try {
    if (!provider.capabilities.webGrounding) {
      return findRelatedOnlineHeuristic(topic);
    }
    const response = await provider.generateContent({
      model: aiSettings.model,
      system: getPreamble(aiSettings, PromptId.RELATED_ONLINE),
      prompt: `Provide a brief summary of the online discussion, news, or recent developments related to ${wrapUntrustedTextBlock('topic', topicSafe)}.`,
      webGrounding: true,
      baseURL: resolveApprovedBaseUrl(aiSettings.customBaseUrl, aiSettings.approvedEndpointOrigin),
      signal,
    });
    const sources: WebContent[] = (response.sources ?? []).map((s) => ({
      uri: s.uri,
      title: s.title ?? '',
    }));
    return { summary: response.text ?? '', sources };
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw new AppError({
        code: 'STREAM_ABORTED',
        message: 'Aborted',
        retryable: false,
        cause: error,
      });
    }
    safeLogError('Error finding related online content:', error);
    throw provider.mapError(error);
  }
}

export async function generateTldrSummary(
  abstract: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<string> {
  if (await shouldUseHeuristic(aiSettings)) {
    throwIfAborted(signal);
    return generateHeuristicTldr(abstract);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const abstractSafe = sanitizePromptFragment(abstract, 12000);
  try {
    const response = await provider.generateContent({
      model: aiSettings.model,
      system: getPreamble(aiSettings, PromptId.TLDR),
      temperature: 0,
      prompt: `Summarize the following abstract in a single, concise sentence (TL;DR format): ${wrapUntrustedTextBlock('abstract', abstractSafe)}`,
      baseURL: resolveApprovedBaseUrl(aiSettings.customBaseUrl, aiSettings.approvedEndpointOrigin),
      signal,
    });
    return response.text ?? '';
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw new AppError({
        code: 'STREAM_ABORTED',
        message: 'Aborted',
        retryable: false,
        cause: error,
      });
    }
    safeLogError('Error generating TL;DR summary:', error);
    throw provider.mapError(error);
  }
}

export async function generateResearchAnalysis(
  query: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<ResearchAnalysis> {
  if (await shouldUseHeuristic(aiSettings)) {
    throwIfAborted(signal);
    return generateResearchAnalysisHeuristic(query);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const querySafe = sanitizePromptFragment(query, 12000);
  try {
    const analysisSchema: AIJsonSchema = {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        keyFindings: { type: 'array', items: { type: 'string' } },
        synthesizedTopic: { type: 'string' },
      },
      required: ['summary', 'keyFindings', 'synthesizedTopic'],
    };
    return await generateJson<ResearchAnalysis>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.RESEARCH_ANALYSIS),
        temperature: 0.2,
        jsonSchema: analysisSchema,
        prompt: `Analyze the following text. Provide a concise summary, a bulleted list of 3-5 key findings, and synthesize a clear, specific research topic suitable for a PubMed search.
            ${wrapUntrustedTextBlock('input_text', querySafe)}`,
      },
      signal,
    );
  } catch (error) {
    safeLogError('Error generating research analysis:', error);
    throw provider.mapError(error);
  }
}
/** Parses `value` as an absolute URL, or null (bare PMIDs/DOIs are not URLs). */
function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export async function analyzeSingleArticle(
  identifier: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<RankedArticle> {
  const useHeuristic = await shouldUseHeuristic(aiSettings);
  throwIfAborted(signal);
  const ncbiApiKey = (await getNcbiApiKey()) ?? undefined;
  throwIfAborted(signal);
  try {
    let pmid = identifier.trim();
    // Basic identifier extraction — hostname is checked exactly (not via substring
    // matching) so e.g. `evil.example/doi.org/` can't be misclassified as a DOI link,
    // and the PMID is parsed from `pathname` (not the raw URL) so a query string or
    // fragment (`?format=pubmed`, `#comments`) can't hide the trailing digits.
    const parsedUrl = tryParseUrl(pmid);
    if (parsedUrl?.hostname === 'pubmed.ncbi.nlm.nih.gov') {
      const match = parsedUrl.pathname.match(/(\d+)\/?$/);
      if (match) pmid = match[1];
    } else if (parsedUrl?.hostname === 'doi.org' || parsedUrl?.hostname === 'dx.doi.org') {
      const ids = await searchPubMedForIds(identifier, 1, signal, ncbiApiKey);
      if (ids.length > 0) pmid = ids[0];
      else {
        throw new AppError({
          code: 'VALIDATION',
          message: 'DOI not found in PubMed.',
          retryable: false,
          context: 'article_analysis',
        });
      }
    }

    let articleData: Partial<RankedArticle> & {
      pmid: string;
      title: string;
      summary: string;
      authors: string;
      journal: string;
      pubYear: string;
      isOpenAccess?: boolean;
    };

    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (isOnline) {
      try {
        const articleDetails = await fetchArticleDetails([pmid], signal, ncbiApiKey);
        if (articleDetails?.length) {
          articleData = articleDetails[0] as typeof articleData;
        } else if (!useHeuristic) {
          throw new AppError({
            code: 'NCBI_NETWORK',
            message: 'Could not fetch article details from PubMed. Please check the identifier.',
            retryable: true,
            context: 'article_analysis',
          });
        } else {
          articleData = resolveHeuristicArticleByPmid(pmid);
        }
      } catch (err) {
        if (isAbortError(err) || (err instanceof AppError && err.code === 'STREAM_ABORTED')) {
          throw err;
        }
        // In heuristic mode, recover from PubMed/network AppErrors with a local fallback.
        if (useHeuristic) {
          articleData = resolveHeuristicArticleByPmid(pmid);
        } else if (err instanceof AppError) {
          throw err;
        } else {
          throw toAppError(err, 'article_analysis');
        }
      }
    } else if (useHeuristic) {
      articleData = resolveHeuristicArticleByPmid(pmid);
    } else {
      throw new AppError({
        code: 'NCBI_NETWORK',
        message: 'Offline: PubMed article fetch requires a network connection in live mode.',
        retryable: true,
        context: 'article_analysis',
      });
    }

    if (useHeuristic) {
      return analyzeArticleHeuristic(articleData, signal);
    }

    const provider = await getProviderForSettings(aiSettings);
    const prompt = `Analyze the following article abstract and title. Provide a relevance score for how well the abstract matches the title, extract keywords, and classify the article type.
        ${wrapUntrustedJsonBlock('article', { title: articleData.title, abstract: articleData.summary })}
        
        Provide the following in a single JSON object:
        1. relevanceScore: A number from 1-100 of how relevant the abstract is to the title.
        2. relevanceExplanation: A brief (1-2 sentences) explanation for the score.
        3. keywords: An array of 3-5 relevant keywords from the text.
        4. articleType: Classify the article into one of: 'Randomized Controlled Trial', 'Meta-Analysis', 'Systematic Review', 'Observational Study', or 'Other'.`;

    try {
      const analysisSchema: AIJsonSchema = {
        type: 'object',
        properties: {
          relevanceScore: { type: 'integer', description: 'Score from 1 to 100.' },
          relevanceExplanation: {
            type: 'string',
            description: 'Brief explanation for the score.',
          },
          keywords: { type: 'array', items: { type: 'string' } },
          articleType: { type: 'string', description: 'Type of the article.' },
        },
        required: ['relevanceScore', 'relevanceExplanation', 'keywords', 'articleType'],
      };
      const analysis = await generateJson<{
        relevanceScore: number;
        relevanceExplanation: string;
        keywords: string[];
        articleType: string;
      }>(
        aiSettings,
        {
          model: aiSettings.model,
          system: getPreamble(aiSettings, PromptId.ARTICLE_ANALYZE),
          temperature: 0.1,
          jsonSchema: analysisSchema,
          prompt,
        },
        signal,
      );

      return {
        ...articleData,
        ...analysis,
        isOpenAccess: articleData.isOpenAccess ?? false,
      };
    } catch (error) {
      safeLogError('Error analyzing single article:', error);
      throw provider.mapError(error);
    }
  } catch (error) {
    safeLogError('Error analyzing single article:', error);
    throw toAppError(error, 'article_analysis');
  }
}
// --- Chat Service ---
/**
 * Starts a report-grounded chat session (live Gemini or heuristic adapter).
 */
export const startChatWithReport = async (
  report: ResearchReport,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<ReportChatSession> => {
  if (await shouldUseHeuristic(aiSettings)) {
    throwIfAborted(signal);
    return createHeuristicChatSession(report);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const context = withUntrustedDataSystemRule(`
        ${promptTag(PromptId.REPORT_CHAT)}
        You are a helpful AI assistant that answers questions about a specific research report.
        The user has just generated the following report. Your answers should be based on this context.

        ${wrapUntrustedTextBlock('research_synthesis', report.synthesis)}

        ${wrapUntrustedJsonBlock(
          'ranked_articles',
          report.rankedArticles.map((a) => ({
            pmid: a.pmid,
            title: a.title,
            summary: a.summary,
          })),
        )}
    `);

  return provider.createChatSession({
    model: aiSettings.model,
    system: context,
    temperature: aiSettings.temperature * 0.8, // Slightly lower temperature for more factual chat
    baseURL: resolveApprovedBaseUrl(aiSettings.customBaseUrl, aiSettings.approvedEndpointOrigin),
    signal,
  });
};

export type { ReportChatSession };
