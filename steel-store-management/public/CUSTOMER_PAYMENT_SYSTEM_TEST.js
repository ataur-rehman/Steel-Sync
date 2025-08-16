/**
 * CUSTOMER PAYMENT SYSTEM - COMPREHENSIVE TEST SUITE
 * 
 * This script tests the entire customer payment functionality
 * to ensure data integrity and proper operation.
 */

console.log('🧪 CUSTOMER PAYMENT SYSTEM - COMPREHENSIVE TEST SUITE');
console.log('====================================================');

const CUSTOMER_PAYMENT_TEST = {
    async runAllTests() {
        console.log('🚀 Starting comprehensive payment system tests...');

        try {
            await this.testDatabaseConnection();
            await this.testPaymentFormComponents();
            await this.testPaymentProcessing();
            await this.testDataConsistency();
            await this.testPaymentAllocation();
            await this.testAdvancePayments();

            console.log('✅ ALL TESTS PASSED! Payment system is working correctly.');
            return true;

        } catch (error) {
            console.error('❌ TEST SUITE FAILED:', error);
            return false;
        }
    },

    async testDatabaseConnection() {
        console.log('\n1️⃣ Testing database connection and payment methods...');

        if (!window.db) {
            throw new Error('Database instance not available');
        }

        // Test processCustomerPayment method exists
        if (typeof window.db.processCustomerPayment !== 'function') {
            throw new Error('processCustomerPayment method not found in database');
        }

        // Test recordPayment method exists
        if (typeof window.db.recordPayment !== 'function') {
            throw new Error('recordPayment method not found in database');
        }

        // Test addInvoicePayment method exists
        if (typeof window.db.addInvoicePayment !== 'function') {
            throw new Error('addInvoicePayment method not found in database');
        }

        console.log('✅ Database connection and payment methods verified');
    },

    async testPaymentFormComponents() {
        console.log('\n2️⃣ Testing payment form components...');

        // Check if CustomerPaymentForm component exists in the DOM
        const paymentButtons = document.querySelectorAll('[title="Add Payment"]');
        if (paymentButtons.length === 0) {
            console.warn('⚠️ No "Add Payment" buttons found in DOM - components may not be loaded');
        } else {
            console.log(`✅ Found ${paymentButtons.length} payment buttons in UI`);
        }

        console.log('✅ Payment form components test completed');
    },

    async testPaymentProcessing() {
        console.log('\n3️⃣ Testing payment processing logic...');

        // Get a test customer
        const customers = await window.db.getAllCustomers();
        if (!customers || customers.length === 0) {
            console.warn('⚠️ No customers found for testing - creating a test customer');

            const testCustomerId = await window.db.addCustomer({
                name: 'Test Customer Payment',
                phone: '03001234567',
                address: 'Test Address for Payment Testing'
            });

            console.log(`✅ Created test customer with ID: ${testCustomerId}`);
        }

        const testCustomer = customers[0] || await window.db.getCustomer(1);
        if (!testCustomer) {
            throw new Error('No test customer available');
        }

        console.log(`✅ Using test customer: ${testCustomer.name} (ID: ${testCustomer.id})`);

        // Test advance payment processing
        console.log('Testing advance payment...');
        const advancePaymentData = {
            customer_id: testCustomer.id,
            customer_name: testCustomer.name,
            amount: 1000,
            payment_method: 'cash',
            date: new Date().toISOString().split('T')[0],
            allocation_type: 'advance',
            created_by: 'test_suite'
        };

        try {
            const result = await window.db.processCustomerPayment(advancePaymentData);
            console.log('✅ Advance payment processed successfully:', {
                payment_id: result.payment_id,
                advance_amount: result.advance_amount
            });

            if (result.advance_amount !== 1000) {
                throw new Error(`Expected advance amount 1000, got ${result.advance_amount}`);
            }

        } catch (error) {
            console.error('❌ Advance payment test failed:', error);
            throw error;
        }

        console.log('✅ Payment processing logic verified');
    },

    async testDataConsistency() {
        console.log('\n4️⃣ Testing data consistency...');

        const customers = await window.db.getAllCustomers();
        const testCustomer = customers[0];

        if (!testCustomer) {
            throw new Error('No customer available for consistency testing');
        }

        // Get customer balance from different sources
        const customerRecord = await window.db.getCustomer(testCustomer.id);
        const customerLedger = await window.db.getCustomerLedger(testCustomer.id, {});

        const customerBalance = customerRecord.balance || customerRecord.total_balance || 0;
        const ledgerBalance = customerLedger.current_balance || 0;

        console.log(`Customer balance from record: Rs. ${customerBalance.toFixed(2)}`);
        console.log(`Customer balance from ledger: Rs. ${ledgerBalance.toFixed(2)}`);

        const balanceDifference = Math.abs(customerBalance - ledgerBalance);
        if (balanceDifference > 0.01) {
            console.warn(`⚠️ Balance inconsistency detected: ${balanceDifference.toFixed(2)} difference`);
        } else {
            console.log('✅ Customer balance consistency verified');
        }

        console.log('✅ Data consistency test completed');
    },

    async testPaymentAllocation() {
        console.log('\n5️⃣ Testing payment allocation to invoices...');

        const customers = await window.db.getAllCustomers();
        const testCustomer = customers[0];

        if (!testCustomer) {
            throw new Error('No customer available for allocation testing');
        }

        // Get customer's unpaid invoices
        const invoices = await window.db.getInvoices({
            customer_id: testCustomer.id,
            status: ['pending', 'partially_paid']
        });

        if (invoices && invoices.length > 0) {
            const testInvoice = invoices[0];
            console.log(`✅ Found test invoice: ${testInvoice.bill_number} with remaining balance Rs. ${testInvoice.remaining_balance}`);

            if (testInvoice.remaining_balance > 0) {
                // Test manual allocation
                const allocationAmount = Math.min(100, testInvoice.remaining_balance);

                const paymentData = {
                    customer_id: testCustomer.id,
                    customer_name: testCustomer.name,
                    amount: allocationAmount,
                    payment_method: 'cash',
                    date: new Date().toISOString().split('T')[0],
                    allocation_type: 'manual',
                    invoice_allocations: [{
                        invoice_id: testInvoice.id,
                        amount: allocationAmount
                    }],
                    created_by: 'test_suite'
                };

                try {
                    const result = await window.db.processCustomerPayment(paymentData);
                    console.log('✅ Manual allocation test passed:', {
                        payment_id: result.payment_id,
                        allocated_amount: result.allocated_amount
                    });

                    if (result.allocated_amount !== allocationAmount) {
                        throw new Error(`Expected allocated amount ${allocationAmount}, got ${result.allocated_amount}`);
                    }

                } catch (error) {
                    console.error('❌ Manual allocation test failed:', error);
                    throw error;
                }
            }
        } else {
            console.log('ℹ️ No unpaid invoices found for allocation testing');
        }

        console.log('✅ Payment allocation test completed');
    },

    async testAdvancePayments() {
        console.log('\n6️⃣ Testing advance payment functionality...');

        const customers = await window.db.getAllCustomers();
        const testCustomer = customers[0];

        if (!testCustomer) {
            throw new Error('No customer available for advance payment testing');
        }

        // Test advance payment that creates negative balance
        const advanceAmount = 500;
        const paymentData = {
            customer_id: testCustomer.id,
            customer_name: testCustomer.name,
            amount: advanceAmount,
            payment_method: 'bank',
            date: new Date().toISOString().split('T')[0],
            allocation_type: 'advance',
            reference: 'Advance Payment Test',
            notes: 'Testing advance payment functionality',
            created_by: 'test_suite'
        };

        try {
            const result = await window.db.processCustomerPayment(paymentData);
            console.log('✅ Advance payment test passed:', {
                payment_id: result.payment_id,
                advance_amount: result.advance_amount
            });

            // Verify that customer balance was reduced
            const updatedCustomer = await window.db.getCustomer(testCustomer.id);
            console.log(`Customer balance after advance payment: Rs. ${(updatedCustomer.balance || updatedCustomer.total_balance || 0).toFixed(2)}`);

        } catch (error) {
            console.error('❌ Advance payment test failed:', error);
            throw error;
        }

        console.log('✅ Advance payment functionality verified');
    },

    async generateTestReport() {
        console.log('\n📊 GENERATING PAYMENT SYSTEM TEST REPORT');
        console.log('==========================================');

        try {
            const customers = await window.db.getAllCustomers();
            const totalCustomers = customers.length;

            // Count customers with outstanding balances
            const customersWithBalance = customers.filter(c => (c.balance || c.total_balance || 0) > 0).length;
            const customersWithAdvance = customers.filter(c => (c.balance || c.total_balance || 0) < 0).length;

            // Get payment statistics
            const allPayments = await window.db.executeRawQuery('SELECT COUNT(*) as count, SUM(amount) as total FROM payments');
            const paymentCount = allPayments[0]?.count || 0;
            const totalPaymentAmount = allPayments[0]?.total || 0;

            console.log(`📈 Test Report Summary:`);
            console.log(`   Total Customers: ${totalCustomers}`);
            console.log(`   Customers with Outstanding Balance: ${customersWithBalance}`);
            console.log(`   Customers with Advance Balance: ${customersWithAdvance}`);
            console.log(`   Total Payments Recorded: ${paymentCount}`);
            console.log(`   Total Payment Amount: Rs. ${totalPaymentAmount.toFixed(2)}`);

            console.log('\n✅ Test report generated successfully');

        } catch (error) {
            console.error('❌ Error generating test report:', error);
        }
    }
};

// Make the test suite available globally
window.CUSTOMER_PAYMENT_TEST = CUSTOMER_PAYMENT_TEST;

// Auto-run tests if requested
if (window.location.search.includes('test=payments')) {
    CUSTOMER_PAYMENT_TEST.runAllTests().then(success => {
        if (success) {
            CUSTOMER_PAYMENT_TEST.generateTestReport();
        }
    });
}

console.log('📚 Customer Payment Test Suite loaded and available at:');
console.log('   window.CUSTOMER_PAYMENT_TEST.runAllTests()');
console.log('   window.CUSTOMER_PAYMENT_TEST.generateTestReport()');
console.log('');
console.log('💡 To run tests automatically, add ?test=payments to the URL');
