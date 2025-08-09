/**
 * CUSTOMER BALANCE & LEDGER INTEGRITY ANALYZER
 * 
 * This script identifies integrity issues with customer balances and ledger entries
 * Copy and paste into browser console to run
 */

window.analyzeIntegrity = async function() {
  console.log('🔍 [INTEGRITY ANALYZER] Starting comprehensive integrity analysis...');
  
  try {
    const integrityIssues = [];
    const warnings = [];
    
    // Get all customers with invoices
    const customers = await db.dbConnection.select(`
      SELECT DISTINCT c.*, 
             COUNT(i.id) as invoice_count,
             SUM(i.total_amount) as total_invoiced,
             SUM(i.paid_amount) as total_paid,
             SUM(i.remaining_balance) as total_remaining
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
      WHERE c.is_active = 1
      GROUP BY c.id
      HAVING invoice_count > 0
      LIMIT 20
    `);
    
    console.log(`📊 Analyzing ${customers.length} customers with invoices...`);
    
    for (const customer of customers) {
      console.log(`\n👤 Analyzing customer: ${customer.name} (ID: ${customer.id})`);
      
      // 1. Check customer balance vs calculated balance
      const calculatedBalance = customer.total_remaining || 0;
      const recordedBalance = customer.balance || 0;
      const balanceDifference = Math.abs(calculatedBalance - recordedBalance);
      
      if (balanceDifference > 0.01) {
        integrityIssues.push({
          type: 'CUSTOMER_BALANCE_MISMATCH',
          customerId: customer.id,
          customerName: customer.name,
          recordedBalance,
          calculatedBalance,
          difference: balanceDifference
        });
      }
      
      // 2. Check ledger entries completeness
      const ledgerEntries = await db.dbConnection.select(`
        SELECT * FROM ledger_entries 
        WHERE customer_id = ? 
        ORDER BY created_at
      `, [customer.id]);
      
      const invoices = await db.dbConnection.select(`
        SELECT * FROM invoices 
        WHERE customer_id = ? 
        ORDER BY created_at
      `, [customer.id]);
      
      const payments = await db.dbConnection.select(`
        SELECT * FROM payments 
        WHERE customer_id = ? 
        ORDER BY created_at
      `, [customer.id]);
      
      // Check if each invoice has corresponding ledger entry
      for (const invoice of invoices) {
        const invoiceLedgerEntry = ledgerEntries.find(entry => 
          entry.reference_id === invoice.id && 
          (entry.reference_type === 'invoice' || entry.reference_type === 'payment')
        );
        
        if (!invoiceLedgerEntry) {
          integrityIssues.push({
            type: 'MISSING_INVOICE_LEDGER_ENTRY',
            customerId: customer.id,
            customerName: customer.name,
            invoiceId: invoice.id,
            billNumber: invoice.bill_number,
            amount: invoice.total_amount
          });
        }
      }
      
      // Check if each payment has corresponding ledger entry
      for (const payment of payments) {
        const paymentLedgerEntry = ledgerEntries.find(entry => 
          entry.reference_id === payment.invoice_id && 
          entry.reference_type === 'payment'
        );
        
        if (!paymentLedgerEntry) {
          warnings.push({
            type: 'MISSING_PAYMENT_LEDGER_ENTRY',
            customerId: customer.id,
            customerName: customer.name,
            paymentId: payment.id,
            invoiceId: payment.invoice_id,
            amount: payment.amount
          });
        }
      }
      
      // 3. Check ledger running balance consistency
      let expectedRunningBalance = 0;
      for (const entry of ledgerEntries) {
        if (entry.type === 'incoming') {
          expectedRunningBalance += entry.amount;
        } else if (entry.type === 'outgoing') {
          expectedRunningBalance -= entry.amount;
        }
        
        if (Math.abs(expectedRunningBalance - (entry.running_balance || 0)) > 0.01) {
          warnings.push({
            type: 'LEDGER_RUNNING_BALANCE_INCONSISTENT',
            customerId: customer.id,
            customerName: customer.name,
            entryId: entry.id,
            expected: expectedRunningBalance,
            recorded: entry.running_balance
          });
        }
      }
      
      // 4. Check invoice totals vs items
      for (const invoice of invoices) {
        const items = await db.dbConnection.select(`
          SELECT * FROM invoice_items WHERE invoice_id = ?
        `, [invoice.id]);
        
        const calculatedTotal = (items || []).reduce((sum, item) => sum + (item.total_price || 0), 0);
        const recordedTotal = invoice.total_amount || 0;
        
        if (Math.abs(calculatedTotal - recordedTotal) > 0.01) {
          integrityIssues.push({
            type: 'INVOICE_TOTAL_MISMATCH',
            customerId: customer.id,
            customerName: customer.name,
            invoiceId: invoice.id,
            billNumber: invoice.bill_number,
            calculatedTotal,
            recordedTotal,
            difference: Math.abs(calculatedTotal - recordedTotal)
          });
        }
      }
    }
    
    // Report findings
    console.log('\n📋 INTEGRITY ANALYSIS RESULTS');
    console.log('===============================');
    
    console.log(`\n❌ CRITICAL ISSUES FOUND: ${integrityIssues.length}`);
    if (integrityIssues.length > 0) {
      const groupedIssues = {};
      integrityIssues.forEach(issue => {
        if (!groupedIssues[issue.type]) groupedIssues[issue.type] = [];
        groupedIssues[issue.type].push(issue);
      });
      
      Object.keys(groupedIssues).forEach(type => {
        console.log(`\n🔴 ${type}: ${groupedIssues[type].length} occurrences`);
        groupedIssues[type].slice(0, 3).forEach((issue, index) => {
          console.log(`   ${index + 1}. Customer: ${issue.customerName}`, 
            type === 'CUSTOMER_BALANCE_MISMATCH' 
              ? `(Recorded: ${issue.recordedBalance}, Calculated: ${issue.calculatedBalance})`
              : type === 'INVOICE_TOTAL_MISMATCH'
              ? `Invoice ${issue.billNumber} (Diff: ${issue.difference})`
              : `Invoice: ${issue.billNumber || issue.invoiceId}`
          );
        });
        if (groupedIssues[type].length > 3) {
          console.log(`   ... and ${groupedIssues[type].length - 3} more`);
        }
      });
    }
    
    console.log(`\n⚠️ WARNINGS FOUND: ${warnings.length}`);
    if (warnings.length > 0) {
      const groupedWarnings = {};
      warnings.forEach(warning => {
        if (!groupedWarnings[warning.type]) groupedWarnings[warning.type] = [];
        groupedWarnings[warning.type].push(warning);
      });
      
      Object.keys(groupedWarnings).forEach(type => {
        console.log(`\n🟡 ${type}: ${groupedWarnings[type].length} occurrences`);
      });
    }
    
    // Provide fix recommendations
    if (integrityIssues.length > 0) {
      console.log('\n🔧 RECOMMENDED FIXES:');
      
      const balanceIssues = integrityIssues.filter(i => i.type === 'CUSTOMER_BALANCE_MISMATCH');
      if (balanceIssues.length > 0) {
        console.log('\n1. Fix customer balance mismatches:');
        console.log('   Run this code to fix customer balances:');
        console.log(`   window.fixCustomerBalances = async function() {
     const issues = ${JSON.stringify(balanceIssues, null, 2)};
     for (const issue of issues) {
       await db.dbConnection.execute(
         'UPDATE customers SET balance = ? WHERE id = ?',
         [issue.calculatedBalance, issue.customerId]
       );
       console.log(\`✅ Fixed balance for \${issue.customerName}: \${issue.recordedBalance} → \${issue.calculatedBalance}\`);
     }
   };`);
      }
      
      const missingLedgerIssues = integrityIssues.filter(i => i.type === 'MISSING_INVOICE_LEDGER_ENTRY');
      if (missingLedgerIssues.length > 0) {
        console.log('\n2. Fix missing invoice ledger entries:');
        console.log('   Run this code to create missing ledger entries:');
        console.log(`   window.fixMissingLedgerEntries = async function() {
     const issues = ${JSON.stringify(missingLedgerIssues.slice(0, 5), null, 2)};
     for (const issue of issues) {
       await db.updateCustomerLedgerForInvoice(issue.invoiceId);
       console.log(\`✅ Created ledger entry for invoice \${issue.billNumber}\`);
     }
   };`);
      }
      
      const totalMismatchIssues = integrityIssues.filter(i => i.type === 'INVOICE_TOTAL_MISMATCH');
      if (totalMismatchIssues.length > 0) {
        console.log('\n3. Fix invoice total mismatches:');
        console.log('   Run this code to recalculate invoice totals:');
        console.log(`   window.fixInvoiceTotals = async function() {
     const issues = ${JSON.stringify(totalMismatchIssues.slice(0, 5), null, 2)};
     for (const issue of issues) {
       await db.recalculateInvoiceTotals(issue.invoiceId);
       console.log(\`✅ Recalculated totals for invoice \${issue.billNumber}\`);
     }
   };`);
      }
    }
    
    if (integrityIssues.length === 0 && warnings.length === 0) {
      console.log('\n🎉 EXCELLENT! No integrity issues found!');
      console.log('   Your customer balances and ledger entries are consistent.');
    } else {
      console.log('\n📋 SUMMARY:');
      console.log(`   🔴 Critical issues: ${integrityIssues.length}`);
      console.log(`   🟡 Warnings: ${warnings.length}`);
      console.log('   Use the provided fix functions to resolve issues.');
    }
    
  } catch (error) {
    console.error('❌ Integrity analysis failed:', error);
  }
};

console.log('🔍 CUSTOMER BALANCE & LEDGER INTEGRITY ANALYZER');
console.log('================================================');
console.log('Run: analyzeIntegrity() - to check for integrity issues');
console.log('This will identify:');
console.log('• Customer balance mismatches');
console.log('• Missing ledger entries');
console.log('• Invoice total inconsistencies');
console.log('• Running balance issues');
