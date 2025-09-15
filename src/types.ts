export const ARTICLE_TYPES = [
  'Randomized Controlled Trial', 
  'Meta-Analysis', 
  'Systematic Review', 
  'Observational Study'
];

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
  relevanceExplanation:string;
  keywords: string[];
  isOpenAccess: boolean;
  articleType?: string; // Type of article, e.g., 'Systematic Review'
  aiSummary?: string; // AI-generated summary focusing on methodology, findings, etc.
  customTags?: string[]; // for user-added tags
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
  sources?: WebContent[];
}

export interface AuthorProfileInput {
    authorName: string;
}

// --- NEW KNOWLEDGE BASE TYPES ---

export interface Article extends RankedArticle {}

export interface BaseEntry {
    id: string;
    title: string;
    timestamp: number;
    articles: Article[];
}

export interface ResearchEntry extends BaseEntry {
    sourceType: 'research';
    input: ResearchInput;
    report: ResearchReport;
}

export interface AuthorProfileEntry extends BaseEntry {
    sourceType: 'author';
    input: AuthorProfileInput;
    profile: AuthorProfile;
}

export interface JournalProfile {
    name: string;
    issn: string;
    description: string;
    oaPolicy: string; // e.g., "Full Open Access", "Hybrid", "Subscription"
    focusAreas: string[];
}

export interface JournalEntry extends BaseEntry {
    sourceType: 'journal';
    journalProfile: JournalProfile;
}


export type KnowledgeBaseEntry = ResearchEntry | AuthorProfileEntry | JournalEntry;


export type AggregatedArticle = RankedArticle & {
    sourceTitle: string;
    sourceId: string;
};

// Omit 'sourceId' as it's an internal identifier not meant for export.
export const CSV_EXPORT_COLUMNS: (keyof Omit<AggregatedArticle, 'sourceId'> | 'URL' | 'PMCID_URL')[] = [
    'pmid', 'pmcId', 'title', 'authors', 'journal', 'pubYear', 'summary', 'aiSummary',
    'relevanceScore', 'relevanceExplanation', 'keywords', 'customTags', 
    'sourceTitle', 'isOpenAccess', 'articleType', 'URL', 'PMCID_URL'
];

export interface Preset {
  id: string;
  name: string;
  settings: ResearchInput;
}

export interface Settings {
  theme: 'dark' | 'light';
  appearance: {
    density: 'comfortable' | 'compact';
    fontFamily: 'Inter' | 'Lato' | 'Roboto' | 'Open Sans';
    customColors: {
        enabled: boolean;
        primary: string;
        secondary: string;
        accent: string;
    };
  };
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
    researchAssistant: {
      autoFetchSimilar: boolean;
      autoFetchOnline: boolean;
      authorSearchLimit: number;
    };
    enableTldr: boolean;
  };
  defaults: {
    maxArticlesToScan: number;
    topNToSynthesize: number;
    autoSaveReports: boolean;
    defaultDateRange: string;
    defaultSynthesisFocus: string;
    defaultArticleTypes: string[];
  };
  export: {
    pdf: {
        includeCoverPage: boolean;
        preparedFor: string;
        includeSynthesis: boolean;
        includeInsights: boolean;
        includeQueries: boolean;
        includeToc: boolean;
        includeHeader: boolean;
        includeFooter: boolean;
    };
    csv: {
        columns: ((typeof CSV_EXPORT_COLUMNS)[number])[];
        delimiter: ',' | ';' | '\t';
    };
    citation: {
        includeAbstract: boolean;
        includeKeywords: boolean;
        includeTags: boolean;
        includePmcid: boolean;
    };
  };
  knowledgeBase: {
    defaultView: 'grid' | 'list';
    articlesPerPage: 10 | 20 | 50;
    defaultSort: 'relevance' | 'newest';
  };
  hasCompletedOnboarding: boolean;
}

export interface SimilarArticle {
  pmid: string;
  title: string;
  reason: string;
}

// Types for Google Search grounding results
export interface WebContent {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web: WebContent;
}

export interface OnlineFindings {
  summary: string;
  sources: WebContent[];
}

export interface ResearchAnalysis {
  summary: string;
  keyFindings: string[];
  synthesizedTopic: string;
}

export interface KnowledgeBaseFilter {
    searchTerm: string;
    selectedTopics: string[];
    selectedTags: string[];
    selectedArticleTypes: string[];
    selectedJournals: string[];
    showOpenAccessOnly: boolean;
}

// --- Author Analysis Types ---
export interface AuthorCluster {
  nameVariant: string;
  primaryAffiliation: string;
  topCoAuthors: string[];
  coreTopics: string[];
  publicationCount: number;
  pmids: string[];
}

export interface AuthorMetrics {
  hIndex: number | null;
  totalCitations: number | null;
  publicationCount: number;
  citationsPerYear: { [year: string]: number };
  publicationsAsFirstAuthor: number;
  publicationsAsLastAuthor: number;
}

export interface AuthorProfile {
  name: string;
  affiliations: string[];
  orcid?: string;
  metrics: AuthorMetrics;
  careerSummary: string;
  coreConcepts: { concept: string; frequency: number }[];
  publications: RankedArticle[];
}

// --- Chat Types ---
export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp: number;
}

// --- Featured Authors ---
export interface FeaturedAuthorCategory {
    category: string;
    authors: { name: string; description: string; }[];
}