
import React, { useEffect, useState, useMemo } from 'react';
import { SettingsViewProvider, useSettingsView } from './settings/SettingsViewContext';
import { useSettingsViewLogic, SettingsTab } from './settings/useSettingsViewLogic';
import { GeneralSettingsTab, AISettingsTab, KnowledgeBaseSettingsTab, ExportSettingsTab, DataSettingsTab, Modal } from './settings/SettingsSubComponents';
import { ConfirmationModal } from './ConfirmationModal';
import { CogIcon } from './icons/CogIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ExportIcon } from './icons/ExportIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { InfoIcon } from './icons/InfoIcon';

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
        addKnowledgeBaseEntries, 
        pruneScore, 
        setPruneScore, 
        isProcessing, 
        articlesToPruneCount, 
        handlePrune, 
        handleMergeDuplicates, 
        handleDeletePreset, 
        onNavigateToHelpTab
    } = useSettingsView();

    const [indicatorStyle, setIndicatorStyle] = useState({});
    const [contentKey, setContentKey] = useState(activeTab);

    const tabs = useMemo(() => [
        { id: 'general', name: t('settings.general'), icon: CogIcon },
        { id: 'ai', name: t('settings.ai'), icon: SparklesIcon },
        { id: 'knowledgeBase', name: 'Knowledge Base', icon: DatabaseIcon },
        { id: 'export', name: 'Export', icon: ExportIcon },
        { id: 'data', name: 'Data Management & Privacy', icon: ShieldCheckIcon },
    ], [t]);

    const handleTabChange = (tab: SettingsTab) => {
        setActiveTab(tab);
        setContentKey(tab);
    };

    useEffect(() => {
        const activeTabIndex = tabs.findIndex(t => t.id === activeTab);
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
            case 'general': return <GeneralSettingsTab />;
            case 'ai': return <AISettingsTab />;
            case 'knowledgeBase': return <KnowledgeBaseSettingsTab />;
            case 'export': return <ExportSettingsTab />;
            case 'data': return <DataSettingsTab />;
            default: return null;
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold brand-gradient-text">{t('settings.title')}</h1>
                    <p className="mt-1 text-lg text-text-secondary">{t('settings.subtitle')}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleCancel} disabled={!isDirty} className="px-4 py-2 text-sm font-medium rounded-md text-text-primary bg-surface border border-border hover:bg-surface-hover disabled:opacity-50">{t('settings.cancel')}</button>
                    <button onClick={handleSave} disabled={!isDirty || hasErrors} className="px-4 py-2 text-sm font-medium rounded-md text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 disabled:opacity-50">{t('settings.save')}</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <aside className="md:col-span-1">
                    <nav className="space-y-1 sticky top-24" role="tablist" aria-label="Settings categories">
                        <div className="relative">
                            {tabs.map((tab, index) => (
                                <button 
                                    key={tab.id}
                                    ref={el => { tabsRef.current[index] = el; }}
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
                                <span>About & Features</span>
                            </button>
                             <button
                                onClick={() => onNavigateToHelpTab('faq')}
                                className="w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-text-primary bg-surface hover:bg-border flex items-center"
                            >
                                <InfoIcon className="h-5 w-5 mr-3 text-text-secondary flex-shrink-0" />
                                <span>FAQ & Shortcuts</span>
                            </button>
                        </div>
                    </nav>
                </aside>

                <main className="md:col-span-3">
                     <div key={contentKey} role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="animate-fadeIn">
                        {renderActiveTab()}
                    </div>
                </main>
            </div>
            {modalState && (
                <>
                {(modalState.type === 'clear') && (
                    <ConfirmationModal
                        onConfirm={() => { onClearKnowledgeBase(); setModalState(null); }}
                        onCancel={() => setModalState(null)}
                        title="Clear Knowledge Base?"
                        message={<>Are you sure you want to delete all <strong>{uniqueArticles.length}</strong> articles from your knowledge base? This action cannot be undone.</>}
                        confirmText="Yes, Delete All"
                    />
                )}
                 {(modalState.type === 'reset') && (
                    <ConfirmationModal
                        onConfirm={handleResetAllSettings}
                        onCancel={() => setModalState(null)}
                        title="Reset All Settings?"
                        message="Are you sure you want to reset all application settings to their default values? This cannot be undone."
                        confirmText="Yes, Reset All"
                    />
                )}
                {(modalState.type === 'import') && (
                    <ConfirmationModal
                        title="Import Knowledge Base"
                        message={<>You are about to import <strong>{modalState.data.length}</strong> new reports. This will be added to your existing knowledge base. Do you want to continue?</>}
                        confirmText="Yes, Import"
                        confirmButtonClass="bg-brand-accent hover:bg-opacity-90"
                        titleClass="text-brand-accent"
                        onConfirm={() => { addKnowledgeBaseEntries(modalState.data); setModalState(null); }}
                        onCancel={() => setModalState(null)}
                    />
                )}
                {(modalState.type === 'prune') && (
                    <Modal onClose={() => setModalState(null)} title="Prune by Relevance Score">
                        <p className="text-sm text-text-secondary mb-4">This will permanently delete all articles from your knowledge base with a relevance score below the value you select.</p>
                        <div className="flex items-center mt-2">
                             <label htmlFor="prune-score-slider" className="sr-only">Prune score</label>
                             <input id="prune-score-slider" type="range" min="0" max="100" step="1" value={pruneScore} onChange={(e) => setPruneScore(parseInt(e.target.value))} className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-brand-accent" disabled={isProcessing} />
                            <span className="ml-4 font-mono text-sm text-text-primary bg-input-bg border border-border rounded-md px-2 py-1 w-20 text-center">&lt; {pruneScore}</span>
                        </div>
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-md text-center text-sm">
                            This action will permanently delete <strong>{articlesToPruneCount}</strong> article(s).
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={handlePrune} 
                                disabled={isProcessing}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Pruning...
                                    </>
                                ) : 'Prune Articles'}
                            </button>
                        </div>
                    </Modal>
                )}
                 {(modalState.type === 'merge') && (
                     <ConfirmationModal
                        title="Merge Duplicates"
                        message="This will scan for duplicate articles and keep only the highest-scored version of each. This helps clean your data. Proceed?"
                        confirmText={isProcessing ? "Merging..." : "Yes, Merge"}
                        isConfirming={isProcessing}
                        confirmButtonClass="bg-brand-accent hover:bg-opacity-90"
                        titleClass="text-brand-accent"
                        onConfirm={handleMergeDuplicates}
                        onCancel={() => setModalState(null)}
                    />
                 )}
                 {(modalState.type === 'deletePreset') && (
                     <ConfirmationModal
                        title={`Delete Preset "${modalState.data.name}"?`}
                        message="Are you sure you want to permanently delete this preset? This action cannot be undone."
                        confirmText="Yes, Delete"
                        onConfirm={() => handleDeletePreset(modalState.data)}
                        onCancel={() => setModalState(null)}
                    />
                 )}
                </>
            )}
        </div>
    );
}

const SettingsView: React.FC<SettingsViewProps> = (props) => {
    const logic = useSettingsViewLogic(props.onClearKnowledgeBase, props.resetToken, props.onNavigateToHelpTab);

    return (
        <SettingsViewProvider value={logic}>
            <SettingsViewLayout />
        </SettingsViewProvider>
    );
};

export default SettingsView;
