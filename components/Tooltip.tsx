import React, { useState, useId } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const id = useId();

  return (
    <div
      className="relative flex items-center focus:outline-none"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      aria-describedby={isVisible ? id : undefined}
    >
      {children}
      {isVisible && (
        <div 
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-background border border-border rounded-lg shadow-lg text-xs text-text-secondary z-10 transition-opacity animate-fadeIn" 
          style={{ animationDuration: '150ms' }}
        >
          {content}
        </div>
      )}
    </div>
  );
};
