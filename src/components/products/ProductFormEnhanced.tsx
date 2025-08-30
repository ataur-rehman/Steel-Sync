import React, { useState } from 'react';
import { db } from '../../services/database';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import toast from 'react-hot-toast';
import {
    validateUnit,
    UNIT_TYPES,
    getUnitTypeConfig,
    type UnitType,
    parseUnit
} from '../../utils/unitUtils';

interface ProductFormProps {
    product?: any; // For editing existing products
    onSuccess: () => void;
    onCancel: () => void;
}

const ProductFormEnhanced: React.FC<ProductFormProps> = ({ product, onSuccess, onCancel }) => {
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
                `-${size}`,
                size
            ];

            for (const pattern of sizePatterns) {
                if (baseName.includes(pattern)) {
                    baseName = baseName.replace(pattern, '').trim();
                    break;
                }
            }
        }

        // Remove grade part if it exists (try different formats)
        if (grade) {
            const gradePatterns = [
                ` • ${grade}`,
                ` - ${grade}`,
                ` ${grade}`,
                `•${grade}`,
                `-${grade}`,
                grade
            ];

            for (const pattern of gradePatterns) {
                if (baseName.includes(pattern)) {
                    baseName = baseName.replace(pattern, '').trim();
                    break;
                }
            }
        }

        return baseName.trim();
    };

    // Extract base name for editing to prevent double concatenation
    const baseName = product ? extractBaseName(product.name, product.size, product.grade) : '';

    const [formData, setFormData] = useState({
        name: baseName || '',
        category: product?.category || 'Steel Products',
        unit_type: product?.unit_type || 'kg-grams',
        rate_per_unit: product?.rate_per_unit?.toString() || '',
        track_inventory: product?.track_inventory !== undefined ? product.track_inventory.toString() : '1',
        current_stock: getDisplayValue(product?.current_stock, product?.unit_type || 'kg-grams'),
        min_stock_alert: getDisplayValue(product?.min_stock_alert, product?.unit_type || 'kg-grams'),
        size: product?.size || '',
        grade: product?.grade || ''
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);

    const unitConfig = getUnitTypeConfig(formData.unit_type as UnitType);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear errors when user starts typing
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Product name is required';
        }

        if (!formData.rate_per_unit || parseFloat(formData.rate_per_unit) <= 0) {
            newErrors.rate_per_unit = 'Valid rate per unit is required';
        }

        // Validate stock fields if tracking inventory
        if (formData.track_inventory === '1') {
            if (!formData.current_stock.trim()) {
                newErrors.current_stock = 'Current stock is required when tracking inventory';
            } else {
                try {
                    validateUnit(formData.current_stock, formData.unit_type as UnitType);
                } catch (error) {
                    newErrors.current_stock = error instanceof Error ? error.message : 'Invalid stock format';
                }
            }
        }

        if (formData.min_stock_alert && formData.min_stock_alert.trim()) {
            try {
                validateUnit(formData.min_stock_alert, formData.unit_type as UnitType);
            } catch (error) {
                newErrors.min_stock_alert = error instanceof Error ? error.message : 'Invalid alert level format';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);

        try {
            // Construct the full product name with size and grade if provided
            let fullName = formData.name.trim();
            if (formData.size?.trim()) {
                fullName += ` • ${formData.size.trim()}`;
            }
            if (formData.grade?.trim()) {
                fullName += ` • ${formData.grade.trim()}`;
            }

            const productData = {
                name: fullName,
                category: formData.category.trim(),
                unit_type: formData.unit_type,
                rate_per_unit: parseFloat(formData.rate_per_unit),
                current_stock: parseInt(formData.track_inventory) === 1 ? (formData.current_stock.trim() || '0') : '0',
                min_stock_alert: parseInt(formData.track_inventory) === 1 ? (formData.min_stock_alert.trim() || '10') : '10',
                track_inventory: parseInt(formData.track_inventory),
                size: formData.size.trim() || null,
                grade: formData.grade.trim() || null
            };

            if (product) {
                // Update existing product
                await db.executeSmartQuery(
                    `UPDATE products SET 
                        name = ?, category = ?, unit_type = ?, rate_per_unit = ?,
                        current_stock = ?, min_stock_alert = ?, track_inventory = ?,
                        size = ?, grade = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?`,
                    [
                        productData.name, productData.category, productData.unit_type, productData.rate_per_unit,
                        productData.current_stock, productData.min_stock_alert, productData.track_inventory,
                        productData.size, productData.grade, product.id
                    ]
                );

                await activityLogger.logProductUpdated(product.id, productData.name);
                toast.success('Product updated successfully');
            } else {
                // Create new product
                const result = await db.executeSmartQuery(
                    `INSERT INTO products (
                        name, category, unit_type, rate_per_unit, current_stock, min_stock_alert,
                        track_inventory, size, grade, created_at, updated_at
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [
                        productData.name, productData.category, productData.unit_type, productData.rate_per_unit,
                        productData.current_stock, productData.min_stock_alert, productData.track_inventory,
                        productData.size, productData.grade
                    ]
                );

                await activityLogger.logProductCreated((result as any).lastInsertRowId || 0, productData.name);
                toast.success('Product added successfully');
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Failed to save product. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6 p-1">
                {/* Essential Information */}
                <div className="space-y-4">

                    {/* Basic Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Product Name */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="product-name">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="product-name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm${errors.name ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                                placeholder="Enter product name"
                                autoFocus
                                required
                                disabled={loading}
                                aria-invalid={!!errors.name}
                            />
                            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="product-category">
                                Category *
                            </label>
                            <select
                                id="product-category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                disabled={loading}
                            >
                                <option value="Steel Products">Steel Products</option>
                                <option value="Rods">Rods</option>
                                <option value="Building Material">Building Material</option>
                                <option value="Wire">Wire</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Unit Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="unit-type">
                                Unit Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="unit-type"
                                name="unit_type"
                                value={formData.unit_type}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                disabled={loading}
                                required
                            >
                                {UNIT_TYPES.map((config) => (
                                    <option key={config.type} value={config.type}>
                                        {config.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Rate per Unit */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="rate-per-unit">
                                Rate per Unit <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="rate-per-unit"
                                type="number"
                                name="rate_per_unit"
                                value={formData.rate_per_unit}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm${errors.rate_per_unit ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                required
                                disabled={loading}
                                onWheel={(e) => e.currentTarget.blur()}
                            />
                            {errors.rate_per_unit && <p className="text-red-600 text-sm mt-1">{errors.rate_per_unit}</p>}
                        </div>

                        {/* Track Inventory */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Inventory Tracking
                            </label>
                            <div className="flex space-x-6">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="track_inventory"
                                        value="1"
                                        checked={formData.track_inventory === '1'}
                                        onChange={handleChange}
                                        className="mr-3 w-4 h-4 text-blue-600"
                                        disabled={loading}
                                    />
                                    <span className="text-sm">Track Stock</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="track_inventory"
                                        value="0"
                                        checked={formData.track_inventory === '0'}
                                        onChange={handleChange}
                                        className="mr-3 w-4 h-4 text-blue-600"
                                        disabled={loading}
                                    />
                                    <span className="text-sm">Non-Stock Item</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Stock Information - Only if tracking inventory */}
                    {formData.track_inventory === '1' && (
                        <div className="border-t pt-4 mt-4">
                            <h4 className="text-md font-medium text-gray-900 mb-3">Stock Information</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Current Stock */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="current-stock">
                                        Current Stock
                                    </label>
                                    <input
                                        id="current-stock"
                                        type="text"
                                        name="current_stock"
                                        value={formData.current_stock}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm${errors.current_stock ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                                        placeholder={`e.g. ${unitConfig.examples[0] || '100'}`}
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        <strong>{unitConfig.label}:</strong> {unitConfig.examples.join(', ')}
                                        <br />
                                        <span className="text-gray-400">{unitConfig.description}</span>
                                    </p>
                                    {errors.current_stock && <p className="text-red-600 text-sm mt-1">{errors.current_stock}</p>}
                                </div>

                                {/* Min Stock Alert */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="min-stock-alert">
                                        Min Stock Alert
                                    </label>
                                    <input
                                        id="min-stock-alert"
                                        type="text"
                                        name="min_stock_alert"
                                        value={formData.min_stock_alert}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm${errors.min_stock_alert ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                                        placeholder={`e.g. ${unitConfig.examples[0] || '10'}`}
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        <strong>{unitConfig.label}:</strong> {unitConfig.examples.join(', ')}
                                        <br />
                                        <span className="text-gray-400">{unitConfig.description}</span>
                                    </p>
                                    {errors.min_stock_alert && <p className="text-red-600 text-sm mt-1">{errors.min_stock_alert}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Optional Details - Collapsible */}
                    <div className="border-t pt-4 mt-4">
                        <button
                            type="button"
                            onClick={() => setShowOptional(!showOptional)}
                            className="w-full flex items-center justify-between p-3 text-left text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <span className="tracking-wide">Optional Details (Size, Grade)</span>
                            <svg
                                className={`h-5 w-5 ml-2 transition-transform duration-200 ${showOptional ? 'rotate-90' : 'rotate-0'}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {/* Collapsible Content */}
                        <div
                            className={`overflow-hidden transition-all duration-300 bg-white border-x border-b border-gray-200 rounded-b-lg ${showOptional ? 'max-h-[500px] p-4 opacity-100' : 'max-h-0 p-0 opacity-0'}`}
                            style={{ pointerEvents: showOptional ? 'auto' : 'none' }}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Size */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="size">
                                        Size
                                    </label>
                                    <input
                                        id="size"
                                        type="text"
                                        name="size"
                                        value={formData.size}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="e.g., 12mm, Large, XL"
                                        disabled={loading}
                                    />
                                </div>

                                {/* Grade */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="grade">
                                        Grade
                                    </label>
                                    <input
                                        id="grade"
                                        type="text"
                                        name="grade"
                                        value={formData.grade}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="e.g., A-Grade, Premium"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={loading}
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        disabled={loading || Object.keys(errors).length > 0}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </>
                        ) : (
                            <>
                                {product ? 'Update Product' : 'Add Product'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductFormEnhanced;