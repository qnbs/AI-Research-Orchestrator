/**
 * Curated demo corpus and offline/empty-result fallback data for the
 * Non-AI Programmatic Research Engine. Relocated from `services/heuristics/`
 * during the nonAi/heuristics consolidation (ADR 0009) - real consumers:
 * `useDemoKnowledgeBaseSeed.ts`, `KnowledgeBaseContext.tsx` (storage-key
 * constants), and `geminiService.ts`'s `analyzeSingleArticle` heuristic
 * branch (`resolveHeuristicArticleByPmid`).
 */
import type {
  KnowledgeBaseEntry,
  RankedArticle,
  ResearchEntry,
  ResearchInput,
  ResearchReport,
  JournalEntry,
  AuthorProfileEntry,
} from '../../types';
import { rankArticles, getTopArticles } from './ranker';
import { generateResearchReport } from './synthesizer';

/** Prefix for seeded demo entry ids (clearable as a batch). */
export const DEMO_ENTRY_PREFIX = 'demo-';

/** IndexedDB flag set when the user clears demo Knowledge Base data. */
export const DEMO_DISMISS_STORAGE_KEY = 'aro.demoDataDismissed';

/** Persisted once demo content has been seeded (prevents reseed after intentional clear). */
export const DEMO_SEEDED_STORAGE_KEY = 'aro.demoDataSeeded';

/**
 * Curated educational article corpus used offline / when PubMed returns empty.
 */
export const DEMO_CORPUS: RankedArticle[] = [
  {
    pmid: 'demo:aspirin-cv-sr-2023',
    title: 'Aspirin for primary prevention of cardiovascular disease: an updated systematic review',
    authors: 'Chen L, Patel R, Nguyen T, Alvarez M',
    journal: 'The Lancet',
    pubYear: '2023',
    summary:
      'Background: The role of low-dose aspirin in primary prevention remains contested. Methods: Systematic review and meta-analysis of randomized trials comparing aspirin versus control in adults without established cardiovascular disease. Results: Aspirin reduced major adverse cardiovascular events but increased major bleeding. Absolute benefits were smaller in low-risk populations. Conclusion: Shared decision-making should weigh ischemic versus bleeding risk.',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: ['aspirin', 'primary prevention', 'cardiovascular', 'bleeding'],
    isOpenAccess: true,
    articleType: 'Systematic Review',
  },
  {
    pmid: 'demo:sglt2-hf-t2d-2024',
    title:
      'SGLT2 inhibitors and heart failure outcomes in type 2 diabetes: multicenter cohort study',
    authors: 'Okoye A, Bergman S, Li W, Torres E',
    journal: 'BMJ',
    pubYear: '2024',
    summary:
      'Objective: Evaluate heart failure hospitalization among adults with type 2 diabetes initiating SGLT2 inhibitors versus DPP-4 inhibitors. Design: Observational cohort with propensity matching. Results: SGLT2 initiation was associated with lower HF hospitalization rates over 24 months. Limitations: Residual confounding possible despite matching.',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: ['diabetes', 'SGLT2', 'heart failure', 'cohort'],
    isOpenAccess: true,
    articleType: 'Observational Study',
  },
  {
    pmid: 'demo:microbiome-metsynd-2022',
    title: 'Gut microbiome diversity and inflammatory markers in metabolic syndrome',
    authors: 'Hassan F, Kim J, Rossi P',
    journal: 'PLOS ONE',
    pubYear: '2022',
    summary:
      'We profiled fecal microbiota and serum cytokines in adults with metabolic syndrome versus matched controls. Lower alpha diversity correlated with elevated CRP and IL-6. Dietary fiber intake moderated associations. Findings support microbiome–inflammation links but do not establish causality.',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: ['microbiome', 'inflammation', 'metabolic syndrome'],
    isOpenAccess: true,
    articleType: 'Observational Study',
  },
  {
    pmid: 'demo:crispr-pcsk9-2021',
    title: 'CRISPR-Cas9 base editing for familial hypercholesterolemia: preclinical models',
    authors: 'Nakamura Y, Brooks D, Silva C',
    journal: 'Nature',
    pubYear: '2021',
    summary:
      'We applied adenine base editors targeting PCSK9 in murine and hepatocyte models. Editing efficiency exceeded 60% with durable LDL reductions. Off-target analysis identified rare sites requiring further mitigation before clinical translation.',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: ['CRISPR', 'gene editing', 'PCSK9', 'cholesterol'],
    isOpenAccess: false,
    articleType: 'Other',
  },
  {
    pmid: 'demo:cbt-adol-dep-2020',
    title: 'Cognitive behavioral therapy for adolescent depression: randomized controlled trial',
    authors: 'Müller K, Singh A, Ortega L, Brown H',
    journal: 'JAMA Psychiatry',
    pubYear: '2020',
    summary:
      'Adolescents with major depressive disorder were randomized to CBT versus usual care. CBT produced larger reductions in CDRS-R scores at 12 weeks. Remission rates favored CBT; adverse events were comparable. Results support CBT as first-line psychotherapy in this age group.',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: ['depression', 'CBT', 'adolescents', 'RCT'],
    isOpenAccess: false,
    articleType: 'Randomized Controlled Trial',
  },
  {
    pmid: 'demo:mrna-variants-2022',
    title: 'mRNA vaccine immunogenicity against SARS-CoV-2 variants: meta-analysis',
    authors: 'Garcia M, Zhao Q, Ibrahim N',
    journal: 'Science',
    pubYear: '2022',
    summary:
      'Meta-analysis of immunogenicity studies after primary mRNA vaccination. Neutralizing titers were lower against Omicron sublineages than ancestral strains; booster doses restored responses. Heterogeneity across assays limits pooled effect precision.',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: ['COVID-19', 'vaccine', 'mRNA', 'variants'],
    isOpenAccess: true,
    articleType: 'Meta-Analysis',
  },
  {
    pmid: 'demo:airpoll-asthma-2019',
    title: 'Air pollution exposure and incident asthma in children: systematic review',
    authors: 'Andersen B, Costa R, Yamamoto S',
    journal: 'Environmental Health Perspectives',
    pubYear: '2019',
    summary:
      'Traffic-related air pollution was associated with higher odds of incident childhood asthma across included cohorts. PM2.5 and NO2 showed consistent directions of effect. Policy implications favor cleaner transport near schools.',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: ['asthma', 'air pollution', 'children', 'PM2.5'],
    isOpenAccess: true,
    articleType: 'Systematic Review',
  },
  {
    pmid: 'demo:parkinson-prodromal-2018',
    title: 'Parkinson disease prodromal markers and conversion risk: longitudinal study',
    authors: 'Petrovic D, Walsh E, Cho H',
    journal: 'Neurology',
    pubYear: '2018',
    summary:
      'Longitudinal assessment of REM sleep behavior disorder, hyposmia, and dopamine imaging. Combined markers improved conversion prediction to clinically diagnosed Parkinson disease. Sample size limited subgroup analyses.',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: ['Parkinson', 'prodromal', 'neurodegeneration'],
    isOpenAccess: false,
    articleType: 'Observational Study',
  },
];

/**
 * Select demo corpus articles most relevant to a topic (for offline research runs).
 * Optionally applies dateRange / articleTypes filters from the research input.
 */
export function selectDemoArticlesForTopic(
  topic: string,
  max = 12,
  filters?: Pick<ResearchInput, 'dateRange' | 'articleTypes'>,
): RankedArticle[] {
  let corpus = DEMO_CORPUS;
  if (filters?.articleTypes?.length) {
    const allowed = new Set(filters.articleTypes.map((t) => t.toLowerCase()));
    const filtered = corpus.filter((a) => allowed.has((a.articleType ?? '').toLowerCase()));
    if (filtered.length > 0) corpus = filtered;
  }
  if (filters?.dateRange && filters.dateRange !== 'any') {
    const years = parseInt(filters.dateRange, 10);
    if (Number.isFinite(years) && years > 0) {
      const minYear = new Date().getFullYear() - years;
      const filtered = corpus.filter((a) => {
        const y = parseInt(a.pubYear, 10);
        return Number.isFinite(y) ? y >= minYear : true;
      });
      if (filtered.length > 0) corpus = filtered;
    }
  }
  return getTopArticles(rankArticles(corpus, topic), max);
}

/** True if a PMID/id uses the educational demo namespace (not a real PubMed ID). */
export function isDemoPmid(pmid: string): boolean {
  return pmid.startsWith('demo:');
}

/**
 * Build a complete Non-AI research report from a topic using the demo corpus.
 */
export function buildDemoResearchReport(topic: string): ResearchReport {
  const topArticles = getTopArticles(rankArticles(DEMO_CORPUS, topic), 5);
  return generateResearchReport(topArticles, topic);
}

/**
 * First-run Knowledge Base seed entries (research + journal + author).
 */
export function createDemoKnowledgeBaseEntries(): KnowledgeBaseEntry[] {
  const topic = 'aspirin cardiovascular primary prevention';
  const report = buildDemoResearchReport(topic);
  const input: ResearchInput = {
    researchTopic: topic,
    dateRange: '5',
    articleTypes: ['Systematic Review', 'Randomized Controlled Trial'],
    synthesisFocus: 'clinical implications',
    maxArticlesToScan: 50,
    topNToSynthesize: 5,
  };

  const researchEntry: ResearchEntry = {
    id: `${DEMO_ENTRY_PREFIX}research-aspirin`,
    title: `[Demo] ${topic}`,
    timestamp: Date.now() - 86_400_000,
    articles: report.rankedArticles,
    sourceType: 'research',
    input,
    report,
  };

  const diabetesTopic = 'SGLT2 inhibitors heart failure type 2 diabetes';
  const diabetesReport = buildDemoResearchReport(diabetesTopic);
  const researchEntry2: ResearchEntry = {
    id: `${DEMO_ENTRY_PREFIX}research-sglt2`,
    title: '[Demo] SGLT2 inhibitors and heart failure in type 2 diabetes',
    timestamp: Date.now() - 172_800_000,
    articles: diabetesReport.rankedArticles,
    sourceType: 'research',
    input: {
      ...input,
      researchTopic: diabetesTopic,
      synthesisFocus: 'outcomes',
    },
    report: diabetesReport,
  };

  const journalEntry: JournalEntry = {
    id: `${DEMO_ENTRY_PREFIX}journal-lancet`,
    title: '[Demo] The Lancet',
    timestamp: Date.now() - 259_200_000,
    articles: DEMO_CORPUS.filter((a) => a.journal === 'The Lancet'),
    sourceType: 'journal',
    journalProfile: {
      name: 'The Lancet',
      issn: '0140-6736',
      description:
        'Demo journal profile — leading general medical weekly (Non-AI mode educational fixture).',
      oaPolicy: 'Hybrid',
      focusAreas: ['clinical medicine', 'global health', 'public health'],
    },
  };

  const authorArticles = DEMO_CORPUS.filter((article) =>
    article.authors.split(/,|;/).some((author) => author.trim() === 'Chen L'),
  );
  const authorEntry: AuthorProfileEntry = {
    id: `${DEMO_ENTRY_PREFIX}author-chen`,
    title: '[Demo] Author profile: Chen L',
    timestamp: Date.now() - 345_600_000,
    articles: authorArticles,
    sourceType: 'author',
    input: { authorName: 'Chen L' },
    profile: {
      name: 'Chen L',
      affiliations: ['Demo University Medical Center'],
      metrics: {
        hIndex: null,
        totalCitations: null,
        publicationCount: authorArticles.length,
        citationsPerYear: {},
        publicationsAsFirstAuthor: 1,
        publicationsAsLastAuthor: 0,
      },
      careerSummary:
        '## Demo author profile (Non-AI mode)\n\nEducational fixture illustrating local author analytics without a Gemini API key.',
      coreConcepts: [
        { concept: 'aspirin', frequency: 2 },
        { concept: 'prevention', frequency: 2 },
      ],
      publications: authorArticles,
    },
  };

  return [researchEntry, researchEntry2, journalEntry, authorEntry];
}

/** True if an entry id belongs to seeded demo data. */
export function isDemoEntryId(id: string): boolean {
  return id.startsWith(DEMO_ENTRY_PREFIX);
}

/**
 * Resolve a Non-AI-mode article for Quick Add / single-article analysis.
 * Never substitutes an unrelated demo paper for an unknown PMID — preserves the
 * requested identifier with an explicit offline placeholder instead.
 */
export function resolveHeuristicArticleByPmid(pmid: string): RankedArticle {
  const hit = DEMO_CORPUS.find((a) => a.pmid === pmid);
  if (hit) return { ...hit };
  return {
    pmid,
    title: `Unavailable offline (identifier: ${pmid})`,
    authors: 'Unknown',
    journal: 'Local Non-AI placeholder',
    pubYear: '',
    summary:
      'Non-AI mode could not load this article from PubMed or the local demo corpus. ' +
      'Connect online, or use a curated demo:* identifier for educational offline analysis.',
    isOpenAccess: false,
    relevanceScore: 0,
    relevanceExplanation: 'Placeholder — identifier not present in the local demo corpus.',
    keywords: ['heuristic', 'offline', 'placeholder'],
    articleType: 'Other',
  };
}
