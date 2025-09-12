import React, { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { parseUnit, type UnitType } from '../../utils/unitUtils';
import { formatDate } from '../../utils/formatters';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { useDebounce } from '../../hooks/useDebounce';
import {
    ArrowLeft,
    Search,
    Filter,
    Download,
    User,
    Package,
    TrendingUp,
    TrendingDown,
    BarChart3,
    FileText,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react';

interface Product {
    id: number;
    name: string;
    category: string;
    unit_type: UnitType;
    current_stock: string;
    rate_per_unit: number;
}

interface StockSummary {
    totalMovements: number;
    totalIn: number;
    totalOut: number;
    totalValue: number;
    avgMovementValue: number;
    mostActiveDay: string;
    largestMovement: any;
}

// 🚀 PERFORMANCE: Optimized pagination for large datasets
const ITEMS_PER_PAGE = 50; // Increased for better user experience while maintaining performance

// Memoized movement row component for better performance
const MovementRow = memo(({ movement, getMovementTypeInfo, formatCurrency }: any) => {
    const typeInfo = getMovementTypeInfo(movement.movement_type);
    const TypeIcon = typeInfo.icon;

    return (
        <tr className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                    {formatDate(movement.date)}
                </div>
                <div className="text-sm text-gray-500">
                    {movement.time}
                </div>
            </td>

            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {typeInfo.label}
                </span>
            </td>

            <td className="px-6 py-4 whitespace-nowrap">
                <div className={`text-sm font-semibold ${movement.movement_type === 'in' ? 'text-green-600' :
                    movement.movement_type === 'out' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                    {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : '±'}
                    {(() => {
                        // 🚀 CRITICAL FIX: Handle NaN values gracefully (but allow legitimate zeros)
                        let numericValue = Math.abs(movement.quantity);

                        // Check for NaN only - zero is a valid quantity
                        if (isNaN(numericValue)) {
                            console.warn('⚠️ Invalid quantity in stock movement:', {
                                id: movement.id,
                                product: movement.product_name,
                                quantity: movement.quantity,
                                quantityType: typeof movement.quantity,
                                reason: movement.reason,
                                reference: movement.reference_number
                            });
                            return `⚠️ Invalid`;
                        }

                        if ((movement.unit_type || 'kg-grams') === 'kg-grams') {
                            const kg = Math.floor(numericValue / 1000);
                            const grams = numericValue % 1000;
                            return grams > 0 ? `${kg}kg ${grams}g` : `${kg}kg`;
                        } else {
                            const intValue = Math.round(numericValue);
                            return `${intValue} ${movement.unit_type || 'kg'}`;
                        }
                    })()}
                </div>
            </td>

            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                    {(() => {
                        // 🚀 CRITICAL FIX: Handle NaN values gracefully
                        let numericValue = movement.new_stock;

                        // Check for NaN and provide fallback
                        if (isNaN(numericValue)) {
                            console.warn('⚠️ Invalid new_stock in stock movement:', {
                                id: movement.id,
                                product: movement.product_name,
                                new_stock: movement.new_stock,
                                newStockType: typeof movement.new_stock,
                                reason: movement.reason,
                                reference: movement.reference_number
                            });
                            return `⚠️ Invalid`;
                        }

                        if ((movement.unit_type || 'kg-grams') === 'kg-grams') {
                            const kg = Math.floor(numericValue / 1000);
                            const grams = numericValue % 1000;
                            return grams > 0 ? `${kg}kg ${grams}g` : `${kg}kg`;
                        } else {
                            const intValue = Math.round(numericValue);
                            return `${intValue} ${movement.unit_type || 'kg'}`;
                        }
                    })()}
                </div>
            </td>

            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(movement.total_value)}
                </div>
            </td>

            <td className="px-6 py-4">
                <div className="space-y-1">
                    {movement.customer_name && (
                        <div className="flex items-center text-sm text-gray-900">
                            <User className="h-3 w-3 mr-1" />
                            {movement.customer_name}
                        </div>
                    )}
                    {movement.vendor_name && (
                        <div className="flex items-center text-sm text-gray-900">
                            <Package className="h-3 w-3 mr-1" />
                            {movement.vendor_name}
                        </div>
                    )}
                    {movement.reference_number && (
                        <div className="flex items-center text-sm text-gray-500">
                            <FileText className="h-3 w-3 mr-1" />
                            {movement.reference_number}
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
});

MovementRow.displayName = 'MovementRow';

const StockHistory: React.FC = () => {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Check if we came from stock report
    const navigationState = location.state as any;

    // State
    const [product, setProduct] = useState<Product | null>(null);
    const [movements, setMovements] = useState<any[]>([]); // Current page movements
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<StockSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dataFreshness, setDataFreshness] = useState<'live' | 'cached' | 'stale'>('live');

    // 🚀 PERFORMANCE: Server-side pagination state with caching
    const [paginationInfo, setPaginationInfo] = useState({
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0,
        hasNextPage: false,
        hasPreviousPage: false
    });

    // 🚀 PERFORMANCE: Cache total count to avoid recalculating on every page
    const [cachedTotalCount, setCachedTotalCount] = useState<{
        count: number;
        filters: string;
        timestamp: number;
    } | null>(null);

    // 🚀 PERFORMANCE: Add loading states for better UX
    const [pageLoading, setPageLoading] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        movementType: 'all',
        dateFrom: '',
        dateTo: '',
        customerName: '',
        amountMin: '',
        amountMax: '',
        transactionType: 'all'
    });

    // 🚀 PERFORMANCE: Debounced search to prevent excessive API calls
    const debouncedSearchTerm = useDebounce(filters.search, 500);

    // UI State
    const [showFilters, setShowFilters] = useState(false);

    // 🚀 PERFORMANCE: Memoized filtered movements - now handled server-side
    const filteredMovements = movements; // Server already filters

    // 🚀 PERFORMANCE: Paginated movements for display - now handled server-side
    const paginatedMovements = movements; // Server already paginates

    // Calculate total pages based on server response
    const totalFilteredPages = paginationInfo.totalPages;

    // Real-time updates
    useRealTimeUpdates({
        onStockUpdated: useCallback((data: any) => {
            if (data.productId === parseInt(productId || '0')) {
                // Refresh current page when stock is updated for this product
                handleRefresh();
            }
        }, [productId]),
        onStockMovementCreated: useCallback((data: any) => {
            if (data.product_id === parseInt(productId || '0')) {
                // Clear cache and refresh current page to show new movement
                setCachedTotalCount(null);
                loadMovementsPage(paginationInfo.currentPage);
                toast.success('New stock movement detected');
            }
        }, [productId, paginationInfo.currentPage]),
        onStockAdjustmentMade: useCallback((data: any) => {
            if (data.product_id === parseInt(productId || '0')) {
                // Clear cache and refresh for stock adjustments
                setCachedTotalCount(null);
                handleRefresh();
            }
        }, [productId])
    });

    // Optimized callbacks
    const handleRefresh = useCallback(async () => {
        if (!productId) return;

        try {
            setRefreshing(true);
            // Clear cache for real-time updates
            setCachedTotalCount(null);
            await loadMovementsPage(paginationInfo.currentPage);
            toast.success('Data refreshed');
        } catch (error) {
            toast.error('Failed to refresh data');
        } finally {
            setRefreshing(false);
        }
    }, [productId, paginationInfo.currentPage]);

    const handleFilterChange = useCallback((filterName: string, value: string) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
        // Clear cache when filters change since count will be different
        setCachedTotalCount(null);
        // Reset to first page when filtering and reload
        setPaginationInfo(prev => ({ ...prev, currentPage: 1 }));
        if (productId) {
            loadMovementsPage(1);
        }
    }, [productId]);

    const clearFilters = useCallback(() => {
        setFilters({
            search: '',
            movementType: 'all',
            dateFrom: '',
            dateTo: '',
            customerName: '',
            amountMin: '',
            amountMax: '',
            transactionType: 'all'
        });
        setPaginationInfo(prev => ({ ...prev, currentPage: 1 }));
        if (productId) {
            loadMovementsPage(1);
        }
    }, [productId]);

    useEffect(() => {
        if (productId) {
            // Clear cache when switching to different product
            setCachedTotalCount(null);
            loadProductAndMovements();
        }
    }, [productId]);

    // 🚀 PERFORMANCE: Reload data when debounced search changes
    useEffect(() => {
        if (productId && debouncedSearchTerm !== filters.search) {
            // Clear cache when search changes since count will be different
            setCachedTotalCount(null);
            setPaginationInfo(prev => ({ ...prev, currentPage: 1 }));
            loadMovementsPage(1);
        }
    }, [debouncedSearchTerm, productId]);

    // 🚀 PERFORMANCE: Server-side data loading with optimized pagination
    const loadMovementsPage = useCallback(async (page: number = 1, skipCountUpdate: boolean = false) => {
        if (!productId) return;

        try {
            // Show page loading only for navigation, not initial load
            if (page !== 1) {
                setPageLoading(true);
            } else {
                setLoading(true);
            }

            setError(null);
            setDataFreshness('live');

            // Build query parameters with filters
            const queryParams: any = {
                product_id: parseInt(productId),
                limit: ITEMS_PER_PAGE,
                offset: (page - 1) * ITEMS_PER_PAGE
            };

            // Apply filters to server query
            if (filters.movementType !== 'all') {
                queryParams.movement_type = filters.movementType;
            }
            if (filters.dateFrom) {
                queryParams.from_date = filters.dateFrom;
            }
            if (filters.dateTo) {
                queryParams.to_date = filters.dateTo;
            }
            if (debouncedSearchTerm.trim()) {
                queryParams.search = debouncedSearchTerm.trim();
            }

            // 🚀 PERFORMANCE: Optimized count query instead of loading sample data
            const filtersKey = JSON.stringify({ ...filters, search: debouncedSearchTerm });
            const now = Date.now();
            const CACHE_DURATION = 30000; // 30 seconds cache

            let totalRecords = 0;
            let totalPages = 1;

            // Check if we can use cached count
            if (!skipCountUpdate && cachedTotalCount &&
                cachedTotalCount.filters === filtersKey &&
                (now - cachedTotalCount.timestamp) < CACHE_DURATION) {
                // Use cached count for better performance
                totalRecords = cachedTotalCount.count;
                totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
                console.log('📊 Using cached count:', totalRecords);
            } else {
                // 🚀 PERFORMANCE: Use dedicated COUNT query instead of loading records
                const countFilters = { ...queryParams };
                delete countFilters.limit;
                delete countFilters.offset;

                totalRecords = await db.getStockMovementsCount(countFilters);
                totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

                // Cache the count
                setCachedTotalCount({
                    count: totalRecords,
                    filters: filtersKey,
                    timestamp: now
                });
                console.log('📊 Loaded count with optimized query:', totalRecords);
            }

            // Get paginated movements (this should be fast)
            const movementData = await db.getStockMovements(queryParams);

            setMovements(movementData);
            setPaginationInfo({
                currentPage: page,
                totalPages,
                totalRecords,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            });

        } catch (error) {
            console.error('Error loading movements page:', error);
            setError('Failed to load movements. Please try again.');
            toast.error('Failed to load movements');
        } finally {
            setLoading(false);
            setPageLoading(false);
        }
    }, [productId, filters, debouncedSearchTerm, cachedTotalCount]);

    const loadProductAndMovements = async () => {
        if (!productId) return;

        try {
            setLoading(true);
            setError(null);

            // Load product details with retry logic
            const productData = await db.getProduct(parseInt(productId));
            if (!productData) {
                console.warn(`Product with ID ${productId} not found in database`);
                setError(`Product with ID ${productId} not found`);
                return;
            }
            setProduct(productData);

            // Load first page of movements
            await loadMovementsPage(1);

            // Load summary statistics
            await loadSummary();

        } catch (error) {
            console.error('Error loading stock history:', error);
            setError('Failed to load stock history. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadSummary = async () => {
        if (!productId) return;

        try {
            // 🚀 PERFORMANCE: Use optimized count queries for summary instead of loading all data
            const productIdInt = parseInt(productId);

            // Get total counts efficiently
            const [totalCount, inCount, outCount] = await Promise.all([
                db.getStockMovementsCount({ product_id: productIdInt }),
                db.getStockMovementsCount({ product_id: productIdInt, movement_type: 'in' }),
                db.getStockMovementsCount({ product_id: productIdInt, movement_type: 'out' })
            ]);

            // Get a sample of recent movements for value calculations (limit to 500 for performance)
            const recentMovements = await db.getStockMovements({
                product_id: productIdInt,
                limit: 500,
                offset: 0
            });

            const totalIn = recentMovements
                .filter(m => m.movement_type === 'in')
                .reduce((sum, m) => sum + (m.total_value || 0), 0);

            const totalOut = recentMovements
                .filter(m => m.movement_type === 'out')
                .reduce((sum, m) => sum + (m.total_value || 0), 0);

            const totalValue = totalIn + totalOut;
            const avgMovementValue = recentMovements.length > 0 ? totalValue / recentMovements.length : 0;

            // Find most active day from recent movements
            const dayCount = recentMovements.reduce((acc, m) => {
                acc[m.date] = (acc[m.date] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const mostActiveDay = Object.keys(dayCount).length > 0 ? Object.keys(dayCount).reduce((a, b) =>
                dayCount[a] > dayCount[b] ? a : b
            ) : '';

            // Find largest movement by value from recent data
            const largestMovement = recentMovements.length > 0 ? recentMovements.reduce((largest, current) =>
                (!largest || (current.total_value || 0) > (largest.total_value || 0)) ? current : largest
            ) : null;

            setSummary({
                totalMovements: totalCount,
                totalIn: inCount,
                totalOut: outCount,
                totalValue,
                avgMovementValue,
                mostActiveDay,
                largestMovement
            });

        } catch (error) {
            console.error('Error loading summary:', error);
        }
    };

    const exportToCSV = useCallback(() => {
        if (filteredMovements.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = [
            'Date',
            'Time',
            'Type',
            'Transaction Type',
            'Quantity',
            'Previous Stock',
            'New Stock',
            'Unit Price',
            'Total Value',
            'Customer/Vendor',
            'Reference',
            'Notes'
        ];

        const csvData = filteredMovements.map(movement => [
            movement.date,
            movement.time,
            movement.movement_type,
            movement.transaction_type,
            movement.quantity,
            movement.previous_stock,
            movement.new_stock,
            movement.unit_price,
            movement.total_value,
            movement.customer_name || movement.vendor_name || '',
            movement.reference_number || '',
            movement.notes || ''
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stock-history-${product?.name}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        toast.success('Stock history exported successfully');
    }, [filteredMovements, product?.name]);

    const formatCurrency = useCallback((amount: number): string => {
        return `Rs. ${Number(amount).toFixed(2)}`;
    }, []);

    const getMovementTypeInfo = useCallback((type: string) => {
        switch (type) {
            case 'in':
                return { label: 'Stock In', color: 'bg-green-100 text-green-800', icon: TrendingUp };
            case 'out':
                return { label: 'Stock Out', color: 'bg-red-100 text-red-800', icon: TrendingDown };
            case 'adjustment':
                return { label: 'Adjustment', color: 'bg-blue-100 text-blue-800', icon: BarChart3 };
            default:
                return { label: type, color: 'bg-gray-100 text-gray-800', icon: Package };
        }
    }, []);

    // 🚀 PERFORMANCE: Optimized pagination handlers for smooth navigation
    const goToPreviousPage = useCallback(() => {
        const newPage = Math.max(1, paginationInfo.currentPage - 1);
        // Use skipCountUpdate for faster navigation
        loadMovementsPage(newPage, true);
    }, [paginationInfo.currentPage, loadMovementsPage]);

    const goToNextPage = useCallback(() => {
        const newPage = Math.min(totalFilteredPages, paginationInfo.currentPage + 1);
        // Use skipCountUpdate for faster navigation
        loadMovementsPage(newPage, true);
    }, [totalFilteredPages, paginationInfo.currentPage, loadMovementsPage]);

    const goToPage = useCallback((page: number) => {
        if (page >= 1 && page <= totalFilteredPages) {
            // Use skipCountUpdate for faster navigation
            loadMovementsPage(page, true);
        }
    }, [totalFilteredPages, loadMovementsPage]);

    const goToFirstPage = useCallback(() => {
        loadMovementsPage(1, true);
    }, [loadMovementsPage]);

    const goToLastPage = useCallback(() => {
        loadMovementsPage(totalFilteredPages, true);
    }, [totalFilteredPages, loadMovementsPage]);

    // Generate page numbers for pagination
    const getPageNumbers = useCallback(() => {
        const pages = [];
        const maxVisiblePages = 5;
        const totalPages = totalFilteredPages;
        const current = paginationInfo.currentPage;

        if (totalPages <= maxVisiblePages) {
            // Show all pages if we have few pages
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Smart pagination with ellipsis
            let startPage = Math.max(1, current - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            // Adjust start if we're near the end
            if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            // Always show first page
            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) {
                    pages.push('...');
                }
            }

            // Show range around current page
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            // Always show last page
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    pages.push('...');
                }
                pages.push(totalPages);
            }
        }

        return pages;
    }, [totalFilteredPages, paginationInfo.currentPage]);

    if (loading && !product) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3">Loading stock history...</span>
            </div>
        );
    }

    if (!product && !loading) {
        return (
            <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {error || 'Product not found'}
                </h3>
                <p className="text-gray-500 mb-4">
                    {error ? 'There was an issue loading the product data.' : 'The requested product could not be found or may have been deleted.'}
                </p>
                <div className="space-x-4">
                    <button
                        onClick={() => loadProductAndMovements()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => navigate('/reports/stock')}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        Back to Stock Report
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header with Refresh Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => {
                            // 🚀 CRITICAL: Time the navigation click
                            const navigationClickTime = performance.now();
                            console.log('� [STOCK_HISTORY_CRITICAL] Back button clicked at:', navigationClickTime);
                            console.log('�🚀 [STOCK_HISTORY] Navigating back to Stock Report with cache flag');

                            if (navigationState?.fromStockReport) {
                                navigate('/reports/stock', {
                                    state: {
                                        preserveFilters: navigationState.preserveFilters,
                                        preserveView: navigationState.preserveView,
                                        fromStockHistory: true, // 🚀 CRITICAL: Set flag for cache optimization
                                        navigationStartTime: navigationClickTime // 🚀 CRITICAL: Pass timing info
                                    }
                                });
                            } else {
                                navigate('/reports/stock', {
                                    state: {
                                        fromStockHistory: true, // 🚀 CRITICAL: Set flag for cache optimization
                                        navigationStartTime: navigationClickTime // 🚀 CRITICAL: Pass timing info
                                    }
                                });
                            }
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Back to Stock Report"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Stock History</h1>
                        <p className="text-sm text-gray-600">{product?.name} - Complete Movement History</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        title="Refresh data"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>

                    {/* Data freshness indicator */}
                    <div className={`flex items-center px-2 py-1 rounded text-xs font-medium ${dataFreshness === 'live' ? 'bg-green-100 text-green-700' :
                        dataFreshness === 'cached' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        <div className={`w-2 h-2 rounded-full mr-1 ${dataFreshness === 'live' ? 'bg-green-500' :
                            dataFreshness === 'cached' ? 'bg-yellow-500' :
                                'bg-red-500'
                            }`} />
                        {dataFreshness === 'live' ? 'Live' : dataFreshness === 'cached' ? 'Cached' : 'Stale'}
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Product Summary */}
            {product && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {(() => {
                                    const stockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
                                    const currentStock = stockData.numericValue;
                                    if ((product.unit_type || 'kg-grams') === 'kg-grams') {
                                        const kg = Math.floor(currentStock / 1000);
                                        const grams = currentStock % 1000;
                                        return grams > 0 ? `${kg}kg ${grams}g` : `${kg}kg`;
                                    } else {
                                        const intValue = Math.round(currentStock);
                                        return `${intValue} ${product.unit_type || 'kg'}`;
                                    }
                                })()}
                            </div>
                            <div className="text-sm text-gray-600">Current Stock</div>
                        </div>
                        {summary && (
                            <>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">{summary.totalMovements}</div>
                                    <div className="text-sm text-gray-600">Total Movements</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">{summary.totalIn}</div>
                                    <div className="text-sm text-gray-600">Stock In</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">{summary.totalOut}</div>
                                    <div className="text-sm text-gray-600">Stock Out</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Advanced Filters */}
            {showFilters && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    placeholder="Search movements..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type</label>
                            <select
                                value={filters.movementType}
                                onChange={(e) => handleFilterChange('movementType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Types</option>
                                <option value="in">Stock In</option>
                                <option value="out">Stock Out</option>
                                <option value="adjustment">Adjustment</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Customer/Vendor</label>
                            <input
                                type="text"
                                value={filters.customerName}
                                onChange={(e) => handleFilterChange('customerName', e.target.value)}
                                placeholder="Search by name..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                            <input
                                type="number"
                                value={filters.amountMin}
                                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                            <input
                                type="number"
                                value={filters.amountMax}
                                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                                placeholder="No limit"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                    Showing {paginatedMovements.length} of {paginationInfo.totalRecords} movements
                </div>
                <div>
                    Page {paginationInfo.currentPage} of {totalFilteredPages || 1}
                </div>
            </div>

            {/* Movements Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden relative">
                {/* 🚀 PERFORMANCE: Smooth loading overlay for pagination */}
                {pageLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                        <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="text-sm text-gray-600">Loading page...</span>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date & Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantity
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Remaining Stock
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Value
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reference
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedMovements.map((movement) => (
                                <MovementRow
                                    key={movement.id}
                                    movement={movement}
                                    getMovementTypeInfo={getMovementTypeInfo}
                                    formatCurrency={formatCurrency}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredMovements.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No movements found</h3>
                        <p className="text-gray-500">
                            {Object.values(filters).some(f => f !== '' && f !== 'all')
                                ? 'Try adjusting your filters to see more results.'
                                : 'No stock movements recorded for this product.'
                            }
                        </p>
                        <div className="mt-4 text-sm text-gray-400">
                            <p>Debug info:</p>
                            <p>Total movements: {paginationInfo.totalRecords}</p>
                            <p>Current page: {paginationInfo.currentPage}</p>
                            <p>Page movements: {movements.length}</p>
                            <p>Filtered movements: {filteredMovements.length}</p>
                            <p>Product ID: {productId}</p>
                            <p>Loading: {loading.toString()}</p>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <span className="ml-3">Loading movements...</span>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalFilteredPages > 1 && (
                <div className="bg-white border-t border-gray-200 px-4 py-3 sm:px-6">
                    <div className="flex items-center justify-between">
                        {/* Results info */}
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={goToPreviousPage}
                                disabled={paginationInfo.currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={goToNextPage}
                                disabled={paginationInfo.currentPage === totalFilteredPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>

                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing{' '}
                                    <span className="font-medium">{((paginationInfo.currentPage - 1) * ITEMS_PER_PAGE) + 1}</span>
                                    {' '}to{' '}
                                    <span className="font-medium">
                                        {Math.min(paginationInfo.currentPage * ITEMS_PER_PAGE, paginationInfo.totalRecords)}
                                    </span>
                                    {' '}of{' '}
                                    <span className="font-medium">{paginationInfo.totalRecords}</span>
                                    {' '}results
                                </p>
                            </div>

                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    {/* First page button */}
                                    <button
                                        onClick={goToFirstPage}
                                        disabled={paginationInfo.currentPage === 1 || pageLoading}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="First page"
                                    >
                                        <ChevronsLeft className="h-5 w-5" />
                                    </button>

                                    {/* Previous page button */}
                                    <button
                                        onClick={goToPreviousPage}
                                        disabled={paginationInfo.currentPage === 1 || pageLoading}
                                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Previous page"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>

                                    {/* Page numbers */}
                                    {getPageNumbers().map((page, index) => (
                                        page === '...' ? (
                                            <span
                                                key={`ellipsis-${index}`}
                                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => goToPage(page as number)}
                                                disabled={pageLoading}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${paginationInfo.currentPage === page
                                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ))}

                                    {/* Next page button */}
                                    <button
                                        onClick={goToNextPage}
                                        disabled={paginationInfo.currentPage === totalFilteredPages}
                                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Next page"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>

                                    {/* Last page button */}
                                    <button
                                        onClick={goToLastPage}
                                        disabled={paginationInfo.currentPage === totalFilteredPages || pageLoading}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Last page"
                                    >
                                        <ChevronsRight className="h-5 w-5" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Statistics */}
            {summary && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Summary Statistics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <div className="text-sm text-gray-600">Total Value Moved</div>
                            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalValue)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Average Movement Value</div>
                            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.avgMovementValue)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Most Active Day</div>
                            <div className="text-lg font-medium text-gray-900">
                                {summary.mostActiveDay ? formatDate(summary.mostActiveDay) : 'N/A'}
                            </div>
                        </div>
                    </div>
                    {summary.largestMovement && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <div className="text-sm text-blue-600 font-medium">Largest Movement</div>
                            <div className="text-sm text-blue-900">
                                {formatCurrency(summary.largestMovement.total_value)} on {formatDate(summary.largestMovement.date)}
                                - {summary.largestMovement.reason}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StockHistory;
