import React, { useEffect, useState, useMemo } from 'react';
import { SettingsViewProvider, useSettingsView } from './settings/SettingsViewContext';
import { useSettingsViewLogic, SettingsTab } from './settings/useSettingsViewLogic';
import {
  GeneralSettingsTab,
  AISettingsTab,
  KnowledgeBaseSettingsTab,
  ExportSettingsTab,
  DataSettingsTab,
  Modal,
} from './settings/SettingsSubComponents';
import { ConfirmationModal } from './ConfirmationModal';
import { CogIcon } from './icons/CogIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ExportIcon } from './icons/ExportIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { InfoIcon } from './icons/InfoIcon';
import { STICKY_BELOW_CHROME_CLASS } from '../lib/layoutChrome';

interface SettingsViewProps {
  onClearKnowledgeBase: () => void;
  resetToken: number;
  onNavigateToHelpTab: (tab: 'about' | 'faq') => void;
}

const SettingsViewLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    handleSave,
    handleCancel,
    isDirty,
    hasErrors,
    t,
    tabsRef,
    modalState,
    setModalState,
    onClearKnowledgeBase,
    uniqueArticles,
    handleResetAllSettings,
    handleConfirmKnowledgeBaseImport,
    pruneScore,
    setPruneScore,
    isProcessing,
    articlesToPruneCount,
    handlePrune,
    handleMergeDuplicates,
    handleDeletePreset,
    onNavigateToHelpTab,
  } = useSettingsView();

  const [indicatorStyle, setIndicatorStyle] = useState({});
  const [contentKey, setContentKey] = useState(activeTab);

  const tabs = useMemo(
    () => [
      { id: 'general', name: t('settings.general'), icon: CogIcon },
      { id: 'ai', name: t('settings.ai'), icon: SparklesIcon },
      { id: 'knowledgeBase', name: t('settings.tab.knowledgeBase'), icon: DatabaseIcon },
      { id: 'export', name: t('settings.tab.export'), icon: ExportIcon },
      { id: 'data', name: t('settings.tab.data'), icon: ShieldCheckIcon },
    ],
    [t],
  );

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setContentKey(tab);
  };

  useEffect(() => {
    const activeTabIndex = tabs.findIndex((t) => t.id === activeTab);
    const activeTabEl = tabsRef.current[activeTabIndex];
    if (activeTabEl) {
      setIndicatorStyle({
        left: activeTabEl.offsetLeft,
        width: activeTabEl.offsetWidth,
        height: activeTabEl.offsetHeight,
      });
    }
  }, [activeTab, tabs, tabsRef]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettingsTab />;
      case 'ai':
        return <AISettingsTab />;
      case 'knowledgeBase':
        return <KnowledgeBaseSettingsTab />;
      case 'export':
        return <ExportSettingsTab />;
      case 'data':
        return <DataSettingsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="animate-fadeIn">
      <div
        // Sticky only from md: up. On mobile, the fixed header (z-20) and
        // fixed bottom nav (z-30) already claim most of a short viewport's
        // vertical space; adding a third sticky element there repeatedly
        // caused it (or the toast/nav it then competes with) to overlap
        // content further down the page - a real, CI-caught E2E regression
        // (pointer events intercepted trying to reach fields below this bar).
        // The long-scroll convenience this bar exists for mainly matters on
        // desktop's wider, taller viewports anyway. md:top-[max(9rem,...)]
        // keeps the original static 9rem breakpoint value as a floor and only
        // grows past it when AppLayout's measured --chrome-height (set on
        // <main>, see AppLayout.tsx) is genuinely taller - e.g. a banner
        // visible - instead of tracking the exact measured height directly.
        className="static md:sticky md:top-[max(9rem,var(--chrome-height,0px))] z-10 flex flex-col sm:flex-row sm:justify-between items-end sm:items-center gap-2 sm:gap-0 mb-8 py-2 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-surface/70 backdrop-blur-xl border-b border-border/50"
      >
        <div className="w-full sm:w-auto">
          <h1 className="text-4xl font-bold brand-gradient-text">{t('settings.title')}</h1>
          <p className="mt-1 text-lg text-text-secondary">{t('settings.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCancel}
            disabled={!isDirty}
            className="px-4 py-2 text-sm font-medium rounded-md text-text-primary bg-surface border border-border hover:bg-surface-hover disabled:opacity-50"
          >
            {t('settings.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || hasErrors}
            className="px-4 py-2 text-sm font-medium rounded-md text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 disabled:opacity-50"
          >
            {t('settings.save')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <div className={`space-y-1 ${STICKY_BELOW_CHROME_CLASS}`}>
            <div className="relative" role="tablist" aria-label={t('settings.aria.categories')}>
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabsRef.current[index] = el;
                  }}
                  id={`tab-${tab.id}`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => handleTabChange(tab.id as SettingsTab)}
                  className={`relative flex items-center w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors z-10 ${activeTab === tab.id ? 'text-brand-text-on-accent' : 'text-text-primary hover:bg-surface-hover'}`}
                >
                  <tab.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>{tab.name}</span>
                </button>
              ))}
              <div
                className="absolute top-0 bg-brand-accent rounded-md transition-all duration-300 ease-in-out"
                style={indicatorStyle}
                aria-hidden="true"
              />
            </div>
            <div className="pt-4 mt-4 border-t border-border">
              <button
                onClick={() => onNavigateToHelpTab('about')}
                className="w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-text-primary bg-surface hover:bg-border flex items-center"
              >
                <InfoIcon className="h-5 w-5 mr-3 text-text-secondary flex-shrink-0" />
                <span>{t('settings.nav.about')}</span>
              </button>
              <button
                onClick={() => onNavigateToHelpTab('faq')}
                className="w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-text-primary bg-surface hover:bg-border flex items-center"
              >
                <InfoIcon className="h-5 w-5 mr-3 text-text-secondary flex-shrink-0" />
                <span>{t('settings.nav.faq')}</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="md:col-span-3">
          <div
            key={contentKey}
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="animate-fadeIn"
          >
            {renderActiveTab()}
          </div>
        </main>
      </div>
      {modalState && (
        <>
          {modalState.type === 'clear' && (
            <ConfirmationModal
              onConfirm={() => {
                onClearKnowledgeBase();
                setModalState(null);
              }}
              onCancel={() => setModalState(null)}
              title={t('settings.modal.clear.title')}
              message={t('settings.modal.clear.message', { count: uniqueArticles.length })}
              confirmText={t('settings.modal.clear.confirm')}
            />
          )}
          {modalState.type === 'reset' && (
            <ConfirmationModal
              onConfirm={handleResetAllSettings}
              onCancel={() => setModalState(null)}
              title={t('settings.modal.reset.title')}
              message={t('settings.modal.reset.message')}
              confirmText={t('settings.modal.reset.confirm')}
            />
          )}
          {modalState.type === 'import' && (
            <ConfirmationModal
              title={t('settings.modal.import.title')}
              message={`${t('settings.modal.import.message', { count: modalState.data.length })} ${t(
                'settings.modal.import.quarantine',
                {
                  trustDowngraded: modalState.quarantine.trustDowngradedCount,
                  invalidCitations: modalState.quarantine.invalidCitations,
                  rejected: modalState.quarantine.rejectedCount,
                },
              )}`}
              confirmText={t('settings.modal.import.confirm')}
              confirmButtonClass="bg-brand-accent hover:bg-opacity-90"
              titleClass="text-brand-accent"
              onConfirm={() =>
                handleConfirmKnowledgeBaseImport(modalState.data, modalState.quarantine)
              }
              onCancel={() => setModalState(null)}
            />
          )}
          {modalState.type === 'prune' && (
            <Modal onClose={() => setModalState(null)} title={t('settings.modal.prune.title')}>
              <p className="text-sm text-text-secondary mb-4">{t('settings.modal.prune.desc')}</p>
              <div className="flex items-center mt-2">
                <label htmlFor="prune-score-slider" className="sr-only">
                  {t('settings.modal.prune.score_aria')}
                </label>
                <input
                  id="prune-score-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={pruneScore}
                  onChange={(e) => setPruneScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-brand-accent"
                  disabled={isProcessing}
                />
                <span className="ml-4 font-mono text-sm text-text-primary bg-input-bg border border-border rounded-md px-2 py-1 w-20 text-center">
                  &lt; {pruneScore}
                </span>
              </div>
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-md text-center text-sm">
                {t('settings.modal.prune.warning', { count: articlesToPruneCount })}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handlePrune}
                  disabled={isProcessing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {t('settings.modal.prune.processing')}
                    </>
                  ) : (
                    t('settings.modal.prune.confirm')
                  )}
                </button>
              </div>
            </Modal>
          )}
          {modalState.type === 'merge' && (
            <ConfirmationModal
              title={t('settings.modal.merge.title')}
              message={t('settings.modal.merge.message')}
              confirmText={
                isProcessing
                  ? t('settings.modal.merge.processing')
                  : t('settings.modal.merge.confirm')
              }
              isConfirming={isProcessing}
              confirmButtonClass="bg-brand-accent hover:bg-opacity-90"
              titleClass="text-brand-accent"
              onConfirm={handleMergeDuplicates}
              onCancel={() => setModalState(null)}
            />
          )}
          {modalState.type === 'deletePreset' && (
            <ConfirmationModal
              title={t('settings.modal.delete_preset.title', { name: modalState.data.name })}
              message={t('settings.modal.delete_preset.message')}
              confirmText={t('settings.modal.delete_preset.confirm')}
              onConfirm={() => handleDeletePreset(modalState.data)}
              onCancel={() => setModalState(null)}
            />
          )}
        </>
      )}
    </div>
  );
};

const SettingsView: React.FC<SettingsViewProps> = (props) => {
  const logic = useSettingsViewLogic(
    props.onClearKnowledgeBase,
    props.resetToken,
    props.onNavigateToHelpTab,
  );

  return (
    <SettingsViewProvider value={logic}>
      <SettingsViewLayout />
    </SettingsViewProvider>
  );
};

export default SettingsView;
