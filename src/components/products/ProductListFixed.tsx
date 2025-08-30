import React, { useState, useCallback, useMemo } from 'react';
import { db } from '../../services/database';
import {
    Package,
    Plus,
    Edit,
    Trash2,
    RefreshCw,
    AlertTriangle,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import ProductFormEnhanced from './ProductFormEnhanced';
import { formatUnitString } from '../../utils/unitUtils';
import { formatCurrency } from '../../utils/calculations';
import StableSearchInput from '../common/StableSearchInput';

// Production-grade interfaces for type safety
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

// 🔥 ZERO REFRESH ProductList - Original UI, Fixed Search
const ProductList: React.FC = () => {
    // Simplified state - NO complex useEffect chains
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
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Simple data state - no complex loading refs
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [productStats, setProductStats] = useState({ totalValue: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 🛡️ ZERO REFRESH SEARCH FUNCTION
    const searchAndFilterProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔍 Zero Refresh Search:', filters);

            // Get all products using existing stable method
            const allProducts = await db.getProducts();
            let filteredProducts = allProducts || [];

            // Apply search filter
            if (filters.search.trim()) {
                const search = filters.search.toLowerCase().trim();
                filteredProducts = filteredProducts.filter(product =>
                    product.name?.toLowerCase().includes(search) ||
                    product.category?.toLowerCase().includes(search) ||
                    product.unit_type?.toLowerCase().includes(search)
                );
            }

            // Apply category filter  
            if (filters.category) {
                filteredProducts = filteredProducts.filter(product =>
                    product.category === filters.category
                );
            }

            // Update pagination info
            const totalItems = filteredProducts.length;
            const totalPages = Math.ceil(totalItems / pagination.itemsPerPage);

            setPagination(prev => ({
                ...prev,
                totalItems,
                totalPages,
                currentPage: Math.min(prev.currentPage, totalPages || 1)
            }));

            // Apply pagination
            const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
            const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pagination.itemsPerPage);

            setProducts(paginatedProducts);

            // Calculate stats
            const totalValue = filteredProducts.reduce((sum, product) => {
                if (product.track_inventory) {
                    const stock = parseFloat(product.current_stock) || 0;
                    return sum + (stock * product.rate_per_unit);
                }
                return sum;
            }, 0);

            setProductStats({ totalValue });

            console.log('✅ Zero Refresh Results:', paginatedProducts.length, 'products shown');

        } catch (error) {
            console.error('❌ Search Error:', error);
            setError('Failed to load products');
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.currentPage, pagination.itemsPerPage]);

    // Load categories
    const loadCategories = useCallback(async () => {
        try {
            const categories = await db.getCategories();
            setCategories(categories || []);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }, []);

    // Load data when filters or pagination change
    useMemo(() => {
        searchAndFilterProducts();
    }, [searchAndFilterProducts, refreshTrigger]);

    // Load categories on mount
    useMemo(() => {
        loadCategories();
    }, [loadCategories]);

    // 🛡️ STABLE EVENT HANDLERS - No component unmounting
    const handleSearchChange = useCallback((value: string) => {
        setFilters(prev => ({ ...prev, search: value }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, []);

    const handleCategoryChange = useCallback((value: string) => {
        setFilters(prev => ({ ...prev, category: value }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            search: '',
            category: ''
        });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, []);

    const handleRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const handleAddProduct = useCallback(() => {
        setEditingProduct(null);
        setShowAddModal(true);
    }, []);

    const handleEditProduct = useCallback((product: Product) => {
        setEditingProduct(product);
        setShowAddModal(true);
    }, []);

    const handleDeleteProduct = useCallback(async (product: Product) => {
        if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
            return;
        }

        try {
            await db.deleteProduct(product.id);
            setRefreshTrigger(prev => prev + 1);
            toast.success('Product deleted successfully');
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete product');
        }
    }, []);

    const handleModalClose = useCallback(() => {
        setShowAddModal(false);
        setEditingProduct(null);
    }, []);

    const handleProductSaved = useCallback(() => {
        setShowAddModal(false);
        setEditingProduct(null);
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const goToPage = useCallback((page: number) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
    }, []);

    // Helper functions
    const hasActiveFilters = useMemo(() => {
        return Boolean(filters.search || filters.category);
    }, [filters]);

    // Empty state component
    const EmptyState = ({ hasFilters, onReset, onAddProduct }: {
        hasFilters: boolean;
        onReset: () => void;
        onAddProduct: () => void;
    }) => (
        <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {hasFilters ? 'No products found' : 'No products'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
                {hasFilters
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by creating your first product.'
                }
            </p>
            <div className="mt-6 flex justify-center gap-3">
                {hasFilters && (
                    <button
                        onClick={onReset}
                        className="btn btn-secondary text-sm"
                    >
                        Clear filters
                    </button>
                )}
                <button
                    onClick={onAddProduct}
                    className="btn btn-primary text-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                </button>
            </div>
            {hasFilters && (
                <p className="text-sm text-green-600 mt-2">✅ Search completed without page refresh</p>
            )}
        </div>
    );

    // 🎨 ORIGINAL UI STRUCTURE PRESERVED
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-4 sm:p-4 lg:p-6">
                {/* Header Section - Original Style */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Products</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage your product inventory and pricing (Zero Refresh)
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={handleAddProduct}
                            className="btn btn-primary flex items-center px-4 py-2"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Product
                        </button>
                    </div>
                </div>

                {/* Stats Cards - Original Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{pagination.totalItems}</div>
                            <div className="text-sm text-gray-500">Total Products</div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(productStats.totalValue)}</div>
                            <div className="text-sm text-gray-500">Total Value</div>
                        </div>
                    </div>
                </div>

                {/* Filters Section - Original Style with Zero Refresh Search */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Zero Refresh Search */}
                        <div className="flex-1 min-w-0">
                            <StableSearchInput
                                value={filters.search}
                                onChange={handleSearchChange}
                                placeholder="Search products by name..."
                                debounceMs={300}
                                aria-label="Search products"
                                className="w-full py-3 text-base"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="w-full lg:w-48">
                            <select
                                value={filters.category}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                            >
                                <option value="">All Categories</option>
                                {categories.map((category) => (
                                    <option key={category.name} value={category.name}>
                                        {category.name} ({category.product_count})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Reset Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="btn btn-secondary flex items-center px-3 py-2 text-sm"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Search Status */}
                    <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                            {loading ? 'Searching...' : `Showing ${products.length} of ${pagination.totalItems} products`}
                        </span>
                        <span className="text-green-600 font-medium">
                            ✅ Zero Page Refresh
                        </span>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="text-red-800">{error}</span>
                        <button
                            onClick={handleRefresh}
                            className="ml-auto text-red-600 hover:text-red-800"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Products Table - Original Style */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {products.length === 0 ? (
                        <EmptyState
                            hasFilters={hasActiveFilters}
                            onReset={resetFilters}
                            onAddProduct={handleAddProduct}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Product
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Unit & Rate
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Stock
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Value
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {products.map((product) => {
                                        const currentStock = parseFloat(product.current_stock) || 0;
                                        const minStock = parseFloat(product.min_stock_alert) || 0;
                                        const stockValue = product.track_inventory ? currentStock * product.rate_per_unit : 0;

                                        let stockStatus = 'success';
                                        if (product.track_inventory) {
                                            if (currentStock <= 0) stockStatus = 'danger';
                                            else if (currentStock <= minStock) stockStatus = 'warning';
                                        }

                                        return (
                                            <tr key={product.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                        {(product.size || product.grade) && (
                                                            <div className="text-sm text-gray-500">
                                                                {[product.size, product.grade].filter(Boolean).join(' • ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {product.category}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {formatCurrency(product.rate_per_unit)}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        per {formatUnitString(product.unit_type)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {product.track_inventory ? (
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${stockStatus === 'danger' ? 'text-red-600 bg-red-50' :
                                                                stockStatus === 'warning' ? 'text-yellow-600 bg-yellow-50' :
                                                                    'text-green-600 bg-green-50'
                                                                }`}>
                                                                {product.current_stock} {formatUnitString(product.unit_type)}
                                                            </span>
                                                            {stockStatus !== 'success' && (
                                                                <AlertTriangle className={`h-4 w-4 ${stockStatus === 'danger' ? 'text-red-500' : 'text-yellow-500'
                                                                    }`} />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">Not tracked</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {product.track_inventory ? (
                                                        formatCurrency(stockValue)
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleEditProduct(product)}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Edit Product"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteProduct(product)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            title="Delete Product"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination - Original Style */}
                    {pagination.totalPages > 1 && (
                        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                            <div className="flex items-center justify-between">
                                <div className="flex justify-between flex-1 sm:hidden">
                                    <button
                                        onClick={() => goToPage(pagination.currentPage - 1)}
                                        disabled={pagination.currentPage === 1}
                                        className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => goToPage(pagination.currentPage + 1)}
                                        disabled={pagination.currentPage === pagination.totalPages}
                                        className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                                            <span className="font-medium">{pagination.totalPages}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                            <button
                                                onClick={() => goToPage(pagination.currentPage - 1)}
                                                disabled={pagination.currentPage === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronLeft className="h-5 w-5" />
                                            </button>

                                            {/* Page Numbers */}
                                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (pagination.totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (pagination.currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                                                    pageNum = pagination.totalPages - 4 + i;
                                                } else {
                                                    pageNum = pagination.currentPage - 2 + i;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => goToPage(pageNum)}
                                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pageNum === pagination.currentPage
                                                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}

                                            <button
                                                onClick={() => goToPage(pagination.currentPage + 1)}
                                                disabled={pagination.currentPage === pagination.totalPages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronRight className="h-5 w-5" />
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal - Original Style */}
            <Modal
                isOpen={showAddModal}
                onClose={handleModalClose}
                title={editingProduct ? 'Edit Product' : 'Add New Product'}
            >
                <ProductFormEnhanced
                    product={editingProduct}
                    onSuccess={handleProductSaved}
                    onCancel={handleModalClose}
                />
            </Modal>
        </div>
    );
};

export default ProductList;
