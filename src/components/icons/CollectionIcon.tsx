import React from 'react';

export const CollectionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <rect x="3.75" y="3.75" width="12" height="12" rx="2" strokeLinejoin="round" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 8.25h9A2.25 2.25 0 0119.5 10.5v9a2.25 2.25 0 01-2.25 2.25h-9A2.25 2.25 0 016 19.5v-9"
    />
  </svg>
);
