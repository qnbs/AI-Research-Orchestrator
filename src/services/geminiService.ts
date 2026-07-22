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
import { searchPubMedForIds, fetchArticleDetails } from './pubmedUtils';
import { searchAndFetchArxiv } from './arxivUtils';
import { sanitizePromptFragment } from '../lib/promptSanitize';
import {
  parseGeminiResponseJson as parseGeminiJsonCore,
  GeminiJsonParseError,
} from '../lib/parseGeminiJson';
import { AppError, toAppError, isAbortError } from '../lib/errors';
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

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AppError({
      code: 'STREAM_ABORTED',
      message: 'Aborted',
      retryable: false,
      cause: new DOMException('Aborted', 'AbortError'),
    });
  }
}

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
  try {
    const response = await provider.generateContent({
      ...request,
      json: true,
      baseURL: aiSettings.customBaseUrl,
      signal,
    });
    return parseGeminiResponseJson<T>(response.text);
  } catch (error) {
    console.error('Error generating content:', error);
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
): AsyncGenerator<{ report?: ResearchReport; synthesisChunk?: string; phase: string }> {
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
): AsyncGenerator<{ report?: ResearchReport; synthesisChunk?: string; phase: string }> {
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const ncbiApiKey = (await getNcbiApiKey()) ?? undefined;
  throwIfAborted(signal);
  const topicSafe = sanitizePromptFragment(input.researchTopic);
  const focusSafe = sanitizePromptFragment(input.synthesisFocus);
  try {
    const systemInstruction = `${getPreamble(aiSettings, PromptId.ORCHESTRATOR_SYSTEM)} You are an expert AI research assistant. Your goal is to conduct a literature review on PubMed${input.includeArxiv ? ' and arXiv' : ''} based on the user's criteria, rank the articles, and synthesize the findings. Article identifiers from arXiv begin with "arxiv:" — treat them exactly like PubMed PMIDs.`;

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

Research Topic: "${topicSafe}"
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
    yield { phase: 'Phase 1: AI Generating PubMed Queries...' };
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

    throwIfAborted(signal);
    // STEP 2: Execute Real PubMed Search
    yield { phase: 'Phase 2: Executing Real-time PubMed Search...' };
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
    yield { phase: 'Phase 3: Fetching Article Details from PubMed...' };
    const articleDetails = await fetchArticleDetails(pmids, signal, ncbiApiKey);
    if (articleDetails.length === 0) {
      throw new Error('Could not fetch details for the articles found on PubMed.');
    }

    throwIfAborted(signal);
    // STEP 3b: Fetch arXiv Preprints (if enabled, non-blocking)
    if (input.includeArxiv) {
      yield { phase: 'Phase 3b: Fetching arXiv Preprints...' };
      const arxivMax = Math.min(Math.floor(input.maxArticlesToScan / 2), 15);
      const arxivResults = await searchAndFetchArxiv(topicSafe, arxivMax, signal);
      if (arxivResults.length > 0) {
        articleDetails.push(...arxivResults);
      }
    }

    throwIfAborted(signal);
    // STEP 4: AI Analyzes and Ranks Real Data
    yield { phase: 'Phase 4: AI Ranking & Analysis of Real Articles...' };

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
    const analysisData = await generateJson<RankingAnalysisResponse>(
      aiSettings,
      {
        model: aiSettings.model,
        system: systemInstruction,
        temperature: aiSettings.temperature,
        jsonSchema: rankingSchema,
        thinkingBudget: defaultGeminiThinkingBudget(aiSettings.model),
        prompt: `From the provided list of articles, please perform the following analysis based on the original research topic: "${topicSafe}".
            1.  Rank the top ${input.topNToSynthesize} articles based on their relevance to the topic. For each, provide its PMID, a relevance score (1-100), a brief explanation for the score, 3-5 keywords from its summary, classify its article type, and write a new, concise summary (as 'aiSummary') that extracts the core methodology, key findings, and limitations of the study. Ensure you ONLY use PMIDs from the provided list.
            2.  Generate 3-5 AI-powered insights based on the provided articles. Each insight should be a question/answer pair. List the PMIDs from the provided list that support each insight.
            3.  Analyze the keywords from all ranked articles to identify overall themes. List the top 5-10 keywords and their frequency.

            Article List (JSON format):
            ${JSON.stringify(articleDetails.map((a) => ({ pmid: a.pmid, title: a.title, summary: a.summary })))}
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
        return { ...details, ...ranked } as RankedArticle;
      })
      .filter((a): a is RankedArticle => a !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const partialReport: ResearchReport = {
      generatedQueries,
      synthesis: '',
      rankedArticles: detailedRankedArticles,
      aiGeneratedInsights: analysisData.aiGeneratedInsights,
      overallKeywords: analysisData.overallKeywords,
    };
    yield { report: partialReport, phase: 'Phase 5: Synthesizing Top Findings...' };

    throwIfAborted(signal);
    // STEP 5: AI Generates Synthesis
    const synthesisPrompt = `Based on the following articles, write a comprehensive synthesis focusing on "${focusSafe}". This should be a well-structured narrative in markdown format.
        
        Articles:
        ${detailedRankedArticles
          .map(
            (a: RankedArticle) => `
        ---
        PMID: ${a.pmid}
        Title: ${a.title}
        Summary: ${a.aiSummary || a.summary}
        Relevance Score: ${a.relevanceScore}/100
        Keywords: ${a.keywords.join(', ')}
        ---
        `,
          )
          .join('\n')}
        `;

    throwIfAborted(signal);
    const stream = await provider.generateContentStream({
      model: aiSettings.model,
      system: systemInstruction,
      temperature: aiSettings.temperature,
      thinkingBudget: defaultGeminiThinkingBudget(aiSettings.model),
      prompt: synthesisPrompt,
      baseURL: aiSettings.customBaseUrl,
    });

    for await (const chunk of stream) {
      throwIfAborted(signal);
      yield { synthesisChunk: chunk.text, phase: 'Streaming Synthesis...' };
    }
    yield { phase: 'Finalizing Report...' };
  } catch (error) {
    console.error('Error generating research report:', error);
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
    return await generateJson<SimilarArticle[]>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.SIMILAR_ARTICLES),
        temperature: 0.3,
        jsonSchema: similarSchema,
        prompt: `Based on the following article, find 3-5 similar articles on PubMed. For each, provide the PMID, title, and a brief reason for its relevance.
            Title: "${article.title}"
            Summary: "${article.summary}"`,
      },
      signal,
    );
  } catch (error) {
    console.error('Error finding similar articles:', error);
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
      prompt: `Provide a brief summary of the online discussion, news, or recent developments related to "${topicSafe}".`,
      webGrounding: true,
      baseURL: aiSettings.customBaseUrl,
    });
    const sources: WebContent[] = (response.sources ?? []).map((s) => ({
      uri: s.uri,
      title: s.title ?? '',
    }));
    return { summary: response.text ?? '', sources };
  } catch (error) {
    console.error('Error finding related online content:', error);
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
      prompt: `Summarize the following abstract in a single, concise sentence (TL;DR format): "${abstractSafe}"`,
      baseURL: aiSettings.customBaseUrl,
    });
    return response.text ?? '';
  } catch (error) {
    console.error('Error generating TL;DR summary:', error);
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
            Text: "${querySafe}"`,
      },
      signal,
    );
  } catch (error) {
    console.error('Error generating research analysis:', error);
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
    return await generateJson<AuthorCluster[]>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.AUTHOR_DISAMBIGUATE),
        temperature: 0.1,
        jsonSchema: authorSchema,
        prompt: `Given the author name "${nameSafe}" and this list of their potential publications, disambiguate them into distinct author profiles. For each profile, provide a likely name variant, their most common primary affiliation, top 3 co-authors, core research topics, total publication count, and a list of their PMIDs.
            Articles: ${JSON.stringify(articles.map((a) => ({ pmid: a.pmid, title: a.title, authors: a.authors, journal: a.journal })))}`,
      },
      signal,
    );
  } catch (error) {
    console.error('Error disambiguating author:', error);
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
  estimatedMetrics: { hIndex: number | null; totalCitations: number | null };
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
        estimatedMetrics: {
          type: 'object',
          properties: {
            hIndex: { type: 'integer', nullable: true },
            totalCitations: { type: 'integer', nullable: true },
          },
          required: ['hIndex', 'totalCitations'],
        },
      },
      required: ['careerSummary', 'coreConcepts', 'estimatedMetrics'],
    };
    return await generateJson<{
      careerSummary: string;
      coreConcepts: { concept: string; frequency: number }[];
      estimatedMetrics: { hIndex: number | null; totalCitations: number | null };
    }>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.AUTHOR_PROFILE),
        temperature: 0.3,
        jsonSchema: profileSchema,
        prompt: `Analyze the following publication list for author "${nameSafe}". Based strictly on this list, provide:
            1. A narrative career summary (in markdown format).
            2. A list of their core research concepts with frequency.
            3. An estimation of their h-index and total citations. If the provided data is insufficient for a reasonable estimation, return null for these metric fields.
            Publications: ${JSON.stringify(articles.map((a) => ({ title: a.title, pubYear: a.pubYear, journal: a.journal })))}`,
      },
      signal,
    );
  } catch (error) {
    console.error('Error generating author profile:', error);
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
        prompt: `Suggest 5-10 prominent researchers in the field of "${fieldSafe}". For each, provide their name and a brief (1-sentence) description of their key contribution.`,
      },
      signal,
    );
  } catch (error) {
    console.error('Error suggesting authors:', error);
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
        Title: ${articleData.title}
        Abstract: ${articleData.summary}
        
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
      console.error('Error analyzing single article:', error);
      throw provider.mapError(error);
    }
  } catch (error) {
    console.error('Error analyzing single article:', error);
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
      ? `\nRecent article titles from this journal (for focus-area grounding): ${JSON.stringify(
          articles.map((a) => a.title).slice(0, 20),
        )}`
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
        estimatedImpactFactor: { type: 'number', nullable: true },
      },
      required: ['name', 'issn', 'description', 'oaPolicy', 'focusAreas'],
    };
    const parsed = await generateJson<JournalProfile & { estimatedImpactFactor?: number | null }>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.JOURNAL_PROFILE),
        temperature: 0.2,
        jsonSchema: journalSchema,
        prompt: `Act as an expert academic librarian. Analyze the journal '${journalSafe}'. Provide a JSON object with the following structure: { "name": "...", "issn": "...", "description": "...", "oaPolicy": "...", "focusAreas": ["..."], "publisher": "...", "estimatedImpactFactor": <number|null> }. Find the correct ISSN. For oaPolicy, use one of: "Full Open Access", "Hybrid", "Subscription". For estimatedImpactFactor, give your best estimate of the current Journal Impact Factor, or null if you cannot reasonably estimate it.${articleContext}`,
      },
      signal,
    );
    const { estimatedImpactFactor, ...profile } = parsed;
    return {
      ...profile,
      metrics: {
        impactFactor: estimatedImpactFactor ?? null,
        analyzedArticleCount: articles.length > 0 ? articles.length : null,
        openAccessRate:
          articles.length > 0
            ? Math.round((articles.filter((a) => a.isOpenAccess).length / articles.length) * 100)
            : null,
        source: 'ai-estimated',
      },
    };
  } catch (error) {
    console.error('Error generating journal profile analysis:', error);
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
        prompt: `Act as an expert academic librarian. The user entered the journal name "${journalSafe}". Identify up to 5 distinct journals this could refer to (name variants, abbreviations, or similarly named journals, e.g. "BMJ" vs "BMJ Open"). For each candidate provide: the canonical full name, its ISSN (if known), a brief 1-sentence description, the matchType (one of "exact", "alias", "abbreviation", "partial"), and a confidence score 0-100. Return them sorted by confidence descending.`,
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
    console.error('Error disambiguating journal:', error);
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
        prompt: `Act as an expert academic librarian. Suggest 5-10 prominent peer-reviewed journals publishing research in the field of "${fieldSafe}". For each, provide the canonical journal name and a brief (1-sentence) description of its scope and reputation.`,
      },
      signal,
    );
  } catch (error) {
    console.error('Error suggesting journals:', error);
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
  const context = `
        ${promptTag(PromptId.REPORT_CHAT)}
        You are a helpful AI assistant that answers questions about a specific research report.
        The user has just generated the following report. Your answers should be based on this context.

        ## Research Synthesis ##
        ${report.synthesis}

        ## Ranked Articles ##
        ${report.rankedArticles
          .map(
            (a) => `
        - PMID: ${a.pmid}
        - Title: ${a.title}
        - Summary: ${a.summary}
        `,
          )
          .join('\n')}
    `;

  return provider.createChatSession({
    model: aiSettings.model,
    system: context,
    temperature: aiSettings.temperature * 0.8, // Slightly lower temperature for more factual chat
  });
};

export type { ReportChatSession };
