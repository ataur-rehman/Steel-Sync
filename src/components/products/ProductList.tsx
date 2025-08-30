import React, { useState, useEffect, useCallback, useMemo, useRef, startTransition, useReducer } from 'react';
import { db } from '../../services/database';
// import { useActivityLogger } from '../../hooks/useActivityLogger'; // Disabled to prevent page refresh
// import { eventBus, BUSINESS_EVENTS } from '../../utils/eventBus'; // Disabled to prevent page refresh
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
// import { useAutoRefresh } from '../../hooks/useRealTimeUpdates'; // Disabled to prevent page refresh
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

// Performance optimization: Memoized loading skeleton
const LoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse" role="status" aria-label="Loading products">
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="h-10 w-72 bg-gray-200 rounded-lg"></div>
      <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
    </div>
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={`product-skeleton-${i}`} className="h-16 bg-gray-200 rounded-lg"></div>
      ))}
    </div>
  </div>
);

// Empty state component
const EmptyState = ({
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
);

const ProductList: React.FC = () => {
  // State management
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters and pagination
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: ''
  });

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,
    totalPages: 0
  });

  // Stable values to prevent circular dependencies
  const currentPage = useMemo(() => pagination.currentPage, [pagination.currentPage]);
  const itemsPerPage = useMemo(() => pagination.itemsPerPage, [pagination.itemsPerPage]);
  const categoryFilter = useMemo(() => filters.category, [filters.category]);

  // Performance optimization: Refs
  const loadingRef = useRef(false);
  const debouncedSearchRef = useRef('');
  const categoryFilterRef = useRef('');
  const currentPageRef = useRef(1);
  const itemsPerPageRef = useRef(20);

  // Update refs when values change
  useEffect(() => {
    debouncedSearchRef.current = debouncedSearchTerm;
  }, [debouncedSearchTerm]);

  useEffect(() => {
    categoryFilterRef.current = categoryFilter;
  }, [categoryFilter]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    itemsPerPageRef.current = itemsPerPage;
  }, [itemsPerPage]);

  // Debounce search term to reduce database calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.search);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  // Load data when dependencies change
  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [debouncedSearchTerm, categoryFilter, currentPage]);

  // Real-time updates with enhanced event handling - DISABLED to prevent page refresh
  // useAutoRefresh(
  //   () => {
  //     console.log('🔄 ProductList: Auto-refreshing due to real-time event');
  //     // Force cache bypass by adding timestamp
  //     loadProducts();
  //   },
  //   [
  //     'PRODUCT_CREATED',
  //     'PRODUCT_UPDATED',
  //     'PRODUCT_DELETED',
  //     'STOCK_UPDATED',
  //     'PRODUCTS_UPDATED',
  //     'UI_REFRESH_REQUESTED',
  //     'FORCE_PRODUCT_RELOAD',
  //     'PRODUCTS_CACHE_INVALIDATED',
  //     'COMPREHENSIVE_DATA_REFRESH'
  //   ]
  // );

  const initializeData = useCallback(async () => {
    await Promise.all([
      loadProducts(),
      loadCategories()
    ]);
  }, []);

  const loadProducts = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let whereConditions = [];
      let params: any[] = [];

      // Search filter - use ref values to avoid dependencies
      if (debouncedSearchRef.current) {
        whereConditions.push('name LIKE ?');
        const searchPattern = `%${debouncedSearchRef.current}%`;
        params.push(searchPattern);
      }

      // Category filter - use ref values to avoid dependencies
      if (categoryFilterRef.current) {
        whereConditions.push('category = ?');
        params.push(categoryFilterRef.current);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
      const countResult = await db.executeSmartQuery(countQuery, params);
      const totalItems = (countResult[0] as any)?.total || 0;

      // Get paginated products - use ref values to avoid dependencies
      const offset = (currentPageRef.current - 1) * itemsPerPageRef.current;
      const query = `
        SELECT *,
          (CAST(current_stock AS REAL) * rate_per_unit) as stock_value
        FROM products 
        ${whereClause}
        ORDER BY updated_at DESC, name ASC
        LIMIT ? OFFSET ?
      `;

      const allParams = [...params, itemsPerPageRef.current, offset];
      const result = await db.executeSmartQuery(query, allParams);

      // 🔥 BATCH STATE UPDATES to prevent multiple re-renders
      const newPagination = {
        ...pagination,
        totalItems,
        totalPages: Math.ceil(totalItems / itemsPerPageRef.current)
      };

      // Use startTransition to mark updates as non-urgent
      startTransition(() => {
        setProducts(result as Product[]);
        setPagination(newPagination);
      });

    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products. Please try again.');
      // 🔥 REMOVE toast to prevent re-render triggers
      // toast.error('Failed to load products');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []); // 🔥 NO DEPENDENCIES - uses refs instead

  // Additional event listeners for comprehensive updates - DISABLED to prevent page refresh
  // useEffect(() => {
  //   const handleProductEvents = (data: any) => {
  //     console.log('🔄 ProductList: Product event received, refreshing...', data);
  //     // Add delay to ensure database transaction is complete
  //     setTimeout(() => loadProducts(), 100);
  //   };

  //   eventBus.on(BUSINESS_EVENTS.PRODUCT_CREATED, handleProductEvents);
  //   eventBus.on(BUSINESS_EVENTS.PRODUCT_UPDATED, handleProductEvents);
  //   eventBus.on(BUSINESS_EVENTS.STOCK_UPDATED, handleProductEvents);
  //   eventBus.on('PRODUCTS_UPDATED', handleProductEvents);
  //   eventBus.on('UI_REFRESH_REQUESTED', handleProductEvents);

  //   return () => {
  //     eventBus.off(BUSINESS_EVENTS.PRODUCT_CREATED, handleProductEvents);
  //     eventBus.off(BUSINESS_EVENTS.PRODUCT_UPDATED, handleProductEvents);
  //     eventBus.off(BUSINESS_EVENTS.STOCK_UPDATED, handleProductEvents);
  //     eventBus.off('PRODUCTS_UPDATED', handleProductEvents);
  //     eventBus.off('UI_REFRESH_REQUESTED', handleProductEvents);
  //   };
  // }, [loadProducts]);

  const loadCategories = useCallback(async () => {
    try {
      const query = `
        SELECT 
          category as name,
          COUNT(*) as product_count
        FROM products 
        GROUP BY category
        ORDER BY product_count DESC, category ASC
      `;

      const result = await db.executeSmartQuery(query);
      setCategories(result as any[]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  // Product actions
  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  }, []);

  const handleDelete = useCallback((product: Product) => {
    setDeletingProduct(product);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingProduct) return;

    setIsDeleting(true);
    try {
      await db.executeSmartQuery(
        'DELETE FROM products WHERE id = ?',
        [deletingProduct.id]
      );

      toast.success('Product deleted successfully');
      setShowDeleteModal(false);
      setDeletingProduct(null);
      loadProducts();


      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingProduct, loadProducts]);

  // Form handlers
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

  // Filter helpers
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

  const hasActiveFilters = useMemo(() => {
    return Boolean(filters.search || filters.category);
  }, [filters]);

  // Pagination helpers
  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  // Product stats for dashboard-style cards
  const productStats = useMemo(() => {
    const totalValue = products.reduce((sum, p) => sum + (p.stock_value || 0), 0);
    return { totalValue };
  }, [products]);

  // Loading state
  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 sm:p-4 lg:p-6">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Products</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => loadProducts()}
            className="btn btn-primary flex items-center mx-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-4 lg:p-6">
        {/* Header Section - Consistent with Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Products</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your product inventory and pricing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadProducts()}
              className="btn btn-secondary flex items-center px-3 py-1.5 text-sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary flex items-center px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </button>
          </div>
        </div>

        {/* Stats Cards - Consistent with Dashboard Style */}
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

        {/* Filters Section */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 min-w-0">
              {/* 🔧 SIMPLIFIED: Basic input with manual debouncing */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  placeholder="Search products by name..."
                  className="w-full py-3 text-base pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
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
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {products.length === 0 ? (
            <EmptyState
              hasFilters={hasActiveFilters}
              onReset={resetFilters}
              onAddProduct={() => setShowAddModal(true)}
            />
          ) : (
            <>
              {/* Table Content */}
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
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => {
                      return (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                {product.size && (
                                  <div className="text-sm text-gray-500">{product.size}</div>
                                )}

                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {product.current_stock && product.unit_type ?
                                formatUnitString(product.current_stock, product.unit_type as any) :
                                'N/A'
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(product.rate_per_unit)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(product.stock_value || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="text-indigo-600 hover:text-indigo-900 p-1"
                                title="Edit product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(product)}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Delete product"
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

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                      {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                      {pagination.totalItems} results
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => goToPage(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center space-x-1">
                        {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`px-3 py-1 text-sm rounded ${page === pagination.currentPage
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => goToPage(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Product"
        >
          <ProductFormEnhanced
            onSuccess={handleAddSuccess}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingProduct(null);
          }}
          title="Edit Product"
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingProduct && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingProduct(null);
          }}
          title="Delete Product"
        >
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete Product</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deletingProduct.name}</strong>?
              This will remove the product from your inventory.
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
                onClick={handleDeleteConfirm}
                className="btn btn-danger"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Product'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProductList;
