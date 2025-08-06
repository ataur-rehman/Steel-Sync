// Emergency Vendor Creation Fix Script
// Run this in browser console to fix vendor creation issues immediately

console.log('🚨 Emergency vendor creation fix starting...');

// Get database instance
const db = window.dbService || window.db;

if (!db) {
  console.error('❌ Database service not available');
} else {
  console.log('✅ Database service found');
  
  // Immediate fix: Ensure vendor table only has 'name' column
  const fixVendorTable = async () => {
    try {
      console.log('🔧 Checking vendor table schema...');
      
      // Get current schema
      const schema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
      const columnNames = schema.map(col => col.name);
      
      console.log('📊 Current columns:', columnNames);
      
      if (columnNames.includes('vendor_name') && columnNames.includes('name')) {
        console.log('⚠️ Both vendor_name and name columns exist - fixing...');
        
        // Recreate table with only 'name' column
        await db.executeRawQuery(`
          CREATE TABLE vendors_new (
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
        
        // Copy data from old table
        await db.executeRawQuery(`
          INSERT INTO vendors_new (
            id, vendor_code, name, company_name, phone, address, 
            contact_person, payment_terms, notes, outstanding_balance, 
            is_active, created_at, updated_at
          )
          SELECT 
            id, 
            vendor_code,
            COALESCE(name, vendor_name) as name,
            company_name, 
            phone, 
            address,
            contact_person, 
            payment_terms, 
            notes, 
            outstanding_balance,
            is_active, 
            created_at, 
            updated_at
          FROM vendors
        `);
        
        // Drop old table and rename new one
        await db.executeRawQuery(`DROP TABLE vendors`);
        await db.executeRawQuery(`ALTER TABLE vendors_new RENAME TO vendors`);
        
        console.log('✅ Vendor table recreated with correct schema');
        
        // Verify the fix
        const newSchema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
        const newColumnNames = newSchema.map(col => col.name);
        console.log('📊 New columns:', newColumnNames);
        
        if (newColumnNames.includes('name') && !newColumnNames.includes('vendor_name')) {
          console.log('✅ SUCCESS: Vendor table schema is now correct');
          
          // Test vendor creation
          console.log('🧪 Testing vendor creation...');
          try {
            const testVendor = {
              name: `Test Vendor ${Date.now()}`,
              company_name: 'Test Company',
              phone: '1234567890'
            };
            
            const vendorId = await db.createVendor(testVendor);
            console.log(`✅ Test vendor created successfully with ID: ${vendorId}`);
            
            // Clean up test vendor
            await db.executeRawQuery(`DELETE FROM vendors WHERE id = ?`, [vendorId]);
            console.log('🧹 Test vendor cleaned up');
            
            return { success: true, message: 'Vendor table fixed and tested successfully!' };
          } catch (testError) {
            console.error('❌ Vendor creation test failed:', testError);
            return { success: false, message: `Test failed: ${testError.message}` };
          }
        } else {
          console.error('❌ Schema fix failed - incorrect columns');
          return { success: false, message: 'Schema fix failed' };
        }
      } else if (columnNames.includes('name') && !columnNames.includes('vendor_name')) {
        console.log('✅ Vendor table schema is already correct');
        
        // Test vendor creation anyway
        console.log('🧪 Testing vendor creation...');
        try {
          const testVendor = {
            name: `Test Vendor ${Date.now()}`,
            company_name: 'Test Company',
            phone: '1234567890'
          };
          
          const vendorId = await db.createVendor(testVendor);
          console.log(`✅ Test vendor created successfully with ID: ${vendorId}`);
          
          // Clean up test vendor
          await db.executeRawQuery(`DELETE FROM vendors WHERE id = ?`, [vendorId]);
          console.log('🧹 Test vendor cleaned up');
          
          return { success: true, message: 'Vendor creation is working correctly!' };
        } catch (testError) {
          console.error('❌ Vendor creation test failed:', testError);
          return { success: false, message: `Test failed: ${testError.message}` };
        }
      } else {
        console.error('❌ Unexpected schema state:', columnNames);
        return { success: false, message: 'Unexpected schema state' };
      }
      
    } catch (error) {
      console.error('❌ Emergency fix failed:', error);
      return { success: false, message: error.message };
    }
  };
  
  // Execute the fix
  fixVendorTable().then(result => {
    console.log('🎯 Emergency fix result:', result);
    if (result.success) {
      console.log('🎉 SUCCESS: You can now create vendors without errors!');
    } else {
      console.log('❌ FAILED: Please check the error details above');
    }
  });
}
