/**
 * Gemini AI RTK Query Slice — AI Research Orchestrator
 *
 * Wraps all @google/genai service calls in RTK Query endpoints so components
 * can benefit from automatic caching, loading/error states, deduplication,
 * and optimistic streaming via `onCacheEntryAdded`.
 *
 * Streaming pattern: `generateReport` returns initial state immediately via
 * `queryFn`, then drives incremental updates through `onCacheEntryAdded` as
 * chunks arrive from the `generateResearchReportStream` AsyncGenerator.
 */
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  ResearchInput,
  ResearchReport,
  ResearchAnalysis,
  SimilarArticle,
  OnlineFindings,
  RankedArticle,
  AuthorCluster,
  Settings,
} from '../../types';
import {
  generateResearchReportStream,
  generateResearchAnalysis,
  findSimilarArticles,
  findRelatedOnline,
  generateTldrSummary,
  disambiguateAuthor,
  generateAuthorProfileAnalysis,
  suggestAuthors,
} from '../../services/geminiService';

// ── Streaming report state ────────────────────────────────────────────────────
export interface StreamingReportState {
  phase: string;
  synthesisChunks: string[];
  report: ResearchReport | null;
  isComplete: boolean;
  error: string | null;
}

// ── Arg types ─────────────────────────────────────────────────────────────────
export interface GenerateReportArgs {
  input: ResearchInput;
  aiSettings: Settings['ai'];
  /** Include a run-id (e.g. Date.now()) to force a cache miss and re-run. */
  runId?: number;
}

export interface GenerateAnalysisArgs {
  query: string;
  aiSettings: Settings['ai'];
}

export interface FindSimilarArgs {
  article: { title: string; summary: string };
  aiSettings: Settings['ai'];
}

export interface FindOnlineArgs {
  topic: string;
  aiSettings: Settings['ai'];
}

export interface GenerateTldrArgs {
  abstract: string;
  aiSettings: Settings['ai'];
}

export interface DisambiguateAuthorArgs {
  authorName: string;
  articles: Partial<RankedArticle>[];
  aiSettings: Settings['ai'];
}

export interface AuthorProfileArgs {
  authorName: string;
  articles: Partial<RankedArticle>[];
  aiSettings: Settings['ai'];
}

export interface AuthorProfileResult {
  careerSummary: string;
  coreConcepts: { concept: string; frequency: number }[];
  estimatedMetrics: { hIndex: number | null; totalCitations: number | null };
}

export interface SuggestAuthorsArgs {
  fieldOfStudy: string;
  aiSettings: Settings['ai'];
}

// ── Gemini API slice ──────────────────────────────────────────────────────────
export const geminiApi = createApi({
  reducerPath: 'geminiApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['GeminiReport', 'GeminiAnalysis'],
  endpoints: (builder) => ({

    // ── Streaming research report ─────────────────────────────────────────
    // • queryFn seeds the cache with an empty streamable state immediately.
    // • onCacheEntryAdded drives updates from the AsyncGenerator chunks.
    generateReport: builder.query<StreamingReportState, GenerateReportArgs>({
      queryFn: () => ({
        data: {
          phase: 'Initializing...',
          synthesisChunks: [],
          report: null,
          isComplete: false,
          error: null,
        },
      }),
      async onCacheEntryAdded(arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        // Wait until the cache entry is in place before streaming into it.
        await cacheDataLoaded;
        const controller = new AbortController();
        try {
          const stream = generateResearchReportStream(arg.input, arg.aiSettings);
          for await (const chunk of stream) {
            if (controller.signal.aborted) break;
            updateCachedData(draft => {
              draft.phase = chunk.phase;
              if (chunk.synthesisChunk) draft.synthesisChunks.push(chunk.synthesisChunk);
              if (chunk.report) {
                draft.report = chunk.report;
                draft.isComplete = true;
              }
            });
          }
          // Mark complete if the generator finished without emitting a report
          updateCachedData(draft => {
            if (!draft.isComplete) draft.isComplete = true;
          });
        } catch (err) {
          updateCachedData(draft => {
            draft.error = err instanceof Error ? err.message : String(err);
            draft.isComplete = true;
          });
        }
        // Clean up when the cache entry is removed (component unmounts).
        await cacheEntryRemoved;
        controller.abort();
      },
      // runId in the cache key ensures each invocation produces its own stream
      serializeQueryArgs: ({ queryArgs }) =>
        `${queryArgs.input.researchTopic}__${queryArgs.runId ?? 0}`,
    }),

    // ── One-shot research analysis ────────────────────────────────────────
    generateAnalysis: builder.query<ResearchAnalysis, GenerateAnalysisArgs>({
      queryFn: async ({ query, aiSettings }) => {
        try {
          const data = await generateResearchAnalysis(query, aiSettings);
          return { data };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      keepUnusedDataFor: 300,
    }),

    // ── Similar articles ──────────────────────────────────────────────────
    findSimilarArticles: builder.query<SimilarArticle[], FindSimilarArgs>({
      queryFn: async ({ article, aiSettings }) => {
        try {
          const data = await findSimilarArticles(article, aiSettings);
          return { data };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      keepUnusedDataFor: 300,
    }),

    // ── Online findings ───────────────────────────────────────────────────
    findRelatedOnline: builder.query<OnlineFindings, FindOnlineArgs>({
      queryFn: async ({ topic, aiSettings }) => {
        try {
          const data = await findRelatedOnline(topic, aiSettings);
          return { data };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      keepUnusedDataFor: 300,
    }),

    // ── TLDR summary ──────────────────────────────────────────────────────
    generateTldr: builder.query<string, GenerateTldrArgs>({
      queryFn: async ({ abstract, aiSettings }) => {
        try {
          const data = await generateTldrSummary(abstract, aiSettings);
          return { data };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      keepUnusedDataFor: 600,
    }),

    // ── Author disambiguation ─────────────────────────────────────────────
    disambiguateAuthor: builder.query<AuthorCluster[], DisambiguateAuthorArgs>({
      queryFn: async ({ authorName, articles, aiSettings }) => {
        try {
          const data = await disambiguateAuthor(authorName, articles, aiSettings);
          return { data };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      keepUnusedDataFor: 120,
    }),

    // ── Author profile analysis ───────────────────────────────────────────
    generateAuthorProfile: builder.query<AuthorProfileResult, AuthorProfileArgs>({
      queryFn: async ({ authorName, articles, aiSettings }) => {
        try {
          const data = await generateAuthorProfileAnalysis(authorName, articles, aiSettings);
          return { data };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      keepUnusedDataFor: 120,
    }),

    // ── Author suggestions ────────────────────────────────────────────────
    suggestAuthors: builder.query<{ name: string; description: string }[], SuggestAuthorsArgs>({
      queryFn: async ({ fieldOfStudy, aiSettings }) => {
        try {
          const data = await suggestAuthors(fieldOfStudy, aiSettings);
          return { data };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      keepUnusedDataFor: 60,
    }),
  }),
});

// ── Export hooks ──────────────────────────────────────────────────────────────
export const {
  useGenerateReportQuery,
  useLazyGenerateReportQuery,
  useGenerateAnalysisQuery,
  useLazyGenerateAnalysisQuery,
  useFindSimilarArticlesQuery,
  useLazyFindSimilarArticlesQuery,
  useFindRelatedOnlineQuery,
  useLazyFindRelatedOnlineQuery,
  useGenerateTldrQuery,
  useLazyGenerateTldrQuery,
  useDisambiguateAuthorQuery,
  useLazyDisambiguateAuthorQuery,
  useGenerateAuthorProfileQuery,
  useLazyGenerateAuthorProfileQuery,
  useSuggestAuthorsQuery,
  useLazySuggestAuthorsQuery,
} = geminiApi;
