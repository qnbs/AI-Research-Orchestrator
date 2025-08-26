export interface ResearchInput {
  researchTopic: string;
  dateRange: string;
  articleTypes: string[];
  synthesisFocus: string;
  maxArticlesToScan: number;
  topNToSynthesize: number;
}

export interface GeneratedQuery {
  query: string;
  explanation: string;
}

export interface RankedArticle {
  pmid: string;
  pmcId?: string; // PubMed Central ID, often available for open access articles
  title: string;
  authors: string;
  journal: string;
  pubYear: string;
  summary: string;
  relevanceScore: number;
  relevanceExplanation: string;
  keywords: string[];
  isOpenAccess: boolean;
}

export interface OverallKeyword {
    keyword: string;
    frequency: number;
}

export interface ResearchReport {
  generatedQueries: GeneratedQuery[];
  rankedArticles: RankedArticle[];
  synthesis: string;
  aiGeneratedInsights: { question: string; answer: string; supportingArticles: string[] }[];
  overallKeywords: OverallKeyword[];
}

export type AggregatedArticle = RankedArticle & {
    sourceReportTopic: string;
};
