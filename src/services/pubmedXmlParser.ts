/**
 * Parse PubMed XML from NCBI EFetch (db=pubmed, retmode=xml).
 */

import type { AbstractStatus } from '../types';

export type ParsedPubMedEfetchRecord = {
  pmid: string;
  abstract?: string;
  abstractStatus: AbstractStatus;
  publicationTypes: string[];
  doi?: string;
};

function textContent(el: Element | null): string {
  return el?.textContent?.trim() ?? '';
}

function parseAbstract(abstractEl: Element | null): { text?: string; status: AbstractStatus } {
  if (!abstractEl) {
    return { status: 'missing' };
  }

  const parts = abstractEl.querySelectorAll('AbstractText');
  if (parts.length === 0) {
    const plain = textContent(abstractEl);
    if (!plain) return { status: 'missing' };
    return { text: plain, status: 'available' };
  }

  const segments: string[] = [];
  let hasLabel = false;
  for (const part of parts) {
    const label = part.getAttribute('Label');
    const body = textContent(part);
    if (!body) continue;
    if (label) {
      hasLabel = true;
      segments.push(`${label}: ${body}`);
    } else {
      segments.push(body);
    }
  }

  if (segments.length === 0) {
    return { status: 'missing' };
  }

  return {
    text: segments.join('\n'),
    status: hasLabel ? 'structured' : 'available',
  };
}

/** Parse EFetch XML into a PMID-keyed map of abstract/provenance fields. */
export function parsePubMedEfetchXml(xml: string): Map<string, ParsedPubMedEfetchRecord> {
  const out = new Map<string, ParsedPubMedEfetchRecord>();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  if (doc.querySelector('parsererror')) {
    return out;
  }

  const articles = doc.querySelectorAll('PubmedArticle');
  for (const articleEl of articles) {
    const pmidEl = articleEl.querySelector('MedlineCitation > PMID, PMID');
    const pmid = textContent(pmidEl);
    if (!pmid) continue;

    const abstractEl = articleEl.querySelector(
      'MedlineCitation Article Abstract, Article Abstract',
    );
    const { text: abstract, status: abstractStatus } = parseAbstract(abstractEl);

    const publicationTypes: string[] = [];
    articleEl
      .querySelectorAll('PublicationTypeList PublicationType, PubmedData PublicationType')
      .forEach((pt) => {
        const value = textContent(pt);
        if (value) publicationTypes.push(value);
      });

    let doi: string | undefined;
    articleEl.querySelectorAll('ArticleIdList ArticleId, PubmedData ArticleId').forEach((idEl) => {
      if (idEl.getAttribute('IdType') === 'doi') {
        const value = textContent(idEl);
        if (value) doi = value;
      }
    });

    out.set(pmid, {
      pmid,
      abstract,
      abstractStatus,
      publicationTypes,
      doi,
    });
  }

  return out;
}

/** Split PMIDs into batches within NCBI EFetch limits. */
export function batchPmids(pmids: readonly string[], batchSize = 200): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < pmids.length; i += batchSize) {
    batches.push(pmids.slice(i, i + batchSize));
  }
  return batches;
}
