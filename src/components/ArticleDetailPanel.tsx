import { RemovableTagChip } from './RemovableTagChip';
import React, { useEffect, useState, useRef } from 'react';
import type { AggregatedArticle, SimilarArticle, OnlineFindings } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import {
  findSimilarArticles,
  findRelatedOnline,
  generateTldrSummary,
} from '../services/geminiService';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { XIcon } from './icons/XIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { TagIcon } from './icons/TagIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { WebIcon } from './icons/WebIcon';
import { RelevanceScoreDisplay } from './RelevanceScoreDisplay';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../hooks/useTranslation';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import { safeLogError } from '../lib/safeLog';
import { stableInsightKey } from '../lib/stableReactKeys';
import {
  articleExternalUrl,
  formatSourceIdentifierValue,
  normalizePmcidValue,
  resolveArticleId,
  sourceIdentifierExternalUrl,
  legacyArticleKeyUrl,
  sourceIdentifierLabelKey,
} from '../lib/sourceIdentifier';

interface ArticleDetailPanelProps {
  article: AggregatedArticle;
  onClose: () => void;
  findRelatedInsights: (
    pmid: string,
  ) => { question: string; answer: string; supportingArticles: string[] }[];
  onAnalyzeJournal?: (journalName: string) => void;
}

const SKELETON_LINE_KEYS = [
  'sk-line-a',
  'sk-line-b',
  'sk-line-c',
  'sk-line-d',
  'sk-line-e',
] as const;

const SkeletonLoader: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-3 animate-pulse ${className}`}>
    {Array.from({ length: lines }, (_, i) => (
      <div
        key={SKELETON_LINE_KEYS[i] ?? `sk-line-${lines}-${i}`}
        className="p-3 rounded-md bg-surface/50 border border-border/70"
      >
        <div className="h-4 w-3/4 rounded bg-border/50"></div>
        <div className="mt-2 h-2 w-1/4 rounded bg-border/50"></div>
        <div className="mt-3 h-2 w-5/6 rounded bg-border/50"></div>
      </div>
    ))}
  </div>
);

export const ArticleDetailPanel: React.FC<ArticleDetailPanelProps> = ({
  article,
  onClose,
  findRelatedInsights,
  onAnalyzeJournal,
}) => {
  const { settings } = useSettings();
  const { updateTags } = useKnowledgeBase();
  const { t } = useTranslation();
  const [tagInput, setTagInput] = useState('');

  const [similarArticles, setSimilarArticles] = useState<SimilarArticle[] | null>(null);
  const [isFindingSimilar, setIsFindingSimilar] = useState(false);
  const [findError, setFindError] = useState<TranslationKey | null>(null);

  const [onlineFindings, setOnlineFindings] = useState<OnlineFindings | null>(null);
  const [isFindingOnline, setIsFindingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<TranslationKey | null>(null);
  const [tldr, setTldr] = useState<string | null>(null);
  const [isGeneratingTldr, setIsGeneratingTldr] = useState(false);
  const [tldrError, setTldrError] = useState<TranslationKey | null>(null);

  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showGoToTop, setShowGoToTop] = useState(false);
  const isMounted = useRef(true);

  const articleId = resolveArticleId(article);
  const relatedInsights = findRelatedInsights(article.pmid);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden'; // Prevent background scroll

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;
    const handleScroll = () => setShowGoToTop(contentEl.scrollTop > 200);
    contentEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => contentEl.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !(article.customTags || []).includes(newTag)) {
        updateTags(article.pmid, [...(article.customTags || []), newTag]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateTags(
      article.pmid,
      (article.customTags || []).filter((tag) => tag !== tagToRemove),
    );
  };

  const handleFindSimilar = async () => {
    setIsFindingSimilar(true);
    setFindError(null);
    try {
      const result = await findSimilarArticles(
        { title: article.title, summary: article.summary },
        settings.ai,
      );
      if (isMounted.current) setSimilarArticles(result);
    } catch (err) {
      safeLogError('Failed to find similar articles', err);
      if (isMounted.current) setFindError('article.error.similar');
    } finally {
      if (isMounted.current) setIsFindingSimilar(false);
    }
  };

  const handleFindOnline = async () => {
    setIsFindingOnline(true);
    setOnlineError(null);
    try {
      const result = await findRelatedOnline(article.title, settings.ai);
      if (isMounted.current) setOnlineFindings(result);
    } catch (err) {
      safeLogError('Failed to find related online discussions', err);
      if (isMounted.current) {
        setOnlineFindings(null);
        setOnlineError('article.error.online');
      }
    } finally {
      if (isMounted.current) setIsFindingOnline(false);
    }
  };

  const handleGenerateTldr = async () => {
    setIsGeneratingTldr(true);
    setTldrError(null);
    try {
      const result = await generateTldrSummary(article.summary, settings.ai);
      if (isMounted.current) setTldr(result);
    } catch (err) {
      safeLogError('Failed to generate TL;DR summary', err);
      if (isMounted.current) setTldrError('article.error.tldr');
    } finally {
      if (isMounted.current) setIsGeneratingTldr(false);
    }
  };

  const scrollToTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 flex justify-end animate-fadeIn"
      style={{ animationDuration: '300ms' }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-2xl h-full bg-surface/95 border-l border-border shadow-2xl flex flex-col backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-detail-title"
      >
        {/* Header */}
        <header className="flex-shrink-0 p-5 border-b border-border flex justify-between items-center bg-surface/50 sticky top-0 z-10 backdrop-blur-md">
          <h2
            id="article-detail-title"
            className="text-lg font-bold text-text-primary truncate pr-4"
          >
            {article.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-hover text-text-secondary transition-colors"
            aria-label={t('article.close')}
          >
            <XIcon className="h-6 w-6" />
          </button>
        </header>

        {/* Content */}
        <div ref={contentRef} className="flex-grow overflow-y-auto p-6 space-y-8 relative">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <p className="text-sm text-text-primary font-medium">{article.authors}</p>
              <p className="text-sm text-text-secondary italic mt-1">
                {onAnalyzeJournal ? (
                  <button
                    type="button"
                    onClick={() => onAnalyzeJournal(article.journal)}
                    title={t('kb.analyze_journal')}
                    className="hover:text-brand-accent hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-brand-accent rounded-sm"
                  >
                    {article.journal}
                  </button>
                ) : (
                  article.journal
                )}{' '}
                ({article.pubYear})
              </p>
              <div className="mt-3 text-xs text-text-secondary flex items-center gap-4">
                {articleExternalUrl(article) ? (
                  <a
                    href={articleExternalUrl(article)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-accent transition-colors"
                  >
                    {t(sourceIdentifierLabelKey(articleId))}:{' '}
                    {formatSourceIdentifierValue(articleId)}
                  </a>
                ) : (
                  <span>
                    {t(sourceIdentifierLabelKey(articleId))}:{' '}
                    {formatSourceIdentifierValue(articleId)}
                  </span>
                )}
                {article.pmcId && articleId.type !== 'pmcid' && (
                  <a
                    href={sourceIdentifierExternalUrl({
                      type: 'pmcid',
                      value: normalizePmcidValue(article.pmcId),
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-accent transition-colors"
                  >
                    {t('article.identifier.pmcid')}: PMC{normalizePmcidValue(article.pmcId)}
                  </a>
                )}
                <a
                  href={`https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-brand-accent transition-colors"
                >
                  <AcademicCapIcon className="h-4 w-4" /> {t('article.scholar')}
                </a>
              </div>
            </div>
            <RelevanceScoreDisplay score={article.relevanceScore} />
          </div>

          {article.isOpenAccess && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
              <UnlockIcon className="h-3 w-3 mr-1.5" />
              <span>{t('article.open_access')}</span>
            </div>
          )}

          <div className="glass-panel rounded-lg p-5 shadow-none bg-surface/30">
            <h4 className="text-sm font-bold text-text-primary mb-2 uppercase tracking-wide text-xs opacity-80">
              {t('article.ai_summary')}
            </h4>
            <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed">
              <p>{article.aiSummary || t('article.no_ai_summary')}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-text-primary mb-2 uppercase tracking-wide text-xs opacity-80">
              {t('article.abstract')}
            </h4>
            <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed">
              <p>{article.summary ? article.summary : t('report.article.abstractMissing')}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <h4 className="font-bold text-text-primary mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
              <TagIcon className="h-4 w-4" /> {t('article.tags')}
            </h4>
            <div className="flex flex-wrap gap-2 items-center">
              {(article.customTags || []).map((tag) => (
                <RemovableTagChip
                  key={tag}
                  label={tag}
                  onRemove={() => handleRemoveTag(tag)}
                  removeLabel={t('article.remove_tag', { tag })}
                  size="md"
                />
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder={t('article.add_tag')}
                className="bg-transparent border border-border rounded-full py-0.5 px-3 text-sm focus-ring-aa focus:border-brand-accent text-text-primary w-24 focus:w-32 transition-all placeholder-text-secondary/50"
              />
            </div>
          </div>

          {relatedInsights.length > 0 && (
            <div className="pt-6 border-t border-border">
              <h4 className="font-bold text-text-primary mb-3 text-sm uppercase tracking-wide">
                {t('article.related_insights')}
              </h4>
              <div className="space-y-3">
                {relatedInsights.map((insight) => (
                  <div
                    key={stableInsightKey(insight)}
                    className="bg-background/50 p-4 rounded-lg border border-border shadow-sm"
                  >
                    <p className="font-semibold text-brand-accent text-sm mb-1">
                      {insight.question}
                    </p>
                    <p className="text-sm text-text-primary/90">{insight.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-bold brand-gradient-text mb-6">{t('article.discovery')}</h3>
            <div className="grid grid-cols-1 gap-6">
              {settings.ai.enableTldr && (
                <div className="glass-panel p-4 rounded-lg shadow-none bg-surface/30 hover:bg-surface/50 transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-text-primary">{t('article.tldr')}</h4>
                    <button
                      type="button"
                      onClick={handleGenerateTldr}
                      disabled={isGeneratingTldr}
                      className="text-xs font-medium text-brand-accent hover:text-brand-secondary disabled:opacity-50"
                    >
                      {isGeneratingTldr ? t('article.generating') : t('article.generate')}
                    </button>
                  </div>
                  {isGeneratingTldr && (
                    <div className="h-4 w-3/4 rounded bg-border animate-pulse"></div>
                  )}
                  {tldrError && <p className="text-xs text-red-400">{t(tldrError)}</p>}
                  {tldr && <p className="text-sm text-text-secondary italic">“{tldr}”</p>}
                </div>
              )}

              <div className="glass-panel p-4 rounded-lg shadow-none bg-surface/30 hover:bg-surface/50 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-text-primary flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4 text-accent-cyan" /> {t('article.similar')}
                  </h4>
                  <button
                    type="button"
                    onClick={handleFindSimilar}
                    disabled={isFindingSimilar}
                    className="text-xs font-medium text-brand-accent hover:text-brand-secondary disabled:opacity-50"
                  >
                    {isFindingSimilar ? t('article.finding') : t('article.find')}
                  </button>
                </div>
                <div className="space-y-3">
                  {isFindingSimilar && <SkeletonLoader lines={2} />}
                  {findError && <p className="text-red-400 text-sm">{t(findError)}</p>}
                  {similarArticles?.map((similar) => (
                    <div
                      key={similar.pmid}
                      className="bg-background/50 p-3 rounded-md border border-border"
                    >
                      <a
                        href={legacyArticleKeyUrl(similar.pmid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-text-primary hover:text-brand-accent block mb-1"
                      >
                        {similar.title}
                      </a>
                      <p className="text-xs text-text-secondary">
                        <strong>{t('article.why')}</strong> {similar.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel p-4 rounded-lg shadow-none bg-surface/30 hover:bg-surface/50 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-text-primary flex items-center gap-2">
                    <WebIcon className="h-4 w-4 text-accent-amber" /> {t('article.online')}
                  </h4>
                  <button
                    type="button"
                    onClick={handleFindOnline}
                    disabled={isFindingOnline}
                    className="text-xs font-medium text-brand-accent hover:text-brand-secondary disabled:opacity-50"
                  >
                    {isFindingOnline ? t('article.searching') : t('article.search')}
                  </button>
                </div>
                <div>
                  {isFindingOnline && <SkeletonLoader lines={1} />}
                  {onlineError && <p className="text-red-400 text-sm">{t(onlineError)}</p>}
                  {onlineFindings && (
                    <div className="bg-background/50 p-3 rounded-md border border-border">
                      <p className="text-sm text-text-secondary mb-3">{onlineFindings.summary}</p>
                      <ul className="space-y-1">
                        {onlineFindings.sources.map((source) => (
                          <li key={source.uri}>
                            <a
                              href={source.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand-accent hover:underline truncate block"
                            >
                              {source.title || source.uri}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {showGoToTop && (
            <button
              type="button"
              onClick={scrollToTop}
              aria-label={t('article.scroll_top')}
              className="absolute bottom-6 right-6 p-3 rounded-full bg-brand-accent text-brand-text-on-accent shadow-lg hover:bg-opacity-90 transition-all duration-300 animate-fadeIn"
            >
              <ChevronUpIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
