/**
 * Conservative prompt-input budgets for local Ollama model identifiers.
 */

export function estimateOllamaInputTokenBudget(
  model: string,
  parameterSize?: string,
): { budget: number; warnTooSmall: boolean } {
  const haystack = `${model} ${parameterSize ?? ''}`.toLowerCase();
  const match = haystack.match(/(\d+(?:\.\d+)?)\s*b\b/);
  const billions = match ? Number(match[1]) : NaN;

  if (!Number.isFinite(billions)) {
    return { budget: 8_000, warnTooSmall: false };
  }
  if (billions <= 3) {
    return { budget: 4_000, warnTooSmall: true };
  }
  if (billions <= 8) {
    return { budget: 8_000, warnTooSmall: true };
  }
  if (billions <= 14) {
    return { budget: 12_000, warnTooSmall: false };
  }
  return { budget: 16_000, warnTooSmall: false };
}
