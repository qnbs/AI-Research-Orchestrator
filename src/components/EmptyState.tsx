import React from 'react';

interface EmptyStateAction {
  text: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  footnote?: React.ReactNode;
  action?: EmptyStateAction;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  footnote,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fadeIn">
      <div className="relative mb-6">
        <div className="text-border">{icon}</div>
      </div>
      <h2 className="text-2xl font-bold text-text-primary mb-3">{title}</h2>
      <p className="max-w-md mx-auto text-base text-text-secondary">{message}</p>
      {footnote && (
        <p className="max-w-md mx-auto mt-2 text-sm text-text-secondary/60">{footnote}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-6 inline-flex items-center min-h-11 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 focus-ring-aa"
        >
          {action.icon && <span className="mr-2 -ml-1">{action.icon}</span>}
          {action.text}
        </button>
      )}
    </div>
  );
};
