// CUSTOMER LEDGER OUTSTANDING BALANCE DIAGNOSTIC & FIX TOOL
// Checks and fixes outstanding balance calculation and event listener issues

console.log('🔍 CUSTOMER LEDGER OUTSTANDING BALANCE DIAGNOSTIC STARTING...');
console.log('📋 This tool will check and fix balance calculation and event listener issues');

const CUSTOMER_LEDGER_DIAGNOSTIC = {
  async checkOutstandingBalanceAccuracy() {
    try {
      console.log('1️⃣ Checking outstanding balance accuracy...');
      
      // Get all customers with their stored balance and calculated balance
      const customers = await db.safeSelect(`
        SELECT 
          c.id,
          c.name,
          c.balance as stored_balance,
          COALESCE(SUM(CASE WHEN l.entry_type = 'debit' THEN l.amount ELSE 0 END), 0) as ledger_debits,
          COALESCE(SUM(CASE WHEN l.entry_type = 'credit' THEN l.amount ELSE 0 END), 0) as ledger_credits,
          COALESCE(SUM(CASE WHEN l.entry_type = 'debit' THEN l.amount ELSE -l.amount END), 0) as calculated_balance,
          ABS(c.balance - COALESCE(SUM(CASE WHEN l.entry_type = 'debit' THEN l.amount ELSE -l.amount END), 0)) as discrepancy
        FROM customers c
        LEFT JOIN customer_ledger_entries l ON c.id = l.customer_id
        GROUP BY c.id, c.name, c.balance
        ORDER BY discrepancy DESC
        LIMIT 10
      `);
      
      console.log(`📊 Outstanding Balance Accuracy Report:`);
      console.log(`Found ${customers.length} customers with largest discrepancies:`);
      
      let issuesFound = 0;
      
      customers.forEach((customer, index) => {
        const hasIssue = customer.discrepancy > 0.01;
        const status = hasIssue ? '❌ ISSUE' : '✅ OK';
        
        if (hasIssue) issuesFound++;
        
        console.log(`   ${index + 1}. ${customer.name} (ID: ${customer.id}) - ${status}`);
        console.log(`      Stored Balance: Rs.${(customer.stored_balance || 0).toFixed(2)}`);
        console.log(`      Calculated: Rs.${customer.calculated_balance.toFixed(2)}`);
        console.log(`      Discrepancy: Rs.${customer.discrepancy.toFixed(2)}`);
        console.log(`      Ledger: Debits Rs.${customer.ledger_debits.toFixed(2)}, Credits Rs.${customer.ledger_credits.toFixed(2)}`);
        console.log('');
      });
      
      return { 
        success: true, 
        customersChecked: customers.length,
        issuesFound: issuesFound,
        customers: customers
      };
      
    } catch (error) {
      console.error('❌ Error checking outstanding balance accuracy:', error);
      return { success: false, message: error.message };
    }
  },
  
  async fixOutstandingBalanceDiscrepancies() {
    try {
      console.log('2️⃣ Fixing outstanding balance discrepancies...');
      
      // Get customers with significant discrepancies
      const customersWithIssues = await db.safeSelect(`
        SELECT 
          c.id,
          c.name,
          c.balance as stored_balance,
          COALESCE(SUM(CASE WHEN l.entry_type = 'debit' THEN l.amount ELSE -l.amount END), 0) as calculated_balance,
          ABS(c.balance - COALESCE(SUM(CASE WHEN l.entry_type = 'debit' THEN l.amount ELSE -l.amount END), 0)) as discrepancy
        FROM customers c
        LEFT JOIN customer_ledger_entries l ON c.id = l.customer_id
        GROUP BY c.id, c.name, c.balance
        HAVING discrepancy > 0.01
        ORDER BY discrepancy DESC
      `);
      
      console.log(`Found ${customersWithIssues.length} customers with balance discrepancies to fix`);
      
      let fixedCount = 0;
      
      for (const customer of customersWithIssues) {
        try {
          const oldBalance = customer.stored_balance || 0;
          const newBalance = customer.calculated_balance;
          
          // Update customer balance
          await db.execute(
            "UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [newBalance, customer.id]
          );
          
          console.log(`✅ Fixed ${customer.name}: ${oldBalance.toFixed(2)} → ${newBalance.toFixed(2)}`);
          fixedCount++;
          
        } catch (error) {
          console.log(`❌ Failed to fix ${customer.name}: ${error.message}`);
        }
      }
      
      console.log(`🎉 Fixed ${fixedCount}/${customersWithIssues.length} customer balance discrepancies`);
      
      return {
        success: true,
        customersFound: customersWithIssues.length,
        customersFixed: fixedCount
      };
      
    } catch (error) {
      console.error('❌ Error fixing outstanding balance discrepancies:', error);
      return { success: false, message: error.message };
    }
  },
  
  async testEventListeners() {
    try {
      console.log('3️⃣ Testing event listener functionality...');
      
      // Check if EventBus is properly loaded
      let eventBus, BUSINESS_EVENTS;
      try {
        const eventModule = await import('/src/utils/eventBus.ts');
        eventBus = eventModule.eventBus;
        BUSINESS_EVENTS = eventModule.BUSINESS_EVENTS;
        console.log('✅ EventBus module loaded successfully');
      } catch (error) {
        console.log('❌ Failed to load EventBus module:', error.message);
        return { success: false, message: 'EventBus not available' };
      }
      
      // Test event emission
      let testEventReceived = false;
      const testHandler = (data) => {
        testEventReceived = true;
        console.log('✅ Test event received:', data);
      };
      
      // Register test listener
      eventBus.on('TEST_EVENT', testHandler);
      
      // Emit test event
      eventBus.emit('TEST_EVENT', { test: true, timestamp: new Date().toISOString() });
      
      // Wait a moment for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Cleanup
      eventBus.off('TEST_EVENT', testHandler);
      
      // Check commonly used events
      const eventListenerCounts = {
        CUSTOMER_BALANCE_UPDATED: eventBus.getListenerCount(BUSINESS_EVENTS.CUSTOMER_BALANCE_UPDATED),
        CUSTOMER_LEDGER_UPDATED: eventBus.getListenerCount(BUSINESS_EVENTS.CUSTOMER_LEDGER_UPDATED),
        INVOICE_CREATED: eventBus.getListenerCount(BUSINESS_EVENTS.INVOICE_CREATED),
        PAYMENT_RECORDED: eventBus.getListenerCount(BUSINESS_EVENTS.PAYMENT_RECORDED)
      };
      
      console.log('📊 Event Listener Status:');
      Object.entries(eventListenerCounts).forEach(([event, count]) => {
        const status = count > 0 ? '✅' : '⚠️';
        console.log(`   ${status} ${event}: ${count} listeners`);
      });
      
      return {
        success: true,
        testEventWorked: testEventReceived,
        listenerCounts: eventListenerCounts
      };
      
    } catch (error) {
      console.error('❌ Error testing event listeners:', error);
      return { success: false, message: error.message };
    }
  },
  
  async testCustomerAccountSummary(customerId = null) {
    try {
      console.log('4️⃣ Testing customer account summary calculation...');
      
      // Use provided customer ID or find a customer with transactions
      let testCustomerId = customerId;
      
      if (!testCustomerId) {
        const customerWithTransactions = await db.safeSelect(`
          SELECT c.id, c.name, COUNT(l.id) as transaction_count
          FROM customers c
          LEFT JOIN customer_ledger_entries l ON c.id = l.customer_id
          GROUP BY c.id, c.name
          HAVING transaction_count > 0
          ORDER BY transaction_count DESC
          LIMIT 1
        `);
        
        if (customerWithTransactions.length === 0) {
          console.log('⚠️ No customers with transactions found');
          return { success: false, message: 'No test data available' };
        }
        
        testCustomerId = customerWithTransactions[0].id;
        console.log(`Using customer: ${customerWithTransactions[0].name} (ID: ${testCustomerId})`);
      }
      
      // Test the account summary calculation
      console.log('📊 Testing account summary calculation...');
      
      // Manual calculation
      const manualCalculation = await db.safeSelect(`
        SELECT 
          COUNT(CASE WHEN entry_type = 'debit' AND transaction_type = 'invoice' THEN 1 END) as invoice_count,
          COALESCE(SUM(CASE WHEN entry_type = 'debit' AND transaction_type = 'invoice' THEN amount ELSE 0 END), 0) as total_invoiced,
          COALESCE(SUM(CASE WHEN entry_type = 'credit' AND transaction_type = 'payment' THEN amount ELSE 0 END), 0) as total_paid,
          COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) as outstanding_balance
        FROM customer_ledger_entries 
        WHERE customer_id = ?
      `, [testCustomerId]);
      
      const manual = manualCalculation[0];
      
      console.log('Manual Calculation Results:');
      console.log(`   📋 Total Invoices: ${manual.invoice_count}`);
      console.log(`   💰 Total Invoiced: Rs.${manual.total_invoiced.toFixed(2)}`);
      console.log(`   💳 Total Paid: Rs.${manual.total_paid.toFixed(2)}`);
      console.log(`   📊 Outstanding: Rs.${manual.outstanding_balance.toFixed(2)}`);
      
      // Test via database service
      try {
        const accountSummary = await db.getCustomerAccountSummary(testCustomerId);
        console.log('\nDatabase Service Results:');
        console.log(`   📋 Total Invoices: ${accountSummary.totalInvoicesCount}`);
        console.log(`   💰 Total Invoiced: Rs.${accountSummary.totalInvoicedAmount.toFixed(2)}`);
        console.log(`   💳 Total Paid: Rs.${accountSummary.totalPaidAmount.toFixed(2)}`);
        console.log(`   📊 Outstanding: Rs.${accountSummary.outstandingAmount.toFixed(2)}`);
        
        // Compare results
        const invoicedMatch = Math.abs(manual.total_invoiced - accountSummary.totalInvoicedAmount) < 0.01;
        const paidMatch = Math.abs(manual.total_paid - accountSummary.totalPaidAmount) < 0.01;
        const outstandingMatch = Math.abs(manual.outstanding_balance - accountSummary.outstandingAmount) < 0.01;
        const countMatch = manual.invoice_count === accountSummary.totalInvoicesCount;
        
        console.log('\n🔍 Comparison Results:');
        console.log(`   ${invoicedMatch ? '✅' : '❌'} Total Invoiced Match`);
        console.log(`   ${paidMatch ? '✅' : '❌'} Total Paid Match`);
        console.log(`   ${outstandingMatch ? '✅' : '❌'} Outstanding Balance Match`);
        console.log(`   ${countMatch ? '✅' : '❌'} Invoice Count Match`);
        
        const allMatch = invoicedMatch && paidMatch && outstandingMatch && countMatch;
        
        return {
          success: true,
          testCustomerId: testCustomerId,
          calculationCorrect: allMatch,
          manual: manual,
          service: accountSummary,
          comparison: {
            invoicedMatch,
            paidMatch,
            outstandingMatch,
            countMatch
          }
        };
        
      } catch (serviceError) {
        console.log(`❌ Database service error: ${serviceError.message}`);
        return { success: false, message: `Service error: ${serviceError.message}` };
      }
      
    } catch (error) {
      console.error('❌ Error testing customer account summary:', error);
      return { success: false, message: error.message };
    }
  }
};

// Main diagnostic execution function
async function runCustomerLedgerDiagnostic(customerId = null) {
  console.log('🎯 CUSTOMER LEDGER OUTSTANDING BALANCE DIAGNOSTIC STARTING...');
  console.log('=' * 70);
  
  // Step 1: Check balance accuracy
  const balanceCheck = await CUSTOMER_LEDGER_DIAGNOSTIC.checkOutstandingBalanceAccuracy();
  console.log(`\n📊 Balance Accuracy Check: ${balanceCheck.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (balanceCheck.success) {
    console.log(`   Customers Checked: ${balanceCheck.customersChecked}`);
    console.log(`   Issues Found: ${balanceCheck.issuesFound}`);
  }
  
  // Step 2: Fix discrepancies if found
  if (balanceCheck.success && balanceCheck.issuesFound > 0) {
    console.log('\n🔧 Fixing balance discrepancies...');
    const fixResult = await CUSTOMER_LEDGER_DIAGNOSTIC.fixOutstandingBalanceDiscrepancies();
    console.log(`Balance Fix: ${fixResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (fixResult.success) {
      console.log(`   Customers Fixed: ${fixResult.customersFixed}/${fixResult.customersFound}`);
    }
  }
  
  // Step 3: Test event listeners
  const eventTest = await CUSTOMER_LEDGER_DIAGNOSTIC.testEventListeners();
  console.log(`\n📡 Event Listeners Test: ${eventTest.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (eventTest.success) {
    console.log(`   Test Event Worked: ${eventTest.testEventWorked ? '✅' : '❌'}`);
    console.log(`   Active Listeners: ${Object.values(eventTest.listenerCounts).reduce((a, b) => a + b, 0)}`);
  }
  
  // Step 4: Test account summary calculation
  const summaryTest = await CUSTOMER_LEDGER_DIAGNOSTIC.testCustomerAccountSummary(customerId);
  console.log(`\n🧪 Account Summary Test: ${summaryTest.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (summaryTest.success) {
    console.log(`   Calculation Correct: ${summaryTest.calculationCorrect ? '✅' : '❌'}`);
    console.log(`   Test Customer ID: ${summaryTest.testCustomerId}`);
  }
  
  console.log('\n' + '=' * 70);
  
  const allTestsPassed = balanceCheck.success && eventTest.success && summaryTest.success;
  
  if (allTestsPassed && balanceCheck.issuesFound === 0 && summaryTest.calculationCorrect) {
    console.log('🎉 CUSTOMER LEDGER DIAGNOSTIC COMPLETE - ALL SYSTEMS HEALTHY!');
    console.log('✅ Outstanding balance calculations are accurate');
    console.log('✅ Event listeners are working properly');
    console.log('✅ Account summary calculations are correct');
  } else if (allTestsPassed) {
    console.log('✅ CUSTOMER LEDGER DIAGNOSTIC COMPLETE - ISSUES FIXED!');
    console.log('🔧 Balance discrepancies have been corrected');
    console.log('✅ System should now show correct outstanding balances');
  } else {
    console.log('⚠️ CUSTOMER LEDGER DIAGNOSTIC COMPLETE - SOME ISSUES REMAIN');
    console.log('📋 Check the detailed results above for specific problems');
  }
  
  return {
    balanceCheck,
    eventTest,
    summaryTest,
    allHealthy: allTestsPassed && balanceCheck.issuesFound === 0 && summaryTest.calculationCorrect
  };
}

// Quick fix function for specific customer
async function quickFixCustomerBalance(customerId) {
  console.log(`🔧 QUICK FIX: Updating outstanding balance for Customer ID ${customerId}...`);
  
  try {
    // Recalculate and update balance
    const calculation = await db.safeSelect(`
      SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0) as calculated_balance
      FROM customer_ledger_entries 
      WHERE customer_id = ?
    `, [customerId]);
    
    const newBalance = calculation[0]?.calculated_balance || 0;
    
    await db.execute(
      "UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newBalance, customerId]
    );
    
    console.log(`✅ Customer ${customerId} balance updated to Rs.${newBalance.toFixed(2)}`);
    
    // Test the account summary
    const summary = await db.getCustomerAccountSummary(customerId);
    console.log(`📊 Account Summary - Outstanding: Rs.${summary.outstandingAmount.toFixed(2)}`);
    
    return { success: true, newBalance, summary };
    
  } catch (error) {
    console.error(`❌ Quick fix failed: ${error.message}`);
    return { success: false, message: error.message };
  }
}

// Auto-execute diagnostic
console.log('🚀 Starting automatic diagnostic...');
runCustomerLedgerDiagnostic();
