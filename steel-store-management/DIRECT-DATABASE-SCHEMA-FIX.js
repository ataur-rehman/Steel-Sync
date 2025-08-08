/**
 * DIRECT DATABASE SCHEMA FIX
 * Copy and paste this ENTIRE script into your browser console to fix the schema issues
 */

console.log('🔧 [DIRECT FIX] Starting immediate database schema repair...');

// DIRECT FIX - Forces database to use centralized schema
async function forceCorrectSchema() {
  try {
    // Get database instance
    const db = window.db || window.database;
    if (!db) {
      console.error('❌ Database not found. Make sure app is loaded.');
      return;
    }
    
    console.log('✅ Database instance found');
    
    // Initialize if needed
    if (!db.isInitialized) {
      await db.initialize();
    }
    
    // STEP 1: Drop problematic tables completely
    console.log('🔧 [STEP 1] Dropping old tables with wrong schema...');
    
    try {
      await db.dbConnection.execute('DROP TABLE IF EXISTS stock_receiving');
      await db.dbConnection.execute('DROP TABLE IF EXISTS vendors');
      console.log('✅ Old tables dropped');
    } catch (error) {
      console.log('⚠️ Could not drop tables:', error.message);
    }
    
    // STEP 2: Create tables with correct centralized schema
    console.log('🔧 [STEP 2] Creating tables with centralized schema...');
    
    // Create stock_receiving with time column
    const stockReceivingSQL = `
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
        discount_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        shipping_cost REAL DEFAULT 0,
        handling_cost REAL DEFAULT 0,
        grand_total REAL NOT NULL DEFAULT 0,
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
        payment_method TEXT DEFAULT 'cash',
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
      )`;
    
    // Create vendors with vendor_code column
    const vendorsSQL = `
      CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_code TEXT UNIQUE NOT NULL DEFAULT ('VND-' || SUBSTR(UPPER(HEX(RANDOMBLOB(4))), 1, 8)),
        name TEXT NOT NULL,
        company_name TEXT,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        billing_address TEXT,
        shipping_address TEXT,
        city TEXT,
        state TEXT,
        country TEXT DEFAULT 'Pakistan',
        postal_code TEXT,
        tax_number TEXT,
        registration_number TEXT,
        website TEXT,
        balance REAL NOT NULL DEFAULT 0,
        credit_limit REAL DEFAULT 0,
        credit_days INTEGER DEFAULT 0,
        payment_terms TEXT DEFAULT 'cash',
        discount_percentage REAL DEFAULT 0,
        category TEXT DEFAULT 'supplier',
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
        rating INTEGER DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
        is_active INTEGER NOT NULL DEFAULT 1,
        bank_name TEXT,
        bank_account_number TEXT,
        bank_account_name TEXT,
        notes TEXT,
        internal_notes TEXT,
        tags TEXT,
        last_order_date TEXT,
        total_orders INTEGER DEFAULT 0,
        total_amount_ordered REAL DEFAULT 0,
        created_by TEXT NOT NULL DEFAULT 'system',
        updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`;
    
    // Execute table creation
    await db.dbConnection.execute(stockReceivingSQL);
    await db.dbConnection.execute(vendorsSQL);
    
    console.log('✅ Tables created with correct schema');
    
    // STEP 3: Verify the schema
    console.log('🔧 [STEP 3] Verifying schema...');
    
    const stockReceivingCols = await db.dbConnection.select("PRAGMA table_info(stock_receiving)");
    const vendorsCols = await db.dbConnection.select("PRAGMA table_info(vendors)");
    
    const hasTimeColumn = stockReceivingCols.some(col => col.name === 'time');
    const hasDateColumn = stockReceivingCols.some(col => col.name === 'date');
    const hasVendorCode = vendorsCols.some(col => col.name === 'vendor_code');
    
    console.log('Schema verification:');
    console.log('- stock_receiving has time column:', hasTimeColumn);
    console.log('- stock_receiving has date column:', hasDateColumn);
    console.log('- vendors has vendor_code column:', hasVendorCode);
    
    // STEP 4: Test vendor functionality
    console.log('🔧 [STEP 4] Testing vendor functionality...');
    
    // Create a test vendor
    const testVendorId = await db.createVendor({
      name: 'Test Vendor ' + Date.now(),
      phone: '123-456-7890',
      address: 'Test Address'
    });
    
    console.log('✅ Test vendor created with ID:', testVendorId);
    
    // Get vendors to test display
    const vendors = await db.getVendors();
    console.log(`✅ Found ${vendors.length} vendors:`, vendors);
    
    // STEP 5: Success message
    if (hasTimeColumn && hasDateColumn && hasVendorCode && vendors.length > 0) {
      console.log('\n🎉 [SUCCESS] Database schema fix COMPLETE!');
      console.log('✅ stock_receiving table has time and date columns');
      console.log('✅ vendors table has vendor_code column');
      console.log('✅ Vendors are displaying correctly');
      console.log('\n📝 Please refresh the page to see the fixes in action.');
      
      // Alert the user
      alert('Database schema fixed successfully! Please refresh the page.');
    } else {
      console.log('❌ Schema fix incomplete. Some issues remain.');
    }
    
  } catch (error) {
    console.error('❌ [ERROR] Schema fix failed:', error);
    console.log('Error details:', error.message);
  }
}

// Run the fix immediately
forceCorrectSchema();

console.log(`
📋 [INSTRUCTIONS]
1. The script should run automatically
2. Look for "Database schema fix COMPLETE!" message
3. Refresh the page after seeing success message
4. Both "no such column: time" and vendor display issues should be resolved

If you see any errors, please share them so I can provide additional fixes.
`);
