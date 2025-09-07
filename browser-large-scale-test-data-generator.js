/**
 * BROWSER-COMPATIBLE LARGE-SCALE TEST DATA GENERATOR
 * 
 * This version runs directly in the browser using your existing database service.
 * Generates massive interconnected datasets for stress testing.
 * 
 * Usage in browser console:
 * 1. const generator = new BrowserLargeScaleTestDataGenerator();
 * 2. await generator.generateAllData();
 * 3. await generator.validateGeneratedData();
 */

class BrowserLargeScaleTestDataGenerator {
    constructor() {
        this.db = null;
        this.startTime = Date.now();
        this.currentOperation = '';
        this.batchSize = 200; // Smaller batches for browser stability
        this.generatedData = {
            products: [],
            vendors: [],
            customers: [],
            paymentChannels: [],
            stockReceiving: [],
            invoices: [],
            stockMovements: [],
            ledgerEntries: []
        };
    }

    async init() {
        try {
            console.log('🔧 Initializing database connection...');

            // Use existing database service from window
            if (typeof window !== 'undefined' && window.db) {
                this.db = window.db;
                console.log('✅ Using existing database connection');
            } else {
                // Try to import the database service
                const { db } = await import('/src/services/database.js');
                this.db = db;
                console.log('✅ Database service imported');
            }

            // Ensure database is initialized
            if (this.db.initialize) {
                await this.db.initialize();
            }

            console.log('✅ Database ready for large-scale operations');
        } catch (error) {
            console.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    logProgress(message) {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        console.log(`[${elapsed}s] ${message}`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateRandomDate(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
        return new Date(randomTime);
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    generateRandomAmount(min = 100, max = 50000) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    generateRandomQuantity(min = 1, max = 1000) {
        return (Math.random() * (max - min) + min).toFixed(2);
    }

    generateRandomName() {
        const firstNames = ['Ahmed', 'Ali', 'Hassan', 'Hussein', 'Omar', 'Yasir', 'Tariq', 'Saeed', 'Rashid', 'Khalid', 'Muhammad', 'Abdul', 'Usman', 'Bilal', 'Imran'];
        const lastNames = ['Khan', 'Ahmed', 'Ali', 'Hassan', 'Sheikh', 'Malik', 'Qureshi', 'Butt', 'Chaudhry', 'Siddiqui', 'Raja', 'Mirza', 'Shah', 'Dar', 'Awan'];
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }

    generateRandomCompanyName() {
        const types = ['Steel Works', 'Iron Industries', 'Construction Co.', 'Building Materials', 'Hardware Store', 'Trading Co.', 'Enterprises', 'Corporation', 'Suppliers', 'Distributors'];
        const prefixes = ['Al-Haq', 'Al-Noor', 'Al-Madina', 'Pak', 'Royal', 'Golden', 'Prime', 'Elite', 'Metro', 'City', 'National', 'International'];
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${types[Math.floor(Math.random() * types.length)]}`;
    }

    generateRandomPhone() {
        const prefixes = ['0300', '0301', '0302', '0303', '0304', '0305', '0306', '0307', '0308', '0309', '0321', '0322', '0323', '0324', '0325'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const number = Math.floor(Math.random() * 9000000) + 1000000;
        return `${prefix}${number}`;
    }

    generateRandomAddress() {
        const areas = ['Gulberg', 'DHA', 'Cantt', 'Model Town', 'Johar Town', 'Garden Town', 'Faisal Town', 'Iqbal Town', 'Shadman', 'Liberty'];
        const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot'];
        const area = areas[Math.floor(Math.random() * areas.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const house = Math.floor(Math.random() * 999) + 1;
        const street = Math.floor(Math.random() * 50) + 1;
        return `House ${house}, Street ${street}, ${area}, ${city}, Pakistan`;
    }

    async executeBatch(records, createFunction, description) {
        try {
            let successCount = 0;
            let errorCount = 0;

            for (const record of records) {
                try {
                    await createFunction(record);
                    successCount++;
                } catch (error) {
                    console.warn(`⚠️ Failed to create ${description}:`, error.message);
                    errorCount++;

                    // Continue with other records instead of failing the entire batch
                    if (errorCount > records.length * 0.1) { // If more than 10% fail, stop
                        throw new Error(`Too many failures in batch: ${errorCount}/${records.length}`);
                    }
                }
            }

            this.logProgress(`✅ ${description} (${successCount} created, ${errorCount} failed)`);

            // Small delay to prevent browser freeze
            await this.delay(10);

        } catch (error) {
            console.error(`❌ Failed batch: ${description}`, error);
            throw error;
        }
    }

    // ========================================
    // 1. PRODUCTS GENERATOR (100+ Products)
    // ========================================

    async generateProducts() {
        this.currentOperation = 'Generating Products';
        this.logProgress('🏭 Starting product generation...');

        const productCategories = [
            { name: 'Iron Rods', items: ['Iron Rod 6mm', 'Iron Rod 8mm', 'Iron Rod 10mm', 'Iron Rod 12mm', 'Iron Rod 16mm', 'Iron Rod 20mm', 'Iron Rod 25mm', 'Iron Rod 32mm'] },
            { name: 'Steel Pipes', items: ['Steel Pipe 1/2 inch', 'Steel Pipe 3/4 inch', 'Steel Pipe 1 inch', 'Steel Pipe 1.5 inch', 'Steel Pipe 2 inch', 'Steel Pipe 3 inch', 'Steel Pipe 4 inch'] },
            { name: 'Steel Beams', items: ['H-Beam 100mm', 'H-Beam 150mm', 'H-Beam 200mm', 'I-Beam 100mm', 'I-Beam 150mm', 'I-Beam 200mm', 'C-Channel 100mm', 'C-Channel 150mm'] },
            { name: 'Wire & Mesh', items: ['Wire Mesh 4x4', 'Wire Mesh 6x6', 'Wire Mesh 8x8', 'Barbed Wire', 'Binding Wire', 'Galvanized Wire', 'Chicken Mesh'] },
            { name: 'Sheets & Plates', items: ['Iron Sheet 18G', 'Iron Sheet 20G', 'Iron Sheet 22G', 'Galvanized Sheet', 'Aluminum Sheet', 'Steel Plate 5mm', 'Steel Plate 10mm'] },
            { name: 'Angles & Channels', items: ['Steel Angle 25x25', 'Steel Angle 40x40', 'Steel Angle 50x50', 'Steel Angle 75x75', 'Steel Channel 75mm', 'Steel Channel 100mm'] },
            { name: 'Fasteners', items: ['Bolts & Nuts M8', 'Bolts & Nuts M10', 'Bolts & Nuts M12', 'Washers', 'Screws', 'Rivets', 'Anchors'] },
            { name: 'Tools & Equipment', items: ['Welding Rod', 'Cutting Disc', 'Grinding Disc', 'Safety Equipment', 'Measuring Tools', 'Hand Tools'] }
        ];

        const products = [];

        for (const category of productCategories) {
            for (const item of category.items) {
                const variations = ['Standard', 'Premium', 'Heavy Duty'];

                for (const variation of variations) {
                    const productName = variation === 'Standard' ? item : `${item} (${variation})`;

                    products.push({
                        name: productName,
                        category: category.name,
                        sku: `SKU-${String(products.length + 1).padStart(6, '0')}`,
                        barcode: `${1000000000 + products.length + 1}`,
                        unit: this.getUnitForCategory(category.name),
                        current_stock: this.generateRandomQuantity(10, 1000),
                        cost_price: this.generateRandomAmount(50, 2000),
                        selling_price: this.generateRandomAmount(100, 3000),
                        min_stock_alert: this.generateRandomQuantity(5, 50),
                        is_active: 1
                    });
                }
            }
        }

        // Insert products in batches
        const totalProducts = products.length;
        this.logProgress(`📦 Creating ${totalProducts} products in batches...`);

        for (let i = 0; i < products.length; i += this.batchSize) {
            const batch = products.slice(i, i + this.batchSize);

            await this.executeBatch(
                batch,
                (product) => this.db.createProduct(product),
                `Products batch ${Math.floor(i / this.batchSize) + 1}`
            );
        }

        // Store generated products for later reference
        this.generatedData.products = await this.db.getProducts();
        this.logProgress(`✅ Generated ${this.generatedData.products.length} products`);
    }

    getUnitForCategory(category) {
        const units = {
            'Iron Rods': 'kg',
            'Steel Pipes': 'feet',
            'Steel Beams': 'feet',
            'Wire & Mesh': 'kg',
            'Sheets & Plates': 'piece',
            'Angles & Channels': 'feet',
            'Fasteners': 'piece',
            'Tools & Equipment': 'piece'
        };
        return units[category] || 'piece';
    }

    // ========================================
    // 2. VENDORS GENERATOR (100+ Vendors)
    // ========================================

    async generateVendors() {
        this.currentOperation = 'Generating Vendors';
        this.logProgress('🏢 Starting vendor generation...');

        const vendors = [];

        for (let i = 1; i <= 150; i++) {
            const companyName = this.generateRandomCompanyName();
            const contactPerson = this.generateRandomName();

            vendors.push({
                vendor_code: `VND-${String(i).padStart(6, '0')}`,
                name: companyName,
                company_name: companyName,
                contact_person: contactPerson,
                phone: this.generateRandomPhone(),
                email: `${contactPerson.toLowerCase().replace(/\s+/g, '.')}@${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
                address: this.generateRandomAddress(),
                category: this.getRandomVendorCategory(),
                credit_limit: this.generateRandomAmount(50000, 500000),
                credit_days: Math.floor(Math.random() * 90) + 15,
                payment_terms: this.getRandomPaymentTerms(),
                is_active: Math.random() > 0.1 ? 1 : 0, // 90% active
                rating: Math.floor(Math.random() * 5) + 1
            });
        }

        // Insert vendors in batches
        this.logProgress(`🏭 Creating ${vendors.length} vendors in batches...`);

        for (let i = 0; i < vendors.length; i += this.batchSize) {
            const batch = vendors.slice(i, i + this.batchSize);

            await this.executeBatch(
                batch,
                (vendor) => this.db.createVendor(vendor),
                `Vendors batch ${Math.floor(i / this.batchSize) + 1}`
            );
        }

        // Store generated vendors for later reference
        this.generatedData.vendors = await this.db.getVendors();
        this.logProgress(`✅ Generated ${this.generatedData.vendors.length} vendors`);
    }

    getRandomVendorCategory() {
        const categories = ['supplier', 'manufacturer', 'distributor', 'wholesaler', 'contractor'];
        return categories[Math.floor(Math.random() * categories.length)];
    }

    getRandomPaymentTerms() {
        const terms = ['cash', 'net_15', 'net_30', 'net_45', 'net_60', '2/10_net_30'];
        return terms[Math.floor(Math.random() * terms.length)];
    }

    // ========================================
    // 3. CUSTOMERS GENERATOR (10,000+ Customers)
    // ========================================

    async generateCustomers() {
        this.currentOperation = 'Generating Customers';
        this.logProgress('👥 Starting customer generation...');

        const targetCustomers = 10000;
        this.logProgress(`📋 Creating ${targetCustomers} customers in batches...`);

        for (let batch = 0; batch < Math.ceil(targetCustomers / this.batchSize); batch++) {
            const customers = [];
            const batchStart = batch * this.batchSize;
            const batchEnd = Math.min(batchStart + this.batchSize, targetCustomers);

            for (let i = batchStart; i < batchEnd; i++) {
                const customerName = this.generateRandomName();
                const isCompany = Math.random() > 0.7; // 30% companies

                customers.push({
                    customer_code: `CUST-${String(i + 1).padStart(6, '0')}`,
                    name: isCompany ? this.generateRandomCompanyName() : customerName,
                    phone: this.generateRandomPhone(),
                    address: this.generateRandomAddress(),
                    email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
                    balance: this.generateRandomAmount(-50000, 100000),
                    credit_limit: this.generateRandomAmount(10000, 200000),
                    is_active: Math.random() > 0.05 ? 1 : 0, // 95% active
                    payment_terms: this.getRandomPaymentTerms(),
                    category: isCompany ? 'wholesale' : 'retail'
                });
            }

            await this.executeBatch(
                customers,
                (customer) => this.db.createCustomer(customer),
                `Customers batch ${batch + 1}/${Math.ceil(targetCustomers / this.batchSize)}`
            );
        }

        // Store generated customers for later reference
        this.generatedData.customers = await this.db.getCustomers();
        this.logProgress(`✅ Generated ${this.generatedData.customers.length} customers`);
    }

    // ========================================
    // 4. STOCK RECEIVING GENERATOR (10,000+ Records)
    // ========================================

    async generateStockReceiving() {
        this.currentOperation = 'Generating Stock Receiving';
        this.logProgress('📦 Starting stock receiving generation...');

        const targetReceivings = 10000;
        this.logProgress(`🚚 Creating ${targetReceivings} stock receiving records in batches...`);

        for (let batch = 0; batch < Math.ceil(targetReceivings / this.batchSize); batch++) {
            const receivings = [];
            const batchStart = batch * this.batchSize;
            const batchEnd = Math.min(batchStart + this.batchSize, targetReceivings);

            for (let i = batchStart; i < batchEnd; i++) {
                const vendor = this.generatedData.vendors[Math.floor(Math.random() * this.generatedData.vendors.length)];
                const receivingDate = this.generateRandomDate('2023-01-01', '2025-09-06');
                const totalValue = this.generateRandomAmount(5000, 100000);

                // Create receiving with items
                const items = [];
                const itemCount = Math.floor(Math.random() * 5) + 1;

                for (let j = 0; j < itemCount; j++) {
                    const product = this.generatedData.products[Math.floor(Math.random() * this.generatedData.products.length)];
                    const quantity = this.generateRandomQuantity(1, 100);
                    const unitCost = product.cost_price * (0.8 + Math.random() * 0.4);

                    items.push({
                        product_id: product.id,
                        product_name: product.name,
                        received_quantity: quantity,
                        unit_cost: unitCost,
                        total_cost: quantity * unitCost
                    });
                }

                receivings.push({
                    vendor_id: vendor.id,
                    vendor_name: vendor.name,
                    received_date: this.formatDate(receivingDate),
                    received_time: this.formatTime(receivingDate),
                    items: items,
                    notes: `Bulk receiving from ${vendor.name}`
                });
            }

            await this.executeBatch(
                receivings,
                (receiving) => this.db.createStockReceiving(receiving),
                `Stock receiving batch ${batch + 1}/${Math.ceil(targetReceivings / this.batchSize)}`
            );
        }

        this.logProgress(`✅ Generated stock receiving records`);
    }

    // ========================================
    // 5. INVOICES GENERATOR (10,000+ Invoices)
    // ========================================

    async generateInvoices() {
        this.currentOperation = 'Generating Invoices';
        this.logProgress('🧾 Starting invoice generation...');

        const targetInvoices = 10000;
        this.logProgress(`📊 Creating ${targetInvoices} invoices in batches...`);

        for (let batch = 0; batch < Math.ceil(targetInvoices / this.batchSize); batch++) {
            const invoices = [];
            const batchStart = batch * this.batchSize;
            const batchEnd = Math.min(batchStart + this.batchSize, targetInvoices);

            for (let i = batchStart; i < batchEnd; i++) {
                const customer = this.generatedData.customers[Math.floor(Math.random() * this.generatedData.customers.length)];
                const invoiceDate = this.generateRandomDate('2023-01-01', '2025-09-06');

                // Create invoice items
                const items = [];
                const itemCount = Math.floor(Math.random() * 5) + 1;

                for (let j = 0; j < itemCount; j++) {
                    const product = this.generatedData.products[Math.floor(Math.random() * this.generatedData.products.length)];
                    const quantity = this.generateRandomQuantity(1, 50);
                    const unitPrice = product.selling_price * (0.9 + Math.random() * 0.2);

                    items.push({
                        product_id: product.id,
                        product_name: product.name,
                        quantity: quantity,
                        unit_price: unitPrice,
                        total_price: quantity * unitPrice
                    });
                }

                const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
                const discount = Math.random() > 0.7 ? Math.random() * 10 : 0;
                const paymentAmount = Math.random() > 0.3 ? subtotal * (1 - discount / 100) : 0;

                invoices.push({
                    customer_id: customer.id,
                    customer_name: customer.name,
                    customer_phone: customer.phone,
                    customer_address: customer.address,
                    items: items,
                    discount: discount,
                    payment_amount: paymentAmount,
                    payment_method: this.getRandomPaymentMethod(),
                    notes: `Invoice for ${customer.name}`,
                    date: this.formatDate(invoiceDate)
                });
            }

            await this.executeBatch(
                invoices,
                (invoice) => this.db.createInvoice(invoice),
                `Invoices batch ${batch + 1}/${Math.ceil(targetInvoices / this.batchSize)}`
            );
        }

        this.logProgress(`✅ Generated invoices`);
    }

    getRandomPaymentMethod() {
        const methods = ['cash', 'bank', 'cheque', 'card', 'online'];
        const weights = [0.4, 0.3, 0.15, 0.1, 0.05];
        return this.weightedRandom(methods, weights);
    }

    weightedRandom(items, weights) {
        const random = Math.random();
        let weightSum = 0;

        for (let i = 0; i < items.length; i++) {
            weightSum += weights[i];
            if (random <= weightSum) {
                return items[i];
            }
        }

        return items[items.length - 1];
    }

    // ========================================
    // MAIN EXECUTION METHODS
    // ========================================

    async generateAllData() {
        const totalStart = Date.now();

        try {
            console.log('🚀 STARTING BROWSER LARGE-SCALE TEST DATA GENERATION');
            console.log('====================================================');
            console.log('📊 Target Data:');
            console.log('   • 100+ Products with variations');
            console.log('   • 150 Vendors with complete details');
            console.log('   • 10,000 Customers with proper balances');
            console.log('   • 10,000 Stock Receiving records with items');
            console.log('   • 10,000 Invoices with multiple items');
            console.log('====================================================\n');

            await this.init();

            // Generate all data in correct order (respecting foreign keys)
            await this.generateProducts();
            await this.generateVendors();
            await this.generateCustomers();
            await this.generateStockReceiving();
            await this.generateInvoices();

            const totalTime = ((Date.now() - totalStart) / 1000).toFixed(1);

            console.log('\n🎉 BROWSER TEST DATA GENERATION COMPLETE!');
            console.log('==========================================');
            console.log(`⏱️  Total Generation Time: ${totalTime} seconds`);
            console.log('\n📊 Final Data Summary:');
            console.log(`   ✅ Products: ${this.generatedData.products.length}`);
            console.log(`   ✅ Vendors: ${this.generatedData.vendors.length}`);
            console.log(`   ✅ Customers: ${this.generatedData.customers.length}`);
            console.log('\n🚀 Your software is now ready for large-scale testing!');
            console.log('==========================================');

        } catch (error) {
            console.error(`❌ Generation failed during: ${this.currentOperation}`);
            console.error('Error details:', error);
            throw error;
        }
    }

    async validateGeneratedData() {
        this.logProgress('🔍 Validating generated data...');

        try {
            // Get current counts
            const products = await this.db.getProducts();
            const vendors = await this.db.getVendors();
            const customers = await this.db.getCustomers();

            console.log('\n📊 Data Validation Results:');
            console.log('===========================');
            console.log(`Products: ${products.length}`);
            console.log(`Vendors: ${vendors.length}`);
            console.log(`Customers: ${customers.length}`);

            const isValid = products.length > 0 && vendors.length > 0 && customers.length > 0;

            if (isValid) {
                console.log('✅ All data generated successfully');
            } else {
                console.log('⚠️  Warning: Some data may not have been generated');
            }

            return {
                counts: {
                    products: products.length,
                    vendors: vendors.length,
                    customers: customers.length
                },
                valid: isValid
            };

        } catch (error) {
            console.error('❌ Validation failed:', error);
            return { valid: false, error };
        }
    }

    async generateSpecificDataset(type, count) {
        await this.init();

        switch (type) {
            case 'products':
                this.generatedData.products = await this.db.getProducts();
                if (this.generatedData.products.length === 0) {
                    await this.generateProducts();
                }
                break;

            case 'vendors':
                this.generatedData.vendors = await this.db.getVendors();
                if (this.generatedData.vendors.length === 0) {
                    await this.generateVendors();
                }
                break;

            case 'customers':
                this.generatedData.customers = await this.db.getCustomers();
                if (this.generatedData.customers.length < count) {
                    await this.generateCustomers();
                }
                break;

            case 'invoices':
                // Ensure dependencies exist
                await this.generateSpecificDataset('products', 100);
                await this.generateSpecificDataset('customers', 1000);
                await this.generateInvoices();
                break;

            case 'receiving':
                // Ensure dependencies exist
                await this.generateSpecificDataset('products', 100);
                await this.generateSpecificDataset('vendors', 100);
                await this.generateStockReceiving();
                break;
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.BrowserLargeScaleTestDataGenerator = BrowserLargeScaleTestDataGenerator;

    // Convenience functions
    window.generateLargeTestData = async function () {
        const generator = new BrowserLargeScaleTestDataGenerator();
        await generator.generateAllData();
        await generator.validateGeneratedData();
        return generator;
    };

    window.validateTestData = async function () {
        const generator = new BrowserLargeScaleTestDataGenerator();
        return await generator.validateGeneratedData();
    };

    console.log('💡 Large-scale test data generator loaded!');
    console.log('📋 Available commands:');
    console.log('   • generateLargeTestData() - Generate all test data');
    console.log('   • validateTestData() - Validate existing data');
    console.log('   • new BrowserLargeScaleTestDataGenerator() - Create custom generator');
}

export default BrowserLargeScaleTestDataGenerator;
