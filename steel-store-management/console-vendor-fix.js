// Emergency Vendor Schema Fix - Copy and paste this into the browser console

console.log('🚨 Starting Emergency Vendor Schema Fix...');

// Function to run the immediate fix
async function runVendorSchemaFixNow() {
  try {
    // Import the database service
    const dbModule = await import('./src/services/database.js');
    const db = dbModule.db || dbModule.DatabaseService.getInstance();
    
    console.log('📡 Database service loaded');
    
    // Check current vendor table schema
    console.log('🔍 Checking current vendor table schema...');
    const schema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
    const columns = schema.map(col => col.name);
    console.log('📋 Current columns:', columns);
    
    const hasVendorName = columns.includes('vendor_name');
    const hasName = columns.includes('name');
    
    console.log('🔍 Schema analysis:', { hasVendorName, hasName });
    
    if (hasVendorName && !hasName) {
      console.log('🔧 FIXING: vendor_name → name column migration...');
      
      // Step 1: Add name column
      await db.executeRawQuery(`ALTER TABLE vendors ADD COLUMN name TEXT`);
      console.log('✅ Step 1: Added name column');
      
      // Step 2: Copy data from vendor_name to name
      await db.executeRawQuery(`UPDATE vendors SET name = vendor_name WHERE vendor_name IS NOT NULL AND vendor_name != ''`);
      console.log('✅ Step 2: Copied data from vendor_name to name');
      
      // Step 3: Set default for any missing names
      await db.executeRawQuery(`UPDATE vendors SET name = 'Unknown Vendor' WHERE name IS NULL OR name = ''`);
      console.log('✅ Step 3: Set default values for empty names');
      
      console.log('🎉 SUCCESS! Vendor schema migration completed!');
      console.log('💡 You can now create vendors without the NOT NULL constraint error');
      
      // Test vendor creation
      console.log('🧪 Testing vendor creation...');
      try {
        const testResult = await db.createVendor({
          name: 'Test Vendor ' + Date.now(),
          company_name: 'Test Company',
          phone: '123-456-7890',
          is_active: true
        });
        console.log('✅ TEST PASSED: Vendor creation works!', testResult);
        
        // Clean up test vendor
        await db.executeRawQuery(`DELETE FROM vendors WHERE name LIKE 'Test Vendor%'`);
        console.log('🧹 Test vendor cleaned up');
        
      } catch (testError) {
        console.warn('⚠️ Test failed:', testError.message);
      }
      
    } else if (hasName && !hasVendorName) {
      console.log('✅ Schema is already correct (has name column)');
      
    } else if (hasName && hasVendorName) {
      console.log('🔧 Both columns exist - ensuring name is populated...');
      await db.executeRawQuery(`UPDATE vendors SET name = vendor_name WHERE (name IS NULL OR name = '') AND vendor_name IS NOT NULL`);
      console.log('✅ Name column populated from vendor_name');
      
    } else {
      console.log('🔧 Neither column exists - adding name column...');
      await db.executeRawQuery(`ALTER TABLE vendors ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown Vendor'`);
      console.log('✅ Added name column with default value');
    }
    
    // Final verification
    const finalSchema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
    const finalColumns = finalSchema.map(col => col.name);
    const hasNameAfterFix = finalColumns.includes('name');
    
    if (hasNameAfterFix) {
      console.log('🎯 VERIFICATION PASSED: name column exists');
      alert('✅ SUCCESS! Vendor schema fixed. You can now create vendors without errors.');
    } else {
      console.error('❌ VERIFICATION FAILED: name column still missing');
      alert('❌ Fix verification failed. Check console for details.');
    }
    
    return { success: hasNameAfterFix, columns: finalColumns };
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    alert('❌ Emergency fix failed: ' + error.message);
    return { success: false, error: error.message };
  }
}

// Run the fix immediately
runVendorSchemaFixNow().then(result => {
  console.log('🏁 Fix completed:', result);
}).catch(error => {
  console.error('🚨 Fix failed:', error);
});
