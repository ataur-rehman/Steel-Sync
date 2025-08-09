// TARGETED ERROR DIAGNOSTIC - Find the exact error causing failures
console.log('🔍 TARGETED ERROR DIAGNOSTIC');
console.log('='.repeat(60));

(async function targetedErrorDiagnostic() {
  
  if (!window.db) {
    console.error('❌ Database not available');
    return;
  }

  // Get a test invoice
  const invoices = await window.db.dbConnection.execute(
    'SELECT id, customer_id, bill_number FROM invoices LIMIT 1'
  );
  
  if (!invoices || invoices.length === 0) {
    console.error('❌ No invoices found');
    return;
  }
  
  const testInvoice = invoices[0];
  console.log('✅ Using invoice:', testInvoice.id);

  // TEST 1: Detailed Invoice Item Addition with Error Capturing
  console.log('\n🔍 DETAILED INVOICE ITEM TEST');
  console.log('-'.repeat(40));
  
  try {
    // Override console.error temporarily to capture detailed errors
    const originalError = console.error;
    let capturedError = null;
    
    console.error = (...args) => {
      capturedError = args;
      originalError(...args);
    };
    
    // Attempt to add item
    try {
      await window.db.addInvoiceItems(testInvoice.id, [{
        product_id: 1,
        product_name: 'Detailed Test Item - ' + Date.now(),
        quantity: '1',
        unit_price: 100,
        total_price: 100,
        unit: '1 piece'
      }]);
      
      console.log('✅ SUCCESS: Invoice item added without error');
      
    } catch (itemError) {
      console.error('❌ ITEM ERROR DETAILS:');
      console.error('- Error type:', typeof itemError);
      console.error('- Error message:', itemError?.message || 'undefined message');
      console.error('- Error stack:', itemError?.stack || 'no stack');
      console.error('- Full error object:', itemError);
      
      if (capturedError) {
        console.error('- Captured console error:', capturedError);
      }
    }
    
    // Restore original console.error
    console.error = originalError;
    
  } catch (setupError) {
    console.error('❌ Test setup error:', setupError);
  }

  // TEST 2: Check specific methods that might be failing
  console.log('\n🔍 METHOD-BY-METHOD TEST');
  console.log('-'.repeat(40));
  
  try {
    // Test getProduct method
    console.log('Testing getProduct(1)...');
    try {
      const product = await window.db.getProduct(1);
      console.log('✅ getProduct works:', product ? 'found' : 'not found');
      if (product) {
        console.log('  Product unit_type:', product.unit_type);
      }
    } catch (prodError) {
      console.error('❌ getProduct failed:', prodError.message);
    }
    
    // Test updateProductStock method
    console.log('Testing updateProductStock...');
    try {
      await window.db.updateProductStock(1, -1, 'out', 'test', testInvoice.id, 'TEST');
      console.log('✅ updateProductStock works');
    } catch (stockError) {
      console.error('❌ updateProductStock failed:', stockError.message);
    }
    
    // Test recalculateInvoiceTotals method
    console.log('Testing recalculateInvoiceTotals...');
    try {
      await window.db.recalculateInvoiceTotals(testInvoice.id);
      console.log('✅ recalculateInvoiceTotals works');
    } catch (recalcError) {
      console.error('❌ recalculateInvoiceTotals failed:', recalcError.message);
    }
    
    // Test updateCustomerLedgerForInvoice method
    console.log('Testing updateCustomerLedgerForInvoice...');
    try {
      await window.db.updateCustomerLedgerForInvoice(testInvoice.id);
      console.log('✅ updateCustomerLedgerForInvoice works');
    } catch (ledgerError) {
      console.error('❌ updateCustomerLedgerForInvoice failed:', ledgerError.message);
    }
    
  } catch (methodTestError) {
    console.error('❌ Method testing error:', methodTestError);
  }

  // TEST 3: Detailed Payment Addition with Error Capturing
  console.log('\n🔍 DETAILED PAYMENT TEST');
  console.log('-'.repeat(40));
  
  try {
    const originalError = console.error;
    let capturedPaymentError = null;
    
    console.error = (...args) => {
      capturedPaymentError = args;
      originalError(...args);
    };
    
    try {
      const paymentId = await window.db.addInvoicePayment(testInvoice.id, {
        amount: 10,
        payment_method: 'cash',
        reference: 'DETAILED-TEST-' + Date.now(),
        notes: 'Detailed diagnostic payment test',
        date: new Date().toISOString().split('T')[0]
      });
      
      console.log('✅ SUCCESS: Payment added with ID:', paymentId);
      
    } catch (paymentError) {
      console.error('❌ PAYMENT ERROR DETAILS:');
      console.error('- Error type:', typeof paymentError);
      console.error('- Error message:', paymentError?.message || 'undefined message');
      console.error('- Error stack:', paymentError?.stack || 'no stack');
      console.error('- Full error object:', paymentError);
      
      if (capturedPaymentError) {
        console.error('- Captured console error:', capturedPaymentError);
      }
    }
    
    console.error = originalError;
    
  } catch (paymentSetupError) {
    console.error('❌ Payment test setup error:', paymentSetupError);
  }

  // TEST 4: Check createLedgerEntry method specifically
  console.log('\n🔍 LEDGER ENTRY METHOD TEST');
  console.log('-'.repeat(40));
  
  try {
    console.log('Testing createLedgerEntry...');
    await window.db.createLedgerEntry({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
      type: 'outgoing',
      category: 'Test Entry',
      description: 'Direct test of createLedgerEntry method',
      amount: 5,
      customer_id: testInvoice.customer_id,
      customer_name: 'Test Customer',
      reference_id: testInvoice.id,
      reference_type: 'test',
      notes: 'Direct method test',
      created_by: 'diagnostic'
    });
    
    console.log('✅ createLedgerEntry works');
    
  } catch (ledgerDirectError) {
    console.error('❌ createLedgerEntry failed:', ledgerDirectError.message);
    console.error('Full error:', ledgerDirectError);
  }

  console.log('\n🏁 TARGETED DIAGNOSTIC COMPLETE');
  console.log('This should show us exactly which method is failing and why.');
  
})();
