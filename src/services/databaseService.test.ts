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
  addEntry,
  bulkUpdateEntriesInTransaction,
  getAllEntries,
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

describe('bulkUpdateEntriesInTransaction', () => {
  const makeEntry = (id: string, title: string) => ({
    id,
    timestamp: 1,
    title,
    sourceType: 'research' as const,
    articles: [],
    input: {
      researchTopic: title,
      dateRange: 'any' as const,
      articleTypes: [],
      synthesisFocus: 'overview' as const,
      maxArticlesToScan: 10,
      topNToSynthesize: 5,
    },
    report: {
      generatedQueries: [],
      rankedArticles: [],
      synthesis: '',
      aiGeneratedInsights: [],
      overallKeywords: [],
    },
  });

  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('applies multiple updates in one transaction', async () => {
    await addEntry(makeEntry('a', 'Old A'));
    await addEntry(makeEntry('b', 'Old B'));

    await bulkUpdateEntriesInTransaction([
      { id: 'a', changes: { title: 'New A' } },
      { id: 'b', changes: { title: 'New B' } },
    ]);

    const entries = await getAllEntries();
    expect(entries.find((e) => e.id === 'a')?.title).toBe('New A');
    expect(entries.find((e) => e.id === 'b')?.title).toBe('New B');
  });

  it('no-ops on empty updates array', async () => {
    await addEntry(makeEntry('a', 'Stable'));
    await bulkUpdateEntriesInTransaction([]);
    const entries = await getAllEntries();
    expect(entries[0]?.title).toBe('Stable');
  });

  it('rolls back when a later update fails', async () => {
    await addEntry(makeEntry('a', 'Before'));
    await expect(
      bulkUpdateEntriesInTransaction([
        { id: 'a', changes: { title: 'After' } },
        { id: 'missing', changes: { title: 'Ghost' } },
      ]),
    ).rejects.toThrow();

    const entries = await getAllEntries();
    expect(entries.find((e) => e.id === 'a')?.title).toBe('Before');
  });
});
