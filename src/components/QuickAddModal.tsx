import React, { useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { XIcon } from './icons/XIcon';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { useSettings } from '../contexts/SettingsContext';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { analyzeSingleArticle } from '../services/geminiService';

interface QuickAddModalProps {
    onClose: () => void;
}

const QuickAddModal: React.FC<QuickAddModalProps> = ({ onClose }) => {
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const modalRef = useFocusTrap<HTMLDivElement>(true);
    
    const { settings } = useSettings();
    const { addSingleArticleReport } = useKnowledgeBase();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const article = await analyzeSingleArticle(identifier, settings.ai);
            await addSingleArticleReport(article);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn" style={{ animationDuration: '150ms' }}>
            <div ref={modalRef} className="bg-surface rounded-lg border border-border shadow-2xl p-6 w-full max-w-lg m-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold brand-gradient-text flex items-center">
                        <DocumentPlusIcon className="w-6 h-6 mr-2" />
                        Quick Add Article
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-hover" aria-label="Close modal">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                    Quickly add a single article to your knowledge base by providing its PubMed URL, PMID, or DOI.
                </p>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="article-identifier" className="sr-only">Article Identifier</label>
                    <input
                        id="article-identifier"
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm"
                        placeholder="e.g., 31354136 or https://pubmed.ncbi.nlm.nih.gov/..."
                        autoFocus
                    />
                    {error && (
                        <p className="text-xs text-red-400 mt-2">{error}</p>
                    )}
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading || !identifier.trim()} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-accent hover:bg-opacity-90 disabled:opacity-50 flex items-center">
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Analyzing...
                                </>
                            ) : 'Analyze & Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
// FIX: Changed to default export to resolve lazy loading type issue.
export default QuickAddModal;
