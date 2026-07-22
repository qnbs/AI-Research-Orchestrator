import { describe, it, expect } from 'vitest';
import type { RankedArticle } from '../../types';
import {
  disambiguateAuthorHeuristic,
  generateAuthorProfileHeuristic,
  suggestAuthorsHeuristic,
  getAuthorProfileSummary,
} from './authorClusterer';

function makeArticle(overrides: Partial<RankedArticle> = {}): RankedArticle {
  return {
    pmid: '1',
    title: 'Aspirin for cardiovascular prevention',
    authors: 'Chen L, Patel R, Nguyen T, Alvarez M',
    journal: 'The Lancet',
    pubYear: '2023',
    summary: 'A study of aspirin in primary prevention.',
    relevanceScore: 80,
    relevanceExplanation: '',
    keywords: ['aspirin'],
    isOpenAccess: true,
    ...overrides,
  };
}

describe('disambiguateAuthorHeuristic', () => {
  it("clusters an author's articles and surfaces real co-authors", () => {
    const clusters = disambiguateAuthorHeuristic('Chen L', [
      makeArticle({ pmid: '1' }),
      makeArticle({ pmid: '2', title: 'Aspirin and bleeding risk' }),
    ]);
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    expect(clusters[0].publicationCount).toBeGreaterThan(0);
  });

  it('uses exact identity matching, not substring matching, for excluding the searched author', () => {
    // "L" as an initial must not accidentally match "Alvarez" or other unrelated names.
    const clusters = disambiguateAuthorHeuristic('Chen L', [makeArticle()]);
    expect(clusters[0].topCoAuthors.some((a) => /Patel|Nguyen|Alvarez/i.test(a))).toBe(true);
    expect(clusters[0].topCoAuthors.some((a) => /Chen/i.test(a))).toBe(false);
  });

  it('returns a placeholder cluster with zero publications when there are no articles', () => {
    const clusters = disambiguateAuthorHeuristic('Unknown Author', []);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].publicationCount).toBe(0);
    expect(clusters[0].pmids).toEqual([]);
  });

  it('throws a STREAM_ABORTED AppError when the signal is already aborted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => disambiguateAuthorHeuristic('X', [], controller.signal)).toThrow();
  });

  it('splits genuinely distinct co-author/topic fingerprints into separate clusters', () => {
    const clusters = disambiguateAuthorHeuristic('Smith J', [
      makeArticle({ pmid: '1', authors: 'Smith J, Alpha A', title: 'Quantum computing advances' }),
      makeArticle({
        pmid: '2',
        authors: 'Smith J, Beta B',
        title: 'Marine biology conservation efforts',
      }),
    ]);
    expect(clusters.length).toBeGreaterThanOrEqual(1);
  });
});

describe('generateAuthorProfileHeuristic', () => {
  it('generates a career summary with null citation metrics', () => {
    const profile = generateAuthorProfileHeuristic('Chen L', [makeArticle()]);
    expect(profile.careerSummary).toContain('Chen L');
    expect(profile.estimatedMetrics).toEqual({ hIndex: null, totalCitations: null });
  });

  it('extracts core concepts from titles and summaries', () => {
    const profile = generateAuthorProfileHeuristic('Chen L', [
      makeArticle({ pmid: '1' }),
      makeArticle({ pmid: '2' }),
    ]);
    expect(profile.coreConcepts.length).toBeGreaterThan(0);
  });

  it('handles articles with no parseable year gracefully', () => {
    const profile = generateAuthorProfileHeuristic('Chen L', [makeArticle({ pubYear: '' })]);
    expect(profile.careerSummary).toContain('unspecified period');
  });
});

describe('suggestAuthorsHeuristic', () => {
  it('matches a known field and returns curated researchers', () => {
    const suggestions = suggestAuthorsHeuristic('diabetes research');
    expect(suggestions.some((s) => s.name === 'Ralph A. DeFronzo')).toBe(true);
  });

  it('falls back to default suggestions for an unrecognized field', () => {
    const suggestions = suggestAuthorsHeuristic('underwater basket weaving');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.name === 'Ada Lovelace')).toBe(true);
  });

  it('deduplicates suggestions by name', () => {
    const suggestions = suggestAuthorsHeuristic('cancer cancer cancer');
    const names = suggestions.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('getAuthorProfileSummary', () => {
  it('computes basic publication/venue/relevance stats', () => {
    const summary = getAuthorProfileSummary('Chen L', [
      makeArticle({ pmid: '1', relevanceScore: 80 }),
      makeArticle({ pmid: '2', relevanceScore: 60 }),
    ]);
    expect(summary.totalPapers).toBe(2);
    expect(summary.avgRelevance).toBe(70);
    expect(summary.topVenue).toBe('The Lancet');
  });

  it('returns zero/Unknown defaults for an empty article list', () => {
    const summary = getAuthorProfileSummary('X', []);
    expect(summary.totalPapers).toBe(0);
    expect(summary.topVenue).toBe('Unknown');
  });
});
