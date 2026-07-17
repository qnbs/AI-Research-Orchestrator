import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookmarkSquareIcon } from './icons/BookmarkSquareIcon';

export type InputFormHeaderProps = {
  presets: { id: string; name: string }[];
  onLoadPreset: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onOpenPresetModal: () => void;
};

/**
 * Research parameters form chrome (title + preset controls).
 */
export const InputFormHeader: React.FC<InputFormHeaderProps> = ({
  presets,
  onLoadPreset,
  onOpenPresetModal,
}) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
    <div className="flex items-center">
      <div className="p-2 bg-brand-accent/10 rounded-lg mr-3 border border-brand-accent/20 shadow-glow">
        <SparklesIcon className="h-6 w-6 text-brand-accent" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-text-primary tracking-tight font-display">
          Research Parameters
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">Define the scope for the AI agents.</p>
      </div>
    </div>
    <div className="flex items-center gap-3 w-full sm:w-auto">
      <select
        onChange={onLoadPreset}
        defaultValue=""
        className="glass-input block w-full sm:w-40 rounded-lg py-1.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent transition-colors"
      >
        <option value="" disabled>
          Load preset...
        </option>
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onOpenPresetModal}
        className="inline-flex flex-shrink-0 items-center px-3 py-1.5 border border-border text-xs font-medium rounded-lg shadow-sm text-text-secondary bg-surface hover:bg-surface-hover hover:text-text-primary transition-colors"
      >
        <BookmarkSquareIcon className="h-4 w-4 mr-1.5" />
        Save
      </button>
    </div>
  </div>
);
