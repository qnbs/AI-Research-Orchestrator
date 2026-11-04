import { describe, it, expect } from 'vitest';
import collectionsReducer, {
  loadCollections,
  addEntryToCollection,
  removeEntryFromCollection,
  setEditingId,
} from './collectionsSlice';
import type { ResearchCollection } from '../../types';

const testCollection: ResearchCollection = {
  id: 'c1',
  name: 'Test',
  description: '',
  color: '#1f6feb',
  icon: '📁',
  entryIds: [],
  articlePmids: [],
  createdAt: 1,
  updatedAt: 1,
  tags: [],
};

describe('collectionsSlice', () => {
  it('handles loadCollections.fulfilled', () => {
    const state = collectionsReducer(
      undefined,
      loadCollections.fulfilled([testCollection], 'request-1'),
    );
    expect(state.items).toEqual([testCollection]);
    expect(state.isLoading).toBe(false);
  });

  it('handles loadCollections.pending and rejected', () => {
    let state = collectionsReducer(undefined, loadCollections.pending('request-1'));
    expect(state.isLoading).toBe(true);
    state = collectionsReducer(
      state,
      loadCollections.rejected(new Error('boom'), 'request-1', undefined, 'boom'),
    );
    expect(state.isLoading).toBe(false);
    expect(state.error).toMatch(/boom/);
  });

  it('addEntryToCollection.fulfilled updates entryIds', () => {
    const initial = collectionsReducer(
      undefined,
      loadCollections.fulfilled([testCollection], 'request-1'),
    );
    const next = collectionsReducer(
      initial,
      addEntryToCollection.fulfilled({ collectionId: 'c1', entryIds: ['e1'] }, 'request-1', {
        collectionId: 'c1',
        entryId: 'e1',
      }),
    );
    expect(next.items[0].entryIds).toEqual(['e1']);
  });

  it('removeEntryFromCollection.fulfilled filters entryIds', () => {
    const initial = collectionsReducer(
      undefined,
      loadCollections.fulfilled([{ ...testCollection, entryIds: ['e1', 'e2'] }], 'request-1'),
    );
    const next = collectionsReducer(
      initial,
      removeEntryFromCollection.fulfilled({ collectionId: 'c1', entryIds: ['e2'] }, 'request-1', {
        collectionId: 'c1',
        entryId: 'e1',
      }),
    );
    expect(next.items[0].entryIds).toEqual(['e2']);
  });

  it('setEditingId', () => {
    const nextState = collectionsReducer(undefined, setEditingId('x'));
    expect(nextState.editingId).toBe('x');
  });
});
