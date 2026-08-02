export const ARTICLE_TYPES = [
  'Randomized Controlled Trial',
  'Meta-Analysis',
  'Systematic Review',
  'Observational Study',
];

export interface ResearchInput {
  researchTopic: string;
  dateRange: string;
  articleTypes: string[];
  synthesisFocus: string;
  maxArticlesToScan: number;
  topNToSynthesize: number;
  /** When true, arXiv preprints are fetched in addition to PubMed articles */
  includeArxiv?: boolean;
  /**
   * When true, run the educational synthetic demo corpus (explicit opt-in).
   * Never implied by offline mode, empty retrieval, or network failure.
   */
  educationalDemoMode?: boolean;
}

export interface GeneratedQuery {
  query: string;
  explanation: string;
}

export type AbstractStatus = 'available' | 'missing' | 'structured';

export type PubMedRetrievalSource = 'pubmed_efetch' | 'pubmed_esummary';

/** Typed article source id (P1-5) — legacy `pmid` string remains the canonical map key. */
export type SourceIdentifier =
  | { type: 'pmid'; value: string }
  | { type: 'pmcid'; value: string }
  | { type: 'doi'; value: string }
  | { type: 'arxiv'; value: string }
  | { type: 'demo'; value: string };

/** How an article entered the corpus (P0 synthetic-demo quarantine). */
export type ArticleSourceClass =
  | 'pubmed-retrieved'
  | 'arxiv-retrieved'
  | 'user-imported'
  | 'demo-synthetic'
  | 'offline-placeholder';

/** Aggregate corpus provenance for a research report. */
export type ReportCorpusClass =
  'retrieved' | 'mixed-retrieved' | 'demo-only' | 'placeholder-only' | 'empty-retrieval';

export interface RankedArticle {
  /** Canonical legacy key (numeric PMID, `arxiv:…`, `doi:…`, `pmcid:…`, `demo:…`). */
  pmid: string;
  /** Typed identifier; hydrated on read when absent. */
  articleId?: SourceIdentifier;
  pmcId?: string; // PubMed Central ID, often available for open access articles
  title: string;
  authors: string;
  journal: string;
  pubYear: string;
  /** Source abstract from PubMed EFetch when available; empty when absent — never a placeholder string. */
  summary: string;
  /** Explicit abstract availability for ranking and UI provenance. */
  abstractStatus?: AbstractStatus;
  /** Where metadata/abstract was retrieved (NCBI stage). */
  retrievalSource?: PubMedRetrievalSource;
  /** Epoch ms when this record was fetched from NCBI. */
  retrievedAt?: number;
  /** Provenance class — required for scientific honesty on demo vs retrieved. */
  sourceClass?: ArticleSourceClass;
  relevanceScore: number;
  relevanceExplanation: string;
  keywords: string[];
  isOpenAccess: boolean;
  articleType?: string; // Type of article, e.g., 'Systematic Review'
  aiSummary?: string; // AI-generated summary focusing on methodology, findings, etc.
  customTags?: string[]; // for user-added tags
  doi?: string;
  publicationTypes?: string[];
}

export interface OverallKeyword {
  keyword: string;
  frequency: number;
}

/** Atomically citable synthesis claim bound to corpus PMIDs. */
export interface GroundedClaim {
  id?: string;
  text: string;
  pmids: string[];
  /** Typed citation ids parallel to `pmids` when persisted (P1-5). */
  articleIds?: SourceIdentifier[];
  validationState?: ClaimValidationState;
  evidenceSnippets?: string[];
  provenanceMode?: 'extractive-template' | 'narrative-extracted' | 'structured-schema';
}

export type ClaimValidationState = 'verified' | 'unverified' | 'rejected';

export type SynthesisTrustLevel = 'verified' | 'narrative-draft';

/** Structured synthesis layer for export/persistence validation. */
export interface GroundedSynthesis {
  claims: GroundedClaim[];
  /** Provenance of claim extraction (heuristic template vs live narrative parse). */
  mode: 'extractive-template' | 'narrative-extracted';
  /** Whether claims passed corpus + evidence validation (live narrative defaults to draft). */
  trustLevel?: SynthesisTrustLevel;
  validatedAt?: number;
}

export interface ResearchReport {
  generatedQueries: GeneratedQuery[];
  rankedArticles: RankedArticle[];
  synthesis: string;
  aiGeneratedInsights: { question: string; answer: string; supportingArticles: string[] }[];
  overallKeywords: OverallKeyword[];
  /** Optional structured claims; sanitized on export when present. */
  groundedSynthesis?: GroundedSynthesis;
  sources?: WebContent[];
  /** Build/runtime provenance stamped at report completion (P1-6). */
  generationProvenance?: ReportGenerationProvenance;
  /** Aggregate corpus class (retrieved vs educational demo vs empty). */
  corpusClass?: ReportCorpusClass;
  /** Machine-readable retrieval completeness / empty-corpus reason. */
  retrievalOutcome?:
    | 'ok'
    | 'partial_failure'
    | 'zero_results'
    | 'retrieval_failed'
    | 'offline_without_demo'
    | 'educational_demo';
}

/** Identifies the app build and frozen execution context that produced a research report. */
export interface ReportGenerationProvenance {
  appVersion: string;
  buildCommitSha: string;
  dexieSchemaVersion: number;
  swCacheVersion: string;
  generatedAt: number;
  inferenceMode?: 'live' | 'heuristic';
  providerId?: import('./services/providers/types').AIProviderSelection;
  model?: string;
  /** Stable id for this research run (from start-of-stream freeze). */
  executionId?: string;
  /** Why inference mode was chosen at stream start (immutable). */
  inferenceReason?: import('./services/inferenceMode').InferenceModeReason;
  /** Stream start timestamp (ms). */
  startedAt?: number;
  /** Custom/Ollama endpoint origin when configured. */
  endpointOrigin?: string;
  /** Prompt catalog version at run start. */
  promptRegistryVersion?: string;
  /** Append-only mid-run transitions (prefer clean restart; usually empty). */
  transitions?: Array<{
    at: number;
    fromMode: 'live' | 'heuristic';
    toMode: 'live' | 'heuristic';
    reason: string;
  }>;
}

export interface AuthorProfileInput {
  authorName: string;
}

// --- NEW KNOWLEDGE BASE TYPES ---

export type Article = RankedArticle;

export interface BaseEntry {
  id: string;
  title: string;
  timestamp: number;
  articles: Article[];
  sourceType: 'research' | 'author' | 'journal';
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

export interface JournalMetrics {
  /** Journal Impact Factor — approximate; provenance flagged via `source`. */
  impactFactor: number | null;
  /** Number of recently analyzed articles (from the current PubMed fetch). */
  analyzedArticleCount: number | null;
  /** Share of open-access articles among analyzed articles (0–100). */
  openAccessRate: number | null;
  /** Honest provenance: curated static data, AI estimation, or computed from fetched articles. */
  source: 'curated' | 'ai-estimated' | 'computed';
}

export interface JournalProfile {
  name: string;
  issn: string;
  description: string;
  oaPolicy: string; // e.g., "Full Open Access", "Hybrid", "Subscription"
  focusAreas: string[];
  publisher?: string;
  metrics?: JournalMetrics | null;
}

/** Candidate returned by journal disambiguation (name variants, abbreviations). */
export interface JournalCandidate {
  name: string;
  issn?: string;
  description: string;
  matchType: 'exact' | 'alias' | 'abbreviation' | 'partial';
  confidence: number; // 0–100
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
const CSV_EXPORT_COLUMN_LIST = [
  'pmid',
  'pmcId',
  'title',
  'authors',
  'journal',
  'pubYear',
  'summary',
  'aiSummary',
  'relevanceScore',
  'relevanceExplanation',
  'keywords',
  'customTags',
  'sourceTitle',
  'isOpenAccess',
  'articleType',
  'URL',
  'PMCID_URL',
] as const;

export type CsvExportColumn = (typeof CSV_EXPORT_COLUMN_LIST)[number];

export const CSV_EXPORT_COLUMNS: readonly CsvExportColumn[] = CSV_EXPORT_COLUMN_LIST;

export interface Preset {
  id: string;
  name: string;
  settings: ResearchInput;
}

export type AppLanguage = 'en' | 'de';

export type CyberTheme = 'dark' | 'light' | 'matrix';

export interface Settings {
  theme: CyberTheme;
  appLanguage: AppLanguage;
  appearance: {
    density: 'comfortable' | 'compact';
    fontFamily: 'Figtree' | 'Sora' | 'IBM Plex Sans' | 'JetBrains Mono' | 'Inter';
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
    /** Active AI provider selection. Defaults to 'gemini' when absent (migration). */
    provider?: import('./services/providers/types').AIProviderSelection;
    /** Provider-specific model identifier. */
    model: string;
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
    /** Optional NCBI E-utilities API key for higher PubMed rate limits. */
    ncbiApiKey: string;
    /**
     * When true, always use the local heuristic inference layer
     * even if an API key and network are available.
     */
    forceHeuristicMode: boolean;
    /** Optional custom base URL for OpenAI-compatible or Ollama backends. */
    customBaseUrl?: string;
    /**
     * Origin explicitly approved by the user for custom endpoints (scheme + host + port).
     * Must match the parsed origin of customBaseUrl before requests are sent.
     */
    approvedEndpointOrigin?: string;
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
      columns: (typeof CSV_EXPORT_COLUMNS)[number][];
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

// ── arXiv Types ─────────────────────────────────────────────────────────────

export interface ArxivArticle {
  arxivId: string;
  title: string;
  authors: string;
  abstract: string;
  published: string; // ISO date string
  updated: string;
  categories: string[];
  pdfUrl: string;
  htmlUrl: string;
  journalRef?: string;
  doi?: string;
  source: 'arxiv';
}

export interface UnifiedArticle extends RankedArticle {
  source: 'pubmed' | 'arxiv';
  arxivId?: string;
  categories?: string[];
  pdfUrl?: string;
}

export interface MultiDbSearchResult {
  pubmedArticles: RankedArticle[];
  arxivArticles: ArxivArticle[];
  query: string;
  timestamp: number;
}

// ── Research Collections ──────────────────────────────────────────────────────

export interface ResearchCollection {
  id: string;
  name: string;
  description: string;
  color: string; // hex color for UI
  icon: string; // emoji or icon name
  entryIds: string[]; // KnowledgeBaseEntry ids
  articlePmids: string[]; // individual article pmids
  createdAt: number;
  updatedAt: number;
  shareToken?: string; // for shareable export links
  tags: string[];
}

// ── Agent Debugger Types ──────────────────────────────────────────────────────

export type AgentName =
  | 'QueryGenerator'
  | 'PubMedFetcher'
  | 'Ranker'
  | 'Synthesizer'
  | 'ArxivFetcher'
  | 'ResearchAnalyst';
export type AgentStatus = 'idle' | 'running' | 'done' | 'error' | 'skipped';

export interface AgentTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AgentTraceEvent {
  id: string;
  agentName: AgentName;
  status: AgentStatus;
  message: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  tokenUsage?: AgentTokenUsage;
  inputSummary?: string;
  outputSummary?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentPipelineTrace {
  sessionId: string;
  topic: string;
  startedAt: number;
  completedAt?: number;
  events: AgentTraceEvent[];
  totalTokens: number;
  totalCostUsd: number;
  status: 'running' | 'done' | 'error';
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
  /** Null without an external citation index — never model-estimated. */
  hIndex: number | null;
  /** Null without an external citation index — never model-estimated. */
  totalCitations: number | null;
  publicationCount: number;
  /** Publication counts per year in the retrieved PubMed corpus. */
  publicationsPerYear: Record<string, number>;
  /**
   * @deprecated Legacy fabricated citation timeline — ignored on display; stripped on save.
   */
  citationsPerYear?: Record<string, number>;
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
  authors: { name: string; description: string }[];
}

// --- Featured Journals ---
export interface FeaturedJournalCategory {
  category: string;
  journals: { name: string; description: string }[];
}
