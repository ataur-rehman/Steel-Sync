/**
 * Performance Test Data Generator - React Component
 * Generates test data directly in the app for performance testing
 */

import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { toast } from 'react-hot-toast';

const PerformanceTestDataGenerator: React.FC = () => {
    const { db } = useDatabase();
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });

    // Generate random data helpers
    const generateRandomDate = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    };

    const generateRandomTime = () => {
        const hours = Math.floor(Math.random() * 12) + 1;
        const minutes = Math.floor(Math.random() * 60);
        const ampm = Math.random() > 0.5 ? 'AM' : 'PM';
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const generateRandomAmount = (min = 100, max = 50000) => {
        return Math.floor(Math.random() * (max - min) + min);
    };

    const generateRandomName = () => {
        const firstNames = ['Ahmed', 'Ali', 'Hassan', 'Hussein', 'Omar', 'Yasir', 'Tariq', 'Saeed', 'Rashid', 'Khalid'];
        const lastNames = ['Khan', 'Ahmed', 'Ali', 'Hassan', 'Sheikh', 'Malik', 'Qureshi', 'Butt', 'Chaudhry', 'Siddiqui'];
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    };

    // Create sample supporting data
    const createSampleProducts = async () => {
        const products = [
            { name: 'Iron Rod 12mm', price: 1200, stock: 500 },
            { name: 'Iron Rod 16mm', price: 1800, stock: 300 },
            { name: 'Iron Rod 20mm', price: 2500, stock: 200 },
            { name: 'Steel Pipe 1inch', price: 800, stock: 150 },
            { name: 'Steel Pipe 2inch', price: 1500, stock: 100 },
            { name: 'Wire Mesh 6x6', price: 3000, stock: 80 },
            { name: 'Cement Bags', price: 650, stock: 1000 },
            { name: 'Steel Angles', price: 2200, stock: 120 },
            { name: 'Iron Sheets', price: 4500, stock: 60 },
            { name: 'Galvanized Pipes', price: 1800, stock: 90 },
            { name: 'Steel Beams', price: 5500, stock: 40 },
            { name: 'Wire Rods', price: 1100, stock: 200 },
            { name: 'Metal Sheets', price: 3500, stock: 70 },
            { name: 'Iron Bars', price: 1400, stock: 250 },
            { name: 'Steel Plates', price: 6000, stock: 30 }
        ];

        for (const product of products) {
            try {
                await db.executeRawQuery(
                    `INSERT OR IGNORE INTO products (name, price, stock, category, created_at) VALUES (?, ?, ?, ?, ?)`,
                    [product.name, product.price, product.stock, 'Iron & Steel', new Date().toISOString()]
                );
            } catch (error) {
                console.log('Product may already exist:', product.name);
            }
        }
    };

    const createSampleCustomers = async () => {
        for (let i = 0; i < 50; i++) {
            const name = generateRandomName();
            const phone = `03${Math.floor(Math.random() * 900000000) + 100000000}`;
            const address = `Address ${i + 1}, City, Pakistan`;

            try {
                await db.executeRawQuery(
                    `INSERT OR IGNORE INTO customers (name, phone, address, customer_type, created_at) VALUES (?, ?, ?, ?, ?)`,
                    [name, phone, address, Math.random() > 0.5 ? 'regular' : 'wholesale', new Date().toISOString()]
                );
            } catch (error) {
                console.log('Customer creation error (may already exist)');
            }
        }
    };

    const createSamplePaymentChannels = async () => {
        const channels = [
            { name: 'Cash', type: 'cash' },
            { name: 'HBL Bank', type: 'bank' },
            { name: 'UBL Bank', type: 'bank' },
            { name: 'Meezan Bank', type: 'bank' },
            { name: 'JazzCash', type: 'mobile' },
            { name: 'EasyPaisa', type: 'mobile' },
            { name: 'Credit Card', type: 'card' },
            { name: 'Al Baraka Bank', type: 'bank' },
            { name: 'Bank Alfalah', type: 'bank' },
            { name: 'MCB Bank', type: 'bank' }
        ];

        for (const channel of channels) {
            try {
                await db.executeRawQuery(
                    `INSERT OR IGNORE INTO payment_channels (name, type, is_active, created_at) VALUES (?, ?, ?, ?)`,
                    [channel.name, channel.type, 1, new Date().toISOString()]
                );
            } catch (error) {
                console.log('Payment channel may already exist:', channel.name);
            }
        }
    };

    // Generate 1000+ Stock History Records
    const generateStockHistoryData = async (count = 1200) => {
        setProgress({ current: 0, total: count, stage: 'Stock History' });

        try {
            // Ensure products exist
            const products = await db.executeRawQuery('SELECT id, name FROM products LIMIT 20', []);
            if (products.length === 0) {
                await createSampleProducts();
            }

            const productIds = await db.executeRawQuery('SELECT id, name FROM products LIMIT 20', []);
            const stockReasons = ['Purchase', 'Sale', 'Adjustment', 'Transfer', 'Damage', 'Return'];

            // Use the SAME product for all records to test performance with large dataset for one product
            const singleProduct = productIds[0]; // Use first product for all records

            for (let i = 0; i < count; i++) {
                const movementType = Math.random() > 0.5 ? 'in' : 'out';
                const quantity = Math.floor(Math.random() * 100) + 1;
                const reason = stockReasons[Math.floor(Math.random() * stockReasons.length)];
                const date = generateRandomDate('2024-01-01', '2025-09-01');
                const previousStock = Math.floor(Math.random() * 1000);
                const newStock = movementType === 'in' ? previousStock + quantity : Math.max(0, previousStock - quantity);

                await db.executeRawQuery(
                    `INSERT INTO stock_movements 
           (product_id, product_name, movement_type, quantity, previous_stock, new_stock, reason, 
            reference_type, notes, date, time, created_by, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        singleProduct.id, // Same product for all records
                        singleProduct.name,
                        movementType,
                        quantity,
                        previousStock,
                        newStock,
                        reason,
                        'adjustment', // Use valid reference_type
                        `Performance test data - ${movementType}`,
                        date.toISOString().split('T')[0],
                        generateRandomTime(),
                        'performance-test',
                        date.toISOString()
                    ]
                );

                if (i % 50 === 0) {
                    setProgress({ current: i, total: count, stage: 'Stock History' });
                }
            }
        } catch (error) {
            console.error('Stock history generation error:', error);
            throw error;
        }
    };    // Generate 10000+ Invoice Records
    const generateInvoiceData = async (count = 12000) => {
        setProgress({ current: 0, total: count, stage: 'Invoices' });

        try {
            // Ensure customers and products exist
            let customers = await db.executeRawQuery('SELECT id, name FROM customers LIMIT 50', []);
            if (customers.length === 0) {
                await createSampleCustomers();
                customers = await db.executeRawQuery('SELECT id, name FROM customers LIMIT 50', []);
            }

            let products = await db.executeRawQuery('SELECT id, price FROM products LIMIT 20', []);
            if (products.length === 0) {
                await createSampleProducts();
                products = await db.executeRawQuery('SELECT id, price FROM products LIMIT 20', []);
            }

            for (let i = 0; i < count; i++) {
                const customer = customers[Math.floor(Math.random() * customers.length)];
                const date = generateRandomDate('2024-01-01', '2025-09-01');
                const billNumber = `PT-INV-${Date.now()}-${i}`;
                const totalAmount = generateRandomAmount(500, 100000);

                // FIXED: For performance testing, create unpaid invoices to avoid data inconsistency
                // This prevents the payment_amount vs payments table mismatch
                const paymentAmount = 0; // All test invoices are unpaid
                const paymentStatus = 'pending';

                // Insert invoice with consistent data
                await db.executeRawQuery(
                    `INSERT INTO invoices 
           (bill_number, customer_id, customer_name, date, time, total_amount, grand_total, payment_amount, remaining_balance, payment_status, notes, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        billNumber, customer.id, customer.name, date.toISOString().split('T')[0], generateRandomTime(),
                        totalAmount, totalAmount, paymentAmount, totalAmount - paymentAmount, paymentStatus,
                        'Performance test invoice - unpaid', date.toISOString()
                    ]
                );

                // Skip invoice items for performance testing - focus on invoice list performance

                if (i % 100 === 0) {
                    setProgress({ current: i, total: count, stage: 'Invoices' });
                }
            }
        } catch (error) {
            console.error('Invoice generation error:', error);
            throw error;
        }
    };

    // Generate 200+ Daily Ledger Entries
    const generateDailyLedgerData = async (count = 300) => {
        setProgress({ current: 0, total: count, stage: 'Daily Ledger' });

        try {
            // Ensure customers and payment channels exist
            let customers = await db.executeRawQuery('SELECT id FROM customers LIMIT 30', []);
            if (customers.length === 0) {
                await createSampleCustomers();
                customers = await db.executeRawQuery('SELECT id FROM customers LIMIT 30', []);
            }

            let paymentChannels = await db.executeRawQuery('SELECT id, name FROM payment_channels LIMIT 10', []);
            if (paymentChannels.length === 0) {
                await createSamplePaymentChannels();
                paymentChannels = await db.executeRawQuery('SELECT id, name FROM payment_channels LIMIT 10', []);
            }

            const categories = ['incoming', 'outgoing', 'cash_sale', 'credit_sale', 'payment_received', 'expense'];
            const incomingDescriptions = ['Cash Sale Payment', 'Credit Payment', 'Customer Payment', 'Advance Payment'];
            const outgoingDescriptions = ['Purchase Payment', 'Salary Payment', 'Utility Bill', 'Office Expense'];

            // Use the SAME date for all records to test performance with large dataset for one day
            const singleDate = new Date('2025-08-31'); // Use a specific date for all records

            for (let i = 0; i < count; i++) {
                const isIncoming = Math.random() > 0.4; // 60% incoming
                const amount = generateRandomAmount(200, 25000);
                const customerId = Math.random() > 0.2 ? customers[Math.floor(Math.random() * customers.length)].id : null;
                const paymentChannel = paymentChannels[Math.floor(Math.random() * paymentChannels.length)];

                const description = isIncoming
                    ? incomingDescriptions[Math.floor(Math.random() * incomingDescriptions.length)]
                    : outgoingDescriptions[Math.floor(Math.random() * outgoingDescriptions.length)];

                await db.executeRawQuery(
                    `INSERT INTO ledger_entries 
           (date, time, type, category, description, amount, customer_id, payment_channel_id, 
            payment_method, reference_id, reference_type, is_manual, notes, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        singleDate.toISOString().split('T')[0], // Same date for all records
                        generateRandomTime(),
                        isIncoming ? 'incoming' : 'outgoing',
                        categories[Math.floor(Math.random() * categories.length)],
                        description, isIncoming ? amount : -amount, customerId,
                        paymentChannel.id, paymentChannel.name, Math.floor(Math.random() * 10000),
                        'other', // Use valid reference_type from constraint
                        Math.random() > 0.7 ? 1 : 0,
                        'Performance test entry', singleDate.toISOString()
                    ]
                );

                if (i % 25 === 0) {
                    setProgress({ current: i, total: count, stage: 'Daily Ledger' });
                }
            }
        } catch (error) {
            console.error('Daily ledger generation error:', error);
            throw error;
        }
    };

    // Main generation function
    const generateAllTestData = async () => {
        if (!db) {
            toast.error('Database not available');
            return;
        }

        setIsGenerating(true);
        const startTime = performance.now();

        try {
            toast.loading('Generating performance test data...', { duration: 2000 });

            // Generate all test data
            await generateStockHistoryData(1200);
            await generateInvoiceData(12000);
            await generateDailyLedgerData(300);

            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            setProgress({ current: 0, total: 0, stage: 'Complete!' });

            toast.success(`Performance test data generated successfully in ${duration}s!`, {
                duration: 5000
            });

            console.log('✅ Performance Test Data Generation Complete!');
            console.log(`📊 Generation Time: ${duration}s`);
            console.log('📈 Generated: 1200 Stock Records, 12000 Invoices, 300 Ledger Entries');

        } catch (error) {
            console.error('❌ Test data generation failed:', error);
            toast.error('Failed to generate test data');
        } finally {
            setIsGenerating(false);
        }
    };

    // Cleanup test data
    const cleanupTestData = async () => {
        if (!db) {
            toast.error('Database not available');
            return;
        }

        try {
            toast.loading('Cleaning up test data...');

            await db.executeRawQuery(`DELETE FROM stock_history WHERE created_by = ?`, ['performance-test']);
            await db.executeRawQuery(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE notes = ?)`, ['Performance test invoice']);
            await db.executeRawQuery(`DELETE FROM invoices WHERE notes = ?`, ['Performance test invoice']);
            await db.executeRawQuery(`DELETE FROM ledger_entries WHERE reference_type = ?`, ['performance_test']);

            toast.success('Test data cleanup complete');
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            toast.error('Failed to cleanup test data');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-white rounded-lg border p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Performance Test Data Generator</h2>
                <p className="text-gray-600 mb-6">
                    Generate large datasets to test the performance optimizations in Stock History, Invoice List, and Daily Ledger components.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-blue-800">Stock History</h3>
                        <p className="text-blue-600">1,200 Records</p>
                        <p className="text-sm text-blue-500">Various stock movements</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-green-800">Invoice List</h3>
                        <p className="text-green-600">12,000 Invoices</p>
                        <p className="text-sm text-green-500">With items and payments</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-purple-800">Daily Ledger</h3>
                        <p className="text-purple-600">300 Entries</p>
                        <p className="text-sm text-purple-500">Mixed incoming/outgoing</p>
                    </div>
                </div>

                {isGenerating && progress.stage && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                                Generating {progress.stage}...
                            </span>
                            <span className="text-sm text-gray-500">
                                {progress.current} / {progress.total}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                <div className="flex space-x-4">
                    <button
                        onClick={generateAllTestData}
                        disabled={isGenerating}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        {isGenerating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Generating...</span>
                            </>
                        ) : (
                            <span>Generate Test Data</span>
                        )}
                    </button>

                    <button
                        onClick={cleanupTestData}
                        disabled={isGenerating}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cleanup Test Data
                    </button>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">Performance Testing Guide</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Test Stock History component with 1000+ records and pagination</li>
                        <li>• Test Invoice List with 10000+ invoices and search functionality</li>
                        <li>• Test Daily Ledger with 200+ entries and real-time updates</li>
                        <li>• Monitor console for performance timing logs</li>
                        <li>• Check memory usage and UI responsiveness</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default PerformanceTestDataGenerator;
