
import React, { useState, useId } from 'react';
import type { ResearchAnalysis, SimilarArticle, OnlineFindings } from '@/types';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { BeakerIcon } from '@/components/icons/BeakerIcon';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { SparklesIcon } from '@/components/icons/SparklesIcon';
import { BookOpenIcon } from '@/components/icons/BookOpenIcon';
import { WebIcon } from '@/components/icons/WebIcon';
import { DocumentIcon } from '@/components/icons/DocumentIcon';
import { XCircleIcon } from '@/components/icons/XCircleIcon';
import { useUI } from '@/contexts/UIContext';

interface ResearchViewProps {
    onStartResearch: (queryText: string) => void;
    onClearResearch: () => void;
    isLoading: boolean;
    phase: string;
    error: string | null;
    analysis: ResearchAnalysis | null;
    similarArticlesState: { loading: boolean; error: string | null; articles: SimilarArticle[] | null };
    onlineFindingsState: { loading: boolean; error: string | null; findings: OnlineFindings | null };
}

const secureMarkdownToHtml = (text: string): string => {
    if (!text) return '';
    const rawMarkup = marked.parse(text.trim(), { breaks: true, gfm: true }) as string;
    return DOMPurify.sanitize(rawMarkup);
};

const AccordionSection: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `accordion-panel-${id}`;
  const buttonId = `accordion-button-${id}`;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-brand-accent hover:bg-surface-hover focus:outline-none transition-colors"
      >
        <div className="flex items-center">{title}</div>
        <ChevronDownIcon className={`h-6 w-6 transform transition-transform duration-300 text-text-secondary ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
            <div className="p-4 bg-background/50">
                {children}
            </div>
        </div>
      </div>
    </div>
  );
