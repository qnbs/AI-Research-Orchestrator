/**
 * Conservative prompt-input budgets for local Ollama model identifiers.
 *
 * Ranking reserves ~4.5k tokens of overhead, so even "small" models keep a
 * floor that leaves a usable selection budget.
 */

/** Minimum input budget so ranking/synthesis overhead still leaves headroom. */
export const OLLAMA_MIN_INPUT_TOKEN_BUDGET = 6_000;

function parseParameterBillions(model: string, parameterSize?: string): number {
  const haystack = `${model} ${parameterSize ?? ''}`.toLowerCase();
  // MoE forms like mixtral:8x7b → 56B effective
  const moe = haystack.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*b\b/);
  if (moe) {
    return Number(moe[1]) * Number(moe[2]);
  }
  const match = haystack.match(/(\d+(?:\.\d+)?)\s*b\b/);
  return match ? Number(match[1]) : NaN;
}

export function estimateOllamaInputTokenBudget(
  model: string,
  parameterSize?: string,
): { budget: number; warnTooSmall: boolean } {
  const billions = parseParameterBillions(model, parameterSize);

  if (!Number.isFinite(billions)) {
    return { budget: 8_000, warnTooSmall: false };
  }
  if (billions <= 3) {
    return { budget: OLLAMA_MIN_INPUT_TOKEN_BUDGET, warnTooSmall: true };
  }
  if (billions <= 8) {
    return { budget: 8_000, warnTooSmall: true };
  }
  if (billions <= 14) {
    return { budget: 12_000, warnTooSmall: false };
  }
  return { budget: 16_000, warnTooSmall: false };
}
