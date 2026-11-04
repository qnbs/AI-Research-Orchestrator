import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer, {
  createCollection,
  addEntryToCollection,
  loadCollections,
} from './collectionsSlice';
import { db, getAllCollections } from '../../services/databaseService';
import type { ResearchCollection } from '../../types';

const col: ResearchCollection = {
  id: 'persist-col',
  name: 'Persist',
  description: '',
  color: '#336699',
  icon: '📚',
  entryIds: [],
  articlePmids: [],
  createdAt: 1,
  updatedAt: 1,
  tags: [],
};

describe('collectionsSlice Dexie persistence', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('addEntryToCollection survives reload from IndexedDB', async () => {
    const store = configureStore({ reducer: { collections: collectionsReducer } });
    await store.dispatch(createCollection(col)).unwrap();
    await store
      .dispatch(addEntryToCollection({ collectionId: col.id, entryId: 'kb-entry-1' }))
      .unwrap();
    await store.dispatch(loadCollections()).unwrap();
    const fromDb = await getAllCollections();
    expect(fromDb[0]?.entryIds).toEqual(['kb-entry-1']);
    expect(store.getState().collections.items[0]?.entryIds).toEqual(['kb-entry-1']);
  });
});
