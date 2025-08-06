// Comprehensive Vendor Schema Fix
// Copy and paste this entire script into the browser console to fix vendor creation issues

(async function comprehensiveVendorFix() {
  console.log('🚨 COMPREHENSIVE VENDOR SCHEMA FIX STARTING...');
  
  // Get database instance
  const db = window.dbService || window.db;
  
  if (!db) {
    console.error('❌ Database service not available');
    return;
  }
  
  try {
    console.log('📊 Step 1: Checking current vendor table schema...');
    const schema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
    const columnNames = schema.map(col => col.name);
    
    console.log('Current columns:', columnNames);
    
    if (columnNames.includes('vendor_name')) {
      console.log('⚠️ Found vendor_name column - migrating to name column...');
      
      // Step 1: Create new vendors table with correct schema
      console.log('🔧 Step 2: Creating new vendors table with correct schema...');
      await db.executeRawQuery(`
        CREATE TABLE IF NOT EXISTS vendors_fixed (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          company_name TEXT,
          phone TEXT,
          address TEXT,
          contact_person TEXT,
          payment_terms TEXT,
          notes TEXT,
          outstanding_balance REAL DEFAULT 0.0,
          is_active BOOLEAN DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Step 2: Copy all data from old table to new table
      console.log('📤 Step 3: Migrating data from old table...');
      await db.executeRawQuery(`
        INSERT INTO vendors_fixed (
          id, vendor_code, name, company_name, phone, address,
          contact_person, payment_terms, notes, outstanding_balance,
          is_active, created_at, updated_at
        )
        SELECT 
          id,
          COALESCE(vendor_code, 'VEN' || id) as vendor_code,
          COALESCE(name, vendor_name, 'Unknown Vendor') as name,
          company_name,
          phone,
          address,
          contact_person,
          payment_terms,
          notes,
          COALESCE(outstanding_balance, 0.0) as outstanding_balance,
          COALESCE(is_active, 1) as is_active,
          COALESCE(created_at, datetime('now')) as created_at,
          COALESCE(updated_at, datetime('now')) as updated_at
        FROM vendors
      `);
      
      // Step 3: Drop old table and rename new one
      console.log('🔄 Step 4: Replacing old table with fixed table...');
      await db.executeRawQuery(`DROP TABLE vendors`);
      await db.executeRawQuery(`ALTER TABLE vendors_fixed RENAME TO vendors`);
      
      console.log('✅ Vendor table schema migration completed');
      
    } else if (columnNames.includes('name')) {
      console.log('✅ Vendor table already has correct schema');
    } else {
      console.log('❌ Vendor table has unexpected schema, recreating...');
      
      // Create fresh vendors table
      await db.executeRawQuery(`DROP TABLE IF EXISTS vendors`);
      await db.executeRawQuery(`
        CREATE TABLE vendors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vendor_code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          company_name TEXT,
          phone TEXT,
          address TEXT,
          contact_person TEXT,
          payment_terms TEXT,
          notes TEXT,
          outstanding_balance REAL DEFAULT 0.0,
          is_active BOOLEAN DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ Fresh vendor table created');
    }
    
    // Step 4: Verify the fix
    console.log('🔍 Step 5: Verifying the fix...');
    const newSchema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
    const newColumnNames = newSchema.map(col => col.name);
    
    console.log('New vendor table columns:', newColumnNames);
    
    if (newColumnNames.includes('name') && !newColumnNames.includes('vendor_name')) {
      console.log('✅ SUCCESS: Vendor table schema is correct');
      
      // Step 5: Test vendor creation
      console.log('🧪 Step 6: Testing vendor creation...');
      
      const testVendor = {
        name: `Schema Fix Test ${Date.now()}`,
        company_name: 'Test Company Inc.',
        phone: '123-456-7890',
        address: '123 Test St',
        contact_person: 'Test Contact'
      };
      
      try {
        const vendorId = await db.createVendor(testVendor);
        console.log(`✅ Test vendor created successfully with ID: ${vendorId}`);
        
        // Verify the created vendor
        const createdVendor = await db.executeRawQuery(`SELECT * FROM vendors WHERE id = ?`, [vendorId]);
        console.log('Created vendor data:', createdVendor[0]);
        
        // Clean up test vendor
        await db.executeRawQuery(`DELETE FROM vendors WHERE id = ?`, [vendorId]);
        console.log('🧹 Test vendor cleaned up');
        
        console.log('🎉 SUCCESS: Vendor creation is now working perfectly!');
        console.log('✅ You can now create vendors in the application without any errors.');
        
      } catch (testError) {
        console.error('❌ Vendor creation test failed:', testError);
        console.log('❌ There may still be an issue with the vendor creation process');
      }
      
    } else {
      console.error('❌ Schema verification failed - incorrect columns:', newColumnNames);
    }
    
  } catch (error) {
    console.error('❌ Comprehensive fix failed:', error);
    console.log('Please contact support or check the database manually');
  }
})();

console.log('📋 INSTRUCTIONS:');
console.log('1. The script above will automatically fix the vendor table schema');
console.log('2. After it completes successfully, try creating a vendor again');
console.log('3. If you still get errors, refresh the page and try again');
