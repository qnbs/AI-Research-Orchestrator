import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetAllCircuitBreakers } from '../../lib/circuitBreaker';
import type { ResearchInput } from '../../types';

const mockPubMed = vi.hoisted(() => ({
  searchPubMedForIds: vi.fn(),
  fetchArticleDetails: vi.fn(),
}));

vi.mock('../pubmedUtils', () => ({
  searchPubMedForIds: (...args: unknown[]) => mockPubMed.searchPubMedForIds(...args),
  fetchArticleDetails: (...args: unknown[]) => mockPubMed.fetchArticleDetails(...args),
}));

const mockArxiv = vi.hoisted(() => ({
  searchAndFetchArxiv: vi.fn(),
}));

vi.mock('../arxivUtils', () => ({
  searchAndFetchArxiv: (...args: unknown[]) => mockArxiv.searchAndFetchArxiv(...args),
}));

vi.mock('../apiKeyService', () => ({
  getNcbiApiKey: vi.fn().mockResolvedValue(null),
}));

import { generateNonAiResearchReportStream } from './index';

function makeInput(overrides: Partial<ResearchInput> = {}): ResearchInput {
  return {
    researchTopic: 'aspirin cardiovascular prevention',
    dateRange: '5',
    articleTypes: [],
    synthesisFocus: 'overview',
    maxArticlesToScan: 10,
    topNToSynthesize: 5,
    includeArxiv: false,
    ...overrides,
  };
}

async function collectEvents(
  input: ResearchInput,
  signal?: AbortSignal,
  options?: { getOnline?: () => boolean },
) {
  const events = [];
  for await (const event of generateNonAiResearchReportStream(input, signal, options)) {
    events.push(event);
  }
  return events;
}

describe('generateNonAiResearchReportStream', () => {
  beforeEach(() => {
    resetAllCircuitBreakers();
    vi.clearAllMocks();
    mockArxiv.searchAndFetchArxiv.mockResolvedValue([]);
  });

  it('completes a full run with real (mocked) PubMed results, streaming synthesis chunks', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue(['1', '2']);
    mockPubMed.fetchArticleDetails.mockResolvedValue([
      {
        pmid: '1',
        title: 'Aspirin for cardiovascular prevention',
        summary: 'Aspirin reduces cardiovascular events.',
        authors: 'Chen L',
        journal: 'The Lancet',
        pubYear: '2023',
        isOpenAccess: true,
      },
      {
        pmid: '2',
        title: 'Aspirin bleeding risk',
        summary: 'Aspirin increases bleeding risk in some populations.',
        authors: 'Patel R',
        journal: 'BMJ',
        pubYear: '2022',
        isOpenAccess: false,
      },
    ]);

    const events = await collectEvents(makeInput());

    const reportEvent = events.find((e) => e.report);
    expect(reportEvent?.report?.rankedArticles.length).toBe(2);

    const synthesisChunks = events.filter((e) => e.synthesisChunk).map((e) => e.synthesisChunk);
    expect(synthesisChunks.length).toBeGreaterThan(0);
    expect(synthesisChunks.join('')).toBe(reportEvent?.report?.synthesis);

    const finalPhase = events[events.length - 1].phase;
    expect(finalPhase).toMatch(/Finalizing report/);
  });

  it('falls back to the demo corpus when PubMed returns nothing', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue([]);
    mockPubMed.fetchArticleDetails.mockResolvedValue([]);

    const events = await collectEvents(makeInput());

    expect(events.some((e) => e.phase.includes('Selecting educational demo articles'))).toBe(true);
    const reportEvent = events.find((e) => e.report);
    expect(reportEvent?.report?.rankedArticles.length).toBeGreaterThan(0);
    // Demo articles use the demo: pmid namespace.
    expect(reportEvent?.report?.rankedArticles.every((a) => a.pmid.startsWith('demo:'))).toBe(true);
  });

  it('falls back to the demo corpus when PubMed search itself fails', async () => {
    mockPubMed.searchPubMedForIds.mockRejectedValue(new Error('network down'));

    const events = await collectEvents(makeInput());

    const reportEvent = events.find((e) => e.report);
    expect(reportEvent?.report?.rankedArticles.length).toBeGreaterThan(0);
  });

  it('skips PubMed/arXiv entirely and uses the demo corpus when offline', async () => {
    const events = await collectEvents(makeInput(), undefined, { getOnline: () => false });

    expect(mockPubMed.searchPubMedForIds).not.toHaveBeenCalled();
    expect(events.some((e) => e.phase.includes('Offline'))).toBe(true);
    const reportEvent = events.find((e) => e.report);
    expect(reportEvent?.report?.rankedArticles.length).toBeGreaterThan(0);
  });

  it('throws STREAM_ABORTED when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(collectEvents(makeInput(), controller.signal)).rejects.toMatchObject({
      code: 'STREAM_ABORTED',
    });
  });

  it('builds the retrieval query from the user-selected date range and article types', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue([]);
    mockPubMed.fetchArticleDetails.mockResolvedValue([]);

    await collectEvents(
      makeInput({ dateRange: '3', articleTypes: ['Randomized Controlled Trial'] }),
    );

    const [sentQuery] = mockPubMed.searchPubMedForIds.mock.calls[0];
    expect(sentQuery).toContain('[Publication Type]');
    expect(sentQuery).toContain('"Randomized Controlled Trial"');
    expect(sentQuery).toContain('[Date - Publication]');
  });

  it('does not filter by publication type or date when dateRange is "any" and no types are selected', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue([]);
    mockPubMed.fetchArticleDetails.mockResolvedValue([]);

    await collectEvents(makeInput({ dateRange: 'any', articleTypes: [] }));

    const [sentQuery] = mockPubMed.searchPubMedForIds.mock.calls[0];
    expect(sentQuery).not.toContain('[Publication Type]');
    expect(sentQuery).not.toContain('[Date - Publication]');
  });

  it('limits the report to topNToSynthesize articles even when more were curated', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue(['1', '2', '3']);
    mockPubMed.fetchArticleDetails.mockResolvedValue([
      { pmid: '1', title: 'Aspirin study one', summary: 'Findings one about aspirin.' },
      { pmid: '2', title: 'Aspirin study two', summary: 'Findings two about aspirin.' },
      { pmid: '3', title: 'Aspirin study three', summary: 'Findings three about aspirin.' },
    ]);

    const events = await collectEvents(makeInput({ topNToSynthesize: 2 }));

    const reportEvent = events.find((e) => e.report);
    expect(reportEvent?.report?.rankedArticles.length).toBe(2);
  });

  it('still attempts arXiv when the PubMed article-detail fetch fails', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue(['1']);
    mockPubMed.fetchArticleDetails.mockRejectedValue(new Error('details fetch failed'));
    mockArxiv.searchAndFetchArxiv.mockResolvedValue([
      { pmid: 'arxiv:1', title: 'A preprint', summary: 'Preprint summary about the topic.' },
    ]);

    const events = await collectEvents(makeInput({ includeArxiv: true }));

    const reportEvent = events.find((e) => e.report);
    expect(reportEvent?.report?.rankedArticles.some((a) => a.pmid === 'arxiv:1')).toBe(true);
  });

  it('includes arXiv results when includeArxiv is true', async () => {
    mockPubMed.searchPubMedForIds.mockResolvedValue([]);
    mockPubMed.fetchArticleDetails.mockResolvedValue([]);
    mockArxiv.searchAndFetchArxiv.mockResolvedValue([
      { pmid: 'arxiv:1', title: 'A preprint', summary: 'Preprint summary about the topic.' },
    ]);

    const events = await collectEvents(makeInput({ includeArxiv: true }));

    const reportEvent = events.find((e) => e.report);
    expect(reportEvent?.report?.rankedArticles.some((a) => a.pmid === 'arxiv:1')).toBe(true);
  });
});
