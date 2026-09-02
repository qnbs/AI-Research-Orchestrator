import { AggregatedArticle, KnowledgeBaseEntry, Settings } from '../types';
import { sanitizeReportForExport } from '../lib/reportExportProvenance';
import { getAppReleaseInfo } from '../lib/appReleaseInfo';
import { downloadUtf8File } from '../lib/exportSafety';
import { APP_NAME, cleanText, stripHtmlTags } from './exportText';

export { sanitizeCsvFormulaInjection } from '../lib/exportSafety';
export { exportToPdf, exportKnowledgeBaseToPdf } from './exportPdf';
export { exportToCsv, exportInsightsToCsv } from './exportCsv';

const createJsonExport = <T>(data: T, type: string, count: number) => {
  const release = getAppReleaseInfo();
  const exportObject = {
    meta: {
      appName: APP_NAME,
      appVersion: release.appVersion,
      buildCommitSha: release.buildCommitSha,
      dexieSchemaVersion: release.dexieSchemaVersion,
      swCacheVersion: release.swCacheVersion,
      exportDate: new Date().toISOString(),
      importEnvelopeVersion: 1,
      type,
      count,
    },
    data,
  };
  const jsonString = JSON.stringify(exportObject, null, 2);
  const date = new Date().toISOString().split('T')[0];
  downloadUtf8File(
    jsonString,
    `ai_research_orchestration_author_${type}_${date}.json`,
    'application/json;charset=utf-8',
  );
};

export const exportHistoryToJson = (entries: KnowledgeBaseEntry[]): void => {
  const sanitized = entries.map((entry) => {
    if (entry.sourceType === 'research' && entry.report) {
      const { report } = sanitizeReportForExport(entry.report);
      return { ...entry, report };
    }
    return entry;
  });
  createJsonExport(sanitized, 'history', sanitized.length);
};

export const exportKnowledgeBaseToJson = (articles: AggregatedArticle[]): void => {
  createJsonExport(articles, 'knowledge-base-articles', articles.length);
};

export const exportCitations = (
  articles: AggregatedArticle[],
  settings: Settings['export']['citation'],
  type: 'bib' | 'ris',
): void => {
  let content = '';

  // Single-pass escaping: chaining sequential `.replace()` calls (backslash first, then
  // braces) lets a later step re-match characters an earlier step just inserted (e.g. the
  // `{}` in `\textbackslash{}` getting re-escaped by the brace step). One regex + callback
  // resolves each *original* character exactly once, so no substitution can compound.
  const BIBTEX_ESCAPES: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '&': '\\&',
    '%': '\\%',
    $: '\\$',
    '#': '\\#',
    _: '\\_',
    '{': '\\{',
    '}': '\\}',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
  };
  const cleanForBibtex = (text: string) => {
    // BibTeX escaping alone doesn't strip HTML markup — a downstream renderer that
    // treats the .bib file as HTML could still interpret it. Sanitize first, like
    // every other export path, then escape the plain text for BibTeX.
    const plainText = stripHtmlTags(text);
    if (!plainText) return '{}';
    const escaped = plainText.replace(/[\\&%$#_{}~^]/g, (char) => BIBTEX_ESCAPES[char] ?? char);
    return `{${escaped}}`;
  };

  const cleanForRis = (text: string) => {
    if (!text) return '';
    // RIS format is line-based. Newlines in content are a problem.
    return cleanText(text)
      .replace(/(\r\n|\n|\r)/gm, ' ')
      .replace(/\s\s+/g, ' ')
      .trim();
  };

  if (type === 'bib') {
    content = articles
      .map((a) => {
        const authorField = cleanForBibtex(a.authors.split(', ').join(' and '));
        let entry = `@article{PMID:${a.pmid},\n  author  = ${authorField},\n  title   = ${cleanForBibtex(a.title)},\n  journal = ${cleanForBibtex(a.journal)},\n  year    = {${a.pubYear}},\n  pmid    = {${a.pmid}},\n`;
        if (settings.includeAbstract) entry += `  abstract = ${cleanForBibtex(a.summary)},\n`;
        if (settings.includeKeywords && a.keywords && a.keywords.length > 0)
          entry += `  keywords = ${cleanForBibtex(a.keywords.join(', '))},\n`;

        const notes = [];
        if (settings.includeTags && a.customTags && a.customTags.length > 0)
          notes.push(`Custom Tags: ${a.customTags.join(', ')}`);
        if (settings.includePmcid && a.pmcId) notes.push(`PMCID: ${a.pmcId}`);
        if (notes.length > 0) entry += `  note = ${cleanForBibtex(notes.join('; '))}\n`;

        entry += `}`;
        return entry;
      })
      .join('\n\n');
  } else {
    // RIS
    content = articles
      .map((a) => {
        let entry = `TY  - JOUR\n`;
        entry +=
          a.authors
            .split(', ')
            .map((author) => `AU  - ${author}`)
            .join('\n') + '\n';
        entry += `TI  - ${cleanForRis(a.title)}\nJO  - ${cleanForRis(a.journal)}\nYR  - ${a.pubYear}\n`;
        if (settings.includeAbstract) entry += `AB  - ${cleanForRis(a.summary)}\n`;
        if (settings.includeKeywords && a.keywords && a.keywords.length > 0)
          entry += `${a.keywords.map((kw) => `KW  - ${cleanForRis(kw)}`).join('\n')}\n`;
        if (settings.includeTags && a.customTags && a.customTags.length > 0)
          entry += `${a.customTags.map((tag) => `KW  - ${cleanForRis(tag)}`).join('\n')}\n`;
        entry += `ID  - ${a.pmid}\n`;
        if (settings.includePmcid && a.pmcId) entry += `N1  - PMCID: ${a.pmcId}\n`; // N1 is often used for notes
        entry += 'ER  - \n';
        return entry;
      })
      .join('\n');
  }
  downloadUtf8File(content, `citations.${type}`, 'application/octet-stream;charset=utf-8');
};
