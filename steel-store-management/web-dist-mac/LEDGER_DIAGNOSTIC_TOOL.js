/**
 * CRITICAL DATA INTEGRITY DIAGNOSTIC TOOL
 * 
 * This tool identifies discrepancies between customer ledger entries and actual invoice/payment data.
 * Run this in the browser console after selecting a customer with discrepancies.
 * 
 * Usage: 
 * 1. Open browser console
 * 2. Navigate to customer ledger
 * 3. Select the customer showing discrepancies
 * 4. Run: await diagnoseLedgerDiscrepancies(customerId)
 */

window.diagnoseLedgerDiscrepancies = async function(customerId) {
  console.log(`🔍 Starting Data Integrity Diagnostic for Customer ID: ${customerId}`);
  console.log('=' .repeat(80));
  
  try {
    // 1. Get raw invoice data
    const invoiceData = await db.safeSelect(`
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(grand_total), 0) as total_amount,
        COALESCE(SUM(COALESCE(paid_amount, 0)), 0) as total_paid
      FROM invoices 
      WHERE customer_id = ?
    `, [customerId]);
    
    console.log('📊 RAW INVOICE DATA:');
    console.log(`   Count: ${invoiceData[0]?.count || 0}`);
    console.log(`   Total Amount: ${invoiceData[0]?.total_amount || 0}`);
    console.log(`   Total Paid: ${invoiceData[0]?.total_paid || 0}`);
    console.log('');
    
    // 2. Get raw payment data
    const paymentData = await db.safeSelect(`
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments 
      WHERE customer_id = ?
    `, [customerId]);
    
    console.log('💰 RAW PAYMENT DATA:');
    console.log(`   Count: ${paymentData[0]?.count || 0}`);
    console.log(`   Total Amount: ${paymentData[0]?.total_amount || 0}`);
    console.log('');
    
    // 3. Get ledger debits (invoices)
    const ledgerDebits = await db.safeSelect(`
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(amount), 0) as total_amount
      FROM customer_ledger_entries 
      WHERE customer_id = ? AND entry_type = 'debit'
    `, [customerId]);
    
    console.log('📈 LEDGER DEBITS (Should match invoices):');
    console.log(`   Count: ${ledgerDebits[0]?.count || 0}`);
    console.log(`   Total Amount: ${ledgerDebits[0]?.total_amount || 0}`);
    console.log('');
    
    // 4. Get ledger credits (payments)
    const ledgerCredits = await db.safeSelect(`
      SELECT 
        COUNT(*) as count, 
        COALESCE(SUM(amount), 0) as total_amount
      FROM customer_ledger_entries 
      WHERE customer_id = ? AND entry_type = 'credit'
    `, [customerId]);
    
    console.log('📉 LEDGER CREDITS (Should match payments):');
    console.log(`   Count: ${ledgerCredits[0]?.count || 0}`);
    console.log(`   Total Amount: ${ledgerCredits[0]?.total_amount || 0}`);
    console.log('');
    
    // 5. Calculate discrepancies
    const invoiceTotal = parseFloat(invoiceData[0]?.total_amount || 0);
    const paymentTotal = parseFloat(paymentData[0]?.total_amount || 0);
    const ledgerDebitTotal = parseFloat(ledgerDebits[0]?.total_amount || 0);
    const ledgerCreditTotal = parseFloat(ledgerCredits[0]?.total_amount || 0);
    
    const invoiceDiscrepancy = invoiceTotal - ledgerDebitTotal;
    const paymentDiscrepancy = paymentTotal - ledgerCreditTotal;
    
    console.log('🚨 DISCREPANCY ANALYSIS:');
    console.log(`   Invoice Discrepancy: ${invoiceDiscrepancy} (Invoices: ${invoiceTotal} vs Ledger: ${ledgerDebitTotal})`);
    console.log(`   Payment Discrepancy: ${paymentDiscrepancy} (Payments: ${paymentTotal} vs Ledger: ${ledgerCreditTotal})`);
    console.log('');
    
    if (invoiceDiscrepancy !== 0 || paymentDiscrepancy !== 0) {
      console.log('❌ CRITICAL: Data integrity issues detected!');
      console.log('');
      
      // 6. Find missing ledger entries
      console.log('🔍 DETAILED ANALYSIS:');
      
      // Check for invoices without ledger entries
      const missingInvoiceLedgers = await db.safeSelect(`
        SELECT 
          i.id as invoice_id,
          i.grand_total as invoice_amount,
          i.created_at as invoice_date,
          i.bill_number
        FROM invoices i
        LEFT JOIN customer_ledger_entries l 
          ON i.customer_id = l.customer_id 
          AND i.id = l.reference_id 
          AND l.entry_type = 'debit'
          AND l.transaction_type = 'invoice'
        WHERE i.customer_id = ? AND l.id IS NULL
        ORDER BY i.created_at DESC
      `, [customerId]);
      
      if (missingInvoiceLedgers.length > 0) {
        console.log('📋 INVOICES WITHOUT LEDGER ENTRIES:');
        missingInvoiceLedgers.forEach(invoice => {
          console.log(`   Invoice ID: ${invoice.invoice_id}, Bill: ${invoice.bill_number}, Amount: ${invoice.invoice_amount}, Date: ${invoice.invoice_date}`);
        });
        console.log('');
      }
      
      // Check for payments without ledger entries
      const missingPaymentLedgers = await db.safeSelect(`
        SELECT 
          p.id as payment_id,
          p.amount as payment_amount,
          p.date as payment_date
        FROM payments p
        LEFT JOIN customer_ledger_entries l 
          ON p.customer_id = l.customer_id 
          AND p.id = l.reference_id 
          AND l.entry_type = 'credit'
          AND l.transaction_type = 'payment'
        WHERE p.customer_id = ? AND l.id IS NULL
        ORDER BY p.date DESC
      `, [customerId]);
      
      if (missingPaymentLedgers.length > 0) {
        console.log('💳 PAYMENTS WITHOUT LEDGER ENTRIES:');
        missingPaymentLedgers.forEach(payment => {
          console.log(`   Payment ID: ${payment.payment_id}, Amount: ${payment.payment_amount}, Date: ${payment.payment_date}`);
        });
        console.log('');
      }
      
      // Check for orphaned ledger entries
      const orphanedDebits = await db.safeSelect(`
        SELECT 
          l.id as ledger_id,
          l.amount,
          l.reference_id,
          l.created_at
        FROM customer_ledger_entries l
        LEFT JOIN invoices i ON l.reference_id = i.id AND l.customer_id = i.customer_id
        WHERE l.customer_id = ? 
          AND l.entry_type = 'debit' 
          AND l.transaction_type = 'invoice'
          AND i.id IS NULL
        ORDER BY l.created_at DESC
      `, [customerId]);
      
      if (orphanedDebits.length > 0) {
        console.log('👻 ORPHANED DEBIT LEDGER ENTRIES (No matching invoice):');
        orphanedDebits.forEach(entry => {
          console.log(`   Ledger ID: ${entry.ledger_id}, Amount: ${entry.amount}, Ref ID: ${entry.reference_id}, Date: ${entry.created_at}`);
        });
        console.log('');
      }
      
      const orphanedCredits = await db.safeSelect(`
        SELECT 
          l.id as ledger_id,
          l.amount,
          l.reference_id,
          l.created_at
        FROM customer_ledger_entries l
        LEFT JOIN payments p ON l.reference_id = p.id AND l.customer_id = p.customer_id
        WHERE l.customer_id = ? 
          AND l.entry_type = 'credit' 
          AND l.transaction_type = 'payment'
          AND p.id IS NULL
        ORDER BY l.created_at DESC
      `, [customerId]);
      
      if (orphanedCredits.length > 0) {
        console.log('👻 ORPHANED CREDIT LEDGER ENTRIES (No matching payment):');
        orphanedCredits.forEach(entry => {
          console.log(`   Ledger ID: ${entry.ledger_id}, Amount: ${entry.amount}, Ref ID: ${entry.reference_id}, Date: ${entry.created_at}`);
        });
        console.log('');
      }
      
      // Check for duplicate ledger entries
      const duplicates = await db.safeSelect(`
        SELECT 
          customer_id,
          entry_type,
          transaction_type,
          reference_id,
          amount,
          date,
          COUNT(*) as duplicate_count
        FROM customer_ledger_entries
        WHERE customer_id = ?
        GROUP BY customer_id, entry_type, transaction_type, reference_id, amount, date
        HAVING COUNT(*) > 1
        ORDER BY duplicate_count DESC
      `, [customerId]);
      
      if (duplicates.length > 0) {
        console.log('🔄 DUPLICATE LEDGER ENTRIES:');
        duplicates.forEach(dup => {
          console.log(`   Type: ${dup.entry_type}, Ref ID: ${dup.reference_id}, Amount: ${dup.amount}, Count: ${dup.duplicate_count}`);
        });
        console.log('');
      }
      
    } else {
      console.log('✅ No discrepancies found - data integrity is intact!');
    }
    
    // 7. Customer balance analysis
    const customer = await db.getCustomer(customerId);
    const calculatedBalance = ledgerDebitTotal - ledgerCreditTotal;
    const storedBalance = customer?.total_balance || 0;
    const balanceDiscrepancy = storedBalance - calculatedBalance;
    
    console.log('⚖️ BALANCE ANALYSIS:');
    console.log(`   Stored Balance: ${storedBalance}`);
    console.log(`   Calculated Balance (from ledger): ${calculatedBalance}`);
    console.log(`   Balance Discrepancy: ${balanceDiscrepancy}`);
    
    if (Math.abs(balanceDiscrepancy) > 0.01) {
      console.log('❌ BALANCE MISMATCH DETECTED!');
    } else {
      console.log('✅ Balance is consistent');
    }
    
    console.log('=' .repeat(80));
    console.log('🔍 Diagnostic Complete');
    
    return {
      invoiceTotal,
      paymentTotal,
      ledgerDebitTotal,
      ledgerCreditTotal,
      invoiceDiscrepancy,
      paymentDiscrepancy,
      storedBalance,
      calculatedBalance,
      balanceDiscrepancy,
      hasDiscrepancies: (invoiceDiscrepancy !== 0 || paymentDiscrepancy !== 0 || Math.abs(balanceDiscrepancy) > 0.01)
    };
    
  } catch (error) {
    console.error('❌ Error during diagnostic:', error);
    throw error;
  }
};

// Quick diagnostic for currently selected customer
window.quickLedgerDiagnostic = async function() {
  const customerId = window.selectedCustomerId || prompt('Enter Customer ID:');
  if (customerId) {
    return await window.diagnoseLedgerDiscrepancies(parseInt(customerId));
  } else {
    console.log('❌ No customer ID provided');
  }
};

console.log('🔧 Ledger Diagnostic Tools loaded!');
console.log('📋 Available functions:');
console.log('   • diagnoseLedgerDiscrepancies(customerId) - Full diagnostic');
console.log('   • quickLedgerDiagnostic() - Quick diagnostic for current/prompted customer');
