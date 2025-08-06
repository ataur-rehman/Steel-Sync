// IMMEDIATE VENDOR SCHEMA FIX - Run this in browser console NOW

console.log('🚨 RUNNING IMMEDIATE VENDOR SCHEMA FIX...');

// Direct SQL execution to fix vendor table schema
async function fixVendorSchemaNow() {
  try {
    // Get database instance (try multiple ways)
    let db;
    if (window.db) {
      db = window.db;
    } else if (window.databaseService) {
      db = window.databaseService;
    } else {
      // Try to get from React app context
      const reactRoot = document.querySelector('#root')?._reactInternalFiber || 
                       document.querySelector('#root')?._reactInternals;
      console.log('Attempting to access database through React context...');
      
      // Alternative: try to import the module
      try {
        const dbModule = await import('/src/services/database.js');
        db = dbModule.db || dbModule.DatabaseService?.getInstance();
      } catch (importError) {
        console.warn('Could not import database module:', importError);
      }
    }

    if (!db) {
      console.error('❌ Could not access database service');
      alert('❌ Could not access database. Please ensure the application is loaded.');
      return false;
    }

    console.log('✅ Database service accessed');

    // Check current vendor table schema
    console.log('🔍 Checking current vendor table schema...');
    const schema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
    const columns = schema.map(col => col.name);
    console.log('📋 Current columns:', columns);

    const hasVendorName = columns.includes('vendor_name');
    const hasName = columns.includes('name');

    console.log('🔍 Schema analysis:', { hasVendorName, hasName });

    if (hasVendorName && !hasName) {
      console.log('🔧 FIXING: Adding name column and migrating data...');
      
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
      alert('✅ SUCCESS! Vendor schema fixed. You can now create vendors without errors.');
      
    } else if (hasName && !hasVendorName) {
      console.log('✅ Schema is already correct (has name column)');
      alert('✅ Vendor table already has correct schema with name column');
      
    } else if (hasName && hasVendorName) {
      console.log('🔧 Both columns exist - ensuring name is populated...');
      await db.executeRawQuery(`UPDATE vendors SET name = vendor_name WHERE (name IS NULL OR name = '') AND vendor_name IS NOT NULL`);
      console.log('✅ Name column populated from vendor_name');
      alert('✅ Name column populated from vendor_name data');
      
    } else {
      console.log('🔧 Neither column exists - adding name column...');
      await db.executeRawQuery(`ALTER TABLE vendors ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown Vendor'`);
      console.log('✅ Added name column with default value');
      alert('✅ Added name column to vendor table');
    }

    // Final verification
    const finalSchema = await db.executeRawQuery(`PRAGMA table_info(vendors)`);
    const finalColumns = finalSchema.map(col => col.name);
    const hasNameAfterFix = finalColumns.includes('name');

    console.log('🔍 Final verification - columns after fix:', finalColumns);

    if (hasNameAfterFix) {
      console.log('🎯 VERIFICATION PASSED: name column exists');
      console.log('💡 You can now create vendors without the NOT NULL constraint error');
      return true;
    } else {
      console.error('❌ VERIFICATION FAILED: name column still missing');
      alert('❌ Fix verification failed. Check console for details.');
      return false;
    }

  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    alert('❌ Emergency fix failed: ' + error.message);
    return false;
  }
}

// Run the fix immediately
fixVendorSchemaNow().then(success => {
  if (success) {
    console.log('🏁 ✅ VENDOR SCHEMA FIX COMPLETED SUCCESSFULLY!');
    console.log('💡 Try creating a vendor now - the error should be gone!');
  } else {
    console.log('🏁 ❌ VENDOR SCHEMA FIX FAILED');
    console.log('💡 Please check the error messages above');
  }
}).catch(error => {
  console.error('🚨 Fix execution failed:', error);
});

// Also make function available globally for manual execution
window.fixVendorSchemaNow = fixVendorSchemaNow;
