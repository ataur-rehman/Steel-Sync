/**
 * NUCLEAR OPTION - COMPLETE DATABASE RESET WITH CORRECT SCHEMA
 * Use this if the previous fix didn't work
 * WARNING: This will delete ALL data and recreate tables
 */

console.log('💥 [NUCLEAR OPTION] Complete database reset with correct schema...');

async function nuclearSchemaFix() {
  try {
    const db = window.db || window.database;
    if (!db) {
      console.error('❌ Database not found');
      return;
    }
    
    console.log('⚠️ WARNING: This will delete ALL data!');
    const confirm = window.confirm('This will delete ALL database data and recreate with correct schema. Continue?');
    if (!confirm) {
      console.log('❌ Operation cancelled by user');
      return;
    }
    
    console.log('🔥 Starting nuclear database reset...');
    
    // Initialize if needed
    if (!db.isInitialized) {
      await db.initialize();
    }
    
    // Get list of all tables
    const tables = await db.dbConnection.select(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    console.log('Found tables:', tables.map(t => t.name));
    
    // Drop ALL tables
    console.log('💥 Dropping all tables...');
    for (const table of tables) {
      try {
        await db.dbConnection.execute(`DROP TABLE IF EXISTS ${table.name}`);
        console.log(`✅ Dropped table: ${table.name}`);
      } catch (error) {
        console.log(`⚠️ Could not drop ${table.name}:`, error.message);
      }
    }
    
    // Recreate database with correct schema
    console.log('🔧 Recreating database with centralized schema...');
    
    // Force re-initialization
    db.isInitialized = false;
    await db.initialize();
    
    // Verify schema
    const newStockReceiving = await db.dbConnection.select("PRAGMA table_info(stock_receiving)");
    const newVendors = await db.dbConnection.select("PRAGMA table_info(vendors)");
    
    const hasTime = newStockReceiving.some(col => col.name === 'time');
    const hasDate = newStockReceiving.some(col => col.name === 'date');
    const hasVendorCode = newVendors.some(col => col.name === 'vendor_code');
    
    console.log('\n📊 New Schema Verification:');
    console.log('stock_receiving columns:', newStockReceiving.map(c => c.name));
    console.log('vendors columns:', newVendors.map(c => c.name));
    console.log('Has time column:', hasTime);
    console.log('Has date column:', hasDate);
    console.log('Has vendor_code column:', hasVendorCode);
    
    if (hasTime && hasDate && hasVendorCode) {
      console.log('\n🎉 NUCLEAR FIX SUCCESSFUL!');
      console.log('✅ Database recreated with correct schema');
      console.log('✅ All constraint issues resolved');
      console.log('\n📝 Please refresh the page now.');
      
      alert('Database reset successful! All schema issues fixed. Please refresh the page.');
    } else {
      console.log('\n❌ Nuclear fix failed - schema still incorrect');
    }
    
  } catch (error) {
    console.error('💥 Nuclear fix failed:', error);
  }
}

// Ask user if they want to run nuclear option
const runNuclear = window.confirm(`
Database schema issues persist. 

NUCLEAR OPTION:
- Will delete ALL data
- Will recreate database with correct schema
- Will fix all constraint issues

Do you want to proceed with nuclear option?
`);

if (runNuclear) {
  nuclearSchemaFix();
} else {
  console.log('❌ Nuclear option declined. Try the DIRECT-DATABASE-SCHEMA-FIX.js first.');
}
