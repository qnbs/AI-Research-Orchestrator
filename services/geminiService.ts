


import { GoogleGenAI, Type } from "@google/genai";
import type { ResearchInput, ResearchReport, Settings, RankedArticle, SimilarArticle, OnlineFindings, WebContent, ResearchAnalysis, GeneratedQuery } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


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

// --- AI Prompt Generation & Schemas ---

const buildQueryGenerationPrompt = (input: ResearchInput, aiConfig: Settings['ai']): string => {
  const dateFilter = input.dateRange !== 'any' ? `within the last ${input.dateRange} years` : 'at any time';
  const articleTypesText = input.articleTypes.length > 0 ? `Must be one of the following article types: ${input.articleTypes.join(', ')}.` : 'Any article type is acceptable.';
  
  return `
    You are an expert in biomedical research and information retrieval. Your task is to formulate advanced search queries for the PubMed database based on a user's research topic.

    **Instructions:**
    1.  **Analyze the Research Topic:** Understand the core concepts and relationships in the user's topic.
    2.  **Construct Search Queries:** Formulate 2-3 diverse, advanced search queries for PubMed.
        - Use Boolean operators (AND, OR, NOT).
        - Use field tags like [Title/Abstract], [MeSH Terms].
        - Incorporate filters for date range and article types as specified. For date filters, use PubMed's format like "YYYY/MM/DD"[Date - Publication] : "YYYY/MM/DD"[Date - Publication].
    3.  **Explain Your Logic:** For each query, provide a brief, one-sentence explanation of its strategy.
    4.  **Output JSON:** Return ONLY a JSON object that adheres to the provided schema.

    **Input Parameters:**
    -   Research Topic: "${input.researchTopic}"
    -   Date Range: Articles published ${dateFilter}.
    -   Article Types: ${articleTypesText}
  `;
};

const researchReportSchema = {
    type: Type.OBJECT,
    properties: {
        rankedArticles: {
            type: Type.ARRAY,
            description: "List of all provided articles, ranked by relevance and enriched with summaries, keywords, etc.",
            items: {
                type: Type.OBJECT,
                properties: {
                    pmid: { type: Type.STRING },
                    pmcId: { type: Type.STRING },
                    title: { type: Type.STRING },
                    authors: { type: Type.STRING },
                    journal: { type: Type.STRING },
                    pubYear: { type: Type.STRING },
                    summary: { type: Type.STRING, description: "A concise, one-paragraph summary of the article's key findings." },
                    relevanceScore: { type: Type.INTEGER, description: "A score from 1-100 indicating relevance to the user's topic." },
                    relevanceExplanation: { type: Type.STRING, description: "A brief justification for the relevance score." },
                    keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 relevant keywords extracted from the title and summary." },
                    isOpenAccess: { type: Type.BOOLEAN },
                    articleType: { type: Type.STRING, description: "The classified type of the article (e.g., 'Systematic Review')." }
                },
                required: ["pmid", "title", "authors", "journal", "pubYear", "summary", "relevanceScore", "relevanceExplanation", "keywords", "isOpenAccess", "articleType"]
            }
        },
        synthesis: {
            type: Type.STRING,
            description: "A comprehensive narrative synthesis of the top N articles, formatted in Markdown."
        },
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
    required: ["rankedArticles", "synthesis", "aiGeneratedInsights", "overallKeywords"]
};


const buildAnalysisPrompt = (
    input: ResearchInput, 
    aiConfig: Settings['ai'],
    articles: Partial<RankedArticle>[]
): string => {
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
    const articlesJsonString = JSON.stringify(articles, null, 2);

    return `
      ${preamble}
      You are an AI Research assistant, an expert system designed to analyze and synthesize a provided list of scientific articles. Your primary objective is to curate and synthesize this research based on user-defined criteria, delivering a structured and actionable report in JSON format.

      **Core Directives:**
      1.  **Language:** All output MUST be in **${aiConfig.aiLanguage}**.
      2.  **Persona:** ${personaInstructions[aiConfig.aiPersona]}
      3.  **Output Format:** Adhere strictly to the provided JSON output schema.

      **User's Research Objective:**
      -   Research Topic: ${input.researchTopic}
      -   Synthesis Focus: The final synthesis should focus on ${synthesisFocusText[input.synthesisFocus]}.
      -   Top N to Synthesize: ${input.topNToSynthesize}

      ---

      ### **Workflow**

      **Phase 1: Article Analysis & Ranking**
      1.  **Find Abstracts and Summarize:** For each article in the provided list, use your search tool to find its abstract. Write a concise, one-paragraph summary of its key findings. Populate the 'summary' field. If an abstract cannot be found, write a summary based on the title.
      2.  **Classify Article Type:** For each article, determine its type based on its title and abstract (e.g., 'Randomized Controlled Trial', 'Systematic Review', 'Meta-Analysis', 'Observational Study'). Populate the 'articleType' field. If unsure, classify as 'Other'.
      3.  **Score Relevance:** For each article, assign a relevance score (1-100) based on how directly it addresses the user's 'Research Topic'. Provide a brief 'relevanceExplanation' for your score.
      4.  **Rank and Populate:** Populate the 'rankedArticles' list in the JSON output with all provided articles, now including your generated summaries, types, scores, and explanations, sorted from highest to lowest relevance.

      **Phase 2: Data Extraction & Synthesis**
      1.  **Select Top Articles:** Take the top ${input.topNToSynthesize} articles from the ranked list.
      2.  **Extract Keywords per Article:** For each of the top articles, analyze its title and your summary to extract 3-5 of the most relevant keywords. Populate the 'keywords' field for each article in the final output.
      3.  **Synthesize Findings:** Create a comprehensive narrative from the top articles, tailored to the specified 'Synthesis Focus': "${synthesisFocusText[input.synthesisFocus]}". Use markdown for formatting.
      4.  **Generate Insights:** Based on the user's 'Research Topic' and the top articles, formulate 2-3 critical questions that the research answers. Provide direct, evidence-based answers, populating the 'aiGeneratedInsights' field and citing the supporting PMIDs.
      5.  **Identify Overall Keywords:** Analyze the keywords from all top articles. Identify the 5-7 most important and frequent themes. Calculate how many of the top articles mention each theme and populate the 'overallKeywords' field.
      6.  **Format Output:** Compile all information into the specified JSON structure.

      ---

      **ARTICLES TO ANALYZE (JSON format):**
      ${articlesJsonString}
    `;
};

// --- Core Service Functions ---

export const generateResearchReport = async (input: ResearchInput, config: Settings['ai']): Promise<ResearchReport> => {
  try {
    // STEP 1: Generate Search Queries with AI
    const queryGenPrompt = buildQueryGenerationPrompt(input, config);
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
                        description: "A list of 2-3 advanced PubMed search queries.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                query: { type: Type.STRING, description: "The PubMed query string." },
                                explanation: { type: Type.STRING, description: "A brief explanation of the query's logic." }
                            },
                            required: ["query", "explanation"]
                        }
                    }
                },
                required: ["queries"]
            },
            temperature: 0.1,
        }
    });

    const queryData = JSON.parse(queryGenResponse.text);
    const generatedQueries: GeneratedQuery[] = queryData.queries;
    if (!generatedQueries || generatedQueries.length === 0) {
        throw new Error("AI failed to generate search queries. Please try a different topic.");
    }
    
    // STEP 2: Search PubMed using generated queries
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
            aiGeneratedInsights: [],
            overallKeywords: [],
            sources: []
        };
    }

    // STEP 3: Fetch Article Details from PubMed
    const fetchedArticles = await fetchArticleDetails(uniquePmids);
    if (fetchedArticles.length === 0) {
        throw new Error("Found article IDs but could not fetch their details from PubMed. The service may be temporarily unavailable.");
    }

    // STEP 4: Rank, Summarize, and Synthesize with AI
    const analysisPrompt = buildAnalysisPrompt(input, config, fetchedArticles);
    const analysisResponse = await ai.models.generateContent({
        model: config.model,
        contents: analysisPrompt,
        config: {
            tools: [{ googleSearch: {} }], // Allow AI to search for abstracts
            temperature: config.temperature,
        },
    });
    
    const jsonText = analysisResponse.text.trim();
    let report: Omit<ResearchReport, 'generatedQueries' | 'sources'>;

    try {
        report = JSON.parse(jsonText);
    } catch (parseError) {
        console.error("Failed to parse AI analysis response as JSON:", jsonText);
        throw new Error("The AI returned an invalid analysis response. This can happen with complex queries. Please try simplifying your topic or adjusting the parameters.");
    }

    // STEP 5: Combine and Finalize Report
    const groundingChunks = analysisResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: WebContent[] = groundingChunks
        .map((chunk: any) => chunk.web)
        .filter((web: WebContent | undefined): web is WebContent => !!web && !!web.uri && !!web.title);
    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

    const finalReport: ResearchReport = { ...report, generatedQueries, sources: uniqueSources };
    return finalReport;

  } catch (error) {
    console.error("Error generating research report:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to generate report. The service responded with: ${errorMessage}`);
  }
};

const similarArticlesSchema = {
    type: Type.OBJECT,
    properties: {
        similarArticles: {
            type: Type.ARRAY,
            description: "A list of 3-5 similar or related articles found on PubMed.",
            items: {
                type: Type.OBJECT,
                properties: {
                    pmid: { type: Type.STRING, description: "The PubMed ID of the similar article." },
                    title: { type: Type.STRING, description: "The full title of the similar article." },
                    reason: { type: Type.STRING, description: "A brief justification for why this article is relevant." }
                },
                required: ["pmid", "title", "reason"]
            }
        }
    },
    required: ["similarArticles"]
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

            Return ONLY a JSON object that adheres to the provided schema.
        `;

        const response = await ai.models.generateContent({
            model: aiConfig.model,
            contents: prompt,
            config: {
                temperature: 0.3, // Lower temperature for more focused results
                tools: [{googleSearch: {}}],
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
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
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating TL;DR summary:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to generate TL;DR summary. The AI responded with: ${errorMessage}`);
    }
};