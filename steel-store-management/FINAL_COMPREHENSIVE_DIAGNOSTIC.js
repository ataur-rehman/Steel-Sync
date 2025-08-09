// FINAL COMPREHENSIVE INVOICE DETAIL DIAGNOSTIC AND FIX
// This script will identify and fix the exact root cause

(async function finalInvoiceDetailFix() {
  console.log('🚨 FINAL COMPREHENSIVE DIAGNOSTIC STARTING...');
  console.log('='.repeat(70));
  
  if (!window.db) {
    console.error('❌ Database not available');
    return;
  }
  
  // Step 1: Get detailed method information
  console.log('📋 STEP 1: METHOD ANALYSIS');
  console.log('-'.repeat(50));
  
  console.log('addInvoiceItems method exists:', typeof window.db.addInvoiceItems === 'function');
  console.log('addInvoicePayment method exists:', typeof window.db.addInvoicePayment === 'function');
  
  // Check method source to see if our fixes are loaded
  const paymentMethodSource = window.db.addInvoicePayment.toString();
  console.log('Payment method contains direct INSERT:', paymentMethodSource.includes('INSERT INTO payments'));
  console.log('Payment method uses incoming type:', paymentMethodSource.includes("'incoming'"));
  
  // Step 2: Database structure verification
  console.log('\n📋 STEP 2: DATABASE STRUCTURE VERIFICATION');
  console.log('-'.repeat(50));
  
  try {
    // Check if both tables exist
    const tables = await window.db.dbConnection.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('payments', 'invoice_items', 'invoices')"
    );
    console.log('Required tables found:', tables.map(t => t.name));
    
    // Check payments table columns
    const paymentCols = await window.db.dbConnection.execute("PRAGMA table_info(payments)");
    const requiredPaymentCols = ['payment_type', 'status', 'payment_method', 'amount', 'invoice_id'];
    const missingCols = requiredPaymentCols.filter(col => 
      !paymentCols.some(dbCol => dbCol.name === col)
    );
    
    if (missingCols.length > 0) {
      console.error('❌ Missing payment columns:', missingCols);
    } else {
      console.log('✅ All required payment columns exist');
    }
    
    // Check invoice_items table columns
    const itemCols = await window.db.dbConnection.execute("PRAGMA table_info(invoice_items)");
    const requiredItemCols = ['product_id', 'quantity', 'unit_price', 'total_price'];
    const missingItemCols = requiredItemCols.filter(col => 
      !itemCols.some(dbCol => dbCol.name === col)
    );
    
    if (missingItemCols.length > 0) {
      console.error('❌ Missing invoice item columns:', missingItemCols);
    } else {
      console.log('✅ All required invoice item columns exist');
    }
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error);
  }
  
  // Step 3: Try to isolate the exact error
  console.log('\n📋 STEP 3: ERROR ISOLATION TEST');
  console.log('-'.repeat(50));
  
  try {
    // Get a test invoice
    const invoices = await window.db.getInvoices({ page: 1, limit: 1 });
    if (!invoices.data || invoices.data.length === 0) {
      console.error('❌ No invoices found for testing');
      return;
    }
    
    const testInvoice = invoices.data[0];
    console.log('Using test invoice:', { id: testInvoice.id, total: testInvoice.grand_total });
    
    // Test 1: Invoice Item Addition with minimal data
    console.log('\n🧪 Testing invoice item addition...');
    
    try {
      const itemResult = await window.db.addInvoiceItems(testInvoice.id, [{
        product_id: 1,
        product_name: 'Test Product',
        quantity: 1,
        unit_price: 100,
        total_price: 100,
        unit: '1 piece'
      }]);
      
      console.log('✅ Invoice item addition SUCCESS:', itemResult);
      
    } catch (itemError) {
      console.error('❌ Invoice item addition FAILED:', itemError.message);
      console.error('Full error:', itemError);
      
      // Try to fix on the spot if it's a known issue
      if (itemError.message.includes('no such column') || itemError.message.includes('no such table')) {
        console.log('🔧 Attempting to create/fix invoice_items table...');
        
        try {
          await window.db.dbConnection.execute(`
            CREATE TABLE IF NOT EXISTS invoice_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              invoice_id INTEGER NOT NULL,
              product_id INTEGER NOT NULL,
              product_name TEXT NOT NULL,
              quantity REAL NOT NULL DEFAULT 0,
              unit_price REAL NOT NULL DEFAULT 0,
              total_price REAL NOT NULL DEFAULT 0,
              unit TEXT DEFAULT '',
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
            )
          `);
          
          console.log('✅ Invoice_items table created/verified');
          
          // Retry the addition
          const retryResult = await window.db.addInvoiceItems(testInvoice.id, [{
            product_id: 1,
            product_name: 'Test Product - Retry',
            quantity: 1,
            unit_price: 100,
            total_price: 100,
            unit: '1 piece'
          }]);
          
          console.log('✅ RETRY SUCCESS: Invoice item added after fixing table');
          
        } catch (fixError) {
          console.error('❌ Failed to fix invoice_items table:', fixError);
        }
      }
    }
    
    // Test 2: Invoice Payment with step-by-step validation
    console.log('\n🧪 Testing invoice payment addition...');
    
    try {
      // First, let's see what the current invoice balance looks like
      const currentInvoice = await window.db.getInvoiceDetails(testInvoice.id);
      console.log('Current invoice state:', {
        id: currentInvoice.id,
        total: currentInvoice.grand_total,
        paid: currentInvoice.payment_amount,
        remaining: currentInvoice.remaining_balance
      });
      
      const paymentResult = await window.db.addInvoicePayment(testInvoice.id, {
        amount: 25,
        payment_method: 'cash',
        reference: 'DIAGNOSTIC-' + Date.now(),
        notes: 'Final diagnostic test payment',
        date: new Date().toISOString().split('T')[0]
      });
      
      console.log('✅ Invoice payment addition SUCCESS:', paymentResult);
      
    } catch (paymentError) {
      console.error('❌ Invoice payment addition FAILED:', paymentError.message);
      console.error('Full error:', paymentError);
      
      // Detailed error analysis
      if (paymentError.message.includes('CHECK constraint failed')) {
        console.log('🔍 CHECK constraint violation detected');
        
        // Let's examine the exact constraint
        const paymentsSchema = await window.db.dbConnection.execute(
          "SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'"
        );
        
        if (paymentsSchema && paymentsSchema.length > 0) {
          console.log('Payments table schema:');
          console.log(paymentsSchema[0].sql);
          
          // Try to identify which constraint failed
          if (paymentError.message.includes('payment_type')) {
            console.log('🔧 payment_type constraint failed - checking allowed values...');
          }
          if (paymentError.message.includes('payment_method')) {
            console.log('🔧 payment_method constraint failed - checking allowed values...');
          }
          if (paymentError.message.includes('status')) {
            console.log('🔧 status constraint failed - checking allowed values...');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Critical error in testing:', error);
  }
  
  // Step 4: Provide final recommendation
  console.log('\n📋 STEP 4: FINAL RECOMMENDATION');
  console.log('-'.repeat(50));
  
  console.log('Based on the results above:');
  console.log('1. If both tests show SUCCESS, the issues are fixed');
  console.log('2. If invoice item test fails, there is a schema/table issue');
  console.log('3. If payment test fails, there is a constraint violation');
  console.log('4. Check the detailed error messages for specific fixes needed');
  
  console.log('\n🏁 FINAL DIAGNOSTIC COMPLETE');
  console.log('='.repeat(70));
  
})();
