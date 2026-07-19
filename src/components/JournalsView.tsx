import React from 'react';
import { JournalsViewProvider, useJournalsView } from './journals/JournalsViewContext';
import { InitialJournalEntry, useJournalsViewLogic } from './journals/useJournalsViewLogic';
import { JournalProfile } from '../types';
import {
  FeaturedJournalsView,
  JournalDisambiguationView,
  JournalLandingView,
} from './journals/JournalsSubComponents';
import { JournalProfileView } from './journals/JournalProfileView';
import { LoadingIndicator } from './LoadingIndicator';
import { useTranslation } from '../hooks/useTranslation';

interface JournalsViewProps {
  initialEntry?: InitialJournalEntry | null;
  onViewedInitialEntry?: () => void;
  onStartResearch: (topic: string) => void;
  initialQuery?: string | null;
  onInitialQueryConsumed?: () => void;
}

const JournalsViewContent: React.FC<{ onStartResearch: (topic: string) => void }> = ({
  onStartResearch,
}) => {
  const { view, isLoading, loadingPhase, journalLoadingPhases, journalPhaseDetails } =
    useJournalsView();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <LoadingIndicator
        title={t('journals.loading.title')}
        phase={loadingPhase}
        phases={journalLoadingPhases}
        phaseDetails={journalPhaseDetails}
        footerText={t('journals.loading.footer')}
      />
    );
  }

  switch (view) {
    case 'disambiguation':
      return <JournalDisambiguationView />;
    case 'profile':
      return <JournalProfileView onStartResearch={onStartResearch} />;
    case 'landing':
    default:
      return (
        <div className="space-y-12">
          <JournalLandingView />
          <div className="my-12 h-px w-1/2 mx-auto bg-border"></div>
          <FeaturedJournalsView />
        </div>
      );
  }
};

const JournalsView: React.FC<JournalsViewProps> = ({
  initialEntry = null,
  onViewedInitialEntry = () => {},
  onStartResearch,
  initialQuery = null,
  onInitialQueryConsumed = () => {},
}) => {
  const logic = useJournalsViewLogic(initialEntry, onViewedInitialEntry, {
    initialQuery,
    onInitialQueryConsumed,
  });

  return (
    <JournalsViewProvider value={logic}>
      <div className="max-w-6xl mx-auto animate-fadeIn">
        <JournalsViewContent onStartResearch={onStartResearch} />
      </div>
    </JournalsViewProvider>
  );
};

export default JournalsView;
export type { InitialJournalEntry };
export type { JournalProfile };
