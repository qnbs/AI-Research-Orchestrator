


import { GoogleGenAI, Type } from "@google/genai";
import type { ResearchInput, ResearchReport, Settings, RankedArticle, SimilarArticle, OnlineFindings, WebContent, ResearchAnalysis, GeneratedQuery } from '../types';

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
async function searchPubMedForIds(query: string, retmax: number): Promise<string[]> {
    const url = `${PUBMED_API_BASE}esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${retmax}&sort=relevance&retmode=json`;
    try {
        // NCBI recommends including contact info in requests
        const response = await fetch(url, { headers: { 'User-Agent': 'ai-research-orchestrator/1.0' } });
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
async function fetchArticleDetails(pmids: string[]): Promise<Partial<RankedArticle>[]> {
    if (pmids.length === 0) return [];
    // POST request is better for large number of IDs
    const url = `${PUBMED_API_BASE}esummary.fcgi?db=pubmed&retmode=json`;
    try {
        const formData = new FormData();
        formData.append('id', pmids.join(','));

        const response = await fetch(url, { 
            method: 'POST',
            body: formData,
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
            const pmcidArticleId = (articleData.articleids || []).find((id: { idtype: string }) => id.idtype === 'pmc');
            const pmcId = pmcidArticleId ? pmcidArticleId.value : undefined;

            articles.push({
                pmid: articleData.uid,
                pmcId,
                title: articleData.title,
                authors,
                journal: articleData.fulljournalname,
                pubYear: (articleData.pubdate || '').split(' ')[0],
                isOpenAccess: !!pmcId || articleData.availablefromurl === '1',
            });
        }
        return articles;
    } catch (error) {
        console.error(`Error fetching details for PMIDs:`, error);
        return [];
    }
}

// --- AI Orchestration: Prompts & Schemas ---

// STEP 1: Query Generation
const buildQueryGenerationPrompt = (input: ResearchInput): string => {
  const articleTypesText = input.articleTypes.length > 0 
    ? `Must be one of the following article types: ${input.articleTypes.join(', ')}.` 
    : 'Any article type is acceptable.';
  
  let dateFilterText = 'at any time';
  let dateQueryFragment = '';

  if (input.dateRange !== 'any') {
      const years = parseInt(input.dateRange, 10);
      const today = new Date();
      const startDate = new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
      const formattedStartDate = `${startDate.getFullYear()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}/${startDate.getDate().toString().padStart(2, '0')}`;
      const formattedToday = `${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
      dateFilterText = `published between ${formattedStartDate} and ${formattedToday}`;
      dateQueryFragment = `All queries MUST include the following date filter: ("${formattedStartDate}"[Date - Publication] : "${formattedToday}"[Date - Publication])`;
  }

  return `
    You are an expert in biomedical research and information retrieval. Your task is to formulate advanced search queries for the PubMed database based on a user's research topic.

    **Instructions:**
    1.  **Analyze the Research Topic:** Understand the core concepts and relationships in the user's topic.
    2.  **Construct Search Queries:** Formulate 2-3 diverse, advanced search queries for PubMed.
        - Use Boolean operators (AND, OR, NOT).
        - Use field tags like [Title/Abstract], [MeSH Terms].
        - ${dateQueryFragment}
    3.  **Explain Your Logic:** For each query, provide a brief, one-sentence explanation of its strategy.
    4.  **Output JSON:** Return ONLY a JSON object that adheres to the provided schema.

    **Input Parameters:**
    -   Research Topic: "${input.researchTopic}"
    -   Date Range: Articles published ${dateFilterText}.
    -   Article Types: ${articleTypesText}
  `;
};

// STEP 2: Ranking
const buildRankingPrompt = (articles: Partial<RankedArticle>[], researchTopic: string): string => {
    return `
    You are an AI research analyst. Your task is to evaluate a list of scientific articles based on a research topic and rank them by relevance.
    
    **Research Topic:** "${researchTopic}"

    **Instructions:**
    1.  For each article in the provided list, assign a relevance score from 1 to 100 based on how directly its title addresses the research topic.
    2.  Provide a brief, one-sentence justification for the score.
    3.  Return ONLY a JSON object adhering to the provided schema, containing all the articles with their scores.

    **Articles to Rank (JSON):**
    ${JSON.stringify(articles.map(a => ({ pmid: a.pmid, title: a.title })))}
    `;
};

const rankingSchema = {
    type: Type.OBJECT,
    properties: {
        rankedArticles: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    pmid: { type: Type.STRING },
                    relevanceScore: { type: Type.INTEGER },
                    relevanceExplanation: { type: Type.STRING }
                },
                required: ["pmid", "relevanceScore", "relevanceExplanation"]
            }
        }
    },
    required: ["rankedArticles"]
};

// STEP 3: Detailed Analysis
const buildDetailingPrompt = (articles: Partial<RankedArticle>[]): string => {
    return `
    You are an AI research analyst. Your task is to enrich a list of scientific articles with key details.
    
    **Instructions:**
    1.  For each article provided, use your search tool to find its abstract.
    2.  Based on the abstract and title, perform the following actions:
        - Write a concise, one-paragraph summary of the article's key findings. If an abstract cannot be found, summarize based on the title.
        - Extract 3-5 of the most relevant keywords.
        - Classify the article's type (e.g., 'Randomized Controlled Trial', 'Systematic Review', 'Meta-Analysis', 'Observational Study'). If unsure, classify as 'Other'.
    3.  Your entire response MUST be a single, valid JSON object string. Do not add any explanatory text or markdown formatting. The JSON should contain a single key "detailedArticles".

    **Articles to Analyze (JSON):**
    ${JSON.stringify(articles.map(a => ({ pmid: a.pmid, title: a.title })))}
    `;
};

// STEP 4: Synthesis
const buildSynthesisPrompt = (
    articles: RankedArticle[], 
    input: ResearchInput, 
    aiConfig: Settings['ai']
): { prompt: string; systemInstruction: string } => {
    const synthesisFocusText: { [key: string]: string } = {
      'overview': 'a broad overview of the topic.',
      'clinical': 'the clinical implications and applications of the findings.',
      'future': 'future research directions and unanswered questions.',
      'gaps': 'contradictions, debates, and gaps in the current literature.'
    };
    const preamble = aiConfig.customPreamble ? `**User-Defined Preamble:**\n${aiConfig.customPreamble}\n\n---\n\n` : '';
    const personaInstructions: {[key: string]: string} = {
      'Neutral Scientist': 'Adopt a neutral, objective, and strictly scientific tone.',
      'Concise Expert': 'Be brief and to the point. Focus on delivering the most critical information without verbosity.',
      'Detailed Analyst': 'Provide in-depth analysis. Explore nuances, methodologies, and potential implications thoroughly.',
      'Creative Synthesizer': 'Identify and highlight novel connections, cross-disciplinary links, and innovative perspectives found in the literature.'
    };
    
    const systemInstruction = `You are an AI Research assistant, an expert system designed to synthesize findings from a curated list of scientific articles.
Your core directives are:
1.  **Language:** All output MUST be in **${aiConfig.aiLanguage}**.
2.  **Persona:** ${personaInstructions[aiConfig.aiPersona]}
3.  **Output Format:** Adhere strictly to the provided JSON output schema. Your entire response must be a single, valid JSON object string.`;

    const prompt = `
      ${preamble}
      **User's Research Objective:**
      -   Research Topic: ${input.researchTopic}
      -   Synthesis Focus: The final synthesis should focus on ${synthesisFocusText[input.synthesisFocus]}.

      **Workflow:**
      1.  **Synthesize Findings:** Create a comprehensive narrative from the provided articles, tailored to the specified 'Synthesis Focus'. Use markdown for formatting.
      2.  **Generate Insights:** Based on the user's 'Research Topic' and the articles, formulate 2-3 critical questions that the research answers. Provide direct, evidence-based answers, populating the 'aiGeneratedInsights' field and citing the supporting PMIDs.
      3.  **Identify Overall Keywords:** Analyze the keywords from all articles. Identify the 5-7 most important and frequent themes. Calculate how many articles mention each theme and populate the 'overallKeywords' field.
      4.  **Format Output:** Compile all information into the specified JSON structure.

      **CURATED ARTICLES TO SYNTHESIZE (JSON):**
      ${JSON.stringify(articles.map(a => ({ pmid: a.pmid, title: a.title, summary: a.summary, keywords: a.keywords, articleType: a.articleType })))}
    `;

    return { prompt, systemInstruction };
};

const synthesisSchema = {
    type: Type.OBJECT,
    properties: {
        synthesis: { type: Type.STRING, description: "A comprehensive narrative synthesis of the top N articles, formatted in Markdown." },
        aiGeneratedInsights: {
            type: Type.ARRAY,
            description: "2-3 critical questions answered by the research, with supporting evidence.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING },
                    supportingArticles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of PMIDs supporting the answer." }
                },
                required: ["question", "answer", "supportingArticles"]
            }
        },
        overallKeywords: {
            type: Type.ARRAY,
            description: "5-7 of the most frequent and important keywords across the top N articles.",
            items: {
                type: Type.OBJECT,
                properties: {
                    keyword: { type: Type.STRING },
                    frequency: { type: Type.INTEGER }
                },
                required: ["keyword", "frequency"]
            }
        }
    },
    required: ["synthesis", "aiGeneratedInsights", "overallKeywords"]
};


// --- Core Service Function ---

interface RankingData {
    rankedArticles: {
        pmid: string;
        relevanceScore: number;
        relevanceExplanation: string;
    }[];
}

interface DetailingData {
    detailedArticles: {
        pmid: string;
        summary: string;
        keywords: string[];
        articleType: string;
    }[];
}

export const generateResearchReport = async (input: ResearchInput, config: Settings['ai']): Promise<ResearchReport> => {
  try {
    // === ORCHESTRATION STEP 1: GENERATE SEARCH QUERIES ===
    const queryGenPrompt = buildQueryGenerationPrompt(input);
    const queryGenResponse = await ai.models.generateContent({
        model: config.model,
        contents: queryGenPrompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    queries: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { query: { type: Type.STRING }, explanation: { type: Type.STRING } },
                            required: ["query", "explanation"]
                        }
                    }
                }, required: ["queries"]
            }, 
            temperature: 0.1,
            thinkingConfig: { thinkingBudget: 0 }, // Optimization: Disable thinking for structured, low-latency tasks.
        }
    });

    const queryData = JSON.parse(queryGenResponse.text);
    const generatedQueries: GeneratedQuery[] = queryData.queries;
    if (!generatedQueries || generatedQueries.length === 0) {
        throw new Error("AI failed to generate search queries. Please try a different topic.");
    }
    
    // === ORCHESTRATION STEP 2: SEARCH PUBMED & FETCH DETAILS ===
    const allPmids = new Set<string>();
    const articlesPerQuery = Math.ceil(input.maxArticlesToScan / generatedQueries.length);
    for (const gq of generatedQueries) {
        const pmids = await searchPubMedForIds(gq.query, articlesPerQuery);
        pmids.forEach(pmid => allPmids.add(pmid));
    }
    
    const uniquePmids = Array.from(allPmids);
    if (uniquePmids.length === 0) {
        return {
            generatedQueries,
            rankedArticles: [],
            synthesis: "No articles were found on PubMed matching the AI-generated queries. You can try a broader topic or adjust your search criteria.",
            aiGeneratedInsights: [], overallKeywords: [], sources: []
        };
    }
    const fetchedArticles = await fetchArticleDetails(uniquePmids);
    if (fetchedArticles.length === 0) {
        throw new Error("Found article IDs but could not fetch their details from PubMed. The service may be temporarily unavailable.");
    }
    
    // === ORCHESTRATION STEP 3: AI-POWERED RANKING ===
    const rankingPrompt = buildRankingPrompt(fetchedArticles, input.researchTopic);
    const rankingResponse = await ai.models.generateContent({
        model: config.model,
        contents: rankingPrompt,
        config: { 
            responseMimeType: 'application/json', 
            responseSchema: rankingSchema, 
            temperature: 0.1,
            thinkingConfig: { thinkingBudget: 0 }, // Optimization: Disable thinking for structured, low-latency tasks.
        }
    });

    const rankingData: RankingData = JSON.parse(rankingResponse.text);
    const rankingMap = new Map(rankingData.rankedArticles.map(r => [r.pmid, { score: r.relevanceScore, explanation: r.relevanceExplanation }]));

    let allArticles: RankedArticle[] = fetchedArticles.map(article => ({
        ...article,
        pmid: article.pmid!,
        title: article.title!,
        authors: article.authors!,
        journal: article.journal!,
        pubYear: article.pubYear!,
        relevanceScore: rankingMap.get(article.pmid!)?.score || 0,
        relevanceExplanation: rankingMap.get(article.pmid!)?.explanation || 'N/A',
        summary: '', keywords: [], isOpenAccess: article.isOpenAccess || false
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);


    // === ORCHESTRATION STEP 4: AI-POWERED DETAILED ANALYSIS (IN BATCHES) ===
    const articlesForDetailing = allArticles.slice(0, Math.min(allArticles.length, 50));
    
    const BATCH_SIZE = 10;
    const detailingBatches: Partial<RankedArticle>[][] = [];
    for (let i = 0; i < articlesForDetailing.length; i += BATCH_SIZE) {
        detailingBatches.push(articlesForDetailing.slice(i, i + BATCH_SIZE));
    }

    const detailingPromises = detailingBatches.map(batch =>
        ai.models.generateContent({
            model: config.model,
            contents: buildDetailingPrompt(batch),
            config: {
                tools: [{ googleSearch: {} }],
                temperature: config.temperature,
            }
        })
    );
    
    const batchResults = await Promise.allSettled(detailingPromises);

    let allDetailedArticles: DetailingData['detailedArticles'] = [];
    let allGroundingChunks: any[] = [];

    batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            try {
                const response = result.value;
                const detailingData: DetailingData = extractAndParseJson(response.text);
                if (detailingData.detailedArticles) {
                    allDetailedArticles.push(...detailingData.detailedArticles);
                }
                const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                allGroundingChunks.push(...chunks);
            } catch (e) {
                console.error(`Failed to parse response for detailing batch ${index}:`, e);
            }
        } else {
            console.error(`Detailing batch ${index} failed:`, result.reason);
        }
    });

    const detailsMap = new Map(allDetailedArticles.map(d => [d.pmid, { summary: d.summary, keywords: d.keywords, articleType: d.articleType }]));

    allArticles = allArticles.map(article => {
        const details = detailsMap.get(article.pmid);
        return details ? { ...article, ...details } : article;
    });

    // Filter out articles for which we couldn't get details
    allArticles = allArticles.filter(a => a.summary && a.summary.length > 0);


    // === ORCHESTRATION STEP 5: AI-POWERED SYNTHESIS (ON TOP N) ===
    const topNArticles = allArticles.slice(0, Math.min(allArticles.length, input.topNToSynthesize));
    let synthesis = "Synthesis could not be generated as there were not enough relevant articles found.";
    let aiGeneratedInsights: ResearchReport['aiGeneratedInsights'] = [];
    let overallKeywords: ResearchReport['overallKeywords'] = [];
    
    if (topNArticles.length > 0) {
        const { prompt: synthesisPrompt, systemInstruction } = buildSynthesisPrompt(topNArticles, input, config);
        const synthesisResponse = await ai.models.generateContent({
            model: config.model,
            contents: synthesisPrompt,
            config: {
                systemInstruction,
                temperature: config.temperature,
                responseMimeType: 'application/json',
                responseSchema: synthesisSchema,
            }
        });
        const synthesisData = JSON.parse(synthesisResponse.text);
        synthesis = synthesisData.synthesis;
        aiGeneratedInsights = synthesisData.aiGeneratedInsights;
        overallKeywords = synthesisData.overallKeywords;
    }

    // === FINAL ASSEMBLY ===
    const sources: WebContent[] = allGroundingChunks
        .map((chunk: any) => chunk.web)
        .filter((web: WebContent | undefined): web is WebContent => !!web && !!web.uri && !!web.title);
    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());
    
    const finalReport: ResearchReport = {
        generatedQueries,
        rankedArticles: allArticles,
        synthesis,
        aiGeneratedInsights,
        overallKeywords,
        sources: uniqueSources
    };
    return finalReport;

  } catch (error) {
    console.error("Error generating research report:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to generate report. A step in the AI orchestration process failed: ${errorMessage}`);
  }
};


export const findSimilarArticles = async (
    article: Pick<RankedArticle, 'title' | 'summary'>,
    aiConfig: Settings['ai']
): Promise<SimilarArticle[]> => {
    try {
        const prompt = `
            You are an expert research assistant specializing in biomedical literature.
            Based on the title and summary of the following article, find 3-5 similar or related articles on PubMed using your search tool.
            Prioritize recent, highly relevant articles. For each suggestion, provide the PubMed ID (PMID), the full title, and a brief justification for its relevance.
            
            **Original Article Title:**
            "${article.title}"

            **Original Article Summary:**
            "${article.summary}"

            Your entire response MUST be a single, valid JSON object string. Do not add any explanatory text, markdown formatting, or anything else outside of the JSON object. The JSON should have a single key "similarArticles" which is an array of objects, where each object has "pmid", "title", and "reason" keys.
        `;

        const response = await ai.models.generateContent({
            model: aiConfig.model,
            contents: prompt,
            config: {
                temperature: 0.3, // Lower temperature for more focused results
                tools: [{googleSearch: {}}],
            },
        });

        const parsed = extractAndParseJson<{ similarArticles?: SimilarArticle[] }>(response.text);
        return (parsed.similarArticles || []) as SimilarArticle[];
    } catch (error) {
        console.error("Error finding similar articles:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to find similar articles. The AI responded with: ${errorMessage}`);
    }
};

export const findRelatedOnline = async (
    articleTitle: string,
    aiConfig: Settings['ai']
): Promise<OnlineFindings> => {
    try {
        const prompt = `
            Act as a research assistant. The user has provided the title of a scientific article.
            Your task is to use your search tool to find RECENT (last 1-2 years) and RELEVANT online information about this topic.
            Focus on finding news articles, scientific discussions, blog posts from reputable institutions, or pre-print releases that discuss this research area.
            Provide a brief, 2-3 sentence summary of the current online consensus or discussion about this topic.

            **Article Topic:**
            "${articleTitle}"
        `;
        
        const response = await ai.models.generateContent({
            model: aiConfig.model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.5,
            },
        });

        const summary = response.text;
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        const sources: WebContent[] = chunks
            .map((chunk: any) => chunk.web)
            .filter((web: WebContent | undefined): web is WebContent => !!web && !!web.uri && !!web.title);

        // De-duplicate sources based on URI
        const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

        return {
            summary,
            sources: uniqueSources,
        };
    } catch (error) {
        console.error("Error finding related online content:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to find online content. The AI responded with: ${errorMessage}`);
    }
};

const researchAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A detailed, concise summary of the provided text or answer to the question. Use markdown for formatting."
        },
        keyFindings: {
            type: Type.ARRAY,
            description: "A list of 3-5 of the most important, bullet-point-style key findings or conclusions.",
            items: { type: Type.STRING }
        },
        synthesizedTopic: {
            type: Type.STRING,
            description: "A short, concise topic title (5-10 words) derived from the text, suitable for use in subsequent literature searches."
        }
    },
    required: ["summary", "keyFindings", "synthesizedTopic"]
};

export const generateResearchAnalysis = async (
    queryText: string,
    aiConfig: Settings['ai']
): Promise<ResearchAnalysis> => {
    try {
        const prompt = `
            You are an expert AI research assistant. Your task is to analyze the following text and provide a structured analysis in JSON format.
            The text could be a specific research question, a paper's abstract, a full paper, or just a topic.
            1.  **Analyze and Summarize:** Read the text and produce a high-quality, concise summary. If it's a question, answer it based on your general knowledge and indicate that a web search may be needed for recent info.
            2.  **Extract Key Findings:** Identify and list the 3-5 most critical findings or takeaways from the text.
            3.  **Synthesize a Search Topic:** Create a short, clean topic title that accurately represents the core subject. This will be used to find related articles.

            **User Input:**
            ---
            ${queryText}
            ---

            Provide your response in the specified JSON format.
        `;
        
        const response = await ai.models.generateContent({
            model: aiConfig.model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: researchAnalysisSchema,
                temperature: 0.3,
                thinkingConfig: { thinkingBudget: 0 }, // Optimization: Disable thinking for structured, low-latency tasks.
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ResearchAnalysis;

    } catch (error) {
        console.error("Error generating research analysis:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to analyze the research query. The AI responded with: ${errorMessage}`);
    }
};

export const generateTldrSummary = async (abstract: string, aiConfig: Settings['ai']): Promise<string> => {
    try {
        const prompt = `
            You are a scientific communication expert. Your task is to provide an ultra-concise "TL;DR" (Too Long; Didn't Read) summary of the following academic abstract. 
            The summary should be one to two sentences long at most and capture the absolute core finding or conclusion of the research.
            Output only the summary text, nothing else.

            **Abstract:**
            ---
            ${abstract}
            ---

            **TL;DR Summary:**
        `;

        const response = await ai.models.generateContent({
            model: aiConfig.model,
            contents: prompt,
            config: {
                temperature: 0.1, // Low temperature for high factuality
                thinkingConfig: { thinkingBudget: 0 }, // Optimization: Disable thinking for structured, low-latency tasks.
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating TL;DR summary:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to generate TL;DR summary. The AI responded with: ${errorMessage}`);
    }
};

export const generateSuggestedTopic = async (topic: string, aiConfig: Settings['ai']): Promise<string> => {
    try {
        const prompt = `
            You are an expert in biomedical research information retrieval.
            Your task is to refine a user's research topic to make it more specific, structured, and effective for a PubMed database search.
            - If the topic is too broad, narrow it down.
            - If it's a question, rephrase it as a declarative topic.
            - Add specificity where possible (e.g., patient populations, interventions, outcomes).
            - Use neutral, scientific language.
            - Your entire response MUST be only the refined topic text. Do not add any introductory phrases like "Here is the refined topic:", explanations, or markdown formatting.

            **Original Topic:**
            ---
            ${topic}
            ---

            **Refined Topic:**
        `;

        const response = await ai.models.generateContent({
            model: aiConfig.model,
            contents: prompt,
            config: {
                temperature: 0.2,
                thinkingConfig: { thinkingBudget: 0 },
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating suggested topic:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to refine topic. The AI responded with: ${errorMessage}`);
    }
};