/**
 * Immutable research-run execution provenance (ADR 0017).
 * Resolved once at stream start; stamped onto the completed report without re-resolving.
 */

import type {
  InferenceMode,
  InferenceModeReason,
  InferenceModeSnapshot,
} from '../services/inferenceMode';
import type { AIProviderSelection } from '../services/providers/types';
import type { Settings } from '../types';
import { getAppReleaseInfo } from './appReleaseInfo';
import { PROMPT_CATALOG_VERSION } from './promptRegistry';

/** Mid-run mode/provider change (append-only). Prefer clean restart over silent switch. */
export interface InferenceTransition {
  at: number;
  fromMode: InferenceMode;
  toMode: InferenceMode;
  reason: string;
}

/** Frozen snapshot of how a research run was started. */
export interface ResearchExecutionContext {
  executionId: string;
  startedAt: number;
  inferenceMode: InferenceMode;
  inferenceReason: InferenceModeReason;
  providerId: AIProviderSelection;
  model: string;
  /** Origin of custom/Ollama base URL when configured. */
  endpointOrigin?: string;
  appVersion: string;
  buildCommitSha: string;
  dexieSchemaVersion: number;
  swCacheVersion: string;
  promptRegistryVersion: string;
  /** Empty unless a documented mid-run transition is recorded. */
  transitions: InferenceTransition[];
}

export const EXECUTION_PROVENANCE_PHASE = 'execution-provenance' as const;

function createExecutionId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `exec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Parse a safe origin from approvedEndpointOrigin or customBaseUrl. */
export function resolveEndpointOrigin(aiSettings: Settings['ai']): string | undefined {
  const approved = aiSettings.approvedEndpointOrigin?.trim();
  if (approved) return approved;
  const custom = aiSettings.customBaseUrl?.trim();
  if (!custom) return undefined;
  try {
    return new URL(custom).origin;
  } catch {
    return undefined;
  }
}

export interface BuildExecutionContextOptions {
  snapshot: InferenceModeSnapshot;
  aiSettings: Settings['ai'];
  startedAt?: number;
  executionId?: string;
}

/**
 * Build a frozen execution context from the start-of-run inference snapshot.
 * Heuristic runs stamp providerId as `heuristic` (executed backend), not the UI selection.
 */
export function buildResearchExecutionContext(
  options: BuildExecutionContextOptions,
): ResearchExecutionContext {
  const { snapshot, aiSettings } = options;
  const release = getAppReleaseInfo();
  const executedProviderId: AIProviderSelection =
    snapshot.mode === 'heuristic' ? 'heuristic' : (aiSettings.provider ?? 'gemini');
  const endpointOrigin = resolveEndpointOrigin(aiSettings);

  return {
    executionId: options.executionId ?? createExecutionId(),
    startedAt: options.startedAt ?? Date.now(),
    inferenceMode: snapshot.mode,
    inferenceReason: snapshot.reason,
    providerId: executedProviderId,
    model: aiSettings.model,
    ...(endpointOrigin ? { endpointOrigin } : {}),
    appVersion: release.appVersion,
    buildCommitSha: release.buildCommitSha,
    dexieSchemaVersion: release.dexieSchemaVersion,
    swCacheVersion: release.swCacheVersion,
    promptRegistryVersion: PROMPT_CATALOG_VERSION,
    transitions: [],
  };
}
