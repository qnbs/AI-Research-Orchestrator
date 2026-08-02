import { describe, expect, it } from 'vitest';
import type { RankedArticle, ResearchEntry, ResearchReport } from '../types';
import {
  isAllDemoCorpus,
  migrateKnowledgeBaseEntryDemoProvenance,
  stampDemoArticleForMigration,
  stampDemoReportProvenance,
} from './demoCorpusMigration';

const demoArticle: RankedArticle = {
  pmid: 'demo:aspirin-1',
  title: 'Demo',
  authors: 'A',
  journal: 'J',
  pubYear: '2020',
  summary: 's',
  relevanceScore: 90,
  relevanceExplanation: 'r',
  keywords: [],
  isOpenAccess: false,
};

const liveArticle: RankedArticle = {
  pmid: '12345678',
  title: 'Live',
  authors: 'B',
  journal: 'J',
  pubYear: '2021',
  summary: 's',
  relevanceScore: 80,
  relevanceExplanation: 'r',
  keywords: [],
  isOpenAccess: true,
};

describe('demoCorpusMigration', () => {
  it('stamps demo article sourceClass and typed articleId', () => {
    const stamped = stampDemoArticleForMigration(demoArticle);
    expect(stamped.sourceClass).toBe('demo-synthetic');
    expect(stamped.articleId).toEqual({ type: 'demo', value: 'aspirin-1' });
  });

  it('leaves non-demo articles unchanged', () => {
    expect(stampDemoArticleForMigration(liveArticle)).toEqual(liveArticle);
  });

  it('detects all-demo vs mixed corpora', () => {
    expect(isAllDemoCorpus([demoArticle])).toBe(true);
    expect(isAllDemoCorpus([demoArticle, liveArticle])).toBe(false);
    expect(isAllDemoCorpus([])).toBe(false);
  });

  it('stamps demo-only report provenance and demotes verified trust', () => {
    const report: ResearchReport = {
      generatedQueries: [],
      rankedArticles: [demoArticle],
      synthesis: 'demo text',
      aiGeneratedInsights: [],
      overallKeywords: [],
      groundedSynthesis: {
        mode: 'extractive-template',
        claims: [{ text: 'c', pmids: ['demo:aspirin-1'] }],
        trustLevel: 'verified',
      },
    };
    const next = stampDemoReportProvenance(report);
    expect(next.corpusClass).toBe('demo-only');
    expect(next.retrievalOutcome).toBe('educational_demo');
    expect(next.groundedSynthesis?.trustLevel).toBe('narrative-draft');
    expect(next.rankedArticles[0]?.sourceClass).toBe('demo-synthetic');
  });

  it('does not relabel mixed corpora as demo-only', () => {
    const report: ResearchReport = {
      generatedQueries: [],
      rankedArticles: [demoArticle, liveArticle],
      synthesis: 'mixed',
      aiGeneratedInsights: [],
      overallKeywords: [],
      corpusClass: 'mixed-retrieved',
      retrievalOutcome: 'ok',
    };
    const next = stampDemoReportProvenance(report);
    expect(next.corpusClass).toBe('mixed-retrieved');
    expect(next.retrievalOutcome).toBe('ok');
  });

  it('handles missing rankedArticles arrays without throwing', () => {
    const report = {
      generatedQueries: [],
      rankedArticles: undefined,
      synthesis: '',
      aiGeneratedInsights: [],
      overallKeywords: [],
    } as unknown as ResearchReport;
    expect(() => stampDemoReportProvenance(report)).not.toThrow();
    expect(stampDemoReportProvenance(report).rankedArticles).toEqual([]);
  });

  it('migrates legacy demo KB entries (v5 → v6 shape)', () => {
    const entry: ResearchEntry = {
      id: 'demo-research-aspirin',
      timestamp: 1,
      title: 'Demo aspirin',
      sourceType: 'research',
      articles: [demoArticle],
      input: {
        researchTopic: 'aspirin',
        dateRange: 'any',
        articleTypes: [],
        synthesisFocus: 'overview',
        maxArticlesToScan: 10,
        topNToSynthesize: 5,
      },
      report: {
        generatedQueries: [],
        rankedArticles: [demoArticle],
        synthesis: 'demo',
        aiGeneratedInsights: [],
        overallKeywords: [],
        groundedSynthesis: {
          mode: 'extractive-template',
          claims: [{ text: 'c', pmids: ['demo:aspirin-1'] }],
          trustLevel: 'verified',
        },
      },
    };

    const migrated = migrateKnowledgeBaseEntryDemoProvenance(entry) as ResearchEntry;
    expect(migrated.articles[0]?.sourceClass).toBe('demo-synthetic');
    expect(migrated.report.corpusClass).toBe('demo-only');
    expect(migrated.report.retrievalOutcome).toBe('educational_demo');
    expect(migrated.report.groundedSynthesis?.trustLevel).toBe('narrative-draft');
    expect(migrated.input.educationalDemoMode).toBe(true);
  });
});
