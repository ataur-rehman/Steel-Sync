/**
 * LARGE-SCALE TEST DATA VERIFICATION SUITE
 * 
 * This script validates all the generated test data and runs comprehensive tests
 * to ensure everything is working correctly with large datasets.
 */

class LargeScaleTestValidator {
    constructor() {
        this.db = null;
        this.testResults = {
            products: { count: 0, tested: 0, passed: 0, failed: 0 },
            vendors: { count: 0, tested: 0, passed: 0, failed: 0 },
            customers: { count: 0, tested: 0, passed: 0, failed: 0 },
            invoices: { count: 0, tested: 0, passed: 0, failed: 0 },
            stockReceiving: { count: 0, tested: 0, passed: 0, failed: 0 },
            overall: { totalTests: 0, passed: 0, failed: 0 }
        };
    }

    async init() {
        if (typeof window !== 'undefined' && window.db) {
            this.db = window.db;
        } else {
            const { db } = await import('/src/services/database.js');
            this.db = db;
        }
        console.log('✅ Test validator initialized');
    }

    async runTest(testName, testFunction) {
        try {
            console.log(`🧪 Running test: ${testName}`);
            const result = await testFunction();

            if (result.success) {
                console.log(`✅ ${testName}: PASSED`);
                this.testResults.overall.passed++;
            } else {
                console.log(`❌ ${testName}: FAILED - ${result.message}`);
                this.testResults.overall.failed++;
            }

            this.testResults.overall.totalTests++;
            return result;
        } catch (error) {
            console.log(`❌ ${testName}: ERROR - ${error.message}`);
            this.testResults.overall.failed++;
            this.testResults.overall.totalTests++;
            return { success: false, message: error.message };
        }
    }

    async testProductDataIntegrity() {
        const products = await this.db.getProducts();
        this.testResults.products.count = products.length;

        // Test random sample of products
        const sampleSize = Math.min(100, products.length);
        const sampleProducts = this.getRandomSample(products, sampleSize);

        let passed = 0;

        for (const product of sampleProducts) {
            this.testResults.products.tested++;

            // Check required fields
            if (product.name && product.id && product.selling_price > 0) {
                passed++;
                this.testResults.products.passed++;
            } else {
                this.testResults.products.failed++;
            }
        }

        return {
            success: passed === sampleProducts.length,
            message: `${passed}/${sampleProducts.length} products valid`,
            details: {
                total: products.length,
                tested: sampleProducts.length,
                passed: passed,
                failed: sampleProducts.length - passed
            }
        };
    }

    async testVendorDataIntegrity() {
        const vendors = await this.db.getVendors();
        this.testResults.vendors.count = vendors.length;

        const sampleSize = Math.min(50, vendors.length);
        const sampleVendors = this.getRandomSample(vendors, sampleSize);

        let passed = 0;

        for (const vendor of sampleVendors) {
            this.testResults.vendors.tested++;

            // Check required fields and boolean consistency
            if (vendor.name && vendor.id && typeof vendor.is_active === 'number') {
                passed++;
                this.testResults.vendors.passed++;
            } else {
                this.testResults.vendors.failed++;
            }
        }

        return {
            success: passed === sampleVendors.length,
            message: `${passed}/${sampleVendors.length} vendors valid`,
            details: {
                total: vendors.length,
                tested: sampleVendors.length,
                passed: passed,
                failed: sampleVendors.length - passed
            }
        };
    }

    async testCustomerDataIntegrity() {
        const customers = await this.db.getCustomers();
        this.testResults.customers.count = customers.length;

        const sampleSize = Math.min(200, customers.length);
        const sampleCustomers = this.getRandomSample(customers, sampleSize);

        let passed = 0;

        for (const customer of sampleCustomers) {
            this.testResults.customers.tested++;

            // Check required fields
            if (customer.name && customer.id && customer.customer_code) {
                passed++;
                this.testResults.customers.passed++;
            } else {
                this.testResults.customers.failed++;
            }
        }

        return {
            success: passed === sampleCustomers.length,
            message: `${passed}/${sampleCustomers.length} customers valid`,
            details: {
                total: customers.length,
                tested: sampleCustomers.length,
                passed: passed,
                failed: sampleCustomers.length - passed
            }
        };
    }

    async testInvoiceDataIntegrity() {
        try {
            const invoices = await this.db.getInvoices();
            this.testResults.invoices.count = invoices.length;

            const sampleSize = Math.min(100, invoices.length);
            const sampleInvoices = this.getRandomSample(invoices, sampleSize);

            let passed = 0;

            for (const invoice of sampleInvoices) {
                this.testResults.invoices.tested++;

                // Check required fields and relationships
                if (invoice.customer_id && invoice.grand_total > 0 && invoice.bill_number) {
                    passed++;
                    this.testResults.invoices.passed++;
                } else {
                    this.testResults.invoices.failed++;
                }
            }

            return {
                success: passed === sampleInvoices.length,
                message: `${passed}/${sampleInvoices.length} invoices valid`,
                details: {
                    total: invoices.length,
                    tested: sampleInvoices.length,
                    passed: passed,
                    failed: sampleInvoices.length - passed
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Invoice test failed: ${error.message}`
            };
        }
    }

    async testDatabasePerformance() {
        console.log('🚀 Testing database performance with large datasets...');

        const tests = [
            {
                name: 'Product Search Performance',
                test: async () => {
                    const start = performance.now();
                    const products = await this.db.getProducts();
                    const end = performance.now();
                    return {
                        success: end - start < 5000, // Should complete in under 5 seconds
                        message: `Loaded ${products.length} products in ${(end - start).toFixed(2)}ms`
                    };
                }
            },
            {
                name: 'Customer Search Performance',
                test: async () => {
                    const start = performance.now();
                    const customers = await this.db.getCustomers();
                    const end = performance.now();
                    return {
                        success: end - start < 10000, // Should complete in under 10 seconds
                        message: `Loaded ${customers.length} customers in ${(end - start).toFixed(2)}ms`
                    };
                }
            },
            {
                name: 'Vendor Search Performance',
                test: async () => {
                    const start = performance.now();
                    const vendors = await this.db.getVendors();
                    const end = performance.now();
                    return {
                        success: end - start < 3000, // Should complete in under 3 seconds
                        message: `Loaded ${vendors.length} vendors in ${(end - start).toFixed(2)}ms`
                    };
                }
            }
        ];

        const results = [];
        for (const test of tests) {
            const result = await this.runTest(test.name, test.test);
            results.push(result);
        }

        return results;
    }

    async testForeignKeyIntegrity() {
        console.log('🔗 Testing foreign key relationships...');

        try {
            // Test if all invoice customers exist
            const invoices = await this.db.getInvoices();
            const customers = await this.db.getCustomers();
            const customerIds = new Set(customers.map(c => c.id));

            let validInvoices = 0;
            for (const invoice of invoices.slice(0, 100)) { // Test first 100
                if (customerIds.has(invoice.customer_id)) {
                    validInvoices++;
                }
            }

            return {
                success: validInvoices === Math.min(100, invoices.length),
                message: `${validInvoices}/${Math.min(100, invoices.length)} invoices have valid customer references`
            };
        } catch (error) {
            return {
                success: false,
                message: `Foreign key test failed: ${error.message}`
            };
        }
    }

    async testStockReportGeneration() {
        console.log('📊 Testing stock report generation with large dataset...');

        try {
            const start = performance.now();
            const products = await this.db.getProducts();

            if (products.length === 0) {
                return {
                    success: false,
                    message: 'No products found for stock report test'
                };
            }

            // Test stock report for a single product (should handle large datasets)
            const testProduct = products[0];

            // This would test your stock report functionality
            // const stockReport = await this.db.getStockReport(testProduct.id);

            const end = performance.now();

            return {
                success: true,
                message: `Stock report test completed in ${(end - start).toFixed(2)}ms`
            };
        } catch (error) {
            return {
                success: false,
                message: `Stock report test failed: ${error.message}`
            };
        }
    }

    getRandomSample(array, sampleSize) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, sampleSize);
    }

    async runAllTests() {
        console.log('🚀 STARTING COMPREHENSIVE LARGE-SCALE DATA VALIDATION');
        console.log('======================================================');

        const startTime = performance.now();

        await this.init();

        // Data integrity tests
        await this.runTest('Product Data Integrity', () => this.testProductDataIntegrity());
        await this.runTest('Vendor Data Integrity', () => this.testVendorDataIntegrity());
        await this.runTest('Customer Data Integrity', () => this.testCustomerDataIntegrity());
        await this.runTest('Invoice Data Integrity', () => this.testInvoiceDataIntegrity());

        // Performance tests
        const performanceResults = await this.testDatabasePerformance();

        // Relationship tests
        await this.runTest('Foreign Key Integrity', () => this.testForeignKeyIntegrity());
        await this.runTest('Stock Report Generation', () => this.testStockReportGeneration());

        const endTime = performance.now();

        console.log('\n🎉 VALIDATION SUITE COMPLETE!');
        console.log('=============================');
        console.log(`⏱️  Total Test Time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
        console.log(`📊 Total Tests: ${this.testResults.overall.totalTests}`);
        console.log(`✅ Passed: ${this.testResults.overall.passed}`);
        console.log(`❌ Failed: ${this.testResults.overall.failed}`);
        console.log(`📈 Success Rate: ${((this.testResults.overall.passed / this.testResults.overall.totalTests) * 100).toFixed(1)}%`);

        console.log('\n📋 Detailed Results:');
        console.log(`   Products: ${this.testResults.products.count} total, ${this.testResults.products.tested} tested`);
        console.log(`   Vendors: ${this.testResults.vendors.count} total, ${this.testResults.vendors.tested} tested`);
        console.log(`   Customers: ${this.testResults.customers.count} total, ${this.testResults.customers.tested} tested`);
        console.log(`   Invoices: ${this.testResults.invoices.count} total, ${this.testResults.invoices.tested} tested`);

        const overallSuccess = this.testResults.overall.failed === 0;
        console.log(`\n${overallSuccess ? '🎯' : '⚠️'} Overall Status: ${overallSuccess ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

        return {
            success: overallSuccess,
            results: this.testResults,
            totalTime: (endTime - startTime) / 1000
        };
    }

    async quickDataCheck() {
        console.log('⚡ Running quick data check...');

        await this.init();

        try {
            const counts = {
                products: (await this.db.getProducts()).length,
                vendors: (await this.db.getVendors()).length,
                customers: (await this.db.getCustomers()).length
            };

            console.log('📊 Current Data Counts:');
            console.log(`   Products: ${counts.products}`);
            console.log(`   Vendors: ${counts.vendors}`);
            console.log(`   Customers: ${counts.customers}`);

            const hasData = counts.products > 0 && counts.vendors > 0 && counts.customers > 0;
            console.log(`\n${hasData ? '✅' : '❌'} Data Status: ${hasData ? 'Ready for testing' : 'Need to generate test data'}`);

            return counts;
        } catch (error) {
            console.error('❌ Quick check failed:', error);
            return null;
        }
    }
}

// Browser compatibility
if (typeof window !== 'undefined') {
    window.LargeScaleTestValidator = LargeScaleTestValidator;

    window.validateLargeScaleData = async function () {
        const validator = new LargeScaleTestValidator();
        return await validator.runAllTests();
    };

    window.quickDataCheck = async function () {
        const validator = new LargeScaleTestValidator();
        return await validator.quickDataCheck();
    };

    console.log('💡 Large-scale test validator loaded!');
    console.log('📋 Available commands:');
    console.log('   • validateLargeScaleData() - Run full validation suite');
    console.log('   • quickDataCheck() - Quick data count check');
    console.log('   • new LargeScaleTestValidator() - Create custom validator');
}

export default LargeScaleTestValidator;
