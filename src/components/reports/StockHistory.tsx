import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { parseUnit, type UnitType } from '../../utils/unitUtils';
import { formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
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
    RefreshCw
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

// Optimized pagination - larger page size for better performance
const ITEMS_PER_PAGE = 100;
const FILTER_DEBOUNCE_MS = 300;

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
                        const numericValue = Math.abs(movement.quantity);
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
                        const numericValue = movement.new_stock;
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
    const [allMovements, setAllMovements] = useState<any[]>([]); // Cache for filtering
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<StockSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

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

    // UI State
    const [showFilters, setShowFilters] = useState(false);

    // Debounced search for better performance
    const debouncedSearchTerm = useDebounce(filters.search, FILTER_DEBOUNCE_MS);
    const debouncedCustomerName = useDebounce(filters.customerName, FILTER_DEBOUNCE_MS);

    // Memoized filtered movements for performance
    const filteredMovements = useMemo(() => {
        let filtered = [...allMovements];

        // Search filter
        if (debouncedSearchTerm.trim()) {
            const searchTerm = debouncedSearchTerm.toLowerCase();
            filtered = filtered.filter(movement =>
                movement.product_name?.toLowerCase().includes(searchTerm) ||
                movement.customer_name?.toLowerCase().includes(searchTerm) ||
                movement.vendor_name?.toLowerCase().includes(searchTerm) ||
                movement.reference_number?.toLowerCase().includes(searchTerm) ||
                movement.notes?.toLowerCase().includes(searchTerm)
            );
        }

        // Movement type filter
        if (filters.movementType !== 'all') {
            filtered = filtered.filter(movement => movement.movement_type === filters.movementType);
        }

        // Transaction type filter
        if (filters.transactionType !== 'all') {
            filtered = filtered.filter(movement => movement.transaction_type === filters.transactionType);
        }

        // Date range filter
        if (filters.dateFrom) {
            filtered = filtered.filter(movement => movement.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
            filtered = filtered.filter(movement => movement.date <= filters.dateTo);
        }

        // Customer name filter
        if (debouncedCustomerName.trim()) {
            const customerTerm = debouncedCustomerName.toLowerCase();
            filtered = filtered.filter(movement =>
                movement.customer_name?.toLowerCase().includes(customerTerm) ||
                movement.vendor_name?.toLowerCase().includes(customerTerm)
            );
        }

        // Amount range filter
        if (filters.amountMin) {
            const minAmount = parseFloat(filters.amountMin);
            filtered = filtered.filter(movement => (movement.total_value || 0) >= minAmount);
        }
        if (filters.amountMax) {
            const maxAmount = parseFloat(filters.amountMax);
            filtered = filtered.filter(movement => (movement.total_value || 0) <= maxAmount);
        }

        return filtered;
    }, [allMovements, debouncedSearchTerm, debouncedCustomerName, filters]);

    // Paginated movements for display
    const paginatedMovements = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredMovements.slice(startIndex, endIndex);
    }, [filteredMovements, currentPage]);

    // Calculate total pages based on filtered data
    const totalFilteredPages = useMemo(() => {
        return Math.ceil(filteredMovements.length / ITEMS_PER_PAGE);
    }, [filteredMovements.length]);

    // Real-time updates
    useRealTimeUpdates({
        onStockUpdated: useCallback((data: any) => {
            if (data.productId === parseInt(productId || '0')) {
                // Refresh data when stock is updated for this product
                handleRefresh();
            }
        }, [productId]),
        onStockMovementCreated: useCallback((data: any) => {
            if (data.product_id === parseInt(productId || '0')) {
                // Add new movement to the beginning of the list
                setAllMovements(prev => [data, ...prev]);
                toast.success('New stock movement detected');
            }
        }, [productId]),
        onStockAdjustmentMade: useCallback((data: any) => {
            if (data.product_id === parseInt(productId || '0')) {
                handleRefresh();
            }
        }, [productId])
    });

    // Optimized callbacks
    const handleRefresh = useCallback(async () => {
        if (!productId) return;

        try {
            setRefreshing(true);
            await loadProductAndMovements();
            toast.success('Data refreshed');
        } catch (error) {
            toast.error('Failed to refresh data');
        } finally {
            setRefreshing(false);
        }
    }, [productId]);

    const handleFilterChange = useCallback((filterName: string, value: string) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
        setCurrentPage(1); // Reset to first page when filtering
    }, []);

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
        setCurrentPage(1);
    }, []);

    useEffect(() => {
        if (productId) {
            loadProductAndMovements();
        }
    }, [productId]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filteredMovements.length]);

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

            // Load all movements at once for better filtering performance
            await loadAllMovements();

            // Load summary statistics
            await loadSummary();

        } catch (error) {
            console.error('Error loading stock history:', error);
            setError('Failed to load stock history. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadAllMovements = async () => {
        if (!productId) return;

        try {
            // Load larger batch of movements for better performance with filtering
            const movementData = await db.getStockMovements({
                product_id: parseInt(productId),
                limit: 2000, // Increased limit for better performance
                offset: 0
            });

            setAllMovements(movementData);

            // Load additional data in background for seamless experience
            if (movementData.length >= 2000) {
                setTimeout(() => loadAdditionalMovements(2000), 100);
            }

        } catch (error) {
            console.error('Error loading movements:', error);
            toast.error('Failed to load movements');
        }
    };

    const loadAdditionalMovements = async (offset: number) => {
        if (!productId) return;

        try {
            const additionalData = await db.getStockMovements({
                product_id: parseInt(productId),
                limit: 1000,
                offset: offset
            });

            if (additionalData.length > 0) {
                setAllMovements(prev => [...prev, ...additionalData]);

                // Continue loading if we got a full batch
                if (additionalData.length >= 1000) {
                    setTimeout(() => loadAdditionalMovements(offset + 1000), 100);
                }
            }
        } catch (error) {
            console.error('Error loading additional movements:', error);
        }
    };

    const loadSummary = async () => {
        if (!productId) return;

        try {
            // Get all movements for summary (we'll limit this for performance)
            const allMovements = await db.getStockMovements({
                product_id: parseInt(productId),
                limit: 1000 // Reasonable limit for summary calculation
            });

            const totalIn = allMovements
                .filter(m => m.movement_type === 'in')
                .reduce((sum, m) => sum + (m.total_value || 0), 0);

            const totalOut = allMovements
                .filter(m => m.movement_type === 'out')
                .reduce((sum, m) => sum + (m.total_value || 0), 0);

            const totalValue = totalIn + totalOut;
            const avgMovementValue = allMovements.length > 0 ? totalValue / allMovements.length : 0;

            // Find most active day
            const dayCount = allMovements.reduce((acc, m) => {
                acc[m.date] = (acc[m.date] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const mostActiveDay = Object.keys(dayCount).reduce((a, b) =>
                dayCount[a] > dayCount[b] ? a : b, ''
            );

            // Find largest movement by value
            const largestMovement = allMovements.length > 0 ? allMovements.reduce((largest, current) =>
                (!largest || (current.total_value || 0) > (largest.total_value || 0)) ? current : largest
            ) : null;

            setSummary({
                totalMovements: allMovements.length,
                totalIn: allMovements.filter(m => m.movement_type === 'in').length,
                totalOut: allMovements.filter(m => m.movement_type === 'out').length,
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

    // Pagination handlers
    const goToPreviousPage = useCallback(() => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    }, []);

    const goToNextPage = useCallback(() => {
        setCurrentPage(prev => Math.min(totalFilteredPages, prev + 1));
    }, [totalFilteredPages]);

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
        <div className="space-y-6">
            {/* Header with Refresh Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => {
                            if (navigationState?.fromStockReport) {
                                navigate('/reports/stock', {
                                    state: {
                                        preserveFilters: navigationState.preserveFilters,
                                        preserveView: navigationState.preserveView
                                    }
                                });
                            } else {
                                navigate('/reports/stock');
                            }
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Back to Stock Report"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Stock History</h1>
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
                    Showing {paginatedMovements.length} of {filteredMovements.length} movements
                    {allMovements.length > filteredMovements.length && ' (filtered)'}
                </div>
                <div>
                    Page {currentPage} of {totalFilteredPages || 1}
                </div>
            </div>

            {/* Movements Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalFilteredPages}
                        </span>
                        <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalFilteredPages}
                            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>

                    {/* Page size indicator */}
                    <div className="text-sm text-gray-500">
                        {ITEMS_PER_PAGE} items per page
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
