import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db } from '../../services/database';
import {
    Package,
    Plus,
    Edit,
    Trash2,
    RefreshCw,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import ProductFormEnhanced from './ProductFormEnhanced';
import { formatUnitString, parseUnit } from '../../utils/unitUtils';
import { formatCurrency } from '../../utils/calculations';
import { eventBus, BUSINESS_EVENTS } from '../../utils/eventBus';

// ===== PRODUCTION SECURITY VALIDATIONS =====

/**
 * PHASE 1: SECURITY VALIDATIONS
 * Comprehensive input validation system for production-grade security
 */

// XSS Protection - Sanitize HTML and dangerous characters
const sanitizeSearchInput = (input: string): string => {
    if (!input || typeof input !== 'string') return '';

    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
        .replace(/<[^>]*>?/gm, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
};

// Input Length and Character Validation
const validateSearchInput = (input: string): { isValid: boolean; errorMessage?: string } => {
    if (!input || input.length === 0) {
        return { isValid: true }; // Empty search is valid
    }

    // Length validation
    if (input.length > 100) {
        return {
            isValid: false,
            errorMessage: 'Search term too long (maximum 100 characters)'
        };
    }

    // Character validation - Allow letters, numbers, spaces, and common punctuation
    const allowedPattern = /^[a-zA-Z0-9\s\-_.()&+,]*$/;
    if (!allowedPattern.test(input)) {
        return {
            isValid: false,
            errorMessage: 'Search contains invalid characters. Only letters, numbers, and basic punctuation allowed.'
        };
    }

    // Prevent potential SQL injection patterns
    const dangerousPatterns = [
        /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b)/i,
        /(\bUNION\b|\bSELECT\b|\bFROM\b|\bWHERE\b)/i,
        /(--|\/\*|\*\/)/,
        /(\bEXEC\b|\bEXECUTE\b)/i
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(input)) {
            return {
                isValid: false,
                errorMessage: 'Search contains prohibited content.'
            };
        }
    }

    return { isValid: true };
};

// Debounce with Cancel Token for Performance
const createCancelToken = () => {
    let cancelled = false;
    return {
        cancel: () => { cancelled = true; },
        isCancelled: () => cancelled
    };
};

// ===== PHASE 2: PERFORMANCE OPTIMIZATIONS =====

/**
 * Memoized Product Row Component for Better Performance
 * Prevents unnecessary re-renders when parent state changes
 */
const ProductRow = React.memo<{
    product: Product;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
}>(({ product, onEdit, onDelete }) => {
    // 🔥 FIX: Properly calculate low stock using parseUnit for compound units
    const currentStock = parseUnit(product.current_stock, product.unit_type as any);
    const minStock = parseUnit(product.min_stock_alert, product.unit_type as any);
    const isLowStock = currentStock.numericValue <= minStock.numericValue && minStock.numericValue > 0;

    return (
        <tr className="hover:bg-gray-50">
            <td className="px-4 py-4">
                <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={product.name}>
                        {product.name}
                    </div>
                    {(product.size || product.grade) && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.size && <span>Size: {product.size}</span>}
                            {product.size && product.grade && <span> • </span>}
                            {product.grade && <span>Grade: {product.grade}</span>}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-4 py-4">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 truncate max-w-20" title={product.category}>
                    {product.category}
                </span>
            </td>
            <td className="px-4 py-4 text-sm text-gray-900">
                <div className={`${isLowStock ? 'text-red-600' : 'text-gray-900'} whitespace-nowrap`}>
                    {formatUnitString(product.current_stock, product.unit_type as any)}
                    {isLowStock && (
                        <AlertTriangle className="inline w-4 h-4 ml-1 text-red-500" />
                    )}
                </div>
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(product.rate_per_unit)}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(product.stock_value || 0)}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button
                    onClick={() => onEdit(product)}
                    className="text-blue-600 hover:text-blue-900 p-1"
                    title="Edit product"
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(product)}
                    className="text-red-600 hover:text-red-900 p-1"
                    title="Delete product"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
});

ProductRow.displayName = 'ProductRow';

/**
 * Memoized Empty State Component
 */
const EmptyState = React.memo<{
    hasFilters: boolean;
    onReset: () => void;
    onAddProduct: () => void;
}>(({ hasFilters, onReset, onAddProduct }) => (
    <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
        <p className="mt-1 text-sm text-gray-500">
            {hasFilters
                ? 'No products match your current filters. Try adjusting your search criteria.'
                : 'Get started by adding your first product to the inventory.'
            }
        </p>
        {hasFilters ? (
            <button onClick={onReset} className="btn btn-secondary">
                Clear Filters
            </button>
        ) : (
            <button onClick={onAddProduct} className="btn btn-primary flex items-center mx-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add First Product
            </button>
        )}
    </div>
));

EmptyState.displayName = 'EmptyState';

/**
 * Memoized Loading Skeleton Component
 */
const LoadingSkeleton = React.memo(() => (
    <div className="animate-pulse">
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex space-x-4">
                    <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                    <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';
interface Product {
    id: number;
    name: string;
    category: string;
    unit_type: string;
    rate_per_unit: number;
    current_stock: string;
    min_stock_alert: string;
    track_inventory: number;
    size?: string;
    grade?: string;
    created_at: string;
    updated_at: string;
    // Computed fields
    stock_value?: number;
}

interface ProductFilters {
    search: string;
    category: string;
}

interface PaginationState {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
}

const ProductListNoRefresh: React.FC = () => {
    // State management - EXACT SAME AS ORIGINAL
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modals state - EXACT SAME AS ORIGINAL
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filters and pagination - EXACT SAME AS ORIGINAL
    const [filters, setFilters] = useState<ProductFilters>({
        search: '',
        category: ''
    });

    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 0,
        totalPages: 0
    });

    // 🔥 COMPLETE SEARCH REWRITE: No refresh, no complex effects
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const cancelTokenRef = useRef<{ cancel: () => void; isCancelled: () => boolean } | null>(null);
    const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Enhanced product filtering function with validation
    const filterProducts = useCallback((allProducts: Product[], searchTerm: string) => {
        if (!searchTerm.trim()) {
            setSearchError(null);
            return allProducts;
        }

        // Validate search input
        const validation = validateSearchInput(searchTerm);
        if (!validation.isValid) {
            setSearchError(validation.errorMessage || 'Invalid search input');
            return []; // Return empty array for invalid input
        }

        // Sanitize the search term
        const sanitizedSearch = sanitizeSearchInput(searchTerm).toLowerCase();
        setSearchError(null);

        return allProducts.filter(product =>
            product.name?.toLowerCase().includes(sanitizedSearch) ||
            product.category?.toLowerCase().includes(sanitizedSearch) ||
            product.unit_type?.toLowerCase().includes(sanitizedSearch)
        );
    }, []);

    // Enhanced search handler with security and performance optimizations
    const handleSearchChange = useCallback((value: string) => {
        // Cancel previous search operation
        if (cancelTokenRef.current) {
            cancelTokenRef.current.cancel();
        }

        // Create new cancel token
        cancelTokenRef.current = createCancelToken();
        const currentToken = cancelTokenRef.current;

        // Update filters immediately (no side effects)
        setFilters(prev => ({ ...prev, search: value }));

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Enhanced debounced filtering with cancellation
        searchTimeoutRef.current = setTimeout(() => {
            // Check if operation was cancelled
            if (currentToken.isCancelled()) {
                return;
            }

            const filtered = filterProducts(products, value);

            // Final cancellation check before updating state
            if (!currentToken.isCancelled()) {
                setDisplayProducts(filtered);
                setPagination(prev => ({
                    ...prev,
                    currentPage: 1,
                    totalItems: filtered.length,
                    totalPages: Math.ceil(filtered.length / prev.itemsPerPage)
                }));
            }
        }, 300); // Increased debounce time for better performance
    }, [products, filterProducts]);

    // Enhanced keydown handler with validation
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();

            // Cancel previous operations
            if (cancelTokenRef.current) {
                cancelTokenRef.current.cancel();
            }
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }

            // Immediately execute search with validation
            const filtered = filterProducts(products, filters.search);
            setDisplayProducts(filtered);
            setPagination(prev => ({
                ...prev,
                currentPage: 1,
                totalItems: filtered.length,
                totalPages: Math.ceil(filtered.length / prev.itemsPerPage)
            }));
            return false;
        }
    }, [products, filterProducts, filters.search]);

    // Enhanced load products with proper compound unit calculation
    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Load ALL products without calculated stock_value (we'll calculate it properly)
            const query = `
        SELECT *
        FROM products 
        ORDER BY updated_at DESC, name ASC
      `;

            const result = await db.executeSmartQuery(query, []);
            const rawProducts = result as Product[];

            // 🔥 FIX: Properly calculate stock_value using parseUnit for compound units
            const allProducts = rawProducts.map(product => {
                // Parse the compound unit (e.g., "150-200" kg-grams = 150kg + 200g = 150.2kg total)
                const parsedStock = parseUnit(product.current_stock, product.unit_type as any);

                // Convert to proper unit for calculation
                let numericStockValue = 0;
                if (product.unit_type === 'kg-grams' || product.unit_type === 'kg') {
                    // Convert grams to kilograms (parsedStock.numericValue is in grams)
                    numericStockValue = (parsedStock.numericValue || 0) / 1000;
                } else {
                    // For other units (piece, bag, etc.), use the numeric value directly
                    numericStockValue = parsedStock.numericValue || 0;
                }

                return {
                    ...product,
                    stock_value: numericStockValue * product.rate_per_unit
                };
            });

            setProducts(allProducts);

            // 🔥 CRITICAL FIX: Preserve active search filter after reload
            if (filters.search) {
                const filtered = filterProducts(allProducts, filters.search);
                setDisplayProducts(filtered);
                setPagination(prev => ({
                    ...prev,
                    totalItems: filtered.length,
                    totalPages: Math.ceil(filtered.length / prev.itemsPerPage)
                }));
            } else {
                setDisplayProducts(allProducts);
                setPagination(prev => ({
                    ...prev,
                    totalItems: allProducts.length,
                    totalPages: Math.ceil(allProducts.length / prev.itemsPerPage)
                }));
            }

        } catch (error) {
            console.error('Error loading products:', error);
            setError('Failed to load products. Please try again.');
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [filters.search, filterProducts]);

    // Load categories
    const loadCategories = useCallback(async () => {
        try {
            const query = `
        SELECT category, COUNT(*) as product_count
        FROM products 
        WHERE category IS NOT NULL AND category != ''
        GROUP BY category 
        ORDER BY product_count DESC, category ASC
      `;

            const result = await db.executeSmartQuery(query);
            setCategories(result as any[]);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }, []);

    // Load data only once when component mounts
    useEffect(() => {
        const initializeData = async () => {
            await Promise.all([loadProducts(), loadCategories()]);
        };
        initializeData();
    }, []);

    // Cleanup effect for security and performance
    useEffect(() => {
        return () => {
            // Cancel ongoing search operations
            if (cancelTokenRef.current) {
                cancelTokenRef.current.cancel();
            }
            // Clear timeout to prevent memory leaks
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // ===== PHASE 3: PRODUCTION REAL-TIME UPDATES =====
    // Real-time event listeners for production-grade synchronization
    useEffect(() => {
        console.log('🔄 ProductListNoRefresh: Setting up real-time event listeners...');

        // Enhanced event handler for product operations
        const handleProductEvents = (data: any) => {
            console.log('📦 ProductListNoRefresh: Product event received:', data);

            // Immediate, silent refresh without disrupting user interaction
            setTimeout(() => {
                loadProducts();
            }, 100); // Small delay to ensure database operations are complete
        };

        // Enhanced event handler for stock-related operations
        const handleStockEvents = (data: any) => {
            console.log('📊 ProductListNoRefresh: Stock event received:', data);

            // Refresh products as stock changes affect display values
            setTimeout(() => {
                loadProducts();
            }, 200); // Slightly longer delay for stock operations
        };

        // Enhanced event handler for comprehensive refresh requests
        const handleComprehensiveRefresh = (data: any) => {
            console.log('🔄 ProductListNoRefresh: Comprehensive refresh requested:', data);

            // Full reload for major system changes
            setTimeout(() => {
                Promise.all([loadProducts(), loadCategories()]);
            }, 150);
        };

        // Subscribe to all relevant business events
        const eventListeners = [
            // Direct product events
            { event: BUSINESS_EVENTS.PRODUCT_CREATED, handler: handleProductEvents },
            { event: BUSINESS_EVENTS.PRODUCT_UPDATED, handler: handleProductEvents },
            { event: BUSINESS_EVENTS.PRODUCT_DELETED, handler: handleProductEvents },

            // Stock-related events that affect product display
            { event: BUSINESS_EVENTS.STOCK_UPDATED, handler: handleStockEvents },
            { event: BUSINESS_EVENTS.STOCK_MOVEMENT_CREATED, handler: handleStockEvents },
            { event: BUSINESS_EVENTS.STOCK_ADJUSTMENT_MADE, handler: handleStockEvents },

            // Invoice events that affect stock values
            { event: BUSINESS_EVENTS.INVOICE_CREATED, handler: handleStockEvents },
            { event: BUSINESS_EVENTS.INVOICE_UPDATED, handler: handleStockEvents },
            { event: BUSINESS_EVENTS.INVOICE_DELETED, handler: handleStockEvents },

            // Additional refresh events from other systems
            { event: 'PRODUCTS_UPDATED', handler: handleProductEvents },
            { event: 'UI_REFRESH_REQUESTED', handler: handleComprehensiveRefresh },
            { event: 'FORCE_PRODUCT_RELOAD', handler: handleComprehensiveRefresh },
            { event: 'PRODUCTS_CACHE_INVALIDATED', handler: handleProductEvents },
            { event: 'COMPREHENSIVE_DATA_REFRESH', handler: handleComprehensiveRefresh }
        ];

        // Register all event listeners
        eventListeners.forEach(({ event, handler }) => {
            eventBus.on(event, handler);
            console.log(`✅ ProductListNoRefresh: Registered listener for ${event}`);
        });

        console.log(`🎯 ProductListNoRefresh: ${eventListeners.length} real-time event listeners active`);

        // Cleanup function - Unregister all event listeners
        return () => {
            console.log('🧹 ProductListNoRefresh: Cleaning up real-time event listeners...');

            eventListeners.forEach(({ event, handler }) => {
                eventBus.off(event, handler);
            });

            console.log('✅ ProductListNoRefresh: All event listeners cleaned up');
        };
    }, [loadProducts, loadCategories]); // Dependencies ensure handlers have latest functions

    // Product actions - EXACT SAME AS ORIGINAL
    const handleEdit = useCallback((product: Product) => {
        setEditingProduct(product);
        setShowEditModal(true);
    }, []);

    const handleDelete = useCallback((product: Product) => {
        setDeletingProduct(product);
        setShowDeleteModal(true);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!deletingProduct) return;

        setIsDeleting(true);
        try {
            await db.deleteProduct(deletingProduct.id);
            toast.success('Product deleted successfully');
            setShowDeleteModal(false);
            setDeletingProduct(null);
            loadProducts();

            // 🔄 PRODUCTION FIX: Emit events to notify other components
            try {
                eventBus.emit(BUSINESS_EVENTS.PRODUCT_DELETED, {
                    productId: deletingProduct.id,
                    productName: deletingProduct.name,
                    timestamp: Date.now(),
                    source: 'ProductListNoRefresh'
                });
                eventBus.emit('PRODUCTS_UPDATED', {
                    action: 'deleted',
                    productId: deletingProduct.id,
                    source: 'ProductListNoRefresh'
                });
                console.log('✅ ProductListNoRefresh: Product deletion events emitted');
            } catch (eventError) {
                console.warn('⚠️ ProductListNoRefresh: Failed to emit product deletion events:', eventError);
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Failed to delete product');
        } finally {
            setIsDeleting(false);
        }
    }, [deletingProduct, loadProducts]);

    // Enhanced form handlers with real-time event emission
    const handleAddSuccess = useCallback(() => {
        setShowAddModal(false);
        loadProducts();
        toast.success('Product added successfully');

        // 🔄 PRODUCTION FIX: Emit events to notify other components
        try {
            eventBus.emit(BUSINESS_EVENTS.PRODUCT_CREATED, {
                timestamp: Date.now(),
                source: 'ProductListNoRefresh'
            });
            eventBus.emit('PRODUCTS_UPDATED', {
                action: 'created',
                source: 'ProductListNoRefresh'
            });
            console.log('✅ ProductListNoRefresh: Product creation events emitted');
        } catch (error) {
            console.warn('⚠️ ProductListNoRefresh: Failed to emit product creation events:', error);
        }
    }, [loadProducts]);

    const handleEditSuccess = useCallback(() => {
        setShowEditModal(false);
        setEditingProduct(null);
        loadProducts();
        toast.success('Product updated successfully');

        // 🔄 PRODUCTION FIX: Emit events to notify other components
        try {
            eventBus.emit(BUSINESS_EVENTS.PRODUCT_UPDATED, {
                productId: editingProduct?.id,
                timestamp: Date.now(),
                source: 'ProductListNoRefresh'
            });
            eventBus.emit('PRODUCTS_UPDATED', {
                action: 'updated',
                productId: editingProduct?.id,
                source: 'ProductListNoRefresh'
            });
            console.log('✅ ProductListNoRefresh: Product update events emitted');
        } catch (error) {
            console.warn('⚠️ ProductListNoRefresh: Failed to emit product update events:', error);
        }
    }, [loadProducts, editingProduct]);

    // Enhanced filter helpers with validation
    const handleCategoryChange = useCallback((value: string) => {
        // Validate category input to prevent injection
        const sanitizedValue = sanitizeSearchInput(value);

        // Verify the category exists in our loaded categories (security check)
        if (sanitizedValue !== '' && !categories.some(cat => cat.category === sanitizedValue)) {
            toast.error('Invalid category selection');
            return;
        }

        setFilters(prev => ({ ...prev, category: sanitizedValue }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, [categories]);

    const resetFilters = useCallback(() => {
        setFilters({
            search: '',
            category: ''
        });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, []);

    // Pagination helpers - EXACT SAME AS ORIGINAL
    const handlePageChange = useCallback((page: number) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
    }, []);

    // Computed values - EXACT SAME AS ORIGINAL
    const hasActiveFilters = useMemo(() => {
        return filters.search !== '' || filters.category !== '';
    }, [filters]);

    const productStats = useMemo(() => {
        const totalValue = products.reduce((sum: number, p: any) => sum + (p.stock_value || 0), 0);
        return { totalValue };
    }, [products]);

    // Pagination for display products
    const paginatedProducts = useMemo(() => {
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        return displayProducts.slice(startIndex, endIndex);
    }, [displayProducts, pagination.currentPage, pagination.itemsPerPage]);

    // Loading state - EXACT SAME AS ORIGINAL
    if (loading && products.length === 0) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <button
                        className="btn btn-primary flex items-center"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Loading...
                    </button>
                </div>
                <LoadingSkeleton />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header Section - EXACT SAME AS ORIGINAL */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-600 mt-1">Manage your product inventory</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => loadProducts()}
                        disabled={loading}
                        className="btn btn-secondary flex items-center"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                    </button>
                </div>
            </div>

            {/* Error State - EXACT SAME AS ORIGINAL */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
                    <div>
                        <h3 className="font-medium text-red-800">Error</h3>
                        <p className="text-red-700">{error}</p>
                    </div>
                    <button
                        onClick={() => loadProducts()}
                        className="ml-auto btn btn-sm btn-secondary"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Stats Cards - EXACT SAME AS ORIGINAL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{pagination.totalItems}</div>
                        <div className="text-sm text-gray-500">Total Products</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
                        <div className="text-sm text-gray-500">Categories</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(productStats.totalValue)}</div>
                        <div className="text-sm text-gray-500">Total Value</div>
                    </div>
                </div>
            </div>

            {/* Filters Section - ENHANCED WITH VALIDATION */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search - 🔥 ENHANCED WITH SECURITY VALIDATIONS */}
                    <div className="flex-1 min-w-0">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search products by name..."
                                className={`w-full py-3 text-base pl-10 pr-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${searchError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                                    }`}
                                autoComplete="off"
                                maxLength={100}
                                spellCheck={false}
                            />
                            {searchError && (
                                <div className="absolute top-full left-0 mt-1 text-sm text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                                    <div className="flex items-center">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        {searchError}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Category Filter - FIXED: Use correct property names */}
                    <div className="w-full lg:w-48">
                        <select
                            value={filters.category}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                        >
                            <option value="">All Categories</option>
                            {categories.map((categoryItem) => (
                                <option key={categoryItem.category} value={categoryItem.category}>
                                    {categoryItem.category} ({categoryItem.product_count})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reset Filters - EXACT SAME AS ORIGINAL */}
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Products Table - EXACT SAME AS ORIGINAL */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {products.length === 0 ? (
                    <EmptyState
                        hasFilters={hasActiveFilters}
                        onReset={resetFilters}
                        onAddProduct={() => setShowAddModal(true)}
                    />
                ) : (
                    <>
                        {/* Desktop Table View - Show on medium screens and larger */}
                        <div className="hidden lg:block">
                            <div className="overflow-x-auto">
                                <table className="w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                                                Product
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                                                Category
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                                                Stock
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                                                Rate
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                                                Value
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedProducts.map((product) => (
                                            <ProductRow
                                                key={product.id}
                                                product={product}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile Card View - Show on small and medium screens */}
                        <div className="lg:hidden">
                            {paginatedProducts.map((product) => (
                                <div key={product.id} className="border-b border-gray-200 p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-medium text-gray-900 break-words" title={product.name}>
                                                {product.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1 break-words">
                                                {product.category || 'No Category'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-gray-500 text-xs uppercase tracking-wide">Current Stock</div>
                                            <div className="font-medium">
                                                {formatUnitString(product.current_stock, product.unit_type as any)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500 text-xs uppercase tracking-wide">Rate</div>
                                            <div className="font-medium">
                                                Rs. {product.rate_per_unit?.toLocaleString() || '0'}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-gray-500 text-xs uppercase tracking-wide">Stock Value</div>
                                            <div className="font-medium text-green-600">
                                                Rs. {(product.stock_value || 0).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => handleEdit(product)}
                                            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product)}
                                            className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination - EXACT SAME AS ORIGINAL */}
                        {pagination.totalPages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                                        disabled={pagination.currentPage === 1}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                                        disabled={pagination.currentPage === pagination.totalPages}
                                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}</span> to{' '}
                                            <span className="font-medium">
                                                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                                            </span> of{' '}
                                            <span className="font-medium">{pagination.totalItems}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                            <button
                                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                                disabled={pagination.currentPage === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                <ChevronLeft className="h-5 w-5" />
                                            </button>
                                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                                <button
                                                    key={page}
                                                    onClick={() => handlePageChange(page)}
                                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pagination.currentPage
                                                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                                disabled={pagination.currentPage === pagination.totalPages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                <ChevronRight className="h-5 w-5" />
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals - EXACT SAME AS ORIGINAL */}
            {showAddModal && (
                <Modal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    title="Add New Product"
                    size="xl"
                >
                    <ProductFormEnhanced
                        onSuccess={handleAddSuccess}
                        onCancel={() => setShowAddModal(false)}
                    />
                </Modal>
            )}

            {showEditModal && editingProduct && (
                <Modal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingProduct(null);
                    }}
                    title="Edit Product"
                    size="xl"
                >
                    <ProductFormEnhanced
                        product={editingProduct}
                        onSuccess={handleEditSuccess}
                        onCancel={() => {
                            setShowEditModal(false);
                            setEditingProduct(null);
                        }}
                    />
                </Modal>
            )}

            {showDeleteModal && deletingProduct && (
                <Modal
                    isOpen={showDeleteModal}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setDeletingProduct(null);
                    }}
                    title="Delete Product"
                >
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            Are you sure you want to delete "{deletingProduct.name}"? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeletingProduct(null);
                                }}
                                className="btn btn-secondary"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="btn btn-danger"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ProductListNoRefresh;
