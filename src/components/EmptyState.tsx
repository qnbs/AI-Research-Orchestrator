import React from 'react';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    message: string;
    action?: {
        text: string;
        onClick: () => void;
        icon?: React.ReactNode;
    };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fadeIn">
            <div className="relative mb-6">
                <div className="text-border">{icon}</div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-16 h-16 rounded-full bg-brand-accent/10 animate-pulseGlow" style={{ animationDuration: '3s' }}></div>
                </div>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">{title}</h2>
            <p className="max-w-md mx-auto text-base text-text-secondary">{message}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent"
                >
                    {action.icon && <span className="mr-2 -ml-1">{action.icon}</span>}
                    {action.text}
                </button>
            )}
        </div>
    );
};