import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ResearchInput, Settings } from '../types';
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
    expect(events).toEqual(['live-ranking']);
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
    expect(events[0]).toMatch(/Phase 1/i);
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
    for await (const event of generateResearchReportStreamWithMode(
      { ...baseInput, educationalDemoMode: true },
      baseAiSettings,
      liveStream,
    )) {
      events.push(event.phase);
    }

    expect(liveStream).not.toHaveBeenCalled();
    expect(resolveActiveInferenceMode).not.toHaveBeenCalled();
    expect(events[0]).toMatch(/Phase 1/i);
  });
});
