import { describe, it, expect } from 'vitest';
import collectionsReducer, {
  loadCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  setEditingId,
  addEntryToCollection,
  removeEntryFromCollection,
  generateShareToken,
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

  it('handles loadCollections.pending and rejected', () => {
    let s = collectionsReducer(undefined, loadCollections.pending('r', undefined));
    expect(s.isLoading).toBe(true);
    s = collectionsReducer(
      s,
      loadCollections.rejected(new Error('boom'), 'r', undefined, undefined),
    );
    expect(s.isLoading).toBe(false);
    expect(s.error).toMatch(/boom/);
  });

  it('handles createCollection.fulfilled', () => {
    const s0 = collectionsReducer(undefined, loadCollections.fulfilled([], 'r', undefined));
    const s1 = collectionsReducer(s0, createCollection.fulfilled(col, 'r', col));
    expect(s1.items[0]).toEqual(col);
  });

  it('handles updateCollection.fulfilled', () => {
    let s = collectionsReducer(undefined, loadCollections.fulfilled([col], 'r', undefined));
    s = collectionsReducer(
      s,
      updateCollection.fulfilled({ id: 'c1', changes: { name: 'Renamed' } }, 'r', {
        id: 'c1',
        changes: { name: 'Renamed' },
      }),
    );
    expect(s.items[0].name).toBe('Renamed');
  });

  it('handles deleteCollection.fulfilled', () => {
    let s = collectionsReducer(undefined, loadCollections.fulfilled([col], 'r', undefined));
    s = collectionsReducer(s, deleteCollection.fulfilled('c1', 'r', 'c1'));
    expect(s.items).toHaveLength(0);
  });

  it('addEntryToCollection appends id', () => {
    const s0 = collectionsReducer(
      undefined,
      loadCollections.fulfilled([{ ...col, entryIds: [] }], 'r', undefined),
    );
    const s1 = collectionsReducer(s0, addEntryToCollection({ collectionId: 'c1', entryId: 'e1' }));
    expect(s1.items[0].entryIds).toContain('e1');
  });

  it('removeEntryFromCollection filters id', () => {
    const s0 = collectionsReducer(
      undefined,
      loadCollections.fulfilled([{ ...col, entryIds: ['e1', 'e2'] }], 'r', undefined),
    );
    const s1 = collectionsReducer(
      s0,
      removeEntryFromCollection({ collectionId: 'c1', entryId: 'e1' }),
    );
    expect(s1.items[0].entryIds).toEqual(['e2']);
  });

  it('generateShareToken sets token', () => {
    let s = collectionsReducer(undefined, loadCollections.fulfilled([col], 'r', undefined));
    s = collectionsReducer(s, generateShareToken('c1'));
    expect(s.items[0].shareToken).toBeTruthy();
  });

  it('setEditingId', () => {
    const s = collectionsReducer(undefined, setEditingId('x'));
    expect(s.editingId).toBe('x');
  });
});
