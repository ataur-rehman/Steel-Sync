import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Download, RefreshCw } from 'lucide-react';
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
}

const ProductMovementDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [movements, setMovements] = useState<ProductMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<ProductMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const loadProductData = async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      
      // Load product details
      const product = await db.getProduct(parseInt(productId));
      
      if (product) {
        setProduct({
          id: product.id,
          name: product.name,
          current_stock: formatUnitString(product.current_stock, product.unit_type || 'kg-grams'),
          unit_type: product.unit_type || 'kg-grams'
        });
      }

      // Load movements
      const movementData = await db.getStockMovements({
        product_id: parseInt(productId)
      });

      // Transform data to match our interface
      const transformedMovements: ProductMovement[] = (movementData || []).map(movement => {
        // Use the movement's own unit_type for formatting (fixes bag/other unit display)
        const unitType = movement.unit_type || product?.unit_type || 'kg-grams';
        return {
          id: movement.id || 0,
          product_id: movement.product_id,
          product_name: movement.product_name,
          movement_type: movement.movement_type,
          quantity: formatUnitString(movement.quantity, unitType),
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
      setFilteredMovements(transformedMovements);
      
    } catch (error) {
      console.error('Error loading product data:', error);
      toast.error('Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductData();
  }, [productId]);

  // Filter movements based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMovements(movements);
      return;
    }

    const filtered = movements.filter(movement => 
      movement.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredMovements(filtered);
  }, [searchTerm, movements]);

  const getMovementTypeInfo = (type: string) => {
    switch (type) {
      case 'in':
        return { label: 'IN', color: 'text-green-700 bg-green-50' };
      case 'out':
        return { label: 'OUT', color: 'text-red-700 bg-red-50' };
      case 'adjustment':
        return { label: 'ADJ', color: 'text-blue-700 bg-blue-50' };
      default:
        return { label: 'UNK', color: 'text-gray-700 bg-gray-50' };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Product not found</p>
          <button
            onClick={() => navigate('/reports/stock')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Stock Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/reports/stock')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              <div className="h-6 border-l border-gray-300"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{product.name}</h1>
                <p className="text-sm text-gray-500">Current Stock: {product.current_stock}</p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-3">
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
              <button
                onClick={exportMovements}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <button
                onClick={loadProductData}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredMovements.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
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
                    
                    return (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="text-gray-900">{formatDate(movement.date)}</div>
                          <div className="text-gray-500">{movement.time}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-medium ${
                            movement.movement_type === 'in' ? 'text-green-600' : 
                            movement.movement_type === 'out' ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : '±'}
                            {movement.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{movement.previous_stock} → {movement.new_stock}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movement.customer_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movement.reference_number || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {movement.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No movements found</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Summary */}
        {filteredMovements.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Total Movements</p>
                <p className="text-2xl font-semibold text-gray-900">{filteredMovements.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Stock In</p>
                <p className="text-2xl font-semibold text-green-600">
                  {filteredMovements.filter(m => m.movement_type === 'in').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Stock Out</p>
                <p className="text-2xl font-semibold text-red-600">
                  {filteredMovements.filter(m => m.movement_type === 'out').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductMovementDetails;
