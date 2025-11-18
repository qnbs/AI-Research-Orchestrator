import React from 'react';

export const AppLogo: React.FC<React.SVGProps<SVGSVGElement> & { idPrefix?: string }> = ({ idPrefix = 'logo', ...props }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id={`${idPrefix}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: 'var(--color-brand-accent)', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: 'var(--color-accent-cyan)', stopOpacity: 1}} />
            </linearGradient>
        </defs>
        <path d="M12 2L8 4V8L12 10L16 8V4L12 2Z" stroke={`url(#${idPrefix}-gradient)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22L8 20V16L12 14L16 16V20L12 22Z" stroke={`url(#${idPrefix}-gradient)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 12L20 8L16 10L14 12L16 14L20 16L22 12Z" stroke={`url(#${idPrefix}-gradient)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12L4 8L8 10L10 12L8 14L4 16L2 12Z" stroke={`url(#${idPrefix}-gradient)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 10V14" stroke={`url(#${idPrefix}-gradient)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 8L4 8" stroke={`url(#${idPrefix}-gradient)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 8L20 8" stroke={`url(#${idPrefix}-gradient)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 16L4 16" stroke={`url(#${idPrefix}-gradient)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 16L20 16" stroke={`url(#${idPrefix}-gradient)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);