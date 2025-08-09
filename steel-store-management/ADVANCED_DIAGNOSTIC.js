// ADVANCED DIAGNOSTIC - Find out why invoices aren't being retrieved
console.log('🔍 ADVANCED DIAGNOSTIC - Invoice Retrieval Debug');
console.log('='.repeat(60));

(async function advancedDiagnostic() {
  
  if (!window.db) {
    console.error('❌ Database not available');
    return;
  }

  // Step 1: Test direct database query for invoices
  console.log('📋 STEP 1: Direct Database Query Test');
  console.log('-'.repeat(40));
  
  try {
    const directInvoices = await window.db.dbConnection.execute(
      'SELECT id, bill_number, invoice_number, customer_name, customer_id, grand_total, status FROM invoices ORDER BY id DESC LIMIT 5'
    );
    
    console.log('Direct database query result:');
    console.log('- Query returned:', directInvoices ? directInvoices.length : 0, 'rows');
    
    if (directInvoices && directInvoices.length > 0) {
      console.log('✅ Invoices exist in database:');
      directInvoices.forEach((inv, idx) => {
        console.log(`  ${idx + 1}. ID: ${inv.id}, Number: ${inv.bill_number || inv.invoice_number}, Customer: ${inv.customer_name}`);
      });
    } else {
      console.log('❌ No invoices found in direct database query');
    }
    
  } catch (error) {
    console.error('❌ Direct database query failed:', error.message);
  }

  // Step 2: Test getInvoices method specifically
  console.log('\n📋 STEP 2: getInvoices Method Test');
  console.log('-'.repeat(40));
  
  try {
    console.log('Testing getInvoices method...');
    const methodResult = await window.db.getInvoices({ page: 1, limit: 10 });
    
    console.log('getInvoices method result:');
    console.log('- Type:', typeof methodResult);
    console.log('- Is null/undefined:', methodResult == null);
    
    if (methodResult) {
      console.log('- Has data property:', 'data' in methodResult);
      console.log('- Data type:', typeof methodResult.data);
      console.log('- Data is array:', Array.isArray(methodResult.data));
      
      if (methodResult.data) {
        console.log('- Data length:', methodResult.data.length);
        
        if (methodResult.data.length > 0) {
          console.log('✅ getInvoices returned data:');
          console.log('First invoice:', methodResult.data[0]);
        } else {
          console.log('⚠️ getInvoices returned empty array');
        }
      } else {
        console.log('❌ getInvoices data property is null/undefined');
      }
      
      // Check other properties
      console.log('- Other properties:', Object.keys(methodResult));
    } else {
      console.log('❌ getInvoices returned null/undefined');
    }
    
  } catch (error) {
    console.error('❌ getInvoices method failed:', error.message);
    console.error('Full error:', error);
  }

  // Step 3: Check if getInvoices method exists and its source
  console.log('\n📋 STEP 3: Method Existence Check');
  console.log('-'.repeat(40));
  
  console.log('getInvoices method exists:', typeof window.db.getInvoices === 'function');
  
  if (typeof window.db.getInvoices === 'function') {
    const methodSource = window.db.getInvoices.toString();
    console.log('Method source length:', methodSource.length);
    console.log('Method contains SELECT:', methodSource.includes('SELECT'));
    console.log('Method contains invoices table:', methodSource.includes('invoices'));
  }

  // Step 4: Alternative method to get invoices
  console.log('\n📋 STEP 4: Alternative Invoice Retrieval');
  console.log('-'.repeat(40));
  
  try {
    // Try different approaches to get invoice data
    const alternatives = [
      'SELECT * FROM invoices LIMIT 5',
      'SELECT id, bill_number, customer_name FROM invoices LIMIT 5',
      'SELECT COUNT(*) as count FROM invoices'
    ];
    
    for (const query of alternatives) {
      try {
        const result = await window.db.dbConnection.execute(query);
        console.log(`✅ Query "${query}":`, result.length || result[0], 'results');
      } catch (err) {
        console.log(`❌ Query "${query}" failed:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Alternative retrieval failed:', error);
  }

  // Step 5: If we found invoices, test the fixes directly
  console.log('\n📋 STEP 5: Direct Fix Testing');
  console.log('-'.repeat(40));
  
  try {
    const testInvoices = await window.db.dbConnection.execute(
      'SELECT id, customer_id, bill_number FROM invoices LIMIT 1'
    );
    
    if (testInvoices && testInvoices.length > 0) {
      const testInvoice = testInvoices[0];
      console.log('✅ Using invoice for testing:', testInvoice);
      
      // TEST 1: Add Invoice Item
      console.log('\n🧪 Testing addInvoiceItems...');
      try {
        await window.db.addInvoiceItems(testInvoice.id, [{
          product_id: 1,
          product_name: 'Direct Test Item - ' + Date.now(),
          quantity: '1',
          unit_price: 100,
          total_price: 100,
          unit: '1 piece'
        }]);
        console.log('✅ SUCCESS: Invoice item addition works!');
      } catch (itemError) {
        console.error('❌ FAILED: Invoice item addition:', itemError.message);
      }
      
      // TEST 2: Add Invoice Payment
      console.log('\n🧪 Testing addInvoicePayment...');
      try {
        const paymentId = await window.db.addInvoicePayment(testInvoice.id, {
          amount: 25,
          payment_method: 'cash',
          reference: 'DIRECT-TEST-' + Date.now(),
          notes: 'Direct diagnostic test',
          date: new Date().toISOString().split('T')[0]
        });
        console.log('✅ SUCCESS: Invoice payment works! Payment ID:', paymentId);
        
        // Check if ledger entry was created
        const ledgerCheck = await window.db.dbConnection.execute(
          'SELECT * FROM ledger_entries WHERE reference_id = ? AND reference_type = ? ORDER BY id DESC LIMIT 1',
          [testInvoice.id, 'invoice_payment']
        );
        
        if (ledgerCheck && ledgerCheck.length > 0) {
          console.log('✅ SUCCESS: Customer ledger entry created!');
          console.log('Ledger entry:', ledgerCheck[0]);
        } else {
          console.log('❌ FAILED: No customer ledger entry found');
        }
        
      } catch (paymentError) {
        console.error('❌ FAILED: Invoice payment:', paymentError.message);
      }
      
    } else {
      console.log('❌ No invoices available for direct testing');
    }
    
  } catch (error) {
    console.error('❌ Direct fix testing failed:', error);
  }

  console.log('\n🏁 ADVANCED DIAGNOSTIC COMPLETE');
  console.log('='.repeat(60));
  console.log('Check the results above to understand:');
  console.log('1. Why getInvoices method is not returning data');
  console.log('2. Whether the fixes are working when called directly');
  
})();
