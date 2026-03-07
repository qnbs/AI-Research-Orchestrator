/**
 * Research Collections View – local-first collection management
 * with Framer Motion animations and shareable export links
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  createCollection,
  deleteCollection,
  updateCollection,
  generateShareToken,
  addEntryToCollection,
  removeEntryFromCollection,
} from '../store/slices/collectionsSlice';
import type { ResearchCollection } from '../types';
import { useTranslation } from '../hooks/useTranslation';

// ── Helpers ───────────────────────────────────────────────────────────────────
const COLLECTION_COLORS = [
  '#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f472b6',
  '#facc15', '#60a5fa', '#e879f9',
];
const COLLECTION_ICONS = ['📚', '🔬', '🧠', '⚡', '🌟', '🔭', '🧬', '💡', '🎯', '📊'];

function generateId() {
  return `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Collection Cover ──────────────────────────────────────────────────────────
const CollectionCover: React.FC<{ color: string; icon: string }> = ({ color, icon }) => (
  <div
    className="w-full flex items-center justify-center relative overflow-hidden rounded-t-xl mb-3"
    style={{
      height: 72,
      background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
    }}
  >
    <span className="text-5xl z-10 relative drop-shadow-sm select-none">{icon}</span>
    <div
      className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-40 pointer-events-none"
      style={{ backgroundColor: color }}
    />
  </div>
);

// ── Share-Link Modal ──────────────────────────────────────────────────────────
const ShareLinkModal: React.FC<{
  collection: ResearchCollection;
  onClose: () => void;
}> = ({ collection, onClose }) => {
  const [copied, setCopied] = useState(false);
  const url = collection.shareToken
    ? `${window.location.origin}?collection=${collection.shareToken}`
    : null;

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, y: 16 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="glass-panel rounded-2xl p-6 w-full max-w-sm"
        style={{ boxShadow: '0 0 32px rgba(56,189,248,0.15), 0 16px 48px rgba(0,0,0,0.3)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{collection.icon}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-text-primary truncate">{collection.name}</h2>
            <p className="text-xs text-text-secondary">Shareable export link</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-red-400 transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {url ? (
          <>
            <div className="bg-surface/60 rounded-xl p-3 border border-border mb-3">
              <p className="text-xs font-mono text-text-secondary break-all leading-relaxed">{url}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCopy}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                copied
                  ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                  : 'bg-brand-accent/90 hover:bg-brand-accent text-brand-text-on-accent'
              }`}
            >
              {copied ? '✓ Copied to clipboard!' : '📋 Copy Link'}
            </motion.button>
            <p className="text-xs text-text-secondary mt-2 text-center">
              Anyone with this link can view the collection.
            </p>
          </>
        ) : (
          <p className="text-sm text-text-secondary text-center py-4">
            No share token yet — close and click 🔗 on the card to generate one.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
};

// ── Collection Card ───────────────────────────────────────────────────────────
const CollectionCard: React.FC<{
  collection: ResearchCollection;
  onEdit: (c: ResearchCollection) => void;
  onDelete: (id: string) => void;
  onShare: (c: ResearchCollection) => void;
  onSelect: (c: ResearchCollection) => void;
  isSelected: boolean;
}> = ({ collection, onEdit, onDelete, onShare, onSelect, isSelected }) => {
  const entryCount = collection.entryIds.length;
  const articleCount = collection.articlePmids.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      onClick={() => onSelect(collection)}
      className={`neon-card rounded-xl overflow-hidden cursor-pointer select-none pt-0
        ${isSelected ? 'border-brand-accent shadow-glow' : ''}`}
      role="button"
      aria-pressed={isSelected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(collection)}
    >
      {/* Cover gradient */}
      <CollectionCover color={collection.color} icon={collection.icon} />

      <div className="px-4 pb-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate">{collection.name}</h3>
            {collection.description && (
              <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">{collection.description}</p>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onShare(collection)}
              title="Share collection"
              className="p-1.5 rounded-md text-text-secondary hover:text-brand-accent transition-colors text-xs"
              aria-label="Share collection"
            >
              🔗
            </button>
            <button
              onClick={() => onEdit(collection)}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary transition-colors text-xs"
              aria-label="Edit collection"
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete(collection.id)}
              className="p-1.5 rounded-md text-text-secondary hover:text-red-400 transition-colors text-xs"
              aria-label="Delete collection"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: collection.color }} />
            {entryCount} report{entryCount !== 1 ? 's' : ''}
          </span>
          <span>{articleCount} article{articleCount !== 1 ? 's' : ''}</span>
          {collection.tags.length > 0 && (
            <span className="text-accent-cyan truncate">{collection.tags.slice(0, 2).join(', ')}</span>
          )}
          {collection.shareToken && (
            <span className="ml-auto text-accent-green text-[10px] flex items-center gap-0.5">🔒 Shared</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Create/Edit Modal ─────────────────────────────────────────────────────────
const CollectionModal: React.FC<{
  initial?: Partial<ResearchCollection>;
  onSave: (data: Partial<ResearchCollection>) => void;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? COLLECTION_COLORS[0]);
  const [icon, setIcon] = useState(initial?.icon ?? '📚');
  const [tagsInput, setTagsInput] = useState(initial?.tags?.join(', ') ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="glass-panel rounded-2xl p-6 w-full max-w-md"
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {initial?.name ? 'Edit Collection' : 'New Collection'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon picker */}
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {COLLECTION_ICONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`w-9 h-9 rounded-lg text-lg transition-all
                    ${icon === ic ? 'ring-2 ring-brand-accent bg-brand-accent/10' : 'glass-panel hover:bg-surface-hover'}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="col-name" className="text-xs text-text-secondary mb-1 block">Name *</label>
            <input
              id="col-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Research Collection"
              required
              className="glass-input w-full px-3 py-2 rounded-lg text-sm text-text-primary focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="col-desc" className="text-xs text-text-secondary mb-1 block">Description</label>
            <textarea
              id="col-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this collection about?"
              rows={2}
              className="glass-input w-full px-3 py-2 rounded-lg text-sm text-text-primary focus:outline-none resize-none"
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Color</label>
            <div className="flex gap-2">
              {COLLECTION_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-white scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="col-tags" className="text-xs text-text-secondary mb-1 block">Tags (comma-separated)</label>
            <input
              id="col-tags"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="immunology, oncology, AI"
              className="glass-input w-full px-3 py-2 rounded-lg text-sm text-text-primary focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg glass-panel text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-brand-accent/90 hover:bg-brand-accent text-brand-text-on-accent text-sm font-medium transition-colors disabled:opacity-50"
            >
              {initial?.name ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Main View ─────────────────────────────────────────────────────────────────
const CollectionsView: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const collections = useAppSelector(s => s.collections.items);
  const isLoading = useAppSelector(s => s.collections.isLoading);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ResearchCollection | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<string | null>(null);

  const handleCreate = useCallback((data: Partial<ResearchCollection>) => {
    const col: ResearchCollection = {
      id: generateId(),
      name: data.name ?? 'Untitled',
      description: data.description ?? '',
      color: data.color ?? COLLECTION_COLORS[0],
      icon: data.icon ?? '📚',
      entryIds: [],
      articlePmids: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: data.tags ?? [],
    };
    dispatch(createCollection(col));
    setIsModalOpen(false);
  }, [dispatch]);

  const handleEdit = useCallback((data: Partial<ResearchCollection>) => {
    if (!editTarget) return;
    dispatch(updateCollection({ id: editTarget.id, changes: data }));
    setEditTarget(null);
  }, [dispatch, editTarget]);

  const handleDelete = useCallback((id: string) => {
    if (window.confirm('Delete this collection?')) {
      dispatch(deleteCollection(id));
      if (selectedId === id) setSelectedId(null);
    }
  }, [dispatch, selectedId]);

  const handleShare = useCallback((collection: ResearchCollection) => {
    if (!collection.shareToken) {
      dispatch(generateShareToken(collection.id));
    }
    setShareTarget(collection.id);
  }, [dispatch]);

  const selected = collections.find(c => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col h-full gap-6 px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold brand-gradient-text">Research Collections</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Organize your knowledge base into curated, shareable collections.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-brand-accent/90 hover:bg-brand-accent text-brand-text-on-accent text-sm font-semibold transition-colors"
        >
          + New Collection
        </motion.button>
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-secondary text-sm animate-pulse">Loading collections…</span>
        </div>
      ) : collections.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center text-center py-16"
        >
          <span className="text-5xl mb-4">📚</span>
          <p className="text-text-primary font-semibold">No collections yet</p>
          <p className="text-sm text-text-secondary mt-1">Create your first collection to organize research reports and articles.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-lg btn-neon text-sm"
          >
            Create Collection
          </button>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {collections.map(col => (
              <CollectionCard
                key={col.id}
                collection={col}
                onEdit={(c) => setEditTarget(c)}
                onDelete={handleDelete}
                onShare={handleShare}
                onSelect={(c) => setSelectedId(s => s === c.id ? null : c.id)}
                isSelected={selectedId === col.id}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <CollectionModal
            onSave={handleCreate}
            onClose={() => setIsModalOpen(false)}
          />
        )}
        {editTarget && (
          <CollectionModal
            initial={editTarget}
            onSave={handleEdit}
            onClose={() => setEditTarget(null)}
          />
        )}
        {shareTarget && (() => {
          const col = collections.find(c => c.id === shareTarget);
          return col ? (
            <ShareLinkModal
              collection={col}
              onClose={() => setShareTarget(null)}
            />
          ) : null;
        })()}
      </AnimatePresence>
    </div>
  );
};

export default CollectionsView;
