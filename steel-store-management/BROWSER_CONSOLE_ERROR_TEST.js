// TARGETED BROWSER CONSOLE TEST FOR INVOICE DETAIL ERRORS
// Copy and paste this entire script into the browser console when the app is loaded

(async function runInvoiceDetailErrorTest() {
  console.log('🚀 STARTING TARGETED INVOICE DETAIL ERROR TEST');
  console.log('='.repeat(60));
  
  // Step 1: Verify database is available
  if (!window.db) {
    console.error('❌ Database not available. Make sure you\'re running this in the Steel Store Management app.');
    return;
  }
  
  console.log('✅ Database connection found');
  
  // Step 2: Get or create a test invoice
  let testInvoice;
  try {
    const invoices = await window.db.getInvoices({ page: 1, limit: 5 });
    if (invoices.data && invoices.data.length > 0) {
      testInvoice = invoices.data[0];
      console.log('✅ Using existing invoice:', { id: testInvoice.id, number: testInvoice.bill_number || testInvoice.invoice_number });
    } else {
      console.log('⚠️ No existing invoices found. Need to create a test invoice first.');
      // This would require more complex setup, so for now we'll skip
      return;
    }
  } catch (error) {
    console.error('❌ Error fetching invoices:', error);
    return;
  }
  
  // Step 3: Test the exact "Failed to add item" issue
  console.log('\n🔍 TEST 1: Reproducing "Failed to add item" error');
  console.log('-'.repeat(50));
  
  try {
    // This mirrors exactly what InvoiceDetails.tsx does
    const newItem = {
      product_id: 1,
      product_name: 'Test Product',
      quantity: '1',
      unit_price: 100,
      total_price: 100,
      unit: '1 piece'
    };
    
    console.log('Calling db.addInvoiceItems with:', newItem);
    const result = await window.db.addInvoiceItems(testInvoice.id, [newItem]);
    console.log('✅ SUCCESS: Item added successfully! Result:', result);
    console.log('🎉 "Failed to add item" issue appears to be FIXED!');
    
  } catch (error) {
    console.error('❌ FAILED: "Failed to add item" error still exists:');
    console.error('Error:', error.message);
    console.error('Full error object:', error);
    
    // Detailed error analysis
    if (error.message.includes('no such column')) {
      console.log('🔍 DIAGNOSIS: Database schema mismatch - missing column');
    } else if (error.message.includes('constraint')) {
      console.log('🔍 DIAGNOSIS: Database constraint violation');
    } else if (error.message.includes('not null')) {
      console.log('🔍 DIAGNOSIS: Required field is null');
    }
  }
  
  // Step 4: Test the exact "Failed to record invoice payment" issue
  console.log('\n🔍 TEST 2: Reproducing "Failed to record invoice payment" error');
  console.log('-'.repeat(50));
  
  try {
    // This mirrors exactly what InvoiceDetails.tsx does
    const paymentData = {
      amount: 50.00,
      payment_method: 'cash',
      payment_channel_id: null,
      payment_channel_name: 'cash',
      reference: 'TEST-REF-' + Date.now(),
      notes: 'Test payment from emergency diagnostic',
      date: new Date().toISOString().split('T')[0]
    };
    
    console.log('Calling db.addInvoicePayment with:', paymentData);
    const result = await window.db.addInvoicePayment(testInvoice.id, paymentData);
    console.log('✅ SUCCESS: Payment recorded successfully! Result:', result);
    console.log('🎉 "Failed to record invoice payment" issue appears to be FIXED!');
    
  } catch (error) {
    console.error('❌ FAILED: "Failed to record invoice payment" error still exists:');
    console.error('Error:', error.message);
    console.error('Full error object:', error);
    
    // Detailed error analysis
    if (error.message.includes('CHECK constraint')) {
      console.log('🔍 DIAGNOSIS: CHECK constraint violation - invalid value for constrained field');
      console.log('🔧 LIKELY CAUSE: payment_type, payment_method, or status field has invalid value');
    } else if (error.message.includes('no such column')) {
      console.log('🔍 DIAGNOSIS: Database schema mismatch - missing column');
    } else if (error.message.includes('not null')) {
      console.log('🔍 DIAGNOSIS: Required field is null');
    }
  }
  
  // Step 5: Database schema verification
  console.log('\n🔍 TEST 3: Database schema verification');
  console.log('-'.repeat(50));
  
  try {
    // Check payments table constraints
    const paymentsSchema = await window.db.dbConnection.execute(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'"
    );
    
    if (paymentsSchema && paymentsSchema.length > 0) {
      console.log('✅ Payments table schema found');
      const schema = paymentsSchema[0].sql;
      
      // Check for our centralized constraints
      if (schema.includes("payment_type IN ('incoming','outgoing')")) {
        console.log('✅ Payment type constraint found: incoming/outgoing');
      } else {
        console.log('❌ Payment type constraint missing or different');
      }
      
      if (schema.includes("status IN ('pending','completed','failed','cancelled')")) {
        console.log('✅ Status constraint found');
      } else {
        console.log('❌ Status constraint missing or different');
      }
      
      if (schema.includes("payment_method")) {
        console.log('✅ Payment method column exists');
      } else {
        console.log('❌ Payment method column missing');
      }
      
    } else {
      console.error('❌ Payments table not found');
    }
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error);
  }
  
  // Step 6: Final diagnosis
  console.log('\n📋 FINAL DIAGNOSIS');
  console.log('='.repeat(60));
  console.log('This test directly reproduces the exact errors reported by the user.');
  console.log('If both tests above show SUCCESS, then the permanent fix is working.');
  console.log('If either test shows FAILED, we need to investigate further.');
  console.log('\nTo use this test:');
  console.log('1. Open the Steel Store Management app');
  console.log('2. Open browser dev tools (F12)'); 
  console.log('3. Go to Console tab');
  console.log('4. Paste this entire script and press Enter');
  console.log('5. Review the results above');
  
})();
