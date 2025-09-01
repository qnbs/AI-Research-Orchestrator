import React from 'react';

export const CogIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.26.713.53.955l.872.872c.42.42.642 1.002.53 1.583l-.13 1.28c-.092.54-.56.943-1.11.943h-2.594c-.55 0-1.018-.403-1.11-.943l-.13-1.28c-.113-.58.11-1.163.53-1.583l.872-.872c.27-.242.467-.58.53-.955l.213-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
