import React, { useMemo, useId, useState } from 'react';
import type { ResearchAnalysis, SimilarArticle, OnlineFindings } from '../types';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { WebIcon } from './icons/WebIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { useTranslation } from '../hooks/useTranslation';

/** Markdown → HTML via marked, then DOMPurify (same pattern as ReportDisplay). */
const secureMarkdownToHtml = (text: string): string => {
  if (!text) return '';
  const rawMarkup = marked.parse(text.trim(), { breaks: true, gfm: true }) as string;
  return DOMPurify.sanitize(rawMarkup);
};

const AccordionSection: React.FC<{
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `accordion-panel-${id}`;
  const buttonId = `accordion-button-${id}`;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-brand-accent hover:bg-surface-hover focus-ring-aa transition-colors"
      >
        <div className="flex items-center">{title}</div>
        <ChevronDownIcon
          className={`h-6 w-6 transform transition-transform duration-300 text-text-secondary ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
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

const SKELETON_SLOT_IDS = ['sk-a', 'sk-b', 'sk-c', 'sk-d', 'sk-e'] as const;

const SkeletonLoader: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-3 animate-pulse ${className}`} data-testid="research-skeleton" aria-busy>
    {SKELETON_SLOT_IDS.slice(0, lines).map((slotId) => (
      <div key={slotId} className="p-3 rounded-md bg-surface border border-border/70">
        <div className="h-4 w-3/4 rounded bg-border" />
        <div className="mt-2 h-2 w-1/4 rounded bg-border" />
        <div className="mt-3 h-2 w-5/6 rounded bg-border" />
      </div>
    ))}
  </div>
);

export type ResearchResultsPanelProps = {
  analysis: ResearchAnalysis;
  onClearResearch: () => void;
  onStartNewReview: (topic: string) => void;
  similarArticlesState: {
    loading: boolean;
    error: string | null;
    articles: SimilarArticle[] | null;
  };
  onlineFindingsState: { loading: boolean; error: string | null; findings: OnlineFindings | null };
};

const KeyFindingsList: React.FC<{ findings: string[] }> = ({ findings }) => {
  const { t } = useTranslation();
  return (
    <AccordionSection
      title={
        <>
          <SparklesIcon className="h-5 w-5 mr-2" />
          {t('research.section.findings')}
        </>
      }
      defaultOpen
    >
      <ul className="list-disc pl-5 space-y-2 text-text-primary/90">
        {findings.map((finding) => (
          <li key={finding}>{finding}</li>
        ))}
      </ul>
    </AccordionSection>
  );
};

const SimilarArticlesSection: React.FC<{
  state: ResearchResultsPanelProps['similarArticlesState'];
}> = ({ state }) => {
  const { t } = useTranslation();
  return (
    <AccordionSection
      title={
        <>
          <BookOpenIcon className="h-5 w-5 mr-2" />
          {t('research.section.similar')}
        </>
      }
      defaultOpen
    >
      <div className="space-y-3" aria-live="polite" aria-busy={state.loading}>
        {state.loading && <SkeletonLoader lines={3} />}
        {state.error && (
          <p className="text-red-400 text-sm text-center">{t('research.error.similar')}</p>
        )}
        {state.articles && state.articles.length === 0 && (
          <p className="text-text-secondary text-sm text-center">{t('research.similar.empty')}</p>
        )}
        {state.articles?.map((similar) => (
          <div
            key={similar.pmid}
            className="bg-surface p-3 rounded-md border border-border/70 animate-fadeIn"
          >
            <a
              href={`https://pubmed.ncbi.nlm.nih.gov/${similar.pmid}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-text-primary hover:text-brand-accent transition-colors"
            >
              {similar.title}
            </a>
            <p className="mt-1 text-xs text-text-secondary/80 italic">PMID: {similar.pmid}</p>
            <p className="mt-2 text-xs text-text-secondary">
              <strong>{t('research.similar.reasoning')}</strong> {similar.reason}
            </p>
          </div>
        ))}
      </div>
    </AccordionSection>
  );
};

const OnlineFindingsSection: React.FC<{
  state: ResearchResultsPanelProps['onlineFindingsState'];
}> = ({ state }) => {
  const { t } = useTranslation();
  return (
    <AccordionSection
      title={
        <>
          <WebIcon className="h-5 w-5 mr-2" />
          {t('research.section.online')}
        </>
      }
      defaultOpen
    >
      <div aria-live="polite" aria-busy={state.loading}>
        {state.loading && <SkeletonLoader lines={1} className="p-3" />}
        {state.error && (
          <p className="text-red-400 text-sm text-center">{t('research.error.online')}</p>
        )}
        {state.findings && (
          <div className="bg-surface p-3 rounded-md border border-border/70 animate-fadeIn">
            <h5 className="font-semibold text-text-primary mb-2">{t('research.online.summary')}</h5>
            <p className="text-sm text-text-secondary/90 mb-3">{state.findings.summary}</p>
            {state.findings.sources.length > 0 && (
              <>
                <h6 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  {t('research.online.sources')}
                </h6>
                <ul className="mt-2 space-y-1">
                  {state.findings.sources.map((source) => (
                    <li key={source.uri}>
                      <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-accent hover:underline truncate block"
                        title={source.title}
                      >
                        {source.title || source.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </AccordionSection>
  );
};

const ContinuationCta: React.FC<{
  topic: string;
  onStartNewReview: (topic: string) => void;
}> = ({ topic, onStartNewReview }) => {
  const { t } = useTranslation();
  return (
    <div className="p-4 bg-background/50">
      <div className="p-4 bg-surface border border-brand-accent/30 rounded-lg text-center">
        <h4 className="font-semibold text-text-primary">{t('research.continue.title')}</h4>
        <p className="text-sm text-text-secondary mt-1 mb-3">{t('research.continue.body')}</p>
        <code className="text-xs bg-background p-2 rounded-md text-brand-accent border border-border block truncate mb-3">
          {topic}
        </code>
        <button
          type="button"
          onClick={() => onStartNewReview(topic)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90"
        >
          <DocumentIcon className="h-5 w-5 mr-2" />
          {t('research.continue.cta')}
        </button>
      </div>
    </div>
  );
};

export const ResearchResultsPanel: React.FC<ResearchResultsPanelProps> = ({
  analysis,
  onClearResearch,
  onStartNewReview,
  similarArticlesState,
  onlineFindingsState,
}) => {
  const { t } = useTranslation();

  const summaryHtml = useMemo(() => {
    return analysis.summary ? secureMarkdownToHtml(analysis.summary) : '';
  }, [analysis.summary]);

  return (
    <div className="mt-8 bg-surface rounded-lg border border-border shadow-2xl shadow-black/20 animate-fadeIn">
      <div className="p-4 flex justify-between items-center border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">{t('research.result.complete')}</h3>
        <button
          type="button"
          onClick={onClearResearch}
          className="flex items-center text-sm px-3 py-1.5 rounded-md text-text-primary bg-background hover:bg-surface-hover border border-border transition-colors"
        >
          <XCircleIcon className="h-4 w-4 mr-2" />
          {t('research.result.clear')}
        </button>
      </div>
      {analysis.summary && (
        <AccordionSection title={t('research.section.summary')} defaultOpen>
          <div
            className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: summaryHtml }} // skipcq: JS-0440
          />
        </AccordionSection>
      )}
      {analysis.keyFindings?.length > 0 && <KeyFindingsList findings={analysis.keyFindings} />}
      <SimilarArticlesSection state={similarArticlesState} />
      <OnlineFindingsSection state={onlineFindingsState} />
      {analysis.synthesizedTopic && (
        <ContinuationCta topic={analysis.synthesizedTopic} onStartNewReview={onStartNewReview} />
      )}
    </div>
  );
};
