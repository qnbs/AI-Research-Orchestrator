/**
 * arXiv API utilities
 *
 * Search and fetch preprint articles from the arXiv Atom REST API.
 * https://export.arxiv.org/api/query
 *
 * On CORS / network failure, returns [] so the pipeline continues with
 * PubMed results only — never blocks the main research flow.
 */
import type { RankedArticle } from '../types';

const ARXIV_BASE = 'https://export.arxiv.org/api/query';

async function fetchWithRetry(
  url: string,
  retries = 3,
  backoff = 1200,
): Promise<Response> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(18_000) });
    if (res.status === 429 && retries > 0) {
      await new Promise(r => setTimeout(r, backoff * 2));
      return fetchWithRetry(url, retries - 1, backoff * 2);
    }
    if (!res.ok && res.status >= 500 && retries > 0) {
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, retries - 1, backoff * 2);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, retries - 1, backoff * 2);
    }
    throw err;
  }
}

/** Convert a single Atom <entry> element to a RankedArticle-compatible record. */
function entryToRankedArticle(entry: Element): Partial<RankedArticle> {
  const getText = (tag: string): string =>
    entry.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';

  // Extract arXiv ID from the <id> URI, e.g. http://arxiv.org/abs/2301.12345v2
  const idRaw = getText('id');
  const arxivId = idRaw.replace(/.*\/abs\//, '').replace(/v\d+$/, '');

  const authors = Array.from(entry.getElementsByTagName('author'))
    .map(a => a.getElementsByTagName('name')[0]?.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(', ');

  const categories = Array.from(entry.getElementsByTagName('category'))
    .map(c => c.getAttribute('term') ?? '')
    .filter(Boolean);

  const pdfLinkEl = Array.from(entry.getElementsByTagName('link')).find(
    l => l.getAttribute('type') === 'application/pdf',
  );
  const pdfUrl =
    pdfLinkEl?.getAttribute('href') ?? `https://arxiv.org/pdf/${arxivId}`;

  // arXiv uses a namespace for journal_ref and doi — try both with and without NS
  const journalRef =
    entry.getElementsByTagNameNS('http://arxiv.org/schemas/atom', 'journal_ref')[0]
      ?.textContent?.trim() ??
    entry.getElementsByTagName('journal_ref')[0]?.textContent?.trim();

  const pubDate = getText('published').split('T')[0]; // YYYY-MM-DD
  const pubYear = pubDate.split('-')[0];

  return {
    pmid: `arxiv:${arxivId}`,          // synthetic PMID keeps the pipeline unified
    title: getText('title').replace(/\s+/g, ' '),
    authors,
    journal: journalRef ?? (categories[0] ? `arXiv [${categories[0]}]` : 'arXiv Preprint'),
    pubYear,
    summary: getText('summary').replace(/\s+/g, ' '),
    isOpenAccess: true,               // arXiv is always open access
    keywords: categories,
    relevanceScore: 0,
    relevanceExplanation: '',
    articleType: 'Preprint',
    // arxivId/categories/pdfUrl are UnifiedArticle fields, not RankedArticle.
    // pmid prefix 'arxiv:' is used downstream to identify arXiv origin.
  } satisfies Partial<RankedArticle>;
}

/**
 * Search arXiv for articles matching `topic` and return them as
 * RankedArticle-compatible records (with pmid = "arxiv:<id>").
 *
 * Returns [] silently on any network/CORS/parse failure.
 */
export async function searchAndFetchArxiv(
  topic: string,
  maxResults: number,
): Promise<Partial<RankedArticle>[]> {
  try {
    const query = encodeURIComponent(topic);
    const url =
      `${ARXIV_BASE}?search_query=all:${query}` +
      `&start=0&max_results=${maxResults}` +
      `&sortBy=relevance&sortOrder=descending`;

    const res = await fetchWithRetry(url);
    if (!res.ok) return [];

    const xml = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    // Detect XML parse errors
    if (doc.querySelector('parsererror')) return [];

    return Array.from(doc.getElementsByTagName('entry')).map(entryToRankedArticle);
  } catch {
    // Network error, CORS block, timeout, etc. — continue with PubMed only
    return [];
  }
}
