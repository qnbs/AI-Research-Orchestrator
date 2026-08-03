import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ResearchInput, Settings } from '../types';
import { EXECUTION_PROVENANCE_PHASE } from '../lib/researchExecutionContext';
import {
  generateResearchReportStreamWithMode,
  shouldUseHeuristic,
} from './researchOrchestratorAdapter';
import { resolveActiveInferenceMode } from './resolveActiveInferenceMode';

vi.mock('./resolveActiveInferenceMode', () => ({
  resolveActiveInferenceMode: vi.fn(),
}));

vi.mock('./nonAi', () => ({
  generateNonAiResearchReportStream: vi.fn(async function* () {
    yield { phase: 'heuristic · Phase 1: Building Boolean query with MeSH terms...' };
    yield { phase: 'heuristic · Finalizing report...' };
  }),
}));

const baseInput: ResearchInput = {
  researchTopic: 'aspirin cardiovascular prevention',
  dateRange: '5y',
  articleTypes: [],
  synthesisFocus: 'efficacy',
  maxArticlesToScan: 20,
  topNToSynthesize: 5,
};

const baseAiSettings: Settings['ai'] = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  customPreamble: '',
  temperature: 0.5,
  aiLanguage: 'English',
  aiPersona: 'Neutral Scientist',
  researchAssistant: {
    autoFetchSimilar: false,
    autoFetchOnline: false,
    authorSearchLimit: 10,
  },
  enableTldr: true,
  ncbiApiKey: '',
  forceHeuristicMode: false,
};

describe('researchOrchestratorAdapter', () => {
  beforeEach(() => {
    vi.mocked(resolveActiveInferenceMode).mockReset();
  });

  it('shouldUseHeuristic reflects resolved snapshot', async () => {
    vi.mocked(resolveActiveInferenceMode).mockResolvedValue({
      mode: 'heuristic',
      reason: 'no_api_key',
      hasApiKey: false,
      isOnline: true,
      forceHeuristic: false,
      provider: 'gemini',
    });

    expect(await shouldUseHeuristic(baseAiSettings)).toBe(true);
  });

  it('delegates to live stream when inference mode is live', async () => {
    vi.mocked(resolveActiveInferenceMode).mockResolvedValue({
      mode: 'live',
      reason: 'live',
      hasApiKey: true,
      isOnline: true,
      forceHeuristic: false,
      provider: 'gemini',
    });

    const liveStream = vi.fn(async function* () {
      yield { phase: 'live-ranking' };
    });

    const events: string[] = [];
    for await (const event of generateResearchReportStreamWithMode(
      baseInput,
      baseAiSettings,
      liveStream,
    )) {
      events.push(event.phase);
    }

    expect(liveStream).toHaveBeenCalledOnce();
    expect(events[0]).toBe(EXECUTION_PROVENANCE_PHASE);
    expect(events.slice(1)).toEqual(['live-ranking']);
  });

  it('uses heuristic stream when mode resolves to heuristic', async () => {
    vi.mocked(resolveActiveInferenceMode).mockResolvedValue({
      mode: 'heuristic',
      reason: 'no_api_key',
      hasApiKey: false,
      isOnline: true,
      forceHeuristic: false,
      provider: 'gemini',
    });

    const liveStream = vi.fn(async function* () {
      yield { phase: 'should-not-run' };
    });

    const events: string[] = [];
    for await (const event of generateResearchReportStreamWithMode(
      baseInput,
      baseAiSettings,
      liveStream,
    )) {
      events.push(event.phase);
    }

    expect(liveStream).not.toHaveBeenCalled();
    expect(events[0]).toBe(EXECUTION_PROVENANCE_PHASE);
    expect(events[1]).toMatch(/Phase 1/i);
    expect(events.at(-1)).toMatch(/Finalizing/i);
  });

  it('routes educationalDemoMode through Non-AI even when live inference is available', async () => {
    vi.mocked(resolveActiveInferenceMode).mockResolvedValue({
      mode: 'live',
      reason: 'live',
      hasApiKey: true,
      isOnline: true,
      forceHeuristic: false,
      provider: 'gemini',
    });

    const liveStream = vi.fn(async function* () {
      yield { phase: 'should-not-run' };
    });

    const events: string[] = [];
    let frozenMode: string | undefined;
    let frozenProvider: string | undefined;
    for await (const event of generateResearchReportStreamWithMode(
      { ...baseInput, educationalDemoMode: true },
      baseAiSettings,
      liveStream,
    )) {
      events.push(event.phase);
      if (event.executionContext) {
        frozenMode = event.executionContext.inferenceMode;
        frozenProvider = event.executionContext.providerId;
      }
    }

    expect(liveStream).not.toHaveBeenCalled();
    expect(resolveActiveInferenceMode).not.toHaveBeenCalled();
    expect(events[0]).toBe(EXECUTION_PROVENANCE_PHASE);
    expect(events[1]).toMatch(/Phase 1/i);
    expect(frozenMode).toBe('heuristic');
    expect(frozenProvider).toBe('heuristic');
  });

  it('rejects with STREAM_ABORTED when signal is already aborted', async () => {
    const liveStream = vi.fn(async function* () {
      yield { phase: 'should-not-run' };
    });
    const ac = new AbortController();
    ac.abort();

    const gen = generateResearchReportStreamWithMode(
      baseInput,
      baseAiSettings,
      liveStream,
      ac.signal,
    );
    await expect(gen.next()).rejects.toMatchObject({ code: 'STREAM_ABORTED' });
    expect(liveStream).not.toHaveBeenCalled();
    expect(resolveActiveInferenceMode).not.toHaveBeenCalled();
  });

  it('freezes heuristic provenance once at start even if later resolve would be live', async () => {
    vi.mocked(resolveActiveInferenceMode).mockResolvedValue({
      mode: 'heuristic',
      reason: 'offline',
      hasApiKey: true,
      isOnline: false,
      forceHeuristic: false,
      provider: 'gemini',
    });

    const liveStream = vi.fn(async function* () {
      yield { phase: 'live' };
    });

    let frozenMode: string | undefined;
    let frozenReason: string | undefined;
    let frozenProvider: string | undefined;
    for await (const event of generateResearchReportStreamWithMode(
      baseInput,
      baseAiSettings,
      liveStream,
    )) {
      if (event.executionContext) {
        frozenMode = event.executionContext.inferenceMode;
        frozenReason = event.executionContext.inferenceReason;
        frozenProvider = event.executionContext.providerId;
      }
    }

    // Only one resolve at stream start — completion must not call again.
    expect(resolveActiveInferenceMode).toHaveBeenCalledOnce();
    expect(frozenMode).toBe('heuristic');
    expect(frozenReason).toBe('offline');
    expect(frozenProvider).toBe('heuristic');
  });
});
