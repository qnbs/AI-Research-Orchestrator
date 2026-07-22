/**
 * Journal profiling for the Non-AI Programmatic Research Engine: curated
 * knowledge-base lookups (ISSN, OA policy, impact factor, publisher),
 * disambiguation, field suggestions, and single-article analysis. Ported
 * from `services/heuristics/journalProfiling.ts` during the nonAi/heuristics
 * consolidation (ADR 0009) - `nonAi/journalProfiler.ts` previously had no
 * curated data and returned "Unknown"/computed guesses for everything.
 */

import type { JournalCandidate, JournalProfile, RankedArticle } from '../../types';
import { extractKeywordsFromText } from './keywordExtractor';
import { classifyArticleType } from './curator';
import { tokenize, throwIfAborted } from './utils';
import { JOURNAL_KB, JOURNAL_ALIASES, JOURNAL_ABBREVIATIONS, FIELD_JOURNALS } from './journalData';

function normalizeJournalKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Suggest relevant journals for a field of study using a curated field map.
 */
export function suggestJournalsHeuristic(
  fieldOfStudy: string,
  signal?: AbortSignal,
): { name: string; description: string }[] {
  throwIfAborted(signal);
  const tokens = tokenize(fieldOfStudy, 'en');
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
  const addCandidate = (
    kbKey: string,
    matchType: JournalCandidate['matchType'],
    confidence: number,
  ) => {
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

/** Compute open-access share (0-100) among analyzed articles, or null if unknown. */
function computeOaRate(articles: Partial<RankedArticle>[]): number | null {
  if (articles.length === 0) return null;
  const oa = articles.filter((a) => a.isOpenAccess).length;
  return Math.round((oa / articles.length) * 100);
}

/**
 * Rule-based journal profile using the static KB + optional local article titles.
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

  const fromArticles = extractKeywordsFromText(articles.map((a) => a.title ?? '').join(' '), 6);
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
    description: `Heuristic profile for "${journalName}". No curated entry found; focus areas inferred from ${
      articles.length
    } local article title(s). Re-run with a live provider for ISSN verification when online with an API key.`,
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
 * Analyze a single article locally (score title-abstract coherence).
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
  const keywords = extractKeywordsFromText(`${article.title}. ${article.summary}`, 5);
  return {
    ...normalized,
    relevanceScore: coherence,
    relevanceExplanation: `Heuristic title-abstract coherence ${coherence}/100 (${inter}/${titleSet.size} title tokens appear in the abstract).`,
    keywords,
    articleType: article.articleType ?? classifyArticleType(article.title, article.summary),
    aiSummary: (article.summary || '').slice(0, 400),
    isOpenAccess: normalized.isOpenAccess,
  };
}

/**
 * Analyze journal metrics across a set of already-fetched articles (no curated KB needed).
 */
export function analyzeJournalMetrics(articles: RankedArticle[]): {
  journal: string;
  articleCount: number;
  openAccessCount: number;
  avgRelevance: number;
}[] {
  const journalStats = new Map<
    string,
    {
      count: number;
      openAccess: number;
      totalRelevance: number;
    }
  >();

  for (const article of articles) {
    const journal = article.journal ?? 'Unknown';
    const stats = journalStats.get(journal) ?? { count: 0, openAccess: 0, totalRelevance: 0 };
    stats.count++;
    stats.totalRelevance += article.relevanceScore ?? 0;
    if (article.isOpenAccess) stats.openAccess++;
    journalStats.set(journal, stats);
  }

  return [...journalStats.entries()]
    .map(([journal, stats]) => ({
      journal,
      articleCount: stats.count,
      openAccessCount: stats.openAccess,
      avgRelevance: stats.totalRelevance / stats.count,
    }))
    .sort((a, b) => b.articleCount - a.articleCount || b.avgRelevance - a.avgRelevance);
}
