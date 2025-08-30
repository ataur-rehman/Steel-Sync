/**
 * 🚀 OPTIMIZED SEARCH COMPONENT
 * 
 * High-performance search component that eliminates the "cheap and sluggish" feel
 * 
 * IMPROVEMENTS:
 * 1. Uses optimized search hook with intelligent debouncing
 * 2. Smooth loading states and animations
 * 3. Keyboard navigation support
 * 4. Performance metrics display (dev mode)
 * 5. Error handling and fallback states
 */

import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    User,
    Package,
    FileText,
    Loader2,
    AlertCircle,
    Zap,
    Eye,
    ExternalLink
} from 'lucide-react';
import { useOptimizedSearch } from '../../hooks/useOptimizedSearch';

interface OptimizedSearchProps {
    placeholder?: string;
    showMetrics?: boolean; // Show performance metrics in dev mode
    onResultClick?: (result: any) => void;
    className?: string;
}

export default function OptimizedSearch({
    placeholder = "Search customers, products, invoices...",
    showMetrics = false,
    onResultClick,
    className = ""
}: OptimizedSearchProps) {

    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // Refs
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Use optimized search hook
    const {
        results,
        isLoading,
        error,
        hasResults,
        searchTime
    } = useOptimizedSearch(searchQuery, {
        debounceMs: 800, // 🎯 Longer debounce for better performance
        minQueryLength: 2,
        enabled: true
    });

    /**
     * 🎯 HANDLE SEARCH INPUT
     */
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        setSelectedIndex(-1);

        // Show dropdown if we have a query
        if (value.trim().length >= 2) {
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    }, []);

    /**
     * 🎯 HANDLE RESULT SELECTION
     */
    const handleResultClick = useCallback((result: any) => {
        console.log(`🔍 [SEARCH] Navigating to: ${result.url}`);

        if (onResultClick) {
            onResultClick(result);
        } else {
            navigate(result.url);
        }

        // Clear search and hide dropdown
        setSearchQuery('');
        setShowDropdown(false);
        setSelectedIndex(-1);

        // Blur input
        inputRef.current?.blur();
    }, [navigate, onResultClick]);

    /**
     * 🎯 KEYBOARD NAVIGATION
     */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // ALWAYS prevent Enter key to avoid form submissions/page refreshes
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();

            // Only handle result selection if we have results and dropdown is showing
            if (showDropdown && hasResults && selectedIndex >= 0 && selectedIndex < results.length) {
                handleResultClick(results[selectedIndex]);
            }
            return;
        }

        // Handle other navigation keys only when dropdown is shown with results
        if (!showDropdown || !hasResults) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < results.length - 1 ? prev + 1 : prev
                );
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;

            case 'Escape':
                e.preventDefault();
                setShowDropdown(false);
                setSelectedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    }, [showDropdown, hasResults, results, selectedIndex, handleResultClick]);

    /**
     * 🎯 HANDLE INPUT FOCUS/BLUR
     */
    const handleFocus = useCallback(() => {
        if (hasResults && searchQuery.trim().length >= 2) {
            setShowDropdown(true);
        }
    }, [hasResults, searchQuery]);

    const handleBlur = useCallback(() => {
        // Delay hiding dropdown to allow clicks
        setTimeout(() => {
            setShowDropdown(false);
            setSelectedIndex(-1);
        }, 200);
    }, []);

    /**
     * 🎯 GET ICON FOR RESULT TYPE
     */
    const getResultIcon = useCallback((type: string) => {
        switch (type) {
            case 'customer':
                return <User className="h-4 w-4 text-blue-600" />;
            case 'product':
                return <Package className="h-4 w-4 text-green-600" />;
            case 'invoice':
                return <FileText className="h-4 w-4 text-purple-600" />;
            default:
                return <Search className="h-4 w-4 text-gray-600" />;
        }
    }, []);

    /**
     * 🎯 FORMAT METADATA
     */
    const formatMetadata = useCallback((result: any) => {
        const { metadata } = result;
        if (!metadata) return null;

        if (result.type === 'customer' && metadata.balance !== undefined) {
            return (
                <span className={`text-sm font-semibold ${metadata.balance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                    Rs. {metadata.balance.toFixed(2)}
                </span>
            );
        }

        if (result.type === 'product') {
            return (
                <div className="text-xs text-gray-500">
                    {metadata.category && <span>{metadata.category}</span>}
                    {metadata.stock !== undefined && (
                        <span className={`ml-2 ${metadata.stock <= 20 ? 'text-red-600' : 'text-green-600'
                            }`}>
                            Stock: {metadata.stock}
                        </span>
                    )}
                </div>
            );
        }

        if (result.type === 'invoice' && metadata.amount !== undefined) {
            return (
                <span className="text-sm font-semibold text-gray-700">
                    Rs. {metadata.amount.toFixed(2)}
                </span>
            );
        }

        return null;
    }, []);

    return (
        <div className={`relative ${className}`}>
            {/* Search Input - Wrapped in form to prevent page refresh */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }}
                autoComplete="off"
                className="contents"
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
                        placeholder={placeholder}
                        value={searchQuery}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                        data-form="false"
                        className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                    />

                    {/* Performance Indicator (Dev Mode) */}
                    {showMetrics && searchTime !== null && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Zap className="h-3 w-3" />
                                <span>{searchTime}ms</span>
                            </div>
                        </div>
                    )}
                </div>
            </form>

            {/* Search Dropdown */}
            {showDropdown && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full right-0 mt-1 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                >
                    <div className="p-2">
                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                                <span className="ml-2 text-sm text-gray-500">Searching...</span>
                            </div>
                        )}

                        {/* Error State */}
                        {error && !isLoading && (
                            <div className="flex items-center justify-center py-8 text-red-600">
                                <AlertCircle className="h-5 w-5" />
                                <span className="ml-2 text-sm">{error}</span>
                            </div>
                        )}

                        {/* No Results */}
                        {!isLoading && !error && !hasResults && searchQuery.trim().length >= 2 && (
                            <div className="flex items-center justify-center py-8 text-gray-500">
                                <Search className="h-5 w-5" />
                                <span className="ml-2 text-sm">No results found</span>
                            </div>
                        )}

                        {/* Results */}
                        {hasResults && !isLoading && (
                            <>
                                <div className="text-xs font-medium text-gray-500 mb-2 flex items-center justify-between">
                                    <span>Search Results ({results.length})</span>
                                    {showMetrics && searchTime && (
                                        <span className="flex items-center space-x-1">
                                            <Zap className="h-3 w-3" />
                                            <span>{searchTime}ms</span>
                                        </span>
                                    )}
                                </div>

                                {results.map((result: any, index: number) => (
                                    <div
                                        key={`${result.type}-${result.id}`}
                                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer group transition-colors ${index === selectedIndex
                                                ? 'bg-blue-50 border border-blue-200'
                                                : 'hover:bg-gray-50'
                                            }`}
                                        onClick={() => handleResultClick(result)}
                                    >
                                        <div className="flex items-center space-x-3 flex-1">
                                            {getResultIcon(result.type)}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">
                                                    {result.title}
                                                </p>
                                                <p className="text-sm text-gray-500 capitalize truncate">
                                                    {result.type} • {result.subtitle}
                                                </p>
                                                {formatMetadata(result)}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Handle quick preview if needed
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                                    title="Quick preview"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                </button>
                                                <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
