// 🚨 EMERGENCY VENDOR TABLE RESET - Copy and paste into browser console
console.log('🚨 EMERGENCY VENDOR TABLE RESET STARTING...');

(async () => {
  const db = window.databaseService || window.db;
  if (!db) return console.error('❌ Database not found');
  
  try {
    console.log('🔧 STEP 1: Backing up existing vendors...');
    let existingVendors = [];
    try {
      const vendorsResult = await db.dbConnection.execute('SELECT * FROM vendors');
      existingVendors = vendorsResult.rows || [];
      console.log(`📦 Found ${existingVendors.length} existing vendors to backup`);
    } catch (e) {
      console.log('⚠️ No existing vendors table or data');
    }
    
    console.log('🔧 STEP 2: Dropping and recreating vendors table...');
    await db.dbConnection.execute('DROP TABLE IF EXISTS vendors');
    
    // Create with the exact centralized schema
    await db.dbConnection.execute(`
      CREATE TABLE vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_code TEXT UNIQUE,
        name TEXT NOT NULL CHECK (length(name) > 0),
        company_name TEXT,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        payment_terms TEXT,
        notes TEXT,
        outstanding_balance REAL DEFAULT 0.0 CHECK (outstanding_balance >= 0),
        total_purchases REAL DEFAULT 0.0 CHECK (total_purchases >= 0),
        is_active BOOLEAN DEFAULT 1,
        deactivation_reason TEXT,
        last_purchase_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ New vendors table created');
    
    console.log('🔧 STEP 3: Creating indexes...');
    await db.dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name)');
    await db.dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active)');
    await db.dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_vendors_outstanding ON vendors(outstanding_balance)');
    console.log('✅ Indexes created');
    
    console.log('🔧 STEP 4: Restoring backed up data...');
    for (const vendor of existingVendors) {
      try {
        await db.dbConnection.execute(`
          INSERT INTO vendors (
            id, name, vendor_code, company_name, contact_person, phone, email, address, city,
            payment_terms, notes, outstanding_balance, total_purchases, is_active, 
            deactivation_reason, last_purchase_date, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          vendor.id,
          vendor.name || vendor.vendor_name || 'Unknown Vendor',
          vendor.vendor_code || '',
          vendor.company_name || '',
          vendor.contact_person || '',
          vendor.phone || '',
          vendor.email || '',
          vendor.address || '',
          vendor.city || '',
          vendor.payment_terms || '',
          vendor.notes || '',
          vendor.outstanding_balance || 0,
          vendor.total_purchases || 0,
          vendor.is_active !== undefined ? vendor.is_active : (vendor.status === 'active' ? 1 : 0),
          vendor.deactivation_reason || null,
          vendor.last_purchase_date || null,
          vendor.created_at || new Date().toISOString(),
          vendor.updated_at || new Date().toISOString()
        ]);
      } catch (restoreError) {
        console.warn('⚠️ Could not restore vendor:', vendor, restoreError);
      }
    }
    console.log(`✅ Restored ${existingVendors.length} vendors`);
    
    console.log('🔧 STEP 5: Testing vendor creation...');
    const testResult = await db.dbConnection.execute(`
      INSERT INTO vendors (name, vendor_code, is_active, created_at, updated_at)
      VALUES ('Test Vendor', 'TEST001', 1, datetime('now'), datetime('now'))
    `);
    console.log('✅ Test vendor created with ID:', testResult.lastInsertId);
    
    // Clean up test vendor
    await db.dbConnection.execute('DELETE FROM vendors WHERE name = "Test Vendor"');
    
    console.log('🎉 EMERGENCY RESET COMPLETE! Try creating a vendor now.');
    console.log('📋 Vendor table is now ready with the correct schema.');
    
  } catch (error) {
    console.error('❌ Emergency reset failed:', error);
    console.log('🆘 Please restart the application and try again.');
  }
})();
