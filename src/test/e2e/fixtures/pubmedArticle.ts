/**
 * Deterministic PubMed EFetch/ESearch payloads for Playwright network mocks.
 */

export type PubMedMockArticle = {
  pmid: string;
  title: string;
  abstract: string;
  journal: string;
  year: string;
  lastName: string;
  foreName: string;
};

/** Default article for the orchestrator agent-flow pipeline. */
export const PIPELINE_PUBMED_ARTICLE: PubMedMockArticle = {
  pmid: '39000001',
  title: 'COVID Cognition Study',
  abstract: 'Brain fog findings.',
  journal: 'Nature Medicine',
  year: '2024',
  lastName: 'Smith',
  foreName: 'J',
};

/** Default article for Journal Hub analyze-form smoke. */
export const JOURNAL_HUB_PUBMED_ARTICLE: PubMedMockArticle = {
  pmid: '39000002',
  title: 'Nature Medicine Sample',
  abstract: 'Sample abstract.',
  journal: 'Nature Medicine',
  year: '2024',
  lastName: 'Doe',
  foreName: 'A',
};

export function buildEsearchJson(pmid: string): string {
  return JSON.stringify({ esearchresult: { idlist: [pmid] } });
}

/** NCBI ESummary JSON used by `fetchArticleDetails` (POST esummary.fcgi). */
export function buildEsummaryJson(article: PubMedMockArticle): string {
  return JSON.stringify({
    result: {
      uids: [article.pmid],
      [article.pmid]: {
        title: article.title,
        authors: [{ name: `${article.lastName} ${article.foreName}` }],
        fulljournalname: article.journal,
        pubdate: article.year,
        articleids: [],
      },
    },
  });
}

export function buildPubmedArticleXml(article: PubMedMockArticle): string {
  return `<?xml version="1.0"?><PubmedArticleSet><PubmedArticle>
          <MedlineCitation Status="MEDLINE"><PMID Version="1">${article.pmid}</PMID>
          <Article><ArticleTitle>${article.title}</ArticleTitle>
          <Abstract><AbstractText>${article.abstract}</AbstractText></Abstract>
          <AuthorList><Author><LastName>${article.lastName}</LastName><ForeName>${article.foreName}</ForeName></Author></AuthorList>
          <Journal><Title>${article.journal}</Title><JournalIssue><PubDate><Year>${article.year}</Year></PubDate></JournalIssue></Journal>
          </Article></MedlineCitation></PubmedArticle></PubmedArticleSet>`;
}
