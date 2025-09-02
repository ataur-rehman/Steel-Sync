/**
 * Quick Performance Test Data Generator
 * Run this in browser console for immediate test data generation
 */

// Quick test data generation functions
window.generatePerformanceTestData = async () => {
    console.log('🚀 Starting Performance Test Data Generation...');

    // Access the database from the global context
    const { useDatabase } = window.React;

    if (!window.db) {
        console.error('❌ Database not available in global context');
        return;
    }

    const db = window.db;
    const startTime = performance.now();

    try {
        // Helper functions
        const randomDate = (start, end) => {
            return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        };

        const randomTime = () => {
            const hours = Math.floor(Math.random() * 12) + 1;
            const minutes = Math.floor(Math.random() * 60);
            const ampm = Math.random() > 0.5 ? 'AM' : 'PM';
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        };

        const randomAmount = (min = 100, max = 50000) => {
            return Math.floor(Math.random() * (max - min) + min);
        };

        // 1. Generate Stock History Data (1200 records)
        console.log('📦 Generating Stock History data...');
        for (let i = 0; i < 1200; i++) {
            const date = randomDate(new Date('2024-01-01'), new Date('2025-09-01'));
            const changeType = Math.random() > 0.5 ? 'addition' : 'removal';
            const quantity = Math.floor(Math.random() * 100) + 1;

            try {
                await db.executeRawQuery(
                    `INSERT INTO stock_history (product_id, change_type, quantity, reason, notes, created_at, created_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        Math.floor(Math.random() * 10) + 1, // Assuming product IDs 1-10
                        changeType,
                        changeType === 'addition' ? quantity : -quantity,
                        ['Purchase', 'Sale', 'Adjustment'][Math.floor(Math.random() * 3)],
                        'Performance test data',
                        date.toISOString(),
                        'console-test'
                    ]
                );
            } catch (error) {
                console.log(`Stock history ${i}: ${error.message}`);
            }

            if (i % 100 === 0) console.log(`Stock History: ${i}/1200`);
        }

        // 2. Generate Invoice Data (12000 records)
        console.log('📋 Generating Invoice data...');
        for (let i = 0; i < 12000; i++) {
            const date = randomDate(new Date('2024-01-01'), new Date('2025-09-01'));
            const totalAmount = randomAmount(500, 100000);
            const paidAmount = Math.random() > 0.3 ? totalAmount : Math.floor(totalAmount * Math.random());

            try {
                await db.executeRawQuery(
                    `INSERT INTO invoices (invoice_number, customer_id, date, time, total_amount, paid_amount, remaining_amount, status, notes, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        `PT-${Date.now()}-${i}`,
                        Math.floor(Math.random() * 10) + 1, // Assuming customer IDs 1-10
                        date.toISOString().split('T')[0],
                        randomTime(),
                        totalAmount,
                        paidAmount,
                        totalAmount - paidAmount,
                        paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
                        'Performance test invoice',
                        date.toISOString()
                    ]
                );
            } catch (error) {
                console.log(`Invoice ${i}: ${error.message}`);
            }

            if (i % 1000 === 0) console.log(`Invoices: ${i}/12000`);
        }

        // 3. Generate Daily Ledger Data (300 records)
        console.log('📊 Generating Daily Ledger data...');
        for (let i = 0; i < 300; i++) {
            const date = randomDate(new Date('2024-08-01'), new Date('2025-09-01'));
            const isIncoming = Math.random() > 0.4;
            const amount = randomAmount(200, 25000);

            try {
                await db.executeRawQuery(
                    `INSERT INTO ledger_entries (date, time, type, category, description, amount, customer_id, payment_channel_id, payment_method, reference_type, is_manual, notes, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        date.toISOString().split('T')[0],
                        randomTime(),
                        isIncoming ? 'incoming' : 'outgoing',
                        ['cash_sale', 'credit_sale', 'payment_received', 'expense'][Math.floor(Math.random() * 4)],
                        isIncoming ? 'Test Payment Received' : 'Test Expense Payment',
                        isIncoming ? amount : -amount,
                        Math.random() > 0.2 ? Math.floor(Math.random() * 10) + 1 : null,
                        Math.floor(Math.random() * 5) + 1, // Assuming payment channel IDs 1-5
                        ['Cash', 'Bank Transfer', 'Cheque'][Math.floor(Math.random() * 3)],
                        'console_test',
                        Math.random() > 0.7 ? 1 : 0,
                        'Performance test entry',
                        date.toISOString()
                    ]
                );
            } catch (error) {
                console.log(`Ledger ${i}: ${error.message}`);
            }

            if (i % 50 === 0) console.log(`Daily Ledger: ${i}/300`);
        }

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log('✅ Performance Test Data Generation Complete!');
        console.log(`📊 Total Time: ${duration} seconds`);
        console.log('📈 Generated:');
        console.log('  - 1,200 Stock History Records');
        console.log('  - 12,000 Invoice Records');
        console.log('  - 300 Daily Ledger Entries');
        console.log('🎯 Ready for Performance Testing!');

    } catch (error) {
        console.error('❌ Test data generation failed:', error);
    }
};

// Quick cleanup function
window.cleanupPerformanceTestData = async () => {
    console.log('🧹 Cleaning up performance test data...');

    if (!window.db) {
        console.error('❌ Database not available');
        return;
    }

    try {
        await window.db.executeRawQuery(`DELETE FROM stock_history WHERE created_by = ?`, ['console-test']);
        await window.db.executeRawQuery(`DELETE FROM invoices WHERE notes = ?`, ['Performance test invoice']);
        await window.db.executeRawQuery(`DELETE FROM ledger_entries WHERE reference_type = ?`, ['console_test']);

        console.log('✅ Cleanup complete!');
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
};

console.log('🎯 Performance Test Data Generator loaded!');
console.log('📝 Usage:');
console.log('  - generatePerformanceTestData() - Generate all test data');
console.log('  - cleanupPerformanceTestData() - Remove test data');
