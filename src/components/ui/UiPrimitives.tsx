import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-accent text-brand-text-on-accent border-transparent hover:opacity-95 shadow-sm',
  secondary:
    'bg-surface text-text-primary border-border hover:border-brand-accent/40 hover:bg-surface-hover',
  ghost:
    'bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:bg-surface-hover',
  danger: 'bg-danger text-white border-transparent hover:opacity-95',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export type UiButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/**
 * Shared button primitive — prefer over ad-hoc accent/red classes.
 */
export const UiButton: React.FC<UiButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${variantClass[variant]} ${sizeClass[size]} ${className}`}
    {...props}
  />
);

export type UiBadgeProps = {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
};

const toneClass: Record<NonNullable<UiBadgeProps['tone']>, string> = {
  neutral: 'border-border bg-surface text-text-secondary',
  accent: 'border-brand-accent/35 bg-brand-accent/10 text-brand-accent',
  success: 'border-success/35 bg-success/10 text-success',
  warning: 'border-warning/35 bg-warning/10 text-warning',
  danger: 'border-danger/35 bg-danger/10 text-danger',
  info: 'border-info/35 bg-info/10 text-info',
};

export const UiBadge: React.FC<UiBadgeProps> = ({ children, tone = 'neutral', className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide ${toneClass[tone]} ${className}`}
  >
    {children}
  </span>
);
