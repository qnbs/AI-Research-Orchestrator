import type {
  ResearchInput,
  ResearchReport,
  Settings,
  RankedArticle,
  SimilarArticle,
  OnlineFindings,
  WebContent,
  ResearchAnalysis,
  GeneratedQuery,
  AuthorCluster,
  JournalProfile,
  JournalCandidate,
} from '../types';
import { getNcbiApiKey } from './apiKeyService';
import { defaultGeminiThinkingBudget } from './providers/provider';
import { getProviderForSettings, resetProviderInstances } from './providers/factory';
import type { AIContentRequest, AIJsonSchema } from './providers/types';
import { probeOllamaHealth } from './providers/ollamaHealth';
import { searchPubMedForIds, fetchArticleDetails } from './pubmedUtils';
import { searchAndFetchArxiv } from './arxivUtils';
import { sanitizePromptFragment } from '../lib/promptSanitize';
import { resolveApprovedBaseUrl } from '../lib/endpointPolicy';
import { applyCorpusCitationGrounding } from '../lib/citationGrounding';
import { intersectClustersWithCorpus } from '../lib/authorIdentity';
import { assertValidPubMedQuery } from '../lib/pubmedQueryValidator';
import {
  UNTRUSTED_DATA_SYSTEM_RULE,
  withUntrustedDataSystemRule,
  wrapUntrustedJsonBlock,
  wrapUntrustedTextBlock,
} from '../lib/untrustedDataFraming';
import {
  selectArticlesForRankingPrompt,
  selectArticlesForSynthesisPrompt,
} from '../lib/promptBudget';
import { makePipelineEvent, type ResearchStreamEvent } from '../types/pipelineEvents';
import {
  parseGeminiResponseJson as parseGeminiJsonCore,
  GeminiJsonParseError,
} from '../lib/parseGeminiJson';
import { AppError, toAppError, isAbortError, throwIfAborted } from '../lib/errors';
import { PromptId, promptTag, type PromptIdValue } from '../lib/promptRegistry';
import {
  findSimilarArticlesHeuristic,
  findRelatedOnlineHeuristic,
  generateHeuristicTldr,
  generateResearchAnalysisHeuristic,
  disambiguateAuthorHeuristic,
  generateAuthorProfileHeuristic,
  suggestAuthorsHeuristic,
  analyzeArticleHeuristic,
  generateJournalProfileHeuristic,
  disambiguateJournalHeuristic,
  suggestJournalsHeuristic,
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

/**
 * Resets cached provider instances (call when API key / provider settings change).
 * Kept for backward compatibility with existing tests.
 */
export function resetAIInstance(): void {
  resetProviderInstances();
}

/** Helper to call a single-shot provider generation with JSON parsing. */
async function generateJson<T>(
  aiSettings: Settings['ai'],
  request: Omit<AIContentRequest, 'json'>,
  signal?: AbortSignal,
): Promise<T> {
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const baseURL = resolveApprovedBaseUrl(
    aiSettings.customBaseUrl,
    aiSettings.approvedEndpointOrigin,
  );
  const caps = provider.capabilities.structuredOutput;
  const schema = request.jsonSchema;
  let prompt = request.prompt;
  const system = request.system
    ? withUntrustedDataSystemRule(request.system)
    : UNTRUSTED_DATA_SYSTEM_RULE;

  if (schema && !caps.nativeJsonSchema && caps.jsonObjectMode) {
    prompt = `${prompt}\n\nRespond with valid JSON matching this schema:\n${JSON.stringify(schema)}`;
  }

  const schemaRootIsArray = schema?.type === 'array';
  const useJsonObjectMode = caps.jsonObjectMode && !schemaRootIsArray;
  const useStructuredJson = useJsonObjectMode || caps.nativeJsonSchema;

  if (schema && !caps.nativeJsonSchema && !caps.jsonObjectMode) {
    throw new AppError({
      code: 'VALIDATION',
      message: 'Selected provider does not support structured JSON output for this request.',
      retryable: false,
    });
  }

  try {
    const response = await provider.generateContent({
      ...request,
      system,
      prompt,
      json: useStructuredJson,
      jsonSchema: caps.nativeJsonSchema ? schema : undefined,
      baseURL,
      signal,
    });
    return parseGeminiResponseJson<T>(response.text);
  } catch (error) {
    safeLogError('Error generating content:', error);
    throw provider.mapError(error);
  }
}

/**
 * Robustly extracts JSON from AI response text.
 * Handles Markdown code blocks, raw JSON, and surrounding chatter.
 * Exported for unit tests and reuse — delegates to string-aware parser.
 */
export function parseGeminiResponseJson<T>(text: string): T {
  try {
    return parseGeminiJsonCore<T>(text);
  } catch (error) {
    if (error instanceof GeminiJsonParseError) {
      throw new AppError({
        code: 'GEMINI_PARSE_FAILURE',
        message: error.message,
        retryable: true,
        cause: error,
      });
    }
    throw error;
  }
}

export const generateAuthorQuery = (fullName: string): string => {
  if (fullName.includes(',')) {
    const parts = fullName.split(',');
    const lastName = parts[0].trim();
    const firstAndMiddle = parts.slice(1).join(' ').trim();
    fullName = `${firstAndMiddle} ${lastName}`;
  }

  const cleanedName = fullName.replace(/\./g, '');
  const parts = cleanedName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return `""[Author]`;
  if (parts.length === 1) return `"${parts[0]}"[Author]`;

  const lastName = parts[parts.length - 1];
  const firstParts = parts.slice(0, -1);
  const firstName = firstParts[0];
  const initials = firstParts.map((p) => p.charAt(0)).join('');

  const queryVariations = new Set<string>();
  queryVariations.add(`"${firstParts.join(' ')} ${lastName}"[Author]`);
  queryVariations.add(`"${lastName} ${initials}"[Author]`);
  queryVariations.add(`"${lastName} ${firstName}"[Author]`);

  return `(${Array.from(queryVariations).join(' OR ')})`;
};

const getPreamble = (
  aiSettings: Settings['ai'],
  promptId: PromptIdValue = PromptId.ORCHESTRATOR_SYSTEM,
) => {
  const languagePreamble = `Your response must be in ${aiSettings.aiLanguage}.`;
  const personaPreamble = {
    'Neutral Scientist': 'Adopt a neutral, objective, and strictly scientific tone.',
    'Concise Expert':
      'Be brief and to the point. Focus on delivering the most critical information without verbosity.',
    'Detailed Analyst':
      'Provide in-depth analysis. Explore nuances, methodologies, and potential implications thoroughly.',
    'Creative Synthesizer':
      'Identify and highlight novel connections, cross-disciplinary links, and innovative perspectives found in the literature.',
  }[aiSettings.aiPersona];

  return `${promptTag(promptId)} ${languagePreamble} ${personaPreamble} ${aiSettings.customPreamble || ''}`.trim();
};

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

async function* generateLiveResearchReportStream(
  input: ResearchInput,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): AsyncGenerator<ResearchStreamEvent> {
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const ncbiApiKey = (await getNcbiApiKey()) ?? undefined;
  throwIfAborted(signal);
  const topicSafe = sanitizePromptFragment(input.researchTopic);
  const focusSafe = sanitizePromptFragment(input.synthesisFocus);
  try {
    const systemInstruction = `${getPreamble(aiSettings, PromptId.ORCHESTRATOR_SYSTEM)} You are an expert AI research assistant. Your goal is to conduct a literature review on PubMed${input.includeArxiv ? ' and arXiv' : ''} based on the user's criteria, rank the articles, and synthesize the findings. Article identifiers from arXiv begin with "arxiv:" — treat them exactly like PubMed PMIDs. AI-generated summaries (aiSummary) are derived interpretations — never treat them as original abstracts.`;

    const buildQueryGenPrompt = (input: ResearchInput): string => {
      let filterInstructions = '';
      if (input.dateRange !== 'any') {
        const startYear = new Date().getFullYear() - parseInt(input.dateRange, 10);
        filterInstructions += `\n- The articles must be published between ${startYear} and the present day (use ("YYYY/MM/DD"[Date - Publication] : "3000/12/31"[Date - Publication]) syntax).`;
      }

      if (input.articleTypes.length > 0) {
        const typesList = input.articleTypes.map((t) => `"${t}"[Publication Type]`).join(' OR ');
        filterInstructions += `\n- The articles must match the filter: (${typesList}).`;
      }

      return `Based on the user's research topic, generate a single, complete, and advanced PubMed search query.
- Use PubMed-specific syntax like MeSH terms ([MeSH]), field tags ([Title/Abstract]), and boolean operators (AND, OR, NOT) to create a precise query for the topic.
- The query MUST incorporate the following filters by using the AND operator: ${filterInstructions ? filterInstructions : 'No additional filters required.'}
- Ensure the main topic part of the query is enclosed in parentheses if it contains OR operators, before you AND the filters.
- For example, for the topic "effects of aspirin on heart attack" with a filter for "Randomized Controlled Trial", a good query would be: (("aspirin"[MeSH Terms] OR "aspirin"[Title/Abstract]) AND ("myocardial infarction"[MeSH Terms] OR "heart attack"[Title/Abstract])) AND ("Randomized Controlled Trial"[Publication Type])

Research Topic: ${wrapUntrustedTextBlock('research_topic', topicSafe)}
`;
    };

    const queryGenSchema: AIJsonSchema = {
      type: 'object',
      properties: {
        generatedQueries: {
          type: 'array',
          items: {
            type: 'object',
            properties: { query: { type: 'string' }, explanation: { type: 'string' } },
            required: ['query', 'explanation'],
          },
        },
      },
      required: ['generatedQueries'],
    };

    // STEP 1: Generate Search Queries
    yield makePipelineEvent('query-generation');
    throwIfAborted(signal);
    const { generatedQueries } = await generateJson<{ generatedQueries: GeneratedQuery[] }>(
      aiSettings,
      {
        model: aiSettings.model,
        system: systemInstruction,
        temperature: 0.1,
        jsonSchema: queryGenSchema,
        prompt: buildQueryGenPrompt(input),
      },
      signal,
    );
    if (!generatedQueries || generatedQueries.length === 0 || !generatedQueries[0].query) {
      throw new Error('The AI failed to generate any search queries.');
    }
    assertValidPubMedQuery(generatedQueries[0].query);

    throwIfAborted(signal);
    // STEP 2: Execute Real PubMed Search
    yield makePipelineEvent('pubmed-search');
    const pmids = await searchPubMedForIds(
      generatedQueries[0].query,
      input.maxArticlesToScan,
      signal,
      ncbiApiKey,
    );
    if (pmids.length === 0) {
      throw new Error(
        'Your search returned no results from PubMed. This can be due to a very specific topic or strict filters. Try broadening your topic, adjusting the date range, or changing article types.',
      );
    }

    throwIfAborted(signal);
    // STEP 3: Fetch Real Article Details
    yield makePipelineEvent('pubmed-fetch');
    const articleDetails = await fetchArticleDetails(pmids, signal, ncbiApiKey);
    if (articleDetails.length === 0) {
      throw new Error('Could not fetch details for the articles found on PubMed.');
    }

    throwIfAborted(signal);
    // STEP 3b: Fetch arXiv Preprints (if enabled, non-blocking)
    if (input.includeArxiv) {
      yield makePipelineEvent('arxiv-fetch');
      const arxivMax = Math.min(Math.floor(input.maxArticlesToScan / 2), 15);
      const arxivResults = await searchAndFetchArxiv(topicSafe, arxivMax, signal);
      if (arxivResults.length > 0) {
        articleDetails.push(...arxivResults);
      }
    }

    throwIfAborted(signal);
    // STEP 4: AI Analyzes and Ranks Real Data

    const rankingSchema: AIJsonSchema = {
      type: 'object',
      properties: {
        rankedArticles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pmid: { type: 'string' },
              relevanceScore: { type: 'integer' },
              relevanceExplanation: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
              articleType: { type: 'string' },
              aiSummary: {
                type: 'string',
                description:
                  "A concise summary of the article's methodology, key findings, and limitations.",
              },
            },
            required: [
              'pmid',
              'relevanceScore',
              'relevanceExplanation',
              'keywords',
              'articleType',
              'aiSummary',
            ],
          },
        },
        aiGeneratedInsights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              answer: { type: 'string' },
              supportingArticles: { type: 'array', items: { type: 'string' } },
            },
            required: ['question', 'answer', 'supportingArticles'],
          },
        },
        overallKeywords: {
          type: 'array',
          items: {
            type: 'object',
            properties: { keyword: { type: 'string' }, frequency: { type: 'integer' } },
            required: ['keyword', 'frequency'],
          },
        },
      },
      required: ['rankedArticles', 'aiGeneratedInsights', 'overallKeywords'],
    };

    interface RankingAnalysisResponse {
      rankedArticles: Pick<
        RankedArticle,
        | 'pmid'
        | 'relevanceScore'
        | 'relevanceExplanation'
        | 'keywords'
        | 'articleType'
        | 'aiSummary'
      >[];
      aiGeneratedInsights: ResearchReport['aiGeneratedInsights'];
      overallKeywords: ResearchReport['overallKeywords'];
    }

    throwIfAborted(signal);
    const providerId = aiSettings.provider ?? 'gemini';
    const ollamaBudgetOptions = {
      ollamaBaseUrl: aiSettings.customBaseUrl?.trim() || 'http://localhost:11434',
    };
    // Warm the active-endpoint health cache so prompt budgets can use tag
    // parameterSize for custom model names (TTL cache; no-op when fresh).
    if (providerId === 'ollama') {
      await probeOllamaHealth(ollamaBudgetOptions.ollamaBaseUrl, { signal });
      throwIfAborted(signal);
    }
    const rankingSelection = selectArticlesForRankingPrompt(
      articleDetails,
      topicSafe,
      providerId,
      aiSettings.model,
      undefined,
      ollamaBudgetOptions,
    );
    yield makePipelineEvent('ranking', {
      phase: `Phase 4: AI Ranking (${rankingSelection.accounting.includedInPrompt}/${rankingSelection.accounting.totalRetrieved} articles in prompt)...`,
      promptBudget: rankingSelection.accounting,
    });

    if (rankingSelection.accounting.includedInPrompt === 0) {
      throw new AppError({
        code: 'VALIDATION',
        message:
          'No retrieved articles fit within the model context budget for ranking. Try a model with a larger context window or reduce the number of articles to scan.',
        retryable: false,
      });
    }

    const corpusScopeNote =
      rankingSelection.accounting.omittedFromPrompt > 0
        ? `Lexically pre-filtered corpus: ${rankingSelection.accounting.includedInPrompt} of ${rankingSelection.accounting.totalRetrieved} retrieved articles are in the untrusted JSON block below. Omitted PMIDs were scored locally but are not in this prompt: ${rankingSelection.omittedPmids.slice(0, 20).join(', ')}${rankingSelection.omittedPmids.length > 20 ? '…' : ''}. `
        : '';

    const analysisData = await generateJson<RankingAnalysisResponse>(
      aiSettings,
      {
        model: aiSettings.model,
        system: systemInstruction,
        temperature: aiSettings.temperature,
        jsonSchema: rankingSchema,
        thinkingBudget: defaultGeminiThinkingBudget(aiSettings.model),
        prompt: `${corpusScopeNote}From the provided list of articles, please perform the following analysis based on the original research topic: ${wrapUntrustedTextBlock('research_topic', topicSafe)}.
            1.  Rank the top ${input.topNToSynthesize} articles based on their relevance to the topic. For each, provide its PMID, a relevance score (1-100), a brief explanation for the score, 3-5 keywords from title/abstract when present, classify its article type, and write a new, concise summary (as 'aiSummary') that extracts the core methodology, key findings, and limitations of the study. When abstractStatus is "missing", rank from title/metadata only and state that limitation in relevanceExplanation. Ensure you ONLY use PMIDs from the provided list.
            2.  Generate 3-5 AI-powered insights based on the provided articles. Each insight should be a question/answer pair. List the PMIDs from the provided list that support each insight.
            3.  Analyze the keywords from all ranked articles to identify overall themes. List the top 5-10 keywords and their frequency.

            ${wrapUntrustedJsonBlock('article_list', rankingSelection.payloads)}
            `,
      },
      signal,
    );

    const detailedRankedArticles = analysisData.rankedArticles
      .map((ranked) => {
        const details = articleDetails.find((d) => d.pmid === ranked.pmid);
        // Despite the prompt instructing the AI to only use provided PMIDs, guard against
        // a hallucinated one producing an article missing title/authors/journal/etc.
        if (!details) return null;
        return { ...details, ...ranked, aiSummary: ranked.aiSummary } as RankedArticle;
      })
      .filter((a): a is RankedArticle => a !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const corpusPmids = articleDetails.map((a) => a.pmid).filter((id): id is string => !!id);
    const grounded = applyCorpusCitationGrounding(
      corpusPmids,
      detailedRankedArticles,
      analysisData.aiGeneratedInsights,
    );

    const partialReport: ResearchReport = {
      generatedQueries,
      synthesis: '',
      rankedArticles: grounded.rankedArticles,
      aiGeneratedInsights: grounded.insights,
      overallKeywords: analysisData.overallKeywords,
    };
    yield makePipelineEvent('synthesis', { report: partialReport });

    throwIfAborted(signal);
    const synthesisSelection = selectArticlesForSynthesisPrompt(
      grounded.rankedArticles,
      providerId,
      aiSettings.model,
      undefined,
      ollamaBudgetOptions,
    );
    yield makePipelineEvent('synthesis', {
      promptBudget: synthesisSelection.accounting,
    });

    if (synthesisSelection.accounting.includedInPrompt === 0) {
      throw new AppError({
        code: 'VALIDATION',
        message:
          'No ranked articles fit within the model context budget for synthesis. Try a model with a larger context window or reduce the number of articles to synthesize.',
        retryable: false,
      });
    }

    const synthesisPrompt = `Based on the following articles, write a comprehensive synthesis focusing on ${wrapUntrustedTextBlock('synthesis_focus', focusSafe)}. This should be a well-structured narrative in markdown format. Cite PMIDs inline where claims are made. AI summaries are derived — verify against source abstracts when precision matters.
        
        ${wrapUntrustedJsonBlock('ranked_articles', synthesisSelection.payloads)}
        `;

    throwIfAborted(signal);
    const stream = await provider.generateContentStream({
      model: aiSettings.model,
      system: systemInstruction,
      temperature: aiSettings.temperature,
      thinkingBudget: defaultGeminiThinkingBudget(aiSettings.model),
      prompt: synthesisPrompt,
      baseURL: resolveApprovedBaseUrl(aiSettings.customBaseUrl, aiSettings.approvedEndpointOrigin),
      signal,
    });

    for await (const chunk of stream) {
      throwIfAborted(signal);
      yield makePipelineEvent('synthesis-stream', { synthesisChunk: chunk.text });
    }
    yield makePipelineEvent('finalizing');
  } catch (error) {
    safeLogError('Error generating research report:', error);
    throw provider.mapError(error);
  }
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

export async function disambiguateAuthor(
  authorName: string,
  articles: Partial<RankedArticle>[],
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<AuthorCluster[]> {
  if (await shouldUseHeuristic(aiSettings)) {
    return disambiguateAuthorHeuristic(authorName, articles, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const nameSafe = sanitizePromptFragment(authorName, 500);
  try {
    const authorSchema: AIJsonSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nameVariant: { type: 'string' },
          primaryAffiliation: { type: 'string' },
          topCoAuthors: { type: 'array', items: { type: 'string' } },
          coreTopics: { type: 'array', items: { type: 'string' } },
          publicationCount: { type: 'integer' },
          pmids: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'nameVariant',
          'primaryAffiliation',
          'topCoAuthors',
          'coreTopics',
          'publicationCount',
          'pmids',
        ],
      },
    };
    const clusters = await generateJson<AuthorCluster[]>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.AUTHOR_DISAMBIGUATE),
        temperature: 0.1,
        jsonSchema: authorSchema,
        prompt: `Given the author name ${wrapUntrustedTextBlock('author_name', nameSafe)} and this list of their potential publications, disambiguate them into distinct author profiles. For each profile, provide a likely name variant, their most common primary affiliation, top 3 co-authors, core research topics, total publication count, and a list of their PMIDs.
            ${wrapUntrustedJsonBlock(
              'articles',
              articles.map((a) => ({
                pmid: a.pmid,
                title: a.title,
                authors: a.authors,
                journal: a.journal,
              })),
            )}`,
      },
      signal,
    );
    return intersectClustersWithCorpus(clusters, articles);
  } catch (error) {
    safeLogError('Error disambiguating author:', error);
    throw provider.mapError(error);
  }
}

export async function generateAuthorProfileAnalysis(
  authorName: string,
  articles: Partial<RankedArticle>[],
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<{
  careerSummary: string;
  coreConcepts: { concept: string; frequency: number }[];
}> {
  if (await shouldUseHeuristic(aiSettings)) {
    return generateAuthorProfileHeuristic(authorName, articles, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const nameSafe = sanitizePromptFragment(authorName, 500);
  try {
    const profileSchema: AIJsonSchema = {
      type: 'object',
      properties: {
        careerSummary: { type: 'string' },
        coreConcepts: {
          type: 'array',
          items: {
            type: 'object',
            properties: { concept: { type: 'string' }, frequency: { type: 'integer' } },
            required: ['concept', 'frequency'],
          },
        },
      },
      required: ['careerSummary', 'coreConcepts'],
    };
    return await generateJson<{
      careerSummary: string;
      coreConcepts: { concept: string; frequency: number }[];
    }>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.AUTHOR_PROFILE),
        temperature: 0.3,
        jsonSchema: profileSchema,
        prompt: `Analyze the following publication list for author ${wrapUntrustedTextBlock('author_name', nameSafe)}. Based strictly on this list, provide:
            1. A narrative career summary (in markdown format) scoped to these retrieved records only — do not state global bibliometric facts (h-index, total citations) without an authoritative citation source.
            2. A list of core research concepts with frequency counts from these titles/abstracts.
            ${wrapUntrustedJsonBlock(
              'publications',
              articles.map((a) => ({ title: a.title, pubYear: a.pubYear, journal: a.journal })),
            )}`,
      },
      signal,
    );
  } catch (error) {
    safeLogError('Error generating author profile:', error);
    throw provider.mapError(error);
  }
}

export async function suggestAuthors(
  fieldOfStudy: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<{ name: string; description: string }[]> {
  if (await shouldUseHeuristic(aiSettings)) {
    return suggestAuthorsHeuristic(fieldOfStudy, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const fieldSafe = sanitizePromptFragment(fieldOfStudy, 2000);
  try {
    const suggestSchema: AIJsonSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'description'],
      },
    };
    return await generateJson<{ name: string; description: string }[]>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.AUTHOR_SUGGEST),
        temperature: 0.5,
        jsonSchema: suggestSchema,
        prompt: `Suggest 5-10 prominent researchers in the field of ${wrapUntrustedTextBlock('field', fieldSafe)}. For each, provide their name and a brief (1-sentence) description of their key contribution.`,
      },
      signal,
    );
  } catch (error) {
    safeLogError('Error suggesting authors:', error);
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

export async function generateJournalProfileAnalysis(
  journalName: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
  articles: Partial<RankedArticle>[] = [],
): Promise<JournalProfile> {
  if (await shouldUseHeuristic(aiSettings)) {
    return generateJournalProfileHeuristic(journalName, articles, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const journalSafe = sanitizePromptFragment(journalName, 500);
  const articleContext =
    articles.length > 0
      ? `\n${wrapUntrustedJsonBlock('recent_titles', articles.map((a) => a.title).slice(0, 20))}`
      : '';
  try {
    const journalSchema: AIJsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        issn: { type: 'string' },
        description: { type: 'string' },
        oaPolicy: { type: 'string' },
        focusAreas: { type: 'array', items: { type: 'string' } },
        publisher: { type: 'string' },
      },
      required: ['name', 'issn', 'description', 'oaPolicy', 'focusAreas'],
    };
    const profile = await generateJson<JournalProfile>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.JOURNAL_PROFILE),
        temperature: 0.2,
        jsonSchema: journalSchema,
        prompt: `Act as an expert academic librarian. Analyze the journal ${wrapUntrustedTextBlock('journal_name', journalSafe)}. Provide a JSON object with: name, issn, description, oaPolicy, focusAreas, publisher. Find the correct ISSN when possible. For oaPolicy, use one of: "Full Open Access", "Hybrid", "Subscription". Do not estimate Journal Impact Factor — external citation indexes are unavailable in this app.${articleContext}`,
      },
      signal,
    );
    return {
      ...profile,
      metrics: {
        impactFactor: null,
        analyzedArticleCount: articles.length > 0 ? articles.length : null,
        openAccessRate:
          articles.length > 0
            ? Math.round((articles.filter((a) => a.isOpenAccess).length / articles.length) * 100)
            : null,
        source: 'computed',
      },
    };
  } catch (error) {
    safeLogError('Error generating journal profile analysis:', error);
    throw provider.mapError(error);
  }
}

/**
 * Disambiguate a journal name into candidate journals (name variants, abbreviations).
 * Mirrors {@link disambiguateAuthor} — heuristic fallback uses the curated journal KB.
 */
export async function disambiguateJournal(
  journalName: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<JournalCandidate[]> {
  if (await shouldUseHeuristic(aiSettings)) {
    return disambiguateJournalHeuristic(journalName, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const journalSafe = sanitizePromptFragment(journalName, 500);
  try {
    const disambiguateSchema: AIJsonSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          issn: { type: 'string' },
          description: { type: 'string' },
          matchType: { type: 'string' },
          confidence: { type: 'integer' },
        },
        required: ['name', 'description', 'matchType', 'confidence'],
      },
    };
    const parsed = await generateJson<JournalCandidate[]>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.JOURNAL_DISAMBIGUATE),
        temperature: 0.1,
        jsonSchema: disambiguateSchema,
        prompt: `Act as an expert academic librarian. The user entered the journal name ${wrapUntrustedTextBlock('journal_query', journalSafe)}. Identify up to 5 distinct journals this could refer to (name variants, abbreviations, or similarly named journals, e.g. "BMJ" vs "BMJ Open"). For each candidate provide: the canonical full name, its ISSN (if known), a brief 1-sentence description, the matchType (one of "exact", "alias", "abbreviation", "partial"), and a confidence score 0-100. Return them sorted by confidence descending.`,
      },
      signal,
    );
    return parsed.map((c) => ({
      ...c,
      matchType: (['exact', 'alias', 'abbreviation', 'partial'].includes(c.matchType)
        ? c.matchType
        : 'partial') as JournalCandidate['matchType'],
    }));
  } catch (error) {
    safeLogError('Error disambiguating journal:', error);
    throw provider.mapError(error);
  }
}

/**
 * Suggest prominent journals for a field of study.
 * Mirrors {@link suggestAuthors} — heuristic fallback uses a curated field map.
 */
export async function suggestJournals(
  fieldOfStudy: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<{ name: string; description: string }[]> {
  if (await shouldUseHeuristic(aiSettings)) {
    return suggestJournalsHeuristic(fieldOfStudy, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const fieldSafe = sanitizePromptFragment(fieldOfStudy, 2000);
  try {
    const suggestSchema: AIJsonSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'description'],
      },
    };
    return await generateJson<{ name: string; description: string }[]>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.JOURNAL_SUGGEST),
        temperature: 0.5,
        jsonSchema: suggestSchema,
        prompt: `Act as an expert academic librarian. Suggest 5-10 prominent peer-reviewed journals publishing research in the field of ${wrapUntrustedTextBlock('field', fieldSafe)}. For each, provide the canonical journal name and a brief (1-sentence) description of its scope and reputation.`,
      },
      signal,
    );
  } catch (error) {
    safeLogError('Error suggesting journals:', error);
    throw provider.mapError(error);
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
