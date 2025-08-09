// EMERGENCY INVOICE DETAIL ERROR TEST
// Run this in the browser console to test the actual error

(async function testInvoiceDetailMethods() {
  console.log('🔄 Starting Invoice Detail Error Test...');
  
  try {
    // Test database connection
    if (!window.db) {
      console.error('❌ Database not available on window object');
      return;
    }
    
    console.log('✅ Database object found');
    
    // First test: Check if methods exist
    console.log('🔍 Checking method existence:');
    console.log('- addInvoiceItems exists:', typeof window.db.addInvoiceItems === 'function');
    console.log('- addInvoicePayment exists:', typeof window.db.addInvoicePayment === 'function');
    
    // Get a real invoice ID to test with
    const invoices = await window.db.getInvoices({ page: 1, limit: 1 });
    if (!invoices.data || invoices.data.length === 0) {
      console.error('❌ No invoices found to test with');
      return;
    }
    
    const testInvoice = invoices.data[0];
    console.log('✅ Using test invoice:', { id: testInvoice.id, number: testInvoice.bill_number });
    
    // Test 1: Try adding an invoice item
    console.log('\n🧪 Test 1: Adding invoice item...');
    try {
      const testItem = {
        product_id: 1,
        product_name: 'Test Product',
        quantity: '1',
        unit_price: 100,
        total_price: 100,
        unit: '1 piece'
      };
      
      console.log('Attempting to add item:', testItem);
      await window.db.addInvoiceItems(testInvoice.id, [testItem]);
      console.log('✅ Test 1 PASSED: Invoice item added successfully');
    } catch (error) {
      console.error('❌ Test 1 FAILED: Error adding invoice item:');
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      // Check if it's a database schema issue
      if (error.message && error.message.includes('no such column')) {
        console.log('🔍 Possible schema mismatch detected');
      } else if (error.message && error.message.includes('constraint')) {
        console.log('🔍 Database constraint violation detected');
      }
    }
    
    // Test 2: Try adding an invoice payment
    console.log('\n🧪 Test 2: Adding invoice payment...');
    try {
      const testPayment = {
        amount: 50,
        payment_method: 'cash',
        payment_channel_id: null,
        payment_channel_name: 'cash',
        reference: 'TEST-PAYMENT',
        notes: 'Test payment from emergency diagnostic',
        date: new Date().toISOString().split('T')[0]
      };
      
      console.log('Attempting to add payment:', testPayment);
      await window.db.addInvoicePayment(testInvoice.id, testPayment);
      console.log('✅ Test 2 PASSED: Invoice payment added successfully');
    } catch (error) {
      console.error('❌ Test 2 FAILED: Error adding invoice payment:');
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      // Check specific error types
      if (error.message && error.message.includes('CHECK constraint')) {
        console.log('🔍 Database CHECK constraint violation detected');
        console.log('This likely means a value does not match the allowed constraint values');
      } else if (error.message && error.message.includes('no such column')) {
        console.log('🔍 Database schema mismatch detected');
      }
    }
    
    // Test 3: Check database schema for payments table
    console.log('\n🧪 Test 3: Checking payments table schema...');
    try {
      const schemaResult = await window.db.dbConnection.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'"
      );
      
      if (schemaResult && schemaResult.length > 0) {
        console.log('✅ Payments table schema:');
        console.log(schemaResult[0].sql);
      } else {
        console.error('❌ Payments table not found');
      }
    } catch (error) {
      console.error('❌ Error checking schema:', error);
    }
    
    // Test 4: Check invoice_items table schema
    console.log('\n🧪 Test 4: Checking invoice_items table schema...');
    try {
      const schemaResult = await window.db.dbConnection.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='invoice_items'"
      );
      
      if (schemaResult && schemaResult.length > 0) {
        console.log('✅ Invoice_items table schema:');
        console.log(schemaResult[0].sql);
      } else {
        console.error('❌ Invoice_items table not found');
      }
    } catch (error) {
      console.error('❌ Error checking schema:', error);
    }
    
    console.log('\n🏁 Emergency test completed. Check results above.');
    
  } catch (error) {
    console.error('❌ Critical error in emergency test:', error);
  }
})();
