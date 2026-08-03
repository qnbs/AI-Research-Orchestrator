/**
 * Conservative prompt-input budgets for local Ollama model identifiers.
 *
 * Authoritative source: runtime context window from `/api/show` when available.
 * Parameter count is a quality/performance hint only — not context capacity.
 */

/** Minimum input budget so ranking/synthesis overhead still leaves headroom. */
export const OLLAMA_MIN_INPUT_TOKEN_BUDGET = 6_000;

/** Reserved tokens for model output during ranking/synthesis. */
export const OLLAMA_OUTPUT_TOKEN_RESERVE = 2_048;

/** System prompt, provenance, and structured-output overhead. */
export const OLLAMA_PROMPT_OVERHEAD_RESERVE = 1_536;

/** Safety margin to avoid edge truncation. */
export const OLLAMA_BUDGET_SAFETY_MARGIN = 512;

export type OllamaBudgetSource = 'context-length' | 'parameter-heuristic' | 'default';

export type OllamaInputBudgetEstimate = {
  budget: number;
  warnTooSmall: boolean;
  source: OllamaBudgetSource;
  /** Effective context window when known. */
  contextLength?: number;
};

function parseParameterBillions(model: string, parameterSize?: string): number {
  const haystack = `${model} ${parameterSize ?? ''}`.toLowerCase();
  const moe = haystack.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*b\b/);
  if (moe) {
    return Number(moe[1]) * Number(moe[2]);
  }
  const match = haystack.match(/(\d+(?:\.\d+)?)\s*b\b/);
  return match ? Number(match[1]) : NaN;
}

function budgetFromContextLength(contextLength: number): OllamaInputBudgetEstimate {
  const raw = contextLength - OLLAMA_OUTPUT_TOKEN_RESERVE - OLLAMA_BUDGET_SAFETY_MARGIN;
  const usable = Math.max(0, Math.floor(raw));
  // Never inflate above runtime context — stage overhead is applied once in promptBudget.
  const budget = usable;
  const warnTooSmall = contextLength < 8_192 || usable < OLLAMA_MIN_INPUT_TOKEN_BUDGET;
  return {
    budget,
    warnTooSmall,
    source: 'context-length',
    contextLength,
  };
}

function budgetFromParameterHeuristic(
  model: string,
  parameterSize?: string,
): OllamaInputBudgetEstimate {
  const billions = parseParameterBillions(model, parameterSize);

  if (!Number.isFinite(billions)) {
    return { budget: 8_000, warnTooSmall: false, source: 'default' };
  }
  if (billions <= 3) {
    return {
      budget: OLLAMA_MIN_INPUT_TOKEN_BUDGET,
      warnTooSmall: true,
      source: 'parameter-heuristic',
    };
  }
  if (billions <= 8) {
    return { budget: 8_000, warnTooSmall: true, source: 'parameter-heuristic' };
  }
  if (billions <= 14) {
    return { budget: 12_000, warnTooSmall: false, source: 'parameter-heuristic' };
  }
  return { budget: 16_000, warnTooSmall: false, source: 'parameter-heuristic' };
}

export function estimateOllamaInputTokenBudget(
  model: string,
  hints?: { parameterSize?: string; contextLength?: number },
): OllamaInputBudgetEstimate {
  const contextLength = hints?.contextLength;
  if (typeof contextLength === 'number' && Number.isFinite(contextLength) && contextLength > 0) {
    return budgetFromContextLength(contextLength);
  }
  return budgetFromParameterHeuristic(model, hints?.parameterSize);
}
