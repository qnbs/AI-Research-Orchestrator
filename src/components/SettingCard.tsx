import React from 'react';

const CardComponent: React.FC<{
  icon?: React.ReactNode;
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <div className="panel-card overflow-hidden">
    <div className="p-4 sm:p-6 border-b border-border">
      <div className="flex items-center gap-3">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div>
          <h3 className="text-lg font-semibold text-text-primary font-display">{title}</h3>
          <p className="mt-1 text-sm text-text-secondary text-pretty">{description}</p>
        </div>
      </div>
    </div>
    <div className="p-4 sm:p-6 bg-background/25">{children}</div>
  </div>
);

export const SettingCard = React.memo(CardComponent);
