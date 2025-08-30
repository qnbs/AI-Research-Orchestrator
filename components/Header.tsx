import React, { useState, useRef, useEffect } from 'react';
import { DocumentIcon } from './icons/DocumentIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GearIcon } from './icons/GearIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import type { Settings } from '../types';
import { useUI } from '../contexts/UIContext';
import { useSettings } from '../contexts/SettingsContext';
import type { View } from '../contexts/UIContext';

interface HeaderProps {
    knowledgeBaseArticleCount: number;
    hasReports: boolean;
    isResearching: boolean;
}

const AppLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: 'var(--color-brand-accent)', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: 'var(--color-accent-cyan)', stopOpacity: 1}} />
            </linearGradient>
        </defs>
        <path d="M12 2L8 4V8L12 10L16 8V4L12 2Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22L8 20V16L12 14L16 16V20L12 22Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 12L20 8L16 10L14 12L16 14L20 16L22 12Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12L4 8L8 10L10 12L8 14L4 16L2 12Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 10V14" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 8L4 8" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 8L20 8" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 16L4 16" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 16L20 16" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);


const NavButton: React.FC<{
    onClick: () => void;
    isActive: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
    ariaLabel?: string;
    ariaHasPopup?: boolean;
    ariaExpanded?: boolean;
}> = ({ onClick, isActive, disabled, children, className = '', ariaLabel, ariaHasPopup, ariaExpanded }) => {
    const activeClasses = 'text-text-primary';
    const inactiveClasses = 'text-text-secondary hover:text-text-primary';
    const disabledClasses = 'opacity-50 cursor-not-allowed';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-haspopup={ariaHasPopup}
            aria-expanded={ariaExpanded}
            className={`relative flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isActive ? activeClasses : inactiveClasses} ${disabled ? disabledClasses : ''} ${className}`}
        >
            {children}
            {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand-accent rounded-full"></span>}
        </button>
    );
};


export const Header: React.FC<HeaderProps> = ({ knowledgeBaseArticleCount, hasReports, isResearching }) => {
    const { settings, updateSettings } = useSettings();
    const { currentView, setCurrentView, isSettingsDirty, setPendingNavigation } = useUI();
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const isMoreMenuActive = currentView === 'dashboard' || currentView === 'history';

    const onViewChange = (view: View) => {
        if (isSettingsDirty && currentView === 'settings') {
            setPendingNavigation(view);
        } else {
            setCurrentView(view);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleDropdownSelect = (view: View) => {
        onViewChange(view);
        setIsMoreMenuOpen(false);
    }

    const toggleTheme = () => {
        updateSettings(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
    };

    return (
      <header className="bg-surface/80 backdrop-blur-md sticky top-0 z-20 border-b border-border shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <AppLogoIcon />
                <h1 className="text-xl font-bold text-text-primary tracking-tight hidden sm:block">AI Research</h1>
              </div>
              <div className="flex items-center gap-2">
                <nav className="flex items-center space-x-1 bg-background/50 p-1 rounded-lg border border-border">
                  <NavButton onClick={() => onViewChange('orchestrator')} isActive={currentView === 'orchestrator'}>
                    <DocumentIcon className="h-5 w-5 mr-2" />
                    Orchestrator
                  </NavButton>
                   <NavButton onClick={() => onViewChange('research')} isActive={currentView === 'research'} className="relative">
                    {isResearching && <span className="absolute top-1 right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-cyan"></span></span>}
                    <BeakerIcon className="h-5 w-5 mr-2" />
                    Research
                  </NavButton>
                  <NavButton onClick={() => onViewChange('knowledgeBase')} isActive={currentView === 'knowledgeBase'} disabled={!hasReports}>
                    <DatabaseIcon className="h-5 w-5 mr-2" />
                    Knowledge Base <span className="ml-2 bg-surface text-text-secondary text-xs font-bold px-2 py-0.5 rounded-full">{knowledgeBaseArticleCount}</span>
                  </NavButton>
                  <div className="relative" ref={moreMenuRef}>
                    <NavButton
                        onClick={() => setIsMoreMenuOpen(prev => !prev)}
                        isActive={isMoreMenuActive && hasReports}
                        disabled={!hasReports}
                        ariaHasPopup={true}
                        ariaExpanded={isMoreMenuOpen}
                    >
                        More
                        <ChevronDownIcon className={`h-4 w-4 ml-1.5 transform transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
                    </NavButton>
                    {isMoreMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-md shadow-lg z-20 animate-fadeIn" style={{animationDuration: '150ms'}}>
                            <div className="p-1">
                                <button
                                    onClick={() => handleDropdownSelect('dashboard')}
                                    disabled={!hasReports}
                                    className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'dashboard' ? 'bg-brand-accent/20 text-brand-accent' : 'text-text-primary hover:bg-surface-hover'} disabled:opacity-50`}
                                >
                                    <ChartBarIcon className="h-5 w-5 mr-3" />
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => handleDropdownSelect('history')}
                                    disabled={!hasReports}
                                    className={`w-full text-left flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'history' ? 'bg-brand-accent/20 text-brand-accent' : 'text-text-primary hover:bg-surface-hover'} disabled:opacity-50`}
                                >
                                    <HistoryIcon className="h-5 w-5 mr-3" />
                                    History
                                </button>
                            </div>
                        </div>
                    )}
                  </div>
                </nav>
                <div className="h-6 w-px bg-border mx-1"></div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-md transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                        aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {settings.theme === 'dark' ? <SunIcon className="h-6 w-6 text-accent-amber" /> : <MoonIcon className="h-6 w-6" />}
                    </button>
                    <button
                        onClick={() => onViewChange('settings')}
                        className={`relative p-2 rounded-md transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${currentView === 'settings' ? 'bg-surface-hover text-brand-accent' : ''}`}
                        aria-label="Settings"
                    >
                        <GearIcon className="h-6 w-6" />
                        {isSettingsDirty && <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-accent-amber ring-2 ring-surface" />}
                    </button>
                    <button
                        onClick={() => onViewChange('help')}
                        className={`p-2 rounded-md transition-colors text-text-secondary hover:bg-surface-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${currentView === 'help' ? 'bg-surface-hover text-brand-accent' : ''}`}
                        aria-label="Help"
                    >
                        <QuestionMarkCircleIcon className="h-6 w-6" />
                    </button>
                </div>
              </div>
          </div>
        </div>
      </header>
    );
};