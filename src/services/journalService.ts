import { Article, JournalProfile } from '../types';
import { searchPubMedForIds, fetchArticleDetails, generateJournalProfileAnalysis as generateProfileWithGemini } from './geminiService';
import type { Settings } from '../types';

/**
 * Searches for Open Access articles on a topic within a specific journal.
 * @param journalName - The name of the journal.
 * @param topic - The user-provided research topic.
 * @returns A promise that resolves to an array of `Article` objects.
 */
export const findOaArticlesInJournal = async (journalName: string, topic: string): Promise<Article[]> => {
    const query = `("${journalName}"[Journal]) AND ("${topic}"[Title/Abstract]) AND (open access[filter])`;
    try {
        const pmids = await searchPubMedForIds(query, 50); // Limit to 50 articles
        if (pmids.length === 0) {
            return [];
        }
        const articles = await fetchArticleDetails(pmids);
        
        // Map to Article type, providing defaults for missing RankedArticle fields
        return articles.map(a => ({
            ...a,
            relevanceScore: 0, // Not applicable for this type of search
            relevanceExplanation: 'N/A',
            keywords: [],
        } as Article));
    } catch (error) {
        console.error("Error finding OA articles in journal:", error);
        throw error;
    }
};

/**
 * Generates an AI-powered analysis for a journal.
 * @param journalName - The name of the journal.
 * @param aiSettings - The AI settings from context.
 * @returns A promise that resolves to a `JournalProfile` object.
 */
export const generateJournalProfileAnalysis = async (journalName: string, aiSettings: Settings['ai']): Promise<JournalProfile> => {
    try {
        return await generateProfileWithGemini(journalName, aiSettings);
    } catch (error) {
        console.error("Error in journal profile generation service call:", error);
        throw error;
    }
};