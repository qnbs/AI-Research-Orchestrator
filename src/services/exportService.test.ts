import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const pdfTextSpy = vi.hoisted(() => vi.fn());
const pdfOutputSpy = vi.hoisted(() => vi.fn(() => new ArrayBuffer(64)));
const pdfSaveSpy = vi.hoisted(() => vi.fn());
const pdfDocMock = vi.hoisted(() => {
  const chain = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === 'internal') return { pageSize: { getHeight: () => 842, getWidth: () => 595 } };
      if (prop === 'splitTextToSize') return vi.fn((s: string) => [String(s)]);
      if (prop === 'save') return pdfSaveSpy;
      if (prop === 'output') return pdfOutputSpy;
      if (prop === 'text') {
        return (...args: unknown[]) => {
          pdfTextSpy(...args);
          return chain;
        };
      }
      return vi.fn(() => chain);
    },
  });
  return chain;
});

vi.mock('jspdf', () => ({
  // Vitest 4: `new jsPDF()` requires a constructable mock (function/class, not arrow).
  default: vi.fn().mockImplementation(function MockJsPdf(this: Record<string, unknown>) {
    return pdfDocMock;
  }),
}));

import type {
  AggregatedArticle,
  KnowledgeBaseEntry,
  ResearchInput,
  ResearchReport,
  Settings,
} from '../types';
import { AppError } from '../lib/errors';
import { MAX_EXPORT_BYTES } from '../lib/exportSafety';
import {
  sanitizeCsvFormulaInjection,
  exportHistoryToJson,
  exportKnowledgeBaseToJson,
  exportCitations,
  exportInsightsToCsv,
  exportToPdf,
  exportKnowledgeBaseToPdf,
  exportToCsv,
} from './exportService';

describe('sanitizeCsvFormulaInjection', () => {
  it('prefixes formula-risk starters including whitespace, Unicode, DDE, and script tags', () => {
    expect(sanitizeCsvFormulaInjection('=1+1')).toBe('\t=1+1');
    expect(sanitizeCsvFormulaInjection('+sum')).toBe('\t+sum');
    expect(sanitizeCsvFormulaInjection('-x')).toBe('\t-x');
    expect(sanitizeCsvFormulaInjection('@ref')).toBe('\t@ref');
    expect(sanitizeCsvFormulaInjection(' =SUM(1)')).toBe('\t =SUM(1)');
    expect(sanitizeCsvFormulaInjection('\uFEFF=1+1')).toBe('\t=1+1');
    expect(sanitizeCsvFormulaInjection('\uFF1D1+1')).toBe('\t\uFF1D1+1');
    expect(sanitizeCsvFormulaInjection("|cmd|' /C calc'!A0")).toBe("\t|cmd|' /C calc'!A0");
    expect(sanitizeCsvFormulaInjection('<script>alert(1)</script>')).toBe(
      '\t<script>alert(1)</script>',
    );
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
    vi.useRealTimers();
    anchorMocks.length = 0;
    pdfTextSpy.mockClear();
    pdfSaveSpy.mockClear();
    pdfOutputSpy.mockReset();
    pdfOutputSpy.mockReturnValue(new ArrayBuffer(64));
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
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exportInsightsToCsv triggers download', () => {
    exportInsightsToCsv([{ question: 'Q', answer: 'A', supportingArticles: ['1'] }], 'topic');
    expect(anchorMocks.length).toBe(1);
    expect(anchorMocks[0].click).toHaveBeenCalled();
  });

  it('exportHistoryToJson includes build release meta in wrapper', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T12:00:00.000Z'));
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
    vi.useRealTimers();
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    const payload = await blob.text();
    const parsed = JSON.parse(payload) as {
      meta: {
        appVersion: string;
        buildCommitSha: string;
        dexieSchemaVersion: number;
        swCacheVersion: string;
        importEnvelopeVersion: number;
        type: string;
        exportDate: string;
      };
    };
    expect(parsed.meta.type).toBe('history');
    expect(parsed.meta.appVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(parsed.meta.buildCommitSha.length).toBeGreaterThan(0);
    expect(parsed.meta.dexieSchemaVersion).toBeGreaterThan(0);
    expect(parsed.meta.swCacheVersion).toBeTruthy();
    expect(parsed.meta.importEnvelopeVersion).toBe(1);
    expect(parsed.meta.exportDate).toBe('2026-08-02T12:00:00.000Z');
    vi.useRealTimers();
  });

  it('exportToPdf cover uses report generation provenance label', () => {
    const pdfSettings: Settings['export']['pdf'] = {
      includeCoverPage: true,
      preparedFor: 'Reviewer',
      includeSynthesis: false,
      includeInsights: false,
      includeQueries: false,
      includeToc: false,
      includeHeader: false,
      includeFooter: false,
    };
    const report: ResearchReport = {
      synthesis: '',
      rankedArticles: [],
      generatedQueries: [],
      aiGeneratedInsights: [],
      overallKeywords: [],
      generationProvenance: {
        appVersion: '0.3.9',
        buildCommitSha: 'legacysha',
        dexieSchemaVersion: 4,
        swCacheVersion: 'v0',
        generatedAt: 1_700_000_000_000,
      },
    };
    const input: ResearchInput = {
      researchTopic: 'Topic',
      dateRange: 'any',
      articleTypes: [],
      synthesisFocus: 'outcomes',
      maxArticlesToScan: 10,
      topNToSynthesize: 3,
    };
    exportToPdf(report, input, pdfSettings);
    expect(pdfTextSpy).toHaveBeenCalledWith('v0.3.9 (legacysha)', expect.any(Number), 105, {
      align: 'center',
    });
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

  it('exportToCsv triggers download with sanitized cells', async () => {
    const articles: AggregatedArticle[] = [
      {
        pmid: '1',
        title: '=HACK',
        authors: 'A',
        journal: 'J',
        pubYear: '2020',
        summary: 'S',
        relevanceScore: 1,
        relevanceExplanation: '',
        keywords: ['k'],
        isOpenAccess: true,
        pmcId: 'PMC1',
        sourceTitle: 'src',
        sourceId: 'sid',
      },
    ];
    exportToCsv(articles, 'topic', {
      columns: ['pmid', 'title', 'URL'],
      delimiter: ',',
    });
    expect(anchorMocks[0].click).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    const csv = await blob.text();
    expect(csv).toContain('\t=HACK');
    expect(csv).not.toContain(',=HACK,');
  });

  it('exportToCsv prefixes Unicode, DDE, whitespace, and script payloads', async () => {
    const articles: AggregatedArticle[] = [
      {
        pmid: '1',
        title: '\uFF1D1+1',
        authors: ' =cmd',
        journal: "|cmd|' /C calc'!A0",
        pubYear: '2020',
        summary: '<script>alert(1)</script>',
        relevanceScore: 1,
        relevanceExplanation: '',
        keywords: ['k'],
        isOpenAccess: true,
        pmcId: 'PMC1',
        sourceTitle: 'src',
        sourceId: 'sid',
      },
    ];
    exportToCsv(articles, 'topic', {
      columns: ['title', 'authors', 'journal', 'summary'],
      delimiter: ',',
    });
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    const csv = await blob.text();
    expect(csv).toContain('\t\uFF1D1+1');
    expect(csv).toContain('\t =cmd');
    expect(csv).toContain("\t|cmd|' /C calc'!A0");
    expect(csv).toContain('\t<script>alert(1)</script>');
  });

  it('exportToCsv refuses an oversized payload without downloading', () => {
    const articles: AggregatedArticle[] = [
      {
        pmid: '1',
        title: 'T',
        authors: 'A',
        journal: 'J',
        pubYear: '2020',
        summary: 'x'.repeat(MAX_EXPORT_BYTES + 1),
        relevanceScore: 1,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: false,
        sourceTitle: 'src',
        sourceId: 'sid',
      },
    ];
    expect(() => exportToCsv(articles, 'topic', { columns: ['summary'], delimiter: ',' })).toThrow(
      AppError,
    );
    expect(anchorMocks.length).toBe(0);
  });

  it('exportToPdf refuses an oversized ArrayBuffer without saving', () => {
    pdfOutputSpy.mockReturnValue(new ArrayBuffer(MAX_EXPORT_BYTES + 1));
    const pdfSettings: Settings['export']['pdf'] = {
      includeCoverPage: false,
      preparedFor: '',
      includeSynthesis: false,
      includeInsights: false,
      includeQueries: false,
      includeToc: false,
      includeHeader: false,
      includeFooter: false,
    };
    const report: ResearchReport = {
      synthesis: '',
      rankedArticles: [],
      generatedQueries: [],
      aiGeneratedInsights: [],
      overallKeywords: [],
    };
    const input: ResearchInput = {
      researchTopic: 'Topic',
      dateRange: 'any',
      articleTypes: [],
      synthesisFocus: 'outcomes',
      maxArticlesToScan: 10,
      topNToSynthesize: 3,
    };
    expect(() => exportToPdf(report, input, pdfSettings)).toThrow(AppError);
    expect(pdfSaveSpy).not.toHaveBeenCalled();
  });

  it('exportToPdf with cover, toc, insights, header and footer paths', () => {
    const pdfSettings: Settings['export']['pdf'] = {
      includeCoverPage: true,
      preparedFor: 'Reviewer',
      includeSynthesis: true,
      includeInsights: true,
      includeQueries: true,
      includeToc: true,
      includeHeader: true,
      includeFooter: true,
    };
    const report: ResearchReport = {
      synthesis: '## Synth\nLong synthesis text that may wrap across lines for PDF body rendering.',
      rankedArticles: [
        {
          pmid: '1',
          title: 'Title with custom tags',
          authors: 'Author',
          journal: 'J',
          pubYear: '2020',
          summary: 'Abstract',
          aiSummary: 'AI summary',
          relevanceScore: 90,
          relevanceExplanation: 'Because',
          keywords: ['k'],
          customTags: ['tag1'],
          isOpenAccess: true,
          articleType: 'Trial',
          pmcId: 'PMC1',
        },
      ],
      generatedQueries: [{ query: 'q', explanation: 'e' }],
      aiGeneratedInsights: [{ question: 'Q?', answer: 'A.', supportingArticles: ['1'] }],
      overallKeywords: [{ keyword: 'kw', frequency: 2 }],
    };
    const input: ResearchInput = {
      researchTopic: 'Cancer immunotherapy outcomes review topic',
      dateRange: '5',
      articleTypes: ['Randomized Controlled Trial'],
      synthesisFocus: 'outcomes',
      maxArticlesToScan: 10,
      topNToSynthesize: 3,
    };
    expect(() => exportToPdf(report, input, pdfSettings)).not.toThrow();
  });

  it('exportCitations bib escapes backslash and special chars in a single pass', () => {
    const articles: AggregatedArticle[] = [
      {
        pmid: '1',
        title: 'Path C:\\data & 50% {reserved} test',
        authors: 'A1',
        journal: 'J',
        pubYear: '2020',
        summary: 'S',
        relevanceScore: 1,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: false,
        sourceTitle: 'src',
        sourceId: 'sid',
      },
    ];
    const cite: Settings['export']['citation'] = {
      includeAbstract: false,
      includeKeywords: false,
      includeTags: false,
      includePmcid: false,
    };
    exportCitations(articles, cite, 'bib');
    const blob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0] as Blob;
    return blob.text().then((content) => {
      // Backslash is escaped to a LaTeX command, and that command's own `{}` are not
      // re-escaped by the later brace-escaping step (single-pass, not chained replaces).
      expect(content).toContain('\\textbackslash{}data');
      expect(content).not.toContain('\\textbackslash\\{\\}data');
      expect(content).toContain('\\&');
      expect(content).toContain('\\%');
      expect(content).toContain('\\{reserved\\}');
    });
  });

  it('exportCitations bib strips HTML markup before BibTeX-escaping', () => {
    const articles: AggregatedArticle[] = [
      {
        pmid: '1',
        title: '<b>Bold</b> title with <script>alert(1)</script> markup',
        authors: 'A1',
        journal: 'J',
        pubYear: '2020',
        summary: 'S',
        relevanceScore: 1,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: false,
        sourceTitle: 'src',
        sourceId: 'sid',
      },
    ];
    const cite: Settings['export']['citation'] = {
      includeAbstract: false,
      includeKeywords: false,
      includeTags: false,
      includePmcid: false,
    };
    exportCitations(articles, cite, 'bib');
    const blob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0] as Blob;
    return blob.text().then((content) => {
      expect(content.toLowerCase()).not.toContain('<script');
      expect(content).not.toContain('<b>');
      expect(content).toContain('Bold title with');
    });
  });

  it('exportCitations ris strips malformed nested tags without reconstructing them', () => {
    const articles: AggregatedArticle[] = [
      {
        pmid: '1',
        title: '<scr<script>ipt>alert(1)</scr</script>ipt>Safe Title',
        authors: 'A1',
        journal: 'J',
        pubYear: '2020',
        summary: 'S',
        relevanceScore: 1,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: false,
        sourceTitle: 'src',
        sourceId: 'sid',
      },
    ];
    const cite: Settings['export']['citation'] = {
      includeAbstract: false,
      includeKeywords: false,
      includeTags: false,
      includePmcid: false,
    };
    exportCitations(articles, cite, 'ris');
    const blob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0] as Blob;
    return blob.text().then((content) => {
      expect(content.toLowerCase()).not.toContain('<script');
      expect(content).toContain('Safe Title');
    });
  });

  it('exportCitations bib decodes HTML entities via the stripHtmlTags RETURN_DOM_FRAGMENT path', () => {
    const articles: AggregatedArticle[] = [
      {
        pmid: '1',
        title: 'Risk &amp; benefit of therapy',
        authors: 'A1',
        journal: 'J',
        pubYear: '2020',
        summary: 'S',
        relevanceScore: 1,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: false,
        sourceTitle: 'src',
        sourceId: 'sid',
      },
    ];
    const cite: Settings['export']['citation'] = {
      includeAbstract: false,
      includeKeywords: false,
      includeTags: false,
      includePmcid: false,
    };
    exportCitations(articles, cite, 'bib');
    const blob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0] as Blob;
    return blob.text().then((content) => {
      // "&amp;" must decode to a literal "&" (proving DOMPurify's
      // RETURN_DOM_FRAGMENT + .textContent still decodes entities like the
      // old innerHTML-readback path did), which BibTeX then escapes to "\&" -
      // not survive as the literal, un-decoded string "&amp;".
      expect(content).toContain('Risk \\& benefit of');
      expect(content).not.toContain('&amp;');
    });
  });

  it('exportCitations bib leaves HTML-entity-encoded angle brackets as inert decoded text, never re-parsed as a tag', () => {
    const articles: AggregatedArticle[] = [
      {
        pmid: '1',
        title: 'Safe title &lt;script&gt;alert(1)&lt;/script&gt;',
        authors: 'A1',
        journal: 'J',
        pubYear: '2020',
        summary: 'S',
        relevanceScore: 1,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: false,
        sourceTitle: 'src',
        sourceId: 'sid',
      },
    ];
    const cite: Settings['export']['citation'] = {
      includeAbstract: false,
      includeKeywords: false,
      includeTags: false,
      includePmcid: false,
    };
    exportCitations(articles, cite, 'bib');
    const blob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0] as Blob;
    return blob.text().then((content) => {
      // HTML entity references decode at the character level during parsing, not
      // as a second reparse pass over the result - "&lt;script&gt;" becomes the
      // literal characters "<script>" as plain text content, never a real,
      // strippable <script> element. This is exactly why the output is safe to
      // write as plain text (BibTeX field / clipboard): the decoded angle
      // brackets can never execute, only display, in any of this app's sinks.
      expect(content).toContain('Safe title <script>alert(1)</script>');
      expect(content).not.toContain('&lt;script&gt;');
    });
  });

  it('exportCitations builds ris file with optional fields', () => {
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
        customTags: ['t'],
        pmcId: 'PMC9',
        sourceTitle: 'src',
        sourceId: 'sid',
      },
    ];
    const cite: Settings['export']['citation'] = {
      includeAbstract: true,
      includeKeywords: true,
      includeTags: true,
      includePmcid: true,
    };
    exportCitations(articles, cite, 'ris');
    expect(anchorMocks[0].click).toHaveBeenCalled();
  });

  it('exportKnowledgeBaseToPdf with cover page', () => {
    const pdfSettings: Settings['export']['pdf'] = {
      includeCoverPage: true,
      preparedFor: 'Lab',
      includeSynthesis: true,
      includeInsights: true,
      includeQueries: false,
      includeToc: false,
      includeHeader: true,
      includeFooter: true,
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
      keywords: ['k'],
      customTags: ['x'],
      isOpenAccess: false,
      sourceTitle: 'src',
      sourceId: 'id',
      pmcId: 'PMC2',
    };
    expect(() =>
      exportKnowledgeBaseToPdf(
        [agg],
        'KB Title',
        () => [{ question: 'Q', answer: 'A', supportingArticles: ['9'] }],
        pdfSettings,
      ),
    ).not.toThrow();
  });
});
