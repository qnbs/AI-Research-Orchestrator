import { describe, it, expect } from 'vitest';
import {
  buildGroundedSynthesisFromExtractive,
  extractGroundedClaimsFromMarkdown,
  rebuildSynthesisFromClaims,
  sanitizeGroundedClaims,
  sanitizeGroundedSynthesis,
  sanitizeSynthesisForExport,
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

describe('sanitizeSynthesisForExport', () => {
  it('rebuilds synthesis from corpus-cited paragraphs only', () => {
    const synthesis =
      '## Findings\n\nDrug X reduced risk (PMID: 1).\n\nUncited speculation without PMID.';
    const { synthesis: cleaned, uncitedParagraphsRemoved } = sanitizeSynthesisForExport(
      synthesis,
      undefined,
      ['1'],
    );
    expect(cleaned).toContain('PMID: 1');
    expect(cleaned).not.toContain('Uncited speculation');
    expect(uncitedParagraphsRemoved).toBeGreaterThan(0);
  });

  it('prefers structured grounded claims over markdown extraction', () => {
    const grounded = {
      mode: 'narrative-extracted' as const,
      claims: [{ text: 'Structured claim (PMID: 1).', pmids: ['1'] }],
    };
    const { synthesis: cleaned } = sanitizeSynthesisForExport(
      'Uncited paragraph.\n\nAnother uncited block.',
      grounded,
      ['1'],
    );
    expect(cleaned).toBe('Structured claim (PMID: 1).');
  });

  it('returns original synthesis when no corpus-cited blocks exist', () => {
    const synthesis = 'No citations here.';
    const result = sanitizeSynthesisForExport(synthesis, undefined, ['1']);
    expect(result.synthesis).toBe(synthesis);
    expect(result.uncitedParagraphsRemoved).toBe(0);
  });
});

describe('rebuildSynthesisFromClaims', () => {
  it('joins claim text with blank lines', () => {
    expect(
      rebuildSynthesisFromClaims([
        { text: 'First.', pmids: ['1'] },
        { text: 'Second.', pmids: ['2'] },
      ]),
    ).toBe('First.\n\nSecond.');
  });
});
