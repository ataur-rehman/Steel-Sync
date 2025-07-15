import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import type { Product } from '../../types';
import { toast } from 'react-hot-toast';
import { formatUnitString, parseUnit, getUnitTypeConfig } from '../../utils/unitUtils';
import { TrendingUp, TrendingDown, AlertCircle, Info, Package } from 'lucide-react';

interface StockAdjustmentProps {
  product: Product;
  onSuccess: () => void;
}

export default function StockAdjustment({ product, onSuccess }: StockAdjustmentProps) {
  const { db } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [adjustment, setAdjustment] = useState({
    type: 'add' as 'add' | 'subtract',
    quantity: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewStock, setPreviewStock] = useState<string>('');

  // Calculate preview stock when quantity or type changes
  useEffect(() => {
    if (adjustment.quantity && adjustment.quantity !== '0') {
      try {
        const currentStockData = parseUnit(product.current_stock, product.unit_type);
        const adjustmentData = parseUnit(adjustment.quantity, product.unit_type);
        
        let newNumericValue: number;
        if (adjustment.type === 'add') {
          newNumericValue = currentStockData.numericValue + adjustmentData.numericValue;
        } else {
          newNumericValue = Math.max(0, currentStockData.numericValue - adjustmentData.numericValue);
        }
        
        const preview = formatUnitString(newNumericValue, product.unit_type || 'kg-grams');
        setPreviewStock(preview);
      } catch (error) {
        setPreviewStock('Invalid quantity');
      }
    } else {
      setPreviewStock(formatUnitString(product.current_stock, product.unit_type || 'kg-grams'));
    }
  }, [adjustment.quantity, adjustment.type, product]);

  const handleChange = (field: string, value: string) => {
    setAdjustment(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!adjustment.quantity || adjustment.quantity === '0') {
      newErrors.quantity = 'Please enter a valid quantity';
    } else {
      try {
        const adjustmentData = parseUnit(adjustment.quantity, product.unit_type);
        if (adjustmentData.numericValue <= 0) {
          newErrors.quantity = 'Quantity must be greater than zero';
        }
        
        // Check if subtraction would result in negative stock
        if (adjustment.type === 'subtract') {
          const currentStockData = parseUnit(product.current_stock, product.unit_type);
          if (adjustmentData.numericValue > currentStockData.numericValue) {
            newErrors.quantity = 'Cannot subtract more than current stock';
          }
        }
      } catch (error) {
        newErrors.quantity = `Invalid ${product.unit_type} format`;
      }
    }

    if (!adjustment.notes.trim()) {
      newErrors.notes = 'Please provide a reason for this adjustment';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // CRITICAL: Validate that product has proper unit_type
      if (!product.unit_type) {
        toast.error('Product unit type not set. Please update product first.');
        return;
      }

      let finalQuantity: number;
      if (product.unit_type === 'bag' || product.unit_type === 'piece') {
        // For bags/pieces, use the raw number, not numericValue
        const qty = parseFloat(adjustment.quantity);
        if (!qty || qty <= 0) {
          toast.error('Please enter a valid quantity');
          return;
        }
        finalQuantity = adjustment.type === 'add' ? qty : -qty;
      } else {
        // For other units, use parseUnit as before
        const adjustmentData = parseUnit(adjustment.quantity, product.unit_type);
        if (adjustmentData.numericValue <= 0) {
          toast.error('Please enter a valid quantity');
          return;
        }
        finalQuantity = adjustment.type === 'add' ? adjustmentData.numericValue : -adjustmentData.numericValue;
      }

      await db.adjustStock(
        product.id,
        finalQuantity,
        'manual_adjustment',
        adjustment.notes
      );

      const adjustmentType = adjustment.type === 'add' ? 'increased' : 'decreased';
      const quantityDisplay = product.unit_type === 'bag' || product.unit_type === 'piece' 
        ? `${adjustment.quantity} ${product.unit_type}${parseFloat(adjustment.quantity) !== 1 ? 's' : ''}` 
        : formatUnitString(adjustment.quantity, product.unit_type || 'kg-grams');

      toast.success(
        `Stock ${adjustmentType} successfully! ${product.name}: ${adjustment.type === 'add' ? '+' : '-'}${quantityDisplay}`,
        { duration: 5000 }
      );
      
      onSuccess();
    } catch (error: any) {
      console.error('StockAdjustment Error:', error);
      toast.error(error.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const getUnitConfig = () => getUnitTypeConfig(product.unit_type || 'kg-grams');

  return (
    <div className="max-w-lg mx-auto">
      {/* Product Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200 mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-600">{product.category}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Current Stock:</span>
            <div className="font-semibold text-gray-900">
              {formatUnitString(product.current_stock, product.unit_type || 'kg-grams')}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Unit Type:</span>
            <div className="font-semibold text-gray-900">
              {getUnitConfig().label}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        {/* Adjustment Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Adjustment Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleChange('type', 'add')}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                adjustment.type === 'add'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium">Add Stock</span>
              </div>
              <div className="text-xs mt-1 opacity-75">Increase inventory</div>
            </button>
            
            <button
              type="button"
              onClick={() => handleChange('type', 'subtract')}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                adjustment.type === 'subtract'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <TrendingDown className="h-5 w-5" />
                <span className="font-medium">Remove Stock</span>
              </div>
              <div className="text-xs mt-1 opacity-75">Decrease inventory</div>
            </button>
          </div>
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Quantity <span className="text-red-500">*</span>
          </label>
          
          {product.unit_type === 'kg-grams' ? (
            <div>
              <input
                autoComplete="off"
                type="text"
                value={adjustment.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.quantity ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                }`}
                placeholder="e.g., 1600, 1600-60"
                disabled={loading}
                aria-invalid={!!errors.quantity}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: kg or kg-grams (e.g., 10 or 10-500)
              </p>
            </div>
          ) : product.unit_type === 'kg' ? (
            <div>
              <input
                autoComplete="off"
                type="text"
                value={adjustment.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.quantity ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                }`}
                placeholder="e.g., 500.10"
                disabled={loading}
                aria-invalid={!!errors.quantity}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: decimal kg (e.g., 50.10)
              </p>
            </div>
          ) : (
            <div className="relative">
              <input
                autoComplete="off"
                type="number"
                value={adjustment.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                step="1"
                min="0"
                className={`w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.quantity ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                }`}
                placeholder="0"
                disabled={loading}
                aria-invalid={!!errors.quantity}
              />
              <span className="absolute right-4 top-3.5 text-sm text-gray-500">
                {getUnitConfig().symbol}
              </span>
            </div>
          )}
          
          {errors.quantity && (
            <div className="flex items-center space-x-1 mt-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-600 text-sm">{errors.quantity}</p>
            </div>
          )}
          
          {/* Quantity Preview */}
          {adjustment.quantity && adjustment.quantity !== '0' && !errors.quantity && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Adjustment: {adjustment.type === 'add' ? '+' : '-'}
                  {product.unit_type === 'bag' || product.unit_type === 'piece' 
                    ? `${adjustment.quantity} ${product.unit_type}${parseFloat(adjustment.quantity) !== 1 ? 's' : ''}` 
                    : formatUnitString(adjustment.quantity, product.unit_type || 'kg-grams')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Reason for Adjustment <span className="text-red-500">*</span>
          </label>
          <textarea
            autoComplete="off"
            value={adjustment.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
              errors.notes ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
            }`}
            rows={3}
            placeholder="Please provide a detailed reason for this stock adjustment..."
            disabled={loading}
            aria-invalid={!!errors.notes}
          />
          {errors.notes && (
            <div className="flex items-center space-x-1 mt-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-600 text-sm">{errors.notes}</p>
            </div>
          )}
        </div>

        {/* Stock Preview */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Stock Preview</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Current:</span>
              <div className="font-semibold text-gray-900">
                {formatUnitString(product.current_stock, product.unit_type || 'kg-grams')}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Change:</span>
              <div className={`font-semibold ${
                adjustment.type === 'add' ? 'text-green-600' : 'text-red-600'
              }`}>
                {adjustment.quantity && adjustment.quantity !== '0' ? (
                  <>
                    {adjustment.type === 'add' ? '+' : '-'}
                    {product.unit_type === 'bag' || product.unit_type === 'piece' 
                      ? `${adjustment.quantity} ${product.unit_type}${parseFloat(adjustment.quantity) !== 1 ? 's' : ''}` 
                      : formatUnitString(adjustment.quantity, product.unit_type || 'kg-grams')}
                  </>
                ) : '—'}
              </div>
            </div>
            <div>
              <span className="text-gray-500">New Stock:</span>
              <div className="font-bold text-blue-600">
                {previewStock}
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onSuccess}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              adjustment.type === 'add'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            disabled={loading || !adjustment.quantity || adjustment.quantity === '0' || !adjustment.notes.trim()}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <>
                {adjustment.type === 'add' ? 'Add' : 'Remove'} Stock
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}