import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Download, RefreshCw, TrendingUp, TrendingDown, Edit, Package2, FileText, User, Calendar, Clock, Filter, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../services/database';
import { formatUnitString, type UnitType } from '../../utils/unitUtils';

interface ProductMovement {
  id: number;
  product_id: number;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: string;
  previous_stock: string;
  new_stock: string;
  customer_name?: string;
  reference_number?: string;
  reason: string;
  date: string;
  time: string;
  created_at: string;
}

interface ProductDetails {
  id: number;
  name: string;
  current_stock: string;
  unit_type: UnitType;
  category?: string;
  rate_per_unit?: number;
}

interface FilterState {
  type: string;
  dateFrom: string;
  dateTo: string;
  customer: string;
}

const ProductMovementDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [movements, setMovements] = useState<ProductMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<ProductMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: '',
    dateFrom: '',
    dateTo: '',
    customer: ''
  });

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string, timeString?: string): string => {
    if (timeString) {
      return `${formatDate(dateString)} at ${timeString}`;
    }
    return new Date(dateString).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const loadProductData = async (showLoading = true) => {
    if (!productId) return;
    
    try {
      if (showLoading) setLoading(true);
      
      // Load product details
      const product = await db.getProduct(parseInt(productId));
      
      if (product) {
        setProduct({
          id: product.id,
          name: product.name,
          current_stock: product.current_stock,
          unit_type: product.unit_type || 'kg-grams',
          category: product.category,
          rate_per_unit: product.rate_per_unit
        });
      }

      // Load movements
      const movementData = await db.getStockMovements({
        product_id: parseInt(productId)
      });

      // Transform data to match our interface
      const transformedMovements: ProductMovement[] = (movementData || []).map(movement => {
        const unitType = movement.unit_type || product?.unit_type || 'kg-grams';
        let displayQuantity;
        if (unitType === 'bag' || unitType === 'piece') {
          const qty = typeof movement.quantity === 'number' ? movement.quantity : parseFloat(movement.quantity);
          displayQuantity = `${qty} ${unitType}${qty !== 1 ? 's' : ''}`;
        } else {
          displayQuantity = formatUnitString(movement.quantity, unitType);
        }
        return {
          id: movement.id || 0,
          product_id: movement.product_id,
          product_name: movement.product_name,
          movement_type: movement.movement_type,
          quantity: displayQuantity,
          previous_stock: formatUnitString(movement.previous_stock, unitType),
          new_stock: formatUnitString(movement.new_stock, unitType),
          customer_name: movement.customer_name,
          reference_number: movement.reference_number,
          reason: movement.reason,
          date: movement.date,
          time: movement.time,
          created_at: new Date().toISOString()
        };
      });

      setMovements(transformedMovements);
      
    } catch (error) {
      console.error('Error loading product data:', error);
      toast.error('Failed to load product data');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProductData(false);
    toast.success('Data refreshed successfully');
  };

  useEffect(() => {
    loadProductData();
  }, [productId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...movements];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(movement => 
        movement.customer_name?.toLowerCase().includes(term) ||
        movement.reference_number?.toLowerCase().includes(term) ||
        movement.reason.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(movement => movement.movement_type === filters.type);
    }

    // Date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(movement => movement.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(movement => movement.date <= filters.dateTo);
    }

    // Customer filter
    if (filters.customer.trim()) {
      const customerTerm = filters.customer.toLowerCase();
      filtered = filtered.filter(movement => 
        movement.customer_name?.toLowerCase().includes(customerTerm)
      );
    }

    setFilteredMovements(filtered);
  }, [searchTerm, movements, filters]);

  const getMovementTypeInfo = (type: string) => {
    switch (type) {
      case 'in':
        return { 
          label: 'Stock In', 
          color: 'text-green-700 bg-green-50 border-green-200', 
          icon: TrendingUp,
          textColor: 'text-green-600'
        };
      case 'out':
        return { 
          label: 'Stock Out', 
          color: 'text-red-700 bg-red-50 border-red-200', 
          icon: TrendingDown,
          textColor: 'text-red-600'
        };
      case 'adjustment':
        return { 
          label: 'Adjustment', 
          color: 'text-blue-700 bg-blue-50 border-blue-200', 
          icon: Edit,
          textColor: 'text-blue-600'
        };
      default:
        return { 
          label: 'Unknown', 
          color: 'text-gray-700 bg-gray-50 border-gray-200', 
          icon: Package2,
          textColor: 'text-gray-600'
        };
    }
  };

  const exportMovements = () => {
    if (!filteredMovements.length) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['Date', 'Time', 'Type', 'Quantity', 'Previous Stock', 'New Stock', 'Customer', 'Reference', 'Reason'],
      ...filteredMovements.map(movement => [
        movement.date,
        movement.time,
        movement.movement_type.toUpperCase(),
        movement.quantity,
        movement.previous_stock,
        movement.new_stock,
        movement.customer_name || '',
        movement.reference_number || '',
        movement.reason
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${product?.name || 'product'}_movements_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully');
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilters({
      type: '',
      dateFrom: '',
      dateTo: '',
      customer: ''
    });
  };

  const getStockStatusColor = (current: string, previous: string, type: string) => {
    if (type === 'in') return 'text-green-600';
    if (type === 'out') return 'text-red-600';
    return 'text-blue-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading movement details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Package2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Product not found</h3>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/reports/stock')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Stock Report
          </button>
        </div>
      </div>
    );
  }

  const movementStats = {
    total: filteredMovements.length,
    stockIn: filteredMovements.filter(m => m.movement_type === 'in').length,
    stockOut: filteredMovements.filter(m => m.movement_type === 'out').length,
    adjustments: filteredMovements.filter(m => m.movement_type === 'adjustment').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Navigation and Product Info */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/reports/stock')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back</span>
              </button>
              <div className="h-6 border-l border-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{product.name}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Current: {formatUnitString(product.current_stock, product.unit_type)}</span>
                    {product.category && <span>•</span>}
                    {product.category && <span>{product.category}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search movements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-64"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  showFilters || Object.values(filters).some(v => v)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {Object.values(filters).some(v => v) && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {Object.values(filters).filter(v => v).length}
                  </span>
                )}
              </button>

              {/* Export */}
              <button
                onClick={exportMovements}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                disabled={!filteredMovements.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Filter Movements</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Types</option>
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                  <option value="adjustment">Adjustments</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <input
                  type="text"
                  value={filters.customer}
                  onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                  placeholder="Customer name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{movementStats.total}</div>
              <div className="text-sm text-gray-500">Total Movements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{movementStats.stockIn}</div>
              <div className="text-sm text-gray-500">Stock In</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{movementStats.stockOut}</div>
              <div className="text-sm text-gray-500">Stock Out</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{movementStats.adjustments}</div>
              <div className="text-sm text-gray-500">Adjustments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredMovements.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">
                Movement History ({filteredMovements.length} records)
              </h3>
            </div>
            
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
                      Stock Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMovements.map((movement) => {
                    const typeInfo = getMovementTypeInfo(movement.movement_type);
                    const TypeIcon = typeInfo.icon;
                    
                    return (
                      <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{formatDate(movement.date)}</div>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {movement.time}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${typeInfo.color}`}>
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {typeInfo.label}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${typeInfo.textColor}`}>
                            {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : '±'}
                            {movement.quantity}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">{movement.previous_stock}</span>
                            <span className="mx-2 text-gray-400">→</span>
                            <span className={`font-medium ${getStockStatusColor(movement.new_stock, movement.previous_stock, movement.movement_type)}`}>
                              {movement.new_stock}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {movement.customer_name ? (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{movement.customer_name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {movement.reference_number ? (
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900 font-mono">{movement.reference_number}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs">
                            {movement.reason}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Package2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No movements found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || Object.values(filters).some(v => v)
                ? 'No movements match your current search and filters.'
                : 'No stock movements have been recorded for this product yet.'
              }
            </p>
            {(searchTerm || Object.values(filters).some(v => v)) && (
              <button
                onClick={clearAllFilters}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductMovementDetails;