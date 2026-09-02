/**
 * Author and journal AI tools extracted from the geminiService façade (ADR 0008).
 * Callers keep importing from `geminiService.ts`; this module is the implementation.
 */
import type {
  Settings,
  RankedArticle,
  AuthorCluster,
  JournalProfile,
  JournalCandidate,
} from '../types';
import { getProviderForSettings } from './providers/factory';
import type { AIJsonSchema } from './providers/types';
import { sanitizePromptFragment } from '../lib/promptSanitize';
import { intersectClustersWithCorpus } from '../lib/authorIdentity';
import { wrapUntrustedJsonBlock, wrapUntrustedTextBlock } from '../lib/untrustedDataFraming';
import { throwIfAborted } from '../lib/errors';
import { PromptId } from '../lib/promptRegistry';
import {
  disambiguateAuthorHeuristic,
  generateAuthorProfileHeuristic,
  suggestAuthorsHeuristic,
  generateJournalProfileHeuristic,
  disambiguateJournalHeuristic,
  suggestJournalsHeuristic,
} from './nonAi';
import { shouldUseHeuristic } from './researchOrchestratorAdapter';
import { safeLogError } from '../lib/safeLog';
import { generateJson, getPreamble } from './aiJson';

export const generateAuthorQuery = (fullName: string): string => {
  if (fullName.includes(',')) {
    const parts = fullName.split(',');
    const lastName = parts[0].trim();
    const firstAndMiddle = parts.slice(1).join(' ').trim();
    fullName = `${firstAndMiddle} ${lastName}`;
  }

  const cleanedName = fullName.replace(/\./g, '');
  const parts = cleanedName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return `""[Author]`;
  if (parts.length === 1) return `"${parts[0]}"[Author]`;

  const lastName = parts[parts.length - 1];
  const firstParts = parts.slice(0, -1);
  const firstName = firstParts[0];
  const initials = firstParts.map((p) => p.charAt(0)).join('');

  const queryVariations = new Set<string>();
  queryVariations.add(`"${firstParts.join(' ')} ${lastName}"[Author]`);
  queryVariations.add(`"${lastName} ${initials}"[Author]`);
  queryVariations.add(`"${lastName} ${firstName}"[Author]`);

  return `(${Array.from(queryVariations).join(' OR ')})`;
};
export async function disambiguateAuthor(
  authorName: string,
  articles: Partial<RankedArticle>[],
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<AuthorCluster[]> {
  if (await shouldUseHeuristic(aiSettings)) {
    return disambiguateAuthorHeuristic(authorName, articles, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const nameSafe = sanitizePromptFragment(authorName, 500);
  try {
    const authorSchema: AIJsonSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nameVariant: { type: 'string' },
          primaryAffiliation: { type: 'string' },
          topCoAuthors: { type: 'array', items: { type: 'string' } },
          coreTopics: { type: 'array', items: { type: 'string' } },
          publicationCount: { type: 'integer' },
          pmids: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'nameVariant',
          'primaryAffiliation',
          'topCoAuthors',
          'coreTopics',
          'publicationCount',
          'pmids',
        ],
      },
    };
    const clusters = await generateJson<AuthorCluster[]>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.AUTHOR_DISAMBIGUATE),
        temperature: 0.1,
        jsonSchema: authorSchema,
        prompt: `Given the author name ${wrapUntrustedTextBlock('author_name', nameSafe)} and this list of their potential publications, disambiguate them into distinct author profiles. For each profile, provide a likely name variant, their most common primary affiliation, top 3 co-authors, core research topics, total publication count, and a list of their PMIDs.
            ${wrapUntrustedJsonBlock(
              'articles',
              articles.map((a) => ({
                pmid: a.pmid,
                title: a.title,
                authors: a.authors,
                journal: a.journal,
              })),
            )}`,
      },
      signal,
    );
    return intersectClustersWithCorpus(clusters, articles);
  } catch (error) {
    safeLogError('Error disambiguating author:', error);
    throw provider.mapError(error);
  }
}

export async function generateAuthorProfileAnalysis(
  authorName: string,
  articles: Partial<RankedArticle>[],
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<{
  careerSummary: string;
  coreConcepts: { concept: string; frequency: number }[];
}> {
  if (await shouldUseHeuristic(aiSettings)) {
    return generateAuthorProfileHeuristic(authorName, articles, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const nameSafe = sanitizePromptFragment(authorName, 500);
  try {
    const profileSchema: AIJsonSchema = {
      type: 'object',
      properties: {
        careerSummary: { type: 'string' },
        coreConcepts: {
          type: 'array',
          items: {
            type: 'object',
            properties: { concept: { type: 'string' }, frequency: { type: 'integer' } },
            required: ['concept', 'frequency'],
          },
        },
      },
      required: ['careerSummary', 'coreConcepts'],
    };
    return await generateJson<{
      careerSummary: string;
      coreConcepts: { concept: string; frequency: number }[];
    }>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.AUTHOR_PROFILE),
        temperature: 0.3,
        jsonSchema: profileSchema,
        prompt: `Analyze the following publication list for author ${wrapUntrustedTextBlock('author_name', nameSafe)}. Based strictly on this list, provide:
            1. A narrative career summary (in markdown format) scoped to these retrieved records only — do not state global bibliometric facts (h-index, total citations) without an authoritative citation source.
            2. A list of core research concepts with frequency counts from these titles/abstracts.
            ${wrapUntrustedJsonBlock(
              'publications',
              articles.map((a) => ({ title: a.title, pubYear: a.pubYear, journal: a.journal })),
            )}`,
      },
      signal,
    );
  } catch (error) {
    safeLogError('Error generating author profile:', error);
    throw provider.mapError(error);
  }
}

export async function suggestAuthors(
  fieldOfStudy: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<{ name: string; description: string }[]> {
  if (await shouldUseHeuristic(aiSettings)) {
    return suggestAuthorsHeuristic(fieldOfStudy, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const fieldSafe = sanitizePromptFragment(fieldOfStudy, 2000);
  try {
    const suggestSchema: AIJsonSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'description'],
      },
    };
    return await generateJson<{ name: string; description: string }[]>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.AUTHOR_SUGGEST),
        temperature: 0.5,
        jsonSchema: suggestSchema,
        prompt: `Suggest 5-10 prominent researchers in the field of ${wrapUntrustedTextBlock('field', fieldSafe)}. For each, provide their name and a brief (1-sentence) description of their key contribution.`,
      },
      signal,
    );
  } catch (error) {
    safeLogError('Error suggesting authors:', error);
    throw provider.mapError(error);
  }
}
export async function generateJournalProfileAnalysis(
  journalName: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
  articles: Partial<RankedArticle>[] = [],
): Promise<JournalProfile> {
  if (await shouldUseHeuristic(aiSettings)) {
    return generateJournalProfileHeuristic(journalName, articles, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const journalSafe = sanitizePromptFragment(journalName, 500);
  const articleContext =
    articles.length > 0
      ? `\n${wrapUntrustedJsonBlock('recent_titles', articles.map((a) => a.title).slice(0, 20))}`
      : '';
  try {
    const journalSchema: AIJsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        issn: { type: 'string' },
        description: { type: 'string' },
        oaPolicy: { type: 'string' },
        focusAreas: { type: 'array', items: { type: 'string' } },
        publisher: { type: 'string' },
      },
      required: ['name', 'issn', 'description', 'oaPolicy', 'focusAreas'],
    };
    const profile = await generateJson<JournalProfile>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.JOURNAL_PROFILE),
        temperature: 0.2,
        jsonSchema: journalSchema,
        prompt: `Act as an expert academic librarian. Analyze the journal ${wrapUntrustedTextBlock('journal_name', journalSafe)}. Provide a JSON object with: name, issn, description, oaPolicy, focusAreas, publisher. Find the correct ISSN when possible. For oaPolicy, use one of: "Full Open Access", "Hybrid", "Subscription". Do not estimate Journal Impact Factor — external citation indexes are unavailable in this app.${articleContext}`,
      },
      signal,
    );
    return {
      ...profile,
      metrics: {
        impactFactor: null,
        analyzedArticleCount: articles.length > 0 ? articles.length : null,
        openAccessRate:
          articles.length > 0
            ? Math.round((articles.filter((a) => a.isOpenAccess).length / articles.length) * 100)
            : null,
        source: 'computed',
      },
    };
  } catch (error) {
    safeLogError('Error generating journal profile analysis:', error);
    throw provider.mapError(error);
  }
}

/**
 * Disambiguate a journal name into candidate journals (name variants, abbreviations).
 * Mirrors {@link disambiguateAuthor} — heuristic fallback uses the curated journal KB.
 */
export async function disambiguateJournal(
  journalName: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<JournalCandidate[]> {
  if (await shouldUseHeuristic(aiSettings)) {
    return disambiguateJournalHeuristic(journalName, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const journalSafe = sanitizePromptFragment(journalName, 500);
  try {
    const disambiguateSchema: AIJsonSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          issn: { type: 'string' },
          description: { type: 'string' },
          matchType: { type: 'string' },
          confidence: { type: 'integer' },
        },
        required: ['name', 'description', 'matchType', 'confidence'],
      },
    };
    const parsed = await generateJson<JournalCandidate[]>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.JOURNAL_DISAMBIGUATE),
        temperature: 0.1,
        jsonSchema: disambiguateSchema,
        prompt: `Act as an expert academic librarian. The user entered the journal name ${wrapUntrustedTextBlock('journal_query', journalSafe)}. Identify up to 5 distinct journals this could refer to (name variants, abbreviations, or similarly named journals, e.g. "BMJ" vs "BMJ Open"). For each candidate provide: the canonical full name, its ISSN (if known), a brief 1-sentence description, the matchType (one of "exact", "alias", "abbreviation", "partial"), and a confidence score 0-100. Return them sorted by confidence descending.`,
      },
      signal,
    );
    return parsed.map((c) => ({
      ...c,
      matchType: (['exact', 'alias', 'abbreviation', 'partial'].includes(c.matchType)
        ? c.matchType
        : 'partial') as JournalCandidate['matchType'],
    }));
  } catch (error) {
    safeLogError('Error disambiguating journal:', error);
    throw provider.mapError(error);
  }
}

/**
 * Suggest prominent journals for a field of study.
 * Mirrors {@link suggestAuthors} — heuristic fallback uses a curated field map.
 */
export async function suggestJournals(
  fieldOfStudy: string,
  aiSettings: Settings['ai'],
  signal?: AbortSignal,
): Promise<{ name: string; description: string }[]> {
  if (await shouldUseHeuristic(aiSettings)) {
    return suggestJournalsHeuristic(fieldOfStudy, signal);
  }
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const fieldSafe = sanitizePromptFragment(fieldOfStudy, 2000);
  try {
    const suggestSchema: AIJsonSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'description'],
      },
    };
    return await generateJson<{ name: string; description: string }[]>(
      aiSettings,
      {
        model: aiSettings.model,
        system: getPreamble(aiSettings, PromptId.JOURNAL_SUGGEST),
        temperature: 0.5,
        jsonSchema: suggestSchema,
        prompt: `Act as an expert academic librarian. Suggest 5-10 prominent peer-reviewed journals publishing research in the field of ${wrapUntrustedTextBlock('field', fieldSafe)}. For each, provide the canonical journal name and a brief (1-sentence) description of its scope and reputation.`,
      },
      signal,
    );
  } catch (error) {
    safeLogError('Error suggesting journals:', error);
    throw provider.mapError(error);
  }
}
