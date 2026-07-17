import type { AuthorCluster, RankedArticle } from '../../types';
import { meaningfulTokens, ngrams, tokenSet, jaccard, throwIfAborted } from './utils';
import { extractKeywords } from './keywords';

function parseAuthorList(authors: string | undefined): string[] {
  if (!authors) return [];
  return authors
    .split(/,|;|\sand\s/i)
    .map((a) => a.trim())
    .filter((a) => a.length > 1 && !/^et\s+al/i.test(a));
}

function affiliationTokens(article: Partial<RankedArticle>): Set<string> {
  // Affiliations are not always present; approximate via journal + title domain words
  return tokenSet(`${article.journal ?? ''} ${article.title ?? ''}`);
}

/**
 * Cluster publications by co-author overlap + title n-grams (deterministic).
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
      (a) => !a.toLowerCase().includes(authorName.split(/\s+/).pop()?.toLowerCase() ?? '___'),
    );
    const titleGrams = new Set(ngrams(article.title ?? '', 2));
    const aff = affiliationTokens(article);
    const fingerprint = new Set([...coAuthors.map((c) => c.toLowerCase()), ...titleGrams, ...aff]);

    let bestIdx = -1;
    let bestSim = 0;
    for (let i = 0; i < clusters.length; i++) {
      const sim = jaccard(fingerprint, clusters[i].seeds);
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
    const journals = new Map<string, number>();

    for (const a of c.articles) {
      for (const co of parseAuthorList(a.authors)) {
        if (co.toLowerCase().includes(authorName.split(/\s+/).slice(-1)[0]?.toLowerCase() ?? '')) {
          continue;
        }
        coFreq.set(co, (coFreq.get(co) ?? 0) + 1);
      }
      for (const kw of extractKeywords(`${a.title ?? ''} ${a.summary ?? ''}`, 4)) {
        topicBag.set(kw, (topicBag.get(kw) ?? 0) + 1);
      }
      if (a.journal) journals.set(a.journal, (journals.get(a.journal) ?? 0) + 1);
    }

    const topCoAuthors = [...coFreq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([n]) => n);

    const coreTopics = [...topicBag.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([t]) => t);

    const primaryAffiliation =
      [...journals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      'Affiliation not available in local records';

    return {
      nameVariant: clusters.length > 1 ? `${authorName} (cluster ${idx + 1})` : authorName,
      primaryAffiliation,
      topCoAuthors,
      coreTopics,
      publicationCount: c.articles.length,
      pmids: c.articles.map((a) => a.pmid!).filter(Boolean),
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
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);

  const conceptFreq = new Map<string, number>();
  for (const a of articles) {
    for (const kw of extractKeywords(`${a.title ?? ''} ${a.summary ?? ''}`, 5)) {
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
  const tokens = meaningfulTokens(fieldOfStudy);
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
