import React from 'react';
import { ArrowUpIcon } from './icons/ArrowUpIcon';

interface BackToTopButtonProps {
    isVisible: boolean;
}

export const BackToTopButton: React.FC<BackToTopButtonProps> = ({ isVisible }) => {
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <button
            onClick={scrollToTop}
            className={`fixed bottom-8 right-8 z-20 p-3 rounded-full bg-brand-accent text-brand-text-on-accent shadow-lg hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-brand-accent transition-all duration-300 transform hover:scale-110 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
            aria-label="Scroll to top"
            title="Scroll to top"
        >
            <ArrowUpIcon className="h-6 w-6" />
        </button>
    );
};
