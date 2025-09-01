# Application Source Code

This document contains the complete directory structure and source code for the "AI Research Orchestration Author" application.

## Directory Structure

*   `index.html` - The main HTML entry point for the application.
*   `metadata.json` - Application metadata.
*   `README.md` - The main documentation file.
*   `source.md` - This file.
*   `src/`
    *   `App.tsx` - The root React component that manages views and global state.
    *   `index.tsx` - The React application entry point.
    *   `types.ts` - Contains all TypeScript type definitions for the application.
    *   `components/` - Contains all React components.
        *   `AcademicCapIcon.tsx`
        *   `ArticleDetailPanel.tsx`
        *   `AtomIcon.tsx`
        *   `AuthorIcon.tsx`
        *   `AuthorsView.tsx`
        *   `BeakerIcon.tsx`
        *   `BellIcon.tsx`
        *   `BookmarkIcon.tsx`
        *   `BookmarkSquareIcon.tsx`
        *   `BookOpenIcon.tsx`
        *   `BottomNavBar.tsx`
        *   `BrainIcon.tsx`
        *   `BugAntIcon.tsx`
        *   `ChartBarIcon.tsx`
        *   `ChatBubbleLeftRightIcon.tsx`
        *   `ChatInterface.tsx`
        *   `CheckCircleIcon.tsx`
        *   `CheckIcon.tsx`
        *   `ChevronDownIcon.tsx`
        *   `ChevronLeftIcon.tsx`
        *   `ChevronRightIcon.tsx`
        *   `ChevronUpIcon.tsx`
        *   `CitationIcon.tsx`
        *   `ClipboardDocumentListIcon.tsx`
        *   `ClipboardIcon.tsx`
        *   `CodeBracketIcon.tsx`
        *   `CogIcon.tsx`
        *   `CommandPalette.tsx`
        *   `ConfirmationModal.tsx`
        *   `CpuChipIcon.tsx`
        *   `CsvIcon.tsx`
        *   `DashboardView.tsx`
        *   `DatabaseIcon.tsx`
        *   `DnaIcon.tsx`
        *   `DocumentIcon.tsx`
        *   `DocumentPlusIcon.tsx`
        *   `DownloadIcon.tsx`
        *   `EllipsisHorizontalIcon.tsx`
        *   `EmptyState.tsx`
        *   `ErrorBoundary.tsx`
        *   `ExportIcon.tsx`
        *   `EyeIcon.tsx`
        *   `GearIcon.tsx`
        *   `GlobeAltIcon.tsx`
        *   `GlobeEuropeAfricaIcon.tsx`
        *   `GridViewIcon.tsx`
        *   `Header.tsx`
        *   `HeartIcon.tsx`
        *   `HelpView.tsx`
        *   `HistoryIcon.tsx`
        *   `HistoryView.tsx`
        *   `HomeIcon.tsx`
        *   `HomeView.tsx`
        *   `InfoIcon.tsx`
        *   `InputForm.tsx`
        *   `JournalsView.tsx`
        *   `Kbd.tsx`
        *   `KnowledgeBaseView.tsx`
        *   `ListViewIcon.tsx`
        *   `LoadingIndicator.tsx`
        *   `LockClosedIcon.tsx`
        *   `MicroscopeIcon.tsx`
        *   `MoonIcon.tsx`
        *   `Notification.tsx`
        *   `OnboardingView.tsx`
        *   `OrchestratorDashboard.tsx`
        *   `OrchestratorView.tsx`
        *   `PaperAirplaneIcon.tsx`
        *   `PdfIcon.tsx`
        *   `PencilIcon.tsx`
        *   `QuestionMarkCircleIcon.tsx`
        *   `QuickAddModal.tsx`
        *   `RelevanceScoreDisplay.tsx`
        *   `ReportDisplay.tsx`
        *   `ResearchView.tsx`
        *   `ScissorsIcon.tsx`
        *   `SearchIcon.tsx`
        *   `SettingCard.tsx`
        *   `SettingsView.tsx`
        *   `ShieldCheckIcon.tsx`
        *   `SparklesIcon.tsx`
        *   `SunIcon.tsx`
        *   `TagIcon.tsx`
        *   `TelescopeIcon.tsx`
        *   `Toggle.tsx`
        *   `Tooltip.tsx`
        *   `TrashIcon.tsx`
        *   `UnlockIcon.tsx`
        *   `UploadIcon.tsx`
        *   `UserIcon.tsx`
        *   `WebIcon.tsx`
        *   `Welcome.tsx`
        *   `XCircleIcon.tsx`
        *   `XIcon.tsx`
    *   `contexts/` - Contains all React Context providers.
        *   `KnowledgeBaseContext.tsx`
        *   `PresetContext.tsx`
        *   `SettingsContext.tsx`
        *   `UIContext.tsx`
    *   `data/` - Contains static JSON data.
        *   `featuredAuthors.json`
        *   `featuredJournals.json`
    *   `hooks/` - Contains custom React hooks.
        *   `useChat.ts`
        *   `useFocusTrap.ts`
        *   `useResearchAssistant.ts`
    *   `services/` - Contains logic for external services (API calls, database).
        *   `databaseService.ts`
        *   `exportService.ts`
        *   `geminiService.ts`
        *   `journalService.ts`

---

## File Contents

### `index.html`

```html
<script type="importmap">
{
  "imports": {
    "dompurify": "https://aistudiocdn.com/dompurify@^3.2.6",
    "react-chartjs-2": "https://aistudiocdn.com/react-chartjs-2@^5.3.0",
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.1.1/",
    "@google/genai": "https://aistudiocdn.com/@google/genai@^1.16.0",
    "react/": "https://aistudiocdn.com/react@^19.1.1/",
    "react": "https://aistudiocdn.com/react@^19.1.1",
    "jspdf": "https://aistudiocdn.com/jspdf@^3.0.2",
    "chart.js": "https://aistudiocdn.com/chart.js@^4.5.0",
    "marked": "https://aistudiocdn.com/marked@^16.2.1",
    "vitest": "https://aistudiocdn.com/vitest@^3.2.4",
    "vitest/": "https://aistudiocdn.com/vitest@^3.2.4/",
    "@tanstack/react-virtual": "https://aistudiocdn.com/@tanstack/react-virtual@^3.10.0",
    "dexie": "https://aistudiocdn.com/dexie@^4.0.7"
  }
}
</script>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#F6F8FA" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#0D1117" media="(prefers-color-scheme: dark)">
    <title>AI Research Orchestration Author</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://aistudiocdn.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      :root.dark {
        --font-family-sans: 'Inter', sans-serif;
        --font-family-display: 'Space Grotesk', sans-serif;
        --color-background: #010409;
        --color-surface: #0d1117;
        --color-surface-hover: #161b22;
        --color-border: #21262d;
        --color-text-primary: #e6edf3;
        --color-text-secondary: #7d8590;
        --color-brand-accent: #1f6feb;
        --color-brand-primary: #2f81f7;
        --color-brand-secondary: #388bfd;
        --color-brand-text-on-accent: #ffffff;
        --color-glow: rgba(31, 111, 235, 0.3);
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.15);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.12);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15);
        --transition-speed: 200ms;
        --color-accent-cyan: #39c5f7;
        --color-accent-magenta: #e853a5;
        --color-accent-amber: #f7b739;
        --aurora-1: rgba(31, 111, 235, 0.1);
        --aurora-2: rgba(57, 197, 247, 0.1);
        --aurora-3: rgba(232, 83, 165, 0.1);
        --color-input-bg: #161b22;
      }
      :root.light {
        --font-family-sans: 'Inter', sans-serif;
        --font-family-display: 'Space Grotesk', sans-serif;
        --color-background: #f7faff;
        --color-surface: rgba(255, 255, 255, 0.9);
        --color-surface-hover: rgba(250, 252, 255, 0.95);
        --color-input-bg: #f8faff;
        --color-border: rgba(200, 210, 230, 0.8);
        --color-text-primary: #111827;
        --color-text-secondary: #374151;
        --color-brand-accent: #1d4ed8;
        --color-brand-primary: #1e40af;
        --color-brand-secondary: #1c3d99;
        --color-brand-text-on-accent: #ffffff;
        --color-glow: rgba(29, 78, 216, 0.25);
        --shadow-sm: 0 1px 3px 0 rgba(60, 100, 170, 0.08), 0 1px 2px -1px rgba(60, 100, 170, 0.05);
        --shadow-md: 0 4px 6px -1px rgba(60, 100, 170, 0.1), 0 2px 4px -2px rgba(60, 100, 170, 0.06);
        --shadow-lg: 0 10px 15px -3px rgba(60, 100, 170, 0.1), 0 4px 6px -4px rgba(60, 100, 170, 0.1);
        --transition-speed: 200ms;
        --color-accent-cyan: #06b6d4;
        --color-accent-magenta: #ec4899;
        --color-accent-amber: #f59e0b;
        --aurora-1: rgba(59, 130, 246, 0.12);
        --aurora-2: rgba(6, 182, 212, 0.12);
        --aurora-3: rgba(236, 72, 153, 0.08);
      }
       body {
         font-family: var(--font-family-sans);
         background-color: var(--color-background);
         color: var(--color-text-primary);
       }
       h1, h2, h3, h4, h5, h6, .font-display {
         font-family: var(--font-family-display);
         letter-spacing: -0.02em;
       }
       body::after {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: 
            radial-gradient(ellipse 80% 80% at 10% -20%, var(--aurora-1), transparent),
            radial-gradient(ellipse 80% 80% at 90% -20%, var(--aurora-2), transparent),
            radial-gradient(ellipse 60% 60% at 50% 110%, var(--aurora-3), transparent);
         opacity: 1;
         z-index: -1;
       }
       ::selection {
         background-color: var(--color-brand-accent);
         color: var(--color-brand-text-on-accent);
       }
       .prose-sm h1, .prose-sm h2, .prose-sm h3, .prose-sm h4, .prose-sm h5, .prose-sm h6 { 
        font-family: var(--font-family-display);
        color: var(--color-text-primary); 
       }
       .prose-sm strong { color: var(--color-text-primary); }
       .prose-sm a { color: var(--color-brand-accent); }
       .prose-sm blockquote { border-left-color: var(--color-border); }
       .prose-sm code { color: var(--color-text-primary); background-color: var(--color-surface-hover); padding: 0.2em 0.4em; margin: 0; font-size: 85%; border-radius: 6px; }
      
      .light .bg-surface, .light .bg-surface-hover, .light [class*="bg-surface/"] {
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
      }

       /* Accessibility: Add a clear focus indicator for keyboard users */
      :focus-visible {
        outline: 2px solid var(--color-brand-accent);
        outline-offset: 2px;
        border-radius: 4px;
      }
      
       .no-animations * {
        animation: none !important;
        transition: none !important;
      }

      .animate-pulseGlow {
        animation: pulseGlow 2s infinite;
      }
      
      .brand-gradient-text {
        font-family: var(--font-family-display);
        background: linear-gradient(45deg, var(--color-brand-accent), var(--color-accent-cyan));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-fill-color: transparent;
      }
       
      /* Accessibility: Utility class to hide elements visually but keep them available for screen readers */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
      
      @keyframes pan-background {
        0% { background-position: 0% 0%; }
        100% { background-position: 2rem 2rem; }
      }

      @keyframes pulseGlow {
        0%, 100% {
          box-shadow: 0 0 0 0 var(--color-glow);
        }
        50% {
          box-shadow: 0 0 12px 4px var(--color-glow);
        }
      }
    </style>
    <script>
      tailwind.config = {
        darkMode: 'class', 
        theme: {
          extend: {
            fontFamily: {
              sans: ['Inter', 'sans-serif'],
              display: ['Space Grotesk', 'sans-serif'],
            },
            colors: {
              background: 'var(--color-background)',
              surface: 'var(--color-surface)',
              'surface-hover': 'var(--color-surface-hover)',
              'input-bg': 'var(--color-input-bg)',
              border: 'var(--color-border)',
              'text-primary': 'var(--color-text-primary)',
              'text-secondary': 'var(--color-text-secondary)',
              'brand-accent': 'var(--color-brand-accent)',
              'brand-primary': 'var(--color-brand-primary)',
              'brand-secondary': 'var(--color-brand-secondary)',
              'brand-text-on-accent': 'var(--color-brand-text-on-accent)',
              'accent-cyan': 'var(--color-accent-cyan)',
              'accent-magenta': 'var(--color-accent-magenta)',
              'accent-amber': 'var(--color-accent-amber)',
            },
            animation: {
              fadeIn: 'fadeIn 0.3s ease-in-out',
              slideInUp: 'slideInUp 0.5s ease-out',
            },
            keyframes: {
              fadeIn: {
                '0%': { opacity: 0 },
                '100%': { opacity: 1 },
              },
              slideInUp: {
                '0%': { opacity: 0, transform: 'translateY(20px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' },
              }
            }
          }
        }
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

### `metadata.json`

```json
{
  "name": "AI Research Orchestration Author",
  "description": "An expert system for authoring comprehensive literature reviews by managing a swarm of specialized AI agents. It uses the PubMed database to collect, curate, and synthesize scientific research based on user-defined criteria.",
  "requestFramePermissions": []
}
```

### `src/index.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root caelement to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### `src/types.ts`

```typescript
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
    oaPolicy: string; // e.g. "Full Open Access", "Hybrid", "Subscription"
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

export interface AppSettings {
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

export type Settings = AppSettings; // For compatibility with older files if they use Settings

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
```

### `src/data/featuredAuthors.json`

```json
[
    {
        "category": "Genetics & Genomics",
        "authors": [
            { "name": "Frederick Sanger", "description": "Two-time Nobel laureate who developed the first methods for DNA sequencing, foundational to genomics." },
            { "name": "Alec Jeffreys", "description": "Inventor of DNA fingerprinting and DNA profiling techniques." },
            { "name": "Svante Pääbo", "description": "Nobel laureate who pioneered the field of paleogenomics, sequencing the Neanderthal genome." },
            { "name": "Eric Lander", "description": "A principal leader of the Human Genome Project and a key figure in genomics." },
            { "name": "Francis Collins", "description": "Led the Human Genome Project and served as the Director of the NIH." },
            { "name": "J. Craig Venter", "description": "Pioneered shotgun sequencing, which accelerated the Human Genome Project." },
            { "name": "Mary-Claire King", "description": "Discovered the BRCA1 gene, linking genetics to hereditary breast cancer." },
            { "name": "George Church", "description": "A pioneer in personal genomics, genome engineering, and synthetic biology." },
            { "name": "Kary Mullis", "description": "Nobel laureate for inventing the polymerase chain reaction (PCR), a cornerstone of molecular biology." },
            { "name": "Andrew Z. Fire", "description": "Nobel laureate for the co-discovery of RNA interference (RNAi)." },
            { "name": "Craig C. Mello", "description": "Shared the Nobel Prize for the co-discovery of RNA interference (RNAi)." },
            { "name": "David Botstein", "description": "Helped develop methods for human genetic mapping using RFLPs, a precursor to modern genomics." }
        ]
    },
    {
        "category": "CRISPR & Gene Editing",
        "authors": [
            { "name": "Jennifer Doudna", "description": "Nobel laureate and co-inventor of CRISPR-Cas9 gene editing technology." },
            { "name": "Emmanuelle Charpentier", "description": "Nobel laureate who co-developed the CRISPR-Cas9 gene editing tool." },
            { "name": "Feng Zhang", "description": "Pioneered the use of CRISPR-Cas9 for genome editing in eukaryotic cells." },
            { "name": "David Liu", "description": "Inventor of base editing and prime editing, high-precision next-generation gene editing technologies." }
        ]
    },
    {
        "category": "Cancer Research",
        "authors": [
            { "name": "Bert Vogelstein", "description": "Pioneered the genetic model of colorectal cancer, outlining sequential mutations." },
            { "name": "Robert Weinberg", "description": "Discovered the first human oncogene (Ras) and co-authored the seminal paper \"The Hallmarks of Cancer\"." },
            { "name": "Judah Folkman", "description": "Father of angiogenesis research, proposing that tumors require a blood supply to grow." },
            { "name": "Tony Hunter", "description": "Discovered tyrosine phosphorylation, a key mechanism in cell growth and cancer." },
            { "name": "Dennis Slamon", "description": "His research led to the development of Herceptin, a targeted therapy for breast cancer." },
            { "name": "Charles L. Sawyers", "description": "Instrumental in developing targeted cancer drugs like Gleevec for CML." },
            { "name": "Napoleone Ferrara", "description": "His work on VEGF led to the development of anti-angiogenic therapies for cancer and eye disease." }
        ]
    },
    {
        "category": "Immunology & Infectious Disease",
        "authors": [
            { "name": "James P. Allison", "description": "Nobel laureate for discovering immune checkpoint therapy, a revolutionary cancer treatment." },
            { "name": "Tasuku Honjo", "description": "Nobel laureate for identifying the PD-1 protein, leading to new cancer immunotherapies." },
            { "name": "Anthony Fauci", "description": "A leading figure in infectious disease research, particularly HIV/AIDS and COVID-19." },
            { "name": "Katalin Karikó", "description": "Nobel laureate whose research on mRNA modifications was foundational for COVID-19 vaccines." },
            { "name": "Drew Weissman", "description": "Nobel laureate who, with Katalin Karikó, developed modified mRNA technology for vaccines." },
            { "name": "Carl June", "description": "A pioneer of CAR-T cell therapy, a revolutionary form of cancer immunotherapy." },
            { "name": "Shizuo Akira", "description": "Made seminal discoveries in innate immunity, particularly regarding Toll-like receptors (TLRs)." },
            { "name": "Yasmine Belkaid", "description": "Known for her research on the complex interaction between the microbiome and the immune system." }
        ]
    },
    {
        "category": "Neuroscience",
        "authors": [
            { "name": "Eric Kandel", "description": "Nobel laureate for his research on the physiological basis of memory storage in neurons." },
            { "name": "Karl Deisseroth", "description": "A key developer of optogenetics, a technique to control neurons with light." },
            { "name": "Edvard Moser", "description": "Nobel laureate for the co-discovery of grid cells, which form the brain's internal positioning system." },
            { "name": "May-Britt Moser", "description": "Shared the Nobel Prize for the discovery of grid cells in the brain, crucial for spatial navigation." },
            { "name": "Huda Zoghbi", "description": "Known for her work on the genetic basis of neurological disorders, including Rett syndrome." },
            { "name": "Thomas Südhof", "description": "Nobel laureate for his work on the machinery regulating vesicle traffic in our cells, crucial for neurotransmission." },
            { "name": "Stanley Prusiner", "description": "Nobel laureate for his discovery of prions, a new biological principle of infection." },
            { "name": "Karl Friston", "description": "Developed Statistical Parametric Mapping (SPM) for fMRI analysis and the Free Energy Principle." }
        ]
    },
    {
        "category": "Biochemistry & Pharmacology",
        "authors": [
            { "name": "Yoshinori Ohsumi", "description": "Nobel laureate for his discoveries of mechanisms for autophagy, the cell's recycling process." },
            { "name": "James W. Black", "description": "Nobel laureate who invented beta-blockers and H2 receptor antagonists using rational drug design." },
            { "name": "Tu Youyou", "description": "Nobel laureate for discovering Artemisinin, a key drug for treating malaria." },
            { "name": "Frances Arnold", "description": "Nobel laureate for pioneering the use of directed evolution to engineer enzymes." },
            { "name": "Raphael Mechoulam", "description": "Often called the 'father of cannabis research' for isolating THC and elucidating the endocannabinoid system." },
            { "name": "Paul Berg", "description": "Nobel laureate for his fundamental studies of the biochemistry of nucleic acids, particularly recombinant DNA." },
            { "name": "Gertrude B. Elion", "description": "Nobel laureate who developed numerous new drugs, using innovative methods of rational drug design." }
        ]
    },
    {
        "category": "Cardiology & Public Health",
        "authors": [
            { "name": "Salim Yusuf", "description": "Cardiologist who has led some of the largest and most influential global clinical trials." },
            { "name": "Eugene Braunwald", "description": "A towering figure in cardiology, often called the \"father of modern cardiology\" for his extensive contributions." },
            { "name": "Sir Richard Peto", "description": "An epidemiologist whose large-scale studies established the risks of tobacco and benefits of statins." },
            { "name": "Walter Willett", "description": "A leading researcher in nutrition and epidemiology, known for his work on the Nurses' Health Study." },
            { "name": "Sir Michael Marmot", "description": "Pioneered research on health inequalities and the social determinants of health." },
            { "name": "Paul Farmer", "description": "A physician and anthropologist who co-founded Partners In Health to provide healthcare in resource-poor settings." }
        ]
    },
    {
        "category": "Bioengineering & Regenerative Medicine",
        "authors": [
            { "name": "Robert Langer", "description": "An extremely prolific bioengineer, a pioneer of drug delivery systems and tissue engineering." },
            { "name": "Shinya Yamanaka", "description": "Nobel laureate for discovering how to reprogram adult cells into induced pluripotent stem cells (iPS cells)." },
            { "name": "James A. Thomson", "description": "Derived the first human embryonic stem cell line in 1998." },
            { "name": "César Milstein", "description": "Nobel laureate who, with Georges Köhler, developed the hybridoma technique for monoclonal antibodies." },
            { "name": "Ian Wilmut", "description": "Led the team that performed the first cloning of a mammal from an adult cell, Dolly the sheep." },
            { "name": "Robert Edwards", "description": "Nobel laureate for the development of in vitro fertilization (IVF)." }
        ]
    },
    {
        "category": "AI & Computational Biology",
        "authors": [
            { "name": "David Haussler", "description": "Led the team that assembled the first public draft of the human genome sequence and pioneered computational genomics." },
            { "name": "Michael S. Waterman", "description": "Co-developer of the Smith-Waterman algorithm, a cornerstone of biological sequence alignment." },
            { "name": "Janet Thornton", "description": "A leader in structural bioinformatics, focusing on protein structure, function, and evolution." },
            { "name": "Peer Bork", "description": "A pioneer in the analysis of metagenomes, particularly the human microbiome, and computational systems biology." },
            { "name": "Aviv Regev", "description": "A key figure in the development of single-cell genomics and its application to understand cellular circuits." },
            { "name": "Demis Hassabis", "description": "Co-founder of DeepMind and a leader behind AlphaFold, which revolutionized protein structure prediction." },
            { "name": "John Jumper", "description": "Led the development of the AlphaFold algorithm at DeepMind." },
            { "name": "Ewan Birney", "description": "Co-director of EMBL-EBI and a key figure in major bioinformatics projects like ENCODE and the Human Genome Project." }
        ]
    }
]
```

### `src/data/featuredJournals.json`

```json
[
    {
        "name": "PLOS ONE",
        "description": "A peer-reviewed open access scientific journal published by the Public Library of Science. It covers primary research from any discipline within science and medicine."
    },
    {
        "name": "eLife",
        "description": "A peer-reviewed open access scientific journal for the biomedical and life sciences, backed by leading research institutions."
    },
    {
        "name": "Nature Communications",
        "description": "An open access journal that publishes high-quality research in biology, health, physics, chemistry, and Earth sciences."
    },
    {
        "name": "Cell Reports",
        "description": "An open access journal from Cell Press, publishing high-quality research across the entire life sciences spectrum."
    },
    {
        "name": "Scientific Reports",
        "description": "An online open access scientific mega journal published by Nature Research, covering all areas of natural and clinical sciences."
    },
    {
        "name": "BMJ Open",
        "description": "An open access medical journal from the BMJ Group, publishing medical research from all disciplines and therapeutic areas."
    }
]
```