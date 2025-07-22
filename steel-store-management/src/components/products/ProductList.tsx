import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import { Package, Search, Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import ProductForm from './ProductForm';
import { formatUnitString, parseUnit } from '../../utils/unitUtils';

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [searchTerm, selectedCategory]);

  const initializeData = async () => {
    try {
      await db.initialize();
      await loadCategories();
      await loadProducts();
    } catch (error) {
      toast.error('Failed to load product data');
      console.error('Failed to initialize:', error);
    } finally {
      setLoading(false);
    }
  };
const loadProducts = async () => {
  try {
    console.log('=== LOADING PRODUCTS ===');
    console.log('Current environment - isTauri():', typeof window !== 'undefined' && '__TAURI__' in window);
    console.log('Search term:', searchTerm);
    console.log('Selected category:', selectedCategory);
    
    const productList = await db.getProducts(searchTerm, selectedCategory);
    console.log('Raw products from database:', productList);
    console.log('Number of products:', productList.length);
    
    setProducts(productList);
    console.log('Products state has been updated');
    console.log('=== END LOADING PRODUCTS ===');
  } catch (error) {
    toast.error('Failed to load products');
    console.error('Failed to load products:', error);
  }
};
  const loadCategories = async () => {
    try {
      const categoryList = await db.getCategories();
      setCategories(categoryList);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };


  const getStockStatus = (product: any) => {
    try {
      const currentStock = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
      const alertLevel = parseUnit(product.min_stock_alert, product.unit_type || 'kg-grams');
      
      if (currentStock.numericValue <= alertLevel.numericValue) {
        return { status: 'Low Stock', color: 'text-red-600 bg-red-100' };
      } else if (currentStock.numericValue <= alertLevel.numericValue * 1.5) {
        return { status: 'Medium', color: 'text-yellow-600 bg-yellow-100' };
      } else {
        return { status: 'In Stock', color: 'text-green-600 bg-green-100' };
      }
    } catch (error) {
      console.error('Error calculating stock status:', error);
      return { status: 'Unknown', color: 'text-gray-600 bg-gray-100' };
    }
  };


  const handleAddProduct = () => {
    setShowAddModal(true);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };


  const handleProductAdded = async () => {
    setShowAddModal(false);
    await refreshProductsAndCategories();
  };

  const handleProductUpdated = async () => {
    setShowEditModal(false);
    setEditingProduct(null);
    await refreshProductsAndCategories();
  };

  const refreshProductsAndCategories = async () => {
    try {
      await loadProducts();
      await loadCategories();
    } catch (error) {
      console.error('Error refreshing products:', error);
      toast.error('Failed to refresh product list');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your product inventory <span className="font-medium text-gray-700">({products.length} products)</span></p>
        </div>
        <button onClick={handleAddProduct} className="btn btn-primary flex items-center px-3 py-1.5 text-sm">
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="input pl-10"
              aria-label="Search products"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="input"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div>
            <button onClick={clearFilters} className="btn btn-secondary w-full px-3 py-1.5 text-sm">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>

              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Size/Grade</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No products found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchTerm || selectedCategory ? 'Try adjusting your filters' : 'Add your first product to get started'}
                  </p>
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {(product as any).category && (
                          <div className="text-xs text-gray-500 mt-0.5">{(product as any).category}</div>
                        )}
                      </div>
                    </td>
                   
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-0.5">
                        {product.size && <div className="text-xs text-gray-700">Size: {product.size}</div>}
                        {product.grade && <div className="text-xs text-gray-400">Grade: {product.grade}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {product.rate_per_unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatUnitString(product.current_stock, product.unit_type || 'kg-grams')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button onClick={() => handleEditProduct(product)} className="btn btn-secondary flex items-center px-2 py-1 text-xs">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to delete product: ${product.name}?`)) {
                              try {
                                await db.deleteProduct(product.id);
                                toast.success('Product deleted successfully!');
                                await refreshProductsAndCategories();
                              } catch (error) {
                                console.error('Failed to delete product:', error);
                                toast.error('Failed to delete product');
                              }
                            }
                          }}
                          className="btn btn-danger flex items-center px-2 py-1 text-xs"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Product"
      >
        <ProductForm
          onSuccess={handleProductAdded}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingProduct(null); }}
        title="Edit Product"
      >
        {editingProduct && (
          <ProductForm
            product={editingProduct}
            onSuccess={handleProductUpdated}
            onCancel={() => { setShowEditModal(false); setEditingProduct(null); }}
          />
        )}
      </Modal>
    </div>
  );
};

export default ProductList;