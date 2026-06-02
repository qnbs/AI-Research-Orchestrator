import React, { useEffect, useState } from 'react';
import type { RankedArticle } from '../../types';
import { useUI } from '../../contexts/UIContext';
import { RelevanceScoreDisplay } from '../RelevanceScoreDisplay';
import { UnlockIcon } from '../icons/UnlockIcon';
import { TagIcon } from '../icons/TagIcon';
import { XIcon } from '../icons/XIcon';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';
import { ClipboardIcon } from '../icons/ClipboardIcon';
import { ClipboardDocumentListIcon } from '../icons/ClipboardDocumentListIcon';
import { getSummaryCharLimit } from './reportDisplayUtils';

export const ReportArticleCard: React.FC<{
  article: RankedArticle;
  rank: number;
  onTagsUpdate: (pmid: string, newTags: string[]) => void;
}> = React.memo(({ article, rank, onTagsUpdate }) => {
  const { setNotification } = useUI();
  const [isExpanded, setIsExpanded] = useState(false);
  const [summaryCharLimit, setSummaryCharLimit] = useState(getSummaryCharLimit());
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    const handleResize = () => setSummaryCharLimit(getSummaryCharLimit());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !(article.customTags || []).includes(newTag)) {
        onTagsUpdate(article.pmid, [...(article.customTags || []), newTag]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsUpdate(
      article.pmid,
      (article.customTags || []).filter((tag) => tag !== tagToRemove),
    );
  };

  const articleLink = article.pmcId
    ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/`
    : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;

  const summaryToDisplay = article.aiSummary || article.summary;
  const summaryLabel = article.aiSummary ? 'AI Summary' : 'Summary';
  const isLongSummary = summaryToDisplay.length > summaryCharLimit;

  const displayedSummary =
    isLongSummary && !isExpanded
      ? `${summaryToDisplay.substring(0, summaryCharLimit)}...`
      : summaryToDisplay;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setNotification({ id: Date.now(), message: `${type} copied to clipboard!`, type: 'success' });
    });
  };

  const googleScholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`;
  const semanticScholarUrl = `https://www.semanticscholar.org/search?q=${encodeURIComponent(article.title)}`;

  return (
    <div className="bg-surface rounded-lg border border-border p-4 transition-all duration-200 hover:shadow-lg hover:border-brand-accent/30">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 pr-4">
          <a
            href={articleLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-text-primary hover:text-brand-accent transition-colors"
          >
            <span className="text-text-secondary">{rank}. </span>
            {article.title}
          </a>
          <div className="mt-1 text-xs text-text-secondary">
            <span>{article.authors}</span> &mdash;{' '}
            <span className="italic">
              {article.journal} ({article.pubYear})
            </span>
          </div>
          {article.isOpenAccess && (
            <div className="mt-2 flex items-center text-xs text-green-400 font-medium">
              <UnlockIcon className="h-4 w-4 mr-1.5" />
              <span>Open Access</span>
            </div>
          )}
        </div>
        <RelevanceScoreDisplay score={article.relevanceScore} />
      </div>

      <p className="mt-3 text-sm text-text-secondary/90 leading-relaxed">
        <strong className="text-text-secondary">{summaryLabel}: </strong>
        {displayedSummary}
        {isLongSummary && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 text-brand-accent text-xs font-semibold hover:underline"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        )}
      </p>
      <p className="mt-2 text-xs text-text-secondary italic bg-surface-hover/50 p-2 rounded-md">
        <strong className="not-italic">Scoring rationale: </strong>
        {article.relevanceExplanation}
      </p>

      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(article.keywords || []).map((kw) => (
            <span
              key={kw}
              className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-sky-500/20"
            >
              {kw}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex flex-wrap gap-2 items-center">
            <TagIcon className="h-4 w-4 text-text-secondary flex-shrink-0" />
            {(article.customTags || []).map((tag) => (
              <span
                key={tag}
                className="flex items-center bg-purple-500/10 text-purple-300 text-xs font-medium pl-2 pr-1 py-0.5 rounded-full border border-purple-500/20"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1.5 text-purple-300 hover:text-white focus:outline-none"
                  aria-label={`Remove tag ${tag}`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            <div className="flex-grow min-w-[120px]">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Add tag..."
                className="bg-input-bg border-border border rounded-md py-0.5 px-2 text-xs w-full focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-text-secondary">
            <a
              href={googleScholarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-accent"
              aria-label="Search on Google Scholar"
            >
              <AcademicCapIcon className="h-5 w-5" />
            </a>
            <a
              href={semanticScholarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-accent font-bold text-lg"
              aria-label="Search on Semantic Scholar"
            >
              S
            </a>
            <button
              type="button"
              onClick={() => handleCopy(article.pmid, 'PMID')}
              className="flex items-center hover:text-brand-accent transition-colors"
              aria-label="Copy PMID"
            >
              <ClipboardIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  `${article.authors}. (${article.pubYear}). ${article.title}. ${article.journal}. PMID: ${article.pmid}.`,
                  'Citation',
                )
              }
              className="flex items-center hover:text-brand-accent transition-colors"
              aria-label="Copy Citation"
            >
              <ClipboardDocumentListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

ReportArticleCard.displayName = 'ReportArticleCard';
