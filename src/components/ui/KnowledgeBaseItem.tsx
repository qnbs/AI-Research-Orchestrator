/**
 * KnowledgeBaseItem — Cybernetic glassmorphism card for a research article.
 *
 * Features:
 *  • `backdrop-blur-2xl` glass surface via `.kb-item` CSS class
 *  • Left accent bar coloured by relevance score (0–1 → grey → cyan)
 *  • Neon-cyan hover glow, selected state ring
 *  • Staggered Framer Motion entry when rendered in a list
 *  • Accessible: keyboard navigable, aria-selected, role="article"
 */
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import type { RankedArticle } from '../../types';

// ─── Relevance colour helper ──────────────────────────────────────────────────

/** Maps 0–1 relevance score to a CSS colour string. */
function relevanceColor(score: number): string {
  if (score >= 0.85) return 'var(--color-accent-green)';
  if (score >= 0.70) return 'var(--color-brand-accent)';
  if (score >= 0.50) return 'var(--color-accent-cyan)';
  if (score >= 0.30) return 'var(--color-accent-amber)';
  return 'var(--color-border)';
}

/** Short human-readable label for the relevance score. */
function relevanceLabel(score: number): { label: string; className: string } {
  if (score >= 0.85) return { label: 'Highly Relevant', className: 'bg-accent-green/10 text-accent-green border-accent-green/30' };
  if (score >= 0.70) return { label: 'Relevant',        className: 'bg-brand-accent/10 text-brand-accent border-brand-accent/30' };
  if (score >= 0.50) return { label: 'Possibly Relevant', className: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30' };
  return                     { label: 'Low Relevance',   className: 'bg-text-secondary/10 text-text-secondary border-border' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const OABadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/30">
    🔓 Open Access
  </span>
);

const SourcePill: React.FC<{ type?: string }> = ({ type }) => {
  if (!type) return null;
  return (
    <span className="source-pill-pubmed">{type}</span>
  );
};

const TagList: React.FC<{ tags: string[]; max?: number }> = ({ tags, max = 5 }) => {
  const visible = tags.slice(0, max);
  const more = tags.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {visible.map((tag) => (
        <span
          key={tag}
          className="text-[10px] px-1.5 py-0.5 rounded bg-border/40 text-text-secondary border border-border/60 hover:border-brand-accent/40 transition-colors"
        >
          {tag}
        </span>
      ))}
      {more > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-border/30 text-text-secondary">
          +{more}
        </span>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export interface KnowledgeBaseItemProps {
  article: RankedArticle;
  isSelected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
  /** Stagger delay index for list entry animations */
  index?: number;
  className?: string;
}

const KnowledgeBaseItemInner: React.FC<KnowledgeBaseItemProps> = ({
  article,
  isSelected = false,
  onSelect,
  onOpen,
  index = 0,
  className = '',
}) => {
  const {
    pmid,
    title,
    authors,
    journal,
    pubYear,
    relevanceScore,
    keywords = [],
    isOpenAccess,
    articleType,
    aiSummary,
    summary,
  } = article;

  const { label: relLabel, className: relClass } = relevanceLabel(relevanceScore);
  const displaySummary = aiSummary || summary;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{
        type: 'spring',
        stiffness: 340,
        damping: 26,
        delay: Math.min(index * 0.04, 0.4),
      }}
      whileHover={{ y: -2 }}
      className={`kb-item px-5 py-4 ${isSelected ? 'kb-item--selected' : ''} ${className}`}
      style={{
        // CSS custom property read by .kb-item::before pseudo-element
        ['--relevance-color' as string]: relevanceColor(relevanceScore),
      }}
      onClick={onSelect}
      role="article"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(); }
      }}
    >
      {/* Top metadata row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {isOpenAccess && <OABadge />}
          <SourcePill type={articleType} />
          <span className="text-[10px] text-text-secondary font-mono">
            PMID {pmid}
          </span>
        </div>
        <span
          className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border ${relClass}`}
        >
          {relLabel}
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 mb-1.5 group-hover:text-brand-accent transition-colors"
        title={title}
      >
        {title}
      </h3>

      {/* Authors + meta */}
      <p className="text-xs text-text-secondary truncate mb-1">
        {authors}
      </p>
      <p className="text-xs text-text-secondary">
        <span className="text-brand-accent/80 font-medium">{journal}</span>
        {pubYear && <> · <span>{pubYear}</span></>}
      </p>

      {/* AI Summary */}
      {displaySummary && (
        <p className="text-xs text-text-secondary mt-2 line-clamp-3 leading-relaxed">
          {displaySummary}
        </p>
      )}

      {/* Keywords */}
      {keywords.length > 0 && <TagList tags={keywords} max={6} />}

      {/* Action row */}
      {onOpen && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="btn-neon text-[11px] px-3 py-1"
            aria-label={`Open article: ${title}`}
          >
            Open →
          </button>
        </div>
      )}
    </motion.article>
  );
};

export const KnowledgeBaseItem = memo(KnowledgeBaseItemInner);
