
import React, { useEffect, useState } from 'react';
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { InfoIcon } from './icons/InfoIcon';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  duration: number;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onClose, position, duration }) => {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(onClose, 300); // Wait for exit animation
        }, duration - 300); // Start exit animation slightly before timeout

        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const handleClose = () => {
        setExiting(true);
        setTimeout(onClose, 300);
    };

    const positionClasses = {
        'bottom-right': 'bottom-5 right-5',
        'bottom-left': 'bottom-5 left-5',
        'top-right': 'top-5 right-5',
        'top-left': 'top-5 left-5',
    };

    const baseClasses = `fixed w-full max-w-sm p-4 rounded-lg shadow-2xl border flex items-center z-50 transition-all duration-300 ease-in-out ${positionClasses[position]}`;
    
    const typeClasses = type === 'success' 
        ? "bg-green-500/10 border-green-500/20 text-green-300 dark:text-green-200"
        : "bg-red-500/10 border-red-500/20 text-red-400 dark:text-red-200";
    
    const animationClasses = exiting ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0";

    const Icon = type === 'success' ? CheckCircleIcon : InfoIcon;

    return (
        <div className={`${baseClasses} ${typeClasses} ${animationClasses}`}>
            <Icon className="h-6 w-6 mr-3 flex-shrink-0" />
            <p className="flex-grow text-sm font-medium">{message}</p>
            <button onClick={handleClose} className="ml-4 p-1 rounded-full hover:bg-surface-hover">
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};