// DATABASE SCHEMA CHECKER - Find correct column names
console.log('🔍 CHECKING DATABASE SCHEMA FOR CORRECT COLUMN NAMES');
console.log('===================================================');

window.SCHEMA_CHECKER = {
  async checkTableSchema(tableName) {
    try {
      console.log(`\n📋 Checking schema for table: ${tableName}`);
      
      const { db } = await import('/src/services/database.ts');
      
      // Get table schema
      const schemaQuery = `PRAGMA table_info(${tableName})`;
      const columns = await db.executeRawQuery(schemaQuery);
      
      console.log(`✅ Found ${columns.length} columns in ${tableName}:`);
      columns.forEach((col, i) => {
        console.log(`   ${i + 1}. ${col.name} (${col.type}) ${col.pk ? '- PRIMARY KEY' : ''}`);
      });
      
      return columns;
      
    } catch (error) {
      console.error(`❌ Error checking schema for ${tableName}:`, error);
      return [];
    }
  },
  
  async checkAllFinancialTables() {
    console.log('🗄️ CHECKING ALL FINANCIAL TABLES IN CENTRALIZED SYSTEM');
    console.log('=====================================================');
    
    const tables = [
      'stock_receiving',
      'vendor_payments', 
      'invoices',
      'vendors',
      'customers'
    ];
    
    const schemas = {};
    
    for (const table of tables) {
      schemas[table] = await this.checkTableSchema(table);
      
      // Also get sample data to understand structure
      try {
        const { db } = await import('/src/services/database.ts');
        const sampleData = await db.executeRawQuery(`SELECT * FROM ${table} LIMIT 1`);
        
        if (sampleData.length > 0) {
          console.log(`📊 Sample data from ${table}:`);
          console.log(JSON.stringify(sampleData[0], null, 2));
        } else {
          console.log(`📊 No data found in ${table}`);
        }
      } catch (error) {
        console.log(`📊 Could not get sample data from ${table}:`, error.message);
      }
    }
    
    return schemas;
  },
  
  async findVendorPurchaseData() {
    console.log('\n🔍 SEARCHING FOR YOUR VENDOR PURCHASE DATA');
    console.log('==========================================');
    
    try {
      const { db } = await import('/src/services/database.ts');
      
      // Check different possible table names and column names
      const possibleQueries = [
        // Try with amount column
        "SELECT COUNT(*) as count, SUM(amount) as total FROM stock_receiving WHERE amount > 0",
        
        // Try with total column
        "SELECT COUNT(*) as count, SUM(total) as total FROM stock_receiving WHERE total > 0",
        
        // Try with grand_total column
        "SELECT COUNT(*) as count, SUM(grand_total) as total FROM stock_receiving WHERE grand_total > 0",
        
        // Try with cost column
        "SELECT COUNT(*) as count, SUM(cost) as total FROM stock_receiving WHERE cost > 0",
        
        // Try with value column
        "SELECT COUNT(*) as count, SUM(value) as total FROM stock_receiving WHERE value > 0"
      ];
      
      console.log('🔍 Trying different column names...');
      
      for (let i = 0; i < possibleQueries.length; i++) {
        try {
          const result = await db.executeRawQuery(possibleQueries[i]);
          const data = result[0];
          
          if (data.count > 0 && data.total > 0) {
            console.log(`✅ FOUND DATA with query ${i + 1}:`);
            console.log(`   Records: ${data.count}, Total: Rs ${data.total.toLocaleString()}`);
            console.log(`   Query: ${possibleQueries[i]}`);
            
            // Get the column name from the query
            const columnMatch = possibleQueries[i].match(/SUM\((\w+)\)/);
            if (columnMatch) {
              console.log(`   💡 Correct column name: ${columnMatch[1]}`);
              return { columnName: columnMatch[1], total: data.total, count: data.count };
            }
          }
        } catch (error) {
          console.log(`   ❌ Query ${i + 1} failed: ${error.message}`);
        }
      }
      
      console.log('❌ No vendor purchase data found with standard column names');
      return null;
      
    } catch (error) {
      console.error('❌ Error searching for vendor purchase data:', error);
      return null;
    }
  }
};

// Run the schema check
window.SCHEMA_CHECKER.checkAllFinancialTables().then(() => {
  console.log('\n🎯 SCHEMA CHECK COMPLETE');
  console.log('Now searching for your Rs 146,400 data...');
  
  return window.SCHEMA_CHECKER.findVendorPurchaseData();
}).then((result) => {
  if (result) {
    console.log('\n🎉 FOUND YOUR DATA!');
    console.log(`✅ Column name: ${result.columnName}`);
    console.log(`✅ Total amount: Rs ${result.total.toLocaleString()}`);
    console.log(`✅ Records: ${result.count}`);
    console.log('\nNow I can fix the permanent solution with correct column names!');
  } else {
    console.log('\n❓ Data not found with standard queries');
    console.log('💡 Check the schema output above to see what columns exist');
  }
});

console.log('📊 Schema checker loaded. Run: window.SCHEMA_CHECKER.checkAllFinancialTables()');
