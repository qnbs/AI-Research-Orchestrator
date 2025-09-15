import React from 'react';

export const CpuChipIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}
    >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h-1.5m18 0h1.5M12 3.75v-1.5m0 18v1.5M5.625 5.625l-1.06-1.06M18.375 18.375l-1.06-1.06M5.625 18.375l-1.06 1.06M18.375 5.625l-1.06 1.06" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5h-9a.75.75 0 00-.75.75v9c0 .414.336.75.75.75h9a.75.75 0 00.75-.75v-9a.75.75 0 00-.75-.75z" />
  </svg>
);