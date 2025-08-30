/**
 * 🚨 GLOBAL SEARCH FIX
 * 
 * This utility fixes the page refresh issue that occurs with search inputs across the application.
 * The problem occurs when:
 * 1. Search inputs are inside forms (implicit submission)
 * 2. Enter key is pressed with no results (browser tries to navigate)
 * 3. Search state changes cause React to re-render and refresh appearance
 * 4. Form elements don't properly prevent default submission behavior
 */

import React, { useEffect, useRef } from 'react';

/**
 * 🛡️ GLOBAL SEARCH EVENT LISTENER
 * 
 * Adds global event listeners to prevent search-related page refreshes
 */
export function useGlobalSearchFix() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;

            // Check if the target is a search input
            const isSearchInput =
                target.tagName === 'INPUT' &&
                (
                    target.getAttribute('placeholder')?.toLowerCase().includes('search') ||
                    target.getAttribute('aria-label')?.toLowerCase().includes('search') ||
                    target.getAttribute('data-search-input') === 'true' ||
                    target.className.includes('search')
                );

            // If it's a search input and Enter is pressed, prevent default
            if (isSearchInput && e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                console.log('🛡️ Prevented search input form submission');
            }
        };

        const handleFormSubmit = (e: Event) => {
            const form = e.target as HTMLFormElement;

            // Check if form contains search inputs
            const hasSearchInput = form.querySelector(
                'input[placeholder*="search" i], input[placeholder*="Search"], input[aria-label*="search" i], input[data-search-input="true"]'
            );

            // If form contains search input and has data-form="false", prevent submission
            if (hasSearchInput && form.getAttribute('data-form') === 'false') {
                e.preventDefault();
                e.stopPropagation();
                console.log('🛡️ Prevented search form submission');
                return false;
            }
        };

        // Add global event listeners
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('submit', handleFormSubmit, true);

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('submit', handleFormSubmit, true);
        };
    }, []);
}

/**
 * 🔧 SEARCH INPUT WRAPPER
 * 
 * Wraps any search input to prevent page refreshes
 */
export function wrapSearchInput(inputElement: HTMLInputElement) {
    // Add data attribute for identification
    inputElement.setAttribute('data-search-input', 'true');
    inputElement.setAttribute('autocomplete', 'off');

    // Prevent form submission on Enter
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    inputElement.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
        inputElement.removeEventListener('keydown', handleKeyDown);
    };
}

/**
 * 🎯 SEARCH INPUT STABILIZER
 * 
 * React component that automatically fixes search inputs
 */
interface SearchInputStabilizerProps {
    children: React.ReactNode;
}

export function SearchInputStabilizer({ children }: SearchInputStabilizerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Find all search inputs in the container
        const searchInputs = container.querySelectorAll(
            'input[placeholder*="search" i], input[placeholder*="Search"], input[aria-label*="search" i]'
        ) as NodeListOf<HTMLInputElement>;

        const cleanupFunctions: (() => void)[] = [];

        // Apply fix to each search input
        searchInputs.forEach(input => {
            const cleanup = wrapSearchInput(input);
            cleanupFunctions.push(cleanup);
        });

        // Cleanup on unmount
        return () => {
            cleanupFunctions.forEach(cleanup => cleanup());
        };
    }, [children]);

    return (
        <div ref={containerRef}>
            {children}
        </div>
    );
}

export default SearchInputStabilizer;
