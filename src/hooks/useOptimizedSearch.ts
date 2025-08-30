/**
 * 🚀 OPTIMIZED SEARCH HOOK
 * 
 * High-performance search hook that eliminates the "cheap and sluggish" feel
 * 
 * KEY IMPROVEMENTS:
 * 1. Longer debounce (800ms) to reduce unnecessary queries
 * 2. Smart loading states
 * 3. Query deduplication
 * 4. Error handling
 * 5. Cleanup on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { optimizedSearchService } from '../services/optimizedSearchService';

interface SearchResult {
    id: number;
    type: 'customer' | 'product' | 'invoice';
    title: string;
    subtitle: string;
    url: string;
    metadata?: Record<string, any>;
    score: number;
}

interface UseOptimizedSearchResult {
    results: SearchResult[];
    isLoading: boolean;
    error: string | null;
    hasResults: boolean;
    searchTime: number | null;
}

export function useOptimizedSearch(
    query: string,
    options: {
        debounceMs?: number;
        minQueryLength?: number;
        enabled?: boolean;
    } = {}
): UseOptimizedSearchResult {

    const {
        debounceMs = 800, // 🎯 Longer debounce to reduce database load
        minQueryLength = 2,
        enabled = true
    } = options;

    // State
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTime, setSearchTime] = useState<number | null>(null);

    // Refs for cleanup
    const abortControllerRef = useRef<AbortController | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * 🎯 OPTIMIZED SEARCH FUNCTION
     * - Cancels previous requests
     * - Measures performance
     * - Handles errors gracefully
     */
    const performSearch = useCallback(async (searchQuery: string) => {
        // Cancel any previous search
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        try {
            setIsLoading(true);
            setError(null);

            const startTime = Date.now();

            console.log(`🔍 [SEARCH-HOOK] Starting search for: "${searchQuery}"`);

            // Execute optimized search
            const searchResults = await optimizedSearchService.search(searchQuery);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Only update state if this request wasn't cancelled
            if (!abortControllerRef.current.signal.aborted) {
                setResults(searchResults);
                setSearchTime(duration);

                console.log(`✅ [SEARCH-HOOK] Search completed in ${duration}ms, found ${searchResults.length} results`);
            }

        } catch (err) {
            // Only handle error if request wasn't intentionally cancelled
            if (!abortControllerRef.current?.signal.aborted) {
                const errorMessage = err instanceof Error ? err.message : 'Search failed';
                setError(errorMessage);
                setResults([]);

                console.error('❌ [SEARCH-HOOK] Search failed:', err);
            }
        } finally {
            // Only clear loading if request wasn't cancelled
            if (!abortControllerRef.current?.signal.aborted) {
                setIsLoading(false);
            }
        }
    }, []);

    /**
     * 🎯 DEBOUNCED SEARCH EFFECT
     * - Intelligent debouncing
     * - Query validation
     * - Cleanup on unmount
     */
    useEffect(() => {
        // Clear previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Reset state for empty queries
        if (!query.trim() || query.trim().length < minQueryLength) {
            setResults([]);
            setIsLoading(false);
            setError(null);
            setSearchTime(null);
            return;
        }

        // Skip if disabled
        if (!enabled) {
            return;
        }

        // Set up debounced search
        timeoutRef.current = setTimeout(() => {
            performSearch(query.trim());
        }, debounceMs);

        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [query, performSearch, debounceMs, minQueryLength, enabled]);

    /**
     * 🧹 CLEANUP ON UNMOUNT
     */
    useEffect(() => {
        return () => {
            // Cancel any pending request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Clear timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        results,
        isLoading,
        error,
        hasResults: results.length > 0,
        searchTime
    };
}

/**
 * 🎯 SEARCH CACHE MANAGEMENT HOOK
 * For manual cache control
 */
export function useSearchCache() {
    const clearCache = useCallback(() => {
        optimizedSearchService.clearCache();
    }, []);

    const getCacheStats = useCallback(() => {
        return optimizedSearchService.getCacheStats();
    }, []);

    return {
        clearCache,
        getCacheStats
    };
}
