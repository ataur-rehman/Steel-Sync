// ROBUST VALIDATION TEST - Handles missing data scenarios
// Copy this into browser console

console.log('🧪 ROBUST VALIDATION TEST STARTING...');
console.log('='.repeat(60));

(async function robustValidationTest() {
  
  if (!window.db) {
    console.error('❌ Database not available');
    return;
  }

  try {
    // Step 1: Check if we have invoices
    console.log('📋 Checking for existing invoices...');
    const invoices = await window.db.getInvoices({ page: 1, limit: 5 });
    
    if (!invoices || !invoices.data || invoices.data.length === 0) {
      console.log('⚠️ No invoices found. Creating test invoice first...');
      
      // Create a test customer if needed
      let testCustomer;
      try {
        const customers = await window.db.getCustomers({ page: 1, limit: 1 });
        if (customers.data && customers.data.length > 0) {
          testCustomer = customers.data[0];
          console.log('✅ Using existing customer:', testCustomer.name);
        } else {
          console.log('Creating test customer...');
          const customerId = await window.db.addCustomer({
            name: 'Test Customer for Validation',
            phone: '123-456-7890',
            address: 'Test Address',
            balance: 0
          });
          testCustomer = await window.db.getCustomer(customerId);
          console.log('✅ Test customer created:', testCustomer.name);
        }
      } catch (error) {
        console.error('❌ Failed to get/create customer:', error);
        return;
      }
      
      // Create a test invoice
      try {
        console.log('Creating test invoice...');
        const invoiceId = await window.db.addInvoice({
          customer_id: testCustomer.id,
          customer_name: testCustomer.name,
          bill_number: 'TEST-INV-' + Date.now(),
          items: [{
            product_id: 1,
            product_name: 'Initial Test Product',
            quantity: '1',
            unit_price: 100,
            total_price: 100,
            unit: '1 piece'
          }],
          sub_total: 100,
          discount: 0,
          tax: 0,
          grand_total: 100,
          payment_amount: 0,
          remaining_balance: 100,
          status: 'pending',
          notes: 'Test invoice for validation'
        });
        
        console.log('✅ Test invoice created with ID:', invoiceId);
        
        // Get the created invoice
        const testInvoice = await window.db.getInvoiceDetails(invoiceId);
        console.log('✅ Test invoice details:', {
          id: testInvoice.id,
          number: testInvoice.bill_number,
          customer: testInvoice.customer_name,
          total: testInvoice.grand_total
        });
        
        // Now proceed with tests using this invoice
        await runTests(testInvoice);
        
      } catch (error) {
        console.error('❌ Failed to create test invoice:', error.message);
        
        // If invoice creation fails, let's try a different approach
        console.log('⚠️ Trying alternative approach - testing methods directly...');
        await testMethodsDirectly();
      }
      
    } else {
      console.log('✅ Found existing invoices:', invoices.data.length);
      const testInvoice = invoices.data[0];
      console.log('Using invoice:', {
        id: testInvoice.id,
        number: testInvoice.bill_number || testInvoice.invoice_number,
        customer: testInvoice.customer_name
      });
      
      await runTests(testInvoice);
    }
    
  } catch (error) {
    console.error('❌ Critical error in validation test:', error);
    console.log('Trying direct method testing as fallback...');
    await testMethodsDirectly();
  }
  
})();

// Function to run the actual tests
async function runTests(testInvoice) {
  
  // TEST 1: Invoice Item Addition
  console.log('\n🔍 TEST 1: Invoice Item Addition');
  console.log('-'.repeat(40));
  
  try {
    const beforeItems = await window.db.getInvoiceDetails(testInvoice.id);
    const itemCountBefore = beforeItems.items ? beforeItems.items.length : 0;
    console.log('Items before:', itemCountBefore);
    
    const testItem = {
      product_id: 1,
      product_name: 'Validation Test Item - ' + Date.now(),
      quantity: '2',
      unit_price: 75,
      total_price: 150,
      unit: '2 pieces'
    };
    
    console.log('Adding item:', testItem);
    await window.db.addInvoiceItems(testInvoice.id, [testItem]);
    
    // Verify item was added
    const afterItems = await window.db.getInvoiceDetails(testInvoice.id);
    const itemCountAfter = afterItems.items ? afterItems.items.length : 0;
    console.log('Items after:', itemCountAfter);
    
    if (itemCountAfter > itemCountBefore) {
      console.log('✅ SUCCESS: Invoice item added successfully!');
      console.log(`   Items count: ${itemCountBefore} → ${itemCountAfter}`);
    } else {
      console.log('❌ FAILED: Item count did not increase');
    }
    
  } catch (error) {
    console.error('❌ FAILED: Invoice item addition error:', error.message);
    console.error('Full error:', error);
  }

  // TEST 2: Invoice Payment with Customer Ledger Update
  console.log('\n🔍 TEST 2: Invoice Payment with Customer Ledger Update');
  console.log('-'.repeat(40));
  
  try {
    // Get customer ledger entries before payment
    const customerLedgerBefore = await window.db.getLedgerEntries({
      page: 1,
      limit: 10,
      customer_id: testInvoice.customer_id
    });
    
    const ledgerCountBefore = customerLedgerBefore.data ? customerLedgerBefore.data.length : 0;
    console.log('Customer ledger entries before:', ledgerCountBefore);
    
    // Make payment
    const testPayment = {
      amount: 50,
      payment_method: 'cash',
      reference: 'VALIDATION-' + Date.now(),
      notes: 'Validation test payment',
      date: new Date().toISOString().split('T')[0]
    };
    
    console.log('Making payment:', testPayment);
    const paymentId = await window.db.addInvoicePayment(testInvoice.id, testPayment);
    console.log('Payment ID:', paymentId);
    
    // Check customer ledger entries after payment
    const customerLedgerAfter = await window.db.getLedgerEntries({
      page: 1,
      limit: 10,
      customer_id: testInvoice.customer_id
    });
    
    const ledgerCountAfter = customerLedgerAfter.data ? customerLedgerAfter.data.length : 0;
    console.log('Customer ledger entries after:', ledgerCountAfter);
    
    if (ledgerCountAfter > ledgerCountBefore) {
      console.log('✅ SUCCESS: Customer ledger entry created!');
      console.log(`   Ledger entries: ${ledgerCountBefore} → ${ledgerCountAfter}`);
      
      // Show the newest entry
      const newestEntry = customerLedgerAfter.data[0];
      if (newestEntry) {
        console.log('   Newest entry:', {
          date: newestEntry.date,
          type: newestEntry.type,
          category: newestEntry.category,
          amount: newestEntry.amount,
          description: newestEntry.description
        });
      }
    } else {
      console.log('❌ FAILED: No new ledger entry created');
    }
    
    // Verify invoice balance was updated
    const updatedInvoice = await window.db.getInvoiceDetails(testInvoice.id);
    console.log('Updated invoice balance:', {
      total: updatedInvoice.grand_total,
      paid: updatedInvoice.payment_amount,
      remaining: updatedInvoice.remaining_balance
    });
    
  } catch (error) {
    console.error('❌ FAILED: Invoice payment error:', error.message);
    console.error('Full error:', error);
  }

  // SUMMARY
  console.log('\n📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log('✅ Tests completed with existing/created invoice');
  console.log('Check results above for success/failure status');
}

// Alternative method testing if invoice operations fail
async function testMethodsDirectly() {
  console.log('\n🔧 DIRECT METHOD TESTING');
  console.log('-'.repeat(40));
  
  // Test database connectivity
  try {
    await window.db.dbConnection.execute('SELECT 1');
    console.log('✅ Database connection works');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return;
  }
  
  // Test table existence
  try {
    const tables = await window.db.dbConnection.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('invoice_items', 'payments', 'ledger_entries')"
    );
    console.log('✅ Found tables:', tables.map(t => t.name));
  } catch (error) {
    console.error('❌ Failed to check tables:', error);
  }
  
  // Check method availability
  console.log('Method availability:');
  console.log('- addInvoiceItems:', typeof window.db.addInvoiceItems === 'function');
  console.log('- addInvoicePayment:', typeof window.db.addInvoicePayment === 'function');
  console.log('- createLedgerEntry:', typeof window.db.createLedgerEntry === 'function');
  
  console.log('\n⚠️ Cannot perform full tests without valid invoice data');
  console.log('Please create an invoice in the app first, then run the test again');
}
