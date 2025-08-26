import React from 'react';
import { DocumentIcon } from './icons/DocumentIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { GearIcon } from './icons/GearIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';

export type View = 'orchestrator' | 'knowledgeBase' | 'settings' | 'help';

interface HeaderProps {
    currentView: View;
    onViewChange: (view: View) => void;
    knowledgeBaseArticleCount: number;
    hasReports: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, knowledgeBaseArticleCount, hasReports }) => {
    return (
      <header className="bg-surface/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
              <div className="flex items-center">
                <DocumentIcon className="h-8 w-8 text-brand-accent mr-3"/>
                <h1 className="text-2xl font-bold text-text-primary tracking-wide">AI Research Orchestrator</h1>
              </div>
              <div className="flex items-center">
                <nav className="flex items-center space-x-2 bg-background p-1 rounded-lg">
                  <button 
                    onClick={() => onViewChange('orchestrator')}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'orchestrator' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`}
                  >
                    <DocumentIcon className="h-5 w-5 mr-2" />
                    Orchestrator
                  </button>
                  <button
                    onClick={() => onViewChange('knowledgeBase')}
                    disabled={!hasReports}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'knowledgeBase' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface hover:text-text-primary'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <DatabaseIcon className="h-5 w-5 mr-2" />
                    Knowledge Base ({knowledgeBaseArticleCount})
                  </button>
                </nav>
                <div className="flex items-center ml-4 space-x-1">
                    <button
                        onClick={() => onViewChange('settings')}
                        className={`p-2 rounded-md transition-colors ${currentView === 'settings' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`}
                        aria-label="Settings"
                    >
                        <GearIcon className="h-6 w-6" />
                    </button>
                    <button
                        onClick={() => onViewChange('help')}
                        className={`p-2 rounded-md transition-colors ${currentView === 'help' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`}
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