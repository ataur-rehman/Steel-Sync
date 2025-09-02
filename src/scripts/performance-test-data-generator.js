/**
 * Performance Test Data Generator
 * Generates large datasets to test component performance optimizations
 * 
 * Usage: node performance-test-data-generator.js
 */

import Database from 'tauri-plugin-sql-api';

class PerformanceTestDataGenerator {
    constructor() {
        this.db = null;
    }

    async init() {
        try {
            this.db = await Database.load('sqlite:database.db');
            console.log('✅ Database connection established');
        } catch (error) {
            console.error('❌ Failed to connect to database:', error);
            throw error;
        }
    }

    // Generate random data helpers
    generateRandomDate(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }

    generateRandomTime() {
        const hours = Math.floor(Math.random() * 12) + 1;
        const minutes = Math.floor(Math.random() * 60);
        const ampm = Math.random() > 0.5 ? 'AM' : 'PM';
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }

    generateRandomAmount(min = 100, max = 50000) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    generateRandomName() {
        const firstNames = ['Ahmed', 'Ali', 'Hassan', 'Hussein', 'Omar', 'Yasir', 'Tariq', 'Saeed', 'Rashid', 'Khalid'];
        const lastNames = ['Khan', 'Ahmed', 'Ali', 'Hassan', 'Sheikh', 'Malik', 'Qureshi', 'Butt', 'Chaudhry', 'Siddiqui'];
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }

    generateRandomProduct() {
        const products = [
            'Iron Rod 12mm', 'Iron Rod 16mm', 'Iron Rod 20mm', 'Iron Rod 25mm',
            'Steel Pipe 1inch', 'Steel Pipe 2inch', 'Steel Beam H-Section',
            'Wire Mesh 6x6', 'Cement Bags', 'Steel Angles', 'Iron Sheets',
            'Galvanized Pipes', 'Steel Bars', 'Construction Rods', 'Metal Plates'
        ];
        return products[Math.floor(Math.random() * products.length)];
    }

    generateRandomCategory() {
        const categories = ['incoming', 'outgoing', 'cash_sale', 'credit_sale', 'payment_received', 'expense', 'salary', 'refund'];
        return categories[Math.floor(Math.random() * categories.length)];
    }

    /**
     * 1. Generate 1000+ Stock History Records
     */
    async generateStockHistoryData(count = 1200) {
        console.log(`🔄 Generating ${count} stock history records...`);

        const startTime = performance.now();

        try {
            // First, ensure we have some products
            const products = await this.db.select('SELECT id, name FROM products LIMIT 20');
            if (products.length === 0) {
                console.log('📦 Creating sample products first...');
                await this.createSampleProducts();
            }

            const productIds = await this.db.select('SELECT id FROM products LIMIT 20');

            const batchSize = 100; // Insert in batches for better performance
            const batches = Math.ceil(count / batchSize);

            for (let batch = 0; batch < batches; batch++) {
                const batchRecords = [];
                const currentBatchSize = Math.min(batchSize, count - (batch * batchSize));

                for (let i = 0; i < currentBatchSize; i++) {
                    const productId = productIds[Math.floor(Math.random() * productIds.length)].id;
                    const changeType = Math.random() > 0.5 ? 'addition' : 'removal';
                    const quantity = Math.floor(Math.random() * 100) + 1;
                    const reason = this.getRandomStockReason(changeType);
                    const date = this.generateRandomDate('2024-01-01', '2025-09-01');

                    batchRecords.push({
                        product_id: productId,
                        change_type: changeType,
                        quantity: changeType === 'addition' ? quantity : -quantity,
                        reason: reason,
                        notes: `Performance test data - ${changeType} of ${quantity} units`,
                        created_at: date.toISOString(),
                        created_by: 'performance-test'
                    });
                }

                // Insert batch
                for (const record of batchRecords) {
                    await this.db.execute(
                        `INSERT INTO stock_history 
                         (product_id, change_type, quantity, reason, notes, created_at, created_by) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [record.product_id, record.change_type, record.quantity, record.reason,
                        record.notes, record.created_at, record.created_by]
                    );
                }

                console.log(`📊 Batch ${batch + 1}/${batches} completed (${(batch + 1) * batchSize} records)`);
            }

            const endTime = performance.now();
            console.log(`✅ Generated ${count} stock history records in ${(endTime - startTime).toFixed(2)}ms`);

        } catch (error) {
            console.error('❌ Failed to generate stock history data:', error);
            throw error;
        }
    }

    getRandomStockReason(changeType) {
        const additionReasons = ['Purchase', 'Stock Adjustment', 'Return from Customer', 'Manufacturing'];
        const removalReasons = ['Sale', 'Damage', 'Stock Adjustment', 'Transfer', 'Waste'];

        if (changeType === 'addition') {
            return additionReasons[Math.floor(Math.random() * additionReasons.length)];
        } else {
            return removalReasons[Math.floor(Math.random() * removalReasons.length)];
        }
    }

    /**
     * 2. Generate 10000+ Invoice Records
     */
    async generateInvoiceData(count = 12000) {
        console.log(`🔄 Generating ${count} invoice records...`);

        const startTime = performance.now();

        try {
            // Ensure we have customers
            let customers = await this.db.select('SELECT id FROM customers LIMIT 50');
            if (customers.length === 0) {
                console.log('👥 Creating sample customers first...');
                await this.createSampleCustomers();
                customers = await this.db.select('SELECT id FROM customers LIMIT 50');
            }

            // Ensure we have products
            let products = await this.db.select('SELECT id, price FROM products LIMIT 20');
            if (products.length === 0) {
                console.log('📦 Creating sample products first...');
                await this.createSampleProducts();
                products = await this.db.select('SELECT id, price FROM products LIMIT 20');
            }

            const batchSize = 100;
            const batches = Math.ceil(count / batchSize);

            for (let batch = 0; batch < batches; batch++) {
                const batchRecords = [];
                const currentBatchSize = Math.min(batchSize, count - (batch * batchSize));

                for (let i = 0; i < currentBatchSize; i++) {
                    const customerId = customers[Math.floor(Math.random() * customers.length)].id;
                    const date = this.generateRandomDate('2024-01-01', '2025-09-01');
                    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                    const totalAmount = this.generateRandomAmount(500, 100000);
                    const paidAmount = Math.random() > 0.3 ? totalAmount : Math.floor(totalAmount * Math.random());
                    const status = paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

                    batchRecords.push({
                        invoice_number: invoiceNumber,
                        customer_id: customerId,
                        date: date.toISOString().split('T')[0],
                        time: this.generateRandomTime(),
                        total_amount: totalAmount,
                        paid_amount: paidAmount,
                        remaining_amount: totalAmount - paidAmount,
                        status: status,
                        notes: `Performance test invoice - ${status}`,
                        created_at: date.toISOString()
                    });
                }

                // Insert batch
                for (const record of batchRecords) {
                    const result = await this.db.execute(
                        `INSERT INTO invoices 
                         (invoice_number, customer_id, date, time, total_amount, paid_amount, remaining_amount, status, notes, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [record.invoice_number, record.customer_id, record.date, record.time,
                        record.total_amount, record.paid_amount, record.remaining_amount,
                        record.status, record.notes, record.created_at]
                    );

                    // Add some invoice items for realistic data
                    await this.addInvoiceItems(result.lastInsertId, products);
                }

                console.log(`📊 Batch ${batch + 1}/${batches} completed (${(batch + 1) * batchSize} invoices)`);
            }

            const endTime = performance.now();
            console.log(`✅ Generated ${count} invoice records in ${(endTime - startTime).toFixed(2)}ms`);

        } catch (error) {
            console.error('❌ Failed to generate invoice data:', error);
            throw error;
        }
    }

    async addInvoiceItems(invoiceId, products) {
        const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items per invoice

        for (let i = 0; i < itemCount; i++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 10) + 1;
            const price = product.price || this.generateRandomAmount(100, 5000);

            await this.db.execute(
                `INSERT INTO invoice_items (invoice_id, product_id, quantity, price, total) 
                 VALUES (?, ?, ?, ?, ?)`,
                [invoiceId, product.id, quantity, price, quantity * price]
            );
        }
    }

    /**
     * 3. Generate 200+ Daily Ledger Entries
     */
    async generateDailyLedgerData(count = 300) {
        console.log(`🔄 Generating ${count} daily ledger entries...`);

        const startTime = performance.now();

        try {
            // Ensure we have customers and payment channels
            let customers = await this.db.select('SELECT id FROM customers LIMIT 30');
            if (customers.length === 0) {
                await this.createSampleCustomers();
                customers = await this.db.select('SELECT id FROM customers LIMIT 30');
            }

            let paymentChannels = await this.db.select('SELECT id FROM payment_channels LIMIT 10');
            if (paymentChannels.length === 0) {
                await this.createSamplePaymentChannels();
                paymentChannels = await this.db.select('SELECT id FROM payment_channels LIMIT 10');
            }

            const batchSize = 50;
            const batches = Math.ceil(count / batchSize);

            for (let batch = 0; batch < batches; batch++) {
                const batchRecords = [];
                const currentBatchSize = Math.min(batchSize, count - (batch * batchSize));

                for (let i = 0; i < currentBatchSize; i++) {
                    const isIncoming = Math.random() > 0.4; // 60% incoming, 40% outgoing
                    const amount = this.generateRandomAmount(200, 25000);
                    const date = this.generateRandomDate('2024-08-01', '2025-09-01');
                    const customerId = Math.random() > 0.2 ? customers[Math.floor(Math.random() * customers.length)].id : null;
                    const paymentChannelId = paymentChannels[Math.floor(Math.random() * paymentChannels.length)].id;

                    batchRecords.push({
                        date: date.toISOString().split('T')[0],
                        time: this.generateRandomTime(),
                        type: isIncoming ? 'incoming' : 'outgoing',
                        category: this.generateRandomCategory(),
                        description: this.generateLedgerDescription(isIncoming),
                        amount: isIncoming ? amount : -amount,
                        customer_id: customerId,
                        payment_channel_id: paymentChannelId,
                        payment_method: this.getRandomPaymentMethod(),
                        reference_id: Math.floor(Math.random() * 10000),
                        reference_type: 'performance_test',
                        is_manual: Math.random() > 0.7, // 30% manual entries
                        notes: `Performance test entry - ${isIncoming ? 'incoming' : 'outgoing'}`,
                        created_at: date.toISOString()
                    });
                }

                // Insert batch
                for (const record of batchRecords) {
                    await this.db.execute(
                        `INSERT INTO ledger_entries 
                         (date, time, type, category, description, amount, customer_id, payment_channel_id, 
                          payment_method, reference_id, reference_type, is_manual, notes, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [record.date, record.time, record.type, record.category, record.description,
                        record.amount, record.customer_id, record.payment_channel_id, record.payment_method,
                        record.reference_id, record.reference_type, record.is_manual, record.notes, record.created_at]
                    );
                }

                console.log(`📊 Batch ${batch + 1}/${batches} completed (${(batch + 1) * batchSize} entries)`);
            }

            const endTime = performance.now();
            console.log(`✅ Generated ${count} daily ledger entries in ${(endTime - startTime).toFixed(2)}ms`);

        } catch (error) {
            console.error('❌ Failed to generate daily ledger data:', error);
            throw error;
        }
    }

    generateLedgerDescription(isIncoming) {
        if (isIncoming) {
            const descriptions = [
                'Cash Sale Payment', 'Credit Payment Received', 'Bank Transfer Received',
                'Customer Payment', 'Advance Payment', 'Invoice Payment', 'Cash Collection'
            ];
            return descriptions[Math.floor(Math.random() * descriptions.length)];
        } else {
            const descriptions = [
                'Purchase Payment', 'Salary Payment', 'Utility Bill', 'Office Expense',
                'Transport Cost', 'Material Purchase', 'Vendor Payment', 'Operating Expense'
            ];
            return descriptions[Math.floor(Math.random() * descriptions.length)];
        }
    }

    getRandomPaymentMethod() {
        const methods = ['Cash', 'Bank Transfer', 'Cheque', 'Credit Card', 'Online Transfer', 'Mobile Banking'];
        return methods[Math.floor(Math.random() * methods.length)];
    }

    // Helper methods to create sample supporting data
    async createSampleProducts() {
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
            { name: 'Galvanized Pipes', price: 1800, stock: 90 }
        ];

        for (const product of products) {
            await this.db.execute(
                `INSERT OR IGNORE INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)`,
                [product.name, product.price, product.stock, 'Iron & Steel']
            );
        }
    }

    async createSampleCustomers() {
        for (let i = 0; i < 50; i++) {
            const name = this.generateRandomName();
            const phone = `03${Math.floor(Math.random() * 900000000) + 100000000}`;
            const address = `Address ${i + 1}, City, Pakistan`;

            await this.db.execute(
                `INSERT OR IGNORE INTO customers (name, phone, address, customer_type) VALUES (?, ?, ?, ?)`,
                [name, phone, address, Math.random() > 0.5 ? 'regular' : 'wholesale']
            );
        }
    }

    async createSamplePaymentChannels() {
        const channels = [
            { name: 'Cash', type: 'cash' },
            { name: 'HBL Bank', type: 'bank' },
            { name: 'UBL Bank', type: 'bank' },
            { name: 'Meezan Bank', type: 'bank' },
            { name: 'JazzCash', type: 'mobile' },
            { name: 'EasyPaisa', type: 'mobile' },
            { name: 'Credit Card', type: 'card' }
        ];

        for (const channel of channels) {
            await this.db.execute(
                `INSERT OR IGNORE INTO payment_channels (name, type, is_active) VALUES (?, ?, ?)`,
                [channel.name, channel.type, 1]
            );
        }
    }

    /**
     * Generate all test data
     */
    async generateAllTestData() {
        console.log('🚀 Starting Performance Test Data Generation...');
        console.log('📊 Target: 1000+ Stock History, 10000+ Invoices, 200+ Daily Ledger');

        const totalStartTime = performance.now();

        try {
            await this.init();

            // Generate all test data
            await this.generateStockHistoryData(1200);
            await this.generateInvoiceData(12000);
            await this.generateDailyLedgerData(300);

            const totalEndTime = performance.now();

            console.log('\n✅ Performance Test Data Generation Complete!');
            console.log(`📊 Total Generation Time: ${(totalEndTime - totalStartTime).toFixed(2)}ms`);
            console.log('\n📈 Test Data Summary:');
            console.log('- 1200 Stock History Records ✅');
            console.log('- 12000 Invoice Records ✅');
            console.log('- 300 Daily Ledger Entries ✅');
            console.log('\n🎯 Ready for Performance Testing!');

        } catch (error) {
            console.error('❌ Test data generation failed:', error);
            throw error;
        }
    }

    /**
     * Clean up test data (optional)
     */
    async cleanupTestData() {
        console.log('🧹 Cleaning up test data...');

        try {
            await this.db.execute(`DELETE FROM stock_history WHERE created_by = 'performance-test'`);
            await this.db.execute(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE notes LIKE 'Performance test%')`);
            await this.db.execute(`DELETE FROM invoices WHERE notes LIKE 'Performance test%'`);
            await this.db.execute(`DELETE FROM ledger_entries WHERE reference_type = 'performance_test'`);

            console.log('✅ Test data cleanup complete');
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            throw error;
        }
    }
}

// Export for use in other scripts
export default PerformanceTestDataGenerator;

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const generator = new PerformanceTestDataGenerator();
    generator.generateAllTestData().catch(console.error);
}
