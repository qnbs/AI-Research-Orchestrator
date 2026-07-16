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

/** Human-readable relative age for checkpoint banners (English, UI may wrap). */
export function formatCheckpointAge(updatedAt: number, now = Date.now()): string {
  const deltaMs = Math.max(0, now - updatedAt);
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Merge checkpoint synthesis into a displayable report for soft resume. */
export function reportFromCheckpoint(ckpt: ResearchCheckpoint) {
  const base = ckpt.report;
  const synthesis = ckpt.synthesisSoFar.trim() || base?.synthesis || '';
  if (!base && !synthesis) return null;
  return {
    synthesis,
    rankedArticles: base?.rankedArticles ?? [],
    generatedQueries: base?.generatedQueries ?? [],
    aiGeneratedInsights: base?.aiGeneratedInsights ?? [],
    overallKeywords: base?.overallKeywords ?? [],
  };
}
