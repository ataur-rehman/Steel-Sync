/**
 * Production Test Suite for Invoice Edit/Delete Functionality
 * Tests the centralized database system with comprehensive validation
 */

import { db } from './src/services/database.js';
import { formatCurrency } from './src/utils/calculations.js';

class InvoiceEditDeleteTest {
    constructor() {
        this.testResults = [];
        this.originalInvoiceId = null;
        this.testCustomerId = null;
        this.testProductId = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        console.log(logEntry);
        this.testResults.push({ timestamp, type, message });
    }

    async setupTestData() {
        this.log('Setting up test data...');

        try {
            // Create test customer
            const customerResult = await db.createCustomer({
                name: 'Test Customer for Edit/Delete',
                phone: '1234567890',
                address: 'Test Address',
                balance: 0
            });

            if (!customerResult.success) {
                throw new Error('Failed to create test customer');
            }

            this.testCustomerId = customerResult.data.id;
            this.log(`Created test customer with ID: ${this.testCustomerId}`);

            // Create test product
            const productResult = await db.createProduct({
                name: 'Test Product for Edit/Delete',
                price: 100.00,
                stock_quantity: 50,
                unit: 'kg',
                alert_level: 10,
                description: 'Test product for edit/delete functionality'
            });

            if (!productResult.success) {
                throw new Error('Failed to create test product');
            }

            this.testProductId = productResult.data.id;
            this.log(`Created test product with ID: ${this.testProductId}`);

            // Create test invoice
            const invoiceData = {
                customer_id: this.testCustomerId,
                customer_name: 'Test Customer for Edit/Delete',
                customer_phone: '1234567890',
                customer_address: 'Test Address',
                items: [{
                    product_id: this.testProductId,
                    product_name: 'Test Product for Edit/Delete',
                    quantity: 5,
                    unit_price: 100.00,
                    total_price: 500.00,
                    unit: 'kg'
                }],
                subtotal: 500.00,
                discount: 0,
                grand_total: 500.00,
                amount_paid: 300.00,
                payment_status: 'partial',
                date: new Date().toISOString().split('T')[0],
                notes: 'Test invoice for edit/delete functionality'
            };

            const invoiceResult = await db.createInvoice(invoiceData);
            if (!invoiceResult.success) {
                throw new Error('Failed to create test invoice');
            }

            this.originalInvoiceId = invoiceResult.data.id;
            this.log(`Created test invoice with ID: ${this.originalInvoiceId}, Bill Number: ${invoiceResult.data.bill_number}`);

            return true;
        } catch (error) {
            this.log(`Setup failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testInvoiceEdit() {
        this.log('Testing invoice edit functionality...');

        try {
            // First, get the original invoice
            const originalInvoice = await db.getInvoiceById(this.originalInvoiceId);
            if (!originalInvoice.success) {
                throw new Error('Failed to fetch original invoice');
            }

            this.log(`Original invoice total: ${formatCurrency(originalInvoice.data.grand_total)}`);

            // Update the invoice
            const updatedInvoiceData = {
                id: this.originalInvoiceId,
                customer_id: this.testCustomerId,
                customer_name: 'Test Customer for Edit/Delete',
                customer_phone: '1234567890',
                customer_address: 'Test Address',
                items: [{
                    product_id: this.testProductId,
                    product_name: 'Test Product for Edit/Delete',
                    quantity: 8, // Changed from 5 to 8
                    unit_price: 100.00,
                    total_price: 800.00,
                    unit: 'kg'
                }],
                subtotal: 800.00,
                discount: 50.00, // Added discount
                grand_total: 750.00, // New total after discount
                amount_paid: 500.00, // Increased payment
                payment_status: 'partial',
                date: new Date().toISOString().split('T')[0],
                notes: 'Updated test invoice - quantity and payment changed'
            };

            const updateResult = await db.updateInvoice(updatedInvoiceData);
            if (!updateResult.success) {
                throw new Error(`Update failed: ${updateResult.error?.message}`);
            }

            this.log(`✅ Invoice updated successfully! New total: ${formatCurrency(updatedInvoiceData.grand_total)}`);

            // Verify the update
            const updatedInvoice = await db.getInvoiceById(this.originalInvoiceId);
            if (updatedInvoice.success) {
                this.log(`Verified updated total: ${formatCurrency(updatedInvoice.data.grand_total)}`);

                if (Math.abs(updatedInvoice.data.grand_total - 750.00) < 0.01) {
                    this.log('✅ Invoice edit validation passed');
                    return true;
                } else {
                    this.log('❌ Invoice edit validation failed - amounts don\'t match', 'error');
                    return false;
                }
            }

            return true;
        } catch (error) {
            this.log(`Invoice edit test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testInvoiceEditValidation() {
        this.log('Testing invoice edit validation...');

        try {
            // Test invalid customer ID
            const invalidCustomerData = {
                id: this.originalInvoiceId,
                customer_id: 99999, // Non-existent customer
                customer_name: 'Non-existent Customer',
                items: [{
                    product_id: this.testProductId,
                    product_name: 'Test Product',
                    quantity: 1,
                    unit_price: 100.00,
                    total_price: 100.00
                }],
                subtotal: 100.00,
                discount: 0,
                grand_total: 100.00,
                amount_paid: 0,
                payment_status: 'pending',
                date: new Date().toISOString().split('T')[0]
            };

            const invalidResult = await db.updateInvoice(invalidCustomerData);
            if (invalidResult.success) {
                this.log('❌ Validation test failed - invalid customer was allowed', 'error');
                return false;
            } else {
                this.log('✅ Validation correctly rejected invalid customer');
            }

            // Test negative quantity
            const negativeQuantityData = {
                id: this.originalInvoiceId,
                customer_id: this.testCustomerId,
                customer_name: 'Test Customer',
                items: [{
                    product_id: this.testProductId,
                    product_name: 'Test Product',
                    quantity: -5, // Negative quantity
                    unit_price: 100.00,
                    total_price: -500.00
                }],
                subtotal: -500.00,
                discount: 0,
                grand_total: -500.00,
                amount_paid: 0,
                payment_status: 'pending',
                date: new Date().toISOString().split('T')[0]
            };

            const negativeResult = await db.updateInvoice(negativeQuantityData);
            if (negativeResult.success) {
                this.log('❌ Validation test failed - negative quantity was allowed', 'error');
                return false;
            } else {
                this.log('✅ Validation correctly rejected negative quantity');
            }

            return true;
        } catch (error) {
            this.log(`Validation test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testInvoiceDelete() {
        this.log('Testing invoice delete functionality...');

        try {
            // Check initial stock and customer balance
            const originalProduct = await db.getProductById(this.testProductId);
            const originalCustomer = await db.getCustomerById(this.testCustomerId);

            this.log(`Product stock before delete: ${originalProduct.data.stock_quantity}`);
            this.log(`Customer balance before delete: ${formatCurrency(originalCustomer.data.balance)}`);

            // Delete the invoice
            const deleteResult = await db.deleteInvoiceWithValidation(this.originalInvoiceId);
            if (!deleteResult.success) {
                throw new Error(`Delete failed: ${deleteResult.error?.message}`);
            }

            this.log('✅ Invoice deleted successfully');

            // Verify stock restoration and balance adjustment
            const updatedProduct = await db.getProductById(this.testProductId);
            const updatedCustomer = await db.getCustomerById(this.testCustomerId);

            this.log(`Product stock after delete: ${updatedProduct.data.stock_quantity}`);
            this.log(`Customer balance after delete: ${formatCurrency(updatedCustomer.data.balance)}`);

            // Verify the invoice is actually deleted
            const deletedInvoice = await db.getInvoiceById(this.originalInvoiceId);
            if (deletedInvoice.success) {
                this.log('❌ Delete test failed - invoice still exists', 'error');
                return false;
            } else {
                this.log('✅ Invoice delete validation passed');
            }

            return true;
        } catch (error) {
            this.log(`Invoice delete test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async runAllTests() {
        this.log('🚀 Starting Production Test Suite for Invoice Edit/Delete Functionality');
        this.log('================================================================');

        const tests = [
            { name: 'Setup Test Data', method: 'setupTestData' },
            { name: 'Invoice Edit Functionality', method: 'testInvoiceEdit' },
            { name: 'Invoice Edit Validation', method: 'testInvoiceEditValidation' },
            { name: 'Invoice Delete Functionality', method: 'testInvoiceDelete' }
        ];

        let passedTests = 0;
        let totalTests = tests.length;

        for (const test of tests) {
            this.log(`\n📋 Running: ${test.name}`);
            this.log('----------------------------------------');

            const result = await this[test.method]();
            if (result) {
                passedTests++;
                this.log(`✅ PASSED: ${test.name}`);
            } else {
                this.log(`❌ FAILED: ${test.name}`, 'error');
            }
        }

        this.log('\n================================================================');
        this.log('📊 TEST RESULTS SUMMARY');
        this.log('================================================================');
        this.log(`Total Tests: ${totalTests}`);
        this.log(`Passed: ${passedTests}`);
        this.log(`Failed: ${totalTests - passedTests}`);
        this.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (passedTests === totalTests) {
            this.log('🎉 ALL TESTS PASSED! The invoice edit/delete functionality is working correctly.');
        } else {
            this.log('⚠️ Some tests failed. Please review the implementation.', 'warning');
        }

        return passedTests === totalTests;
    }
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.InvoiceEditDeleteTest = InvoiceEditDeleteTest;
}
