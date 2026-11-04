/**
 * Research Collections Slice — local-first, exportable
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ResearchCollection } from '../../types';
import {
  getAllCollections,
  getCollectionById,
  addCollection,
  updateCollection as dbUpdateCollection,
  deleteCollection as dbDeleteCollection,
  removeResearchEntryIdsFromAllCollections,
} from '../../services/databaseService';

interface CollectionsState {
  items: ResearchCollection[];
  isLoading: boolean;
  error: string | null;
  editingId: string | null;
}

const initialState: CollectionsState = {
  items: [],
  isLoading: false,
  error: null,
  editingId: null,
};

/** Load all collections from Dexie. */
export const loadCollections = createAsyncThunk('collections/load', async () => {
  return await getAllCollections();
});

/** Persist a new collection and prepend it to state. */
export const createCollection = createAsyncThunk(
  'collections/create',
  async (collection: ResearchCollection) => {
    await addCollection(collection);
    return collection;
  },
);

/** Patch a collection in Dexie and mirror into Redux. */
export const updateCollection = createAsyncThunk(
  'collections/update',
  async ({ id, changes }: { id: string; changes: Partial<ResearchCollection> }) => {
    await dbUpdateCollection(id, { ...changes, updatedAt: Date.now() });
    return { id, changes };
  },
);

/** Delete a collection from Dexie and Redux. */
export const deleteCollection = createAsyncThunk('collections/delete', async (id: string) => {
  await dbDeleteCollection(id);
  return id;
});

/** Add a knowledge-base entry id to a collection (persisted). */
export const addEntryToCollection = createAsyncThunk(
  'collections/addEntry',
  async ({ collectionId, entryId }: { collectionId: string; entryId: string }) => {
    const col = await getCollectionById(collectionId);
    if (!col) throw new Error('Collection not found');
    if (col.entryIds.includes(entryId)) {
      return { collectionId, entryIds: col.entryIds };
    }
    const entryIds = [...col.entryIds, entryId];
    await dbUpdateCollection(collectionId, { entryIds, updatedAt: Date.now() });
    return { collectionId, entryIds };
  },
);

/** Remove a knowledge-base entry id from a collection (persisted). */
export const removeEntryFromCollection = createAsyncThunk(
  'collections/removeEntry',
  async ({ collectionId, entryId }: { collectionId: string; entryId: string }) => {
    const col = await getCollectionById(collectionId);
    if (!col) throw new Error('Collection not found');
    const entryIds = col.entryIds.filter((id) => id !== entryId);
    if (entryIds.length === col.entryIds.length) {
      return { collectionId, entryIds: col.entryIds };
    }
    await dbUpdateCollection(collectionId, { entryIds, updatedAt: Date.now() });
    return { collectionId, entryIds };
  },
);

/** After KB entries are deleted, prune collection membership and reload from Dexie. */
export const syncCollectionsAfterKbEntryDeletes = createAsyncThunk(
  'collections/syncAfterKbDeletes',
  async (entryIds: string[]) => {
    await removeResearchEntryIdsFromAllCollections(entryIds);
    return getAllCollections();
  },
);

export const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    setEditingId: (state, action: PayloadAction<string | null>) => {
      state.editingId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCollections.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadCollections.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(loadCollections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Failed to load collections';
      })
      .addCase(createCollection.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateCollection.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx >= 0) {
          state.items[idx] = {
            ...state.items[idx],
            ...action.payload.changes,
            updatedAt: Date.now(),
          };
        }
      })
      .addCase(deleteCollection.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload);
      })
      .addCase(addEntryToCollection.fulfilled, (state, action) => {
        const col = state.items.find((c) => c.id === action.payload.collectionId);
        if (col) {
          col.entryIds = action.payload.entryIds;
          col.updatedAt = Date.now();
        }
      })
      .addCase(addEntryToCollection.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update collection membership';
      })
      .addCase(removeEntryFromCollection.fulfilled, (state, action) => {
        const col = state.items.find((c) => c.id === action.payload.collectionId);
        if (col) {
          col.entryIds = action.payload.entryIds;
          col.updatedAt = Date.now();
        }
      })
      .addCase(removeEntryFromCollection.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update collection membership';
      })
      .addCase(syncCollectionsAfterKbEntryDeletes.fulfilled, (state, action) => {
        state.items = action.payload;
      });
  },
});

export const { setEditingId } = collectionsSlice.actions;

export default collectionsSlice.reducer;
