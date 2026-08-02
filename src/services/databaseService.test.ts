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
  bulkAddEntries,
  updateEntry,
  deleteEntries,
  clearAllEntries,
  bulkUpdateEntriesInTransaction,
  getAllEntries,
  getAllPresets,
  addPreset,
  removePreset,
  getAllCollections,
  addCollection,
  updateCollection,
  deleteCollection,
} from './databaseService';
import { defaultSettings } from '../store/slices/settingsSlice';
import { createResearchCheckpoint } from '../lib/researchCheckpoint';
import type { ResearchInput } from '../types';

const makeKbEntry = (id: string, title: string) => ({
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

  it('strips ncbiApiKey from persisted settings (vault-only)', async () => {
    const next = {
      ...defaultSettings,
      ai: { ...defaultSettings.ai, ncbiApiKey: 'should-not-persist' },
    };
    await saveSettings(next);
    const loaded = await getSettings();
    expect(loaded?.ai.ncbiApiKey).toBe('');
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
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('applies multiple updates in one transaction', async () => {
    await addEntry(makeKbEntry('a', 'Old A'));
    await addEntry(makeKbEntry('b', 'Old B'));

    await bulkUpdateEntriesInTransaction([
      { id: 'a', changes: { title: 'New A' } },
      { id: 'b', changes: { title: 'New B' } },
    ]);

    const entries = await getAllEntries();
    expect(entries.find((e) => e.id === 'a')?.title).toBe('New A');
    expect(entries.find((e) => e.id === 'b')?.title).toBe('New B');
  });

  it('no-ops on empty updates array', async () => {
    await addEntry(makeKbEntry('a', 'Stable'));
    await bulkUpdateEntriesInTransaction([]);
    const entries = await getAllEntries();
    expect(entries[0]?.title).toBe('Stable');
  });

  it('rolls back when a later update fails', async () => {
    await addEntry(makeKbEntry('a', 'Before'));
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

describe('databaseService presets and collections', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('persists presets', async () => {
    const preset = {
      id: 'preset-1',
      name: 'Cardio scan',
      settings: {
        researchTopic: 'heart failure',
        dateRange: '5y' as const,
        articleTypes: [],
        synthesisFocus: 'overview' as const,
        maxArticlesToScan: 10,
        topNToSynthesize: 5,
      },
    };
    await addPreset(preset);
    const presets = await getAllPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]?.name).toBe('Cardio scan');
    await removePreset('preset-1');
    await expect(getAllPresets()).resolves.toEqual([]);
  });

  it('persists collections with updates and deletes', async () => {
    const col = {
      id: 'col-1',
      name: 'Trial set',
      description: 'Phase II',
      color: '#336699',
      icon: '📚',
      entryIds: [],
      articlePmids: [],
      createdAt: 1,
      updatedAt: 1,
      tags: ['oncology'],
    };
    await addCollection(col);
    await updateCollection('col-1', { name: 'Trial set v2', updatedAt: 2 });
    const listed = await getAllCollections();
    expect(listed[0]?.name).toBe('Trial set v2');
    await deleteCollection('col-1');
    await expect(getAllCollections()).resolves.toEqual([]);
  });
});

describe('databaseService knowledge-base bulk ops', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('bulkAddEntries inserts multiple rows', async () => {
    await bulkAddEntries([makeKbEntry('x', 'X'), makeKbEntry('y', 'Y')]);
    const entries = await getAllEntries();
    expect(entries.map((e) => e.id).sort()).toEqual(['x', 'y']);
  });

  it('updateEntry patches a single entry', async () => {
    await addEntry(makeKbEntry('u', 'Before'));
    await updateEntry('u', { title: 'After' });
    const entry = await getAllEntries();
    expect(entry[0]?.title).toBe('After');
  });

  it('deleteEntries removes selected ids', async () => {
    await bulkAddEntries([makeKbEntry('keep', 'Keep'), makeKbEntry('drop', 'Drop')]);
    await deleteEntries(['drop']);
    const ids = await getAllEntries().then((rows) => rows.map((r) => r.id));
    expect(ids).toEqual(['keep']);
  });

  it('clearAllEntries wipes the table', async () => {
    await addEntry(makeKbEntry('wipe', 'Wipe'));
    await clearAllEntries();
    await expect(getAllEntries()).resolves.toEqual([]);
  });

  it('getAllEntries returns newest-first by timestamp', async () => {
    await addEntry({ ...makeKbEntry('old', 'Old'), timestamp: 10 });
    await addEntry({ ...makeKbEntry('new', 'New'), timestamp: 99 });
    const entries = await getAllEntries();
    expect(entries.map((e) => e.id)).toEqual(['new', 'old']);
  });
});

describe('databaseService checkpoint ordering', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('getLatestResearchCheckpoints respects limit and newest-first order', async () => {
    const input: ResearchInput = {
      researchTopic: 't',
      dateRange: 'any',
      articleTypes: [],
      synthesisFocus: 'overview',
      maxArticlesToScan: 10,
      topNToSynthesize: 3,
    };
    for (const now of [100, 200, 300]) {
      await saveResearchCheckpoint(
        createResearchCheckpoint({
          input,
          phase: 'Phase 3',
          reason: 'abort',
          synthesisSoFar: `partial-${now}`,
          now,
        }),
      );
    }
    const latest = await getLatestResearchCheckpoints(2);
    expect(latest).toHaveLength(2);
    expect(latest[0]?.createdAt).toBeGreaterThan(latest[1]?.createdAt ?? 0);
  });
});
