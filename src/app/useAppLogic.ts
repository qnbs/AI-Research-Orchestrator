import { useState, useCallback } from 'react';
import { KnowledgeBaseEntry, AuthorProfile, KnowledgeBaseFilter } from '../types';
import type { InitialJournalEntry } from '../components/JournalsView';
import { useSettings } from '../contexts/SettingsContext';
import { usePresets } from '../contexts/PresetContext';
import { useResearchAssistant } from '../hooks/useResearchAssistant';
import { useDocumentAppearance } from '../hooks/useDocumentAppearance';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useUI } from '../hooks/useUI';
import type { View } from '../types/ui';
import { useChat } from '../hooks/useChat';
import { useHaptic } from '../hooks/useHaptic';
import { useTranslation } from '../hooks/useTranslation';
import { useResearchSession } from './useResearchSession';
import { useAppChromeEffects } from './useAppChromeEffects';
import { useKbExports } from './useKbExports';

/**
 * App-wide orchestration: composes domain hooks (research session, chrome
 * effects, KB exports) with navigation and cross-view linking.
 */
export function useAppLogic() {
  const { isLoading } = useKnowledgeBase();
  const { isSettingsLoading, settings, updateSettings } = useSettings();
  useDocumentAppearance(settings);
  const { arePresetsLoading } = usePresets();
  const { t } = useTranslation();

  const [selectedAuthorProfile, setSelectedAuthorProfile] = useState<AuthorProfile | null>(null);
  const [selectedJournalEntry, setSelectedJournalEntry] = useState<InitialJournalEntry | null>(
    null,
  );
  const [pendingJournalQuery, setPendingJournalQuery] = useState<string | null>(null);
  const [selectedKbPmids, setSelectedKbPmids] = useState<string[]>([]);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [checkpointRefreshToken, setCheckpointRefreshToken] = useState(0);
  const [settingsResetToken, setSettingsResetToken] = useState(0);
  const [initialHelpTab, setInitialHelpTab] = useState<string | null>(null);
  const [prefilledTopic, setPrefilledTopic] = useState<string | null>(null);
  const [kbFilter, setKbFilter] = useState<KnowledgeBaseFilter>({
    searchTerm: '',
    selectedTopics: [],
    selectedTags: [],
    selectedArticleTypes: [],
    selectedJournals: [],
    showOpenAccessOnly: false,
  });

  const haptic = useHaptic();
  const {
    currentView,
    notification,
    setNotification,
    isSettingsDirty,
    setIsSettingsDirty,
    pendingNavigation,
    setPendingNavigation,
    setCurrentView,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setInstallPromptEvent,
    setIsPwaInstalled,
  } = useUI();
  const { knowledgeBase, saveReport, clearKnowledgeBase, uniqueArticles, updateTags } =
    useKnowledgeBase();

  const refreshCheckpoints = useCallback(() => {
    setCheckpointRefreshToken((n) => n + 1);
  }, []);

  const research = useResearchSession({
    aiSettings: settings.ai,
    autoSaveReports: settings.defaults.autoSaveReports,
    setCurrentView,
    saveReport,
    setNotification,
    t,
    haptic,
    updateTags,
    onCheckpointsChanged: refreshCheckpoints,
  });

  const { chatHistory, isChatting, sendMessage } = useChat(
    research.report,
    research.reportStatus,
    settings.ai,
  );

  const {
    isLoading: isResearching,
    phase: researchPhase,
    error: researchError,
    analysis: researchAnalysis,
    similar,
    online,
    startResearch,
    clearResearch,
  } = useResearchAssistant(settings.ai, setCurrentView);

  const clearSelectedKbPmids = useCallback(() => setSelectedKbPmids([]), []);

  useAppChromeEffects({
    currentView,
    setCurrentView,
    setIsCommandPaletteOpen,
    setInstallPromptEvent,
    setIsPwaInstalled,
    t,
    selectedKbPmidsLength: selectedKbPmids.length,
    clearSelectedKbPmids,
    reportStatus: research.reportStatus,
    checkpointRefreshToken,
    setResumeCheckpoints: research.setResumeCheckpoints,
  });

  const { showExportModal, setShowExportModal, handleExportSelection, handleConfirmExport } =
    useKbExports({
      uniqueArticles,
      selectedKbPmids,
      knowledgeBase,
      exportSettings: settings.export,
      setNotification,
      t,
    });

  const handleClearKnowledgeBase = useCallback(async () => {
    await clearKnowledgeBase();
    setSettingsResetToken(Date.now());
  }, [clearKnowledgeBase]);

  const handleViewChange = useCallback(
    (view: View) => {
      if (isSettingsDirty) {
        setPendingNavigation(view);
      } else {
        setCurrentView(view);
      }
    },
    [isSettingsDirty, setCurrentView, setPendingNavigation],
  );

  const handleConfirmNavigation = useCallback(() => {
    if (pendingNavigation) {
      setIsSettingsDirty(false);
      setCurrentView(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, setCurrentView, setPendingNavigation, setIsSettingsDirty]);

  const handleCompleteOnboarding = useCallback(() => {
    updateSettings((s) => ({ ...s, hasCompletedOnboarding: true }));
  }, [updateSettings]);

  const handleFilterChange = useCallback((newFilter: Partial<KnowledgeBaseFilter>) => {
    setKbFilter((prev) => ({ ...prev, ...newFilter }));
  }, []);

  const handlePrefillConsumed = useCallback(() => {
    setPrefilledTopic(null);
  }, []);

  const handleStartNewReviewFromTopic = useCallback(
    (topic: string) => {
      setPrefilledTopic(topic);
      setCurrentView('orchestrator');
    },
    [setCurrentView],
  );

  const { openStoredResearchEntry } = research;

  const handleViewEntry = useCallback(
    (entry: KnowledgeBaseEntry) => {
      if (entry.sourceType === 'research') {
        openStoredResearchEntry(entry);
      } else if (entry.sourceType === 'author') {
        setSelectedAuthorProfile(entry.profile);
        setCurrentView('authors');
      } else if (entry.sourceType === 'journal') {
        setSelectedJournalEntry({ profile: entry.journalProfile, articles: entry.articles });
        setCurrentView('journals');
      }
    },
    [openStoredResearchEntry, setCurrentView],
  );

  const handleAuthorProfileViewed = useCallback(() => {
    setSelectedAuthorProfile(null);
  }, []);

  const handleJournalEntryViewed = useCallback(() => {
    setSelectedJournalEntry(null);
  }, []);

  /** Cross-link: open the Journal Hub with a prefilled journal name (e.g. from KB detail panel). */
  const handleAnalyzeJournalByName = useCallback(
    (journalName: string) => {
      setPendingJournalQuery(journalName);
      setCurrentView('journals');
    },
    [setCurrentView],
  );

  const handleJournalQueryConsumed = useCallback(() => {
    setPendingJournalQuery(null);
  }, []);

  const handleNavigateToHelp = useCallback(
    (tab: 'about' | 'faq') => {
      setInitialHelpTab(tab);
      setCurrentView('help');
    },
    [setCurrentView],
  );

  return {
    isLoading,
    isSettingsLoading,
    arePresetsLoading,
    settings,
    localResearchInput: research.localResearchInput,
    setLocalResearchInput: research.setLocalResearchInput,
    report: research.report,
    reportStatus: research.reportStatus,
    error: research.error,
    currentPhase: research.currentPhase,
    selectedAuthorProfile,
    selectedJournalEntry,
    pendingJournalQuery,
    currentView,
    notification,
    setNotification,
    pendingNavigation,
    setPendingNavigation,
    isCommandPaletteOpen,
    knowledgeBase,
    uniqueArticles,
    isCurrentReportSaved: research.isCurrentReportSaved,
    selectedKbPmids,
    setSelectedKbPmids,
    showExportModal,
    setShowExportModal,
    isQuickAddModalOpen,
    setIsQuickAddModalOpen,
    resumeCheckpoints: research.resumeCheckpoints,
    chatHistory,
    isChatting,
    sendMessage,
    isResearching,
    researchPhase,
    researchError,
    researchAnalysis,
    similar,
    online,
    startResearch,
    clearResearch,
    settingsResetToken,
    initialHelpTab,
    setInitialHelpTab,
    prefilledTopic,
    kbFilter,
    t,
    handleDiscardCheckpoint: research.handleDiscardCheckpoint,
    handleRestoreCheckpoint: research.handleRestoreCheckpoint,
    handleFormSubmit: research.handleFormSubmit,
    handleRerunCheckpoint: research.handleRerunCheckpoint,
    handleSaveReport: research.handleSaveReport,
    handleNewSearch: research.handleNewSearch,
    handleClearKnowledgeBase,
    handleViewChange,
    handleConfirmNavigation,
    handleCompleteOnboarding,
    handleFilterChange,
    handlePrefillConsumed,
    handleStartNewReviewFromTopic,
    handleViewEntry,
    handleAuthorProfileViewed,
    handleJournalEntryViewed,
    handleAnalyzeJournalByName,
    handleJournalQueryConsumed,
    handleTagsUpdate: research.handleTagsUpdate,
    handleExportSelection,
    handleConfirmExport,
    handleNavigateToHelp,
  };
}
