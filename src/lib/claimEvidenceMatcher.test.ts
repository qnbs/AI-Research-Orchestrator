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
  it('rejects sparse overlap below aggregated threshold', () => {
    const art = article(
      'Cardiovascular outcomes overview',
      'Significant improvement noted in this randomized study.',
    );
    const result = assessClaimArticleEvidence(
      'Biomedical cardiovascular outcomes improved significantly worldwide today.',
      art,
    );
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

  it('matches inflected variants via lightweight stemming', () => {
    const art = article(
      'Aspirin stroke prevention',
      'Aspirin prevented strokes in patients with cardiovascular risk.',
    );
    const result = assessClaimArticleEvidence('Aspirin prevents stroke in patients.', art);
    expect(result.relation).toBe('supports');
  });

  it('aggregates overlap across title and abstract for thresholding', () => {
    const art = article(
      'Aspirin stroke prevention trial',
      'Randomized patients received daily aspirin therapy.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin stroke prevention randomized patients therapy.',
      art,
    );
    expect(result.relation).toBe('supports');
    expect(result.contentOverlapCount).toBeGreaterThanOrEqual(3);
  });

  it('contradicts when abstract opposes claim even if title overlap is higher', () => {
    const art = article(
      'Aspirin cardiovascular trial overview',
      'Aspirin increased major cardiovascular events compared with placebo.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced major cardiovascular events compared with placebo.',
      art,
    );
    expect(result.relation).toBe('contradicts');
  });

  it('contradicts when negation differs on inflected overlapping tokens', () => {
    const art = article(
      'Aspirin prevention',
      'Aspirin did not prevent stroke in this patient cohort.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin prevented stroke in this patient cohort.',
      art,
    );
    expect(result.relation).toBe('contradicts');
  });

  it('does not treat affirming not-only phrasing as negation conflict', () => {
    const art = article(
      'Combination therapy',
      'Not only aspirin but also statins reduced cardiovascular events in adults.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced cardiovascular events in adults.',
      art,
    );
    expect(result.relation).toBe('supports');
  });

  it('supports claim when abstract aligns despite title-only keyword overlap', () => {
    const art = article(
      'Aspirin cardiovascular trial overview',
      'Aspirin reduced major cardiovascular events compared with placebo.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced major cardiovascular events compared with placebo.',
      art,
    );
    expect(result.relation).toBe('supports');
  });

  it('marks internal title-abstract conflict as insufficient', () => {
    const art = article(
      'Aspirin increased cardiovascular events overview',
      'Aspirin reduced major cardiovascular events compared with placebo.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced major cardiovascular events compared with placebo.',
      art,
    );
    expect(result.relation).toBe('insufficient');
  });

  it('contradicts when a same-unit percent value drifts beyond tolerance', () => {
    const art = article(
      'Aspirin cardiovascular trial',
      'Aspirin reduced major cardiovascular events by 5% in this cohort.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced major cardiovascular events by 30% in this cohort.',
      art,
    );
    expect(result.relation).toBe('contradicts');
    expect(result.reasons).toContain('numeric value or unit conflicts between claim and source');
  });

  it('contradicts when a same-unit dose value drifts beyond tolerance', () => {
    const art = article(
      'Aspirin dosing trial',
      'Patients received aspirin 81mg daily in the treatment cohort.',
    );
    const result = assessClaimArticleEvidence(
      'Patients received aspirin 325mg daily in the treatment cohort.',
      art,
    );
    expect(result.relation).toBe('contradicts');
  });

  it('supports when the same-unit numeric value matches within tolerance', () => {
    const art = article(
      'Aspirin cardiovascular trial',
      'Aspirin reduced major cardiovascular events by 30% in this cohort.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced major cardiovascular events by 30% in this cohort.',
      art,
    );
    expect(result.relation).toBe('supports');
  });

  it('does not treat different-unit numbers as a conflict', () => {
    const art = article(
      'Aspirin dosing trial',
      'Patients received aspirin 81mg daily in the treatment cohort.',
    );
    const result = assessClaimArticleEvidence(
      'Patients received aspirin daily for 12 months in the treatment cohort.',
      art,
    );
    expect(result.relation).toBe('supports');
  });

  it('contradicts when population/cohort terms conflict', () => {
    const art = article(
      'Aspirin cardiovascular trial',
      'Aspirin reduced major cardiovascular events in adults.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced major cardiovascular events in children.',
      art,
    );
    expect(result.relation).toBe('contradicts');
    expect(result.reasons).toContain(
      'population or cohort terms conflict between claim and source',
    );
  });

  it('does not contradict when population terms match', () => {
    const art = article(
      'Aspirin cardiovascular trial',
      'Aspirin reduced major cardiovascular events in adults.',
    );
    const result = assessClaimArticleEvidence(
      'Aspirin reduced major cardiovascular events in adults.',
      art,
    );
    expect(result.relation).toBe('supports');
  });
});
