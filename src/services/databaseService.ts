import Dexie, { type Table } from 'dexie';
import type { KnowledgeBaseEntry, Settings, Preset, ResearchCollection } from '../types';
import type { ResearchCheckpoint } from '../lib/researchCheckpoint';

export const db = new Dexie('AIResearchAppDatabase') as Dexie & {
  knowledgeBaseEntries: Table<KnowledgeBaseEntry, string>;
  settings: Table<Settings & { id: string }, string>;
  presets: Table<Preset, string>;
  collections: Table<ResearchCollection, string>;
  researchCheckpoints: Table<ResearchCheckpoint, string>;
};

// Keep older versions for upgrade path (Dexie requires ascending declaration order).
db.version(2).stores({
  knowledgeBaseEntries: 'id, timestamp, sourceType, title',
  settings: 'id',
  presets: 'id',
});

db.version(3)
  .stores({
    knowledgeBaseEntries: 'id, timestamp, sourceType, title',
    settings: 'id',
    presets: 'id',
    collections: 'id, name, createdAt, updatedAt',
  })
  .upgrade(() => Promise.resolve());

// Version 4: research checkpoints for partial-save / resume after abort or error
db.version(4).stores({
  knowledgeBaseEntries: 'id, timestamp, sourceType, title',
  settings: 'id',
  presets: 'id',
  collections: 'id, name, createdAt, updatedAt',
  researchCheckpoints: 'id, createdAt, topic, reason',
});

// --- KnowledgeBaseEntry Operations ---
export const getAllEntries = () => db.knowledgeBaseEntries.orderBy('timestamp').reverse().toArray();
export const addEntry = (entry: KnowledgeBaseEntry) => db.knowledgeBaseEntries.add(entry, entry.id);
export const bulkAddEntries = (entries: KnowledgeBaseEntry[]) =>
  db.knowledgeBaseEntries.bulkAdd(entries);
export const updateEntry = (id: string, changes: Partial<KnowledgeBaseEntry>) =>
  db.knowledgeBaseEntries.update(id, changes);
export const deleteEntries = (ids: string[]) => db.knowledgeBaseEntries.bulkDelete(ids);
export const clearAllEntries = () => db.knowledgeBaseEntries.clear();

// --- Settings Operations ---
const SETTINGS_ID = 'appSettings';
const sanitizeSettingsForStorage = (settings: Settings): Settings => ({
  ...settings,
  ai: {
    ...settings.ai,
    ncbiApiKey: '',
  },
});

export const getSettings = (): Promise<Settings | undefined> => db.settings.get(SETTINGS_ID);
export const saveSettings = (settings: Settings): Promise<string> =>
  db.settings.put({ ...sanitizeSettingsForStorage(settings), id: SETTINGS_ID });

// --- Preset Operations ---
export const getAllPresets = () => db.presets.toArray();
export const addPreset = (preset: Preset) => db.presets.add(preset, preset.id);
export const removePreset = (id: string) => db.presets.delete(id);

// --- Collection Operations ---
export const getAllCollections = () => db.collections.orderBy('createdAt').reverse().toArray();
export const addCollection = (col: ResearchCollection) => db.collections.add(col, col.id);
export const updateCollection = (id: string, changes: Partial<ResearchCollection>) =>
  db.collections.update(id, changes);
export const deleteCollection = (id: string) => db.collections.delete(id);

// --- Research checkpoint Operations (partial save / resume) ---
export const saveResearchCheckpoint = (checkpoint: ResearchCheckpoint) =>
  db.researchCheckpoints.put(checkpoint);
export const getResearchCheckpoint = (id: string) => db.researchCheckpoints.get(id);
export const getLatestResearchCheckpoints = (limit = 20) =>
  db.researchCheckpoints.orderBy('createdAt').reverse().limit(limit).toArray();
export const deleteResearchCheckpoint = (id: string) => db.researchCheckpoints.delete(id);
export const clearResearchCheckpoints = () => db.researchCheckpoints.clear();
