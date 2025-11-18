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
import { AppLogo } from './AppLogo';

interface HeaderProps {
    onViewChange: (view: View) => void;
    currentView: View;
    knowledgeBaseArticleCount: number;
    hasReports: boolean;
    isResearching: boolean;
    onQuickAdd: () => void;
}

const NavButton: React.FC<{
    onClick: () => void; isActive: boolean; disabled?: boolean; children: React.ReactNode; className?: string; ariaLabel?: string;
}> = ({ onClick, isActive, disabled, children, className = '', ariaLabel }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isActive ? 'text-text-primary bg-surface-hover' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover/50'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
        {children}
    </button>
);


const HeaderComponent: React.FC<HeaderProps> = ({ onViewChange, currentView, knowledgeBaseArticleCount, hasReports, isResearching, onQuickAdd }) => {
    const { settings, updateSettings } = useSettings();
    const { isSettingsDirty, setIsCommandPaletteOpen } = useUI();
    
    // State for mobile "More" menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const viewTitles: Record<View, string> = {
        home: 'Home',
        orchestrator: 'Orchestrator',
        research: 'Research',
        authors: 'Author Hub',
        journals: 'Journal Hub',
        knowledgeBase: 'Knowledge Base',
        dashboard: 'Dashboard',
        history: 'Report History',
        settings: 'Settings',
        help: 'Help & Docs',
    };

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const handleMobileMenuSelect = (action: () => void) => {
        action();
        setIsMobileMenuOpen(false);
    };

    const toggleTheme = () => updateSettings(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
    
    const displayCount = knowledgeBaseArticleCount > 999 ? '999+' : knowledgeBaseArticleCount;

    return (
      <header className="bg-surface/80 backdrop-blur-md fixed top-0 left-0 right-0 z-20 border-b border-border shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* --- DESKTOP HEADER (TWO-LINE) --- */}
          <div className="hidden md:flex flex-col py-2 gap-2">
            {/* Top Row: Logo & Navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => onViewChange('home')} className="flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-md p-1 -m-1" aria-label="Go to Home">
                <AppLogo idPrefix="header-logo" />
              </button>
                <nav className="flex items-center space-x-1 bg-background/50 p-1 rounded-lg border border-border" aria-label="Main navigation">
                  <NavButton onClick={() => onViewChange('research')} isActive={currentView === 'research'} className="relative">
                    {isResearching && <span className="absolute top-1 right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-cyan"></span></span>}
                    <BeakerIcon className="h-5 w-5 mr-2" />Research
                  </NavButton>
                  <NavButton onClick={() => onViewChange('orchestrator')} isActive={currentView === 'orchestrator'}><DocumentIcon className="h-5 w-5 mr-2" />Orchestrator</NavButton>
                  <NavButton onClick={() => onViewChange('authors')} isActive={currentView === 'authors'}><AuthorIcon className="h-5 w-5 mr-2" />Authors</NavButton>
                  <NavButton onClick={() => onViewChange('journals')} isActive={currentView === 'journals'}><BookOpenIcon className="h-5 w-5 mr-2" />Journals</NavButton>
                  <NavButton onClick={() => onViewChange('knowledgeBase')} isActive={currentView === 'knowledgeBase'} disabled={!hasReports}><DatabaseIcon className="h-5 w-5 mr-2" />Knowledge <span className="ml-2 bg-surface text-text-secondary text-xs font-bold px-2 py-0.5 rounded-full">{displayCount}</span></NavButton>
                  <NavButton onClick={() => onViewChange('dashboard')} isActive={currentView === 'dashboard'} disabled={!hasReports}><ChartBarIcon className="h-5 w-5 mr-2" />Dashboard</NavButton>
                  <NavButton onClick={() => onViewChange('history')} isActive={currentView === 'history'} disabled={!hasReports}><HistoryIcon className="h-5 w-5 mr-2" />History</NavButton>
                </nav>
            </div>
            
            {/* Bottom Row: Title & Actions */}
            <div className="flex justify-between items-center">
                <h1 className="text-lg font-bold text-text-primary">{viewTitles[currentView]}</h1>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setIsCommandPaletteOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary bg-surface border border-border rounded-md hover:bg-surface-hover hover:text-text-primary transition-colors" aria-label="Open command palette">
                        <SearchIcon className="h-4 w-4" />
                        Search...
                        <kbd className="ml-2 px-1.5 py-0.5 text-xs font-semibold text-text-secondary bg-background border border-border rounded-md">⌘K</kbd>
                    </button>
                    <button onClick={onQuickAdd} className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-primary bg-surface border border-border rounded-md hover:bg-surface-hover transition-colors" aria-label="Quick Add Article">
                        <DocumentPlusIcon className="h-4 w-4"/> Quick Add
                    </button>
                    <div className="w-px h-6 bg-border mx-1"></div>
                     <NavButton onClick={() => onViewChange('settings')} isActive={currentView === 'settings'} ariaLabel="Settings">
                        <CogIcon className={`h-5 w-5 ${isSettingsDirty ? 'text-amber-400' : ''}`} />
                    </NavButton>
                    <NavButton onClick={() => onViewChange('help')} isActive={currentView === 'help'} ariaLabel="Help"><QuestionMarkCircleIcon className="h-5 w-5" /></NavButton>
                    <NavButton onClick={toggleTheme} isActive={false} ariaLabel={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} theme`}>
                         {settings.theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                    </NavButton>
                </div>
            </div>
          </div>

          {/* --- MOBILE HEADER (SINGLE LINE) --- */}
          <div className="md:hidden flex items-center justify-between h-16">
            <button onClick={() => onViewChange('home')} className="flex items-center gap-2" aria-label="Go to Home">
                <AppLogo idPrefix="mobile-header-logo" />
                <span className="font-bold text-lg text-text-primary">{viewTitles[currentView]}</span>
            </button>
            <div className="flex items-center gap-1">
                <button onClick={() => setIsCommandPaletteOpen(true)} className="p-2 text-text-secondary hover:text-text-primary" aria-label="Search"><SearchIcon className="h-6 w-6" /></button>
                <button onClick={onQuickAdd} className="p-2 text-text-secondary hover:text-text-primary" aria-label="Quick Add"><DocumentPlusIcon className="h-6 w-6" /></button>
                <div ref={mobileMenuRef} className="relative">
                    <button onClick={() => setIsMobileMenuOpen(prev => !prev)} className="p-2 text-text-secondary hover:text-text-primary" aria-label="More options">
                        <EllipsisHorizontalIcon className="h-6 w-6" />
                    </button>
                    {isMobileMenuOpen && (
                         <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-md shadow-lg z-10 animate-fadeIn" style={{ animationDuration: '150ms' }}>
                             <button onClick={() => handleMobileMenuSelect(() => onViewChange('settings'))} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-hover"><CogIcon className={`h-5 w-5 ${isSettingsDirty ? 'text-amber-400' : ''}`} /> Settings</button>
                             <button onClick={() => handleMobileMenuSelect(() => onViewChange('help'))} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-hover"><QuestionMarkCircleIcon className="h-5 w-5" /> Help</button>
                             <button onClick={() => handleMobileMenuSelect(toggleTheme)} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-hover">
                                 {settings.theme === 'dark' ? <><SunIcon className="h-5 w-5"/> Light Mode</> : <><MoonIcon className="h-5 w-5"/> Dark Mode</>}
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