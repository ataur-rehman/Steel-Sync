/**
 * CRITICAL FIX: Zero-Amount Ledger Entries Issue
 * 
 * Problem: When invoices were created with full payment, the old logic created
 * ledger entries with amount 0, causing Balance Summary to be incorrect.
 * 
 * This tool identifies and fixes these problematic zero-amount entries.
 */

window.fixZeroAmountLedgerEntries = async function(customerId) {
  console.log(`🔍 Checking for zero-amount ledger entries for customer ${customerId}...`);
  
  try {
    // Find zero-amount entries that should have real amounts
    const zeroAmountEntries = await db.safeSelect(`
      SELECT 
        l.id,
        l.customer_id,
        l.entry_type,
        l.transaction_type,
        l.amount,
        l.description,
        l.reference_id,
        l.reference_number,
        l.notes,
        l.date,
        l.created_at
      FROM customer_ledger_entries l
      WHERE l.customer_id = ? 
        AND l.amount = 0
        AND l.notes LIKE '%FULL PAYMENT TRANSACTION%'
      ORDER BY l.date DESC, l.created_at DESC
    `, [customerId]);

    if (zeroAmountEntries.length === 0) {
      console.log('✅ No problematic zero-amount entries found');
      return { success: true, message: 'No issues found' };
    }

    console.log(`🚨 Found ${zeroAmountEntries.length} problematic zero-amount entries:`);
    zeroAmountEntries.forEach(entry => {
      console.log(`   ID: ${entry.id}, Description: ${entry.description}, Notes: ${entry.notes}`);
    });

    // For each zero-amount entry, extract the actual invoice and payment amounts
    const fixes = [];
    
    for (const entry of zeroAmountEntries) {
      // Parse the notes to get actual amounts
      const noteMatch = entry.notes.match(/Invoice Rs\.(\d+\.?\d*)\s*\+\s*Payment Rs\.(\d+\.?\d*)/);
      if (noteMatch) {
        const invoiceAmount = parseFloat(noteMatch[1]);
        const paymentAmount = parseFloat(noteMatch[2]);
        
        fixes.push({
          entryId: entry.id,
          referenceId: entry.reference_id,
          referenceNumber: entry.reference_number,
          invoiceAmount,
          paymentAmount,
          date: entry.date,
          originalEntry: entry
        });
        
        console.log(`   → Should be: Invoice Rs.${invoiceAmount} + Payment Rs.${paymentAmount}`);
      }
    }

    return { 
      success: true, 
      zeroAmountEntries, 
      fixes,
      message: `Found ${fixes.length} entries that need to be fixed`
    };
    
  } catch (error) {
    console.error('❌ Error checking zero-amount entries:', error);
    throw error;
  }
};

window.executeZeroAmountFix = async function(customerId, dryRun = true) {
  console.log(`🔧 ${dryRun ? 'DRY RUN' : 'EXECUTING'}: Fixing zero-amount ledger entries for customer ${customerId}`);
  
  try {
    // First, get the problematic entries
    const diagnosis = await window.fixZeroAmountLedgerEntries(customerId);
    
    if (!diagnosis.fixes || diagnosis.fixes.length === 0) {
      console.log('✅ No fixes needed');
      return { success: true, message: 'No fixes needed' };
    }

    const customer = await db.getCustomer(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    console.log(`📋 Will fix ${diagnosis.fixes.length} zero-amount entries`);

    if (!dryRun) {
      // Get current balance before starting
      const currentBalanceResult = await db.safeSelect(`
        SELECT balance_after FROM customer_ledger_entries 
        WHERE customer_id = ? 
          AND amount != 0  
        ORDER BY date DESC, created_at DESC 
        LIMIT 1
      `, [customerId]);
      
      let runningBalance = currentBalanceResult[0]?.balance_after || customer.total_balance || 0;
      
      for (const fix of diagnosis.fixes) {
        console.log(`🔄 Fixing entry ID ${fix.entryId} (${fix.referenceNumber})`);
        
        // Delete the problematic zero-amount entry
        await db.dbConnection.execute(
          'DELETE FROM customer_ledger_entries WHERE id = ?',
          [fix.entryId]
        );
        
        // Create proper debit entry for invoice
        const balanceAfterInvoice = runningBalance + fix.invoiceAmount;
        
        await db.dbConnection.execute(`
          INSERT INTO customer_ledger_entries (
            customer_id, customer_name, entry_type, transaction_type,
            amount, description, reference_id, reference_number,
            balance_before, balance_after, date, time,
            created_by, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          customerId, customer.name, 'debit', 'invoice',
          fix.invoiceAmount,
          `Invoice ${fix.referenceNumber}`,
          fix.referenceId, fix.referenceNumber,
          runningBalance, balanceAfterInvoice,
          fix.date, '12:00 PM', 'system_fix',
          `Corrected from zero-amount entry: Invoice amount Rs. ${fix.invoiceAmount.toFixed(2)}`
        ]);
        
        runningBalance = balanceAfterInvoice;

        // Create proper credit entry for payment
        const balanceAfterPayment = runningBalance - fix.paymentAmount;
        
        await db.dbConnection.execute(`
          INSERT INTO customer_ledger_entries (
            customer_id, customer_name, entry_type, transaction_type,
            amount, description, reference_id, reference_number,
            balance_before, balance_after, date, time,
            created_by, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          customerId, customer.name, 'credit', 'payment',
          fix.paymentAmount,
          `Payment - Invoice ${fix.referenceNumber}`,
          fix.referenceId, `PAY-${fix.referenceNumber}`,
          runningBalance, balanceAfterPayment,
          fix.date, '12:01 PM', 'system_fix',
          `Corrected from zero-amount entry: Payment Rs. ${fix.paymentAmount.toFixed(2)} for Invoice ${fix.referenceNumber}`
        ]);
        
        runningBalance = balanceAfterPayment;
        
        console.log(`✅ Fixed ${fix.referenceNumber}: Created debit Rs.${fix.invoiceAmount} and credit Rs.${fix.paymentAmount}`);
      }
      
      // Update customer balance
      await db.dbConnection.execute(
        'UPDATE customers SET total_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [runningBalance, customerId]
      );
      
      console.log(`🎉 Fixed ${diagnosis.fixes.length} zero-amount entries successfully!`);
      console.log(`   Final customer balance: Rs. ${runningBalance.toFixed(2)}`);
      
    } else {
      console.log(`✅ DRY RUN completed - would fix ${diagnosis.fixes.length} entries`);
      diagnosis.fixes.forEach(fix => {
        console.log(`   → ${fix.referenceNumber}: Invoice Rs.${fix.invoiceAmount} + Payment Rs.${fix.paymentAmount}`);
      });
    }
    
    return {
      success: true,
      fixedCount: diagnosis.fixes.length,
      fixes: diagnosis.fixes
    };
    
  } catch (error) {
    console.error('❌ Error executing zero-amount fix:', error);
    throw error;
  }
};

window.quickZeroAmountFix = async function(customerId) {
  console.log(`🚀 Quick fix for zero-amount entries - Customer ${customerId}`);
  
  try {
    // Check first
    const diagnosis = await window.fixZeroAmountLedgerEntries(customerId);
    
    if (!diagnosis.fixes || diagnosis.fixes.length === 0) {
      console.log('✅ No zero-amount issues found');
      return;
    }
    
    // Dry run first
    console.log('📋 DRY RUN:');
    await window.executeZeroAmountFix(customerId, true);
    
    // Confirm before executing
    const proceed = confirm(`Found ${diagnosis.fixes.length} zero-amount entries to fix. Proceed with the fix?`);
    
    if (proceed) {
      // Execute fix
      console.log('🔧 EXECUTING FIX:');
      const result = await window.executeZeroAmountFix(customerId, false);
      
      // Verify after fix
      console.log('🔍 VERIFICATION:');
      await window.fixZeroAmountLedgerEntries(customerId);
      
      console.log('🎉 Zero-amount fix completed!');
      return result;
    } else {
      console.log('❌ Fix cancelled by user');
    }
    
  } catch (error) {
    console.error('❌ Error in quick fix:', error);
    throw error;
  }
};

console.log('🔧 Zero-Amount Ledger Entry Fix Tools loaded!');
console.log('📋 Available functions:');
console.log('   • fixZeroAmountLedgerEntries(customerId) - Check for zero-amount issues');
console.log('   • executeZeroAmountFix(customerId, dryRun) - Fix zero-amount entries');
console.log('   • quickZeroAmountFix(customerId) - Complete workflow with confirmation');
console.log('');
console.log('🚀 RECOMMENDED: quickZeroAmountFix(customerId)');
