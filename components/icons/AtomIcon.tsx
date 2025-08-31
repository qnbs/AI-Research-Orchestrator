import React from 'react';

export const AtomIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
            d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 3v18m-6.4-1.6a9 9 0 0112.8 0M2.8 8.4a9 9 0 0118.4 0"
        />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
);