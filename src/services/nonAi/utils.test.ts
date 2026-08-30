import { describe, it, expect } from 'vitest';
import {
  tokenize,
  stem,
  jaccardSimilarity,
  recencyDecayFactor,
  isHighQualityPubType,
  ngrams,
  jaccardSets,
  throwIfAborted,
  splitSentences,
  stemmedTokens,
  cosineBag,
  inverseDocumentFrequency,
  bm25Score,
  relativeMinMaxScores,
  normalizeScore,
} from './utils';

describe('tokenize', () => {
  it('tokenizes text and filters English stopwords', () => {
    const tokens = tokenize('The quick brown fox jumps over the lazy dog', 'en');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens).not.toContain('the');
  });
});

describe('stem', () => {
  it('shortens common suffixes', () => {
    expect(stem('running').length).toBeLessThan('running'.length);
    expect(stem('studies')).toBe('study');
    expect(stem('research')).toBe('research');
    expect(typeof stem('studied')).toBe('string');
  });
});

describe('jaccardSimilarity', () => {
  it('computes similarity between two token arrays', () => {
    expect(jaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'd'])).toBeCloseTo(0.5, 2);
    expect(jaccardSimilarity(['a', 'b'], ['c', 'd'])).toBe(0);
    expect(jaccardSimilarity(['a', 'b'], ['a', 'b'])).toBe(1);
  });
});

describe('recencyDecayFactor', () => {
  it('decays with article age', () => {
    const fixedYear = 2024;
    expect(recencyDecayFactor(String(fixedYear), fixedYear)).toBeCloseTo(1, 1);
    expect(recencyDecayFactor('2000', fixedYear)).toBeLessThan(0.5);
  });
});

describe('isHighQualityPubType', () => {
  it('identifies high-quality publication types', () => {
    expect(isHighQualityPubType(['Randomized Controlled Trial'])).toBe(true);
    expect(isHighQualityPubType(['Meta-Analysis'])).toBe(true);
    expect(isHighQualityPubType(['Review'])).toBe(true);
    expect(isHighQualityPubType(['Case Report'])).toBe(false);
    expect(isHighQualityPubType([])).toBe(false);
  });
});

describe('ngrams', () => {
  it('extracts bigrams with no minimum length filter', () => {
    const grams = ngrams('a b machine learning', 2);
    expect(grams).toContain('machine learning');
  });

  it('returns an empty array when there are fewer tokens than n', () => {
    expect(ngrams('lone', 2)).toEqual([]);
  });
});

describe('jaccardSets', () => {
  it('computes Jaccard similarity between two sets', () => {
    expect(jaccardSets(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1);
    expect(jaccardSets(new Set(['a']), new Set(['b']))).toBe(0);
    expect(jaccardSets(new Set(), new Set())).toBe(0);
  });
});

describe('throwIfAborted', () => {
  it('does nothing when no signal or an unaborted signal is passed', () => {
    expect(() => throwIfAborted(undefined)).not.toThrow();
    expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
  });

  it('throws a STREAM_ABORTED AppError when the signal has fired', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow();
    try {
      throwIfAborted(controller.signal);
    } catch (e) {
      expect((e as { code?: string }).code).toBe('STREAM_ABORTED');
    }
  });
});

describe('splitSentences', () => {
  it('splits on sentence-ending punctuation and drops short fragments', () => {
    const sentences = splitSentences(
      'This is a reasonably long first sentence. Hi. This is another long sentence here.',
    );
    expect(sentences.length).toBe(2);
  });

  it('returns an empty array for blank input', () => {
    expect(splitSentences('   ')).toEqual([]);
  });
});

describe('stemmedTokens', () => {
  it('tokenizes and stems in one step', () => {
    const tokens = stemmedTokens('researchers publishing manuscripts');
    expect(tokens.length).toBe(3);
    expect(tokens.every((t) => t.length > 0)).toBe(true);
  });

  it('excludes stopwords before stemming', () => {
    // "study"/"studies" are deliberately in the stopword list (generic academic
    // filler, unhelpful as a topic signal) - confirm they're filtered, not stemmed.
    expect(stemmedTokens('the studies were conducted')).not.toContain('studi');
  });
});

describe('cosineBag', () => {
  it('returns 1 for identical bags and 0 for disjoint ones', () => {
    expect(cosineBag(['a', 'b'], ['a', 'b'])).toBeCloseTo(1, 5);
    expect(cosineBag(['a'], ['b'])).toBe(0);
  });

  it('returns 0 for an empty input', () => {
    expect(cosineBag([], ['a'])).toBe(0);
  });
});

describe('inverseDocumentFrequency (Lucene BM25+)', () => {
  it('matches golden Lucene BM25+ IDF values', () => {
    // ln(1 + (N − df + 0.5) / (df + 0.5))
    const n10df1 = Math.log(1 + (10 - 1 + 0.5) / (1 + 0.5));
    const n10df10 = Math.log(1 + (10 - 10 + 0.5) / (10 + 0.5));
    expect(inverseDocumentFrequency('term', 1, 10)).toBeCloseTo(n10df1, 10);
    expect(inverseDocumentFrequency('term', 10, 10)).toBeCloseTo(n10df10, 10);
    expect(n10df1).toBeCloseTo(1.9924301647, 5);
    expect(n10df10).toBeCloseTo(0.0465200156, 5);
  });

  it('stays non-negative when a term appears in every document', () => {
    const n = 5;
    const previousFormula = Math.log(n / (1 + n));
    expect(previousFormula).toBeLessThan(0);
    expect(inverseDocumentFrequency('ubiquitous', n, n)).toBeGreaterThan(0);
  });

  it('decreases as document frequency increases', () => {
    const rare = inverseDocumentFrequency('term', 1, 20);
    const mid = inverseDocumentFrequency('term', 10, 20);
    const common = inverseDocumentFrequency('term', 20, 20);
    expect(rare).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(common);
  });

  it('returns 0 for an empty collection', () => {
    expect(inverseDocumentFrequency('term', 0, 0)).toBe(0);
  });

  it('clamps df into [0, N]', () => {
    expect(inverseDocumentFrequency('term', -3, 10)).toBe(inverseDocumentFrequency('term', 0, 10));
    expect(inverseDocumentFrequency('term', 99, 10)).toBe(inverseDocumentFrequency('term', 10, 10));
  });
});

describe('bm25Score golden Okapi TF × BM25+ IDF', () => {
  it('matches a hand-computed Okapi TF with Lucene IDF', () => {
    const idf = inverseDocumentFrequency('metformin', 1, 10);
    const score = bm25Score(2, 100, 150, idf);
    // k1=1.2, b=0.75: TF = 2*(1.2+1) / (2 + 1.2*(1-0.75+0.75*(100/150))) = 4.4/2.9
    const tf = 4.4 / 2.9;
    expect(score).toBeCloseTo(idf * tf, 10);
    expect(score).toBeGreaterThan(0);
  });
});

describe('relativeMinMaxScores', () => {
  it('maps the observed min and max onto 0 and 100', () => {
    expect(relativeMinMaxScores([10, 20, 30])).toEqual([0, 50, 100]);
  });

  it('maps a tied result set to 50 rather than claiming a calibrated 0–100', () => {
    expect(relativeMinMaxScores([7, 7, 7])).toEqual([50, 50, 50]);
  });

  it('returns an empty array for an empty input', () => {
    expect(relativeMinMaxScores([])).toEqual([]);
  });

  it('clamps via normalizeScore when min === max', () => {
    expect(normalizeScore(12, 5, 5)).toBe(50);
  });
});
