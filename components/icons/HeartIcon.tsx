import React from 'react';

export const HeartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
            d="M21 8.25c0-2.485-2.015-4.5-4.5-4.5-2.023 0-3.74 1.34-4.326 3.193a.75.75 0 01-1.348 0C9.24 5.09 7.523 3.75 5.5 3.75 3.015 3.75 1 5.765 1 8.25c0 7.22 9 12 11 12s11-4.78 11-12z"
        />
    </svg>
);