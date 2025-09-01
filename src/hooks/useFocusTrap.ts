
import { useEffect, useRef } from 'react';

/**
 * A custom hook to trap focus within a designated container element (e.g., a modal or panel).
 * This is a critical accessibility feature.
 * @param isOpen A boolean indicating if the container is currently open.
 * @returns A ref object to be attached to the container element.
 */
export const useFocusTrap = <T extends HTMLElement>(isOpen: boolean) => {
    const containerRef = useRef<T>(null);

    useEffect(() => {
        if (!isOpen || !containerRef.current) return;

        const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
            'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])'
        );
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Store the element that was focused before the modal opened
        const previouslyFocusedElement = document.activeElement as HTMLElement;

        // Move focus to the first focusable element in the container
        firstElement.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            // Handle Shift + Tab to go backwards
            if (e.shiftKey) { 
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else { // Handle Tab to go forwards
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        };

        const container = containerRef.current;
        container.addEventListener('keydown', handleKeyDown);

        // When the component unmounts or isOpen becomes false, clean up
        return () => {
            container.removeEventListener('keydown', handleKeyDown);
            // Restore focus to the element that was focused before the modal opened
            previouslyFocusedElement?.focus();
        };
    }, [isOpen]);

    return containerRef;
};
