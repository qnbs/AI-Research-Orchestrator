
import React from 'react';
import type { View } from '../contexts/UIContext';
import { HomeIcon } from './icons/HomeIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { AuthorIcon } from './icons/AuthorIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';

interface BottomNavBarProps {
    currentView: View;
    onViewChange: (view: View) => void;
    knowledgeBaseArticleCount: number;
    hasReports: boolean;
    isResearching: boolean;
}

const NavItem: React.FC<{
    view: View;
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    isDisabled?: boolean;
    onClick: (view: View) => void;
    badge?: number;
    isSpecial?: boolean;
}> = ({ view, label, icon, isActive, isDisabled, onClick, badge, isSpecial }) => (
    <button
        onClick={() => onClick(view)}
        disabled={isDisabled}
        className={`flex flex-col items-center justify-center w-full pt-3 pb-2 text-[10px] font-medium transition-all duration-200 focus:outline-none relative ${
            isActive ? 'text-brand-accent' : 'text-text-secondary hover:text-text-primary'
        } ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
        aria-current={isActive ? 'page' : undefined}
    >
        <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-brand-accent/10 -translate-y-1 shadow-[0_0_10px_rgba(56,189,248,0.2)]' : ''}`}>
            {isSpecial && <span className="absolute top-2 right-1/2 translate-x-3 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan"></span></span>}
            {badge !== undefined && badge > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-4 bg-brand-accent text-brand-text-on-accent text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-background/50 backdrop-blur-md">{badge > 99 ? '99+' : badge}</span>
            )}
            {icon}
        </div>
        <span className={`mt-1 transition-opacity ${isActive ? 'opacity-100 font-bold text-brand-accent drop-shadow-sm' : 'opacity-80'}`}>{label}</span>
    </button>
);


export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, onViewChange, knowledgeBaseArticleCount, hasReports, isResearching }) => {
    const navItems: { view: View; label: string; icon: React.ReactNode; isDisabled?: boolean; isSpecial?: boolean; badge?: number}[] = [
        { view: 'home', label: 'Home', icon: <HomeIcon className="h-5 w-5" /> },
        { view: 'research', label: 'Research', icon: <BeakerIcon className="h-5 w-5" />, isSpecial: isResearching },
        { view: 'orchestrator', label: 'Agent', icon: <DocumentIcon className="h-5 w-5" /> },
        { view: 'authors', label: 'Authors', icon: <AuthorIcon className="h-5 w-5" /> },
        { view: 'journals', label: 'Journals', icon: <BookOpenIcon className="h-5 w-5" /> },
        { view: 'knowledgeBase', label: 'Data', icon: <DatabaseIcon className="h-5 w-5" />, isDisabled: !hasReports, badge: knowledgeBaseArticleCount },
    ];
    
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-xl border-t border-border z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.2)] pb-safe">
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                 {navItems.map(item => (
                    <NavItem
                        key={item.view}
                        {...item}
                        isActive={currentView === item.view}
                        onClick={onViewChange}
                    />
                 ))}
            </div>
        </nav>
    );
};
