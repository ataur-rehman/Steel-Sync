/**
 * CRITICAL DATA INTEGRITY FIX
 * 
 * This script fixes the fundamental data inconsistency between:
 * 1. Customer ledger entries (used for Balance Summary)
 * 2. Raw invoice/payment data (used for Financial Summary)
 * 
 * ROOT CAUSE: Inconsistent ledger entry creation and dual data sources
 */

// STEP 1: Backup existing data
window.backupCustomerLedgerData = async function(customerId) {
  console.log(`🔒 Backing up customer ledger data for customer ${customerId}...`);
  
  const backup = {
    timestamp: new Date().toISOString(),
    customer: await db.getCustomer(customerId),
    invoices: await db.safeSelect('SELECT * FROM invoices WHERE customer_id = ?', [customerId]),
    payments: await db.safeSelect('SELECT * FROM payments WHERE customer_id = ?', [customerId]),
    ledgerEntries: await db.safeSelect('SELECT * FROM customer_ledger_entries WHERE customer_id = ?', [customerId])
  };
  
  console.log('📋 Backup created:', backup);
  return backup;
};

// STEP 2: Rebuild customer ledger entries from source transactions
window.rebuildCustomerLedger = async function(customerId, dryRun = true) {
  console.log(`🔧 ${dryRun ? 'DRY RUN' : 'EXECUTING'}: Rebuilding customer ledger for customer ${customerId}`);
  
  try {
    // Get customer info
    const customer = await db.getCustomer(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Get all invoices and payments
    const invoices = await db.safeSelect(`
      SELECT id, customer_id, bill_number, grand_total, 
             COALESCE(paid_amount, 0) as paid_amount,
             COALESCE(remaining_balance, grand_total) as remaining_balance,
             DATE(created_at) as date, created_at
      FROM invoices 
      WHERE customer_id = ? 
      ORDER BY created_at ASC
    `, [customerId]);
    
    const payments = await db.safeSelect(`
      SELECT id, customer_id, amount, payment_method, 
             DATE(date) as date, date as full_date,
             reference_invoice_id, notes
      FROM payments 
      WHERE customer_id = ? 
      ORDER BY date ASC, id ASC
    `, [customerId]);
    
    console.log(`📊 Found ${invoices.length} invoices and ${payments.length} payments`);
    
    // Calculate correct totals
    const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.grand_total || 0), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + parseFloat(pay.amount || 0), 0);
    const calculatedBalance = totalInvoiced - totalPaid;
    
    console.log(`💰 Calculated totals:`);
    console.log(`   Total Invoiced: ${totalInvoiced}`);
    console.log(`   Total Paid: ${totalPaid}`);
    console.log(`   Calculated Balance: ${calculatedBalance}`);
    
    if (!dryRun) {
      // Clear existing customer ledger entries
      console.log('🗑️ Clearing existing customer ledger entries...');
      await db.dbConnection.execute(
        'DELETE FROM customer_ledger_entries WHERE customer_id = ?',
        [customerId]
      );
      
      // Rebuild ledger entries chronologically
      let runningBalance = 0;
      const allTransactions = [];
      
      // Add invoices
      invoices.forEach(invoice => {
        allTransactions.push({
          type: 'invoice',
          date: invoice.created_at,
          data: invoice
        });
      });
      
      // Add payments  
      payments.forEach(payment => {
        allTransactions.push({
          type: 'payment',
          date: payment.full_date,
          data: payment
        });
      });
      
      // Sort chronologically
      allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      console.log(`📅 Processing ${allTransactions.length} transactions chronologically...`);
      
      for (const transaction of allTransactions) {
        const date = new Date(transaction.date).toISOString().split('T')[0];
        const time = new Date(transaction.date).toLocaleTimeString('en-PK', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });
        
        const balanceBefore = runningBalance;
        
        if (transaction.type === 'invoice') {
          const invoice = transaction.data;
          runningBalance += parseFloat(invoice.grand_total);
          
          // Create debit entry for invoice
          await db.dbConnection.execute(`
            INSERT INTO customer_ledger_entries (
              customer_id, customer_name, entry_type, transaction_type, 
              amount, description, reference_id, reference_number,
              balance_before, balance_after, date, time, 
              created_by, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            customerId, customer.name, 'debit', 'invoice',
            parseFloat(invoice.grand_total),
            `Invoice ${invoice.bill_number}`,
            invoice.id, invoice.bill_number,
            balanceBefore, runningBalance,
            date, time, 'system_rebuild',
            `Invoice amount: Rs. ${parseFloat(invoice.grand_total).toFixed(2)}`
          ]);
          
          console.log(`➕ Created debit entry: Invoice ${invoice.bill_number} - Rs. ${invoice.grand_total}`);
          
        } else if (transaction.type === 'payment') {
          const payment = transaction.data;
          runningBalance -= parseFloat(payment.amount);
          
          // Create credit entry for payment
          await db.dbConnection.execute(`
            INSERT INTO customer_ledger_entries (
              customer_id, customer_name, entry_type, transaction_type,
              amount, description, reference_id, reference_number,
              balance_before, balance_after, date, time,
              created_by, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            customerId, customer.name, 'credit', 'payment',
            parseFloat(payment.amount),
            `Payment - ${payment.payment_method}`,
            payment.id, `PAY-${payment.id}`,
            balanceBefore, runningBalance,
            date, time, 'system_rebuild',
            `Payment: Rs. ${parseFloat(payment.amount).toFixed(2)} via ${payment.payment_method}`
          ]);
          
          console.log(`➖ Created credit entry: Payment Rs. ${payment.amount} via ${payment.payment_method}`);
        }
      }
      
      // Update customer balance
      await db.dbConnection.execute(
        'UPDATE customers SET total_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [runningBalance, customerId]
      );
      
      console.log(`✅ Customer ledger rebuilt successfully!`);
      console.log(`   Final balance: Rs. ${runningBalance.toFixed(2)}`);
      
    } else {
      console.log(`✅ DRY RUN completed - no changes made`);
      console.log(`   Would create ${invoices.length + payments.length} ledger entries`);
    }
    
    return {
      success: true,
      totalInvoiced,
      totalPaid,
      calculatedBalance,
      transactionCount: invoices.length + payments.length
    };
    
  } catch (error) {
    console.error('❌ Error rebuilding customer ledger:', error);
    throw error;
  }
};

// STEP 3: Fix the Financial Summary function to use consistent data source
window.fixFinancialSummaryCalculation = function() {
  console.log('🔧 Fixing Financial Summary calculation to use consistent data source...');
  
  // This would require modifying the getCustomerAccountSummary function
  // to use customer_ledger_entries instead of raw invoice/payment data
  console.log('⚠️ This requires code changes in database.ts - getCustomerAccountSummary function');
  console.log('   Current: Uses raw invoices/payments tables');
  console.log('   Required: Use customer_ledger_entries for consistency');
};

// STEP 4: Validate data integrity
window.validateCustomerDataIntegrity = async function(customerId) {
  console.log(`🔍 Validating data integrity for customer ${customerId}...`);
  
  try {
    // Get data from both sources
    const invoiceData = await db.safeSelect(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(grand_total), 0) as total_invoiced,
        COALESCE(SUM(COALESCE(paid_amount, 0)), 0) as total_paid_in_invoices
      FROM invoices WHERE customer_id = ?
    `, [customerId]);
    
    const paymentData = await db.safeSelect(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_paid
      FROM payments WHERE customer_id = ?
    `, [customerId]);
    
    const ledgerDebits = await db.safeSelect(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_debits
      FROM customer_ledger_entries 
      WHERE customer_id = ? AND entry_type = 'debit'
    `, [customerId]);
    
    const ledgerCredits = await db.safeSelect(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_credits
      FROM customer_ledger_entries 
      WHERE customer_id = ? AND entry_type = 'credit'
    `, [customerId]);
    
    const customer = await db.getCustomer(customerId);
    
    const results = {
      invoiced_amount: parseFloat(invoiceData[0]?.total_invoiced || 0),
      paid_amount_from_payments: parseFloat(paymentData[0]?.total_paid || 0),
      ledger_debits: parseFloat(ledgerDebits[0]?.total_debits || 0),
      ledger_credits: parseFloat(ledgerCredits[0]?.total_credits || 0),
      customer_balance: parseFloat(customer?.total_balance || 0),
      calculated_balance_from_ledger: parseFloat(ledgerDebits[0]?.total_debits || 0) - parseFloat(ledgerCredits[0]?.total_credits || 0),
      calculated_balance_from_transactions: parseFloat(invoiceData[0]?.total_invoiced || 0) - parseFloat(paymentData[0]?.total_paid || 0)
    };
    
    // Check for discrepancies
    const invoice_ledger_discrepancy = Math.abs(results.invoiced_amount - results.ledger_debits);
    const payment_ledger_discrepancy = Math.abs(results.paid_amount_from_payments - results.ledger_credits);
    const balance_discrepancy = Math.abs(results.customer_balance - results.calculated_balance_from_ledger);
    
    console.log('📊 INTEGRITY REPORT:');
    console.log(`   Invoice Amount: ${results.invoiced_amount} | Ledger Debits: ${results.ledger_debits} | Discrepancy: ${invoice_ledger_discrepancy}`);
    console.log(`   Payment Amount: ${results.paid_amount_from_payments} | Ledger Credits: ${results.ledger_credits} | Discrepancy: ${payment_ledger_discrepancy}`);
    console.log(`   Customer Balance: ${results.customer_balance} | Calculated: ${results.calculated_balance_from_ledger} | Discrepancy: ${balance_discrepancy}`);
    
    const hasIssues = invoice_ledger_discrepancy > 0.01 || payment_ledger_discrepancy > 0.01 || balance_discrepancy > 0.01;
    
    if (hasIssues) {
      console.log('❌ DATA INTEGRITY ISSUES DETECTED!');
    } else {
      console.log('✅ Data integrity is good');
    }
    
    return { ...results, hasIssues, discrepancies: { invoice_ledger_discrepancy, payment_ledger_discrepancy, balance_discrepancy } };
    
  } catch (error) {
    console.error('❌ Error validating data integrity:', error);
    throw error;
  }
};

// STEP 5: Complete fix workflow
window.fixCustomerLedgerIssues = async function(customerId, executeChanges = false) {
  console.log(`🚀 Starting complete customer ledger fix for customer ${customerId}`);
  console.log(`   Mode: ${executeChanges ? 'EXECUTE CHANGES' : 'DRY RUN'}`);
  
  try {
    // Step 1: Backup
    const backup = await window.backupCustomerLedgerData(customerId);
    
    // Step 2: Validate current issues
    const validation = await window.validateCustomerDataIntegrity(customerId);
    
    if (!validation.hasIssues && !executeChanges) {
      console.log('✅ No issues found, no changes needed');
      return { success: true, message: 'No issues found' };
    }
    
    // Step 3: Rebuild ledger
    const rebuildResult = await window.rebuildCustomerLedger(customerId, !executeChanges);
    
    if (executeChanges) {
      // Step 4: Validate fix
      const postValidation = await window.validateCustomerDataIntegrity(customerId);
      
      if (!postValidation.hasIssues) {
        console.log('🎉 Customer ledger issues FIXED successfully!');
        return { success: true, message: 'Issues fixed successfully', backup, validation: postValidation };
      } else {
        console.log('❌ Issues remain after fix attempt');
        return { success: false, message: 'Issues remain after fix', backup, validation: postValidation };
      }
    } else {
      return { success: true, message: 'Dry run completed', backup, validation, rebuildResult };
    }
    
  } catch (error) {
    console.error('❌ Error in fix workflow:', error);
    throw error;
  }
};

console.log('🔧 Customer Ledger Fix Tools loaded!');
console.log('📋 Available functions:');
console.log('   • backupCustomerLedgerData(customerId) - Backup data before changes');
console.log('   • validateCustomerDataIntegrity(customerId) - Check for issues');  
console.log('   • rebuildCustomerLedger(customerId, dryRun=true) - Rebuild ledger entries');
console.log('   • fixCustomerLedgerIssues(customerId, executeChanges=false) - Complete fix workflow');
console.log('');
console.log('🚀 RECOMMENDED WORKFLOW:');
console.log('   1. fixCustomerLedgerIssues(customerId, false) // Dry run');
console.log('   2. fixCustomerLedgerIssues(customerId, true)  // Execute fix');
