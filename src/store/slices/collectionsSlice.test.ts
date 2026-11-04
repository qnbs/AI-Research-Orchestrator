import { describe, it, expect } from 'vitest';
import collectionsReducer, {
  loadCollections,
  addEntryToCollection,
  removeEntryFromCollection,
  setEditingId,
} from './collectionsSlice';
import type { ResearchCollection } from '../../types';

const col: ResearchCollection = {
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
    const s = collectionsReducer(undefined, loadCollections.fulfilled([col], 'r'));
    expect(s.items).toEqual([col]);
    expect(s.isLoading).toBe(false);
  });

  it('handles loadCollections.pending and rejected', () => {
    let s = collectionsReducer(undefined, loadCollections.pending('r'));
    expect(s.isLoading).toBe(true);
    s = collectionsReducer(s, loadCollections.rejected(new Error('boom'), 'r', undefined));
    expect(s.isLoading).toBe(false);
    expect(s.error).toMatch(/boom/);
  });

  it('addEntryToCollection.fulfilled updates entryIds', () => {
    const s0 = collectionsReducer(undefined, loadCollections.fulfilled([col], 'r'));
    const s1 = collectionsReducer(
      s0,
      addEntryToCollection.fulfilled({ collectionId: 'c1', entryIds: ['e1'] }, 'r', {
        collectionId: 'c1',
        entryId: 'e1',
      }),
    );
    expect(s1.items[0].entryIds).toEqual(['e1']);
  });

  it('removeEntryFromCollection.fulfilled filters entryIds', () => {
    const s0 = collectionsReducer(
      undefined,
      loadCollections.fulfilled([{ ...col, entryIds: ['e1', 'e2'] }], 'r'),
    );
    const s1 = collectionsReducer(
      s0,
      removeEntryFromCollection.fulfilled({ collectionId: 'c1', entryIds: ['e2'] }, 'r', {
        collectionId: 'c1',
        entryId: 'e1',
      }),
    );
    expect(s1.items[0].entryIds).toEqual(['e2']);
  });

  it('setEditingId', () => {
    const nextState = collectionsReducer(undefined, setEditingId('x'));
    expect(nextState.editingId).toBe('x');
  });
});
