import jsPDF from 'jspdf';
import {
  RankedArticle,
  ResearchInput,
  AggregatedArticle,
  ResearchReport,
  Settings,
} from '../types';
import { sanitizeReportForExport } from '../lib/reportExportProvenance';
import {
  articleExternalUrl,
  canonicalArticleKey,
  formatLegacyArticleKeyLabel,
  normalizePmcidValue,
  resolveArticleId,
} from '../lib/sourceIdentifier';
import { formatReleaseLabel, formatReportReleaseLabel } from '../lib/appReleaseInfo';
import { downloadBinaryFile } from '../lib/exportSafety';
import { APP_NAME, cleanText } from './exportText';

const PDF_CONSTANTS = {
  MARGIN: 15,
  FONT_SIZES: {
    TITLE: 22,
    H1: 14,
    H2: 12,
    BODY: 10,
    KEY_VALUE: 9,
    FOOTER: 8,
  },
  COLORS: {
    TITLE: '#000000',
    TEXT_PRIMARY: '#000000',
    TEXT_SECONDARY: '#505050',
    LINK: '#2980b9',
    LINE: '#cccccc',
  },
};

/**
 * A stateful class to manage the creation of a PDF document.
 */
class PdfExporter {
  private doc: jsPDF;
  private pageHeight: number;
  private pageWidth: number;
  private currentY: number;
  private pageNumber: number;
  private tocEntries: { title: string; page: number }[];
  private settings: Settings['export']['pdf'];
  private documentTitle: string;

  constructor(title: string, settings: Settings['export']['pdf']) {
    this.doc = new jsPDF({ unit: 'pt' }); // Use points for better font control
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.currentY = PDF_CONSTANTS.MARGIN;
    this.pageNumber = 1;
    this.tocEntries = [];
    this.settings = settings;
    this.documentTitle = title;
    this.doc.setProperties({
      title,
      subject: 'AI-Generated Literature Review',
      author: APP_NAME,
      creator: APP_NAME,
    });
  }

  /** Adds a new page to the document, including headers and footers if enabled. */
  private addPage() {
    if (this.settings.includeFooter) this.addFooter();
    this.doc.addPage();
    this.pageNumber++;
    this.currentY = PDF_CONSTANTS.MARGIN;
    if (this.settings.includeHeader) this.addHeader();
  }

  /** Checks if a new page is needed before adding content. */
  private checkPageBreak(spaceNeeded: number) {
    if (this.currentY + spaceNeeded > this.pageHeight - PDF_CONSTANTS.MARGIN) {
      this.addPage();
    }
  }

  /** Adds a header to the current page. */
  private addHeader() {
    this.doc
      .setFontSize(PDF_CONSTANTS.FONT_SIZES.FOOTER)
      .setFont('helvetica', 'italic')
      .setTextColor(PDF_CONSTANTS.COLORS.TEXT_SECONDARY);
    const headerText =
      this.documentTitle.length > 90
        ? this.documentTitle.substring(0, 87) + '...'
        : this.documentTitle;
    this.doc.text(headerText, PDF_CONSTANTS.MARGIN, 10);
    this.doc
      .setDrawColor(PDF_CONSTANTS.COLORS.LINE)
      .line(PDF_CONSTANTS.MARGIN, 12, this.pageWidth - PDF_CONSTANTS.MARGIN, 12);
  }

  /** Adds a footer to the current page. */
  private addFooter() {
    this.doc
      .setFontSize(PDF_CONSTANTS.FONT_SIZES.FOOTER)
      .setFont('helvetica', 'italic')
      .setTextColor(PDF_CONSTANTS.COLORS.TEXT_SECONDARY);
    const footerText = `Page ${this.pageNumber} | ${formatReleaseLabel()} | ${APP_NAME}`;
    this.doc.text(footerText, this.pageWidth / 2, this.pageHeight - 10, { align: 'center' });
  }

  /** Adds a main section title. */
  private addSectionTitle(title: string, options: { addToToc?: boolean } = {}) {
    if (options.addToToc) this.tocEntries.push({ title, page: this.pageNumber });
    this.checkPageBreak(30);
    this.doc
      .setFontSize(PDF_CONSTANTS.FONT_SIZES.H1)
      .setFont('helvetica', 'bold')
      .setTextColor(PDF_CONSTANTS.COLORS.TEXT_PRIMARY);
    this.doc.text(title, PDF_CONSTANTS.MARGIN, this.currentY);
    this.currentY += PDF_CONSTANTS.FONT_SIZES.H1 * 1.5;
  }

  /** Adds multi-line body text. */
  private addBodyText(text: string) {
    const lines = this.doc.splitTextToSize(
      cleanText(text),
      this.pageWidth - PDF_CONSTANTS.MARGIN * 2,
    );
    this.doc
      .setFontSize(PDF_CONSTANTS.FONT_SIZES.BODY)
      .setFont('helvetica', 'normal')
      .setTextColor(PDF_CONSTANTS.COLORS.TEXT_SECONDARY);
    for (const line of lines) {
      this.checkPageBreak(PDF_CONSTANTS.FONT_SIZES.BODY);
      this.doc.text(line, PDF_CONSTANTS.MARGIN, this.currentY);
      this.currentY += PDF_CONSTANTS.FONT_SIZES.BODY * 1.2;
    }
    this.currentY += PDF_CONSTANTS.FONT_SIZES.BODY;
  }

  /** Adds a key-value pair, handling multi-line values. */
  private addKeyValue(key: string, value: string) {
    if (!value) return;
    const keyWidth = 80;
    const valueLines = this.doc.splitTextToSize(
      cleanText(value),
      this.pageWidth - PDF_CONSTANTS.MARGIN * 2 - keyWidth,
    );
    this.checkPageBreak(valueLines.length * PDF_CONSTANTS.FONT_SIZES.KEY_VALUE * 1.2 + 4);
    this.doc
      .setFontSize(PDF_CONSTANTS.FONT_SIZES.KEY_VALUE)
      .setFont('helvetica', 'bold')
      .setTextColor(PDF_CONSTANTS.COLORS.TEXT_PRIMARY);
    this.doc.text(key, PDF_CONSTANTS.MARGIN, this.currentY);
    this.doc.setFont('helvetica', 'normal').setTextColor(PDF_CONSTANTS.COLORS.TEXT_SECONDARY);
    this.doc.text(valueLines, PDF_CONSTANTS.MARGIN + keyWidth, this.currentY);
    this.currentY += valueLines.length * PDF_CONSTANTS.FONT_SIZES.KEY_VALUE * 1.2 + 4;
  }

  private addTableOfContents() {
    this.addSectionTitle('Table of Contents', {});
    this.doc.setFontSize(PDF_CONSTANTS.FONT_SIZES.BODY).setFont('helvetica', 'normal');
    this.tocEntries.forEach((entry) => {
      this.checkPageBreak(PDF_CONSTANTS.FONT_SIZES.BODY * 1.2);
      const dots = '.'.repeat(Math.max(0, 80 - entry.title.length));
      this.doc.text(`${entry.title} ${dots} ${entry.page}`, PDF_CONSTANTS.MARGIN, this.currentY);
      this.currentY += PDF_CONSTANTS.FONT_SIZES.BODY * 1.2;
    });
    this.currentY += PDF_CONSTANTS.FONT_SIZES.BODY;
  }

  /** Renders an article entry in the PDF. */
  private addArticle(article: RankedArticle, index: number) {
    const articleId = resolveArticleId(article);
    const articleLink = articleExternalUrl(article);
    const idLabel = formatLegacyArticleKeyLabel(canonicalArticleKey(articleId));
    const alternatePmcid =
      article.pmcId && articleId.type !== 'pmcid'
        ? ` / PMCID: PMC${normalizePmcidValue(article.pmcId)}`
        : '';
    this.checkPageBreak(80);
    this.doc
      .setFontSize(PDF_CONSTANTS.FONT_SIZES.H2)
      .setFont('helvetica', 'bold')
      .setTextColor(PDF_CONSTANTS.COLORS.LINK);
    this.doc.textWithLink(
      `${index + 1}. ${cleanText(article.title)}`,
      PDF_CONSTANTS.MARGIN,
      this.currentY,
      { url: articleLink },
    );
    this.currentY += PDF_CONSTANTS.FONT_SIZES.H2 * 1.5;

    this.addKeyValue('Authors:', `${article.authors} (${article.pubYear})`);
    this.addKeyValue('Journal:', article.journal);
    this.addKeyValue('Identifier:', idLabel + alternatePmcid);
    this.addKeyValue(
      'Relevance:',
      `${article.relevanceScore}/100 - ${article.relevanceExplanation}`,
    );
    this.addKeyValue('Summary:', article.aiSummary || article.summary);
    if (article.keywords && article.keywords.length > 0)
      this.addKeyValue('Keywords:', article.keywords.join(', '));
    if (article.customTags && article.customTags.length > 0)
      this.addKeyValue('Custom Tags:', article.customTags.join(', '));
    this.currentY += 10;
  }

  /** Saves the generated PDF after the 8 MiB export ceiling. */
  public save(filename: string) {
    if (this.settings.includeFooter) {
      for (let i = 1; i <= this.pageNumber; i++) {
        this.doc.setPage(i);
        this.addFooter();
      }
    }
    const output = this.doc.output('arraybuffer');
    if (!(output instanceof ArrayBuffer)) {
      throw new TypeError('PDF exporter did not produce an ArrayBuffer');
    }
    downloadBinaryFile(output, filename, 'application/pdf');
  }

  public exportResearchReport(report: ResearchReport, input: ResearchInput) {
    if (this.settings.includeCoverPage) {
      this.doc
        .setFontSize(PDF_CONSTANTS.FONT_SIZES.TITLE)
        .setFont('helvetica', 'bold')
        .text('AI Research Report', this.pageWidth / 2, 60, { align: 'center' });
      this.doc
        .setFontSize(PDF_CONSTANTS.FONT_SIZES.H1)
        .setFont('helvetica', 'normal')
        .text(input.researchTopic, this.pageWidth / 2, 75, {
          align: 'center',
          maxWidth: this.pageWidth - 60,
        });
      this.doc
        .setFontSize(PDF_CONSTANTS.FONT_SIZES.BODY)
        .setFont('helvetica', 'italic')
        .setTextColor(PDF_CONSTANTS.COLORS.TEXT_SECONDARY);
      this.doc.text(`Generated on ${new Date().toLocaleDateString()}`, this.pageWidth / 2, 95, {
        align: 'center',
      });
      this.doc.text(formatReportReleaseLabel(report), this.pageWidth / 2, 105, { align: 'center' });
      if (this.settings.preparedFor) {
        this.doc.text(`Prepared for: ${this.settings.preparedFor}`, this.pageWidth / 2, 115, {
          align: 'center',
        });
      }
      this.doc
        .setFontSize(PDF_CONSTANTS.FONT_SIZES.H2)
        .setFont('helvetica', 'bold')
        .setTextColor(PDF_CONSTANTS.COLORS.TEXT_PRIMARY);
      this.doc.text('Research Parameters', this.pageWidth / 2, 130, { align: 'center' });
      this.doc
        .setFontSize(PDF_CONSTANTS.FONT_SIZES.BODY)
        .setFont('helvetica', 'normal')
        .setTextColor(PDF_CONSTANTS.COLORS.TEXT_SECONDARY);
      const params = [
        `Date Range: Last ${input.dateRange} years`,
        `Article Types: ${input.articleTypes.join(', ') || 'Any'}`,
        `Synthesis Focus: ${input.synthesisFocus}`,
        `Articles Scanned: ${input.maxArticlesToScan}`,
        `Articles Synthesized: ${input.topNToSynthesize}`,
      ];
      this.doc.text(params.join('\n'), this.pageWidth / 2, 140, { align: 'center' });
      this.addPage();
    }

    if (this.settings.includeToc) {
      if (this.settings.includeSynthesis)
        this.tocEntries.push({ title: 'Executive Synthesis', page: this.pageNumber });
      if (this.settings.includeInsights)
        this.tocEntries.push({ title: 'AI-Generated Insights', page: this.pageNumber });
      this.tocEntries.push({
        title: `Ranked Articles (Top ${report.rankedArticles.length})`,
        page: -1,
      });
      if (this.settings.includeQueries)
        this.tocEntries.push({ title: 'Generated PubMed Queries', page: -1 });
      const tocPage = this.pageNumber;
      this.addPage();

      if (this.settings.includeSynthesis) {
        this.addSectionTitle('Executive Synthesis', { addToToc: false });
        this.addBodyText(report.synthesis);
      }
      if (this.settings.includeInsights) {
        this.addSectionTitle('AI-Generated Insights', { addToToc: false });
        report.aiGeneratedInsights.forEach((insight) => {
          this.checkPageBreak(25);
          this.addKeyValue('Question:', insight.question);
          this.addKeyValue('Answer:', insight.answer);
          this.addKeyValue('Sources (PMID):', insight.supportingArticles.join(', '));
          this.currentY += 5;
        });
      }

      const rankedArticlesTocIndex = this.tocEntries.findIndex((e) =>
        e.title.startsWith('Ranked Articles'),
      );
      if (rankedArticlesTocIndex !== -1)
        this.tocEntries[rankedArticlesTocIndex].page = this.pageNumber;
      this.addSectionTitle(`Ranked Articles (Top ${report.rankedArticles.length})`, {
        addToToc: false,
      });
      report.rankedArticles.forEach((article, index) => this.addArticle(article, index));

      if (this.settings.includeQueries) {
        const queriesTocIndex = this.tocEntries.findIndex((e) =>
          e.title.startsWith('Generated PubMed Queries'),
        );
        if (queriesTocIndex !== -1) this.tocEntries[queriesTocIndex].page = this.pageNumber;
        this.addSectionTitle('Generated PubMed Queries', { addToToc: false });
        report.generatedQueries.forEach((q) => {
          this.checkPageBreak(20);
          this.addKeyValue('Query:', q.query);
          this.addKeyValue('Explanation:', q.explanation);
          this.currentY += 5;
        });
      }
      this.doc.setPage(tocPage);
      this.currentY = PDF_CONSTANTS.MARGIN;
      this.addTableOfContents();
    }

    this.save(`report_${input.researchTopic.substring(0, 20).replace(/\s/g, '_')}.pdf`);
  }

  public exportKnowledgeBase(
    articles: AggregatedArticle[],
    findRelatedInsights: (
      pmid: string,
    ) => { question: string; answer: string; supportingArticles: string[] }[],
  ) {
    if (this.settings.includeCoverPage) {
      this.doc
        .setFontSize(PDF_CONSTANTS.FONT_SIZES.TITLE)
        .setFont('helvetica', 'bold')
        .text('Knowledge Base Export', this.pageWidth / 2, 80, { align: 'center' });
      this.doc
        .setFontSize(PDF_CONSTANTS.FONT_SIZES.H1)
        .setFont('helvetica', 'normal')
        .text(this.documentTitle, this.pageWidth / 2, 95, {
          align: 'center',
          maxWidth: this.pageWidth - 60,
        });
      this.doc
        .setFontSize(PDF_CONSTANTS.FONT_SIZES.BODY)
        .setFont('helvetica', 'italic')
        .setTextColor(PDF_CONSTANTS.COLORS.TEXT_SECONDARY);
      this.doc.text(
        `Exported ${articles.length} articles on ${new Date().toLocaleDateString()}`,
        this.pageWidth / 2,
        110,
        { align: 'center' },
      );
      if (this.settings.preparedFor) {
        this.doc.text(`Prepared for: ${this.settings.preparedFor}`, this.pageWidth / 2, 120, {
          align: 'center',
        });
      }
      this.addPage();
    }

    this.addSectionTitle('Exported Articles', {});
    articles.forEach((article, index) => {
      this.addArticle(article, index);
      const insights = findRelatedInsights(article.pmid);
      if (this.settings.includeInsights && insights.length > 0) {
        this.checkPageBreak(10);
        this.addKeyValue(
          'Related Insights:',
          `${insights.length} insight(s) linked to this article.`,
        );
      }
      this.currentY += 10;
      if (index < articles.length - 1) {
        this.checkPageBreak(10);
        this.doc
          .setDrawColor(PDF_CONSTANTS.COLORS.LINE)
          .line(
            PDF_CONSTANTS.MARGIN,
            this.currentY,
            this.pageWidth - PDF_CONSTANTS.MARGIN,
            this.currentY,
          );
        this.currentY += 10;
      }
    });
    this.save(
      `knowledge_base_export_${this.documentTitle.substring(0, 20).replace(/\s/g, '_')}.pdf`,
    );
  }
}

/** Export a research report as a multi-section PDF (cover/TOC optional). */
export const exportToPdf = (
  report: ResearchReport,
  input: ResearchInput,
  settings: Settings['export']['pdf'],
): void => {
  const { report: sanitizedReport } = sanitizeReportForExport(report);
  const exporter = new PdfExporter(input.researchTopic, settings);
  exporter.exportResearchReport(sanitizedReport, input);
};

/** Export knowledge-base articles (and related insights) as PDF. */
export const exportKnowledgeBaseToPdf = (
  articlesToExport: AggregatedArticle[],
  title: string,
  findRelatedInsights: (
    pmid: string,
  ) => { question: string; answer: string; supportingArticles: string[] }[],
  settings: Settings['export']['pdf'],
): void => {
  const exporter = new PdfExporter(title, settings);
  exporter.exportKnowledgeBase(articlesToExport, findRelatedInsights);
};
