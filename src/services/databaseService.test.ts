

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import { db, addEntry, getAllEntries, updateEntry, deleteEntries, clearAllEntries } from './databaseService';
import type { KnowledgeBaseEntry, ResearchEntry } from '../types';

// FIX: Replace require with import for ES module compatibility in test environment.
import 'fake-indexeddb/auto';


describe('databaseService - KnowledgeBase Operations', () => {

    beforeEach(async () => {
        // Ensure the database is clean before each test
        await db.open();
        await clearAllEntries();
    });

    afterEach(async () => {
        await db.close();
    });

    const mockEntry: ResearchEntry = {
        id: '123',
        timestamp: 123,
        sourceType: 'research',
        title: 'Test Topic',
        articles: [],
        input: { researchTopic: 'Test Topic', dateRange: 'any', articleTypes: [], synthesisFocus: 'overview', maxArticlesToScan: 10, topNToSynthesize: 1 },
        report: { generatedQueries: [], rankedArticles: [], synthesis: 'Test', aiGeneratedInsights: [], overallKeywords: [] }
    };

    it('should add an entry to the database', async () => {
        await addEntry(mockEntry);
        const entries = await getAllEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].id).toBe('123');
    });

    it('should retrieve all entries, sorted by timestamp descending', async () => {
        const entry1: KnowledgeBaseEntry = { ...mockEntry, id: '1', timestamp: 100 };
        const entry2: KnowledgeBaseEntry = { ...mockEntry, id: '2', timestamp: 200 };
        await addEntry(entry1);
        await addEntry(entry2);

        const entries = await getAllEntries();
        expect(entries).toHaveLength(2);
        expect(entries[0].id).toBe('2'); // Newest first
        expect(entries[1].id).toBe('1');
    });

    it('should update an existing entry', async () => {
        await addEntry(mockEntry);
        const newTitle = 'Updated Test Topic';
        await updateEntry('123', { title: newTitle });

        const entries = await db.knowledgeBaseEntries.toArray();
        expect(entries[0].title).toBe(newTitle);
    });

    it('should delete specified entries', async () => {
        const entry1: KnowledgeBaseEntry = { ...mockEntry, id: '1' };
        const entry2: KnowledgeBaseEntry = { ...mockEntry, id: '2' };
        await addEntry(entry1);
        await addEntry(entry2);

        await deleteEntries(['1']);
        const entries = await getAllEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].id).toBe('2');
    });

    it('should clear all entries', async () => {
        await addEntry(mockEntry);
        await clearAllEntries();
        const entries = await getAllEntries();
        expect(entries).toHaveLength(0);
    });
});