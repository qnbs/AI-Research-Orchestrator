
import { createSlice, createAsyncThunk, createEntityAdapter, createSelector, PayloadAction } from '@reduxjs/toolkit';
import type { KnowledgeBaseEntry, AggregatedArticle, RankedArticle, ResearchReport, AuthorProfileEntry, JournalEntry, ResearchEntry, KnowledgeBaseFilter } from '../../types';
import { getAllEntries, addEntry, bulkAddEntries, deleteEntries, clearAllEntries, updateEntry } from '../../services/databaseService';
import type { RootState } from '../store';

// --- Adapter for Normalized State ---
// This optimizes performance by storing articles in a lookup table { ids: [], entities: {} }
const entriesAdapter = createEntityAdapter<KnowledgeBaseEntry>({
    selectId: (entry) => entry.id,
    sortComparer: (a, b) => b.timestamp - a.timestamp,
});

// --- Async Thunks (Side Effects & DB Interactions) ---

export const fetchKnowledgeBase = createAsyncThunk(
    'knowledgeBase/fetchAll',
    async () => {
        const response = await getAllEntries();
        return response;
    }
);

export const addKbEntry = createAsyncThunk(
    'knowledgeBase/addEntry',
    async (entry: KnowledgeBaseEntry) => {
        await addEntry(entry);
        return entry;
    }
);

export const importKbEntries = createAsyncThunk(
    'knowledgeBase/importEntries',
    async (entries: KnowledgeBaseEntry[]) => {
        await bulkAddEntries(entries);
        return entries;
    }
);

export const deleteKbEntries = createAsyncThunk(
    'knowledgeBase/deleteEntries',
    async (ids: string[]) => {
        await deleteEntries(ids);
        return ids;
    }
);

export const clearKb = createAsyncThunk(
    'knowledgeBase/clearAll',
    async () => {
        await clearAllEntries();
    }
);

export const updateKbEntry = createAsyncThunk(
    'knowledgeBase/updateEntry',
    async ({ id, changes }: { id: string; changes: Partial<KnowledgeBaseEntry> }) => {
        await updateEntry(id, changes);
        return { id, changes };
    }
);

// --- State Definition ---

interface KnowledgeBaseState {
    isLoading: boolean;
    error: string | null;
    // Filter state is managed in Redux now for persistence and global access
    filter: KnowledgeBaseFilter;
    // Selection state
    selectedPmids: string[];
}

const initialState = entriesAdapter.getInitialState<KnowledgeBaseState>({
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
});

// --- Slice ---

export const knowledgeBaseSlice = createSlice({
    name: 'knowledgeBase',
    initialState,
    reducers: {
        setFilter: (state, action: PayloadAction<Partial<KnowledgeBaseFilter>>) => {
            state.filter = { ...state.filter, ...action.payload };
        },
        setSelectedPmids: (state, action: PayloadAction<string[]>) => {
            state.selectedPmids = action.payload;
        },
        clearSelection: (state) => {
            state.selectedPmids = [];
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchKnowledgeBase.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchKnowledgeBase.fulfilled, (state, action) => {
                state.isLoading = false;
                entriesAdapter.setAll(state, action.payload);
            })
            .addCase(fetchKnowledgeBase.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to load knowledge base';
            })
            .addCase(addKbEntry.fulfilled, (state, action) => {
                entriesAdapter.addOne(state, action.payload);
            })
            .addCase(importKbEntries.fulfilled, (state, action) => {
                entriesAdapter.addMany(state, action.payload);
            })
            .addCase(deleteKbEntries.fulfilled, (state, action) => {
                // Note: Logic to remove articles from within entries is complex if we store full entries.
                // For full entry deletion:
                // entriesAdapter.removeMany(state, action.payload);
                
                // However, the app logic often deletes *articles* inside entries. 
                // If the ID passed is an Entry ID, we remove the entry.
                // If we are pruning articles, we might need to update entries. 
                // For this slice, we assume we are deleting full Entries or triggering updates.
                // To keep it simple and consistent with the previous context logic which updated specific entries:
                // Real update logic should happen in the Thunk/Service, and we reload or update state here.
                // For now, let's assume we might reload or handle updates via `updateKbEntry`.
                
                // If we deleted full entries:
                // entriesAdapter.removeMany(state, action.payload);
            })
            .addCase(clearKb.fulfilled, (state) => {
                entriesAdapter.removeAll(state);
            })
            .addCase(updateKbEntry.fulfilled, (state, action) => {
                entriesAdapter.updateOne(state, action.payload);
            });
    },
});

export const { setFilter, setSelectedPmids, clearSelection } = knowledgeBaseSlice.actions;

// --- Selectors (Memoized with Reselect) ---

export const {
    selectAll: selectAllEntries,
    selectById: selectEntryById,
} = entriesAdapter.getSelectors((state: RootState) => state.knowledgeBase);

// Derived Selector: Flatten all unique articles from all entries
export const selectUniqueArticles = createSelector(
    [selectAllEntries],
    (entries) => {
        const articleMap = new Map<string, AggregatedArticle>();
        entries.forEach(entry => {
            entry.articles.forEach(article => {
                const existing = articleMap.get(article.pmid);
                // Keep the one with highest relevance
                if (!existing || article.relevanceScore > existing.relevanceScore) {
                    articleMap.set(article.pmid, { ...article, sourceId: entry.id, sourceTitle: entry.title });
                }
            });
        });
        return Array.from(articleMap.values());
    }
);

// Complex Filter Selector
export const selectFilteredArticles = createSelector(
    [selectUniqueArticles, (state: RootState) => state.knowledgeBase.filter],
    (articles, filter) => {
        let result = articles;
        
        if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            result = result.filter(a => 
                a.title.toLowerCase().includes(term) || 
                a.authors.toLowerCase().includes(term) || 
                a.summary.toLowerCase().includes(term)
            );
        }
        if (filter.selectedTopics.length > 0) result = result.filter(a => filter.selectedTopics.includes(a.sourceTitle));
        if (filter.selectedTags.length > 0) result = result.filter(a => filter.selectedTags.some(t => (a.customTags || []).includes(t)));
        if (filter.selectedArticleTypes.length > 0) result = result.filter(a => a.articleType && filter.selectedArticleTypes.includes(a.articleType));
        if (filter.selectedJournals.length > 0) result = result.filter(a => filter.selectedJournals.includes(a.journal));
        if (filter.showOpenAccessOnly) result = result.filter(a => a.isOpenAccess);

        return result;
    }
);

export const selectRecentResearchEntries = createSelector(
    [selectAllEntries],
    (entries) => entries
        .filter((e): e is ResearchEntry => e.sourceType === 'research')
        .slice(0, 5) // Get top 5
);

export default knowledgeBaseSlice.reducer;
