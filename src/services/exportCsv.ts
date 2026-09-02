import { AggregatedArticle, ResearchReport, Settings, type CsvExportColumn } from '../types';
import { csvPartialProvenanceRow } from '../lib/reportExportProvenance';
import { articleExternalUrl } from '../lib/sourceIdentifier';
import { downloadUtf8File, sanitizeCsvFormulaInjection } from '../lib/exportSafety';

export const exportToCsv = (
  articlesToExport: AggregatedArticle[],
  topic: string,
  settings: Settings['export']['csv'],
  options?: { partial?: boolean },
): void => {
  const escapeCsvField = (field: unknown): string => {
    if (field === null || field === undefined) return '';
    let str = sanitizeCsvFormulaInjection(String(field));
    if (str.includes(settings.delimiter) || str.includes('"') || str.includes('\n'))
      str = `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const headers = settings.columns;
  const rows = articlesToExport.map((article) => {
    const articleUrl = articleExternalUrl(article);
    const pmcidUrl = article.pmcId
      ? `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${article.pmcId.replace(/^PMC/i, '')}/`
      : '';

    const rowData: Record<CsvExportColumn, string | number | boolean> = {
      pmid: article.pmid,
      pmcId: article.pmcId ?? '',
      title: article.title,
      authors: article.authors,
      journal: article.journal,
      pubYear: article.pubYear,
      summary: article.summary,
      aiSummary: article.aiSummary ?? '',
      relevanceScore: article.relevanceScore,
      relevanceExplanation: article.relevanceExplanation,
      keywords: (article.keywords || []).join('; '),
      customTags: article.customTags?.join('; ') || '',
      sourceTitle: article.sourceTitle || topic,
      isOpenAccess: article.isOpenAccess,
      articleType: article.articleType || 'N/A',
      URL: articleUrl,
      PMCID_URL: pmcidUrl,
    };

    return headers.map((header) => escapeCsvField(rowData[header])).join(settings.delimiter);
  });

  const headerLine = headers.join(settings.delimiter);
  const watermarkRow = csvPartialProvenanceRow(
    Boolean(options?.partial),
    headers.length,
    settings.delimiter,
  );
  const csvContent = [headerLine, ...(watermarkRow ? [watermarkRow] : []), ...rows].join('\n');
  downloadUtf8File(
    csvContent,
    `report_export_${topic.substring(0, 20).replace(/\s/g, '_')}.csv`,
    'text/csv;charset=utf-8;',
  );
};

export const exportInsightsToCsv = (
  insights: ResearchReport['aiGeneratedInsights'],
  topic: string,
  options?: { partial?: boolean },
): void => {
  const escapeCsvField = (field: unknown): string => {
    if (field === null || field === undefined) return '';
    let str = sanitizeCsvFormulaInjection(String(field));
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = ['ReportTopic', 'Question', 'Answer', 'Supporting PMIDs'];
  const rows = insights.map((insight) =>
    [topic, insight.question, insight.answer, (insight.supportingArticles || []).join('; ')]
      .map(escapeCsvField)
      .join(','),
  );

  const headerLine = headers.join(',');
  const watermarkRow = csvPartialProvenanceRow(Boolean(options?.partial), headers.length, ',');
  const csvContent = [headerLine, ...(watermarkRow ? [watermarkRow] : []), ...rows].join('\n');
  downloadUtf8File(
    csvContent,
    `ai_insights_${topic.substring(0, 20).replace(/\s/g, '_')}.csv`,
    'text/csv;charset=utf-8;',
  );
};
