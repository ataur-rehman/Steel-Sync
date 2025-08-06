// IMMEDIATE STOCK RECEIVING ITEMS TABLE FIX
// Run this in browser console to fix missing expiry_date column

(async function() {
  console.log('🔧 IMMEDIATE STOCK RECEIVING ITEMS TABLE FIX');
  
  try {
    // Get database connection
    const database = await import('./src/services/database.ts').then(m => m.database);
    if (!database) {
      console.error('❌ Database not available');
      return;
    }
    
    console.log('✅ Database connection obtained');
    
    // Import centralized schemas
    const { DATABASE_SCHEMAS } = await import('./src/services/database-schemas.ts');
    
    // First check if table exists and get current schema
    try {
      const tableInfo = await database.dbConnection.execute(`PRAGMA table_info(stock_receiving_items)`);
      console.log('📋 Current stock_receiving_items table schema:', tableInfo);
      
      // Check if expiry_date column exists
      const columns = tableInfo.map(row => row.name);
      const hasExpiryDate = columns.includes('expiry_date');
      
      if (hasExpiryDate) {
        console.log('✅ expiry_date column already exists');
      } else {
        console.log('⚠️ expiry_date column missing - adding it');
        await database.dbConnection.execute(`ALTER TABLE stock_receiving_items ADD COLUMN expiry_date TEXT`);
        console.log('✅ Added expiry_date column');
      }
      
      // Ensure all other required columns exist
      const requiredColumns = [
        'batch_number', 'lot_number', 'manufacturing_date', 
        'product_code', 'unit_price', 'total_amount'
      ];
      
      for (const col of requiredColumns) {
        if (!columns.includes(col)) {
          let colType = 'TEXT';
          if (col.includes('price') || col.includes('amount')) colType = 'REAL DEFAULT 0';
          
          await database.dbConnection.execute(`ALTER TABLE stock_receiving_items ADD COLUMN ${col} ${colType}`);
          console.log(`✅ Added ${col} column`);
        }
      }
      
    } catch (error) {
      console.log('⚠️ Table does not exist, creating with centralized schema');
      await database.dbConnection.execute(DATABASE_SCHEMAS.STOCK_RECEIVING_ITEMS);
      console.log('✅ Created stock_receiving_items table with complete schema');
    }
    
    // Verify final schema
    const finalTableInfo = await database.dbConnection.execute(`PRAGMA table_info(stock_receiving_items)`);
    console.log('✅ Final stock_receiving_items schema:', finalTableInfo.map(row => `${row.name}: ${row.type}`));
    
    console.log('🎉 STOCK RECEIVING ITEMS TABLE FIX COMPLETE!');
    console.log('✅ expiry_date column is now available');
    console.log('✅ All required columns added');
    console.log('✅ Table ready for stock receiving operations');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    console.log('🔄 Alternative: Restart the application to trigger database initialization');
  }
})();
