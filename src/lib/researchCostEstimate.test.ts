import { describe, expect, it } from 'vitest';
import { estimateResearchRunCost, shouldWarnAboutResearchCost } from './researchCostEstimate';

describe('estimateResearchRunCost', () => {
  const base = {
    topic: 'aspirin cardiovascular trial',
    maxArticlesToScan: 40,
    topNToSynthesize: 8,
  };

  it('estimates Gemini flash with USD total', () => {
    const est = estimateResearchRunCost({
      ...base,
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    });
    expect(est.providerLabel).toContain('Gemini');
    expect(est.pricingTierLabel).toBe('gemini-flash');
    expect(est.estimatedUsd).not.toBeNull();
    expect(est.estimatedUsd!).toBeGreaterThan(0);
    expect(est.estimatedInputTokens).toBeGreaterThan(1000);
  });

  it('estimates OpenAI without Gemini labels', () => {
    const est = estimateResearchRunCost({
      ...base,
      provider: 'openai',
      model: 'gpt-5',
    });
    expect(est.providerLabel).toBe('OpenAI');
    expect(est.pricingTierLabel).toBe('openai-flagship');
    expect(est.estimatedUsd).not.toBeNull();
  });

  it('estimates Anthropic sonnet', () => {
    const est = estimateResearchRunCost({
      ...base,
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
    });
    expect(est.providerLabel).toBe('Anthropic');
    expect(est.estimatedUsd).not.toBeNull();
  });

  it('returns zero USD for heuristic provider', () => {
    const est = estimateResearchRunCost({
      ...base,
      provider: 'heuristic',
      model: 'local',
    });
    expect(est.estimatedUsd).toBe(0);
    expect(est.pricingConfidence).toBe('known');
  });

  it('returns zero USD for Ollama', () => {
    const est = estimateResearchRunCost({
      ...base,
      provider: 'ollama',
      model: 'llama3.1:8b',
    });
    expect(est.estimatedUsd).toBe(0);
  });

  it('does not guess USD for unknown OpenAI model', () => {
    const est = estimateResearchRunCost({
      ...base,
      provider: 'openai',
      model: 'custom-unknown-model-xyz',
    });
    expect(est.estimatedUsd).toBeNull();
    expect(est.pricingConfidence).toBe('unknown');
    expect(est.estimatedInputTokens).toBeGreaterThan(0);
  });
});

describe('shouldWarnAboutResearchCost', () => {
  it('warns on high USD estimates only when price is known', () => {
    const high = estimateResearchRunCost({
      topic: 'x'.repeat(200),
      maxArticlesToScan: 120,
      topNToSynthesize: 20,
      provider: 'gemini',
      model: 'gemini-2.5-pro',
    });
    expect(shouldWarnAboutResearchCost(high)).toBe(true);

    const unknown = estimateResearchRunCost({
      topic: 'test',
      maxArticlesToScan: 120,
      topNToSynthesize: 20,
      provider: 'openai',
      model: 'unknown-custom',
    });
    expect(shouldWarnAboutResearchCost(unknown)).toBe(false);
  });
});
