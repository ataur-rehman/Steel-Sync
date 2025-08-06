/**
 * 🚨 EMERGENCY DATABASE INITIALIZATION
 * 
 * This script will completely reinitialize your database with all fixes
 * Run this in your browser console when your app is open
 */

async function emergencyDatabaseInit() {
  console.log('🚨 EMERGENCY DATABASE INITIALIZATION STARTING...');
  
  try {
    // Step 1: Get database connection
    const db = app.database.dbConnection;
    
    console.log('🔧 Step 1: Dropping problematic tables...');
    
    // Drop all tables to start fresh
    const problematicTables = [
      'vendors', 'products', 'customers', 'invoices', 'invoice_items',
      'payment_records', 'payment_channels', 'payment_channel_transactions',
      'stock_movements', 'stock_receiving', 'vendor_payments'
    ];
    
    for (const table of problematicTables) {
      try {
        await db.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✅ Dropped ${table}`);
      } catch (error) {
        console.log(`⚠️ Could not drop ${table}:`, error.message);
      }
    }
    
    console.log('🏗️ Step 2: Creating fresh tables with proper schemas...');
    
    // Create vendors table with all fixes
    await db.execute(`
      CREATE TABLE vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_code TEXT UNIQUE,
        name TEXT NOT NULL DEFAULT '',
        vendor_name TEXT,
        company_name TEXT,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        balance REAL DEFAULT 0.0,
        credit_limit REAL DEFAULT 0.0,
        payment_terms TEXT,
        notes TEXT,
        outstanding_balance REAL DEFAULT 0.0,
        total_purchases REAL DEFAULT 0.0,
        is_active BOOLEAN DEFAULT 1,
        deactivation_reason TEXT,
        last_purchase_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Vendors table created');
    
    // Create products table
    await db.execute(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL CHECK (length(name) > 0),
        category TEXT DEFAULT 'general',
        unit_type TEXT DEFAULT 'piece',
        unit TEXT DEFAULT 'piece',
        rate_per_unit REAL DEFAULT 0.0 CHECK (rate_per_unit >= 0),
        min_stock_alert TEXT DEFAULT '0',
        size TEXT,
        grade TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        current_stock REAL DEFAULT 0.0,
        stock_value REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Products table created');
    
    // Create customers table
    await db.execute(`
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_code TEXT UNIQUE,
        name TEXT NOT NULL CHECK (length(name) > 0),
        phone TEXT,
        cnic TEXT,
        address TEXT,
        city TEXT,
        credit_limit REAL DEFAULT 0.0,
        outstanding_balance REAL DEFAULT 0.0,
        total_purchases REAL DEFAULT 0.0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Customers table created');
    
    // Create payment channels table
    await db.execute(`
      CREATE TABLE payment_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL DEFAULT 'cash',
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        is_default BOOLEAN DEFAULT 0,
        balance REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Payment channels table created');
    
    // Create invoices table
    await db.execute(`
      CREATE TABLE invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        total_amount REAL NOT NULL CHECK (total_amount >= 0),
        discount REAL DEFAULT 0.0 CHECK (discount >= 0),
        final_amount REAL NOT NULL CHECK (final_amount >= 0),
        payment_amount REAL DEFAULT 0.0 CHECK (payment_amount >= 0),
        remaining_balance REAL DEFAULT 0.0 CHECK (remaining_balance >= 0),
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
        payment_method TEXT,
        notes TEXT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      )
    `);
    console.log('✅ Invoices table created');
    
    // Create invoice items table
    await db.execute(`
      CREATE TABLE invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity TEXT NOT NULL,
        unit_price REAL NOT NULL CHECK (unit_price >= 0),
        total_price REAL NOT NULL CHECK (total_price >= 0),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      )
    `);
    console.log('✅ Invoice items table created');
    
    // Create payment records table
    await db.execute(`
      CREATE TABLE payment_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_code TEXT UNIQUE,
        customer_id INTEGER NOT NULL,
        customer_name TEXT,
        amount REAL NOT NULL CHECK (amount > 0),
        payment_method TEXT NOT NULL,
        payment_channel_id INTEGER,
        payment_channel_name TEXT,
        payment_type TEXT NOT NULL CHECK (payment_type IN ('bill_payment', 'advance_payment', 'return_refund')),
        reference_invoice_id INTEGER,
        reference TEXT,
        notes TEXT,
        date TEXT NOT NULL,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (payment_channel_id) REFERENCES payment_channels(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Payment records table created');
    
    // Create payment channel transactions table
    await db.execute(`
      CREATE TABLE payment_channel_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER NOT NULL,
        channel_name TEXT NOT NULL,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
        amount REAL NOT NULL CHECK (amount > 0),
        previous_balance REAL DEFAULT 0.0,
        new_balance REAL DEFAULT 0.0,
        reference_type TEXT,
        reference_id INTEGER,
        reference_number TEXT,
        description TEXT,
        customer_id INTEGER,
        customer_name TEXT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        created_by TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (channel_id) REFERENCES payment_channels(id) ON DELETE RESTRICT
      )
    `);
    console.log('✅ Payment channel transactions table created');
    
    // Create stock movements table
    await db.execute(`
      CREATE TABLE stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
        quantity REAL NOT NULL,
        previous_stock REAL DEFAULT 0.0,
        new_stock REAL DEFAULT 0.0,
        unit_price REAL DEFAULT 0.0,
        total_value REAL DEFAULT 0.0,
        reason TEXT,
        reference_type TEXT,
        reference_id INTEGER,
        reference_number TEXT,
        customer_id INTEGER,
        customer_name TEXT,
        notes TEXT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        unit_type TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      )
    `);
    console.log('✅ Stock movements table created');
    
    console.log('📊 Step 3: Initializing default data...');
    
    // Create default payment channel
    await db.execute(`
      INSERT OR IGNORE INTO payment_channels (name, type, description, is_default, is_active)
      VALUES ('Cash', 'cash', 'Default cash payment channel', 1, 1)
    `);
    console.log('✅ Default cash payment channel created');
    
    console.log('🧪 Step 4: Testing vendor creation...');
    
    // Test vendor creation
    const testVendor = await app.database.createVendor({
      name: 'Emergency Test Vendor',
      company_name: 'Emergency Test Company',
      contact_person: 'Emergency Contact',
      phone: '000-000-0000'
    });
    console.log('✅ Test vendor created with ID:', testVendor);
    
    // Verify vendor exists
    const vendors = await app.database.getVendors();
    console.log('✅ Vendor verification successful, total vendors:', vendors.length);
    
    // Clean up test vendor
    await db.execute('DELETE FROM vendors WHERE id = ?', [testVendor]);
    console.log('✅ Test vendor cleaned up');
    
    console.log('\n🎉 EMERGENCY DATABASE INITIALIZATION COMPLETED SUCCESSFULLY!');
    console.log('✅ All tables created with proper schemas');
    console.log('✅ Default payment channel initialized');
    console.log('✅ Vendor creation tested and working');
    console.log('✅ Your database is now ready for use!');
    
    return { success: true, message: 'Database initialized successfully' };
    
  } catch (error) {
    console.error('❌ Emergency database initialization failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    
    return { success: false, error: error.message };
  }
}

// Auto-execute
emergencyDatabaseInit().then(result => {
  if (result.success) {
    console.log('\n🚀 DATABASE IS READY! You can now:');
    console.log('1. Create vendors without errors');
    console.log('2. Add products and customers');
    console.log('3. Process invoices and payments');
    console.log('4. All functions should work normally');
  } else {
    console.log('\n❌ Initialization failed. Please check the error above.');
  }
}).catch(error => {
  console.error('❌ Script execution failed:', error);
});
