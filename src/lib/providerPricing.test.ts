import { describe, expect, it } from 'vitest';
import { resolveProviderRateQuote, computeUsdFromRates } from './providerPricing';

describe('resolveProviderRateQuote', () => {
  it('returns zero-cost known quote for heuristic and ollama', () => {
    const heuristic = resolveProviderRateQuote('heuristic', 'local');
    expect(heuristic?.inputPer1M).toBe(0);
    expect(heuristic?.confidence).toBe('known');

    const ollama = resolveProviderRateQuote('ollama', 'llama3.1:8b');
    expect(ollama?.inputPer1M).toBe(0);
    expect(ollama?.confidence).toBe('known');
  });

  it('resolves Gemini flash and pro tiers', () => {
    const flash = resolveProviderRateQuote('gemini', 'gemini-2.5-flash');
    expect(flash?.tierLabel).toBe('gemini-flash');
    const pro = resolveProviderRateQuote('gemini', 'gemini-2.5-pro');
    expect(pro?.tierLabel).toBe('gemini-pro');
  });

  it('resolves OpenAI flagship and mini models', () => {
    const flagship = resolveProviderRateQuote('openai', 'gpt-5');
    expect(flagship?.tierLabel).toBe('openai-flagship');
    const mini = resolveProviderRateQuote('openai', 'gpt-5-mini');
    expect(mini?.tierLabel).toBe('openai-mini');
  });

  it('resolves Anthropic sonnet and haiku', () => {
    const sonnet = resolveProviderRateQuote('anthropic', 'claude-sonnet-4-5');
    expect(sonnet?.tierLabel).toBe('anthropic-sonnet-opus');
    const haiku = resolveProviderRateQuote('anthropic', 'claude-haiku-4-5');
    expect(haiku?.tierLabel).toBe('anthropic-haiku');
  });

  it('returns null for unknown custom model strings', () => {
    expect(resolveProviderRateQuote('openai', 'my-private-finetune-v9')).toBeNull();
  });
});

describe('computeUsdFromRates', () => {
  it('computes USD from per-million rates', () => {
    const rate = resolveProviderRateQuote('gemini', 'gemini-2.5-flash');
    expect(rate).not.toBeNull();
    const usd = computeUsdFromRates(1_000_000, 1_000_000, rate!);
    expect(usd).toBeCloseTo(2.8, 5);
  });
});
