import { describe, it, expect } from 'vitest';
import {
  relevanceBand,
  RELEVANCE_BAND_THRESHOLDS,
  formatRelativeRelevanceScore,
} from './relevanceScore';

describe('relevanceBand', () => {
  it('treats scores as 0–100 integers, not 0–1 fractions', () => {
    expect(relevanceBand(90)).toBe('high');
    expect(relevanceBand(80)).toBe('medium');
    expect(relevanceBand(60)).toBe('possible');
    expect(relevanceBand(20)).toBe('low');
    // A 0–1 fraction of 0.9 must not be misread as "highly relevant".
    expect(relevanceBand(0.9)).toBe('low');
  });

  it('uses the shared thresholds', () => {
    expect(relevanceBand(RELEVANCE_BAND_THRESHOLDS.high)).toBe('high');
    expect(relevanceBand(RELEVANCE_BAND_THRESHOLDS.medium)).toBe('medium');
    expect(relevanceBand(RELEVANCE_BAND_THRESHOLDS.possible)).toBe('possible');
    expect(relevanceBand(RELEVANCE_BAND_THRESHOLDS.possible - 1)).toBe('low');
  });
});

describe('formatRelativeRelevanceScore', () => {
  it('does not overclaim a calibrated /100 probability', () => {
    expect(formatRelativeRelevanceScore(92)).toBe('relative score 92 (this result set)');
    expect(formatRelativeRelevanceScore(92)).not.toContain('/100');
  });
});
