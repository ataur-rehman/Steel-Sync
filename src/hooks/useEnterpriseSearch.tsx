import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Enterprise-grade search hook for professional applications
 * Prevents page refreshes, component unmounting, and performance issues
 * Features: Stable references, intelligent debouncing, error handling, caching
 */

interface UseSearchOptions<T> {
    searchFn: (searchTerm: string, filters?: any) => Promise<T[]>;
    debounceMs?: number;
    minSearchLength?: number;
    cacheResults?: boolean;
    onError?: (error: Error) => void;
    dependencies?: any[];
}

interface UseSearchResult<T> {
    data: T[];
    loading: boolean;
    error: string | null;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    clearSearch: () => void;
    refresh: () => void;
    totalResults: number;
}

export function useEnterpriseSearch<T = any>(
    options: UseSearchOptions<T>
): UseSearchResult<T> {
    const {
        searchFn,
        debounceMs = 500,
        minSearchLength = 0,
        cacheResults = true,
        onError,
        dependencies = []
    } = options;

    // Stable state management
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTermState] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');

    // Refs for stable behavior
    const searchFnRef = useRef(searchFn);
    const cacheRef = useRef(new Map<string, T[]>());
    const abortControllerRef = useRef<AbortController | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Update refs on changes
    useEffect(() => {
        searchFnRef.current = searchFn;
    }, [searchFn]);

    // Debounce search term
    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [searchTerm, debounceMs]);

    // Stable search execution
    const executeSearch = useCallback(async (term: string) => {
        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Check cache first
        if (cacheResults && cacheRef.current.has(term)) {
            const cachedResults = cacheRef.current.get(term)!;
            setData(cachedResults);
            setError(null);
            return;
        }

        // Skip search if term is too short
        if (term.length < minSearchLength) {
            setData([]);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const results = await searchFnRef.current(term);

            // Check if request was aborted
            if (abortController.signal.aborted) {
                return;
            }

            // Cache results
            if (cacheResults) {
                cacheRef.current.set(term, results);
            }

            setData(results);
            setError(null);
        } catch (err) {
            if (abortController.signal.aborted) {
                return;
            }

            const errorMessage = err instanceof Error ? err.message : 'Search failed';
            setError(errorMessage);

            if (onError) {
                onError(err instanceof Error ? err : new Error(errorMessage));
            }

            setData([]);
        } finally {
            if (!abortController.signal.aborted) {
                setLoading(false);
            }
        }
    }, [minSearchLength, cacheResults, onError]);

    // Execute search when debounced term changes
    useEffect(() => {
        executeSearch(debouncedTerm);
    }, [debouncedTerm, executeSearch, ...dependencies]);

    // Stable API methods
    const setSearchTerm = useCallback((term: string) => {
        setSearchTermState(term);
    }, []);

    const clearSearch = useCallback(() => {
        setSearchTermState('');
        setData([]);
        setError(null);
        cacheRef.current.clear();
    }, []);

    const refresh = useCallback(() => {
        cacheRef.current.clear();
        executeSearch(debouncedTerm);
    }, [executeSearch, debouncedTerm]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        data,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        clearSearch,
        refresh,
        totalResults: data.length
    };
}

/**
 * Professional search input component with zero refresh guarantee
 */
interface EnterpriseSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    'aria-label'?: string;
    icon?: React.ReactNode;
    onClear?: () => void;
    autoFocus?: boolean;
}

export const EnterpriseSearchInput: React.FC<EnterpriseSearchInputProps> = ({
    value,
    onChange,
    placeholder = "Search...",
    disabled = false,
    className = "",
    'aria-label': ariaLabel,
    icon,
    onClear,
    autoFocus = false
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Prevent all forms of page refresh
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            // Blur input to ensure no form submission
            if (inputRef.current) {
                inputRef.current.blur();
            }
        }
    }, []);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
        }
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }, []);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(e.target.value);
    }, [onChange]);

    const handleClear = useCallback(() => {
        onChange('');
        if (onClear) {
            onClear();
        }
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [onChange, onClear]);

    return (
        <form onSubmit={handleSubmit} className="relative">
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onKeyPress={handleKeyPress}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label={ariaLabel || placeholder}
                    autoFocus={autoFocus}
                    className={`
            ${icon ? 'pl-10' : 'pl-4'} 
            ${value && onClear ? 'pr-10' : 'pr-4'}
            py-3 border border-gray-200 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            transition-colors duration-200
            ${className}
          `}
                />
                {value && onClear && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 
                     text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Clear search"
                    >
                        ×
                    </button>
                )}
            </div>
        </form>
    );
};
