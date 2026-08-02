import { describe, it, expect } from 'vitest';
import {
  resolveInferenceMode,
  inferenceModeBadgeLabel,
  inferenceModeBadgeKey,
  isZeroCostMode,
} from './inferenceMode';

describe('resolveInferenceMode', () => {
  it('prefers force heuristic over live', () => {
    const snap = resolveInferenceMode({
      forceHeuristic: true,
      hasApiKey: true,
      isOnline: true,
    });
    expect(snap.mode).toBe('heuristic');
    expect(snap.reason).toBe('force');
    expect(isZeroCostMode(snap)).toBe(true);
    expect(inferenceModeBadgeLabel(snap)).toMatch(/Forced/i);
  });

  it('uses heuristic when no API key', () => {
    const snap = resolveInferenceMode({
      forceHeuristic: false,
      hasApiKey: false,
      isOnline: true,
    });
    expect(snap).toMatchObject({ mode: 'heuristic', reason: 'no_api_key' });
  });

  it('uses heuristic when offline', () => {
    const snap = resolveInferenceMode({
      forceHeuristic: false,
      hasApiKey: true,
      isOnline: false,
    });
    expect(snap).toMatchObject({ mode: 'heuristic', reason: 'offline' });
    expect(inferenceModeBadgeLabel(snap)).toMatch(/Offline/i);
  });

  it('uses live when key + online and not forced', () => {
    const snap = resolveInferenceMode({
      forceHeuristic: false,
      hasApiKey: true,
      isOnline: true,
    });
    expect(snap.mode).toBe('live');
    expect(inferenceModeBadgeLabel(snap)).toMatch(/Gemini/i);
    expect(isZeroCostMode(snap)).toBe(false);
  });

  it('labels live OpenAI provider in badge', () => {
    const snap = resolveInferenceMode({
      forceHeuristic: false,
      hasApiKey: true,
      isOnline: true,
      provider: 'openai',
    });
    expect(snap.mode).toBe('live');
    expect(inferenceModeBadgeLabel(snap)).toMatch(/OpenAI/i);
    expect(inferenceModeBadgeKey(snap)).toBe('live');
  });

  it('uses heuristic when provider is heuristic even with key', () => {
    const snap = resolveInferenceMode({
      forceHeuristic: false,
      hasApiKey: true,
      isOnline: true,
      provider: 'heuristic',
    });
    expect(snap.mode).toBe('heuristic');
    expect(snap.reason).toBe('force');
    expect(inferenceModeBadgeKey(snap)).toBe('force');
  });
});

describe('inferenceModeBadgeKey', () => {
  it('maps heuristic reasons to i18n suffix keys', () => {
    expect(
      inferenceModeBadgeKey(
        resolveInferenceMode({
          forceHeuristic: false,
          hasApiKey: false,
          isOnline: true,
        }),
      ),
    ).toBe('no_key');
    expect(
      inferenceModeBadgeKey(
        resolveInferenceMode({
          forceHeuristic: false,
          hasApiKey: true,
          isOnline: false,
        }),
      ),
    ).toBe('offline');
    expect(
      inferenceModeBadgeKey(
        resolveInferenceMode({
          forceHeuristic: true,
          hasApiKey: true,
          isOnline: true,
        }),
      ),
    ).toBe('force');
  });

  it('falls back to heuristic key for unknown heuristic reason', () => {
    const snap = resolveInferenceMode({
      forceHeuristic: false,
      hasApiKey: true,
      isOnline: true,
      provider: 'heuristic',
    });
    snap.reason = 'live' as typeof snap.reason;
    expect(inferenceModeBadgeKey(snap)).toBe('heuristic');
    expect(inferenceModeBadgeLabel(snap)).toBe('Heuristic mode');
  });
});
