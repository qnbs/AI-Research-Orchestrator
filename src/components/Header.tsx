import React, { useState, useRef, useEffect, memo } from 'react';
import { DocumentIcon } from './icons/DocumentIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { CogIcon } from './icons/CogIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { AuthorIcon } from './icons/AuthorIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { useUI } from '../contexts/UIContext';
import { useSettings } from '../contexts/SettingsContext';
import type { View } from '../contexts/UIContext';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { SearchIcon } from './icons/SearchIcon';
import { EllipsisHorizontalIcon } from './icons/EllipsisHorizontalIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { AppBrandMark } from './AppBrandMark';
import { useTranslation } from '../hooks/useTranslation';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { AgentDebuggerToggle } from './agentDebugger/AgentDebuggerToggle';
import { InferenceModeBadge } from './InferenceModeBadge';
import { HeaderNavButton } from './HeaderNavButton';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { cycleTheme, selectCurrentTheme } from '../store/slices/themeSlice';
import { isDeveloperToolsEnabled } from '../store/slices/settingsSlice';

interface HeaderProps {
  onViewChange: (view: View) => void;
  currentView: View;
  knowledgeBaseArticleCount: number;
  hasReports: boolean;
  isResearching: boolean;
  onQuickAdd: () => void;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  onViewChange,
  currentView,
  knowledgeBaseArticleCount,
  hasReports,
  isResearching,
  onQuickAdd,
}) => {
  const { settings, updateSettings } = useSettings();
  const { isSettingsDirty, setIsCommandPaletteOpen } = useUI();
  const { t, lang } = useTranslation();
  const dispatch = useAppDispatch();
  const currentTheme = useAppSelector(selectCurrentTheme);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const overflowTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);

  const viewTitles: Record<View, string> = {
    home: t('nav.home'),
    orchestrator: t('nav.orchestrator'),
    research: t('nav.research'),
    authors: t('nav.authors'),
    journals: t('nav.journals'),
    knowledgeBase: t('nav.knowledgeBase'),
    dashboard: t('nav.dashboard'),
    history: t('nav.history'),
    settings: t('nav.settings'),
    help: t('nav.help'),
    collections: t('nav.collections'),
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setIsOverflowOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isOverflowOpen) {
        setIsOverflowOpen(false);
        overflowTriggerRef.current?.focus();
      }
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        mobileMenuTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOverflowOpen, isMobileMenuOpen]);

  const handleMobileMenuSelect = (action: () => void) => {
    action();
    setIsMobileMenuOpen(false);
  };

  const toggleTheme = () => dispatch(cycleTheme());
  const themeIcon =
    currentTheme === 'dark' ? (
      <SunIcon className="h-5 w-5 text-accent-amber" />
    ) : currentTheme === 'light' ? (
      <MoonIcon className="h-5 w-5 text-brand-accent" />
    ) : (
      <span
        className="text-[10px] font-mono font-semibold text-success tracking-wide"
        title={t('chrome.theme.matrix_title')}
      >
        MX
      </span>
    );
  const themeLabel =
    currentTheme === 'dark'
      ? t('chrome.theme.switch_light')
      : currentTheme === 'light'
        ? t('chrome.theme.switch_matrix')
        : t('chrome.theme.switch_dark');

  const toggleLanguage = () =>
    updateSettings((prev) => ({ ...prev, appLanguage: prev.appLanguage === 'en' ? 'de' : 'en' }));

  const displayCount = knowledgeBaseArticleCount > 999 ? '999+' : knowledgeBaseArticleCount;
  const reportHint = !hasReports ? t('nav.requires_report') : undefined;
  const reportHintId = 'header-report-hint';
  const overflowMenuId = 'header-overflow-menu';
  const mobileMoreMenuId = 'header-mobile-more-menu';

  return (
    <header className="transition-all duration-300 border-b border-border bg-surface/70 backdrop-blur-xl shadow-sm">
      {reportHint && (
        <span id={reportHintId} className="sr-only">
          {reportHint}
        </span>
      )}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="hidden md:flex flex-col py-3 gap-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onViewChange('home')}
              className="flex items-center gap-3 focus-ring-aa rounded-md group"
              aria-label={t('chrome.aria.go_home')}
            >
              <AppBrandMark
                size="sm"
                idPrefix="header-logo"
                className="drop-shadow-lg"
                aria-hidden
              />
              <span className="font-bold text-lg tracking-tight text-text-primary">
                {t('app.name')}
              </span>
            </button>
            <div className="flex items-center gap-3">
              <InferenceModeBadge />
              <nav
                className="flex items-center gap-1 p-1.5 rounded-xl border border-border bg-surface/40 backdrop-blur-md shadow-inner"
                aria-label={t('chrome.aria.main_nav')}
              >
                <HeaderNavButton
                  onClick={() => onViewChange('orchestrator')}
                  isActive={currentView === 'orchestrator'}
                  className="relative"
                >
                  {isResearching && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                      <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan" />
                    </span>
                  )}
                  <DocumentIcon className="h-4 w-4 mr-2" />
                  {t('nav.orchestrator')}
                </HeaderNavButton>
                <HeaderNavButton
                  onClick={() => onViewChange('research')}
                  isActive={currentView === 'research'}
                >
                  <BeakerIcon className="h-4 w-4 mr-2" />
                  {t('nav.research')}
                </HeaderNavButton>
                <HeaderNavButton
                  onClick={() => onViewChange('knowledgeBase')}
                  isActive={currentView === 'knowledgeBase'}
                  muted={!hasReports}
                  title={reportHint}
                  ariaDescribedBy={reportHint ? reportHintId : undefined}
                >
                  <DatabaseIcon className="h-4 w-4 mr-2" />
                  {t('nav.knowledgeBase')}{' '}
                  <span className="ml-2 bg-background/80 border border-border text-text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {displayCount}
                  </span>
                </HeaderNavButton>
                <HeaderNavButton
                  onClick={() => onViewChange('authors')}
                  isActive={currentView === 'authors'}
                >
                  <AuthorIcon className="h-4 w-4 mr-2" />
                  {t('nav.authors')}
                </HeaderNavButton>
                <HeaderNavButton
                  onClick={() => onViewChange('journals')}
                  isActive={currentView === 'journals'}
                >
                  <BookOpenIcon className="h-4 w-4 mr-2" />
                  {t('nav.journals')}
                </HeaderNavButton>
                <div ref={overflowRef} className="relative">
                  <HeaderNavButton
                    onClick={() => setIsOverflowOpen((open) => !open)}
                    isActive={false}
                    ariaLabel={t('nav.overflow')}
                    ariaExpanded={isOverflowOpen}
                    ariaControls={overflowMenuId}
                    buttonRef={overflowTriggerRef}
                  >
                    <EllipsisHorizontalIcon className="h-4 w-4 mr-2" />
                    {t('nav.more')}
                  </HeaderNavButton>
                  {isOverflowOpen && (
                    <div
                      id={overflowMenuId}
                      className="absolute right-0 mt-2 w-56 bg-surface/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                      {(
                        [
                          ['collections', t('nav.collections'), false],
                          ['dashboard', t('nav.dashboard'), !hasReports],
                          ['history', t('nav.history'), !hasReports],
                        ] as const
                      ).map(([view, label, muted]) => (
                        <button
                          key={view}
                          type="button"
                          title={muted ? reportHint : undefined}
                          aria-describedby={muted ? reportHintId : undefined}
                          onClick={() => {
                            onViewChange(view);
                            setIsOverflowOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm hover:bg-surface-hover focus-ring-aa border-b border-border/50 ${muted ? 'opacity-60' : ''}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </div>

          <div className="flex justify-between items-center pl-1">
            <h1 className="text-xl font-bold text-text-primary tracking-tight brand-gradient-text">
              {viewTitles[currentView]}
            </h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="group flex items-center gap-3 px-4 py-2 text-sm text-text-secondary bg-input-bg border border-border rounded-lg hover:border-brand-accent/50 hover:text-text-primary focus-ring-aa touch-target-aa"
                aria-label={t('chrome.aria.open_command_palette')}
              >
                <SearchIcon className="h-4 w-4 group-hover:text-brand-accent transition-colors" />
                <span>{t('chrome.aria.search')}</span>
                <kbd className="hidden lg:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-bold text-text-secondary bg-surface border border-border rounded">
                  ⌘K
                </kbd>
              </button>
              <button
                type="button"
                onClick={onQuickAdd}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-text-on-accent bg-gradient-to-r from-brand-primary to-brand-accent rounded-lg focus-ring-aa touch-target-aa"
                aria-label={t('chrome.aria.quick_add_article')}
              >
                <DocumentPlusIcon className="h-4 w-4" />
                <span className="hidden lg:inline">{t('nav.quick_add')}</span>
              </button>
              <button
                type="button"
                onClick={toggleLanguage}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover font-bold text-xs flex items-center gap-1 focus-ring-aa touch-target-aa"
                aria-label={t('chrome.aria.toggle_language')}
              >
                <GlobeAltIcon className="h-4 w-4" />
                {lang.toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() => onViewChange('settings')}
                className={`p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover relative focus-ring-aa touch-target-aa ${currentView === 'settings' ? 'bg-surface-hover text-text-primary' : ''}`}
                aria-label={t('chrome.aria.settings')}
              >
                <CogIcon className={`h-5 w-5 ${isSettingsDirty ? 'text-accent-amber' : ''}`} />
                {isSettingsDirty && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent-amber ring-2 ring-surface" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onViewChange('help')}
                className={`p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover focus-ring-aa touch-target-aa ${currentView === 'help' ? 'bg-surface-hover text-text-primary' : ''}`}
                aria-label={t('chrome.aria.help')}
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover focus-ring-aa touch-target-aa"
                aria-label={themeLabel}
              >
                {themeIcon}
              </button>
              {isDeveloperToolsEnabled(settings) && <AgentDebuggerToggle />}
            </div>
          </div>
        </div>

        <div className="md:hidden flex items-center justify-between h-16">
          <button
            type="button"
            onClick={() => onViewChange('home')}
            className="flex items-center gap-3 focus-ring-aa rounded-md touch-target-aa"
            aria-label={t('chrome.aria.go_home')}
          >
            <AppBrandMark size="sm" idPrefix="mobile-header-logo" aria-hidden />
            <span className="font-bold text-lg text-text-primary truncate max-w-[140px] brand-gradient-text">
              {viewTitles[currentView]}
            </span>
          </button>
          <div className="flex items-center gap-1">
            <InferenceModeBadge className="max-w-[7.5rem] truncate text-[10px] px-1.5 py-0.5" />
            {isDeveloperToolsEnabled(settings) && <AgentDebuggerToggle />}
            <button
              type="button"
              onClick={toggleLanguage}
              className="p-2.5 text-text-secondary font-bold text-xs focus-ring-aa touch-target-aa rounded-full"
              aria-label={t('chrome.aria.toggle_language')}
            >
              {lang.toUpperCase()}
            </button>
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-2.5 text-text-secondary hover:text-text-primary rounded-full hover:bg-surface-hover focus-ring-aa touch-target-aa"
              aria-label={t('chrome.aria.search')}
            >
              <SearchIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onQuickAdd}
              className="p-2.5 text-text-secondary hover:text-text-primary rounded-full hover:bg-surface-hover focus-ring-aa touch-target-aa"
              aria-label={t('chrome.aria.quick_add')}
            >
              <DocumentPlusIcon className="h-5 w-5" />
            </button>
            <div ref={mobileMenuRef} className="relative">
              <button
                ref={mobileMenuTriggerRef}
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="p-2.5 text-text-secondary hover:text-text-primary rounded-full hover:bg-surface-hover focus-ring-aa touch-target-aa"
                aria-label={t('chrome.aria.more_options')}
                aria-expanded={isMobileMenuOpen}
                aria-controls={mobileMoreMenuId}
              >
                <EllipsisHorizontalIcon className="h-6 w-6" />
              </button>
              {isMobileMenuOpen && (
                <div
                  id={mobileMoreMenuId}
                  className="absolute right-0 mt-2 w-56 bg-surface/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => handleMobileMenuSelect(() => setIsCommandPaletteOpen(true))}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover focus-ring-aa border-b border-border/50"
                  >
                    <SearchIcon className="h-5 w-5" /> {t('nav.search_commands')}
                  </button>
                  <button
                    type="button"
                    title={!hasReports ? reportHint : undefined}
                    aria-describedby={!hasReports ? reportHintId : undefined}
                    onClick={() => handleMobileMenuSelect(() => onViewChange('dashboard'))}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover focus-ring-aa border-b border-border/50 ${!hasReports ? 'opacity-60' : ''}`}
                  >
                    <ChartBarIcon className="h-5 w-5" /> {t('nav.dashboard')}
                  </button>
                  <button
                    type="button"
                    title={!hasReports ? reportHint : undefined}
                    aria-describedby={!hasReports ? reportHintId : undefined}
                    onClick={() => handleMobileMenuSelect(() => onViewChange('history'))}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover focus-ring-aa border-b border-border/50 ${!hasReports ? 'opacity-60' : ''}`}
                  >
                    <HistoryIcon className="h-5 w-5" /> {t('nav.history')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMobileMenuSelect(() => onViewChange('settings'))}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover border-b border-border/50"
                  >
                    <CogIcon className={`h-5 w-5 ${isSettingsDirty ? 'text-accent-amber' : ''}`} />{' '}
                    {t('nav.settings')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMobileMenuSelect(() => onViewChange('help'))}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover border-b border-border/50"
                  >
                    <QuestionMarkCircleIcon className="h-5 w-5" /> {t('nav.help')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMobileMenuSelect(toggleTheme)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover"
                  >
                    {themeIcon}
                    <span>
                      {currentTheme === 'dark'
                        ? t('chrome.theme.menu_light')
                        : currentTheme === 'matrix'
                          ? t('chrome.theme.menu_dark')
                          : t('chrome.theme.menu_matrix')}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export const Header = memo(HeaderComponent);
