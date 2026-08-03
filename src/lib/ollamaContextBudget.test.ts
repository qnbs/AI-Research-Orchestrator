import { describe, it, expect } from 'vitest';
import {
  estimateOllamaInputTokenBudget,
  OLLAMA_MIN_INPUT_TOKEN_BUDGET,
} from './ollamaContextBudget';

describe('estimateOllamaInputTokenBudget', () => {
  it('keeps a floor above ranking overhead for tiny models', () => {
    const tiny = estimateOllamaInputTokenBudget('tinyllama:1b');
    expect(tiny.warnTooSmall).toBe(true);
    expect(tiny.budget).toBe(OLLAMA_MIN_INPUT_TOKEN_BUDGET);
  });

  it('parses MoE identifiers as product of experts × size', () => {
    expect(estimateOllamaInputTokenBudget('mixtral:8x7b').budget).toBe(16_000);
  });

  it('honors explicit parameterSize metadata', () => {
    expect(estimateOllamaInputTokenBudget('custom', '1B').warnTooSmall).toBe(true);
  });
});
