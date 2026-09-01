/**
 * Shared Playwright network mocks for PubMed, arXiv, and Gemini.
 *
 * Prefer hostname predicates over unanchored regex/globs so evil hostnames
 * that merely contain the substring cannot hijack the mock.
 */
import type { Page, Route } from '@playwright/test';
import {
  PIPELINE_PUBMED_ARTICLE,
  type PubMedMockArticle,
  buildEsearchJson,
  buildPubmedArticleXml,
} from './pubmedArticle';

export async function mockPubMedRoutes(
  page: Page,
  article: PubMedMockArticle = PIPELINE_PUBMED_ARTICLE,
): Promise<void> {
  await page.route(
    (url) => url.hostname === 'eutils.ncbi.nlm.nih.gov',
    async (route: Route) => {
      const url = route.request().url();
      if (url.includes('esearch')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: buildEsearchJson(article.pmid),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/xml',
        body: buildPubmedArticleXml(article),
      });
    },
  );
}

export async function mockGeminiRoutes(page: Page): Promise<void> {
  await page.route(
    (url) => url.hostname === 'generativelanguage.googleapis.com',
    async (route: Route) => {
      const summary = '## Research Summary\\n\\nCOVID-19 cognitive effects findings.';
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: `data: {"candidates":[{"content":{"parts":[{"text":"${summary}"}],"role":"model"}}]}\n\ndata: [DONE]\n\n`,
      });
    },
  );
}

/** Abort all Gemini traffic (heuristic / offline path assertions). */
export async function mockGeminiUnavailable(page: Page): Promise<void> {
  await page.route(
    (url) => url.hostname === 'generativelanguage.googleapis.com',
    async (route) => {
      await route.abort('failed');
    },
  );
}

export async function mockArxivRoutes(page: Page): Promise<void> {
  await page.route(
    (url) => url.hostname === 'export.arxiv.org' || url.hostname === 'corsproxy.io',
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/atom+xml',
        body: `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry>
        <id>http://arxiv.org/abs/2404.00001v1</id><title>COVID arXiv Study</title>
        <summary>Neurological findings.</summary><author><name>Author A</name></author>
        <published>2024-04-01T00:00:00Z</published><updated>2024-04-01T00:00:00Z</updated>
        <category term="q-bio.NC"/></entry></feed>`,
      });
    },
  );
}

function geminiGenerateContentBody(text: string): string {
  return JSON.stringify({
    candidates: [{ content: { parts: [{ text }], role: 'model' } }],
  });
}

const QUERY_GEN_JSON = JSON.stringify({
  generatedQueries: [
    {
      query: `${PIPELINE_PUBMED_ARTICLE.title.split(' ')[0]}[Title/Abstract]`,
      explanation: 'e2e hanging-synthesis fixture',
    },
  ],
});

const RANKING_JSON = JSON.stringify({
  rankedArticles: [
    {
      pmid: PIPELINE_PUBMED_ARTICLE.pmid,
      relevanceScore: 92,
      relevanceExplanation: 'e2e fixture rank',
      keywords: ['cognition'],
      articleType: 'Journal Article',
      aiSummary: PIPELINE_PUBMED_ARTICLE.abstract,
    },
  ],
  aiGeneratedInsights: [
    {
      question: 'What did the fixture study report?',
      answer: PIPELINE_PUBMED_ARTICLE.abstract,
      supportingArticles: [PIPELINE_PUBMED_ARTICLE.pmid],
    },
  ],
  overallKeywords: [{ keyword: 'cognition', frequency: 1 }],
});

/**
 * Live Gemini path: query+ranking JSON complete immediately; synthesis SSE hangs
 * until the page aborts so Playwright can click Cancel mid-stream.
 */
export async function mockGeminiHangingSynthesis(page: Page): Promise<void> {
  await page.route(
    (url) => url.hostname === 'generativelanguage.googleapis.com',
    async (route: Route) => {
      const url = route.request().url();
      if (url.includes('streamGenerateContent')) {
        await new Promise<void>((resolve) => {
          const finish = () => {
            clearTimeout(timer);
            page.off('requestfailed', onFailed);
            resolve();
          };
          const timer = setTimeout(finish, 90_000);
          const onFailed = (req: { url: () => string }) => {
            if (req.url().includes('streamGenerateContent')) finish();
          };
          page.on('requestfailed', onFailed);
        });
        try {
          await route.abort('timedout');
        } catch {
          /* client already aborted the hanging stream */
        }
        return;
      }
      const post = route.request().postData() ?? '';
      const isQueryGen = /PubMed search query|generatedQueries/i.test(post);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: geminiGenerateContentBody(isQueryGen ? QUERY_GEN_JSON : RANKING_JSON),
      });
    },
  );
}

/** Orchestrator pipeline happy-path mocks (PubMed + Gemini + arXiv). */
export async function mockAgentPipelineApis(page: Page): Promise<void> {
  await mockPubMedRoutes(page);
  await mockGeminiRoutes(page);
  await mockArxivRoutes(page);
}
