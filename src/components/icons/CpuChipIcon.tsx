
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
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 .75v1.5m12-1.5v1.5M8.25 21v-1.5M15.75 3v1.5m0 15v1.5M12 4.5v-1.5m0 18v-1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5h13.5v9H5.25v-9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5v9m7.5-9v9" />

  </svg>
);
