import React, { useState } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { validateUnit, UNIT_TYPES, getUnitTypeConfig, type UnitType } from '../../utils/unitUtils';
import { parseCurrency } from '../../utils/currency';

interface ProductFormProps {
  product?: any; // For editing existing products
  onSuccess: () => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSuccess, onCancel }) => {
  const [showOptional, setShowOptional] = useState(false);
  
  // Helper function to convert unit format for editing
  const getDisplayValue = (unitString: string, unitType: UnitType): string => {
    if (!unitString) return '';
    
    if (unitType === 'kg-grams') {
      // For kg-grams, keep the original format (e.g., "1600-60")
      return unitString;
    } else if (unitType === 'kg') {
      // For kg decimal, keep the original format (e.g., "500.10")
      return unitString;
    } else {
      // For other types, return as is
      return unitString;
    }
  };
  
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || 'Steel Products',
    unit_type: (product?.unit_type as UnitType) || 'kg-grams',
    unit: product?.unit || '', // Unit field only for kg-grams
    rate_per_unit: product?.rate_per_unit?.toString() || '',
    current_stock: getDisplayValue(product?.current_stock || '', (product?.unit_type as UnitType) || 'kg-grams'),
    min_stock_alert: getDisplayValue(product?.min_stock_alert || '', (product?.unit_type as UnitType) || 'kg-grams'),
    size: product?.size || '', // Optional size
    grade: product?.grade || '' // Optional grade
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.rate_per_unit || parseFloat(formData.rate_per_unit) <= 0) {
      newErrors.rate_per_unit = 'Valid rate per unit is required';
    }
    
    // Validate stock fields based on unit type
    if (formData.current_stock && formData.current_stock.trim()) {
      if (formData.unit_type === 'kg-grams' || formData.unit_type === 'kg') {
        const stockValidation = validateUnit(formData.current_stock, formData.unit_type);
        if (!stockValidation.isValid) {
          newErrors.current_stock = `Invalid ${formData.unit_type} format for current stock`;
        }
      } else {
        if (parseFloat(formData.current_stock) < 0) {
          newErrors.current_stock = 'Current stock cannot be negative';
        }
      }
    }
    
    if (formData.min_stock_alert && formData.min_stock_alert.trim()) {
      if (formData.unit_type === 'kg-grams' || formData.unit_type === 'kg') {
        const alertValidation = validateUnit(formData.min_stock_alert, formData.unit_type);
        if (!alertValidation.isValid) {
          newErrors.min_stock_alert = `Invalid ${formData.unit_type} format for alert level`;
        }
      } else {
        if (parseFloat(formData.min_stock_alert) < 0) {
          newErrors.min_stock_alert = 'Alert level cannot be negative';
        }
      }
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
    // Handle stock values based on unit type
    let currentStockFormatted: string;
    let minStockFormatted: string;
    if (formData.unit_type === 'kg-grams' || formData.unit_type === 'kg') {
      currentStockFormatted = formData.current_stock || '0';
      minStockFormatted = formData.min_stock_alert || '0';
    } else {
      const currentStockValue = parseFloat(formData.current_stock) || 0;
      const minStockValue = parseFloat(formData.min_stock_alert) || 0;
      currentStockFormatted = currentStockValue.toString();
      minStockFormatted = minStockValue.toString();
    }

    // Concatenate name with size and grade if present
    let fullName = formData.name;
    if (formData.size) fullName += ` | ${formData.size}`;
    if (formData.grade) fullName += ` | G${formData.grade}`;

    // Map form fields to database fields
    const productData = {
      name: fullName,
      category: formData.category,
      unit_type: formData.unit_type,
      unit: '1',
      rate_per_unit: parseCurrency(formData.rate_per_unit),
      current_stock: currentStockFormatted,
      min_stock_alert: minStockFormatted,
      size: formData.size,
      grade: formData.grade
    };

    console.log('Submitting product data:', productData);

    let result;
    if (product) {
      result = await db.updateProduct(product.id, productData);
      toast.success('Product updated successfully!');
    } else {
      result = await db.createProduct(productData);
      toast.success('Product added successfully!');
    }

    console.log('Product operation result:', result);

    if (product) {
      onSuccess();
    } else if (result && result > 0) {
      onSuccess();
    } else {
      throw new Error(`Failed to create product - no valid result returned`);
    }
  } catch (error) {
    console.error('Detailed error saving product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    toast.error(`Failed to ${product ? 'update' : 'add'} product: ${errorMessage}`);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="product-name">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input autoComplete="off"
            id="product-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.name ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
            placeholder="e.g., Steel Rod 10mm"
            autoFocus
            required
            disabled={loading}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Category and Unit Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="product-category">
              Category
            </label>
            <select autoComplete="off"
              id="product-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={loading}
            >
              <option value="Steel Products">Steel Products</option>
              <option value="Rods">Rods</option>
              <option value="Building Material">Building Material</option>
               <option value="Building Material">Wire</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="unit-type">
              Unit Type <span className="text-red-500">*</span>
            </label>
            <select autoComplete="off"
              id="unit-type"
              name="unit_type"
              value={formData.unit_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
              disabled={loading}
            >
              {UNIT_TYPES.map(unitType => (
                <option key={unitType.type} value={unitType.type}>
                  {unitType.label} ({unitType.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rate Per Unit */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="rate-per-unit">
            Rate Per Unit (Rs.) <span className="text-red-500">*</span>
          </label>
          <input autoComplete="off"
            id="rate-per-unit"
            type="number"
            name="rate_per_unit"
            value={formData.rate_per_unit}
            onChange={handleChange}
            step="0.01"
            min="0"
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.rate_per_unit ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
            placeholder="0.00"
            required
            disabled={loading}
            aria-invalid={!!errors.rate_per_unit}
          />
          {errors.rate_per_unit && <p className="text-red-600 text-sm mt-1">{errors.rate_per_unit}</p>}
        </div>

        {/* Stock Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="current-stock">
              Current Stock Quantity
            </label>
            {formData.unit_type === 'kg-grams' ? (
              <div>
                <input autoComplete="off"
                  id="current-stock"
                  type="text"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.current_stock ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., 1600, 1600-60"
                  disabled={loading}
                  aria-invalid={!!errors.current_stock}
                />
               
              </div>
            ) : formData.unit_type === 'kg' ? (
              <div>
                <input autoComplete="off"
                  id="current-stock"
                  type="text"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.current_stock ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., 500.10"
                  disabled={loading}
                  aria-invalid={!!errors.current_stock}
                />
               
              </div>
            ) : (
              <div className="relative">
                <input autoComplete="off"
                  id="current-stock"
                  type="number"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleChange}
                  step="1"
                  min="0"
                  className={`w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.current_stock ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="0"
                  disabled={loading}
                  aria-invalid={!!errors.current_stock}
                />
                <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                  {getUnitTypeConfig(formData.unit_type).symbol}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Current stock: {formData.current_stock ? `${formData.current_stock} ${getUnitTypeConfig(formData.unit_type).symbol}` : `0 ${getUnitTypeConfig(formData.unit_type).symbol}`}
                </p>
              </div>
            )}
            {errors.current_stock && <p className="text-red-600 text-sm mt-1">{errors.current_stock}</p>}
          </div>
       
        </div>

        {/* Optional Fields: Size and Grade (Consistent Collapsible Card) */}
        <div>
          <button
            type="button"
            className="flex items-center w-full justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            onClick={() => setShowOptional((v) => !v)}
            aria-expanded={showOptional}
            disabled={loading}
          >
            <span className="tracking-wide">Optional Details</span>
            <svg
              className={`h-5 w-5 ml-2 transition-transform duration-200 ${showOptional ? 'rotate-90' : 'rotate-0'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 bg-white border-x border-b border-gray-200 rounded-b-lg ${showOptional ? 'max-h-[500px] p-4 opacity-100' : 'max-h-0 p-0 opacity-0'}`}
            style={{ pointerEvents: showOptional ? 'auto' : 'none' }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="product-size">
                  Size
                </label>
                <input autoComplete="off"
                  id="product-size"
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g., 10mm"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="product-grade">
                  Grade
                </label>
                <input autoComplete="off"
                  id="product-grade"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g., 70"
                  disabled={loading}
                />
                  
            
              </div>
                 <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="min-stock-alert">
              Low Stock Alert Level
            </label>
            {formData.unit_type === 'kg-grams' ? (
              <div>
                <input autoComplete="off"
                  id="min-stock-alert"
                  type="text"
                  name="min_stock_alert"
                  value={formData.min_stock_alert}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.min_stock_alert ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., 50, 50-0"
                  disabled={loading}
                  aria-invalid={!!errors.min_stock_alert}
                />
         
              </div>
            ) : formData.unit_type === 'kg' ? (
              <div>
                <input autoComplete="off"
                  id="min-stock-alert"
                  type="text"
                  name="min_stock_alert"
                  value={formData.min_stock_alert}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.min_stock_alert ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="e.g., 50.10"
                  disabled={loading}
                  aria-invalid={!!errors.min_stock_alert}
                />
            
              </div>
            ) : (
              <div className="relative">
                <input autoComplete="off"
                  id="min-stock-alert"
                  type="number"
                  name="min_stock_alert"
                  value={formData.min_stock_alert}
                  onChange={handleChange}
                  step="1"
                  min="0"
                  className={`w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.min_stock_alert ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  placeholder="0"
                  disabled={loading}
                  aria-invalid={!!errors.min_stock_alert}
                />
                <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                  {getUnitTypeConfig(formData.unit_type).symbol}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Alert below: {formData.min_stock_alert ? `${formData.min_stock_alert} ${getUnitTypeConfig(formData.unit_type).symbol}` : `0 ${getUnitTypeConfig(formData.unit_type).symbol}`}
                </p>
              </div>
            )}
            {errors.min_stock_alert && <p className="text-red-600 text-sm mt-1">{errors.min_stock_alert}</p>}
          </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (product ? 'Updating...' : 'Adding...') : (product ? 'Update Product' : 'Add Product')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;