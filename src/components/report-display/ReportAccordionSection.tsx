import React, { useId, useState } from 'react';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

export const ReportAccordionSection: React.FC<{
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}> = ({ title, children, defaultOpen = false, count }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `accordion-panel-${id}`;
  const buttonId = `accordion-button-${id}`;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        id={buttonId}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-text-primary hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent transition-colors group"
      >
        <div className="flex items-center gap-3">
          {title}
          {count !== undefined && (
            <span className="text-sm font-medium bg-border text-text-secondary px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <ChevronDownIcon
          className={`h-6 w-6 transform transition-transform duration-300 text-text-secondary ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="p-4 bg-background/50">{children}</div>
        </div>
      </div>
    </div>
  );
};
