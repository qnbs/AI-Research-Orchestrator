/**
 * Public list-price hints for research cost estimation (P1-2).
 * Not billing data — update `asOf` when refreshing rates.
 */

import type { AIProviderSelection } from '../services/providers/types';

export type PricingConfidence = 'known' | 'approximate' | 'unknown';

export type ProviderRateQuote = {
  inputPer1M: number;
  outputPer1M: number;
  confidence: PricingConfidence;
  tierLabel: string;
  source: string;
  asOf: string;
};

type RateEntry = Omit<ProviderRateQuote, 'confidence'> & { confidence?: PricingConfidence };

const CATALOG_AS_OF = '2026-08-02';

/** USD per 1M tokens — approximate public list prices. */
const RATE_ENTRIES: Array<{ provider: AIProviderSelection; pattern: RegExp; rate: RateEntry }> = [
  {
    provider: 'gemini',
    pattern: /gemini-3|2\.5-pro|pro-preview/i,
    rate: {
      inputPer1M: 1.25,
      outputPer1M: 10.0,
      tierLabel: 'gemini-pro',
      source: 'Google AI public list (approx.)',
      asOf: CATALOG_AS_OF,
      confidence: 'approximate',
    },
  },
  {
    provider: 'gemini',
    pattern: /flash|2\.0/i,
    rate: {
      inputPer1M: 0.3,
      outputPer1M: 2.5,
      tierLabel: 'gemini-flash',
      source: 'Google AI public list (approx.)',
      asOf: CATALOG_AS_OF,
      confidence: 'approximate',
    },
  },
  {
    provider: 'openai',
    pattern: /^gpt-5-mini|^gpt-4\.1-mini|^o4-mini/i,
    rate: {
      inputPer1M: 0.4,
      outputPer1M: 1.6,
      tierLabel: 'openai-mini',
      source: 'OpenAI public list (approx.)',
      asOf: CATALOG_AS_OF,
      confidence: 'approximate',
    },
  },
  {
    provider: 'openai',
    pattern: /^gpt-5|^o3|^gpt-4\.1/i,
    rate: {
      inputPer1M: 5.0,
      outputPer1M: 15.0,
      tierLabel: 'openai-flagship',
      source: 'OpenAI public list (approx.)',
      asOf: CATALOG_AS_OF,
      confidence: 'approximate',
    },
  },
  {
    provider: 'anthropic',
    pattern: /haiku/i,
    rate: {
      inputPer1M: 0.8,
      outputPer1M: 4.0,
      tierLabel: 'anthropic-haiku',
      source: 'Anthropic public list (approx.)',
      asOf: CATALOG_AS_OF,
      confidence: 'approximate',
    },
  },
  {
    provider: 'anthropic',
    pattern: /sonnet|opus/i,
    rate: {
      inputPer1M: 3.0,
      outputPer1M: 15.0,
      tierLabel: 'anthropic-sonnet-opus',
      source: 'Anthropic public list (approx.)',
      asOf: CATALOG_AS_OF,
      confidence: 'approximate',
    },
  },
];

const ZERO_COST_PROVIDERS: AIProviderSelection[] = ['heuristic', 'ollama'];

export function resolveProviderRateQuote(
  provider: AIProviderSelection,
  model: string,
): ProviderRateQuote | null {
  if (ZERO_COST_PROVIDERS.includes(provider)) {
    return {
      inputPer1M: 0,
      outputPer1M: 0,
      confidence: 'known',
      tierLabel: provider,
      source: 'Local inference — no vendor API billing',
      asOf: CATALOG_AS_OF,
    };
  }

  const normalizedModel = model.trim();
  const matches = RATE_ENTRIES.filter(
    (entry) => entry.provider === provider && entry.pattern.test(normalizedModel),
  );
  if (matches.length === 0) {
    return null;
  }

  const pick = matches[0].rate;
  return {
    inputPer1M: pick.inputPer1M,
    outputPer1M: pick.outputPer1M,
    tierLabel: pick.tierLabel,
    source: pick.source,
    asOf: pick.asOf,
    confidence: pick.confidence ?? 'approximate',
  };
}

export function computeUsdFromRates(
  inputTokens: number,
  outputTokens: number,
  rate: ProviderRateQuote,
): number {
  return (
    (inputTokens / 1_000_000) * rate.inputPer1M + (outputTokens / 1_000_000) * rate.outputPer1M
  );
}
