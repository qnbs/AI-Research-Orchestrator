import Dexie, { type Table } from 'dexie';
import type {
  KnowledgeBaseEntry,
  Settings,
  Preset,
  ResearchCollection,
  ResearchReport,
} from '../types';
import type { ResearchCheckpoint } from '../lib/researchCheckpoint';
import {
  migrateKnowledgeBaseEntryDemoProvenance,
  stampDemoReportProvenance,
} from '../lib/demoCorpusMigration';
import { ensureArticleIdentifiers, ensureGroundedClaim } from '../lib/sourceIdentifier';
import { safeLogError } from '../lib/safeLog';
import { migrateReportTrustTerminologyV7 } from '../lib/synthesisTrustMigrationV7';

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

const hydrateResearchReport = (report: ResearchReport): ResearchReport => ({
  ...report,
  rankedArticles: report.rankedArticles.map((article) => {
    try {
      return ensureArticleIdentifiers(article);
    } catch (err) {
      safeLogError('Dexie v5: skip article hydration', err);
      return article;
    }
  }),
  groundedSynthesis: report.groundedSynthesis
    ? {
        ...report.groundedSynthesis,
        claims: report.groundedSynthesis.claims.map((claim) => {
          try {
            return ensureGroundedClaim(claim);
          } catch (err) {
            safeLogError('Dexie v5: skip claim hydration', err);
            return claim;
          }
        }),
      }
    : undefined,
});

const hydrateKnowledgeBaseEntry = (entry: KnowledgeBaseEntry): KnowledgeBaseEntry => {
  const articles = entry.articles.map((article) => ensureArticleIdentifiers(article));
  if (entry.sourceType === 'research') {
    return {
      ...entry,
      articles,
      report: hydrateResearchReport(entry.report),
    };
  }
  return { ...entry, articles };
};

// Version 5: hydrate typed articleId on persisted articles and grounded claims (P1-5)
db.version(5)
  .stores({
    knowledgeBaseEntries: 'id, timestamp, sourceType, title',
    settings: 'id',
    presets: 'id',
    collections: 'id, name, createdAt, updatedAt',
    researchCheckpoints: 'id, createdAt, topic, reason',
  })
  .upgrade(async (tx) => {
    const kbTable = tx.table('knowledgeBaseEntries');
    await kbTable.toCollection().modify((entry) => {
      try {
        const hydrated = hydrateKnowledgeBaseEntry(entry as KnowledgeBaseEntry);
        Object.assign(entry, hydrated);
      } catch (err) {
        safeLogError('Dexie v5: skip knowledge-base entry hydration', err);
      }
    });

    const checkpointTable = tx.table('researchCheckpoints');
    await checkpointTable.toCollection().modify((checkpoint) => {
      try {
        const ckpt = checkpoint as ResearchCheckpoint;
        if (!ckpt.report) return;
        ckpt.report = hydrateResearchReport(ckpt.report);
      } catch (err) {
        safeLogError('Dexie v5: skip checkpoint hydration', err);
      }
    });
  });

// Version 6: stamp demo-synthetic sourceClass / corpusClass on persisted demo fixtures (P0 quarantine)
db.version(6)
  .stores({
    knowledgeBaseEntries: 'id, timestamp, sourceType, title',
    settings: 'id',
    presets: 'id',
    collections: 'id, name, createdAt, updatedAt',
    researchCheckpoints: 'id, createdAt, topic, reason',
  })
  .upgrade(async (tx) => {
    const kbTable = tx.table('knowledgeBaseEntries');
    await kbTable.toCollection().modify((entry) => {
      try {
        const migrated = migrateKnowledgeBaseEntryDemoProvenance(entry as KnowledgeBaseEntry);
        Object.assign(entry, migrated);
      } catch (err) {
        safeLogError('Dexie v6: skip demo sourceClass stamp', err);
      }
    });

    const checkpointTable = tx.table('researchCheckpoints');
    await checkpointTable.toCollection().modify((checkpoint) => {
      try {
        const ckpt = checkpoint as ResearchCheckpoint;
        if (!ckpt.report) return;
        ckpt.report = stampDemoReportProvenance(ckpt.report);
      } catch (err) {
        safeLogError('Dexie v6: skip checkpoint demo stamp', err);
      }
    });
  });

// Version 7: rename legacy synthesis trust wire values (ADR 0018)
db.version(7)
  .stores({
    knowledgeBaseEntries: 'id, timestamp, sourceType, title',
    settings: 'id',
    presets: 'id',
    collections: 'id, name, createdAt, updatedAt',
    researchCheckpoints: 'id, createdAt, topic, reason',
  })
  .upgrade(async (tx) => {
    const kbTable = tx.table('knowledgeBaseEntries');
    await kbTable.toCollection().modify((entry) => {
      try {
        const kb = entry as KnowledgeBaseEntry;
        if (kb.sourceType !== 'research' || !kb.report) return;
        kb.report = migrateReportTrustTerminologyV7(kb.report);
      } catch (err) {
        safeLogError('Dexie v7: skip trust terminology migration', err);
      }
    });

    const checkpointTable = tx.table('researchCheckpoints');
    await checkpointTable.toCollection().modify((checkpoint) => {
      try {
        const ckpt = checkpoint as ResearchCheckpoint;
        if (!ckpt.report) return;
        ckpt.report = migrateReportTrustTerminologyV7(ckpt.report);
      } catch (err) {
        safeLogError('Dexie v7: skip checkpoint trust terminology migration', err);
      }
    });
  });

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
/** Apply multiple KB entry patches atomically (P0-B snapshot safety). */
export const bulkUpdateEntriesInTransaction = async (
  updates: Array<{ id: string; changes: Partial<KnowledgeBaseEntry> }>,
): Promise<void> => {
  if (updates.length === 0) return;
  await db.transaction('rw', db.knowledgeBaseEntries, async () => {
    for (const { id, changes } of updates) {
      const updated = await db.knowledgeBaseEntries.update(id, changes);
      if (updated === 0) {
        throw new Error(`Knowledge base entry not found: ${id}`);
      }
    }
  });
};
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
/** Fetch one collection by id. */
export const getCollectionById = (id: string) => db.collections.get(id);

/**
 * Remove KB entry ids from every collection's membership (referential hygiene when entries are deleted).
 * @returns number of collections patched
 */
export const removeResearchEntryIdsFromAllCollections = async (
  entryIds: string[],
): Promise<number> => {
  if (entryIds.length === 0) return 0;
  const drop = new Set(entryIds);
  let touched = 0;
  await db.transaction('rw', db.collections, async () => {
    const all = await db.collections.toArray();
    for (const col of all) {
      const entryIdsNext = col.entryIds.filter((id) => !drop.has(id));
      if (entryIdsNext.length === col.entryIds.length) continue;
      await db.collections.update(col.id, {
        entryIds: entryIdsNext,
        updatedAt: Date.now(),
      });
      touched += 1;
    }
  });
  return touched;
};

/** Atomically append an entry id to one collection (read-modify-write in one transaction). */
export const addEntryIdToCollection = async (
  collectionId: string,
  entryId: string,
): Promise<string[]> =>
  db.transaction('rw', db.collections, async () => {
    const col = await db.collections.get(collectionId);
    if (!col) throw new Error('Collection not found');
    if (col.entryIds.includes(entryId)) return col.entryIds;
    const entryIds = [...col.entryIds, entryId];
    await db.collections.update(collectionId, { entryIds, updatedAt: Date.now() });
    return entryIds;
  });

/** Atomically remove an entry id from one collection. */
export const removeEntryIdFromCollection = async (
  collectionId: string,
  entryId: string,
): Promise<string[]> =>
  db.transaction('rw', db.collections, async () => {
    const col = await db.collections.get(collectionId);
    if (!col) throw new Error('Collection not found');
    const entryIds = col.entryIds.filter((id) => id !== entryId);
    if (entryIds.length === col.entryIds.length) return col.entryIds;
    await db.collections.update(collectionId, { entryIds, updatedAt: Date.now() });
    return entryIds;
  });

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
