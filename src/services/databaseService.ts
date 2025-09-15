
import Dexie, { type Table } from 'dexie';
import type { KnowledgeBaseEntry, Settings, Preset } from '../types';

export const db = new Dexie('AIResearchAppDatabase') as Dexie & {
    knowledgeBaseEntries: Table<KnowledgeBaseEntry, string>;
    settings: Table<Settings & { id: string }, string>;
    presets: Table<Preset, string>;
};

// FIX: Bump version for schema change and add `title` index.
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
// FIX: Provide the key (`preset.id`) to the add method for correctness.
export const addPreset = (preset: Preset) => db.presets.add(preset, preset.id);
export const removePreset = (id: string) => db.presets.delete(id);
