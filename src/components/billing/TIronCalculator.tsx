/**
 * T-IRON CALCULATOR COMPONENT
 * 
 * Special calculator for T-Iron products with pieces × length × price per foot calculation
 */

import React, { useState, useEffect } from 'react';
import { Calculator, Info, X } from 'lucide-react';

interface TIronCalculatorProps {
    product: any;
    onCalculationComplete: (calculatedItem: any) => void;
    onCancel: () => void;
    existingItem?: any; // For editing existing T-Iron items
}

export const TIronCalculator: React.FC<TIronCalculatorProps> = ({
    product,
    onCalculationComplete,
    onCancel,
    existingItem
}) => {
    const [pieces, setPieces] = useState<number>(existingItem?.t_iron_pieces || 1);
    const [lengthPerPiece, setLengthPerPiece] = useState<number>(existingItem?.t_iron_length_per_piece || product.length_per_piece || 12);
    const [pricePerFoot, setPricePerFoot] = useState<number>(existingItem?.unit_price || product.rate_per_unit || 120);
    const [unit, setUnit] = useState<'pcs' | 'L'>(existingItem?.t_iron_unit || 'pcs'); // Add unit selection
    const [calculation, setCalculation] = useState<any>(null);
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        // Calculate whenever inputs change
        const totalFeet = pieces * lengthPerPiece;
        const totalAmount = totalFeet * pricePerFoot;

        setCalculation({
            pieces,
            lengthPerPiece,
            pricePerFoot,
            totalFeet,
            totalAmount,
            unit
        });

        // Simple validation
        const validationErrors: string[] = [];
        if (pieces <= 0) validationErrors.push('Number of pieces must be greater than 0');
        if (lengthPerPiece <= 0) validationErrors.push('Length per piece must be greater than 0');
        if (pricePerFoot <= 0) validationErrors.push('Price per foot must be greater than 0');

        setErrors(validationErrors);
    }, [pieces, lengthPerPiece, pricePerFoot, unit]);

    const handleAddToInvoice = () => {
        if (errors.length > 0) {
            return;
        }

        const totalFeet = pieces * lengthPerPiece;
        const totalAmount = totalFeet * pricePerFoot;

        const calculatedItem = {
            product_id: product.id,
            product_name: product.name,
            quantity: totalFeet, // Total feet as quantity
            unit_price: pricePerFoot, // Price per foot
            total_price: totalAmount,
            unit: 'ft',
            // T-Iron specific calculation data
            t_iron_pieces: pieces,
            t_iron_length_per_piece: lengthPerPiece,
            t_iron_total_feet: totalFeet,
            t_iron_unit: unit, // Store the unit type (pcs or L)
            product_description: `${pieces}${unit} × ${lengthPerPiece}ft/${unit} × Rs.${pricePerFoot}`,
            is_non_stock_item: true,
            // Include existing item ID if editing
            ...(existingItem && {
                itemId: existingItem.id,
                isEdit: true
            })
        };

        onCalculationComplete(calculatedItem);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                            <Calculator className="h-5 w-5 text-blue-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                T-Iron Calculator {existingItem ? '(Editing)' : ''}
                            </h3>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-start">
                            <Info className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-700">
                                <p className="font-medium">{product.name}</p>
                                <p>Formula: Pieces × Length × Price per Foot</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Unit Selection - Compact horizontal */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setUnit('pcs')}
                                    className={`flex-1 px-3 py-2 rounded border text-sm font-medium transition-colors ${unit === 'pcs'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    Pieces
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUnit('L')}
                                    className={`flex-1 px-3 py-2 rounded border text-sm font-medium transition-colors ${unit === 'L'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    Length
                                </button>
                            </div>
                        </div>

                        {/* Input Fields - Compact grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {unit === 'pcs' ? 'Pieces' : 'Lengths'}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={pieces}
                                    onChange={(e) => setPieces(parseInt(e.target.value) || 1)}
                                    className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    placeholder="12"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Length/pc (ft)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.1"
                                    value={lengthPerPiece}
                                    onChange={(e) => setLengthPerPiece(parseFloat(e.target.value) || 12)}
                                    className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    placeholder="12"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Price/ft (Rs.)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={pricePerFoot}
                                    onChange={(e) => setPricePerFoot(parseFloat(e.target.value) || 120)}
                                    className="w-full px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    placeholder="120"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Calculation Display - Compact */}
                    {calculation && errors.length === 0 && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-800 mb-2 text-sm">Calculation Result</h4>
                            <div className="space-y-1 text-sm text-green-700">
                                <div className="flex justify-between">
                                    <span>{calculation.pieces}{unit} × {calculation.lengthPerPiece}ft × Rs.{calculation.pricePerFoot}</span>
                                </div>
                                <div className="border-t border-green-300 pt-2 mt-2">
                                    <div className="flex justify-between items-center font-medium">
                                        <span>Total Feet:</span>
                                        <span>{calculation.totalFeet} ft</span>
                                    </div>
                                    <div className="flex justify-between items-center font-bold text-lg">
                                        <span>Total Amount:</span>
                                        <span>Rs. {calculation.totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {errors.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                            <h4 className="font-medium text-red-800 mb-1 text-sm">Please fix errors:</h4>
                            <ul className="text-sm text-red-700 list-disc list-inside">
                                {errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Action Buttons - Compact */}
                    <div className="flex justify-end space-x-3 mt-4">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddToInvoice}
                            disabled={errors.length > 0}
                            className={`px-4 py-2 rounded font-medium transition-colors text-sm ${errors.length > 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            Add to Invoice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TIronCalculator;
