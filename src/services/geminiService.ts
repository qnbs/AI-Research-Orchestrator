
import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { ResearchInput, ResearchReport, Settings, RankedArticle, SimilarArticle, OnlineFindings, WebContent, ResearchAnalysis, GeneratedQuery, AuthorCluster, FeaturedAuthorCategory, JournalProfile } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Retries a fetch operation with exponential backoff.
 * Specifically handles 429 Too Many Requests.
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> {
    try {
        const response = await fetch(url, options);
        
        if (response.status === 429 && retries > 0) {
            // Rate limit hit
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoff * 2;
            console.warn(`Rate limit hit. Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return fetchWithRetry(url, options, retries - 1, waitTime);
        }

        if (!response.ok && retries > 0 && response.status !== 404 && response.status !== 400) {
             // Retry on server errors or timeouts, but not on 404/400
            console.warn(`Fetch failed (${response.status}). Retrying...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`Network error. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

/**
 * Robustly extracts JSON from AI response text.
 * Handles Markdown code blocks, raw JSON, and surrounding chatter.
 */
function extractAndParseJson<T>(text: string): T {
    if (!text) throw new Error("Empty response from AI");

    // Pre-process: remove potentially harmful unicode or control characters if necessary, 
    // but usually JSON.parse handles strings okay.
    // Clean up markdown code blocks first as they are the most common wrapper.
    let cleanText = text.replace(/```json\s*([\s\S]*?)\s*```/g, "$1"); 
    cleanText = cleanText.replace(/```\s*([\s\S]*?)\s*```/g, "$1");

    // 1. Try parsing the cleaned text directly
    try {
        return JSON.parse(cleanText) as T;
    } catch (e) {
        // Continue to advanced extraction
    }

    // 2. Try finding the outermost JSON object or array
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    
    let startIdx = -1;
    let endIdx = -1;

    // Determine if we are looking for an object or an array
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
        // Find corresponding closing brace by counting depth
        let depth = 0;
        for (let i = startIdx; i < cleanText.length; i++) {
            if (cleanText[i] === '{') depth++;
            else if (cleanText[i] === '}') depth--;
            
            if (depth === 0) {
                endIdx = i;
                break;
            }
        }
    } else if (firstBracket !== -1) {
        startIdx = firstBracket;
        // Find corresponding closing bracket
        let depth = 0;
        for (let i = startIdx; i < cleanText.length; i++) {
            if (cleanText[i] === '[') depth++;
            else if (cleanText[i] === ']') depth--;
            
            if (depth === 0) {
                endIdx = i;
                break;
            }
        }
    }

    if (startIdx !== -1 && endIdx !== -1) {
        const potentialJson = cleanText.substring(startIdx, endIdx + 1);
        try {
            return JSON.parse(potentialJson) as T;
        } catch (e) {
             console.warn("Failed to parse extracted JSON segment via depth counting.");
        }
    }

    // 3. Fallback: Naive lastIndexOf (works if AI just stops outputting after JSON)
    const lastBrace = cleanText.lastIndexOf('}');
    const lastBracket = cleanText.lastIndexOf(']');
    
    if (startIdx !== -1) {
        const end = (cleanText[startIdx] === '{') ? lastBrace : lastBracket;
        if (end > startIdx) {
             try {
                return JSON.parse(cleanText.substring(startIdx, end + 1)) as T;
            } catch (e) {
                // ignore
            }
        }
    }

    // 4. Last Resort: Log the failure for debugging
    console.error("CRITICAL: Could not parse JSON.", text);
    throw new Error("AI response did not contain valid JSON. The model may have been interrupted or hallucinatory.");
}

/**
 * Parses a Gemini API error and returns a user-friendly message.
 */
function getGeminiError(error: unknown): string {
    if (error && typeof error === 'object') {
        // Check for GoogleGenAIError structure specifically
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
                        return "The request exceeded the token limit. Please try a more focused query or reduce the number of articles to analyze.";
                    default:
                        return `The AI's response was blocked for an unknown reason (${candidate.finishReason}).`;
                }
            }
        }
        
        if ('status' in error) {
             const status = (error as any).status;
             if (status === 429) return "You have exceeded the API rate limit. Please wait a moment before trying again.";
             if (status === 503) return "The AI service is currently overloaded. Please try again later.";
        }

        if (error instanceof Error) {
            return error.message;
        }
    }
    return "An unknown AI error occurred. Please check your network connection.";
}

export const generateAuthorQuery = (fullName: string): string => {
    if (fullName.includes(',')) {
        const parts = fullName.split(',');
        const lastName = parts[0].trim();
        const firstAndMiddle = parts.slice(1).join(' ').trim();
        fullName = `${firstAndMiddle} ${lastName}`;
    }

    const cleanedName = fullName.replace(/\./g, '');
    const parts = cleanedName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return `""[Author]`;
    if (parts.length === 1) return `"${parts[0]}"[Author]`;

    const lastName = parts[parts.length - 1];
    const firstParts = parts.slice(0, -1);
    const firstName = firstParts[0];
    const initials = firstParts.map(p => p.charAt(0)).join('');

    const queryVariations = new Set<string>();
    queryVariations.add(`"${firstParts.join(' ')} ${lastName}"[Author]`);
    queryVariations.add(`"${lastName} ${initials}"[Author]`);
    queryVariations.add(`"${lastName} ${firstName}"[Author]`);

    return `(${Array.from(queryVariations).join(' OR ')})`;
};

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

export async function searchPubMedForIds(query: string, retmax: number): Promise<string[]> {
    const url = `${PUBMED_API_BASE}esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${retmax}&sort=relevance&retmode=json`;
    try {
        const response = await fetchWithRetry(url, { headers: { 'User-Agent': 'ai-research-orchestration-author/1.0' } });
        if (!response.ok) {
            throw new Error(`PubMed API error: ${response.statusText}. Could not connect to PubMed.`);
        }
        const data: ESearchResult = await response.json();
        
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

export async function fetchArticleDetails(pmids: string[]): Promise<Partial<RankedArticle>[]> {
    if (pmids.length === 0) return [];
    const url = `${PUBMED_API_BASE}esummary.fcgi?db=pubmed&retmode=json`;
    
    // We allow the error to bubble up instead of swallowing it, 
    // so the UI can properly report network failures.
    const formData = new FormData();
    formData.append('id', pmids.join(','));

    const response = await fetchWithRetry(url, { 
        method: 'POST',
        body: formData,
        headers: { 'User-Agent': 'ai-research-orchestration-author/1.0' }
    });
    
    if (!response.ok) {
        throw new Error(`PubMed API error: ${response.statusText}`);
    }
    
    const data: ESummaryResult = await response.json();
    const articles: Partial<RankedArticle>[] = [];

    if (!data.result) {
        throw new Error("Invalid response format from PubMed.");
    }

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
        
        // Use Thinking Config for better reasoning on complex analysis if using gemini-2.5 or gemini-3
        const rankingConfig: any = { 
            systemInstruction, 
            temperature: aiSettings.temperature, 
            responseMimeType: "application/json", 
            responseSchema: {
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
            }
        };

        // Enable thinking if supported and likely beneficial
        if (aiSettings.model.includes('gemini-3')) {
             rankingConfig.thinkingConfig = { thinkingBudget: 8192 };
        } else if (aiSettings.model.includes('gemini-2.5')) {
             rankingConfig.thinkingConfig = { thinkingBudget: 2048 };
        }

        const analysisResponse = await ai.models.generateContent({
            model: aiSettings.model,
            config: rankingConfig,
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
        
        // Thinking config helps with better synthesis structure
        const synthesisConfig: any = { systemInstruction, temperature: aiSettings.temperature };
        if (aiSettings.model.includes('gemini-3')) {
             synthesisConfig.thinkingConfig = { thinkingBudget: 8192 };
        } else if (aiSettings.model.includes('gemini-2.5')) {
             synthesisConfig.thinkingConfig = { thinkingBudget: 2048 };
        }

        const stream = await ai.models.generateContentStream({
            model: aiSettings.model,
            config: synthesisConfig,
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
