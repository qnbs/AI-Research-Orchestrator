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

export function buildCheckpointId(topic: string, now = Date.now()): string {
  const slug = topic
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `ckpt_${slug || 'research'}_${now}`;
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
