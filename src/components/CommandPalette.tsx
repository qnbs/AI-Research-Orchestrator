import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useUI } from '../contexts/UIContext';
import { useSettings } from '../contexts/SettingsContext';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n/translations';
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
import { Kbd } from './Kbd';
import { SearchIcon } from './icons/SearchIcon';
import { BookmarkSquareIcon } from './icons/BookmarkSquareIcon';
import { ExportIcon } from './icons/ExportIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import type { CyberTheme } from '../types';

type CommandType = 'navigation' | 'action' | 'theme';

interface Command {
  id: string;
  type: CommandType;
  title: string;
  keywords?: string;
  icon: React.ReactNode;
  action: () => void;
  hotkey?: React.ReactNode;
}

interface CommandPaletteProps {
  isReportVisible: boolean;
  isCurrentReportSaved: boolean;
  selectedArticleCount: number;
  onSaveReport: () => void;
  onExportSelection: (format: 'pdf' | 'csv' | 'bib' | 'ris') => void;
}

const TYPE_LABEL_KEYS: Record<CommandType, TranslationKey> = {
  navigation: 'cmd.type.navigation',
  action: 'cmd.type.action',
  theme: 'cmd.type.theme',
};

const exportTitleKey = (format: 'pdf' | 'csv' | 'bib' | 'ris', count: number): TranslationKey => {
  const plural: Record<typeof format, TranslationKey> = {
    pdf: 'cmd.action.export_pdf',
    csv: 'cmd.action.export_csv',
    bib: 'cmd.action.export_bib',
    ris: 'cmd.action.export_ris',
  };
  const one: Record<typeof format, TranslationKey> = {
    pdf: 'cmd.action.export_pdf_one',
    csv: 'cmd.action.export_csv_one',
    bib: 'cmd.action.export_bib_one',
    ris: 'cmd.action.export_ris_one',
  };
  return count === 1 ? one[format] : plural[format];
};

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isReportVisible,
  isCurrentReportSaved,
  selectedArticleCount,
  onSaveReport,
  onExportSelection,
}) => {
  const { t } = useTranslation();
  const { isCommandPaletteOpen, setIsCommandPaletteOpen, setCurrentView, currentView } = useUI();
  const { updateSettings } = useSettings();
  const { knowledgeBase } = useKnowledgeBase();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const closePalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setSearch('');
  }, [setIsCommandPaletteOpen]);
  const paletteRef = useFocusTrap<HTMLDivElement>(isCommandPaletteOpen, {
    onEscape: closePalette,
    lockScroll: true,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      inputRef.current?.focus();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets selection when the palette opens; bundled with the focus() side effect above that must run here.
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  const commands = useMemo<Command[]>(() => {
    const commandList: Command[] = [];
    const hasReports = knowledgeBase.length > 0;

    if (isReportVisible && !isCurrentReportSaved) {
      commandList.push({
        id: 'action-save-report',
        type: 'action',
        title: t('cmd.action.save_report'),
        icon: <BookmarkSquareIcon className="h-5 w-5" />,
        action: onSaveReport,
      });
    }

    if (currentView === 'knowledgeBase' && selectedArticleCount > 0) {
      (['pdf', 'csv', 'bib', 'ris'] as const).forEach((format) => {
        commandList.push({
          id: `action-export-${format}`,
          type: 'action',
          title: t(exportTitleKey(format, selectedArticleCount), {
            count: selectedArticleCount,
          }),
          icon: <ExportIcon className="h-5 w-5" />,
          action: () => onExportSelection(format),
        });
      });
    }

    commandList.push(
      {
        id: 'nav-orchestrator',
        type: 'navigation',
        title: t('cmd.nav.orchestrator'),
        keywords: t('cmd.kw.orchestrator'),
        icon: <DocumentIcon className="h-5 w-5" />,
        action: () => setCurrentView('orchestrator'),
      },
      {
        id: 'nav-research',
        type: 'navigation',
        title: t('cmd.nav.research'),
        keywords: t('cmd.kw.research'),
        icon: <BeakerIcon className="h-5 w-5" />,
        action: () => setCurrentView('research'),
      },
      {
        id: 'nav-authors',
        type: 'navigation',
        title: t('cmd.nav.authors'),
        keywords: t('cmd.kw.authors'),
        icon: <AuthorIcon className="h-5 w-5" />,
        action: () => setCurrentView('authors'),
      },
      {
        id: 'nav-journals',
        type: 'navigation',
        title: t('cmd.nav.journals'),
        keywords: t('cmd.kw.journals'),
        icon: <BookOpenIcon className="h-5 w-5" />,
        action: () => setCurrentView('journals'),
      },
    );

    if (hasReports) {
      commandList.push(
        {
          id: 'nav-kb',
          type: 'navigation',
          title: t('cmd.nav.knowledge_base'),
          keywords: t('cmd.kw.knowledge_base'),
          icon: <DatabaseIcon className="h-5 w-5" />,
          action: () => setCurrentView('knowledgeBase'),
        },
        {
          id: 'nav-dashboard',
          type: 'navigation',
          title: t('cmd.nav.dashboard'),
          keywords: t('cmd.kw.dashboard'),
          icon: <ChartBarIcon className="h-5 w-5" />,
          action: () => setCurrentView('dashboard'),
        },
        {
          id: 'nav-history',
          type: 'navigation',
          title: t('cmd.nav.history'),
          keywords: t('cmd.kw.history'),
          icon: <HistoryIcon className="h-5 w-5" />,
          action: () => setCurrentView('history'),
        },
      );
    }

    commandList.push(
      {
        id: 'nav-settings',
        type: 'navigation',
        title: t('cmd.nav.settings'),
        keywords: t('cmd.kw.settings'),
        icon: <CogIcon className="h-5 w-5" />,
        action: () => setCurrentView('settings'),
      },
      {
        id: 'nav-help',
        type: 'navigation',
        title: t('cmd.nav.help'),
        keywords: t('cmd.kw.help'),
        icon: <QuestionMarkCircleIcon className="h-5 w-5" />,
        action: () => setCurrentView('help'),
      },
      {
        id: 'theme-light',
        type: 'theme',
        title: t('cmd.theme.light'),
        keywords: t('cmd.kw.theme_light'),
        icon: <SunIcon className="h-5 w-5" />,
        action: () => updateSettings((s) => ({ ...s, theme: 'light' })),
      },
      {
        id: 'theme-dark',
        type: 'theme',
        title: t('cmd.theme.dark'),
        keywords: t('cmd.kw.theme_dark'),
        icon: <MoonIcon className="h-5 w-5" />,
        action: () => updateSettings((s) => ({ ...s, theme: 'dark' })),
      },
      {
        id: 'theme-matrix',
        type: 'theme',
        title: t('cmd.theme.matrix'),
        keywords: t('cmd.kw.theme_matrix'),
        icon: <span className="h-5 w-5 text-lg">🟩</span>,
        action: () => updateSettings((s) => ({ ...s, theme: 'matrix' as CyberTheme })),
      },
    );

    return commandList;
  }, [
    knowledgeBase.length,
    isReportVisible,
    isCurrentReportSaved,
    currentView,
    selectedArticleCount,
    onSaveReport,
    onExportSelection,
    setCurrentView,
    updateSettings,
    t,
  ]);

  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const lowercasedSearch = search.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowercasedSearch) ||
        t(TYPE_LABEL_KEYS[cmd.type]).toLowerCase().includes(lowercasedSearch) ||
        cmd.keywords?.toLowerCase().includes(lowercasedSearch),
    );
  }, [search, commands, t]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filteredCommands.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + Math.max(filteredCommands.length, 1)) %
            Math.max(filteredCommands.length, 1),
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const command = filteredCommands[selectedIndex];
        if (command) {
          command.action();
          closePalette();
        }
      }
      // Escape is handled by useFocusTrap onEscape
    };

    if (isCommandPaletteOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, filteredCommands, selectedIndex, closePalette]);

  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clamps a user-driven index when the filtered list shrinks out from under it.
      setSelectedIndex(0);
    }
  }, [filteredCommands, selectedIndex]);

  useEffect(() => {
    resultsRef.current?.children[selectedIndex]?.scrollIntoView({
      block: 'nearest',
    });
  }, [selectedIndex]);

  if (!isCommandPaletteOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- standard modal backdrop click-to-dismiss; keyboard users dismiss via Escape (useFocusTrap), not by activating the backdrop.
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      onMouseDown={closePalette}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- only stops the backdrop's dismiss-on-click from firing when clicking inside the panel. */}
      <div
        ref={paletteRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-surface/80 backdrop-blur-xl border border-border rounded-lg shadow-2xl animate-fadeIn"
        style={{ animationDuration: '200ms' }}
        role="dialog"
        aria-modal="true"
        aria-label={t('chrome.aria.open_command_palette')}
      >
        <div className="flex items-center p-3 border-b border-border">
          <SearchIcon className="h-5 w-5 text-text-secondary mx-1" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('cmd.placeholder')}
            aria-label={t('cmd.aria_label')}
            className="w-full bg-transparent px-2 focus-ring-aa rounded-md text-text-primary"
          />
        </div>
        <div ref={resultsRef} className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => {
                  cmd.action();
                  closePalette();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center justify-between text-left p-3 rounded-md transition-colors ${selectedIndex === index ? 'bg-brand-accent/20 text-brand-accent' : 'text-text-primary hover:bg-surface-hover'}`}
              >
                <div className="flex items-center">
                  <span className="mr-3">{cmd.icon}</span>
                  <span>{cmd.title}</span>
                </div>
                <span className="text-xs text-text-secondary">{t(TYPE_LABEL_KEYS[cmd.type])}</span>
              </button>
            ))
          ) : (
            <p className="text-center text-text-secondary p-4">{t('cmd.empty')}</p>
          )}
        </div>
        <div className="p-2 border-t border-border text-xs text-text-secondary flex items-center justify-center gap-4">
          <span>
            {t('cmd.hint.navigate')} <Kbd>↑</Kbd> <Kbd>↓</Kbd>
          </span>
          <span>
            {t('cmd.hint.select')} <Kbd>Enter</Kbd>
          </span>
          <span>
            {t('cmd.hint.close')} <Kbd>Esc</Kbd>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
