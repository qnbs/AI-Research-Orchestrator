import { describe, expect, it, vi } from 'vitest';

// Mock the databaseService before importing the slice
vi.mock('../../services/databaseService', () => ({
  getAllEntries: vi.fn().mockResolvedValue([]),
  addEntry: vi.fn().mockResolvedValue(undefined),
  bulkAddEntries: vi.fn().mockResolvedValue(undefined),
  deleteEntries: vi.fn().mockResolvedValue(undefined),
  clearAllEntries: vi.fn().mockResolvedValue(undefined),
  updateEntry: vi.fn().mockResolvedValue(undefined),
}));

import knowledgeBaseReducer, {
  clearSelection,
  setFilter,
  setSelectedPmids,
  fetchKnowledgeBase,
  addKbEntry,
  deleteKbEntries,
  clearKb,
  importKbEntries,
  updateKbEntry,
} from './knowledgeBaseSlice';
import type { KnowledgeBaseEntry } from '../../types';
import {
  getAllEntries,
  addEntry,
  bulkAddEntries,
  deleteEntries,
  clearAllEntries,
  updateEntry,
} from '../../services/databaseService';

describe('knowledgeBaseSlice', () => {
  const initialState = {
    ids: [],
    entities: {},
    isLoading: false,
    error: null,
    filter: {
      searchTerm: '',
      selectedTopics: [],
      selectedTags: [],
      selectedArticleTypes: [],
      selectedJournals: [],
      showOpenAccessOnly: false,
    },
    selectedPmids: [],
  };

  describe('reducers', () => {
    it('should return the initial state', () => {
      const result = knowledgeBaseReducer(undefined, { type: 'unknown' });
      expect(result.filter.searchTerm).toBe('');
      expect(result.selectedPmids).toEqual([]);
      expect(result.isLoading).toBe(false);
    });

    it('should handle setFilter', () => {
      const newFilter = { searchTerm: 'test query', showOpenAccessOnly: true };
      const result = knowledgeBaseReducer(initialState, setFilter(newFilter));

      expect(result.filter.searchTerm).toBe('test query');
      expect(result.filter.showOpenAccessOnly).toBe(true);
      // Other filter properties should remain unchanged
      expect(result.filter.selectedTopics).toEqual([]);
    });

    it('should handle setSelectedPmids', () => {
      const pmids = ['12345', '67890'];
      const result = knowledgeBaseReducer(initialState, setSelectedPmids(pmids));

      expect(result.selectedPmids).toEqual(['12345', '67890']);
    });

    it('should handle clearSelection', () => {
      const stateWithSelection = {
        ...initialState,
        selectedPmids: ['12345', '67890'],
      };
      const result = knowledgeBaseReducer(stateWithSelection, clearSelection());

      expect(result.selectedPmids).toEqual([]);
    });

    it('should handle multiple filter updates', () => {
      let state: ReturnType<typeof knowledgeBaseReducer> = initialState;

      state = knowledgeBaseReducer(state, setFilter({ searchTerm: 'cancer' }));
      state = knowledgeBaseReducer(state, setFilter({ selectedArticleTypes: ['Meta-Analysis'] }));
      state = knowledgeBaseReducer(state, setFilter({ showOpenAccessOnly: true }));

      expect(state.filter.searchTerm).toBe('cancer');
      expect(state.filter.selectedArticleTypes).toEqual(['Meta-Analysis']);
      expect(state.filter.showOpenAccessOnly).toBe(true);
    });
  });

  describe('async thunks', () => {
    const sampleEntry = {
      id: 'e1',
      type: 'research' as const,
      timestamp: 1000,
      title: 'T',
      data: {},
    } as unknown as KnowledgeBaseEntry;

    it('fetchKnowledgeBase populates entities', () => {
      vi.mocked(getAllEntries).mockResolvedValueOnce([sampleEntry]);
      let state = knowledgeBaseReducer(initialState, fetchKnowledgeBase.pending('', undefined));
      expect(state.isLoading).toBe(true);
      state = knowledgeBaseReducer(
        state,
        fetchKnowledgeBase.fulfilled([sampleEntry], '', undefined),
      );
      expect(state.isLoading).toBe(false);
      expect(state.ids).toContain('e1');
      expect(state.entities.e1?.title).toBe('T');
    });

    it('fetchKnowledgeBase stores error message on reject', () => {
      const state = knowledgeBaseReducer(
        initialState,
        fetchKnowledgeBase.rejected(new Error('db down'), '', undefined, 'db down'),
      );
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });

    it('addKbEntry / importKbEntries / update / delete / clear', () => {
      let state = knowledgeBaseReducer(
        initialState,
        addKbEntry.fulfilled(sampleEntry, '', sampleEntry),
      );
      expect(state.ids).toContain('e1');

      const second = { ...sampleEntry, id: 'e2', title: 'T2' } as KnowledgeBaseEntry;
      state = knowledgeBaseReducer(state, importKbEntries.fulfilled([second], '', [second]));
      expect(state.ids).toEqual(expect.arrayContaining(['e1', 'e2']));

      state = knowledgeBaseReducer(
        state,
        updateKbEntry.fulfilled({ id: 'e1', changes: { title: 'Updated' } }, '', {
          id: 'e1',
          changes: { title: 'Updated' },
        }),
      );
      expect(state.entities.e1?.title).toBe('Updated');

      state = knowledgeBaseReducer(state, deleteKbEntries.fulfilled(['e2'], '', ['e2']));
      expect(state.ids).not.toContain('e2');
      expect(state.ids).toContain('e1');

      state = knowledgeBaseReducer(state, clearKb.fulfilled(undefined, '', undefined));
      expect(state.ids).toEqual([]);
    });

    it('thunks invoke databaseService side effects', async () => {
      await addKbEntry(sampleEntry)(vi.fn(), () => ({}) as never, undefined);
      expect(addEntry).toHaveBeenCalledWith(sampleEntry);

      await deleteKbEntries(['e1'])(vi.fn(), () => ({}) as never, undefined);
      expect(deleteEntries).toHaveBeenCalledWith(['e1']);

      await clearKb()(vi.fn(), () => ({}) as never, undefined);
      expect(clearAllEntries).toHaveBeenCalled();

      await importKbEntries([sampleEntry])(vi.fn(), () => ({}) as never, undefined);
      expect(bulkAddEntries).toHaveBeenCalled();

      await updateKbEntry({ id: 'e1', changes: { title: 'X' } })(
        vi.fn(),
        () => ({}) as never,
        undefined,
      );
      expect(updateEntry).toHaveBeenCalled();
    });
  });
});
