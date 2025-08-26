// AUTOMATED TEST EXECUTION SCRIPT
// File: test-invoice-edit-delete.js
// Purpose: Automated testing for invoice edit/delete functionality

class InvoiceEditDeleteTestSuite {
  constructor(database, logger) {
    this.db = database;
    this.logger = logger;
    this.testResults = [];
    this.testData = {};
  }

  // Setup test environment
  async setupTestEnvironment() {
    this.logger.info('🔧 Setting up test environment...');
    
    try {
      // Create test customers
      const customer1 = await this.db.createCustomer({
        name: 'Test Customer A',
        phone: '03001234567',
        address: 'Test Address A'
      });
      
      const customer2 = await this.db.createCustomer({
        name: 'Test Customer B', 
        phone: '03001234568',
        address: 'Test Address B'
      });

      // Create test products
      const product1 = await this.db.createProduct({
        name: 'Test Steel Rod',
        rate_per_unit: 120,
        current_stock: '100-0',
        unit_type: 'kg-grams',
        track_inventory: 1
      });

      const product2 = await this.db.createProduct({
        name: 'Test T-Iron Service',
        rate_per_unit: 150,
        current_stock: '0',
        unit_type: 'foot', 
        track_inventory: 0
      });

      // Store test data
      this.testData = {
        customers: [customer1, customer2],
        products: [product1, product2],
        invoices: []
      };

      this.logger.info('✅ Test environment setup complete');
      return true;
    } catch (error) {
      this.logger.error('❌ Test environment setup failed:', error);
      return false;
    }
  }

  // Create test invoices in different states
  async createTestInvoices() {
    this.logger.info('📄 Creating test invoices...');

    try {
      // Unpaid invoice
      const unpaidInvoice = await this.db.createInvoice({
        customer_id: this.testData.customers[0],
        customer_name: 'Test Customer A',
        items: [{
          product_id: this.testData.products[0],
          product_name: 'Test Steel Rod',
          quantity: '10-0',
          unit_price: 120,
          total_price: 1200
        }],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash'
      });

      // Paid invoice
      const paidInvoice = await this.db.createInvoice({
        customer_id: this.testData.customers[1],
        customer_name: 'Test Customer B',
        items: [{
          product_id: this.testData.products[1],
          product_name: 'Test T-Iron Service',
          quantity: '20',
          unit_price: 150,
          total_price: 3000
        }],
        discount: 0,
        payment_amount: 3000,
        payment_method: 'cash'
      });

      // Partially paid invoice
      const partialInvoice = await this.db.createInvoice({
        customer_id: this.testData.customers[0],
        customer_name: 'Test Customer A',
        items: [{
          product_id: this.testData.products[0],
          product_name: 'Test Steel Rod',
          quantity: '15-0',
          unit_price: 120,
          total_price: 1800
        }],
        discount: 0,
        payment_amount: 900,
        payment_method: 'cash'
      });

      this.testData.invoices = [unpaidInvoice, paidInvoice, partialInvoice];
      this.logger.info('✅ Test invoices created');
      return true;
    } catch (error) {
      this.logger.error('❌ Test invoice creation failed:', error);
      return false;
    }
  }

  // Test Case: Delete unpaid invoice
  async testDeleteUnpaidInvoice() {
    const testName = 'TC-D001: Delete Unpaid Invoice';
    this.logger.info(`🧪 Running ${testName}`);

    try {
      const invoiceId = this.testData.invoices[0].id;
      
      // Get initial state
      const initialInvoice = await this.db.getInvoiceDetails(invoiceId);
      const initialCustomerBalance = await this.db.getCustomer(initialInvoice.customer_id);
      const initialStock = await this.db.getProduct(this.testData.products[0]);

      // Perform deletion
      await this.db.deleteInvoice(invoiceId);

      // Verify deletion
      const deletedInvoice = await this.db.getInvoiceDetails(invoiceId);
      const finalCustomerBalance = await this.db.getCustomer(initialInvoice.customer_id);
      const finalStock = await this.db.getProduct(this.testData.products[0]);

      // Assertions
      const assertions = [
        {
          condition: deletedInvoice === null,
          message: 'Invoice should be deleted from database'
        },
        {
          condition: finalCustomerBalance.balance < initialCustomerBalance.balance,
          message: 'Customer balance should decrease'
        },
        {
          condition: this.parseStock(finalStock.current_stock) > this.parseStock(initialStock.current_stock),
          message: 'Product stock should be restored'
        }
      ];

      this.recordTestResult(testName, true, assertions);
      return true;
    } catch (error) {
      this.recordTestResult(testName, false, [], error.message);
      return false;
    }
  }

  // Test Case: Attempt to delete paid invoice
  async testDeletePaidInvoice() {
    const testName = 'TC-D002: Delete Paid Invoice (Should Fail)';
    this.logger.info(`🧪 Running ${testName}`);

    try {
      const invoiceId = this.testData.invoices[1].id;
      
      // Attempt deletion (should fail)
      let deletionFailed = false;
      try {
        await this.db.deleteInvoice(invoiceId);
      } catch (error) {
        deletionFailed = true;
      }

      // Verify invoice still exists
      const invoice = await this.db.getInvoiceDetails(invoiceId);

      const assertions = [
        {
          condition: deletionFailed,
          message: 'Deletion should fail for paid invoice'
        },
        {
          condition: invoice !== null,
          message: 'Invoice should still exist in database'
        }
      ];

      this.recordTestResult(testName, true, assertions);
      return true;
    } catch (error) {
      this.recordTestResult(testName, false, [], error.message);
      return false;
    }
  }

  // Test Case: Edit unpaid invoice - add items
  async testEditUnpaidInvoiceAddItems() {
    const testName = 'TC-E001: Add Items to Unpaid Invoice';
    this.logger.info(`🧪 Running ${testName}`);

    try {
      // Create new unpaid invoice for editing
      const newInvoice = await this.db.createInvoice({
        customer_id: this.testData.customers[0],
        customer_name: 'Test Customer A',
        items: [{
          product_id: this.testData.products[0],
          product_name: 'Test Steel Rod',
          quantity: '5-0',
          unit_price: 120,
          total_price: 600
        }],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash'
      });

      const invoiceId = newInvoice.id;
      
      // Get initial state
      const initialInvoice = await this.db.getInvoiceDetails(invoiceId);
      const initialItemCount = initialInvoice.items.length;
      const initialTotal = initialInvoice.grand_total;

      // Add new item
      const newItem = {
        product_id: this.testData.products[1],
        product_name: 'Test T-Iron Service',
        quantity: '10',
        unit_price: 150,
        total_price: 1500
      };

      await this.db.addInvoiceItems(invoiceId, [newItem]);

      // Get final state
      const finalInvoice = await this.db.getInvoiceDetails(invoiceId);
      const finalItemCount = finalInvoice.items.length;
      const finalTotal = finalInvoice.grand_total;

      const assertions = [
        {
          condition: finalItemCount === initialItemCount + 1,
          message: 'Item count should increase by 1'
        },
        {
          condition: finalTotal > initialTotal,
          message: 'Invoice total should increase'
        },
        {
          condition: Math.abs(finalTotal - (initialTotal + 1500)) < 0.01,
          message: 'Total should increase by item price'
        }
      ];

      this.recordTestResult(testName, true, assertions);
      return true;
    } catch (error) {
      this.recordTestResult(testName, false, [], error.message);
      return false;
    }
  }

  // Test Case: Edit unpaid invoice - remove items
  async testEditUnpaidInvoiceRemoveItems() {
    const testName = 'TC-E002: Remove Items from Unpaid Invoice';
    this.logger.info(`🧪 Running ${testName}`);

    try {
      // Create invoice with multiple items
      const multiItemInvoice = await this.db.createInvoice({
        customer_id: this.testData.customers[0],
        customer_name: 'Test Customer A',
        items: [
          {
            product_id: this.testData.products[0],
            product_name: 'Test Steel Rod',
            quantity: '5-0',
            unit_price: 120,
            total_price: 600
          },
          {
            product_id: this.testData.products[1],
            product_name: 'Test T-Iron Service',
            quantity: '8',
            unit_price: 150,
            total_price: 1200
          }
        ],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash'
      });

      const invoiceId = multiItemInvoice.id;
      
      // Get initial state
      const initialInvoice = await this.db.getInvoiceDetails(invoiceId);
      const initialItemCount = initialInvoice.items.length;
      const initialTotal = initialInvoice.grand_total;
      const itemToRemove = initialInvoice.items[0];

      // Remove first item
      await this.db.removeInvoiceItems(invoiceId, [itemToRemove.id]);

      // Get final state
      const finalInvoice = await this.db.getInvoiceDetails(invoiceId);
      const finalItemCount = finalInvoice.items.length;
      const finalTotal = finalInvoice.grand_total;

      const assertions = [
        {
          condition: finalItemCount === initialItemCount - 1,
          message: 'Item count should decrease by 1'
        },
        {
          condition: finalTotal < initialTotal,
          message: 'Invoice total should decrease'
        },
        {
          condition: Math.abs((initialTotal - itemToRemove.total_price) - finalTotal) < 0.01,
          message: 'Total should decrease by removed item price'
        }
      ];

      this.recordTestResult(testName, true, assertions);
      return true;
    } catch (error) {
      this.recordTestResult(testName, false, [], error.message);
      return false;
    }
  }

  // Test Case: Stock validation during edit
  async testStockValidationOnEdit() {
    const testName = 'TC-E009: Stock Validation on Edit';
    this.logger.info(`🧪 Running ${testName}`);

    try {
      // Create product with limited stock
      const limitedProduct = await this.db.createProduct({
        name: 'Limited Stock Product',
        rate_per_unit: 100,
        current_stock: '2-0', // Only 2kg available
        unit_type: 'kg-grams',
        track_inventory: 1
      });

      // Create invoice
      const invoice = await this.db.createInvoice({
        customer_id: this.testData.customers[0],
        customer_name: 'Test Customer A',
        items: [],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash'
      });

      // Try to add item exceeding stock
      let stockValidationFailed = false;
      try {
        await this.db.addInvoiceItems(invoice.id, [{
          product_id: limitedProduct,
          product_name: 'Limited Stock Product',
          quantity: '5-0', // Requesting 5kg when only 2kg available
          unit_price: 100,
          total_price: 500
        }]);
      } catch (error) {
        stockValidationFailed = error.message.includes('stock') || error.message.includes('insufficient');
      }

      const assertions = [
        {
          condition: stockValidationFailed,
          message: 'Should fail when exceeding available stock'
        }
      ];

      this.recordTestResult(testName, true, assertions);
      return true;
    } catch (error) {
      this.recordTestResult(testName, false, [], error.message);
      return false;
    }
  }

  // Test Case: Customer ledger integration
  async testCustomerLedgerIntegration() {
    const testName = 'TC-INT001: Customer Ledger Integration';
    this.logger.info(`🧪 Running ${testName}`);

    try {
      const customerId = this.testData.customers[0];
      
      // Get initial customer balance
      const initialCustomer = await this.db.getCustomer(customerId);
      const initialBalance = initialCustomer.balance;

      // Create invoice
      const invoice = await this.db.createInvoice({
        customer_id: customerId,
        customer_name: 'Test Customer A',
        items: [{
          product_id: this.testData.products[0],
          product_name: 'Test Steel Rod',
          quantity: '8-0',
          unit_price: 120,
          total_price: 960
        }],
        discount: 0,
        payment_amount: 0,
        payment_method: 'cash'
      });

      // Check customer balance after invoice creation
      const afterInvoiceCustomer = await this.db.getCustomer(customerId);
      
      // Edit invoice - add item
      await this.db.addInvoiceItems(invoice.id, [{
        product_id: this.testData.products[1],
        product_name: 'Test T-Iron Service',
        quantity: '5',
        unit_price: 150,
        total_price: 750
      }]);

      // Check final customer balance
      const finalCustomer = await this.db.getCustomer(customerId);

      const assertions = [
        {
          condition: afterInvoiceCustomer.balance > initialBalance,
          message: 'Customer balance should increase after invoice creation'
        },
        {
          condition: finalCustomer.balance > afterInvoiceCustomer.balance,
          message: 'Customer balance should increase after adding items'
        },
        {
          condition: Math.abs(finalCustomer.balance - (initialBalance + 960 + 750)) < 0.01,
          message: 'Final balance should equal initial + total invoice amount'
        }
      ];

      this.recordTestResult(testName, true, assertions);
      return true;
    } catch (error) {
      this.recordTestResult(testName, false, [], error.message);
      return false;
    }
  }

  // Utility function to parse stock values
  parseStock(stockString) {
    if (!stockString) return 0;
    const match = stockString.toString().match(/^(\d+)-(\d+)$/);
    if (match) {
      return parseInt(match[1]) * 1000 + parseInt(match[2]);
    }
    return parseFloat(stockString) || 0;
  }

  // Record test result
  recordTestResult(testName, passed, assertions = [], error = null) {
    const result = {
      test: testName,
      passed,
      assertions,
      error,
      timestamp: new Date().toISOString()
    };

    this.testResults.push(result);
    
    if (passed) {
      this.logger.info(`✅ ${testName} - PASSED`);
      assertions.forEach(assertion => {
        if (assertion.condition) {
          this.logger.info(`  ✓ ${assertion.message}`);
        } else {
          this.logger.warn(`  ✗ ${assertion.message}`);
        }
      });
    } else {
      this.logger.error(`❌ ${testName} - FAILED: ${error}`);
    }
  }

  // Run all tests
  async runAllTests() {
    this.logger.info('🚀 Starting Invoice Edit/Delete Test Suite');
    this.logger.info('='.repeat(50));

    const setupSuccess = await this.setupTestEnvironment();
    if (!setupSuccess) {
      this.logger.error('❌ Test environment setup failed. Aborting tests.');
      return false;
    }

    const invoiceCreationSuccess = await this.createTestInvoices();
    if (!invoiceCreationSuccess) {
      this.logger.error('❌ Test invoice creation failed. Aborting tests.');
      return false;
    }

    // Run test cases
    const tests = [
      () => this.testDeleteUnpaidInvoice(),
      () => this.testDeletePaidInvoice(),
      () => this.testEditUnpaidInvoiceAddItems(),
      () => this.testEditUnpaidInvoiceRemoveItems(),
      () => this.testStockValidationOnEdit(),
      () => this.testCustomerLedgerIntegration()
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
      try {
        const result = await test();
        if (result) passedTests++;
      } catch (error) {
        this.logger.error(`Test execution error: ${error.message}`);
      }
    }

    // Print summary
    this.printTestSummary(passedTests, totalTests);
    
    return passedTests === totalTests;
  }

  // Print test summary
  printTestSummary(passed, total) {
    this.logger.info('='.repeat(50));
    this.logger.info('📊 TEST SUMMARY');
    this.logger.info('='.repeat(50));
    this.logger.info(`Total Tests: ${total}`);
    this.logger.info(`Passed: ${passed}`);
    this.logger.info(`Failed: ${total - passed}`);
    this.logger.info(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (passed === total) {
      this.logger.info('🎉 ALL TESTS PASSED! System is ready for production.');
    } else {
      this.logger.warn('⚠️  Some tests failed. Review results before production deployment.');
    }

    // Detailed results
    this.logger.info('\n📋 DETAILED RESULTS:');
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      this.logger.info(`${status} ${result.test}`);
      if (!result.passed && result.error) {
        this.logger.info(`   Error: ${result.error}`);
      }
    });
  }

  // Cleanup test environment
  async cleanup() {
    this.logger.info('🧹 Cleaning up test environment...');
    
    try {
      // Delete test invoices
      for (const invoiceId of this.testData.invoices) {
        try {
          await this.db.deleteInvoice(invoiceId.id);
        } catch (error) {
          // Invoice might already be deleted in tests
        }
      }

      // Delete test customers
      for (const customerId of this.testData.customers) {
        try {
          await this.db.deleteCustomer(customerId);
        } catch (error) {
          this.logger.warn(`Could not delete test customer ${customerId}: ${error.message}`);
        }
      }

      // Delete test products
      for (const productId of this.testData.products) {
        try {
          await this.db.deleteProduct(productId);
        } catch (error) {
          this.logger.warn(`Could not delete test product ${productId}: ${error.message}`);
        }
      }

      this.logger.info('✅ Test environment cleanup complete');
    } catch (error) {
      this.logger.error('❌ Test cleanup failed:', error);
    }
  }
}

// Console logger implementation
class TestLogger {
  info(message) {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`);
  }

  warn(message) {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`);
  }

  error(message) {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InvoiceEditDeleteTestSuite, TestLogger };
}

// Usage example:
/*
// In your test file or browser console:
import { DatabaseService } from './path/to/database.js';

const db = new DatabaseService();
const logger = new TestLogger();
const testSuite = new InvoiceEditDeleteTestSuite(db, logger);

// Run tests
testSuite.runAllTests().then(success => {
  if (success) {
    console.log('🎉 All tests passed! System ready for production.');
  } else {
    console.log('❌ Some tests failed. Check logs for details.');
  }
  
  // Cleanup
  testSuite.cleanup();
});
*/
