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
db.version(4)
  .stores({
    knowledgeBaseEntries: 'id, timestamp, sourceType, title',
    settings: 'id',
    presets: 'id',
    collections: 'id, name, createdAt, updatedAt',
    researchCheckpoints: 'id, createdAt, topic, reason',
  })
  .upgrade(() => Promise.resolve());

// --- KnowledgeBaseEntry Operations ---
/** Newest-first list of all knowledge-base entries. */
export const getAllEntries = () => db.knowledgeBaseEntries.orderBy('timestamp').reverse().toArray();
/** Insert a single KB entry (id is the primary key). */
export const addEntry = (entry: KnowledgeBaseEntry) => db.knowledgeBaseEntries.add(entry, entry.id);
/** Bulk-insert KB entries (used by import). */
export const bulkAddEntries = (entries: KnowledgeBaseEntry[]) =>
  db.knowledgeBaseEntries.bulkAdd(entries);
/** Patch fields on an existing KB entry. */
export const updateEntry = (id: string, changes: Partial<KnowledgeBaseEntry>) =>
  db.knowledgeBaseEntries.update(id, changes);
/** Delete one or more KB entries by id. */
export const deleteEntries = (ids: string[]) => db.knowledgeBaseEntries.bulkDelete(ids);
/** Wipe the entire knowledge base table. */
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

/** Load persisted app settings (NCBI key is never stored here — vault only). */
export const getSettings = (): Promise<Settings | undefined> => db.settings.get(SETTINGS_ID);
/** Persist settings with NCBI key stripped for the Dexie row. */
export const saveSettings = (settings: Settings): Promise<string> =>
  db.settings.put({ ...sanitizeSettingsForStorage(settings), id: SETTINGS_ID });

// --- Preset Operations ---
/** List all research presets. */
export const getAllPresets = () => db.presets.toArray();
/** Add a preset by id. */
export const addPreset = (preset: Preset) => db.presets.add(preset, preset.id);
/** Remove a preset by id. */
export const removePreset = (id: string) => db.presets.delete(id);

// --- Collection Operations ---
/** Newest-first research collections. */
export const getAllCollections = () => db.collections.orderBy('createdAt').reverse().toArray();
/** Insert a collection. */
export const addCollection = (col: ResearchCollection) => db.collections.add(col, col.id);
/** Patch a collection. */
export const updateCollection = (id: string, changes: Partial<ResearchCollection>) =>
  db.collections.update(id, changes);
/** Delete a collection. */
export const deleteCollection = (id: string) => db.collections.delete(id);

// --- Research checkpoint Operations (partial save / resume) ---
/** Upsert a research checkpoint for soft resume. */
export const saveResearchCheckpoint = (checkpoint: ResearchCheckpoint) =>
  db.researchCheckpoints.put(checkpoint);
/** Fetch one checkpoint by id. */
export const getResearchCheckpoint = (id: string) => db.researchCheckpoints.get(id);
/** Latest checkpoints (default 20). */
export const getLatestResearchCheckpoints = (limit = 20) =>
  db.researchCheckpoints.orderBy('createdAt').reverse().limit(limit).toArray();
/** Delete one checkpoint. */
export const deleteResearchCheckpoint = (id: string) => db.researchCheckpoints.delete(id);
/** Clear all checkpoints. */
export const clearResearchCheckpoints = () => db.researchCheckpoints.clear();
