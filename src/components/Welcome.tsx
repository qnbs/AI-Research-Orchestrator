import React from 'react';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { useTranslation } from '../hooks/useTranslation';
import { EmptyState } from './EmptyState';

export const Welcome: React.FC<{ onFocusTopic?: () => void }> = ({ onFocusTopic }) => {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<DocumentPlusIcon className="h-24 w-24" />}
      title={t('welcome.title')}
      message={`${t('welcome.body')} ${t('welcome.footnote')}`}
      action={
        onFocusTopic
          ? {
              text: t('welcome.cta'),
              onClick: onFocusTopic,
            }
          : undefined
      }
    />
  );
};
