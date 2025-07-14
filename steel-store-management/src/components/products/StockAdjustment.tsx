import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import type { Product } from '../../types';
import { toast } from 'react-hot-toast';
import { formatUnitString, parseUnit } from '../../utils/unitUtils';

interface StockAdjustmentProps {
  product: Product;
  onSuccess: () => void;
}

export default function StockAdjustment({ product, onSuccess }: StockAdjustmentProps) {
  const { db } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [adjustment, setAdjustment] = useState({
    type: 'add' as 'add' | 'subtract',
    quantity: '0',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // CRITICAL: Validate that product has proper unit_type
      if (!product.unit_type) {
        toast.error('Product unit type not set. Please update product first.');
        return;
      }
      
      // CRITICAL FIX: Handle unit conversion properly based on unit type
      let adjustmentQuantity: number;
      
      if (product.unit_type === 'kg-grams' || product.unit_type === 'kg') {
        // For weight-based units, use parseUnit to convert to grams
        const adjustmentData = parseUnit(adjustment.quantity, product.unit_type);
        
        if (adjustmentData.numericValue <= 0) {
          toast.error('Please enter a valid quantity');
          return;
        }
        
        // Additional validation for unit mismatch
        if (adjustmentData.unit_type !== product.unit_type) {
          toast.error('Unit type mismatch detected. Please check product configuration.');
          return;
        }
        
        adjustmentQuantity = adjustmentData.numericValue;
      } else {
        // CRITICAL FIX: For non-weight units (bags, pieces, etc.), use direct numeric conversion
        const numericValue = parseFloat(adjustment.quantity);
        
        if (isNaN(numericValue) || numericValue <= 0) {
          toast.error('Please enter a valid quantity');
          return;
        }
        
        // For bags, pieces, etc., no conversion needed - use the value directly
        adjustmentQuantity = numericValue;
      }
      
      // Apply the adjustment direction (add or subtract)
      const finalQuantity = adjustment.type === 'add' ? adjustmentQuantity : -adjustmentQuantity;
      
      await db.adjustStock(
        product.id, 
        finalQuantity,
        'manual_adjustment', 
        adjustment.notes
      );
      toast.success('Stock adjusted successfully');
      onSuccess();
    } catch (error: any) {
      console.error('StockAdjustment Error:', error);
      toast.error(error.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      <div className="bg-gray-50 p-4 rounded">
        <h3 className="font-semibold">{product.name}</h3>
        <div>
          <label className="label">Current Stock</label>
          <p className="text-sm text-gray-600">{formatUnitString(product.current_stock, product.unit_type || 'kg-grams')}</p>
        </div>
      </div>

      <div>
        <label className="label">Adjustment Type</label>
        <select autoComplete="off"
          value={adjustment.type}
          onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value as 'add' | 'subtract' })}
          className="input"
        >
          <option value="add">Add Stock</option>
          <option value="subtract">Remove Stock</option>
        </select>
      </div>

      <div>
        <label className="label">Quantity</label>
        <input autoComplete="off"
          type="text"
          value={adjustment.quantity}
          onChange={(e) => setAdjustment({ ...adjustment, quantity: e.target.value })}
          className="input"
          placeholder={`Enter quantity (e.g., ${
            product.unit_type === 'kg-grams' ? '10 or 10-500' : 
            product.unit_type === 'kg' ? '10.5' :
            product.unit_type === 'bag' ? '5' :
            product.unit_type === 'piece' ? '100' :
            '10'
          })`}
          required
        />
        {adjustment.quantity && adjustment.quantity !== '0' && (
          <p className="mt-1 text-sm text-gray-500">
            Preview: {(() => {
              try {
                if (product.unit_type === 'kg-grams' || product.unit_type === 'kg') {
                  return formatUnitString(adjustment.quantity, product.unit_type || 'kg-grams');
                } else {
                  // For non-weight units, show the value with unit symbol
                  const numericValue = parseFloat(adjustment.quantity);
                  if (isNaN(numericValue)) return 'Invalid quantity';
                  return `${numericValue} ${product.unit_type}${numericValue !== 1 ? 's' : ''}`;
                }
              } catch (error) {
                return 'Invalid quantity';
              }
            })()}
          </p>
        )}
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea autoComplete="off"
          value={adjustment.notes}
          onChange={(e) => setAdjustment({ ...adjustment, notes: e.target.value })}
          className="input"
          rows={3}
          placeholder="Reason for adjustment..."
        />
      </div>

      <div className="bg-blue-50 p-4 rounded">
        <p className="text-sm">
          New Stock: {' '}
          <span className="font-semibold">
            {(() => {
              try {
                const currentStockData = parseUnit(product.current_stock, product.unit_type || 'kg-grams');
                const currentStock = currentStockData.numericValue;
                
                let adjustmentValue: number;
                
                if (product.unit_type === 'kg-grams' || product.unit_type === 'kg') {
                  // For weight units, parse the adjustment quantity
                  const adjustmentData = parseUnit(adjustment.quantity, product.unit_type || 'kg-grams');
                  adjustmentValue = adjustmentData.numericValue;
                } else {
                  // For non-weight units, use direct conversion
                  adjustmentValue = parseFloat(adjustment.quantity) || 0;
                }
                
                const newStock = adjustment.type === 'add' 
                  ? currentStock + adjustmentValue 
                  : currentStock - adjustmentValue;
                
                // Convert back to display format
                if (product.unit_type === 'kg-grams') {
                  const newStockKg = Math.floor(newStock / 1000);
                  const newStockGrams = newStock % 1000;
                  const displayValue = newStockGrams > 0 ? `${newStockKg}-${newStockGrams}` : `${newStockKg}`;
                  return formatUnitString(displayValue, product.unit_type);
                } else if (product.unit_type === 'kg') {
                  return formatUnitString((newStock / 1000).toString(), product.unit_type);
                } else {
                  // For bags, pieces, etc.
                  return `${newStock} ${product.unit_type}${newStock !== 1 ? 's' : ''}`;
                }
              } catch (error) {
                return formatUnitString(product.current_stock, product.unit_type || 'kg-grams');
              }
            })()}
          </span>
        </p>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onSuccess}
          className="btn btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !adjustment.quantity || adjustment.quantity === '0'}
        >
          {loading ? 'Processing...' : 'Adjust Stock'}
        </button>
      </div>
    </form>
  );
}