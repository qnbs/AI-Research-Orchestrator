import React from 'react';

export const DnaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
            d="M3.75 6.75h16.5M3.75 17.25h16.5M7.5 3s-1.5 2.25-1.5 4.5 1.5 4.5 1.5 4.5m9-9s1.5 2.25 1.5 4.5-1.5 4.5-1.5 4.5M4.5 12c0 2.25 1.5 4.5 1.5 4.5s1.5-2.25 1.5-4.5-1.5-4.5-1.5-4.5-1.5 2.25-1.5 4.5zM15 12c0 2.25 1.5 4.5 1.5 4.5s1.5-2.25 1.5-4.5-1.5-4.5-1.5-4.5-1.5 2.25-1.5 4.5z"
        />
    </svg>
);
