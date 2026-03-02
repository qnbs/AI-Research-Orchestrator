import { describe, it, expect, vi } from 'vitest';

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
  setFilter, 
  setSelectedPmids, 
  clearSelection 
} from './knowledgeBaseSlice';

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
      let state = initialState;
      
      state = knowledgeBaseReducer(state, setFilter({ searchTerm: 'cancer' }));
      state = knowledgeBaseReducer(state, setFilter({ selectedArticleTypes: ['Meta-Analysis'] }));
      state = knowledgeBaseReducer(state, setFilter({ showOpenAccessOnly: true }));
      
      expect(state.filter.searchTerm).toBe('cancer');
      expect(state.filter.selectedArticleTypes).toEqual(['Meta-Analysis']);
      expect(state.filter.showOpenAccessOnly).toBe(true);
    });
  });
});
