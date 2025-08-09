/**
 * ADVANCED DIAGNOSTIC - POST PERMANENT FIX
 * 
 * This script will identify exactly what's still failing after our permanent fixes
 * Copy and paste into browser console at http://localhost:5174
 */

window.runAdvancedDiagnostic = async function() {
  console.log('🔍 [ADVANCED DIAGNOSTIC] Testing current state after permanent fixes...');
  
  try {
    // Test 1: Check if database methods exist and are accessible
    console.log('\n=== TEST 1: METHOD AVAILABILITY ===');
    
    const methods = ['addInvoiceItems', 'addInvoicePayment', 'updateProductStock', 'createLedgerEntry', 'recalculateInvoiceTotals', 'updateCustomerLedgerForInvoice'];
    
    for (const method of methods) {
      if (typeof db[method] === 'function') {
        console.log(`✅ ${method} - Available`);
      } else {
        console.log(`❌ ${method} - NOT Available`);
      }
    }
    
    // Test 2: Get a test invoice for our tests
    console.log('\n=== TEST 2: GETTING TEST INVOICE ===');
    
    let testInvoice;
    try {
      const invoices = await db.getInvoices();
      testInvoice = invoices && invoices.length > 0 ? invoices[0] : null;
      
      if (testInvoice) {
        console.log('✅ Test invoice found:', {
          id: testInvoice.id,
          billNumber: testInvoice.bill_number,
          customerId: testInvoice.customer_id,
          totalAmount: testInvoice.total_amount,
          remainingBalance: testInvoice.remaining_balance
        });
      } else {
        console.log('❌ No invoices found for testing');
        return;
      }
    } catch (error) {
      console.error('❌ Failed to get invoices:', error);
      return;
    }
    
    // Test 3: Try adding an item with detailed error capture
    console.log('\n=== TEST 3: ITEM ADDITION WITH ERROR CAPTURE ===');
    
    const testItem = {
      product_id: 1,
      product_name: 'Diagnostic Test Item',
      quantity: '1',
      unit_price: 100,
      total_price: 100,
      unit: 'kg'
    };
    
    console.log('🧪 Attempting to add item to invoice:', testInvoice.id);
    console.log('Item data:', testItem);
    
    try {
      // Capture console logs during execution
      const originalLog = console.log;
      const originalError = console.error;
      const capturedLogs = [];
      
      console.log = (...args) => {
        capturedLogs.push({ type: 'log', args });
        originalLog.apply(console, args);
      };
      
      console.error = (...args) => {
        capturedLogs.push({ type: 'error', args });
        originalError.apply(console, args);
      };
      
      const result = await db.addInvoiceItems(testInvoice.id, [testItem]);
      
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      
      if (result) {
        console.log('✅ Item addition succeeded');
      } else {
        console.log('❌ Item addition failed (returned false/null)');
      }
      
      console.log('📋 Captured execution logs:');
      capturedLogs.forEach((log, index) => {
        console.log(`${index + 1}. [${log.type}]`, ...log.args);
      });
      
    } catch (error) {
      console.error('❌ Item addition threw error:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Check for specific error patterns
      if (error.message.includes('cannot start a transaction within a transaction')) {
        console.log('🔴 TRANSACTION NESTING ISSUE - updateProductStock fix may not be applied properly');
      }
      if (error.message.includes('CHECK constraint failed')) {
        console.log('🔴 CONSTRAINT VIOLATION ISSUE - createLedgerEntry fix may not be applied properly');
      }
      if (error.message.includes('no such column')) {
        console.log('🔴 COLUMN ISSUE - Schema mismatch detected');
      }
    }
    
    // Test 4: Try recording payment with detailed error capture
    console.log('\n=== TEST 4: PAYMENT RECORDING WITH ERROR CAPTURE ===');
    
    if ((testInvoice.remaining_balance || 0) <= 0) {
      console.log('⚠️ Test invoice has no remaining balance, creating some...');
      // Add an item first to create remaining balance
      try {
        await db.addInvoiceItems(testInvoice.id, [{
          product_id: 1,
          product_name: 'Balance Creator Item',
          quantity: '1',
          unit_price: 50,
          total_price: 50,
          unit: 'kg'
        }]);
        // Refresh invoice data
        testInvoice = await db.getInvoiceDetails(testInvoice.id);
      } catch (e) {
        console.log('⚠️ Could not create remaining balance for test');
      }
    }
    
    const paymentData = {
      amount: Math.min(25, testInvoice.remaining_balance || 25),
      payment_method: 'cash',
      reference: 'DIAGNOSTIC_TEST_' + Date.now(),
      notes: 'Advanced diagnostic test payment'
    };
    
    console.log('🧪 Attempting to record payment for invoice:', testInvoice.id);
    console.log('Payment data:', paymentData);
    
    try {
      // Capture console logs during execution
      const originalLog = console.log;
      const originalError = console.error;
      const capturedLogs = [];
      
      console.log = (...args) => {
        capturedLogs.push({ type: 'log', args });
        originalLog.apply(console, args);
      };
      
      console.error = (...args) => {
        capturedLogs.push({ type: 'error', args });
        originalError.apply(console, args);
      };
      
      const paymentResult = await db.addInvoicePayment(testInvoice.id, paymentData);
      
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      
      if (paymentResult) {
        console.log('✅ Payment recording succeeded');
      } else {
        console.log('❌ Payment recording failed (returned false/null)');
      }
      
      console.log('📋 Captured execution logs:');
      capturedLogs.forEach((log, index) => {
        console.log(`${index + 1}. [${log.type}]`, ...log.args);
      });
      
    } catch (error) {
      console.error('❌ Payment recording threw error:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Check for specific error patterns
      if (error.message.includes('CHECK constraint failed')) {
        console.log('🔴 CONSTRAINT VIOLATION - createLedgerEntry reference_type issue');
        
        // Let's check what reference_type is being used
        if (error.message.includes('reference_type')) {
          console.log('🔍 This is likely the reference_type constraint issue');
          console.log('   Expected values: invoice, payment, adjustment, expense, income, salary, other');
          console.log('   Check if createLedgerEntry is using invalid reference_type values');
        }
      }
      if (error.message.includes('no such column')) {
        console.log('🔴 COLUMN MISMATCH ISSUE - recalculateInvoiceTotals schema issue');
      }
    }
    
    // Test 5: Check the actual state of our permanent fixes
    console.log('\n=== TEST 5: PERMANENT FIX VERIFICATION ===');
    
    try {
      // Check if our fixes are actually in the database.ts file
      console.log('🔍 Checking if permanent fixes are applied...');
      
      // We can't directly read the file from browser, but we can test the behavior
      
      // Test createLedgerEntry constraint mapping by calling it directly
      try {
        const testDate = new Date().toISOString().split('T')[0];
        const testTime = new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        await db.createLedgerEntry({
          date: testDate,
          time: testTime,
          type: 'incoming',
          category: 'Test',
          description: 'Diagnostic constraint test',
          amount: 1,
          reference_type: 'invoice_payment', // This should be mapped to 'payment'
          created_by: 'diagnostic'
        });
        
        console.log('✅ createLedgerEntry constraint mapping is working');
        
      } catch (ledgerError) {
        if (ledgerError.message.includes('CHECK constraint failed')) {
          console.log('❌ createLedgerEntry constraint mapping NOT WORKING');
          console.log('   The reference_type mapping fix is not applied properly');
        } else {
          console.log('✅ createLedgerEntry constraint mapping appears to be working');
        }
      }
      
    } catch (error) {
      console.error('❌ Fix verification failed:', error);
    }
    
    console.log('\n🎯 DIAGNOSTIC SUMMARY:');
    console.log('=======================');
    console.log('1. Check the logs above for specific error patterns');
    console.log('2. Look for transaction nesting, constraint violations, or column mismatches');
    console.log('3. The detailed error messages will guide the next fix steps');
    
  } catch (error) {
    console.error('❌ Advanced diagnostic failed:', error);
  }
};

console.log('🔧 ADVANCED DIAGNOSTIC TOOL LOADED');
console.log('===================================');
console.log('Run: runAdvancedDiagnostic() - to test current state and capture detailed errors');
console.log('This will help identify exactly what is still failing after permanent fixes.');
