import { describe, it, expect } from 'vitest';
import { resolveInferenceMode, inferenceModeBadgeLabel, isZeroCostMode } from './inferenceMode';

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
});
