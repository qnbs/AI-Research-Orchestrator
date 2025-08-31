import React, { useState, useRef, useEffect } from 'react';
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
import { useUI } from '../contexts/UIContext';
import { useSettings } from '../contexts/SettingsContext';
import type { View } from '../contexts/UIContext';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { SearchIcon } from './icons/SearchIcon';
import { EllipsisHorizontalIcon } from './icons/EllipsisHorizontalIcon';

interface HeaderProps {
    onViewChange: (view: View) => void;
    knowledgeBaseArticleCount: number;
    hasReports: boolean;
    isResearching: boolean;
    onQuickAdd: () => void;
}

const AppLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs><linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style={{stopColor: 'var(--color-brand-accent)', stopOpacity: 1}} /><stop offset="100%" style={{stopColor: 'var(--color-accent-cyan)', stopOpacity: 1}} /></linearGradient></defs>
        <path d="M12 2L8 4V8L12 10L16 8V4L12 2Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22L8 20V16L12 14L16 16V20L12 22Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 12L20 8L16 10L14 12L16 14L20 16L22 12Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12L4 8L8 10L10 12L8 14L4 16L2 12Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 10V14" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 8L4 8" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 8L20 8" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 16L4 16" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 16L20 16" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);


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


export const Header: React.FC<HeaderProps> = ({ onViewChange, knowledgeBaseArticleCount, hasReports, isResearching, onQuickAdd }) => {
    const { settings, updateSettings } = useSettings();
    const { currentView, isSettingsDirty, setIsCommandPaletteOpen } = useUI();
    
    // State for mobile "More" menu
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

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

    return (
      <header className="bg-surface/80 backdrop-blur-md sticky top-0 z-20 border-b border-border shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* --- DESKTOP HEADER (TWO-LINE) --- */}
          <div className="hidden md:flex flex-col py-2 gap-2">
            {/* Top Row: Logo & Navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => onViewChange('home')} className="flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-md p-1 -m-1" aria-label="Go to Home">
                <AppLogoIcon />
              </button>
                <nav className="flex items-center space-x-1 bg-background/50 p-1 rounded-lg border border-border" aria-label="Main navigation">
                  <NavButton onClick={() => onViewChange('research')} isActive={currentView === 'research'} className="relative">
                    {isResearching && <span className="absolute top-1 right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-cyan"></span></span>}
                    <BeakerIcon className="h-5 w-5 mr-2" />Research
                  </NavButton>
                  <NavButton onClick={() => onViewChange('orchestrator')} isActive={currentView === 'orchestrator'}><DocumentIcon className="h-5 w-5 mr-2" />Orchestrator</NavButton>
                  <NavButton onClick={() => onViewChange('authors')} isActive={currentView === 'authors'}><AuthorIcon className="h-5 w-5 mr-2" />Authors</NavButton>
                  <NavButton onClick={() => onViewChange('knowledgeBase')} isActive={currentView === 'knowledgeBase'} disabled={!hasReports}><DatabaseIcon className="h-5 w-5 mr-2" />Knowledge <span className="ml-2 bg-surface text-text-secondary text-xs font-bold px-2 py-0.5 rounded-full">{knowledgeBaseArticleCount}</span></NavButton>
                  <NavButton onClick={() => onViewChange('dashboard')} isActive={currentView === 'dashboard'} disabled={!hasReports}><ChartBarIcon className="h-5 w-5 mr-2" />Dashboard</NavButton>
                  <NavButton onClick={() => onViewChange('history')} isActive={currentView === 'history'} disabled={!hasReports}><HistoryIcon className="h-5 w-5 mr-2" />History</NavButton>
                </nav>
            </div>

            {/* Bottom Row: Actions */}
            <div className="flex items-center justify-end space-x-1">
                <button onClick={onQuickAdd} className="p-2 rounded-md transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent" aria-label="Quick Add Article" title="Quick Add Article"><DocumentPlusIcon className="h-6 w-6" /></button>
                <button onClick={() => setIsCommandPaletteOpen(true)} className="p-2 rounded-md transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent" aria-label="Open Command Palette" title="Search / Command Palette (⌘+K)"><SearchIcon className="h-6 w-6" /></button>
                <div className="w-px h-6 bg-border mx-2"></div>
                <button onClick={toggleTheme} className="p-2 rounded-md transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent" aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}>
                    {settings.theme === 'dark' ? <SunIcon className="h-6 w-6 text-accent-amber" /> : <MoonIcon className="h-6 w-6" />}
                </button>
                <button onClick={() => onViewChange('settings')} className={`relative p-2 rounded-md transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${currentView === 'settings' ? 'bg-surface-hover text-brand-accent' : ''}`} aria-label="Settings">
                    <GearIcon className="h-6 w-6" />
                    {isSettingsDirty && <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-accent-amber ring-2 ring-surface" />}
                </button>
                <button onClick={() => onViewChange('help')} className={`p-2 rounded-md transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${currentView === 'help' ? 'bg-surface-hover text-brand-accent' : ''}`} aria-label="Help"><QuestionMarkCircleIcon className="h-6 w-6" /></button>
            </div>
          </div>
          
          {/* --- MOBILE HEADER (SINGLE LINE) --- */}
          <div className="md:hidden flex items-center justify-between h-16">
              <button onClick={() => onViewChange('home')} className="flex items-center gap-4 p-1 -m-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-md" aria-label="Go to Home">
                <AppLogoIcon />
              </button>
              <div className="flex items-center space-x-1">
                  <button onClick={onQuickAdd} className="p-2 rounded-md transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary" aria-label="Quick Add Article"><DocumentPlusIcon className="h-6 w-6" /></button>
                  <button onClick={() => setIsCommandPaletteOpen(true)} className="p-2 rounded-md transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary" aria-label="Open Command Palette"><SearchIcon className="h-6 w-6" /></button>
                  <div className="relative" ref={mobileMenuRef}>
                      <button onClick={() => setIsMobileMenuOpen(prev => !prev)} className="p-2 rounded-md transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary" aria-label="More options" aria-haspopup="true" aria-expanded={isMobileMenuOpen}>
                        <EllipsisHorizontalIcon className="h-6 w-6" />
                      </button>
                      {isMobileMenuOpen && (
                          <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-md shadow-lg z-20 animate-fadeIn" style={{animationDuration: '150ms'}}>
                              <div className="p-1" role="menu" aria-orientation="vertical">
                                <button onClick={() => handleMobileMenuSelect(toggleTheme)} className="w-full text-left flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors text-text-primary hover:bg-surface-hover" role="menuitem">
                                    <span>Toggle Theme</span>
                                    {settings.theme === 'dark' ? <SunIcon className="h-5 w-5 text-accent-amber" /> : <MoonIcon className="h-5 w-5" />}
                                </button>
                                <button onClick={() => handleMobileMenuSelect(() => onViewChange('settings'))} className="w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-text-primary hover:bg-surface-hover" role="menuitem">
                                    <GearIcon className="h-5 w-5 mr-3" /> Settings
                                </button>
                                <button onClick={() => handleMobileMenuSelect(() => onViewChange('help'))} className="w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-text-primary hover:bg-surface-hover" role="menuitem">
                                    <QuestionMarkCircleIcon className="h-5 w-5 mr-3" /> Help
                                </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
        </div>
      </header>
    );
};