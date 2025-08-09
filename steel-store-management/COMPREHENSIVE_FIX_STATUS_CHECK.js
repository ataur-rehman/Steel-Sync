// COMPREHENSIVE INVOICE DETAIL FIX STATUS CHECK
console.log('🔄 COMPREHENSIVE FIX STATUS CHECK STARTING...');

(async function checkFixStatus() {
  
  // 1. Check if database methods are using our new implementation
  console.log('\n📋 METHOD IMPLEMENTATION CHECK:');
  console.log('='.repeat(50));
  
  // Check addInvoicePayment method source
  if (window.db && window.db.addInvoicePayment) {
    const methodSource = window.db.addInvoicePayment.toString();
    
    if (methodSource.includes('payment_type')) {
      console.log('✅ addInvoicePayment contains payment_type handling');
    } else {
      console.log('❌ addInvoicePayment missing payment_type handling');
    }
    
    if (methodSource.includes("'incoming'")) {
      console.log('✅ addInvoicePayment uses "incoming" payment_type');
    } else {
      console.log('❌ addInvoicePayment missing "incoming" payment_type');
    }
    
    if (methodSource.includes('INSERT INTO payments')) {
      console.log('✅ addInvoicePayment uses direct INSERT approach');
    } else {
      console.log('❌ addInvoicePayment not using direct INSERT');
    }
    
    if (methodSource.includes('recordPayment')) {
      console.log('⚠️ addInvoicePayment still calls old recordPayment method');
    } else {
      console.log('✅ addInvoicePayment does not call old recordPayment method');
    }
  }
  
  // 2. Database schema check
  console.log('\n📋 DATABASE SCHEMA CHECK:');
  console.log('='.repeat(50));
  
  try {
    const tables = await window.db.dbConnection.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('payments', 'invoice_items')"
    );
    
    console.log('Tables found:', tables.map(t => t.name));
    
    // Check payments table structure
    const paymentsInfo = await window.db.dbConnection.execute(
      "PRAGMA table_info(payments)"
    );
    
    console.log('Payments table columns:');
    paymentsInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check for constraints
    const paymentsSchema = await window.db.dbConnection.execute(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'"
    );
    
    if (paymentsSchema && paymentsSchema.length > 0) {
      const schema = paymentsSchema[0].sql;
      console.log('\nPayments table constraints:');
      
      if (schema.includes("CHECK")) {
        console.log('✅ CHECK constraints found');
        
        if (schema.includes("payment_type IN ('incoming','outgoing')")) {
          console.log('  ✅ payment_type constraint: incoming/outgoing');
        }
        
        if (schema.includes("status IN")) {
          console.log('  ✅ status constraint found');
        }
        
        if (schema.includes("payment_method IN")) {
          console.log('  ✅ payment_method constraint found');
        }
      } else {
        console.log('❌ No CHECK constraints found');
      }
    }
    
  } catch (error) {
    console.error('Error checking database schema:', error);
  }
  
  // 3. Test with minimal data to isolate the issue
  console.log('\n📋 MINIMAL ERROR REPRODUCTION TEST:');
  console.log('='.repeat(50));
  
  try {
    // Get a real invoice to test with
    const invoices = await window.db.getInvoices({ page: 1, limit: 1 });
    
    if (invoices.data && invoices.data.length > 0) {
      const testInvoice = invoices.data[0];
      console.log('Using invoice:', { id: testInvoice.id, number: testInvoice.bill_number });
      
      // Test minimal payment data
      const minimalPayment = {
        amount: 1,
        payment_method: 'cash',
        date: '2025-01-09'
      };
      
      console.log('Testing minimal payment data:', minimalPayment);
      
      try {
        await window.db.addInvoicePayment(testInvoice.id, minimalPayment);
        console.log('✅ Minimal payment test PASSED');
      } catch (error) {
        console.error('❌ Minimal payment test FAILED:', error.message);
        
        // Extract constraint information from error
        if (error.message.includes('CHECK constraint failed')) {
          const constraintMatch = error.message.match(/CHECK constraint failed: (.+)/);
          if (constraintMatch) {
            console.log('🔍 Specific constraint that failed:', constraintMatch[1]);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error in minimal test:', error);
  }
  
  // 4. Check if app is using the compiled version
  console.log('\n📋 APPLICATION STATE CHECK:');
  console.log('='.repeat(50));
  
  // Check build timestamp or version
  if (window.db.constructor && window.db.constructor.toString().includes('database')) {
    console.log('✅ Database service is loaded');
  }
  
  // Check if there are any compilation errors preventing the fix from loading
  if (typeof window !== 'undefined' && window.console && window.console.error) {
    console.log('Check browser console for any TypeScript compilation errors');
    console.log('These errors might prevent the fixed code from being loaded');
  }
  
  console.log('\n🏁 STATUS CHECK COMPLETE');
  console.log('Review the results above to identify any remaining issues.');
  
})();
