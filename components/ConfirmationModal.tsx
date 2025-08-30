import React from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmationModalProps {
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    confirmButtonClass?: string;
    titleClass?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ onConfirm, onCancel, title, message, confirmText, confirmButtonClass = 'bg-red-600 hover:bg-red-700', titleClass = 'text-red-400' }) => {
    const modalRef = useFocusTrap<HTMLDivElement>(true);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn" style={{ animationDuration: '150ms' }}>
            <div ref={modalRef} className="bg-surface rounded-lg border border-border shadow-2xl p-6 w-full max-w-md m-4">
                <h3 className={`text-lg font-bold ${titleClass}`}>{title}</h3>
                <div className="mt-2 text-text-secondary">{message}</div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onCancel} className="px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-background hover:bg-surface-hover">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${confirmButtonClass}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
