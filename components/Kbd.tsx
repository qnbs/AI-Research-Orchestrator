import React from 'react';

export const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <kbd className="px-2 py-1 text-xs font-semibold text-text-secondary bg-surface border border-border rounded-md">
        {children}
    </kbd>
);
