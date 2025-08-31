import React from 'react';

export const ChatBubbleLeftRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.721.286c-.49.038-.98-.123-1.38-.499L12 16.5l-2.67 2.078c-.4.376-.89.537-1.38.499l-3.721-.286A2.25 2.25 0 012.25 15v-4.286c0-.97.616-1.813 1.5-2.097m16.5 0a2.25 2.25 0 00-1.5-2.097L12 5.25l-2.67 2.078A2.25 2.25 0 007.5 8.511m12.75 0a2.25 2.25 0 01-1.5-2.097L12 5.25l-2.67 2.078A2.25 2.25 0 014.5 8.511" 
    />
  </svg>
);
