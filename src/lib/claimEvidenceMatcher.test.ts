import { describe, expect, it } from 'vitest';
import type { RankedArticle } from '../types';
import {
  assessClaimArticleEvidence,
  articleSupportsClaim,
  CLAIM_EVIDENCE_MATCHER_VERSION,
} from './claimEvidenceMatcher';

function article(title: string, summary: string): RankedArticle {
  return {
    pmid: '1',
    title,
    authors: 'A',
    journal: 'J',
    pubYear: '2024',
    summary,
    relevanceScore: 80,
    relevanceExplanation: '',
    keywords: [],
    isOpenAccess: false,
    abstractStatus: 'available',
  };
}

describe('CLAIM_EVIDENCE_MATCHER_VERSION', () => {
  it('is exported for provenance stamping', () => {
    expect(CLAIM_EVIDENCE_MATCHER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('assessClaimArticleEvidence — adversarial', () => {
  it('rejects two generic overlapping tokens without substantive overlap', () => {
    const art = article('Clinical trial overview', 'This study enrolled adults in a trial.');
    const result = assessClaimArticleEvidence('This clinical trial enrolled study adults.', art);
    expect(result.relation).toBe('insufficient');
  });

  it('supports claim with substantive multi-token overlap', () => {
    const art = article(
      'Aspirin cardiovascular trial',
      'Aspirin reduced major cardiovascular events in adults.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced major cardiovascular events in adults.',
      art,
    );
    expect(result.relation).toBe('supports');
    expect(result.spans[0]?.quote).toContain('cardiovascular');
  });

  it('contradicts when direction terms conflict', () => {
    const art = article(
      'Aspirin trial',
      'Aspirin increased major cardiovascular events compared with placebo.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced major cardiovascular events compared with placebo.',
      art,
    );
    expect(result.relation).toBe('contradicts');
  });

  it('contradicts when negation scope differs', () => {
    const art = article(
      'Aspirin prevention',
      'Aspirin did not reduce major cardiovascular events in this cohort.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced major cardiovascular events in this cohort.',
      art,
    );
    expect(result.relation).toBe('contradicts');
  });

  it('does not treat aiSummary alone as supporting evidence', () => {
    const art = article('Short title', 'Original abstract about aspirin prevention.');
    art.aiSummary = 'Quantum entanglement breakthrough in unrelated field.';
    expect(articleSupportsClaim('Quantum entanglement breakthrough in unrelated field.', art)).toBe(
      false,
    );
  });

  it('matches non-English claims via Unicode letter tokenization', () => {
    const art = article('Herzinfarkt', 'Behandlung von Herzinfarkt mit Aspirin.');
    expect(articleSupportsClaim('Aspirin bei Herzinfarkt.', art)).toBe(true);
  });

  it('does not treat German function words as content tokens', () => {
    const art = article('Studie', 'Therapie über Herzinfarkt mit Aspirin.');
    expect(assessClaimArticleEvidence('über und der die das', art).relation).toBe('insufficient');
  });

  it('does not contradict when opposite direction appears outside the matched span', () => {
    const art = article(
      'Aspirin trial',
      'Aspirin reduced major cardiovascular events. Major bleeding was increased in the aspirin arm.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced major cardiovascular events in adults.',
      art,
    );
    expect(result.relation).toBe('supports');
  });
});
