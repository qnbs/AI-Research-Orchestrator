import { describe, it, expect } from 'vitest';
import collectionsReducer, {
  loadCollections,
  createCollection,
  setEditingId,
  addEntryToCollection,
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
    const s = collectionsReducer(undefined, loadCollections.fulfilled([col], 'r', undefined));
    expect(s.items).toEqual([col]);
    expect(s.isLoading).toBe(false);
  });

  it('handles createCollection.fulfilled', () => {
    const s0 = collectionsReducer(undefined, loadCollections.fulfilled([], 'r', undefined));
    const s1 = collectionsReducer(s0, createCollection.fulfilled(col, 'r', col));
    expect(s1.items[0]).toEqual(col);
  });

  it('addEntryToCollection appends id', () => {
    const s0 = collectionsReducer(
      undefined,
      loadCollections.fulfilled([{ ...col, entryIds: [] }], 'r', undefined),
    );
    const s1 = collectionsReducer(s0, addEntryToCollection({ collectionId: 'c1', entryId: 'e1' }));
    expect(s1.items[0].entryIds).toContain('e1');
  });

  it('setEditingId', () => {
    const s = collectionsReducer(undefined, setEditingId('x'));
    expect(s.editingId).toBe('x');
  });
});
