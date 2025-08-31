import React from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { XIcon } from './icons/XIcon';

interface ConfirmationModalProps {
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    isConfirming?: boolean;
    confirmButtonClass?: string;
    titleClass?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ onConfirm, onCancel, title, message, confirmText, isConfirming = false, confirmButtonClass = 'bg-red-600 hover:bg-red-700', titleClass = 'text-red-400' }) => {
    const modalRef = useFocusTrap<HTMLDivElement>(true);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn" style={{ animationDuration: '150ms' }}>
            <div ref={modalRef} className="bg-surface rounded-lg border border-border shadow-2xl w-full max-w-md m-4" role="dialog" aria-modal="true" aria-labelledby="confirmation-modal-title">
                <div className="p-4 flex justify-between items-center border-b border-border">
                    <h3 id="confirmation-modal-title" className={`text-lg font-bold ${titleClass}`}>{title}</h3>
                    <button onClick={onCancel} className="p-1 rounded-full hover:bg-surface-hover text-text-secondary" aria-label="Close">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 text-text-secondary">{message}</div>
                <div className="p-4 bg-background/50 rounded-b-lg flex justify-end space-x-3">
                    <button onClick={onCancel} className="px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover">
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${confirmButtonClass} disabled:opacity-50 disabled:cursor-wait`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};