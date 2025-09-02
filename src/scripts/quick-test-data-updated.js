/**
 * Quick Performance Test Data Generator - Browser Console Script
 * Use this in browser console for immediate test data generation
 * Updated to use same date for daily ledger and same product for stock history
 */

// Generate test data directly in browser console
window.generatePerformanceTestData = async function () {
    console.log('🚀 Starting Performance Test Data Generation...');

    try {
        // Get database connection from global context
        if (!window.db) {
            console.error('❌ Database not available in global context');
            return;
        }

        const db = window.db;

        // Helper functions
        const generateRandomDate = (startDate, endDate) => {
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

        // 1. Generate Stock History Data (1200 records for SAME product)
        console.log('📦 Generating 1200 Stock History records for same product...');

        // Get first product
        const products = await db.executeRawQuery('SELECT id, name FROM products LIMIT 1', []);

        if (products.length === 0) {
            console.error('❌ No products found. Please create products first.');
            return;
        }

        const singleProduct = products[0];
        const stockReasons = ['Purchase', 'Sale', 'Adjustment', 'Transfer', 'Damage', 'Return'];

        for (let i = 0; i < 1200; i++) {
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
                    `Quick test data - ${movementType}`,
                    date.toISOString().split('T')[0],
                    generateRandomTime(),
                    'quick-test',
                    date.toISOString()
                ]
            );

            if (i % 100 === 0) {
                console.log(`📦 Stock History: ${i}/1200 records created`);
            }
        }        // 2. Generate Invoice Data (12000 records)
        console.log('📄 Generating 12000 Invoice records...');

        const customers = await db.executeRawQuery('SELECT id, name FROM customers LIMIT 50', []);
        const productList = await db.executeRawQuery('SELECT id, price FROM products LIMIT 20', []);

        for (let i = 0; i < 12000; i++) {
            const customer = customers[Math.floor(Math.random() * customers.length)];
            const date = generateRandomDate('2024-01-01', '2025-09-01');
            const billNumber = `QT-INV-${Date.now()}-${i}`;
            const totalAmount = generateRandomAmount(500, 100000);
            const paymentAmount = Math.random() > 0.3 ? totalAmount : Math.floor(totalAmount * Math.random());
            const paymentStatus = paymentAmount >= totalAmount ? 'paid' : paymentAmount > 0 ? 'partial' : 'pending';

            await db.executeRawQuery(
                `INSERT INTO invoices 
                 (bill_number, customer_id, customer_name, date, time, total_amount, grand_total, payment_amount, remaining_balance, payment_status, notes, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    billNumber, customer.id, customer.name, date.toISOString().split('T')[0], generateRandomTime(),
                    totalAmount, totalAmount, paymentAmount, totalAmount - paymentAmount, paymentStatus,
                    'Quick test invoice', date.toISOString()
                ]
            );

            if (i % 1000 === 0) {
                console.log(`📄 Invoices: ${i}/12000 records created`);
            }
        }

        // 3. Generate Daily Ledger Data (300 records for SAME date)
        console.log('📊 Generating 300 Daily Ledger records for same date...');

        const paymentChannels = await db.executeRawQuery('SELECT id, name FROM payment_channels LIMIT 10', []);

        const categories = ['incoming', 'outgoing', 'cash_sale', 'credit_sale', 'payment_received', 'expense'];
        const incomingDescriptions = ['Cash Sale Payment', 'Credit Payment', 'Customer Payment', 'Advance Payment'];
        const outgoingDescriptions = ['Purchase Payment', 'Salary Payment', 'Utility Bill', 'Office Expense'];

        // Use the SAME date for all records
        const singleDate = new Date('2025-08-31');

        for (let i = 0; i < 300; i++) {
            const isIncoming = Math.random() > 0.4;
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
                    'Quick test entry', singleDate.toISOString()
                ]
            );

            if (i % 50 === 0) {
                console.log(`📊 Daily Ledger: ${i}/300 records created`);
            }
        }

        console.log('✅ Performance test data generation completed!');
        console.log('📊 Summary:');
        console.log('- 1200 Stock History records for SAME product');
        console.log('- 12000 Invoice records with varied data');
        console.log('- 300 Daily Ledger entries for SAME date (2025-08-31)');

    } catch (error) {
        console.error('❌ Error generating test data:', error);
    }
};

// Cleanup function
window.cleanupPerformanceTestData = async function () {
    console.log('🧹 Starting cleanup of performance test data...');

    try {
        if (!window.db) {
            console.error('❌ Database not available in global context');
            return;
        }

        const db = window.db;

        // Delete test data
        await db.executeRawQuery(`DELETE FROM stock_movements WHERE created_by = 'quick-test'`, []);
        await db.executeRawQuery(`DELETE FROM invoices WHERE notes = 'Quick test invoice'`, []);
        await db.executeRawQuery(`DELETE FROM ledger_entries WHERE notes = 'Quick test entry'`, []);

        console.log('✅ Performance test data cleanup completed!');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
};

console.log('🎯 Performance Test Data Generator loaded!');
console.log('Run: window.generatePerformanceTestData() to generate test data');
console.log('Run: window.cleanupPerformanceTestData() to clean up test data');
