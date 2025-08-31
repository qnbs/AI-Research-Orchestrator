import { GoogleGenAI, Type } from "@google/genai";
import type { ResearchInput, ResearchReport, Settings, RankedArticle, SimilarArticle, OnlineFindings, WebContent, ResearchAnalysis, GeneratedQuery, AuthorCluster } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Extracts a JSON object or array from a string that may contain other text,
 * such as markdown code fences.
 * @param text The string to extract JSON from.
 * @returns The parsed JSON object.
 * @throws An error if no valid JSON is found or if parsing fails.
 */
function extractAndParseJson<T>(text: string): T {
    // Regex to find JSON in ```json ... ```, or a raw JSON object/array.
    const jsonRegex = /```json\s*([\s\S]*?)\s*```|({[\s\S]*})|(\[[\s\S]*\])/m;
    const match = text.match(jsonRegex);

    if (match) {
        // Find the first non-null capture group.
        const jsonString = match[1] || match[2] || match[3];
        if (jsonString) {
            try {
                return JSON.parse(jsonString) as T;
            } catch (error) {
                console.error("Failed to parse extracted JSON:", jsonString, error);
                throw new Error(`AI response contained malformed JSON. Content: ${jsonString.substring(0, 200)}...`);
            }
        }
    }
    
    // As a fallback for cases where the model returns JSON without fences,
    // try parsing the whole string.
    try {
        return JSON.parse(text) as T;
    } catch(e) {
        // If everything fails, throw a clear error.
        console.error("Could not find any valid JSON in the AI response:", text);
        throw new Error("AI response did not contain valid JSON.");
    }
}

/**
 * Parses a Gemini API error and returns a user-friendly message.
 * @param error The error object.
 * @returns A string containing a readable error message.
 */
function getGeminiError(error: unknown): string {
    if (error && typeof error === 'object') {
        // Check for specific Gemini response structure indicating a block reason
        if ('response' in error) {
            const response = (error as any).response;
            const candidate = response?.candidates?.[0];
            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                switch (candidate.finishReason) {
                    case 'SAFETY':
                        return "The AI's response was blocked due to safety settings. Please modify your query and try again.";
                    case 'RECITATION':
                        return "The AI's response was blocked because it was too similar to a known source. Please try a different query.";
                    case 'MAX_TOKENS':
                        return "The request exceeded the token limit. Please try a more focused query.";
                    default:
                        return `The AI's response was blocked for an unknown reason (${candidate.finishReason}).`;
                }
            }
        }
        if (error instanceof Error) {
            return error.message;
        }
    }
    return "An unknown AI error occurred.";
}


// --- PubMed API Client ---

const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';

interface ESearchResult {
    esearchresult: {
        idlist: string[];
    }
}

interface ESummaryResult {
    result: {
        uids: string[];
        [uid: string]: any;
    }
}

/**
 * Searches PubMed for article IDs matching a query.
 * @param query The search query string.
 * @param retmax The maximum number of IDs to return.
 * @returns A promise that resolves to an array of PubMed IDs.
 */
export async function searchPubMedForIds(query: string, retmax: number): Promise<string[]> {
    const url = `${PUBMED_API_BASE}esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${retmax}&sort=relevance&retmode=json`;
    try {
        // NCBI recommends including contact info in requests
        const response = await fetch(url, { headers: { 'User-Agent': 'ai-research-orchestration-author/1.0' } });
        if (!response.ok) {
            throw new Error(`PubMed API error: ${response.statusText}`);
        }
        const data: ESearchResult = await response.json();
        return data.esearchresult.idlist;
    } catch (error) {
        console.error(`Error searching PubMed for query "${query}":`, error);
        return []; // Return empty array on error to not fail the whole process
    }
}

/**
 * Fetches summary details for a list of PubMed IDs.
 * @param pmids An array of PubMed IDs.
 * @returns A promise that resolves to an array of partial article data.
 */
export async function fetchArticleDetails(pmids: string[]): Promise<Partial<RankedArticle>[]> {
    if (pmids.length === 0) return [];
    // POST request is better for large number of IDs
    const url = `${PUBMED_API_BASE}esummary.fcgi?db=pubmed&retmode=json`;
    try {
        const formData = new FormData();
        formData.append('id', pmids.join(','));

        const response = await fetch(url, { 
            method: 'POST',
            body: formData,
            headers: { 'User-Agent': 'ai-research-orchestration-author/1.0' }
        });
        
        if (!response.ok) {
            throw new Error(`PubMed API error: ${response.statusText}`);
        }
        const data: ESummaryResult = await response.json();
        const articles: Partial<RankedArticle>[] = [];

        for (const pmid of data.result.uids) {
            const articleData = data.result[pmid];
            if (!articleData) continue;
            
            const authors = (articleData.authors || []).map((a: { name: string }) => a.name).join(', ');
            const pmcIdEntry = (articleData.articleids || []).find((id: { idtype: string }) => id.idtype === 'pmc');
            
            articles.push({
                pmid: pmid,
                pmcId: pmcIdEntry?.value,
                title: articleData.title,
                authors: authors,
                journal: articleData.fulljournalname,
                pubYear: articleData.pubdate.split(' ')[0],
                summary: articleData.abstract || 'No abstract available.',
                isOpenAccess: articleData.availablefromurl?.toLowerCase().includes('pubmed central')
            });
        }
        return articles;
    } catch (error) {
        console.error('Error fetching article details:', error);
        return [];
    }
}

const getPreamble = (aiSettings: Settings['ai']) => {
    const languagePreamble = `Your response must be in ${aiSettings.aiLanguage}.`;
    const personaPreamble = {
        'Neutral Scientist': 'Adopt a neutral, objective, and strictly scientific tone.',
        'Concise Expert': 'Be brief and to the point. Focus on delivering the most critical information without verbosity.',
        'Detailed Analyst': 'Provide in-depth analysis. Explore nuances, methodologies, and potential implications thoroughly.',
        'Creative Synthesizer': 'Identify and highlight novel connections, cross-disciplinary links, and innovative perspectives found in the literature.'
    }[aiSettings.aiPersona];

    return `${languagePreamble} ${personaPreamble} ${aiSettings.customPreamble || ''}`.trim();
};

export async function generateResearchReport(input: ResearchInput, aiSettings: Settings['ai']): Promise<ResearchReport> {
   try {
        const systemInstruction = `${getPreamble(aiSettings)} You are an expert AI research assistant. Your goal is to conduct a literature review on PubMed based on the user's criteria, rank the articles, and synthesize the findings.`;

        const response = await ai.models.generateContent({
            model: aiSettings.model,
            config: { systemInstruction, temperature: aiSettings.temperature, responseMimeType: "application/json", responseSchema: {
                 type: Type.OBJECT,
                properties: {
                    generatedQueries: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { query: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["query", "explanation"] } },
                    rankedArticles: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { pmid: { type: Type.STRING }, relevanceScore: { type: Type.INTEGER }, relevanceExplanation: { type: Type.STRING }, keywords: { type: Type.ARRAY, items: { type: Type.STRING } }, articleType: {type: Type.STRING} }, required: ["pmid", "relevanceScore", "relevanceExplanation", "keywords", "articleType"] } },
                    synthesis: { type: Type.STRING },
                    aiGeneratedInsights: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING }, supportingArticles: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["question", "answer", "supportingArticles"] } },
                    overallKeywords: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING }, frequency: { type: Type.INTEGER } }, required: ["keyword", "frequency"] } },
                },
                required: ["generatedQueries", "rankedArticles", "synthesis", "aiGeneratedInsights", "overallKeywords"]
            }},
            contents: `Please perform a literature review based on these criteria:
            - Research Topic: "${input.researchTopic}"
            - Date Range: Last ${input.dateRange} years
            - Article Types: ${input.articleTypes.join(', ')}
            - Synthesis Focus: ${input.synthesisFocus}
            - Max Articles to Scan: ${input.maxArticlesToScan}
            - Top N to Synthesize: ${input.topNToSynthesize}

            Follow these steps:
            1.  Generate 1-3 advanced PubMed search queries. Provide a brief explanation for each.
            2.  Execute these queries (conceptually) to find up to ${input.maxArticlesToScan} articles.
            3.  From the results, rank the top ${input.topNToSynthesize} articles based on relevance to the research topic. For each, provide a PMID, a relevance score (1-100), a brief explanation for the score, 3-5 keywords from the abstract, and classify its article type.
            4.  Write a comprehensive synthesis of the findings from these top articles, focusing on "${input.synthesisFocus}". This should be a well-structured narrative in markdown format.
            5.  Generate 3-5 AI-powered insights. Each insight should be a question/answer pair, highlighting interesting connections, gaps, or implications from the research. List the PMIDs that support each insight.
            6.  Analyze the keywords from all ranked articles to identify overall themes. List the top 5-10 keywords and their frequency.
            `
        });

        const reportData = extractAndParseJson<any>(response.text);

        const pmids = reportData.rankedArticles.map((a: any) => a.pmid);
        const articleDetails = await fetchArticleDetails(pmids);
        
        const detailedRankedArticles = reportData.rankedArticles.map((ranked: any) => {
            const details = articleDetails.find(d => d.pmid === ranked.pmid);
            return { ...details, ...ranked };
        });

        return { ...reportData, rankedArticles: detailedRankedArticles };

    } catch (error) {
        console.error("Error generating research report:", error);
        throw new Error(getGeminiError(error));
    }
}

export async function findSimilarArticles(article: { title: string; summary: string }, aiSettings: Settings['ai']): Promise<SimilarArticle[]> {
   try {
        const response = await ai.models.generateContent({
            model: aiSettings.model,
            contents: `Based on the following article, find 3-5 similar articles on PubMed. For each, provide the PMID, title, and a brief reason for its relevance.
            Title: "${article.title}"
            Summary: "${article.summary}"`,
            config: { 
                systemInstruction: getPreamble(aiSettings),
                temperature: 0.3,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            pmid: { type: Type.STRING },
                            title: { type: Type.STRING },
                            reason: { type: Type.STRING }
                        },
                        required: ["pmid", "title", "reason"]
                    }
                }
            }
        });
        return extractAndParseJson<SimilarArticle[]>(response.text);
    } catch (error) {
        console.error("Error finding similar articles:", error);
        throw new Error(getGeminiError(error));
    }
}

export async function findRelatedOnline(topic: string, aiSettings: Settings['ai']): Promise<OnlineFindings> {
    try {
        const response = await ai.models.generateContent({
            model: aiSettings.model,
            contents: `Provide a brief summary of the online discussion, news, or recent developments related to "${topic}".`,
            config: { 
                systemInstruction: getPreamble(aiSettings),
                tools: [{ googleSearch: {} }] 
            }
        });
        const sources: WebContent[] = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map((chunk: any) => chunk.web);
        return { summary: response.text, sources: sources };
    } catch (error) {
        console.error("Error finding related online content:", error);
        throw new Error(getGeminiError(error));
    }
}

export async function generateTldrSummary(abstract: string, aiSettings: Settings['ai']): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: aiSettings.model,
            contents: `Summarize the following abstract in a single, concise sentence (TL;DR format): "${abstract}"`,
            config: { 
                systemInstruction: getPreamble(aiSettings),
                temperature: 0, 
                thinkingConfig: { thinkingBudget: 0 } 
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating TL;DR summary:", error);
        throw new Error(getGeminiError(error));
    }
}

export async function generateResearchAnalysis(query: string, aiSettings: Settings['ai']): Promise<ResearchAnalysis> {
    try {
        const response = await ai.models.generateContent({
            model: aiSettings.model,
            contents: `Analyze the following text. Provide a concise summary, a bulleted list of 3-5 key findings, and synthesize a clear, specific research topic suitable for a PubMed search.
            Text: "${query}"`,
            config: { 
                systemInstruction: getPreamble(aiSettings),
                temperature: 0.2,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
                        synthesizedTopic: { type: Type.STRING }
                    },
                    required: ["summary", "keyFindings", "synthesizedTopic"]
                }
            }
        });
        return extractAndParseJson<ResearchAnalysis>(response.text);
    } catch (error) {
        console.error("Error generating research analysis:", error);
        throw new Error(getGeminiError(error));
    }
}

export async function disambiguateAuthor(authorName: string, articles: Partial<RankedArticle>[], aiSettings: Settings['ai']): Promise<AuthorCluster[]> {
    try {
        const response = await ai.models.generateContent({
            model: aiSettings.model,
            contents: `Given the author name "${authorName}" and this list of their potential publications, disambiguate them into distinct author profiles. For each profile, provide a likely name variant, their most common primary affiliation, top 3 co-authors, core research topics, total publication count, and a list of their PMIDs.
            Articles: ${JSON.stringify(articles.map(a => ({ pmid: a.pmid, title: a.title, authors: a.authors, journal: a.journal })))}`,
            config: {
                systemInstruction: getPreamble(aiSettings),
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            nameVariant: { type: Type.STRING },
                            primaryAffiliation: { type: Type.STRING },
                            topCoAuthors: { type: Type.ARRAY, items: { type: Type.STRING } },
                            coreTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                            publicationCount: { type: Type.INTEGER },
                            pmids: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["nameVariant", "primaryAffiliation", "topCoAuthors", "coreTopics", "publicationCount", "pmids"]
                    }
                }
            }
        });
        return extractAndParseJson<AuthorCluster[]>(response.text);
    } catch (error) {
        console.error("Error disambiguating author:", error);
        throw new Error(getGeminiError(error));
    }
}

export async function generateAuthorProfileAnalysis(authorName: string, articles: Partial<RankedArticle>[], aiSettings: Settings['ai']): Promise<{ careerSummary: string; coreConcepts: { concept: string; frequency: number }[]; estimatedMetrics: { hIndex: number | null; totalCitations: number | null; } }> {
    try {
        const response = await ai.models.generateContent({
            model: aiSettings.model,
            contents: `Analyze the following publication list for author "${authorName}". Based strictly on this list, provide:
            1. A narrative career summary (in markdown format).
            2. A list of their core research concepts with frequency.
            3. An estimation of their h-index and total citations. If the provided data is insufficient for a reasonable estimation, return null for these metric fields.
            Publications: ${JSON.stringify(articles.map(a => ({ title: a.title, pubYear: a.pubYear, journal: a.journal })))}`,
            config: {
                systemInstruction: getPreamble(aiSettings),
                temperature: 0.3,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        careerSummary: { type: Type.STRING },
                        coreConcepts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { concept: { type: Type.STRING }, frequency: { type: Type.INTEGER } }, required: ["concept", "frequency"] } },
                        estimatedMetrics: { type: Type.OBJECT, properties: { hIndex: { type: Type.INTEGER, nullable: true }, totalCitations: { type: Type.INTEGER, nullable: true } }, required: ["hIndex", "totalCitations"] }
                    },
                    required: ["careerSummary", "coreConcepts", "estimatedMetrics"]
                }
            }
        });
        return extractAndParseJson<any>(response.text);
    } catch (error) {
        console.error("Error generating author profile:", error);
        throw new Error(getGeminiError(error));
    }
}

export async function suggestAuthors(fieldOfStudy: string, aiSettings: Settings['ai']): Promise<{name: string; description: string;}[]> {
    try {
        const response = await ai.models.generateContent({
            model: aiSettings.model,
            contents: `Suggest 5-10 prominent researchers in the field of "${fieldOfStudy}". For each, provide their name and a brief (1-sentence) description of their key contribution.`,
            config: {
                systemInstruction: getPreamble(aiSettings),
                temperature: 0.5,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING }
                        },
                        required: ["name", "description"]
                    }
                }
            }
        });
        return extractAndParseJson<{name: string; description: string;}[]>(response.text);
    } catch (error) {
        console.error("Error suggesting authors:", error);
        throw new Error(getGeminiError(error));
    }
}

export async function analyzeSingleArticle(identifier: string, aiSettings: Settings['ai']): Promise<RankedArticle> {
    try {
        let pmid = identifier.trim();
        // Basic identifier extraction
        if (identifier.includes('pubmed.ncbi.nlm.nih.gov/')) {
            const match = identifier.match(/(\d+)\/?$/);
            if (match) pmid = match[1];
        } else if (identifier.includes('doi.org/')) {
            // Can't directly convert DOI to PMID reliably without another API, so we'll just search for the DOI
            const ids = await searchPubMedForIds(identifier, 1);
            if (ids.length > 0) pmid = ids[0]; else throw new Error('DOI not found in PubMed.');
        }

        const articleDetails = await fetchArticleDetails([pmid]);
        if (!articleDetails || articleDetails.length === 0) {
            throw new Error('Could not fetch article details from PubMed. Please check the identifier.');
        }
        const articleData = articleDetails[0] as Partial<RankedArticle> & { pmid: string, title: string, summary: string, authors: string, journal: string, pubYear: string };

        const prompt = `Analyze the following article abstract and title. Provide a relevance score for how well the abstract matches the title, extract keywords, and classify the article type.
        Title: ${articleData.title}
        Abstract: ${articleData.summary}
        
        Provide the following in a single JSON object:
        1. relevanceScore: A number from 1-100 of how relevant the abstract is to the title.
        2. relevanceExplanation: A brief (1-2 sentences) explanation for the score.
        3. keywords: An array of 3-5 relevant keywords from the text.
        4. articleType: Classify the article into one of: 'Randomized Controlled Trial', 'Meta-Analysis', 'Systematic Review', 'Observational Study', or 'Other'.`;

        const response = await ai.models.generateContent({
            model: aiSettings.model,
            contents: prompt,
            config: {
                systemInstruction: getPreamble(aiSettings),
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        relevanceScore: { type: Type.INTEGER, description: 'Score from 1 to 100.' },
                        relevanceExplanation: { type: Type.STRING, description: 'Brief explanation for the score.' },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                        articleType: { type: Type.STRING, description: 'Type of the article.' }
                    },
                    required: ['relevanceScore', 'relevanceExplanation', 'keywords', 'articleType']
                }
            }
        });

        const analysis = extractAndParseJson<{
            relevanceScore: number;
            relevanceExplanation: string;
            keywords: string[];
            articleType: string;
        }>(response.text);

        return {
            ...articleData,
            ...analysis,
            isOpenAccess: articleData.isOpenAccess ?? false,
        };
    } catch (error) {
        console.error("Error analyzing single article:", error);
        throw new Error(getGeminiError(error));
    }
}