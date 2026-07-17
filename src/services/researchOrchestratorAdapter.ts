/**
 * Thin adapter: routes literature orchestration between live Gemini and local heuristics.
 * Keeps `geminiService` as the public entry while avoiding further monolith growth (ADR 0007).
 */
import type { ResearchInput, ResearchReport, Settings } from '../types';
import { generateHeuristicResearchReportStream } from './heuristics';
import { resolveActiveInferenceMode } from './resolveActiveInferenceMode';

export type ResearchStreamEvent = {
  report?: ResearchReport;
  synthesisChunk?: string;
  phase: string;
};

/** True when the local heuristic path should run instead of live Gemini. */
export async function shouldUseHeuristic(aiSettings: Settings['ai']): Promise<boolean> {
  const snap = await resolveActiveInferenceMode({
    forceHeuristic: Boolean(aiSettings.forceHeuristicMode),
  });
  return snap.mode === 'heuristic';
}

type LiveStream = (
  input: ResearchInput,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
) => AsyncGenerator<ResearchStreamEvent>;

/**
 * Mode-aware research stream: heuristic when no key / offline / forced; otherwise live.
 */
export async function* generateResearchReportStreamWithMode(
  input: ResearchInput,
  aiSettings: Settings['ai'],
  liveStream: LiveStream,
  signal?: AbortSignal,
): AsyncGenerator<ResearchStreamEvent> {
  if (await shouldUseHeuristic(aiSettings)) {
    yield* generateHeuristicResearchReportStream(input, aiSettings, signal);
    return;
  }
  yield* liveStream(input, aiSettings, signal);
}
