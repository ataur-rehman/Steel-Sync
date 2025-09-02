import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/formatters';
import {
    ArrowLeft,
    Filter,
    TrendingUp,
    TrendingDown,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Package,
    Clock
} from 'lucide-react';

interface Product {
    id: number;
    name: string;
    category: string;
    current_stock: number;
    rate_per_unit: number;
}

interface StockMovement {
    id: number;
    product_id: number;
    product_name: string;
    movement_type: 'in' | 'out';
    quantity: number;
    previous_stock: number;
    new_stock: number;
    reason: string;
    reference_type: string;
    notes: string;
    date: string;
    time: string;
    total_value: number;
    created_by: string;
}

interface StockSummary {
    totalMovements: number;
    totalIn: number;
    totalOut: number;
    totalQuantityIn: number;
    totalQuantityOut: number;
    netQuantityChange: number;
    currentStock: number;
    totalValue: number;
    avgMovementValue: number;
}

interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    startRecord: number;
    endRecord: number;
}

// Optimized pagination settings
const ITEMS_PER_PAGE = 20;

const StockHistory: React.FC = () => {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();

    // Core state
    const [product, setProduct] = useState<Product | null>(null);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [summary, setSummary] = useState<StockSummary | null>(null);
    const [loading, setLoading] = useState(true);

    // Pagination state
    const [pagination, setPagination] = useState<PaginationInfo>({
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0,
        startRecord: 0,
        endRecord: 0
    });

    // Filter state
    const [filters, setFilters] = useState({
        search: '',
        movementType: 'all' as 'all' | 'in' | 'out',
        dateFrom: '',
        dateTo: '',
        reason: ''
    });

    const [showFilters, setShowFilters] = useState(false);

    // Build optimized WHERE clause for SQL queries
    const buildWhereClause = useCallback(() => {
        const conditions: string[] = ['product_id = ?'];
        const params: any[] = [parseInt(productId!)];

        if (filters.movementType !== 'all') {
            conditions.push('movement_type = ?');
            params.push(filters.movementType);
        }

        if (filters.dateFrom) {
            conditions.push('date >= ?');
            params.push(filters.dateFrom);
        }

        if (filters.dateTo) {
            conditions.push('date <= ?');
            params.push(filters.dateTo);
        }

        if (filters.search) {
            conditions.push('(notes LIKE ? OR reason LIKE ?)');
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.reason) {
            conditions.push('reason LIKE ?');
            params.push(`%${filters.reason}%`);
        }

        return {
            whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
            params
        };
    }, [productId, filters]);

    // Load movements with proper pagination
    const loadMovements = useCallback(async (page: number = 1) => {
        if (!productId) return;

        try {
            setLoading(true);
            const { whereClause, params } = buildWhereClause();

            // Get total count for pagination
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM stock_movements 
                ${whereClause}
            `;
            const countResult = await db.executeRawQuery(countQuery, params);
            const totalRecords = countResult[0]?.total || 0;

            // Calculate pagination info
            const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
            const offset = (page - 1) * ITEMS_PER_PAGE;
            const startRecord = totalRecords > 0 ? offset + 1 : 0;
            const endRecord = Math.min(offset + ITEMS_PER_PAGE, totalRecords);

            // Get paginated movements
            const movementsQuery = `
                SELECT 
                    id, product_id, product_name, movement_type, quantity,
                    previous_stock, new_stock, reason, reference_type, notes,
                    date, time, total_value, created_by
                FROM stock_movements 
                ${whereClause}
                ORDER BY date DESC, time DESC, id DESC
                LIMIT ? OFFSET ?
            `;

            const movementsData = await db.executeRawQuery(movementsQuery, [...params, ITEMS_PER_PAGE, offset]);

            setMovements(movementsData as StockMovement[]);
            setPagination({
                currentPage: page,
                totalPages,
                totalRecords,
                startRecord,
                endRecord
            });

        } catch (error) {
            console.error('Error loading movements:', error);
            toast.error('Failed to load stock movements');
            setMovements([]);
        } finally {
            setLoading(false);
        }
    }, [productId, buildWhereClause]);

    // Load summary with optimized SQL aggregation
    const loadSummary = useCallback(async () => {
        if (!productId) return;

        try {
            const { whereClause, params } = buildWhereClause();

            // Single optimized query for all summary data
            const summaryQuery = `
                SELECT 
                    COUNT(*) as total_movements,
                    COALESCE(SUM(CASE WHEN movement_type = 'in' THEN 1 ELSE 0 END), 0) as total_in,
                    COALESCE(SUM(CASE WHEN movement_type = 'out' THEN 1 ELSE 0 END), 0) as total_out,
                    COALESCE(SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END), 0) as total_quantity_in,
                    COALESCE(SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END), 0) as total_quantity_out,
                    COALESCE(SUM(total_value), 0) as total_value,
                    COALESCE(AVG(total_value), 0) as avg_movement_value
                FROM stock_movements 
                ${whereClause}
            `;

            const summaryResult = await db.executeRawQuery(summaryQuery, params);
            const data = summaryResult[0];

            if (data) {
                // Get current stock from latest movement
                const latestStockQuery = `
                    SELECT new_stock 
                    FROM stock_movements 
                    WHERE product_id = ?
                    ORDER BY date DESC, time DESC, id DESC 
                    LIMIT 1
                `;
                const latestResult = await db.executeRawQuery(latestStockQuery, [parseInt(productId)]);
                const currentStock = latestResult[0]?.new_stock || 0;

                setSummary({
                    totalMovements: data.total_movements,
                    totalIn: data.total_in,
                    totalOut: data.total_out,
                    totalQuantityIn: data.total_quantity_in,
                    totalQuantityOut: data.total_quantity_out,
                    netQuantityChange: data.total_quantity_in - data.total_quantity_out,
                    currentStock,
                    totalValue: data.total_value,
                    avgMovementValue: data.avg_movement_value
                });
            }

        } catch (error) {
            console.error('Error loading summary:', error);
            toast.error('Failed to load summary data');
        }
    }, [productId, buildWhereClause]);

    // Load product data
    const loadProduct = useCallback(async () => {
        if (!productId) return;

        try {
            const productData = await db.getProduct(parseInt(productId));
            if (productData) {
                setProduct(productData);
            } else {
                toast.error('Product not found');
                navigate('/stock');
            }
        } catch (error) {
            console.error('Error loading product:', error);
            toast.error('Failed to load product data');
        }
    }, [productId, navigate]);

    // Initialize data
    useEffect(() => {
        if (productId) {
            loadProduct();
            loadMovements(1);
            loadSummary();
        }
    }, [productId, loadProduct, loadMovements, loadSummary]);

    // Reload when filters change
    useEffect(() => {
        if (productId) {
            loadMovements(1);
            loadSummary();
        }
    }, [filters, loadMovements, loadSummary]);

    // Pagination handlers
    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= pagination.totalPages) {
            loadMovements(page);
        }
    };

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            movementType: 'all',
            dateFrom: '',
            dateTo: '',
            reason: ''
        });
    };

    // Render pagination controls
    const renderPagination = () => {
        if (pagination.totalPages <= 1) return null;

        const pages = [];
        const showPages = 5;
        const startPage = Math.max(1, pagination.currentPage - Math.floor(showPages / 2));
        const endPage = Math.min(pagination.totalPages, startPage + showPages - 1);

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`px-3 py-1 rounded text-sm ${pagination.currentPage === i
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                    Showing {pagination.startRecord} to {pagination.endRecord} of {pagination.totalRecords} records
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.currentPage === 1}
                        className="p-1 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronsLeft size={16} />
                    </button>

                    <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="p-1 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div className="flex space-x-1">
                        {pages}
                    </div>

                    <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="p-1 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={16} />
                    </button>

                    <button
                        onClick={() => handlePageChange(pagination.totalPages)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="p-1 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft size={20} className="mr-2" />
                                Back
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Stock History</h1>
                                {product && (
                                    <p className="text-gray-600">{product.name}</p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Filter size={16} className="mr-2" />
                            Filters
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    placeholder="Search in notes or reason..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
                                <select
                                    value={filters.movementType}
                                    onChange={(e) => handleFilterChange('movementType', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Types</option>
                                    <option value="in">Stock In</option>
                                    <option value="out">Stock Out</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <input
                                    type="text"
                                    value={filters.reason}
                                    onChange={(e) => handleFilterChange('reason', e.target.value)}
                                    placeholder="Filter by reason..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex items-end">
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <div className="flex items-center">
                                <BarChart3 className="h-8 w-8 text-blue-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Movements</p>
                                    <p className="text-2xl font-bold text-gray-900">{summary.totalMovements}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <div className="flex items-center">
                                <TrendingUp className="h-8 w-8 text-green-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Stock In</p>
                                    <p className="text-2xl font-bold text-gray-900">{summary.totalQuantityIn}</p>
                                    <p className="text-sm text-gray-500">{summary.totalIn} movements</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <div className="flex items-center">
                                <TrendingDown className="h-8 w-8 text-red-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Stock Out</p>
                                    <p className="text-2xl font-bold text-gray-900">{summary.totalQuantityOut}</p>
                                    <p className="text-sm text-gray-500">{summary.totalOut} movements</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <div className="flex items-center">
                                <Package className="h-8 w-8 text-purple-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Current Stock</p>
                                    <p className="text-2xl font-bold text-gray-900">{summary.currentStock}</p>
                                    <p className={`text-sm ${summary.netQuantityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        Net: {summary.netQuantityChange >= 0 ? '+' : ''}{summary.netQuantityChange}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Movements Table */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Stock Movements</h3>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading movements...</span>
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No movements found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                No stock movements match your current filters.
                            </p>
                        </div>
                    ) : (
                        <>
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
                                                Stock Before/After
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Reason
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Value
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Notes
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {movements.map((movement) => (
                                            <tr key={movement.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex items-center">
                                                        <Clock size={14} className="text-gray-400 mr-2" />
                                                        <div>
                                                            <div>{formatDate(movement.date)}</div>
                                                            <div className="text-xs text-gray-500">{movement.time}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${movement.movement_type === 'in'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {movement.movement_type === 'in' ? 'Stock In' : 'Stock Out'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                    {movement.movement_type === 'in' ? '+' : '-'}{movement.quantity}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {movement.previous_stock} → {movement.new_stock}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {movement.reason}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                    Rs. {movement.total_value?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                    {movement.notes || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {renderPagination()}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StockHistory;
