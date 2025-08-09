/**
 * PERMANENT SOLUTION INTEGRITY CHECK
 * 
 * This script verifies that our permanent fixes are working and
 * identifies any remaining integrity issues with customer balances,
 * ledger entries, and invoice totals.
 */

(async function() {
  console.log('🔍 [INTEGRITY CHECK] Starting comprehensive integrity verification...');
  
  try {
    // 1. Test the "Failed to add item" fix
    console.log('\n=== TESTING ITEM ADDITION ===');
    
    const testInvoiceId = 1; // Use an existing invoice
    const testItem = {
      product_id: 1,
      product_name: 'Test Steel Bar',
      quantity: '2',
      unit_price: 150,
      total_price: 300,
      unit: 'kg'
    };
    
    console.log('🧪 Testing addInvoiceItems method...');
    
    // Get current state before adding item
    const beforeInvoice = await db.getInvoiceDetails(testInvoiceId);
    const beforeCustomer = await db.getCustomer(beforeInvoice?.customer_id);
    const beforeLedgerEntries = await db.dbConnection.select(
      'SELECT * FROM ledger_entries WHERE reference_id = ? AND reference_type = ?',
      [testInvoiceId, 'invoice']
    );
    
    console.log('📊 Before state:', {
      invoice: {
        id: beforeInvoice?.id,
        total: beforeInvoice?.total_amount,
        remaining: beforeInvoice?.remaining_balance
      },
      customer: {
        id: beforeCustomer?.id,
        balance: beforeCustomer?.balance
      },
      ledgerEntries: beforeLedgerEntries?.length || 0
    });
    
    // Add item using the fixed method
    const result = await db.addInvoiceItems(testInvoiceId, [testItem]);
    
    // Get state after adding item
    const afterInvoice = await db.getInvoiceDetails(testInvoiceId);
    const afterCustomer = await db.getCustomer(afterInvoice?.customer_id);
    const afterLedgerEntries = await db.dbConnection.select(
      'SELECT * FROM ledger_entries WHERE reference_id = ? AND reference_type = ?',
      [testInvoiceId, 'invoice']
    );
    
    console.log('📊 After state:', {
      invoice: {
        id: afterInvoice?.id,
        total: afterInvoice?.total_amount,
        remaining: afterInvoice?.remaining_balance
      },
      customer: {
        id: afterCustomer?.id,
        balance: afterCustomer?.balance
      },
      ledgerEntries: afterLedgerEntries?.length || 0
    });
    
    // Check if balances updated correctly
    const expectedBalanceChange = (afterInvoice?.total_amount || 0) - (beforeInvoice?.total_amount || 0);
    const actualBalanceChange = (afterCustomer?.balance || 0) - (beforeCustomer?.balance || 0);
    
    console.log('💰 Balance Analysis:', {
      expectedChange: expectedBalanceChange,
      actualChange: actualBalanceChange,
      match: Math.abs(expectedBalanceChange - actualBalanceChange) < 0.01
    });
    
    if (Math.abs(expectedBalanceChange - actualBalanceChange) < 0.01) {
      console.log('✅ Customer balance updated correctly after item addition');
    } else {
      console.log('❌ Customer balance NOT updated correctly - INTEGRITY ISSUE FOUND');
    }
    
    // 2. Test the "Failed to record invoice payment" fix
    console.log('\n=== TESTING PAYMENT RECORDING ===');
    
    const paymentData = {
      amount: 100,
      payment_method: 'cash',
      reference: 'TEST_PAYMENT_' + Date.now(),
      notes: 'Test payment for integrity check'
    };
    
    console.log('🧪 Testing addInvoicePayment method...');
    
    // Get current state before payment
    const beforePaymentInvoice = await db.getInvoiceDetails(testInvoiceId);
    const beforePaymentCustomer = await db.getCustomer(beforePaymentInvoice?.customer_id);
    const beforePaymentLedger = await db.dbConnection.select(
      'SELECT * FROM ledger_entries WHERE reference_id = ? AND reference_type = ?',
      [testInvoiceId, 'payment']
    );
    
    console.log('📊 Before payment state:', {
      invoice: {
        remaining: beforePaymentInvoice?.remaining_balance,
        paid: beforePaymentInvoice?.paid_amount
      },
      customer: {
        balance: beforePaymentCustomer?.balance
      },
      paymentLedgerEntries: beforePaymentLedger?.length || 0
    });
    
    // Record payment using the fixed method
    const paymentResult = await db.addInvoicePayment(testInvoiceId, paymentData);
    
    // Get state after payment
    const afterPaymentInvoice = await db.getInvoiceDetails(testInvoiceId);
    const afterPaymentCustomer = await db.getCustomer(afterPaymentInvoice?.customer_id);
    const afterPaymentLedger = await db.dbConnection.select(
      'SELECT * FROM ledger_entries WHERE reference_id = ? AND reference_type = ?',
      [testInvoiceId, 'payment']
    );
    
    console.log('📊 After payment state:', {
      invoice: {
        remaining: afterPaymentInvoice?.remaining_balance,
        paid: afterPaymentInvoice?.paid_amount
      },
      customer: {
        balance: afterPaymentCustomer?.balance
      },
      paymentLedgerEntries: afterPaymentLedger?.length || 0
    });
    
    // Check payment integrity
    const expectedRemainingBalance = (beforePaymentInvoice?.remaining_balance || 0) - paymentData.amount;
    const actualRemainingBalance = afterPaymentInvoice?.remaining_balance || 0;
    const expectedCustomerBalance = (beforePaymentCustomer?.balance || 0) - paymentData.amount;
    const actualCustomerBalance = afterPaymentCustomer?.balance || 0;
    
    console.log('💰 Payment Analysis:', {
      expectedRemainingBalance,
      actualRemainingBalance,
      remainingBalanceMatch: Math.abs(expectedRemainingBalance - actualRemainingBalance) < 0.01,
      expectedCustomerBalance,
      actualCustomerBalance,
      customerBalanceMatch: Math.abs(expectedCustomerBalance - actualCustomerBalance) < 0.01,
      ledgerEntriesCreated: (afterPaymentLedger?.length || 0) > (beforePaymentLedger?.length || 0)
    });
    
    if (Math.abs(expectedRemainingBalance - actualRemainingBalance) < 0.01 &&
        Math.abs(expectedCustomerBalance - actualCustomerBalance) < 0.01 &&
        (afterPaymentLedger?.length || 0) > (beforePaymentLedger?.length || 0)) {
      console.log('✅ Payment recording works correctly - all balances and ledger updated');
    } else {
      console.log('❌ Payment recording has issues - INTEGRITY PROBLEMS FOUND');
    }
    
    // 3. Check for general integrity issues
    console.log('\n=== GENERAL INTEGRITY CHECK ===');
    
    // Check if there are invoices with mismatched customer balances
    const allInvoices = await db.dbConnection.select(`
      SELECT i.*, c.balance as customer_balance 
      FROM invoices i 
      JOIN customers c ON i.customer_id = c.id 
      LIMIT 10
    `);
    
    let integrityIssues = [];
    
    for (const invoice of allInvoices) {
      // Check if customer ledger entries exist for this invoice
      const ledgerEntries = await db.dbConnection.select(
        'SELECT * FROM ledger_entries WHERE reference_id = ? AND customer_id = ?',
        [invoice.id, invoice.customer_id]
      );
      
      if (!ledgerEntries || ledgerEntries.length === 0) {
        integrityIssues.push({
          type: 'MISSING_LEDGER_ENTRY',
          invoiceId: invoice.id,
          billNumber: invoice.bill_number,
          customerId: invoice.customer_id
        });
      }
      
      // Check if invoice totals are consistent
      const items = await db.dbConnection.select(
        'SELECT * FROM invoice_items WHERE invoice_id = ?',
        [invoice.id]
      );
      
      const calculatedTotal = (items || []).reduce((sum, item) => sum + (item.total_price || 0), 0);
      const recordedTotal = invoice.total_amount || 0;
      
      if (Math.abs(calculatedTotal - recordedTotal) > 0.01) {
        integrityIssues.push({
          type: 'INVOICE_TOTAL_MISMATCH',
          invoiceId: invoice.id,
          billNumber: invoice.bill_number,
          calculatedTotal,
          recordedTotal,
          difference: Math.abs(calculatedTotal - recordedTotal)
        });
      }
    }
    
    console.log('\n📋 INTEGRITY ISSUES FOUND:', integrityIssues.length);
    
    if (integrityIssues.length > 0) {
      console.log('❌ INTEGRITY ISSUES DETECTED:');
      integrityIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}:`, issue);
      });
      
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      console.log('1. Run recalculateInvoiceTotals for invoices with total mismatches');
      console.log('2. Run updateCustomerLedgerForInvoice for invoices missing ledger entries');
      console.log('3. Verify customer balance calculations');
      
    } else {
      console.log('✅ NO INTEGRITY ISSUES DETECTED - System appears consistent');
    }
    
    // 4. Test constraint violations prevention
    console.log('\n=== CONSTRAINT VALIDATION TEST ===');
    
    try {
      // Test createLedgerEntry with invalid reference_type (should be fixed now)
      await db.createLedgerEntry({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }),
        type: 'incoming',
        category: 'Test',
        description: 'Constraint test',
        amount: 100,
        reference_type: 'invoice_payment', // This should be mapped to 'payment'
        created_by: 'test'
      });
      
      console.log('✅ createLedgerEntry constraint mapping works correctly');
      
    } catch (error) {
      console.log('❌ createLedgerEntry constraint fix failed:', error.message);
    }
    
    console.log('\n🎉 PERMANENT SOLUTION INTEGRITY CHECK COMPLETED');
    console.log('==========================================');
    
  } catch (error) {
    console.error('❌ INTEGRITY CHECK FAILED:', error);
    console.error('Stack trace:', error.stack);
  }
})();
