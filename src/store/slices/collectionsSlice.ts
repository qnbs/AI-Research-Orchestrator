/**
 * Research Collections Slice — local-first, exportable
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ResearchCollection } from '../../types';
import {
  getAllCollections,
  addCollection,
  updateCollection as dbUpdateCollection,
  deleteCollection as dbDeleteCollection,
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

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const loadCollections = createAsyncThunk('collections/load', async () => {
  return await getAllCollections();
});

export const createCollection = createAsyncThunk(
  'collections/create',
  async (collection: ResearchCollection) => {
    await addCollection(collection);
    return collection;
  }
);

export const updateCollection = createAsyncThunk(
  'collections/update',
  async ({ id, changes }: { id: string; changes: Partial<ResearchCollection> }) => {
    await dbUpdateCollection(id, { ...changes, updatedAt: Date.now() });
    return { id, changes };
  }
);

export const deleteCollection = createAsyncThunk(
  'collections/delete',
  async (id: string) => {
    await dbDeleteCollection(id);
    return id;
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

export const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {
    setEditingId: (state, action: PayloadAction<string | null>) => {
      state.editingId = action.payload;
    },
    addEntryToCollection: (state, action: PayloadAction<{ collectionId: string; entryId: string }>) => {
      const col = state.items.find(c => c.id === action.payload.collectionId);
      if (col && !col.entryIds.includes(action.payload.entryId)) {
        col.entryIds.push(action.payload.entryId);
        col.updatedAt = Date.now();
      }
    },
    removeEntryFromCollection: (state, action: PayloadAction<{ collectionId: string; entryId: string }>) => {
      const col = state.items.find(c => c.id === action.payload.collectionId);
      if (col) {
        col.entryIds = col.entryIds.filter(id => id !== action.payload.entryId);
        col.updatedAt = Date.now();
      }
    },
    generateShareToken: (state, action: PayloadAction<string>) => {
      const col = state.items.find(c => c.id === action.payload);
      if (col) {
        col.shareToken = btoa(`col:${col.id}:${Date.now()}`).replace(/=/g, '');
        col.updatedAt = Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCollections.pending, (state) => { state.isLoading = true; })
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
        const idx = state.items.findIndex(c => c.id === action.payload.id);
        if (idx >= 0) {
          state.items[idx] = { ...state.items[idx], ...action.payload.changes, updatedAt: Date.now() };
        }
      })
      .addCase(deleteCollection.fulfilled, (state, action) => {
        state.items = state.items.filter(c => c.id !== action.payload);
      });
  },
});

export const {
  setEditingId,
  addEntryToCollection,
  removeEntryFromCollection,
  generateShareToken,
} = collectionsSlice.actions;

export default collectionsSlice.reducer;
