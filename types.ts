
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
  customTags?: string[]; // New: for user-added tags
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

export interface KnowledgeBaseEntry {
  input: ResearchInput;
  report: ResearchReport;
}

export type AggregatedArticle = RankedArticle & {
    sourceReportTopic: string;
};

export interface Settings {
  theme: 'dark' | 'light';
  performance: {
    enableAnimations: boolean;
  };
  notifications: {
      position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
      duration: number; // in ms
  };
  ai: {
    model: 'gemini-2.5-flash';
    customPreamble: string;
    temperature: number;
    aiLanguage: 'English' | 'German' | 'French' | 'Spanish';
    aiPersona: 'Neutral Scientist' | 'Concise Expert' | 'Detailed Analyst' | 'Creative Synthesizer';
  };
  defaults: {
    maxArticlesToScan: number;
    topNToSynthesize: number;
    autoSaveReports: boolean;
  };
}