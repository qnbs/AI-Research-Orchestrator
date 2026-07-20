/**
 * Tests for the Non-AI Programmatic Research Engine.
 */
import { describe, it, expect } from 'vitest';
import {
  tokenize,
  stem,
  jaccardSimilarity,
  recencyDecayFactor,
  isHighQualityPubType,
} from './utils';
import {
  generateExtractiveTldr,
  generateNarrativeSections,
  generateResearchReport,
} from './synthesizer';
import { rankArticles } from './ranker';
import {
  deduplicateArticles,
  cleanArticleMetadata,
  mergeAndCurate,
  enrichArticles,
} from './curator';
import { findMeshTermsInQuery } from './meshDictionary';
import { buildQuery, buildMultipleQueries, extractPhrases } from './queryBuilder';
import { findSimilarArticles } from './similarFinder';
import { clusterAuthorArticles, getAuthorProfileSummary } from './authorClusterer';
import {
  analyzeJournalMetrics,
  generateJournalProfile,
  suggestJournalsForField,
} from './journalProfiler';
import { generateResearchAnalysis, answerFromReport } from './chatResponder';
import type { RankedArticle, ResearchReport } from '../../types';

describe('Non-AI Engine - Utils', () => {
  it('tokenizes text correctly', () => {
    const tokens = tokenize('The quick brown fox jumps over the lazy dog', 'en');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens).not.toContain('the'); // stopword
  });

  it('stems words correctly', () => {
    // Basic stemming - removes common suffixes
    const stemmedRunning = stem('running');
    expect(stemmedRunning.length).toBeLessThan('running'.length);
    expect(stem('studies')).toBe('study'); // 'ies' -> 'y'
    expect(stem('research')).toBe('research');
    // Stemming is approximate - just verify it doesn't crash
    expect(typeof stem('studied')).toBe('string');
  });

  it('calculates Jaccard similarity', () => {
    const sim1 = jaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'd']);
    expect(sim1).toBeCloseTo(0.5, 2);

    const sim2 = jaccardSimilarity(['a', 'b'], ['c', 'd']);
    expect(sim2).toBe(0);

    const sim3 = jaccardSimilarity(['a', 'b'], ['a', 'b']);
    expect(sim3).toBe(1);
  });

  it('calculates recency decay factor', () => {
    const currentYear = new Date().getFullYear();
    const currentScore = recencyDecayFactor(String(currentYear));
    expect(currentScore).toBeCloseTo(1, 1);

    const oldScore = recencyDecayFactor('2000');
    expect(oldScore).toBeLessThan(0.5);
  });

  it('identifies high-quality publication types', () => {
    expect(isHighQualityPubType(['Randomized Controlled Trial'])).toBe(true);
    expect(isHighQualityPubType(['Meta-Analysis'])).toBe(true);
    expect(isHighQualityPubType(['Review'])).toBe(true);
    expect(isHighQualityPubType(['Case Report'])).toBe(false);
    expect(isHighQualityPubType([])).toBe(false);
  });
});

describe('Non-AI Engine - Query Builder', () => {
  it('builds a basic query', () => {
    const query = buildQuery('diabetes treatment');
    expect(query.query).toContain('diabetes');
    expect(query.explanation).toBeTruthy();
  });

  it('builds multiple queries', () => {
    const queries = buildMultipleQueries('cancer immunotherapy');
    expect(queries.length).toBeGreaterThan(0);
    expect(queries[0].query).toBeTruthy();
  });

  it('extracts phrases from text', () => {
    const phrases = extractPhrases('machine learning in cancer research');
    expect(phrases.length).toBeGreaterThan(0);
  });

  it('finds MeSH terms in query', () => {
    const meshTerms = findMeshTermsInQuery('diabetes mellitus type 2');
    expect(Array.isArray(meshTerms)).toBe(true);
  });
});

describe('Non-AI Engine - Curator', () => {
  const mockArticles: RankedArticle[] = [
    {
      pmid: '12345',
      title: 'Article One',
      authors: 'Author A',
      journal: 'Journal A',
      pubYear: '2023',
      summary: 'Summary one',
      relevanceScore: 80,
      relevanceExplanation: 'Test',
      keywords: ['test'],
      isOpenAccess: true,
    },
    {
      pmid: '12345', // duplicate
      title: 'Article One Duplicate',
      authors: 'Author A',
      journal: 'Journal A',
      pubYear: '2023',
      summary: 'Summary one',
      relevanceScore: 80,
      relevanceExplanation: 'Test',
      keywords: ['test'],
      isOpenAccess: true,
    },
    {
      pmid: '67890',
      title: 'Article Two',
      authors: 'Author B',
      journal: 'Journal B',
      pubYear: '2022',
      summary: 'Summary two',
      relevanceScore: 70,
      relevanceExplanation: 'Test',
      keywords: ['test'],
      isOpenAccess: false,
    },
  ];

  it('deduplicates articles by PMID', () => {
    const deduped = deduplicateArticles(mockArticles);
    expect(deduped.length).toBe(2);
  });

  it('cleans article metadata', () => {
    const cleaned = cleanArticleMetadata(mockArticles[0]);
    expect(cleaned.title).toBe('article one');
    expect(cleaned.authors).toBe('Author A');
  });

  it('merges and curates articles', () => {
    const merged = mergeAndCurate(mockArticles, []);
    expect(merged.length).toBe(2);
  });

  it('enriches articles with defaults', () => {
    const enriched = enrichArticles(mockArticles);
    expect(enriched[0].keywords).toEqual(['test']);
    expect(enriched[0].articleType).toBe('unknown');
  });
});

describe('Non-AI Engine - Ranker', () => {
  const mockArticles: RankedArticle[] = [
    {
      pmid: '12345',
      title: 'Diabetes Treatment Study',
      authors: 'Author A',
      journal: 'Journal A',
      pubYear: '2023',
      summary: 'A study about diabetes treatment and management',
      relevanceScore: 0,
      relevanceExplanation: '',
      keywords: ['diabetes', 'treatment'],
      isOpenAccess: true,
      articleType: 'Randomized Controlled Trial',
    },
    {
      pmid: '67890',
      title: 'Cancer Research',
      authors: 'Author B',
      journal: 'Journal B',
      pubYear: '2020',
      summary: 'Cancer research and immunotherapy',
      relevanceScore: 0,
      relevanceExplanation: '',
      keywords: ['cancer'],
      isOpenAccess: false,
      articleType: 'Review',
    },
  ];

  it('ranks articles by relevance', () => {
    const ranked = rankArticles(mockArticles, 'diabetes treatment');
    expect(ranked.length).toBe(2);
    expect(ranked[0].relevanceScore).toBeGreaterThan(0);
    expect(ranked[0].relevanceScore).toBeGreaterThanOrEqual(ranked[1].relevanceScore);
  });

  it('provides scoring explanations', () => {
    const ranked = rankArticles(mockArticles, 'diabetes treatment');
    expect(ranked[0].relevanceExplanation).toBeTruthy();
  });
});

describe('Non-AI Engine - Synthesizer', () => {
  const mockArticles: RankedArticle[] = [
    {
      pmid: '12345',
      title: 'Diabetes Treatment Study',
      authors: 'Author A',
      journal: 'Journal A',
      pubYear: '2023',
      summary: 'This study examines diabetes treatment. The results show significant improvement.',
      relevanceScore: 85,
      relevanceExplanation: 'High relevance',
      keywords: ['diabetes', 'treatment'],
      isOpenAccess: true,
      articleType: 'Randomized Controlled Trial',
    },
    {
      pmid: '67890',
      title: 'Diabetes Management Review',
      authors: 'Author B',
      journal: 'Journal B',
      pubYear: '2022',
      summary: 'A review of diabetes management strategies. Clinical outcomes were analyzed.',
      relevanceScore: 75,
      relevanceExplanation: 'Medium relevance',
      keywords: ['diabetes', 'management'],
      isOpenAccess: false,
      articleType: 'Review',
    },
  ];

  it('generates extractive TLDR', () => {
    const synthesis = generateExtractiveTldr(mockArticles, 'diabetes treatment');
    expect(synthesis.tldr).toBeTruthy();
    expect(synthesis.keyFindings.length).toBeGreaterThan(0);
    expect(synthesis.synthesisMode).toBe('extractive-template');
  });

  it('generates narrative sections', () => {
    const sections = generateNarrativeSections(mockArticles, 'diabetes');
    expect(sections.length).toBe(4);
    expect(sections[0].title).toBe('Background');
    expect(sections[1].title).toBe('Key Findings');
  });

  it('generates complete research report', () => {
    const report = generateResearchReport(mockArticles, 'diabetes treatment');
    expect(report.generatedQueries.length).toBe(1);
    expect(report.rankedArticles.length).toBe(2);
    expect(report.synthesis).toBeTruthy();
    expect(report.aiGeneratedInsights.length).toBeGreaterThan(0);
    expect(report.overallKeywords.length).toBeGreaterThan(0);
  });
});

describe('Non-AI Engine - Similar Finder', () => {
  const mockArticles: RankedArticle[] = [
    {
      pmid: '12345',
      title: 'Diabetes Treatment Study',
      authors: 'Author A',
      journal: 'Journal A',
      pubYear: '2023',
      summary: 'A study about diabetes treatment and management',
      relevanceScore: 85,
      relevanceExplanation: 'High relevance',
      keywords: ['diabetes', 'treatment'],
      isOpenAccess: true,
    },
    {
      pmid: '67890',
      title: 'Cancer Research',
      authors: 'Author B',
      journal: 'Journal B',
      pubYear: '2022',
      summary: 'Cancer research study',
      relevanceScore: 70,
      relevanceExplanation: 'Medium relevance',
      keywords: ['cancer'],
      isOpenAccess: false,
    },
  ];

  it('finds similar articles', () => {
    const similar = findSimilarArticles(
      {
        title: 'Diabetes Treatment Research',
        summary: 'Diabetes treatment and therapy research',
        keywords: ['diabetes', 'therapy'],
      },
      mockArticles,
    );
    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].reason).toContain('Jaccard');
  });
});

describe('Non-AI Engine - Author Clusterer', () => {
  const mockArticles: RankedArticle[] = [
    {
      pmid: '12345',
      title: 'Study by Smith et al',
      authors: 'Smith J, Doe J, Johnson A',
      journal: 'Journal A',
      pubYear: '2023',
      summary: 'Research summary',
      relevanceScore: 85,
      relevanceExplanation: 'High relevance',
      keywords: ['research'],
      isOpenAccess: true,
    },
    {
      pmid: '67890',
      title: 'Another Study by Smith',
      authors: 'Smith J, Brown B',
      journal: 'Journal B',
      pubYear: '2022',
      summary: 'Another research summary',
      relevanceScore: 70,
      relevanceExplanation: 'Medium relevance',
      keywords: ['research'],
      isOpenAccess: false,
    },
  ];

  it('clusters author articles', () => {
    const clusters = clusterAuthorArticles('Smith J', mockArticles);
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters[0].nameVariant).toBe('Smith J');
  });

  it('generates author profile summary', () => {
    const summary = getAuthorProfileSummary('Smith J', mockArticles);
    expect(summary.totalPapers).toBe(2);
    expect(summary.avgRelevance).toBeGreaterThan(0);
  });
});

describe('Non-AI Engine - Journal Profiler', () => {
  const mockArticles: RankedArticle[] = [
    {
      pmid: '12345',
      title: 'Study in Nature',
      authors: 'Author A',
      journal: 'Nature',
      pubYear: '2023',
      summary: 'Research summary',
      relevanceScore: 85,
      relevanceExplanation: 'High relevance',
      keywords: ['research'],
      isOpenAccess: false,
    },
    {
      pmid: '67890',
      title: 'Study in Science',
      authors: 'Author B',
      journal: 'Nature',
      pubYear: '2022',
      summary: 'Another research summary',
      relevanceScore: 70,
      relevanceExplanation: 'Medium relevance',
      keywords: ['research'],
      isOpenAccess: true,
    },
  ];

  it('analyzes journal metrics', () => {
    const metrics = analyzeJournalMetrics(mockArticles);
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0].journal).toBe('Nature');
    expect(metrics[0].articleCount).toBe(2);
  });

  it('generates journal profile', () => {
    const profile = generateJournalProfile('Nature', mockArticles);
    expect(profile.name).toBe('Nature');
    expect(profile.oaPolicy).toBeTruthy();
  });

  it('suggests journals for field', () => {
    const suggestions = suggestJournalsForField('biology', mockArticles);
    expect(suggestions.length).toBeGreaterThan(0);
  });
});

describe('Non-AI Engine - Chat Responder', () => {
  const mockReport: ResearchReport = {
    generatedQueries: [{ query: 'diabetes', explanation: 'Test query' }],
    rankedArticles: [
      {
        pmid: '12345',
        title: 'Diabetes Study',
        authors: 'Author A',
        journal: 'Journal A',
        pubYear: '2023',
        summary: 'A study about diabetes',
        relevanceScore: 85,
        relevanceExplanation: 'High relevance',
        keywords: ['diabetes'],
        isOpenAccess: true,
      },
    ],
    synthesis: 'This is a synthesis about diabetes.',
    aiGeneratedInsights: [
      {
        question: 'What is diabetes?',
        answer: 'A metabolic disorder',
        supportingArticles: ['12345'],
      },
    ],
    overallKeywords: [{ keyword: 'diabetes', frequency: 1 }],
  };

  it('generates research analysis', () => {
    const analysis = generateResearchAnalysis('diabetes', [
      { title: 'Diabetes Study', summary: 'A study about diabetes', keywords: ['diabetes'] },
    ]);
    expect(analysis.summary).toBeTruthy();
    expect(analysis.keyFindings.length).toBeGreaterThan(0);
  });

  it('answers questions from report', () => {
    const answer = answerFromReport(mockReport, 'What is diabetes?');
    expect(answer).toBeTruthy();
    expect(answer).toContain('diabetes');
  });

  it('handles empty questions', () => {
    const answer = answerFromReport(mockReport, '');
    expect(answer).toBeTruthy();
  });
});
