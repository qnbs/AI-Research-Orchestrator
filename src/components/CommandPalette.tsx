import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useUI } from '../contexts/UIContext';
import type { View } from '../contexts/UIContext';
import { useSettings } from '../contexts/SettingsContext';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { DocumentIcon } from './icons/DocumentIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GearIcon } from './icons/GearIcon';
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

interface Command {
    id: string;
    type: 'navigation' | 'action' | 'theme';
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

const CommandPalette: React.FC<CommandPaletteProps> = ({
    isReportVisible,
    isCurrentReportSaved,
    selectedArticleCount,
    onSaveReport,
    onExportSelection,
}) => {
    const { isCommandPaletteOpen, setIsCommandPaletteOpen, setCurrentView, currentView } = useUI();
    const { settings, updateSettings } = useSettings();
    const { knowledgeBase } = useKnowledgeBase();
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const paletteRef = useFocusTrap<HTMLDivElement>(isCommandPaletteOpen);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const closePalette = useCallback(() => {
        setIsCommandPaletteOpen(false);
        setSearch('');
    }, [setIsCommandPaletteOpen]);
    
    useEffect(() => {
        if (isCommandPaletteOpen) {
            inputRef.current?.focus();
            setSelectedIndex(0);
        }
    }, [isCommandPaletteOpen]);
    
    const commands = useMemo<Command[]>(() => {
        const commandList: Command[] = [];
        const hasReports = knowledgeBase.length > 0;
        
        // Context-sensitive actions
        if (isReportVisible && !isCurrentReportSaved) {
            commandList.push({ id: 'action-save-report', type: 'action', title: 'Save Current Report', icon: <BookmarkSquareIcon className="h-5 w-5"/>, action: onSaveReport });
        }
        
        if (currentView === 'knowledgeBase' && selectedArticleCount > 0) {
            commandList.push(
                { id: 'action-export-pdf', type: 'action', title: `Export ${selectedArticleCount} selected as PDF`, icon: <ExportIcon className="h-5 w-5"/>, action: () => onExportSelection('pdf') },
                { id: 'action-export-csv', type: 'action', title: `Export ${selectedArticleCount} selected as CSV`, icon: <ExportIcon className="h-5 w-5"/>, action: () => onExportSelection('csv') },
                { id: 'action-export-bib', type: 'action', title: `Export ${selectedArticleCount} selected as BibTeX`, icon: <ExportIcon className="h-5 w-5"/>, action: () => onExportSelection('bib') },
                { id: 'action-export-ris', type: 'action', title: `Export ${selectedArticleCount} selected as RIS`, icon: <ExportIcon className="h-5 w-5"/>, action: () => onExportSelection('ris') }
            );
        }

        // Navigation
        commandList.push(
            { id: 'nav-orchestrator', type: 'navigation', title: 'Go to Orchestrator', icon: <DocumentIcon className="h-5 w-5" />, action: () => setCurrentView('orchestrator') },
            { id: 'nav-research', type: 'navigation', title: 'Go to Research', icon: <BeakerIcon className="h-5 w-5" />, action: () => setCurrentView('research') },
            { id: 'nav-authors', type: 'navigation', title: 'Go to Author Hub', icon: <AuthorIcon className="h-5 w-5" />, action: () => setCurrentView('authors') },
            // FIX: Add command to navigate to the new Journal Hub.
            { id: 'nav-journals', type: 'navigation', title: 'Go to Journal Hub', icon: <BookOpenIcon className="h-5 w-5" />, action: () => setCurrentView('journals') }
        );

        if (hasReports) {
            commandList.push(
                { id: 'nav-kb', type: 'navigation', title: 'Go to Knowledge Base', icon: <DatabaseIcon className="h-5 w-5" />, action: () => setCurrentView('knowledgeBase') },
                { id: 'nav-dashboard', type: 'navigation', title: 'Go to Dashboard', icon: <ChartBarIcon className="h-5 w-5" />, action: () => setCurrentView('dashboard') },
                { id: 'nav-history', type: 'navigation', title: 'Go to History', icon: <HistoryIcon className="h-5 w-5" />, action: () => setCurrentView('history') }
            );
        }
        
        commandList.push(
            { id: 'nav-settings', type: 'navigation', title: 'Go to Settings', icon: <GearIcon className="h-5 w-5" />, action: () => setCurrentView('settings') },
            { id: 'nav-help', type: 'navigation', title: 'Go to Help', icon: <QuestionMarkCircleIcon className="h-5 w-5" />, action: () => setCurrentView('help') }
        );
        
        // Theme
        commandList.push(
             { id: 'theme-light', type: 'theme', title: 'Switch to Light Theme', icon: <SunIcon className="h-5 w-5"/>, action: () => updateSettings(s => ({...s, theme: 'light'})) },
             { id: 'theme-dark', type: 'theme', title: 'Switch to Dark Theme', icon: <MoonIcon className="h-5 w-5"/>, action: () => updateSettings(s => ({...s, theme: 'dark'})) }
        );
        
        return commandList;
    }, [knowledgeBase.length, isReportVisible, isCurrentReportSaved, currentView, selectedArticleCount, onSaveReport, onExportSelection, setCurrentView, updateSettings]);

    const filteredCommands = useMemo(() => {
        if (!search) return commands;
        const lowercasedSearch = search.toLowerCase();
        return commands.filter(cmd => 
            cmd.title.toLowerCase().includes(lowercasedSearch) ||
            cmd.type.toLowerCase().includes(lowercasedSearch) ||
            cmd.keywords?.toLowerCase().includes(lowercasedSearch)
        );
    }, [search, commands]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const command = filteredCommands[selectedIndex];
                if (command) {
                    command.action();
                    closePalette();
                }
            } else if (e.key === 'Escape') {
                closePalette();
            }
        };

        if (isCommandPaletteOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCommandPaletteOpen, filteredCommands, selectedIndex, closePalette]);

    useEffect(() => {
        resultsRef.current?.children[selectedIndex]?.scrollIntoView({
            block: 'nearest',
        });
    }, [selectedIndex]);

    if (!isCommandPaletteOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onMouseDown={closePalette}>
            <div
                ref={paletteRef}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full max-w-xl bg-surface/80 backdrop-blur-xl border border-border rounded-lg shadow-2xl animate-fadeIn"
                style={{ animationDuration: '200ms' }}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center p-3 border-b border-border">
                    <SearchIcon className="h-5 w-5 text-text-secondary mx-1" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Type a command or search..."
                        className="w-full bg-transparent px-2 focus:outline-none text-text-primary"
                    />
                </div>
                <div ref={resultsRef} className="max-h-[400px] overflow-y-auto p-2">
                    {filteredCommands.length > 0 ? (
                        filteredCommands.map((cmd, index) => (
                            <button
                                key={cmd.id}
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
                                <span className="text-xs text-text-secondary">{cmd.type}</span>
                            </button>
                        ))
                    ) : (
                        <p className="text-center text-text-secondary p-4">No results found.</p>
                    )}
                </div>
                <div className="p-2 border-t border-border text-xs text-text-secondary flex items-center justify-center gap-4">
                    <span>Navigate: <Kbd>↑</Kbd> <Kbd>↓</Kbd></span>
                    <span>Select: <Kbd>Enter</Kbd></span>
                    <span>Close: <Kbd>Esc</Kbd></span>
                </div>
            </div>
        </div>
    );
};

// FIX: Added default export for React.lazy() compatibility.
export default CommandPalette;
