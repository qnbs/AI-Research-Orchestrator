import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { ResearchInput, ResearchReport, Settings, RankedArticle, SimilarArticle, OnlineFindings, WebContent, ResearchAnalysis, GeneratedQuery, AuthorCluster, FeaturedAuthorCategory, JournalProfile } from '../types';

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

/**
 * Generates a robust PubMed author search query from a full name.
 * Handles different common name formats like "Lander, Eric S." and "Eric S. Lander".
 * @param fullName The full name of the author.
 * @returns A PubMed-compatible query string.
 */
export const generateAuthorQuery = (fullName: string): string => {
    // Handle formats like "Lander, Eric S." first by rearranging them
    if (fullName.includes(',')) {
        const parts = fullName.split(',');
        const lastName = parts[0].trim();
        const firstAndMiddle = parts.slice(1).join(' ').trim();
        fullName = `${firstAndMiddle} ${lastName}`;
    }

    // Remove periods to handle "S." vs "S" and split into parts
    const cleanedName = fullName.replace(/\./g, '');
    const parts = cleanedName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return `""[Author]`; // Should not happen with validation
    if (parts.length === 1) return `"${parts[0]}"[Author]`;

    const lastName = parts[parts.length - 1];
    const firstParts = parts.slice(0, -1);
    const firstName = firstParts[0];
    const initials = firstParts.map(p => p.charAt(0)).join('');

    const queryVariations = new Set<string>();
    
    // 1. Full name format: "First M Last"[Author] e.g. "Eric S Lander"[Author]
    queryVariations.add(`"${firstParts.join(' ')} ${lastName}"[Author]`);
    
    // 2. PubMed standard format: "Last FM"[Author] e.g., "Lander ES"[Author]
    queryVariations.add(`"${lastName} ${initials}"[Author]`);
    
    // 3. Another common format: "Last First"[Author] e.g., "Lander Eric"[Author]
    queryVariations.add(`"${lastName} ${firstName}"[Author]`);

    return `(${Array.from(queryVariations).join(' OR ')})`;
};


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
            throw new Error(`PubMed API error: ${response.statusText}. Could not connect to PubMed.`);
        }
        const data: ESearchResult = await response.json();
        
        // Handle cases where PubMed returns a valid response but no results.
        if (data.esearchresult?.idlist) {
            return data.esearchresult.idlist;
        }
        return [];
    } catch (error) {
        console.error(`Error searching PubMed for query "${query}":`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch from PubMed: ${error.message}`);
        }
        throw new Error('An unknown network error occurred while searching PubMed.');
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

export async function* generateResearchReportStream(input: ResearchInput, aiSettings: Settings['ai']): AsyncGenerator<{ report?: ResearchReport; synthesisChunk?: string; phase: string; }> {
   try {
        const systemInstruction = `${getPreamble(aiSettings)} You are an expert AI research assistant. Your goal is to conduct a literature review on PubMed based on the user's criteria, rank the articles, and synthesize the findings.`;

        const buildQueryGenPrompt = (input: ResearchInput): string => {
            let filterInstructions = '';
            if (input.dateRange !== 'any') {
                const startYear = new Date().getFullYear() - parseInt(input.dateRange, 10);
                filterInstructions += `\n- The articles must be published between ${startYear} and the present day (use ("YYYY/MM/DD"[Date - Publication] : "3000/12/31"[Date - Publication]) syntax).`;
            }

            if (input.articleTypes.length > 0) {
                const typesList = input.articleTypes.map(t => `"${t}"[Publication Type]`).join(' OR ');
                filterInstructions += `\n- The articles must match the filter: (${typesList}).`;
            }

            return `Based on the user's research topic, generate a single, complete, and advanced PubMed search query.
- Use PubMed-specific syntax like MeSH terms ([MeSH]), field tags ([Title/Abstract]), and boolean operators (AND, OR, NOT) to create a precise query for the topic.
- The query MUST incorporate the following filters by using the AND operator: ${filterInstructions ? filterInstructions : 'No additional filters required.'}
- Ensure the main topic part of the query is enclosed in parentheses if it contains OR operators, before you AND the filters.
- For example, for the topic "effects of aspirin on heart attack" with a filter for "Randomized Controlled Trial", a good query would be: (("aspirin"[MeSH Terms] OR "aspirin"[Title/Abstract]) AND ("myocardial infarction"[MeSH Terms] OR "heart attack"[Title/Abstract])) AND ("Randomized Controlled Trial"[Publication Type])

Research Topic: "${input.researchTopic}"
`;
        };
        
        // STEP 1: Generate Search Queries
        yield { phase: "Phase 1: AI Generating PubMed Queries..." };
        const queryGenResponse = await ai.models.generateContent({
            model: aiSettings.model,
            config: { systemInstruction, temperature: 0.1, responseMimeType: "application/json", responseSchema: {
                type: Type.OBJECT,
                properties: {
                    generatedQueries: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { query: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["query", "explanation"] } },
                },
                required: ["generatedQueries"]
            }},
            contents: buildQueryGenPrompt(input)
        });
        
        const { generatedQueries } = extractAndParseJson<{ generatedQueries: GeneratedQuery[] }>(queryGenResponse.text);
        if (!generatedQueries || generatedQueries.length === 0 || !generatedQueries[0].query) {
            throw new Error("The AI failed to generate any search queries.");
        }

        // STEP 2: Execute Real PubMed Search
        yield { phase: "Phase 2: Executing Real-time PubMed Search..." };
        const pmids = await searchPubMedForIds(generatedQueries[0].query, input.maxArticlesToScan);
         if (pmids.length === 0) {
            throw new Error("Your search returned no results from PubMed. This can be due to a very specific topic or strict filters. Try broadening your topic, adjusting the date range, or changing article types.");
        }
        
        // STEP 3: Fetch Real Article Details
        yield { phase: "Phase 3: Fetching Article Details from PubMed..." };
        const articleDetails = await fetchArticleDetails(pmids);
        if (articleDetails.length === 0) {
            throw new Error("Could not fetch details for the articles found on PubMed.");
        }
        
        // STEP 4: AI Analyzes and Ranks Real Data
        yield { phase: "Phase 4: AI Ranking & Analysis of Real Articles..." };
        const analysisResponse = await ai.models.generateContent({
            model: aiSettings.model,
            config: { systemInstruction, temperature: aiSettings.temperature, responseMimeType: "application/json", responseSchema: {
                type: Type.OBJECT,
                properties: {
                    rankedArticles: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { 
                        pmid: { type: Type.STRING }, 
                        relevanceScore: { type: Type.INTEGER }, 
                        relevanceExplanation: { type: Type.STRING }, 
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                        articleType: {type: Type.STRING},
                        aiSummary: { type: Type.STRING, description: "A concise summary of the article's methodology, key findings, and limitations." }
                    }, required: ["pmid", "relevanceScore", "relevanceExplanation", "keywords", "articleType", "aiSummary"] } },
                    aiGeneratedInsights: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING }, supportingArticles: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["question", "answer", "supportingArticles"] } },
                    overallKeywords: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING }, frequency: { type: Type.INTEGER } }, required: ["keyword", "frequency"] } },
                },
                required: ["rankedArticles", "aiGeneratedInsights", "overallKeywords"]
            }},
            contents: `From the provided list of articles, please perform the following analysis based on the original research topic: "${input.researchTopic}".
            1.  Rank the top ${input.topNToSynthesize} articles based on their relevance to the topic. For each, provide its PMID, a relevance score (1-100), a brief explanation for the score, 3-5 keywords from its summary, classify its article type, and write a new, concise summary (as 'aiSummary') that extracts the core methodology, key findings, and limitations of the study. Ensure you ONLY use PMIDs from the provided list.
            2.  Generate 3-5 AI-powered insights based on the provided articles. Each insight should be a question/answer pair. List the PMIDs from the provided list that support each insight.
            3.  Analyze the keywords from all ranked articles to identify overall themes. List the top 5-10 keywords and their frequency.

            Article List (JSON format):
            ${JSON.stringify(articleDetails.map(a => ({pmid: a.pmid, title: a.title, summary: a.summary})))}
            `
        });

        const analysisData = extractAndParseJson<any>(analysisResponse.text);

        const detailedRankedArticles = analysisData.rankedArticles.map((ranked: any) => {
            const details = articleDetails.find(d => d.pmid === ranked.pmid);
            return { ...details, ...ranked };
        }).sort((a: RankedArticle, b: RankedArticle) => b.relevanceScore - a.relevanceScore);

        const partialReport: ResearchReport = { 
            generatedQueries, 
            synthesis: '', 
            rankedArticles: detailedRankedArticles,
            aiGeneratedInsights: analysisData.aiGeneratedInsights,
            overallKeywords: analysisData.overallKeywords
        };
        yield { report: partialReport, phase: "Phase 5: Synthesizing Top Findings..." };

        // STEP 5: AI Generates Synthesis
        const synthesisPrompt = `Based on the following articles, write a comprehensive synthesis focusing on "${input.synthesisFocus}". This should be a well-structured narrative in markdown format.
        
        Articles:
        ${detailedRankedArticles.map((a: RankedArticle) => `
        ---
        PMID: ${a.pmid}
        Title: ${a.title}
        Summary: ${a.aiSummary || a.summary}
        Relevance Score: ${a.relevanceScore}/100
        Keywords: ${a.keywords.join(', ')}
        ---
        `).join('\n')}
        `;

        const stream = await ai.models.generateContentStream({
            model: aiSettings.model,
            config: { systemInstruction, temperature: aiSettings.temperature },
            contents: synthesisPrompt
        });

        for await (const chunk of stream) {
            yield { synthesisChunk: chunk.text, phase: "Streaming Synthesis..." };
        }
        yield { phase: "Finalizing Report..." };

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

export async function generateJournalProfileAnalysis(journalName: string, aiSettings: Settings['ai']): Promise<JournalProfile> {
    try {
        const response = await ai.models.generateContent({
            model: aiSettings.model,
            contents: `Act as an expert academic librarian. Analyze the journal '${journalName}'. Provide a JSON object with the following structure: { "name": "...", "issn": "...", "description": "...", "oaPolicy": "...", "focusAreas": ["..."] }. Find the correct ISSN. For oaPolicy, use one of: "Full Open Access", "Hybrid", "Subscription".`,
            config: {
                systemInstruction: getPreamble(aiSettings),
                temperature: 0.2,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        issn: { type: Type.STRING },
                        description: { type: Type.STRING },
                        oaPolicy: { type: Type.STRING },
                        focusAreas: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["name", "issn", "description", "oaPolicy", "focusAreas"]
                }
            }
        });
        return extractAndParseJson<JournalProfile>(response.text);
    } catch (error) {
        console.error("Error generating journal profile analysis:", error);
        throw new Error(getGeminiError(error));
    }
}

// --- Chat Service ---
export const startChatWithReport = (report: ResearchReport, aiSettings: Settings['ai']): Chat => {
    const context = `
        You are a helpful AI assistant that answers questions about a specific research report.
        The user has just generated the following report. Your answers should be based on this context.

        ## Research Synthesis ##
        ${report.synthesis}

        ## Ranked Articles ##
        ${report.rankedArticles.map(a => `
        - PMID: ${a.pmid}
        - Title: ${a.title}
        - Summary: ${a.summary}
        `).join('\n')}
    `;

    const chat = ai.chats.create({
        model: aiSettings.model,
        config: {
            systemInstruction: context,
            temperature: aiSettings.temperature * 0.8, // Slightly lower temperature for more factual chat
        },
    });
    return chat;
};