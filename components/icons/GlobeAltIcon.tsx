import React from 'react';

export const GlobeAltIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
            d="M21.75 12.75a9.75 9.75 0 11-19.5 0 9.75 9.75 0 0119.5 0zM12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 9h16.5M3.75 15h16.5"
        />
    </svg>
);
