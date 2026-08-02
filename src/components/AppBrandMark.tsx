import React from 'react';
import { AppLogo } from './AppLogo';
import { BRAND_EMOJI } from '../lib/brand';

const SIZE_CLASS = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
} as const;

export type AppBrandMarkSize = keyof typeof SIZE_CLASS;

export interface AppBrandMarkProps {
  size?: AppBrandMarkSize;
  /** Show the 🔬 emoji badge (home, onboarding, install prompts). */
  showEmoji?: boolean;
  idPrefix?: string;
  className?: string;
  'aria-label'?: string;
}

/** Product mark: microscope SVG with optional 🔬 recognition badge. */
export const AppBrandMark: React.FC<AppBrandMarkProps> = ({
  size = 'md',
  showEmoji = false,
  idPrefix = 'brand',
  className = '',
  'aria-label': ariaLabel,
}) => (
  <div className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
    <AppLogo
      idPrefix={idPrefix}
      className={`${SIZE_CLASS[size]} drop-shadow-lg`}
      aria-label={ariaLabel}
    />
    {showEmoji ? (
      <span
        className="pointer-events-none absolute -bottom-0.5 -right-0.5 text-base leading-none drop-shadow-sm sm:text-lg"
        aria-hidden
      >
        {BRAND_EMOJI}
      </span>
    ) : null}
  </div>
);
