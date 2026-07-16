/**
 * Research run checkpoints — partial reports saved on abort/error for resume UX.
 */

import type { ResearchInput, ResearchReport } from '../types';

export type CheckpointReason = 'abort' | 'error' | 'manual';

export interface ResearchCheckpoint {
  id: string;
  createdAt: number;
  updatedAt: number;
  reason: CheckpointReason;
  phase: string;
  topic: string;
  input: ResearchInput;
  report: ResearchReport | null;
  synthesisSoFar: string;
  errorMessage?: string;
}

function createCheckpointNonce(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export function buildCheckpointId(
  topic: string,
  now = Date.now(),
  nonce = createCheckpointNonce(),
): string {
  const slug = topic
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `ckpt_${slug || 'research'}_${now}_${nonce}`;
}

export function createResearchCheckpoint(params: {
  input: ResearchInput;
  phase: string;
  reason: CheckpointReason;
  report?: ResearchReport | null;
  synthesisSoFar?: string;
  errorMessage?: string;
  now?: number;
}): ResearchCheckpoint {
  const now = params.now ?? Date.now();
  return {
    id: buildCheckpointId(params.input.researchTopic, now),
    createdAt: now,
    updatedAt: now,
    reason: params.reason,
    phase: params.phase,
    topic: params.input.researchTopic,
    input: params.input,
    report: params.report ?? null,
    synthesisSoFar: params.synthesisSoFar ?? '',
    errorMessage: params.errorMessage,
  };
}

/** True when there is enough state to show a recoverable partial result. */
export function isResumableCheckpoint(ckpt: ResearchCheckpoint): boolean {
  return Boolean(ckpt.report?.rankedArticles?.length || ckpt.synthesisSoFar.trim());
}
