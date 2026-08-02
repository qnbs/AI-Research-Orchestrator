import { RemovableTagChip } from './RemovableTagChip';
import React, { useState, useEffect } from 'react';
import type { RankedArticle } from '../types';
import { UnlockIcon } from './icons/UnlockIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { TagIcon } from './icons/TagIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { RelevanceScoreDisplay } from './RelevanceScoreDisplay';
import { useUI } from '../contexts/UIContext';
import { useTranslation } from '../hooks/useTranslation';
import {
  articleExternalUrl,
  canonicalArticleKey,
  formatLegacyArticleKeyLabel,
  resolveArticleId,
  sourceIdentifierCopyLabelKey,
  sourceIdentifierLabelKey,
} from '../lib/sourceIdentifier';

const getSummaryLimit = () => {
  if (typeof window === 'undefined') return 250;
  if (window.innerWidth < 768) return 150;
  if (window.innerWidth < 1280) return 200;
  return 250;
};

const ArticleHeader: React.FC<{
  article: RankedArticle;
  rank: number;
  articleLink: string;
}> = ({ article, rank, articleLink }) => {
  const { t } = useTranslation();
  return (
    <div className="flex justify-between items-start gap-4">
      <div className="flex-1 pr-4">
        {articleLink ? (
          <a
            href={articleLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-text-primary hover:text-brand-accent transition-colors"
          >
            <span className="text-text-secondary">{rank}. </span>
            {article.title}
          </a>
        ) : (
          <h3 className="text-lg font-semibold text-text-primary">
            <span className="text-text-secondary">{rank}. </span>
            {article.title}
          </h3>
        )}
        <div className="mt-1 text-xs text-text-secondary">
          <span>{article.authors}</span> &mdash;{' '}
          <span className="italic">
            {article.journal} ({article.pubYear})
          </span>
        </div>
        {article.isOpenAccess ? (
          <div className="mt-2 flex items-center text-xs text-green-400 font-medium">
            <UnlockIcon className="h-4 w-4 mr-1.5" />
            <span>{t('report.article.openAccess')}</span>
          </div>
        ) : null}
      </div>
      <RelevanceScoreDisplay score={article.relevanceScore} />
    </div>
  );
};

const ArticleTagEditor: React.FC<{
  tags: string[];
  tagInput: string;
  setTagInput: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}> = ({ tags, tagInput, setTagInput, onAddTag, onRemoveTag }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <TagIcon className="h-4 w-4 text-text-secondary flex-shrink-0" />
      {tags.map((tag) => (
        <RemovableTagChip
          key={tag}
          label={tag}
          onRemove={() => onRemoveTag(tag)}
          removeLabel={t('report.article.removeTagAria', { tag })}
          size="sm"
        />
      ))}
      <div className="flex-grow min-w-[120px]">
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            onAddTag();
          }}
          placeholder={t('report.article.addTagPlaceholder')}
          className="bg-input-bg border-border border rounded-md py-0.5 px-2 text-xs w-full focus:outline-none focus:ring-1 focus:ring-brand-accent"
        />
      </div>
    </div>
  );
};

const ArticleExternalActions: React.FC<{
  article: RankedArticle;
  onCopy: (text: string, typeLabel: string) => void;
}> = ({ article, onCopy }) => {
  const { t } = useTranslation();
  const articleId = resolveArticleId(article);
  const identifierCopyLabel = t(sourceIdentifierCopyLabelKey(articleId));
  const identifierTypeLabel = t(sourceIdentifierLabelKey(articleId));
  const googleScholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`;
  const semanticScholarUrl = `https://www.semanticscholar.org/search?q=${encodeURIComponent(article.title)}`;
  const identifierLabel = formatLegacyArticleKeyLabel(
    canonicalArticleKey(resolveArticleId(article)),
  );
  const citation = `${article.authors}. (${article.pubYear}). ${article.title}. ${article.journal}. ${identifierLabel}.`;

  return (
    <div className="flex items-center gap-4 text-text-secondary">
      <a
        href={googleScholarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-brand-accent"
        aria-label={t('report.article.googleScholarAria')}
      >
        <AcademicCapIcon className="h-5 w-5" />
      </a>
      <a
        href={semanticScholarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-brand-accent font-bold text-lg"
        aria-label={t('report.article.semanticScholarAria')}
      >
        S
      </a>
      <button
        type="button"
        onClick={() => onCopy(canonicalArticleKey(articleId), identifierCopyLabel)}
        className="flex items-center hover:text-brand-accent transition-colors"
        aria-label={t('report.article.copyIdentifierAria', { type: identifierTypeLabel })}
      >
        <ClipboardIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onCopy(citation, t('report.copyType.citation'))}
        className="flex items-center hover:text-brand-accent transition-colors"
        aria-label={t('report.article.copyCitationAria')}
      >
        <ClipboardDocumentListIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

const ArticleSummary: React.FC<{
  summaryLabel: string;
  displayedSummary: string;
  isMetadataOnly: boolean;
  isLongSummary: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  rationale: string;
}> = ({
  summaryLabel,
  displayedSummary,
  isMetadataOnly,
  isLongSummary,
  isExpanded,
  onToggleExpand,
  rationale,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <p className="mt-3 text-sm text-text-secondary/90 leading-relaxed">
        <strong className="text-text-secondary">{summaryLabel}: </strong>
        {isMetadataOnly ? (
          <span className="italic">{t('report.article.abstractMissing')}</span>
        ) : (
          displayedSummary
        )}
        {isLongSummary && !isMetadataOnly ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="ml-2 text-brand-accent text-xs font-semibold hover:underline"
          >
            {isExpanded ? t('report.article.showLess') : t('report.article.showMore')}
          </button>
        ) : null}
      </p>
      <p className="mt-2 text-xs text-text-secondary italic bg-surface-hover/50 p-2 rounded-md">
        <strong className="not-italic">{t('report.article.scoringRationale')} </strong>
        {rationale}
      </p>
    </>
  );
};

const resolveArticlePresentation = (
  article: RankedArticle,
  summaryCharLimit: number,
  isExpanded: boolean,
  summaryLabelAi: string,
  summaryLabelPlain: string,
) => {
  const articleLink = articleExternalUrl(article);
  const summaryToDisplay = article.aiSummary || article.summary;
  const summaryLabel = article.aiSummary
    ? summaryLabelAi
    : article.summary
      ? summaryLabelPlain
      : summaryLabelPlain;
  const isMetadataOnly = !article.aiSummary && !article.summary;
  const isLongSummary = summaryToDisplay.length > summaryCharLimit;
  const displayedSummary =
    isLongSummary && !isExpanded
      ? `${summaryToDisplay.substring(0, summaryCharLimit)}...`
      : summaryToDisplay;
  return { articleLink, summaryLabel, isLongSummary, displayedSummary, isMetadataOnly };
};

export const ReportArticleCard: React.FC<{
  article: RankedArticle;
  rank: number;
  onTagsUpdate: (pmid: string, newTags: string[]) => void;
}> = React.memo(function ReportArticleCard({ article, rank, onTagsUpdate }) {
  const { setNotification } = useUI();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [summaryCharLimit, setSummaryCharLimit] = useState(getSummaryLimit());
  const [tagInput, setTagInput] = useState('');
  const customTags = article.customTags || [];

  useEffect(() => {
    const handleResize = () => setSummaryCharLimit(getSummaryLimit());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addTag = () => {
    const newTag = tagInput.trim();
    if (!newTag || customTags.includes(newTag)) return;
    onTagsUpdate(article.pmid, [...customTags, newTag]);
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    onTagsUpdate(
      article.pmid,
      customTags.filter((tag) => tag !== tagToRemove),
    );
  };

  const { articleLink, summaryLabel, isLongSummary, displayedSummary, isMetadataOnly } =
    resolveArticlePresentation(
      article,
      summaryCharLimit,
      isExpanded,
      t('report.article.aiSummary'),
      t('report.article.summary'),
    );

  const handleCopy = (text: string, typeLabel: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setNotification({
        id: Date.now(),
        message: t('report.article.copiedToast', { type: typeLabel }),
        type: 'success',
      });
    });
  };

  return (
    <div className="bg-surface rounded-lg border border-border p-4 transition-all duration-200 hover:shadow-lg hover:border-brand-accent/30">
      <ArticleHeader article={article} rank={rank} articleLink={articleLink} />

      <ArticleSummary
        summaryLabel={summaryLabel}
        displayedSummary={displayedSummary}
        isMetadataOnly={isMetadataOnly}
        isLongSummary={isLongSummary}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        rationale={article.relevanceExplanation}
      />

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
          <ArticleTagEditor
            tags={customTags}
            tagInput={tagInput}
            setTagInput={setTagInput}
            onAddTag={addTag}
            onRemoveTag={removeTag}
          />
          <ArticleExternalActions article={article} onCopy={handleCopy} />
        </div>
      </div>
    </div>
  );
});
