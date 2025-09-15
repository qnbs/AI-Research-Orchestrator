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
        className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs font-medium transition-colors duration-200 focus:outline-none relative ${
            isActive ? 'text-brand-accent' : 'text-text-secondary hover:text-text-primary'
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-current={isActive ? 'page' : undefined}
    >
        {isSpecial && <span className="absolute top-1 right-1/2 translate-x-3 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-cyan"></span></span>}
        {badge !== undefined && badge > 0 && (
             <span className="absolute top-1 right-1/2 translate-x-4 bg-brand-accent text-brand-text-on-accent text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge > 99 ? '99+' : badge}</span>
        )}
        {icon}
        <span className="mt-1">{label}</span>
    </button>
);


export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, onViewChange, knowledgeBaseArticleCount, hasReports, isResearching }) => {
    const navItems: { view: View; label: string; icon: React.ReactNode; isDisabled?: boolean; isSpecial?: boolean; badge?: number}[] = [
        { view: 'home', label: 'Home', icon: <HomeIcon className="h-6 w-6" /> },
        { view: 'research', label: 'Research', icon: <BeakerIcon className="h-6 w-6" />, isSpecial: isResearching },
        { view: 'orchestrator', label: 'Orchestrate', icon: <DocumentIcon className="h-6 w-6" /> },
        { view: 'authors', label: 'Authors', icon: <AuthorIcon className="h-6 w-6" /> },
        { view: 'journals', label: 'Journals', icon: <BookOpenIcon className="h-6 w-6" /> },
        { view: 'knowledgeBase', label: 'Knowledge', icon: <DatabaseIcon className="h-6 w-6" />, isDisabled: !hasReports, badge: knowledgeBaseArticleCount },
    ];
    
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-t border-border z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
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