/**
 * Thin adapter: routes literature orchestration between live Gemini and local heuristics.
 * Keeps `geminiService` as the public entry while avoiding further monolith growth (ADR 0007).
 * Freezes ResearchExecutionContext once at stream start (ADR 0017).
 */
import type { ResearchInput, ResearchReport, Settings } from '../types';
import { AppError } from '../lib/errors';
import type { PromptBudgetAccounting } from '../lib/promptBudget';
import {
  buildResearchExecutionContext,
  EXECUTION_PROVENANCE_PHASE,
  type ResearchExecutionContext,
} from '../lib/researchExecutionContext';
import { generateNonAiResearchReportStream } from './nonAi';
import { resolveActiveInferenceMode } from './resolveActiveInferenceMode';
import type { InferenceModeSnapshot } from './inferenceMode';

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AppError({
      code: 'STREAM_ABORTED',
      message: 'Research stream aborted',
    });
  }
}

export type ResearchStreamEvent = {
  report?: ResearchReport;
  synthesisChunk?: string;
  phase: string;
  promptBudget?: PromptBudgetAccounting;
  /** Present on the first event; frozen for the rest of the run. */
  executionContext?: ResearchExecutionContext;
};

export type { ResearchExecutionContext };

/** True when the local heuristic path should run instead of a live provider. */
export async function shouldUseHeuristic(aiSettings: Settings['ai']): Promise<boolean> {
  const snap = await resolveActiveInferenceMode({
    forceHeuristic: Boolean(aiSettings.forceHeuristicMode),
    provider: aiSettings.provider ?? 'gemini',
  });
  return snap.mode === 'heuristic';
}

type LiveStream = (
  input: ResearchInput,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
) => AsyncGenerator<ResearchStreamEvent>;

const EDUCATIONAL_DEMO_SNAPSHOT: InferenceModeSnapshot = {
  mode: 'heuristic',
  reason: 'force',
  hasApiKey: true,
  isOnline: true,
  forceHeuristic: true,
  provider: 'heuristic',
};

/**
 * Mode-aware research stream: heuristic when no key / offline / forced; otherwise live.
 * Explicit educational demo always routes to the Non-AI engine (ADR 0016) so the
 * synthetic corpus is never mixed with a live PubMed/arXiv provider run.
 * Yields a frozen `executionContext` on the first event before any pipeline work (ADR 0017).
 */
export async function* generateResearchReportStreamWithMode(
  input: ResearchInput,
  aiSettings: Settings['ai'],
  liveStream: LiveStream,
  signal?: AbortSignal,
): AsyncGenerator<ResearchStreamEvent> {
  throwIfAborted(signal);
  const snapshot: InferenceModeSnapshot = input.educationalDemoMode
    ? EDUCATIONAL_DEMO_SNAPSHOT
    : await resolveActiveInferenceMode({
        forceHeuristic: Boolean(aiSettings.forceHeuristicMode),
        provider: aiSettings.provider ?? 'gemini',
      });
  throwIfAborted(signal);
  const executionContext = buildResearchExecutionContext({ snapshot, aiSettings });
  yield { phase: EXECUTION_PROVENANCE_PHASE, executionContext };
  throwIfAborted(signal);

  if (snapshot.mode === 'heuristic') {
    yield* generateNonAiResearchReportStream(input, signal);
    return;
  }
  yield* liveStream(input, aiSettings, signal);
}
