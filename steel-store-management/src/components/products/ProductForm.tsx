import React, { useState } from 'react';
import { db } from '../../services/database';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import toast from 'react-hot-toast';
import { 
  validateUnit, 
  UNIT_TYPES, 
  getUnitTypeConfig, 
  type UnitType,
  parseUnit,
  formatUnitString
} from '../../utils/unitUtils';
import { parseCurrency } from '../../utils/currency';

interface ProductFormProps {
  product?: any; // For editing existing products
  onSuccess: () => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSuccess, onCancel }) => {
  const activityLogger = useActivityLogger();
  const [showOptional, setShowOptional] = useState(false);
  
  // Helper function to get display value for editing - using parseUnit for consistency
  const getDisplayValue = (unitString: string | null | undefined, unitType: UnitType): string => {
    if (!unitString) return '';
    
    try {
      const parsed = parseUnit(unitString, unitType);
      return parsed.raw; // Return the raw format for editing
    } catch (error) {
      console.warn('Error parsing unit for display:', error);
      return unitString?.toString() || '';
    }
  };
  
  // Helper function to extract base name from concatenated name
  const extractBaseName = (fullName: string, size?: string, grade?: string): string => {
    if (!fullName) return '';
    
    let baseName = fullName;
    
    // Remove size part if it exists (try different formats)
    if (size) {
      const sizePatterns = [
        ` • ${size}`,
        ` - ${size}`,
        ` ${size}`,
        `•${size}`,
        `-${size}`
      ];
      
      for (const pattern of sizePatterns) {
        if (baseName.includes(pattern)) {
          baseName = baseName.replace(pattern, '');
          break;
        }
      }
    }

    // Remove grade part if it exists (try different formats)
    if (grade) {
      const gradePatterns = [
        ` • G${grade}`,
        ` - G${grade}`,
        ` G${grade}`,
        `•G${grade}`,
        `-G${grade}`,
        ` • ${grade}`,
        ` - ${grade}`,
        ` ${grade}`
      ];
      
      for (const pattern of gradePatterns) {
        if (baseName.includes(pattern)) {
          baseName = baseName.replace(pattern, '');
          break;
        }
      }
    }
    
    // Clean up any remaining separators at the end
    baseName = baseName.replace(/\s*[•-]\s*$/, '').trim();
    
    return baseName;
  };

  // Extract base name for editing to prevent double concatenation
  const baseName = product ? extractBaseName(product.name, product.size, product.grade) : '';
  
  const [formData, setFormData] = useState({
    name: baseName || '',
        category: product?.category || 'Steel Products',
        unit_type: (product?.unit_type as UnitType) || 'kg-grams',
        rate_per_unit: product?.rate_per_unit?.toString() || '',
        current_stock: getDisplayValue(product?.current_stock, (product?.unit_type as UnitType) || 'kg-grams'),
        min_stock_alert: getDisplayValue(product?.min_stock_alert, (product?.unit_type as UnitType) || 'kg-grams'),
    size: product?.size || '', // Optional size
    grade: product?.grade || '' // Optional grade
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If unit_type is changing, reset stock fields to avoid format confusion
    if (name === 'unit_type') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value as UnitType,
        current_stock: '',
        min_stock_alert: ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
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
    
    // Validate current stock using unitUtils
    if (formData.current_stock && formData.current_stock.trim()) {
      const stockValidation = validateUnit(formData.current_stock, formData.unit_type);
      if (!stockValidation.isValid) {
        newErrors.current_stock = stockValidation.error || `Invalid ${formData.unit_type} format for current stock`;
      }
    }
    
    // Validate min stock alert using unitUtils
    if (formData.min_stock_alert && formData.min_stock_alert.trim()) {
      const alertValidation = validateUnit(formData.min_stock_alert, formData.unit_type);
      if (!alertValidation.isValid) {
        newErrors.min_stock_alert = alertValidation.error || `Invalid ${formData.unit_type} format for alert level`;
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
      // Parse and format stock values using unitUtils for consistency
      const currentStockParsed = parseUnit(formData.current_stock || '0', formData.unit_type);
      const minStockParsed = parseUnit(formData.min_stock_alert || '0', formData.unit_type);

      // Concatenate name with size and grade if present
      let fullName = formData.name;
      if (formData.size) fullName += ` • ${formData.size}`;
      if (formData.grade) fullName += ` • G${formData.grade}`;

      // Map form fields to database fields
      const productData = {
        name: fullName, // Store the concatenated name for display purposes
        base_name: formData.name, // Store the base name separately to prevent double concatenation
        name2: fullName, // Legacy field
        category: formData.category,
        unit_type: formData.unit_type,
        unit: '1', // Keep as legacy field
        rate_per_unit: parseCurrency(formData.rate_per_unit),
        current_stock: currentStockParsed.raw, // Use parsed raw format
        min_stock_alert: minStockParsed.raw, // Use parsed raw format
        size: formData.size,
        grade: formData.grade
      };

      console.log('Submitting product data:', productData);

      if (product) {
        await db.updateProduct(product.id, productData);
        
        // Log activity
        await activityLogger.logProductUpdated(product.id, fullName, productData);
        
        toast.success('Product updated successfully!');
        
        // Success - call onSuccess
        onSuccess();
      } else {
        const result = await db.createProduct(productData);
        
        // Log activity
        await activityLogger.logProductCreated(result, fullName);
        
        toast.success('Product added successfully!');

      console.log('Product operation result:', result);

        if (result && result > 0) {
        onSuccess();
      } else {
        throw new Error(`Failed to create product - no valid result returned`);
        }
      }
    } catch (error) {
      console.error('Detailed error saving product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to ${product ? 'update' : 'add'} product: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get placeholder text for unit inputs
  const getUnitPlaceholder = (unitType: UnitType): string => {
    const config = getUnitTypeConfig(unitType);
    return config.examples.join(', ');
  };

  // Helper function to get unit display format help text
  const getUnitHelpText = (unitType: UnitType): string => {
    const config = getUnitTypeConfig(unitType);
    return config.description;
  };

  // Helper function to render current formatted value
  const renderCurrentValue = (value: string, unitType: UnitType): string => {
    if (!value) return `0 ${getUnitTypeConfig(unitType).symbol}`;
    try {
      return formatUnitString(value, unitType);
    } catch {
      return `${value} ${getUnitTypeConfig(unitType).symbol}`;
    }
  };

  // Helper function to generate full product name preview
  const generateFullNamePreview = (): string => {
    let fullName = formData.name;
    if (formData.size) fullName += ` • ${formData.size}`;
    if (formData.grade) fullName += ` • G${formData.grade}`;
    return fullName;
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
              <option value="Wire">Wire</option>
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
            <p className="text-xs text-gray-500 mt-1">
              {getUnitHelpText(formData.unit_type)}
            </p>
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
            step="0.1"
            min="0"
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.rate_per_unit ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
            placeholder="0.0"
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
            <input autoComplete="off"
              id="current-stock"
              type="text"
              name="current_stock"
              value={formData.current_stock}
              onChange={handleChange}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.current_stock ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
              placeholder={getUnitPlaceholder(formData.unit_type)}
              disabled={loading}
              aria-invalid={!!errors.current_stock}
            />
            <p className="text-xs text-gray-500 mt-1">
              Current stock: {renderCurrentValue(formData.current_stock, formData.unit_type)}
            </p>
            {errors.current_stock && <p className="text-red-600 text-sm mt-1">{errors.current_stock}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="min-stock-alert">
              Low Stock Alert Level
            </label>
            <input autoComplete="off"
              id="min-stock-alert"
              type="text"
              name="min_stock_alert"
              value={formData.min_stock_alert}
              onChange={handleChange}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors${errors.min_stock_alert ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
              placeholder={getUnitPlaceholder(formData.unit_type)}
              disabled={loading}
              aria-invalid={!!errors.min_stock_alert}
            />
            <p className="text-xs text-gray-500 mt-1">
              Alert below: {renderCurrentValue(formData.min_stock_alert, formData.unit_type)}
            </p>
            {errors.min_stock_alert && <p className="text-red-600 text-sm mt-1">{errors.min_stock_alert}</p>}
          </div>
        </div>

        {/* Optional Fields: Size and Grade */}
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