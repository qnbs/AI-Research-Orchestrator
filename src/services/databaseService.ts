
import Dexie, { type EntityTable } from 'dexie';
import type { KnowledgeBaseEntry, AppSettings, Preset } from '@/types';

export const db = new Dexie('AIResearchAppDatabase') as Dexie & {
    knowledgeBaseEntries: EntityTable<KnowledgeBaseEntry, 'id'>;
    settings: EntityTable<AppSettings & { id: string }, 'id'>;
    presets: EntityTable<Preset, 'id'>;
};

// Schema declaration
db.version(1).stores({
    knowledgeBaseEntries: 'id, timestamp, sourceType', // Indexing timestamp and sourceType
    settings: 'id', // Only one settings object with a fixed ID
    presets: 'id', // Presets identified by their unique ID
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
export const getSettings = () => db.settings.get(SETTINGS_ID);
export const saveSettings = (settings: AppSettings) => db.settings.put({ ...settings, id: SETTINGS_ID });

// --- Preset Operations ---
export const getAllPresets = () => db.presets.toArray();
export const addPresetDb = (preset: Preset) => db.presets.add(preset, preset.id);
export const removePresetDb = (id: string) => db.presets.delete(id);
