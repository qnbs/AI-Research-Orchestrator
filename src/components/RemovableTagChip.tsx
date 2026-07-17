import React from 'react';
import { XIcon } from './icons/XIcon';

export type RemovableTagChipProps = {
  label: string;
  onRemove: () => void;
  removeLabel: string;
  size?: 'sm' | 'md';
};

/**
 * Compact removable tag chip used in report / article detail surfaces.
 */
export const RemovableTagChip: React.FC<RemovableTagChipProps> = ({
  label,
  onRemove,
  removeLabel,
  size = 'sm',
}) => (
  <span
    className={`inline-flex items-center bg-accent-magenta/10 text-accent-magenta font-medium pl-2 pr-1 py-0.5 rounded-md border border-accent-magenta/25 ${
      size === 'md' ? 'text-sm' : 'text-xs'
    }`}
  >
    {label}
    <button
      type="button"
      onClick={onRemove}
      aria-label={removeLabel}
      className="ml-1.5 text-accent-magenta hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-sm"
    >
      <XIcon className="h-3 w-3" />
    </button>
  </span>
);
