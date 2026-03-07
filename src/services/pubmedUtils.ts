/**
 * PubMed plain-fetch utilities
 *
 * Used ONLY by service-layer code (geminiService, journalService, etc.) that
 * runs inside async generators or plain async functions where React hooks
 * cannot be used. React components should use the RTK Query endpoints in
 * `src/store/slices/apiSlice.ts` instead, which add caching and deduplication.
 */
import type { RankedArticle } from '../types';

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  retries = 3,
  backoff = 1000,
): Promise<Response> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      ...init,
    });
    if (response.status === 429 && retries > 0) {
      const wait =
        parseInt(response.headers.get('Retry-After') ?? '0', 10) * 1000 ||
        backoff * 2;
      await new Promise(r => setTimeout(r, wait));
      return fetchWithRetry(url, init, retries - 1, wait);
    }
    if (!response.ok && retries > 0 && response.status >= 500) {
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, init, retries - 1, backoff * 2);
    }
    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, init, retries - 1, backoff * 2);
    }
    throw err;
  }
}

/** Search PubMed and return an array of PMIDs. */
export async function searchPubMedForIds(
  query: string,
  retmax: number,
): Promise<string[]> {
  const url = `${PUBMED_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${retmax}&sort=relevance&retmode=json`;
  try {
    const response = await fetchWithRetry(url);
    if (!response.ok)
      throw new Error(`PubMed API error: ${response.statusText}`);
    const data = await response.json();
    return data.esearchresult?.idlist ?? [];
  } catch (error) {
    if (error instanceof Error)
      throw new Error(`Failed to fetch from PubMed: ${error.message}`);
    throw new Error('An unknown network error occurred while searching PubMed.');
  }
}

/** Fetch full article details for the given PMIDs via POST to esummary. */
export async function fetchArticleDetails(
  pmids: string[],
): Promise<Partial<RankedArticle>[]> {
  if (!pmids.length) return [];
  const url = `${PUBMED_BASE}/esummary.fcgi?db=pubmed&retmode=json`;
  const formData = new FormData();
  formData.append('id', pmids.join(','));
  const response = await fetchWithRetry(url, { method: 'POST', body: formData });
  if (!response.ok)
    throw new Error(`PubMed API error: ${response.statusText}`);
  const data = await response.json();
  if (!data.result) throw new Error('Invalid response format from PubMed.');
  const articles: Partial<RankedArticle>[] = [];
  for (const pmid of data.result.uids as string[]) {
    const art = data.result[pmid];
    if (!art) continue;
    const pmcEntry = ((art.articleids ?? []) as Array<{ idtype: string; value: string }>)
      .find(x => x.idtype === 'pmc');
    articles.push({
      pmid,
      pmcId: pmcEntry?.value,
      title: art.title ?? '',
      authors: ((art.authors ?? []) as Array<{ name: string }>)
        .map((a) => a.name)
        .join(', '),
      journal: art.fulljournalname ?? '',
      pubYear: (art.pubdate ?? '').split(' ')[0],
      summary: art.abstract || 'No abstract available.',
      isOpenAccess: !!pmcEntry?.value,
      keywords: [],
      relevanceScore: 0,
      relevanceExplanation: '',
    });
  }
  return articles;
}
