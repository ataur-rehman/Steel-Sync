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
import { formatUnitString } from '../../utils/unitUtils';
import { formatCurrency } from '../../utils/calculations';

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

// 🔥 NO REFRESH VERSION - EXACT SAME UI AS ORIGINAL
// Performance optimization: Memoized loading skeleton
const LoadingSkeleton = React.memo(() => (
    <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={`product-skeleton-${i}`} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
    </div>
));

// Performance optimization: Memoized empty state
const EmptyState = React.memo(({
    hasFilters,
    onReset,
    onAddProduct
}: {
    hasFilters: boolean;
    onReset: () => void;
    onAddProduct: () => void;
}) => (
    <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-100 rounded-full">
            <Package className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasFilters ? 'No products found' : 'No products yet'}
        </h3>
        <p className="text-gray-500 mb-6">
            {hasFilters
                ? 'Try adjusting your search filters to find what you\'re looking for.'
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
    const [displayProducts, setDisplayProducts] = useState<Product[]>([]);

    // Simple product filtering function
    const filterProducts = useCallback((allProducts: Product[], searchTerm: string) => {
        if (!searchTerm.trim()) {
            return allProducts;
        }

        const search = searchTerm.toLowerCase();
        return allProducts.filter(product =>
            product.name?.toLowerCase().includes(search) ||
            product.category?.toLowerCase().includes(search) ||
            product.unit_type?.toLowerCase().includes(search)
        );
    }, []);

    // Direct search handler that bypasses React state cycles
    const handleSearchChange = useCallback((value: string) => {
        // Update filters immediately (no side effects)
        setFilters(prev => ({ ...prev, search: value }));

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounced filtering
        searchTimeoutRef.current = setTimeout(() => {
            const filtered = filterProducts(products, value);
            setDisplayProducts(filtered);
            setPagination(prev => ({
                ...prev,
                currentPage: 1,
                totalItems: filtered.length,
                totalPages: Math.ceil(filtered.length / prev.itemsPerPage)
            }));
        }, 200);
    }, [products, filterProducts]);

    // Prevent Enter key from doing ANYTHING
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            // Immediately execute search without waiting for timeout
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
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

    // Simplified load products - no complex dependencies
    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Load ALL products at once (simpler approach)
            const query = `
        SELECT *,
          (CAST(current_stock AS REAL) * rate_per_unit) as stock_value
        FROM products 
        ORDER BY updated_at DESC, name ASC
      `;

            const result = await db.executeSmartQuery(query, []);
            const allProducts = result as Product[];

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
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Failed to delete product');
        } finally {
            setIsDeleting(false);
        }
    }, [deletingProduct, loadProducts]);

    // Form handlers - EXACT SAME AS ORIGINAL
    const handleAddSuccess = useCallback(() => {
        setShowAddModal(false);
        loadProducts();
        toast.success('Product added successfully');
    }, [loadProducts]);

    const handleEditSuccess = useCallback(() => {
        setShowEditModal(false);
        setEditingProduct(null);
        loadProducts();
        toast.success('Product updated successfully');
    }, [loadProducts]);

    // Filter helpers - EXACT SAME AS ORIGINAL
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

            {/* Filters Section - EXACT SAME AS ORIGINAL */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search - 🔥 FIXED TO PREVENT REFRESH */}
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
                                className="w-full py-3 text-base pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    {/* Category Filter - EXACT SAME AS ORIGINAL */}
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
                        {/* Table Content - EXACT SAME AS ORIGINAL */}
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
                                            Stock
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Rate
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Value
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedProducts.map((product) => {
                                        const stockLevel = parseFloat(product.current_stock || '0');
                                        const minStock = parseFloat(product.min_stock_alert || '0');
                                        const isLowStock = stockLevel <= minStock && minStock > 0;

                                        return (
                                            <tr key={product.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                                <Package className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                            <div className="text-sm text-gray-500">{product.unit_type}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {product.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`text-sm ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {product.track_inventory ?
                                                            formatUnitString(product.current_stock, product.unit_type as any) :
                                                            'Not tracked'
                                                        }
                                                        {isLowStock && (
                                                            <AlertTriangle className="inline w-4 h-4 ml-1 text-red-500" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatCurrency(product.rate_per_unit)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatCurrency(product.stock_value || 0)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => handleEdit(product)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(product)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
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
