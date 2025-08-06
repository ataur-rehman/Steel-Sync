// DIRECT SQL FIX for stock_receiving_items table
// This adds the missing expiry_date column immediately

console.log('🔧 DIRECT SQL FIX: Adding expiry_date column to stock_receiving_items');

// SQL commands to run in your database
const sqlCommands = [
  // Check current table structure
  "PRAGMA table_info(stock_receiving_items);",
  
  // Add missing columns
  "ALTER TABLE stock_receiving_items ADD COLUMN expiry_date TEXT;",
  "ALTER TABLE stock_receiving_items ADD COLUMN batch_number TEXT;", 
  "ALTER TABLE stock_receiving_items ADD COLUMN lot_number TEXT;",
  "ALTER TABLE stock_receiving_items ADD COLUMN manufacturing_date TEXT;",
  "ALTER TABLE stock_receiving_items ADD COLUMN product_code TEXT;",
  
  // Verify the fix
  "PRAGMA table_info(stock_receiving_items);"
];

console.log('✅ Run these SQL commands in your database console:');
console.log('========================================');
sqlCommands.forEach((cmd, index) => {
  console.log(`${index + 1}. ${cmd}`);
});
console.log('========================================');

console.log('🎯 OR use this browser console code:');
console.log(`
// Run this in your browser's developer console:
(async function() {
  try {
    // Get database instance
    const db = window.__database_instance__ || await import('./src/services/database.ts').then(m => m.DatabaseService.getInstance());
    
    console.log('📋 Current table schema:');
    const tableInfo = await db.dbConnection.execute('PRAGMA table_info(stock_receiving_items)');
    console.table(tableInfo);
    
    // Add missing columns
    const columnsToAdd = [
      { name: 'expiry_date', type: 'TEXT' },
      { name: 'batch_number', type: 'TEXT' },
      { name: 'lot_number', type: 'TEXT' },
      { name: 'manufacturing_date', type: 'TEXT' },
      { name: 'product_code', type: 'TEXT' }
    ];
    
    for (const col of columnsToAdd) {
      try {
        await db.dbConnection.execute(\`ALTER TABLE stock_receiving_items ADD COLUMN \${col.name} \${col.type}\`);
        console.log(\`✅ Added \${col.name} column\`);
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log(\`ℹ️ Column \${col.name} already exists\`);
        } else {
          console.error(\`❌ Failed to add \${col.name}:\`, error);
        }
      }
    }
    
    console.log('✅ Stock receiving items table fix complete!');
    console.log('📋 Updated table schema:');
    const newTableInfo = await db.dbConnection.execute('PRAGMA table_info(stock_receiving_items)');
    console.table(newTableInfo);
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
})();
`);

console.log('🔄 After running the fix, try creating stock receiving items again.');
