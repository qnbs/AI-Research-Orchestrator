import { describe, it, expect } from 'vitest';
import type { RankedArticle } from '../../types';
import { findSimilarArticlesHeuristic } from './similarFinder';

function makeArticle(overrides: Partial<RankedArticle> = {}): RankedArticle {
  return {
    pmid: '1',
    title: 'Aspirin for cardiovascular prevention',
    authors: '',
    journal: '',
    pubYear: '2023',
    summary: 'Aspirin reduces cardiovascular events in high-risk patients.',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: ['aspirin', 'cardiovascular'],
    isOpenAccess: true,
    ...overrides,
  };
}

describe('findSimilarArticlesHeuristic', () => {
  it('ranks candidates by token overlap with the seed', () => {
    const seed = {
      title: 'Aspirin cardiovascular prevention',
      summary: 'Aspirin study',
      pmid: 'seed',
    };
    const candidates = [
      makeArticle({ pmid: '1', title: 'Aspirin for cardiovascular disease prevention' }),
      makeArticle({
        pmid: '2',
        title: 'Gut microbiome and inflammation',
        summary: 'Unrelated topic',
      }),
    ];
    const results = findSimilarArticlesHeuristic(seed, candidates);
    expect(results[0].pmid).toBe('1');
  });

  it('excludes the seed article itself by PMID', () => {
    const seed = { title: 'X', summary: 'Y', pmid: '1' };
    const results = findSimilarArticlesHeuristic(seed, [makeArticle({ pmid: '1' })]);
    expect(results.find((r) => r.pmid === '1')).toBeUndefined();
  });

  it('excludes a candidate with an identical title even if the PMID differs', () => {
    const seed = { title: 'Aspirin for cardiovascular prevention', summary: '', pmid: 'seed' };
    const results = findSimilarArticlesHeuristic(seed, [
      makeArticle({ pmid: 'other-id', title: 'Aspirin for cardiovascular prevention' }),
    ]);
    expect(results).toHaveLength(0);
  });

  it('excludes candidates with zero token overlap', () => {
    const seed = { title: 'Quantum computing', summary: 'Qubits and gates', pmid: 'seed' };
    const results = findSimilarArticlesHeuristic(seed, [
      makeArticle({ pmid: '1', title: 'Zebra migration patterns', summary: 'Wildlife behavior' }),
    ]);
    expect(results).toHaveLength(0);
  });

  it('respects the limit parameter', () => {
    const seed = { title: 'Aspirin', summary: 'cardiovascular prevention study', pmid: 'seed' };
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeArticle({ pmid: String(i), title: `Aspirin cardiovascular study ${i}` }),
    );
    const results = findSimilarArticlesHeuristic(seed, candidates, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('throws when the signal is already aborted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() =>
      findSimilarArticlesHeuristic({ title: 'X', summary: 'Y' }, [], 5, controller.signal),
    ).toThrow();
  });
});
