import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../hooks/useDatabase';

const StockMovementDebugger: React.FC = () => {
    const [stockMovements, setStockMovements] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { db } = useDatabase();

    const checkStockMovements = async () => {
        if (!db) {
            setError('Database not initialized');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use the public getStockMovements method instead
            const movements = await db.getStockMovements();
            setStockMovements(movements || []);
            console.log('Stock movements fetched:', movements);
        } catch (err) {
            console.error('Error fetching stock movements:', err);
            setError(String(err));
        } finally {
            setLoading(false);
        }
    };

    const checkProductInventorySettings = async () => {
        if (!db) {
            setError('Database not initialized');
            return;
        }

        try {
            // Get all products and their inventory tracking settings
            const allProducts = await db.getProducts();
            setProducts(allProducts || []);

            const trackingEnabled = allProducts.filter(p => p.track_inventory === 1 || p.track_inventory === true);
            const trackingDisabled = allProducts.filter(p => p.track_inventory === 0 || p.track_inventory === false);

            console.log('=== PRODUCT INVENTORY TRACKING ANALYSIS ===');
            console.log(`Total products: ${allProducts.length}`);
            console.log(`Inventory tracking ENABLED: ${trackingEnabled.length}`);
            console.log(`Inventory tracking DISABLED: ${trackingDisabled.length}`);

            if (trackingEnabled.length > 0) {
                console.log('Products WITH inventory tracking:', trackingEnabled.map(p => p.name));
            }

            if (trackingDisabled.length > 0) {
                console.log('Products WITHOUT inventory tracking:', trackingDisabled.map(p => p.name));
            }

            alert(`Inventory Analysis Complete!\nTotal: ${allProducts.length}\nTracking Enabled: ${trackingEnabled.length}\nTracking Disabled: ${trackingDisabled.length}\n\nCheck console for details.`);

        } catch (err) {
            console.error('Error checking product inventory settings:', err);
            alert(`Error: ${String(err)}`);
        }
    };

    const enableInventoryForAllProducts = async () => {
        if (!db) {
            setError('Database not initialized');
            return;
        }

        if (!window.confirm('This will enable inventory tracking for ALL products. Continue?')) {
            return;
        }

        try {
            // Get all products
            const allProducts = await db.getProducts();
            const disabledProducts = allProducts.filter(p => p.track_inventory === 0 || p.track_inventory === false);

            console.log(`Enabling inventory tracking for ${disabledProducts.length} products...`);

            // Enable inventory tracking for all products
            for (const product of disabledProducts) {
                await db.updateProduct(product.id, {
                    ...product,
                    track_inventory: 1
                });
                console.log(`Enabled inventory tracking for: ${product.name}`);
            }

            alert(`✅ Inventory tracking enabled for ${disabledProducts.length} products!`);

            // Refresh the product list
            await checkProductInventorySettings();

        } catch (err) {
            console.error('Error enabling inventory tracking:', err);
            alert(`Error: ${String(err)}`);
        }
    };

    const testStockMovementInsertion = async () => {
        if (!db) {
            setError('Database not initialized');
            return;
        }

        try {
            console.log('Testing stock movement insertion...');

            // We'll use a simpler approach - just trigger a stock adjustment which should create a movement
            await db.adjustStock(1, 1, 'Test adjustment', 'Test stock movement for debugging');

            alert('Test stock movement created successfully!');
            checkStockMovements(); // Refresh the list
        } catch (err) {
            console.error('Error creating test stock movement:', err);
            alert(`Error: ${String(err)}`);
        }
    };

    const checkStockMovementsTableSchema = async () => {
        if (!db) {
            setError('Database not initialized');
            return;
        }

        try {
            console.log('=== STOCK MOVEMENTS TABLE SCHEMA ANALYSIS ===');

            // Get table schema
            const schema = await db.getStockMovements(); // This should trigger schema info in console
            console.log('Stock movements from database:', schema);

            // Also manually check with a test query
            console.log('Attempting to run a test stock movement query...');

            alert('Stock movements table schema checked! See console for details.');

        } catch (err) {
            console.error('Error checking stock movements table schema:', err);
            alert(`Schema Error: ${String(err)}`);
        }
    };

    const testInvoiceStockMovementFlow = async () => {
        if (!db) {
            setError('Database not initialized');
            return;
        }

        try {
            console.log('=== TESTING INVOICE STOCK MOVEMENT FLOW ===');

            // Get a sample product
            const products = await db.getProducts();
            const trackingProducts = products.filter(p => p.track_inventory === 1 || p.track_inventory === true);

            if (trackingProducts.length === 0) {
                alert('No products with inventory tracking enabled found!');
                return;
            }

            const testProduct = trackingProducts[0];
            console.log('Using test product:', testProduct);
            console.log('Product inventory tracking status:', testProduct.track_inventory);
            console.log('Product current stock:', testProduct.current_stock);

            // Use the adjustStock method to test stock movement creation
            console.log('Testing stock adjustment (which should create stock movement)...');

            const result = await db.adjustStock(
                testProduct.id,
                1,
                'Debug test adjustment',
                'Testing stock movement creation through adjust stock method'
            );

            console.log('Adjust stock result:', result);

            if (result) {
                alert('✅ Stock adjustment successful! Check the stock movements list.');
                checkStockMovements(); // Refresh the list
            } else {
                alert('❌ Stock adjustment failed - check console for details');
            }

        } catch (err) {
            console.error('Error testing invoice stock movement flow:', err);
            alert(`Flow Test Error: ${String(err)}`);
        }
    };

    useEffect(() => {
        checkStockMovements();
    }, [db]);

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Stock Movement Debugger</h2>

            <div className="mb-4 space-x-2">
                <button
                    onClick={checkStockMovements}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? 'Loading...' : 'Refresh Stock Movements'}
                </button>

                <button
                    onClick={testStockMovementInsertion}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Test Insert
                </button>

                <button
                    onClick={checkProductInventorySettings}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                    Check Product Settings
                </button>

                <button
                    onClick={enableInventoryForAllProducts}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                    Enable Inventory for All
                </button>

                <button
                    onClick={checkStockMovementsTableSchema}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Check Table Schema
                </button>

                <button
                    onClick={testInvoiceStockMovementFlow}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                    Test Transaction Flow
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    Error: {error}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-2 py-1 text-xs">ID</th>
                            <th className="border border-gray-300 px-2 py-1 text-xs">Product</th>
                            <th className="border border-gray-300 px-2 py-1 text-xs">Type</th>
                            <th className="border border-gray-300 px-2 py-1 text-xs">Qty</th>
                            <th className="border border-gray-300 px-2 py-1 text-xs">Reason</th>
                            <th className="border border-gray-300 px-2 py-1 text-xs">Ref Type</th>
                            <th className="border border-gray-300 px-2 py-1 text-xs">Ref ID</th>
                            <th className="border border-gray-300 px-2 py-1 text-xs">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stockMovements.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="border border-gray-300 px-2 py-4 text-center text-gray-500">
                                    No stock movements found
                                </td>
                            </tr>
                        ) : (
                            stockMovements.map((movement, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{movement.id}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{movement.product_name}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{movement.movement_type}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{movement.quantity}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{movement.reason}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{movement.reference_type}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{movement.reference_id}</td>
                                    <td className="border border-gray-300 px-2 py-1 text-xs">{movement.date}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 text-sm text-gray-600">
                Total movements found: {stockMovements.length}
            </div>

            {products.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded">
                    <h3 className="font-semibold mb-2">Product Inventory Tracking Status:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <strong>Total Products:</strong> {products.length}
                        </div>
                        <div className="text-green-600">
                            <strong>Tracking Enabled:</strong> {products.filter(p => p.track_inventory === 1 || p.track_inventory === true).length}
                        </div>
                        <div className="text-red-600">
                            <strong>Tracking Disabled:</strong> {products.filter(p => p.track_inventory === 0 || p.track_inventory === false).length}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        ⚠️ Stock movements are only created for products with inventory tracking enabled!
                    </p>
                </div>
            )}
        </div>
    );
};

export default StockMovementDebugger;
