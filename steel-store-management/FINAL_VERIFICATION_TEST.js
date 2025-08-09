/**
 * FINAL VERIFICATION TEST
 * 
 * This script tests both fixes after the application restart
 * Copy and paste into browser console at http://localhost:5173
 */

console.log('🔍 [FINAL VERIFICATION] Testing permanent fixes after application restart...');

window.runFinalVerification = async function() {
  try {
    console.log('\n=== TESTING PERMANENT FIXES AFTER RESTART ===');
    
    // Get a test invoice
    console.log('🔍 Getting test invoice...');
    const invoices = await db.getInvoices();
    if (!invoices || invoices.length === 0) {
      console.log('❌ No invoices found for testing');
      return;
    }
    
    const testInvoice = invoices[0];
    console.log('✅ Using test invoice:', testInvoice.bill_number, '(ID:', testInvoice.id + ')');
    
    // TEST 1: Add Item (should now work without transaction nesting error)
    console.log('\n=== TEST 1: ADDING ITEM (Transaction Nesting Fix) ===');
    
    const beforeState = await db.getInvoiceDetails(testInvoice.id);
    console.log('📊 Before adding item:', {
      invoiceTotal: beforeState?.total_amount,
      remainingBalance: beforeState?.remaining_balance
    });
    
    const testItem = {
      product_id: 1,
      product_name: 'Final Test Item',
      quantity: '1',
      unit_price: 50,
      total_price: 50,
      unit: 'kg'
    };
    
    try {
      console.log('➕ Adding item...');
      const addItemResult = await db.addInvoiceItems(testInvoice.id, [testItem]);
      
      const afterState = await db.getInvoiceDetails(testInvoice.id);
      console.log('📊 After adding item:', {
        invoiceTotal: afterState?.total_amount,
        remainingBalance: afterState?.remaining_balance,
        totalChange: (afterState?.total_amount || 0) - (beforeState?.total_amount || 0)
      });
      
      console.log('✅ TEST 1 PASSED: Item addition successful - no transaction nesting error');
      
    } catch (error) {
      console.error('❌ TEST 1 FAILED: Item addition error:', error.message);
      if (error.message.includes('cannot start a transaction within a transaction')) {
        console.log('🔴 Transaction nesting issue still exists');
      }
      return;
    }
    
    // TEST 2: Record Payment (should now work without constraint violation error)
    console.log('\n=== TEST 2: RECORDING PAYMENT (Constraint Violation Fix) ===');
    
    // Refresh invoice state
    const currentInvoice = await db.getInvoiceDetails(testInvoice.id);
    
    if ((currentInvoice?.remaining_balance || 0) <= 0) {
      console.log('⚠️ No remaining balance, this test may be limited');
    }
    
    const paymentAmount = Math.min(25, currentInvoice?.remaining_balance || 25);
    const paymentData = {
      amount: paymentAmount,
      payment_method: 'cash',
      reference: 'FINAL_TEST_' + Date.now(),
      notes: 'Final verification test payment'
    };
    
    console.log('📊 Before payment:', {
      remainingBalance: currentInvoice?.remaining_balance,
      paymentAmount: paymentAmount
    });
    
    try {
      console.log('💰 Recording payment...');
      const paymentResult = await db.addInvoicePayment(testInvoice.id, paymentData);
      
      const afterPaymentState = await db.getInvoiceDetails(testInvoice.id);
      console.log('📊 After payment:', {
        remainingBalance: afterPaymentState?.remaining_balance,
        paidAmount: afterPaymentState?.paid_amount,
        balanceChange: (currentInvoice?.remaining_balance || 0) - (afterPaymentState?.remaining_balance || 0)
      });
      
      console.log('✅ TEST 2 PASSED: Payment recording successful - no constraint violation error');
      
    } catch (error) {
      console.error('❌ TEST 2 FAILED: Payment recording error:', error.message);
      if (error.message.includes('CHECK constraint failed')) {
        console.log('🔴 Constraint violation issue still exists');
        console.log('   Check if createLedgerEntry reference_type mapping is working');
      }
      return;
    }
    
    // TEST 3: Verify Customer Balance Integration
    console.log('\n=== TEST 3: CUSTOMER BALANCE INTEGRATION ===');
    
    const customer = await db.getCustomer(testInvoice.customer_id);
    const customerInvoices = await db.dbConnection.select(`
      SELECT SUM(remaining_balance) as total_outstanding 
      FROM invoices 
      WHERE customer_id = ?
    `, [testInvoice.customer_id]);
    
    const calculatedBalance = customerInvoices[0]?.total_outstanding || 0;
    const recordedBalance = customer?.balance || 0;
    
    console.log('👤 Customer balance check:', {
      customerName: customer?.name,
      recordedBalance: recordedBalance,
      calculatedBalance: calculatedBalance,
      difference: Math.abs(recordedBalance - calculatedBalance),
      isConsistent: Math.abs(recordedBalance - calculatedBalance) < 0.01
    });
    
    if (Math.abs(recordedBalance - calculatedBalance) < 0.01) {
      console.log('✅ Customer balance is consistent');
    } else {
      console.log('⚠️ Customer balance inconsistency detected - may need recalculation');
    }
    
    // FINAL RESULT
    console.log('\n🎉 FINAL VERIFICATION RESULTS:');
    console.log('================================');
    console.log('✅ Fix 1: updateProductStock transaction nesting - RESOLVED');
    console.log('✅ Fix 2: createLedgerEntry constraint violations - RESOLVED');
    console.log('✅ Both critical errors should now be permanently fixed');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Go to Invoice Details page');
    console.log('2. Try adding items - should work without "Failed to add item" error');
    console.log('3. Try recording payments - should work without "Failed to record invoice payment" error');
    console.log('4. Both operations should now update customer balance correctly');
    
    // Test the specific methods mentioned in the diagnostic files
    console.log('\n=== TESTING SPECIFIC METHOD FIXES ===');
    
    // Test createLedgerEntry constraint mapping directly
    try {
      await db.createLedgerEntry({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
        type: 'incoming',
        category: 'Test',
        description: 'Final verification constraint test',
        amount: 1,
        reference_type: 'invoice_payment', // Should be mapped to 'payment'
        created_by: 'final_test'
      });
      
      console.log('✅ createLedgerEntry constraint mapping verified working');
      
    } catch (error) {
      console.error('❌ createLedgerEntry constraint mapping failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Final verification failed:', error);
  }
};

console.log('🎯 FINAL VERIFICATION TEST LOADED');
console.log('==================================');
console.log('The application has been restarted with permanent fixes applied.');
console.log('Run: runFinalVerification() - to test both fixes comprehensively');
console.log('\nExpected Results:');
console.log('• No "Failed to add item" errors');
console.log('• No "Failed to record invoice payment: Unknown error" errors'); 
console.log('• Customer balances should update correctly');
console.log('• All operations should work smoothly in Invoice Details page');
