import type { JournalCandidate, JournalProfile, RankedArticle } from '../../types';
import { extractKeywords } from './keywords';
import { classifyArticleType } from './ranking';
import { meaningfulTokens, throwIfAborted } from './utils';

interface JournalKbEntry {
  issn: string;
  description: string;
  oaPolicy: string;
  focusAreas: string[];
  publisher: string;
  /** Approximate Journal Impact Factor (curated, rounded; not a live lookup). */
  impactFactor: number | null;
}

/** Curated educational journal knowledge (ISSN, OA policy, publisher, approximate metrics). */
const JOURNAL_KB: Record<string, JournalKbEntry> = {
  nature: {
    issn: '0028-0836',
    description:
      'Flagship multidisciplinary journal publishing high-impact original research across the natural sciences.',
    oaPolicy: 'Hybrid',
    focusAreas: ['multidisciplinary science', 'biology', 'physics', 'chemistry'],
    publisher: 'Springer Nature',
    impactFactor: 50,
  },
  science: {
    issn: '0036-8075',
    description: 'AAAS journal covering cutting-edge research across scientific disciplines.',
    oaPolicy: 'Hybrid',
    focusAreas: ['multidisciplinary science', 'policy', 'research articles'],
    publisher: 'AAAS',
    impactFactor: 45,
  },
  'the lancet': {
    issn: '0140-6736',
    description:
      'Leading general medical weekly with clinical trials, reviews, and global health content.',
    oaPolicy: 'Hybrid',
    focusAreas: ['clinical medicine', 'global health', 'public health'],
    publisher: 'Elsevier',
    impactFactor: 88,
  },
  nejm: {
    issn: '0028-4793',
    description:
      'The New England Journal of Medicine — premier clinical research and practice updates.',
    oaPolicy: 'Hybrid',
    focusAreas: ['clinical medicine', 'therapeutics', 'epidemiology'],
    publisher: 'Massachusetts Medical Society',
    impactFactor: 75,
  },
  'new england journal of medicine': {
    issn: '0028-4793',
    description:
      'The New England Journal of Medicine — premier clinical research and practice updates.',
    oaPolicy: 'Hybrid',
    focusAreas: ['clinical medicine', 'therapeutics', 'epidemiology'],
    publisher: 'Massachusetts Medical Society',
    impactFactor: 75,
  },
  'plos one': {
    issn: '1932-6203',
    description:
      'Large multidisciplinary open-access journal emphasizing methodological soundness.',
    oaPolicy: 'Full Open Access',
    focusAreas: ['multidisciplinary', 'open science', 'methods'],
    publisher: 'Public Library of Science (PLOS)',
    impactFactor: 3,
  },
  bmj: {
    issn: '0959-8138',
    description:
      'British Medical Journal — clinical research, evidence synthesis, and health policy.',
    oaPolicy: 'Hybrid',
    focusAreas: ['clinical medicine', 'evidence-based medicine', 'health policy'],
    publisher: 'BMJ Publishing Group',
    impactFactor: 90,
  },
  cell: {
    issn: '0092-8674',
    description:
      'Flagship cell biology journal for mechanistic and molecular life-science research.',
    oaPolicy: 'Hybrid',
    focusAreas: ['cell biology', 'molecular biology', 'genetics'],
    publisher: 'Cell Press (Elsevier)',
    impactFactor: 45,
  },
  elife: {
    issn: '2050-084X',
    description:
      'Open-access journal for the biomedical and life sciences, backed by leading research institutions.',
    oaPolicy: 'Full Open Access',
    focusAreas: ['biomedical sciences', 'life sciences', 'open science'],
    publisher: 'eLife Sciences Publications',
    impactFactor: 7,
  },
  'nature communications': {
    issn: '2041-1723',
    description:
      'Open-access journal publishing high-quality research across biology, health, physics, chemistry, and Earth sciences.',
    oaPolicy: 'Full Open Access',
    focusAreas: ['multidisciplinary', 'biology', 'health sciences'],
    publisher: 'Springer Nature',
    impactFactor: 15,
  },
  'cell reports': {
    issn: '2211-1247',
    description:
      'Open-access journal from Cell Press covering the entire life-sciences spectrum.',
    oaPolicy: 'Full Open Access',
    focusAreas: ['life sciences', 'cell biology', 'molecular biology'],
    publisher: 'Cell Press (Elsevier)',
    impactFactor: 8,
  },
  'scientific reports': {
    issn: '2045-2322',
    description:
      'Online open-access mega journal covering all areas of the natural and clinical sciences.',
    oaPolicy: 'Full Open Access',
    focusAreas: ['multidisciplinary', 'natural sciences', 'clinical sciences'],
    publisher: 'Springer Nature',
    impactFactor: 4,
  },
  'bmj open': {
    issn: '2044-6055',
    description:
      'Open-access medical journal from the BMJ Group covering all disciplines and therapeutic areas.',
    oaPolicy: 'Full Open Access',
    focusAreas: ['clinical medicine', 'health services research', 'public health'],
    publisher: 'BMJ Publishing Group',
    impactFactor: 2.5,
  },
  pnas: {
    issn: '0027-8424',
    description:
      'Proceedings of the National Academy of Sciences — broad multidisciplinary coverage of biological, physical, and social sciences.',
    oaPolicy: 'Hybrid',
    focusAreas: ['multidisciplinary', 'biological sciences', 'physical sciences'],
    publisher: 'National Academy of Sciences',
    impactFactor: 10,
  },
  jama: {
    issn: '0098-7484',
    description:
      'Journal of the American Medical Association — broad clinical research and medical commentary.',
    oaPolicy: 'Hybrid',
    focusAreas: ['clinical medicine', 'health policy', 'medical education'],
    publisher: 'American Medical Association',
    impactFactor: 60,
  },
  peerj: {
    issn: '2167-8359',
    description:
      'Open-access mega journal covering biological, medical, and environmental sciences with an emphasis on sound methodology.',
    oaPolicy: 'Full Open Access',
    focusAreas: ['biology', 'medicine', 'environmental sciences'],
    publisher: 'PeerJ Inc.',
    impactFactor: 2.5,
  },
  'nature methods': {
    issn: '1548-7091',
    description: 'Leading journal for novel methods and techniques in the life sciences.',
    oaPolicy: 'Hybrid',
    focusAreas: ['methods', 'biotechnology', 'instrumentation'],
    publisher: 'Springer Nature',
    impactFactor: 30,
  },
  bioinformatics: {
    issn: '1367-4803',
    description: 'Core journal for computational biology, algorithms, and biological data analysis.',
    oaPolicy: 'Hybrid',
    focusAreas: ['computational biology', 'algorithms', 'data analysis'],
    publisher: 'Oxford University Press',
    impactFactor: 5,
  },
  'the embo journal': {
    issn: '0261-4189',
    description:
      'Leading journal for molecular and cellular biology published by the European Molecular Biology Organization.',
    oaPolicy: 'Hybrid',
    focusAreas: ['molecular biology', 'cell biology', 'biochemistry'],
    publisher: 'EMBO Press (Wiley)',
    impactFactor: 10,
  },
  'bmc bioinformatics': {
    issn: '1471-2105',
    description: 'Open-access journal covering computational methods for biological and biomedical data.',
    oaPolicy: 'Full Open Access',
    focusAreas: ['computational biology', 'bioinformatics', 'software'],
    publisher: 'BioMed Central (Springer Nature)',
    impactFactor: 3,
  },
  gigascience: {
    issn: '2047-217X',
    description: 'Open-access journal for large-scale biological and biomedical data science.',
    oaPolicy: 'Full Open Access',
    focusAreas: ['data science', 'genomics', 'reproducible research'],
    publisher: 'Oxford University Press',
    impactFactor: 4,
  },
};

function normalizeJournalKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Exact normalized names, common variants and abbreviations → curated KB key. */
const JOURNAL_ALIASES: Record<string, string> = {
  nature: 'nature',
  science: 'science',
  'the lancet': 'the lancet',
  lancet: 'the lancet',
  nejm: 'nejm',
  'n engl j med': 'nejm',
  'n. engl. j. med.': 'nejm',
  'new england journal of medicine': 'new england journal of medicine',
  'plos one': 'plos one',
  plosone: 'plos one',
  'plos 1': 'plos one',
  bmj: 'bmj',
  'british medical journal': 'bmj',
  cell: 'cell',
  elife: 'elife',
  'e life': 'elife',
  'nature communications': 'nature communications',
  'nat commun': 'nature communications',
  'nat. commun.': 'nature communications',
  'cell reports': 'cell reports',
  'cell rep': 'cell reports',
  'cell rep.': 'cell reports',
  'scientific reports': 'scientific reports',
  'sci rep': 'scientific reports',
  'sci. rep.': 'scientific reports',
  'bmj open': 'bmj open',
  pnas: 'pnas',
  'proc natl acad sci': 'pnas',
  'proc. natl. acad. sci.': 'pnas',
  'proceedings of the national academy of sciences': 'pnas',
  jama: 'jama',
  'j am med assoc': 'jama',
  'journal of the american medical association': 'jama',
  peerj: 'peerj',
  'nature methods': 'nature methods',
  'nat methods': 'nature methods',
  'nat. methods': 'nature methods',
  bioinformatics: 'bioinformatics',
  'the embo journal': 'the embo journal',
  'embo journal': 'the embo journal',
  'embo j': 'the embo journal',
  'embo j.': 'the embo journal',
  'bmc bioinformatics': 'bmc bioinformatics',
  gigascience: 'gigascience',
};

/** Well-known journal abbreviations → full names (for disambiguation candidates). */
const JOURNAL_ABBREVIATIONS: Record<string, string> = {
  nejm: 'New England Journal of Medicine',
  jama: 'JAMA',
  bmj: 'BMJ',
  pnas: 'PNAS',
  'nat commun': 'Nature Communications',
  'sci rep': 'Scientific Reports',
  'cell rep': 'Cell Reports',
  'nat methods': 'Nature Methods',
  'embo j': 'The EMBO Journal',
};

/** Curated field → journals map for heuristic suggestions. */
const FIELD_JOURNALS: Record<string, { name: string; description: string }[]> = {
  cancer: [
    {
      name: 'CA: A Cancer Journal for Clinicians',
      description: 'Highest-impact clinical oncology journal with flagship cancer statistics reports.',
    },
    {
      name: 'The Lancet Oncology',
      description: 'Leading clinical oncology journal for trials and translational cancer research.',
    },
    {
      name: 'Journal of Clinical Oncology',
      description: 'ASCO flagship journal for clinical cancer research and treatment guidelines.',
    },
    {
      name: 'Cancer Cell',
      description: 'High-impact journal for molecular and translational cancer biology.',
    },
  ],
  oncology: [
    {
      name: 'The Lancet Oncology',
      description: 'Leading clinical oncology journal for trials and translational cancer research.',
    },
    {
      name: 'Journal of Clinical Oncology',
      description: 'ASCO flagship journal for clinical cancer research and treatment guidelines.',
    },
  ],
  neuroscience: [
    {
      name: 'Neuron',
      description: 'Flagship Cell Press journal for cellular and systems neuroscience.',
    },
    {
      name: 'Nature Neuroscience',
      description: 'High-impact journal spanning molecular to cognitive neuroscience.',
    },
    {
      name: 'Brain',
      description: 'Long-standing journal of clinical neurology and translational neuroscience.',
    },
  ],
  neurology: [
    {
      name: 'Brain',
      description: 'Long-standing journal of clinical neurology and translational neuroscience.',
    },
    {
      name: 'Annals of Neurology',
      description: 'Leading clinical neurology journal for disease mechanisms and trials.',
    },
  ],
  immunology: [
    {
      name: 'Immunity',
      description: 'Flagship Cell Press journal for molecular and cellular immunology.',
    },
    {
      name: 'Nature Immunology',
      description: 'High-impact journal covering all areas of immune-system research.',
    },
    {
      name: 'Science Immunology',
      description: 'AAAS journal for translational and basic immunology advances.',
    },
  ],
  genetics: [
    {
      name: 'Nature Genetics',
      description: 'Leading journal for genome-wide association studies and genetic mechanisms.',
    },
    {
      name: 'Genome Research',
      description: 'Journal for genome biology, sequencing methods, and comparative genomics.',
    },
    {
      name: 'The American Journal of Human Genetics',
      description: 'ASHG flagship journal for human heredity and disease genetics.',
    },
  ],
  genomics: [
    {
      name: 'Genome Research',
      description: 'Journal for genome biology, sequencing methods, and comparative genomics.',
    },
    {
      name: 'Genome Biology',
      description: 'Open-access journal for genomics, post-genomic science, and bioinformatics.',
    },
  ],
  infectious: [
    {
      name: 'The Lancet Infectious Diseases',
      description: 'Leading journal for infectious-disease epidemiology, trials, and policy.',
    },
    {
      name: 'Clinical Infectious Diseases',
      description: 'IDSA journal for clinical management of bacterial, viral, and fungal infections.',
    },
    {
      name: 'Emerging Infectious Diseases',
      description: 'CDC open-access journal tracking emerging pathogens and outbreaks.',
    },
  ],
  covid: [
    {
      name: 'The Lancet Infectious Diseases',
      description: 'Leading journal for infectious-disease epidemiology, trials, and policy.',
    },
    {
      name: 'Emerging Infectious Diseases',
      description: 'CDC open-access journal tracking emerging pathogens and outbreaks.',
    },
  ],
  cardiology: [
    {
      name: 'Circulation',
      description: 'AHA flagship journal for cardiovascular clinical and basic research.',
    },
    {
      name: 'European Heart Journal',
      description: 'ESC flagship journal for cardiology and cardiovascular medicine.',
    },
    {
      name: 'Journal of the American College of Cardiology',
      description: 'JACC — leading journal for cardiovascular clinical practice and trials.',
    },
  ],
  cardiovascular: [
    {
      name: 'Circulation',
      description: 'AHA flagship journal for cardiovascular clinical and basic research.',
    },
    {
      name: 'European Heart Journal',
      description: 'ESC flagship journal for cardiology and cardiovascular medicine.',
    },
  ],
  bioinformatics: [
    {
      name: 'Bioinformatics',
      description: 'Core journal for computational biology, algorithms, and biological data analysis.',
    },
    {
      name: 'Nature Methods',
      description: 'Leading journal for novel methods and techniques in the life sciences.',
    },
    {
      name: 'PLOS Computational Biology',
      description: 'Open-access journal for computational approaches across biology.',
    },
  ],
  computational: [
    {
      name: 'Bioinformatics',
      description: 'Core journal for computational biology, algorithms, and biological data analysis.',
    },
    {
      name: 'PLOS Computational Biology',
      description: 'Open-access journal for computational approaches across biology.',
    },
  ],
  'public health': [
    {
      name: 'The Lancet Public Health',
      description: 'Journal for population health, health policy, and prevention science.',
    },
    {
      name: 'American Journal of Public Health',
      description: 'APHA flagship journal for public-health research and practice.',
    },
    {
      name: 'BMJ Global Health',
      description: 'Open-access journal for global-health research and policy.',
    },
  ],
  epidemiology: [
    {
      name: 'American Journal of Epidemiology',
      description: 'Leading journal for epidemiologic methods and population studies.',
    },
    {
      name: 'The Lancet Public Health',
      description: 'Journal for population health, health policy, and prevention science.',
    },
  ],
  psychiatry: [
    {
      name: 'JAMA Psychiatry',
      description: 'Leading journal for clinical psychiatry, neuroscience, and mental health.',
    },
    {
      name: 'The Lancet Psychiatry',
      description: 'High-impact journal for psychiatric research and mental-health policy.',
    },
    {
      name: 'Molecular Psychiatry',
      description: 'Journal for biological mechanisms underlying psychiatric disorders.',
    },
  ],
  diabetes: [
    {
      name: 'The Lancet Diabetes & Endocrinology',
      description: 'Leading journal for diabetes, endocrinology, and metabolism research.',
    },
    {
      name: 'Diabetes Care',
      description: 'ADA flagship journal for clinical diabetes research and care.',
    },
    {
      name: 'Diabetologia',
      description: 'EASD journal for experimental and clinical diabetology.',
    },
  ],
  respiratory: [
    {
      name: 'The Lancet Respiratory Medicine',
      description: 'Leading journal for respiratory medicine and critical care.',
    },
    {
      name: 'Thorax',
      description: 'BMJ journal for respiratory medicine, from bench to bedside.',
    },
  ],
  default: [
    {
      name: 'PLOS ONE',
      description: 'Broad open-access journal emphasizing methodological soundness (demo suggestion).',
    },
    {
      name: 'eLife',
      description: 'Open-access journal for biomedical and life-science research.',
    },
    {
      name: 'Nature Communications',
      description: 'Broad-scope open-access journal for high-quality research.',
    },
    {
      name: 'Scientific Reports',
      description: 'Open-access mega journal across natural and clinical sciences.',
    },
  ],
};

/**
 * Suggest relevant journals for a field of study using a curated field map.
 */
export function suggestJournalsHeuristic(
  fieldOfStudy: string,
  signal?: AbortSignal,
): { name: string; description: string }[] {
  throwIfAborted(signal);
  const tokens = meaningfulTokens(fieldOfStudy);
  const phrase = fieldOfStudy.trim().toLowerCase();
  const hits: { name: string; description: string }[] = [];
  for (const [key, journals] of Object.entries(FIELD_JOURNALS)) {
    if (key === 'default') continue;
    const keyTokens = key.split(' ');
    const matched =
      phrase.includes(key) ||
      keyTokens.some((kt) => tokens.some((t) => t.includes(kt) || kt.includes(t)));
    if (matched) hits.push(...journals);
  }
  const unique = [...new Map(hits.map((h) => [h.name, h])).values()];
  if (unique.length >= 3) return unique.slice(0, 10);
  return [...unique, ...FIELD_JOURNALS.default].slice(0, 8);
}

/**
 * Disambiguate a journal name into candidate journals using the curated KB,
 * alias table, abbreviations, and partial (substring/token) matching.
 */
export function disambiguateJournalHeuristic(
  journalName: string,
  signal?: AbortSignal,
): JournalCandidate[] {
  throwIfAborted(signal);
  const key = normalizeJournalKey(journalName);
  if (!key) return [];

  const candidates = new Map<string, JournalCandidate>();
  const addCandidate = (kbKey: string, matchType: JournalCandidate['matchType'], confidence: number) => {
    const entry = JOURNAL_KB[kbKey];
    if (!entry) return;
    const displayName = toDisplayName(kbKey);
    const existing = candidates.get(displayName);
    if (!existing || existing.confidence < confidence) {
      candidates.set(displayName, {
        name: displayName,
        issn: entry.issn,
        description: `${entry.description} (${matchType} match, heuristic.)`,
        matchType,
        confidence,
      });
    }
  };

  // 1. Exact KB key match (abbreviations like "NEJM" are tagged honestly).
  if (JOURNAL_KB[key]) {
    addCandidate(key, JOURNAL_ABBREVIATIONS[key] ? 'abbreviation' : 'exact', 95);
  }

  // 2. Alias resolution (also covers common abbreviations).
  const aliasTarget = JOURNAL_ALIASES[key];
  if (aliasTarget) {
    addCandidate(aliasTarget, JOURNAL_ABBREVIATIONS[key] ? 'abbreviation' : 'alias', 90);
  }

  // 3. Partial matching: KB key contains query or vice versa (e.g. "bmj" → bmj + bmj open).
  const queryTokens = new Set(key.split(' '));
  for (const kbKey of Object.keys(JOURNAL_KB)) {
    if (kbKey === key || kbKey === aliasTarget) continue;
    const kbTokens = new Set(kbKey.split(' '));
    const shared = [...queryTokens].filter((t) => kbTokens.has(t));
    const subset = [...queryTokens].every((t) => kbTokens.has(t));
    if (subset && queryTokens.size > 0) {
      addCandidate(kbKey, 'partial', 75);
    } else if (shared.length > 0 && (kbKey.includes(key) || key.includes(kbKey))) {
      addCandidate(kbKey, 'partial', 60);
    }
  }

  return [...candidates.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}

/** Convert a KB key to a display name (canonical casing for known journals). */
function toDisplayName(kbKey: string): string {
  const canonical: Record<string, string> = {
    nature: 'Nature',
    science: 'Science',
    'the lancet': 'The Lancet',
    nejm: 'New England Journal of Medicine',
    'new england journal of medicine': 'New England Journal of Medicine',
    'plos one': 'PLOS ONE',
    bmj: 'BMJ',
    cell: 'Cell',
    elife: 'eLife',
    'nature communications': 'Nature Communications',
    'cell reports': 'Cell Reports',
    'scientific reports': 'Scientific Reports',
    'bmj open': 'BMJ Open',
    pnas: 'PNAS',
    jama: 'JAMA',
    peerj: 'PeerJ',
    'nature methods': 'Nature Methods',
    bioinformatics: 'Bioinformatics',
    'the embo journal': 'The EMBO Journal',
    'bmc bioinformatics': 'BMC Bioinformatics',
    gigascience: 'GigaScience',
  };
  return canonical[kbKey] ?? kbKey.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Compute open-access share (0–100) among analyzed articles, or null if unknown. */
function computeOaRate(articles: Partial<RankedArticle>[]): number | null {
  if (articles.length === 0) return null;
  const oa = articles.filter((a) => a.isOpenAccess).length;
  return Math.round((oa / articles.length) * 100);
}

/**
 * Rule-based journal profile using static KB + optional local article titles.
 */
export function generateJournalProfileHeuristic(
  journalName: string,
  articles: Partial<RankedArticle>[] = [],
  signal?: AbortSignal,
): JournalProfile {
  throwIfAborted(signal);
  const key = normalizeJournalKey(journalName);
  const aliasKey = JOURNAL_ALIASES[key];
  const known = aliasKey ? (JOURNAL_KB[aliasKey] ?? JOURNAL_KB[key]) : JOURNAL_KB[key];

  const fromArticles = extractKeywords(articles.map((a) => a.title ?? '').join(' '), 6);
  const analyzedCount = articles.length > 0 ? articles.length : null;
  const oaRate = computeOaRate(articles);

  if (known) {
    return {
      name: journalName,
      issn: known.issn,
      description: `${known.description} (Heuristic mode profile.)`,
      oaPolicy: known.oaPolicy,
      focusAreas: [...new Set([...known.focusAreas, ...fromArticles])].slice(0, 8),
      publisher: known.publisher,
      metrics: {
        impactFactor: known.impactFactor,
        analyzedArticleCount: analyzedCount,
        openAccessRate: oaRate,
        source: 'curated',
      },
    };
  }

  const oaGuess = /plos|bmc|frontiers|elife|open/i.test(journalName)
    ? 'Full Open Access'
    : /nature|science|cell|lancet|nejm|jama/i.test(journalName)
      ? 'Hybrid'
      : 'Subscription';

  return {
    name: journalName,
    issn: 'Unknown',
    description: `Heuristic profile for “${journalName}”. No curated entry found; focus areas inferred from ${
      articles.length
    } local article title(s). Re-run with live Gemini for ISSN verification when online with an API key.`,
    oaPolicy: oaGuess,
    focusAreas: fromArticles.length ? fromArticles : meaningfulFallback(journalName),
    metrics:
      analyzedCount !== null
        ? {
            impactFactor: null,
            analyzedArticleCount: analyzedCount,
            openAccessRate: oaRate,
            source: 'computed',
          }
        : null,
  };
}

function meaningfulFallback(name: string): string[] {
  return name
    .split(/[\s:&/-]+/)
    .map((p) => p.toLowerCase())
    .filter((p) => p.length > 3 && !['journal', 'international', 'society', 'research'].includes(p))
    .slice(0, 5);
}

/**
 * Analyze a single article locally (score title↔abstract coherence).
 */
export function analyzeArticleHeuristic(
  article: Pick<RankedArticle, 'pmid' | 'title' | 'summary' | 'authors' | 'journal' | 'pubYear'> &
    Partial<RankedArticle>,
  signal?: AbortSignal,
): RankedArticle {
  throwIfAborted(signal);
  const normalized = {
    ...article,
    isOpenAccess: article.isOpenAccess ?? false,
  };
  const titleSet = new Set(
    article.title
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((t) => t.length > 2),
  );
  const abstractSet = new Set(
    (article.summary || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((t) => t.length > 2),
  );
  let inter = 0;
  for (const t of titleSet) if (abstractSet.has(t)) inter += 1;
  const coherence =
    titleSet.size === 0
      ? 50
      : Math.max(1, Math.min(100, Math.round((inter / titleSet.size) * 100)));
  const keywords = extractKeywords(`${article.title}. ${article.summary}`, 5);
  return {
    ...normalized,
    relevanceScore: coherence,
    relevanceExplanation: `Heuristic title–abstract coherence ${coherence}/100 (${inter}/${titleSet.size} title tokens appear in the abstract).`,
    keywords,
    articleType: article.articleType ?? classifyArticleType(article.title, article.summary),
    aiSummary: (article.summary || '').slice(0, 400),
    isOpenAccess: normalized.isOpenAccess,
  };
}
