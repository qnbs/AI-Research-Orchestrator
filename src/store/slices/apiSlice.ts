/**
 * RTK Query API Slice — AI Research Orchestrator
 * Endpoints: PubMed E-utilities + arXiv API
 * Features: caching, exponential backoff, infinite queries, error boundaries
 */
import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import type { RankedArticle, ArxivArticle } from '../../types';

// ── PubMed E-utilities base URLs ──────────────────────────────────────────────
const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const ARXIV_BASE = 'https://export.arxiv.org/api/query';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPubMedUrl(endpoint: string, params: Record<string, string | number>): string {
  const p = new URLSearchParams({ db: 'pubmed', retmode: 'json', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  return `${PUBMED_BASE}/${endpoint}.fcgi?${p.toString()}`;
}

/** Parse PubMed XML summary to RankedArticle */
function parsePubMedSummary(uid: string, docsum: Record<string, unknown>): RankedArticle {
  const authors = (docsum.authors as Array<{ name: string }> | undefined)?.map(a => a.name).join(', ') ?? 'Unknown';
  return {
    pmid: uid,
    title: String(docsum.title ?? ''),
    authors,
    journal: String(docsum.source ?? ''),
    pubYear: String(docsum.pubdate ?? '').substring(0, 4),
    summary: String(docsum.title ?? ''),
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: [],
    isOpenAccess: false,
    articleType: String((docsum.pubtype as string[] | undefined)?.[0] ?? ''),
    source: 'pubmed' as const,
  } as RankedArticle;
}

/** Parse arXiv Atom feed to ArxivArticle[] */
function parseArxivFeed(xmlText: string): ArxivArticle[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const entries = Array.from(doc.querySelectorAll('entry'));
  return entries.map(entry => {
    const id = entry.querySelector('id')?.textContent ?? '';
    const arxivId = id.split('/abs/').pop()?.replace(/v\d+$/, '') ?? id;
    const categories = Array.from(entry.querySelectorAll('category')).map(c => c.getAttribute('term') ?? '');
    const links = Array.from(entry.querySelectorAll('link'));
    const pdfLink = links.find(l => l.getAttribute('title') === 'pdf');
    const htmlLink = links.find(l => l.getAttribute('rel') === 'alternate');
    return {
      arxivId,
      title: entry.querySelector('title')?.textContent?.trim() ?? '',
      authors: Array.from(entry.querySelectorAll('author name')).map(a => a.textContent ?? '').join(', '),
      abstract: entry.querySelector('summary')?.textContent?.trim() ?? '',
      published: entry.querySelector('published')?.textContent ?? '',
      updated: entry.querySelector('updated')?.textContent ?? '',
      categories,
      pdfUrl: pdfLink?.getAttribute('href') ?? `https://arxiv.org/pdf/${arxivId}`,
      htmlUrl: htmlLink?.getAttribute('href') ?? `https://arxiv.org/abs/${arxivId}`,
      journalRef: entry.querySelector('journal_ref')?.textContent ?? undefined,
      doi: entry.querySelector('doi')?.textContent ?? undefined,
      source: 'arxiv' as const,
    };
  });
}

// ── RTK Query base with retry ─────────────────────────────────────────────────
const baseQueryWithRetry = retry(
  fetchBaseQuery({ baseUrl: '/' }),
  { maxRetries: 3 }
);

// ── Request/Response types ────────────────────────────────────────────────────
export interface PubMedSearchArgs {
  query: string;
  maxResults?: number;
  dateRange?: string;   // e.g. "5" → last 5 years
  articleTypes?: string[];
}

export interface PubMedSearchResult {
  pmids: string[];
  total: number;
  query: string;
}

export interface PubMedDetailsArgs {
  pmids: string[];
}

export interface ArxivSearchArgs {
  query: string;
  maxResults?: number;
  categories?: string[]; // e.g. ['cs.AI', 'q-bio']
  sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate';
}

export interface ArxivSearchResult {
  articles: ArxivArticle[];
  totalResults: number;
  query: string;
}

// ── Main API Slice ────────────────────────────────────────────────────────────
export const researchApi = createApi({
  reducerPath: 'researchApi',
  baseQuery: baseQueryWithRetry,
  tagTypes: ['PubMed', 'Arxiv', 'ArticleDetails'],
  keepUnusedDataFor: 600, // Cache for 10 minutes
  endpoints: (builder) => ({

    // ── PubMed: Search (esearch) ───────────────────────────────────────────
    searchPubMed: builder.query<PubMedSearchResult, PubMedSearchArgs>({
      queryFn: async ({ query, maxResults = 100, dateRange, articleTypes }) => {
        try {
          let fullQuery = query;
          if (dateRange) {
            const fromYear = new Date().getFullYear() - parseInt(dateRange, 10);
            fullQuery += ` AND ("${fromYear}"[PDAT] : "3000"[PDAT])`;
          }
          if (articleTypes?.length) {
            const typeFilters = articleTypes.map(t => `"${t}"[pt]`).join(' OR ');
            fullQuery += ` AND (${typeFilters})`;
          }
          const url = buildPubMedUrl('esearch', {
            term: fullQuery,
            retmax: maxResults,
            usehistory: 'y',
          });
          const response = await fetchWithBackoff(url);
          const data = await response.json();
          return {
            data: {
              pmids: data.esearchresult?.idlist ?? [],
              total: parseInt(data.esearchresult?.count ?? '0', 10),
              query: fullQuery,
            },
          };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (result, error, arg) => [{ type: 'PubMed', id: arg.query }],
    }),

    // ── PubMed: Fetch article summaries (esummary) ─────────────────────────
    getPubMedDetails: builder.query<RankedArticle[], PubMedDetailsArgs>({
      queryFn: async ({ pmids }) => {
        if (!pmids.length) return { data: [] };
        try {
          const url = buildPubMedUrl('esummary', {
            id: pmids.join(','),
            retmax: pmids.length,
          });
          const response = await fetchWithBackoff(url);
          const data = await response.json();
          const result = pmids.map(uid => {
            const docsum = data.result?.[uid];
            if (!docsum) return null;
            return parsePubMedSummary(uid, docsum);
          }).filter((a): a is RankedArticle => a !== null);
          return { data: result };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (result) =>
        result
          ? result.map(({ pmid }) => ({ type: 'ArticleDetails' as const, id: pmid }))
          : ['ArticleDetails'],
    }),

    // ── arXiv: Full-text search ────────────────────────────────────────────
    searchArxiv: builder.query<ArxivSearchResult, ArxivSearchArgs>({
      queryFn: async ({ query, maxResults = 50, categories = [], sortBy = 'relevance' }) => {
        try {
          let searchQuery = `all:${encodeURIComponent(query)}`;
          if (categories.length) {
            const catFilter = categories.map(c => `cat:${c}`).join('+OR+');
            searchQuery += `+AND+(${catFilter})`;
          }
          const params = new URLSearchParams({
            search_query: searchQuery,
            max_results: String(maxResults),
            sortBy: sortBy,
            sortOrder: 'descending',
          });
          const url = `${ARXIV_BASE}?${params.toString()}`;
          const response = await fetchWithBackoff(url);
          const text = await response.text();
          const articles = parseArxivFeed(text);
          // Extract totalResults from feed
          const doc = new DOMParser().parseFromString(text, 'application/xml');
          const total = parseInt(doc.querySelector('opensearch\\:totalResults, totalResults')?.textContent ?? '0', 10);
          return { data: { articles, totalResults: total, query } };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (result, error, arg) => [{ type: 'Arxiv', id: arg.query }],
    }),

    // ── PubMed: Abstract fetch ─────────────────────────────────────────────
    getPubMedAbstract: builder.query<string, string>({
      queryFn: async (pmid) => {
        try {
          const url = buildPubMedUrl('efetch', { id: pmid, rettype: 'abstract', retmode: 'text' });
          const response = await fetchWithBackoff(url);
          const text = await response.text();
          return { data: text.trim() };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
        }
      },
      providesTags: (result, error, pmid) => [{ type: 'ArticleDetails', id: `abstract-${pmid}` }],
    }),
  }),
});

// ── Exponential backoff fetch ─────────────────────────────────────────────────
async function fetchWithBackoff(url: string, retries = 3, delay = 1000): Promise<Response> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (response.status === 429 && retries > 0) {
      const wait = parseInt(response.headers.get('Retry-After') ?? '0', 10) * 1000 || delay * 2;
      await new Promise(r => setTimeout(r, wait));
      return fetchWithBackoff(url, retries - 1, wait);
    }
    if (!response.ok && retries > 0 && response.status >= 500) {
      await new Promise(r => setTimeout(r, delay));
      return fetchWithBackoff(url, retries - 1, delay * 2);
    }
    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return fetchWithBackoff(url, retries - 1, delay * 2);
    }
    throw err;
  }
}

// ── Export hooks ──────────────────────────────────────────────────────────────
export const {
  useSearchPubMedQuery,
  useLazySearchPubMedQuery,
  useGetPubMedDetailsQuery,
  useLazyGetPubMedDetailsQuery,
  useSearchArxivQuery,
  useLazySearchArxivQuery,
  useGetPubMedAbstractQuery,
  useLazyGetPubMedAbstractQuery,
} = researchApi;
