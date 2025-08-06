// IMMEDIATE FIX: Run this in browser console to fix stock_receiving_items table
// Copy and paste this entire script into your browser's developer console

(async function immediateStockReceivingItemsFix() {
  console.log('🔧 IMMEDIATE STOCK RECEIVING ITEMS FIX - BROWSER CONSOLE VERSION');
  
  try {
    // Try multiple ways to get the database instance
    let database;
    
    if (window.__database_instance__) {
      database = window.__database_instance__;
      console.log('✅ Found database instance in window.__database_instance__');
    } else {
      // Try to import and get instance
      try {
        const dbModule = await import('./src/services/database.ts');
        database = dbModule.DatabaseService.getInstance();
        console.log('✅ Got database instance from import');
      } catch (importError) {
        console.log('⚠️ Import failed, trying alternative methods...');
        
        // Try to find existing database reference
        if (window.database) {
          database = window.database;
          console.log('✅ Found database in window.database');
        } else {
          console.error('❌ Cannot find database instance');
          return;
        }
      }
    }
    
    console.log('📋 Checking current stock_receiving_items table schema...');
    
    // Get current table schema
    const tableInfo = await database.dbConnection.execute('PRAGMA table_info(stock_receiving_items)');
    console.log('Current table structure:', tableInfo);
    
    // Check if expiry_date column exists
    const columns = tableInfo.map(row => row.name);
    const hasExpiryDate = columns.includes('expiry_date');
    
    if (hasExpiryDate) {
      console.log('✅ expiry_date column already exists! The error might be elsewhere.');
      console.log('📋 Existing columns:', columns);
      return;
    }
    
    console.log('⚠️ expiry_date column missing. Adding missing columns...');
    
    // Columns that should exist
    const requiredColumns = [
      { name: 'expiry_date', type: 'TEXT' },
      { name: 'batch_number', type: 'TEXT' },
      { name: 'lot_number', type: 'TEXT' },
      { name: 'manufacturing_date', type: 'TEXT' },
      { name: 'product_code', type: 'TEXT' },
      { name: 'total_amount', type: 'REAL DEFAULT 0' }
    ];
    
    let addedCount = 0;
    
    for (const col of requiredColumns) {
      if (!columns.includes(col.name)) {
        try {
          await database.dbConnection.execute(`ALTER TABLE stock_receiving_items ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ Added ${col.name} column`);
          addedCount++;
        } catch (error) {
          console.error(`❌ Failed to add ${col.name}:`, error);
        }
      } else {
        console.log(`ℹ️ Column ${col.name} already exists`);
      }
    }
    
    // Verify the fix
    console.log('📋 Verifying updated table schema...');
    const updatedTableInfo = await database.dbConnection.execute('PRAGMA table_info(stock_receiving_items)');
    console.log('Updated table structure:', updatedTableInfo);
    
    const updatedColumns = updatedTableInfo.map(row => row.name);
    const nowHasExpiryDate = updatedColumns.includes('expiry_date');
    
    if (nowHasExpiryDate) {
      console.log('🎉 SUCCESS! expiry_date column is now available');
      console.log('✅ You can now create stock receiving items with expiry dates');
    } else {
      console.log('❌ Fix failed - expiry_date column still missing');
    }
    
    console.log(`📊 Summary: Added ${addedCount} new columns`);
    console.log('📋 All columns:', updatedColumns);
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    console.log('🔄 Alternative: Try restarting the application');
  }
})();

// Also export for manual use
window.fixStockReceivingItems = async function() {
  return immediateStockReceivingItemsFix();
};
