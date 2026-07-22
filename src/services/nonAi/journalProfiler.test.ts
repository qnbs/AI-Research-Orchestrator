import { describe, it, expect } from 'vitest';
import {
  generateJournalProfileHeuristic,
  analyzeArticleHeuristic,
  suggestJournalsHeuristic,
  disambiguateJournalHeuristic,
  analyzeJournalMetrics,
} from './journalProfiler';
import type { RankedArticle } from '../../types';

const makeArticle = (overrides: Partial<RankedArticle> = {}): Partial<RankedArticle> => ({
  pmid: '123',
  title: 'Immunotherapy outcomes in melanoma patients',
  summary: 'A study of immunotherapy outcomes in melanoma patients cohorts.',
  authors: 'Doe J, Smith A',
  journal: 'Nature',
  pubYear: '2024',
  isOpenAccess: false,
  ...overrides,
});

describe('generateJournalProfileHeuristic', () => {
  it('returns curated profile for a known journal with metrics', () => {
    const profile = generateJournalProfileHeuristic('The Lancet');
    expect(profile.issn).toBe('0140-6736');
    expect(profile.oaPolicy).toBe('Hybrid');
    expect(profile.publisher).toBe('Elsevier');
    expect(profile.metrics?.impactFactor).toBe(88);
    expect(profile.metrics?.source).toBe('curated');
    expect(profile.description).toMatch(/Heuristic mode/);
  });

  it('resolves aliases to the canonical curated entry', () => {
    const profile = generateJournalProfileHeuristic('NEJM');
    expect(profile.issn).toBe('0028-4793');
    expect(profile.focusAreas.length).toBeGreaterThan(0);
  });

  it('enriches focus areas from fetched article titles', () => {
    const profile = generateJournalProfileHeuristic('Nature', [
      makeArticle(),
      makeArticle({ pmid: '456' }),
    ]);
    expect(profile.metrics?.analyzedArticleCount).toBe(2);
    expect(profile.focusAreas.some((f) => /multidisciplinary/i.test(f))).toBe(true);
  });

  it('computes open-access rate from articles', () => {
    const profile = generateJournalProfileHeuristic('PLOS ONE', [
      makeArticle({ isOpenAccess: true }),
      makeArticle({ pmid: '456', isOpenAccess: false }),
    ]);
    expect(profile.metrics?.openAccessRate).toBe(50);
  });

  it('returns an honest unknown profile without articles', () => {
    const profile = generateJournalProfileHeuristic('Obscure Quarterly of Nothing');
    expect(profile.issn).toBe('Unknown');
    expect(profile.description).toMatch(/No curated entry/);
    expect(profile.metrics).toBeNull();
    expect(profile.focusAreas.length).toBeGreaterThan(0);
  });

  it('guesses OA policies from journal name patterns', () => {
    expect(generateJournalProfileHeuristic('Frontiers in X').oaPolicy).toBe('Full Open Access');
    expect(generateJournalProfileHeuristic('Nature Reviews Y').oaPolicy).toBe('Hybrid');
    expect(generateJournalProfileHeuristic('Journal of Z').oaPolicy).toBe('Subscription');
  });

  it('computes metrics for unknown journals when articles exist', () => {
    const profile = generateJournalProfileHeuristic('Obscure Quarterly', [makeArticle()]);
    expect(profile.metrics?.source).toBe('computed');
    expect(profile.metrics?.impactFactor).toBeNull();
    expect(profile.metrics?.analyzedArticleCount).toBe(1);
  });

  it('throws when aborted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => generateJournalProfileHeuristic('Nature', [], controller.signal)).toThrow();
  });
});

describe('suggestJournalsHeuristic', () => {
  it('suggests oncology journals for cancer topics', () => {
    const suggestions = suggestJournalsHeuristic('cancer immunotherapy');
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    expect(suggestions.some((j) => /Oncology|Cancer/i.test(j.name))).toBe(true);
  });

  it('matches multi-word fields like public health', () => {
    const suggestions = suggestJournalsHeuristic('public health policy');
    expect(suggestions.some((j) => /Public Health/i.test(j.name))).toBe(true);
  });

  it('falls back to default journals for unknown fields', () => {
    const suggestions = suggestJournalsHeuristic('xyzzy unknown field');
    expect(suggestions.some((j) => j.name === 'PLOS ONE')).toBe(true);
  });

  it('deduplicates suggestions across overlapping fields', () => {
    const suggestions = suggestJournalsHeuristic('cancer oncology');
    const names = suggestions.map((j) => j.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('throws when aborted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => suggestJournalsHeuristic('cancer', controller.signal)).toThrow();
  });

  it('does not match the short "ai" key inside unrelated words', () => {
    const suggestions = suggestJournalsHeuristic('pain management');
    expect(suggestions.some((j) => j.name === 'Nature Machine Intelligence')).toBe(false);
  });

  it('matches the short "ai" key as a whole word', () => {
    const suggestions = suggestJournalsHeuristic('AI in diagnostic imaging');
    expect(suggestions.some((j) => j.name === 'Nature Machine Intelligence')).toBe(true);
  });
});

describe('disambiguateJournalHeuristic', () => {
  it('ranks the exact KB match first and offers related partial candidates', () => {
    const candidates = disambiguateJournalHeuristic('Nature');
    // "Nature" also partially matches "Nature Communications" / "Nature Methods" —
    // intentional, mirroring the BMJ vs BMJ Open ambiguity flow.
    expect(candidates[0].name).toBe('Nature');
    expect(candidates[0].matchType).toBe('exact');
    expect(candidates[0].confidence).toBeGreaterThanOrEqual(90);
    expect(candidates[0].issn).toBe('0028-0836');
    expect(candidates.length).toBeGreaterThanOrEqual(1);
  });

  it('resolves abbreviations with expansion candidates', () => {
    const candidates = disambiguateJournalHeuristic('NEJM');
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].name).toBe('New England Journal of Medicine');
    expect(candidates[0].matchType).toBe('abbreviation');
  });

  it('offers multiple candidates for ambiguous short names like BMJ', () => {
    const candidates = disambiguateJournalHeuristic('BMJ');
    const names = candidates.map((c) => c.name);
    expect(names).toContain('BMJ');
    expect(names).toContain('BMJ Open');
    expect(candidates.length).toBeGreaterThanOrEqual(2);
  });

  it('resolves alias variants like "Lancet" → "The Lancet"', () => {
    const candidates = disambiguateJournalHeuristic('Lancet');
    expect(candidates[0].name).toBe('The Lancet');
    expect(candidates[0].matchType).toBe('alias');
  });

  it('returns an empty list for unknown journals', () => {
    expect(disambiguateJournalHeuristic('Obscure Quarterly of Nothing')).toHaveLength(0);
  });

  it('returns an empty list for blank input', () => {
    expect(disambiguateJournalHeuristic('   ')).toHaveLength(0);
  });

  it('sorts candidates by confidence descending', () => {
    const candidates = disambiguateJournalHeuristic('cell');
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].confidence).toBeGreaterThanOrEqual(candidates[i].confidence);
    }
  });

  it('throws when aborted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => disambiguateJournalHeuristic('Nature', controller.signal)).toThrow();
  });
});

describe('analyzeArticleHeuristic', () => {
  it('scores title-abstract coherence deterministically', () => {
    const article = analyzeArticleHeuristic(makeArticle() as RankedArticle);
    expect(article.relevanceScore).toBeGreaterThan(0);
    expect(article.relevanceScore).toBeLessThanOrEqual(100);
    expect(article.relevanceExplanation).toMatch(/coherence/);
  });

  it('handles empty titles gracefully', () => {
    const article = analyzeArticleHeuristic(makeArticle({ title: '' }) as RankedArticle);
    expect(article.relevanceScore).toBe(50);
  });

  it('builds aiSummary via the shared extractive-summary helper, not a raw slice', () => {
    const article = analyzeArticleHeuristic(
      makeArticle({
        summary: 'First sentence about the topic. Second sentence with more detail. Third one.',
      }) as RankedArticle,
    );
    expect(article.aiSummary).toContain('First sentence about the topic');
  });
});

describe('analyzeJournalMetrics', () => {
  it('aggregates article/open-access counts and average relevance per journal', () => {
    const articles: RankedArticle[] = [
      { ...makeArticle({ journal: 'Nature', relevanceScore: 80 }) } as RankedArticle,
      {
        ...makeArticle({ journal: 'Nature', relevanceScore: 60, isOpenAccess: true }),
      } as RankedArticle,
    ];
    const stats = analyzeJournalMetrics(articles);
    expect(stats[0].journal).toBe('Nature');
    expect(stats[0].articleCount).toBe(2);
    expect(stats[0].openAccessCount).toBe(1);
    expect(stats[0].avgRelevance).toBe(70);
  });

  it('returns an empty array for no articles', () => {
    expect(analyzeJournalMetrics([])).toEqual([]);
  });
});
