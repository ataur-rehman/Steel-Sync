import React, { useState } from 'react';
import { db } from '../../services/database';
import { generateProductData } from '../../utils/testDataGenerator';
import toast from 'react-hot-toast';

/**
 * Test Data Generator Component
 * Use this component to generate test products for performance testing
 * Add this to your app temporarily, generate data, then remove it
 */

const TestDataGenerator: React.FC = () => {
    const [generating, setGenerating] = useState(false);
    const [productCount, setProductCount] = useState(100);
    const [currentCount, setCurrentCount] = useState<number | null>(null);

    const getCurrentProductCount = async () => {
        try {
            const result = await db.executeSmartQuery('SELECT COUNT(*) as count FROM products');
            const count = (result[0] as any)?.count || 0;
            setCurrentCount(count);
            return count;
        } catch (error) {
            console.error('Error getting product count:', error);
            return 0;
        }
    };

    const generateTestProducts = async () => {
        if (generating) return;

        setGenerating(true);
        const startTime = Date.now();

        try {
            const currentTotal = await getCurrentProductCount();
            console.log(`🚀 Starting to generate ${productCount} test products...`);
            console.log(`📊 Current products in database: ${currentTotal}`);

            const batchSize = 10; // Insert in batches for better performance
            let inserted = 0;

            for (let i = 0; i < productCount; i += batchSize) {
                const batch = [];
                const remainingCount = Math.min(batchSize, productCount - i);

                // Generate batch of products
                for (let j = 0; j < remainingCount; j++) {
                    const productData = generateProductData();
                    batch.push(productData);
                }

                // Insert batch
                for (const product of batch) {
                    try {
                        await db.executeSmartQuery(
                            `INSERT INTO products (
                                name, category, unit_type, rate_per_unit, current_stock,
                                min_stock_alert, track_inventory, size, grade, 
                                created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                            [
                                product.name,
                                product.category,
                                product.unit_type,
                                product.rate_per_unit,
                                product.current_stock,
                                product.min_stock_alert,
                                product.track_inventory,
                                product.size,
                                product.grade
                            ]
                        );
                        inserted++;
                    } catch (error) {
                        console.error('Error inserting product:', error);
                    }
                }

                console.log(`📦 Generated ${inserted}/${productCount} products...`);
            }

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            const finalCount = await getCurrentProductCount();

            toast.success(`✅ Successfully generated ${inserted} test products in ${duration}s!`);
            console.log(`✅ Successfully generated ${inserted} test products!`);
            console.log(`📊 Total products in database: ${finalCount}`);
            console.log(`⏱️ Generation time: ${duration} seconds`);

        } catch (error) {
            console.error('❌ Error generating test products:', error);
            toast.error('Failed to generate test products. Check console for details.');
        } finally {
            setGenerating(false);
        }
    };

    const clearAllProducts = async () => {
        if (!window.confirm('Are you sure you want to delete ALL products? This cannot be undone!')) {
            return;
        }

        try {
            await db.executeSmartQuery('DELETE FROM products');
            const count = await getCurrentProductCount();
            toast.success('All products deleted successfully!');
            console.log(`🗑️ All products deleted. Current count: ${count}`);
        } catch (error) {
            console.error('Error deleting products:', error);
            toast.error('Failed to delete products');
        }
    };

    React.useEffect(() => {
        getCurrentProductCount();
    }, []);

    return (
        <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg mb-6">
            <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">⚠️</span>
                </div>
                <h2 className="text-lg font-bold text-yellow-800">Test Data Generator</h2>
                <span className="ml-auto text-sm text-yellow-600">For Performance Testing Only</span>
            </div>

            <p className="text-yellow-700 mb-4">
                Use this tool to generate test products for performance testing.
                <strong className="text-yellow-800"> Remove this component after testing!</strong>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-yellow-700 mb-2">
                        Number of Products to Generate
                    </label>
                    <input
                        type="number"
                        value={productCount}
                        onChange={(e) => setProductCount(parseInt(e.target.value) || 100)}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        min="1"
                        max="1000"
                        disabled={generating}
                    />
                </div>

                <div>
                    <span className="block text-sm font-medium text-yellow-700 mb-2">
                        Current Products: {currentCount !== null ? currentCount : 'Loading...'}
                    </span>
                    <button
                        onClick={getCurrentProductCount}
                        className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                        disabled={generating}
                    >
                        Refresh Count
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={generateTestProducts}
                        disabled={generating}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generating ? 'Generating...' : 'Generate Test Data'}
                    </button>

                    <button
                        onClick={clearAllProducts}
                        disabled={generating}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        Clear All
                    </button>
                </div>
            </div>

            {generating && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-blue-700">Generating test products... Check console for progress.</span>
                    </div>
                </div>
            )}

            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
                <h3 className="font-medium text-gray-700 mb-2">Performance Testing Tips:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Generate 100+ products to test search performance</li>
                    <li>• Test search with different terms (steel, rod, 12mm, etc.)</li>
                    <li>• Try rapid typing to test debouncing</li>
                    <li>• Test pagination with different page sizes</li>
                    <li>• Check browser dev tools for performance metrics</li>
                </ul>
            </div>
        </div>
    );
};

export default TestDataGenerator;
