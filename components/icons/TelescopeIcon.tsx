import React from 'react';

export const TelescopeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
            d="M4.5 19.5l15-15m-15 0l15 15m-10.5-3.75L6 18.25m7.5-12.5L12 3.75m1.5 7.5l2.25-2.25M7.5 12l-2.25 2.25m9-3.75l-2.25 2.25"
        />
    </svg>
);
