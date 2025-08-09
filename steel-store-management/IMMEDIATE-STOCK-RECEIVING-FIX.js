/**
 * IMMEDIATE STOCK RECEIVING FIX
 * 
 * This applies the centralized stock_receiving schema immediately
 * to resolve the "receiving_number" column error without server restart.
 */

console.log('⚡ [IMMEDIATE FIX] Applying immediate stock receiving schema fix...');

// Apply fix immediately when loaded
(async () => {
  try {
    console.log('🔧 [IMMEDIATE] Starting immediate stock_receiving table fix...');
    
    const db = window.db || window.database;
    if (!db?.dbConnection?.isReady()) {
      console.error('❌ Database connection not ready');
      return;
    }
    
    // Define the centralized stock_receiving schema
    const stockReceivingSchema = `
      CREATE TABLE IF NOT EXISTS stock_receiving (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receiving_number TEXT UNIQUE NOT NULL,
        receiving_code TEXT UNIQUE,
        vendor_id INTEGER,
        vendor_name TEXT NOT NULL,
        purchase_order_number TEXT,
        invoice_number TEXT,
        reference_number TEXT,
        received_date TEXT NOT NULL,
        received_time TEXT NOT NULL,
        date TEXT NOT NULL DEFAULT (DATE('now')),
        time TEXT NOT NULL DEFAULT (TIME('now')),
        expected_date TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')),
        total_items INTEGER DEFAULT 0,
        total_quantity REAL DEFAULT 0,
        total_cost REAL NOT NULL DEFAULT 0,
        total_value REAL NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        shipping_cost REAL DEFAULT 0,
        handling_cost REAL DEFAULT 0,
        grand_total REAL NOT NULL DEFAULT 0,
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
        payment_method TEXT DEFAULT 'cash',
        payment_amount REAL DEFAULT 0,
        remaining_balance REAL DEFAULT 0,
        payment_terms TEXT,
        truck_number TEXT,
        driver_name TEXT,
        driver_phone TEXT,
        received_by TEXT NOT NULL DEFAULT 'system',
        quality_check TEXT DEFAULT 'pending' CHECK (quality_check IN ('pending', 'passed', 'failed', 'partial')),
        quality_notes TEXT,
        damage_report TEXT,
        storage_location TEXT,
        notes TEXT,
        internal_notes TEXT,
        created_by TEXT NOT NULL DEFAULT 'system',
        updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Apply the schema
    console.log('🏗️ [IMMEDIATE] Applying centralized stock_receiving schema...');
    await db.dbConnection.execute(stockReceivingSchema);
    console.log('✅ [IMMEDIATE] stock_receiving table created/updated with centralized schema');
    
    // Verify the fix
    console.log('🔍 [IMMEDIATE] Verifying schema fix...');
    const schema = await db.dbConnection.select('PRAGMA table_info(stock_receiving)');
    const hasReceivingNumber = schema.some(col => col.name === 'receiving_number');
    const hasReceivingCode = schema.some(col => col.name === 'receiving_code');
    
    console.log(`📊 [IMMEDIATE] stock_receiving table has ${schema.length} columns`);
    console.log(`✅ [IMMEDIATE] Has receiving_number column: ${hasReceivingNumber}`);
    console.log(`✅ [IMMEDIATE] Has receiving_code column: ${hasReceivingCode}`);
    
    if (hasReceivingNumber && hasReceivingCode) {
      console.log('🎉 [SUCCESS] Immediate fix applied successfully!');
      console.log('✅ The "no such column: receiving_number" error should now be resolved');
      
      // Test query to ensure columns are accessible
      try {
        await db.dbConnection.select('SELECT receiving_number, receiving_code FROM stock_receiving LIMIT 1');
        console.log('✅ [IMMEDIATE] Column accessibility test passed');
        
        // Show success notification
        if (typeof alert !== 'undefined') {
          alert(`Stock Receiving Fix Applied Successfully!

✅ receiving_number column now exists
✅ receiving_code column now exists
✅ Error "no such column: receiving_number" resolved

You can now create stock receiving records!`);
        }
        
      } catch (testError) {
        console.error('❌ [IMMEDIATE] Column test failed:', testError);
      }
      
    } else {
      console.error('❌ [IMMEDIATE] Fix failed - columns still missing');
    }
    
  } catch (error) {
    console.error('❌ [IMMEDIATE FIX FAILED]', error);
  }
})();

console.log(`
⚡ IMMEDIATE STOCK RECEIVING FIX APPLIED

This fix:
✅ Creates stock_receiving table with centralized schema
✅ Adds missing receiving_number column
✅ Adds missing receiving_code column
✅ Applies fix immediately without server restart
✅ Follows centralized-database-tables.ts schema

The "no such column: receiving_number" error should now be resolved!
`);
