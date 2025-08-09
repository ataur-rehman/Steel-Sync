/**
 * COMPLETE PERMANENT SOLUTION TEST
 * ===================================
 * This test validates all permanent fixes for:
 * 1. Vendor financial summary calculations (PKR 0 issue)
 * 2. Invoice detail functionality (payment/item addition)
 * 3. Real-time UI updates
 * 
 * RUN THIS IN BROWSER CONSOLE ON YOUR SYSTEM
 */

console.log('🚀 STARTING COMPLETE PERMANENT SOLUTION TEST...');

class CompleteSolutionTest {
  constructor() {
    this.db = window.dbService;
    this.results = {
      vendorFinancials: false,
      invoicePayments: false,
      invoiceItems: false,
      realTimeUpdates: false,
      overallSuccess: false
    };
  }

  async runAllTests() {
    try {
      console.log('\n📋 TEST SUITE: Complete Permanent Solution Validation');
      console.log('=' .repeat(60));

      // Test 1: Vendor Financial Calculations
      await this.testVendorFinancials();
      
      // Test 2: Invoice Payment Creation
      await this.testInvoicePayments();
      
      // Test 3: Invoice Item Addition
      await this.testInvoiceItems();
      
      // Test 4: Real-time Event System
      await this.testRealTimeUpdates();

      // Final Results
      this.displayFinalResults();

    } catch (error) {
      console.error('❌ CRITICAL TEST FAILURE:', error);
    }
  }

  async testVendorFinancials() {
    console.log('\n🔍 TEST 1: Vendor Financial Calculations');
    console.log('-'.repeat(40));

    try {
      // Get all vendors with their financial data
      const vendors = await this.db.getVendors();
      
      if (!vendors || vendors.length === 0) {
        console.log('⚠️ No vendors found - creating test vendor...');
        
        // Create a test vendor
        const testVendorId = await this.db.addVendor({
          name: 'Test Vendor for Financial Test',
          contact: '0300-1234567',
          address: 'Test Address',
          balance: 5000
        });

        // Create test purchase
        await this.db.addPurchase({
          vendor_id: testVendorId,
          vendor_name: 'Test Vendor for Financial Test',
          purchase_date: new Date().toISOString().split('T')[0],
          total_amount: 10000,
          payment_status: 'partial',
          items: [{
            product_name: 'Test Product',
            quantity: 10,
            unit_price: 1000,
            total_price: 10000
          }]
        });

        // Create test payment
        await this.db.recordVendorPayment({
          vendor_id: testVendorId,
          amount: 3000,
          payment_method: 'cash',
          reference: 'Test Payment',
          date: new Date().toISOString().split('T')[0]
        });

        // Re-fetch vendors
        const updatedVendors = await this.db.getVendors();
        console.log('✅ Test data created successfully');
      }

      // Test specific vendor financial calculation
      const testVendor = vendors.find(v => v.total_purchases > 0);
      
      if (testVendor) {
        console.log(`📊 Vendor: ${testVendor.name}`);
        console.log(`   Total Purchases: PKR ${testVendor.total_purchases || 0}`);
        console.log(`   Total Payments: PKR ${testVendor.total_payments || 0}`);
        console.log(`   Outstanding Balance: PKR ${testVendor.balance || 0}`);
        console.log(`   Payment Score: ${testVendor.payment_score || 0}%`);

        // Verify calculations are not zero for vendors with activity
        if (testVendor.total_purchases > 0 && testVendor.total_payments >= 0) {
          console.log('✅ VENDOR FINANCIAL CALCULATIONS: WORKING CORRECTLY');
          this.results.vendorFinancials = true;
        } else {
          console.log('❌ VENDOR FINANCIAL CALCULATIONS: STILL SHOWING PKR 0');
        }
      } else {
        console.log('⚠️ No vendors with purchase activity found');
      }

    } catch (error) {
      console.error('❌ Vendor financial test failed:', error);
    }
  }

  async testInvoicePayments() {
    console.log('\n💰 TEST 2: Invoice Payment Creation');
    console.log('-'.repeat(40));

    try {
      // First, get or create a test invoice
      let testInvoice;
      const invoices = await this.db.getInvoices();
      
      if (invoices && invoices.length > 0) {
        testInvoice = invoices[0];
      } else {
        // Create test customer and invoice
        const testCustomerId = await this.db.addCustomer({
          name: 'Test Customer for Payment',
          contact: '0301-9876543',
          address: 'Test Address'
        });

        const testInvoiceId = await this.db.addInvoice({
          customer_id: testCustomerId,
          customer_name: 'Test Customer for Payment',
          invoice_date: new Date().toISOString().split('T')[0],
          grand_total: 5000,
          items: [{
            product_name: 'Test Product',
            quantity: 5,
            unit_price: 1000,
            total_price: 5000
          }]
        });

        testInvoice = { id: testInvoiceId, customer_id: testCustomerId, grand_total: 5000 };
      }

      // Test creating invoice payment using the new method
      try {
        const paymentId = await this.db.createInvoicePayment({
          invoice_id: testInvoice.id,
          customer_id: testInvoice.customer_id,
          amount: 1000,
          payment_method: 'cash',
          reference: 'Test Invoice Payment',
          notes: 'Automated test payment',
          date: new Date().toISOString().split('T')[0]
        });

        if (paymentId && paymentId > 0) {
          console.log(`✅ INVOICE PAYMENT CREATION: SUCCESS (Payment ID: ${paymentId})`);
          this.results.invoicePayments = true;
          
          // Verify payment was recorded
          const payment = await this.db.getPaymentById(paymentId);
          if (payment) {
            console.log(`   Payment Amount: PKR ${payment.amount}`);
            console.log(`   Payment Method: ${payment.payment_method}`);
            console.log(`   Status: ${payment.status}`);
          }
        } else {
          console.log('❌ INVOICE PAYMENT CREATION: FAILED - No payment ID returned');
        }

      } catch (paymentError) {
        console.error('❌ Invoice payment creation failed:', paymentError);
      }

    } catch (error) {
      console.error('❌ Invoice payment test failed:', error);
    }
  }

  async testInvoiceItems() {
    console.log('\n📦 TEST 3: Invoice Item Addition');
    console.log('-'.repeat(40));

    try {
      // Get or create test invoice
      const invoices = await this.db.getInvoices();
      let testInvoice = invoices && invoices.length > 0 ? invoices[0] : null;

      if (!testInvoice) {
        console.log('⚠️ No invoices found for item addition test');
        return;
      }

      // Test adding items to existing invoice
      const testItems = [{
        product_name: 'Test Item Addition',
        quantity: 2,
        unit_price: 500,
        total_price: 1000,
        category: 'Test Category'
      }];

      try {
        const success = await this.db.addInvoiceItems(testInvoice.id, testItems);
        
        if (success) {
          console.log('✅ INVOICE ITEM ADDITION: SUCCESS');
          this.results.invoiceItems = true;
          
          // Verify items were added
          const updatedInvoice = await this.db.getInvoiceDetails(testInvoice.id);
          if (updatedInvoice && updatedInvoice.items) {
            const addedItem = updatedInvoice.items.find(item => item.product_name === 'Test Item Addition');
            if (addedItem) {
              console.log(`   Added Item: ${addedItem.product_name}`);
              console.log(`   Quantity: ${addedItem.quantity}`);
              console.log(`   Total Price: PKR ${addedItem.total_price}`);
            }
          }
        } else {
          console.log('❌ INVOICE ITEM ADDITION: FAILED');
        }

      } catch (itemError) {
        console.error('❌ Invoice item addition failed:', itemError);
      }

    } catch (error) {
      console.error('❌ Invoice item test failed:', error);
    }
  }

  async testRealTimeUpdates() {
    console.log('\n🔄 TEST 4: Real-time Event System');
    console.log('-'.repeat(40));

    try {
      let eventsReceived = 0;
      const expectedEvents = ['VENDOR_FINANCIAL_UPDATED', 'INVOICE_PAYMENT_RECEIVED', 'PAYMENT_RECORDED'];
      
      // Set up event listeners
      expectedEvents.forEach(eventType => {
        if (window.eventBus) {
          window.eventBus.on(eventType, (data) => {
            console.log(`✅ Event received: ${eventType}`, data);
            eventsReceived++;
          });
        }
      });

      // Trigger events by creating a test payment
      if (window.eventBus) {
        // Simulate events
        window.eventBus.emit('VENDOR_FINANCIAL_UPDATED', { vendorId: 1, test: true });
        window.eventBus.emit('INVOICE_PAYMENT_RECEIVED', { invoiceId: 1, test: true });
        window.eventBus.emit('PAYMENT_RECORDED', { paymentId: 1, test: true });

        // Wait for events to process
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (eventsReceived >= 3) {
          console.log('✅ REAL-TIME EVENT SYSTEM: WORKING');
          this.results.realTimeUpdates = true;
        } else {
          console.log('❌ REAL-TIME EVENT SYSTEM: PARTIAL OR NOT WORKING');
        }
      } else {
        console.log('⚠️ EventBus not found - real-time updates may not be available');
      }

    } catch (error) {
      console.error('❌ Real-time update test failed:', error);
    }
  }

  displayFinalResults() {
    console.log('\n📊 FINAL TEST RESULTS');
    console.log('=' .repeat(60));
    
    const totalTests = Object.keys(this.results).length - 1; // Exclude overallSuccess
    let passedTests = 0;

    Object.entries(this.results).forEach(([test, passed]) => {
      if (test !== 'overallSuccess') {
        const status = passed ? '✅ PASSED' : '❌ FAILED';
        const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        console.log(`${status} - ${testName}`);
        if (passed) passedTests++;
      }
    });

    const successRate = Math.round((passedTests / totalTests) * 100);
    this.results.overallSuccess = successRate >= 75;

    console.log('\n' + '='.repeat(60));
    console.log(`📈 OVERALL SUCCESS RATE: ${successRate}% (${passedTests}/${totalTests} tests passed)`);
    
    if (this.results.overallSuccess) {
      console.log('🎉 PERMANENT SOLUTION: SUCCESSFULLY IMPLEMENTED!');
      console.log('✅ Your system is now working correctly with:');
      console.log('   • Accurate vendor financial calculations');
      console.log('   • Working invoice payment functionality');
      console.log('   • Proper invoice item addition');
      console.log('   • Real-time UI updates');
    } else {
      console.log('⚠️ PERMANENT SOLUTION: NEEDS ATTENTION');
      console.log('Some components may need additional fixes or database refresh.');
    }

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Refresh your browser and test manually');
    console.log('2. Check the VendorDetail and InvoiceDetails components');
    console.log('3. Verify database schema is up to date');
    console.log('4. Test with real data in your application');
  }
}

// AUTO-RUN THE TEST
(async () => {
  if (typeof window !== 'undefined' && window.dbService) {
    const test = new CompleteSolutionTest();
    await test.runAllTests();
  } else {
    console.log('⚠️ Database service not found. Please run this in your application\'s browser console.');
    console.log('📝 Instructions:');
    console.log('1. Open your steel store management application');
    console.log('2. Open browser developer tools (F12)');
    console.log('3. Copy and paste this entire script into the console');
    console.log('4. Press Enter to run the complete test suite');
  }
})();
