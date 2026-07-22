/**
 * Author clustering, profiling, and field-suggestion for the Non-AI
 * Programmatic Research Engine. Groups publications by co-author overlap and
 * title-bigram similarity (more precise than a plain unigram fingerprint -
 * ported from `services/heuristics/authorDisambiguation.ts` during the
 * nonAi/heuristics consolidation, ADR 0009).
 */

import type { AuthorCluster, RankedArticle } from '../../types';
import { tokenize, ngrams, jaccardSets, throwIfAborted } from './utils';
import { extractKeywordsFromText } from './keywordExtractor';

function parseAuthorList(authors: string | undefined): string[] {
  if (!authors) return [];
  return authors
    .split(/,|;|\sand\s/i)
    .map((a) => a.trim())
    .filter((a) => a.length > 1 && !/^et\s+al/i.test(a));
}

function normalizeAuthorKey(name: string): string {
  return name.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
}

/**
 * Exact identity check for excluding the searched author from co-author lists.
 * Avoids substring `includes` false positives (e.g. initial "L" matching "Alvarez").
 */
function isSameAuthorIdentity(candidate: string, targetName: string): boolean {
  const c = normalizeAuthorKey(candidate);
  const t = normalizeAuthorKey(targetName);
  if (!c || !t) return false;
  if (c === t) return true;

  const cParts = c.split(' ');
  const tParts = t.split(' ');
  // PubMed-style "Last I" / "Last First": compare surname (first token) + optional initial
  const cSurname = cParts[0];
  const tSurname = tParts[0];
  if (cSurname !== tSurname) return false;
  if (tParts.length === 1 || cParts.length === 1) return true;
  return cParts[1][0] === tParts[1][0];
}

function affiliationTokens(article: Partial<RankedArticle>): Set<string> {
  // Affiliations are not always present; approximate via journal + title domain words
  return new Set(tokenize(`${article.journal ?? ''} ${article.title ?? ''}`, 'en'));
}

/**
 * Cluster publications by co-author overlap + title-bigram overlap (deterministic).
 */
export function disambiguateAuthorHeuristic(
  authorName: string,
  articles: Partial<RankedArticle>[],
  signal?: AbortSignal,
): AuthorCluster[] {
  throwIfAborted(signal);
  if (articles.length === 0) {
    return [
      {
        nameVariant: authorName,
        primaryAffiliation: 'Unknown (insufficient data)',
        topCoAuthors: [],
        coreTopics: [],
        publicationCount: 0,
        pmids: [],
      },
    ];
  }

  const clusters: { articles: Partial<RankedArticle>[]; seeds: Set<string> }[] = [];

  for (const article of articles) {
    const coAuthors = parseAuthorList(article.authors).filter(
      (a) => !isSameAuthorIdentity(a, authorName),
    );
    const titleGrams = new Set(ngrams(article.title ?? '', 2));
    const aff = affiliationTokens(article);
    const fingerprint = new Set([...coAuthors.map((c) => c.toLowerCase()), ...titleGrams, ...aff]);

    let bestIdx = -1;
    let bestSim = 0;
    for (let i = 0; i < clusters.length; i++) {
      const sim = jaccardSets(fingerprint, clusters[i].seeds);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestSim >= 0.12) {
      clusters[bestIdx].articles.push(article);
      for (const t of fingerprint) clusters[bestIdx].seeds.add(t);
    } else {
      clusters.push({ articles: [article], seeds: fingerprint });
    }
  }

  return clusters.map((c, idx) => {
    const coFreq = new Map<string, number>();
    const topicBag = new Map<string, number>();
    for (const a of c.articles) {
      for (const co of parseAuthorList(a.authors)) {
        if (isSameAuthorIdentity(co, authorName)) continue;
        coFreq.set(co, (coFreq.get(co) ?? 0) + 1);
      }
      for (const kw of extractKeywordsFromText(`${a.title ?? ''} ${a.summary ?? ''}`, 4)) {
        topicBag.set(kw, (topicBag.get(kw) ?? 0) + 1);
      }
    }

    const topCoAuthors = [...coFreq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([n]) => n);

    const coreTopics = [...topicBag.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([t]) => t);

    return {
      nameVariant: clusters.length > 1 ? `${authorName} (cluster ${idx + 1})` : authorName,
      primaryAffiliation: 'Affiliation not available in local records',
      topCoAuthors,
      coreTopics,
      publicationCount: c.articles.length,
      pmids: c.articles.map((a) => a.pmid).filter((pmid): pmid is string => Boolean(pmid)),
    };
  });
}

/**
 * Career summary + concept frequencies + honest null metrics when data is thin.
 */
export function generateAuthorProfileHeuristic(
  authorName: string,
  articles: Partial<RankedArticle>[],
  signal?: AbortSignal,
): {
  careerSummary: string;
  coreConcepts: { concept: string; frequency: number }[];
  estimatedMetrics: { hIndex: number | null; totalCitations: number | null };
} {
  throwIfAborted(signal);
  const years = articles
    .map((a) => parseInt(a.pubYear ?? '', 10))
    .filter((y) => Number.isFinite(y) && y >= 1000 && y <= 2100)
    .sort((a, b) => a - b);

  const conceptFreq = new Map<string, number>();
  for (const a of articles) {
    for (const kw of extractKeywordsFromText(`${a.title ?? ''} ${a.summary ?? ''}`, 5)) {
      conceptFreq.set(kw, (conceptFreq.get(kw) ?? 0) + 1);
    }
  }
  const coreConcepts = [...conceptFreq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([concept, frequency]) => ({ concept, frequency }));

  const yearSpan =
    years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : 'an unspecified period';
  const journals = [...new Set(articles.map((a) => a.journal).filter(Boolean))].slice(0, 5);

  const careerSummary = [
    `## Career overview (Heuristic mode)`,
    ``,
    `Local analysis of **${articles.length}** publication record(s) attributed to **${authorName}** spanning ${yearSpan}.`,
    journals.length ? `Frequent venues: ${journals.join('; ')}.` : '',
    coreConcepts.length
      ? `Recurring concepts: ${coreConcepts
          .slice(0, 5)
          .map((c) => c.concept)
          .join(', ')}.`
      : 'Insufficient title/abstract text to extract core concepts.',
    ``,
    `*Citation-based metrics (h-index, total citations) require external citation graphs and are returned as null in heuristic mode.*`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    careerSummary,
    coreConcepts,
    estimatedMetrics: { hIndex: null, totalCitations: null },
  };
}

/**
 * Suggest notable researchers from a static educational map + topic tokens.
 */
const FIELD_AUTHORS: Record<string, { name: string; description: string }[]> = {
  diabetes: [
    {
      name: 'John E. Gerich',
      description:
        'Foundational work on glucose counterregulation and type 2 diabetes pathophysiology.',
    },
    {
      name: 'Ralph A. DeFronzo',
      description: 'Pioneered the concept of the ominous octet in type 2 diabetes.',
    },
  ],
  cancer: [
    {
      name: 'Bert Vogelstein',
      description:
        'Landmark contributions to colorectal cancer genetics and multi-step tumorigenesis.',
    },
    {
      name: 'Mary-Claire King',
      description:
        'Discovered BRCA1 linkage, transforming hereditary breast cancer risk assessment.',
    },
  ],
  covid: [
    {
      name: 'Anthony S. Fauci',
      description: 'Infectious disease leadership spanning HIV and emerging respiratory pathogens.',
    },
  ],
  neuroscience: [
    {
      name: 'Eric R. Kandel',
      description: 'Nobel-recognized work on the cellular basis of learning and memory.',
    },
  ],
  default: [
    {
      name: 'Ada Lovelace',
      description:
        'Historical exemplar often cited in computational science education (demo suggestion).',
    },
    {
      name: 'Rosalind Franklin',
      description:
        'Structural biology pioneer; educational placeholder for STEM literature exploration.',
    },
  ],
};

export function suggestAuthorsHeuristic(
  fieldOfStudy: string,
  signal?: AbortSignal,
): { name: string; description: string }[] {
  throwIfAborted(signal);
  const tokens = tokenize(fieldOfStudy, 'en');
  const hits: { name: string; description: string }[] = [];
  for (const t of tokens) {
    for (const [key, authors] of Object.entries(FIELD_AUTHORS)) {
      if (key !== 'default' && (t.includes(key) || key.includes(t))) {
        hits.push(...authors);
      }
    }
  }
  const unique = [...new Map(hits.map((h) => [h.name, h])).values()];
  if (unique.length >= 3) return unique.slice(0, 10);
  return [...unique, ...FIELD_AUTHORS.default].slice(0, 8);
}

/**
 * Basic publication-count/relevance/venue stats for an author (no external citation data).
 */
export function getAuthorProfileSummary(
  _authorName: string,
  articles: RankedArticle[],
): {
  totalPapers: number;
  avgRelevance: number;
  topVenue: string;
  recentActivity: number;
} {
  const totalPapers = articles.length;
  const avgRelevance =
    articles.reduce((sum, a) => sum + (a.relevanceScore ?? 0), 0) / totalPapers || 0;
  const venueCounts = new Map<string, number>();
  for (const a of articles) {
    if (a.journal) {
      venueCounts.set(a.journal, (venueCounts.get(a.journal) ?? 0) + 1);
    }
  }
  const topVenue = [...venueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';
  const currentYear = new Date().getFullYear();
  const recentActivity = articles.filter((a) => {
    const year = parseInt(a.pubYear, 10);
    return year >= currentYear - 2;
  }).length;

  return {
    totalPapers,
    avgRelevance,
    topVenue,
    recentActivity,
  };
}
