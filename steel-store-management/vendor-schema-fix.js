/**
 * Emergency Vendor Schema Fix Script
 * Run this in the browser console to immediately fix vendor table schema issues
 */

// Function to fix vendor schema immediately
async function fixVendorSchemaEmergency() {
  console.log('🚨 Starting emergency vendor schema fix...');
  
  try {
    // Get database service instance
    const { db } = await import('./src/services/database.js');
    
    console.log('📡 Database service loaded, running immediate fix...');
    
    // Run the immediate vendor schema fix
    const result = await db.immediateVendorSchemaFix();
    
    console.log('🎯 Fix Result:', result);
    
    if (result.success) {
      console.log('✅ SUCCESS! Vendor schema fixed successfully!');
      console.log('📋 Details:', result.details);
      alert('✅ Vendor schema fixed! You can now create vendors without errors.');
    } else {
      console.error('❌ Fix failed:', result.message);
      alert('❌ Fix failed. Check console for details.');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Emergency fix script failed:', error);
    alert('❌ Emergency fix script failed. Check console for details.');
    return { success: false, error: error.message };
  }
}

// Alternative direct database fix
async function directVendorTableFix() {
  console.log('🔧 Running direct vendor table fix...');
  
  try {
    // Import database connection directly
    const { DatabaseConnection } = await import('./src/services/database-connection.js');
    const dbConn = DatabaseConnection.getInstance();
    
    // Check current vendor table schema
    const schema = await dbConn.select(`PRAGMA table_info(vendors)`);
    console.log('📋 Current vendor table schema:', schema);
    
    const columnNames = schema.map(col => col.name);
    console.log('📋 Column names:', columnNames);
    
    const hasVendorName = columnNames.includes('vendor_name');
    const hasName = columnNames.includes('name');
    
    console.log('🔍 Schema analysis:', { hasVendorName, hasName });
    
    if (hasVendorName && !hasName) {
      console.log('🔄 Migrating vendor_name to name column...');
      
      // Add name column
      await dbConn.execute(`ALTER TABLE vendors ADD COLUMN name TEXT`);
      console.log('✅ Added name column');
      
      // Copy data
      await dbConn.execute(`UPDATE vendors SET name = vendor_name WHERE vendor_name IS NOT NULL`);
      console.log('✅ Copied data from vendor_name to name');
      
      // Set defaults
      await dbConn.execute(`UPDATE vendors SET name = 'Unknown Vendor' WHERE name IS NULL OR name = ''`);
      console.log('✅ Set default values');
      
      console.log('🎉 Vendor table schema fix completed!');
      alert('✅ Vendor table schema fixed! Try creating a vendor now.');
      
    } else if (hasName) {
      console.log('✅ Vendor table already has name column');
      alert('✅ Vendor table already has correct schema with name column');
    } else {
      console.log('⚠️ Adding missing name column...');
      await dbConn.execute(`ALTER TABLE vendors ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown Vendor'`);
      console.log('✅ Added name column with default value');
      alert('✅ Added missing name column to vendor table');
    }
    
    return { success: true, message: 'Direct fix completed' };
    
  } catch (error) {
    console.error('❌ Direct fix failed:', error);
    alert('❌ Direct fix failed. Check console for details.');
    return { success: false, error: error.message };
  }
}

// Make functions available globally
window.fixVendorSchemaEmergency = fixVendorSchemaEmergency;
window.directVendorTableFix = directVendorTableFix;

console.log('🔧 Vendor schema fix functions loaded!');
console.log('💡 Run: fixVendorSchemaEmergency() or directVendorTableFix()');
