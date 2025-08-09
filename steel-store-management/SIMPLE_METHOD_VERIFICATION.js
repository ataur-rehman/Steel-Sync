// SIMPLE METHOD VERIFICATION TEST
// This checks if the fixes are loaded without needing existing invoices

console.log('🔍 SIMPLE METHOD VERIFICATION TEST');
console.log('='.repeat(50));

(async function simpleMethodTest() {
  
  if (!window.db) {
    console.error('❌ Database not available');
    return;
  }

  // Check 1: Database connection
  try {
    await window.db.dbConnection.execute('SELECT 1');
    console.log('✅ Database connection: Working');
  } catch (error) {
    console.error('❌ Database connection: Failed -', error.message);
    return;
  }

  // Check 2: Required tables exist
  try {
    const tables = await window.db.dbConnection.execute(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const tableNames = tables.map(t => t.name);
    
    const requiredTables = ['invoices', 'invoice_items', 'payments', 'ledger_entries', 'customers'];
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ Required tables: All present');
    } else {
      console.log('⚠️ Missing tables:', missingTables);
    }
    
    console.log('   Available tables:', tableNames.length);
    
  } catch (error) {
    console.error('❌ Table check failed:', error.message);
  }

  // Check 3: Method availability and source verification
  console.log('\n🔍 Method Fix Verification:');
  
  // Check addInvoiceItems method
  if (typeof window.db.addInvoiceItems === 'function') {
    const itemsMethodSource = window.db.addInvoiceItems.toString();
    
    console.log('✅ addInvoiceItems method: Available');
    
    if (itemsMethodSource.includes('try') && itemsMethodSource.includes('catch') && itemsMethodSource.includes('schemaError')) {
      console.log('✅ addInvoiceItems fix: Applied (has fallback error handling)');
    } else {
      console.log('⚠️ addInvoiceItems fix: May not be fully applied');
    }
  } else {
    console.error('❌ addInvoiceItems method: Not available');
  }

  // Check addInvoicePayment method
  if (typeof window.db.addInvoicePayment === 'function') {
    const paymentMethodSource = window.db.addInvoicePayment.toString();
    
    console.log('✅ addInvoicePayment method: Available');
    
    if (paymentMethodSource.includes('createLedgerEntry') && paymentMethodSource.includes('Payment Received')) {
      console.log('✅ addInvoicePayment fix: Applied (includes ledger entry creation)');
    } else {
      console.log('⚠️ addInvoicePayment fix: May not be fully applied');
    }
  } else {
    console.error('❌ addInvoicePayment method: Not available');
  }

  // Check 4: Invoice_items table schema
  console.log('\n🔍 Database Schema Verification:');
  
  try {
    const itemsTableInfo = await window.db.dbConnection.execute("PRAGMA table_info(invoice_items)");
    const itemsColumns = itemsTableInfo.map(col => col.name);
    
    const requiredItemsCols = ['invoice_id', 'product_id', 'product_name', 'quantity', 'unit_price', 'total_price'];
    const missingItemsCols = requiredItemsCols.filter(col => !itemsColumns.includes(col));
    
    if (missingItemsCols.length === 0) {
      console.log('✅ invoice_items table: Has required columns');
    } else {
      console.log('⚠️ invoice_items missing columns:', missingItemsCols);
    }
    
  } catch (error) {
    console.error('❌ invoice_items schema check failed:', error.message);
  }

  // Check 5: Payments table schema
  try {
    const paymentsTableInfo = await window.db.dbConnection.execute("PRAGMA table_info(payments)");
    const paymentsColumns = paymentsTableInfo.map(col => col.name);
    
    const requiredPaymentsCols = ['invoice_id', 'amount', 'payment_method', 'payment_type'];
    const missingPaymentsCols = requiredPaymentsCols.filter(col => !paymentsColumns.includes(col));
    
    if (missingPaymentsCols.length === 0) {
      console.log('✅ payments table: Has required columns');
    } else {
      console.log('⚠️ payments missing columns:', missingPaymentsCols);
    }
    
  } catch (error) {
    console.error('❌ payments schema check failed:', error.message);
  }

  // Check 6: Ledger entries table
  try {
    const ledgerTableInfo = await window.db.dbConnection.execute("PRAGMA table_info(ledger_entries)");
    const ledgerColumns = ledgerTableInfo.map(col => col.name);
    
    if (ledgerColumns.includes('customer_id') && ledgerColumns.includes('amount') && ledgerColumns.includes('type')) {
      console.log('✅ ledger_entries table: Has required columns');
    } else {
      console.log('⚠️ ledger_entries table: Missing required columns');
    }
    
  } catch (error) {
    console.error('❌ ledger_entries schema check failed:', error.message);
  }

  // Summary
  console.log('\n📋 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Method fixes can be verified from the checks above');
  console.log('✅ If all items show "Applied" or "Available", fixes are loaded');
  console.log('\n💡 To test functionality, please:');
  console.log('1. Create an invoice in the app');
  console.log('2. Try adding an item to it');
  console.log('3. Try making a payment');
  console.log('4. Check if customer ledger is updated');
  
})();
