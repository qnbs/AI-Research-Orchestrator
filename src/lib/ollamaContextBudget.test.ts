import { describe, it, expect } from 'vitest';
import {
  estimateOllamaInputTokenBudget,
  OLLAMA_MIN_INPUT_TOKEN_BUDGET,
  OLLAMA_BUDGET_SAFETY_MARGIN,
  OLLAMA_OUTPUT_TOKEN_RESERVE,
  OLLAMA_PROMPT_OVERHEAD_RESERVE,
} from './ollamaContextBudget';

describe('estimateOllamaInputTokenBudget', () => {
  it('keeps a floor above ranking overhead for tiny models', () => {
    const tiny = estimateOllamaInputTokenBudget('tinyllama:1b');
    expect(tiny.warnTooSmall).toBe(true);
    expect(tiny.budget).toBe(OLLAMA_MIN_INPUT_TOKEN_BUDGET);
    expect(tiny.source).toBe('parameter-heuristic');
  });

  it('parses MoE identifiers as product of experts × size', () => {
    expect(estimateOllamaInputTokenBudget('mixtral:8x7b').budget).toBe(16_000);
  });

  it('honors explicit parameterSize metadata in heuristic fallback', () => {
    expect(estimateOllamaInputTokenBudget('custom', { parameterSize: '1B' }).warnTooSmall).toBe(
      true,
    );
  });

  it('prefers runtime context length over parameter heuristics', () => {
    const fromContext = estimateOllamaInputTokenBudget('llama3.1:8b', { contextLength: 32_768 });
    expect(fromContext.source).toBe('context-length');
    expect(fromContext.contextLength).toBe(32_768);
    expect(fromContext.budget).toBe(
      32_768 -
        OLLAMA_OUTPUT_TOKEN_RESERVE -
        OLLAMA_PROMPT_OVERHEAD_RESERVE -
        OLLAMA_BUDGET_SAFETY_MARGIN,
    );
    expect(fromContext.budget).toBeGreaterThan(16_000);
  });

  it('clamps small context windows to the minimum usable ranking budget', () => {
    const small = estimateOllamaInputTokenBudget('tiny', { contextLength: 4_096 });
    expect(small.budget).toBe(OLLAMA_MIN_INPUT_TOKEN_BUDGET);
    expect(small.warnTooSmall).toBe(true);
  });
});
