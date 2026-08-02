import React, { useState, useId, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ResearchReport, ResearchInput, AggregatedArticle, ChatMessage } from '../types';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SearchIcon } from './icons/SearchIcon';
import { BookmarkSquareIcon } from './icons/BookmarkSquareIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { PdfIcon } from './icons/PdfIcon';
import { CsvIcon } from './icons/CsvIcon';
import { ConfirmationModal } from './ConfirmationModal';
import { exportToPdf, exportToCsv, exportInsightsToCsv } from '../services/exportService';
import { XCircleIcon } from './icons/XCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { useSettings } from '../contexts/SettingsContext';
import { WebIcon } from './icons/WebIcon';
import { useUI } from '../contexts/UIContext';
import { useTranslation } from '../hooks/useTranslation';
import { ExportIcon } from './icons/ExportIcon';
import { ChatInterface } from './ChatInterface';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { ReportArticleCard } from './ReportArticleCard';
import { stableInsightKey } from '../lib/stableReactKeys';
import {
  legacyArticleKeyUrl,
  parseLegacyArticleKey,
  sourceIdentifierLabelKey,
  formatSourceIdentifierValue,
} from '../lib/sourceIdentifier';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { safeLogError } from '../lib/safeLog';

interface ReportDisplayProps {
  report: ResearchReport;
  input: ResearchInput;
  isSaved: boolean;
  onSave: () => void;
  onNewSearch: () => void;
  onUpdateInput: (newInput: ResearchInput) => void;
  onTagsUpdate: (pmid: string, newTags: string[]) => void;
  chatHistory: ChatMessage[];
  isChatting: boolean;
  onSendMessage: (message: string) => void;
}

const secureMarkdownToHtml = (text: string): string => {
  if (!text) return '';
  const rawMarkup = marked.parse(text.trim(), { breaks: true, gfm: true }) as string;
  return DOMPurify.sanitize(rawMarkup);
};

const stripMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  const html = marked.parse(markdown) as string;
  const sanitized = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  // To handle potential HTML entities, create a temporary element
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitized;
  return tempDiv.textContent || tempDiv.innerText || '';
};

const AccordionSection: React.FC<{
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
  /** Interactive controls (e.g. a copy button) rendered in the header but
   * outside the toggle <button>, since nesting a button inside a button
   * is invalid HTML and breaks click/keyboard semantics for both. */
  actions?: React.ReactNode;
}> = ({ title, children, defaultOpen = false, count, actions }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `accordion-panel-${id}`;
  const buttonId = `accordion-button-${id}`;

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="group relative flex items-center">
        <button
          type="button"
          id={buttonId}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-text-primary hover:bg-surface-hover focus-ring-aa transition-colors"
        >
          <div className="flex items-center gap-3">
            {title}
            {count !== undefined && (
              <span className="text-sm font-medium bg-border text-text-secondary px-2 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </div>
          <ChevronDownIcon
            className={`h-6 w-6 transform transition-transform duration-300 text-text-secondary mr-10 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {actions && <div className="absolute right-4">{actions}</div>}
      </div>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        inert={!isOpen}
        className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="p-4 bg-background/50">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const ReportDisplay: React.FC<ReportDisplayProps> = React.memo(function ReportDisplay({
  report,
  input,
  isSaved,
  onSave,
  onNewSearch,
  onUpdateInput,
  onTagsUpdate,
  chatHistory,
  isChatting,
  onSendMessage,
}) {
  const [modalState, setModalState] = useState<{
    type: 'pdf' | 'csv' | 'insights' | 'save';
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { settings } = useSettings();
  const { setNotification } = useUI();
  const { t } = useTranslation();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute chart data for the report's articles (Recharts)
  const chartData = useMemo(() => {
    if (!report || !report.rankedArticles || report.rankedArticles.length === 0) return null;

    const yearCounts: Record<string, number> = {};
    report.rankedArticles.forEach((a) => {
      if (a.pubYear) yearCounts[a.pubYear] = (yearCounts[a.pubYear] || 0) + 1;
    });

    const data = Object.keys(yearCounts)
      .sort()
      .map((year) => ({ year, count: yearCounts[year] }));

    return data.length > 0 ? data : null;
  }, [report]);

  const handlePdfExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        exportToPdf(report, input, settings.export.pdf);
      } catch (e) {
        safeLogError('PDF Export failed', e);
      } finally {
        setIsExporting(false);
        setModalState(null);
      }
    }, 50);
  };

  const handleCsvExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const aggregatedArticles: AggregatedArticle[] = report.rankedArticles.map((a) => ({
          ...a,
          sourceTitle: input.researchTopic,
          sourceId: `current-report-${a.pmid}`,
        }));
        exportToCsv(aggregatedArticles, input.researchTopic, settings.export.csv);
      } catch (e) {
        safeLogError('CSV Export failed', e);
      } finally {
        setIsExporting(false);
        setModalState(null);
      }
    }, 50);
  };

  const handleInsightsExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        exportInsightsToCsv(report.aiGeneratedInsights, input.researchTopic);
      } catch (e) {
        safeLogError('Insights CSV Export failed', e);
      } finally {
        setIsExporting(false);
        setModalState(null);
      }
    }, 50);
  };

  const synthesisTrustLevel =
    report.groundedSynthesis?.trustLevel ??
    (report.groundedSynthesis?.mode === 'extractive-template' ? 'verified' : 'narrative-draft');
  const isDemoCorpus =
    report.corpusClass === 'demo-only' ||
    report.retrievalOutcome === 'educational_demo' ||
    report.rankedArticles.some(
      (a) => a.sourceClass === 'demo-synthetic' || a.pmid.startsWith('demo:'),
    );
  const isEmptyRetrieval =
    report.corpusClass === 'empty-retrieval' ||
    report.retrievalOutcome === 'zero_results' ||
    report.retrievalOutcome === 'retrieval_failed' ||
    report.retrievalOutcome === 'offline_without_demo';
  // Demo corpora must never show the green "verified" trust chrome.
  const showNarrativeDraftBanner =
    !isDemoCorpus && !isEmptyRetrieval && synthesisTrustLevel === 'narrative-draft';

  const handleCopySynthesis = useCallback(() => {
    const plainText = stripMarkdown(report.synthesis);
    navigator.clipboard.writeText(plainText).then(() => {
      setNotification({
        id: Date.now(),
        message: t('report.synthesis.copiedToast'),
        type: 'success',
      });
    });
  }, [report.synthesis, setNotification, t]);

  return (
    <>
      <div className="animate-fadeIn bg-surface rounded-lg border border-border flex flex-col shadow-lg">
        <div className="flex-shrink-0 border-b border-border p-4 sm:p-6">
          {isDemoCorpus && (
            <div
              role="status"
              className="mb-4 rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-900 dark:text-amber-100"
            >
              {t('report.demoCorpus.banner')}
            </div>
          )}
          {isEmptyRetrieval && !isDemoCorpus && (
            <div
              role="status"
              className="mb-4 rounded-md border border-border bg-surface-hover px-3 py-2 text-sm text-text-secondary"
            >
              {t('report.emptyRetrieval.banner')}
            </div>
          )}
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">{t('report.title')}</h2>
              <div className="mt-1 text-text-secondary max-w-xl flex items-center gap-2">
                <span>{t('report.topicLabel')}</span>
                {isSaved ? (
                  <span className="font-semibold text-text-primary">{input.researchTopic}</span>
                ) : (
                  <input
                    type="text"
                    value={input.researchTopic}
                    onChange={(e) => onUpdateInput({ ...input, researchTopic: e.target.value })}
                    className="w-full bg-input-bg border border-border rounded-md py-1 px-2 text-base font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    aria-label={t('report.topic.editAria')}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onNewSearch}
                title={t('report.newSearch.title')}
                className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover"
              >
                <XCircleIcon className="h-5 w-5 mr-2" />
                {t('report.newSearch')}
              </button>
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  title={t('report.export.optionsTitle')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-primary hover:bg-brand-secondary"
                >
                  <ExportIcon className="h-5 w-5 mr-2" />
                  {t('report.export')}
                  <ChevronDownIcon
                    className={`h-4 w-4 ml-1.5 transform transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isExportMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-md shadow-lg z-10 animate-fadeIn"
                    style={{ animationDuration: '150ms' }}
                  >
                    <button
                      onClick={() => {
                        setModalState({ type: 'pdf' });
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-hover"
                    >
                      <PdfIcon className="h-4 w-4" /> {t('report.export.pdf')}
                    </button>
                    <button
                      onClick={() => {
                        setModalState({ type: 'csv' });
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-hover"
                    >
                      <CsvIcon className="h-4 w-4" /> {t('report.export.csv')}
                    </button>
                    <button
                      onClick={() => {
                        setModalState({ type: 'insights' });
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-hover"
                    >
                      <SparklesIcon className="h-4 w-4" /> {t('report.export.insightsCsv')}
                    </button>
                  </div>
                )}
              </div>
              {isSaved ? (
                <div className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-green-300 bg-green-500/10 border border-green-500/20">
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {t('report.saved')}
                </div>
              ) : (
                <button
                  onClick={() => setModalState({ type: 'save' })}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90"
                >
                  <BookmarkSquareIcon className="h-5 w-5 mr-2" />
                  {t('report.save')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-grow">
          <AccordionSection
            title={<span>{t('report.accordion.synthesis')}</span>}
            actions={
              <button
                type="button"
                onClick={handleCopySynthesis}
                className="p-1.5 rounded-md text-text-secondary hover:bg-background hover:text-brand-accent opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent transition-opacity"
                aria-label={t('report.synthesis.copyAria')}
              >
                <ClipboardIcon className="h-4 w-4" />
              </button>
            }
            defaultOpen
          >
            {showNarrativeDraftBanner ? (
              <p
                className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
                role="status"
              >
                {t('report.synthesis.narrativeDraftBanner')}
              </p>
            ) : !isDemoCorpus &&
              !isEmptyRetrieval &&
              report.groundedSynthesis?.trustLevel === 'verified' ? (
              <p
                className="mb-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200"
                role="status"
              >
                {t('report.synthesis.verifiedBanner')}
              </p>
            ) : null}
            <div
              className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: secureMarkdownToHtml(report.synthesis) }} // skipcq: JS-0440
            />
          </AccordionSection>
          <AccordionSection
            title={t('report.accordion.insights')}
            count={report.aiGeneratedInsights.length}
          >
            <div className="space-y-4">
              {report.aiGeneratedInsights.map((insight) => (
                <div
                  key={stableInsightKey(insight)}
                  className="bg-background p-3 rounded-md border border-border"
                >
                  <p className="font-semibold text-brand-accent text-sm">{insight.question}</p>
                  <p className="mt-1 text-sm text-text-primary/90 leading-relaxed">
                    {insight.answer}
                  </p>
                  <div className="mt-3 pt-2 border-t border-border/50">
                    <p className="text-xs text-text-secondary font-semibold mb-1">
                      {t('report.insights.supportingEvidence')}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                      {(insight.supportingArticles || []).map((pmid) => {
                        const id = parseLegacyArticleKey(pmid);
                        const href = legacyArticleKeyUrl(pmid);
                        const label = `${t(sourceIdentifierLabelKey(id))}: ${formatSourceIdentifierValue(id)}`;
                        return href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            key={pmid}
                            className="text-xs text-text-secondary hover:text-brand-accent hover:underline"
                          >
                            {label}
                          </a>
                        ) : (
                          <span key={pmid} className="text-xs text-text-secondary">
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AccordionSection>

          <AccordionSection title={t('report.accordion.visualization')} defaultOpen={false}>
            <div className="p-2">
              {chartData ? (
                <div className="h-64 bg-background border border-border rounded-md p-4">
                  <p className="text-sm font-medium text-text-secondary mb-2">
                    {t('report.chart.timelineTitle')}
                  </p>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={
                          settings.theme === 'dark'
                            ? 'rgba(125, 133, 144, 0.1)'
                            : 'rgba(87, 96, 106, 0.1)'
                        }
                      />
                      <XAxis
                        dataKey="year"
                        tick={{
                          fill: settings.theme === 'dark' ? '#7d8590' : '#57606a',
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{
                          fill: settings.theme === 'dark' ? '#7d8590' : '#57606a',
                          fontSize: 12,
                        }}
                      />
                      <RechartsTooltip />
                      <Bar
                        dataKey="count"
                        name={t('report.chart.publications')}
                        fill="rgba(31, 111, 235, 0.75)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-text-secondary italic">{t('report.chart.empty')}</p>
              )}
            </div>
          </AccordionSection>

          <AccordionSection
            title={t('report.accordion.keywords')}
            count={report.overallKeywords.length}
          >
            <div className="space-y-3 p-2">
              {report.overallKeywords && report.overallKeywords.length > 0 ? (
                [...report.overallKeywords]
                  .sort((a, b) => b.frequency - a.frequency)
                  .map((kw, index) => (
                    <div
                      key={kw.keyword}
                      className="grid grid-cols-4 items-center gap-4 text-sm animate-fadeIn"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <span
                        className="col-span-1 text-text-primary truncate font-medium"
                        title={kw.keyword}
                      >
                        {kw.keyword}
                      </span>
                      <div className="col-span-3 flex items-center">
                        <div className="w-full bg-border rounded-full h-2.5 relative overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-brand-secondary to-brand-accent h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${(kw.frequency / Math.max(1, report.rankedArticles.length)) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="ml-3 font-mono text-xs text-text-secondary w-10 text-right">
                          {kw.frequency} / {report.rankedArticles.length}
                        </span>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-text-secondary italic">{t('report.keywords.empty')}</p>
              )}
            </div>
          </AccordionSection>
          <AccordionSection
            title={t('report.accordion.articles')}
            count={report.rankedArticles.length}
          >
            <div className="space-y-4">
              {report.rankedArticles.map((article, index) => (
                <ReportArticleCard
                  key={article.pmid}
                  article={article}
                  rank={index + 1}
                  onTagsUpdate={onTagsUpdate}
                />
              ))}
            </div>
          </AccordionSection>
          <AccordionSection
            title={t('report.accordion.queries')}
            count={report.generatedQueries.length}
          >
            <div className="space-y-4">
              {report.generatedQueries.map((q) => (
                <div key={q.query} className="bg-background p-3 rounded-md border border-border">
                  <div className="flex items-start">
                    <SearchIcon className="h-5 w-5 text-brand-accent mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-mono text-sm text-text-primary bg-surface border border-border rounded px-2 py-1">
                        {q.query}
                      </p>
                      <p className="mt-2 text-xs text-text-secondary">{q.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AccordionSection>
          {report.sources && report.sources.length > 0 && (
            <AccordionSection
              title={
                <>
                  <WebIcon className="h-5 w-5 mr-3 text-brand-accent" />
                  {t('report.accordion.sources')}
                </>
              }
              count={report.sources.length}
            >
              <div className="space-y-2">
                <p className="text-xs text-text-secondary mb-3">{t('report.sources.intro')}</p>
                {report.sources.map((source) => (
                  <div
                    key={source.uri}
                    className="bg-background p-2 rounded-md border border-border text-sm flex items-center gap-3"
                  >
                    <WebIcon className="h-4 w-4 text-text-secondary flex-shrink-0" />
                    <a
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-accent hover:underline break-all"
                      title={source.title}
                    >
                      {source.title || source.uri}
                    </a>
                  </div>
                ))}
              </div>
            </AccordionSection>
          )}
          <AccordionSection
            title={
              <div className="flex items-center gap-3">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-accent-cyan" />
                <span>{t('report.accordion.chat')}</span>
              </div>
            }
          >
            <ChatInterface
              history={chatHistory}
              isChatting={isChatting}
              onSendMessage={onSendMessage}
            />
          </AccordionSection>
        </div>
      </div>
      {modalState?.type === 'save' && (
        <ConfirmationModal
          onConfirm={() => {
            onSave();
            setModalState(null);
          }}
          onCancel={() => setModalState(null)}
          title={t('report.saveModal.title')}
          message={t('report.saveModal.message')}
          confirmText={t('report.saveModal.confirm')}
          confirmButtonClass="bg-brand-accent hover:bg-opacity-90"
          titleClass="text-brand-accent"
        />
      )}
      {(modalState?.type === 'pdf' ||
        modalState?.type === 'csv' ||
        modalState?.type === 'insights') && (
        <ConfirmationModal
          onConfirm={() => {
            if (modalState.type === 'pdf') handlePdfExport();
            if (modalState.type === 'csv') handleCsvExport();
            if (modalState.type === 'insights') handleInsightsExport();
          }}
          onCancel={() => setModalState(null)}
          title={t('kb.export.confirmExportTitle')}
          message={
            modalState.type === 'insights'
              ? t('kb.export.insightsMessage', { count: report.aiGeneratedInsights.length })
              : t('kb.export.reportMessage', {
                  count: report.rankedArticles.length,
                  format: modalState.type.toUpperCase(),
                })
          }
          confirmText={isExporting ? t('kb.export.exporting') : t('kb.export.confirm')}
          isConfirming={isExporting}
          confirmButtonClass="bg-brand-accent hover:bg-opacity-90"
          titleClass="text-brand-accent"
        />
      )}
    </>
  );
});
