import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  getSettings,
  saveSettings,
  saveResearchCheckpoint,
  getResearchCheckpoint,
  getLatestResearchCheckpoints,
  deleteResearchCheckpoint,
  clearResearchCheckpoints,
} from './databaseService';
import { defaultSettings } from '../store/slices/settingsSlice';
import { createResearchCheckpoint } from '../lib/researchCheckpoint';
import type { ResearchInput } from '../types';

describe('databaseService settings IO', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('saveSettings round-trips', async () => {
    const next = { ...defaultSettings, appLanguage: 'de' as const };
    await saveSettings(next);
    const loaded = await getSettings();
    expect(loaded?.appLanguage).toBe('de');
  });

  it('persists research checkpoints', async () => {
    const input: ResearchInput = {
      researchTopic: 'checkpoint topic',
      dateRange: 'any',
      articleTypes: [],
      synthesisFocus: 'overview',
      maxArticlesToScan: 10,
      topNToSynthesize: 3,
    };
    const ckpt = createResearchCheckpoint({
      input,
      phase: 'Phase 3',
      reason: 'abort',
      synthesisSoFar: 'partial text',
      now: 100,
    });
    await saveResearchCheckpoint(ckpt);
    await expect(getResearchCheckpoint(ckpt.id)).resolves.toMatchObject({
      topic: 'checkpoint topic',
      reason: 'abort',
    });
    const latest = await getLatestResearchCheckpoints(5);
    expect(latest[0]?.id).toBe(ckpt.id);
    await deleteResearchCheckpoint(ckpt.id);
    await expect(getResearchCheckpoint(ckpt.id)).resolves.toBeUndefined();
    await saveResearchCheckpoint(ckpt);
    await clearResearchCheckpoints();
    await expect(getLatestResearchCheckpoints()).resolves.toEqual([]);
  });
});
