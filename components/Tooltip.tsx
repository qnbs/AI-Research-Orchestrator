import React, { useState, useId } from 'react';
import { InfoIcon } from './icons/InfoIcon';
import { XIcon } from './icons/XIcon';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  detailedContent?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, detailedContent }) => {
  const [isHoverVisible, setIsHoverVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const id = useId();

  const show = () => setIsHoverVisible(true);
  
  const hide = () => {
    // Don't hide if the detail view is open
    if (!isDetailVisible) {
      setIsHoverVisible(false);
    }
  };

  const handleDetailToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetailVisible(prev => !prev);
    // Ensure the tooltip becomes visible when detail is opened
    if (!isDetailVisible) {
      setIsHoverVisible(true);
    }
  };
  
  const forceHide = () => {
    setIsDetailVisible(false);
    setIsHoverVisible(false);
  };
  
  const isVisible = isHoverVisible || isDetailVisible;

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible && (
        <div 
          id={id}
          role="tooltip"
          // Keep it open when mouse is over the tooltip itself
          onMouseEnter={show} 
          onMouseLeave={hide}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-background border border-border rounded-lg shadow-lg text-xs text-text-secondary z-10 transition-opacity animate-fadeIn" 
          style={{ animationDuration: '150ms' }}
        >
          <div className="flex justify-between items-start gap-2">
            <div className="flex-grow">{content}</div>
            <div className="flex-shrink-0 flex items-center">
              {detailedContent && !isDetailVisible && (
                  <button onClick={handleDetailToggle} className="text-text-secondary hover:text-brand-accent" aria-expanded={isDetailVisible} aria-label="Show details">
                      <InfoIcon className="h-4 w-4" />
                  </button>
              )}
              {isDetailVisible && (
                  <button onClick={forceHide} className="text-text-secondary hover:text-text-primary" aria-label="Hide details">
                      <XIcon className="h-4 w-4" />
                  </button>
              )}
            </div>
          </div>
          {isDetailVisible && detailedContent && (
              <div className="mt-2 pt-2 border-t border-border/50 text-text-primary/90 animate-fadeIn" style={{ animationDuration: '300ms' }}>
                  {detailedContent}
              </div>
          )}
        </div>
      )}
    </div>
  );
};
