import Dexie, { type Table } from 'dexie';
import type { KnowledgeBaseEntry, Settings, Preset, ResearchCollection } from '../types';

export const db = new Dexie('AIResearchAppDatabase') as Dexie & {
    knowledgeBaseEntries: Table<KnowledgeBaseEntry, string>;
    settings: Table<Settings & { id: string }, string>;
    presets: Table<Preset, string>;
    collections: Table<ResearchCollection, string>;
};

// Version 3: Added collections table for Research Collections feature
db.version(3).stores({
    knowledgeBaseEntries: 'id, timestamp, sourceType, title',
    settings: 'id',
    presets: 'id',
    collections: 'id, name, createdAt, updatedAt',
}).upgrade(tx => {
    // Migrate existing data — no structural changes needed for existing tables
    return Promise.resolve();
});

// Keep version 2 for backward compatibility
db.version(2).stores({
    knowledgeBaseEntries: 'id, timestamp, sourceType, title',
    settings: 'id',
    presets: 'id',
});

// --- KnowledgeBaseEntry Operations ---
export const getAllEntries = () => db.knowledgeBaseEntries.orderBy('timestamp').reverse().toArray();
export const addEntry = (entry: KnowledgeBaseEntry) => db.knowledgeBaseEntries.add(entry, entry.id);
export const bulkAddEntries = (entries: KnowledgeBaseEntry[]) => db.knowledgeBaseEntries.bulkAdd(entries);
export const updateEntry = (id: string, changes: Partial<KnowledgeBaseEntry>) => db.knowledgeBaseEntries.update(id, changes);
export const deleteEntries = (ids: string[]) => db.knowledgeBaseEntries.bulkDelete(ids);
export const clearAllEntries = () => db.knowledgeBaseEntries.clear();

// --- Settings Operations ---
const SETTINGS_ID = 'appSettings';
export const getSettings = (): Promise<Settings | undefined> => db.settings.get(SETTINGS_ID);
export const saveSettings = (settings: Settings): Promise<string> => db.settings.put({ ...settings, id: SETTINGS_ID });

// --- Preset Operations ---
export const getAllPresets = () => db.presets.toArray();
export const addPreset = (preset: Preset) => db.presets.add(preset, preset.id);
export const removePreset = (id: string) => db.presets.delete(id);

// --- Collection Operations ---
export const getAllCollections = () => db.collections.orderBy('createdAt').reverse().toArray();
export const addCollection = (col: ResearchCollection) => db.collections.add(col, col.id);
export const updateCollection = (id: string, changes: Partial<ResearchCollection>) => db.collections.update(id, changes);
export const deleteCollection = (id: string) => db.collections.delete(id);