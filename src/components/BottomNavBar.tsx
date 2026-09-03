import React, { useEffect, useRef, useState } from 'react';
import type { View } from '../contexts/UIContext';
import { useHaptic } from '../hooks/useHaptic';
import { useTranslation } from '../hooks/useTranslation';
import { useUI } from '../contexts/UIContext';
import { DocumentIcon } from './icons/DocumentIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { AuthorIcon } from './icons/AuthorIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { CollectionIcon } from './icons/CollectionIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { CogIcon } from './icons/CogIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { HomeIcon } from './icons/HomeIcon';
import { SearchIcon } from './icons/SearchIcon';
import { EllipsisHorizontalIcon } from './icons/EllipsisHorizontalIcon';

interface BottomNavBarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  knowledgeBaseArticleCount: number;
  hasReports: boolean;
  isResearching: boolean;
}

const MORE_MENU_ID = 'bottom-nav-more-menu';

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  muted?: boolean;
  title?: string;
  onClick: () => void;
  badge?: number;
  isSpecial?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  ariaDescribedBy?: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
}> = ({
  label,
  icon,
  isActive,
  muted,
  title,
  onClick,
  badge,
  isSpecial,
  ariaExpanded,
  ariaControls,
  ariaDescribedBy,
  buttonRef,
}) => {
  const haptic = useHaptic();
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => {
        haptic('light');
        onClick();
      }}
      title={title ?? label}
      className={`flex flex-shrink-0 flex-col items-center justify-center min-w-[44px] min-h-[44px] touch-target-aa px-2 pt-3 pb-2 text-[10px] font-medium transition-all duration-200 focus-ring-aa rounded-lg relative ${
        isActive ? 'text-brand-accent' : 'text-text-secondary hover:text-text-primary'
      } ${muted ? 'opacity-60' : ''}`}
      aria-current={ariaExpanded === undefined && isActive ? 'page' : undefined}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-describedby={ariaDescribedBy}
    >
      <div
        className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-brand-accent/10 shadow-glow' : ''}`}
      >
        {isSpecial && (
          <span className="absolute top-2 right-1/2 translate-x-3 flex h-2 w-2">
            <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan" />
          </span>
        )}
        {badge !== undefined && badge > 0 && (
          <span className="absolute top-1 right-1/2 translate-x-4 bg-brand-accent text-brand-text-on-accent text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {icon}
      </div>
      <span
        className={`mt-1 max-w-[4.5rem] truncate ${isActive ? 'opacity-100 font-bold text-brand-accent' : 'opacity-80'}`}
      >
        {label}
      </span>
    </button>
  );
};

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentView,
  onViewChange,
  knowledgeBaseArticleCount,
  hasReports,
  isResearching,
}) => {
  const { t } = useTranslation();
  const { setIsCommandPaletteOpen } = useUI();
  const [openedFor, setOpenedFor] = useState<View | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const reportHint = t('nav.requires_report');
  const reportHintId = 'bottom-nav-report-hint';
  if (openedFor !== null && openedFor !== currentView) {
    setOpenedFor(null);
  }
  const moreOpen = openedFor === currentView;
  const closeMore = () => setOpenedFor(null);
  const selectView = (view: View) => {
    closeMore();
    onViewChange(view);
  };

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenedFor(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenedFor(null);
      moreTriggerRef.current?.focus();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen]);
  const moreActive = [
    'home',
    'journals',
    'collections',
    'dashboard',
    'history',
    'settings',
    'help',
  ].includes(currentView);

  const moreItems: {
    view?: View;
    label: string;
    icon: React.ReactNode;
    muted?: boolean;
    command?: boolean;
  }[] = [
    { view: 'home', label: t('nav.home'), icon: <HomeIcon className="h-5 w-5" /> },
    { view: 'journals', label: t('nav.journals'), icon: <BookOpenIcon className="h-5 w-5" /> },
    {
      view: 'collections',
      label: t('nav.collections'),
      icon: <CollectionIcon className="h-5 w-5" />,
    },
    {
      view: 'dashboard',
      label: t('nav.dashboard'),
      icon: <ChartBarIcon className="h-5 w-5" />,
      muted: !hasReports,
    },
    {
      view: 'history',
      label: t('nav.history'),
      icon: <HistoryIcon className="h-5 w-5" />,
      muted: !hasReports,
    },
    { view: 'settings', label: t('nav.settings'), icon: <CogIcon className="h-5 w-5" /> },
    { view: 'help', label: t('nav.help'), icon: <QuestionMarkCircleIcon className="h-5 w-5" /> },
    { command: true, label: t('nav.search_commands'), icon: <SearchIcon className="h-5 w-5" /> },
  ];

  return (
    <nav
      ref={navRef}
      className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-xl border-t border-border z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.2)] pb-safe"
    >
      {!hasReports && (
        <span id={reportHintId} className="sr-only">
          {reportHint}
        </span>
      )}
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
        <NavItem
          label={t('nav.orchestrator')}
          icon={<DocumentIcon className="h-5 w-5" />}
          isActive={currentView === 'orchestrator'}
          isSpecial={isResearching}
          onClick={() => selectView('orchestrator')}
        />
        <NavItem
          label={t('nav.research')}
          icon={<BeakerIcon className="h-5 w-5" />}
          isActive={currentView === 'research'}
          onClick={() => selectView('research')}
        />
        <NavItem
          label={t('nav.library')}
          icon={<DatabaseIcon className="h-5 w-5" />}
          isActive={currentView === 'knowledgeBase'}
          muted={!hasReports}
          title={!hasReports ? reportHint : t('nav.knowledgeBase')}
          ariaDescribedBy={!hasReports ? reportHintId : undefined}
          badge={knowledgeBaseArticleCount}
          onClick={() => selectView('knowledgeBase')}
        />
        <NavItem
          label={t('nav.explore')}
          icon={<AuthorIcon className="h-5 w-5" />}
          isActive={currentView === 'authors'}
          onClick={() => selectView('authors')}
        />
        <NavItem
          label={t('nav.more')}
          icon={<EllipsisHorizontalIcon className="h-5 w-5" />}
          isActive={moreActive || moreOpen}
          ariaExpanded={moreOpen}
          ariaControls={MORE_MENU_ID}
          buttonRef={moreTriggerRef}
          onClick={() => setOpenedFor((view) => (view === currentView ? null : currentView))}
        />
      </div>
      {moreOpen && (
        <div
          id={MORE_MENU_ID}
          className="absolute bottom-16 left-0 right-0 border-t border-border bg-surface/95 backdrop-blur-xl max-h-[50vh] overflow-y-auto"
        >
          {moreItems.map((item) => (
            <button
              key={item.label}
              type="button"
              title={item.muted ? reportHint : undefined}
              aria-describedby={item.muted ? reportHintId : undefined}
              onClick={() => {
                if (item.command) {
                  setIsCommandPaletteOpen(true);
                } else if (item.view) {
                  onViewChange(item.view);
                }
                closeMore();
              }}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 min-h-11 text-sm hover:bg-surface-hover focus-ring-aa border-b border-border/40 ${item.muted ? 'opacity-60' : ''}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};
