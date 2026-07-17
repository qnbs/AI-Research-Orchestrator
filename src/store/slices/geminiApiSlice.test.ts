import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { geminiApi } from './geminiApiSlice';
import type { Settings } from '../../types';

const geminiMocks = vi.hoisted(() => ({
  generateResearchReportStream: vi.fn(),
  generateResearchAnalysis: vi.fn().mockResolvedValue({
    summary: 's',
    keyFindings: ['k'],
    synthesizedTopic: 'topic',
  }),
  findSimilarArticles: vi.fn().mockResolvedValue([]),
  findRelatedOnline: vi.fn().mockResolvedValue({ summary: '', sources: [] }),
  generateTldrSummary: vi.fn().mockResolvedValue('tldr'),
  disambiguateAuthor: vi.fn().mockResolvedValue([]),
  generateAuthorProfileAnalysis: vi.fn().mockResolvedValue({
    careerSummary: '',
    coreConcepts: [],
    estimatedMetrics: { hIndex: null, totalCitations: null },
  }),
  suggestAuthors: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/geminiService', () => geminiMocks);

const ai: Settings['ai'] = {
  model: 'gemini-2.5-flash',
  customPreamble: '',
  temperature: 0.5,
  aiLanguage: 'English',
  aiPersona: 'Neutral Scientist',
  researchAssistant: {
    autoFetchSimilar: false,
    autoFetchOnline: false,
    authorSearchLimit: 10,
  },
  enableTldr: true,
  ncbiApiKey: '',
  forceHeuristicMode: false,
};

function makeStore() {
  return configureStore({
    reducer: { [geminiApi.reducerPath]: geminiApi.reducer },
    middleware: (gdm) => gdm({ serializableCheck: false }).concat(geminiApi.middleware),
  });
}

describe('geminiApiSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateAnalysis initiate returns data from service', async () => {
    const store = makeStore();
    const result = await store.dispatch(
      geminiApi.endpoints.generateAnalysis.initiate({
        query: 'test query',
        aiSettings: ai,
      }),
    );
    if ('data' in result) {
      expect(result.data?.synthesizedTopic).toBe('topic');
    } else {
      expect.fail('expected fulfilled result');
    }
  });

  it('passes AbortSignal to generateResearchAnalysis', async () => {
    const store = makeStore();
    await store.dispatch(
      geminiApi.endpoints.generateAnalysis.initiate({ query: 'q', aiSettings: ai }),
    );
    expect(geminiMocks.generateResearchAnalysis).toHaveBeenCalled();
    const call = geminiMocks.generateResearchAnalysis.mock.calls[0];
    expect(call[2]).toBeInstanceOf(AbortSignal);
  });

  it('findSimilarArticles forwards signal', async () => {
    const store = makeStore();
    await store.dispatch(
      geminiApi.endpoints.findSimilarArticles.initiate({
        article: { title: 't', summary: 's' },
        aiSettings: ai,
      }),
    );
    expect(geminiMocks.findSimilarArticles.mock.calls[0][2]).toBeInstanceOf(AbortSignal);
  });

  it('generateTldr forwards signal', async () => {
    const store = makeStore();
    await store.dispatch(
      geminiApi.endpoints.generateTldr.initiate({
        abstract: 'abs',
        aiSettings: ai,
      }),
    );
    expect(geminiMocks.generateTldrSummary.mock.calls[0][2]).toBeInstanceOf(AbortSignal);
  });

  it('findRelatedOnline forwards signal', async () => {
    const store = makeStore();
    await store.dispatch(
      geminiApi.endpoints.findRelatedOnline.initiate({
        topic: 'q',
        aiSettings: ai,
      }),
    );
    expect(geminiMocks.findRelatedOnline.mock.calls[0][2]).toBeInstanceOf(AbortSignal);
  });

  it('disambiguateAuthor forwards signal', async () => {
    const store = makeStore();
    await store.dispatch(
      geminiApi.endpoints.disambiguateAuthor.initiate({
        authorName: 'Ada Lovelace',
        articles: [],
        aiSettings: ai,
      }),
    );
    expect(geminiMocks.disambiguateAuthor.mock.calls[0][3]).toBeInstanceOf(AbortSignal);
  });

  it('generateAuthorProfile forwards signal', async () => {
    const store = makeStore();
    await store.dispatch(
      geminiApi.endpoints.generateAuthorProfile.initiate({
        authorName: 'Ada Lovelace',
        articles: [],
        aiSettings: ai,
      }),
    );
    expect(geminiMocks.generateAuthorProfileAnalysis.mock.calls[0][3]).toBeInstanceOf(AbortSignal);
  });

  it('suggestAuthors forwards signal', async () => {
    const store = makeStore();
    await store.dispatch(
      geminiApi.endpoints.suggestAuthors.initiate({
        fieldOfStudy: 'oncology',
        aiSettings: ai,
      }),
    );
    expect(geminiMocks.suggestAuthors.mock.calls[0][2]).toBeInstanceOf(AbortSignal);
  });

  it('generateReport streams chunks into cache', async () => {
    async function* fakeStream() {
      yield {
        phase: 'Phase 1',
        synthesisChunk: 'Hello ',
        report: null,
      };
      yield {
        phase: 'Finalizing Report...',
        synthesisChunk: 'world',
        report: {
          synthesis: 'Hello world',
          rankedArticles: [],
          generatedQueries: [],
          aiGeneratedInsights: [],
          overallKeywords: [],
        },
      };
    }
    geminiMocks.generateResearchReportStream.mockReturnValue(fakeStream());

    const store = makeStore();
    const promise = store.dispatch(
      geminiApi.endpoints.generateReport.initiate({
        input: {
          researchTopic: 't',
          dateRange: 'any',
          articleTypes: [],
          synthesisFocus: 'overview',
          maxArticlesToScan: 5,
          topNToSynthesize: 2,
        },
        aiSettings: ai,
        runId: 1,
      }),
    );

    await vi.waitFor(() => {
      const entry = geminiApi.endpoints.generateReport.select({
        input: {
          researchTopic: 't',
          dateRange: 'any',
          articleTypes: [],
          synthesisFocus: 'overview',
          maxArticlesToScan: 5,
          topNToSynthesize: 2,
        },
        aiSettings: ai,
        runId: 1,
      })(store.getState());
      expect(entry.data?.isComplete).toBe(true);
    });

    const entry = geminiApi.endpoints.generateReport.select({
      input: {
        researchTopic: 't',
        dateRange: 'any',
        articleTypes: [],
        synthesisFocus: 'overview',
        maxArticlesToScan: 5,
        topNToSynthesize: 2,
      },
      aiSettings: ai,
      runId: 1,
    })(store.getState());
    expect(entry.data?.synthesisChunks.join('')).toBe('Hello world');
    expect(entry.data?.report?.synthesis).toBe('Hello world');
    promise.unsubscribe();
  });
});
