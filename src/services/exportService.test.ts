import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const pdfDocMock = vi.hoisted(() => {
  const chain = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === 'internal') return { pageSize: { getHeight: () => 842, getWidth: () => 595 } };
      if (prop === 'splitTextToSize') return vi.fn((s: string) => [String(s)]);
      if (prop === 'save') return vi.fn();
      return vi.fn(() => chain);
    },
  });
  return chain;
});

vi.mock('jspdf', () => ({
  default: vi.fn(() => pdfDocMock),
}));

import type {
  AggregatedArticle,
  KnowledgeBaseEntry,
  ResearchInput,
  ResearchReport,
  Settings,
} from '../types';
import {
  sanitizeCsvFormulaInjection,
  exportHistoryToJson,
  exportKnowledgeBaseToJson,
  exportCitations,
  exportInsightsToCsv,
  exportToPdf,
  exportKnowledgeBaseToPdf,
} from './exportService';

describe('sanitizeCsvFormulaInjection', () => {
  it('prefixes formula-risk starters', () => {
    expect(sanitizeCsvFormulaInjection('=1+1')).toBe('\t=1+1');
    expect(sanitizeCsvFormulaInjection('+sum')).toBe('\t+sum');
    expect(sanitizeCsvFormulaInjection('-x')).toBe('\t-x');
    expect(sanitizeCsvFormulaInjection('@ref')).toBe('\t@ref');
  });

  it('leaves safe strings', () => {
    expect(sanitizeCsvFormulaInjection('normal')).toBe('normal');
    expect(sanitizeCsvFormulaInjection(' PMID123')).toBe(' PMID123');
  });
});

describe('export helpers', () => {
  const originalCreate = document.createElement.bind(document);
  const anchorMocks: { click: ReturnType<typeof vi.fn>; href: string }[] = [];

  beforeEach(() => {
    anchorMocks.length = 0;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const mock = { click: vi.fn(), href: '', download: '' };
        anchorMocks.push(mock);
        return mock as unknown as HTMLAnchorElement;
      }
      return originalCreate(tag);
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue('blob:mock'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exportInsightsToCsv triggers download', () => {
    exportInsightsToCsv([{ question: 'Q', answer: 'A', supportingArticles: ['1'] }], 'topic');
    expect(anchorMocks.length).toBe(1);
    expect(anchorMocks[0].click).toHaveBeenCalled();
  });

  it('exportHistoryToJson triggers download', () => {
    const entries = [
      {
        id: '1',
        title: 'Entry',
        timestamp: Date.now(),
        articles: [],
        sourceType: 'research' as const,
        input: {
          researchTopic: 't',
          dateRange: 'any',
          articleTypes: [],
          synthesisFocus: 'x',
          maxArticlesToScan: 10,
          topNToSynthesize: 3,
        },
        report: {
          synthesis: '',
          rankedArticles: [],
          generatedQueries: [],
          aiGeneratedInsights: [],
          overallKeywords: [],
        },
      },
    ] as KnowledgeBaseEntry[];
    exportHistoryToJson(entries);
    expect(anchorMocks.length).toBe(1);
    expect(anchorMocks[0].click).toHaveBeenCalled();
  });

  it('exportKnowledgeBaseToJson triggers download', () => {
    const articles = [{ pmid: '1' }] as AggregatedArticle[];
    exportKnowledgeBaseToJson(articles);
    expect(anchorMocks[0].click).toHaveBeenCalled();
  });

  it('exportKnowledgeBaseToPdf runs exporter', () => {
    const pdfSettings: Settings['export']['pdf'] = {
      includeCoverPage: false,
      preparedFor: '',
      includeSynthesis: true,
      includeInsights: false,
      includeQueries: false,
      includeToc: false,
      includeHeader: false,
      includeFooter: false,
    };
    const agg: AggregatedArticle = {
      pmid: '9',
      title: 'T',
      authors: 'A',
      journal: 'J',
      pubYear: '2021',
      summary: 'S',
      relevanceScore: 1,
      relevanceExplanation: '',
      keywords: [],
      isOpenAccess: false,
      sourceTitle: 'src',
      sourceId: 'id',
    };
    expect(() => exportKnowledgeBaseToPdf([agg], 'KB', () => [], pdfSettings)).not.toThrow();
  });

  it('exportToPdf runs PdfExporter path', () => {
    const pdfSettings: Settings['export']['pdf'] = {
      includeCoverPage: false,
      preparedFor: 'Tester',
      includeSynthesis: true,
      includeInsights: false,
      includeQueries: true,
      includeToc: false,
      includeHeader: false,
      includeFooter: false,
    };
    const report: ResearchReport = {
      synthesis: '## Synth',
      rankedArticles: [
        {
          pmid: '1',
          title: 'Title',
          authors: 'Author',
          journal: 'J',
          pubYear: '2020',
          summary: 'Abstract',
          relevanceScore: 90,
          relevanceExplanation: 'Because',
          keywords: ['k'],
          isOpenAccess: true,
          articleType: 'Trial',
          pmcId: 'PMC1',
        },
      ],
      generatedQueries: [{ query: 'q', explanation: 'e' }],
      aiGeneratedInsights: [],
      overallKeywords: [{ keyword: 'kw', frequency: 2 }],
    };
    const input: ResearchInput = {
      researchTopic: 'Cancer',
      dateRange: 'any',
      articleTypes: [],
      synthesisFocus: 'outcomes',
      maxArticlesToScan: 10,
      topNToSynthesize: 3,
    };
    expect(() => exportToPdf(report, input, pdfSettings)).not.toThrow();
  });

  it('exportCitations builds bib file', () => {
    const articles: AggregatedArticle[] = [
      {
        pmid: '1',
        title: 'T',
        authors: 'A1, A2',
        journal: 'J',
        pubYear: '2020',
        summary: 'S',
        relevanceScore: 1,
        relevanceExplanation: '',
        keywords: ['k'],
        isOpenAccess: false,
        customTags: [],
        sourceTitle: 'src',
        sourceId: 'sid',
      },
    ];
    const cite: Settings['export']['citation'] = {
      includeAbstract: true,
      includeKeywords: true,
      includeTags: false,
      includePmcid: false,
    };
    exportCitations(articles, cite, 'bib');
    expect(anchorMocks[0].click).toHaveBeenCalled();
  });
});
