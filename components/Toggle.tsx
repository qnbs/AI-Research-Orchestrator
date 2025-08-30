import React from 'react';

export const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode; }> = ({ checked, onChange, children }) => (
    <label className="flex items-center cursor-pointer group">
        <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out ${checked ? 'bg-brand-accent' : 'bg-border group-hover:bg-border'}`}>
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'}`}/>
            <input 
                type="checkbox" 
                checked={checked} 
                onChange={(e) => onChange(e.target.checked)} 
                className="opacity-0 w-full h-full absolute cursor-pointer"
            />
        </div>
        <span className="ml-3 text-sm font-medium text-text-primary">{children}</span>
    </label>
);