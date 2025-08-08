/**
 * IMMEDIATE BROWSER CONSOLE FIX
 * Copy and paste this into your browser console to fix the database schema issues
 */

console.log('🔧 [IMMEDIATE FIX] Starting database schema repair...');

// Initialize database and force centralized schema
(async function immediateSchemaFix() {
  try {
    // Get the database instance
    const db = window.db || window.database;
    
    if (!db) {
      console.error('❌ Database instance not found. Make sure the app is loaded.');
      return;
    }
    
    console.log('✅ Database instance found');
    
    // Initialize database
    if (!db.isInitialized) {
      console.log('🔄 Initializing database...');
      await db.initialize();
    }
    
    // Force centralized schema reality
    console.log('🔧 Forcing centralized schema...');
    const schemaResult = await db.ensureCentralizedSchemaReality();
    
    console.log('Schema enforcement result:', schemaResult);
    
    if (schemaResult.success) {
      console.log('✅ [SUCCESS] Database now uses centralized schema!');
      console.log('Details:', schemaResult.details);
      
      // Test that vendors work now
      console.log('🧪 Testing vendors...');
      const vendors = await db.getVendors();
      console.log(`Found ${vendors.length} vendors:`, vendors);
      
      // Test that stock receiving would work (check schema)
      console.log('🧪 Testing stock_receiving schema...');
      const stockReceivingSchema = await db.dbConnection.select("PRAGMA table_info(stock_receiving)");
      const hasTimeColumn = stockReceivingSchema.some(col => col.name === 'time');
      const hasDateColumn = stockReceivingSchema.some(col => col.name === 'date');
      
      console.log('Stock receiving schema check:');
      console.log('- Has time column:', hasTimeColumn);
      console.log('- Has date column:', hasDateColumn);
      
      if (hasTimeColumn && hasDateColumn) {
        console.log('✅ [SUCCESS] Stock receiving table has correct schema!');
        console.log('The "no such column: time" error should be fixed now.');
      } else {
        console.log('❌ [ISSUE] Stock receiving table still needs schema fix');
      }
      
      console.log('\n🎉 [COMPLETE] Database schema fix complete!');
      console.log('Please refresh the page to see the fixes in action.');
      
    } else {
      console.log('❌ [FAILED] Schema enforcement failed:', schemaResult.message);
    }
    
  } catch (error) {
    console.error('❌ [ERROR] Schema fix failed:', error);
    console.log('Details:', error.message);
  }
})();

console.log(`
📝 [INSTRUCTIONS]
1. Make sure your Steel Store Management app is loaded
2. The above script should run automatically
3. Look for "Database schema fix complete!" message
4. Refresh the page to test vendors and stock receiving

If the script doesn't run automatically, you can run it manually:
- Copy the entire async function above
- Paste it into the browser console
- Press Enter
`);
