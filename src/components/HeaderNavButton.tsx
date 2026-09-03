import React from 'react';

export const HeaderNavButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  muted?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
}> = ({
  onClick,
  isActive,
  muted,
  title,
  children,
  className = '',
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaControls,
  buttonRef,
}) => (
  <button
    ref={buttonRef}
    type="button"
    onClick={onClick}
    title={title}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    aria-expanded={ariaExpanded}
    aria-controls={ariaControls}
    aria-current={ariaExpanded === undefined && isActive ? 'page' : undefined}
    className={`relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus-ring-aa overflow-hidden
        ${
          isActive
            ? 'text-brand-accent bg-brand-accent/10 border border-brand-accent/25 shadow-glow'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent'
        }
        ${muted ? 'opacity-60' : ''} ${className}`}
  >
    {isActive && (
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-accent/80" aria-hidden />
    )}
    <span className="relative flex items-center">{children}</span>
  </button>
);
