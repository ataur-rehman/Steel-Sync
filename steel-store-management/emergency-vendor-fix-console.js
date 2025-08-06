// EMERGENCY VENDOR FIX - Run this in browser console immediately
console.log('🚨 RUNNING EMERGENCY VENDOR SCHEMA FIX...');

// Function to run immediate vendor fix
async function emergencyVendorFix() {
  try {
    // Get database service
    const db = window.databaseService || window.db;
    
    if (!db) {
      console.error('❌ Database service not found');
      return;
    }
    
    console.log('🔍 Running emergency vendor schema fix...');
    
    // Step 1: Check current vendor table schema
    console.log('📊 Checking current vendor table schema...');
    const schema = await db.dbConnection.execute('PRAGMA table_info(vendors)');
    const columns = schema.rows.map(row => row.name);
    console.log('Current columns:', columns);
    
    // Step 2: Check if we have the wrong schema
    if (columns.includes('vendor_name') && !columns.includes('name')) {
      console.log('⚠️ FOUND PROBLEM: vendor_name column exists instead of name');
      console.log('🔧 Applying emergency fix...');
      
      // Get existing data
      const existingData = await db.dbConnection.execute('SELECT * FROM vendors');
      console.log(`📦 Backing up ${existingData.rows.length} vendors`);
      
      // Drop old table
      await db.dbConnection.execute('DROP TABLE vendors');
      console.log('🗑️ Dropped old vendor table');
      
      // Create new table with correct schema
      await db.dbConnection.execute(`
        CREATE TABLE vendors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          vendor_code TEXT,
          company_name TEXT,
          phone TEXT,
          address TEXT,
          contact_person TEXT,
          payment_terms TEXT,
          notes TEXT,
          contact_info TEXT,
          status TEXT DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          deactivation_reason TEXT,
          outstanding_balance DECIMAL(10,2) DEFAULT 0,
          total_purchases DECIMAL(10,2) DEFAULT 0,
          is_active INTEGER DEFAULT 1
        )
      `);
      console.log('✅ Created new vendor table with correct schema');
      
      // Restore data with correct column mapping
      for (const row of existingData.rows) {
        await db.dbConnection.execute(`
          INSERT INTO vendors (
            id, name, vendor_code, company_name, phone, address, 
            contact_person, payment_terms, notes, status, 
            created_at, updated_at, outstanding_balance, total_purchases
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          row.id,
          row.vendor_name || row.name || 'Unknown Vendor', // Map vendor_name to name
          row.vendor_code || '',
          row.company_name || '',
          row.phone || '',
          row.address || '',
          row.contact_person || '',
          row.payment_terms || '',
          row.notes || '',
          row.status || 'active',
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString(),
          row.outstanding_balance || 0,
          row.total_purchases || 0
        ]);
      }
      console.log(`📊 Restored ${existingData.rows.length} vendors with correct schema`);
      
    } else if (columns.includes('name')) {
      console.log('✅ Schema appears correct (name column exists)');
    } else {
      console.log('❌ No name or vendor_name column found - creating fresh table');
      await db.dbConnection.execute('DROP TABLE IF EXISTS vendors');
      await db.dbConnection.execute(`
        CREATE TABLE vendors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          vendor_code TEXT,
          company_name TEXT,
          phone TEXT,
          address TEXT,
          contact_person TEXT,
          payment_terms TEXT,
          notes TEXT,
          status TEXT DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created fresh vendor table');
    }
    
    // Step 3: Test vendor creation
    console.log('🧪 Testing vendor creation...');
    try {
      const testId = await db.createVendor({
        name: 'Test Vendor Fix ' + Date.now(),
        company_name: 'Test Company',
        phone: '123-456-7890'
      });
      console.log('✅ SUCCESS! Test vendor created with ID:', testId);
      
      // Clean up test vendor
      await db.dbConnection.execute('DELETE FROM vendors WHERE id = ?', [testId]);
      console.log('🧹 Cleaned up test vendor');
      
    } catch (testError) {
      console.error('❌ Test vendor creation failed:', testError);
      throw testError;
    }
    
    console.log('🎉 VENDOR SCHEMA FIX COMPLETED SUCCESSFULLY!');
    console.log('✅ You can now create vendors without vendor_name errors');
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    console.log('🆘 Contact technical support');
  }
}

// Run the fix
emergencyVendorFix();
