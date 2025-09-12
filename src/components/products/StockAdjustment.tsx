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

    console.log("=== STOCK ADJUSTMENT START ===");
    console.log("Product:", product.name, "Unit Type:", product.unit_type);
    console.log("User Input:", adjustment.quantity, "Type:", adjustment.type);

    try {
      // CRITICAL: Validate that product has proper unit_type
      if (!product.unit_type) {
        toast.error('Product unit type not set. Please update product first.');
        return;
      }

      // CRITICAL FIX: Handle different unit types correctly
      let finalQuantity: number;

      if (product.unit_type === 'bag' || product.unit_type === 'piece') {
        // For bags and pieces, use the number directly (no conversion to grams)
        const numericValue = parseFloat(adjustment.quantity) || 0;
        console.log("Simple unit - numeric value:", numericValue);

        if (numericValue <= 0) {
          toast.error('Please enter a valid quantity');
          return;
        }

        finalQuantity = adjustment.type === 'add' ? numericValue : -numericValue;
      } else {
        // For kg-grams and kg, use parseUnit to convert properly
        const adjustmentData = parseUnit(adjustment.quantity, product.unit_type);
        console.log("Weight unit - parse result:", adjustmentData);

        if (adjustmentData.numericValue <= 0) {
          toast.error('Please enter a valid quantity');
          return;
        }

        finalQuantity = adjustment.type === 'add' ? adjustmentData.numericValue : -adjustmentData.numericValue;
      }

      console.log("Final quantity to pass to adjustStock:", finalQuantity);

      await db.adjustStock(
        product.id,
        finalQuantity,
        'manual_adjustment',
        adjustment.notes
      );

      // Log the stock adjustment activity


      toast.success('Stock adjusted successfully');
      onSuccess();
    } catch (error: any) {
      console.error('StockAdjustment Error:', error);
      toast.error(error.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
      console.log("=== STOCK ADJUSTMENT END ===");
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
          placeholder={`Enter quantity (e.g., ${product.unit_type === 'kg-grams' ? '10 or 10-500' : '10'})`}
          required
        />
        {adjustment.quantity && adjustment.quantity !== '0' && (
          <p className="mt-1 text-sm text-gray-500">
            Preview: {product.unit_type === 'bag' || product.unit_type === 'piece'
              ? `${adjustment.quantity} ${product.unit_type}${parseFloat(adjustment.quantity) !== 1 ? 's' : ''}`
              : formatUnitString(adjustment.quantity, product.unit_type || 'kg-grams')}
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
                // Get current stock as number
                const currentStock = parseFloat(product.current_stock) || 0;
                const adjustmentValue = parseFloat(adjustment.quantity) || 0;

                const newStock = adjustment.type === 'add'
                  ? currentStock + adjustmentValue
                  : currentStock - adjustmentValue;

                if (product.unit_type === 'bag' || product.unit_type === 'piece') {
                  return `${newStock} ${product.unit_type}${newStock !== 1 ? 's' : ''}`;
                } else {
                  return formatUnitString(newStock.toString(), product.unit_type || 'kg-grams');
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