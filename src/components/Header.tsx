
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
import { useTranslation } from '../hooks/useTranslation';
import { GlobeAltIcon } from './icons/GlobeAltIcon';

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
        className={`relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent overflow-hidden
        ${isActive 
            ? 'text-brand-accent bg-brand-accent/5 border border-brand-accent/20 shadow-[0_0_15px_rgba(56,189,248,0.15)]' 
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent'} 
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
        {isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-accent/5 to-transparent opacity-50 animate-pulse"></div>}
        <div className="relative flex items-center">{children}</div>
    </button>
);


const HeaderComponent: React.FC<HeaderProps> = ({ onViewChange, currentView, knowledgeBaseArticleCount, hasReports, isResearching, onQuickAdd }) => {
    const { settings, updateSettings } = useSettings();
    const { isSettingsDirty, setIsCommandPaletteOpen } = useUI();
    const { t, lang } = useTranslation();
    
    // State for mobile "More" menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

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
    
    const toggleLanguage = () => updateSettings(prev => ({ ...prev, appLanguage: prev.appLanguage === 'en' ? 'de' : 'en' }));

    const displayCount = knowledgeBaseArticleCount > 999 ? '999+' : knowledgeBaseArticleCount;

    return (
      <header className="fixed top-0 left-0 right-0 z-20 transition-all duration-300 border-b border-border bg-surface/70 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* --- DESKTOP HEADER (TWO-LINE) --- */}
          <div className="hidden md:flex flex-col py-3 gap-3">
            {/* Top Row: Logo & Navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => onViewChange('home')} className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-md group" aria-label="Go to Home">
                <AppLogo idPrefix="header-logo" className="w-8 h-8 drop-shadow-lg group-hover:scale-105 transition-transform duration-300" />
                <span className="font-bold text-lg tracking-tight text-text-primary">Research<span className="text-brand-accent drop-shadow-sm">Orchestrator</span></span>
              </button>
                <nav className="flex items-center gap-1 p-1.5 rounded-xl border border-white/5 bg-black/5 backdrop-blur-md shadow-inner" aria-label="Main navigation">
                  <NavButton onClick={() => onViewChange('research')} isActive={currentView === 'research'} className="relative">
                    {isResearching && <span className="absolute top-1.5 right-1.5 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan"></span></span>}
                    <BeakerIcon className="h-4 w-4 mr-2" />{t('nav.research')}
                  </NavButton>
                  <NavButton onClick={() => onViewChange('orchestrator')} isActive={currentView === 'orchestrator'}><DocumentIcon className="h-4 w-4 mr-2" />{t('nav.orchestrator')}</NavButton>
                  <NavButton onClick={() => onViewChange('authors')} isActive={currentView === 'authors'}><AuthorIcon className="h-4 w-4 mr-2" />{t('nav.authors')}</NavButton>
                  <NavButton onClick={() => onViewChange('journals')} isActive={currentView === 'journals'}><BookOpenIcon className="h-4 w-4 mr-2" />{t('nav.journals')}</NavButton>
                  <div className="w-px h-5 bg-border mx-1"></div>
                  <NavButton onClick={() => onViewChange('knowledgeBase')} isActive={currentView === 'knowledgeBase'} disabled={!hasReports}><DatabaseIcon className="h-4 w-4 mr-2" />{t('nav.knowledgeBase')} <span className="ml-2 bg-background/80 border border-border text-text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">{displayCount}</span></NavButton>
                  <NavButton onClick={() => onViewChange('dashboard')} isActive={currentView === 'dashboard'} disabled={!hasReports}><ChartBarIcon className="h-4 w-4 mr-2" />{t('nav.dashboard')}</NavButton>
                  <NavButton onClick={() => onViewChange('history')} isActive={currentView === 'history'} disabled={!hasReports}><HistoryIcon className="h-4 w-4 mr-2" />{t('nav.history')}</NavButton>
                </nav>
            </div>
            
            {/* Bottom Row: Title & Actions */}
            <div className="flex justify-between items-center pl-1">
                <h1 className="text-xl font-bold text-text-primary tracking-tight brand-gradient-text">{viewTitles[currentView]}</h1>
                 <div className="flex items-center gap-3">
                    <button onClick={() => setIsCommandPaletteOpen(true)} className="group flex items-center gap-3 px-4 py-2 text-sm text-text-secondary bg-input-bg border border-border rounded-lg hover:border-brand-accent/50 hover:text-text-primary hover:shadow-glow transition-all duration-300 backdrop-blur-sm" aria-label="Open command palette">
                        <SearchIcon className="h-4 w-4 group-hover:text-brand-accent transition-colors" />
                        <span>{t('nav.search_placeholder')}</span>
                        <kbd className="hidden lg:inline-block ml-4 px-1.5 py-0.5 text-[10px] font-bold text-text-secondary bg-surface border border-border rounded shadow-sm">⌘K</kbd>
                    </button>
                    <button onClick={onQuickAdd} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-text-on-accent bg-gradient-to-r from-brand-primary to-brand-accent rounded-lg shadow-md hover:shadow-glow hover:opacity-95 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95" aria-label="Quick Add Article">
                        <DocumentPlusIcon className="h-4 w-4"/> <span className="hidden lg:inline">{t('nav.quick_add')}</span>
                    </button>
                    <div className="w-px h-6 bg-border mx-1"></div>
                    
                    <button onClick={toggleLanguage} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors font-bold text-xs flex items-center gap-1 border border-transparent hover:border-border" aria-label="Toggle Language">
                        <GlobeAltIcon className="h-4 w-4" />
                        {lang.toUpperCase()}
                    </button>

                     <button onClick={() => onViewChange('settings')} className={`p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors relative ${currentView === 'settings' ? 'bg-surface-hover text-text-primary' : ''}`} aria-label="Settings">
                        <CogIcon className={`h-5 w-5 ${isSettingsDirty ? 'text-accent-amber' : ''}`} />
                        {isSettingsDirty && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent-amber ring-2 ring-surface animate-pulse"></span>}
                    </button>
                    <button onClick={() => onViewChange('help')} className={`p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors ${currentView === 'help' ? 'bg-surface-hover text-text-primary' : ''}`} aria-label="Help"><QuestionMarkCircleIcon className="h-5 w-5" /></button>
                    <button onClick={toggleTheme} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors" aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} theme`}>
                         {settings.theme === 'dark' ? <SunIcon className="h-5 w-5 text-accent-amber hover:rotate-45 transition-transform" /> : <MoonIcon className="h-5 w-5 text-brand-accent hover:-rotate-12 transition-transform" />}
                    </button>
                </div>
            </div>
          </div>

          {/* --- MOBILE HEADER (SINGLE LINE) --- */}
          <div className="md:hidden flex items-center justify-between h-16">
            <button onClick={() => onViewChange('home')} className="flex items-center gap-3" aria-label="Go to Home">
                <AppLogo idPrefix="mobile-header-logo" />
                <span className="font-bold text-lg text-text-primary truncate max-w-[140px] brand-gradient-text">{viewTitles[currentView]}</span>
            </button>
            <div className="flex items-center gap-1">
                <button onClick={toggleLanguage} className="p-2.5 text-text-secondary font-bold text-xs">{lang.toUpperCase()}</button>
                <button onClick={() => setIsCommandPaletteOpen(true)} className="p-2.5 text-text-secondary hover:text-text-primary rounded-full hover:bg-surface-hover" aria-label="Search"><SearchIcon className="h-5 w-5" /></button>
                <button onClick={onQuickAdd} className="p-2.5 text-text-secondary hover:text-text-primary rounded-full hover:bg-surface-hover" aria-label="Quick Add"><DocumentPlusIcon className="h-5 w-5" /></button>
                <div ref={mobileMenuRef} className="relative">
                    <button onClick={() => setIsMobileMenuOpen(prev => !prev)} className="p-2.5 text-text-secondary hover:text-text-primary rounded-full hover:bg-surface-hover" aria-label="More options">
                        <EllipsisHorizontalIcon className="h-6 w-6" />
                    </button>
                    {isMobileMenuOpen && (
                         <div className="absolute right-0 mt-2 w-56 bg-surface/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl z-50 animate-fadeIn overflow-hidden">
                             <button onClick={() => handleMobileMenuSelect(() => onViewChange('settings'))} className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover border-b border-border/50"><CogIcon className={`h-5 w-5 ${isSettingsDirty ? 'text-accent-amber' : ''}`} /> {t('nav.settings')}</button>
                             <button onClick={() => handleMobileMenuSelect(() => onViewChange('help'))} className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover border-b border-border/50"><QuestionMarkCircleIcon className="h-5 w-5" /> {t('nav.help')}</button>
                             <button onClick={() => handleMobileMenuSelect(toggleTheme)} className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover">
                                 {settings.theme === 'dark' ? <><SunIcon className="h-5 w-5 text-accent-amber"/> Light Mode</> : <><MoonIcon className="h-5 w-5 text-brand-accent"/> Dark Mode</>}
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
