// Vendor Schema Verification Script
// Run this in browser console to check current vendor table structure

console.log('🔍 Checking vendor table schema...');

// Get database instance
const db = window.dbService || window.db;

if (!db) {
  console.error('❌ Database service not available');
} else {
  console.log('✅ Database service found');
  
  // Check vendor table schema
  db.executeRawQuery(`PRAGMA table_info(vendors)`)
    .then(schema => {
      console.log('📊 Current vendor table schema:');
      console.table(schema);
      
      const columnNames = schema.map(col => col.name);
      console.log('📝 Column names:', columnNames);
      
      if (columnNames.includes('name')) {
        console.log('✅ SUCCESS: "name" column exists');
      } else {
        console.log('❌ ERROR: "name" column missing');
      }
      
      if (columnNames.includes('vendor_name')) {
        console.log('⚠️ WARNING: "vendor_name" column still exists (should be removed)');
      } else {
        console.log('✅ GOOD: "vendor_name" column properly removed');
      }
    })
    .catch(error => {
      console.error('❌ Error checking schema:', error);
    });
}
