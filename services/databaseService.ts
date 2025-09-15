import Dexie, { type EntityTable } from 'dexie';
import type { KnowledgeBaseEntry, Settings, Preset } from '../types';

// FIX: Refactor from a class to a direct instance to solve `this.version` type issue.
export const db = new Dexie('AIResearchAppDatabase') as Dexie & {
    knowledgeBaseEntries: EntityTable<KnowledgeBaseEntry, 'id'>;
    settings: EntityTable<Settings & { id: string }, 'id'>;
    presets: EntityTable<Preset, 'id'>;
};

db.version(1).stores({
    knowledgeBaseEntries: 'id, timestamp, sourceType',
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
export const addPreset = (preset: Preset) => db.presets.add(preset);
export const removePreset = (id: string) => db.presets.delete(id);