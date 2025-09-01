import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// FIX: Import 'vi' to make it available in the test file.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeBaseView } from './KnowledgeBaseView';
import { useKnowledgeBaseViewLogic } from '@/hooks/useKnowledgeBaseViewLogic';
import { useSettings } from '@/contexts/SettingsContext';
import { useKnowledgeBase } from '@/contexts/KnowledgeBaseContext';
import { useUI } from '@/contexts/UIContext';
import { AggregatedArticle } from '@/types';

// Mock the hooks used by the component
vi.mock('@/hooks/useKnowledgeBaseViewLogic');
vi.mock('@/contexts/SettingsContext');
vi.mock('@/contexts/KnowledgeBaseContext');
vi.mock('@/contexts/UIContext');

const mockArticles: AggregatedArticle[] = [
    { pmid: '1', title: 'Article about React', authors: 'A', journal: 'J1', pubYear: '2023', summary: 'React summary', relevanceScore: 90, relevanceExplanation: '', keywords: ['react'], isOpenAccess: true, sourceId: 's1', sourceTitle: 'React Source' },
    { pmid: '2', title: 'Article about Vitest', authors: 'B', journal: 'J2', pubYear: '2022', summary: 'Vitest summary', relevanceScore: 80, relevanceExplanation: '', keywords: ['vitest'], isOpenAccess: false, sourceId: 's2', sourceTitle: 'Vitest Source' },
    { pmid: '3', title: 'Another one on React', authors: 'C', journal: 'J1', pubYear: '2021', summary: 'More React', relevanceScore: 85, relevanceExplanation: '', keywords: ['react', 'hooks'], isOpenAccess: true, sourceId: 's1', sourceTitle: 'React Source' },
];

describe('KnowledgeBaseView Integration Test', () => {

    beforeEach(() => {
        // Provide mock implementations for all used hooks
        (useKnowledgeBaseViewLogic as vi.Mock).mockReturnValue({
            filter: { searchTerm: '', selectedTopics: [], selectedTags: [], selectedArticleTypes: [], selectedJournals: [], showOpenAccessOnly: false },
            onFilterChange: vi.fn((change) => {
                // In a real hook this would update state; here we can simulate it if needed
                // For this test, we'll assume the parent state updates and re-renders.
            }),
            selectedPmids: [],
            setSelectedPmids: vi.fn(),
        });
        
        (useSettings as vi.Mock).mockReturnValue({
            settings: {
                knowledgeBase: { defaultView: 'grid', articlesPerPage: 10, defaultSort: 'relevance' },
                appearance: { density: 'comfortable' },
            }
        });

        (useKnowledgeBase as vi.Mock).mockReturnValue({
            getArticles: vi.fn().mockReturnValue(mockArticles),
            knowledgeBase: [],
            deleteArticles: vi.fn(),
        });

        (useUI as vi.Mock).mockReturnValue({
            setCurrentView: vi.fn(),
            setNotification: vi.fn(),
        });
    });

    it('simulates the filter workflow', async () => {
        const user = userEvent.setup();

        // 1. Render the component with mocked data
        const { rerender } = render(<KnowledgeBaseView />);
        
        // Initially, all 3 articles should be visible
        expect(await screen.findAllByRole('button', { name: /Article about React/i })).toHaveLength(1);
        expect(await screen.findByRole('button', { name: /Another one on React/i })).toBeInTheDocument();

        // 2. Simulate user typing into the search field
        const searchInput = screen.getByPlaceholderText('Search articles...');
        
        // Mock the logic hook's state change on input
        (useKnowledgeBaseViewLogic as vi.Mock).mockReturnValue({
            ...useKnowledgeBaseViewLogic(),
            filter: { searchTerm: 'Vitest', selectedTopics: [], selectedTags: [], selectedArticleTypes: [], selectedJournals: [], showOpenAccessOnly: false },
        });

        // Mock the getArticles to return filtered results
        (useKnowledgeBase as vi.Mock).mockReturnValue({
            ...useKnowledgeBase(),
            getArticles: vi.fn().mockReturnValue([mockArticles[1]]), // Only the Vitest article
        });

        // Type and re-render to simulate state update
        await act(async () => {
            await user.type(searchInput, 'Vitest');
            rerender(<KnowledgeBaseView />);
        });

        // 3. Verify the displayed articles are correctly filtered
        expect(screen.queryByRole('button', { name: /Article about React/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Another one on React/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Article about Vitest/i })).toBeInTheDocument();
    });
});