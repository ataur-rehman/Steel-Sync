/**
 * 🔧 SEARCH INPUT FIX - PREVENTS PAGE REFRESHES
 * 
 * This component wraps search inputs to prevent page refreshes that happen
 * when there are no results and users press Enter or when form submissions occur
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface StableSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    debounceMs?: number;
    onSearch?: (value: string) => void;
    isLoading?: boolean;
    disabled?: boolean;
    autoFocus?: boolean;
    'aria-label'?: string;
}

/**
 * 🛡️ STABLE SEARCH INPUT
 * 
 * Prevents the common page refresh issues that occur with search inputs:
 * 1. Implicit form submissions
 * 2. Enter key causing page reloads
 * 3. Browser navigation when no results found
 * 4. State inconsistencies during rapid typing
 */
export default function StableSearchInput({
    value,
    onChange,
    placeholder = "Search...",
    className = "",
    debounceMs = 300,
    onSearch,
    isLoading = false,
    disabled = false,
    autoFocus = false,
    'aria-label': ariaLabel
}: StableSearchInputProps) {

    const [localValue, setLocalValue] = useState(value);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const preventSubmitRef = useRef(false);

    // Sync with external value changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    /**
     * 🎯 HANDLE INPUT CHANGE WITH DEBOUNCING
     */
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        // Clear previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Debounce the onChange call
        timeoutRef.current = setTimeout(() => {
            onChange(newValue);

            // Call onSearch if provided
            if (onSearch) {
                onSearch(newValue);
            }
        }, debounceMs);
    }, [onChange, onSearch, debounceMs]);

    /**
     * 🛡️ PREVENT FORM SUBMISSION AND PAGE REFRESH
     */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            e.stopPropagation(); // Stop event bubbling

            // Prevent any potential form submission
            preventSubmitRef.current = true;

            // Force call onChange and onSearch immediately
            const currentValue = localValue.trim();
            onChange(currentValue);

            if (onSearch) {
                onSearch(currentValue);
            }

            // Reset prevent flag after a short delay
            setTimeout(() => {
                preventSubmitRef.current = false;
            }, 100);
        }
    }, [localValue, onChange, onSearch]);

    /**
     * 🛡️ PREVENT FORM SUBMISSION ON BLUR
     */
    const handleBlur = useCallback(() => {
        // Ensure final value is synced
        if (localValue !== value) {
            onChange(localValue);
        }
    }, [localValue, value, onChange]);

    /**
     * 🛡️ FORM SUBMISSION PREVENTION
     */
    const handleFormSubmit = useCallback((e: React.FormEvent) => {
        if (preventSubmitRef.current) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="relative">
            {/* Invisible form to catch and prevent submissions */}
            <form
                onSubmit={handleFormSubmit}
                className="contents"
                autoComplete="off"
                style={{ display: 'contents' }}
            >
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4 text-gray-400" />
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={localValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        disabled={disabled}
                        autoFocus={autoFocus}
                        autoComplete="off"
                        aria-label={ariaLabel || placeholder}
                        className={`pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200 ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                            } ${className}`}
                        // Additional attributes to prevent browser issues
                        data-form="false"
                        data-search-input="true"
                    />
                </div>
            </form>
        </div>
    );
}
