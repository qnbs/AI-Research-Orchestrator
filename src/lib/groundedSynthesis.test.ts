import { describe, it, expect } from 'vitest';
import {
  buildGroundedSynthesisFromExtractive,
  extractGroundedClaimsFromMarkdown,
  sanitizeGroundedClaims,
  sanitizeGroundedSynthesis,
} from './groundedSynthesis';

describe('buildGroundedSynthesisFromExtractive', () => {
  it('maps extractive findings and narrative sections to claims', () => {
    const result = buildGroundedSynthesisFromExtractive(
      {
        tldr: 'Summary sentence.',
        keyFindings: [{ pmid: '1', sentence: 'Finding one.', score: 0.9 }],
        synthesisMode: 'extractive-template',
      },
      [{ title: 'Background', content: 'Context text.', pmids: ['1', '2'] }],
    );

    expect(result.mode).toBe('extractive-template');
    expect(result.claims.length).toBeGreaterThanOrEqual(3);
    expect(result.claims[0].pmids).toContain('1');
  });
});

describe('extractGroundedClaimsFromMarkdown', () => {
  it('extracts corpus-bound PMIDs from markdown blocks', () => {
    const claims = extractGroundedClaimsFromMarkdown(
      '## Findings\n\nDrug X reduced risk (PMID: 1).\n\nUnrelated paragraph.',
      ['1', '2'],
    );
    expect(claims).toHaveLength(1);
    expect(claims[0].pmids).toEqual(['1']);
  });
});

describe('sanitizeGroundedClaims', () => {
  it('drops claims with no valid corpus PMIDs', () => {
    const corpus = new Set(['1']);
    const { claims, metrics } = sanitizeGroundedClaims(
      [
        { text: 'Valid', pmids: ['1', '99'] },
        { text: 'Invalid', pmids: ['88'] },
      ],
      corpus,
    );
    expect(claims).toEqual([{ text: 'Valid', pmids: ['1'] }]);
    expect(metrics.invalidCitations).toBe(2);
    expect(metrics.droppedClaims).toBe(1);
  });
});

describe('sanitizeGroundedSynthesis', () => {
  it('returns undefined when all claims are dropped', () => {
    const { groundedSynthesis, metrics } = sanitizeGroundedSynthesis(
      { mode: 'narrative-extracted', claims: [{ text: 'X', pmids: ['9'] }] },
      ['1'],
    );
    expect(groundedSynthesis).toBeUndefined();
    expect(metrics.droppedClaims).toBe(1);
  });
});
