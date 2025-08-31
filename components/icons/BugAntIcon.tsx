import React from 'react';

export const BugAntIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        {...props}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 11h16M4 11a4 4 0 00-4 4v1a4 4 0 004 4h16a4 4 0 004-4v-1a4 4 0 00-4-4M4 11V9a4 4 0 014-4h8a4 4 0 014 4v2m-4.5-6.5l-1-1m-1 1l1 1m3.5-1l-1-1m-1 1l1 1M4 11v2m16-2v2"
        />
    </svg>
);