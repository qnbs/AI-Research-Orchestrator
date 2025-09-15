import React from 'react';

export const MicroscopeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18h8" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 22h18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 18v-5.594a5.594 5.594 0 0 1 1.6-3.906L12.5 4.5V2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 4.5l3.89 3.89a5.594 5.594 0 0 1 1.61 3.906V18" />
  </svg>
);