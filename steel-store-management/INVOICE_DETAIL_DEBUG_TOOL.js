/**
 * INVOICE DETAIL DEBUG TOOL
 * Run this in browser console to debug invoice payment and item addition issues
 */

console.log('🔍 STARTING INVOICE DETAIL DEBUG...');

class InvoiceDetailDebugger {
  constructor() {
    this.db = window.dbService;
  }

  async runDiagnostics() {
    try {
      console.log('\n📋 INVOICE DETAIL DIAGNOSTICS');
      console.log('=' .repeat(50));

      // Test 1: Check if database methods exist
      await this.checkDatabaseMethods();
      
      // Test 2: Check invoice and customer data
      await this.checkInvoiceData();
      
      // Test 3: Test addInvoiceItems with detailed logging
      await this.testAddInvoiceItems();
      
      // Test 4: Test addInvoicePayment with detailed logging
      await this.testAddInvoicePayment();

    } catch (error) {
      console.error('❌ CRITICAL DEBUG FAILURE:', error);
    }
  }

  async checkDatabaseMethods() {
    console.log('\n🔍 CHECKING DATABASE METHODS...');
    console.log('-'.repeat(30));

    const methods = [
      'addInvoiceItems',
      'addInvoicePayment', 
      'createInvoicePayment',
      'getInvoiceDetails',
      'getInvoices'
    ];

    for (const method of methods) {
      if (typeof this.db[method] === 'function') {
        console.log(`✅ ${method}: Available`);
      } else {
        console.log(`❌ ${method}: MISSING`);
      }
    }
  }

  async checkInvoiceData() {
    console.log('\n📊 CHECKING INVOICE DATA...');
    console.log('-'.repeat(30));

    try {
      // Get a sample invoice for testing
      const invoices = await this.db.getInvoices();
      if (!invoices || invoices.length === 0) {
        console.log('⚠️ No invoices found - creating test invoice...');
        
        // Create test customer first
        const testCustomerId = await this.db.addCustomer({
          name: 'Debug Test Customer',
          contact: '0300-DEBUG-TEST',
          address: 'Debug Test Address'
        });
        
        // Create test invoice
        const testInvoiceId = await this.db.addInvoice({
          customer_id: testCustomerId,
          customer_name: 'Debug Test Customer',
          invoice_date: new Date().toISOString().split('T')[0],
          grand_total: 1000,
          items: [{
            product_name: 'Debug Test Product',
            quantity: 1,
            unit_price: 1000,
            total_price: 1000
          }]
        });

        console.log(`✅ Test invoice created with ID: ${testInvoiceId}`);
        return testInvoiceId;
        
      } else {
        const testInvoice = invoices[0];
        console.log(`✅ Using existing invoice ID: ${testInvoice.id}`);
        console.log(`   Customer: ${testInvoice.customer_name}`);
        console.log(`   Total: PKR ${testInvoice.grand_total}`);
        console.log(`   Remaining: PKR ${testInvoice.remaining_balance}`);
        return testInvoice.id;
      }
    } catch (error) {
      console.error('❌ Error checking invoice data:', error);
      throw error;
    }
  }

  async testAddInvoiceItems() {
    console.log('\n📦 TESTING ADD INVOICE ITEMS...');
    console.log('-'.repeat(30));

    try {
      const testInvoiceId = await this.checkInvoiceData();
      
      // Get or create a test product
      let testProduct;
      const products = await this.db.getProducts();
      
      if (products && products.length > 0) {
        testProduct = products[0];
      } else {
        // Create test product
        const testProductId = await this.db.addProduct({
          name: 'Debug Test Product',
          unit_type: 'piece',
          current_stock: '100',
          rate_per_unit: 500
        });
        testProduct = { id: testProductId, name: 'Debug Test Product', unit_type: 'piece' };
      }

      console.log(`📦 Using product: ${testProduct.name} (ID: ${testProduct.id})`);

      // Test adding item
      const testItems = [{
        product_id: testProduct.id,
        product_name: testProduct.name,
        quantity: '1',
        unit_price: 500,
        total_price: 500,
        unit: 'piece'
      }];

      console.log('🔄 Attempting to add invoice items...');
      console.log('Test items:', testItems);

      try {
        await this.db.addInvoiceItems(testInvoiceId, testItems);
        console.log('✅ ADD INVOICE ITEMS: SUCCESS');
      } catch (itemError) {
        console.error('❌ ADD INVOICE ITEMS: FAILED');
        console.error('Error details:', itemError);
        console.error('Error message:', itemError.message);
        console.error('Error stack:', itemError.stack);
      }

    } catch (error) {
      console.error('❌ Test add invoice items failed:', error);
    }
  }

  async testAddInvoicePayment() {
    console.log('\n💰 TESTING ADD INVOICE PAYMENT...');
    console.log('-'.repeat(30));

    try {
      const testInvoiceId = await this.checkInvoiceData();
      
      const testPayment = {
        amount: 100,
        payment_method: 'cash',
        reference: 'Debug Test Payment',
        notes: 'Automated debug test',
        date: new Date().toISOString().split('T')[0]
      };

      console.log('💳 Test payment data:', testPayment);
      console.log('🔄 Attempting to add invoice payment...');

      try {
        const paymentId = await this.db.addInvoicePayment(testInvoiceId, testPayment);
        console.log(`✅ ADD INVOICE PAYMENT: SUCCESS (Payment ID: ${paymentId})`);
      } catch (paymentError) {
        console.error('❌ ADD INVOICE PAYMENT: FAILED');
        console.error('Error details:', paymentError);
        console.error('Error message:', paymentError.message);
        console.error('Error stack:', paymentError.stack);
        
        // Try with createInvoicePayment method
        console.log('🔄 Trying createInvoicePayment method...');
        try {
          const invoice = await this.db.getInvoiceDetails(testInvoiceId);
          const extendedPayment = {
            ...testPayment,
            invoice_id: testInvoiceId,
            customer_id: invoice.customer_id,
            created_by: 'debug-test'
          };
          
          const paymentId = await this.db.createInvoicePayment(extendedPayment);
          console.log(`✅ CREATE INVOICE PAYMENT: SUCCESS (Payment ID: ${paymentId})`);
        } catch (createError) {
          console.error('❌ CREATE INVOICE PAYMENT: ALSO FAILED');
          console.error('Error details:', createError);
        }
      }

    } catch (error) {
      console.error('❌ Test add invoice payment failed:', error);
    }
  }
}

// AUTO-RUN THE DEBUG
(async () => {
  if (typeof window !== 'undefined' && window.dbService) {
    const debugTool = new InvoiceDetailDebugger();
    await debugTool.runDiagnostics();
  } else {
    console.log('⚠️ Database service not found. Please run this in your application\'s browser console.');
  }
})();
