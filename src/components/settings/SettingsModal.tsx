import React from 'react';
import { useSettingsView } from './SettingsViewContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export const Modal: React.FC<{ onClose: () => void; title: string; children: React.ReactNode }> = ({
  onClose,
  title,
  children,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>(true, {
    onEscape: onClose,
    lockScroll: true,
  });
  const { t } = useSettingsView();
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn"
      style={{ animationDuration: '150ms' }}
    >
      <div
        ref={modalRef}
        className="bg-surface rounded-lg border border-border shadow-2xl p-6 w-full max-w-lg m-4 flex flex-col max-h-[80vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-shared-modal-title"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 id="settings-shared-modal-title" className="text-lg font-bold brand-gradient-text">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-surface-hover focus-ring-aa"
            aria-label={t('chrome.aria.close_modal')}
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto pr-2">{children}</div>
      </div>
    </div>
  );
};
