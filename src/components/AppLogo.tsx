import React from 'react';

/** Stylized microscope mark — matches `public/icons/app-icon.svg` (🔬 product identity). */
export const AppLogo: React.FC<React.SVGProps<SVGSVGElement> & { idPrefix?: string }> = ({
  idPrefix = 'logo',
  ...props
}) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-hidden={props['aria-label'] ? undefined : true}
    {...props}
  >
    <defs>
      <linearGradient id={`${idPrefix}-gradient`} x1="15%" y1="8%" x2="85%" y2="92%">
        <stop offset="0%" style={{ stopColor: 'var(--color-brand-primary)', stopOpacity: 1 }} />
        <stop offset="55%" style={{ stopColor: 'var(--color-brand-accent)', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'var(--color-brand-secondary)', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <g
      stroke={`url(#${idPrefix}-gradient)`}
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M24 76 H76" />
      <path d="M36 76 V67" />
      <path d="M64 76 V67" />
      <path d="M50 67 V58" />
      <path d="M50 58 C42 52 38 44 42 36" />
      <path d="M42 36 V20" />
      <path d="M34 52 H66" />
      <path d="M50 52 V46" />
    </g>
    <g fill={`url(#${idPrefix}-gradient)`}>
      <circle cx="42" cy="16" r="6" />
      <circle cx="50" cy="46" r="4.5" />
      <circle cx="58" cy="52" r="3.5" />
      <circle cx="50" cy="67" r="5" />
    </g>
  </svg>
);
