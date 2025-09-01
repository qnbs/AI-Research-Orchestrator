import React from 'react';

export const ScissorsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536 1.536m-3.072 0l1.536-1.536m3.072 3.072l1.536 1.536m-3.072 0l1.536-1.536M6 18.75c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3zm12 0c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.152 11.652L8.25 9.75m6 6l-1.902-1.902" />
  </svg>
);
