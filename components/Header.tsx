import React from 'react';
import { DocumentIcon } from './icons/DocumentIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';

export type View = 'orchestrator' | 'knowledgeBase';

interface HeaderProps {
    currentView: View;
    onViewChange: (view: View) => void;
    knowledgeBaseArticleCount: number;
    hasReports: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange, knowledgeBaseArticleCount, hasReports }) => {
    return (
      <header className="bg-dark-surface/80 backdrop-blur-sm sticky top-0 z-10 border-b border-dark-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
              <div className="flex items-center">
                <DocumentIcon className="h-8 w-8 text-brand-accent mr-3"/>
                <h1 className="text-2xl font-bold text-dark-text-primary tracking-wide">AI Research Orchestrator</h1>
              </div>
              <nav className="flex items-center space-x-2 bg-dark-bg p-1 rounded-lg">
                <button 
                  onClick={() => onViewChange('orchestrator')}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'orchestrator' ? 'bg-brand-accent text-dark-bg' : 'text-dark-text-secondary hover:bg-dark-surface hover:text-dark-text-primary'}`}
                >
                  <DocumentIcon className="h-5 w-5 mr-2" />
                  Orchestrator
                </button>
                <button
                  onClick={() => onViewChange('knowledgeBase')}
                  disabled={!hasReports}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'knowledgeBase' ? 'bg-brand-accent text-dark-bg' : 'text-dark-text-secondary hover:bg-dark-surface hover:text-dark-text-primary'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <DatabaseIcon className="h-5 w-5 mr-2" />
                  Knowledge Base ({knowledgeBaseArticleCount})
                </button>
              </nav>
          </div>
        </div>
      </header>
    );
};
