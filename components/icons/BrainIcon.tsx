import React from 'react';

export const BrainIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        d="M9.5 14.25l1.526 1.526a2.25 2.25 0 01-3.182 0l-1.526-1.526M9.5 14.25v-1.526a2.25 2.25 0 010-3.182l1.526-1.526a2.25 2.25 0 013.182 0l1.526 1.526a2.25 2.25 0 010 3.182l-1.526 1.526a2.25 2.25 0 01-3.182 0zM14.25 10.875c.39.39.39 1.023 0 1.414m-4.5-1.414c-.39.39-.39 1.023 0 1.414M12 21a9 9 0 100-18 9 9 0 000 18z" 
    />
  </svg>
);
