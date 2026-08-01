import React, { useState } from 'react';
import type { ResearchAnalysis, SimilarArticle, OnlineFindings } from '../types';
import { LoadingIndicator } from './LoadingIndicator';
import { BeakerIcon } from './icons/BeakerIcon';
import { useTranslation } from '../hooks/useTranslation';
import { RESEARCH_PHASE_ANALYZING } from '../i18n/researchViewTranslations';
import { ResearchResultsPanel } from './ResearchResultsPanel';

interface ResearchViewProps {
  onStartNewReview: (topic: string) => void;
  onStartResearch: (queryText: string) => void;
  onClearResearch: () => void;
  isLoading: boolean;
  phase: string;
  error: string | null;
  analysis: ResearchAnalysis | null;
  similarArticlesState: {
    loading: boolean;
    error: string | null;
    articles: SimilarArticle[] | null;
  };
  onlineFindingsState: { loading: boolean; error: string | null; findings: OnlineFindings | null };
}

const ResearchEmptyState: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="text-center text-text-secondary p-8 flex flex-col items-center justify-center h-full mt-10">
      <BeakerIcon className="h-24 w-24 text-border mb-6" />
      <h2 className="text-2xl font-bold text-text-primary mb-3">{t('research.empty.title')}</h2>
      <p className="max-w-xl mx-auto text-base">{t('research.empty.body')}</p>
    </div>
  );
};

const ResearchView: React.FC<ResearchViewProps> = ({
  onStartNewReview,
  onStartResearch,
  onClearResearch,
  isLoading,
  phase,
  error,
  analysis,
  similarArticlesState,
  onlineFindingsState,
}) => {
  const { t } = useTranslation();
  const [textQuery, setTextQuery] = useState('');

  const analyzingLabel = t('research.phase.analyzing');
  const researchPhases = [analyzingLabel];
  const researchPhaseDetails = {
    [analyzingLabel]: [
      t('research.phase.detail.processing'),
      t('research.phase.detail.concepts'),
      t('research.phase.detail.searching'),
    ],
  };
  const displayPhase = !phase || phase === RESEARCH_PHASE_ANALYZING ? analyzingLabel : phase;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartResearch(textQuery);
  };

  let body: React.ReactNode = <ResearchEmptyState />;
  if (isLoading) {
    body = (
      <div className="mt-8">
        <LoadingIndicator
          title={t('research.title')}
          phase={displayPhase}
          phases={researchPhases}
          phaseDetails={researchPhaseDetails}
        />
      </div>
    );
  } else if (error) {
    body = (
      <div className="mt-8 text-center text-red-400 font-semibold p-8 bg-surface rounded-lg border border-red-500/20">
        {error}
      </div>
    );
  } else if (analysis) {
    body = (
      <ResearchResultsPanel
        analysis={analysis}
        onClearResearch={onClearResearch}
        onStartNewReview={onStartNewReview}
        similarArticlesState={similarArticlesState}
        onlineFindingsState={onlineFindingsState}
      />
    );
  }

  const isSubmitDisabled = isLoading || !textQuery.trim();

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <div className="bg-surface rounded-lg border border-border shadow-2xl shadow-black/20 p-6">
        <h2 className="text-xl font-bold mb-4 text-brand-accent">{t('research.title')}</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="research-assistant-query" className="sr-only">
            {t('research.title')}
          </label>
          <textarea
            id="research-assistant-query"
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
            rows={5}
            className="block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm placeholder-text-secondary"
            placeholder={t('research.placeholder')}
            disabled={isLoading || !!analysis}
          />
          <button
            type="submit"
            disabled={isSubmitDisabled || !!analysis}
            className="w-full mt-4 inline-flex justify-center items-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-semibold rounded-md text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent disabled:bg-border disabled:text-text-secondary disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('research.submit.loading')}
              </>
            ) : (
              <>
                <BeakerIcon className="h-5 w-5 mr-2" />
                {t('research.submit')}
              </>
            )}
          </button>
        </form>
      </div>

      {body}
    </div>
  );
};

export default ResearchView;
