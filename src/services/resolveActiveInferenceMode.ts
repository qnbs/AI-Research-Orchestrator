/**
 * Async helpers that combine settings + API key vault + network into InferenceMode.
 */
import { hasApiKey } from './apiKeyService';
import {
  resolveInferenceMode,
  type InferenceModeSnapshot,
  type ResolveInferenceModeInput,
} from './inferenceMode';

export type { InferenceMode, InferenceModeReason, InferenceModeSnapshot } from './inferenceMode';
export { resolveInferenceMode, inferenceModeBadgeLabel, isZeroCostMode } from './inferenceMode';

export interface ResolveActiveModeOptions {
  forceHeuristic: boolean;
  /** Injectable for tests. */
  getOnline?: () => boolean;
  /** Injectable for tests. */
  checkApiKey?: () => Promise<boolean>;
}

/**
 * Resolve the active inference mode using the API key vault and navigator.onLine.
 */
export async function resolveActiveInferenceMode(
  options: ResolveActiveModeOptions,
): Promise<InferenceModeSnapshot> {
  const getOnline =
    options.getOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const checkApiKey = options.checkApiKey ?? hasApiKey;
  const input: ResolveInferenceModeInput = {
    forceHeuristic: options.forceHeuristic,
    hasApiKey: await checkApiKey(),
    isOnline: getOnline(),
  };
  return resolveInferenceMode(input);
}
