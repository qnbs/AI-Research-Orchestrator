/**
 * Live (provider-backed) research report stream — query → PubMed/arXiv → rank → synthesis.
 * Public façade remains `generateResearchReportStream` in `geminiService.ts` (ADR 0008).
 */
import type {
  ResearchInput,
  ResearchReport,
  Settings,
  RankedArticle,
  GeneratedQuery,
} from '../types';
import { getNcbiApiKey } from './apiKeyService';
import { defaultGeminiThinkingBudget } from './providers/provider';
import { getProviderForSettings } from './providers/factory';
import type { AIJsonSchema } from './providers/types';
import { probeOllamaHealth } from './providers/ollamaHealth';
import { probeOllamaModelMetadata } from '../lib/ollamaModelMetadata';
import { searchPubMedForIds, fetchArticleDetails } from './pubmedUtils';
import { searchAndFetchArxiv } from './arxivUtils';
import { sanitizePromptFragment } from '../lib/promptSanitize';
import { resolveApprovedBaseUrl } from '../lib/endpointPolicy';
import { applyCorpusCitationGrounding } from '../lib/citationGrounding';
import { assertValidPubMedQuery } from '../lib/pubmedQueryValidator';
import { wrapUntrustedJsonBlock, wrapUntrustedTextBlock } from '../lib/untrustedDataFraming';
import {
  selectArticlesForRankingPrompt,
  selectArticlesForSynthesisPrompt,
} from '../lib/promptBudget';
import { makePipelineEvent, type ResearchStreamEvent } from '../types/pipelineEvents';
import { AppError, isAbortError, throwIfAborted } from '../lib/errors';
import { PromptId } from '../lib/promptRegistry';
import { safeLogError } from '../lib/safeLog';
import { generateJson, getPreamble } from './aiJson';

export async function* generateLiveResearchReportStream(
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
      throw new AppError({
        code: 'VALIDATION',
        message: 'The AI failed to generate any search queries.',
        retryable: true,
        context: 'query_generation',
      });
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
      throw new AppError({
        code: 'VALIDATION',
        message:
          'Your search returned no results from PubMed. This can be due to a very specific topic or strict filters. Try broadening your topic, adjusting the date range, or changing article types.',
        retryable: false,
        context: 'pubmed',
      });
    }

    throwIfAborted(signal);
    // STEP 3: Fetch Real Article Details
    yield makePipelineEvent('pubmed-fetch');
    const articleDetails = await fetchArticleDetails(pmids, signal, ncbiApiKey);
    if (articleDetails.length === 0) {
      throw new AppError({
        code: 'NCBI_NETWORK',
        message: 'Could not fetch details for the articles found on PubMed.',
        retryable: true,
        context: 'pubmed',
      });
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
    // Warm the active-endpoint health cache (tag parameterSize fallback) AND the
    // /api/show metadata cache (real runtime context_length) before computing any
    // prompt budget below. Without the second probe, getInputTokenBudget silently
    // falls back to the parameter-count heuristic whenever Settings was never
    // opened this session (OllamaHealthPanel was the only prior caller of
    // probeOllamaModelMetadata) - the model's actual context window would never
    // be honored on the ordinary research path. Both probes are read-only and
    // independent, so run them concurrently. allSettled (not all) so neither
    // probe's own internal timeout - which can present as an abort-classified
    // rejection depending on runtime fetch behavior - fails the whole stream;
    // a genuine caller cancellation is still honored via throwIfAborted right
    // after. A slow/unreachable /api/show only leaves the heuristic budget in
    // place, same as before this probe existed - it must never abort generation.
    if (providerId === 'ollama') {
      await Promise.allSettled([
        probeOllamaHealth(ollamaBudgetOptions.ollamaBaseUrl, { signal }),
        probeOllamaModelMetadata(ollamaBudgetOptions.ollamaBaseUrl, aiSettings.model, { signal }),
      ]);
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
    // mapError turns AbortError into PROVIDER_UNAVAILABLE. Cancelled runs must
    // stay STREAM_ABORTED so the session stamps `'partial'` (ADR 0021), not an
    // "AI unavailable" error. Honor the caller signal even after that remap.
    // AppError from generateJson / empty PubMed / query validation must not be
    // remapped as a provider failure.
    if (isAbortError(error) || signal?.aborted) {
      if (error instanceof AppError && error.code === 'STREAM_ABORTED') throw error;
      throw new AppError({
        code: 'STREAM_ABORTED',
        message: 'Aborted',
        retryable: false,
        cause: error,
      });
    }
    if (error instanceof AppError) throw error;
    safeLogError('Error generating research report:', error);
    throw provider.mapError(error);
  }
}
