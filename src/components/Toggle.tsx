import React from 'react';

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  id?: string;
}> = ({ checked, onChange, children, id }) => {
  const switchId = id ?? undefined;
  return (
    <label
      htmlFor={switchId}
      className="flex items-center cursor-pointer group gap-3 focus-within:outline-none"
    >
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          checked
            ? 'bg-brand-accent border-brand-accent/40'
            : 'bg-border border-border group-hover:bg-surface-hover'
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-4 w-4 transform rounded-full bg-brand-text-on-accent shadow-sm transition-transform duration-200 ease-out ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm font-medium text-text-primary">{children}</span>
    </label>
  );
};
