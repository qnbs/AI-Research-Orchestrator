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
  deleteKbEntries,
  setFilter,
  setSelectedPmids,
} from './knowledgeBaseSlice';
import type { ResearchEntry } from '../../types';

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

  describe('deleteKbEntries.fulfilled', () => {
    const entryA: ResearchEntry = {
      id: 'entry-a',
      timestamp: 1,
      sourceType: 'research',
      title: 'Topic A',
      articles: [
        {
          pmid: '111',
          title: 'A',
          summary: 's',
          authors: 'x',
          journal: 'j',
          pubYear: '2020',
          keywords: [],
          relevanceScore: 1,
          relevanceExplanation: '',
          isOpenAccess: false,
        },
      ],
      input: {
        researchTopic: 't',
        dateRange: 'any',
        articleTypes: [],
        synthesisFocus: 'f',
        maxArticlesToScan: 1,
        topNToSynthesize: 1,
        includeArxiv: false,
      },
      report: {
        generatedQueries: [],
        rankedArticles: [],
        synthesis: '',
        aiGeneratedInsights: [],
        overallKeywords: [],
      },
    };

    const entryB: ResearchEntry = {
      ...entryA,
      id: 'entry-b',
      articles: [
        {
          ...entryA.articles[0],
          pmid: '222',
        },
      ],
    };

    it('removes entries from state and prunes selected pmids', () => {
      const populated = knowledgeBaseReducer(
        {
          ...initialState,
          ids: ['entry-a', 'entry-b'],
          entities: { 'entry-a': entryA, 'entry-b': entryB },
          selectedPmids: ['111', '222'],
        },
        deleteKbEntries.fulfilled(['entry-a'], 'req', ['entry-a']),
      );

      expect(populated.ids).toEqual(['entry-b']);
      expect(populated.entities['entry-a']).toBeUndefined();
      expect(populated.selectedPmids).toEqual(['222']);
    });
  });
});
