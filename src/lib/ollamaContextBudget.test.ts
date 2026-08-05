import { describe, it, expect } from 'vitest';
import {
  estimateOllamaInputTokenBudget,
  OLLAMA_MIN_INPUT_TOKEN_BUDGET,
  OLLAMA_BUDGET_SAFETY_MARGIN,
  OLLAMA_OUTPUT_TOKEN_RESERVE,
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
      32_768 - OLLAMA_OUTPUT_TOKEN_RESERVE - OLLAMA_BUDGET_SAFETY_MARGIN,
    );
    expect(fromContext.budget).toBeGreaterThan(16_000);
  });

  it('caps context-derived budget to the window minus output and safety', () => {
    const small = estimateOllamaInputTokenBudget('tiny', { contextLength: 4_096 });
    expect(small.budget).toBe(4_096 - OLLAMA_OUTPUT_TOKEN_RESERVE - OLLAMA_BUDGET_SAFETY_MARGIN);
    expect(small.warnTooSmall).toBe(true);
  });

  it('falls back to the parameter heuristic for a non-finite or non-positive contextLength', () => {
    expect(estimateOllamaInputTokenBudget('llama3.1:8b', { contextLength: NaN }).source).toBe(
      'parameter-heuristic',
    );
    expect(estimateOllamaInputTokenBudget('llama3.1:8b', { contextLength: 0 }).source).toBe(
      'parameter-heuristic',
    );
    expect(estimateOllamaInputTokenBudget('llama3.1:8b', { contextLength: -1 }).source).toBe(
      'parameter-heuristic',
    );
  });
});
